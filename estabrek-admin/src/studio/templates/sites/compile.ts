/**
 * A blueprint becomes the feature template the store installs (estabrek.feature): its archetype's home
 * and its modules' pages (in their order), then its modules' tables and functions (in the modules'
 * order). The library writes a store's sample details: the site's own take their place.
 */
import { ctxOf, say, type Ctx, type MotionLevel, type N } from "../build";
import { C, w, type W } from "../words";
import { SITE_FORMAT, SITE_FORMAT_VERSION, type Archetype, type PanelBits, type PanelPage, type PanelPart, type SiteBlueprint, type SiteSetting, type SiteWait } from "./blueprint";
import { HOME_PANEL, HOME_SETTINGS, HOMES, MODULES } from "./modules";
import { PANEL } from "./siteWords";
import type { Built, Lang, SiteFile, SiteModule, SitePage, Slugs } from "./modules/kit";
import { SW } from "./siteWords";

export type BuildSite = { lang: Lang; motion?: MotionLevel };

/** The modules a blueprint uses, in the modules' order. */
const used = (bp: SiteBlueprint): SiteModule[] => MODULES.filter((m) => bp.modules[m.key] !== undefined);

/** A blueprint's pages, in the order the site lists them: its archetype's home, then its modules'. */
export function pagesOf(bp: SiteBlueprint): SitePage[] {
  const home = HOMES[bp.archetype];
  const pages: SitePage[] = home ? [{ key: "home", slug: bp.home, order: 0, name: SW.home, seo: bp.pack.sub, parts: home }] : [];
  for (const m of used(bp)) pages.push(...(m.pages?.(bp) ?? []));
  return pages.sort((a, b) => a.order - b.order);
}
const slugsFrom = (pages: SitePage[]): Slugs => Object.fromEntries(pages.map((p) => [p.key, p.slug])) as Slugs;
/** A site's pages' addresses by page key, in the site's order (home first). */
export const slugsOf = (bp: SiteBlueprint): Slugs => slugsFrom(pagesOf(bp));

/** A blueprint's settings, in its form's order: its archetype's, then its modules' (in the modules' order). */
export const settingsOf = (bp: SiteBlueprint): SiteSetting[] => [...(HOME_SETTINGS[bp.archetype]?.(bp) ?? []), ...used(bp).flatMap((m) => m.settings?.(bp) ?? [])];

/** A blueprint's rules on what its visitors add, in the modules' order (an application once, again after some days). */
export const waitsOf = (bp: SiteBlueprint): SiteWait[] => used(bp).flatMap((m) => m.waits?.(bp) ?? []);

/** The board page's name where it isn't bookings (a game server's: its applications by their state). */
const BOARD_NAME: Partial<Record<Archetype, typeof PANEL.board>> = { server: PANEL.boardServer };
/** A community's board has its events' calendar (wave G7c), beside its applications if it has them. */
const boardName = (bp: SiteBlueprint) => (bp.archetype === "server" && bp.modules.hosting ? PANEL.boardOrders : bp.archetype === "server" && bp.modules.tickets && !bp.modules.events && !bp.modules.apply && !bp.modules.mcstore ? PANEL.boardTickets : bp.archetype === "server" && bp.modules.events ? (bp.modules.apply || bp.modules.mcstore ? PANEL.boardServerCalendar : PANEL.boardCalendar) : BOARD_NAME[bp.archetype] ?? PANEL.board);

/**
 * A blueprint's panel (its own pages in the admin's menu): «اليوم» with every number at the top, its modules'
 * queues, and the quick actions; «الحجوزات» with its calendars and boards; «الزباين» with one person's page across
 * the tables that name them; «التقارير» with its charts and reports; «القوائم» with its modules' tables and maps;
 * «الإعدادات» with every setting. A page with nothing on it is left out.
 */
export function panelOf(bp: SiteBlueprint): PanelPage[] {
  const bits: PanelBits[] = [HOME_PANEL[bp.archetype]?.(bp) ?? {}, ...used(bp).map((m) => m.panel?.(bp) ?? {})];
  const numbers = bits.flatMap((b) => b.numbers ?? []);
  const actions = bits.flatMap((b) => b.actions ?? []);
  // Eight numbers a row (the backend's most for one part): a site with many modules has a second row.
  const rows = Array.from({ length: Math.ceil(numbers.length / 8) }, (_, i) => ({ kind: "numbers" as const, key: i ? `numbers${i + 1}` : "numbers", items: numbers.slice(i * 8, i * 8 + 8) }));
  const today: PanelPart[] = [...rows, ...bits.flatMap((b) => b.today ?? []), ...(actions.length ? [{ kind: "actions" as const, key: "actions", title: PANEL.quick, items: actions }] : [])];
  const lists = bits.flatMap((b) => b.lists ?? []);
  const keys = settingsOf(bp).map((s) => s.key);
  const people = bits.flatMap((b) => b.people ?? []);
  const pages: PanelPage[] = [
    { key: "today", name: PANEL.today, icon: "today", parts: today },
    { key: "board", name: boardName(bp), icon: "calendar", parts: bits.flatMap((b) => b.board ?? []) },
    { key: "people", name: PANEL.people, icon: "people", parts: people.length ? [{ kind: "people", key: "person", title: PANEL.person, by: "phone", name: "name", tables: people }] : [] },
    { key: "reports", name: PANEL.reports, icon: "chart", parts: bits.flatMap((b) => b.reports ?? []) },
    { key: "lists", name: PANEL.lists, icon: "lists", parts: lists },
    { key: "settings", name: PANEL.settings, icon: "settings", parts: keys.length ? [{ kind: "settings", key: "settings", keys }] : [] },
  ];
  return pages.filter((p) => p.parts.length);
}

/** What a site holds, for its card in the gallery (without building it). */
export function siteCounts(bp: SiteBlueprint) {
  const counts = used(bp).map((m) => m.counts?.(bp) ?? { tables: 0, rows: 0 });
  return { pages: pagesOf(bp).length, tables: counts.reduce((s, c) => s + c.tables, 0), rows: counts.reduce((s, c) => s + c.rows, 0) };
}

/** The same setting key rule as the backend's (lib/pageTree.ts SETTING_KEY). */
const SETTING_KEY = /^[a-z][a-zA-Z0-9]{0,30}$/;
/** The addresses the shop uses itself (the backend's lib/collections.ts RESERVED_SLUGS): a site's page may not start with one. */
const RESERVED = new Set(["shop", "p", "c", "cart", "checkout", "account", "search", "about", "contact", "wishlist", "order", "policies", "request", "studio-frame", "design-frame", "stock-alert", "api", "admin", "ar", "en", "he", "__block", "__component", "__template", "__collection"]);
/** The same page address rule as the backend's templates (lib/featureTemplate.ts TEMPLATE_PAGE_SLUG). */
const PAGE_SLUG = /^\/[a-z0-9][a-z0-9-]{0,60}(\/[a-z0-9][a-z0-9-]{0,60}){0,3}$/;
/** What is wrong with a blueprint, in words (nothing: it can be built). */
export function blueprintProblems(bp: SiteBlueprint): string[] {
  const out: string[] = [];
  if (bp.format !== SITE_FORMAT || bp.formatVersion !== SITE_FORMAT_VERSION) out.push(`Not a site blueprint (${SITE_FORMAT} ${SITE_FORMAT_VERSION})`);
  if (!/^site-[a-z0-9][a-z0-9-]{0,38}$/.test(bp.key)) out.push(`The key "${bp.key}" isn't site-<small letters, digits and ->`);
  if (!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(bp.version)) out.push(`The version "${bp.version}" isn't three numbers`);
  if (!HOMES[bp.archetype]) out.push(`The "${bp.archetype}" archetype has no home yet`);
  if (bp.archetype === "server" && !bp.modules.status) out.push(`A game server's site needs "status"`);
  // A kind of application is in a page's address and a setting's name ("/apply/police", "rolePolice").
  const kinds = bp.modules.apply?.kinds.map((k) => k.key) ?? [];
  kinds.forEach((k, i) => {
    if (!/^[a-z][a-z0-9]{1,20}$/.test(k)) out.push(`The kind "${k}" isn't small letters and digits`);
    if (kinds.indexOf(k) !== i) out.push(`Two kinds called "${k}"`);
  });
  if (bp.modules.apply && !kinds.length) out.push(`"apply" needs a kind to apply for`);
  // A board's key is what the server sends its numbers by (lib/ranking.ts); play time is counted, so it is summed minutes.
  const boards = bp.modules.ranking?.boards ?? [];
  boards.forEach((b, i) => {
    if (!/^[a-z][a-z0-9_-]{0,39}$/.test(b.key)) out.push(`The board "${b.key}" isn't small letters, digits, - and _`);
    if (boards.findIndex((x) => x.key === b.key) !== i) out.push(`Two boards called "${b.key}"`);
    if (b.key === "playtime" && (b.how !== "sum" || b.unit !== "minutes")) out.push(`The "playtime" board is counted: summed minutes`);
  });
  if (bp.modules.ranking && !boards.length) out.push(`"ranking" needs a board`);
  // A wipe's schedule as the backend reads it (lib/wipes.ts): an hour on the 24-hour clock, a day for a first one.
  const wipe = bp.modules.wipe;
  if (wipe && !/^([01]\d|2[0-3]):[0-5]\d$/.test(wipe.time)) out.push(`The wipe's time "${wipe.time}" isn't HH:MM`);
  if (wipe && wipe.from !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(wipe.from)) out.push(`The wipe's first day "${wipe.from}" isn't YYYY-MM-DD`);
  if (wipe?.every === "date" && !wipe.from) out.push(`A wipe once needs its day`);
  // A choice's options are the backend's field option ids (lib/collections.ts): a small letter, then letters and digits.
  const u = bp.modules;
  const choices: Array<[string, Array<[string, unknown]>]> = [
    ["docs", u.docs?.products ?? []], ["releases", u.releases?.products ?? []], ["tickets", u.tickets?.products ?? []],
    ["lfg games", u.lfg?.games ?? []], ["lfg regions", u.lfg?.regions ?? []], ["events", u.events?.kinds ?? []], ["roster", u.roster?.roles ?? []],
  ];
  for (const [where, list] of choices) for (const [id] of list) if (!/^[a-z][a-zA-Z0-9]{0,30}$/.test(id)) out.push(`The ${where} option "${id}" isn't a small letter, then letters and digits`);
  const known = new Set(MODULES.map((m) => m.key as string));
  for (const key of Object.keys(bp.modules)) if (!known.has(key)) out.push(`No module "${key}"`);
  const on = new Set(used(bp).map((m) => m.key));
  for (const m of used(bp)) for (const need of m.needs?.(bp) ?? []) if (!on.has(need)) out.push(`"${m.key}" needs "${need}"`);
  if (on.has("notify") && !used(bp).some((m) => m.inbox?.length)) out.push(`"notify" needs a module visitors write through (${MODULES.filter((m) => m.inbox?.length).map((m) => m.key).join(", ")})`);
  const keys = settingsOf(bp).map((s) => s.key);
  keys.forEach((k, i) => {
    if (!SETTING_KEY.test(k)) out.push(`The setting "${k}" isn't a small letter, then letters and digits`);
    if (keys.indexOf(k) !== i) out.push(`Two settings called "${k}"`);
  });
  const pages = pagesOf(bp);
  const seen = new Set<string>();
  for (const p of pages) {
    if (!PAGE_SLUG.test(p.slug)) out.push(`The page address "${p.slug}" isn't /small-words`);
    if (RESERVED.has(p.slug.split("/")[1] ?? "")) out.push(`The shop already uses the page address "${p.slug}"`);
    if (seen.has(p.slug)) out.push(`Two pages at "${p.slug}"`);
    seen.add(p.slug);
  }
  // The panel as the backend takes it (lib/sitePanel.ts PANEL_LIMITS), caught here rather than when it is installed.
  for (const page of panelOf(bp)) {
    if (page.parts.length > 12) out.push(`The panel's "${page.key}" page has more than 12 parts`);
    for (const part of page.parts) {
      const [many, what] = part.kind === "numbers" || part.kind === "actions" ? [part.items.length, part.kind] : "columns" in part ? [part.columns.length, "columns"] : "show" in part ? [part.show?.length ?? 0, "fields shown"] : [0, ""];
      if (many > 8) out.push(`The panel's "${part.key}" has more than 8 ${what}`);
    }
  }
  return out;
}

/** The modules a blueprint uses, in the modules' order. */
export const modulesOf = (bp: SiteBlueprint): SiteModule[] => used(bp);

/* ---------------- The site's words where the library has a store's ---------------- */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
/**
 * The library writes a store's sample details (its name, address, hours, phone, the shop's pages): the
 * site's own take their place, and its buttons go to the site's own pages. Words a setting of the site
 * holds (its hours) are bound to it, so the shop shows the setting's words as the owner changes them.
 */
function ownWords(tree: N, b: Built, c: Ctx, set: ReadonlySet<string>): N {
  const biz = b.bp.biz;
  const digits = biz.phone.replace(/[^\d+]/g, "");
  // A dashed number after right-to-left words reads backwards ("1234-600-04") unless kept whole, left to right.
  const num = `${String.fromCodePoint(0x2066)}${biz.phone}${String.fromCodePoint(0x2069)}`;
  const phoneLine = w(`تلفون وواتساب: ${num}`, `Phone and WhatsApp: ${biz.phone}`, `טלפון ווואטסאפ: ${num}`);
  const swaps: Array<[W, W]> = [[C.storeName, biz.name], [C.address, biz.address], [C.hours, biz.hours], [C.phoneLine, phoneLine], [C.mailLine, w(biz.email, biz.email, biz.email)]];
  const s = b.slugs;
  const pages: Record<string, string> = { "/shop": s.offers ?? s.home, "/about": s.story ?? s.home, "/contact": s.contact ?? s.home };
  const walk = (n: N): N => {
    const props: Obj = { ...n.props };
    for (const key of ["text", "label"]) {
      const v = props[key];
      if (!isObj(v)) continue;
      const hit = swaps.find(([from]) => v.ar === from.ar || v.en === from.en);
      if (hit) props[key] = say(c, hit[1]);
      if (hit?.[0] === C.hours && set.has("hours")) props.fromSetting = { ...(props.fromSetting as Obj | undefined), [key]: "hours" };
    }
    if (typeof props.href === "string") {
      if (pages[props.href]) props.href = pages[props.href];
      else if (props.href.startsWith("tel:")) props.href = `tel:${digits}`;
      else if (props.href.startsWith("mailto:")) props.href = `mailto:${biz.email}`;
      else if (props.href.startsWith("https://wa.me/")) props.href = `https://wa.me/${digits.replace(/^\+/, "").replace(/^0/, "972")}`;
    }
    if (n.type === "map") props.query = biz.city;
    return { ...n, props, ...(n.children ? { children: n.children.map(walk) } : {}) };
  };
  return walk(tree);
}

/* ---------------- The whole site ---------------- */

/** A site as the template file the store installs (words in all three languages; page names in `lang`). */
export function buildSite(bp: SiteBlueprint, o: BuildSite): SiteFile {
  const problems = blueprintProblems(bp);
  if (problems.length) throw new Error(`${bp.key}: ${problems.join("; ")}`);
  let n = 0;
  const ids = (prefix: string) => `${prefix.replace(/[^A-Za-z0-9_-]/g, "") || "n"}-${(n++).toString(36)}`;
  const pics = bp.pics ? [`/templates/${bp.pics}/hero.svg`, `/templates/${bp.pics}/story.svg`, ...[1, 2, 3, 4, 5, 6].map((i) => `/templates/${bp.pics}/product-${i}.svg`)] : [];
  const base = ctxOf({ lang: o.lang, all: true, fam: bp.fam, motion: o.motion ?? "calm", ids, pics });
  const c: Ctx = { ...base, pack: { ...base.pack, ...bp.pack, icon: bp.pack.icon ?? base.pack.icon } };
  const mods = used(bp);
  const defs = pagesOf(bp);
  const b: Built = { bp, use: bp.modules, slugs: slugsFrom(defs), inbox: mods.flatMap((m) => m.inbox ?? []) };
  const settings = settingsOf(bp);
  const set = new Set(settings.map((s) => s.key));
  // Pages first, then tables (their item pages), so every element's id comes in the same order each time.
  const pages: SiteFile["pages"] = defs.map((p) => ({
    key: p.key,
    name: `${bp.biz.name[o.lang]}: ${p.name[o.lang]}`.slice(0, 120),
    slug: p.slug,
    tree: { version: 1, root: ownWords({ id: "page", type: "page", props: {}, children: p.parts(b).map((part) => part(c)) }, b, c, set) },
    seo: { title: `${p.name[o.lang]} | ${bp.biz.name[o.lang]}`.slice(0, 120), description: p.seo[o.lang].slice(0, 300) },
  }));
  const tables = mods.flatMap((m) => m.tables?.(b, c) ?? []).map((t) => (t.itemPage ? { ...t, itemPage: { ...t.itemPage, root: ownWords(t.itemPage.root, b, c, set) } } : t));
  const functions = mods.flatMap((m) => m.functions?.(b) ?? []);
  const panel = panelOf(bp);
  const waits = waitsOf(bp);
  return { format: "estabrek.feature", formatVersion: 1, key: bp.key, version: bp.version, name: bp.name, note: bp.note, tables, functions, pages, needs: { secrets: [], sites: [] }, ...(settings.length ? { settings } : {}), ...(panel.length ? { panel } : {}), ...(waits.length ? { waits } : {}) };
}
