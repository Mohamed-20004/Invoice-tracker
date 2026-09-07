import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { setInvoiceStatus } from "@/actions/invoices";
import {
  computeTotals,
  formatPence,
  invoiceNumberLabel,
  lineTotalPence,
} from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { position: "asc" } },
      payments: true,
    },
  });
  if (!invoice) notFound();

  const includedItems = invoice.lineItems.filter((i) => i.included);
  const totals = computeTotals(
    invoice.lineItems,
    invoice.vatRegistered,
    invoice.vatRatePercent
  );
  const label = invoiceNumberLabel(invoice.number);

  async function markStatus(formData: FormData) {
    "use server";
    const status = formData.get("status");
    if (status === "SENT" || status === "PAID" || status === "VOID" || status === "DRAFT") {
      await setInvoiceStatus(id, status);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-800">{label}</h1>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Download PDF
          </a>
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:border-brand-600"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm text-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Bill to</h2>
          <p className="font-medium">{invoice.customerName}</p>
          {invoice.customerAddress.split("\n").filter(Boolean).map((line) => (
            <p key={line}>{line}</p>
          ))}
          {invoice.customerEmail && <p>{invoice.customerEmail}</p>}
          {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
          {invoice.jobAddress && (
            <p className="mt-2 text-slate-500">Job address: {invoice.jobAddress}</p>
          )}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm text-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Dates</h2>
          <p>Issued: {invoice.issueDate.toLocaleDateString("en-GB")}</p>
          <p>Due: {invoice.dueDate?.toLocaleDateString("en-GB") ?? "—"}</p>
          {invoice.supplyDate && <p>Supply: {invoice.supplyDate.toLocaleDateString("en-GB")}</p>}
          {invoice.paidAt && (
            <p className="text-emerald-700">Paid: {invoice.paidAt.toLocaleDateString("en-GB")}</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit price</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {includedItems.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3 text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{formatPence(item.unitPricePence)}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatPence(lineTotalPence(item.quantity, item.unitPricePence))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {invoice.vatRegistered && (
              <>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-slate-500">Subtotal (net)</td>
                  <td className="px-4 py-2 text-right">{formatPence(totals.subtotalPence)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                    VAT ({invoice.vatRatePercent}%)
                  </td>
                  <td className="px-4 py-2 text-right">{formatPence(totals.vatPence)}</td>
                </tr>
              </>
            )}
            <tr className="border-t border-slate-200">
              <td colSpan={3} className="px-4 py-3 text-right font-semibold">Total due</td>
              <td className="px-4 py-3 text-right text-lg font-bold text-brand-800">
                {formatPence(totals.totalPence)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoice.payments.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm text-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Payments received</h2>
          {invoice.payments.map((p) => (
            <p key={p.id}>
              {formatPence(p.amountPence)} on {p.transactionTime.toLocaleDateString("en-GB")}
              {p.counterPartyName ? ` from ${p.counterPartyName}` : ""} ({p.matchStatus.toLowerCase()})
            </p>
          ))}
        </div>
      )}

      <form action={markStatus} className="flex flex-wrap gap-2">
        {invoice.status !== "SENT" && invoice.status !== "PAID" && (
          <button name="status" value="SENT" className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">
            Mark as sent
          </button>
        )}
        {invoice.status !== "PAID" && (
          <button name="status" value="PAID" className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100">
            Mark as paid
          </button>
        )}
        {invoice.status !== "VOID" && (
          <button name="status" value="VOID" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">
            Void
          </button>
        )}
        {invoice.status === "VOID" && (
          <button name="status" value="DRAFT" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Restore to draft
          </button>
        )}
      </form>
    </div>
  );
}
