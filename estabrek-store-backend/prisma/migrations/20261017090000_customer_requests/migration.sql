-- Shopper requests (2026-10-17): sizes/colours/pieces the shop doesn't carry
-- (with photos), and "call me back" from Razan's guided ordering. Guarded.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestKind') THEN
    CREATE TYPE "RequestKind" AS ENUM ('SIZE', 'COLOR', 'NEW_PIECE', 'CALLBACK');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestStatus') THEN
    CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'SEARCHING', 'FOUND', 'UNAVAILABLE', 'DONE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CustomerRequest" (
    "id" TEXT NOT NULL,
    "kind" "RequestKind" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "wantedSize" TEXT,
    "wantedColor" TEXT,
    "details" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "photosDeletedAt" TIMESTAMP(3),
    "source" TEXT,
    "linkedProductId" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerRequest_status_createdAt_idx" ON "CustomerRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "CustomerRequest_kind_createdAt_idx" ON "CustomerRequest"("kind", "createdAt");
CREATE INDEX IF NOT EXISTS "CustomerRequest_phone_idx" ON "CustomerRequest"("phone");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerRequest_productId_fkey') THEN
    ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerRequest_linkedProductId_fkey') THEN
    ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_linkedProductId_fkey"
      FOREIGN KEY ("linkedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
