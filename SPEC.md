# SPEC — UK Plumbing Ltd Business Tool

A self-hosted business tool for HH Plumbing & Gas LTD (a one-person London plumbing limited company): build HMRC-compliant invoices, export them as PDFs styled after the company's Word invoice template, and auto-mark them paid from incoming Starling Bank transfers.

## 1. Overview & non-goals

**In scope:** single-admin login; customer + invoice CRUD with a toggleable line-item builder; sequential invoice numbering; VAT (20%, toggleable for non-VAT-registered); A4 PDF export via Playwright/Chromium; Starling feed-item webhook receiver with signature verification, payment auto-matching, and a manual review queue; a payments backfill/sync via the Starling REST API; Railway deployment via Dockerfile.

**Non-goals:** pricing calculator (the owner prices jobs manually); multi-user auth or roles; Making Tax Digital / HMRC filing; emailing invoices; stored/immutable PDF archives (regenerate on demand — revisit if audit copies are required); payments out / expenses; multi-currency (GBP only); mobile app.

## 2. Data model (Prisma, PostgreSQL)

- **Settings** (single row, id=1): registered company name, company number, registered office address, place of registration, VAT-registered flag + VAT number, contact email/phone, website, bank account name / sort code / account number, payment terms days, VAT rate %, `nextInvoiceNumber`. Seeded with the company's real details from its invoice template (numbering continues from INV-0059).
- **Invoice**: sequential `number` (unique int), status `DRAFT | SENT | PAID | VOID`, inline customer details (`customerName`, multiline `customerAddress`, `customerEmail?`, `customerPhone?` — no separate customer records), `jobAddress` (used for payment matching), issue/due dates, snapshot of VAT registration + rate, notes; has many LineItems and Payments.
- **LineItem**: position, description, quantity (float, e.g. 1.5 h), `unitPricePence`, `included` flag (excluded rows are kept but don't count).
- **Payment**: `feedItemUid` (unique — idempotency key), amountPence, currency, reference, counterparty name, status, source, transactionTime, `matchStatus` `MATCHED | UNMATCHED | MANUAL | IGNORED`, optional invoice relation, raw JSON.
- **LoginAttempt**: ip, success, createdAt — drives the login rate limiter.

## 3. Routes

| Route | Purpose |
|---|---|
| `/login` | password form (rate-limited) |
| `/` | dashboard: outstanding, paid-this-month, review-queue count, recent invoices |
| `/invoices`, `/invoices/new`, `/invoices/[id]` | list, WYSIWYG builder (a live replica of the invoice template with fields edited in place), detail (with edit + PDF link) |
| `/payments` | payment feed + "Sync from Starling" backfill |
| `/review-queue` | unmatched payments → assign to invoice or ignore |
| `/settings` | company / VAT / bank details |
| `/api/invoices/[id]/pdf` | streams a freshly rendered PDF |
| `/api/webhooks/starling` | Starling feed-item webhook (no auth middleware; signature-verified) |

## 4. Auth

- One admin. Password stored as an argon2id hash in `ADMIN_PASSWORD_HASH`.
- Session: jose HS256 JWT in an HTTP-only cookie (`Secure`, `SameSite=Lax`, path `/`, 8 h expiry), signed with `SESSION_SECRET`.
- `middleware.ts` redirects unauthenticated requests to `/login` for everything except `/login`, `/api/webhooks/starling`, and Next static assets.
- Rate limit: DB-backed — max 5 failed attempts per IP per 15 minutes, then locked out until the window clears.

## 5. Starling integration

- **No SDK** — direct `fetch` against the v2 REST API with `Bearer ${STARLING_PAT}`. Base URL from `STARLING_API_BASE` (production `https://api.starlingbank.com`, sandbox `https://api-sandbox.starlingbank.com`).
- **Webhook envelope**: `{ webhookEventUid, eventTimestamp, accountHolderUid, content: { …feed item… } }`. Verify `X-Hook-Signature` = `Base64(SHA-512(STARLING_WEBHOOK_SECRET + rawBody))` over the raw request bytes with a constant-time compare. Respond 200 within 2 s; Starling retries with backoff for ~2 h otherwise.
- **Idempotency**: upsert `Payment` on `feedItemUid`; replays are no-ops.
- **Matching** (only `direction === "IN"` and `status === "SETTLED"`):
  1. Regex `/INV[-\s]?0*(\d+)/i` on `reference` → invoice by number, unpaid, amount equals outstanding total → **match**, mark PAID.
  2. Else fuzzy match reference tokens against `jobAddress` of unpaid invoices with the exact amount → **match**.
  3. Else → `UNMATCHED`, lands in the review queue for manual assignment or ignore.
- **Backfill**: fetch accounts → default category → settled feed items since a given date, run each through the same matcher.

## 6. PDF export

- Invoice rendered to a self-contained HTML string (inline print CSS, `@page { size: A4 }`, mm units, `break-inside: avoid` on totals, real selectable text) and printed with Playwright `page.pdf({ format: 'A4', printBackground: true })` inside the API route.
- Regenerated on demand; nothing persisted.
- Layout follows the company's Word invoice template: full-width black header band (logo from `public/logo.png` embedded as a data URI, company block with VAT number, oversized yellow #FFCE07 "INVOICE" + number), yellow accent strip, Invoice/Due date boxes (grey #F5F5F5), BILL TO / SITE ADDRESS columns (site address = `jobAddress`), items table (Description / Unit Price / Qty / Amount "(excl. VAT)") with black header and zebra rows, totals with a yellow TOTAL DUE row, NOTES panel (*"Please quote INV-#### as your payment reference"* — this drives auto-matching) beside a grey PAYMENT DETAILS panel (name / account no / sort code), and a centred "Thank you for choosing…" footer with the website. Arial throughout. A small statutory Companies Act line (company number, registered office, place of registration) renders when a company number is set; VAT elements only when VAT-registered.

## 7. Invoice builder UI

The builder renders as a live replica of the invoice template (black header band, yellow accents) with fields edited seamlessly in place: customer name/address/email/phone typed directly on the invoice (no separate customer records), site address, and line-item rows (description, unit price £, qty) with add / remove / reorder and a per-row include toggle; excluded rows grey/struck-through but retained. Subtotal, VAT, and total recompute in real time. VAT block hidden when the company isn't VAT-registered. Pounds accepted in inputs, converted to integer pence on save.

## 8. Deployment (Railway)

Dockerfile (not nixpacks): `node:24-bookworm-slim` build → runtime with `npx playwright install --with-deps chromium` baked in at build, non-root user, `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`. ≥1 GB RAM. `npx prisma migrate deploy` on release. Env vars: `DATABASE_URL`, `STARLING_PAT`, `STARLING_API_BASE`, `STARLING_WEBHOOK_SECRET`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`.

## 9. End-to-end verification checklist

1. `npm run build` and `npm run typecheck` pass.
2. Login works; wrong password 5× locks the IP out; protected routes redirect to `/login`.
3. Create an invoice → toggle a line item off → totals update live → save → number is sequential.
4. `GET /api/invoices/[id]/pdf` returns a valid A4 PDF with selectable text (`npm run pdf-smoke` covers the render path headlessly).
5. POST a simulated Starling webhook with a valid signature and `reference: "INV-0001"` → invoice auto-marked PAID; replay is a no-op; bad signature → 401.
6. POST one with an unknown reference → appears in the review queue → manual assign marks the invoice paid.
