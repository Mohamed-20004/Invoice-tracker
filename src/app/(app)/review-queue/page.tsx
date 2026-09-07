import { prisma } from "@/lib/db";
import { assignPaymentToInvoice, ignorePayment } from "@/actions/payments";
import { computeTotals, formatPence, invoiceNumberLabel } from "@/lib/money";

export default async function ReviewQueuePage() {
  const [unmatched, openInvoices] = await Promise.all([
    prisma.payment.findMany({
      where: { matchStatus: "UNMATCHED" },
      orderBy: { transactionTime: "desc" },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["DRAFT", "SENT"] } },
      orderBy: { number: "desc" },
      include: { lineItems: true },
    }),
  ]);

  async function assign(formData: FormData) {
    "use server";
    const paymentId = String(formData.get("paymentId") ?? "");
    const invoiceId = String(formData.get("invoiceId") ?? "");
    if (paymentId && invoiceId) {
      await assignPaymentToInvoice(paymentId, invoiceId);
    }
  }

  async function ignore(formData: FormData) {
    "use server";
    const paymentId = String(formData.get("paymentId") ?? "");
    if (paymentId) await ignorePayment(paymentId);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-800">Review queue</h1>
      <p className="text-sm text-slate-500">
        Incoming payments that couldn&apos;t be matched to an invoice automatically.
        Assign them to the right invoice or ignore them (e.g. personal transfers).
      </p>

      {unmatched.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow-sm">
          Nothing to review 🎉
        </p>
      )}

      <div className="space-y-4">
        {unmatched.map((p) => (
          <div key={p.id} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-lg font-bold">{formatPence(p.amountPence)}</p>
                <p className="text-sm text-slate-500">
                  {p.transactionTime.toLocaleDateString("en-GB")}
                  {p.counterPartyName ? ` · from ${p.counterPartyName}` : ""}
                  {p.reference ? ` · ref “${p.reference}”` : " · no reference"}
                </p>
              </div>
              <form action={ignore}>
                <input type="hidden" name="paymentId" value={p.id} />
                <button className="text-sm text-slate-400 hover:text-red-600">Ignore</button>
              </form>
            </div>
            <form action={assign} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="paymentId" value={p.id} />
              <select
                name="invoiceId"
                required
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
              >
                <option value="">Assign to invoice…</option>
                {openInvoices.map((inv) => {
                  const total = computeTotals(
                    inv.lineItems,
                    inv.vatRegistered,
                    inv.vatRatePercent
                  ).totalPence;
                  return (
                    <option key={inv.id} value={inv.id}>
                      {invoiceNumberLabel(inv.number)} — {inv.customerName} —{" "}
                      {formatPence(total)}
                      {total === p.amountPence ? " (amount matches)" : ""}
                    </option>
                  );
                })}
              </select>
              <button
                type="submit"
                className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Assign &amp; mark paid
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
