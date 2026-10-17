/**
 * Building the popular products' pages before anyone asks (the warm-up): after
 * a product or stock change (a few seconds later, once the writes are done),
 * after the admin empties the cache, after the server starts, and from the
 * admin's button. Pinned products first, then the most popular (warmCount).
 *
 * The routes register how to build their answers (registerWarmer); see
 * modules/catalog/catalog.warm.ts. Only one warm-up runs at a time.
 */
import { cacheConfig } from "./cacheConfig.js";
import { onCatalogChange, onPurge } from "./cache.js";
import { warmList } from "./popularity.js";
import { triggerJob } from "./jobs.js";

export type WarmerResult = { built: number; skipped: number };
type Warmer = (productIds: string[]) => Promise<WarmerResult>;
export type WarmResult = { at: string; reason: string; products: number; built: number; skipped: number; errors: number; ms: number };

const warmers = new Map<string, Warmer>();
let running: Promise<WarmResult> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let last: WarmResult | null = null;

export function registerWarmer(name: string, fn: Warmer) {
  warmers.set(name, fn);
}

function allowed() {
  const c = cacheConfig();
  return c.enabled && c.popularity.enabled && c.popularity.warmCount > 0;
}

/** Builds the popular pages now (or joins the warm-up already running). */
export function warmNow(reason: string): Promise<WarmResult> {
  if (running) return running;
  running = (async () => {
    const t0 = Date.now();
    const ids = allowed() ? warmList(cacheConfig().popularity.warmCount) : [];
    let built = 0;
    let skipped = 0;
    let errors = 0;
    if (ids.length) {
      for (const fn of warmers.values()) {
        try {
          const r = await fn(ids);
          built += r.built;
          skipped += r.skipped;
        } catch {
          errors += 1;
        }
      }
    }
    last = { at: new Date(t0).toISOString(), reason, products: ids.length, built, skipped, errors, ms: Date.now() - t0 };
    return last;
  })().finally(() => {
    running = null;
  });
  return running;
}

/** A warm-up `delayMs` after the last call (many writes in a row → one warm-up). */
export function scheduleWarm(reason: string, delayMs = 5_000) {
  // The background job (src/jobs.ts: cacheWarm) when the server runs them; paused there = no warm-ups.
  if (triggerJob("cacheWarm", delayMs)) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void warmNow(reason);
  }, delayMs);
  timer.unref?.();
}

export function warmStatus() {
  return { last, running: !!running, scheduled: !!timer, warmers: [...warmers.keys()] };
}

onCatalogChange(() => {
  if (allowed() && cacheConfig().popularity.warmOnChange) scheduleWarm("change", 5_000);
});

onPurge((ns) => {
  if (allowed() && (!ns || ns === "products" || ns === "sku")) scheduleWarm("purge", 1_000);
});

/** Tests: forget the last run and any pending one. */
export function resetWarmForTests() {
  if (timer) clearTimeout(timer);
  timer = null;
  last = null;
  warmers.clear();
}
