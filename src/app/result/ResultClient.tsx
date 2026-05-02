"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { AnalysisCard } from "@/components/AnalysisCard";
import type { AnalysisResult } from "@/types/analysis";

const STORAGE_KEY = "veltrixdrive.lastResult";

type PreloadId = string | null;

export function ResultClient({
  preload,
  preloadId
}: {
  preload: AnalysisResult | null;
  preloadId: PreloadId;
}) {
  const { t } = useI18n();
  const [result, setResult] = useState<AnalysisResult | null>(preload);
  // preloadId is still tracked because /history may want to deep-link by id;
  // no UI uses it directly anymore now that the PDF download is removed.
  const [, setId] = useState<PreloadId>(preloadId);

  useEffect(() => {
    if (result) return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.result) setResult(parsed.result as AnalysisResult);
        if (parsed?.id) setId(parsed.id as string);
      }
    } catch {
      /* noop */
    }
  }, [result]);

  if (!result) {
    return (
      <div className="card p-8 text-center">
        <p className="text-ink-700">No analysis to show.</p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-flex">
          {t("result.back")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
          {t("result.title")}
        </h1>
        <Link href="/dashboard" className="btn-ghost">
          {t("result.back")}
        </Link>
      </div>

      <div className="mt-8">
        <AnalysisCard result={result} />
      </div>
    </div>
  );
}
