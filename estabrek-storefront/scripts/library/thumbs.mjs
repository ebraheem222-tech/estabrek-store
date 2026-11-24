// The library's pictures for the admin (estabrek-admin/public/library/thumbs/<id>.webp, 480×300): a whole site's
// is its own cover (the Themes folder's Templates/src/covers), a section's is taken from the shop's preview of it
// (/en/lib-preview?item=<id>, its first screen at 1280×800). Pieces that already have a picture are skipped unless
// --all; --only=<id,id> takes just those.
//
//   node scripts/library/thumbs.mjs [shop address, default http://127.0.0.1:3970] [--all] [--only=a,b]
// (the shop must be running against the test API: npm run dev with tests/catalog-server.mjs).
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const SHOPURL = args.find((a) => /^https?:/.test(a)) ?? "http://127.0.0.1:3970";
const ALL = args.includes("--all");
const ONLY = (args.find((a) => a.startsWith("--only="))?.slice(7) ?? "").split(",").filter(Boolean);
const THEMES = path.resolve(process.env.THEMES_DIR || "C:/Users/Ibrah/Desktop/estabrek/Themes");
const SHOP = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const OUT = path.join(SHOP, "../estabrek-admin/public/library/thumbs");
fs.mkdirSync(OUT, { recursive: true });

const index = fs.readFileSync(path.join(SHOP, "src/library/index.gen.ts"), "utf8");
const items = [...index.matchAll(/^ (\{.*\}),$/gm)].map((m) => JSON.parse(m[1]));
const todo = items.filter((i) => (ONLY.length ? ONLY.includes(i.id) : ALL || !fs.existsSync(path.join(OUT, `${i.id}.webp`))));
console.log(`${todo.length} pictures to make`);

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "no-preference" });

/** A picture (png or jpg bytes) made 480×300 webp in the browser (its top part, filling the frame). */
async function toWebp(page, bytes, type) {
  const url = await page.evaluate(async ({ b64, type }) => {
    const img = new Image();
    img.src = `data:${type};base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 480;
    c.height = 300;
    const g = c.getContext("2d");
    const scale = Math.max(480 / img.width, 300 / img.height);
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, img.width * scale, img.height * scale);
    return c.toDataURL("image/webp", 0.8);
  }, { b64: Buffer.from(bytes).toString("base64"), type });
  return Buffer.from(url.split(",")[1], "base64");
}

const scratch = await ctx.newPage();
await scratch.goto("about:blank");
let done = 0, failed = [];
const work = async (page) => {
  for (;;) {
    const item = todo.shift();
    if (!item) return;
    try {
      let bytes;
      const cover = path.join(THEMES, "Templates/src/covers", `${item.id.replace(/^site-/, "")}.jpg`);
      if (item.kind === "site" && fs.existsSync(cover)) bytes = await toWebp(scratch, fs.readFileSync(cover), "image/jpeg");
      else {
        await page.goto(`${SHOPURL}/en/lib-preview?item=${item.id}`, { waitUntil: "load", timeout: 120_000 });
        await page.locator("[data-lib-ready]").waitFor({ timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
        await page.waitForTimeout(1800);
        // The piece itself, from the top of it (a short one is centred in the frame on its own background).
        const shot = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1280, height: 800 } });
        bytes = await toWebp(scratch, shot, "image/png");
      }
      fs.writeFileSync(path.join(OUT, `${item.id}.webp`), bytes);
    } catch (e) {
      failed.push(`${item.id}: ${String(e?.message ?? e).split("\n")[0]}`);
    }
    if (++done % 25 === 0) console.log(`${done} done`);
  }
};
const pages = await Promise.all(Array.from({ length: 4 }, () => ctx.newPage()));
await Promise.all(pages.map(work));
await browser.close();
console.log(`made ${done - failed.length}, failed ${failed.length}`);
for (const f of failed) console.log(`  ${f}`);
