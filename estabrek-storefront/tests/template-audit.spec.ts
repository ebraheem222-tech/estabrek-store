import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { TEMPLATES } from "../src/storeThemes/kits";
import { importDesign } from "../src/storeThemes/kits/importDesign";
import type { TreeNode } from "../src/pageTree/tree";
import { auditPage, layoutsOf, type Fault } from "./templateAudit";

// A client's store drawn from a template (the setup's «متجرك»: the template's header, home and footer as the store's
// own design) must look as it does in the gallery. Each template here goes to the stand-in as a store's own design
// and is read at 1366 and 390 px: rows stay rows, words read on what's behind them, pictures load, nothing is wider
// than the screen, and the header is there with its parts apart (tests/templateAudit.ts).
//
// The few here run on every push. The wider sweep (each of the 34 source references, an edition of each covering
// every opening, one template of each category) runs by hand and photographs every page:
//   SHOP_PORT=3900 AUDIT=wide AUDIT_OUT=<folder> npx playwright test template-audit
// AUDIT=all reads all 2000; AUDIT_IDS=a,b reads those. AUDIT_LANG picks the language (ar by default).
const API = "http://127.0.0.1:4100";
const LANG = process.env.AUDIT_LANG || "ar";
const OUT = process.env.AUDIT_OUT || "";
// On every push: the ones whose faults were fixed (2026-11-20), with the template's own pictures only (no outside host):
// Liberty's phone header, Tale's name on its purple bar and its contact form, Lugx's newsletter on blue, Quantix's
// header and coral buttons, an edition's "pulse" opening (two details side by side).
const QUICK = ["reference-liberty-market", "reference-tale-seo-agency", "reference-lugx-gaming", "reference-quantix-saas", "edition-586-01"];

function chosen(): string[] {
  if (process.env.AUDIT_IDS) return process.env.AUDIT_IDS.split(",").map((s) => s.trim()).filter(Boolean);
  if (process.env.AUDIT === "all") return TEMPLATES.map((t) => t.id);
  if (process.env.AUDIT !== "wide") return QUICK.filter((id) => TEMPLATES.some((t) => t.id === id));
  const sources = TEMPLATES.filter((t) => t.source);
  const openings = new Map<string, number>();
  const editions = sources.map((s) => {
    const own = TEMPLATES.filter((t) => t.edition?.sourceId === s.id);
    const opening = (t: (typeof own)[number]) => t.tags[4] ?? "";
    const pick = [...own].sort((a, b) => (openings.get(opening(a)) ?? 0) - (openings.get(opening(b)) ?? 0))[0];
    if (pick) openings.set(opening(pick), (openings.get(opening(pick)) ?? 0) + 1);
    return pick?.id;
  });
  // One of each category, each in another of the 50 compositions (their headers, footers and openings differ).
  const categories = [...new Set(TEMPLATES.map((t) => t.category))].map((c, i) => {
    const own = TEMPLATES.filter((t) => t.category === c && !t.source && !t.edition);
    return own[(i * 7) % Math.max(1, own.length)]?.id;
  });
  return [...sources.map((s) => s.id), ...editions, ...categories].filter((id): id is string => Boolean(id));
}

// What the admin's setup («متجرك», estabrek-admin/src/features/setup/buildSetup.ts) does to a template before it
// saves it: the store's name for {{store.name}}, the name in the logo's place (no logo uploaded), and every menu
// replaced by the store's own (its first five categories, all products, contact): a fuller header than the gallery's.
const STORE = { ar: "متجر الندى", en: "Nada Store", he: "חנות נדה" };
const MENU = [
  ["حجابات", "Hijabs", "צעיפים", "/c/hijabs"], ["عبايات", "Abayas", "עבאיות", "/c/abayas"], ["فساتين", "Dresses", "שמלות", "/c/dresses"],
  ["أطقم", "Sets", "סטים", "/c/sets"], ["إكسسوارات", "Accessories", "אקססוריז", "/c/accessories"],
  ["كل المنتجات", "All products", "כל המוצרים", "/shop"], ["تواصل معنا", "Contact us", "צור קשר", "/contact"],
].map(([ar, en, he, href]) => ({ label: { ar, en, he }, href }));
function personalise(value: unknown, lang?: "ar" | "en" | "he"): unknown {
  if (typeof value === "string") return value.replaceAll("{{store.name}}", () => STORE[lang ?? "ar"]);
  if (Array.isArray(value)) return value.map((v) => personalise(v, lang));
  if (value && typeof value === "object") {
    const node = value as Record<string, unknown> & { props?: Record<string, unknown> };
    if (node.name === "Store logo") return { ...node, type: "button", props: { label: STORE, href: "/", variant: "link" } };
    if (node.type === "menu") return { ...node, props: { ...node.props, items: MENU } };
    return Object.fromEntries(Object.entries(node).map(([key, v]) => [key, personalise(v, ["ar", "en", "he"].includes(key) ? (key as "ar") : lang)]));
  }
  return value;
}
type Imported = NonNullable<ReturnType<typeof importDesign>>;
const asSetupMakesIt = ({ sections, design }: Imported) => ({
  page: personalise({ version: 1, root: { id: "page", type: "page", props: {}, children: sections } }) as { version: 1; root: TreeNode },
  header: personalise(design.header) as { version: 1; root: TreeNode },
  footer: personalise(design.footer) as { version: 1; root: TreeNode },
});

const WIDTHS = [{ name: "wide", width: 1366, height: 900 }, { name: "phone", width: 390, height: 844 }] as const;
const revalidate = (page: Page) => page.request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en", "/ar", "/he"] } });

// One after another (the stand-in holds one store), but each on its own: one template's faults don't stop the rest.
test.setTimeout(240000);

test.afterAll(async ({ request }) => {
  // AUDIT_KEEP=1 leaves the last template on the stand-in, to look at it by hand.
  if (process.env.AUDIT_KEEP) return;
  await request.post(`${API}/__test/owned-design`, { data: {} });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms", "cms:pages", "cms:settings", "cms:bootstrap"], paths: ["/", "/en", "/ar", "/he"] } });
});

// On disk too: after a template with faults Playwright starts a new worker, and the report goes on from the file.
const reportFile = OUT ? path.join(OUT, "report.json") : "";
const readReport = (): Record<string, Record<string, Fault[]>> => {
  try { return JSON.parse(fs.readFileSync(reportFile, "utf8")); } catch { return {}; }
};

for (const id of chosen()) {
  test(`${id} looks as it should on a store`, async ({ page }) => {
    const imported = importDesign(id);
    expect(imported, `template ${id}`).not.toBeNull();
    const own = asSetupMakesIt(imported!);
    const { design } = imported!;
    const mode = (design.theme as { mode?: string }).mode === "dark" ? "dark" : "light";
    await page.request.post(`${API}/__test/owned-design`, {
      data: { name: STORE.en, theme: design.theme, mode, regions: { header: own.header, footer: own.footer }, page: { id: "owned-home", name: "Home", slug: "/", status: "PUBLISHED", format: 2, sections: [], tree: own.page } },
    });
    await revalidate(page);
    const layouts = [own.header.root, own.page.root, own.footer.root].flatMap((root) => layoutsOf(root as TreeNode));
    // The shop's seasonal greeting (Black Friday, snow…) comes over any store once an hour: not the template's.
    await page.addInitScript(() => { try { localStorage.setItem("seasonal_effects_last_seen", String(Date.now())); } catch {} });

    const broken = new Set<string>();
    page.on("response", (r) => {
      if (["image", "media"].includes(r.request().resourceType()) && r.status() >= 400) broken.add(`${r.status()} ${decodeURIComponent(r.url()).replace(/^.*\/_next\/image\?url=/, "").slice(0, 160)}`);
    });
    page.on("requestfailed", (r) => {
      if (["image", "media"].includes(r.resourceType()) && !/ERR_ABORTED/.test(r.failure()?.errorText ?? "")) broken.add(`failed ${r.url().slice(0, 160)}`);
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
    await page.emulateMedia({ reducedMotion: "reduce" });

    const mine: Record<string, Fault[]> = {};
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w.width, height: w.height });
      await page.goto(`/${LANG}`, { waitUntil: "load" });
      await expect(page.locator('[data-store-design-region="header"]')).toHaveCount(1);
      // Down the page and back, so every lazy picture is asked for and every far section drawn once.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
        scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle").catch(() => {});
      const faults = await page.evaluate(auditPage, { layouts, wide: w.name === "wide" });
      const unloaded = await page.evaluate(() => Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0 && img.currentSrc && !img.closest("[hidden]")).map((img) => img.currentSrc.slice(0, 160)));
      for (const src of [...broken, ...unloaded]) faults.push({ kind: "image", where: "page", detail: src });
      broken.clear();
      for (const e of errors.splice(0)) faults.push({ kind: "error", where: "page", detail: e });
      mine[w.name] = faults;
      if (OUT) {
        fs.mkdirSync(OUT, { recursive: true });
        await page.screenshot({ path: path.join(OUT, `${id}-${w.width}.jpg`), fullPage: true, type: "jpeg", quality: 70 });
        fs.writeFileSync(reportFile, JSON.stringify({ ...readReport(), [id]: mine }, null, 1));
        // A close look at each part that was found wanting (named by its tree id), for the before/after sheet.
        // AUDIT_SHOOT=<css selector>: the parts it picks too (the first three), to see them after a fix.
        const asked = process.env.AUDIT_SHOOT ? await page.locator(process.env.AUDIT_SHOOT).evaluateAll((all) => all.slice(0, 3).map((el) => el.closest("[data-tree-node]")?.getAttribute("data-tree-node") ?? "")) : [];
        const parts = [...new Set([...faults.map((f) => f.where.split(":")[1]), ...asked].filter((n) => n && /^[a-z]+-[0-9a-z]+$/.test(n)))].slice(0, 8);
        for (const part of parts) {
          const el = page.locator(`[data-tree-node="${part}"]`).first();
          // (A part in a closed panel or a slide not shown isn't waited for.)
          if (!(await el.count()) || !(await el.isVisible())) continue;
          await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
          const box = await el.boundingBox();
          if (!box) continue;
          const x = Math.max(0, box.x - 24);
          const y = Math.max(0, box.y - 24);
          const clip = { x, y, width: Math.min(w.width - x, box.width + 48), height: Math.min(700, w.height - y, box.height + 48) };
          await page.screenshot({ path: path.join(OUT, `${id}-${w.width}-${part}.jpg`), clip, type: "jpeg", quality: 80 }).catch(() => {});
        }
      }
    }
    const all = Object.entries(mine).flatMap(([screen, list]) => list.map((f) => `${screen} ${f.kind} ${f.where}: ${f.detail}`));
    expect.soft(all, `${id}: what doesn't look right`).toEqual([]);
  });
}
