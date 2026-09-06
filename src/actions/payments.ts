"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/actions/guard";
import { fetchSettledInboundFeedItems } from "@/lib/starling";
import { processFeedItem } from "@/lib/match";

export async function syncFromStarling(): Promise<void> {
  await requireAuth();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  const items = await fetchSettledInboundFeedItems(since);
  for (const item of items) {
    await processFeedItem(item);
  }
  revalidatePath("/payments");
  revalidatePath("/review-queue");
  revalidatePath("/");
}

export async function assignPaymentToInvoice(
  paymentId: string,
  invoiceId: string
): Promise<void> {
  await requireAuth();
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { invoiceId, matchStatus: "MANUAL" },
    });
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "PAID", paidAt: new Date() },
    });
  });
  revalidatePath("/review-queue");
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/");
}

export async function ignorePayment(paymentId: string): Promise<void> {
  await requireAuth();
  await prisma.payment.update({
    where: { id: paymentId },
    data: { matchStatus: "IGNORED", invoiceId: null },
  });
  revalidatePath("/review-queue");
  revalidatePath("/payments");
}
