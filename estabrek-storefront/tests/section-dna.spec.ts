import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { SECTION_TEMPLATES, buildTemplate } from "../../estabrek-admin/src/studio/templates/catalog";
import { TEMPLATES } from "../src/storeThemes/kits";
import { importDesign } from "../src/storeThemes/kits/importDesign";
import type { TreeNode } from "../src/pageTree/tree";
import { auditPage, layoutsOf, type Fault } from "./templateAudit";

/*
 * The section DNA's gate (estabrek-admin src/studio/templates/dna): its designs published on a store, a few to a page,
 * and checked as the template audit checks a store (tests/templateAudit.ts): the layout each tree asks for, words that
 * read on what's behind them, pictures that load, nothing wider than the screen, no errors; on a computer and a phone.
 *
 *   default      one design of each layout (CI)
 *   DNA=all      every design, in its first colour
 *   DNA_IDS=     chosen designs ("dna-hero-split-luxe,…")
 *   DNA_KIND=    only these kinds ("products,categories"), with DNA=all every design of them
 *   DNA_THEME=dark   on a dark theme instead of a light one
 *   DNA_LANG=en  in another language (ar by default)
 *   DNA_OUT=dir  a picture of each design at each width, and report.json
 *
 * And no two designs of a kind look alike (the gallery shows a kind at a time): each one's picture on a computer gets
 * a small fingerprint (a 256-bit difference hash of its grey picture), and two different designs of the same kind
 * whose fingerprints are this close fail the last test.
 */
const API = "http://127.0.0.1:4100";
const OUT = process.env.DNA_OUT || "";
const LANG = (process.env.DNA_LANG || "ar") as "ar" | "en" | "he";
const PER_PAGE = 6;
/** How close (bits out of 256) two different designs' fingerprints may come; the same design's colours may be closer. */
const ALIKE = 10;
const hashesFile = () => path.join(test.info().project.outputDir, "section-dna-hashes.json");
const readHashes = (): Record<string, string> => { try { return JSON.parse(fs.readFileSync(hashesFile(), "utf8")); } catch { return {}; } };
/** The fingerprint of a picture, worked out in the page (a 17×16 grey copy, each pixel against its neighbour). */
async function fingerprint(page: Page, png: Buffer): Promise<string> {
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const W = 17, H = 16, canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data, grey: number[] = [];
    for (let i = 0; i < W * H; i++) grey.push(d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114);
    let bits = "";
    for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) bits += grey[y * W + x] > grey[y * W + x + 1] ? "1" : "0";
    return bits;
  }, `data:image/png;base64,${png.toString("base64")}`);
}
const WIDTHS = [{ name: "wide", width: 1366, height: 900 }, { name: "phone", width: 390, height: 844 }] as const;

const designOf = (id: string) => id.split(":")[1];
const KINDS = process.env.DNA_KIND ? new Set(process.env.DNA_KIND.split(",").map((s) => s.trim())) : null;
const DNA_TEMPLATES = SECTION_TEMPLATES.filter((t) => t.layout && (!KINDS || KINDS.has(t.group)));
/** A design's kind, from its key ("dna-<kind>-<layout>-<look>"). */
const kindOf = (design: string) => design.split("-")[1];
function chosen() {
  if (process.env.DNA_IDS) {
    const want = new Set(process.env.DNA_IDS.split(",").map((s) => s.trim()));
    return DNA_TEMPLATES.filter((t) => want.has(designOf(t.id)) || want.has(t.id));
  }
  // Every design in every one of its colours.
  if (process.env.DNA === "all") return DNA_TEMPLATES;
  // One design of each layout, the layouts' colours taking turns.
  const seen = new Set<string>();
  let turn = 0;
  return DNA_TEMPLATES.filter((t) => {
    const k = `${t.group}:${t.layout}`;
    if (seen.has(k)) return false;
    const colours = DNA_TEMPLATES.filter((x) => designOf(x.id) === designOf(t.id));
    if (t !== colours[turn % colours.length]) return false;
    seen.add(k);
    turn++;
    return true;
  });
}

/** A store's look to publish them on: a light theme's design (or a dark one's), with its header and footer. */
function storeLook() {
  const dark = process.env.DNA_THEME === "dark";
  for (const t of TEMPLATES) {
    const d = importDesign(t.id);
    if (!d) continue;
    if (((d.design.theme as { mode?: string }).mode === "dark") === dark) return d.design;
  }
  throw new Error("no store design to publish on");
}

const revalidate = (page: Page) => page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en", "/ar", "/he"] } });
const walk = (n: TreeNode, f: (n: TreeNode) => void) => { f(n); for (const k of n.children ?? []) walk(k, f); };

test.setTimeout(300000);
test.afterAll(async ({ request }) => {
  if (process.env.DNA_KEEP) return;
  await request.post(`${API}/__test/owned-design`, { data: {} });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en", "/ar", "/he"] } });
});

const list = chosen();
for (let at = 0; at < list.length; at += PER_PAGE) {
  const batch = list.slice(at, at + PER_PAGE);
  test(`section DNA ${at + 1}–${at + batch.length} of ${list.length} read and fit on a store`, async ({ page }) => {
    const design = storeLook();
    const owner = new Map<string, string>();
    const sections = batch.flatMap((t, i) => {
      let n = 0;
      const built = buildTemplate(t.id, { ids: (p) => `d${at + i}-${p}-${n++}`, fam: "fashion", lang: LANG, motion: "calm" }) as unknown as TreeNode[];
      expect(built?.length, t.id).toBeTruthy();
      for (const s of built) walk(s, (x) => owner.set(x.id, t.id));
      return built;
    });
    const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: sections } as TreeNode };
    const mode = (design.theme as { mode?: string }).mode === "dark" ? "dark" : "light";
    await page.request.post(`${API}/__test/owned-design`, {
      data: { name: "Nada Store", theme: design.theme, mode, regions: { header: design.header, footer: design.footer }, page: { id: "owned-home", name: "Home", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree } },
    });
    await revalidate(page);
    await page.addInitScript(() => { try { localStorage.setItem("seasonal_effects_last_seen", String(Date.now())); } catch {} });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
    const layouts = layoutsOf(tree.root);

    const faults: Record<string, Fault[]> = {};
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w.width, height: w.height });
      await page.goto(`/${LANG}`, { waitUntil: "load" });
      // Now and then the page is drawn before the stand-in's new store reaches it: once more, after a refresh.
      const first = page.locator(`[data-tree-node="${sections[0].id}"]`);
      try {
        await expect(first).toBeVisible({ timeout: 20000 });
      } catch {
        await revalidate(page);
        await page.goto(`/${LANG}`, { waitUntil: "load" });
        await expect(first).toBeVisible({ timeout: 60000 });
      }
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
        scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle").catch(() => {});
      const found = await page.evaluate(auditPage, { layouts, wide: w.name === "wide" });
      for (const f of [...found, ...errors.splice(0).map((e): Fault => ({ kind: "error", where: "page", detail: e }))]) {
        // Only what is in these sections (the store's header and footer have their own audit).
        const id = f.where.split(":")[1] ?? "";
        const who = owner.get(id) ?? (f.kind === "error" ? "page" : null);
        if (!who) continue;
        (faults[`${who} ${w.name}`] ??= []).push(f);
      }
      if (OUT) fs.mkdirSync(OUT, { recursive: true });
      const prints: Record<string, string> = {};
      for (const [i, t] of batch.entries()) {
        const first = sections.find((s) => owner.get(s.id) === t.id);
        if (!first) continue;
        const el = page.locator(`[data-tree-node="${first.id}"]`);
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(150);
        const png = await el.screenshot().catch(() => null);
        if (png && w.name === "wide") prints[t.id] = await fingerprint(page, png);
        if (OUT) await el.screenshot({ path: path.join(OUT, `${String(at + i).padStart(3, "0")}-${t.id.slice(2).replace(":", "-")}-${w.width}.jpg`), type: "jpeg", quality: 72 }).catch(() => {});
      }
      if (Object.keys(prints).length) {
        fs.mkdirSync(path.dirname(hashesFile()), { recursive: true });
        fs.writeFileSync(hashesFile(), JSON.stringify({ ...readHashes(), ...prints }));
      }
    }
    if (OUT) {
      const file = path.join(OUT, "report.json");
      let all: Record<string, unknown> = {};
      try { all = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
      fs.writeFileSync(file, JSON.stringify({ ...all, ...faults }, null, 1));
    }
    expect(faults).toEqual({});
  });
}

test("no two designs of a kind look alike", () => {
  const prints = readHashes();
  const ids = Object.keys(prints);
  test.skip(ids.length < 2, "the designs' pictures weren't taken in this run");
  const alike: string[] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    if (designOf(ids[i]) === designOf(ids[j]) || kindOf(designOf(ids[i])) !== kindOf(designOf(ids[j]))) continue;
    let d = 0;
    for (let k = 0; k < prints[ids[i]].length; k++) if (prints[ids[i]][k] !== prints[ids[j]][k]) d++;
    if (d <= ALIKE) alike.push(`${designOf(ids[i])} ~ ${designOf(ids[j])} (${d})`);
  }
  expect(alike).toEqual([]);
});
