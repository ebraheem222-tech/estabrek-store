// Usage: node scripts/colour-audit.mjs  (BASE=http://127.0.0.1:3000 PAGES="/,/shop" OUT=report.json). Phase 1 of the plan: "pick any colour,
// every surface follows". Lists, per page, the saturated colours that stay the same under two very different picks.
// Colours that don't follow the shopper's pick: on each page, pick two very different colours one after the other
// and compare every visible element's colours (text, background, borders, SVG fill/stroke, gradients, shadows).
// A saturated colour that is the same under both picks is written into the design, not taken from the theme.
// BASE=… PAGES="/,/shop,…" OUT=file.json
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const base = process.env.BASE || "http://127.0.0.1:3000";
const pages = (process.env.PAGES || "/,/shop,/c/dresses,/p/-velvet,/search,/wishlist,/cart,/about,/contact,/account,/policies").split(",");
const picks = ["#1f7a8c", "#5a7d2a"];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const all = {};
for (const path of pages) {
  await page.goto(`${base}${path}`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1500);
  // Down the page in steps (lazy sections mount), then back to the top.
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 800) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(120); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  const scan = () => page.evaluate(() => {
    const out = [];
    const parse = (s) => {
      const list = [];
      const re = /rgba?\(([^)]+)\)|color\(srgb ([^)]+)\)/g;
      let m;
      while ((m = re.exec(s))) {
        const n = (m[1] || m[2]).split(/[\s,/]+/).filter(Boolean).map(Number);
        const scale = m[2] ? 255 : 1;
        const a = n.length > 3 ? n[3] : 1;
        list.push([Math.round(n[0] * scale), Math.round(n[1] * scale), Math.round(n[2] * scale), a]);
      }
      return list;
    };
    const key = (el) => {
      const cls = (el.className?.baseVal ?? el.className ?? "").toString().trim().split(/\s+/).filter((c) => c && !/^(lqip|transition|duration|ease)/.test(c)).slice(0, 2).join(".");
      const parent = el.parentElement;
      const pc = parent ? (parent.className?.baseVal ?? parent.className ?? "").toString().trim().split(/\s+/)[0] : "";
      return `${pc ? pc + " > " : ""}${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
    };
    const els = Array.from(document.querySelectorAll("body *"));
    els.forEach((el, i) => {
      if (/^(IMG|VIDEO|CANVAS|PICTURE|SOURCE|SCRIPT|STYLE|NOSCRIPT|IFRAME|BR)$/.test(el.tagName)) return;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const props = {};
      const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
      if (hasText) props.color = cs.color;
      props.background = cs.backgroundColor;
      if (parseFloat(cs.borderTopWidth) > 0) props.border = cs.borderTopColor;
      if (el instanceof SVGElement) { if (cs.fill && !cs.fill.startsWith("url") && cs.fill !== "none") props.fill = cs.fill; if (cs.stroke && cs.stroke !== "none" && !cs.stroke.startsWith("url")) props.stroke = cs.stroke; }
      if (cs.backgroundImage && cs.backgroundImage !== "none") props.gradient = cs.backgroundImage;
      if (cs.boxShadow && cs.boxShadow !== "none") props.shadow = cs.boxShadow;
      out.push([i, key(el), props]);
    });
    return out;
  });
  const results = [];
  for (const pick of picks) {
    await page.evaluate((c) => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: c })), pick);
    await page.waitForTimeout(1800);
    results.push(new Map((await scan()).map(([i, k, p]) => [i, [k, p]])));
  }
  const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min; const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0; let h = 0; if (d) { if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h = (h * 60 + 360) % 360; } return [h, s, l]; };
  const hex = ([r, g, b]) => "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  const parseNode = (s) => { const list = []; const re = /rgba?\(([^)]+)\)|color\(srgb ([^)]+)\)/g; let m; while ((m = re.exec(s || ""))) { const n = (m[1] || m[2]).split(/[\s,/]+/).filter(Boolean).map(Number); const sc = m[2] ? 255 : 1; list.push([Math.round(n[0] * sc), Math.round(n[1] * sc), Math.round(n[2] * sc), n.length > 3 ? n[3] : 1]); } return list; };
  const fixed = new Map();
  for (const [i, [k, pa]] of results[0]) {
    const other = results[1].get(i);
    if (!other) continue;
    const pb = other[1];
    for (const prop of Object.keys(pa)) {
      const ca = parseNode(pa[prop]), cb = parseNode(pb[prop]);
      ca.forEach((c, j) => {
        const d = cb[j];
        if (!d || c[3] < 0.15) return;
        const same = Math.abs(c[0] - d[0]) + Math.abs(c[1] - d[1]) + Math.abs(c[2] - d[2]) < 4;
        const [h, s, l] = hsl(c);
        if (!same || s < 0.22 || l < 0.12 || l > 0.94) return;
        const id = `${k} · ${prop} ${hex(c)}${c[3] < 1 ? ` (${Math.round(c[3] * 100)}%)` : ""}`;
        fixed.set(id, (fixed.get(id) || 0) + 1);
      });
    }
  }
  const list = [...fixed].sort((a, b) => b[1] - a[1]);
  all[path] = list;
  console.log(`\n== ${path}: ${list.length} fixed colours`);
  for (const [id, n] of list.slice(0, 25)) console.log(`   ${n}× ${id}`);
}
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(all, null, 1));
await browser.close();
