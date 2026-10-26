import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = process.env.SEED_OUT || path.join(__dirname, "seedmyproject.json");

function replacer(_key, value) {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Prisma.Decimal) return value.toString();
  return value;
}

async function main() {
  const data = {
    meta: {
      exportedAt: new Date().toISOString(),
      mode: "core",
    },
    adminUsers: await prisma.adminUser.findMany(),
    admin2FADevices: await prisma.admin2FADevice.findMany(),
    admin2FARecoveryCodes: await prisma.admin2FARecoveryCode.findMany(),
    siteSettings: await prisma.siteSettings.findMany(),
    navigationMenus: await prisma.navigationMenu.findMany(),
    navigationItems: await prisma.navigationItem.findMany(),
    mediaFolders: await prisma.mediaFolder.findMany(),
    mediaAssets: await prisma.mediaAsset.findMany(),
    pages: await prisma.page.findMany(),
    pageSections: await prisma.pageSection.findMany(),
    pageTranslations: await prisma.pageTranslation.findMany(),
    pageSectionTranslations: await prisma.pageSectionTranslation.findMany(),
    categories: await prisma.category.findMany(),
    sizes: await prisma.size.findMany(),
    products: await prisma.product.findMany(),
    productItems: await prisma.productItem.findMany(),
    productVariants: await prisma.productVariant.findMany(),
    productItemImages: await prisma.productItemImage.findMany(),
    coupons: await prisma.coupon.findMany(),
  };

  await fs.writeFile(outPath, JSON.stringify(data, replacer, 2), "utf8");
  console.log(`Seed export written to ${outPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
