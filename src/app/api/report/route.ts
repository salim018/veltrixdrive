import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildReportPdf, buildFallbackPdf } from "@/lib/pdf/report";
import type { AnalysisResult } from "@/types/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_PDF_BYTES = 1000;

/**
 * GET /api/report?id=<analysis_id>
 *
 * Always returns a valid PDF (never JSON) for authenticated owners of the
 * analysis. If full-report generation fails for any reason, a minimal
 * fallback PDF with an explanatory message is returned instead.
 * Unauthenticated / missing-id / not-found paths still use NextResponse.json
 * (those are not successful requests and the frontend handles them).
 */
export async function GET(request: Request) {
  console.log("[report] PDF start");

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("analyses")
    .select("result, created_at, input_value")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = data.result as AnalysisResult;

  // Attempt the full report. Any exception or undersized output falls back to
  // a minimal 1-page PDF so the frontend always receives a valid file.
  let pdf: Buffer | null = null;
  let renderFailed = false;
  let reason = "";
  try {
    pdf = await buildReportPdf(result);
  } catch (err) {
    renderFailed = true;
    reason = err instanceof Error ? err.message : String(err);
    console.error("[report] pdf render error:", reason);
  }

  console.log("[report] PDF size:", pdf?.length ?? 0);

  const startsWithMagic =
    !!pdf &&
    pdf.length >= 4 &&
    pdf[0] === 0x25 && pdf[1] === 0x50 && pdf[2] === 0x44 && pdf[3] === 0x46; // %PDF

  if (renderFailed || !pdf || pdf.length < MIN_PDF_BYTES || !startsWithMagic) {
    console.error(
      "[report] falling back to minimal PDF:",
      { length: pdf?.length ?? 0, magicOk: startsWithMagic, renderFailed }
    );
    try {
      pdf = await buildFallbackPdf(reason || "render_failed");
    } catch (fbErr) {
      // Fallback failed too — extremely unusual; this is the only path that
      // ever returns JSON, and it's a genuine server crash signal.
      console.error("[report] fallback pdf failed:", fbErr);
      return NextResponse.json(
        { error: "invalid_pdf", message: "Report could not be generated" },
        { status: 500 }
      );
    }
  }

  const safeName =
    [result.vehicle_spec?.make, result.vehicle_spec?.model, result.vehicle_spec?.year]
      .filter((s) => s && s !== "unknown")
      .join("-")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "analysis";

  const bytes = new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength);
  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="veltrixdrive-${safeName}-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
