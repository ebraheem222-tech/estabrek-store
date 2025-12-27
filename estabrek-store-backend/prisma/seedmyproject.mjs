import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = process.env.SEED_FILE || path.join(__dirname, "seedmyproject.json");
const batchSize = Number(process.env.SEED_BATCH_SIZE || 500);

async function createMany(delegate, rows) {
  if (!rows || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    await delegate.createMany({ data: chunk, skipDuplicates: true });
  }
}

async function seedAdmins(data) {
  const admins = data.adminUsers || [];
  const adminsSafe = admins.map((u) => ({ ...u, default2FADeviceId: null }));
  await createMany(prisma.adminUser, adminsSafe);

  await createMany(prisma.admin2FADevice, data.admin2FADevices || []);
  await createMany(prisma.admin2FARecoveryCode, data.admin2FARecoveryCodes || []);

  for (const u of admins) {
    if (!u.default2FADeviceId) continue;
    await prisma.adminUser
      .update({
        where: { id: u.id },
        data: {
          default2FADeviceId: u.default2FADeviceId,
          twoFactorEnabled: u.twoFactorEnabled ?? false,
        },
      })
      .catch(() => undefined);
  }
}

async function main() {
  const raw = await fs.readFile(dataPath, "utf8");
  const data = JSON.parse(raw);

  await seedAdmins(data);

  await createMany(prisma.size, data.sizes || []);
  await createMany(prisma.category, data.categories || []);
  await createMany(prisma.product, data.products || []);
  await createMany(prisma.productItem, data.productItems || []);
  await createMany(prisma.productVariant, data.productVariants || []);
  await createMany(prisma.productItemImage, data.productItemImages || []);

  await createMany(prisma.mediaFolder, data.mediaFolders || []);
  await createMany(prisma.mediaAsset, data.mediaAssets || []);

  await createMany(prisma.navigationMenu, data.navigationMenus || []);
  await createMany(prisma.navigationItem, data.navigationItems || []);
  await createMany(prisma.siteSettings, data.siteSettings || []);

  await createMany(prisma.page, data.pages || []);
  await createMany(prisma.pageSection, data.pageSections || []);
  await createMany(prisma.pageTranslation, data.pageTranslations || []);
  await createMany(prisma.pageSectionTranslation, data.pageSectionTranslations || []);

  await createMany(prisma.coupon, data.coupons || []);

  console.log("Seed complete");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
