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
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: true },
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
  } catch (error) {
    // Surface the real failure instead of a blank page so it can be diagnosed
    // from the browser as well as the server logs.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`PDF generation failed for invoice ${id}:`, error);
    return new NextResponse(
      `PDF generation failed.\n\n${message}\n\nCheck the server logs for the full stack trace.`,
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
