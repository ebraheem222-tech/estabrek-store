-- The whole project as it was at a moment (stage 3: the project as one file; src/lib/projectSync.ts).
-- CreateTable
CREATE TABLE "ProjectSnapshot" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "file" JSONB NOT NULL,
    "size" JSONB NOT NULL,
    "bytes" INTEGER NOT NULL,
    "byEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectSnapshot_createdAt_idx" ON "ProjectSnapshot"("createdAt");
