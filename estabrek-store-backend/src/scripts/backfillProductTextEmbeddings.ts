import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { indexProductTextEmbedding } from "../lib/productTextEmbeddings.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const force = String(process.env.PRODUCT_EMBED_FORCE ?? "").trim() === "1";
  const limitRaw = Number(process.env.PRODUCT_EMBED_BACKFILL_LIMIT ?? 0);
  const delayMs = Number(process.env.PRODUCT_EMBED_BACKFILL_DELAY_MS ?? 200);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : undefined;

  const products = await prisma.product.findMany({
    where: force ? {} : { embedding: { equals: Prisma.DbNull } },
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i]!;
    const res = await indexProductTextEmbedding(product.id, { force });
    if (res.ok) {
      if (res.updated) updated++;
      else skipped++;
      console.log(`[${i + 1}/${products.length}] ok ${product.id}`);
    } else {
      failed++;
      console.warn(`[${i + 1}/${products.length}] fail ${product.id}: ${res.error}`);
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
