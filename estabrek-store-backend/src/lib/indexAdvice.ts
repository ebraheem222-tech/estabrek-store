/**
 * Missing-index suggestions for the slowest queries, with the database's own index
 * list and table sizes (the reading and the rules: lib/queryShape.ts).
 */
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { suggestIndex, worthAdvice, type IndexSuggestion, type QueryShape } from "./queryShape.js";

type IndexRow = { table: string; columns: string[] };
type SizeRow = { table: string; rows: number };

/** The tables' indexes and row estimates (Postgres' own counts). */
async function tableFacts(tables: string[]) {
  if (!tables.length) return { indexes: new Map<string, string[][]>(), rows: new Map<string, number>() };
  const [idx, size] = await Promise.all([
    prisma.$queryRaw<IndexRow[]>(Prisma.sql`
      SELECT t.relname AS "table", array_agg(a.attname::text ORDER BY k.ord) AS "columns"
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE n.nspname = 'public' AND t.relname = ANY(${tables}::text[])
      GROUP BY t.relname, ix.indexrelid`),
    prisma.$queryRaw<SizeRow[]>(Prisma.sql`
      SELECT c.relname AS "table", c.reltuples::float8 AS "rows"
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY(${tables}::text[])`),
  ]);
  const indexes = new Map<string, string[][]>();
  for (const r of idx) indexes.set(r.table, [...(indexes.get(r.table) ?? []), r.columns]);
  const rows = new Map(size.map((r) => [r.table, Number(r.rows)]));
  return { indexes, rows };
}

export type QueryForAdvice = { sql: string; count: number; avgMs: number; totalMs: number; shape: QueryShape | null };

/** Suggestions for the slow queries, one per table and columns (the slowest query shown). */
export async function indexAdvice(queries: QueryForAdvice[]) {
  const allMs = queries.reduce((s, q) => s + q.totalMs, 0);
  const candidates = queries.filter((q) => q.shape && worthAdvice(q, allMs)).sort((a, b) => b.totalMs - a.totalMs);
  const tables = [...new Set(candidates.map((q) => q.shape!.table))];
  const { indexes, rows } = await tableFacts(tables);
  const out = new Map<string, IndexSuggestion & { rows: number | null; query: { sql: string; count: number; avgMs: number; totalMs: number } }>();
  for (const q of candidates) {
    const known = rows.get(q.shape!.table);
    const est = known != null && known >= 0 ? Math.round(known) : null;
    const s = suggestIndex(q.shape!, indexes.get(q.shape!.table) ?? [], est);
    if (!s) continue;
    const key = `${s.table}|${s.columns.join(",")}`;
    if (!out.has(key)) out.set(key, { ...s, rows: est, query: { sql: q.sql, count: q.count, avgMs: q.avgMs, totalMs: q.totalMs } });
  }
  return { checked: candidates.length, suggestions: [...out.values()].slice(0, 10) };
}
