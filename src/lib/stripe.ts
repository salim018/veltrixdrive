import Stripe from "stripe";

/**
 * Stripe is structured but intentionally not wired to routes yet.
 *
 * To enable credit top-ups:
 *  1. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 *  2. Create a Stripe Price for "credit pack" (e.g. 50 credits).
 *  3. Add a /api/stripe/checkout route that creates a Checkout Session.
 *  4. Add a /api/stripe/webhook route that listens for
 *     `checkout.session.completed` and increments public.users.credits via
 *     createAdminClient().rpc('add_credits', { p_user_id, p_amount }).
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  // apiVersion intentionally omitted → use the SDK's pinned default.
  _stripe = new Stripe(key);
  return _stripe;
}
