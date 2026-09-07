import { notFound } from "next/navigation";
import { prisma, getSettings } from "@/lib/db";
import { updateInvoice, type InvoicePayload } from "@/actions/invoices";
import { InvoiceBuilder } from "@/components/invoice-builder";
import { invoiceNumberLabel, penceToPoundsInput } from "@/lib/money";
import { newRowKey } from "@/lib/builder-rows";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: { orderBy: { position: "asc" } } },
    }),
    getSettings(),
  ]);
  if (!invoice) notFound();

  async function save(payload: InvoicePayload) {
    "use server";
    await updateInvoice(id, payload);
  }

  return (
    <InvoiceBuilder
      ctx={{
        companyName: settings.companyName,
        registeredAddress: settings.registeredAddress,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        vatRegistered: invoice.vatRegistered,
        vatNumber: settings.vatNumber,
        vatRatePercent: invoice.vatRatePercent,
        bankAccountName: settings.bankAccountName,
        bankAccountNumber: settings.bankAccountNumber,
        bankSortCode: settings.bankSortCode,
        website: settings.website,
        numberLabel: invoiceNumberLabel(invoice.number),
        issueDateLabel: invoice.issueDate.toLocaleDateString("en-GB"),
        dueDateLabel: invoice.dueDate?.toLocaleDateString("en-GB") ?? "—",
      }}
      initial={{
        customerName: invoice.customerName,
        customerAddress: invoice.customerAddress,
        customerEmail: invoice.customerEmail ?? "",
        customerPhone: invoice.customerPhone ?? "",
        jobAddress: invoice.jobAddress ?? "",
        notes: invoice.notes ?? "",
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
  );
}
