-- App users (stage 2, item 3): roles and groups for shoppers. A shopper holds role keys and group ids;
-- tables and functions name them (src/lib/shopperRoles.ts).
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "groups" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "roles" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "ShopperRole" (
    "key" TEXT NOT NULL,
    "name" JSONB NOT NULL DEFAULT '{}',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopperRole_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ShopperGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopperGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopperGroup_name_key" ON "ShopperGroup"("name");
