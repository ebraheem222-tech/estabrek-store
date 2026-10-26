-- Pages as a tree of elements (the new CMS). format 1 = the old list of sections,
-- 2 = Page.tree. Only adds columns: every page stays format 1 until converted.
ALTER TABLE "Page" ADD COLUMN "format" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Page" ADD COLUMN "tree" JSONB;
ALTER TABLE "PageRevision" ADD COLUMN "format" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PageRevision" ADD COLUMN "tree" JSONB;
