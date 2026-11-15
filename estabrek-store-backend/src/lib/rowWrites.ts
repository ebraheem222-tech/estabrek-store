/**
 * A table's rows written, one way for every door: the admin's grid, a file's worth of rows, and
 * the automatic API (modules/data). Values are checked against the table's fields and their
 * rules, addresses are made, relations are looked up, and "the only value" is asked of the
 * database. (It lived in the grid's controller until the API needed the same.)
 */
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma, type CollectionItem } from "@prisma/client";
import { prisma } from "./prisma.js";
import { AppError } from "../utils/httpError.js";
import { triggerCmsRevalidate } from "./cmsRevalidate.js";
import { checkItemData, ITEM_SLUG, LIMITS, withDefaults } from "./collections.js";
import { changedUnique, uniqueIssues, type Candidate } from "./uniqueValues.js";
import { hiddenOf, shownRow } from "./schemaChange.js";
import { checkLinks, incomingTo, linkGone, linkedFrom, relationsOf, saveLinks, splitLinks, withLinks, type Asked, type Incoming } from "./links.js";
import type { Field } from "./collectionTree.js";
import { STATUSES } from "./dataQuery.js";
import { LANGS, freeSlug, looseData, patchData, slugFrom, type Issue } from "./dataRows.js";

/**
 * The shop's pages that show rows are drawn again: at once after a change, and for changes that
 * come one after another (a program writing through the API) once every couple of seconds, the
 * last of them always included.
 */
const REFRESH_EVERY_MS = 2000;
let refreshedAt = 0;
let refreshWaiting: ReturnType<typeof setTimeout> | null = null;
export function refresh() {
  const run = () => {
    refreshedAt = Date.now();
    refreshWaiting = null;
    void triggerCmsRevalidate([]).catch(() => {});
  };
  if (refreshWaiting) return;
  const since = Date.now() - refreshedAt;
  if (since >= REFRESH_EVERY_MS) return run();
  refreshWaiting = setTimeout(run, REFRESH_EVERY_MS - since);
  refreshWaiting.unref?.();
}
export const LONG = { timeout: 120_000, maxWait: 10_000 };
export type Status = (typeof STATUSES)[number];
export const StatusIn = z.enum(STATUSES);
export const taken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** The table, and the relations (of any table) that link it: the other side, read from the same links. */
export async function tableOf(id: string) {
  const c = await prisma.collection.findUnique({ where: { id }, select: { id: true, slug: true, fields: true } });
  if (!c) throw new AppError(404, "NOT_FOUND", "No such table");
  return { id: c.id, slug: c.slug, fields: (Array.isArray(c.fields) ? c.fields : []) as Field[], incoming: await incomingTo(prisma, c.id) };
}

/** A row's owner as the admin is told: who the shopper is, or (`owners: "id"`, a member who may not see the customers) only that there is one. */
export type RowOwner = { id: string; name?: string; email?: string };

/**
 * Rows as answered: the table's own values, each relation's linked rows, (`from`) who links the row
 * through each relation that links this table, and (`owner`) the shopper whose row it is.
 */
export async function answer<T extends { id: string; data: unknown; ownerId?: string | null }>(table: { id: string; fields: Field[]; incoming: Incoming[] }, rows: T[], opts: { owners?: "full" | "id" } = {}) {
  const linked = await withLinks(prisma, table, rows.map((row) => shownRow(row, table.fields)));
  const ownerIds = [...new Set(linked.map((row) => row.ownerId).filter((id): id is string => !!id))];
  const people = ownerIds.length && opts.owners === "full" ? new Map((await prisma.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, email: true } })).map((u) => [u.id, u])) : null;
  const shown = ownerIds.length ? linked.map((row) => (row.ownerId ? { ...row, owner: (people?.get(row.ownerId) ?? { id: row.ownerId }) as RowOwner } : row)) : linked;
  if (!table.incoming.length) return shown;
  const from = await linkedFrom(prisma, table.id, table.incoming, shown.map((row) => row.id));
  return shown.map((row) => ({ ...row, from: from.get(row.id) ?? {} }));
}

/* ---------------- Rows in: one, or a file's worth ---------------- */

export type RowIn = { slug?: string; status?: string; values: Record<string, unknown>; /** The shopper adding it (the API), to be its owner. */ ownerId?: string | null };
export type Rejected = { row: number; slug: string | null; issues: Issue[] };

/**
 * Checks a batch against the table and what's already in it, and (unless `dryRun`) writes it.
 * "create" refuses an address that's already used; "upsert" changes that row instead: the columns
 * given replace its values, the others stay.
 */
export async function writeRows(table: { id: string; fields: Field[] }, rows: RowIn[], opts: { mode: "create" | "upsert"; lang: (typeof LANGS)[number]; dryRun: boolean }) {
  const rejected: Rejected[] = [];
  const given = rows.map((row) => (typeof row.slug === "string" && row.slug.trim() ? row.slug.trim().toLowerCase() : null));
  const existing = new Map(
    (await prisma.collectionItem.findMany({ where: { collectionId: table.id, slug: { in: given.filter((s): s is string => !!s) } }, select: { id: true, slug: true, data: true, deletedAt: true, publishedAt: true } })).map((x) => [x.slug, x]),
  );
  const seen = new Set<string>();
  // `asked`: what the row asks of its relations; `links`: those rows, checked (below), to write with it.
  let creates: Array<{ row: number; slug: string | null; data: Record<string, unknown>; status: Status; asked: Asked; links: Map<string, string[]>; ownerId: string | null }> = [];
  let updates: Array<{ row: number; slug: string; id: string; data: Record<string, unknown>; changed: Set<string>; status?: Status; publish: boolean; asked: Asked; links: Map<string, string[]> }> = [];
  const none = () => new Map<string, string[]>();

  rows.forEach((row, index) => {
    const slug = given[index];
    const issues: Issue[] = [];
    const status = row.status === undefined || row.status === "" ? undefined : StatusIn.safeParse(String(row.status).toUpperCase());
    if (status && !status.success) issues.push({ field: "status", message: "DRAFT, PUBLISHED or ARCHIVED" });
    if (slug && !ITEM_SLUG.test(slug)) issues.push({ field: "slug", message: "Small letters, digits and -" });
    if (slug && seen.has(slug)) issues.push({ field: "slug", message: "Twice in this file" });
    const was = slug ? existing.get(slug) : undefined;
    if (was?.deletedAt) issues.push({ field: "slug", message: "This address is in the trash" });
    else if (was && opts.mode === "create") issues.push({ field: "slug", message: "This address is already used" });

    // A relation's cell names rows (by address or id): taken apart from the values, looked up below.
    const split = splitLinks(table.fields, row.values, false);
    const loose = looseData(table.fields, split.rest, opts.lang);
    issues.push(...split.issues, ...loose.issues);
    // A row being changed keeps the values of the columns the file doesn't have (a text field: its other languages).
    const merged: Record<string, unknown> = was ? { ...((was.data ?? {}) as Record<string, unknown>) } : {};
    for (const [id, v] of Object.entries(loose.data)) {
      const before = merged[id];
      merged[id] = v && typeof v === "object" && !Array.isArray(v) && before && typeof before === "object" && !Array.isArray(before) ? { ...(before as object), ...(v as object) } : v;
    }
    // A new row starts from the fields' defaults, where the file gave nothing for a field.
    const checked = checkItemData(table.fields, was ? merged : withDefaults(table.fields, merged));
    if (!checked.ok) issues.push(...checked.issues);
    if (issues.length || !checked.ok) {
      rejected.push({ row: index, slug, issues });
      return;
    }
    if (slug) seen.add(slug);
    const next = status?.success ? status.data : undefined;
    // What a change of fields put aside in this row stays with it.
    if (was) updates.push({ row: index, slug: was.slug, id: was.id, data: { ...hiddenOf(was.data, table.fields), ...checked.data }, changed: changedUnique(table.fields, (was.data ?? {}) as Record<string, unknown>, checked.data), status: next, publish: next === "PUBLISHED" && !was.publishedAt, asked: split.asked, links: none() });
    else creates.push({ row: index, slug, data: checked.data, status: next ?? "DRAFT", asked: split.asked, links: none(), ownerId: row.ownerId ?? null });
  });

  // The relations: the asked rows are looked up, then each relation's own rules (one row, a row linked once, required).
  if (relationsOf(table.fields).length) {
    const check = await checkLinks(prisma, table, [...creates.map((c) => ({ asked: c.asked })), ...updates.map((u) => ({ id: u.id, asked: u.asked }))]);
    const n = creates.length;
    creates.forEach((c, k) => (c.links = check.ready[k]));
    updates.forEach((u, k) => (u.links = check.ready[n + k]));
    if (check.issues.size) {
      creates.forEach((c, k) => check.issues.has(k) && rejected.push({ row: c.row, slug: c.slug, issues: check.issues.get(k)! }));
      updates.forEach((u, k) => check.issues.has(n + k) && rejected.push({ row: u.row, slug: u.slug, issues: check.issues.get(n + k)! }));
      creates = creates.filter((_, k) => !check.issues.has(k));
      updates = updates.filter((_, k) => !check.issues.has(n + k));
      rejected.sort((a, b) => a.row - b.row);
    }
  }

  // "The only value": against the table and among the rows of this batch.
  if (table.fields.some((f) => f.unique)) {
    const candidates: Candidate[] = [...creates.map((c) => ({ data: c.data })), ...updates.map((u) => ({ id: u.id, data: u.data, changed: u.changed }))];
    const taken = await uniqueIssues(prisma, table.id, table.fields, candidates);
    if (taken.size) {
      creates.forEach((c, k) => taken.has(k) && rejected.push({ row: c.row, slug: c.slug, issues: taken.get(k)! }));
      updates.forEach((u, k) => taken.has(creates.length + k) && rejected.push({ row: u.row, slug: u.slug, issues: taken.get(creates.length + k)! }));
      const n = creates.length;
      creates = creates.filter((_, k) => !taken.has(k));
      updates = updates.filter((_, k) => !taken.has(n + k));
      rejected.sort((a, b) => a.row - b.row);
    }
  }

  // Rows without an address get one from their words; one the table already uses gets a few random letters after it.
  const auto = creates.filter((c) => !c.slug);
  if (auto.length) {
    const wanted = auto.map((c) => slugFrom(table.fields, c.data));
    const inTable = new Set((await prisma.collectionItem.findMany({ where: { collectionId: table.id, slug: { in: wanted } }, select: { slug: true } })).map((x) => x.slug));
    auto.forEach((c, k) => {
      const base = inTable.has(wanted[k]) ? `${wanted[k].slice(0, 70)}-${randomBytes(3).toString("hex")}` : wanted[k];
      c.slug = freeSlug(base, seen);
      seen.add(c.slug);
    });
  }

  if (creates.length) {
    const have = await prisma.collectionItem.count({ where: { collectionId: table.id, deletedAt: null } });
    if (have + creates.length > LIMITS.items) throw new AppError(400, "TOO_MANY_ROWS", `A table holds up to ${LIMITS.items} rows`, { have, adding: creates.length, limit: LIMITS.items });
  }
  if (!opts.dryRun && (creates.length || updates.length)) {
    const now = new Date();
    const linking = creates.filter((c) => c.links.size);
    const writes = (db: Pick<Prisma.TransactionClient, "collectionItem">) => [
      ...(creates.length
        ? [db.collectionItem.createMany({ data: creates.map((c) => ({ collectionId: table.id, slug: c.slug!, data: c.data as Prisma.InputJsonValue, status: c.status, publishedAt: c.status === "PUBLISHED" ? now : null, ownerId: c.ownerId })) })]
        : []),
      ...updates.map((u) => db.collectionItem.update({ where: { id: u.id }, data: { data: u.data as Prisma.InputJsonValue, ...(u.status ? { status: u.status } : {}), ...(u.publish ? { publishedAt: now } : {}), ...(u.links.size ? { updatedAt: now } : {}) } })),
    ];
    if (linking.length || updates.some((u) => u.links.size)) {
      // Rows and their links in one go: the new rows' ids are read back by their addresses.
      await prisma.$transaction(async (tx) => {
        for (const write of writes(tx)) await write;
        const made = new Map((linking.length ? await tx.collectionItem.findMany({ where: { collectionId: table.id, slug: { in: linking.map((c) => c.slug!) } }, select: { id: true, slug: true } }) : []).map((x) => [x.slug, x.id]));
        await saveLinks(tx, table, [...linking.map((c) => ({ id: made.get(c.slug!)!, links: c.links })), ...updates.filter((u) => u.links.size).map((u) => ({ id: u.id, links: u.links }))]);
      }, LONG);
    } else await prisma.$transaction(writes(prisma));
    // New drafts aren't on the shop: nothing there to draw again (rows anyone adds through the API are all drafts).
    if (updates.length || creates.some((c) => c.status === "PUBLISHED")) refresh();
  }
  return { dryRun: opts.dryRun, created: creates.length, updated: updates.length, rejected, slugs: creates.map((c) => c.slug!) };
}

/** One new row; what's wrong with it is said as the routes say it. The row as the database holds it. */
export async function addRow(table: { id: string; fields: Field[] }, row: RowIn, lang: (typeof LANGS)[number]) {
  let out: Awaited<ReturnType<typeof writeRows>>;
  try {
    out = await writeRows(table, [row], { mode: "create", lang, dryRun: false });
  } catch (e) {
    if (taken(e)) throw new AppError(409, "SLUG_TAKEN", "This address is already used");
    if (linkGone(e)) throw new AppError(409, "LINK_GONE", "A linked row was deleted meanwhile; try again");
    throw e;
  }
  if (out.rejected.length) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: out.rejected[0].issues });
  return prisma.collectionItem.findUnique({ where: { collectionId_slug: { collectionId: table.id, slug: out.slugs[0] } } });
}

/* ---------------- A row changed: a cell, or a few ---------------- */

export type RowChange = { slug?: string; status?: Status; sort?: number; values?: Record<string, unknown>; lang: (typeof LANGS)[number] };

/** Some of a row changed; the rest stays. The row as saved. */
export async function changeRow(table: { id: string; fields: Field[] }, was: CollectionItem, body: RowChange) {
  const data: Prisma.CollectionItemUpdateInput = {};
  if (body.slug !== undefined) {
    const slug = body.slug.trim().toLowerCase();
    if (!ITEM_SLUG.test(slug)) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: [{ field: "slug", message: "Small letters, digits and -" }] });
    data.slug = slug;
  }
  // A relation's cell names the rows it links ([] unlinks): looked up and checked apart from the values.
  const split = splitLinks(table.fields, body.values, true);
  if (split.issues.length) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: split.issues });
  const links = split.asked.size ? await checkLinks(prisma, table, [{ id: was.id, asked: split.asked }]) : null;
  if (links?.issues.size) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: links.issues.get(0) });
  if (body.values && Object.keys(split.rest).length) {
    const next = patchData(table.fields, (was.data ?? {}) as Record<string, unknown>, split.rest, body.lang);
    if (!next.ok) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: next.issues });
    const before = (was.data ?? {}) as Record<string, unknown>;
    const taken = await uniqueIssues(prisma, table.id, table.fields, [{ id: was.id, data: next.data, changed: changedUnique(table.fields, before, next.data) }]);
    if (taken.size) throw new AppError(400, "ROW_INVALID", "Some values are wrong", { issues: taken.get(0) });
    data.data = next.data as Prisma.InputJsonValue;
  }
  if (body.status) {
    data.status = body.status;
    if (body.status === "PUBLISHED" && !was.publishedAt) data.publishedAt = new Date();
  }
  if (body.sort !== undefined) data.sort = body.sort;
  try {
    const saved = links
      ? await prisma.$transaction(async (tx) => {
          const row = await tx.collectionItem.update({ where: { id: was.id }, data: { ...data, updatedAt: new Date() } });
          await saveLinks(tx, table, [{ id: was.id, links: links.ready[0] }]);
          return row;
        })
      : await prisma.collectionItem.update({ where: { id: was.id }, data });
    refresh();
    return saved;
  } catch (e) {
    if (taken(e)) throw new AppError(409, "SLUG_TAKEN", "This address is already used");
    if (linkGone(e)) throw new AppError(409, "LINK_GONE", "A linked row was deleted meanwhile; try again");
    throw e;
  }
}
