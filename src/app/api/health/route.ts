import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Wire this to an external uptime provider (UptimeRobot, Better Uptime, etc.).
 * Returns 200 when all dependencies are reachable, 503 otherwise.
 *
 * Checks:
 *   - OPENAI_API_KEY is set (presence only, no call — calling costs money)
 *   - Supabase admin client can reach the database (cheap probe)
 */
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1) OpenAI key presence
  checks.openai_key = { ok: !!process.env.OPENAI_API_KEY };

  // 2) Supabase probe
  try {
    const admin = createAdminClient();
    // Count is a cheap probe — no rows fetched.
    const { error } = await admin
      .from("users")
      .select("id", { count: "exact", head: true });
    checks.supabase = error
      ? { ok: false, detail: error.message.slice(0, 120) }
      : { ok: true };
  } catch (err) {
    checks.supabase = {
      ok: false,
      detail: err instanceof Error ? err.message.slice(0, 120) : "unknown"
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks
    },
    { status: allOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
