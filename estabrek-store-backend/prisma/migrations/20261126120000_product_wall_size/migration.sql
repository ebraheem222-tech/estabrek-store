-- «شوفها على حيطك»: a piece that hangs on a wall, its real size (cm) and frame, so the shop shows it at its size in a
-- drawn room and on the shopper's own wall through the camera. New columns only (empty: not a piece for a wall).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wallWidthCm" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wallHeightCm" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wallFrame" TEXT;
