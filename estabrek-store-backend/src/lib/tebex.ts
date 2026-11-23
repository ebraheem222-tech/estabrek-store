/**
 * A game server's packages on Tebex (wave G4 of docs/sites-300-plan.ar.md). FiveM servers sell through Tebex alone
 * (Cfx.re's rules): the server's owner keeps their own Tebex webstore, and their site shows its packages in its own
 * look and sends the player to that package on the webstore, where they sign in, pay and get it. We never take the
 * payment and hold only the webstore's public token (the Headless API's: it reads what the webstore shows anyone).
 *
 * Read with that token from headless.tebex.io (the webstore, and its categories with their packages), kept 5 minutes
 * (a failure 1 minute), and given to the site's «الباقات» elements as their page is served, and to its panel.
 */
import { settingsFor, settingsOfFeature } from "./siteSettings.js";

export const TEBEX_API = "https://headless.tebex.io/api/accounts";
/** A webstore's public token, as Tebex writes it (letters, digits and dashes). */
export const TEBEX_TOKEN = /^[A-Za-z0-9-]{6,80}$/;
export const TEBEX_LIMITS = { categories: 12, packages: 60, name: 80, text: 280, keepMs: 5 * 60_000, failMs: 60_000 } as const;

export type TebexPackage = { id: number; name: string; price: number; base: number; currency: string; image: string | null; text: string; href: string };
export type TebexCategory = { id: number; name: string; packages: TebexPackage[] };
/** A webstore as a site shows it: its name, currency and address, and its categories with their packages, in Tebex's order. */
export type TebexStore = { name: string; currency: string; url: string; categories: TebexCategory[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
/** Words from Tebex's HTML, as plain text (tags gone, a few entities read, spaces folded), cut to `max`. */
export function plainText(html: unknown, max: number): string {
  if (typeof html !== "string") return "";
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/li>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e: string) => ENTITIES[e] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
/** An https address (a webstore, a picture), or null. */
const https = (v: unknown): string | null => {
  if (typeof v !== "string" || v.length > 500) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" && !u.username && !u.password ? u.toString().replace(/\/+$/, "") : null;
  } catch {
    return null;
  }
};
const byOrder = (a: Obj, b: Obj) => (num(a.order) ?? 0) - (num(b.order) ?? 0);

/** Tebex's answers as a site shows them (null: not a webstore's). */
export function storeFrom(webstore: unknown, categories: unknown): TebexStore | null {
  const w = isObj(webstore) && isObj(webstore.data) ? webstore.data : null;
  const url = w ? https(w.webstore_url) : null;
  if (!w || !url || typeof w.name !== "string" || typeof w.currency !== "string") return null;
  const list = isObj(categories) && Array.isArray(categories.data) ? (categories.data.filter(isObj) as Obj[]) : [];
  const out: TebexCategory[] = [];
  let left: number = TEBEX_LIMITS.packages;
  for (const c of [...list].sort(byOrder)) {
    if (out.length >= TEBEX_LIMITS.categories || left <= 0) break;
    const id = num(c.id);
    if (id === null || typeof c.name !== "string") continue;
    const packages: TebexPackage[] = [];
    for (const p of (Array.isArray(c.packages) ? (c.packages.filter(isObj) as Obj[]) : []).sort(byOrder)) {
      const pid = num(p.id);
      const price = num(p.total_price);
      if (pid === null || price === null || typeof p.name !== "string" || left <= 0) continue;
      const base = num(p.base_price) ?? price;
      packages.push({ id: pid, name: plainText(p.name, TEBEX_LIMITS.name), price, base, currency: typeof p.currency === "string" && /^[A-Z]{3}$/.test(p.currency) ? p.currency : w.currency, image: https(p.image), text: plainText(p.description, TEBEX_LIMITS.text), href: `${url}/package/${pid}` });
      left -= 1;
    }
    if (packages.length) out.push({ id, name: plainText(c.name, TEBEX_LIMITS.name), packages });
  }
  return { name: plainText(w.name, TEBEX_LIMITS.name), currency: /^[A-Z]{3}$/.test(w.currency) ? w.currency : "USD", url, categories: out };
}

const kept = new Map<string, { at: number; v: TebexStore | null }>();
async function ask(path: string): Promise<unknown> {
  const res = await fetch(`${TEBEX_API}/${path}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000), redirect: "error" });
  if (!res.ok) throw new Error(`Tebex ${res.status}`);
  return res.json();
}
/** A webstore by its public token (kept 5 minutes; null: no such webstore, or Tebex didn't answer). */
export async function tebexStore(token: unknown, now = Date.now()): Promise<TebexStore | null> {
  if (typeof token !== "string" || !TEBEX_TOKEN.test(token.trim())) return null;
  const t = token.trim();
  const was = kept.get(t);
  if (was && now - was.at < (was.v ? TEBEX_LIMITS.keepMs : TEBEX_LIMITS.failMs)) return was.v;
  let v: TebexStore | null = null;
  try {
    const [webstore, categories] = await Promise.all([ask(encodeURIComponent(t)), ask(`${encodeURIComponent(t)}/categories?includePackages=1`)]);
    v = storeFrom(webstore, categories);
  } catch {
    v = null;
  }
  kept.set(t, { at: now, v });
  return v;
}
/** For the tests (and a token just changed): Tebex is asked again. */
export const forgetTebex = () => kept.clear();

/** A site's webstore, by its «توكن Tebex» setting (null: none set, or it didn't answer). */
export async function siteTebex(featureId: string): Promise<{ token: boolean; store: TebexStore | null }> {
  const s = await settingsOfFeature(featureId);
  const token = s?.values.tebexToken;
  const has = typeof token === "string" && token.trim().length > 0;
  return { token: has, store: has ? await tebexStore(token) : null };
}

type Node = { type?: string; props?: Record<string, unknown>; children?: Node[] };
/** A page of a site with Tebex as the shop gets it: its «الباقات» elements with the webstore's packages now. */
export async function withTebex<T>(tree: T, of: { kind: "page" | "table"; id: string }): Promise<T> {
  if (!tree || typeof tree !== "object" || !JSON.stringify(tree).includes('"tebexPackages"')) return tree;
  const s = await settingsFor(of.kind, of.id);
  const store = s ? await tebexStore(s.values.tebexToken) : null;
  const walk = (n: Node): Node => ({ ...n, ...(n.type === "tebexPackages" ? { props: { ...n.props, store } } : {}), ...(Array.isArray(n.children) ? { children: n.children.map(walk) } : {}) });
  const root = (tree as { root?: Node }).root;
  return root ? ({ ...(tree as object), root: walk(root) } as T) : tree;
}
