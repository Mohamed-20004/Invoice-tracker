// All monetary values are integer minor units (pence). Never floats.

export function formatPence(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  const pounds = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}£${pounds.toLocaleString("en-GB")}.${rem.toString().padStart(2, "0")}`;
}

// Parse a user-entered pounds string ("110", "110.5", "£1,250.00") to pence.
export function parsePoundsToPence(input: string): number {
  const cleaned = input.replace(/[£,\s]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function penceToPoundsInput(pence: number): string {
  return (pence / 100).toFixed(2);
}

export function lineTotalPence(quantity: number, unitPricePence: number): number {
  return Math.round(quantity * unitPricePence);
}

export interface Totals {
  subtotalPence: number;
  vatPence: number;
  totalPence: number;
}

export function computeTotals(
  items: { quantity: number; unitPricePence: number; included: boolean }[],
  vatRegistered: boolean,
  vatRatePercent: number
): Totals {
  const subtotalPence = items
    .filter((i) => i.included)
    .reduce((sum, i) => sum + lineTotalPence(i.quantity, i.unitPricePence), 0);
  const vatPence = vatRegistered
    ? Math.round((subtotalPence * vatRatePercent) / 100)
    : 0;
  return { subtotalPence, vatPence, totalPence: subtotalPence + vatPence };
}

export function invoiceNumberLabel(number: number): string {
  return `INV-${number.toString().padStart(4, "0")}`;
}
