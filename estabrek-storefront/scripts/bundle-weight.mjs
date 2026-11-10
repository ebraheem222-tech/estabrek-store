#!/usr/bin/env node
/**
 * What fills a browser bundle: its bytes by source file and by package, from its source map.
 *
 *   SOURCE_MAPS=1 npm run build
 *   node scripts/bundle-weight.mjs <chunk.js> [top=25]     e.g. .next/static/chunks/app/[lang]/layout-*.js
 *
 * Bytes are the minified code each source turned into (before gzip), so the largest lines are what to load
 * later or not at all.
 */
import { readFileSync } from "node:fs";

const [file, topArg] = process.argv.slice(2);
if (!file) { console.error("usage: node scripts/bundle-weight.mjs <chunk.js> [top]"); process.exit(2); }
const top = Number(topArg || 25);
const code = readFileSync(file, "utf8");
const map = JSON.parse(readFileSync(`${file}.map`, "utf8"));

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const val = Object.fromEntries([...B64].map((c, i) => [c, i]));
/** One segment's numbers (base64 VLQ). */
function decode(seg) {
  const out = [];
  let n = 0, shift = 0;
  for (const ch of seg) {
    const d = val[ch];
    n += (d & 31) << shift;
    if (d & 32) { shift += 5; continue; }
    out.push(n & 1 ? -(n >>> 1) : n >>> 1);
    n = 0; shift = 0;
  }
  return out;
}

const lines = code.split("\n");
const bySource = new Map();
let src = 0;
map.mappings.split(";").forEach((line, li) => {
  let col = 0;
  const segs = [];
  for (const seg of line.split(",")) {
    if (!seg) continue;
    const v = decode(seg);
    col += v[0];
    if (v.length > 1) src += v[1];
    segs.push([col, v.length > 1 ? src : -1]);
    // The source line/column and name fields are not needed here (their deltas only matter within them).
  }
  const len = (lines[li] ?? "").length;
  segs.forEach(([c, s], i) => {
    if (s < 0) return;
    const end = i + 1 < segs.length ? segs[i + 1][0] : len;
    bySource.set(s, (bySource.get(s) ?? 0) + Math.max(0, end - c));
  });
});

const name = (s) => String(map.sources[s] ?? "?").replace(/^webpack:\/\/_N_E\//, "").replace(/^\.\//, "");
const pkg = (p) => { const m = p.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/); return m ? m[1] : p.replace(/^src\//, "src/").split("/").slice(0, 3).join("/"); };
const total = code.length;
const groups = new Map();
for (const [s, n] of bySource) groups.set(pkg(name(s)), (groups.get(pkg(name(s))) ?? 0) + n);
const kb = (n) => `${(n / 1024).toFixed(1).padStart(7)} KB  ${((n / total) * 100).toFixed(1).padStart(5)}%`;
console.log(`${file}: ${(total / 1024).toFixed(0)} KB minified\n\nby package or folder:`);
for (const [g, n] of [...groups].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${kb(n)}  ${g}`);
console.log("\nby file:");
for (const [s, n] of [...bySource].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`${kb(n)}  ${name(s)}`);
