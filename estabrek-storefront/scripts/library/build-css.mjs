// The library's styles for the shop, made once by machine from the converted files (convert.mjs) with Tailwind 4
// (the library's own, from the Themes folder), in two parts:
//   - public/library/lib.css: what every piece needs (Tailwind's resets, the theme's values, the folders' own
//     animations and classes), loaded once on a page that shows any piece (LibBlock);
//   - public/library/css/<file>.css: the classes one piece file uses (with what it imports), kept to that file's
//     pieces (.lx-f-<file>, on the piece's wrapper), loaded with its pieces. A page showing one
//     piece never downloads the classes of the other thousand.
// Everything stays inside a piece's wrapper (.lx-scope), so none of it reaches the shop's own pages (on Tailwind 3)
// and the shop's rules don't reach in unasked; the cascade layers are taken off (the shop's styles have none);
// its animations are named lx-… (the shop has an "aurora" and a "blink" of its own); each colour written in a
// class ([#c8a75d]) becomes a variable the piece's wrapper may set, as cv() does in code. Tailwind's colour
// families are variables already (--color-stone-500…): the wrapper sets those too (LibBlock). Every size of words
// that isn't its parent's (px, rem, Tailwind's text-…) is times --lx-ts: the owner's size for the piece's words.
//
//   node scripts/library/build-css.mjs [path to the Themes folder]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import postcss from "postcss";
import { keyframesOf, stylesheetsOf } from "./registry.mjs";

const THEMES = path.resolve(process.argv[2] || process.env.THEMES_DIR || "C:/Users/Ibrah/Desktop/estabrek/Themes");
const SHOP = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const OUT = path.join(SHOP, "library-src");
const PUB = path.join(SHOP, "public/library");
fs.mkdirSync(PUB, { recursive: true });
const req = createRequire(path.join(THEMES, "package.json"));
const { compile } = await import(pathToFileURL(req.resolve("@tailwindcss/node")).href);
const { Scanner } = await import(pathToFileURL(req.resolve("@tailwindcss/oxide")).href);
const KEYFRAMES = keyframesOf(THEMES);

// Each folder's own styles (its fonts, animations and a few classes), once each, after a single Tailwind.
const own = stylesheetsOf(THEMES).map((f) => fs.readFileSync(f, "utf8").replace(/@import\s+["']tailwindcss["'];?/g, ""));
const input = `@import "tailwindcss";\n${[...new Set(own)].join("\n")}`;

const KF = new RegExp(`(^|[^\\w-])(${KEYFRAMES.map((k) => k.replace(/-/g, "\\-")).join("|")})(?![\\w-])`, "g");
const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
/** A size of words of its own (not its parent's: no %, no em, no keyword): the owner's size multiplies it. */
const ownSize = (v) => !/%|\d(\.\d+)?em\b|\b(inherit|initial|unset|revert|smaller|larger|medium|small|large)\b|--lx-ts/.test(v) && /\d(\.\d+)?(px|rem|vw|vh|vmin|vmax|svh|dvh|lvh|cqw|cqi|pt)\b|var\(--text-/.test(v);
const hexKey = (h) => {
  const x = h.slice(1).toLowerCase();
  return x.length === 3 ? x.split("").map((c) => c + c).join("") : x;
};
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
/** A rule's selectors kept inside `scope`; the page itself (:root, html, body) is `page` (the piece's wrapper). */
const scopeSelector = (sel, scope, page = ".lx-scope") =>
  splitSelectors(sel)
    .map((s) => s.trim())
    .map((s) => {
      if (/^(:root|:host|html|body)$/.test(s) || /^(:root|html),?\s*:host$/.test(s)) return page;
      if (/^(html|:host)\s+/.test(s)) return s.replace(/^(html|:host)\s+/, `${scope} `);
      return `${scope} ${s}`;
    })
    .filter((s, i, all) => all.indexOf(s) === i)
    .join(", ");

/**
 * The library's rules made the shop's: scoped, unlayered, animations and colours renamed.
 * - "base" (lib.css, every piece): Tailwind's resets and theme values, the animations and @property rules;
 * - "file" (css/<file>.css): the file's utilities, and its folder's own page rules (its body's colours and font,
 *   its selection, its classes) kept to its pieces: the page itself is the wrapper (.lx-scope.lx-f-<file>).
 */
const shopRules = (scope, part, page = ".lx-scope") => ({
  postcssPlugin: "library-scope",
  Once(root) {
    const kept = new Set(["keyframes", "property", "font-face"]);
    for (const n of [...root.nodes]) {
      if (n.type === "atrule" && n.name === "layer") {
        const name = n.params.trim();
        if (!n.nodes || (part === "file") !== (name === "utilities")) n.remove();
        else n.replaceWith(n.nodes);
      } else if (n.type === "atrule" && kept.has(n.name)) {
        if (part === "file") n.remove();
      } else if (part === "base" && n.type !== "comment") {
        // A folder's own page rules: each piece gets its own folder's (in its file's styles).
        n.remove();
      }
    }
    root.walkAtRules("keyframes", (at) => {
      if (KEYFRAMES.includes(at.params)) at.params = `lx-${at.params}`;
    });
    root.walkRules((rule) => {
      let p = rule.parent;
      while (p) {
        if (p.type === "atrule" && /keyframes/.test(p.name)) return;
        p = p.parent;
      }
      rule.selector = scopeSelector(rule.selector, scope, page);
    });
    root.walkDecls((d) => {
      let p = d.parent;
      while (p) {
        if (p.type === "atrule" && p.name === "property") return;
        p = p.parent;
      }
      if (/^(animation|animation-name)$/.test(d.prop) || d.prop.startsWith("--animate")) d.value = d.value.replace(KF, (_m, pre, name) => `${pre}lx-${name}`);
      if (HEX.test(d.value) && !/url\(/.test(d.value)) d.value = d.value.replace(HEX, (h) => `var(--lx-${hexKey(h)}, ${h})`);
      if (d.prop === "font-size" && ownSize(d.value)) d.value = `calc(${d.value} * var(--lx-ts, 1))`;
      HEX.lastIndex = 0;
    });
  },
});

const scan = (sources) => new Scanner({ sources }).scan();
const GEN = "made by scripts/library/build-css.mjs: do not edit";

// What every piece needs: the whole library's resets, theme values and animations.
const all = (await compile(input, { base: THEMES, onDependency: () => {} })).build(scan([{ base: OUT, pattern: "**/*.tsx", negated: false }]));
const base = await postcss([shopRules(".lx-scope", "base")]).process(all, { from: undefined });
fs.writeFileSync(path.join(PUB, "lib.css"), `/* The owner's theme library's shared styles, scoped to .lx-scope (${GEN}). */\n${base.css}`);

// Each piece file's own classes (the file an entry takes its piece from, with the library files it imports).
const importsOf = (file) => {
  const out = [];
  for (const m of fs.readFileSync(file, "utf8").matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)) {
    const dep = path.resolve(path.dirname(file), m[1]) + ".tsx";
    if (fs.existsSync(dep) && !dep.endsWith(`${path.sep}runtime.tsx`)) out.push(dep);
  }
  return out;
};
const closure = (file) => {
  const seen = new Set();
  const walk = (f) => { if (seen.has(f)) return; seen.add(f); importsOf(f).forEach(walk); };
  walk(file);
  return [...seen];
};
export const fileKey = (file) => path.relative(OUT, file).replace(/\.tsx$/, "").split(path.sep).join("-").toLowerCase().replace(/[^a-z0-9-]/g, "-");

fs.rmSync(path.join(PUB, "css"), { recursive: true, force: true });
fs.mkdirSync(path.join(PUB, "css"), { recursive: true });
const pieceFiles = new Set();
for (const e of fs.readdirSync(path.join(OUT, "entries"))) {
  const m = /from "\.\.\/([^"]+)"/.exec(fs.readFileSync(path.join(OUT, "entries", e), "utf8"));
  if (m) pieceFiles.add(path.join(OUT, `${m[1]}.tsx`));
}
let total = 0, biggest = 0;
for (const file of pieceFiles) {
  const key = fileKey(file);
  const files = closure(file);
  // Built with its own folder's stylesheet (its page's colours and font, its theme), as the library builds it.
  const folder = path.relative(OUT, file).split(path.sep)[0];
  const sheets = stylesheetsOf(THEMES).filter((f) => path.relative(THEMES, f).split(path.sep)[0].toLowerCase() === folder);
  if (!sheets.length) throw new Error(`no stylesheet for ${folder}`);
  const ownInput = `@import "tailwindcss";\n${sheets.map((f) => fs.readFileSync(f, "utf8").replace(/@import\s+["']tailwindcss["'];?/g, "")).join("\n")}`;
  const built = (await compile(ownInput, { base: THEMES, onDependency: () => {} })).build(scan(files.map((f) => ({ base: path.dirname(f), pattern: path.basename(f), negated: false }))));
  const css = (await postcss([shopRules(`.lx-f-${key}`, "file", `.lx-scope.lx-f-${key}`)]).process(built, { from: undefined })).css;
  fs.writeFileSync(path.join(PUB, "css", `${key}.css`), `/* ${path.relative(OUT, file).split(path.sep).join("/")}'s classes (${GEN}). */\n${css}`);
  total += css.length;
  biggest = Math.max(biggest, css.length);
}
console.log(`lib.css: ${(Buffer.byteLength(base.css) / 1024).toFixed(0)} KB; ${pieceFiles.size} piece files: ${(total / 1024).toFixed(0)} KB in all, the biggest ${(biggest / 1024).toFixed(0)} KB`);
