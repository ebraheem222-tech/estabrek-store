/**
 * "The only value" (a field's `unique` rule, lib/fieldRules.ts), asked of the database: which of
 * the rows about to be written hold a value another row already has. A row in the trash still
 * holds its values (like its address), so taking a row out of the trash never makes a double.
 *
 * It is a check before the write, not a lock: two people saving the same new value in the same
 * instant can both pass. A table that needs that closed gets it when it becomes a real table.
 */
import { Prisma } from "@prisma/client";
import type { Field } from "./collectionTree.js";
import type { ItemIssue } from "./collections.js";
import { uniqueKeys } from "./fieldRules.js";

type Db = { $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T> };
export type Candidate = {
  /** The row being changed (absent: a new one). */
  id?: string;
  data: Record<string, unknown>;
  /** Only these fields changed (absent: every field counts). */
  changed?: Set<string>;
};

/** For each candidate (by its place in the list), the unique fields whose value is already taken: by a row in the table, or by an earlier candidate. */
export async function uniqueIssues(db: Db, collectionId: string, fields: Field[], candidates: Candidate[]): Promise<Map<number, ItemIssue[]>> {
  const out = new Map<number, ItemIssue[]>();
  const add = (index: number, f: Field) => {
    const list = out.get(index) ?? [];
    if (!list.some((i) => i.field === f.id)) list.push({ field: f.id, message: "Already used", ...(f.message && Object.values(f.message).some(Boolean) ? { say: f.message } : {}) });
    out.set(index, list);
  };
  for (const f of fields) {
    if (!f.unique) continue;
    const wanted = new Map<string, number[]>();
    candidates.forEach((c, index) => {
      if (c.changed && !c.changed.has(f.id)) return;
      for (const key of new Set(uniqueKeys(f, c.data[f.id]))) wanted.set(key, [...(wanted.get(key) ?? []), index]);
    });
    if (!wanted.size) continue;
    // Twice among the rows being written: every one after the first.
    for (const list of wanted.values()) for (const index of list.slice(1)) add(index, f);
    const keys = [...wanted.keys()];
    const held =
      f.type === "text"
        ? await db.$queryRaw<Array<{ id: string; v: string }>>(
            Prisma.sql`SELECT i."id", lower(btrim(w.v)) AS v FROM "CollectionItem" i, jsonb_each_text(CASE WHEN jsonb_typeof(i."data"->${f.id}::text) = 'object' THEN i."data"->${f.id}::text ELSE '{}'::jsonb END) AS w(k, v) WHERE i."collectionId" = ${collectionId} AND lower(btrim(w.v)) IN (${Prisma.join(keys)})`,
          )
        : await db.$queryRaw<Array<{ id: string; v: string }>>(Prisma.sql`SELECT i."id", i."data"->>${f.id}::text AS v FROM "CollectionItem" i WHERE i."collectionId" = ${collectionId} AND i."data"->>${f.id}::text IN (${Prisma.join(keys)})`);
    for (const row of held) for (const index of wanted.get(row.v) ?? []) if (candidates[index].id !== row.id) add(index, f);
  }
  return out;
}

/** The fields that ask for the only value and whose value differs between two versions of a row. */
export function changedUnique(fields: Field[], was: Record<string, unknown>, next: Record<string, unknown>): Set<string> {
  const out = new Set<string>();
  for (const f of fields) if (f.unique && uniqueKeys(f, was[f.id]).sort().join("\n") !== uniqueKeys(f, next[f.id]).sort().join("\n")) out.add(f.id);
  return out;
}
