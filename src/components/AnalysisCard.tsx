"use client";

import { useI18n } from "@/lib/i18n/provider";
import { Mascot } from "./Mascot";
import { PriceVerdictBox } from "./PriceVerdictBox";
import { ScamRiskBadge } from "./ScamRiskBadge";
import { formatMoney, formatMoneyRange } from "@/lib/format";
import type { AnalysisResult, Recommendation } from "@/types/analysis";

const recStyle: Record<Recommendation, { label: string; cls: string; bar: string }> = {
  buy:      { label: "result.rec.buy",      cls: "bg-emerald-50 text-emerald-800 ring-emerald-100", bar: "bg-emerald-500" },
  dont_buy: { label: "result.rec.dont_buy", cls: "bg-red-50 text-red-800 ring-red-100",            bar: "bg-red-500" },
  risky:    { label: "result.rec.risky",    cls: "bg-amber-50 text-amber-800 ring-amber-100",      bar: "bg-amber-500" }
};

function ScoreRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(10, value)) / 10;
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - pct * c;
  const color = value >= 7.5 ? "#059669" : value >= 5 ? "#d97706" : "#dc2626";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden>
        <circle cx="56" cy="56" r={r} stroke="#e6eef7" strokeWidth="10" fill="none" />
        <circle
          cx="56" cy="56" r={r}
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 56 56)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-extrabold text-ink-900">{value.toFixed(1)}</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-500">/ 10</span>
      </div>
    </div>
  );
}

function MetricBar({ value, max = 10, color = "#0b8af0" }: { value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(max, value)) / max * 100;
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-50 ring-1 ring-brand-100">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function AnalysisCard({ result }: { result: AnalysisResult }) {
  const { t } = useI18n();
  const rec = recStyle[result.recommendation];

  return (
    <div className="space-y-6">
      {/* === HERO: SCORE + RECOMMENDATION + VERDICT === */}
      <div className="card overflow-hidden">
        <div className={`h-1.5 w-full ${rec.bar}`} />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <ScoreRing value={result.deal_score} />
              <div>
                <p className="label">{t("result.score")}</p>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-700">
                  {result.score_interpretation}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ring-1 ${rec.cls}`}>
                {t(rec.label)}
              </span>
              <p className="max-w-xs text-xs text-ink-500 md:text-right">
                {result.recommendation_reason}
              </p>
            </div>
          </div>

          {/* Deal verdict band */}
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-brand-50 to-white p-5 ring-1 ring-brand-100">
            <p className="label">{t("result.dealVerdict")}</p>
            <p className="mt-2 text-base font-semibold leading-relaxed text-ink-900">
              {result.deal_verdict}
            </p>
          </div>

          {/* Confidence ribbon (server-computed grounding indicator) */}
          {result.confidence && (
            <ConfidenceBanner confidence={result.confidence} />
          )}
        </div>
      </div>

      {/* === SUMMARY (mascot) === */}
      <div className="card p-6">
        <div className="flex items-start gap-3">
          <Mascot size={64} state="done" />
          <div className="min-w-0 flex-1">
            <p className="label">{t("mascot.done")}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{result.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-500">
              <span>
                {t("result.region")}: <span className="font-semibold text-ink-700">{result.region}</span>
              </span>
              <span>
                {t("result.mileage")}:{" "}
                <span className="font-semibold text-ink-700">
                  {result.mileage
                    ? `${result.mileage.value.toLocaleString()} ${result.mileage.unit}${
                        result.mileage.unit === "mi" ? ` (${result.mileage.km.toLocaleString()} km)` : ""
                      }`
                    : t("result.unknown")}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* === VEHICLE SPEC === */}
      <VehicleSpecCard spec={result.vehicle_spec} />

      {/* === PRICE EVALUATION === */}
      <PriceVerdictBox evaluation={result.price_evaluation} market={result.market_value} />

      {/* === SCAM RISK === */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label">{t("result.scamRisk")}</p>
          <ScamRiskBadge risk={result.scam_risk} size="lg" />
        </div>
        <div className="mt-4">
          <p className="label">{t("result.scamSignals")}</p>
          {result.scam_signals.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">{t("result.noScamSignals")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {result.scam_signals.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-700">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 shrink-0">
                    <path d="M8 2l6 11H2L8 2z" stroke="#dc2626" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M8 7v3M8 12v.01" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* === OWNERSHIP ECONOMICS === */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <p className="label">{t("result.reliability")}</p>
          <p className="mt-2 font-display text-3xl font-extrabold text-ink-900">
            {result.reliability_score.toFixed(1)}
            <span className="ml-1 text-sm text-ink-500">/ 10</span>
          </p>
          <MetricBar
            value={result.reliability_score}
            color={result.reliability_score >= 7.5 ? "#059669" : result.reliability_score >= 5 ? "#d97706" : "#dc2626"}
          />
        </div>
        <div className="card p-6">
          <p className="label">{t("result.maintenance")}</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">
            {formatMoneyRange(
              result.maintenance_cost_estimate.yearly_low,
              result.maintenance_cost_estimate.yearly_high,
              result.maintenance_cost_estimate.currency
            )}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            {result.maintenance_cost_estimate.notes}
          </p>
        </div>
      </div>

      {/* === EXPERT INSIGHTS === */}
      <OwnershipCostCard data={result.ownership_cost_estimate} />

      <div className="grid gap-6 md:grid-cols-3">
        <FuelEconomyCard data={result.fuel_economy_estimate} />
        <LifespanCard data={result.lifespan_estimate} />
        <ResaleCard data={result.resale_outlook} />
      </div>

      {/* === COMMON ISSUES (model-specific) === */}
      {result.common_issues.length > 0 && (
        <div className="card p-6">
          <p className="label">{t("result.commonIssues")}</p>
          <ul className="mt-3 space-y-2">
            {result.common_issues.map((issue, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* === PROS / CONS === */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <p className="label">{t("result.pros")}</p>
          <ul className="mt-3 space-y-2">
            {result.pros.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink-700">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <p className="label">{t("result.cons")}</p>
          <ul className="mt-3 space-y-2">
            {result.cons.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink-700">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* === RISKS === */}
      <div className="card p-6">
        <p className="label">{t("result.risks")}</p>
        <ul className="mt-3 space-y-2">
          {result.risks.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-700">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="mt-0.5 shrink-0">
                <path d="M8 2l6 11H2L8 2z" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 7v3M8 12v.01" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* === INSPECTION CHECKLIST === */}
      <div className="card p-6">
        <p className="label">{t("result.inspection")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ChecklistGroup title={t("result.inspection.visual")} items={result.inspection_checklist.visual} />
          <ChecklistGroup title={t("result.inspection.mechanical")} items={result.inspection_checklist.mechanical} />
          <ChecklistGroup title={t("result.inspection.paperwork")} items={result.inspection_checklist.paperwork} />
          <ChecklistGroup
            title={t("result.inspection.redFlags")}
            items={result.inspection_checklist.red_flags}
            danger
            allClearMessage={t("result.noRedFlags")}
          />
        </div>
      </div>

      {/* === NEGOTIATION === */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="label">{t("result.negotiation")}</p>
          <div className="rounded-xl bg-brand-50 px-4 py-2 ring-1 ring-brand-100">
            <p className="text-[10px] uppercase tracking-wider text-ink-500">
              {t("result.suggestedOffer")}
            </p>
            <p className="font-display text-lg font-extrabold text-brand-700">
              {formatMoney(result.negotiation.suggested_offer, result.negotiation.currency)}
            </p>
          </div>
        </div>
        {result.negotiation.reasoning && (
          <p className="mt-3 text-sm italic text-ink-600">
            {result.negotiation.reasoning}
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {result.negotiation.talking_points.map((tp, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-700">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
              {tp}
            </li>
          ))}
        </ul>
      </div>

      {/* === ALTERNATIVES === */}
      {result.alternatives.length > 0 && (
        <div className="card p-6">
          <p className="label">{t("result.alternatives")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {result.alternatives.map((a, i) => (
              <div key={i} className="rounded-xl bg-brand-50/60 p-4 ring-1 ring-brand-100">
                <p className="font-semibold text-ink-900">{a.title}</p>
                <p className="mt-1 text-sm text-ink-500">{a.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistGroup({
  title,
  items,
  danger = false,
  allClearMessage
}: {
  title: string;
  items: string[];
  danger?: boolean;
  allClearMessage?: string;
}) {
  if (items.length === 0) return null;

  // Recognise the server-side "all clear" sentinel for the red-flags group.
  const SENTINEL = "No strong red flags detected based on provided data";
  const isAllClear =
    danger && items.length === 1 && items[0].trim() === SENTINEL;

  if (isAllClear) {
    return (
      <div className="rounded-xl bg-emerald-50/60 p-4 ring-1 ring-emerald-100">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          {title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-800">
          {allClearMessage ?? SENTINEL}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 ring-1 ${
        danger ? "bg-red-50/60 ring-red-100" : "bg-brand-50/40 ring-brand-100"
      }`}
    >
      <p className={`text-xs font-bold uppercase tracking-wider ${danger ? "text-red-700" : "text-ink-700"}`}>
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-700">
            <span
              className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${danger ? "bg-red-500" : "bg-brand-500"}`}
            />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfidenceBanner({ confidence }: { confidence: NonNullable<AnalysisResult["confidence"]> }) {
  // useI18n is a hook; we import it via the client directive at top of the file.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { t } = useI18n();
  const styles = {
    high:   { wrap: "bg-emerald-50 ring-emerald-100", dot: "bg-emerald-500", text: "text-emerald-800" },
    medium: { wrap: "bg-amber-50 ring-amber-100",     dot: "bg-amber-500",   text: "text-amber-800"   },
    low:    { wrap: "bg-red-50 ring-red-100",         dot: "bg-red-500",     text: "text-red-800"     }
  } as const;
  const s = styles[confidence.level];
  return (
    <div className={`mt-4 rounded-xl p-4 ring-1 ${s.wrap}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
        <p className={`text-xs font-bold uppercase tracking-wider ${s.text}`}>
          {t("result.confidence.label")}: {t(`result.confidence.${confidence.level}`)}
        </p>
      </div>
      <ul className="mt-2 space-y-0.5 text-xs text-ink-500">
        {confidence.reasons.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-300" />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================ */
/*  NEW CARDS                                                   */
/* ============================================================ */

function Kv({ label, value, estimated = false }: { label: string; value: string; estimated?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink-900">
        <span>{value}</span>
        {estimated && (
          <span
            title="Estimated from typical configuration for this model"
            className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-200"
          >
            est.
          </span>
        )}
      </p>
    </div>
  );
}

function transmissionLabel(v: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    manual: t("result.trans.manual"),
    automatic: t("result.trans.automatic"),
    semi_automatic: t("result.trans.semi_automatic"),
    unknown: t("result.unknown")
  };
  return map[v] ?? v;
}

function fuelLabel(v: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    petrol: t("result.fuel.petrol"),
    diesel: t("result.fuel.diesel"),
    hybrid: t("result.fuel.hybrid"),
    plug_in_hybrid: t("result.fuel.plug_in_hybrid"),
    electric: t("result.fuel.electric"),
    lpg: "LPG",
    cng: "CNG",
    unknown: t("result.unknown")
  };
  return map[v] ?? v;
}

function drivetrainLabel(v: string, t: (k: string) => string): string {
  const map: Record<string, string> = {
    fwd: "FWD",
    rwd: "RWD",
    awd: "AWD",
    "4wd": "4WD",
    unknown: t("result.unknown")
  };
  return map[v] ?? v;
}

function VehicleSpecCard({ spec }: { spec: AnalysisResult["vehicle_spec"] }) {
  const { t } = useI18n();
  const unknown = t("result.unknown");
  const fmt = (s: string | number | null | undefined) =>
    s === null || s === undefined || s === "unknown" || s === "" ? unknown : String(s);

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label">{t("result.vehicleSpec")}</p>
        <p className="text-xs text-ink-500">
          {fmt(spec.make)} {fmt(spec.model)}
          {spec.year ? ` · ${spec.year}` : ""}
          {spec.variant && spec.variant !== "unknown" ? ` · ${spec.variant}` : ""}
        </p>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Kv label={t("result.spec.variant")} value={fmt(spec.variant)} />
        <Kv label={t("result.spec.generation")} value={fmt(spec.generation)} />
        <Kv label={t("result.spec.bodyStyle")} value={fmt(spec.body_style)} estimated={spec.inferred?.body_style} />
        <Kv label={t("result.spec.transmission")} value={transmissionLabel(spec.transmission, t)} estimated={spec.inferred?.transmission} />
        <Kv label={t("result.spec.fuel")} value={fuelLabel(spec.fuel, t)} estimated={spec.inferred?.fuel} />
        <Kv label={t("result.spec.drivetrain")} value={drivetrainLabel(spec.drivetrain, t)} estimated={spec.inferred?.drivetrain} />
        <Kv label={t("result.spec.trim")} value={fmt(spec.trim)} estimated={spec.inferred?.trim} />
        <Kv
          label={t("result.spec.engine")}
          value={spec.engine_displacement_l ? `${spec.engine_displacement_l.toFixed(1)} L` : unknown}
          estimated={spec.inferred?.engine_displacement_l}
        />
        <Kv
          label={t("result.spec.power")}
          value={spec.power_hp ? `${spec.power_hp} hp` : unknown}
          estimated={spec.inferred?.power_hp}
        />
      </div>
      {spec.notable_features.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-wider text-ink-500">
            {t("result.spec.features")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {spec.notable_features.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
      {spec.inferred && Object.values(spec.inferred).some(Boolean) && (
        <p className="mt-4 text-xs text-ink-500">
          <span className="font-semibold text-amber-800">est.</span>{" "}
          {t("result.spec.estimatedHint")}
        </p>
      )}
    </div>
  );
}

function OwnershipCostCard({ data }: { data: AnalysisResult["ownership_cost_estimate"] }) {
  const { t } = useI18n();
  const rows: { k: string; v: string }[] = [
    { k: t("result.tco.insurance"), v: data.breakdown.insurance },
    { k: t("result.tco.maintenance"), v: data.breakdown.maintenance },
    { k: t("result.tco.tax"), v: data.breakdown.tax },
    { k: t("result.tco.depreciation"), v: data.breakdown.depreciation }
  ];
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label">{t("result.ownershipCost")}</p>
        <p className="font-display text-xl font-extrabold text-ink-900">
          {formatMoneyRange(data.yearly_low, data.yearly_high, data.currency)}
          <span className="ml-1 text-sm font-normal text-ink-500">/ yr</span>
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl bg-brand-50/40 p-3 ring-1 ring-brand-100">
            <p className="text-[10px] uppercase tracking-wider text-ink-500">{r.k}</p>
            <p className="mt-0.5 text-sm text-ink-700">{r.v}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-500">{data.notes}</p>
    </div>
  );
}

function FuelEconomyCard({ data }: { data: AnalysisResult["fuel_economy_estimate"] }) {
  const { t } = useI18n();
  return (
    <div className="card p-6">
      <p className="label">{t("result.fuelEconomy")}</p>
      <div className="mt-3 space-y-2 text-sm text-ink-700">
        <div className="flex justify-between"><span className="text-ink-500">{t("result.fe.combined")}</span><span className="font-semibold">{data.combined}</span></div>
        <div className="flex justify-between"><span className="text-ink-500">{t("result.fe.urban")}</span><span className="font-semibold">{data.urban}</span></div>
        <div className="flex justify-between"><span className="text-ink-500">{t("result.fe.highway")}</span><span className="font-semibold">{data.highway}</span></div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-500">{data.notes}</p>
    </div>
  );
}

function LifespanCard({ data }: { data: AnalysisResult["lifespan_estimate"] }) {
  const { t } = useI18n();
  return (
    <div className="card p-6">
      <p className="label">{t("result.lifespan")}</p>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">
        {data.remaining_km_estimate > 0
          ? `~${data.remaining_km_estimate.toLocaleString()} km`
          : t("result.unknown")}
      </p>
      <p className="mt-1 text-xs text-ink-500">
        {t("result.lifespan.total")}: ~{data.expected_total_km.toLocaleString()} km
        {data.expected_years_remaining > 0 ? ` · ~${Math.round(data.expected_years_remaining)} yr` : ""}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-ink-500">{data.notes}</p>
    </div>
  );
}

function ResaleCard({ data }: { data: AnalysisResult["resale_outlook"] }) {
  const { t } = useI18n();
  const liquidityStyle =
    data.liquidity === "high"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : data.liquidity === "low"
      ? "bg-red-50 text-red-800 ring-red-100"
      : "bg-amber-50 text-amber-800 ring-amber-100";
  const liqLabel =
    data.liquidity === "high"
      ? t("result.liquidity.high")
      : data.liquidity === "low"
      ? t("result.liquidity.low")
      : t("result.liquidity.medium");
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label">{t("result.resale")}</p>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${liquidityStyle}`}>
          {t("result.liquidityLabel")}: {liqLabel}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-500">{t("result.resale.1y")}</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold text-ink-900">{Math.round(data.one_year_pct)}%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ink-500">{t("result.resale.3y")}</p>
          <p className="mt-0.5 font-display text-2xl font-extrabold text-ink-900">{Math.round(data.three_year_pct)}%</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-500">{data.notes}</p>
    </div>
  );
}
