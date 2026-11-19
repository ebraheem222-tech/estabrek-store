-- Payments a function asks for (stage 2, item 7: the «اطلب دفع» step; src/lib/payLinks.ts).
-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ref" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "back" TEXT,
    "lang" TEXT,
    "fnId" TEXT,
    "provider" TEXT,
    "providerRef" TEXT,
    "paymentReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_token_key" ON "PaymentRequest"("token");

-- CreateIndex
CREATE INDEX "PaymentRequest_status_createdAt_idx" ON "PaymentRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentRequest_providerRef_idx" ON "PaymentRequest"("providerRef");

-- CreateIndex
CREATE INDEX "PaymentRequest_ref_idx" ON "PaymentRequest"("ref");
