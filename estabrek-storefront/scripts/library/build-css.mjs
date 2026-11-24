// The library's styles for the shop (src/library/lib.css), made once by machine from the converted files
// (convert.mjs): Tailwind 4 (the library's own, from the Themes folder) builds exactly the classes they use, then
//   - everything is kept inside an item's wrapper (.lx-scope): its resets, its variables, its classes, so none of
//     it reaches the shop's own pages (the shop is on Tailwind 3), and the shop's rules don't reach in unasked;
//   - the cascade layers are taken off (the shop's styles have none, and would otherwise always win);
//   - its animations are named lx-… (the shop has an "aurora" and a "blink" of its own);
//   - each colour written in a class ([#c8a75d]) becomes a variable the item's wrapper may set, as cv() does in code.
// Tailwind's colour families are variables already (--color-stone-500…): the wrapper sets those too (LibBlock).
//
//   node scripts/library/build-css.mjs [path to the Themes folder]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import postcss from "postcss";
import { ITEMS, KEYFRAMES } from "./items.mjs";

const THEMES = path.resolve(process.argv[2] || process.env.THEMES_DIR || "C:/Users/Ibrah/Desktop/estabrek/Themes");
const SHOP = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const OUT = path.join(SHOP, "src/library");
const req = createRequire(path.join(THEMES, "package.json"));
const { compile } = await import(pathToFileURL(req.resolve("@tailwindcss/node")).href);
const { Scanner } = await import(pathToFileURL(req.resolve("@tailwindcss/oxide")).href);

// Each folder's own styles (its fonts, animations and a few classes), once, after a single Tailwind.
const folders = [...new Set(ITEMS.map((i) => i.file.split("/")[0]))];
const own = folders
  .map((f) => path.join(THEMES, f, "src/index.css"))
  .filter((f) => fs.existsSync(f))
  .map((f) => fs.readFileSync(f, "utf8").replace(/@import\s+["']tailwindcss["'];?/g, ""));
const input = `@import "tailwindcss";\n${[...new Set(own)].join("\n")}`;

const compiler = await compile(input, { base: THEMES, onDependency: () => {} });
const scanner = new Scanner({ sources: [{ base: OUT, pattern: "**/*.tsx", negated: false }] });
const built = compiler.build(scanner.scan());

const KF = new RegExp(`(^|[^\\w-])(${KEYFRAMES.map((k) => k.replace(/-/g, "\\-")).join("|")})(?![\\w-])`, "g");
const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const hexKey = (h) => {
  const x = h.slice(1).toLowerCase();
  return x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
};
const SCOPE = ".lx-scope";
/** A selector list's selectors: split at its own commas, never at an escaped one (\,) or one in brackets. */
function splitSelectors(sel) {
  const out = [];
  let depth = 0, cur = "";
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === "\\") { cur += c + (sel[i + 1] ?? ""); i++; continue; }
    if (c === "(" || c === "[") depth++;
    if (c === ")" || c === "]") depth--;
    if (c === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}
const scopeSelector = (sel) =>
  splitSelectors(sel)
    .map((s) => s.trim())
    .map((s) => {
      if (/^(:root|:host|html|body)$/.test(s) || /^(:root|html),?\s*:host$/.test(s)) return SCOPE;
      if (/^(html|:host)\s+/.test(s)) return s.replace(/^(html|:host)\s+/, `${SCOPE} `);
      return `${SCOPE} ${s}`;
    })
    .filter((s, i, all) => all.indexOf(s) === i)
    .join(", ");

const scoped = await postcss([
  {
    postcssPlugin: "library-scope",
    Once(root) {
      // No cascade layers: their rules, in their order, as plain rules.
      root.walkAtRules("layer", (at) => {
        if (at.nodes) at.replaceWith(at.nodes);
        else at.remove();
      });
      root.walkAtRules("keyframes", (at) => {
        if (KEYFRAMES.includes(at.params)) at.params = `lx-${at.params}`;
      });
      root.walkRules((rule) => {
        let p = rule.parent;
        while (p) {
          if (p.type === "atrule" && /keyframes/.test(p.name)) return;
          p = p.parent;
        }
        rule.selector = scopeSelector(rule.selector);
      });
      root.walkDecls((d) => {
        let p = d.parent;
        while (p) {
          if (p.type === "atrule" && p.name === "property") return;
          p = p.parent;
        }
        if (/^(animation|animation-name)$/.test(d.prop) || d.prop.startsWith("--animate")) d.value = d.value.replace(KF, (_m, pre, name) => `${pre}lx-${name}`);
        if (HEX.test(d.value) && !/url\(/.test(d.value)) d.value = d.value.replace(HEX, (h) => `var(--lx-${hexKey(h)}, ${h})`);
        HEX.lastIndex = 0;
      });
    },
  },
]).process(built, { from: undefined });

const header = `/* The owner's theme library's styles, scoped to .lx-scope (made by scripts/library/build-css.mjs: do not edit). */\n`;
fs.writeFileSync(path.join(OUT, "lib.css"), header + scoped.css);
console.log(`lib.css: ${(Buffer.byteLength(scoped.css) / 1024).toFixed(0)} KB`);
