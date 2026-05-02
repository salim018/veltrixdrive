"use client";

import { useI18n } from "@/lib/i18n/provider";

export function LegalLayout({
  title,
  lastUpdated,
  children
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <main className="container-page py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="label">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold text-ink-900 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-ink-500">Last updated: {lastUpdated}</p>

        <div className="mt-4 rounded-xl bg-brand-50/80 p-4 text-xs leading-relaxed text-ink-700 ring-1 ring-brand-100">
          {t("disclaimer")}
        </div>

        <article className="prose-legal mt-10 space-y-6 text-ink-700">
          {children}
        </article>

        <div className="mt-16 rounded-2xl bg-white p-5 text-sm text-ink-500 ring-1 ring-brand-100">
          <p className="font-semibold text-ink-900">VeltrixDrive</p>
          <p className="mt-1">KVK: 99933098</p>
          <p>
            Email:{" "}
            <a href="mailto:info@bedrijfsnaam.com" className="text-brand-700 hover:underline">
              info@bedrijfsnaam.com
            </a>
          </p>
        </div>
      </div>

      <style jsx global>{`
        .prose-legal h2 {
          font-family: "Manrope", system-ui, sans-serif;
          font-weight: 700;
          font-size: 1.25rem;
          color: #0a1929;
          margin-top: 1.5rem;
          letter-spacing: -0.01em;
        }
        .prose-legal h3 {
          font-family: "Manrope", system-ui, sans-serif;
          font-weight: 600;
          font-size: 1rem;
          color: #1f2a37;
          margin-top: 1rem;
        }
        .prose-legal p,
        .prose-legal li {
          font-size: 0.95rem;
          line-height: 1.7;
        }
        .prose-legal ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-top: 0.5rem;
        }
        .prose-legal li {
          margin-top: 0.25rem;
        }
        .prose-legal a {
          color: #006dcc;
          text-decoration: underline;
        }
      `}</style>
    </main>
  );
}
