/**
 * The rest of «شو كنتِ شايفة» (besides the pieces she opened, kept by
 * store/recentlyViewed): what she searched for and what she took out of the bag.
 * Only on her device; entries older than the owner's expiry are dropped.
 * Also the small session trail Razan uses to notice a shopper who seems lost.
 */
import { razanNow } from "./razanRuntime";

export type SearchEntry = { q: string; at: number };
export type RemovedEntry = { id: string; title: string; slug?: string | null; image?: string | null; color?: string | null; size?: string | null; at: number };
type Store = { searches: SearchEntry[]; removed: RemovedEntry[] };

const KEY = "estabrek_razan_history";
export const HISTORY_EVENT = "razan:history";

function ttlMs() {
  const h = razanNow().history;
  return h.enabled ? h.ttlHours * 3600_000 : 0;
}

function read(): Store {
  if (typeof window === "undefined") return { searches: [], removed: [] };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const ttl = ttlMs();
    const fresh = <T extends { at: number }>(list: unknown): T[] =>
      (Array.isArray(list) ? (list as T[]) : []).filter((x) => x && typeof x.at === "number" && (!ttl || Date.now() - x.at < ttl));
    return { searches: fresh<SearchEntry>(raw.searches), removed: fresh<RemovedEntry>(raw.removed) };
  } catch {
    return { searches: [], removed: [] };
  }
}

function write(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked */
  }
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

/** Only kept while the owner has the history switched on. */
const on = () => razanNow().history.enabled;

export function readRazanHistory() {
  return read();
}

export function rememberSearch(q: string) {
  const text = q.trim().slice(0, 80);
  if (!text || !on()) return;
  const s = read();
  s.searches = [{ q: text, at: Date.now() }, ...s.searches.filter((x) => x.q !== text)].slice(0, 10);
  write(s);
  bumpTrail("search");
}

export function rememberRemoved(e: Omit<RemovedEntry, "at">) {
  if (!on() || !e.id) return;
  const s = read();
  s.removed = [{ ...e, at: Date.now() }, ...s.removed.filter((x) => x.id !== e.id)].slice(0, 10);
  write(s);
}

export function clearRazanHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

/* ---------------- Does she seem lost? (this visit only) ---------------- */

const TRAIL = "razan_trail";
type Trail = { pages: string[]; searches: number };

function trail(): Trail {
  try {
    const t = JSON.parse(sessionStorage.getItem(TRAIL) || "{}");
    return { pages: Array.isArray(t.pages) ? t.pages : [], searches: Number(t.searches) || 0 };
  } catch {
    return { pages: [], searches: 0 };
  }
}

function saveTrail(t: Trail) {
  try {
    sessionStorage.setItem(TRAIL, JSON.stringify({ pages: t.pages.slice(-30), searches: t.searches }));
  } catch {
    /* ignore */
  }
}

function bumpTrail(kind: "search") {
  if (typeof window === "undefined") return;
  const t = trail();
  if (kind === "search") t.searches++;
  saveTrail(t);
}

/**
 * Called on every page change. Returns why she seems lost, or null:
 * - she came back to a piece after looking at two others,
 * - she searched a second time this visit.
 */
export function noteVisit(path: string): "revisit" | "search-again" | null {
  const t = trail();
  const isPiece = path.startsWith("/p/");
  const seenBefore = isPiece && t.pages.includes(path);
  const others = new Set(t.pages.filter((p) => p !== path && p.startsWith("/p/"))).size;
  if (isPiece) t.pages.push(path);
  saveTrail(t);
  if (seenBefore && others >= 2) return "revisit";
  if (path.startsWith("/search") && t.searches >= 2) return "search-again";
  return null;
}

export function piecesSeenThisVisit() {
  return new Set(trail().pages).size;
}
