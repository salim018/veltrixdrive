"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import type { HistoryItem, Recommendation } from "@/types/analysis";

const recCls: Record<Recommendation, string> = {
  buy: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  dont_buy: "bg-red-50 text-red-800 ring-red-100",
  risky: "bg-amber-50 text-amber-800 ring-amber-100"
};

const recKey: Record<Recommendation, string> = {
  buy: "result.rec.buy",
  dont_buy: "result.rec.dont_buy",
  risky: "result.rec.risky"
};

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const { t } = useI18n();

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
        {t("history.title")}
      </h1>

      {items.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-ink-500">{t("history.empty")}</p>
          <Link href="/dashboard" className="btn-primary mt-4 inline-flex">
            {t("nav.dashboard")}
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((it) => {
            const rec = it.result.recommendation;
            const date = new Date(it.created_at).toLocaleDateString(undefined, {
              year: "numeric", month: "short", day: "numeric"
            });
            const preview = it.input_value.slice(0, 120);
            return (
              <Link
                key={it.id}
                href={`/result?id=${it.id}`}
                className="flex flex-col gap-3 rounded-2xl bg-white p-5 ring-1 ring-brand-100 shadow-soft transition hover:ring-brand-200 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-display text-lg font-extrabold text-brand-700 ring-1 ring-brand-100">
                    {it.result.deal_score.toFixed(1)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {preview}{it.input_value.length > 120 ? "…" : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {date} · {it.input_type.toUpperCase()} · {it.language.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${recCls[rec]}`}>
                    {t(recKey[rec])}
                  </span>
                  <span className="text-sm font-medium text-brand-700">{t("history.view")} →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
