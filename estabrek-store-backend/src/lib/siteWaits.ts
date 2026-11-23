/**
 * A whole site's rule on what its visitors add (sites wave G3 of docs/sites-300-plan.ar.md): a player applies to a
 * game server's whitelist, or to one of its jobs, once; and after an answer, again only once some days have passed.
 * The site's file names the table, the fields that make two rows the same kind (the job applied for), the days (or the
 * site's number setting holding them, so its owner changes them), and the states of a row still waiting for an
 * answer, which hold a new one back however old it is.
 *
 * Asked of a signed-in shopper's new row through the API (modules/data/data.routes.ts), against their own rows only.
 * The store's own members, its keys and its functions add rows without it.
 */
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { SETTING_KEY } from "./pageTree.js";
import { declsOf, valuesOf, type SettingDecl } from "./siteSettings.js";

const TABLE_REF = /^@table:([A-Za-z0-9][A-Za-z0-9_-]{0,40})$/;
const FIELD = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
export const WAIT_LIMITS = { waits: 8, same: 3, days: 365, open: 8 } as const;

export const WaitSchema = z
  .object({
    table: z.string().regex(TABLE_REF, "A table of the site, as @table:<its key>"),
    same: z.array(z.string().regex(FIELD, "A field's id")).max(WAIT_LIMITS.same),
    days: z.number().int().min(0).max(WAIT_LIMITS.days),
    setting: z.string().regex(SETTING_KEY).optional(),
    open: z.object({ field: z.string().regex(FIELD, "A field's id"), values: z.array(z.string().min(1).max(40)).min(1).max(WAIT_LIMITS.open) }).strict().optional(),
  })
  .strict();
export const WaitsSchema = z.array(WaitSchema).max(WAIT_LIMITS.waits);
export type Wait = z.infer<typeof WaitSchema>;

const keyOf = (ref: string) => TABLE_REF.exec(ref)?.[1] ?? "";

/** Where a site's rules talk about what its file doesn't hold: a table, a field, a number setting. */
export function waitProblems(waits: Wait[], tables: Array<{ key: string; fields: unknown[] }>, decls: Array<{ key: string; kind: string }>): Array<{ at: string; message: string }> {
  const out: Array<{ at: string; message: string }> = [];
  waits.forEach((w, i) => {
    const at = `waits.${i}`;
    const table = tables.find((t) => t.key === keyOf(w.table));
    if (!table) return out.push({ at, message: `"${keyOf(w.table)}" isn't one of the site's tables` });
    const ids = new Set(table.fields.map((f) => (f && typeof f === "object" ? String((f as { id?: unknown }).id) : "")));
    for (const f of [...w.same, ...(w.open ? [w.open.field] : [])]) if (!ids.has(f)) out.push({ at, message: `The table "${table.key}" has no field "${f}"` });
    if (w.setting && decls.find((d) => d.key === w.setting)?.kind !== "number") out.push({ at, message: `"${w.setting}" isn't one of the site's number settings` });
  });
  return out;
}

/** Why a shopper's new row waits: one of theirs still waiting for an answer, or the days since their last one. */
export type Held = { why: "waiting" } | { why: "soon"; since: number; left: number };

/** Every site here with rules, the tables they hold by key, and its settings' values. */
async function sitesWithWaits() {
  const rows = await prisma.$queryRaw<Array<{ waits: unknown; tables: unknown; decls: unknown; settings: unknown }>>`
    SELECT "template"->'file'->'waits' AS "waits", "template"->'ids'->'table' AS "tables", "template"->'file'->'settings' AS "decls", "settings"
    FROM "Feature" WHERE jsonb_typeof("template"->'file'->'waits') = 'array'`;
  return rows.flatMap((r) => {
    const waits = WaitsSchema.safeParse(r.waits);
    if (!waits.success) return [];
    const tables = r.tables && typeof r.tables === "object" ? (r.tables as Record<string, unknown>) : {};
    const decls: SettingDecl[] = declsOf(r.decls);
    return [{ waits: waits.data, tables, values: valuesOf(decls, r.settings) }];
  });
}

const DAY = 86_400_000;
/**
 * A row holds the same value in a field: a choice by its id, words in any of their languages (a player's name as
 * it was written, {"ar": "Zed"}), trimmed and in any case, as a field's "only value" rule compares them.
 */
function sameAs(field: string, value: unknown): Prisma.Sql {
  const texts = value && typeof value === "object" && !Array.isArray(value) ? Object.values(value as Record<string, unknown>).filter((x): x is string => typeof x === "string") : [value === null || value === undefined ? "" : String(value)];
  const wanted = [...new Set(texts.map((t) => t.trim().toLowerCase()))];
  if (!wanted.length) wanted.push("");
  return Prisma.sql`(lower(btrim(coalesce(i."data"->>${field}, ''))) IN (${Prisma.join(wanted)}) OR (jsonb_typeof(i."data"->${field}) = 'object' AND EXISTS (SELECT 1 FROM jsonb_each_text(i."data"->${field}) AS w(k, v) WHERE lower(btrim(w.v)) IN (${Prisma.join(wanted)}))))`;
}

/** Whether a shopper's new row in this table waits, by the rules of the site it belongs to (null: it may be added). */
export async function heldBack(tableId: string, ownerId: string, values: Record<string, unknown>, now = Date.now()): Promise<{ wait: Wait; held: Held } | null> {
  for (const site of await sitesWithWaits()) {
    for (const wait of site.waits) {
      if (site.tables[keyOf(wait.table)] !== tableId) continue;
      const set = wait.setting ? site.values[wait.setting] : undefined;
      const days = typeof set === "number" && Number.isFinite(set) && set >= 0 ? Math.min(Math.floor(set), WAIT_LIMITS.days) : wait.days;
      const same = wait.same.map((f) => sameAs(f, values[f]));
      const state = wait.open ? Prisma.sql`i."data"->>${wait.open.field}` : Prisma.sql`NULL`;
      const theirs = await prisma.$queryRaw<Array<{ createdAt: Date; state: string | null }>>(Prisma.sql`
        SELECT i."createdAt", ${state} AS "state" FROM "CollectionItem" i
        WHERE i."collectionId" = ${tableId} AND i."ownerId" = ${ownerId} AND i."deletedAt" IS NULL ${same.length ? Prisma.sql`AND ${Prisma.join(same, " AND ")}` : Prisma.empty}
        ORDER BY i."createdAt" DESC LIMIT 50`);
      if (!theirs.length) continue;
      if (wait.open && theirs.some((r) => r.state !== null && wait.open!.values.includes(r.state))) return { wait, held: { why: "waiting" } };
      const since = Math.max(0, Math.floor((now - theirs[0].createdAt.getTime()) / DAY));
      if (now - theirs[0].createdAt.getTime() < days * DAY) return { wait, held: { why: "soon", since, left: Math.max(1, days - since) } };
    }
  }
  return null;
}

type Words = { ar: string; en: string; he: string };
/** "2 أيام", "يومين", "11 يوم": a count of days as Arabic says it. */
const arDays = (n: number) => (n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يوم`);
/** Why the row waits, in the three languages, as the shop's form says it under its button. */
export function heldWords(held: Held): Words {
  if (held.why === "waiting") {
    return {
      ar: "طلبك اللي قبل لسّا عم ينراجع. بيوصلك الرد عليه قبل ما تقدّم مرة تانية.",
      en: "Your last application is still being reviewed. You'll get its answer before you can apply again.",
      he: "הבקשה הקודמת שלכם עדיין בבדיקה. תקבלו עליה תשובה לפני שתוכלו להגיש שוב.",
    };
  }
  const since = held.since === 0 ? { ar: "اليوم", en: "today", he: "היום" } : held.since === 1 ? { ar: "مبارح", en: "yesterday", he: "אתמול" } : { ar: `قبل ${arDays(held.since)}`, en: `${held.since} days ago`, he: `לפני ${held.since} ימים` };
  const left = held.left === 1 ? { ar: "من بكرا", en: "tomorrow", he: "ממחר" } : { ar: `بعد ${arDays(held.left)}`, en: `in ${held.left} days`, he: `בעוד ${held.left} ימים` };
  return {
    ar: `قدّمت ${since.ar}. فيك تقدّم كمان مرة ${left.ar}.`,
    en: `You applied ${since.en}. You can apply again ${left.en}.`,
    he: `הגשתם ${since.he}. אפשר להגיש שוב ${left.he}.`,
  };
}
