import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { validateSectionData } from "../modules/admin/pageSectionData.schemas.js";

type Args = {
  dryRun: boolean;
  pageId?: string;
  onlyPublished: boolean;
};

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, onlyPublished: false };
  for (const raw of argv) {
    if (raw === "--dry" || raw === "--dryRun") a.dryRun = true;
    if (raw === "--onlyPublished") a.onlyPublished = true;
    if (raw.startsWith("--pageId=")) a.pageId = raw.split("=").slice(1).join("=");
  }
  return a;
}

function stableStringify(v: any) {
  // Good enough for a one-time normalization command.
  return JSON.stringify(v);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const wherePage = args.pageId
    ? { pageId: args.pageId }
    : args.onlyPublished
      ? { page: { status: "PUBLISHED" as const } }
      : {};

  const sections = await prisma.pageSection.findMany({
    where: wherePage as any,
    select: { id: true, pageId: true, type: true, data: true },
    orderBy: { updatedAt: "asc" },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const sec of sections) {
    try {
      const normalized = validateSectionData(sec.type as any, sec.data) as Prisma.InputJsonValue;

      const before = stableStringify(sec.data);
      const after = stableStringify(normalized);
      const changed = before !== after;

      if (!changed) {
        skipped++;
        continue;
      }

      if (!args.dryRun) {
        await prisma.pageSection.update({
          where: { id: sec.id },
          data: { data: normalized },
        });
      }

      updated++;
      console.log(`${args.dryRun ? "[DRY]" : "[OK]"} normalized section ${sec.id} (${sec.type})`);
    } catch (e: any) {
      failed++;
      console.error(`[FAIL] section ${sec.id} (${sec.type}): ${e?.message ?? e}`);
    }
  }

  console.log("\n--- CMS Normalize Summary ---");
  console.log(`Total:   ${sections.length}`);
  console.log(`Updated: ${updated}${args.dryRun ? " (dry-run)" : ""}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);

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
