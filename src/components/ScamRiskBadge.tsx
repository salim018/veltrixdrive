"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { ScamRisk } from "@/types/analysis";

const riskStyle: Record<ScamRisk, { wrap: string; dot: string; labelKey: string }> = {
  low: {
    wrap: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    dot: "bg-emerald-500",
    labelKey: "result.scam.low"
  },
  medium: {
    wrap: "bg-amber-50 text-amber-800 ring-amber-100",
    dot: "bg-amber-500",
    labelKey: "result.scam.medium"
  },
  high: {
    wrap: "bg-red-50 text-red-800 ring-red-100",
    dot: "bg-red-500",
    labelKey: "result.scam.high"
  }
};

export function ScamRiskBadge({ risk, size = "md" }: { risk: ScamRisk; size?: "md" | "lg" }) {
  const { t } = useI18n();
  const s = riskStyle[risk];
  const cls =
    size === "lg"
      ? "px-4 py-2 text-base"
      : "px-3 py-1.5 text-sm";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full font-bold ring-1 ${s.wrap} ${cls}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {t(s.labelKey)}
    </span>
  );
}
