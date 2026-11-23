import { describe, test, expect, beforeAll } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readTemplate, planInstall, type Template } from "../lib/featureTemplate.js";
import { expandLists, rowMatches, type CollectionLite, type ItemLite } from "../lib/collectionTree.js";

// The whole sites (stage 4, item 3): the admin builds each one from the section library
// (estabrek-admin src/studio/templates/sites) as a feature template, in the browser. This
// reads the same files: every site, built in each language, must read as a template, plan
// its install with no problem (its trees pass checkTree, its ready rows pass their tables'
// fields), and its lists must name its own tables.

type Site = { key: string; version: string };
type Sites = { SITES: Site[]; siteFile: (key: string, o: { lang: "ar" | "en" | "he"; motion?: "calm" | "rich" }) => unknown; siteByKey: (key: string) => unknown; buildChosen: (bp: unknown, c: unknown, lang: "ar" | "en" | "he") => Record<string, unknown> };

const SITES_FILE = path.resolve(__dirname, "../../../estabrek-admin/src/studio/templates/sites/index.ts");
let sites: Sites;
beforeAll(async () => {
  sites = (await import(pathToFileURL(SITES_FILE).href)) as Sites;
});

const none = () => ({ tables: new Set<string>(), pages: new Set<string>(), calls: new Set<string>(), routes: new Set<string>() });
let n = 0;
const ids = () => `c${(n++).toString(16).padStart(24, "0")}`;

describe("A site as its install wizard chose it", () => {
  test("its file carries the choices (kept for its upgrades) and every site still plans with them; choices out of shape are refused", () => {
    const choices = { biz: { name: { ar: "أبو سمير", en: "Abu Samir", he: "אבו סמיר" }, phone: "050-123-4567" }, modules: ["story", "reviews", "contact", "notify"], look: 3, motion: "rich" };
    for (const s of sites.SITES) {
      const read = readTemplate(sites.buildChosen(sites.siteByKey(s.key), choices, "ar"));
      if (!read.ok) throw new Error(`${s.key}: ${JSON.stringify(read.problems.slice(0, 3))}`);
      expect(read.template.site).toEqual(choices);
      expect(planInstall(read.template, none(), ids).problems, s.key).toEqual([]);
    }
    const file = sites.buildChosen(sites.siteByKey(sites.SITES[0].key), choices, "ar");
    for (const site of [{ ...choices, colour: "red" }, { ...choices, look: -1 }, { ...choices, motion: "wild" }, { ...choices, biz: { phone: "x".repeat(41) } }]) expect(readTemplate({ ...file, site }).ok, JSON.stringify(site).slice(0, 60)).toBe(false);
  });
});

describe("Whole sites", () => {
  test("every site reads as a template and plans its install with no problem, in every language and motion", () => {
    expect(sites.SITES.length).toBeGreaterThan(0);
    const keys = new Set<string>();
    for (const s of sites.SITES) {
      expect(keys.has(s.key), s.key).toBe(false);
      keys.add(s.key);
      for (const lang of ["ar", "en", "he"] as const)
        for (const motion of ["calm", "rich"] as const) {
          const read = readTemplate(sites.siteFile(s.key, { lang, motion }));
          if (!read.ok) throw new Error(`${s.key} ${lang}: ${JSON.stringify(read.problems.slice(0, 3))}`);
          const { plan, problems } = planInstall(read.template, none(), ids);
          if (problems.length) throw new Error(`${s.key} ${lang} ${motion}: ${JSON.stringify(problems.slice(0, 4))}`);
          // Every table holds ready rows but the two the visitors write into.
          for (const t of plan.tables) expect(t.rows.length > 0 || ["messages", "bookings", "applications", "whitelist", "appeals", "reports", "purchases"].includes(t.key), `${s.key} ${t.key}`).toBe(true);
        }
    }
    // Every site, in three languages and two motions: more than vitest's 5 seconds on a cold run.
  }, 30_000);

  test("a site's lists read its own tables, its forms write into its own, its buttons go to its own pages", () => {
    for (const s of sites.SITES) {
      const t = (readTemplate(sites.siteFile(s.key, { lang: "ar" })) as { ok: true; template: Template }).template;
      const tableKeys = new Set(t.tables.map((x) => x.key));
      const tableSlugs = new Set(t.tables.map((x) => x.slug));
      const pageSlugs = new Set(t.pages.map((p) => p.slug));
      const text = JSON.stringify(t.pages);
      for (const m of text.matchAll(/"collectionId":"@table:([^"]+)"/g)) expect(tableKeys.has(m[1]), `${s.key} list ${m[1]}`).toBe(true);
      for (const m of text.matchAll(/"to":"table","table":"([^"]+)"/g)) expect(tableSlugs.has(m[1]), `${s.key} form ${m[1]}`).toBe(true);
      // The library's store pages became the site's own.
      for (const m of text.matchAll(/"href":"(\/[^"#]*)"/g)) expect(pageSlugs.has(m[1]), `${s.key} link ${m[1]}`).toBe(true);
      expect(text).not.toContain("اسم المتجر");
    }
  });

  test("a file of 1.5 MB at most, in every language", () => {
    for (const s of sites.SITES) for (const lang of ["ar", "en", "he"] as const) expect(JSON.stringify(sites.siteFile(s.key, { lang, motion: "rich" })).length, s.key).toBeLessThan(1_500_000);
  });
});

describe("A template's ready rows", () => {
  const file = (rows: unknown[], fields: unknown[] = [{ id: "title", type: "text", required: true }, { id: "code", type: "text", unique: true }, { id: "price", type: "money" }, { id: "link", type: "relation", to: "@table:menu" }]) =>
    ({ format: "estabrek.feature", formatVersion: 1, key: "rows-test", version: "1.0.0", name: { en: "Rows" }, tables: [{ key: "menu", slug: "menu-rows", name: { en: "Menu" }, fields, rows }] }) as unknown;
  const plan = (raw: unknown) => {
    const read = readTemplate(raw);
    if (!read.ok) return { problems: read.problems, rows: [] };
    const { plan: p, problems } = planInstall(read.template, none(), ids);
    return { problems, rows: p.tables[0]?.rows ?? [] };
  };

  test("are checked as the data grid checks a row, each with an address of its own", () => {
    const ok = plan(file([{ slug: "tea", data: { title: { en: "Tea" }, code: { en: "T1" }, price: 9 } }, { data: { title: { en: "Coffee", he: "Coffee" }, price: 12 }, status: "DRAFT" }]));
    expect(ok.problems).toEqual([]);
    expect(ok.rows).toEqual([
      { slug: "tea", data: { title: { en: "Tea" }, code: { en: "T1" }, price: 9 }, status: "PUBLISHED" },
      { slug: "item-2", data: { title: { en: "Coffee", he: "Coffee" }, price: 12 }, status: "DRAFT" },
    ]);
  });

  test("what doesn't fit is said where it is, not dropped", () => {
    const at = (rows: unknown[]) => plan(file(rows)).problems.map((p) => `${p.at}: ${p.message}`);
    expect(at([{ data: { price: 3 } }])).toEqual(["tables.0.rows.0.data.title: Required"]);
    expect(at([{ data: { title: { en: "x" }, price: "three" } }])).toEqual(["tables.0.rows.0.data.price: A number"]);
    expect(at([{ data: { title: { en: "x" }, colour: "red" } }])).toEqual(['tables.0.rows.0.data.colour: No field "colour" in this table']);
    expect(at([{ data: { title: { en: "x" }, link: ["a"] } }])).toEqual(["tables.0.rows.0.data.link: A ready row doesn't link rows"]);
    expect(at([{ slug: "a", data: { title: { en: "x" } } }, { slug: "a", data: { title: { en: "y" } } }])).toEqual(['tables.0.rows.1.slug: Two rows have the address "a"']);
    expect(at([{ data: { title: { en: "x" }, code: { en: "C" } } }, { data: { title: { en: "y" }, code: { ar: "c" } } }])).toEqual(["tables.0.rows.1.data.code: Another row has this value"]);
    expect(readTemplate(file(Array.from({ length: 61 }, () => ({ data: { title: { en: "x" } } })))).ok).toBe(false);
  });
});

describe("A list drawn with the page keeps the rows its filters ask for", () => {
  const collection: CollectionLite = { id: "t1", slug: "dishes", fields: [
    { id: "title", type: "text" }, { id: "group", type: "select", options: [{ id: "mains" }, { id: "desserts" }] }, { id: "price", type: "money" }, { id: "featured", type: "boolean" }, { id: "day", type: "date" },
  ] };
  const row = (slug: string, data: Record<string, unknown>, sort: number): ItemLite => ({ id: slug, slug, data, sort });
  const items = [
    row("a", { title: { ar: "مسخّن", en: "Musakhan" }, group: "mains", price: 78, featured: true, day: "2026-11-01" }, 0),
    row("b", { title: { ar: "كنافة", en: "Knafeh" }, group: "desserts", price: 34, day: "2026-11-10" }, 1),
    row("c", { title: { en: "Fish" }, group: "mains", price: 94, featured: false }, 2),
  ];
  const keep = (where: Array<{ field: string; op: never; value?: string }>) => items.filter((i) => rowMatches(i, where, collection)).map((i) => i.slug);

  test("choices, yes or no, numbers, dates, words and emptiness", () => {
    expect(keep([{ field: "group", op: "is" as never, value: "mains" }])).toEqual(["a", "c"]);
    expect(keep([{ field: "group", op: "isNot" as never, value: "mains" }])).toEqual(["b"]);
    expect(keep([{ field: "featured", op: "isTrue" as never }])).toEqual(["a"]);
    expect(keep([{ field: "featured", op: "isFalse" as never }])).toEqual(["b", "c"]);
    expect(keep([{ field: "price", op: "lt" as never, value: "80" }])).toEqual(["a", "b"]);
    expect(keep([{ field: "price", op: "is" as never, value: "94" }])).toEqual(["c"]);
    expect(keep([{ field: "day", op: "gte" as never, value: "2026-11-05" }])).toEqual(["b"]);
    expect(keep([{ field: "title", op: "contains" as never, value: "kna" }])).toEqual(["b"]);
    expect(keep([{ field: "day", op: "empty" as never }])).toEqual(["c"]);
    // Two filters: both asked. A field the table no longer has asks nothing.
    expect(keep([{ field: "group", op: "is" as never, value: "mains" }, { field: "price", op: "gt" as never, value: "80" }])).toEqual(["c"]);
    expect(keep([{ field: "gone", op: "is" as never, value: "x" }])).toEqual(["a", "b", "c"]);
  });

  test("the grid holds a card for each row kept, in the owner's order; a list read in the browser is left to the API", () => {
    const card = { id: "card", type: "stack", props: {}, children: [{ id: "t", type: "heading", props: { text: { ar: "x" }, bind: { text: "title" } } }] };
    const tree = (props: Record<string, unknown>) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "l", type: "collectionList", props: { collectionId: "t1", sort: "order", ...props }, children: [card] }] } });
    const data = new Map([["t1", { collection, items }]]);
    const drawn = expandLists(tree({ where: [{ field: "group", op: "is", value: "mains" }] }), data);
    const grid = drawn.root.children![0];
    expect(grid.type).toBe("grid");
    expect(grid.children!.map((c) => (c.children![0].props.text as { en?: string }).en)).toEqual(["Musakhan", "Fish"]);
    const live = expandLists(tree({ feed: "live", where: [{ field: "group", op: "is", value: "mains" }] }), data).root.children![0];
    expect((live.props.live as { where: unknown[] }).where).toHaveLength(1);
  });
});
