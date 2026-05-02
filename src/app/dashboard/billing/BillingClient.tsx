"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

type PackId = "starter" | "popular" | "pro";

type Pack = {
  id: PackId;
  nameKey: string;
  price: number;       // EUR
  credits: number;
  highlight?: boolean;
};

const PACKS: Pack[] = [
  { id: "starter", nameKey: "billing.starter", price: 5,  credits: 10 },
  { id: "popular", nameKey: "billing.popular", price: 15, credits: 40, highlight: true },
  { id: "pro",     nameKey: "billing.pro",     price: 29, credits: 100 }
];

function fmtEur(amount: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `€${amount}`;
  }
}

export function BillingClient({ credits }: { credits: number }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<PackId | null>(null);
  const [loading, setLoading] = useState<PackId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(packId: PackId) {
    setSelected(packId);
    setLoading(packId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: packId })
      });
      if (res.status === 401) {
        window.location.href = "/login?next=/dashboard/billing";
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Checkout failed");
      }
      const { url } = await res.json();
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
          {t("billing.title")}
        </h1>
        <p className="mt-2 text-ink-500">{t("billing.subtitle")}</p>
      </div>

      {/* CURRENT BALANCE */}
      <div className="card overflow-hidden">
        <div className="grid gap-0 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="p-6 sm:p-8">
            <p className="label">{t("billing.balance")}</p>
            <p className="mt-2 font-display text-5xl font-extrabold text-ink-900">{credits}</p>
            <p className="mt-1 text-sm text-ink-500">{t("billing.creditsLeft")}</p>
          </div>
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
            <p className="text-xs uppercase tracking-wider opacity-80">VeltrixDrive</p>
            <p className="mt-2 font-display text-xl font-bold">Pay-as-you-go</p>
            <p className="mt-1 text-sm opacity-90">No subscription. Credits never expire.</p>
          </div>
        </div>
      </div>

      {/* PACKS */}
      <div>
        <h2 className="font-display text-xl font-bold text-ink-900">{t("billing.choosePack")}</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {PACKS.map((p) => {
            const perCredit = p.price / p.credits;
            const isSelected = selected === p.id;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl bg-white p-6 ring-1 transition ${
                  p.highlight
                    ? "ring-brand-300 shadow-soft"
                    : "ring-brand-100 shadow-soft"
                } ${isSelected ? "ring-2 ring-brand-500" : ""}`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {t("billing.popular")}
                  </span>
                )}
                <p className="font-display text-lg font-bold text-ink-900">{t(p.nameKey)}</p>
                <p className="mt-3 font-display text-4xl font-extrabold text-ink-900">
                  {fmtEur(p.price)}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  {p.credits} {t("billing.creditsLabel")} ·{" "}
                  <span className="text-ink-700">€{perCredit.toFixed(2)} {t("billing.perCredit")}</span>
                </p>

                <ul className="mt-5 space-y-2 text-sm text-ink-700">
                  <li className="flex items-start gap-2">
                    <Check />
                    <span>{p.credits} full analyses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check />
                    <span>Scam detection & inspection checklist</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check />
                    <span>Price forecast & history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check />
                    <span>Credits never expire</span>
                  </li>
                </ul>

                <button
                  type="button"
                  onClick={() => startCheckout(p.id)}
                  disabled={loading !== null}
                  className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    p.highlight
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "bg-brand-50 text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100"
                  }`}
                >
                  {loading === p.id ? t("billing.redirecting") : t("billing.cta")}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        {/* Thanks / info message */}
        <div className="mt-6 rounded-xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100">
          {selected && loading === null ? t("billing.thanks") : t("billing.secureCheckout")}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="font-display text-xl font-bold text-ink-900">{t("billing.faq.title")}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card p-5">
              <p className="text-sm font-semibold text-ink-900">{t(`billing.faq.q${n}`)}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{t(`billing.faq.a${n}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 shrink-0">
      <circle cx="8" cy="8" r="8" fill="#e0efff" />
      <path d="M5 8.5l2 2 4-4.5" stroke="#006dcc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
