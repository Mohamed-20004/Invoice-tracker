import { prisma } from "@/lib/db";
import { computeTotals } from "@/lib/money";
import type { StarlingFeedItem } from "@/lib/starling";
import type { MatchStatus } from "@/generated/prisma/enums";

const INVOICE_REF_REGEX = /INV[-\s]?0*(\d+)/i;

export async function invoiceTotalPence(invoiceId: string): Promise<number> {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { lineItems: true },
  });
  return computeTotals(
    invoice.lineItems,
    invoice.vatRegistered,
    invoice.vatRatePercent
  ).totalPence;
}

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

// Fuzzy: at least two significant tokens of the job address appear in the
// payment reference (or the address only has one token and it appears).
function referenceMatchesAddress(reference: string, jobAddress: string): boolean {
  const refTokens = new Set(normalizeTokens(reference));
  const addrTokens = normalizeTokens(jobAddress);
  if (addrTokens.length === 0) return false;
  const hits = addrTokens.filter((t) => refTokens.has(t)).length;
  return addrTokens.length === 1 ? hits === 1 : hits >= 2;
}

export interface MatchResult {
  matchStatus: MatchStatus;
  invoiceId: string | null;
}

// Decide which unpaid invoice (if any) an incoming settled credit belongs to.
async function findMatchingInvoice(
  reference: string,
  amountPence: number
): Promise<string | null> {
  const refMatch = reference.match(INVOICE_REF_REGEX);
  if (refMatch) {
    const number = Number(refMatch[1]);
    const invoice = await prisma.invoice.findUnique({
      where: { number },
      include: { lineItems: true },
    });
    if (
      invoice &&
      invoice.status !== "PAID" &&
      invoice.status !== "VOID" &&
      computeTotals(invoice.lineItems, invoice.vatRegistered, invoice.vatRatePercent)
        .totalPence === amountPence
    ) {
      return invoice.id;
    }
    return null; // an explicit INV reference that doesn't line up goes to review
  }

  const candidates = await prisma.invoice.findMany({
    where: { status: { in: ["DRAFT", "SENT"] }, jobAddress: { not: null } },
    include: { lineItems: true },
  });
  const matches = candidates.filter(
    (inv) =>
      inv.jobAddress &&
      referenceMatchesAddress(reference, inv.jobAddress) &&
      computeTotals(inv.lineItems, inv.vatRegistered, inv.vatRatePercent)
        .totalPence === amountPence
  );
  return matches.length === 1 ? matches[0].id : null;
}

// Idempotent on feedItemUid: replays and backfill overlaps are no-ops.
export async function processFeedItem(item: StarlingFeedItem): Promise<MatchResult | null> {
  if (item.direction !== "IN" || item.status !== "SETTLED") return null;

  const existing = await prisma.payment.findUnique({
    where: { feedItemUid: item.feedItemUid },
  });
  if (existing) {
    return { matchStatus: existing.matchStatus, invoiceId: existing.invoiceId };
  }

  const amountPence = item.amount.minorUnits;
  const reference = item.reference ?? "";
  const invoiceId = reference
    ? await findMatchingInvoice(reference, amountPence)
    : null;
  const matchStatus: MatchStatus = invoiceId ? "MATCHED" : "UNMATCHED";

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        feedItemUid: item.feedItemUid,
        amountPence,
        currency: item.amount.currency,
        reference: item.reference ?? null,
        counterPartyName: item.counterPartyName ?? null,
        status: item.status,
        source: item.source ?? null,
        transactionTime: new Date(item.transactionTime ?? Date.now()),
        matchStatus,
        invoiceId,
        rawJson: JSON.parse(JSON.stringify(item)),
      },
    });
    if (invoiceId) {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID", paidAt: new Date() },
      });
    }
  });

  return { matchStatus, invoiceId };
}
