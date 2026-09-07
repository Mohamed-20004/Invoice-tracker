-- Move customer details onto the invoice itself and retire the Customer table.
-- Existing invoices keep their customer's details via the backfill below.

ALTER TABLE "Invoice"
  ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customerAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customerEmail" TEXT,
  ADD COLUMN "customerPhone" TEXT;

UPDATE "Invoice" i
SET
  "customerName" = c."name",
  "customerAddress" = concat_ws(E'\n',
    nullif(c."addressLine1", ''),
    nullif(c."addressLine2", ''),
    nullif(c."city", ''),
    nullif(c."postcode", '')
  ),
  "customerEmail" = c."email",
  "customerPhone" = c."phone"
FROM "Customer" c
WHERE i."customerId" = c."id";

ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_customerId_fkey";
ALTER TABLE "Invoice" DROP COLUMN "customerId";

DROP TABLE "Customer";
