export type Recommendation = "buy" | "dont_buy" | "risky";
export type ScamRisk = "low" | "medium" | "high";
export type PriceVerdict = "underpriced" | "fair" | "overpriced" | "unknown";
export type Confidence = "high" | "medium" | "low";
export type MileageUnit = "km" | "mi";
export type Transmission = "manual" | "automatic" | "semi_automatic" | "unknown";
export type FuelType = "petrol" | "diesel" | "hybrid" | "plug_in_hybrid" | "electric" | "lpg" | "cng" | "unknown";
export type Drivetrain = "fwd" | "rwd" | "awd" | "4wd" | "unknown";

export interface MarketValue {
  low: number;
  high: number;
  currency: string;
}

export interface Mileage {
  value: number;
  unit: MileageUnit;
  km: number;
}

export interface NegotiationStrategy {
  suggested_offer: number;
  currency: string;
  /**
   * One-sentence justification of the suggested offer. Optional for backward
   * compatibility with historical analyses that predate this field.
   */
  reasoning?: string;
  talking_points: string[];
}

export interface Alternative {
  title: string;
  reason: string;
}

export interface PricePoint {
  year: number;
  value: number;
  is_forecast: boolean;
}

export interface PriceEvaluation {
  listing_price: number | null;
  currency: string;
  verdict: PriceVerdict;
  delta_pct: number;
  explanation: string;
}

export interface InspectionChecklist {
  visual: string[];
  mechanical: string[];
  paperwork: string[];
  red_flags: string[];
}

export interface MaintenanceEstimate {
  yearly_low: number;
  yearly_high: number;
  currency: string;
  notes: string;
}

/** Total-cost-of-ownership estimate for the next year. */
export interface OwnershipCostEstimate {
  yearly_low: number;
  yearly_high: number;
  currency: string;
  breakdown: {
    fuel: string;           // e.g. "€1,200–€1,600 at 15,000 km/year"
    insurance: string;
    maintenance: string;
    tax: string;
    depreciation: string;
  };
  notes: string;
}

/** Fuel economy in model-appropriate units (text, not a single number). */
export interface FuelEconomyEstimate {
  combined: string;         // e.g. "5.8 l/100km" or "32 mpg (US)"
  urban: string;
  highway: string;
  notes: string;
}

/** Expected remaining useful life from current mileage/state. */
export interface LifespanEstimate {
  expected_total_km: number;       // total lifetime km for this model/engine
  remaining_km_estimate: number;   // total - current km (0 if unknown)
  expected_years_remaining: number;
  notes: string;
}

/** Near-term resale outlook. */
export interface ResaleOutlook {
  one_year_pct: number;    // % of today's value expected after 1 year
  three_year_pct: number;  // % of today's value expected after 3 years
  liquidity: "high" | "medium" | "low"; // how easy to resell
  notes: string;
}

/** Identified vehicle, as specifically as we could nail down. */
export interface VehicleSpec {
  make: string | "unknown";
  model: string | "unknown";
  /** e.g. "F30 320d", "B8 2.0 TDI", "W205 C300" */
  variant: string | "unknown";
  year: number | null;
  generation: string | "unknown";
  transmission: Transmission;
  fuel: FuelType;
  drivetrain: Drivetrain;
  trim: string | "unknown";
  engine_displacement_l: number | null; // e.g. 2.0
  power_hp: number | null;
  body_style: string | "unknown";       // e.g. "sedan", "estate", "SUV"
  notable_features: string[];           // explicitly stated features only, e.g. "navigation", "leather", "pano roof"
  /**
   * Per-field inference flags. A field is "inferred" (= true) when it was
   * NOT present in the input and the model estimated it from the model/year
   * common configurations. UI must present these as estimates, not confirmed.
   * Only a defined subset of fields supports inference.
   */
  inferred: {
    transmission: boolean;
    fuel: boolean;
    drivetrain: boolean;
    trim: boolean;
    engine_displacement_l: boolean;
    power_hp: boolean;
    body_style: boolean;
  };
}

/**
 * Server-computed grounding indicator.
 */
export interface ConfidenceInfo {
  level: Confidence;
  reasons: string[];
  extracted: {
    listing_price: boolean;
    mileage: boolean;
    year: boolean;
  };
  /** True iff at least one field came from a manual override. */
  user_provided: boolean;
}

/**
 * Optional user-provided overrides. Any non-null field here wins over
 * anything the extractor or the model produce.
 */
export interface UserOverrides {
  listing_price: number | null;
  currency: string | null;          // explicit 3-letter code (EUR/USD/GBP/...)
  mileage_value: number | null;
  mileage_unit: MileageUnit | null; // km or mi
  year: number | null;
}

export interface AnalysisResult {
  // --- core verdict ---
  deal_score: number;
  score_interpretation: string;
  recommendation: Recommendation;
  recommendation_reason: string;
  deal_verdict: string;

  // --- identified vehicle ---
  vehicle_spec: VehicleSpec;

  // --- pricing ---
  market_value: MarketValue;
  price_evaluation: PriceEvaluation;
  region: string;

  // --- facts ---
  mileage: Mileage | null;

  // --- depreciation / forecast ---
  price_history: PricePoint[];
  future_prediction: PricePoint;
  depreciation_rate: number;

  // --- ownership economics ---
  reliability_score: number;
  maintenance_cost_estimate: MaintenanceEstimate;
  ownership_cost_estimate: OwnershipCostEstimate;
  fuel_economy_estimate: FuelEconomyEstimate;
  lifespan_estimate: LifespanEstimate;
  resale_outlook: ResaleOutlook;

  // --- model-specific knowledge ---
  common_issues: string[]; // known failure points for THIS model/generation

  // --- pros / cons / risks ---
  pros: string[];
  cons: string[];
  risks: string[];

  // --- scam detection ---
  scam_risk: ScamRisk;
  scam_signals: string[];

  // --- buyer protection ---
  inspection_checklist: InspectionChecklist;

  // --- negotiation & alternatives ---
  negotiation: NegotiationStrategy;
  alternatives: Alternative[];

  // --- summary & confidence ---
  summary: string;
  /** Server-computed, optional for backwards-compatible historical records. */
  confidence?: ConfidenceInfo;
}

export interface HistoryItem {
  id: string;
  created_at: string;
  input_type: "url" | "text";
  input_value: string;
  language: string;
  result: AnalysisResult;
}
