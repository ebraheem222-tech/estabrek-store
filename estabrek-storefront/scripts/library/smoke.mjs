// Every piece of the library opened once in the shop (/en/lib-preview?item=<id>): it must show (its wrapper marked
// data-lib-ready, something drawn inside) with no error on the page. Prints the ones that don't.
//
//   node scripts/library/smoke.mjs [shop address, default http://127.0.0.1:3970] [--kind=site] [--only=a,b]
// (the shop must be running against the test API: npm run dev with tests/catalog-server.mjs).
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const SHOPURL = args.find((a) => /^https?:/.test(a)) ?? "http://127.0.0.1:3970";
const KIND = args.find((a) => a.startsWith("--kind="))?.slice(7);
const ONLY = (args.find((a) => a.startsWith("--only="))?.slice(7) ?? "").split(",").filter(Boolean);
const SHOP = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const index = fs.readFileSync(path.join(SHOP, "src/library/index.gen.ts"), "utf8");
const todo = [...index.matchAll(/^ (\{.*\}),$/gm)].map((m) => JSON.parse(m[1])).filter((i) => (ONLY.length ? ONLY.includes(i.id) : !KIND || i.kind === KIND));
console.log(`${todo.length} pieces to try`);

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "no-preference" });
const bad = [];
let done = 0;
const work = async (page) => {
  let errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).split("\n")[0]));
  for (;;) {
    const item = todo.shift();
    if (!item) return;
    errors = [];
    try {
      await page.goto(`${SHOPURL}/en/lib-preview?item=${item.id}`, { waitUntil: "load", timeout: 120_000 });
      await page.locator("[data-lib-ready]").waitFor({ timeout: 45_000 });
      await page.waitForTimeout(1200);
      const drawn = await page.evaluate(() => {
        const el = document.querySelector("[data-lib-ready]");
        return el ? Math.round(el.getBoundingClientRect().height) : 0;
      });
      if (drawn < 40) errors.push(`only ${drawn}px tall`);
    } catch (e) {
      errors.push(String(e?.message ?? e).split("\n")[0]);
    }
    if (errors.length) bad.push(`${item.id}: ${[...new Set(errors)].join(" | ").slice(0, 300)}`);
    if (++done % 50 === 0) console.log(`${done} tried, ${bad.length} with problems`);
  }
};
await Promise.all(Array.from({ length: 4 }, () => ctx.newPage()).map(async (p) => work(await p)));
await browser.close();
console.log(`tried ${done}: ${bad.length} with problems`);
for (const b of bad) console.log(`  ${b}`);
