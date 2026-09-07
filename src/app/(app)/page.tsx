import Link from "next/link";
import { prisma } from "@/lib/db";
import { computeTotals, formatPence, invoiceNumberLabel } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";

export default async function DashboardPage() {
  const [openInvoices, reviewCount, recent, paidThisMonth] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: ["DRAFT", "SENT"] } },
      include: { lineItems: true },
    }),
    prisma.payment.count({ where: { matchStatus: "UNMATCHED" } }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { lineItems: true },
    }),
    prisma.payment.aggregate({
      _sum: { amountPence: true },
      where: {
        matchStatus: { in: ["MATCHED", "MANUAL"] },
        transactionTime: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  const outstandingPence = openInvoices.reduce(
    (sum, inv) =>
      sum + computeTotals(inv.lineItems, inv.vatRegistered, inv.vatRatePercent).totalPence,
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-800">Dashboard</h1>
        <Link
          href="/invoices/new"
          className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          New invoice
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Outstanding</p>
          <p className="mt-1 text-2xl font-bold">{formatPence(outstandingPence)}</p>
          <p className="text-xs text-slate-400">{openInvoices.length} open invoice(s)</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Received this month</p>
          <p className="mt-1 text-2xl font-bold">
            {formatPence(paidThisMonth._sum.amountPence ?? 0)}
          </p>
          <p className="text-xs text-slate-400">matched Starling credits</p>
        </div>
        <Link href="/review-queue" className="rounded-xl bg-white p-5 shadow-sm hover:ring-2 hover:ring-brand-600">
          <p className="text-sm text-slate-500">Needs review</p>
          <p className={`mt-1 text-2xl font-bold ${reviewCount > 0 ? "text-red-600" : ""}`}>
            {reviewCount}
          </p>
          <p className="text-xs text-slate-400">unmatched payment(s)</p>
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent invoices</h2>
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No invoices yet — create your first one.
                  </td>
                </tr>
              )}
              {recent.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700 hover:underline">
                      {invoiceNumberLabel(inv.number)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{inv.customerName}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPence(
                      computeTotals(inv.lineItems, inv.vatRegistered, inv.vatRatePercent).totalPence
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
