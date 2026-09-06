import { NextRequest, NextResponse } from "next/server";
import { verifyStarlingSignature } from "@/lib/starling-signature";
import { processFeedItem } from "@/lib/match";
import type { StarlingWebhookEnvelope } from "@/lib/starling";

export const runtime = "nodejs";

// Starling retries for ~2h unless it gets a 2XX within ~2s, so this handler
// stays fast and idempotent (keyed on feedItemUid inside processFeedItem).
export async function POST(request: NextRequest) {
  // Raw bytes first — the signature covers exactly what was sent.
  const rawBody = await request.text();
  const signature = request.headers.get("x-hook-signature");

  if (!verifyStarlingSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let envelope: StarlingWebhookEnvelope;
  try {
    envelope = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const item = envelope.content;
  if (!item?.feedItemUid || !item.amount) {
    // Not a feed-item event (or a shape we don't handle) — acknowledge so
    // Starling doesn't retry.
    return NextResponse.json({ received: true });
  }

  try {
    const result = await processFeedItem(item);
    return NextResponse.json({ received: true, match: result?.matchStatus ?? null });
  } catch (error) {
    console.error("starling webhook processing failed", error);
    // Non-2XX so Starling retries; processing is idempotent.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
