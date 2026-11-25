import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PAGE_TEMPLATES, PREMIUM_THEMES, buildTemplate, type ThemeKit } from "../../estabrek-admin/src/studio/templates/catalog";
import { LOOK_BY_KEY } from "../../estabrek-admin/src/studio/templates/dna";
import { TEMPLATES } from "../src/storeThemes/kits";
import { importDesign } from "../src/storeThemes/kits/importDesign";
import { bleedTree, type TreeNode } from "../src/pageTree/tree";
import { auditPage, layoutsOf, type Fault } from "./templateAudit";

/*
 * The whole premium themes' gate (plan 3.9b, estabrek-admin src/studio/templates/dna/themes.ts): a theme's page is
 * published on a store as the store's own design, with the theme's header and footer, and read whole at 1366 and
 * 390 px as tests/template-audit.spec.ts reads a store: the layout each tree asks for, words that read on what's
 * behind them, pictures that load, nothing wider than the screen, a header that's there with its parts apart, no
 * errors.
 *
 *   default        one theme of each mood, the page taking turns (home, about, contact) (CI)
 *   PREMIUM=all    every page of every theme
 *   PREMIUM_IDS=   chosen themes ("midnight,neon") or pages ("midnight:about")
 *   DNA_THEME=dark on a dark store theme instead of a light one
 *   DNA_LANG=en    in another language (ar by default)
 *   PREMIUM_OUT=dir  a picture of each page at each width, and report.json
 */
const API = "http://127.0.0.1:4100";
const OUT = process.env.PREMIUM_OUT || "";
const LANG = (process.env.DNA_LANG || "ar") as "ar" | "en" | "he";
const PARTS = ["home", "about", "contact"] as const;
type Part = (typeof PARTS)[number];
const WIDTHS = [{ name: "wide", width: 1366, height: 900 }, { name: "phone", width: 390, height: 844 }] as const;

function chosen(): Array<[ThemeKit, Part]> {
  const all = PREMIUM_THEMES.flatMap((kit) => PARTS.map((part): [ThemeKit, Part] => [kit, part]));
  if (process.env.PREMIUM_IDS) {
    const want = process.env.PREMIUM_IDS.split(",").map((s) => s.trim()).filter(Boolean);
    return all.filter(([kit, part]) => want.includes(kit.theme.key) || want.includes(`${kit.theme.key}:${part}`));
  }
  if (process.env.PREMIUM === "all") return all;
  // One theme of each mood, each on another page.
  const moods = new Set<string>();
  const picked: Array<[ThemeKit, Part]> = [];
  for (const kit of PREMIUM_THEMES) {
    const mood = LOOK_BY_KEY.get(kit.theme.look)?.mood ?? "";
    if (moods.has(mood)) continue;
    moods.add(mood);
    picked.push([kit, PARTS[picked.length % PARTS.length]]);
  }
  return picked;
}

/** A store's look to publish them on: a light theme's (or a dark one's), its colours and fonts. */
function storeTheme() {
  const dark = process.env.DNA_THEME === "dark";
  for (const t of TEMPLATES) {
    const d = importDesign(t.id);
    if (d && ((d.design.theme as { mode?: string }).mode === "dark") === dark) return d.design.theme;
  }
  throw new Error("no store theme to publish on");
}

const revalidate = (page: Page) => page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en", "/ar", "/he"] } });
const walk = (n: TreeNode, f: (n: TreeNode) => void) => { f(n); for (const k of n.children ?? []) walk(k, f); };
const tree = (children: TreeNode[]) => ({ version: 1 as const, root: { id: "page", type: "page", props: {}, children } as TreeNode });

test.setTimeout(240000);
test.afterAll(async ({ request }) => {
  if (process.env.PREMIUM_KEEP) return;
  await request.post(`${API}/__test/owned-design`, { data: {} });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en", "/ar", "/he"] } });
});

const reportFile = OUT ? path.join(OUT, "report.json") : "";
const readReport = (): Record<string, unknown> => {
  try { return JSON.parse(fs.readFileSync(reportFile, "utf8")); } catch { return {}; }
};

for (const [kit, part] of chosen()) {
  const name = `${kit.theme.key}:${part}`;
  test(`premium theme ${name} reads and fits whole on a store`, async ({ page }) => {
    // One counter for the three regions: their nodes share the page document.
    let n = 0;
    const opts = { ids: (p: string) => `pt-${p}-${n++}`, fam: "fashion" as const, lang: LANG, motion: "calm" as const };
    const id = (p: Part | "header" | "footer") => kit.parts.find((x) => x.part === p)!.id;
    const header = buildTemplate(id("header"), opts) as unknown as TreeNode[];
    const body = buildTemplate(id(part), opts) as unknown as TreeNode[];
    const footer = buildTemplate(id("footer"), opts) as unknown as TreeNode[];
    expect(header?.length && body?.length && footer?.length, name).toBeTruthy();
    const owner = new Map<string, string>();
    for (const [region, nodes] of [["header", header], [part, body], ["footer", footer]] as const) for (const s of nodes) walk(s, (x) => owner.set(x.id, `${region} ${s.name ?? s.id}`));
    const regions = { header: tree(header), footer: tree(footer) };
    const own = tree(body);
    const theme = storeTheme();
    const mode = (theme as { mode?: string }).mode === "dark" ? "dark" : "light";
    await page.request.post(`${API}/__test/owned-design`, {
      data: { name: "Nada Store", theme, mode, regions, page: { id: "owned-home", name: "Home", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: own } },
    });
    await revalidate(page);
    await page.addInitScript(() => { try { localStorage.setItem("seasonal_effects_last_seen", String(Date.now())); } catch {} });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const layouts = [regions.header.root, own.root, regions.footer.root].flatMap((root) => layoutsOf(root));
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
    const broken = new Set<string>();
    page.on("response", (r) => {
      if (["image", "media"].includes(r.request().resourceType()) && r.status() >= 400) broken.add(`${r.status()} ${decodeURIComponent(r.url()).replace(/^.*\/_next\/image\?url=/, "").slice(0, 160)}`);
    });

    const faults: Record<string, Fault[]> = {};
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w.width, height: w.height });
      await page.goto(`/${LANG}`, { waitUntil: "load" });
      // Now and then the page is drawn before the stand-in's new store reaches it: once more, after a refresh.
      const first = page.locator(`[data-tree-node="${body[0].id}"]`);
      try {
        await expect(first).toBeVisible({ timeout: 20000 });
      } catch {
        await revalidate(page);
        await page.goto(`/${LANG}`, { waitUntil: "load" });
        await expect(first).toBeVisible({ timeout: 60000 });
      }
      await expect(page.locator('[data-store-design-region="header"]')).toHaveCount(1);
      // The theme's sections spread over the whole screen: the page has no side margins.
      await expect(page.locator("main[data-page-wide]")).toHaveCount(1);
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
        scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle").catch(() => {});
      const found = await page.evaluate(auditPage, { layouts, wide: w.name === "wide" });
      for (const src of broken) found.push({ kind: "image", where: "page", detail: src });
      broken.clear();
      for (const f of [...found, ...errors.splice(0).map((e): Fault => ({ kind: "error", where: "page", detail: e }))]) {
        // The theme's whole store: its header, its page and its footer (the header's own checks name no node).
        const at = f.where.split(":")[1] ?? "";
        const who = owner.get(at) ?? (f.kind.startsWith("header") ? "header" : f.where === "page" ? "page" : null);
        if (!who) continue;
        (faults[`${who} ${w.name}`] ??= []).push(f);
      }
      if (OUT) {
        fs.mkdirSync(OUT, { recursive: true });
        await page.screenshot({ path: path.join(OUT, `${kit.theme.key}-${part}-${w.width}.jpg`), fullPage: true, type: "jpeg", quality: 64 }).catch(() => {});
      }
    }
    if (OUT) fs.writeFileSync(reportFile, JSON.stringify({ ...readReport(), [name]: faults }, null, 1));
    expect(faults).toEqual({});
  });
}

test("every premium theme names its parts, and its header and footer are made for a store's top and bottom", () => {
  for (const kit of PREMIUM_THEMES) {
    let n = 0;
    const opts = { ids: (p: string) => `x-${p}-${n++}`, fam: "fashion" as const, lang: LANG };
    const [header] = buildTemplate(kit.parts[3].id, opts) as unknown as TreeNode[];
    const [footer] = buildTemplate(kit.parts[4].id, opts) as unknown as TreeNode[];
    expect((header.props as { tag?: string }).tag, kit.theme.key).toBe("header");
    expect((footer.props as { tag?: string }).tag, kit.theme.key).toBe("footer");
  }
});

test("only a page with a section across the whole screen drops the store's side margins", () => {
  let n = 0;
  const opts = { ids: (p: string) => `y-${p}-${n++}`, fam: "fashion" as const, lang: LANG };
  const page = (id: string) => tree(buildTemplate(id, opts) as unknown as TreeNode[]);
  for (const kit of PREMIUM_THEMES.slice(0, 3)) expect(bleedTree(page(kit.parts[0].id)), kit.theme.key).toBe(true);
  // The other whole pages are drawn as before.
  for (const t of PAGE_TEMPLATES.filter((x) => !x.theme).slice(0, 12)) expect(bleedTree(page(t.id)), t.id).toBe(false);
  expect(bleedTree(null)).toBe(false);
  expect(bleedTree({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: { bleed: "yes" } }] } })).toBe(false);
});
