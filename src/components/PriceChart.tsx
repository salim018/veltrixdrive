"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot
} from "recharts";
import type { PricePoint } from "@/types/analysis";
import { useI18n } from "@/lib/i18n/provider";
import { formatMoney } from "@/lib/format";

interface Props {
  data: PricePoint[];
  currency: string;
}

export function PriceChart({ data, currency }: Props) {
  const { t } = useI18n();

  // Build two parallel series so the forecast point renders distinctly.
  const chartData = data.map((p) => ({
    year: p.year,
    actual: p.is_forecast ? null : p.value,
    forecast: p.is_forecast ? p.value : null,
    // a "joined" series so the line is continuous across the boundary
    line: p.value,
    is_forecast: p.is_forecast
  }));

  // Find the forecast point coords for the marker
  const forecast = chartData.find((p) => p.is_forecast);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="vlx-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b8af0" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0b8af0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e6eef7" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#e6eef7" }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(v) => {
              try {
                return new Intl.NumberFormat(undefined, {
                  notation: "compact",
                  maximumFractionDigits: 1
                }).format(v as number);
              } catch {
                return String(v);
              }
            }}
          />
          <Tooltip
            cursor={{ stroke: "#bae0ff", strokeWidth: 1 }}
            contentStyle={{
              background: "white",
              border: "1px solid #e6eef7",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 4px 20px -8px rgba(11,62,112,0.15)"
            }}
            formatter={(value: number | string, _name, item) => {
              const isForecast = item?.payload?.is_forecast;
              const label = isForecast ? t("result.chart.forecast") : t("result.chart.actual");
              return [formatMoney(Number(value), currency), label];
            }}
            labelFormatter={(label) => `${label}`}
          />

          {/* Solid area for actual values */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#006dcc"
            strokeWidth={2.5}
            fill="url(#vlx-area)"
            connectNulls
            isAnimationActive={false}
          />

          {/* Dashed forecast tail — drawn over the same baseline using a Line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#0b8af0"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />

          {forecast && (
            <ReferenceDot
              x={forecast.year}
              y={forecast.line}
              r={5}
              fill="#0b8af0"
              stroke="white"
              strokeWidth={2}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-brand-700" />
          {t("result.chart.actual")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-brand-500" style={{ backgroundImage: "repeating-linear-gradient(90deg,#0b8af0 0 4px,transparent 4px 7px)" }} />
          {t("result.chart.forecast")}
        </span>
      </div>
    </div>
  );
}
