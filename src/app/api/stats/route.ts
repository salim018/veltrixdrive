import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();

  try {
    // Totaal aantal users
    const { count: totalUsers } = await admin
      .from("users")
      .select("*", { count: "exact", head: true });

    // Nieuwe users vandaag
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: newToday } = await admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    // Totaal credits gebruikt (analyses uitgevoerd)
    const { data: creditsData } = await admin
      .from("users")
      .select("credits");

    const totalCreditsLeft = creditsData?.reduce((a, u) => a + (u.credits || 0), 0) || 0;

    // Users met 0 credits (heavy users)
    const { count: powerUsers } = await admin
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("credits", 0);

    // Nieuwe users laatste 7 dagen per dag
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const from = new Date();
      from.setDate(from.getDate() - i);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setHours(23, 59, 59, 999);
      const { count } = await admin
        .from("users")
        .select("*", { count: "exact", head: true })
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());
      days.push({
        date: from.toLocaleDateString("nl-NL", { weekday: "short" }),
        count: count || 0
      });
    }

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      newToday: newToday || 0,
      totalCreditsLeft,
      powerUsers: powerUsers || 0,
      signupsPerDay: days,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 503 }
    );
  }
}