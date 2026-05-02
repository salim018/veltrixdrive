"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { Mascot } from "@/components/Mascot";
import { ScamRiskBadge } from "@/components/ScamRiskBadge";

export function LandingContent({ isAuthed }: { isAuthed: boolean }) {
  const { t } = useI18n();
  const ctaHref = isAuthed ? "/dashboard" : "/login?next=/dashboard";

  return (
    <main>
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden mesh-bg">
        <div className="absolute inset-0 grid-lines opacity-60" aria-hidden />
        <div className="container-page relative grid gap-12 py-16 md:grid-cols-[1.2fr_1fr] md:items-center md:py-24">
          <div>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] text-ink-900 sm:text-5xl md:text-6xl">
              {t("hero.headline")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-500">
              {t("hero.subtext")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={ctaHref} className="btn-primary">
                {t("hero.cta")}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a href="#example" className="btn-ghost">{t("hero.secondary")}</a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-500">
              {[t("hero.proof1"), t("hero.proof2")].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M3 8l3 3 7-7" stroke="#006dcc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* HERO PREVIEW CARD */}
          <div className="relative">
            <div className="relative rounded-3xl bg-white p-5 ring-1 ring-brand-100 shadow-soft">
              <div className="flex items-center gap-3">
                <Mascot size={56} />
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-ink-500">VeltrixDrive</p>
                  <p className="text-sm font-bold text-ink-900">2018 BMW 3 Series · €18,900</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                  {t("result.rec.buy")}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
                  <p className="text-[10px] uppercase tracking-wider text-ink-500">{t("result.score")}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-brand-700">8.4</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700">{t("result.priceEval")}</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">{t("result.verdict.fair")}</p>
                </div>
                <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
                  <p className="text-[10px] uppercase tracking-wider text-ink-500">{t("result.scamRisk")}</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">{t("result.scam.low")}</p>
                </div>
              </div>

              {/* mini sparkline placeholder */}
              <div className="mt-5 rounded-xl bg-brand-50/40 p-3 ring-1 ring-brand-100">
                <p className="text-[10px] uppercase tracking-wider text-ink-500">{t("result.priceHistory")}</p>
                <svg viewBox="0 0 200 50" className="mt-2 h-12 w-full" aria-hidden>
                  <defs>
                    <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0b8af0" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0b8af0" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,8 L40,15 L80,22 L120,28 L160,33 L200,37"
                    stroke="#006dcc"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M0,8 L40,15 L80,22 L120,28 L160,33 L200,37 L200,50 L0,50 Z"
                    fill="url(#hero-spark)"
                  />
                  <path
                    d="M200,37 L240,40"
                    stroke="#0b8af0"
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            <div className="absolute -right-3 -top-3 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-soft">
              Live preview
            </div>
          </div>
        </div>
      </section>

      {/* ===================== INPUT DEMO ===================== */}
      <section className="container-page py-16">
        <div className="card overflow-hidden">
          <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
            <div className="p-6 sm:p-8">
              <p className="label">Try it</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
                {t("dashboard.title")}
              </h2>
              <p className="mt-2 text-sm text-ink-500">{t("dashboard.subtitle")}</p>

              <div className="mt-5 rounded-xl bg-brand-50/40 p-4 ring-1 ring-brand-100">
                <p className="font-mono text-xs leading-relaxed text-ink-700">
                  https://www.autoscout24.com/lst/bmw/3-series/yr-2018-2019?...
                </p>
              </div>
              <p className="mt-2 text-xs text-ink-500">— or —</p>
              <div className="mt-2 rounded-xl bg-brand-50/40 p-4 ring-1 ring-brand-100">
                <p className="text-sm leading-relaxed text-ink-700">
                  &ldquo;2018 BMW 320d, 95,000 km, manual, full service history, asking €18,900 in Munich.&rdquo;
                </p>
              </div>

              <Link href={ctaHref} className="btn-primary mt-6 inline-flex">
                {t("hero.cta")}
              </Link>
            </div>

            <div className="bg-gradient-to-br from-brand-50 to-white p-6 sm:p-8">
              <ul className="space-y-3 text-sm text-ink-700">
                <li className="flex items-start gap-3">
                  <Bullet />
                  {t("dashboard.tip1")}
                </li>
                <li className="flex items-start gap-3">
                  <Bullet />
                  {t("dashboard.tip2")}
                </li>
                <li className="flex items-start gap-3">
                  <Bullet />
                  {t("dashboard.tip3")}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== EXAMPLE OUTPUT ===================== */}
      <section id="example" className="bg-brand-50/30 py-16 md:py-24">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
              {t("landing.example.title")}
            </h2>
            <p className="mt-2 text-ink-500">{t("landing.example.subtitle")}</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <SamplePanel
              title={t("result.score")}
              accent="emerald"
              big="8.4 / 10"
              body="Strong condition, fair price, well-maintained service history."
            />
            <SamplePanel
              title={t("result.priceEval")}
              accent="brand"
              big={t("result.verdict.fair")}
              body="Listed at €18,900 vs market €17,800–€19,500 → fair deal."
            />
            <SamplePanel
              title={t("result.scamRisk")}
              accent="emerald"
              chip={<ScamRiskBadge risk="low" />}
              body="No suspicious wording. Price aligned with market. Photos and VIN provided."
            />
            <SamplePanel
              title={t("result.priceHistory")}
              accent="brand"
              body="Estimated value 2021: €24,500 → 2025: €18,900 → forecast 2026: €17,400. ~9%/yr depreciation."
            />
            <SamplePanel
              title={t("result.inspection.redFlags")}
              accent="red"
              body="Walk away if: no service book, repainted panels, refusal to do a cold start, mismatched VIN."
            />
            <SamplePanel
              title={t("result.negotiation")}
              accent="brand"
              big="€17,950"
              body="Suggested offer 5% below ask. Lever: needs new tires, two minor stone chips on hood."
            />
          </div>
        </div>
      </section>

      {/* ===================== BENEFITS ===================== */}
      <section className="container-page py-16 md:py-24">
        <h2 className="max-w-2xl font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
          {t("landing.benefits.title")}
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="card flex items-start gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Check />
              </div>
              <p className="text-base leading-relaxed text-ink-700">
                {t(`landing.benefits.b${n}`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="bg-brand-50/30 py-16 md:py-24">
        <div className="container-page">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { k: 1, icon: "🎯" },
              { k: 2, icon: "🛡️" },
              { k: 3, icon: "📈" },
              { k: 4, icon: "🔧" }
            ].map(({ k, icon }) => (
              <div key={k} className="card p-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-xl ring-1 ring-brand-100">
                  {icon}
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-ink-900">
                  {t(`landing.feature${k}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  {t(`landing.feature${k}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="container-page py-16 md:py-24">
        <h2 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
          {t("landing.how.title")}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card p-6">
              <div className="label">Step {n}</div>
              <p className="mt-3 text-base font-medium leading-relaxed text-ink-900">
                {t(`landing.how.step${n}`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== TRUST ===================== */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
              {t("landing.trust.title")}
            </h2>
            <p className="mt-2 text-ink-500">{t("landing.trust.subtitle")}</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="card p-6">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <path d="M3 9l3 3 9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-ink-900">{t(`landing.trust.t${n}.title`)}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{t(`landing.trust.t${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== PRICING PREVIEW ===================== */}
      <section className="bg-brand-50/30 py-16 md:py-24">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
              {t("landing.pricing.title")}
            </h2>
            <p className="mt-2 text-ink-500">{t("landing.pricing.subtitle")}</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <PricingCard name={t("billing.starter")} price="€5"  credits="10" />
            <PricingCard name={t("billing.popular")} price="€15" credits="40" highlight />
            <PricingCard name={t("billing.pro")}     price="€29" credits="100" />
          </div>

          <div className="mt-8 flex justify-center">
            <Link href={isAuthed ? "/dashboard/billing" : "/login?next=/dashboard/billing"} className="btn-ghost">
              {t("landing.pricing.viewAll")} →
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="container-page py-16 md:py-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-10 md:p-14">
          <div className="relative">
            <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              {t("hero.headline")}
            </h2>
            <p className="mt-3 max-w-xl text-brand-100/90">{t("hero.subtext")}</p>
            <Link
              href={ctaHref}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              {t("hero.cta")}
            </Link>
          </div>
          <div className="pointer-events-none absolute -right-10 -bottom-10 opacity-20" aria-hidden>
            <div className="h-64 w-64 rounded-full bg-white blur-3xl" />
          </div>
        </div>
      </section>
    </main>
  );
}

function Bullet() {
  return (
    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
  );
}

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 9l3.5 3.5L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SamplePanel({
  title,
  body,
  big,
  chip,
  accent
}: {
  title: string;
  body: string;
  big?: string;
  chip?: React.ReactNode;
  accent: "brand" | "emerald" | "red";
}) {
  const accentCls =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "red"
      ? "text-red-700"
      : "text-brand-700";
  return (
    <div className="card flex h-full flex-col p-6">
      <p className="label">{title}</p>
      {big && (
        <p className={`mt-2 font-display text-2xl font-extrabold ${accentCls}`}>{big}</p>
      )}
      {chip && <div className="mt-2">{chip}</div>}
      <p className="mt-3 text-sm leading-relaxed text-ink-500">{body}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  credits,
  highlight = false
}: {
  name: string;
  price: string;
  credits: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl bg-white p-6 ring-1 shadow-soft ${
        highlight ? "ring-brand-300" : "ring-brand-100"
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Popular
        </span>
      )}
      <p className="font-display text-lg font-bold text-ink-900">{name}</p>
      <p className="mt-3 font-display text-4xl font-extrabold text-ink-900">{price}</p>
      <p className="mt-1 text-sm text-ink-500">{credits} credits</p>
    </div>
  );
}
