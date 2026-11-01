-- The new editor's saved blocks are pages of their own kind: edited like a page, never served as one.
ALTER TABLE "Page" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'page';
CREATE INDEX "Page_kind_idx" ON "Page"("kind");
