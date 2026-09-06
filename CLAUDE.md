# Invoice Tracker — UK Plumbing Ltd business tool

Single-admin app for HH Plumbing & Gas LTD: invoice builder + PDF export, Starling Bank payment auto-matching. See SPEC.md for the full build spec. The PDF layout follows the company's Word invoice template (black header band, yellow #FFCE07 accents, Arial); the logo is `public/logo.png`, embedded as a data URI at render time.

## Version pins (do not mix syntaxes across major versions)

| Package | Pin | Notes |
|---|---|---|
| next | ^16 | App Router. **Await all async request APIs**: `params`, `searchParams`, `cookies()`, `headers()` are Promises |
| react / react-dom | ^19 | |
| prisma / @prisma/client / @prisma/adapter-pg | 7.10.0 | **Not v8 RC.** Provider is `prisma-client` (Rust-free), `output` path required, client generated into `src/generated/prisma` — import `PrismaClient` from there and instantiate with the `PrismaPg` adapter |
| tailwindcss / @tailwindcss/postcss | ^4 | CSS-first: **no `tailwind.config.js`**, no `@tailwind base/components/utilities` directives. Configure via `@import "tailwindcss";` + `@theme` in `src/app/globals.css` |
| Node.js | 24 LTS | Docker/engines target; local ≥20 works |
| playwright | ^1 | Chromium `page.pdf()` in API routes only, never in components |
| argon2 | ^0.45 | argon2id password hashing |
| jose | ^6 | HS256-signed HTTP-only session cookie |

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (also the primary verification gate)
- `npm run typecheck` — `tsc --noEmit`
- `npx prisma generate` — regenerate client (runs on postinstall)
- `npx prisma migrate deploy` — apply committed migrations (needs `DATABASE_URL`)
- `npm run hash-password -- '<password>'` — print an argon2id hash for `ADMIN_PASSWORD_HASH`
- `npm run pdf-smoke` — render a sample PDF via Playwright/Chromium

## Env vars (names only — values live in `.env`, never committed)

`DATABASE_URL`, `STARLING_PAT`, `STARLING_API_BASE`, `STARLING_WEBHOOK_SECRET`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `CHROMIUM_EXECUTABLE_PATH` (optional override)

## Gotchas

- All money is **integer minor units (pence)**. Never floats for currency.
- The Starling webhook route (`/api/webhooks/starling`) must read the **raw body** (`await req.text()`) before JSON-parsing, verify `X-Hook-Signature` = `base64(sha512(secret + rawBody))` with `crypto.timingSafeEqual`, and is **excluded from auth middleware**. Return 200 fast; processing is idempotent on `feedItemUid`.
- Chromium launches only inside `/api/invoices/[id]/pdf`; `serverExternalPackages` in `next.config.ts` keeps `playwright`/`argon2` out of the bundle.
- Invoice numbers are sequential and allocated transactionally from `Settings.nextInvoiceNumber`.
- Verify with `npm run build` + `npm run typecheck` + `npm run pdf-smoke` before declaring done.
