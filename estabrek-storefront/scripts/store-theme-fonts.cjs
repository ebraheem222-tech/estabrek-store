/**
 * Downloads theme fonts from Google Fonts (OFL) into public/fonts/themes, with each
 * family's licence beside it, and adds them to src/storeThemes/fonts.gen.ts (families
 * already listed there are kept as they are).
 *
 *   node scripts/store-theme-fonts.cjs "Amiri:400;700" "Reem Kufi:400..700"
 *
 * Only the arabic, hebrew and latin subsets are kept.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "fonts", "themes");
const GEN = path.join(ROOT, "src", "storeThemes", "fonts.gen.ts");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const SUBSETS = new Set(["arabic", "hebrew", "latin"]);

const slugOf = (family) => family.toLowerCase().replace(/\s+/g, "-");

async function get(url, binary) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

function readGen() {
  const text = fs.readFileSync(GEN, "utf8");
  const start = text.indexOf("= [") + 2;
  return { head: text.slice(0, start), list: JSON.parse(text.slice(start, text.lastIndexOf("]") + 1)) };
}

async function main() {
  const wanted = process.argv.slice(2);
  if (!wanted.length) throw new Error('Name families like "Amiri:400;700"');
  const { head, list } = readGen();
  for (const spec of wanted) {
    const [family, weights] = spec.split(":");
    const slug = slugOf(family);
    if (list.some((f) => f.slug === slug)) {
      console.log(`${family}: already there`);
      continue;
    }
    const css = await get(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${weights}&display=swap`);
    // Each block is preceded by a comment naming its subset.
    const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*{([^}]*)}/g)];
    const added = [];
    for (const [, subset, body] of blocks) {
      if (!SUBSETS.has(subset)) continue;
      const url = /src:\s*url\(([^)]+)\)/.exec(body)?.[1];
      const weight = /font-weight:\s*([^;]+);/.exec(body)?.[1].trim();
      const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1].trim();
      if (!url || !weight || !range) continue;
      const file = `${slug}-${subset}-${weight.replace(/\s+/g, "-")}.woff2`;
      fs.writeFileSync(path.join(OUT, file), await get(url, true));
      added.push({ slug, family, subset, weight, file: `/fonts/themes/${file}`, unicodeRange: range });
    }
    if (!added.length) throw new Error(`${family}: no arabic, hebrew or latin files`);
    const licence = await get(`https://raw.githubusercontent.com/google/fonts/main/ofl/${slug.replace(/-/g, "")}/OFL.txt`);
    fs.writeFileSync(path.join(OUT, `${slug}-OFL.txt`), licence);
    list.push(...added);
    console.log(`${family}: ${added.map((a) => `${a.subset} ${a.weight}`).join(", ")}`);
  }
  fs.writeFileSync(GEN, `${head}${JSON.stringify(list, null, 1)};\n`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
