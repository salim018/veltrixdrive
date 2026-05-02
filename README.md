# VeltrixDrive

**AI-powered car purchase decision platform.** Paste a car listing URL or description, get an instant structured buying analysis: deal score, market value, a confident Buy / Don't Buy / Risky verdict, pros, cons, risks, and a negotiation strategy.

Built with Next.js 14 (App Router), TypeScript, Tailwind, Supabase, OpenAI.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Environment variables
cp .env.example .env.local
# Fill in OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL

# 3. Database: open Supabase SQL editor and run
#    supabase/schema.sql

# 4. Dev
npm run dev
```

Visit <http://localhost:3000>.

---

## Environment variables

| Variable | Purpose | Where |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key | **Server only** |
| `OPENAI_MODEL` | Model name (default `gpt-4o-mini`) | Server |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key | **Server only** |
| `NEXT_PUBLIC_APP_URL` | App base URL | Public |
| `STRIPE_SECRET_KEY` | Stripe secret (optional) | Server |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook (optional) | Server |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable (optional) | Public |

### Security

- **`OPENAI_API_KEY` is read only on the server** (see `src/lib/ai/analyze.ts`). It is never imported from a Client Component and never exposed to the browser.
- **`SUPABASE_SERVICE_ROLE_KEY`** is only used in `src/lib/supabase/admin.ts` from server routes.
- Credits are spent atomically via the `consume_credit` Postgres RPC — clients cannot bypass the cost.

---

## Architecture

```
src/
  app/
    page.tsx              Landing (/)
    login/                Login / signup (/login)
    dashboard/            Main tool (/dashboard)
    result/               Analysis result view (/result)
    history/              Past analyses (/history)
    terms/ privacy/ cookies/   Legal
    api/
      analyze/            POST /api/analyze  (auth + credit + AI + persist)
      auth/callback/      OAuth / magic-link session exchange
  components/             Logo, Mascot, Header, Footer, LanguageSwitcher,
                          CookieBanner, AnalysisCard, LegalLayout
  lib/
    ai/analyze.ts         Server-only OpenAI call + Zod schema validation
    supabase/             Browser / server / admin clients
    auth/session.ts       getSessionUser() helper
    i18n/                 Dictionaries + provider (EN, NL, DE, FR, ES, IT)
    stripe.ts             Stub — ready for credit top-ups
  middleware.ts           Session refresh + route protection
  types/analysis.ts       Shared result types
supabase/schema.sql       Full DB schema + RLS + consume_credit RPC
```

### Request flow — `/api/analyze`

1. **Auth** — `supabase.auth.getUser()` from the server client.
2. **Validate body** — `zod` schema (min 20 chars, max 5000, language whitelist).
3. **Detect input type** — URL vs text.
4. **Consume credit** — `supabase.rpc('consume_credit', { p_user_id })`. Atomic; raises `insufficient_credits` → HTTP 402.
5. **Run AI** — OpenAI `chat.completions.create` with `response_format: json_object`, low temperature, strict system prompt.
6. **Validate output** — `zod` schema on the parsed JSON.
7. **On AI failure** — refund the credit, return HTTP 502.
8. **Persist** — insert into `analyses` with RLS.
9. **Return** — `{ result, credits, id }`.

### AI output contract

Every analysis returns:

- `deal_score` (1–10) + `score_interpretation`
- `market_value` (`low`, `high`, `currency`)
- `recommendation` — one of `"buy"`, `"dont_buy"`, `"risky"` (no fence-sitting)
- `recommendation_reason`
- `pros[]`, `cons[]`, `risks[]`
- `negotiation` — `suggested_offer`, `currency`, `talking_points[]`
- `alternatives[]`
- `summary`

The system prompt forces a confident, committed verdict and an integer suggested offer.

---

## Database schema

Run `supabase/schema.sql` once in the Supabase SQL editor. It creates:

- `public.users` — `id`, `email`, `credits` (default 10), `created_at`
- `public.analyses` — history of analyses, JSONB `result`
- Trigger `on_auth_user_created` → creates a `users` row with 10 starter credits on every new signup
- RPC `consume_credit(p_user_id uuid)` — atomic, `SECURITY DEFINER`
- RLS policies so each user only sees their own rows

---

## i18n

Six locales: English (default), Dutch, German, French, Spanish, Italian. Switch via the header dropdown. The selected locale is:

1. Sent with every analyze request so the AI writes output in that language.
2. Persisted in `localStorage`.
3. Auto-detected from the browser on first visit.

Add strings to `src/lib/i18n/dictionaries.ts`.

---

## Pages

| Path | Purpose |
|---|---|
| `/` | Landing — hero, features, how-it-works, CTA |
| `/login` | Email+password / Google / magic link |
| `/dashboard` | Paste URL or description, submit |
| `/result` | Rendered analysis (score ring, verdict, pros/cons/risks, negotiation, alternatives) |
| `/history` | List of past analyses (click to view) |
| `/terms` `/privacy` `/cookies` | Legal |

Protected routes: `/dashboard`, `/result`, `/history` (enforced in `middleware.ts`).

---

## Credits & Stripe

- Every new user starts with **10 credits** (set by the Postgres trigger).
- **1 analysis = 1 credit.** At zero, the dashboard blocks input and shows an upgrade message.
- Stripe is stubbed in `src/lib/stripe.ts`. To enable top-ups, add a Checkout route and a webhook that increments `public.users.credits`. The README in that file explains the exact pattern.

---

## Deploy

Any Node host works (Vercel recommended for Next.js App Router).

1. Set all env vars in the host dashboard.
2. Point your domain to the deployment.
3. Set `NEXT_PUBLIC_APP_URL` to the production URL.
4. Configure Supabase Auth redirect URL to `https://your-domain/api/auth/callback`.

---

## Legal / Company

- **KVK:** 99933098
- **Email:** info@bedrijfsnaam.com
- **Disclaimer:** VeltrixDrive provides AI-based informational estimates only and is not responsible for financial decisions made by users.
