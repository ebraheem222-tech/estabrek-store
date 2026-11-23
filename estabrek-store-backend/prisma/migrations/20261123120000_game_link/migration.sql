-- «إستبرق لينك» (src/lib/gameLink.ts): a site's key for its game server, the codes a player types in the game, and
-- the game accounts linked to a shop account.
ALTER TABLE "User" ADD COLUMN "fivemLicense" TEXT;
ALTER TABLE "User" ADD COLUMN "fivemName" TEXT;
ALTER TABLE "User" ADD COLUMN "minecraftUuid" TEXT;
ALTER TABLE "User" ADD COLUMN "minecraftName" TEXT;
CREATE UNIQUE INDEX "User_fivemLicense_key" ON "User"("fivemLicense");
CREATE UNIQUE INDEX "User_minecraftUuid_key" ON "User"("minecraftUuid");

CREATE TABLE "SiteLink" (
    "featureId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyHint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "lastGame" TEXT,
    "lastVersion" TEXT,
    "lastPlayers" INTEGER,

    CONSTRAINT "SiteLink_pkey" PRIMARY KEY ("featureId")
);
CREATE UNIQUE INDEX "SiteLink_keyHash_key" ON "SiteLink"("keyHash");

CREATE TABLE "GameLinkCode" (
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameLinkCode_pkey" PRIMARY KEY ("code")
);
CREATE UNIQUE INDEX "GameLinkCode_userId_key" ON "GameLinkCode"("userId");
