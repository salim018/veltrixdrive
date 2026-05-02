"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { useI18n } from "@/lib/i18n/provider";

export function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-brand-100/70 bg-gradient-to-b from-white to-brand-50/40">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-500">
              {t("hero.subtext")}
            </p>
          </div>

          <div>
            <p className="label mb-3">Legal</p>
            <ul className="space-y-2 text-sm text-ink-700">
              <li><Link href="/terms" className="hover:text-brand-700">{t("footer.terms")}</Link></li>
              <li><Link href="/privacy" className="hover:text-brand-700">{t("footer.privacy")}</Link></li>
              <li><Link href="/cookies" className="hover:text-brand-700">{t("footer.cookies")}</Link></li>
            </ul>
          </div>

          <div>
            <p className="label mb-3">Company</p>
            <ul className="space-y-2 text-sm text-ink-700">
              <li>KVK: 99933098</li>
              <li>
                <a href="mailto:info@bedrijfsnaam.com" className="hover:text-brand-700">
                  info@bedrijfsnaam.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-xl bg-brand-50/80 p-4 text-xs leading-relaxed text-ink-500 ring-1 ring-brand-100">
          {t("disclaimer")}
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-2 text-xs text-ink-500 sm:flex-row sm:items-center">
          <span>© {year} VeltrixDrive. {t("footer.rights")}</span>
          <span>Made with care for smarter car buyers.</span>
        </div>
      </div>
    </footer>
  );
}
