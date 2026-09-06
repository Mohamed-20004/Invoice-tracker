import Link from "next/link";
import { prisma, getSettings } from "@/lib/db";
import { createInvoice } from "@/actions/invoices";
import { InvoiceBuilder } from "@/components/invoice-builder";
import { invoiceNumberLabel } from "@/lib/money";

export default async function NewInvoicePage() {
  const [customers, settings] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-brand-800">
          New invoice{" "}
          <span className="text-base font-normal text-slate-400">
            (will be {invoiceNumberLabel(settings.nextInvoiceNumber)})
          </span>
        </h1>
        {customers.length === 0 && (
          <Link href="/customers" className="text-sm text-brand-700 hover:underline">
            Add a customer first →
          </Link>
        )}
      </div>
      <InvoiceBuilder
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        vatRegistered={settings.vatRegistered}
        vatRatePercent={settings.vatRatePercent}
        onSubmit={createInvoice}
        submitLabel="Create invoice"
      />
    </div>
  );
}
