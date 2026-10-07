/**
 * Razan's report counters and the admin's "preview before saving".
 */
import { randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { RAZAN_EVENTS, RazanSchema, type RazanEvent, type RazanSettings } from "./razan.settings.js";

const EVENTS = new Set<string>(RAZAN_EVENTS);
export const isRazanEvent = (k: unknown): k is RazanEvent => typeof k === "string" && EVENTS.has(k);

/** Today in Israel, as a date (the report is by the shop's day). */
export function shopDay(d = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/* One device can't inflate the numbers: at most PER_IP_DAY counts per IP a day. */
const PER_IP_DAY = 120;
const perIp = new Map<string, { day: number; n: number }>();

export async function countRazan(key: RazanEvent, ip: string | null | undefined, by = 1) {
  return countRazanKey(key, ip, by);
}

/** Any report key (server-side only, e.g. the quiz's anonymous answer totals "quiz:o:wedding"). */
export async function countRazanKey(key: string, ip: string | null | undefined, by = 1) {
  const day = shopDay();
  if (ip) {
    const d = day.getTime();
    const cur = perIp.get(ip);
    if (cur && cur.day === d) {
      if (cur.n >= PER_IP_DAY) return false;
      cur.n++;
    } else {
      if (perIp.size > 20_000) perIp.clear();
      perIp.set(ip, { day: d, n: 1 });
    }
  }
  await prisma.razanStat.upsert({
    where: { day_key: { day, key } },
    create: { day, key, count: by },
    update: { count: { increment: by } },
  });
  return true;
}

/** Totals for the last 7 and 30 days, and per day for the last 30. */
export async function razanReport() {
  const today = shopDay();
  const since30 = new Date(today.getTime() - 29 * 864e5);
  const since7 = new Date(today.getTime() - 6 * 864e5);
  const rows = await prisma.razanStat.findMany({ where: { day: { gte: since30 } }, orderBy: { day: "asc" } });
  const totals: Record<string, { d7: number; d30: number }> = {};
  for (const k of RAZAN_EVENTS) totals[k] = { d7: 0, d30: 0 };
  const byDay: Record<string, Record<string, number>> = {};
  // The quiz's answers ("quiz:o:wedding") are totals of their own, not report lines.
  const answers: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const ans = /^quiz:([a-z]):(.+)$/.exec(r.key);
    if (ans) {
      const group = (answers[ans[1]] ??= {});
      group[ans[2]] = (group[ans[2]] ?? 0) + r.count;
      continue;
    }
    const t = (totals[r.key] ??= { d7: 0, d30: 0 });
    t.d30 += r.count;
    if (r.day >= since7) t.d7 += r.count;
    const ymd = r.day.toISOString().slice(0, 10);
    (byDay[ymd] ??= {})[r.key] = r.count;
  }
  const [helpOrders7, helpOrders30] = await Promise.all([
    prisma.orderRequest.count({ where: { source: "RAZAN_HELP", createdAt: { gte: since7 } } }),
    prisma.orderRequest.count({ where: { source: "RAZAN_HELP", createdAt: { gte: since30 } } }),
  ]);
  const QUIZ_GROUPS: Record<string, string> = { o: "occasion", s: "season", c: "color", l: "look", b: "budget" };
  const quiz = Object.fromEntries(
    Object.entries(answers).map(([g, m]) => [QUIZ_GROUPS[g] ?? g, Object.entries(m).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }))]),
  );
  return { totals, byDay, helpOrders: { d7: helpOrders7, d30: helpOrders30 }, quiz };
}

/* ---------------- Preview: the owner tries settings on the shop before saving ---------------- */

const PREVIEW_MS = 2 * 3600_000;
const previews = new Map<string, { settings: RazanSettings; until: number }>();

export function makePreview(input: unknown) {
  const settings = RazanSchema.parse(input ?? {});
  const now = Date.now();
  for (const [k, v] of previews) if (v.until < now) previews.delete(k);
  if (previews.size > 200) previews.clear();
  const id = randomBytes(12).toString("base64url");
  previews.set(id, { settings, until: now + PREVIEW_MS });
  return { id, expiresAt: new Date(now + PREVIEW_MS).toISOString() };
}

export function readPreview(id: string) {
  const p = previews.get(id);
  if (!p || p.until < Date.now()) return null;
  return p.settings;
}
