/**
 * Format a number as a currency string, falling back gracefully for
 * unusual currency codes.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function formatMoneyRange(low: number, high: number, currency: string): string {
  return `${formatMoney(low, currency)} – ${formatMoney(high, currency)}`;
}
