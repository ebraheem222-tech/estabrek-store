/**
 * Missing-index suggestions for the slowest queries (admin → مراقبة السرعة
 * والأولوية → أبطأ الاستعلامات), the pure part: reading a query and the index it
 * could use (lib/indexAdvice.ts adds the database's own index list and table
 * sizes). From each query Prisma sends we keep its shape:
 * the main table, the columns it filters on (= / IN / IS NULL, then ranges) and
 * what it sorts by. A query that is slow, runs often, on a table that isn't small,
 * and that no index can start on, gets a suggestion: the Prisma line for
 * schema.prisma and the SQL. Nothing is created here: an index is a change to
 * the schema (a migration), and building one on a big table takes time.
 */
export type QueryShape = { table: string; eq: string[]; range: string[]; order: string[]; limit: boolean };

/** Positions of `word` outside brackets, after `from`. */
function topLevel(s: string, word: RegExp, from: number) {
  const out: number[] = [];
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth += 1;
    else if (c === ")") depth -= 1;
    else if (depth === 0) {
      word.lastIndex = i;
      const m = word.exec(s);
      if (m && m.index === i) out.push(i);
    }
  }
  return out;
}

const COND = /"public"\."(\w+)"\."(\w+)"\)?\s*(=|>=|<=|<>|!=|>|<|NOT IN\b|IN\b|IS NOT NULL|IS NULL|NOT LIKE|LIKE|NOT ILIKE|ILIKE)/gi;

/** A Prisma SELECT → its table, filter columns and sort; null for anything else. */
export function parseQueryShape(sql: string): QueryShape | null {
  const s = sql.replace(/\s+/g, " ").trim();
  if (!/^SELECT /i.test(s)) return null;
  const from = /\bFROM "public"\."(\w+)"/i.exec(s);
  if (!from) return null;
  const table = from[1];
  const start = from.index + from[0].length;
  // The main query's ORDER BY / LIMIT (not a subquery's). In a COUNT(*) FROM (SELECT …) they're inside the brackets.
  const depthAtStart = [...s.slice(0, start)].reduce((d, c) => d + (c === "(" ? 1 : c === ")" ? -1 : 0), 0);
  let end = s.length;
  if (depthAtStart > 0) {
    let d = depthAtStart;
    for (let i = start; i < s.length; i++) {
      if (s[i] === "(") d += 1;
      else if (s[i] === ")" && --d < depthAtStart) {
        end = i;
        break;
      }
    }
  }
  const body = s.slice(0, end);
  const orderAt = topLevel(body, /ORDER BY /iy, start).pop();
  const limitAt = topLevel(body, /(LIMIT|OFFSET) /iy, start)[0];
  const whereEnd = orderAt ?? limitAt ?? body.length;
  const eq: string[] = [];
  const range: string[] = [];
  for (const m of body.slice(start, whereEnd).matchAll(COND)) {
    if (m[1] !== table) continue;
    const op = m[3].toUpperCase();
    const col = m[2];
    if (op === "=" || op === "IN" || op === "IS NULL") {
      if (!eq.includes(col)) eq.push(col);
    } else if ([">", ">=", "<", "<=", "LIKE"].includes(op)) {
      if (!range.includes(col) && !eq.includes(col)) range.push(col);
    }
  }
  const order: string[] = [];
  if (orderAt != null) {
    const list = body.slice(orderAt + 9, limitAt != null && limitAt > orderAt ? limitAt : body.length);
    for (const m of list.matchAll(/"public"\."(\w+)"\."(\w+)"/g)) if (m[1] === table && !order.includes(m[2])) order.push(m[2]);
  }
  return { table, eq, range, order, limit: limitAt != null };
}

export type IndexSuggestion = {
  table: string;
  columns: string[];
  why: "filter" | "order";
  prisma: string;
  sql: string;
};

/** Below this many rows a full read of the table is fast enough. */
export const SMALL_TABLE = 1000;

/**
 * The index a query could use, unless one already starts on a column it filters
 * (or sorts) by. `indexes`: each existing index's columns, in order.
 */
export function suggestIndex(shape: QueryShape, indexes: string[][], rows: number | null): IndexSuggestion | null {
  if (rows != null && rows >= 0 && rows < SMALL_TABLE) return null;
  const filter = [...shape.eq, ...shape.range];
  const sorted = shape.order.length > 0 && shape.limit;
  if (!filter.length && !sorted) return null;
  const firsts = new Set(indexes.map((cols) => cols[0]).filter(Boolean));
  const usable = filter.length ? filter.some((c) => firsts.has(c)) : firsts.has(shape.order[0]);
  if (usable) return null;
  const columns = [...shape.eq];
  if (sorted) for (const c of shape.order) if (!columns.includes(c)) columns.push(c);
  if (!sorted && shape.range[0] && !columns.includes(shape.range[0])) columns.push(shape.range[0]);
  const cols = columns.slice(0, 3);
  const name = `${shape.table}_${cols.join("_")}_idx`.slice(0, 63);
  return {
    table: shape.table,
    columns: cols,
    why: filter.length ? "filter" : "order",
    prisma: `@@index([${cols.join(", ")}])`,
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${name}" ON "${shape.table}" (${cols.map((c) => `"${c}"`).join(", ")});`,
  };
}

/** Worth a look: slow on average, or a big share of the database time, and not a one-off. */
export function worthAdvice(q: { count: number; avgMs: number; totalMs: number }, allMs: number) {
  return q.count >= 20 && (q.avgMs >= 20 || (allMs > 0 && q.totalMs / allMs >= 0.1));
}

