import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { alert } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook
 *
 * Stripe webhook endpoint. Verifies signature, records event to stripe_events
 * for idempotency, credits the user's account on checkout.session.completed.
 *
 * Requires env:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *
 * Idempotency: event.id is inserted into public.stripe_events before any
 * side effect. If the insert conflicts (duplicate id), we return 200 without
 * re-crediting. This protects against Stripe retries.
 */

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  // IMPORTANT: use raw body for signature verification.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/webhook] signature verification failed:", msg);
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ---- Idempotency dedup ----
  // Attempt to insert event.id into stripe_events. If it already exists,
  // skip — we've already processed this delivery.
  const { error: dedupError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });
  if (dedupError) {
    // Unique-violation = already processed. Everything else is unexpected.
    const msg = dedupError.message || "";
    if (/duplicate key|already exists|unique/i.test(msg)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe/webhook] dedup insert error:", dedupError);
    void alert({
      key: "stripe_dedup_failed",
      subject: "Stripe dedup insert failed",
      body: `event=${event.id}\ntype=${event.type}\nerror=${msg}`
    });
    // Fail open (return 500 so Stripe retries rather than silently miss credits).
    return NextResponse.json({ error: "dedup_failed" }, { status: 500 });
  }

  // ---- Handle ----
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id || session.client_reference_id || null;
      const creditsStr = session.metadata?.credits;
      const credits = creditsStr ? parseInt(creditsStr, 10) : 0;

      if (!userId || !credits || !Number.isFinite(credits) || credits <= 0) {
        console.error("[stripe/webhook] missing metadata", session.id, { userId, credits });
        void alert({
          key: "stripe_metadata_missing",
          subject: "Stripe webhook: missing metadata",
          body: `session=${session.id}\nuser_id=${userId}\ncredits=${credits}`
        });
        // Still 200 — we did our best, don't retry.
        return NextResponse.json({ received: true, credited: false });
      }

      const { error: rpcError } = await admin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: credits
      });
      if (rpcError) {
        console.error("[stripe/webhook] add_credits failed:", rpcError);
        void alert({
          key: "add_credits_failed",
          subject: "add_credits RPC failed",
          body: `user=${userId}\namount=${credits}\nsession=${session.id}\nerror=${rpcError.message}`
        });
        // 500 so Stripe retries — the dedup row will be removed manually if
        // we permanently cannot process.
        return NextResponse.json({ error: "credit_failed" }, { status: 500 });
      }

      return NextResponse.json({ received: true, credited: true, credits });
    }

    // Other events we don't care about yet — return 200 so Stripe doesn't retry.
    return NextResponse.json({ received: true, ignored: event.type });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/webhook] handler error:", msg);
    void alert({
      key: "stripe_handler_error",
      subject: "Stripe webhook handler crashed",
      body: `event=${event.id}\ntype=${event.type}\nerror=${msg}`
    });
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}
