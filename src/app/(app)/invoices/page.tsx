import Link from "next/link";
import { prisma } from "@/lib/db";
import { computeTotals, formatPence, invoiceNumberLabel } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DeleteInvoiceButton } from "@/components/delete-invoice-button";

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { number: "desc" },
    include: { lineItems: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-800">Invoices</h1>
        <Link
          href="/invoices/new"
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          New invoice
        </Link>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No invoices yet.
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
                    {invoiceNumberLabel(inv.number)}
                  </Link>
                </td>
                <td className="px-4 py-3">{inv.customerName}</td>
                <td className="px-4 py-3">{inv.issueDate.toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">{inv.dueDate?.toLocaleDateString("en-GB") ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatPence(
                    computeTotals(inv.lineItems, inv.vatRegistered, inv.vatRatePercent).totalPence
                  )}
                </td>
                <td className="px-2 py-3 text-right">
                  <DeleteInvoiceButton
                    invoiceId={inv.id}
                    label={invoiceNumberLabel(inv.number)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
