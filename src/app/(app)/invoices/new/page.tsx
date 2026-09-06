import Link from "next/link";
import { prisma, getSettings } from "@/lib/db";
import { createInvoice } from "@/actions/invoices";
import { InvoiceBuilder } from "@/components/invoice-builder";
import { newRowKey, type BuilderRow } from "@/lib/builder-rows";
import { invoiceNumberLabel } from "@/lib/money";

interface PrefillItem {
  description: string;
  quantity: number;
  unitPricePence: number;
}

function parsePrefill(raw: string | undefined): BuilderRow[] {
  if (!raw) return [];
  try {
    const items = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as PrefillItem[];
    if (!Array.isArray(items)) return [];
    return items.slice(0, 50).map((item) => ({
      key: newRowKey(),
      description: String(item.description ?? ""),
      quantity: String(Number(item.quantity) || 1),
      unitPrice: ((Number(item.unitPricePence) || 0) / 100).toFixed(2),
      included: true,
    }));
  } catch {
    return [];
  }
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>;
}) {
  const { prefill } = await searchParams;
  const [customers, settings] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    getSettings(),
  ]);
  const prefillRows = parsePrefill(prefill);

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
        initial={
          prefillRows.length
            ? { customerId: "", jobAddress: "", notes: "", supplyDate: "", rows: prefillRows }
            : undefined
        }
        onSubmit={createInvoice}
        submitLabel="Create invoice"
      />
    </div>
  );
}
