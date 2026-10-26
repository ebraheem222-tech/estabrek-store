-- The new editor's draft of a page (src/lib/pageDraft.ts): changes wait here until published.
ALTER TABLE "Page" ADD COLUMN "draft" JSONB;
