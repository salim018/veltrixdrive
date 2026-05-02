"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Mascot } from "@/components/Mascot";

const STORAGE_KEY = "veltrixdrive.lastResult";
const CURRENT_YEAR = new Date().getUTCFullYear();

type MileageUnit = "km" | "mi";

type FieldError = string | null;

export function DashboardClient({ initialCredits }: { initialCredits: number }) {
  const { t, locale } = useI18n();
  const router = useRouter();

  // Primary input (URL or short description) — still useful but NO LONGER the only input.
  const [input, setInput] = useState("");
  // Extra free-text description — improves AI accuracy, optional.
  const [extra, setExtra] = useState("");
  const [showExtra, setShowExtra] = useState(false);

  // REQUIRED fields.
  const [priceStr, setPriceStr] = useState("");
  const [currency, setCurrency] = useState<string>("EUR");
  const [mileageStr, setMileageStr] = useState("");
  const [mileageUnit, setMileageUnit] = useState<MileageUnit>("km");
  const [yearStr, setYearStr] = useState("");

  // UX state.
  const [credits, setCredits] = useState(initialCredits);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    input: false,
    price: false,
    mileage: false,
    year: false
  });

  // Validation.
  const errors = useMemo<{
    input: FieldError;
    price: FieldError;
    mileage: FieldError;
    year: FieldError;
  }>(() => {
    const priceNum = Number(priceStr);
    const mileageNum = Number(mileageStr);
    const yearNum = parseInt(yearStr, 10);

    return {
      input:
        input.trim().length < 20
          ? t("dashboard.validation.inputTooShort")
          : null,
      price:
        !priceStr.trim() || !Number.isFinite(priceNum) || priceNum <= 0
          ? t("dashboard.validation.priceRequired")
          : priceNum > 10_000_000
          ? t("dashboard.validation.priceRange")
          : null,
      mileage:
        !mileageStr.trim() || !Number.isFinite(mileageNum) || mileageNum <= 0
          ? t("dashboard.validation.mileageRequired")
          : mileageNum > 1_500_000
          ? t("dashboard.validation.mileageRange")
          : null,
      year:
        !yearStr.trim() ||
        !Number.isFinite(yearNum) ||
        yearNum < 1950 ||
        yearNum > CURRENT_YEAR + 1
          ? t("dashboard.validation.yearRequired")
          : null
    };
  }, [input, priceStr, mileageStr, yearStr, t]);

  const hasErrors =
    !!errors.input || !!errors.price || !!errors.mileage || !!errors.year;
  const disabled = credits <= 0 || loading || hasErrors;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Mark everything as touched so errors show on submit attempt.
    setTouched({ input: true, price: true, mileage: true, year: true });
    if (disabled) return;

    setLoading(true);
    setServerError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: input.trim(),
          additional_details: extra.trim() || null,
          language: locale,
          overrides: {
            listing_price: Number(priceStr),
            currency: currency || null,
            mileage_value: Number(mileageStr),
            mileage_unit: mileageUnit,
            year: parseInt(yearStr, 10)
          }
        })
      });

      if (res.status === 402) {
        setServerError(t("dashboard.noCredits"));
        setCredits(0);
        return;
      }
      if (res.status === 401) {
        router.push("/login?next=/dashboard");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Prefer the server's friendly `message` field (temporary_issue,
        // analysis_in_progress, etc.) over the raw `error` code.
        const friendly =
          (typeof data?.message === "string" && data.message) ||
          t("dashboard.error.generic");
        throw new Error(friendly);
      }

      const data = await res.json();
      // Update local state immediately so the form's own counter reflects
      // the new balance.
      setCredits(data.credits);
      // Ask the router to re-render the server components on this route so
      // anything that reads credits from the server session (e.g. the Header
      // credit pill) shows the new value without waiting for a hard refresh.
      router.refresh();

      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            id: data.id,
            result: data.result,
            input,
            createdAt: Date.now()
          })
        );
      } catch {
        /* noop */
      }

      router.push(data.id ? `/result?id=${data.id}` : "/result");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : t("dashboard.error.generic")
      );
    } finally {
      setLoading(false);
    }
  }

  // Helpers to decide whether to show an error for a field.
  const show = (k: keyof typeof touched, err: FieldError) =>
    touched[k] && err;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px] md:items-start">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
          {t("dashboard.title")}
        </h1>
        <p className="mt-2 text-ink-500">{t("dashboard.subtitle")}</p>

        <form onSubmit={submit} noValidate className="mt-6 card p-5 sm:p-6">
          {/* Link / short description */}
          <label htmlFor="carInput" className="label">
            {t("dashboard.field.link")}
          </label>
          <textarea
            id="carInput"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, input: true }))}
            placeholder={t("dashboard.placeholder")}
            rows={3}
            className={`mt-2 w-full resize-none rounded-xl border-0 bg-brand-50/40 p-4 text-sm leading-relaxed ring-1 placeholder:text-ink-300 focus:outline-none focus:ring-2 ${
              show("input", errors.input)
                ? "ring-red-200 focus:ring-red-500"
                : "ring-brand-100 focus:ring-brand-500"
            }`}
            maxLength={5000}
            aria-invalid={!!show("input", errors.input)}
          />
          {show("input", errors.input) ? (
            <p className="mt-1 text-xs text-red-700">{errors.input}</p>
          ) : (
            <p className="mt-1 text-xs text-ink-500">
              {t("dashboard.field.linkHint")}
            </p>
          )}

          {/* REQUIRED fields — shown directly, not collapsed */}
          <div className="mt-5 rounded-xl bg-brand-50/40 p-4 ring-1 ring-brand-100">
            <p className="text-sm font-semibold text-ink-900">
              {t("dashboard.required.title")}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {t("dashboard.required.helper")}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Price + currency */}
              <div className="sm:col-span-2">
                <label htmlFor="price" className="label">
                  {t("dashboard.required.price")} *
                </label>
                <div className="mt-1 flex min-w-0 gap-2">
                  <input
                    id="price"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    required
                    placeholder="14000"
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    onBlur={() => setTouched((s) => ({ ...s, price: true }))}
                    aria-invalid={!!show("price", errors.price)}
                    className={`min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm ring-1 focus:outline-none focus:ring-2 ${
                      show("price", errors.price)
                        ? "ring-red-200 focus:ring-red-500"
                        : "ring-brand-100 focus:ring-brand-500"
                    }`}
                  />
                  <select
                    aria-label={t("dashboard.required.currency")}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="shrink-0 rounded-xl bg-white px-2 py-2 text-sm ring-1 ring-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                    <option value="PLN">PLN</option>
                    <option value="SEK">SEK</option>
                    <option value="NOK">NOK</option>
                    <option value="DKK">DKK</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
                {show("price", errors.price) && (
                  <p className="mt-1 text-xs text-red-700">{errors.price}</p>
                )}
              </div>

              {/* Mileage + unit */}
              <div>
                <label htmlFor="mileage" className="label">
                  {t("dashboard.required.mileage")} *
                </label>
                <div className="mt-1 flex min-w-0 gap-2">
                  <input
                    id="mileage"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={100}
                    required
                    placeholder="95000"
                    value={mileageStr}
                    onChange={(e) => setMileageStr(e.target.value)}
                    onBlur={() => setTouched((s) => ({ ...s, mileage: true }))}
                    aria-invalid={!!show("mileage", errors.mileage)}
                    className={`min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm ring-1 focus:outline-none focus:ring-2 ${
                      show("mileage", errors.mileage)
                        ? "ring-red-200 focus:ring-red-500"
                        : "ring-brand-100 focus:ring-brand-500"
                    }`}
                  />
                  <div className="inline-flex shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-brand-100">
                    {(["km", "mi"] as MileageUnit[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setMileageUnit(u)}
                        className={`min-w-[2.75rem] px-3 py-2 text-sm font-semibold leading-none transition ${
                          mileageUnit === u
                            ? "bg-brand-600 text-white"
                            : "text-ink-700 hover:bg-brand-50"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                {show("mileage", errors.mileage) && (
                  <p className="mt-1 text-xs text-red-700">{errors.mileage}</p>
                )}
              </div>

              {/* Year */}
              <div>
                <label htmlFor="year" className="label">
                  {t("dashboard.required.year")} *
                </label>
                <input
                  id="year"
                  type="number"
                  inputMode="numeric"
                  min={1950}
                  max={CURRENT_YEAR + 1}
                  step={1}
                  required
                  placeholder={String(CURRENT_YEAR - 5)}
                  value={yearStr}
                  onChange={(e) => setYearStr(e.target.value)}
                  onBlur={() => setTouched((s) => ({ ...s, year: true }))}
                  aria-invalid={!!show("year", errors.year)}
                  className={`mt-1 w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 focus:outline-none focus:ring-2 ${
                    show("year", errors.year)
                      ? "ring-red-200 focus:ring-red-500"
                      : "ring-brand-100 focus:ring-brand-500"
                  }`}
                />
                {show("year", errors.year) && (
                  <p className="mt-1 text-xs text-red-700">{errors.year}</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional details (optional, collapsible) */}
          <div className="mt-5 rounded-xl bg-brand-50/30 ring-1 ring-brand-100">
            <button
              type="button"
              onClick={() => setShowExtra((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left"
              aria-expanded={showExtra}
              aria-controls="extra"
            >
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {t("dashboard.extra.label")}
                </p>
                <p className="text-xs text-ink-500">{t("dashboard.extra.hint")}</p>
              </div>
              <span
                className={`ml-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 ring-1 ring-brand-100 transition ${
                  showExtra ? "rotate-180" : ""
                }`}
                aria-hidden
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
            {showExtra && (
              <div className="border-t border-brand-100 p-4">
                <textarea
                  id="extra"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={t("dashboard.extra.placeholder")}
                  rows={4}
                  className="w-full resize-none rounded-xl border-0 bg-white p-4 text-sm leading-relaxed ring-1 ring-brand-100 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  maxLength={5000}
                />
                <p className="mt-1 text-right text-[11px] text-ink-300">
                  {extra.length}/5000
                </p>
              </div>
            )}
          </div>

          {/* Trust line */}
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            {t("dashboard.trust")}
          </p>

          {serverError && (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {serverError}
            </div>
          )}
          {credits <= 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <span>{t("dashboard.noCredits")}</span>
              <Link
                href="/dashboard/billing"
                className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-950"
              >
                {t("dashboard.upgrade")}
              </Link>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-ink-500">
                Credits:{" "}
                <span className="font-semibold text-ink-900">{credits}</span>
              </div>
              {credits <= 1 && (
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
                >
                  {t("dashboard.freeTrialHint")}
                </Link>
              )}
            </div>
            <button
              type="submit"
              disabled={disabled}
              className="btn-primary w-full sm:w-auto justify-center"
            >
              {loading ? t("dashboard.running") : t("dashboard.submit")}
              {!loading && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2 7h8M7 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      <aside className="card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Mascot size={80} state={loading ? "working" : "idle"} />
          <div>
            <p className="text-sm font-semibold text-ink-900">
              {t("mascot.role")}
            </p>
            <p className="text-xs text-ink-500">{t("mascot.status")}</p>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-700 ring-1 ring-brand-100">
          {loading ? t("mascot.working") : t("mascot.greeting")}
        </p>

        <ul className="mt-5 space-y-2 text-xs text-ink-500">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
            {t("dashboard.tip1")}
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
            {t("dashboard.tip2")}
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-500" />
            {t("dashboard.tip3")}
          </li>
        </ul>
      </aside>
    </div>
  );
}
