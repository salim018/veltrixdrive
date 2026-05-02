"use client";

import { useI18n } from "@/lib/i18n/provider";
import { formatMoney, formatMoneyRange } from "@/lib/format";
import type { MarketValue, PriceEvaluation } from "@/types/analysis";

const verdictStyle = {
  underpriced: {
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    bar: "bg-emerald-500",
    labelKey: "result.verdict.underpriced"
  },
  fair: {
    chip: "bg-brand-50 text-brand-700 ring-brand-200",
    bar: "bg-brand-500",
    labelKey: "result.verdict.fair"
  },
  overpriced: {
    chip: "bg-red-50 text-red-800 ring-red-200",
    bar: "bg-red-500",
    labelKey: "result.verdict.overpriced"
  },
  unknown: {
    chip: "bg-ink-100 text-ink-700 ring-ink-300/40",
    bar: "bg-ink-300",
    labelKey: "result.verdict.unknown"
  }
} as const;

interface Props {
  evaluation: PriceEvaluation;
  market: MarketValue;
}

export function PriceVerdictBox({ evaluation, market }: Props) {
  const { t } = useI18n();
  const s = verdictStyle[evaluation.verdict];
  const cur = market.currency;

  // Position the listing-price marker on a 0..100 axis spanning [low, high].
  // Clamp to a small visible range outside.
  const span = Math.max(1, market.high - market.low);
  let pct = 50;
  if (evaluation.listing_price != null) {
    pct = ((evaluation.listing_price - market.low) / span) * 100;
    pct = Math.max(-15, Math.min(115, pct));
  }
  const inRange = pct >= 0 && pct <= 100;

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label">{t("result.priceEval")}</p>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ring-1 ${s.chip}`}>
          {t(s.labelKey)}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-ink-500">{t("result.listingPrice")}</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">
            {evaluation.listing_price != null
              ? formatMoney(evaluation.listing_price, cur)
              : "—"}
          </p>
          {evaluation.listing_price != null && evaluation.delta_pct !== 0 && (
            <p className="mt-1 text-xs text-ink-500">
              {evaluation.delta_pct > 0 ? "+" : ""}
              {evaluation.delta_pct.toFixed(1)}% {t("result.delta")}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-ink-500">{t("result.marketValue")}</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">
            {formatMoneyRange(market.low, market.high, cur)}
          </p>
        </div>
      </div>

      {/* Price position bar */}
      <div className="mt-6">
        <div className="relative h-2 w-full rounded-full bg-brand-50 ring-1 ring-brand-100">
          {/* fair zone shading */}
          <div className="absolute inset-y-0 rounded-full bg-brand-100" style={{ left: "0%", right: "0%" }} />
          {evaluation.listing_price != null && (
            <div
              className={`absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full ring-2 ring-white ${s.bar}`}
              style={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
              aria-label="Listing price marker"
            />
          )}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-ink-500">
          <span>{formatMoney(market.low, cur)}</span>
          <span>{formatMoney(market.high, cur)}</span>
        </div>
        {evaluation.listing_price != null && !inRange && (
          <p className="mt-2 text-[11px] text-ink-500">
            Listing falls outside the typical market range.
          </p>
        )}
      </div>

      <p className="mt-5 rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900 ring-1 ring-brand-100">
        {evaluation.explanation}
      </p>
    </div>
  );
}
