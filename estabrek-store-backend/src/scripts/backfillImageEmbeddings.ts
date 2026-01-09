import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma.js";
import { indexProductImageEmbedding } from "../lib/productImageEmbeddings.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const force = String(process.env.IMAGE_EMBED_FORCE ?? "").trim() === "1";
  const limitRaw = Number(process.env.IMAGE_EMBED_BACKFILL_LIMIT ?? 0);
  const delayMs = Number(process.env.IMAGE_EMBED_BACKFILL_DELAY_MS ?? 200);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : undefined;

  const images = await prisma.productItemImage.findMany({
    where: force ? {} : { embedding: null },
    select: { id: true, url: true },
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i]!;
    const res = await indexProductImageEmbedding(img.id, { force });
    if (res.ok) {
      if (res.updated) updated++;
      else skipped++;
      console.log(`[${i + 1}/${images.length}] ok ${img.id}`);
    } else {
      failed++;
      console.warn(`[${i + 1}/${images.length}] fail ${img.id}: ${res.error}`);
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
