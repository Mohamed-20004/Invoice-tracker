# Invoice Tracker

A self-hosted business tool for a one-person UK plumbing limited company:

- **Invoice builder** — toggleable line items with live totals, VAT 20% (toggleable for non-VAT-registered companies), sequential HMRC-compliant numbering, customer records.
- **PDF export** — A4 invoices rendered on demand with Playwright/Chromium; real selectable text, Companies Act footer, bank details, and a "quote INV-#### as your payment reference" instruction.
- **Starling Bank auto-matching** — a signature-verified webhook receives incoming feed items, matches settled credits against invoice numbers (or fuzzily against job addresses) and marks invoices paid; anything ambiguous lands in a manual review queue. A "Sync from Starling" button backfills the last 90 days via the REST API.
- **Pricing calculator** — job estimates from editable rates (call-out fee, weekday/out-of-hours hourly, materials markup, billing increments), with one click to turn an estimate into an invoice.
- **Single-admin auth** — argon2id password hash, jose-signed HTTP-only session cookie, DB-backed login rate limiting (5 failures / 15 min lockout).

Stack: Next.js 16 (App Router), React 19, Prisma 7 (Rust-free client + `@prisma/adapter-pg`), Tailwind CSS 4, PostgreSQL, Playwright. See `SPEC.md` for the full spec and `CLAUDE.md` for development conventions.

## Local development

```bash
npm install                       # also runs prisma generate
cp .env.example .env              # fill in the values
npm run hash-password -- 'pw'     # -> ADMIN_PASSWORD_HASH
openssl rand -base64 48           # -> SESSION_SECRET
npx prisma migrate deploy         # apply migrations (needs DATABASE_URL)
npm run dev
```

Verification gates: `npm run build`, `npm run typecheck`, `npm run pdf-smoke`.

## Starling setup

1. In the [Starling Developer Portal](https://developer.starlingbank.com/), create a **personal access token** (read-only account/transaction scopes) → `STARLING_PAT`. Start against sandbox (`STARLING_API_BASE=https://api-sandbox.starlingbank.com`), then switch to `https://api.starlingbank.com`.
2. Register a **webhook** for feed-item events pointing at `https://<your-domain>/api/webhooks/starling`; the generated shared secret is `STARLING_WEBHOOK_SECRET`.
3. Invoices tell customers to quote `INV-####` as the payment reference — that's what drives automatic matching. Payments with no confident match appear under **Review queue**.

Simulate a webhook locally:

```bash
BODY='{"webhookEventUid":"evt-1","eventTimestamp":"2026-01-01T12:00:00Z","accountHolderUid":"ah-1","content":{"feedItemUid":"feed-1","amount":{"currency":"GBP","minorUnits":13200},"direction":"IN","reference":"INV-0001","counterPartyName":"J SMITH","status":"SETTLED","source":"FASTER_PAYMENTS_IN","transactionTime":"2026-01-01T11:59:00Z"}}'
SIG=$(node -e "const c=require('crypto');console.log(c.createHash('sha512').update(process.env.STARLING_WEBHOOK_SECRET+process.argv[1]).digest('base64'))" "$BODY")
curl -X POST http://localhost:3000/api/webhooks/starling -H "Content-Type: application/json" -H "X-Hook-Signature: $SIG" -d "$BODY"
```

## Deploying to Railway

Uses the committed `Dockerfile` (Chromium and its system libraries are baked in at build time; the container runs as a non-root user).

1. Create a Railway project with a PostgreSQL database; point the service at this repo and it will pick up the Dockerfile.
2. Give the service **≥ 1 GB RAM** (Chromium needs it).
3. Set the environment variables from `.env.example` (`DATABASE_URL` comes from the Railway Postgres plugin).
4. Set the release command to `npx prisma migrate deploy`.

PDFs are regenerated from live data on every download — nothing is stored on the ephemeral filesystem. If you later need immutable copies of issued invoices (e.g. for an HMRC audit trail), add object storage (Cloudflare R2) and persist on "mark as sent".
