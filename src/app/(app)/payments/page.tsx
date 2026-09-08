import Link from "next/link";
import { prisma } from "@/lib/db";
import { syncFromStarling } from "@/actions/payments";
import { formatPence, invoiceNumberLabel } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    orderBy: { transactionTime: "desc" },
    include: { invoice: true },
    take: 100,
  });
  const starlingConfigured = Boolean(process.env.STARLING_PAT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-800">Payments</h1>
        <form action={syncFromStarling}>
          <button
            type="submit"
            disabled={!starlingConfigured}
            title={starlingConfigured ? "Fetch settled credits from the last 90 days" : "Set STARLING_PAT to enable"}
            className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40"
          >
            Sync from Starling
          </button>
        </form>
      </div>
      {!starlingConfigured && (
        <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Starling isn&apos;t connected yet — set <code>STARLING_PAT</code> and{" "}
          <code>STARLING_WEBHOOK_SECRET</code>. Incoming payments will then appear here
          automatically via webhook.
        </p>
      )}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="hidden px-4 py-3 md:table-cell">From</th>
              <th className="hidden px-4 py-3 md:table-cell">Reference</th>
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No payments recorded yet.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">{p.transactionTime.toLocaleDateString("en-GB")}</td>
                <td className="hidden px-4 py-3 md:table-cell">{p.counterPartyName ?? "—"}</td>
                <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{p.reference ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={p.matchStatus} /></td>
                <td className="px-4 py-3">
                  {p.invoice ? (
                    <Link href={`/invoices/${p.invoice.id}`} className="text-brand-700 hover:underline">
                      {invoiceNumberLabel(p.invoice.number)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatPence(p.amountPence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
