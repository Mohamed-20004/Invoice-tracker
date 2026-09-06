// Direct Starling Bank v2 REST client — no SDK (the official JS SDK is unmaintained).
// All amounts arrive in minor units (pence) and stay that way.

export interface StarlingAmount {
  currency: string;
  minorUnits: number;
}

export interface StarlingFeedItem {
  feedItemUid: string;
  categoryUid?: string;
  accountUid?: string;
  amount: StarlingAmount;
  sourceAmount?: StarlingAmount;
  direction: "IN" | "OUT";
  reference?: string;
  counterPartyName?: string;
  counterPartyType?: string;
  status: "SETTLED" | "PENDING" | "DECLINED" | "REFUNDED" | "RETRYING" | string;
  source?: string;
  transactionTime?: string;
  settlementTime?: string;
  updatedAt?: string;
}

export interface StarlingWebhookEnvelope {
  webhookEventUid: string;
  eventTimestamp: string;
  accountHolderUid: string;
  content: StarlingFeedItem;
}

function baseUrl(): string {
  return process.env.STARLING_API_BASE ?? "https://api-sandbox.starlingbank.com";
}

async function starlingGet<T>(path: string): Promise<T> {
  const pat = process.env.STARLING_PAT;
  if (!pat) throw new Error("STARLING_PAT is not set");
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Starling API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

interface AccountsResponse {
  accounts: {
    accountUid: string;
    defaultCategory: string;
    currency: string;
    name?: string;
  }[];
}

export async function fetchSettledInboundFeedItems(
  since: Date
): Promise<StarlingFeedItem[]> {
  const { accounts } = await starlingGet<AccountsResponse>("/api/v2/accounts");
  const items: StarlingFeedItem[] = [];
  for (const account of accounts) {
    const changesSince = since.toISOString();
    const data = await starlingGet<{ feedItems: StarlingFeedItem[] }>(
      `/api/v2/feed/account/${account.accountUid}/category/${account.defaultCategory}?changesSince=${encodeURIComponent(changesSince)}`
    );
    items.push(
      ...data.feedItems.filter(
        (i) => i.direction === "IN" && i.status === "SETTLED"
      )
    );
  }
  return items;
}
