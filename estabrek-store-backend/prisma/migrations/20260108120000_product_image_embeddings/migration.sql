-- Add embeddings for product images (JSON vector + metadata)
ALTER TABLE "ProductItemImage"
  ADD COLUMN "embedding" JSONB,
  ADD COLUMN "embeddingText" TEXT,
  ADD COLUMN "embeddingModel" TEXT,
  ADD COLUMN "embeddingUpdatedAt" TIMESTAMP(3);
