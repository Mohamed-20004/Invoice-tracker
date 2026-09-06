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
  customerId: string;
  jobAddress: string;
  notes: string;
  supplyDate: string; // yyyy-mm-dd or ""
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

export async function createInvoice(payload: InvoicePayload): Promise<void> {
  await requireAuth();
  const items = cleanItems(payload.lineItems);
  if (!payload.customerId || items.length === 0) {
    throw new Error("An invoice needs a customer and at least one line item.");
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
        customerId: payload.customerId,
        jobAddress: payload.jobAddress.trim() || null,
        notes: payload.notes.trim() || null,
        issueDate,
        dueDate,
        supplyDate: payload.supplyDate ? new Date(payload.supplyDate) : null,
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
  if (items.length === 0) {
    throw new Error("An invoice needs at least one line item.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.lineItem.deleteMany({ where: { invoiceId } });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        customerId: payload.customerId,
        jobAddress: payload.jobAddress.trim() || null,
        notes: payload.notes.trim() || null,
        supplyDate: payload.supplyDate ? new Date(payload.supplyDate) : null,
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
