-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'MANUAL', 'IGNORED');

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyName" TEXT NOT NULL DEFAULT 'HH Plumbing & Gas LTD',
    "companyNumber" TEXT NOT NULL DEFAULT '',
    "registeredAddress" TEXT NOT NULL DEFAULT '167 Great Portland Street, London, W1W 5PF',
    "placeOfRegistration" TEXT NOT NULL DEFAULT 'England and Wales',
    "vatRegistered" BOOLEAN NOT NULL DEFAULT true,
    "vatNumber" TEXT NOT NULL DEFAULT '516 1280 19',
    "vatRatePercent" INTEGER NOT NULL DEFAULT 20,
    "contactEmail" TEXT NOT NULL DEFAULT 'office@hhplumbingandgas.com',
    "contactPhone" TEXT NOT NULL DEFAULT '0208 102 1108',
    "website" TEXT NOT NULL DEFAULT 'hhplumbingandgas.com',
    "bankAccountName" TEXT NOT NULL DEFAULT 'HH Plumbing and Gas LTD',
    "bankSortCode" TEXT NOT NULL DEFAULT '60-83-71',
    "bankAccountNumber" TEXT NOT NULL DEFAULT '34428426',
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 14,
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 59,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "jobAddress" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "supplyDate" TIMESTAMP(3),
    "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "vatRatePercent" INTEGER NOT NULL DEFAULT 20,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPricePence" INTEGER NOT NULL DEFAULT 0,
    "included" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "feedItemUid" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "reference" TEXT,
    "counterPartyName" TEXT,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "transactionTime" TIMESTAMP(3) NOT NULL,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "invoiceId" TEXT,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_feedItemUid_key" ON "Payment"("feedItemUid");

-- CreateIndex
CREATE INDEX "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineItem" ADD CONSTRAINT "LineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

