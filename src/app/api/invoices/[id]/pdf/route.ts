import { NextRequest, NextResponse } from "next/server";
import { prisma, getSettings } from "@/lib/db";
import { renderInvoiceHtml } from "@/lib/invoice-html";
import { htmlToPdf } from "@/lib/pdf";
import { invoiceNumberLabel } from "@/lib/money";

export const runtime = "nodejs";

// The same invoice HTML the PDF is printed from, served directly with a
// "save via your browser's print dialog" helper — used when Chromium can't
// run (e.g. not enough memory on the host), so a PDF is always obtainable.
function printFallback(html: string, reason: string): NextResponse {
  const banner = `
<style>
  .pdf-fallback-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: #0f172a; color: #fff; padding: 10px 16px; font-family: Arial, sans-serif;
    font-size: 14px; display: flex; align-items: center; gap: 12px; }
  .pdf-fallback-bar button { background: #FFCE07; color: #000; border: 0; border-radius: 6px;
    padding: 8px 14px; font-weight: 700; font-size: 14px; }
  body { padding-top: 44px; }
  @media print { .pdf-fallback-bar { display: none; } body { padding-top: 0; } }
</style>
<div class="pdf-fallback-bar">
  <span>PDF engine unavailable — use Print and choose “Save as PDF”.</span>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>`;
  console.error("[pdf] falling back to print view:", reason);
  return new NextResponse(html.replace("<body>", `<body>${banner}`), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// PDFs are regenerated on demand from current data — nothing is stored.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { lineItems: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const settings = await getSettings();
  const html = renderInvoiceHtml(invoice, settings);

  try {
    const pdf = await htmlToPdf(html);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoiceNumberLabel(invoice.number)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PDF generation failed for invoice ${id}:`, error);
    return printFallback(html, message);
  }
}
