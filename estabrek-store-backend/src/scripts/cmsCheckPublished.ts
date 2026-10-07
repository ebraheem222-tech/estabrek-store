import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma.js";
import { getPublishIssuesForSection, validateSectionData } from "../modules/admin/pageSectionData.schemas.js";

async function main() {
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      name: true,
      sections: { where: { isVisible: true }, select: { id: true, type: true, data: true }, orderBy: { order: "asc" } },
    },
    orderBy: { slug: "asc" },
  });

  let badPages = 0;
  for (const p of pages) {
    const issues: Array<{ sectionId: string; message: string }> = [];
    for (const sec of p.sections) {
      const data = validateSectionData(sec.type as any, sec.data);
      for (const i of getPublishIssuesForSection(sec.type as any, data)) {
        issues.push({ sectionId: sec.id, message: i.message });
      }
    }

    if (issues.length > 0) {
      badPages++;
      console.log(`\n[PAGE] ${p.slug} (${p.name})`);
      for (const i of issues) console.log(`  - ${i.message} (section ${i.sectionId})`);
    }
  }

  console.log(`\nDone. Published pages with issues: ${badPages}/${pages.length}`);
  await prisma.$disconnect();
  if (badPages > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
