/**
 * A whole site as its owner chose it in the install wizard (admin → ميزاتي → مواقع كاملة): the business's
 * own details over the sample's, the modules it runs with, its home's composition and how much it moves.
 * The choices go into the file it installs (`site`, backend featureTemplate.ts SiteChoicesSchema), so an
 * upgrade builds the newer version the same way instead of bringing the sample's words back.
 */
import { w, type W } from "../words";
import type { ModuleKey, SiteBlueprint, SiteModules } from "./blueprint";
import { buildSite, modulesOf } from "./compile";
import { MODULES, type SiteFile, type SiteModule } from "./modules";
import type { Lang } from "./modules/kit";

export type SiteBiz = SiteBlueprint["biz"];
export type SiteChoices = {
  biz?: Partial<SiteBiz>;
  /** The modules it keeps (of the blueprint's); none said: all of them. */
  modules?: ModuleKey[];
  /** Its home's composition (0–5 for a business's front). */
  look?: number;
  motion?: "calm" | "rich";
};
export type ChosenFile = SiteFile & { site?: SiteChoices };

/** The six compositions of a business's front home (modules/front.ts), by what opens it. */
export const FRONT_LOOKS: Array<{ name: W; note: W }> = [
  { name: w("نص وصورة", "Words and a picture", "טקסט ותמונה"), note: w("فتحة بالنص جنب صورة، والقصة جنبها، والأسئلة تحت.", "An opening with words beside a picture, the story beside it, questions below.", "פתיחה עם טקסט ליד תמונה, הסיפור לידה, שאלות למטה.") },
  { name: w("هادي", "Quiet", "שקט"), note: w("فتحة هادية، أقسام متناوبة، والقصة بالنص.", "A quiet opening, alternating sections, the story in the middle.", "פתיחה שקטה, קטעים לסירוגין, הסיפור באמצע.") },
  { name: w("مشهد غامق", "Dark scene", "סצנה כהה"), note: w("فتحة غامقة كاملة، والفريق بالصفحة الأولى.", "A full dark opening, with the team on the first page.", "פתיחה כהה מלאה, עם הצוות בעמוד הראשון.") },
  { name: w("صورة كبيرة", "Big picture", "תמונה גדולה"), note: w("صورة على عرض الصفحة، وألبوم صور.", "A picture across the page, and a photo album.", "תמונה לרוחב העמוד, ואלבום תמונות.") },
  { name: w("إطار وأخبار", "Frame and news", "מסגרת וחדשות"), note: w("فتحة بإطار، وآخر الأخبار بالصفحة الأولى.", "A framed opening, with the latest news on the first page.", "פתיחה במסגרת, עם החדשות האחרונות בעמוד הראשון.") },
  { name: w("كولاج", "Collage", "קולאז׳"), note: w("صور متداخلة، واقتباس عريض، والفريق.", "Overlapping pictures, a bold quote, and the team.", "תמונות חופפות, ציטוט בולט, והצוות.") },
];

const has = (u: SiteModules, k: ModuleKey) => u[k] !== undefined;
const LANG_KEYS = ["ar", "en", "he"] as const;

/**
 * The modules kept when the owner keeps `wanted`: a module whose needs left goes too (a booking with no
 * list to pick from), and "tell me" goes when nothing is left for visitors to write through. `dropped`:
 * the ones that went with another, to say so.
 */
export function keepModules(bp: SiteBlueprint, wanted: ModuleKey[]): { kept: ModuleKey[]; dropped: ModuleKey[] } {
  const want = new Set(wanted);
  let kept = MODULES.filter((m) => has(bp.modules, m.key) && want.has(m.key));
  for (let changed = true; changed; ) {
    changed = false;
    const on = new Set(kept.map((m) => m.key));
    const probe = { ...bp, modules: pick(bp.modules, [...on]) };
    const next = kept.filter((m) => (m.needs?.(probe) ?? []).every((n) => on.has(n)) && (m.key !== "notify" || kept.some((x) => x.inbox?.length)));
    if (next.length !== kept.length) {
      kept = next;
      changed = true;
    }
  }
  const keys = kept.map((m) => m.key);
  return { kept: keys, dropped: [...want].filter((k) => has(bp.modules, k) && !keys.includes(k)) };
}
function pick(u: SiteModules, keys: ModuleKey[]): SiteModules {
  return Object.fromEntries(Object.entries(u).filter(([k]) => keys.includes(k as ModuleKey))) as SiteModules;
}

/** The blueprint as chosen: the owner's details over the sample's, its kept modules, its look. */
export function withChoices(bp: SiteBlueprint, c: SiteChoices | null | undefined): SiteBlueprint {
  if (!c) return bp;
  const biz: SiteBiz = { ...bp.biz };
  for (const k of ["name", "address", "hours"] as const) {
    const v = c.biz?.[k];
    if (v) biz[k] = { ar: v.ar?.trim() || bp.biz[k].ar, en: v.en?.trim() || bp.biz[k].en, he: v.he?.trim() || bp.biz[k].he };
  }
  for (const k of ["phone", "email", "city"] as const) {
    const v = c.biz?.[k]?.trim();
    if (v) biz[k] = v;
  }
  let modules = c.modules ? pick(bp.modules, keepModules(bp, c.modules).kept) : bp.modules;
  // A branch that is the sample business itself (its number) takes the owner's number too.
  if (modules.branches && biz.phone !== bp.biz.phone) modules = { ...modules, branches: { ...modules.branches, rows: modules.branches.rows.map((r) => (r.phone === bp.biz.phone ? { ...r, phone: biz.phone } : r)) } };
  // The sample's words name the sample business ("Zaytouna began in my grandmother's kitchen"): they name the owner's.
  const named = <T>(v: T): T => renamed(v, bp.biz.name, biz.name);
  return { ...bp, name: named(bp.name), note: named(bp.note), pack: named(bp.pack), biz, modules: named(modules), look: c.look ?? bp.look };
}

/** Every word in three languages inside `v`, with the sample business's name in each language given the owner's. */
function renamed<T>(v: T, from: W, to: W): T {
  if (LANG_KEYS.every((l) => from[l] === to[l])) return v;
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (!x || typeof x !== "object") return x;
    const o = x as Record<string, unknown>;
    if (LANG_KEYS.every((l) => typeof o[l] === "string")) return { ...o, ...Object.fromEntries(LANG_KEYS.map((l) => [l, from[l] ? (o[l] as string).split(from[l]).join(to[l]) : o[l]])) };
    return Object.fromEntries(Object.entries(o).map(([k, val]) => [k, walk(val)]));
  };
  return walk(v) as T;
}

/** The file a chosen site installs: built with the choices, and carrying them for its upgrades. */
export function buildChosen(bp: SiteBlueprint, c: SiteChoices | null | undefined, lang: Lang): ChosenFile {
  const file = buildSite(withChoices(bp, c), { lang, motion: c?.motion ?? "calm" });
  return c ? { ...file, site: c } : file;
}

/** The modules a site can be installed without (all of its own), in the modules' order. */
export const choosable = (bp: SiteBlueprint): SiteModule[] => modulesOf(bp);
