-- A whole site's game server as our server read it, once a minute (src/lib/gameSites.ts), kept two days.
CREATE TABLE "GameSample" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "online" BOOLEAN NOT NULL,
    "players" INTEGER,
    "max" INTEGER,
    "name" TEXT,
    "map" TEXT,
    "version" TEXT,
    "ms" INTEGER,

    CONSTRAINT "GameSample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GameSample_featureId_at_idx" ON "GameSample"("featureId", "at");
