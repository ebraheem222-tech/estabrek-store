-- Add embeddings for products (JSON vector + metadata)
ALTER TABLE "Product"
  ADD COLUMN "embedding" JSONB,
  ADD COLUMN "embeddingText" TEXT,
  ADD COLUMN "embeddingModel" TEXT,
  ADD COLUMN "embeddingUpdatedAt" TIMESTAMP(3);
