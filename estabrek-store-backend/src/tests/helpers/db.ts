// src/tests/helpers/db.ts
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";

export { prisma }; // ✅ أضف هاي السطر

export async function resetDb() {
  await prisma.$transaction([
    prisma.orderRequestHistory.deleteMany(),
    prisma.outboxMessage.deleteMany(),
    prisma.orderRequest.deleteMany(),
    prisma.inventoryAdjustment.deleteMany(),
    prisma.review.deleteMany(),
    prisma.productComment.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.productItemImage.deleteMany(),
    prisma.productItem.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.size.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/** Minimal catalog with 1 category tree, 1 size, 1 product+item+variant */
export async function seedCatalog() {
  await prisma.category.create({ data: { id: "c1", name: "Men", slug: "men" } });
  await prisma.category.create({
    data: { id: "c2", name: "Shirts", slug: "shirts", parentId: "c1" },
  });

  await prisma.size.create({ data: { id: "s1", name: "M", order: 1, active: true } });

  await prisma.product.create({
    data: {
      id: "p1",
      slug: "blue-shirt",
      title: "Blue Shirt",
      description: "Blue cotton shirt",
      isActive: true,
      categoryId: "c2",
      items: {
        create: [
          {
              id: "i1",
              colorName: "Blue",
              isActive: true,
              images: {
                  create: [
                      {
                          id: "img1",
                          url: "https://example.com/blue.jpg",
                          isPrimary: true,
                          position: 1,
                      },
                  ],
              },
              variants: {
                  create: [
                      {
                          // must look like a cuid for Zod: starts with c/C, >=9 chars, no spaces/hyphens
                          id: "cvariant01",
                          sku: "SKU-BLUE-M",
                          price: new Prisma.Decimal(50),
                          stock: 10,
                          // IMPORTANT: connect by relation, not raw sizeId, to avoid nested-create input issues
                          size: { connect: { id: "s1" } },
                      },
                  ],
              },
              skuBase: ""
          },
        ],
      },
    },
  });
}

/** Create a single order request with a deterministic id (“or1”) against the seeded variant */
export async function seedOrders() {
  // Ensure catalog exists (needed variant id cvariant01)
  const v = await prisma.productVariant.findUnique({ where: { id: "cvariant01" } });
  if (!v) {
    await seedCatalog();
  }

  await prisma.orderRequest.create({
    data: {
      id: "or1",
      variantId: "cvariant01",
      quantity: 2,
      customerName: "Jane",
      phone: "123456789",
      status: "NEW",
      source: "test",
    },
  });
}
