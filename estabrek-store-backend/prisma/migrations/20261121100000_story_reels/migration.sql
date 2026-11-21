-- Story circles on the shop (admin → القصص) and how often each was opened or its link pressed (src/lib/stories.ts).
-- CreateTable
CREATE TABLE "StoryReel" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL DEFAULT '{}',
    "cover" TEXT,
    "slides" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryReel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryStat" (
    "reelId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "taps" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryStat_pkey" PRIMARY KEY ("reelId")
);

-- CreateIndex
CREATE INDEX "StoryReel_isActive_order_idx" ON "StoryReel"("isActive", "order");

-- AddForeignKey
ALTER TABLE "StoryStat" ADD CONSTRAINT "StoryStat_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "StoryReel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
