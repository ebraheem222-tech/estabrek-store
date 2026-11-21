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
 *   DNA_THEME=dark   on a dark theme instead of a light one
 *   DNA_LANG=en  in another language (ar by default)
 *   DNA_OUT=dir  a picture of each design at each width, and report.json
 */
const API = "http://127.0.0.1:4100";
const OUT = process.env.DNA_OUT || "";
const LANG = (process.env.DNA_LANG || "ar") as "ar" | "en" | "he";
const PER_PAGE = 6;
const WIDTHS = [{ name: "wide", width: 1366, height: 900 }, { name: "phone", width: 390, height: 844 }] as const;

const designOf = (id: string) => id.split(":")[1];
const DNA_TEMPLATES = SECTION_TEMPLATES.filter((t) => t.layout);
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
      await expect(page.locator(`[data-tree-node="${sections[0].id}"]`)).toBeVisible({ timeout: 60000 });
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
      if (OUT) {
        fs.mkdirSync(OUT, { recursive: true });
        for (const [i, t] of batch.entries()) {
          const first = sections.find((s) => owner.get(s.id) === t.id);
          if (!first) continue;
          const el = page.locator(`[data-tree-node="${first.id}"]`);
          await el.scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(150);
          await el.screenshot({ path: path.join(OUT, `${String(at + i).padStart(3, "0")}-${t.id.slice(2).replace(":", "-")}-${w.width}.jpg`), type: "jpeg", quality: 72 }).catch(() => {});
        }
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
