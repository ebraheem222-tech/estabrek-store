import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const placeholder = (seed, w = 1000, h = 1000) =>
  `https://picsum.photos/seed/estabrak-${seed}/${w}/${h}`;

async function seedAdmin() {
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
      role: "SUPERADMIN",
    },
  });

  console.log("✓ Superadmin ready:", email);
}

async function seedSizes() {
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  for (const [i, name] of sizes.entries()) {
    await prisma.size.upsert({
      where: { name },
      update: { order: i, active: true },
      create: { name, order: i, active: true },
    });
  }
  const all = await prisma.size.findMany();
  const map = Object.fromEntries(all.map((s) => [s.name, s.id]));
  console.log("✓ Sizes seeded:", Object.keys(map).join(", "));
  return map;
}

async function seedNavigation() {
  const header = await prisma.navigationMenu.upsert({
    where: { name_location: { name: "Primary", location: "HEADER" } },
    update: {},
    create: { name: "Primary", location: "HEADER", isDefault: true },
  });

  const footer = await prisma.navigationMenu.upsert({
    where: { name_location: { name: "Footer", location: "FOOTER" } },
    update: {},
    create: { name: "Footer", location: "FOOTER", isDefault: true },
  });

  await prisma.navigationItem.deleteMany({ where: { menuId: header.id } });
  await prisma.navigationItem.createMany({
    data: [
      { menuId: header.id, label: "Home", href: "/", order: 0 },
      { menuId: header.id, label: "Shop", href: "/shop", order: 1 },
      { menuId: header.id, label: "New Arrivals", href: "/shop/new", order: 2 },
    ],
  });

  await prisma.navigationItem.deleteMany({ where: { menuId: footer.id } });
  await prisma.navigationItem.createMany({
    data: [
      { menuId: footer.id, label: "About", href: "/about", order: 0 },
      { menuId: footer.id, label: "Support", href: "/support", order: 1 },
      { menuId: footer.id, label: "Contact", href: "/contact", order: 2 },
    ],
  });

  console.log("✓ Navigation menus seeded");
  return { headerId: header.id, footerId: footer.id };
}

async function seedSiteSettings(navIds) {
  const existing = await prisma.siteSettings.findFirst();
  if (!existing) {
    await prisma.siteSettings.create({
      data: {
        siteName: "Estabrak Store",
        currencyCode: "ILS",
        primaryNavId: navIds.headerId,
        footerNavId: navIds.footerId,
        announcementIsActive: true,
        announcementText: "New season, new drops — shop now",
      },
    });
    console.log("✓ Site settings created");
  } else {
    await prisma.siteSettings.update({
      where: { id: existing.id },
      data: {
        siteName: "Estabrak Store",
        primaryNavId: navIds.headerId,
        footerNavId: navIds.footerId,
      },
    });
    console.log("✓ Site settings updated");
  }
}

async function seedCategories() {
  const seeds = [
    { name: "Men", slug: "men" },
    { name: "Women", slug: "women" },
    { name: "Accessories", slug: "accessories" },
  ];
  for (const c of seeds) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
  }
  const all = await prisma.category.findMany();
  const map = Object.fromEntries(all.map((c) => [c.slug, c.id]));
  console.log("✓ Categories seeded");
  return map;
}

async function seedProducts(categoryMap, sizeMap) {
  const products = [
    {
      title: "Classic Tee",
      slug: "classic-tee",
      description: "Breathable cotton crew neck with a tailored fit.",
      categorySlug: "men",
      items: [
        {
          colorName: "Black",
          colorHex: "#111111",
          skuBase: "TEE-BLK",
          images: [placeholder("tee-black-1"), placeholder("tee-black-2")],
          variants: [
            { size: "S", price: "89.00", compareAt: "119.00", stock: 12 },
            { size: "M", price: "89.00", compareAt: "119.00", stock: 16 },
            { size: "L", price: "89.00", compareAt: "119.00", stock: 10 },
          ],
        },
        {
          colorName: "White",
          colorHex: "#f5f5f5",
          skuBase: "TEE-WHT",
          images: [placeholder("tee-white-1"), placeholder("tee-white-2")],
          variants: [
            { size: "S", price: "89.00", stock: 8 },
            { size: "M", price: "89.00", stock: 14 },
            { size: "L", price: "89.00", stock: 9 },
          ],
        },
      ],
    },
    {
      title: "Everyday Hoodie",
      slug: "everyday-hoodie",
      description: "Soft fleece hoodie with a relaxed drop-shoulder cut.",
      categorySlug: "women",
      items: [
        {
          colorName: "Heather Gray",
          colorHex: "#9ca3af",
          skuBase: "HD-GRY",
          images: [placeholder("hoodie-gray-1"), placeholder("hoodie-gray-2")],
          variants: [
            { size: "S", price: "149.00", compareAt: "179.00", stock: 6 },
            { size: "M", price: "149.00", compareAt: "179.00", stock: 10 },
            { size: "L", price: "149.00", compareAt: "179.00", stock: 7 },
          ],
        },
        {
          colorName: "Olive",
          colorHex: "#4b5320",
          skuBase: "HD-OLV",
          images: [placeholder("hoodie-olive-1")],
          variants: [
            { size: "S", price: "149.00", stock: 5 },
            { size: "M", price: "149.00", stock: 9 },
            { size: "L", price: "149.00", stock: 5 },
          ],
        },
      ],
    },
    {
      title: "Minimal Sneakers",
      slug: "minimal-sneakers",
      description: "Low-profile leather sneakers for daily wear.",
      categorySlug: "accessories",
      items: [
        {
          colorName: "Sand",
          colorHex: "#d6c7a1",
          skuBase: "SNK-SND",
          images: [placeholder("sneaker-sand-1"), placeholder("sneaker-sand-2")],
          variants: [
            { size: "M", price: "299.00", stock: 4 },
            { size: "L", price: "299.00", stock: 6 },
            { size: "XL", price: "299.00", stock: 3 },
          ],
        },
      ],
    },
  ];

  for (const p of products) {
    const categoryId = categoryMap[p.categorySlug];
    if (!categoryId) {
      console.warn(`Category missing for product ${p.slug}, skipping`);
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        description: p.description,
        categoryId,
        isActive: true,
      },
      create: {
        title: p.title,
        slug: p.slug,
        description: p.description,
        categoryId,
        isActive: true,
      },
    });

    await prisma.productItem.deleteMany({ where: { productId: product.id } });

    for (const item of p.items) {
      const productItem = await prisma.productItem.create({
        data: {
          productId: product.id,
          colorName: item.colorName,
          colorHex: item.colorHex,
          skuBase: item.skuBase,
          isActive: true,
        },
      });

      if (item.images?.length) {
        await prisma.productItemImage.createMany({
          data: item.images.map((url, idx) => ({
            productItemId: productItem.id,
            url,
            alt: `${item.colorName} ${p.title} ${idx + 1}`,
            position: idx,
            isPrimary: idx === 0,
          })),
        });
      }

      for (const v of item.variants) {
        const sizeId = sizeMap[v.size];
        if (!sizeId) {
          console.warn(`Size ${v.size} missing for variant ${item.skuBase}`);
          continue;
        }
        await prisma.productVariant.create({
          data: {
            productItemId: productItem.id,
            sizeId,
            sku: `${item.skuBase}-${v.size}`,
            price: v.price,
            compareAt: v.compareAt ?? null,
            stock: v.stock ?? 0,
            lowStockThreshold: v.lowStockThreshold ?? 0,
            weightGrams: v.weightGrams ?? null,
          },
        });
      }
    }
  }

  console.log("✓ Products seeded");
}

async function seedPages() {
  const home = await prisma.page.upsert({
    where: { slug: "/" },
    update: {
      name: "Homepage",
      status: "PUBLISHED",
      seoTitle: "Estabrak Store",
      seoDescription: "New drops, timeless essentials.",
    },
    create: {
      name: "Homepage",
      slug: "/",
      status: "PUBLISHED",
      seoTitle: "Estabrak Store",
      seoDescription: "New drops, timeless essentials.",
    },
  });

  await prisma.pageSection.deleteMany({ where: { pageId: home.id } });

  const sections = [
    {
      type: "HERO",
      order: 0,
      data: {
        title: "New season, new drops",
        subtitle: "Premium basics, tailored for everyday comfort.",
        ctaLabel: "Shop now",
        ctaHref: "/shop",
        image: placeholder("hero", 1400, 900),
      },
    },
    {
      type: "FEATURED_PRODUCTS",
      order: 1,
      data: {
        title: "Featured picks",
        productSlugs: ["classic-tee", "everyday-hoodie", "minimal-sneakers"],
      },
    },
    {
      type: "NEWSLETTER",
      order: 2,
      data: {
        title: "Stay in the loop",
        text: "Get weekly updates on fresh arrivals and limited runs.",
        ctaLabel: "Subscribe",
      },
    },
  ];

  for (const section of sections) {
    await prisma.pageSection.create({
      data: {
        pageId: home.id,
        type: section.type,
        order: section.order,
        isVisible: true,
        data: section.data,
      },
    });
  }

  console.log("✓ Homepage seeded");
}

async function main() {
  await seedAdmin();
  const sizeMap = await seedSizes();
  const navIds = await seedNavigation();
  await seedSiteSettings(navIds);
  const categoryMap = await seedCategories();
  await seedProducts(categoryMap, sizeMap);
  await seedPages();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
