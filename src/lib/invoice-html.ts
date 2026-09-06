import { computeTotals, formatPence, invoiceNumberLabel, lineTotalPence } from "@/lib/money";
import type { Settings, Customer, Invoice, LineItem } from "@/generated/prisma/client";

type FullInvoice = Invoice & { customer: Customer; lineItems: LineItem[] };

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Self-contained A4 print HTML. Real text (selectable/searchable), semantic
// table, mm units, totals block kept on one page.
export function renderInvoiceHtml(invoice: FullInvoice, settings: Settings): string {
  const items = [...invoice.lineItems]
    .sort((a, b) => a.position - b.position)
    .filter((i) => i.included);
  const totals = computeTotals(items, invoice.vatRegistered, invoice.vatRatePercent);
  const numberLabel = invoiceNumberLabel(invoice.number);
  const customer = invoice.customer;
  const customerAddress = [
    customer.addressLine1,
    customer.addressLine2,
    customer.city,
    customer.postcode,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .map(esc)
    .join("<br>");

  const rows = items
    .map(
      (item) => `
      <tr>
        <td>${esc(item.description)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatPence(item.unitPricePence)}</td>
        <td class="num">${formatPence(lineTotalPence(item.quantity, item.unitPricePence))}</td>
      </tr>`
    )
    .join("");

  const vatRows = invoice.vatRegistered
    ? `
      <tr><th scope="row">Subtotal (net)</th><td class="num">${formatPence(totals.subtotalPence)}</td></tr>
      <tr><th scope="row">VAT (${invoice.vatRatePercent}%)</th><td class="num">${formatPence(totals.vatPence)}</td></tr>
      <tr class="grand"><th scope="row">Total due</th><td class="num">${formatPence(totals.totalPence)}</td></tr>`
    : `
      <tr class="grand"><th scope="row">Total due</th><td class="num">${formatPence(totals.totalPence)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>${numberLabel}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #1a1a2e;
    font-size: 10.5pt;
    line-height: 1.45;
    margin: 0;
  }
  header { display: flex; justify-content: space-between; margin-bottom: 12mm; }
  .company h1 { font-size: 15pt; margin: 0 0 2mm; color: #0f3057; }
  .company p, .meta p { margin: 0; }
  .meta { text-align: right; }
  .meta .invnum { font-size: 14pt; font-weight: 700; color: #0f3057; }
  .billto { margin-bottom: 8mm; }
  .billto h2, .items caption { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin: 0 0 1.5mm; text-align: left; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
  table.items th, table.items td { padding: 2.2mm 2mm; text-align: left; }
  table.items thead th { background: #0f3057; color: #ffffff; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; }
  table.items tbody tr:nth-child(even) td { background: #f1f5f9; }
  .num { text-align: right; white-space: nowrap; }
  .totals-wrap { display: flex; justify-content: flex-end; break-inside: avoid; }
  table.totals { border-collapse: collapse; min-width: 70mm; }
  table.totals th, table.totals td { padding: 1.8mm 2mm; text-align: right; }
  table.totals th { font-weight: 400; color: #374151; }
  table.totals .grand th, table.totals .grand td { font-weight: 700; font-size: 12pt; border-top: 0.5mm solid #0f3057; color: #0f3057; }
  .payment { margin-top: 10mm; padding: 4mm; background: #f1f5f9; border-radius: 2mm; break-inside: avoid; }
  .payment h2 { font-size: 10pt; margin: 0 0 2mm; color: #0f3057; }
  .payment p { margin: 0 0 1mm; }
  .payment strong.ref { color: #0f3057; }
  footer { margin-top: 10mm; padding-top: 3mm; border-top: 0.2mm solid #d1d5db; font-size: 8pt; color: #6b7280; }
  .notes { margin-top: 6mm; }
</style>
</head>
<body>
  <header>
    <div class="company">
      <h1>${esc(settings.companyName)}</h1>
      <p>${esc(settings.registeredAddress)}</p>
      ${settings.contactPhone ? `<p>${esc(settings.contactPhone)}</p>` : ""}
      ${settings.contactEmail ? `<p>${esc(settings.contactEmail)}</p>` : ""}
      ${invoice.vatRegistered && settings.vatNumber ? `<p>VAT No: ${esc(settings.vatNumber)}</p>` : ""}
    </div>
    <div class="meta">
      <p class="invnum">${numberLabel}</p>
      <p>Invoice date: ${formatDate(invoice.issueDate)}</p>
      ${invoice.supplyDate ? `<p>Date of supply: ${formatDate(invoice.supplyDate)}</p>` : ""}
      <p>Due: ${formatDate(invoice.dueDate)}</p>
    </div>
  </header>

  <section class="billto">
    <h2>Bill to</h2>
    <p><strong>${esc(customer.name)}</strong>${customerAddress ? `<br>${customerAddress}` : ""}</p>
    ${invoice.jobAddress ? `<p>Job address: ${esc(invoice.jobAddress)}</p>` : ""}
  </section>

  <table class="items">
    <caption>Work carried out</caption>
    <thead>
      <tr>
        <th scope="col">Description</th>
        <th scope="col" class="num">Qty</th>
        <th scope="col" class="num">Unit price</th>
        <th scope="col" class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>

  <div class="totals-wrap">
    <table class="totals">${vatRows}
    </table>
  </div>

  <section class="payment">
    <h2>Payment details</h2>
    <p>Account name: ${esc(settings.bankAccountName)}</p>
    <p>Sort code: ${esc(settings.bankSortCode)} &nbsp; Account number: ${esc(settings.bankAccountNumber)}</p>
    <p>Please quote <strong class="ref">${numberLabel}</strong> as your payment reference.</p>
  </section>

  ${invoice.notes ? `<section class="notes"><p>${esc(invoice.notes)}</p></section>` : ""}

  <footer>
    <p>${esc(settings.companyName)} is a limited company registered in ${esc(settings.placeOfRegistration)}${settings.companyNumber ? `, company number ${esc(settings.companyNumber)}` : ""}.
    Registered office: ${esc(settings.registeredAddress)}.</p>
  </footer>
</body>
</html>`;
}
