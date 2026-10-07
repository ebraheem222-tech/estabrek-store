-- How products reach the shopper (2026-10-15): shipped (as today), downloaded
-- (digital files) or booked (tickets with a code). Every existing type stays
-- "shipping", so nothing changes for the current store. Guarded.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Fulfillment') THEN
    CREATE TYPE "Fulfillment" AS ENUM ('SHIPPING', 'DIGITAL', 'BOOKING');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketStatus') THEN
    CREATE TYPE "TicketStatus" AS ENUM ('VALID', 'USED', 'CANCELLED');
  END IF;
END $$;

ALTER TABLE "ProductType" ADD COLUMN IF NOT EXISTS "fulfillment" "Fulfillment" NOT NULL DEFAULT 'SHIPPING';

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "eventStartsAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "eventEndsAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "eventLocation" TEXT;

ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "deliveryEmailAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "OrderRequest_accessToken_key" ON "OrderRequest"("accessToken");

CREATE TABLE IF NOT EXISTS "ProductFile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'upload',
    "location" TEXT,
    "url" TEXT,
    "bytes" INTEGER,
    "format" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductFile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProductFile_productId_idx" ON "ProductFile"("productId");

CREATE TABLE IF NOT EXISTS "OrderDownload" (
    "id" TEXT NOT NULL,
    "orderRequestId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastAt" TIMESTAMP(3),

    CONSTRAINT "OrderDownload_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrderDownload_orderRequestId_fileId_key" ON "OrderDownload"("orderRequestId", "fileId");

CREATE TABLE IF NOT EXISTS "Ticket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderRequestId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "label" TEXT,
    "holderName" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'VALID',
    "checkedInAt" TIMESTAMP(3),
    "checkedInById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_code_key" ON "Ticket"("code");
CREATE INDEX IF NOT EXISTS "Ticket_orderRequestId_idx" ON "Ticket"("orderRequestId");
CREATE INDEX IF NOT EXISTS "Ticket_productId_status_idx" ON "Ticket"("productId", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductFile_productId_fkey') THEN
    ALTER TABLE "ProductFile" ADD CONSTRAINT "ProductFile_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderDownload_orderRequestId_fkey') THEN
    ALTER TABLE "OrderDownload" ADD CONSTRAINT "OrderDownload_orderRequestId_fkey"
      FOREIGN KEY ("orderRequestId") REFERENCES "OrderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderDownload_fileId_fkey') THEN
    ALTER TABLE "OrderDownload" ADD CONSTRAINT "OrderDownload_fileId_fkey"
      FOREIGN KEY ("fileId") REFERENCES "ProductFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_orderRequestId_fkey') THEN
    ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_orderRequestId_fkey"
      FOREIGN KEY ("orderRequestId") REFERENCES "OrderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_productId_fkey') THEN
    ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
