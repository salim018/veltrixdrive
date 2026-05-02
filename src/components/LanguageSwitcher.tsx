"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/dictionaries";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-700 ring-1 ring-brand-100 hover:bg-brand-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="uppercase">{locale}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl bg-white py-1 ring-1 ring-brand-100 shadow-soft z-50"
        >
          {LOCALES.map((l: Locale) => (
            <li key={l}>
              <button
                type="button"
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-brand-50 ${
                  l === locale ? "text-brand-700 font-semibold" : "text-ink-700"
                }`}
              >
                <span>{LOCALE_LABELS[l]}</span>
                <span className="text-xs uppercase text-ink-300">{l}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
