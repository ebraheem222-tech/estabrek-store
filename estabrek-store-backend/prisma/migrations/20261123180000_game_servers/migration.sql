-- A site's own servers (sites wave G7b, src/lib/gameSites.ts): each reading of one is kept by its key ("" the site's
-- main server), and the link keeps each named server's last hello (src/lib/gameLink.ts).
ALTER TABLE "GameSample" ADD COLUMN "server" TEXT NOT NULL DEFAULT '';
CREATE INDEX "GameSample_featureId_server_at_idx" ON "GameSample"("featureId", "server", "at");
ALTER TABLE "SiteLink" ADD COLUMN "servers" JSONB;
