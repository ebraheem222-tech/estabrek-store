-- A shopper's Discord account (sign-in) and Steam account (linked): src/lib/socialSignIn.ts.
ALTER TABLE "User" ADD COLUMN "discordId" TEXT;
ALTER TABLE "User" ADD COLUMN "steamId" TEXT;
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
CREATE UNIQUE INDEX "User_steamId_key" ON "User"("steamId");
