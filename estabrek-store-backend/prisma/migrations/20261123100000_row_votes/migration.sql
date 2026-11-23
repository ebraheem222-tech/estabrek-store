-- A reviewer's vote on a row waiting in a site panel's queue (src/lib/siteVotes.ts): one for each member, with a note.
CREATE TABLE "RowVote" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "memberId" VARCHAR(64) NOT NULL,
    "memberName" VARCHAR(200) NOT NULL,
    "vote" VARCHAR(8) NOT NULL,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RowVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RowVote_itemId_memberId_key" ON "RowVote"("itemId", "memberId");

ALTER TABLE "RowVote" ADD CONSTRAINT "RowVote_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CollectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
