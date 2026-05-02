import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeCar } from "@/lib/ai/analyze";
import {
  checkRateLimit,
  getClientIp,
  getIdempotentResponse,
  setIdempotentResponse,
  hashIdempotencyKey,
  isInflight,
  markInflight,
  clearInflight
} from "@/lib/ratelimit";
import { alert } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CURRENT_YEAR = new Date().getUTCFullYear();

const BodySchema = z.object({
  input: z.string().trim().min(20).max(5000),
  additional_details: z.string().trim().max(5000).nullable().optional(),
  language: z.enum(["en", "nl", "de", "fr", "es", "it"]).default("en"),
  overrides: z.object({
    listing_price: z.number().positive().max(10_000_000),
    currency: z
      .enum(["EUR", "USD", "GBP", "CHF", "PLN", "SEK", "NOK", "DKK", "CAD", "AUD"])
      .nullable()
      .optional(),
    mileage_value: z.number().positive().max(1_500_000),
    mileage_unit: z.enum(["km", "mi"]),
    year: z.number().int().min(1950).max(CURRENT_YEAR + 1)
  })
});

function detectInputType(input: string): "url" | "text" {
  try {
    const trimmed = input.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      new URL(trimmed);
      return "url";
    }
  } catch {
    /* fall through */
  }
  return "text";
}

/**
 * The ONLY user-facing failure response. Replaces the previous
 * "Analysis is taking longer than expected" wording per spec — that string
 * must never appear in any production code path.
 */
const TEMPORARY_ISSUE_BODY = {
  error: "temporary_issue",
  message: "Something went wrong. Please try again."
};

/**
 * Spec-mandated 409 response when the SAME user has another analysis still
 * running. NOT a failure — just a polite "wait". No credit charged, no AI
 * call, no refund needed.
 */
const ANALYSIS_IN_PROGRESS_BODY = {
  error: "analysis_in_progress",
  message: "Analysis already running. Please wait."
};

export async function POST(req: Request) {
  // ---- Top-level safety net ----
  // Anything thrown from inside this handler is caught here and returned as
  // a structured temporary_issue. The route never returns an empty body.
  try {
    return await handlePost(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[analyze] uncaught error:", msg);
    void alert({
      key: "analyze_uncaught",
      subject: "Uncaught error in /api/analyze",
      body: msg
    });
    return NextResponse.json(TEMPORARY_ISSUE_BODY, { status: 503 });
  }
}

async function handlePost(req: Request): Promise<NextResponse> {
  // ---- Auth ----
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ---- Body validation ----
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { input, additional_details, language, overrides } = parsed.data;
  const inputType = detectInputType(input);
  const userId = user.id;

  // ---- Concurrent-analysis guard (FIX 1) ----
  // Server is the AUTHORITATIVE source of "is something running for this
  // user". Reject a second concurrent request with 409 BEFORE doing any
  // billable work (credit consumption, AI call). This is NOT a failure —
  // it's a polite hold instruction. No credit deducted, no refund needed.
  if (isInflight(userId)) {
    return NextResponse.json(ANALYSIS_IN_PROGRESS_BODY, { status: 409 });
  }

  // ---- Idempotency: identical request within 60s returns cached response ----
  const idemKey = hashIdempotencyKey(userId, {
    input,
    additional_details,
    language,
    overrides
  });
  const cached = getIdempotentResponse(idemKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // ---- Rate limit: per-user cooldown + per-IP flood ----
  const ip = getClientIp(req);
  const rl = checkRateLimit({ userId, ip });
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        reason: rl.reason,
        retry_after: rl.retry_after
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retry_after) }
      }
    );
  }

  // ============================================================
  //   CRITICAL: markInflight + try/finally wrap EVERYTHING from
  //   this point on. clearInflight MUST run on every exit path —
  //   success, AI failure, DB failure, persist failure, anything.
  // ============================================================
  markInflight(userId);
  try {
    const admin = createAdminClient();

    // ---- Atomic credit consumption ----
    const { data: remaining, error: rpcError } = await admin.rpc(
      "consume_credit",
      { p_user_id: userId }
    );

    if (rpcError) {
      const msg = rpcError.message || "";
      if (msg.includes("insufficient_credits")) {
        return NextResponse.json({ error: "no_credits" }, { status: 402 });
      }
      console.error("[analyze] credit rpc error:", rpcError);
      void alert({
        key: "consume_credit_failed",
        subject: "consume_credit RPC failed",
        body: `user=${userId}\nerror=${msg}`
      });
      // RPC failed → no credit was consumed (atomic), so no refund needed.
      return NextResponse.json(TEMPORARY_ISSUE_BODY, { status: 503 });
    }

    /**
     * Refund the credit consumed by `consume_credit`. Called ONLY when the
     * AI call (or downstream persist) genuinely fails AFTER the credit was
     * deducted. Per spec: NOT called for analysis_in_progress (no credit
     * deducted there), NOT called on duplicate idempotent hits (cached
     * response is returned without consuming a credit).
     */
    async function refundCredit(): Promise<void> {
      try {
        const { error: refundErr } = await admin.rpc("add_credits", {
          p_user_id: userId,
          p_amount: 1
        });
        if (refundErr) {
          console.error("[analyze] credit refund failed:", refundErr);
          void alert({
            key: "credit_refund_failed",
            subject: "Credit refund failed",
            body: `user=${userId}\nerror=${refundErr.message}`
          });
        }
      } catch (refundCatch) {
        const m =
          refundCatch instanceof Error ? refundCatch.message : String(refundCatch);
        console.error("[analyze] credit refund threw:", m);
        void alert({
          key: "credit_refund_threw",
          subject: "Credit refund threw",
          body: `user=${userId}\nerror=${m}`
        });
      }
    }

    // ---- Run AI analysis ----
    let result;
    try {
      const normalizedOverrides = {
        listing_price: overrides.listing_price,
        currency: overrides.currency ?? null,
        mileage_value: overrides.mileage_value,
        mileage_unit: overrides.mileage_unit,
        year: overrides.year
      };
      result = await analyzeCar({
        input,
        additionalDetails: additional_details ?? null,
        inputType,
        language,
        overrides: normalizedOverrides
      });
    } catch (err) {
      // Real failure path → refund the credit that consume_credit deducted.
      await refundCredit();
      const tagged = err as { name?: string; message?: string };
      console.error("[analyze] AI error after retry:", {
        name: tagged?.name,
        message: tagged?.message
      });
      return NextResponse.json(TEMPORARY_ISSUE_BODY, { status: 503 });
    }

    // ---- Persist to history ----
    const { data: inserted, error: insertError } = await admin
      .from("analyses")
      .insert({
        user_id: userId,
        input_type: inputType,
        input_value: input,
        language,
        result
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[analyze] insert error:", insertError);
      void alert({
        key: "analyses_insert_failed",
        subject: "Analysis insert failed",
        body: `user=${userId}\nerror=${insertError.message}`
      });
      // Persist failure shouldn't penalise the user — they got the analysis,
      // just no history row. Return success so they see the result. Credit
      // STAYS DEDUCTED (the analysis genuinely happened).
      const responseBody = { result, credits: remaining, id: null };
      setIdempotentResponse(idemKey, responseBody);
      return NextResponse.json(responseBody);
    }

    const responseBody = { result, credits: remaining, id: inserted.id };
    setIdempotentResponse(idemKey, responseBody);
    return NextResponse.json(responseBody);
  } finally {
    // CRITICAL: clear inflight on EVERY exit path (success, return,
    // throw, anything). This is the single guarantee that a stuck
    // request cannot lock a user out forever.
    clearInflight(userId);
  }
}
