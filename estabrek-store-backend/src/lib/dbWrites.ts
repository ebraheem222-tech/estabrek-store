/**
 * Which cached data a database write touches, read from the SQL Prisma runs
 * (every query passes through the "query" event in lib/prisma.ts). Catching
 * writes here instead of in each route means a change from anywhere (admin,
 * orders, payment webhooks, a backup restore) clears the right caches.
 */
import type { CacheGroup } from "./cacheConfig.js";

const TABLE_GROUPS: Record<string, CacheGroup[]> = {
  Product: ["catalog"],
  ProductItem: ["catalog"],
  ProductVariant: ["catalog"],
  ProductItemImage: ["catalog"],
  Category: ["catalog"],
  Size: ["catalog"],
  ProductType: ["catalog"],
  Review: ["catalog"],
  ProductComment: ["catalog"],
  Page: ["cms"],
  PageSection: ["cms"],
  PageTranslation: ["cms"],
  PageSectionTranslation: ["cms"],
  NavigationMenu: ["cms", "settings"],
  NavigationItem: ["cms", "settings"],
  SiteSettings: ["settings"],
  // The shop's motion settings go out with the public settings.
  PerformanceSettings: ["settings"],
};

const ALL: CacheGroup[] = ["catalog", "cms", "settings"];

// INSERT INTO "public"."Product" … / UPDATE "public"."ProductVariant" … / DELETE FROM "Page" …
const WRITE = /^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:"?[\w$]+"?\.)?"?([\w$]+)"?/i;
const TRUNCATE = /^\s*TRUNCATE\b/i;

/** The groups an SQL statement writes to ([] for reads and other tables). */
export function groupsWritten(sql: string): CacheGroup[] {
  const head = sql.slice(0, 160);
  if (TRUNCATE.test(head)) return ALL;
  const m = WRITE.exec(head);
  if (!m) return [];
  return TABLE_GROUPS[m[1]] ?? [];
}

const listeners = new Set<(groups: CacheGroup[]) => void>();

export function onDbWrite(fn: (groups: CacheGroup[]) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Called for every query (lib/prisma.ts); cheap for reads. */
export function noteQuery(sql: string) {
  if (!listeners.size || !sql) return;
  const groups = groupsWritten(sql);
  if (!groups.length) return;
  for (const fn of listeners) fn(groups);
}
