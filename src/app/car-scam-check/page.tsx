import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SeoLanding } from "@/components/SeoLanding";

export const metadata: Metadata = {
  title: 'Car Scam Check — Spot Fake Listings with AI',
  description: 'Free AI car scam check. Detect suspicious pricing, overseas templates, deposit scams, and fake used-car listings before you send any money.',
  keywords: [
    "car scam check",
    "used car scam",
    "fake car listing",
    "car fraud detection",
    "avoid car scams",
    "is this listing a scam"
  ],
  openGraph: {
    title: "Car Scam Check — Detect Fake Listings with AI",
    description:
      "Spot car scams and fake listings before you commit. Free AI scam check.",
    type: "website"
  },
  alternates: { canonical: "/car-scam-check" }
};

export default async function CarScamCheckPage() {
  const { user, credits } = await getSessionUser();
  const ctaHref = user ? "/dashboard" : "/login?next=/dashboard";

  return (
    <>
      <Header user={user} credits={credits} />
      <SeoLanding
        eyebrow="Car Scam Check"
        h1="Car scam check — catch fake listings before they catch you"
        lede="Used-car scams follow patterns. Unrealistic prices, urgency language, shipping-only, wire transfer, vague descriptions, no VIN. Our AI knows every one of them, and runs a full scam check on every analysis."
        sections={[
          {
            title: "What our scam check looks at",
            body:
              "Listing price versus real market value — a car priced 20% or more below the realistic range is one of the strongest scam indicators. Wording patterns that real sellers almost never use: 'moving abroad', 'must sell today', 'shipping only', 'PayPal F&F', 'send a deposit first'. Mileage that's implausibly low for the car's age. Missing essentials like VIN, photos of the actual car, or specific location.\n\nEach detected signal appears on the report as a concrete line — not a vague 'be careful'. If we don't find strong signals, we say so too."
          },
          {
            title: "Three risk levels, one clear call",
            body:
              "Every analysis assigns a scam risk: low, medium, or high. Low means the listing looks legitimate within the data we have. Medium means the pricing or wording raises a question worth answering before any money changes hands. High means stop — verify VIN, meet in person, do not send a deposit, do not wire funds.\n\nThe verdict text also escalates: 'HIGH RISK — probable scam; do not send deposits.' That's what you see at the top of the report, not buried on page three."
          },
          {
            title: "Why scam detection needs an AI and a checklist together",
            body:
              "Scammers iterate. They copy photos from a legitimate sold listing, tweak the price to look like an amazing deal, write a short emotional story. A rule-based filter misses the story. A pure LLM misses the price math. Our system runs both: a deterministic price extractor to confirm the asking price, a deterministic mileage extractor to confirm kilometers, and an AI that reads the description for the language patterns known to signal fraud.\n\nThen the backend refuses to let the AI invent a 'no scam detected' conclusion when the price is obviously 40% below market. The math wins."
          },
          {
            title: "What to do when you get a HIGH RISK result",
            body:
              "Don't send money of any kind — not deposits, not holding fees, not shipping costs. Ask for the VIN in writing and check it on a national vehicle register or a history provider (Carfax / AutoCheck in the US, MOT history in the UK, APK in the Netherlands, TÜV reports in Germany). Insist on viewing the car in person at the registered address. If the seller refuses any of these, walk away. You just avoided a loss that would have taken you months to recover from."
          }
        ]}
        ctaHeading="Run a free car scam check in 30 seconds"
        ctaBody="One free analysis on signup. Stay safe before the first message."
        ctaLabel="Scan a listing for scams"
        ctaHref={ctaHref}
        trustLine="We do not scrape listings. Provide key data for accurate results."
        relatedLinks={[
          { label: "Car value check", href: "/car-value-check" },
          { label: "Is this car worth it?", href: "/is-this-car-worth-it" },
          { label: "Used car analysis", href: "/used-car-analysis" }
        ]}
        faq={[
          { q: 'What are the most common used-car scams?', a: 'Overseas-shipping templates (seller conveniently abroad), deposits via wire or gift cards, listings 30%+ below market with a compelling story, cars without VIN or real photos, and title-washing (clean title masking a salvage history). We check all of these patterns.' },
          { q: 'Is a car being HIGH RISK the same as it being a scam?', a: "No. HIGH RISK means we detected several scam-aligned signals together, but some legitimate private sellers look risky on paper (e.g. an heir selling a deceased relative's car cheaply). Treat HIGH RISK as stop-and-verify, not an accusation." },
          { q: 'What should I do if a listing is flagged?', a: "Don't send any money. Ask for the VIN in writing and run it through a vehicle-history service (Carfax/AutoCheck in US, MOT history in UK, APK in NL, TÜV in DE). Insist on viewing the car in person at the registered address. If the seller refuses any of those, walk away." },
          { q: 'Does the scam check look at the photos?', a: 'No, we analyze text you provide: price vs market, wording patterns, mileage plausibility, and listing completeness. For photo-based reverse-image checks, tools like TinEye complement our textual analysis.' },
          { q: 'Will you report scam listings to the platform?', a: "No, we don't interact with third-party platforms. Our job is to tell you whether this specific listing is worth pursuing; reporting it to Marktplaats, AutoScout24, Facebook Marketplace, etc. is on you and usually done through their in-platform report button." }
        ]}
        pageUrl={`${(process.env.NEXT_PUBLIC_APP_URL || "https://veltrixdrive.com").replace(/\/$/, "")}/car-scam-check`}
      />
      <Footer />
    </>
  );
}
