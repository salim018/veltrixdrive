"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";

type Props = {
  user: { id: string; email: string | null } | null;
  credits: number | null;
};

export function Header({ user, credits }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [liveCredits, setLiveCredits] = useState<number | null>(credits);

  useEffect(() => {
    setLiveCredits(credits);
  }, [credits]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100/70 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label="VeltrixDrive home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {user && (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-ink-700 hover:text-brand-700">
                {t("nav.dashboard")}
              </Link>
              <Link href="/history" className="text-sm font-medium text-ink-700 hover:text-brand-700">
                {t("nav.history")}
              </Link>
              <Link href="/dashboard/billing" className="text-sm font-medium text-ink-700 hover:text-brand-700">
                {t("nav.billing")}
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user && liveCredits !== null && (
            <Link
              href="/dashboard/billing"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <circle cx="6" cy="6" r="4" fill="#0b8af0" />
              </svg>
              {liveCredits} {t("nav.credits")}
            </Link>
          )}
          <LanguageSwitcher />
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:inline-flex rounded-lg px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100/60"
            >
              {t("nav.logout")}
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              {t("nav.login")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden rounded-lg p-2 text-ink-700 ring-1 ring-brand-100"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-brand-100 bg-white">
          <div className="container-page flex flex-col gap-1 py-3">
            {user ? (
              <>
                <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-50">
                  {t("nav.dashboard")}
                </Link>
                <Link href="/history" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-50">
                  {t("nav.history")}
                </Link>
                <Link href="/dashboard/billing" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-50">
                  {t("nav.billing")}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-brand-50"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
