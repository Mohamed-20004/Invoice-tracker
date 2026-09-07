import { getSettings } from "@/lib/db";
import { createInvoice } from "@/actions/invoices";
import { InvoiceBuilder } from "@/components/invoice-builder";
import { invoiceNumberLabel } from "@/lib/money";

export default async function NewInvoicePage() {
  const settings = await getSettings();
  const issueDate = new Date();
  const dueDate = new Date(
    issueDate.getTime() + settings.paymentTermsDays * 24 * 60 * 60 * 1000
  );

  return (
    <InvoiceBuilder
      ctx={{
        companyName: settings.companyName,
        registeredAddress: settings.registeredAddress,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        vatRegistered: settings.vatRegistered,
        vatNumber: settings.vatNumber,
        vatRatePercent: settings.vatRatePercent,
        bankAccountName: settings.bankAccountName,
        bankAccountNumber: settings.bankAccountNumber,
        bankSortCode: settings.bankSortCode,
        website: settings.website,
        numberLabel: invoiceNumberLabel(settings.nextInvoiceNumber),
        issueDateLabel: issueDate.toLocaleDateString("en-GB"),
        dueDateLabel: dueDate.toLocaleDateString("en-GB"),
      }}
      onSubmit={createInvoice}
      submitLabel="Create invoice"
    />
  );
}
