import { notFound } from "next/navigation";
import { prisma, getSettings } from "@/lib/db";
import { updateInvoice, type InvoicePayload } from "@/actions/invoices";
import { InvoiceBuilder } from "@/components/invoice-builder";
import { newRowKey } from "@/lib/builder-rows";
import { invoiceNumberLabel, penceToPoundsInput } from "@/lib/money";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, customers, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { position: "asc" } } },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    getSettings(),
  ]);
  if (!invoice) notFound();

  async function save(payload: InvoicePayload) {
    "use server";
    await updateInvoice(id, payload);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-800">
        Edit {invoiceNumberLabel(invoice.number)}
      </h1>
      <InvoiceBuilder
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        vatRegistered={invoice.vatRegistered}
        vatRatePercent={invoice.vatRatePercent}
        initial={{
          customerId: invoice.customerId,
          jobAddress: invoice.jobAddress ?? "",
          notes: invoice.notes ?? "",
          supplyDate: invoice.supplyDate?.toISOString().slice(0, 10) ?? "",
          rows: invoice.lineItems.map((item) => ({
            key: newRowKey(),
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: penceToPoundsInput(item.unitPricePence),
            included: item.included,
          })),
        }}
        onSubmit={save}
        submitLabel="Save changes"
      />
    </div>
  );
}
