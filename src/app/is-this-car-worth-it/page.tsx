import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SeoLanding } from "@/components/SeoLanding";

export const metadata: Metadata = {
  title: 'Is This Car Worth It? Instant AI Verdict',
  description: "Paste any used-car listing and get a decisive buy / don't buy / risky verdict in under a minute. AI checks price, scam risk, and known model issues.",
  keywords: [
    "is this car worth it",
    "should I buy this car",
    "used car advice",
    "car buying decision",
    "AI car advice"
  ],
  openGraph: {
    title: "Is This Car Worth It? — Instant AI Verdict",
    description:
      "Decisive buy / don't buy / risky verdict on any used car listing.",
    type: "website"
  },
  alternates: { canonical: "/is-this-car-worth-it" }
};

export default async function IsThisCarWorthItPage() {
  const { user, credits } = await getSessionUser();
  const ctaHref = user ? "/dashboard" : "/login?next=/dashboard";

  return (
    <>
      <Header user={user} credits={credits} />
      <SeoLanding
        eyebrow="Is this car worth it?"
        h1="Is this car worth it? Get a straight answer."
        lede="Stop second-guessing. Paste the listing, enter price + mileage + year, and VeltrixDrive's AI gives you a decisive verdict — buy, don't buy, or risky — with the reasoning that got it there."
        sections={[
          {
            title: "A verdict, not a wishy-washy report",
            body:
              "Most car valuation tools bury the answer under 'it depends'. Ours doesn't. Every analysis ends with one of three verdicts: STRONG BUY, FAIR DEAL, OVERPRICED, or HIGH RISK — and the first sentence tells you exactly why. 'OVERPRICED — negotiate below €13,500 or walk away.' That is how an experienced friend would talk to you.\n\nWe back the verdict with numbers. You see the estimated market range, the gap between the asking price and the midpoint, the depreciation curve over five years, and the suggested offer you should actually make."
          },
          {
            title: "What drives the decision",
            body:
              "The deal score combines four inputs: how the listing price compares to the real market range for this specific year + mileage; the reliability score for the exact model and generation; any scam signals we detect in the wording or pricing; and the cost of ownership over the next year (insurance, maintenance, tax, depreciation).\n\nWhen we say a car is worth it, we mean the math works after you subtract what you will actually pay to own it for a year."
          },
          {
            title: "What 'worth it' means for you",
            body:
              "It's different if you're a daily commuter, a weekend driver, a parent buying a first car, or a buyer flipping for resale. VeltrixDrive factors in a one-year and three-year resale outlook so you know how much of today's price you can recover if your needs change.\n\nIt also names the model-specific risks that could cost you five figures after the sale — timing chains on certain diesels, DSG mechatronic failures, DPF problems on short-trip cars, battery degradation on early EVs. No generic advice."
          },
          {
            title: "Why buyers trust the verdict",
            body:
              "We don't scrape listings. You provide the key data — price, mileage, year — and optional description. The AI then has four things it must not hallucinate and one clear task: produce a decision. Server-side validation recomputes the price gap from your actual numbers, strips out generic advice, and sharpens the verdict. The output is reproducible: same car, same answer."
          }
        ]}
        ctaHeading="Should you buy this car? Find out now."
        ctaBody="One free analysis on signup. Straight verdict, clear reasoning."
        ctaLabel="Get my verdict"
        ctaHref={ctaHref}
        trustLine="We do not scrape listings. Provide key data for accurate results."
        relatedLinks={[
          { label: "Car value check", href: "/car-value-check" },
          { label: "Used car analysis", href: "/used-car-analysis" },
          { label: "Car scam check", href: "/car-scam-check" }
        ]}
        faq={[
          { q: "What's the difference between a verdict and a score?", a: "The verdict is a one-line recommendation (STRONG BUY, FAIR DEAL, OVERPRICED, HIGH RISK). The score (1–10) breaks down the reasoning: price delta vs market, scam risk, mileage, model-specific issues. Read the verdict if you're in a hurry, the score if you want the math." },
          { q: 'Can I trust a buy verdict?', a: "The verdict reflects data we can verify from your input. It doesn't replace a physical inspection or a VIN history check — those are always worth doing before handing over money. Think of the verdict as an experienced friend's opinion before you commit to viewing the car." },
          { q: 'What happens if my car is flagged as HIGH RISK?', a: 'You get a list of specific red flags (e.g. price 28% below market, wording typical of overseas scam templates, no VIN provided). Take them seriously: stop the conversation, demand the VIN in writing, and never send a deposit before inspecting in person.' },
          { q: 'Do you support EU and US listings?', a: 'Yes. The analyzer auto-detects region from the currency, applies regional depreciation curves (~15k km/yr EU, ~19k mi/yr US), and references the right paperwork provider (Carfax/AutoCheck in US, MOT history in UK, APK in NL, TÜV in DE).' },
          { q: 'How fast is it?', a: 'Most analyses complete in under 15 seconds. You enter four fields (price, mileage, year, link/description) and the full report renders inline.' }
        ]}
        pageUrl={`${(process.env.NEXT_PUBLIC_APP_URL || "https://veltrixdrive.com").replace(/\/$/, "")}/is-this-car-worth-it`}
      />
      <Footer />
    </>
  );
}
