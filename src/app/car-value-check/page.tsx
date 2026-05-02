import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SeoLanding } from "@/components/SeoLanding";

export const metadata: Metadata = {
  title: 'Car Value Check — Free AI Used Car Valuation',
  description: "Check a used car's real market value in seconds. AI compares your listing against regional data and flags underpriced, fair, or overpriced.",
  keywords: [
    "car value check",
    "used car value",
    "car valuation",
    "what is my car worth",
    "used car pricing",
    "AI car appraisal"
  ],
  openGraph: {
    title: "Car Value Check — Free AI Used Car Valuation",
    description:
      "Check the real market value of any used car in seconds with VeltrixDrive's AI car value check.",
    type: "website"
  },
  alternates: { canonical: "/car-value-check" }
};

export default async function CarValueCheckPage() {
  const { user, credits } = await getSessionUser();
  const ctaHref = user ? "/dashboard" : "/login?next=/dashboard";

  return (
    <>
      <Header user={user} credits={credits} />
      <SeoLanding
        eyebrow="Car Value Check"
        h1="Free car value check — know what it's really worth"
        lede="Paste any used-car listing or enter the key details — year, mileage, asking price — and VeltrixDrive's AI tells you instantly how the price compares to the real market range."
        sections={[
          {
            title: "How the car value check works",
            body:
              "You enter four things: a link or short description of the car, the asking price, the mileage, and the model year. That's enough for our AI to build a realistic market value range for your region (EU, UK, or US), compare the seller's price against the midpoint, and classify it as underpriced, fair or overpriced.\n\nWe don't scrape listings. You provide the data; the model does the valuation. Because the math runs on your input, the result is reproducible and matches what a dealer or independent appraiser would reach."
          },
          {
            title: "What you get in under a minute",
            body:
              "A deal score from 1 to 10. A clear buy / don't buy / risky verdict. The estimated market range for this exact year + mileage. A five-year price history showing how the car depreciated, plus a twelve-month price forecast. A full negotiation plan with a suggested offer. A mechanic's inspection checklist. And known issues for the specific model and generation — the kinds of things that genuinely matter when you're deciding whether to pay the asking price."
          },
          {
            title: "Why VeltrixDrive's valuation is more accurate than online calculators",
            body:
              "Standard online valuation tools use a national average and a linear depreciation curve. Real cars don't depreciate linearly — they lose about 20% in year one, 15% in years two and three, then progressively less. Our model uses published retention data and adjusts for real mileage: a low-mileage example is worth more than the average, a high-mileage one less.\n\nWe also catch the things a calculator can't. Listing price 28% below market? The system flags it as a possible scam and asks for VIN verification. High mileage on an engine known for timing-chain issues? You get a specific red flag pointing at the failure window."
          },
          {
            title: "When to use it",
            body:
              "Before making an offer. Before driving an hour to view a car. Before sending a deposit to a long-distance seller. Before accepting a trade-in price from a dealer. Before selling your own car so you know what to list it at. Any moment the asking price matters, run the check."
          }
        ]}
        ctaHeading="Find out what this car is actually worth"
        ctaBody="One free analysis on signup. No credit card required."
        ctaLabel="Run my first car value check"
        ctaHref={ctaHref}
        trustLine="We do not scrape listings. Provide key data for accurate results."
        relatedLinks={[
          { label: "Is this car worth it?", href: "/is-this-car-worth-it" },
          { label: "Used car analysis", href: "/used-car-analysis" },
          { label: "Car scam check", href: "/car-scam-check" }
        ]}
        faq={[
          { q: 'How accurate is the car value check?', a: 'We use published depreciation retention data (Kelley Blue Book, ANWB, Schwacke ranges) adjusted for the exact mileage and age of the vehicle. Our estimate usually lands within ±10% of what an independent appraiser would quote for the same car.' },
          { q: 'Do I need the VIN to get a valuation?', a: 'No. We need the asking price, mileage, and model year. The VIN helps for a full history lookup before buying, but the valuation itself runs without it.' },
          { q: 'Which regions does it cover?', a: 'EU, UK, and US pricing. The valuation auto-detects the region from the currency you enter (EUR/GBP/USD) and applies the right depreciation curve and paperwork references.' },
          { q: 'Is this better than Kelley Blue Book or Autotrader?', a: 'For a quick reality check, yes. Generic valuation tools use national averages and linear depreciation. We combine that data with a non-linear retention curve and adjust for specific mileage, which matches what dealers actually use.' },
          { q: 'How much does it cost?', a: "One free analysis on signup, then pay-as-you-go credit packs starting at €5. Credits never expire and there's no subscription." }
        ]}
        pageUrl={`${(process.env.NEXT_PUBLIC_APP_URL || "https://veltrixdrive.com").replace(/\/$/, "")}/car-value-check`}
      />
      <Footer />
    </>
  );
}
