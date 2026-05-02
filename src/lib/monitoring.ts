/**
 * Lightweight monitoring / alerting.
 *
 * `alert(subject, body, key)` sends an email to MONITORING_EMAIL_TO. To avoid
 * spam, each alert key is throttled (default 1 hour per key). Alerts are
 * fire-and-forget: errors during alert delivery are logged but never thrown
 * so they do not mask the underlying error the caller was trying to report.
 *
 * Configured with env:
 *   RESEND_API_KEY          — if set, uses https://resend.com/emails API.
 *   MONITORING_EMAIL_TO     — destination address, default monitoring@digipixy.com
 *   MONITORING_EMAIL_FROM   — verified sender, default alerts@veltrixdrive.com
 *
 * If no RESEND_API_KEY is configured, alerts are logged to console.error only.
 * Callers should treat alerts as "fire and forget" signals, not guaranteed
 * delivery notifications.
 */

const DEFAULT_TO = "monitoring@digipixy.com";
const DEFAULT_FROM = "alerts@veltrixdrive.com";
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

const lastAlertAt = new Map<string, number>();

export interface AlertOptions {
  /** Unique key for throttling (e.g. "analyze_5xx", "pdf_failed"). */
  key: string;
  subject: string;
  body: string;
  /** If true, bypass the throttle. Use sparingly (e.g. deploy-time checks). */
  force?: boolean;
}

export async function alert(opts: AlertOptions): Promise<void> {
  try {
    const now = Date.now();
    if (!opts.force) {
      const last = lastAlertAt.get(opts.key) ?? 0;
      if (now - last < ALERT_COOLDOWN_MS) return; // throttled
    }
    lastAlertAt.set(opts.key, now);

    const to = process.env.MONITORING_EMAIL_TO || DEFAULT_TO;
    const from = process.env.MONITORING_EMAIL_FROM || DEFAULT_FROM;
    const apiKey = process.env.RESEND_API_KEY;

    // Always log — observability before email delivery.
    console.error(
      `[ALERT ${opts.key}] ${opts.subject}\n${opts.body.slice(0, 500)}`
    );

    if (!apiKey) return; // console-only fallback

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[VeltrixDrive] ${opts.subject}`,
        text: `${opts.body}\n\nAlert key: ${opts.key}\nTimestamp: ${new Date().toISOString()}`
      })
    });
  } catch (err) {
    // Never throw from alert()
    console.error("[monitoring] alert send failed:", err);
  }
}

/** Should this HTTP status trigger an alert? Only real server failures. */
export function isAlertableStatus(status: number): boolean {
  return status >= 500 && status !== 502;
  // 502 from AI is common upstream and already gets a credit refund; we log
  // it but don't wake anyone up at 3 AM for a transient OpenAI blip.
}
