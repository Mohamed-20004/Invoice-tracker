"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, getSettings } from "@/lib/db";
import { requireAuth } from "@/actions/guard";

export interface LineItemInput {
  description: string;
  quantity: number;
  unitPricePence: number;
  included: boolean;
}

export interface InvoicePayload {
  customerName: string;
  customerAddress: string; // multiline
  customerEmail: string;
  customerPhone: string;
  jobAddress: string;
  notes: string;
  lineItems: LineItemInput[];
}

function cleanItems(items: LineItemInput[]): LineItemInput[] {
  return items
    .filter((i) => i.description.trim().length > 0)
    .map((i) => ({
      description: i.description.trim().slice(0, 500),
      quantity: Number.isFinite(i.quantity) && i.quantity > 0 ? i.quantity : 1,
      unitPricePence: Number.isInteger(i.unitPricePence) ? i.unitPricePence : 0,
      included: Boolean(i.included),
    }));
}

function customerData(payload: InvoicePayload) {
  return {
    customerName: payload.customerName.trim().slice(0, 200),
    customerAddress: payload.customerAddress
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 8)
      .join("\n"),
    customerEmail: payload.customerEmail.trim() || null,
    customerPhone: payload.customerPhone.trim() || null,
    jobAddress: payload.jobAddress.trim() || null,
    notes: payload.notes.trim() || null,
  };
}

export async function createInvoice(payload: InvoicePayload): Promise<void> {
  await requireAuth();
  const items = cleanItems(payload.lineItems);
  if (!payload.customerName.trim() || items.length === 0) {
    throw new Error("An invoice needs a customer name and at least one line item.");
  }
  const settings = await getSettings();

  // Allocate the sequential number transactionally so numbers never collide
  // or leave gaps under concurrent saves.
  const invoiceId = await prisma.$transaction(async (tx) => {
    const current = await tx.settings.update({
      where: { id: 1 },
      data: { nextInvoiceNumber: { increment: 1 } },
    });
    const number = current.nextInvoiceNumber - 1;
    const issueDate = new Date();
    const dueDate = new Date(
      issueDate.getTime() + settings.paymentTermsDays * 24 * 60 * 60 * 1000
    );
    const invoice = await tx.invoice.create({
      data: {
        number,
        ...customerData(payload),
        issueDate,
        dueDate,
        vatRegistered: settings.vatRegistered,
        vatRatePercent: settings.vatRatePercent,
        lineItems: {
          create: items.map((item, position) => ({ ...item, position })),
        },
      },
    });
    return invoice.id;
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

export async function updateInvoice(
  invoiceId: string,
  payload: InvoicePayload
): Promise<void> {
  await requireAuth();
  const items = cleanItems(payload.lineItems);
  if (!payload.customerName.trim() || items.length === 0) {
    throw new Error("An invoice needs a customer name and at least one line item.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.lineItem.deleteMany({ where: { invoiceId } });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        ...customerData(payload),
        lineItems: {
          create: items.map((item, position) => ({ ...item, position })),
        },
      },
    });
  });
  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function setInvoiceStatus(
  invoiceId: string,
  status: "DRAFT" | "SENT" | "PAID" | "VOID"
): Promise<void> {
  await requireAuth();
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      paidAt: status === "PAID" ? new Date() : null,
    },
  });
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/");
}
