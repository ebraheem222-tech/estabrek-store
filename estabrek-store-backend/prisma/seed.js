import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
const prisma = new PrismaClient();

async function main() {
  // 1) SUPERADMIN (single account)
  const email = "admin@estabrak.local";
  const password = "ChangeThis!123"; // change after login
  const passwordHash = await argon2.hash(password);

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Super Admin",
      passwordHash,
      role: "SUPERADMIN"
    }
  });

  // 2) Menus + Site settings
  const primary = await prisma.navigationMenu.upsert({
    where: { name_location: { name: "Primary", location: "HEADER" } },
    update: {},
    create: { name: "Primary", location: "HEADER", isDefault: true }
  });
  await prisma.navigationItem.createMany({
    data: [
      { menuId: primary.id, label: "Home", href: "/", order: 0 },
      { menuId: primary.id, label: "Shop", href: "/shop", order: 1 }
    ],
    skipDuplicates: true
  });

  const footer = await prisma.navigationMenu.upsert({
    where: { name_location: { name: "Footer", location: "FOOTER" } },
    update: {},
    create: { name: "Footer", location: "FOOTER", isDefault: true }
  });

  const existingSettings = await prisma.siteSettings.findFirst();
  if (!existingSettings) {
    await prisma.siteSettings.create({
      data: {
        siteName: "Estabrak Store",
        primaryNavId: primary.id,
        footerNavId: footer.id
      }
    });
  }

  // 3) Sizes
  const sizes = ["XS","S","M","L","XL"].map((name, i) => ({ name, order: i }));
  for (const s of sizes) {
    await prisma.size.upsert({ where: { name: s.name }, update: {}, create: s });
  }

  console.log("✅ Seed complete. Admin:", email, "Password:", password);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
