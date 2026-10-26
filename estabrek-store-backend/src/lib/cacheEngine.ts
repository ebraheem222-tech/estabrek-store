/**
 * The in-memory cache layer (L1): one store per namespace, bounded by bytes,
 * with a choice of eviction rule. Pure (no database, no Redis), so it is tested
 * on its own; lib/cache.ts wires it to the settings, Redis and the routes.
 *
 * Eviction rules (what leaves first when the store is full):
 *   smart  segmented LRU: new entries start on "probation"; a second use moves them
 *          to the "protected" part (80% of the space). Probation empties first, so a
 *          bot walking through 1000 pages once cannot push out the popular ones.
 *   lru    the one used longest ago.
 *   fifo   the one stored first (uses don't count).
 *   lfu    the least used, with uses fading (half every 10 minutes): among the 32
 *          oldest entries, the one with the lowest faded count (sampled, like Redis).
 *
 * Whatever the rule, entries of popular products (priority 1) and pinned ones
 * (priority 2, see lib/popularity.ts) leave last: the rule's next victim is
 * skipped while an ordinary entry can go instead. With smart, they go straight
 * to the protected part.
 */

export type EvictionPolicy = "smart" | "lru" | "fifo" | "lfu";
export type EvictReason = "size" | "expired" | "invalidated" | "manual";

export type CacheEntry = {
  key: string;
  /** Response cache: the JSON text and status sent as they were. */
  body?: string;
  status?: number;
  /** Older data-level callers (lib/cache.ts cacheGet/cacheSet): the value itself. */
  value?: unknown;
  bytes: number;
  createdAt: number;
  /** Served as is until then. */
  freshUntil: number;
  /** After freshUntil and until then: only while someone fetches a fresh copy. */
  staleUntil: number;
  /** Generation stamp of the data it was built from; another stamp = out of date. */
  stamp: string;
  /** How long building it took (ms), to estimate the time each hit saves. */
  costMs: number;
  hits: number;
  lastHit: number;
  /** The product this answer is about (popularity), when known. */
  subject?: string;
  /** 0 ordinary, 1 popular, 2 pinned: higher leaves later. */
  priority?: number;
};

export type StoreStats = {
  hits: number;
  staleHits: number;
  misses: number;
  writes: number;
  /** Not stored because a single answer would take too much of the space. */
  tooBig: number;
  loads: number;
  loadMs: number;
  evictions: Record<EvictReason, number>;
};

export type Lookup = { entry: CacheEntry; fresh: boolean };

const PROTECTED_SHARE = 0.8;
const LFU_SAMPLE = 32;
const LFU_HALF_LIFE_MS = 10 * 60_000;
/** How far down the line to look for an ordinary entry before giving up a popular one. */
const PRIORITY_SCAN = 64;
/** One answer may use at most this share of its store. */
const MAX_ENTRY_SHARE = 0.25;
/** Map overhead per entry (key, object, bookkeeping), roughly. */
const ENTRY_OVERHEAD = 160;

export function emptyStats(): StoreStats {
  return {
    hits: 0,
    staleHits: 0,
    misses: 0,
    writes: 0,
    tooBig: 0,
    loads: 0,
    loadMs: 0,
    evictions: { size: 0, expired: 0, invalidated: 0, manual: 0 },
  };
}

/** Bytes an entry takes: its text (UTF-16 in memory) plus the key and bookkeeping. */
export function entryBytes(key: string, text: string) {
  return (key.length + text.length) * 2 + ENTRY_OVERHEAD;
}

/** Uses fade by half every 10 minutes: what counts for LFU. */
export function fadedHits(e: Pick<CacheEntry, "hits" | "lastHit">, now: number) {
  return e.hits * Math.pow(2, -Math.max(0, now - e.lastHit) / LFU_HALF_LIFE_MS);
}

export class MemoryStore {
  /** smart: probation; the other rules keep everything here. Oldest first. */
  private probation = new Map<string, CacheEntry>();
  private protectedPart = new Map<string, CacheEntry>();
  private probationBytes = 0;
  private protectedBytes = 0;
  stats: StoreStats = emptyStats();

  constructor(
    readonly name: string,
    private policy: EvictionPolicy,
    private maxBytes: number,
  ) {}

  get bytes() {
    return this.probationBytes + this.protectedBytes;
  }
  get size() {
    return this.probation.size + this.protectedPart.size;
  }
  get limitBytes() {
    return this.maxBytes;
  }
  get rule() {
    return this.policy;
  }

  /** Looks an entry up; out-of-date and expired ones are dropped (and counted). */
  get(key: string, stamp: string, now: number): Lookup | undefined {
    const inProtected = this.protectedPart.get(key);
    const entry = inProtected ?? this.probation.get(key);
    if (!entry) return undefined;
    if (entry.stamp !== stamp) {
      this.remove(key, "invalidated");
      return undefined;
    }
    if (now >= entry.staleUntil) {
      this.remove(key, "expired");
      return undefined;
    }
    entry.hits = this.policy === "lfu" ? fadedHits(entry, now) + 1 : entry.hits + 1;
    entry.lastHit = now;
    this.touch(entry, !!inProtected);
    return { entry, fresh: now < entry.freshUntil };
  }

  /** Stores an entry (replacing one with the same key), making room first. */
  set(entry: CacheEntry, now = Date.now()): boolean {
    if (entry.bytes > this.maxBytes * MAX_ENTRY_SHARE) {
      this.stats.tooBig += 1;
      return false;
    }
    // A fresh copy of a popular answer keeps its uses and its place.
    const old = this.peek(entry.key);
    const wasProtected = this.protectedPart.has(entry.key);
    if (old) {
      entry.hits = Math.max(entry.hits, old.hits);
      entry.lastHit = Math.max(entry.lastHit, old.lastHit);
    }
    this.remove(entry.key, null);
    this.stats.writes += 1;
    if ((wasProtected || (entry.priority ?? 0) > 0) && this.policy === "smart") {
      this.protectedPart.set(entry.key, entry);
      this.protectedBytes += entry.bytes;
      this.balance();
    } else {
      this.probation.set(entry.key, entry);
      this.probationBytes += entry.bytes;
    }
    this.trim(now);
    return this.has(entry.key);
  }

  has(key: string) {
    return this.probation.has(key) || this.protectedPart.has(key);
  }

  peek(key: string) {
    return this.protectedPart.get(key) ?? this.probation.get(key);
  }

  /** Removes one entry. reason null = replaced (not an eviction). */
  remove(key: string, reason: EvictReason | null) {
    const p = this.probation.get(key);
    if (p) {
      this.probation.delete(key);
      this.probationBytes -= p.bytes;
    } else {
      const q = this.protectedPart.get(key);
      if (!q) return false;
      this.protectedPart.delete(key);
      this.protectedBytes -= q.bytes;
    }
    if (reason) this.stats.evictions[reason] += 1;
    return true;
  }

  /** Removes every entry whose key starts with prefix (or all). Returns how many. */
  clear(reason: EvictReason = "manual", prefix = "") {
    let n = 0;
    for (const key of [...this.probation.keys(), ...this.protectedPart.keys()]) {
      if (key.startsWith(prefix) && this.remove(key, reason)) n += 1;
    }
    return n;
  }

  /** Drops what expired or went out of date. Returns how many. */
  sweep(now: number, stampOk: (stamp: string) => boolean) {
    let n = 0;
    for (const e of [...this.probation.values(), ...this.protectedPart.values()]) {
      if (!stampOk(e.stamp)) {
        if (this.remove(e.key, "invalidated")) n += 1;
      } else if (now >= e.staleUntil && this.remove(e.key, "expired")) n += 1;
    }
    return n;
  }

  /** New size or rule from the admin: the store keeps what fits. */
  configure(policy: EvictionPolicy, maxBytes: number, now = Date.now()) {
    if (policy !== this.policy) {
      // Everything goes back to one line (oldest first) and sorts itself out again.
      const all = [...this.probation.values(), ...this.protectedPart.values()].sort((a, b) => a.lastHit - b.lastHit);
      this.probation = new Map(all.map((e) => [e.key, e]));
      this.protectedPart = new Map();
      this.probationBytes = all.reduce((s, e) => s + e.bytes, 0);
      this.protectedBytes = 0;
      this.policy = policy;
    }
    this.maxBytes = maxBytes;
    this.trim(now);
  }

  entries(): CacheEntry[] {
    return [...this.probation.values(), ...this.protectedPart.values()];
  }

  /** smart only: how much sits in the protected part. */
  get protectedSize() {
    return this.protectedPart.size;
  }

  private touch(entry: CacheEntry, inProtected: boolean) {
    if (this.policy === "fifo" || this.policy === "lfu") return;
    if (this.policy === "lru") {
      this.probation.delete(entry.key);
      this.probation.set(entry.key, entry);
      return;
    }
    // smart: a use on probation earns a place in the protected part.
    if (inProtected) {
      this.protectedPart.delete(entry.key);
      this.protectedPart.set(entry.key, entry);
      return;
    }
    this.probation.delete(entry.key);
    this.probationBytes -= entry.bytes;
    this.protectedPart.set(entry.key, entry);
    this.protectedBytes += entry.bytes;
    this.balance();
  }

  /** The protected part is full: its least recent go back to probation (newest end). */
  private balance() {
    while (this.protectedBytes > this.maxBytes * PROTECTED_SHARE && this.protectedPart.size > 1) {
      const [k, e] = this.protectedPart.entries().next().value as [string, CacheEntry];
      this.protectedPart.delete(k);
      this.protectedBytes -= e.bytes;
      this.probation.set(k, e);
      this.probationBytes += e.bytes;
    }
  }

  private trim(now: number) {
    while (this.bytes > this.maxBytes && this.size > 0) {
      const victim = this.pickVictim(now);
      if (!victim) break;
      this.remove(victim, "size");
    }
  }

  private pickVictim(now: number): string | undefined {
    if (this.policy === "lfu") {
      let best: CacheEntry | undefined;
      let bestScore = Infinity;
      let i = 0;
      for (const e of this.probation.values()) {
        // Popular and pinned entries only lose against each other.
        const s = fadedHits(e, now) + (e.priority ?? 0) * 1e9;
        if (s < bestScore) {
          best = e;
          bestScore = s;
        }
        if (++i >= LFU_SAMPLE) break;
      }
      return best?.key;
    }
    return this.firstOrdinary(this.probation) ?? this.firstOrdinary(this.protectedPart);
  }

  /** The first entry in line that isn't popular (or simply the first, when all near the front are). */
  private firstOrdinary(part: Map<string, CacheEntry>): string | undefined {
    let first: string | undefined;
    let lowest: CacheEntry | undefined;
    let i = 0;
    for (const e of part.values()) {
      if (first === undefined) first = e.key;
      const p = e.priority ?? 0;
      if (p === 0) return e.key;
      if (!lowest || p < (lowest.priority ?? 0)) lowest = e;
      if (++i >= PRIORITY_SCAN) break;
    }
    return lowest?.key ?? first;
  }

  /** Popularity changed: entries take their new priority (smart moves the popular ones to protected). */
  reprioritize(priorityOf: (subject: string) => number) {
    for (const e of [...this.probation.values(), ...this.protectedPart.values()]) {
      if (!e.subject) continue;
      const p = priorityOf(e.subject);
      if (p === (e.priority ?? 0)) continue;
      e.priority = p;
      if (this.policy === "smart" && p > 0 && this.probation.has(e.key)) {
        this.probation.delete(e.key);
        this.probationBytes -= e.bytes;
        this.protectedPart.set(e.key, e);
        this.protectedBytes += e.bytes;
      }
    }
    this.balance();
  }
}

/** Keys of a query in a stable order, so ?a=1&b=2 and ?b=2&a=1 share one entry. */
export function stableQuery(query: Record<string, unknown> | undefined | null): string {
  if (!query) return "";
  const keys = Object.keys(query).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = query[k];
    if (v === undefined) continue;
    const list = Array.isArray(v) ? v : [v];
    for (const one of list) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(typeof one === "string" ? one : JSON.stringify(one))}`);
  }
  return parts.join("&");
}

/** JSON with object keys sorted (for keys made from a request body). */
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`)
    .join(",")}}`;
}
