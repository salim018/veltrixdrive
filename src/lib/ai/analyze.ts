import OpenAI from "openai";
import { z } from "zod";
import type {
  AnalysisResult,
  Confidence,
  Mileage,
  MileageUnit,
  UserOverrides
} from "@/types/analysis";

/**
 * SECURITY: server-only. OPENAI_API_KEY is never imported from a Client Component.
 *
 * VeltrixDrive strict valuation engine.
 *
 * Order of authority for ground-truth facts (highest first):
 *   1. User-supplied overrides (listing_price, mileage, year, currency)
 *   2. Deterministic extractors over the input text
 *   3. The LLM (never allowed to own ground truth)
 */

// ===================================================================
// SCHEMA
// ===================================================================

const PricePointSchema = z.object({
  year: z.number().int().min(1990).max(2100),
  value: z.number().nonnegative(),
  is_forecast: z.boolean()
});

const MileageSchema = z
  .object({
    value: z.number().nonnegative(),
    unit: z.enum(["km", "mi"]),
    km: z.number().nonnegative()
  })
  .nullable();

const VehicleSpecSchema = z.object({
  make: z.string().min(1).max(40),
  model: z.string().min(1).max(60),
  variant: z.string().min(1).max(80),
  year: z.number().int().min(1950).max(2100).nullable(),
  generation: z.string().min(1).max(40),
  transmission: z.enum(["manual", "automatic", "semi_automatic", "unknown"]),
  fuel: z.enum(["petrol", "diesel", "hybrid", "plug_in_hybrid", "electric", "lpg", "cng", "unknown"]),
  drivetrain: z.enum(["fwd", "rwd", "awd", "4wd", "unknown"]),
  trim: z.string().min(1).max(60),
  engine_displacement_l: z.number().positive().max(10).nullable(),
  power_hp: z.number().positive().max(2000).nullable(),
  body_style: z.string().min(1).max(40),
  notable_features: z.array(z.string().min(1)).max(12),
  /** Per-field inference flags — true = estimated from model + typical config. */
  inferred: z
    .object({
      transmission: z.boolean().default(false),
      fuel: z.boolean().default(false),
      drivetrain: z.boolean().default(false),
      trim: z.boolean().default(false),
      engine_displacement_l: z.boolean().default(false),
      power_hp: z.boolean().default(false),
      body_style: z.boolean().default(false)
    })
    .default({
      transmission: false,
      fuel: false,
      drivetrain: false,
      trim: false,
      engine_displacement_l: false,
      power_hp: false,
      body_style: false
    })
});

export const AnalysisSchema = z.object({
  deal_score: z.number().min(1).max(10),
  score_interpretation: z.string().min(1).max(500),
  recommendation: z.enum(["buy", "dont_buy", "risky"]),
  recommendation_reason: z.string().min(1).max(600),
  deal_verdict: z.string().min(1).max(500),

  vehicle_spec: VehicleSpecSchema,

  market_value: z.object({
    low: z.number().nonnegative(),
    high: z.number().nonnegative(),
    currency: z.string().min(1).max(8)
  }),
  price_evaluation: z.object({
    listing_price: z.number().nonnegative().nullable(),
    currency: z.string().min(1).max(8),
    verdict: z.enum(["underpriced", "fair", "overpriced", "unknown"]),
    delta_pct: z.number(),
    explanation: z.string().min(1).max(400)
  }),
  region: z.string().min(1).max(8),

  mileage: MileageSchema,

  price_history: z.array(PricePointSchema).min(3).max(8),
  future_prediction: PricePointSchema,
  depreciation_rate: z.number().min(0).max(60),

  reliability_score: z.number().min(1).max(10),
  maintenance_cost_estimate: z.object({
    yearly_low: z.number().nonnegative(),
    yearly_high: z.number().nonnegative(),
    currency: z.string().min(1).max(8),
    notes: z.string().min(1).max(400)
  }),
  ownership_cost_estimate: z.object({
    yearly_low: z.number().nonnegative(),
    yearly_high: z.number().nonnegative(),
    currency: z.string().min(1).max(8),
    breakdown: z.object({
      fuel: z.string().min(1).max(200),
      insurance: z.string().min(1).max(200),
      maintenance: z.string().min(1).max(200),
      tax: z.string().min(1).max(200),
      depreciation: z.string().min(1).max(200)
    }),
    notes: z.string().min(1).max(400)
  }),
  fuel_economy_estimate: z.object({
    combined: z.string().min(1).max(80),
    urban: z.string().min(1).max(80),
    highway: z.string().min(1).max(80),
    notes: z.string().min(1).max(300)
  }),
  lifespan_estimate: z.object({
    expected_total_km: z.number().nonnegative().max(3_000_000),
    remaining_km_estimate: z.number().nonnegative().max(3_000_000),
    expected_years_remaining: z.number().min(0).max(60),
    notes: z.string().min(1).max(300)
  }),
  resale_outlook: z.object({
    one_year_pct: z.number().min(0).max(200),
    three_year_pct: z.number().min(0).max(200),
    liquidity: z.enum(["high", "medium", "low"]),
    notes: z.string().min(1).max(300)
  }),

  common_issues: z.array(z.string().min(1)).max(10),

  pros: z.array(z.string().min(1)).min(1).max(8),
  cons: z.array(z.string().min(1)).min(1).max(8),
  risks: z.array(z.string().min(1)).min(1).max(8),

  scam_risk: z.enum(["low", "medium", "high"]),
  scam_signals: z.array(z.string().min(1)).max(8),

  inspection_checklist: z.object({
    visual: z.array(z.string().min(1)).min(1).max(10),
    mechanical: z.array(z.string().min(1)).min(1).max(10),
    paperwork: z.array(z.string().min(1)).min(1).max(10),
    red_flags: z.array(z.string().min(1)).max(10)
  }),

  negotiation: z.object({
    suggested_offer: z.number().nonnegative(),
    currency: z.string().min(1).max(8),
    reasoning: z.string().max(300).optional().default(""),
    talking_points: z.array(z.string().min(1)).min(1).max(8)
  }),
  alternatives: z.array(
    z.object({ title: z.string().min(1), reason: z.string().min(1) })
  ).max(5),

  summary: z.string().min(1).max(1000)
});

// ===================================================================
// PRICE EXTRACTION (deterministic)
// ===================================================================

interface ExtractedPrice {
  amount: number;
  currency: string;
  rawMatch: string;
}

const SYMBOL_TO_CCY: Record<string, string> = {
  "€": "EUR",
  "$": "USD",
  "£": "GBP"
};

const CCY_CODES = ["EUR", "USD", "GBP", "CHF", "PLN", "SEK", "NOK", "DKK", "CAD", "AUD", "JPY"];

function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/[€$£¥]/g, "").replace(/\s/g, "");
  const kMatch = /^([\d.,]+)k$/i.exec(s);
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 1000) : null;
  }
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
  } else if (lastDot !== -1) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function guessCurrencyFromContext(text: string): string | null {
  if (/\bGBP\b|£|\.co\.uk/i.test(text)) return "GBP";
  if (/\bEUR\b|€|autoscout24\.(de|nl|fr|it|es)|marktplaats|mobile\.de|leboncoin|subito\.it|coches\.net/i.test(text)) return "EUR";
  if (/\bUSD\b|\$|autotrader\.com|cars\.com|cargurus\.com/i.test(text)) return "USD";
  return null;
}

// Stricter NUM token shared between extractors.
const NUM = String.raw`(?:\d{1,3}(?:[.,\s]\d{3})+|\d+(?:[.,]\d+)?k|\d{1,7})`;

export function extractListingPrice(input: string): ExtractedPrice | null {
  const text = input.replace(/\u00a0/g, " ");

  const labelRe = new RegExp(
    String.raw`(?:price|asking|asking\s*price|listed|listing\s*price|vraagprijs|prijs|preis|prix|precio|prezzo)\s*[:\-]?\s*([€$£]?\s*${NUM})\s*(EUR|USD|GBP|CHF|PLN|SEK|NOK|DKK|CAD|AUD|€|\$|£)?`,
    "i"
  );
  const lm = labelRe.exec(text);
  if (lm) {
    const numStr = lm[1];
    const ccyToken = (lm[2] || "").trim();
    const amount = parseAmount(numStr);
    if (amount && amount >= 100 && amount <= 10_000_000) {
      const currency =
        SYMBOL_TO_CCY[ccyToken] ||
        (CCY_CODES.includes(ccyToken.toUpperCase()) ? ccyToken.toUpperCase() : null) ||
        guessCurrencyFromContext(text);
      if (currency) return { amount, currency, rawMatch: lm[0] };
    }
  }

  const candidates: ExtractedPrice[] = [];
  const symRe = new RegExp(String.raw`([€$£])\s*(${NUM})`, "gi");
  let m: RegExpExecArray | null;
  while ((m = symRe.exec(text)) !== null) {
    const amount = parseAmount(m[2]);
    if (amount && amount >= 500 && amount <= 10_000_000) {
      candidates.push({ amount, currency: SYMBOL_TO_CCY[m[1]], rawMatch: m[0] });
    }
  }
  const codeRe = new RegExp(
    String.raw`(${NUM})\s*(EUR|USD|GBP|CHF|PLN|SEK|NOK|DKK|CAD|AUD|€|\$|£)(?![a-zA-Z])`,
    "gi"
  );
  while ((m = codeRe.exec(text)) !== null) {
    const amount = parseAmount(m[1]);
    if (!amount || amount < 500 || amount > 10_000_000) continue;
    const ccyToken = m[2];
    const currency =
      SYMBOL_TO_CCY[ccyToken] ||
      (CCY_CODES.includes(ccyToken.toUpperCase()) ? ccyToken.toUpperCase() : null);
    if (currency) candidates.push({ amount, currency, rawMatch: m[0] });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.amount - a.amount);
    return candidates[0];
  }
  return null;
}

// ===================================================================
// MILEAGE EXTRACTION
// ===================================================================

export function extractMileage(input: string): Mileage | null {
  const text = input.replace(/\u00a0/g, " ");
  const unitRe = new RegExp(
    String.raw`(${NUM})\s*(km|kilomet(?:er|ers|res|re)|mi|mile|miles)\b`,
    "gi"
  );
  let m: RegExpExecArray | null;
  const candidates: { value: number; unit: MileageUnit; raw: string }[] = [];
  while ((m = unitRe.exec(text)) !== null) {
    const value = parseAmount(m[1]);
    if (!value || value < 100 || value > 1_500_000) continue;
    const unit: MileageUnit = /^km|kilo/i.test(m[2]) ? "km" : "mi";
    candidates.push({ value, unit, raw: m[0] });
  }

  if (candidates.length === 0) {
    const labelRe = new RegExp(
      String.raw`(?:mileage|odometer|kilometerstand|kilometers|km\s*stand|laufleistung|kilom[eé]trage|kilometraje|chilometraggio)\s*[:\-]?\s*(${NUM})`,
      "i"
    );
    const lm = labelRe.exec(text);
    if (lm) {
      const value = parseAmount(lm[1]);
      if (value && value >= 100 && value <= 1_500_000) {
        const stripped = text.replace(/mileage/gi, "").replace(/odometer/gi, "");
        const looksMiles =
          /\bmiles?\b/i.test(stripped) ||
          /\bmi\b/i.test(stripped) ||
          /autotrader\.com|cars\.com|cargurus\.com/i.test(text);
        const unit: MileageUnit = looksMiles ? "mi" : "km";
        candidates.push({ value, unit, raw: lm[0] });
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.value - a.value);
  const best = candidates[0];
  const km = best.unit === "km" ? best.value : Math.round(best.value * 1.609344);
  return { value: best.value, unit: best.unit, km };
}

// ===================================================================
// VEHICLE SPEC PRE-EXTRACTION (hints to the model)
// ===================================================================

interface VehicleHints {
  transmission: "manual" | "automatic" | "semi_automatic" | null;
  fuel: "petrol" | "diesel" | "hybrid" | "plug_in_hybrid" | "electric" | "lpg" | "cng" | null;
  drivetrain: "fwd" | "rwd" | "awd" | "4wd" | null;
  features: string[];
}

/**
 * Extract obvious vehicle attributes deterministically. These are HINTS to
 * the model; the model can still mark them "unknown" if it disagrees.
 */
function extractVehicleHints(input: string): VehicleHints {
  const t = input.toLowerCase();
  const hints: VehicleHints = {
    transmission: null,
    fuel: null,
    drivetrain: null,
    features: []
  };

  // --- transmission ---
  if (/\b(automatic|automatik|automaat|automatique|automatico|auto\s+trans|auto[- ]?gearbox|tiptronic|steptronic|dsg|s[- ]?tronic|pdk|zf\s*\d+hp|torque[- ]?converter)\b/i.test(t)) {
    hints.transmission = "automatic";
  } else if (/\b(manual|handgeschakeld|schalter|boîte\s+manuelle|manuale|stick[- ]?shift|6[- ]?speed\s+manual|5[- ]?speed\s+manual)\b/i.test(t)) {
    hints.transmission = "manual";
  } else if (/\b(dual[- ]?clutch|dct|amt|semi[- ]?auto|easytronic|mmt)\b/i.test(t)) {
    hints.transmission = "semi_automatic";
  }

  // --- fuel ---
  if (/\b(electric|ev|bev|elektrisch|électrique|eléctrico|elettrico)\b/i.test(t) &&
      !/\b(hybrid|phev)\b/i.test(t)) {
    hints.fuel = "electric";
  } else if (/\b(plug[- ]?in\s*hybrid|phev)\b/i.test(t)) {
    hints.fuel = "plug_in_hybrid";
  } else if (/\b(hybrid|hybride|hibrido|ibrido)\b/i.test(t)) {
    hints.fuel = "hybrid";
  } else if (/\b(diesel|tdi|hdi|cdi|cdti|dci|crdi|bluetec|blue\s*motion|dtec|tdci|xdrive\s*d)\b/i.test(t)) {
    hints.fuel = "diesel";
  } else if (/\b(petrol|gasoline|benzin|benzina|essence|gasolina|tsi|tfsi|gdi|mpi|vtec|sidi)\b/i.test(t)) {
    hints.fuel = "petrol";
  } else if (/\b(lpg|autogas)\b/i.test(t)) {
    hints.fuel = "lpg";
  } else if (/\b(cng|metano)\b/i.test(t)) {
    hints.fuel = "cng";
  }

  // --- drivetrain ---
  if (/\b(awd|all[- ]?wheel[- ]?drive|quattro|4matic|xdrive|4motion)\b/i.test(t)) {
    hints.drivetrain = "awd";
  } else if (/\b4wd\b|\b4x4\b/i.test(t)) {
    hints.drivetrain = "4wd";
  } else if (/\b(rwd|rear[- ]?wheel[- ]?drive|hinterradantrieb|propulsion)\b/i.test(t)) {
    hints.drivetrain = "rwd";
  } else if (/\b(fwd|front[- ]?wheel[- ]?drive|vorderradantrieb|traction)\b/i.test(t)) {
    hints.drivetrain = "fwd";
  }

  // --- features (only explicit keyword hits) ---
  const featureRules: { key: string; re: RegExp }[] = [
    { key: "navigation", re: /\bnavigation|sat[- ]?nav|navi\b/i },
    { key: "leather", re: /\bleather|leder|cuir|pelle|piel\b/i },
    { key: "heated seats", re: /\bheated[- ]?seats|sitzheizung|stoelverwarming|sedili riscaldati|sièges chauffants|asientos calefactados\b/i },
    { key: "panoramic roof", re: /\bpanoramic[- ]?roof|panoramadak|panorama[- ]?dach|panorama|sunroof|schiebedach|toit ouvrant\b/i },
    { key: "parking sensors", re: /\bparking sensors|pdc|parkeer sensoren|park\s*assist|park distance control\b/i },
    { key: "rear camera", re: /\brear[- ]?camera|backup camera|rückfahrkamera|achteruitrijcamera|caméra de recul|cámara marcha atrás\b/i },
    { key: "adaptive cruise", re: /\badaptive cruise|acc\b|adaptieve cruise|regulateur adaptatif\b/i },
    { key: "LED headlights", re: /\bled[- ]?(head)?lights|led scheinwerfer|phares led|fari led\b/i },
    { key: "xenon headlights", re: /\bxenon|bi[- ]?xenon\b/i },
    { key: "climate control", re: /\bclimate control|airco|klimaautomatik|climatronic|clim[- ]?auto\b/i },
    { key: "alloy wheels", re: /\balloy wheels|lichtmetalen velgen|alufelgen|jantes alu|cerchi in lega|llantas de aleación\b/i },
    { key: "tow bar", re: /\btow[- ]?bar|trekhaak|anhängerkupplung|attelage|enganche\b/i },
    { key: "apple carplay", re: /\bapple ?carplay|car[- ]?play\b/i },
    { key: "android auto", re: /\bandroid ?auto\b/i }
  ];
  for (const rule of featureRules) {
    if (rule.re.test(t)) hints.features.push(rule.key);
  }

  return hints;
}

// ===================================================================
// PROMPTS
// ===================================================================

function systemPrompt(currentYear: number) {
  return `You are VeltrixDrive's automotive valuation engine. Strict, dealership-grade.
Year: ${currentYear}. Output: strict JSON only. No prose, markdown, or fences.

ALL VEHICLES ARE USED CARS unless the input explicitly states "new" or "0 km".
Never evaluate as new. Never compare against MSRP as if the buyer is buying
new — depreciation has already happened. Pricing, ownership cost, lifespan,
and all advice must reflect the second-hand market.

AUTHORITATIVE BLOCK (in user message): VERIFIED_LISTING_PRICE, VERIFIED_MILEAGE,
VERIFIED_YEAR, VEHICLE_HINTS. Copy verbatim into the matching fields.

RULES

1) MARKET VALUE INDEPENDENT FROM LISTING.
   Build market_value.low/high from make+model+generation+year+mileage+region
   using real retention data (typical km/yr: ~15k EU, ~19k US). Never make
   the midpoint equal the listing price. If listing is within ±20% of a
   realistic depreciation prediction, build a balanced range AROUND the
   expected value. Most cars on the market are reasonable: aim for ~30% good
   deals / ~40% fair / ~30% overpriced. Widen the range when uncertain.

2) DEAL SCORE — clear bands:
   delta > +35%        → score 1–4 (HARD: ≤ 5)
   delta +15..+35%     → score 4–6
   delta -10..+15%     → score 5.5–7.5  (common range)
   delta -25..-10%     → score 7–9
   delta < -25%        → score 8–10  (HARD floor; 2–4 if scam_risk=high)
   BOOST: scam_risk=low AND mileage normal-for-age AND |delta|≤10% AND
   variant known → score MUST be ≥ 7.
   Penalties: scam_risk=high caps 4; mileage>1.5× typical −0.8; >1.2× −0.4;
   unknown variant −0.5. Use the full 1–10 range.

3) VEHICLE_SPEC — 3-tier inference, always set inferred.<field>:
   transmission, fuel, drivetrain, trim, engine_displacement_l, power_hp, body_style:
     explicit → value + inferred=false
     typical for model/year → value + inferred=true
     unknown → "unknown"/null + inferred=false
   generation, condition, accident/ownership/service history, mods, color:
     "unknown" if not stated. Never invent.
   notable_features: only those explicit in input or VEHICLE_HINTS.features.

4) MODEL-SPECIFICITY. variant must be specific (e.g. "F30 320d", "B8 2.0 TDI",
   "W205 C300 4MATIC"). common_issues: ≤ 4 items, generation+engine specific
   (e.g. "BMW N47 diesel: timing chain failures 100k–200k km — verify records").
   Never write brand-level platitudes ("BMWs are reliable").

5) RED FLAGS — must cite actual price, actual mileage, missing field, known
   model failure, or listing inconsistency. ≥30 chars each.
   FORBIDDEN: "inspect carefully", "check engine", "verify VIN" alone,
   "do your own research", "check documents".
   If nothing concrete: return EXACTLY one entry:
   "No strong red flags detected based on provided data"

6) NEGOTIATION — ≤ 3 talking_points, EACH must cite at least one of:
   - specific money amount (e.g. "€1,500"),
   - specific mileage (e.g. "145,000 km"),
   - specific model failure (e.g. "N47 timing chain", "DSG mechatronic").
   ≥40 chars each. FORBIDDEN: "negotiate based on condition", "consider
   overall value", "take mileage into account", "consider negotiating",
   "try to lower the price", or any vague phrasing.
   Each bullet should sound like something a buyer would actually SAY to the
   seller — a sentence they could read aloud during a viewing or paste into
   a message. Use second person ("ask the seller…", "offer €X and explain…").
   Not a tip about negotiating. The actual line of negotiation.

   reasoning (REQUIRED, 1 sentence): explain WHY the suggested_offer is that
   number, citing market_value.low and any deductions applied. Sound like a
   buyer thinking out loud, not a manual. Examples:
     "Similar models are listed around €18,000, so €17,200 leaves room for
      the higher-than-average mileage."
     "Market low is €16,000; deduct €800 for 145,000 km usage and offer
      €15,200 as a confident first bid."

   suggested_offer: from market_value.low, lowered for high mileage / risks /
   missing history. Never above market_value.low (unless asking is below it,
   then match).

7) PRICE_HISTORY: years ${currentYear - 4}..${currentYear} (is_forecast=false) +
   ${currentYear + 1} (is_forecast=true). future_prediction.year = ${currentYear + 1}.

8) CONSISTENCY:
   delta_pct = round((listing - midpoint(market)) / midpoint(market) * 100, 1)
   verdict: delta<-10 underpriced, -10..10 fair, >10 overpriced, null → unknown.
   scam_risk=high → deal_verdict starts "HIGH RISK". Recommendation matches.

9) TRUST & CLARITY (REQUIRED for real-buyer trust).

   a) ONE-LINE EXPLANATIONS. Each of these fields must end with a short
      because-clause that names the SPECIFIC factor driving the result:

      • score_interpretation — explain WHY this score, not what the score means.
        Good: "Priced 8% above market and mileage is 30% over typical for age."
        Bad:  "This is a moderately overpriced car." (doesn't say WHY)

      • price_evaluation.explanation — must include both:
          (i) where the market value range came from — name the factors:
              "Range built from age (5y), mileage (95,000 km), and the
              model's typical depreciation curve."
          (ii) why the listing sits where it does relative to that range.

      • negotiation.suggested_offer — the FIRST talking_point must explain
        WHY the suggested offer is that number, citing market_value.low and
        any deductions applied (mileage, missing history, scam risk).
        Example: "Open at €15,200 — that's market low (€16,000) minus €800
        for 145,000 km usage, and €0 for the clean service history."

   b) HUMAN TONE. FORBIDDEN words anywhere in any text field:
        "generally", "typically", "in most cases", "tends to", "usually",
        "may", "might", "consider", "worth noting", "it depends".
      Replace with direct statements of fact. Use simple language a real
      buyer understands — not analyst jargon. Short sentences.

   c) UNKNOWN-DATA TRUST INDICATOR. When a field cannot be determined from
      the input, say so explicitly using this phrasing (translated to the
      output language):
        "Not enough data provided to determine this."
      Do NOT guess. Do NOT pad with vague phrasing. The user trusts the
      report MORE when you admit a gap than when you fill it with filler.

EXPERT FIELDS (all required)
- ownership_cost_estimate: concrete yearly cost, breakdown with numeric ranges.
- fuel_economy_estimate: combined/urban/highway in regional units (EU l/100km,
  US mpg(US), UK mpg(UK)).
- lifespan_estimate: expected_total_km realistic for the engine
  (e.g. 300k km BMW N47 diesel). remaining = max(0, total - current km).
- resale_outlook: 1y%, 3y% of today's value. Typical 85–92 / 60–75.

OUTPUT
- Strict JSON, language as specified, 3-letter currency codes.
- region: "US"|"UK"|"EU" or 2-letter code.
- Data-driven. Model+generation references, real numbers, no filler
  ("overall", "generally", "typically", "in most cases", "tends to",
  "based on EU defaults"). See rule 9b for the full forbidden list.
- LENGTH LIMITS (strict, for performance):
    summary: ≤ 3 sentences.
    pros / cons / risks: ≤ 3 items each.
    common_issues / scam_signals: ≤ 4 items each.
    negotiation.talking_points: ≤ 3 bullets.
    inspection_checklist (each group): ≤ 4 items.
    alternatives: ≤ 3 items.
    All text field notes: ≤ 2 sentences.
`;
}

function buildUserPrompt(opts: {
  input: string;
  additionalDetails: string | null;
  inputType: "url" | "text";
  language: string;
  verifiedPrice: ExtractedPrice | null;
  verifiedMileage: Mileage | null;
  verifiedYear: number | null;
  vehicleHints: VehicleHints;
  userProvided: boolean;
  currentYear: number;
  nonce: string;
}) {
  const priceLine = opts.verifiedPrice
    ? `VERIFIED_LISTING_PRICE = { "amount": ${opts.verifiedPrice.amount}, "currency": "${opts.verifiedPrice.currency}", "matched_text": ${JSON.stringify(opts.verifiedPrice.rawMatch.trim())} }`
    : `VERIFIED_LISTING_PRICE = null`;
  const mileageLine = opts.verifiedMileage
    ? `VERIFIED_MILEAGE = { "value": ${opts.verifiedMileage.value}, "unit": "${opts.verifiedMileage.unit}", "km": ${opts.verifiedMileage.km} }`
    : `VERIFIED_MILEAGE = null`;
  const yearLine = `VERIFIED_YEAR = ${opts.verifiedYear ?? "null"}`;
  const hintsLine = `VEHICLE_HINTS = ${JSON.stringify(opts.vehicleHints)}`;
  const sourceLine = `OVERRIDES_FROM_USER = ${opts.userProvided ? "true" : "false"}`;

  const extraBlock = opts.additionalDetails
    ? `

=== ADDITIONAL_DETAILS (user-supplied description; use as primary source for vehicle attributes, equipment, condition and history) ===
"""
${opts.additionalDetails}
"""
=== END ADDITIONAL_DETAILS ===`
    : "";

  return `Output language for ALL textual fields: ${opts.language}
Input type: ${opts.inputType}
Current year: ${opts.currentYear}
Request id (forces variation): ${opts.nonce}

=== AUTHORITATIVE BLOCK (backend-extracted or user-provided) ===
${priceLine}
${mileageLine}
${yearLine}
${hintsLine}
${sourceLine}
=== END AUTHORITATIVE BLOCK ===
${extraBlock}

Listing input (free text):
"""
${opts.input}
"""

Return ONLY a JSON object with this exact shape:
{
  "deal_score": number 1-10,
  "score_interpretation": string,
  "recommendation": "buy" | "dont_buy" | "risky",
  "recommendation_reason": string,
  "deal_verdict": string,

  "vehicle_spec": {
    "make": string,
    "model": string,
    "variant": string,
    "year": integer | null,
    "generation": string,
    "transmission": "manual" | "automatic" | "semi_automatic" | "unknown",
    "fuel": "petrol" | "diesel" | "hybrid" | "plug_in_hybrid" | "electric" | "lpg" | "cng" | "unknown",
    "drivetrain": "fwd" | "rwd" | "awd" | "4wd" | "unknown",
    "trim": string,
    "engine_displacement_l": number | null,
    "power_hp": integer | null,
    "body_style": string,
    "notable_features": string[],
    "inferred": {
      "transmission": boolean,
      "fuel": boolean,
      "drivetrain": boolean,
      "trim": boolean,
      "engine_displacement_l": boolean,
      "power_hp": boolean,
      "body_style": boolean
    }
  },

  "market_value": { "low": integer, "high": integer, "currency": string },
  "price_evaluation": {
    "listing_price": integer | null,
    "currency": string,
    "verdict": "underpriced" | "fair" | "overpriced" | "unknown",
    "delta_pct": number,
    "explanation": string
  },
  "region": string,

  "mileage": { "value": integer, "unit": "km" | "mi", "km": integer } | null,

  "price_history": [ { "year": integer, "value": integer, "is_forecast": boolean }, ... ],
  "future_prediction": { "year": ${opts.currentYear + 1}, "value": integer, "is_forecast": true },
  "depreciation_rate": number,

  "reliability_score": number 1-10,
  "maintenance_cost_estimate": { "yearly_low": integer, "yearly_high": integer, "currency": string, "notes": string },

  "ownership_cost_estimate": {
    "yearly_low": integer,
    "yearly_high": integer,
    "currency": string,
    "breakdown": {
      "fuel": string,
      "insurance": string,
      "maintenance": string,
      "tax": string,
      "depreciation": string
    },
    "notes": string
  },
  "fuel_economy_estimate": { "combined": string, "urban": string, "highway": string, "notes": string },
  "lifespan_estimate": {
    "expected_total_km": integer,
    "remaining_km_estimate": integer,
    "expected_years_remaining": number,
    "notes": string
  },
  "resale_outlook": {
    "one_year_pct": number,
    "three_year_pct": number,
    "liquidity": "high" | "medium" | "low",
    "notes": string
  },

  "common_issues": string[],
  "pros": string[],
  "cons": string[],
  "risks": string[],

  "scam_risk": "low" | "medium" | "high",
  "scam_signals": string[],

  "inspection_checklist": {
    "visual": string[],
    "mechanical": string[],
    "paperwork": string[],
    "red_flags": string[]
  },

  "negotiation": { "suggested_offer": integer, "currency": string, "reasoning": string, "talking_points": string[] },
  "alternatives": [{ "title": string, "reason": string }],

  "summary": string
}`;
}

// ===================================================================
// CLIENT
// ===================================================================

let _client: OpenAI | null = null;
function client() {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  _client = new OpenAI({ apiKey });
  return _client;
}

// ===================================================================
// POST-PROCESSING GUARDRAILS
// ===================================================================

const NO_RED_FLAGS_SENTINEL = "No strong red flags detected based on provided data";

const GENERIC_RED_FLAG_PHRASES = [
  /^inspect the car carefully\.?$/i,
  /^check engine condition\.?$/i,
  /^make sure the title is clean\.?$/i,
  /^check for rust\.?$/i,
  /^verify the seller'?s identity\.?$/i,
  /^verify the vin\.?$/i,
  /^verify vin\.?$/i,
  /^check the vin\.?$/i,
  /^request the vin\.?$/i,
  /^get a pre[- ]?purchase inspection\.?$/i,
  /^be careful\.?$/i,
  /^do your own research\.?$/i,
  /^check the documents\.?$/i,
  /^check service history\.?$/i,
  /^check the engine\.?$/i,
  /^check brakes\.?$/i,
  /^check tires\.?$/i,
  /^ask for service records\.?$/i,
  /^request maintenance records\.?$/i,
  /^ensure the car has a clean title\.?$/i
];

function isGenericRedFlag(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return true;
  if (trimmed === NO_RED_FLAGS_SENTINEL) return false;
  // Minimum 30 characters per spec.
  if (trimmed.length < 30) return true;
  if (GENERIC_RED_FLAG_PHRASES.some((re) => re.test(trimmed))) return true;
  const hasDigit = /\d/.test(trimmed);
  const hasSpecificKeyword =
    /\b(VIN|km|mi|miles|kilometers|service|history|salvage|title|recall|timing|chain|belt|gearbox|transmission|subframe|injector|DPF|EGR|turbo|head gasket|clutch|carfax|MOT|APK|TÜV|ULEZ|warranty|deposit|wire|escrow|PCP|finance|writeoff|written[- ]off|flood|hail|accident|N47|B8|W205|F30|Mk[1-9]|DSG|TDI|TFSI|CDI|HDI|PDK)\b/i.test(trimmed);
  // MUST include digit OR specific keyword (per spec).
  if (!hasDigit && !hasSpecificKeyword) return true;
  return false;
}

/**
 * A negotiation bullet is "concrete" when it cites at least one of:
 *   - a specific money amount (currency symbol or code + digits)
 *   - a specific mileage (digits followed by km/mi/miles/k)
 *   - a model-specific failure point by name
 * AND is at least 40 characters long.
 *
 * Filter rejects filler phrases like "negotiate based on condition".
 */
const NEGOTIATION_FILLER_PATTERNS: RegExp[] = [
  /negotiate\s+based\s+on\s+condition/i,
  /consider\s+(the\s+)?overall\s+value/i,
  /factor\s+in\s+market\s+trends/i,
  /take\s+the\s+mileage\s+into\s+account/i,
  /discuss\s+(the\s+)?service\s+history/i,
  /use\s+the\s+inspection\s+results/i,
  /negotiate\s+(a\s+)?fair\s+price/i,
  /consider\s+(the\s+)?market\s+value/i,
  /consider\s+negotiating/i,
  /try\s+to\s+lower\s+the\s+price/i
];

function isConcreteNegotiationBullet(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  if (trimmed.length < 40) return false;
  if (NEGOTIATION_FILLER_PATTERNS.some((re) => re.test(trimmed))) return false;
  const hasMoney = /(?:[€$£¥]|\b(?:EUR|USD|GBP|CHF|PLN|SEK|NOK|DKK|CAD|AUD)\b)\s*\d/i.test(trimmed) ||
                   /\d+\s*(?:EUR|USD|GBP|CHF|PLN|SEK|NOK|DKK|CAD|AUD)\b/i.test(trimmed);
  const hasMileage = /\d[\d,\s.]*\s*(?:km|mi|miles|kilometers|k)\b/i.test(trimmed);
  const hasModelIssue = /\b(N47|N20|N57|B8|W205|W204|F30|E90|Mk[1-9]|DSG|PDK|TDI|TFSI|CDI|HDI|mechatronic|timing\s+chain|timing\s+belt|control\s+arm|DPF|EGR|turbo|head\s+gasket|oil\s+consumption|dual[- ]mass|DMF|clutch|injector)\b/i.test(trimmed);
  return hasMoney || hasMileage || hasModelIssue;
}

function detectYearInInput(text: string): number | null {
  const cy = new Date().getUTCFullYear();
  const re = /\b(19[89]\d|20[0-2]\d|20\d{2})\b/g;
  let m: RegExpExecArray | null;
  let best: number | null = null;
  while ((m = re.exec(text)) !== null) {
    const y = parseInt(m[1], 10);
    if (y >= 1980 && y <= cy + 1) {
      // Prefer the EARLIEST plausible year (likely model year, not a listing date).
      if (best === null || y < best) best = y;
    }
  }
  return best;
}

function formatMoneyShort(n: number, cur: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `${n} ${cur}`;
  }
}

function computeConfidence(opts: {
  hasPrice: boolean;
  hasMileage: boolean;
  hasYear: boolean;
  userProvided: boolean;
}): { level: Confidence; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  if (opts.hasPrice) { score += 2; reasons.push("Listing price available."); }
  else reasons.push("Listing price missing.");
  if (opts.hasMileage) { score += 2; reasons.push("Mileage available."); }
  else reasons.push("Mileage missing.");
  if (opts.hasYear) { score += 1; reasons.push("Model year detected."); }
  else reasons.push("Model year not clearly stated.");
  if (opts.userProvided) { score += 1; reasons.push("User-supplied data is used as ground truth."); }
  const level: Confidence = score >= 5 ? "high" : score >= 3 ? "medium" : "low";
  return { level, reasons };
}

// ===================================================================
// REALISTIC DEPRECIATION CURVE
// ===================================================================

/**
 * Authoritative deal score based on hard signals. Returns both a recommended
 * score and the band it should fall into (so we can clamp model drift).
 *
 * HARD RULES (post-blend):
 *   delta_pct > +35%  → score ≤ 5  (cannot be above 5)
 *   delta_pct < -25%  → score ≥ 8  (unless scamRisk = high → 2–4)
 *
 * BANDS (inside the hard rules):
 *   strongly overpriced (>+35%)        → 1–4
 *   overpriced (+15..+35%)             → 4–6
 *   common range (-10..+15%)           → 5.5–7.5
 *   good deal (-25..-10%)              → 7–9
 *   strongly undervalued (< -25%)      → 8–10 (or 2–4 if scam)
 *
 * BOOST: if scamRisk=low AND mileage normal-for-age AND |delta|<=10%,
 *   the floor is forced up to 7.
 */
function computeDealScore(opts: {
  delta_pct: number;
  listing_price: number | null;
  scamRisk: "low" | "medium" | "high";
  currentKm: number | null;
  carAge: number;
  variantUnknown: boolean;
}): { score: number; band: [number, number] } {
  // No listing price → confidence too low for a number, stay neutral-low.
  if (opts.listing_price == null) return { score: 5, band: [3, 6] };

  const d = opts.delta_pct;
  let base: number;
  let band: [number, number];

  // ---- BAND ASSIGNMENT (new thresholds) ----
  if (d > 35) {
    // Strongly overpriced — cannot exceed 4.
    base = Math.max(1, 4 - (d - 35) * 0.05);
    band = [1, 4];
  } else if (d > 15) {
    // Overpriced — 4..6.
    // d=15 → 6.0 ; d=35 → 4.0 (linear).
    base = 6 - ((d - 15) / 20) * 2;
    band = [4, 6];
  } else if (d >= -10) {
    // Common range — 5.5..7.5. Centred so:
    //   d=+15 → 5.5 ; d=0 → 6.5 ; d=-10 → 7.5
    base = 6.5 - d * 0.04;
    band = [5.5, 7.5];
  } else if (d >= -25) {
    // Good deal — 7..9.
    // d=-10 → 7.0 ; d=-25 → 9.0
    base = 7 + ((-d - 10) / 15) * 2;
    band = [7, 9];
  } else {
    // Strongly undervalued — 8..10 unless scam.
    if (opts.scamRisk === "high") {
      base = 3;
      band = [2, 4];
    } else {
      base = Math.min(10, 8 + Math.min(2, (-d - 25) / 10));
      band = [8, 10];
    }
  }

  // Risk penalties
  if (opts.scamRisk === "high") {
    // High scam risk caps the score at 4 — and we must collapse the BAND
    // floor too, otherwise a band like [5.5, 7.5] would clamp the final
    // value back up to 5.5 even after we set base = min(base, 4).
    band = [2, 4];
    base = Math.min(base, 4);
  } else if (opts.scamRisk === "medium") {
    base -= 0.5;
  }

  // Mileage penalty vs typical for age
  let mileageNormal = true;
  if (opts.currentKm != null && opts.carAge > 0) {
    const typical = 15_000 * opts.carAge;
    const ratio = opts.currentKm / typical;
    if (ratio >= 1.5) {
      base -= 0.8;
      mileageNormal = false;
    } else if (ratio >= 1.2) {
      base -= 0.4;
      mileageNormal = false;
    } else if (ratio < 0.5) {
      // Implausibly low mileage for age can also be a flag (rollback?), but
      // we don't penalise here — keep mileageNormal true so the boost still
      // applies for genuine low-mile examples.
    }
  }

  if (opts.variantUnknown) base -= 0.3;

  // ---- BOOST: typical car priced fairly + low risk → floor at 7 ----
  if (
    opts.scamRisk === "low" &&
    mileageNormal &&
    Math.abs(d) <= 10 &&
    !opts.variantUnknown
  ) {
    base = Math.max(base, 7);
    band = [Math.max(band[0], 7), Math.max(band[1], 7.5)];
  }

  // Clamp to 1..10
  const score = Math.max(1, Math.min(10, Math.round(base * 10) / 10));
  return { score, band };
}

/**
 * Typical per-year depreciation from industry retention data for mass-market cars.
 * Index = age AFTER that year (1 = from new -> end of year 1).
 * Steeper early, flatter later. Values tuned so:
 *   new -> 3y old retains ~55% of MSRP
 *   new -> 5y old retains ~42%
 *   new -> 7y old retains ~33%
 *   new -> 10y old retains ~22%
 * which matches published Kelley / ANWB / Schwacke ranges.
 */
const DEPRECIATION_BY_AGE: number[] = [
  0.22, // age 1: -22% from new
  0.15, // age 2
  0.13, // age 3
  0.11, // age 4
  0.10, // age 5
  0.09, // age 6
  0.08, // age 7
  0.08, // age 8
  0.07, // age 9
  0.07, // age 10
  0.06, // age 11
  0.06, // age 12
  0.05, // age 13
  0.05, // age 14
  0.04  // age 15+
];

function yearlyDepRate(ageAtEndOfYear: number): number {
  if (ageAtEndOfYear <= 0) return DEPRECIATION_BY_AGE[0];
  const idx = Math.min(DEPRECIATION_BY_AGE.length - 1, ageAtEndOfYear - 1);
  return DEPRECIATION_BY_AGE[idx];
}

/**
 * Mileage adjustment: low mileage for age -> prices held higher historically,
 * high mileage -> steeper historical depreciation to reach today's anchor.
 * Returns a multiplier applied to each year's base rate.
 *
 * Typical annual mileage ~ 15,000 km. We compare actual km/age against that.
 */
function mileageFactor(currentKm: number | null, age: number): number {
  if (!currentKm || age <= 0) return 1.0;
  const typical = 15_000 * age;
  const ratio = currentKm / typical;
  if (ratio >= 1.6) return 1.15;
  if (ratio >= 1.25) return 1.08;
  if (ratio <= 0.5) return 0.88;
  if (ratio <= 0.75) return 0.94;
  return 1.0;
}

/**
 * Build a realistic 5-past + 1-future price curve, anchored at currentValue
 * for the current year. Walks BACKWARD from today using real per-year
 * depreciation rates (so older years have larger values), and FORWARD one
 * year using the next expected rate.
 */
export function buildDepreciationCurve(opts: {
  currentYear: number;
  modelYear: number;
  carAge: number;           // years since model year, clamped [0, 30]
  currentValue: number;     // anchor in year `currentYear`
  currentKm: number | null;
  modelDepreciationHint: number; // model's average % guess (used only as sanity check)
}): { year: number; value: number; is_forecast: boolean }[] {
  const { currentYear, currentValue, carAge, currentKm } = opts;
  const mFactor = mileageFactor(currentKm, carAge);

  const history: { year: number; value: number; is_forecast: boolean }[] = [];

  // Anchor at current year.
  history.push({ year: currentYear, value: Math.round(currentValue), is_forecast: false });

  // Walk BACKWARD 4 years using INVERSE depreciation rate.
  // If at age N the car loses rate_N, then at age N-1 it was worth value / (1 - rate_N).
  let v = currentValue;
  for (let back = 1; back <= 4; back++) {
    const targetYear = currentYear - back;
    const ageAtThatYearEnd = Math.max(0, carAge - back + 1); // age at END of targetYear
    const rate = yearlyDepRate(ageAtThatYearEnd) * mFactor;
    const clampedRate = Math.min(0.28, Math.max(0.03, rate));
    v = v / (1 - clampedRate);
    // Don't let past values explode past ~4x today's value (sanity)
    const capped = Math.min(v, currentValue * 4);
    history.unshift({ year: targetYear, value: Math.round(capped), is_forecast: false });
    v = capped;
  }

  // Forward 1 year using next-year depreciation rate.
  const nextAge = carAge + 1;
  const nextRate = Math.min(0.25, Math.max(0.03, yearlyDepRate(nextAge) * mFactor));
  const nextValue = Math.round(currentValue * (1 - nextRate));
  history.push({ year: currentYear + 1, value: nextValue, is_forecast: true });

  return history;
}

/**
 * Sharpen the deal_verdict text so it starts with a decisive phrase.
 * The model is asked to do this; we enforce it as a safety net.
 */
function sharpenVerdict(verdict: string, evalVerdict: string, scam: string, rec: string): string {
  const lead = (phrase: string) => `${phrase} — ${verdict.replace(/^\s*[-—–:]\s*/, "")}`;
  const lower = verdict.toLowerCase();
  const startsDecisively =
    /^(strong buy|buy|overpriced|fair deal|fair|high risk|walk away|don'?t buy|do not buy|risky|underpriced)\b/i.test(verdict.trim()) ||
    /^[A-Z ]{4,}—/.test(verdict.trim());
  if (startsDecisively) return verdict;

  // Priority: scam > price verdict > recommendation
  if (scam === "high") return lead("HIGH RISK");
  if (evalVerdict === "overpriced") return lead("OVERPRICED");
  if (evalVerdict === "underpriced" && rec === "buy") return lead("STRONG BUY");
  if (rec === "buy") return lead("BUY");
  if (rec === "dont_buy") return lead("DON'T BUY");
  if (rec === "risky") return lead("RISKY");
  if (evalVerdict === "fair") return lead("FAIR DEAL");
  return verdict;
}

/**
 * Strip meta-commentary phrases that leak into output despite the prompt.
 */
const FORBIDDEN_META_PHRASES: RegExp[] = [
  /\s*\(?based on (EU|European|US|UK|standard|typical|average)\b[^.,\n]*\.?\s*/gi,
  /\s*\(?using (standard|typical|default)\s+(assumptions|values|estimates)\b[^.,\n]*\.?\s*/gi,
  /\s*\(?assum(?:es|ing)\s+(EU|European|US|UK|standard)\b[^.,\n]*\.?\s*/gi
];

function stripMetaCommentary(s: string): string {
  let out = s;
  for (const re of FORBIDDEN_META_PHRASES) {
    out = out.replace(re, " ");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function normalize(
  data: AnalysisResult,
  opts: {
    verifiedPrice: ExtractedPrice | null;
    verifiedMileage: Mileage | null;
    verifiedYear: number | null;
    vehicleHints: VehicleHints;
    userProvided: boolean;
    currentYear: number;
  }
): AnalysisResult {
  // Currency consistency.
  let cur = data.market_value.currency;
  if (opts.verifiedPrice) cur = opts.verifiedPrice.currency;
  data.market_value.currency = cur;
  data.price_evaluation.currency = cur;
  data.negotiation.currency = cur;
  data.maintenance_cost_estimate.currency = cur;
  data.ownership_cost_estimate.currency = cur;

  if (data.market_value.low > data.market_value.high) {
    [data.market_value.low, data.market_value.high] = [data.market_value.high, data.market_value.low];
  }

  // Authoritative overrides.
  if (opts.verifiedPrice) data.price_evaluation.listing_price = opts.verifiedPrice.amount;
  else if (data.price_evaluation.listing_price != null) data.price_evaluation.listing_price = null;

  data.mileage = opts.verifiedMileage;

  if (opts.verifiedYear != null) {
    data.vehicle_spec.year = opts.verifiedYear;
  }

  // Force vehicle hints if we have them and the model produced "unknown".
  // When a hint wins, the value came from explicit input tokens ("TDI",
  // "automatic", "xDrive"...), so set inferred=false to override whatever
  // the model might have marked.
  if (opts.vehicleHints.transmission && data.vehicle_spec.transmission === "unknown") {
    data.vehicle_spec.transmission = opts.vehicleHints.transmission;
    data.vehicle_spec.inferred.transmission = false;
  } else if (opts.vehicleHints.transmission) {
    data.vehicle_spec.inferred.transmission = false;
  }
  if (opts.vehicleHints.fuel && data.vehicle_spec.fuel === "unknown") {
    data.vehicle_spec.fuel = opts.vehicleHints.fuel;
    data.vehicle_spec.inferred.fuel = false;
  } else if (opts.vehicleHints.fuel) {
    data.vehicle_spec.inferred.fuel = false;
  }
  if (opts.vehicleHints.drivetrain && data.vehicle_spec.drivetrain === "unknown") {
    data.vehicle_spec.drivetrain = opts.vehicleHints.drivetrain;
    data.vehicle_spec.inferred.drivetrain = false;
  } else if (opts.vehicleHints.drivetrain) {
    data.vehicle_spec.inferred.drivetrain = false;
  }
  // Unknown spec values can't be "inferred" — keep flag false for clarity.
  if (data.vehicle_spec.transmission === "unknown") data.vehicle_spec.inferred.transmission = false;
  if (data.vehicle_spec.fuel === "unknown") data.vehicle_spec.inferred.fuel = false;
  if (data.vehicle_spec.drivetrain === "unknown") data.vehicle_spec.inferred.drivetrain = false;
  if (data.vehicle_spec.trim === "unknown") data.vehicle_spec.inferred.trim = false;
  if (data.vehicle_spec.body_style === "unknown") data.vehicle_spec.inferred.body_style = false;
  if (data.vehicle_spec.engine_displacement_l == null) data.vehicle_spec.inferred.engine_displacement_l = false;
  if (data.vehicle_spec.power_hp == null) data.vehicle_spec.inferred.power_hp = false;
  // Merge detected features, dedup.
  if (opts.vehicleHints.features.length > 0) {
    const set = new Set(
      [...data.vehicle_spec.notable_features, ...opts.vehicleHints.features].map((s) => s.toLowerCase())
    );
    // Preserve casing of first occurrence.
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const f of [...data.vehicle_spec.notable_features, ...opts.vehicleHints.features]) {
      const k = f.toLowerCase();
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        merged.push(f);
      }
    }
    data.vehicle_spec.notable_features = merged.slice(0, 12);
  }

  // -------- MARKET VALUE INDEPENDENCE GUARD --------
  // The model sometimes echoes the listing price into market_value.low/high,
  // which makes every car look "fair" (or overpriced due to downstream math).
  // We only rebuild the range when ALL of the following hold:
  //   1. the range is implausibly narrow (< 5% spread), AND
  //   2. the midpoint lines up with the listing price (|delta| < 3%), AND
  //   3. the listing price itself is meaningfully off a realistic
  //      depreciation curve (> 15%) for this car's age + mileage.
  // Condition (3) is the key fix: if the listing matches what depreciation
  // predicts, the tight range is probably correct and we leave it alone.
  if (data.price_evaluation.listing_price != null) {
    const lp = data.price_evaluation.listing_price;
    const mv = data.market_value;
    const mvMid = (mv.low + mv.high) / 2;
    const rangeWidth = mv.high - mv.low;
    const rangePct = mvMid > 0 ? rangeWidth / mvMid : 1;

    // (1) too-narrow range
    const tooNarrow = rangePct < 0.05;

    // (2) midpoint anchored to listing
    const midDeltaPct =
      lp > 0 ? Math.abs(mvMid - lp) / lp : 1;
    const midAnchored = midDeltaPct < 0.03;

    // (3) how far is the listing from a realistic depreciation prediction?
    const modelYear0 = data.vehicle_spec.year ?? opts.currentYear;
    const ageGuard = Math.max(0, Math.min(30, opts.currentYear - modelYear0));
    const kmGuard = data.mileage?.km ?? null;
    const mFactor = mileageFactor(kmGuard, ageGuard);
    // Expected value = listing adjusted inversely by the mileage factor.
    // Under "normal" mileage (mFactor = 1) expected == listing → no deviation.
    // Under high mileage (mFactor > 1) we expect the car to be worth LESS,
    // so a listing at the same price is overpriced → expected < lp → deviation.
    const expected = mFactor > 0 ? lp / mFactor : lp;
    const depDeviation = lp > 0 ? Math.abs(expected - lp) / lp : 0;
    // Loosened from 15% to 20%: listings within ±20% of the depreciation
    // prediction are treated as realistic and the model's range is trusted.
    // Previously we were over-aggressively rebuilding market values for
    // cars that were priced slightly high but fundamentally reasonable,
    // which caused ~every car to be flagged as overpriced downstream.
    const offCurve = depDeviation > 0.20;

    // Only rebuild when ALL conditions hold.
    if (tooNarrow && midAnchored && offCurve) {
      const indepMid = Math.round(expected);
      // Use the SMALLER of ±12% or the current (tiny) range scaled up.
      const spread = 0.12;
      data.market_value.low = Math.max(0, Math.round(indepMid * (1 - spread)));
      data.market_value.high = Math.round(indepMid * (1 + spread));
    }
  }

  // Recompute delta + verdict from authoritative values.
  if (data.price_evaluation.listing_price != null) {
    const mid = (data.market_value.low + data.market_value.high) / 2;
    if (mid > 0) {
      const delta = ((data.price_evaluation.listing_price - mid) / mid) * 100;
      data.price_evaluation.delta_pct = Math.round(delta * 10) / 10;
      if (data.price_evaluation.delta_pct < -10) data.price_evaluation.verdict = "underpriced";
      else if (data.price_evaluation.delta_pct > 10) data.price_evaluation.verdict = "overpriced";
      else data.price_evaluation.verdict = "fair";
    }
  } else {
    data.price_evaluation.verdict = "unknown";
    data.price_evaluation.delta_pct = 0;
    if (!/unknown|unable|not detect|niet|nicht|impossible|no se|non rilev/i.test(data.price_evaluation.explanation)) {
      data.price_evaluation.explanation = "Listing price could not be detected from the input.";
    }
  }

  // Price history year set — REALISTIC NON-LINEAR CURVE.
  const cy = opts.currentYear;
  const forecastYear = cy + 1;
  const modelYear = data.vehicle_spec.year ?? cy;
  const carAge = Math.max(0, Math.min(30, cy - modelYear));
  const currentKm = data.mileage?.km ?? null;

  // Anchor: prefer listing price, else market midpoint.
  const anchorToday =
    data.price_evaluation.listing_price ??
    Math.round((data.market_value.low + data.market_value.high) / 2);

  if (anchorToday > 0) {
    data.price_history = buildDepreciationCurve({
      currentYear: cy,
      modelYear,
      carAge,
      currentValue: anchorToday,
      currentKm,
      modelDepreciationHint: data.depreciation_rate
    });
    const fc = data.price_history.find((p) => p.is_forecast);
    if (fc) data.future_prediction = fc;
  } else {
    // Fallback: ensure forecast year at least
    if (data.future_prediction.year !== forecastYear) data.future_prediction.year = forecastYear;
    const hasForecast = data.price_history.some((p) => p.year === forecastYear && p.is_forecast);
    if (!hasForecast) data.price_history.push({ ...data.future_prediction });
    data.price_history.sort((a, b) => a.year - b.year);
  }

  // lifespan_estimate: recompute remaining_km from authoritative mileage.
  if (data.mileage && data.lifespan_estimate.expected_total_km > 0) {
    data.lifespan_estimate.remaining_km_estimate = Math.max(
      0,
      data.lifespan_estimate.expected_total_km - data.mileage.km
    );
  } else if (!data.mileage) {
    data.lifespan_estimate.remaining_km_estimate = 0;
    if (!/unknown|not (provided|stated)|no mileage/i.test(data.lifespan_estimate.notes)) {
      data.lifespan_estimate.notes =
        `Mileage not provided — remaining lifespan cannot be estimated. ${data.lifespan_estimate.notes}`.slice(0, 290);
    }
  }

  // Red flags: drop generics, accept sentinel.
  const sentinelHit = data.inspection_checklist.red_flags.some((s) => s.trim() === NO_RED_FLAGS_SENTINEL);
  const filtered = data.inspection_checklist.red_flags.filter((s) => !isGenericRedFlag(s));
  if (sentinelHit) {
    data.inspection_checklist.red_flags = [NO_RED_FLAGS_SENTINEL];
  } else if (filtered.length > 0) {
    data.inspection_checklist.red_flags = filtered;
  } else {
    const synth: string[] = [];
    const lp = data.price_evaluation.listing_price;
    const dp = data.price_evaluation.delta_pct;
    const km = data.mileage?.km ?? null;
    if (lp != null && Math.abs(dp) >= 15) {
      const direction = dp < 0 ? "below" : "above";
      synth.push(
        `Listing price ${formatMoneyShort(lp, cur)} is ${Math.abs(dp).toFixed(1)}% ${direction} the market midpoint — verify VIN, title status and an independent inspection report before committing.`
      );
    } else if (lp == null && km == null) {
      synth.push(
        `Listing did not state a price or mileage — request both in writing along with the VIN before any inspection.`
      );
    } else if (lp == null) {
      synth.push(`No listing price could be detected — request the exact asking price in writing before scheduling an inspection.`);
    } else if (km == null) {
      synth.push(`Mileage was not stated in the listing — confirm odometer reading and service history before committing.`);
    } else if (km >= 200_000) {
      synth.push(
        `${km.toLocaleString()} km is high mileage — request full service records (timing, clutch, suspension) and budget for near-term wear-item replacement.`
      );
    } else {
      synth.push(
        `Cross-check the VIN against the title and a vehicle-history report (${data.region === "US" ? "Carfax / AutoCheck" : data.region === "UK" ? "MOT history & HPI check" : "national vehicle register"}) before paying any deposit.`
      );
    }
    data.inspection_checklist.red_flags = synth;
  }

  // Sharpen verdict text.
  data.deal_verdict = sharpenVerdict(
    data.deal_verdict,
    data.price_evaluation.verdict,
    data.scam_risk,
    data.recommendation
  );

  // Strip meta-commentary leaks ("based on EU defaults", etc.) from text fields.
  data.summary = stripMetaCommentary(data.summary);
  data.deal_verdict = stripMetaCommentary(data.deal_verdict);
  data.score_interpretation = stripMetaCommentary(data.score_interpretation);
  data.recommendation_reason = stripMetaCommentary(data.recommendation_reason);
  data.price_evaluation.explanation = stripMetaCommentary(data.price_evaluation.explanation);
  data.maintenance_cost_estimate.notes = stripMetaCommentary(data.maintenance_cost_estimate.notes);
  data.ownership_cost_estimate.notes = stripMetaCommentary(data.ownership_cost_estimate.notes);
  data.fuel_economy_estimate.notes = stripMetaCommentary(data.fuel_economy_estimate.notes);
  data.lifespan_estimate.notes = stripMetaCommentary(data.lifespan_estimate.notes);
  data.resale_outlook.notes = stripMetaCommentary(data.resale_outlook.notes);

  // If variant is unknown, apply the -0.5 score penalty the prompt promised.
  if (data.vehicle_spec.variant === "unknown" && data.deal_score > 1) {
    data.deal_score = Math.max(1, Math.round((data.deal_score - 0.5) * 10) / 10);
  }

  // -------- AUTHORITATIVE SCORE RECOMPUTE --------
  // The model clusters around 5–7 regardless of pricing. We recompute the
  // score from real data and let the formula dominate (80/20 formula/model)
  // so the 1–10 range is actually used.
  const modelScore = Math.max(1, Math.min(10, data.deal_score || 6));
  const recomputedScore = computeDealScore({
    delta_pct: data.price_evaluation.delta_pct,
    listing_price: data.price_evaluation.listing_price,
    scamRisk: data.scam_risk,
    currentKm: data.mileage?.km ?? null,
    carAge: Math.max(0, opts.currentYear - (data.vehicle_spec.year ?? opts.currentYear)),
    variantUnknown: data.vehicle_spec.variant === "unknown"
  });
  const blended = 0.8 * recomputedScore.score + 0.2 * modelScore;
  const [bandMin, bandMax] = recomputedScore.band;
  let finalScore = Math.max(bandMin, Math.min(bandMax, blended));

  // HARD RULES — override any drift from blending.
  const deltaFinal = data.price_evaluation.delta_pct;
  if (deltaFinal > 35) {
    // Strongly overpriced cannot exceed 5 regardless of what the model said.
    finalScore = Math.min(finalScore, 5);
  }
  if (deltaFinal < -25 && data.scam_risk !== "high") {
    // Strongly undervalued legit deals must score ≥ 8.
    finalScore = Math.max(finalScore, 8);
  }

  data.deal_score = Math.round(Math.max(1, Math.min(10, finalScore)) * 10) / 10;

  // Keep recommendation consistent with the final score.
  if (data.deal_score <= 4) data.recommendation = data.scam_risk === "high" ? "risky" : "dont_buy";
  else if (data.deal_score <= 6) data.recommendation = data.scam_risk === "high" ? "risky" : "risky";
  else data.recommendation = "buy";

  // -------- NEGOTIATION FLOOR --------
  // suggested_offer must be grounded in market_value.low, adjusted DOWN for
  // mileage and risks. Never suggest the listing price; never exceed asking.
  const marketLow = data.market_value.low;
  if (marketLow > 0) {
    let penaltyFactor = 1.0;
    // Mileage penalty
    if (data.mileage) {
      const age = Math.max(1, opts.currentYear - (data.vehicle_spec.year ?? opts.currentYear));
      const typicalKm = 15_000 * age;
      const kmRatio = data.mileage.km / typicalKm;
      if (kmRatio >= 1.5) penaltyFactor *= 0.93;
      else if (kmRatio >= 1.25) penaltyFactor *= 0.96;
    }
    // Scam risk penalty
    if (data.scam_risk === "high") penaltyFactor *= 0.85;
    else if (data.scam_risk === "medium") penaltyFactor *= 0.93;

    let offer = Math.round(marketLow * penaltyFactor);
    // Never suggest ABOVE the listing price (absurd).
    if (data.price_evaluation.listing_price != null) {
      offer = Math.min(offer, data.price_evaluation.listing_price);
    }
    // Sanity floor: don't go below 60% of market_low.
    offer = Math.max(offer, Math.round(marketLow * 0.6));
    data.negotiation.suggested_offer = offer;
  }
  data.negotiation.currency = data.market_value.currency;

  // -------- NEGOTIATION TALKING POINTS: FILTER + SYNTHESIZE --------
  // Drop generic filler; if nothing remains, synthesize at least one concrete
  // bullet from real data so the card is never empty.
  const keptBullets = data.negotiation.talking_points.filter((b) =>
    isConcreteNegotiationBullet(b)
  );
  if (keptBullets.length === 0) {
    const synth: string[] = [];
    const lp = data.price_evaluation.listing_price;
    const suggested = data.negotiation.suggested_offer;
    const currency = data.negotiation.currency;
    const mid = Math.round((data.market_value.low + data.market_value.high) / 2);
    const km = data.mileage?.km ?? null;

    if (lp != null && suggested > 0 && suggested < lp) {
      const gap = lp - suggested;
      synth.push(
        `Open at ${formatMoneyShort(suggested, currency)} — that's ${formatMoneyShort(gap, currency)} under the asking price and aligned with the lower bound of market value (${formatMoneyShort(data.market_value.low, currency)}).`
      );
    }
    if (lp != null && mid > 0 && Math.abs(lp - mid) > mid * 0.05) {
      const over = lp > mid;
      const diff = Math.abs(lp - mid);
      synth.push(
        over
          ? `Listing is ${formatMoneyShort(diff, currency)} above the market midpoint (${formatMoneyShort(mid, currency)}) — ask the seller to justify the premium or match the midpoint.`
          : `Listing sits ${formatMoneyShort(diff, currency)} below the market midpoint (${formatMoneyShort(mid, currency)}) — confirm there are no hidden issues before closing.`
      );
    }
    if (km != null) {
      const age = Math.max(1, opts.currentYear - (data.vehicle_spec.year ?? opts.currentYear));
      const typical = 15_000 * age;
      if (km >= typical * 1.25) {
        synth.push(
          `${km.toLocaleString()} km is roughly ${Math.round((km / typical - 1) * 100)}% above typical for ${age} year${age === 1 ? "" : "s"} — request full service records and deduct ${formatMoneyShort(Math.round(marketLow * 0.05), currency)} for upcoming wear items.`
        );
      } else if (km >= 150_000) {
        synth.push(
          `${km.toLocaleString()} km is high-mileage territory — ask for proof of timing belt/chain service and use it as leverage for a ${formatMoneyShort(Math.round(marketLow * 0.04), currency)} reduction.`
        );
      }
    }
    if (synth.length === 0 && lp != null) {
      synth.push(
        `Anchor your first offer at ${formatMoneyShort(data.market_value.low, currency)} (the bottom of the market range) and hold firm until the seller counters below ${formatMoneyShort(lp, currency)}.`
      );
    }
    data.negotiation.talking_points = synth.slice(0, 3);
  } else {
    data.negotiation.talking_points = keptBullets.slice(0, 3);
  }

  // -------- NEGOTIATION REASONING (FIX 4) --------
  // If the model omitted reasoning (or returned filler), synthesize a real
  // one-sentence explanation from authoritative numbers.
  const existingReasoning = (data.negotiation.reasoning ?? "").trim();
  const reasoningIsConcrete =
    existingReasoning.length >= 20 &&
    // Must contain a digit OR a currency hint OR a model-keyword to count as
    // grounded. Avoids letting "consider negotiating" through.
    (/\d/.test(existingReasoning) ||
      /\b(EUR|USD|GBP|km|mi|miles|kilometers|N47|DSG|TDI|TFSI|timing|mechatronic)\b/i.test(
        existingReasoning
      ));
  if (!reasoningIsConcrete) {
    const offer = data.negotiation.suggested_offer;
    const cur = data.negotiation.currency;
    const mLow = data.market_value.low;
    const lp = data.price_evaluation.listing_price;
    if (offer > 0 && mLow > 0 && lp != null && offer < lp) {
      const gapVsListing = lp - offer;
      const gapVsMarketLow = mLow - offer;
      if (gapVsMarketLow > 0) {
        data.negotiation.reasoning =
          `Market low is ${formatMoneyShort(mLow, cur)}; ` +
          `${formatMoneyShort(offer, cur)} accounts for ${formatMoneyShort(gapVsMarketLow, cur)} of mileage and condition adjustments.`;
      } else {
        data.negotiation.reasoning =
          `Asking is ${formatMoneyShort(lp, cur)}; ` +
          `${formatMoneyShort(offer, cur)} sits at the bottom of the market range and gives the seller ${formatMoneyShort(gapVsListing, cur)} of headroom to negotiate down to.`;
      }
    } else if (offer > 0 && lp != null && offer >= lp) {
      data.negotiation.reasoning =
        `The asking price is already at or below market low (${formatMoneyShort(mLow, cur)}); match it and move quickly.`;
    } else if (mLow > 0) {
      data.negotiation.reasoning =
        `Market low is ${formatMoneyShort(mLow, cur)} — anchor there and let the seller justify any premium.`;
    } else {
      data.negotiation.reasoning =
        "Not enough data provided to determine a precise offer. Anchor below the asking price and verify mileage and history before committing.";
    }
  }

  // -------- ENFORCE LENGTH LIMITS (FIX 3) --------
  // The prompt asks for these limits, but the model occasionally returns more.
  // Hard-cap server-side so the UI never has to handle sprawling responses.
  data.pros = data.pros.slice(0, 3);
  data.cons = data.cons.slice(0, 3);
  data.risks = data.risks.slice(0, 3);
  data.common_issues = data.common_issues.slice(0, 4);
  data.scam_signals = data.scam_signals.slice(0, 4);
  data.alternatives = data.alternatives.slice(0, 3);
  data.inspection_checklist.visual = data.inspection_checklist.visual.slice(0, 4);
  data.inspection_checklist.mechanical = data.inspection_checklist.mechanical.slice(0, 4);
  data.inspection_checklist.paperwork = data.inspection_checklist.paperwork.slice(0, 4);
  // Don't truncate red_flags — they're user-safety-critical and the UI handles
  // any number gracefully.

  // Cap summary at 3 sentences. Split on sentence-ending punctuation followed
  // by whitespace + uppercase / end of string.
  const sentences = data.summary.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [data.summary];
  if (sentences.length > 3) {
    data.summary = sentences.slice(0, 3).join(" ").trim();
  }

  return data;
}

// ===================================================================
// ENTRY POINT
// ===================================================================

export async function analyzeCar(params: {
  input: string;
  additionalDetails?: string | null;
  inputType: "url" | "text";
  language: string;
  overrides?: UserOverrides;
}): Promise<AnalysisResult> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const currentYear = new Date().getUTCFullYear();
  const ov = params.overrides;

  // Combine primary input + additional details for extractor purposes.
  // The AI sees them as distinct blocks (primary + ADDITIONAL_DETAILS).
  const combinedText = params.additionalDetails
    ? `${params.input}\n\n${params.additionalDetails}`
    : params.input;

  // PRICE: user override wins, else extract from combined text.
  const extractedPrice = extractListingPrice(combinedText);
  let verifiedPrice: ExtractedPrice | null;
  if (ov?.listing_price != null && ov.listing_price > 0) {
    const currency =
      (ov.currency && CCY_CODES.includes(ov.currency.toUpperCase()) && ov.currency.toUpperCase()) ||
      extractedPrice?.currency ||
      guessCurrencyFromContext(params.input) ||
      "EUR";
    verifiedPrice = {
      amount: Math.round(ov.listing_price),
      currency,
      rawMatch: `user-provided: ${ov.listing_price} ${currency}`
    };
  } else {
    verifiedPrice = extractedPrice;
  }

  // MILEAGE: user override wins.
  const extractedMileage = extractMileage(combinedText);
  let verifiedMileage: Mileage | null;
  if (ov?.mileage_value != null && ov.mileage_value > 0) {
    const unit: MileageUnit = ov.mileage_unit === "mi" ? "mi" : "km";
    const value = Math.round(ov.mileage_value);
    const km = unit === "km" ? value : Math.round(value * 1.609344);
    verifiedMileage = { value, unit, km };
  } else {
    verifiedMileage = extractedMileage;
  }

  // YEAR: user override wins.
  const extractedYear = detectYearInInput(combinedText);
  let verifiedYear: number | null;
  if (ov?.year != null && ov.year >= 1950 && ov.year <= currentYear + 1) {
    verifiedYear = Math.round(ov.year);
  } else {
    verifiedYear = extractedYear;
  }

  const vehicleHints = extractVehicleHints(combinedText);
  const userProvided = !!(ov && (ov.listing_price || ov.mileage_value || ov.year));
  const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Performance budget: each OpenAI attempt is capped at a 30-second wall clock.
  // Combined with a 1600-token ceiling and temperature 0.2, typical responses
  // land in ~8–14s on gpt-4o-mini. We retry once on transient failures, so the
  // worst-case for a hard timeout is ~60s — still well within /api/analyze's
  // tolerance and gives a slow upstream a real second chance before we give up.

  /**
   * Run the OpenAI call once with a fresh AbortController. Returns the raw
   * JSON string. Throws an Error with .name set to one of:
   *   "AITimeout"   — wall-clock or upstream cancellation
   *   "AIRateLimit" — 429 from upstream
   *   "AIError"     — anything else (network, 5xx, empty response, etc.)
   */
  async function runOnce(): Promise<string> {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const completion = await client().chat.completions.create(
        {
          model,
          temperature: 0.2,
          max_tokens: 1600,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt(currentYear) },
            {
              role: "user",
              content: buildUserPrompt({
                input: params.input,
                additionalDetails: params.additionalDetails ?? null,
                inputType: params.inputType,
                language: params.language,
                verifiedPrice,
                verifiedMileage,
                verifiedYear,
                vehicleHints,
                userProvided,
                currentYear,
                nonce
              })
            }
          ]
        },
        { signal: ctrl.signal }
      );
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        const e = new Error("Empty AI response");
        e.name = "AIError";
        throw e;
      }
      return content;
    } catch (error) {
      const e = error as { name?: string; message?: string; status?: number };
      const tagged = new Error(e?.message ?? String(error));
      if (e?.name === "AbortError" || e?.name === "APIUserAbortError") {
        tagged.name = "AITimeout";
      } else if (e?.status === 429) {
        tagged.name = "AIRateLimit";
      } else {
        tagged.name = "AIError";
      }
      console.error("[AI ERROR]", {
        name: tagged.name,
        message: tagged.message,
        status: e?.status
      });
      throw tagged;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Retry once on transient categories (timeout, rate-limit, generic AI error).
  // The brief delay gives upstream a moment to recover from a transient blip.
  let raw: string;
  try {
    raw = await runOnce();
  } catch (firstErr) {
    const fe = firstErr as { name?: string };
    const retryable =
      fe?.name === "AITimeout" ||
      fe?.name === "AIRateLimit" ||
      fe?.name === "AIError";
    if (!retryable) throw firstErr;
    console.warn("[AI RETRY]", { firstError: fe?.name });
    await new Promise((r) => setTimeout(r, 500));
    raw = await runOnce();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const result = AnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`AI response failed validation: ${result.error.message}`);
  }

  const normalized = normalize(result.data, {
    verifiedPrice,
    verifiedMileage,
    verifiedYear,
    vehicleHints,
    userProvided,
    currentYear
  });

  const conf = computeConfidence({
    hasPrice: !!verifiedPrice,
    hasMileage: !!verifiedMileage,
    hasYear: verifiedYear != null,
    userProvided
  });
  normalized.confidence = {
    level: conf.level,
    reasons: conf.reasons,
    extracted: {
      listing_price: !!verifiedPrice,
      mileage: !!verifiedMileage,
      year: verifiedYear != null
    },
    user_provided: userProvided
  };

  return normalized;
}
