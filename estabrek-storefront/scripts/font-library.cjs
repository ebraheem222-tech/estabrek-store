// Builds the page tree's font library (src/pageTree/fontLibrary.gen.ts): the families of
// Google Fonts the editor offers beyond the store themes' own (public/fonts/themes). They
// load from Google's servers, only on a page that uses them. Pass Google's public list:
//
//   curl -o meta.json https://fonts.google.com/metadata/fonts
//   node scripts/font-library.cjs meta.json
//
// Every family for Arabic and Hebrew is taken (but a few named below), and the Latin ones listed.
const fs = require("node:fs");
const path = require("node:path");

const metaFile = process.argv[2];
if (!metaFile) throw new Error("Pass Google Fonts' metadata file (https://fonts.google.com/metadata/fonts)");
const meta = JSON.parse(fs.readFileSync(metaFile, "utf8").replace(/^\)\]\}'/, ""));

// Not offered: a brand family, Japanese ones that only add Hebrew, and the Quran's own.
const SKIP = new Set(["Google Sans", "Google Sans Code", "Google Sans Flex", "M PLUS 1p", "M PLUS Rounded 1c", "Amiri Quran", "Noto Nastaliq Urdu", "Cascadia Mono"]);
const LATIN = [
  // Plain
  "Inter", "Roboto", "Poppins", "Open Sans", "Lato", "Montserrat", "Nunito", "Nunito Sans", "Raleway", "Work Sans", "DM Sans", "Manrope",
  "Ubuntu", "Fira Sans", "Source Sans 3", "Cabin", "Karla", "Quicksand", "Mulish", "Asap", "Hind", "Barlow", "Barlow Condensed", "PT Sans",
  "Noto Sans", "Archivo", "Exo 2", "Space Grotesk", "Sora", "Plus Jakarta Sans", "Urbanist", "Outfit", "Public Sans", "Lexend", "Josefin Sans",
  "Figtree", "Onest", "Instrument Sans", "Bricolage Grotesque", "Syne", "Epilogue", "Red Hat Display", "Albert Sans", "Be Vietnam Pro", "Kanit",
  "Libre Franklin", "Roboto Condensed", "Jost", "Mona Sans",
  // Classic
  "Playfair Display", "Merriweather", "Lora", "PT Serif", "Crimson Text", "Libre Baskerville", "Cormorant Garamond", "EB Garamond", "Alegreya",
  "Bitter", "Domine", "Spectral", "Arvo", "Roboto Slab", "Zilla Slab", "Josefin Slab", "Vollkorn", "Prata", "Cinzel", "Noto Serif",
  "Source Serif 4", "Fraunces", "Bodoni Moda", "DM Serif Display", "Old Standard TT", "Cormorant", "Instrument Serif", "Young Serif", "Gloock",
  "Marcellus", "Italiana", "Gilda Display",
  // For headings
  "Bebas Neue", "Oswald", "Anton", "Archivo Black", "Alfa Slab One", "Bungee", "Bungee Shade", "Abril Fatface", "Passion One", "Righteous",
  "Baloo 2", "Luckiest Guy", "Rye", "Monoton", "Unbounded", "Chakra Petch", "Teko", "Orbitron", "Audiowide", "Rajdhani", "Press Start 2P",
  "Bowlby One", "Shrikhand", "Ultra", "Titan One", "Dela Gothic One", "Rubik Mono One",
  // Handwriting
  "Pacifico", "Lobster", "Dancing Script", "Great Vibes", "Satisfy", "Kaushan Script", "Caveat", "Permanent Marker", "Sacramento",
  "Parisienne", "Allura", "Alex Brush", "Shadows Into Light", "Indie Flower", "Amatic SC", "Yellowtail", "Courgette", "Cookie", "Tangerine",
  // Typewriter
  "JetBrains Mono", "Fira Code", "Source Code Pro", "IBM Plex Mono", "Inconsolata", "Space Mono", "Roboto Mono", "DM Mono", "Courier Prime",
];
const KIND = { "Sans Serif": "sans", Serif: "serif", Display: "display", Handwriting: "script", Monospace: "mono" };

const byName = new Map(meta.familyMetadataList.map((f) => [f.family, f]));
const wanted = new Set();
for (const f of meta.familyMetadataList) {
  if (SKIP.has(f.family)) continue;
  if (f.subsets.includes("arabic") || f.subsets.includes("hebrew")) wanted.add(f.family);
}
const missing = LATIN.filter((n) => !byName.has(n));
for (const n of LATIN) if (byName.has(n)) wanted.add(n);

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const out = [];
for (const name of [...wanted].sort()) {
  const f = byName.get(name);
  const kind = KIND[f.category] ?? "sans";
  const scripts = ["arabic", "hebrew", "latin"].filter((s) => f.subsets.includes(s));
  const styles = Object.keys(f.fonts);
  const upright = styles.filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
  const italic = styles.filter((k) => /^\d+i$/.test(k)).map((k) => Number(k.slice(0, -1))).sort((a, b) => a - b);
  const axis = (f.axes ?? []).find((a) => a.tag === "wght");
  const lo = axis ? axis.min : upright[0] ?? italic[0];
  const hi = axis ? axis.max : upright.at(-1) ?? italic.at(-1);
  // The family's ask to Google's css2: its weights as a range when it's variable, else each one.
  const plus = name.replace(/ /g, "+");
  let q;
  if (axis) {
    q = italic.length ? `${plus}:ital,wght@0,${lo}..${hi};1,${lo}..${hi}` : `${plus}:wght@${lo}..${hi}`;
  } else if (italic.length) {
    q = `${plus}:ital,wght@${[...upright.map((w) => `0,${w}`), ...italic.map((w) => `1,${w}`)].join(";")}`;
  } else {
    q = upright.length === 1 && upright[0] === 400 ? plus : `${plus}:wght@${upright.join(";")}`;
  }
  out.push({ slug: slug(name), name, kind, scripts, weights: [lo, hi], italic: italic.length > 0, q });
}

const file = path.join(__dirname, "..", "src", "pageTree", "fontLibrary.gen.ts");
fs.writeFileSync(
  file,
  `// The page tree's font library from Google Fonts (each family under its own open licence, OFL or Apache).
// Written by scripts/font-library.cjs; \`q\` is the family's ask to fonts.googleapis.com/css2.
export type LibraryFont = { slug: string; name: string; kind: "sans" | "serif" | "display" | "script" | "mono"; scripts: Array<"arabic" | "hebrew" | "latin">; weights: [number, number]; italic: boolean; q: string };
export const LIBRARY_FONTS: LibraryFont[] = [
${out.map((f) => `  ${JSON.stringify(f)},`).join("\n")}
];
`,
);
const count = (s) => out.filter((f) => f.scripts.includes(s)).length;
console.log(`${out.length} families (arabic ${count("arabic")}, hebrew ${count("hebrew")}, latin ${count("latin")})`);
if (missing.length) console.log("not on Google Fonts:", missing.join(", "));
