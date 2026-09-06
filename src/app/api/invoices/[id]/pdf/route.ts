import { NextRequest, NextResponse } from "next/server";
import { prisma, getSettings } from "@/lib/db";
import { renderInvoiceHtml } from "@/lib/invoice-html";
import { htmlToPdf } from "@/lib/pdf";
import { invoiceNumberLabel } from "@/lib/money";

export const runtime = "nodejs";

// PDFs are regenerated on demand from current data — nothing is stored.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, lineItems: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const settings = await getSettings();
  const html = renderInvoiceHtml(invoice, settings);
  const pdf = await htmlToPdf(html);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceNumberLabel(invoice.number)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
