import fs from "node:fs";
import path from "node:path";
import { computeTotals, formatPence, invoiceNumberLabel, lineTotalPence } from "@/lib/money";
import type { Settings, Invoice, LineItem } from "@/generated/prisma/client";

type FullInvoice = Invoice & { lineItems: LineItem[] };

// Brand palette lifted from the HH Plumbing & Gas Word template.
const YELLOW = "#FFCE07";
const BLACK = "#000000";
const GREY_TEXT = "#555555";
const GREY_LIGHT = "#ADADAD";
const GREY_FILL = "#F5F5F5";
const BORDER = "#DDDDDD";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB"); // DD/MM/YYYY
}

function logoDataUri(): string | null {
  try {
    const file = fs.readFileSync(path.join(process.cwd(), "public", "logo.png"));
    return `data:image/png;base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

// Self-contained A4 print HTML replicating the company's Word invoice
// template one-to-one: black header band inside the page margins, yellow
// accent strip, single grey date panel with bold values, yellow-barred
// BILL TO / SITE ADDRESS columns, black-header zebra items table,
// full-width yellow TOTAL DUE band, NOTES beside a yellow-barred grey
// PAYMENT DETAILS box, and the centred thank-you line above a yellow rule
// pinned to the page bottom. Real selectable text throughout.
export function renderInvoiceHtml(invoice: FullInvoice, settings: Settings): string {
  const items = [...invoice.lineItems]
    .sort((a, b) => a.position - b.position)
    .filter((i) => i.included);
  const totals = computeTotals(items, invoice.vatRegistered, invoice.vatRatePercent);
  const numberLabel = invoiceNumberLabel(invoice.number);
  const logo = logoDataUri();
  const exclVat = invoice.vatRegistered ? " (excl. VAT)" : "";

  const customerLines = [
    ...invoice.customerAddress.split("\n"),
    invoice.customerEmail ?? "",
    invoice.customerPhone ?? "",
  ]
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${esc(line)}</p>`)
    .join("");

  const rows = items
    .map(
      (item) => `
      <tr>
        <td>${esc(item.description)}</td>
        <td class="num">${formatPence(item.unitPricePence)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatPence(lineTotalPence(item.quantity, item.unitPricePence))}${exclVat}</td>
      </tr>`
    )
    .join("");

  const totalRows = invoice.vatRegistered
    ? `
      <tr><td class="pad"></td><th scope="row">Subtotal (excl. VAT)</th><td class="num line">${formatPence(totals.subtotalPence)}</td></tr>
      <tr><td class="pad"></td><th scope="row">VAT (${invoice.vatRatePercent}%)</th><td class="num line">${formatPence(totals.vatPence)}</td></tr>
      <tr class="grand"><td class="pad"></td><th scope="row">TOTAL DUE</th><td class="num">${formatPence(totals.totalPence)}</td></tr>`
    : `
      <tr class="grand"><td class="pad"></td><th scope="row">TOTAL DUE</th><td class="num">${formatPence(totals.totalPence)}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>${numberLabel}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    font-family: Arial, "Helvetica Neue", sans-serif;
    color: ${BLACK};
    font-size: 9.5pt;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
  }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    padding: 10mm 11mm 8mm;
    display: flex;
    flex-direction: column;
  }
  .band {
    background: ${BLACK};
    color: #ffffff;
    padding: 6mm 7mm;
    display: flex;
    align-items: center;
    gap: 7mm;
  }
  .band img { width: 21mm; height: auto; }
  .band .company { flex: 1; }
  .band .company .name { font-size: 14pt; font-weight: 700; color: #ffffff; margin: 0 0 1.5mm; }
  .band .company p { margin: 0; color: ${GREY_LIGHT}; font-size: 9pt; line-height: 1.4; }
  .band .invoice-title { text-align: right; }
  .band .invoice-title .word { font-size: 32pt; font-weight: 700; color: ${YELLOW}; letter-spacing: 0.02em; line-height: 1; }
  .band .invoice-title .number { color: #AAAAAA; font-size: 11pt; margin-top: 2mm; }
  .accent { height: 3mm; background: ${YELLOW}; margin-bottom: 8mm; }
  .dates {
    display: flex;
    background: ${GREY_FILL};
    width: 74%;
    padding: 3.5mm 4mm;
    margin-bottom: 9mm;
  }
  .dates .box { flex: 1; }
  .label { font-size: 8.5pt; letter-spacing: 0.02em; color: ${GREY_TEXT}; margin: 0 0 1mm; }
  .caps-label { font-size: 8.5pt; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${GREY_TEXT}; margin: 0 0 2mm; }
  .dates .value { font-weight: 700; font-size: 10.5pt; margin: 0; }
  .addresses { display: flex; gap: 8mm; margin-bottom: 10mm; }
  .addresses .col {
    width: 42%;
    border-left: 1mm solid ${YELLOW};
    padding-left: 4mm;
  }
  .addresses p { margin: 0; line-height: 1.5; }
  .addresses .who { font-weight: 700; font-size: 10.5pt; margin-bottom: 0.5mm; }
  .addresses .col p:not(.caps-label):not(.who) { color: ${GREY_TEXT}; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 7mm; }
  table.items th, table.items td { padding: 2.6mm 3mm; text-align: left; }
  table.items thead th { background: ${BLACK}; color: #ffffff; font-size: 9.5pt; font-weight: 700; }
  table.items tbody tr:nth-child(even) td { background: ${GREY_FILL}; }
  table.items tbody td { color: ${GREY_TEXT}; }
  table.items tbody td:first-child { color: ${BLACK}; }
  .num { text-align: right; white-space: nowrap; }
  table.totals { width: 100%; border-collapse: collapse; margin-bottom: 12mm; }
  table.totals th, table.totals td { padding: 2.4mm 3mm; }
  table.totals .pad { width: 52%; }
  table.totals th { font-weight: 400; color: ${GREY_TEXT}; text-align: right; }
  table.totals td.num { width: 24%; }
  table.totals td.line { border-top: 0.2mm solid ${BORDER}; }
  table.totals .grand th, table.totals .grand td {
    background: ${YELLOW};
    color: ${BLACK};
    font-weight: 700;
    font-size: 12pt;
  }
  .panels { display: flex; gap: 8mm; align-items: flex-start; break-inside: avoid; }
  .panels .notes { flex: 1.2; }
  .panels p { margin: 0; color: ${GREY_TEXT}; line-height: 1.6; }
  .panels .payment {
    flex: 1;
    background: ${GREY_FILL};
    border-left: 1mm solid ${YELLOW};
    padding: 3.5mm 4mm;
  }
  .panels .payment p { color: ${BLACK}; }
  footer { margin-top: auto; padding-top: 8mm; }
  footer .rule { border-top: 0.6mm solid ${YELLOW}; margin-bottom: 4mm; }
  footer p { margin: 0; text-align: center; color: ${GREY_TEXT}; font-size: 8.5pt; }
  footer .statutory { color: ${GREY_LIGHT}; font-size: 7.5pt; margin-top: 1.5mm; }
</style>
</head>
<body>
<div class="sheet">
  <header class="band">
    ${logo ? `<img src="${logo}" alt="${esc(settings.companyName)} logo">` : ""}
    <div class="company">
      <p class="name">${esc(settings.companyName)}</p>
      <p>${esc(settings.registeredAddress)}</p>
      <p>${[settings.contactEmail, settings.contactPhone].filter(Boolean).map(esc).join(" &nbsp;|&nbsp; ")}</p>
      ${invoice.vatRegistered && settings.vatNumber ? `<p>VAT No: ${esc(settings.vatNumber)}</p>` : ""}
    </div>
    <div class="invoice-title">
      <div class="word">INVOICE</div>
      <div class="number"># ${numberLabel}</div>
    </div>
  </header>
  <div class="accent"></div>

  <div class="dates">
    <div class="box">
      <p class="label">Invoice Date</p>
      <p class="value">${formatDate(invoice.issueDate)}</p>
    </div>
    <div class="box">
      <p class="label">Due Date</p>
      <p class="value">${formatDate(invoice.dueDate)}</p>
    </div>
    ${invoice.supplyDate ? `
    <div class="box">
      <p class="label">Date of Supply</p>
      <p class="value">${formatDate(invoice.supplyDate)}</p>
    </div>` : ""}
  </div>

  <div class="addresses">
    <div class="col">
      <p class="caps-label">Bill To</p>
      <p class="who">${esc(invoice.customerName)}</p>
      ${customerLines}
    </div>
    <div class="col">
      <p class="caps-label">Site Address</p>
      <p>${invoice.jobAddress ? esc(invoice.jobAddress) : "Same as billing address"}</p>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th scope="col">Description</th>
        <th scope="col" class="num">Unit Price</th>
        <th scope="col" class="num">Qty</th>
        <th scope="col" class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
  </table>

  <table class="totals">${totalRows}
  </table>

  <div class="panels">
    <div class="notes">
      <p class="caps-label">Notes</p>
      <p>Thank you for your business!</p>
      <p>Please include your name and invoice number ${numberLabel} as the payment reference.</p>
      ${settings.contactEmail ? `<p>For questions, contact us at ${esc(settings.contactEmail)}.</p>` : ""}
      ${invoice.notes ? `<p>${esc(invoice.notes)}</p>` : ""}
    </div>
    <div class="payment">
      <p class="caps-label">Payment Details</p>
      <p>Name: ${esc(settings.bankAccountName)}</p>
      <p>Account No: ${esc(settings.bankAccountNumber)}</p>
      <p>Sort Code: ${esc(settings.bankSortCode)}</p>
    </div>
  </div>

  <footer>
    <div class="rule"></div>
    <p>Thank you for choosing ${esc(settings.companyName.replace(/\s+LTD$/i, ""))}${settings.website ? ` &nbsp;•&nbsp; ${esc(settings.website)}` : ""}</p>
    ${settings.companyNumber ? `<p class="statutory">${esc(settings.companyName)} is a limited company registered in ${esc(settings.placeOfRegistration)}, company number ${esc(settings.companyNumber)}. Registered office: ${esc(settings.registeredAddress)}.</p>` : ""}
  </footer>
</div>
</body>
</html>`;
}
