-- App users (stage 2, item 3): signing in with Google. A shopper's Google account id, once linked
-- (src/lib/googleSignIn.ts).
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");
