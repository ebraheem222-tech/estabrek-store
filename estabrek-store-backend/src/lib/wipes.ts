/**
 * A game server site's wipes («المسح», wave G6b of docs/sites-300-plan.ar.md): when its world starts over (a Rust
 * server's map, a season). Its owner sets the schedule as the site's settings: every week, every two weeks (from a
 * first day), the first such weekday of each month (Rust's own forced wipe is the first Thursday), or one day of
 * their own; the weekday, the hour, and the server's time zone. A page's «عدّاد المسح» element gets the next wipe and
 * the last as the page is served (with the schedule in words and the owner's note), and counts down in the browser.
 */
import { settingsFor, type SiteSettings } from "./siteSettings.js";

export const WIPE_EVERY = ["weekly", "biweekly", "monthly", "date"] as const;
export type WipeEvery = (typeof WIPE_EVERY)[number];
export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
/** The time zones the setting offers, by their choice's id (the admin's modules/wipe.ts lists the same). */
export const WIPE_ZONES: Record<string, string> = { london: "Europe/London", utc: "UTC", berlin: "Europe/Berlin", istanbul: "Europe/Istanbul", jerusalem: "Asia/Jerusalem", amman: "Asia/Amman", beirut: "Asia/Beirut", riyadh: "Asia/Riyadh", dubai: "Asia/Dubai", "new-york": "America/New_York", "los-angeles": "America/Los_Angeles" };
export type WipeRule = { every: WipeEvery; day: number; hour: number; minute: number; zone: string; from: string | null };
export type WipeView = { next: string | null; last: string | null; every: WipeEvery; day: (typeof WEEKDAYS)[number]; time: string; zone: string; note: unknown };

const DAY = 86_400_000;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function zoneOk(zone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
/** The zone's wall clock at an instant, as if it were UTC (its offset is the difference). */
function wall(t: number, zone: string): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(t).map((p) => [p.type, p.value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
}
/** The instant a wall clock time is in a zone (a time skipped by a clock change goes forward with it). */
export function instantIn(y: number, m: number, d: number, hour: number, minute: number, zone: string): number {
  const asUtc = Date.UTC(y, m - 1, d, hour, minute);
  let t = asUtc - (wall(asUtc, zone) - asUtc);
  const again = asUtc - (wall(t, zone) - t);
  if (again !== t) t = again;
  return t;
}

/** A site's schedule from its settings (null: it has none, or it can't be read). */
export function wipeRuleOf(s: SiteSettings | null): WipeRule | null {
  if (!s || !s.decls.some((d) => d.key === "wipeEvery")) return null;
  const v = s.values;
  const every = WIPE_EVERY.find((e) => e === v.wipeEvery);
  const day = WEEKDAYS.indexOf(v.wipeDay as (typeof WEEKDAYS)[number]);
  const time = typeof v.wipeTime === "string" ? /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(v.wipeTime.trim()) : null;
  const named = typeof v.wipeZone === "string" ? WIPE_ZONES[v.wipeZone] ?? v.wipeZone : "";
  const zone = named && zoneOk(named) ? named : "UTC";
  const from = typeof v.wipeFrom === "string" && DATE.test(v.wipeFrom.trim()) ? v.wipeFrom.trim() : null;
  if (!every || (every !== "date" && day < 0) || !time || (every === "date" && !from)) return null;
  return { every, day: Math.max(day, 0), hour: Number(time[1]), minute: Number(time[2]), zone, from };
}

/** The next wipe after `now` and the last one before it, by the rule. */
export function wipesAround(rule: WipeRule, now = Date.now()): { next: number | null; last: number | null } {
  const at = (y: number, m: number, d: number) => instantIn(y, m, d, rule.hour, rule.minute, rule.zone);
  if (rule.every === "date") {
    const [, y, m, d] = DATE.exec(rule.from!)!.map(Number);
    const t = at(y, m, d);
    return t > now ? { next: t, last: null } : { next: null, last: t };
  }
  const today = new Date(wall(now, rule.zone));
  const dayOf = (text: string) => {
    const [, y, m, d] = DATE.exec(text)!.map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const anchor = rule.from ? dayOf(rule.from) : null;
  let next: number | null = null;
  let last: number | null = null;
  for (let i = -45; i <= 75; i++) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
    if (day.getUTCDay() !== rule.day) continue;
    if (rule.every === "monthly" && day.getUTCDate() > 7) continue;
    // Every two weeks counts from its first day (without one, every week).
    if (rule.every === "biweekly" && anchor !== null && Math.round((day.getTime() - anchor) / DAY) % 14 !== 0) continue;
    const t = at(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate());
    if (t > now && (next === null || t < next)) next = t;
    if (t <= now && (last === null || t > last)) last = t;
  }
  return { next, last };
}

/** What a site's countdown shows (null: the site has no schedule yet). */
export function wipeView(s: SiteSettings | null, now = Date.now()): WipeView | null {
  const rule = wipeRuleOf(s);
  if (!rule) return null;
  const { next, last } = wipesAround(rule, now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { next: next === null ? null : new Date(next).toISOString(), last: last === null ? null : new Date(last).toISOString(), every: rule.every, day: WEEKDAYS[rule.day], time: `${pad(rule.hour)}:${pad(rule.minute)}`, zone: rule.zone, note: s?.values.wipeNote ?? null };
}

type Node = { type?: string; props?: Record<string, unknown>; children?: Node[] };
/** A site's page as the shop gets it: each «عدّاد المسح» with the next wipe and the last. */
export async function withWipe<T>(tree: T, of: { kind: "page" | "table"; id: string }): Promise<T> {
  if (!tree || typeof tree !== "object" || !JSON.stringify(tree).includes('"wipeCountdown"')) return tree;
  const view = wipeView(await settingsFor(of.kind, of.id));
  const walk = (n: Node): Node => ({ ...n, ...(n.type === "wipeCountdown" ? { props: { ...n.props, wipe: view } } : {}), ...(Array.isArray(n.children) ? { children: n.children.map(walk) } : {}) });
  const root = (tree as { root?: Node }).root;
  return root ? ({ ...(tree as object), root: walk(root) } as T) : tree;
}
