import PDFDocument from "pdfkit";
import type { AnalysisResult } from "@/types/analysis";

/**
 * Generate a PDF buffer for an analysis result.
 * Pure server-side. No filesystem writes; returns a Buffer the route streams.
 */

const BRAND = "#006dcc";
const BRAND_DARK = "#0b3e70";
const INK = "#0a1929";
const MUTED = "#4b5563";
const BORDER = "#e6eef7";
const GREEN = "#059669";
const AMBER = "#d97706";
const RED = "#dc2626";

type Doc = PDFKit.PDFDocument;

function formatMoney(n: number, cur: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0
    }).format(n);
  } catch {
    return `${n.toLocaleString()} ${cur}`;
  }
}

function formatMoneyRange(low: number, high: number, cur: string): string {
  return `${formatMoney(low, cur)} – ${formatMoney(high, cur)}`;
}

function recColor(rec: string): string {
  if (rec === "buy") return GREEN;
  if (rec === "dont_buy") return RED;
  return AMBER;
}

function recLabel(rec: string): string {
  return rec === "buy" ? "BUY" : rec === "dont_buy" ? "DON'T BUY" : "RISKY";
}

function scamColor(r: string): string {
  return r === "high" ? RED : r === "medium" ? AMBER : GREEN;
}

function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function sectionTitle(doc: Doc, text: string) {
  ensureSpace(doc, 32);
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .text(text.toUpperCase(), { characterSpacing: 1.2 });
  doc.moveDown(0.2);
  doc.strokeColor(BORDER).lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
  doc.moveDown(0.4);
  doc.fillColor(INK).fontSize(10);
}

function bulletList(doc: Doc, items: string[], color = BRAND) {
  const left = doc.page.margins.left;
  for (const item of items) {
    ensureSpace(doc, 16);
    const y = doc.y;
    doc.circle(left + 3, y + 5, 2).fillAndStroke(color, color);
    doc.fillColor(INK).fontSize(10).text(item, left + 12, y, {
      width: doc.page.width - doc.page.margins.right - left - 12
    });
    doc.moveDown(0.25);
  }
}

function pill(doc: Doc, text: string, x: number, y: number, color: string): { w: number; h: number } {
  const pad = 6;
  const h = 18;
  doc.fontSize(9).fillColor(color);
  const w = doc.widthOfString(text) + pad * 2;
  doc.roundedRect(x, y, w, h, 9).strokeColor(color).lineWidth(1).stroke();
  doc.text(text, x + pad, y + 4, { width: w - pad * 2, align: "center" });
  return { w, h };
}

function filledBadge(doc: Doc, text: string, x: number, y: number, color: string): { w: number; h: number } {
  const pad = 8;
  const h = 22;
  doc.fontSize(10).font("Helvetica-Bold");
  const w = doc.widthOfString(text) + pad * 2;
  doc.roundedRect(x, y, w, h, 11).fillColor(color).fill();
  doc.fillColor("#ffffff").text(text, x + pad, y + 6, { width: w - pad * 2, align: "center" });
  doc.font("Helvetica");
  return { w, h };
}

function scoreBar(doc: Doc, score: number) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const barY = doc.y;
  const barW = right - left;
  const barH = 8;
  const color = score >= 7.5 ? GREEN : score >= 5 ? AMBER : RED;

  doc.roundedRect(left, barY, barW, barH, 4).fillColor(BORDER).fill();
  doc.roundedRect(left, barY, Math.max(4, (score / 10) * barW), barH, 4).fillColor(color).fill();
  doc.moveDown(0.9);
  doc.fillColor(INK);
}

function priceSpectrum(
  doc: Doc,
  evaluation: AnalysisResult["price_evaluation"],
  market: AnalysisResult["market_value"]
) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const w = right - left;
  const y = doc.y;
  const h = 10;

  // track
  doc.roundedRect(left, y, w, h, 5).fillColor(BORDER).fill();

  // marker
  const lp = evaluation.listing_price;
  if (lp != null) {
    const span = Math.max(1, market.high - market.low);
    let pct = ((lp - market.low) / span) * 100;
    pct = Math.max(-15, Math.min(115, pct));
    const clamped = Math.max(0, Math.min(100, pct));
    const markerX = left + (clamped / 100) * w;
    const color =
      evaluation.verdict === "overpriced"
        ? RED
        : evaluation.verdict === "underpriced"
        ? GREEN
        : BRAND;
    doc.circle(markerX, y + h / 2, 7).fillColor(color).fill();
    doc.circle(markerX, y + h / 2, 7).lineWidth(2).strokeColor("#ffffff").stroke();
  }

  doc.moveDown(0.8);
  doc.fillColor(MUTED).fontSize(8);
  doc.text(formatMoney(market.low, market.currency), left, doc.y, { continued: true });
  doc.text(formatMoney(market.high, market.currency), {
    width: w,
    align: "right"
  });
  doc.fillColor(INK).fontSize(10);
  doc.moveDown(0.4);
}

function drawChart(doc: Doc, points: AnalysisResult["price_history"], currency: string) {
  if (points.length < 2) return;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const w = right - left;
  const h = 110;
  const top = doc.y;

  // border
  doc.roundedRect(left, top, w, h, 6).strokeColor(BORDER).lineWidth(1).stroke();

  const values = points.map((p) => p.value);
  const minV = Math.min(...values) * 0.9;
  const maxV = Math.max(...values) * 1.05;
  const range = maxV - minV || 1;

  const xFor = (i: number) => left + 40 + (i / (points.length - 1)) * (w - 60);
  const yFor = (v: number) => top + 10 + (1 - (v - minV) / range) * (h - 30);

  // y-axis labels (min/max)
  doc.fillColor(MUTED).fontSize(7);
  doc.text(formatMoney(maxV, currency), left + 4, top + 4, { width: 36, align: "left" });
  doc.text(formatMoney(minV, currency), left + 4, top + h - 14, { width: 36, align: "left" });

  // actual line
  doc.lineWidth(1.8).strokeColor(BRAND);
  let started = false;
  let lastActualX = 0;
  let lastActualY = 0;
  points.forEach((p, i) => {
    if (p.is_forecast) return;
    const x = xFor(i);
    const y = yFor(p.value);
    if (!started) {
      doc.moveTo(x, y);
      started = true;
    } else {
      doc.lineTo(x, y);
    }
    lastActualX = x;
    lastActualY = y;
  });
  doc.stroke();

  // forecast dashed line
  const forecast = points.find((p) => p.is_forecast);
  if (forecast) {
    const fi = points.indexOf(forecast);
    const fx = xFor(fi);
    const fy = yFor(forecast.value);
    doc.lineWidth(1.8).strokeColor(BRAND).dash(4, { space: 3 });
    doc.moveTo(lastActualX, lastActualY).lineTo(fx, fy).stroke();
    doc.undash();
    // dot
    doc.circle(fx, fy, 3).fillColor(BRAND).fill();
  }

  // x-axis labels
  doc.fillColor(MUTED).fontSize(7);
  points.forEach((p, i) => {
    const x = xFor(i);
    doc.text(String(p.year), x - 12, top + h - 10, { width: 24, align: "center" });
  });

  doc.fillColor(INK).fontSize(10);
  doc.y = top + h + 8;
}

/**
 * Build a minimal 1-page fallback PDF when the full report cannot be generated.
 * Used by the route when `buildReportPdf()` throws or returns undersized output.
 * Always returns a valid PDF buffer.
 */
export async function buildFallbackPdf(reason?: string): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 72,
      info: {
        Title: "VeltrixDrive Report (unavailable)",
        Author: "VeltrixDrive"
      }
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.font("Helvetica-Bold").fontSize(22).fillColor(BRAND_DARK);
    doc.text("VeltrixDrive");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(12).fillColor(INK);
    doc.text("Report could not be generated");
    doc.moveDown(1);
    doc.fontSize(10).fillColor(MUTED);
    doc.text(
      "We were unable to render your full analysis report at this time. Your analysis data is safe and still available in your VeltrixDrive dashboard under History. Please try downloading the report again in a few minutes, or contact support if the problem persists."
    );
    if (reason) {
      doc.moveDown(0.8);
      doc.fontSize(8).fillColor(MUTED);
      doc.text(`Reference: ${reason}`);
    }
    doc.moveDown(1.5);
    doc.fontSize(8).fillColor(MUTED);
    doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`);
    doc.end();
  });
}

/**
 * Main entry: build a PDF for the analysis and return it as a Buffer.
 * Rejects with the render error if anything goes wrong; the caller
 * (/api/report) is responsible for catching and falling back to
 * buildFallbackPdf().
 */
export async function buildReportPdf(result: AnalysisResult): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: "VeltrixDrive Analysis Report",
        Author: "VeltrixDrive",
        Subject: `${result.vehicle_spec.make} ${result.vehicle_spec.model}`.trim()
      }
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Wrap the entire render in a try/catch so any synchronous throw from
    // a helper function is surfaced as a rejection instead of an unhandled
    // exception. doc.end() still runs on the error path so no resources leak.
    try {

    // ========= HEADER =========
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    // Brand band
    doc.rect(left, doc.y, right - left, 42).fillColor(BRAND_DARK).fill();
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18);
    doc.text("VeltrixDrive", left + 14, doc.y - 32);
    doc.font("Helvetica").fontSize(9).fillColor("#cfe2fb");
    doc.text("AI Car Purchase Decision Report", left + 14, doc.y + 2);
    doc.fillColor(INK);
    doc.y += 24;

    // Subject + date
    doc.font("Helvetica-Bold").fontSize(16).fillColor(INK);
    const subject = [
      result.vehicle_spec.make !== "unknown" ? result.vehicle_spec.make : "",
      result.vehicle_spec.model !== "unknown" ? result.vehicle_spec.model : "",
      result.vehicle_spec.variant && result.vehicle_spec.variant !== "unknown"
        ? `(${result.vehicle_spec.variant})`
        : "",
      result.vehicle_spec.year ? `· ${result.vehicle_spec.year}` : ""
    ]
      .filter(Boolean)
      .join(" ") || "Vehicle analysis";
    doc.text(subject);
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}  ·  Region: ${result.region}`);
    doc.fillColor(INK).fontSize(10);
    doc.moveDown(0.8);

    // ========= VERDICT BAND =========
    sectionTitle(doc, "Verdict");

    const score = result.deal_score.toFixed(1);
    doc.font("Helvetica-Bold").fontSize(28).fillColor(INK);
    doc.text(`${score} / 10`, { continued: true });
    // recommendation badge aligned right
    const badgeX = right - 110;
    const badgeY = doc.y - 28;
    filledBadge(doc, recLabel(result.recommendation), badgeX, badgeY, recColor(result.recommendation));
    doc.font("Helvetica").fontSize(10).fillColor(INK);
    doc.moveDown(0.2);

    scoreBar(doc, result.deal_score);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(result.deal_verdict);
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.moveDown(0.3);
    doc.fillColor(INK).text(result.recommendation_reason);
    doc.moveDown(0.6);

    // ========= SUMMARY =========
    sectionTitle(doc, "Executive summary");
    doc.text(result.summary);
    doc.moveDown(0.6);

    // ========= VEHICLE SPEC =========
    sectionTitle(doc, "Vehicle");
    const spec = result.vehicle_spec;
    const specPairs: [string, string][] = [
      ["Variant", spec.variant],
      ["Generation", spec.generation],
      ["Body", spec.body_style],
      ["Transmission", spec.transmission],
      ["Fuel", spec.fuel],
      ["Drivetrain", spec.drivetrain],
      ["Trim", spec.trim],
      ["Engine", spec.engine_displacement_l ? `${spec.engine_displacement_l.toFixed(1)} L` : "unknown"],
      ["Power", spec.power_hp ? `${spec.power_hp} hp` : "unknown"],
      ["Mileage", result.mileage ? `${result.mileage.value.toLocaleString()} ${result.mileage.unit}` : "unknown"]
    ];
    // 2-column grid
    const colW = (right - left - 10) / 2;
    const startY = doc.y;
    specPairs.forEach((p, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = left + col * (colW + 10);
      const y = startY + row * 22;
      doc.fontSize(7).fillColor(MUTED).text(p[0].toUpperCase(), x, y, { width: colW, characterSpacing: 0.8 });
      doc.fontSize(10).fillColor(INK).text(p[1] || "unknown", x, y + 9, { width: colW });
    });
    doc.y = startY + Math.ceil(specPairs.length / 2) * 22 + 4;

    if (spec.notable_features.length > 0) {
      doc.fontSize(7).fillColor(MUTED).text("FEATURES", { characterSpacing: 0.8 });
      doc.fontSize(10).fillColor(INK).text(spec.notable_features.join(" · "));
      doc.moveDown(0.4);
    }

    // ========= PRICE EVALUATION =========
    doc.moveDown(0.4);
    sectionTitle(doc, "Price evaluation");
    const pe = result.price_evaluation;
    const mv = result.market_value;
    doc.font("Helvetica-Bold").fontSize(14).fillColor(INK);
    doc.text(
      pe.listing_price != null ? formatMoney(pe.listing_price, pe.currency) : "Price: unknown",
      { continued: true }
    );
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text(`   Market ${formatMoneyRange(mv.low, mv.high, mv.currency)}`, { align: "left" });

    // verdict pill
    const verdictMap: Record<string, { text: string; color: string }> = {
      underpriced: { text: "UNDERPRICED", color: GREEN },
      fair: { text: "FAIR", color: BRAND },
      overpriced: { text: "OVERPRICED", color: RED },
      unknown: { text: "UNKNOWN", color: MUTED }
    };
    const v = verdictMap[pe.verdict] || verdictMap.unknown;
    pill(doc, v.text, left, doc.y + 4, v.color);
    doc.moveDown(1.2);

    priceSpectrum(doc, pe, mv);
    doc.fontSize(10).fillColor(INK).text(pe.explanation);
    doc.moveDown(0.6);

    // ========= PRICE HISTORY CHART =========
    sectionTitle(doc, "Price history & forecast");
    drawChart(doc, result.price_history, mv.currency);
    doc.fontSize(9).fillColor(MUTED);
    doc.text(`Depreciation ~${result.depreciation_rate}% / year. Dashed line = ${result.future_prediction.year} forecast.`);
    doc.fillColor(INK).fontSize(10);
    doc.moveDown(0.6);

    // ========= SCAM RISK =========
    sectionTitle(doc, "Scam risk");
    filledBadge(doc, result.scam_risk.toUpperCase(), left, doc.y, scamColor(result.scam_risk));
    doc.moveDown(1.4);
    if (result.scam_signals.length === 0) {
      doc.fillColor(MUTED).text("No scam signals detected.");
      doc.fillColor(INK);
    } else {
      bulletList(doc, result.scam_signals, RED);
    }
    doc.moveDown(0.4);

    // ========= COMMON ISSUES =========
    if (result.common_issues.length > 0) {
      sectionTitle(doc, "Known issues for this model");
      bulletList(doc, result.common_issues, AMBER);
      doc.moveDown(0.4);
    }

    // ========= PROS / CONS =========
    sectionTitle(doc, "Pros & cons");
    const colY = doc.y;
    const pcColW = (right - left - 10) / 2;

    doc.font("Helvetica-Bold").fontSize(9).fillColor(GREEN).text("PROS", left, colY);
    doc.font("Helvetica").fontSize(10).fillColor(INK);
    let y = doc.y;
    for (const p of result.pros) {
      doc.circle(left + 3, y + 5, 2).fillAndStroke(GREEN, GREEN);
      doc.fillColor(INK).fontSize(10).text(p, left + 12, y, { width: pcColW - 12 });
      y = doc.y;
    }
    const leftEnd = doc.y;

    doc.y = colY;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(RED).text("CONS", left + pcColW + 10, doc.y);
    doc.font("Helvetica").fontSize(10).fillColor(INK);
    let ry = doc.y;
    for (const c of result.cons) {
      doc.circle(left + pcColW + 10 + 3, ry + 5, 2).fillAndStroke(RED, RED);
      doc.fillColor(INK).fontSize(10).text(c, left + pcColW + 10 + 12, ry, { width: pcColW - 12 });
      ry = doc.y;
    }
    doc.y = Math.max(leftEnd, doc.y) + 6;

    // ========= RISKS =========
    if (result.risks.length > 0) {
      sectionTitle(doc, "Risks");
      bulletList(doc, result.risks, AMBER);
      doc.moveDown(0.4);
    }

    // ========= INSPECTION CHECKLIST =========
    sectionTitle(doc, "Inspection checklist");
    const groups: [string, string[]][] = [
      ["Visual", result.inspection_checklist.visual],
      ["Mechanical", result.inspection_checklist.mechanical],
      ["Paperwork", result.inspection_checklist.paperwork],
      ["Red flags", result.inspection_checklist.red_flags]
    ];
    for (const [title, items] of groups) {
      if (items.length === 0) continue;
      const isRed = title === "Red flags" && !(items.length === 1 && items[0].includes("No strong red flags"));
      doc.font("Helvetica-Bold").fontSize(9).fillColor(isRed ? RED : INK).text(title.toUpperCase(), { characterSpacing: 0.8 });
      doc.font("Helvetica").fontSize(10).fillColor(INK);
      bulletList(doc, items, isRed ? RED : BRAND);
      doc.moveDown(0.2);
    }

    // ========= NEGOTIATION =========
    sectionTitle(doc, "Negotiation strategy");
    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND_DARK);
    doc.text(
      `Suggested offer: ${formatMoney(result.negotiation.suggested_offer, result.negotiation.currency)}`
    );
    doc.font("Helvetica").fontSize(10).fillColor(INK);
    doc.moveDown(0.3);
    bulletList(doc, result.negotiation.talking_points);
    doc.moveDown(0.4);

    // ========= FOOTER / DISCLAIMER =========
    const disclaimer =
      "VeltrixDrive provides AI-based informational estimates only and is not responsible for financial decisions made by users.";
    ensureSpace(doc, 60);
    doc.moveDown(1);
    doc.strokeColor(BORDER).lineWidth(1)
      .moveTo(left, doc.y).lineTo(right, doc.y).stroke();
    doc.moveDown(0.4);
    doc.fontSize(8).fillColor(MUTED).text(disclaimer, { align: "left" });
    doc.text("KVK 99933098 · info@bedrijfsnaam.com", { align: "left" });

      doc.end();
    } catch (renderErr) {
      // A helper throw (e.g. bad data) lands here. End the doc so the stream
      // doesn't leak, then propagate.
      try { doc.end(); } catch { /* noop */ }
      reject(renderErr);
    }
  });
}
