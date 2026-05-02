"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

const KEY = "veltrixdrive.cookieConsent";

export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (!saved) setVisible(true);
    } catch {
      /* noop */
    }
  }, []);

  function decide(value: "accepted" | "declined") {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* noop */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-brand-100 shadow-soft">
        <p className="text-sm leading-relaxed text-ink-700">{t("cookie.message")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => decide("accepted")} className="btn-primary !py-2 !px-4 text-xs">
            {t("cookie.accept")}
          </button>
          <button type="button" onClick={() => decide("declined")} className="btn-outline !py-2 !px-4 text-xs">
            {t("cookie.decline")}
          </button>
          <Link href="/cookies" className="ml-auto text-xs font-medium text-brand-700 hover:underline">
            {t("cookie.learn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
