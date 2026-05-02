"use client";

import Link from "next/link";
import { Mascot } from "@/components/Mascot";
import { useI18n } from "@/lib/i18n/provider";

export interface SeoSection {
  title: string;
  body: string; // can contain simple paragraphs separated by \n\n
}

export interface SeoFaq {
  q: string;
  a: string;
}

export interface SeoLandingProps {
  eyebrow: string;
  h1: string;
  lede: string;
  sections: SeoSection[];
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
  ctaHref: string;
  trustLine: string;
  relatedLinks?: { label: string; href: string }[];
  faq?: SeoFaq[];
  /** Canonical absolute URL of THIS page — used for JSON-LD. */
  pageUrl?: string;
  /** Page title for JSON-LD WebApplication `name` and FAQ `inLanguage`. */
  pageTitle?: string;
}

export function SeoLanding(props: SeoLandingProps) {
  const { t } = useI18n();
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden mesh-bg">
        <div className="absolute inset-0 grid-lines opacity-60" aria-hidden />
        <div className="container-page relative grid gap-10 py-14 md:grid-cols-[1.3fr_1fr] md:items-center md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {props.eyebrow}
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] text-ink-900 sm:text-5xl">
              {props.h1}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-500">{props.lede}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={props.ctaHref} className="btn-primary">
                {props.ctaLabel}
              </Link>
              <Link href="/" className="btn-ghost">
                {t("hero.secondary")}
              </Link>
            </div>
            <p className="mt-5 max-w-xl text-xs text-ink-500">{props.trustLine}</p>
          </div>
          <div className="flex justify-center">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-brand-100 shadow-soft">
              <Mascot size={160} />
            </div>
          </div>
        </div>
      </section>

      {/* Body sections */}
      <section className="container-page py-12 md:py-16">
        <div className="mx-auto grid max-w-3xl gap-10">
          {props.sections.map((s, i) => (
            <article key={i}>
              <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
                {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-700">
                {s.body.split(/\n{2,}/).map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="container-page py-10 md:py-14">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-10 md:p-14">
          <h2 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            {props.ctaHeading}
          </h2>
          <p className="mt-3 max-w-xl text-brand-100/90">{props.ctaBody}</p>
          <Link
            href={props.ctaHref}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            {props.ctaLabel}
          </Link>
        </div>
      </section>

      {/* FAQ section */}
      {props.faq && props.faq.length > 0 && (
        <section className="container-page pb-10">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Frequently asked questions
            </h2>
            <div className="mt-6 divide-y divide-brand-100 rounded-2xl bg-white ring-1 ring-brand-100">
              {props.faq.map((item, i) => (
                <details key={i} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-900">
                    <span>{item.q}</span>
                    <span
                      aria-hidden
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition group-open:rotate-180"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-700">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related internal links */}
      {props.relatedLinks && props.relatedLinks.length > 0 && (
        <section className="container-page pb-16">
          <div className="mx-auto max-w-3xl">
            <p className="label">Related</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {props.relatedLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* JSON-LD structured data: WebApplication + FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebApplication",
                name: "VeltrixDrive",
                description: props.lede,
                applicationCategory: "FinanceApplication",
                operatingSystem: "Any",
                url: props.pageUrl,
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "EUR"
                }
              },
              ...(props.faq && props.faq.length > 0
                ? [
                    {
                      "@type": "FAQPage",
                      mainEntity: props.faq.map((item) => ({
                        "@type": "Question",
                        name: item.q,
                        acceptedAnswer: {
                          "@type": "Answer",
                          text: item.a
                        }
                      }))
                    }
                  ]
                : [])
            ]
          })
            // Prevent a malicious or accidental "</script>" in FAQ content
            // from escaping the inline script context.
            .replace(/</g, "\\u003c")
        }}
      />
    </main>
  );
}
