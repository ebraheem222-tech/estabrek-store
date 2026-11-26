-- A product picture's depth picture (grey, white = near), made in the admin by a depth model on the owner's own
-- device: the shop draws the card's and the product page's picture in 3D from it. A new column only.
ALTER TABLE "ProductItemImage" ADD COLUMN IF NOT EXISTS "depthUrl" TEXT;
