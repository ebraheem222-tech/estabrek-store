-- A bag line's own details (what the shopper wrote or chose: a gift card's name and message, a configurator's
-- parts), kept on the order's line. A new column only.
ALTER TABLE "OrderRequestItem" ADD COLUMN IF NOT EXISTS "details" JSONB;
