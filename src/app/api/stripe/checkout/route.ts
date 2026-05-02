import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/checkout
 *
 * Body: { pack: "starter" | "popular" | "pro" }
 *
 * Creates a Stripe Checkout Session for the selected credit pack. The webhook
 * at /api/stripe/webhook credits the user's account on `checkout.session.completed`.
 *
 * Requires env:
 *   STRIPE_SECRET_KEY
 *   STRIPE_PRICE_STARTER, STRIPE_PRICE_POPULAR, STRIPE_PRICE_PRO (Stripe Price IDs)
 *   NEXT_PUBLIC_APP_URL
 */

const PACK_CREDITS: Record<string, number> = {
  starter: 10,
  popular: 40,
  pro: 100
};

const BodySchema = z.object({
  pack: z.enum(["starter", "popular", "pro"])
});

function priceIdFor(pack: string): string | null {
  if (pack === "starter") return process.env.STRIPE_PRICE_STARTER || null;
  if (pack === "popular") return process.env.STRIPE_PRICE_POPULAR || null;
  if (pack === "pro") return process.env.STRIPE_PRICE_PRO || null;
  return null;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const priceId = priceIdFor(parsed.data.pack);
  if (!priceId) {
    return NextResponse.json(
      { error: "pack_not_configured" },
      { status: 500 }
    );
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        pack: parsed.data.pack,
        credits: String(PACK_CREDITS[parsed.data.pack])
      }
    });

    if (!session.url) {
      return NextResponse.json({ error: "no_url" }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] error:", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
