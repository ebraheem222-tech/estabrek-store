/**
 * Traffic lanes: requests by priority, so slow or heavy work can't make the
 * important work wait (admin → مراقبة السرعة والأولوية).
 *
 * In Node a slow request doesn't hold the others back by itself: while it waits
 * for the database the server answers the rest. What runs out is shared: the
 * database connections, the worker threads (images, passwords) and the main
 * thread (the image search's AI). So each lane may run only so many requests at
 * once; the rest wait in their lane's queue:
 *
 *   critical  checkout, orders, payments, sign-in       (weight 8)
 *   admin     the admin panel                           (weight 4)
 *   normal    browsing the shop                         (weight 4)
 *   heavy     image search, AI, chat, recommendations   (weight 1)
 *
 * When a place frees up, the next request is chosen by weighted round robin
 * between the lanes that have someone waiting (a weight-8 lane gets 8 turns for
 * every 1 of a weight-1 lane, but every lane gets turns), and inside a lane by
 * round robin between visitors (one IP can't take every turn). Waiting longer
 * than the lane's waitMs, or arriving when its queue is full, gets "busy, try
 * again" (or an older copy from the cache). Work already running is never cut off.
 *
 * Modes: "off" (nothing), "watch" (counts what would have waited, delays nothing:
 * the default, to see the numbers first), "on".
 */
import { z } from "zod";
import { prisma } from "./prisma.js";

export const LANE_NAMES = ["critical", "admin", "normal", "heavy"] as const;
export type LaneName = (typeof LANE_NAMES)[number];

export const TRAFFIC_LIMITS = {
  limit: { min: 1, max: 500 },
  queue: { min: 0, max: 5000 },
  waitMs: { min: 100, max: 60_000 },
  weight: { min: 1, max: 20 },
  globalLimit: { min: 4, max: 2000 },
  slowMs: { min: 100, max: 60_000 },
} as const;

const n = (key: keyof typeof TRAFFIC_LIMITS) => z.coerce.number().int().min(TRAFFIC_LIMITS[key].min).max(TRAFFIC_LIMITS[key].max);

export const LaneConfigSchema = z.object({
  /** Running at once in this lane. */
  limit: n("limit"),
  /** Waiting at most (more are turned away at once). */
  queue: n("queue"),
  /** Longest wait before "busy, try again". */
  waitMs: n("waitMs"),
  /** Turns when places free up, against the other lanes. */
  weight: n("weight"),
});

export type LaneConfig = z.infer<typeof LaneConfigSchema>;

/** "GET /v1/storefront/search" or "/v1/ai" (any method): a path start. */
export const RouteRuleSchema = z.object({
  match: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .regex(/^((GET|POST|PUT|PATCH|DELETE) )?\/[^\s]*$/, "Like “GET /v1/catalog/products” or “/v1/ai”"),
  lane: z.enum(LANE_NAMES),
});

export type RouteRule = z.infer<typeof RouteRuleSchema>;

export const TrafficConfigSchema = z.object({
  mode: z.enum(["off", "watch", "on"]),
  /** Running at once in all lanes together. */
  globalLimit: n("globalLimit"),
  /** A request slower than this is kept as an example (the monitor). */
  slowMs: n("slowMs"),
  lanes: z.object(Object.fromEntries(LANE_NAMES.map((l) => [l, LaneConfigSchema])) as Record<LaneName, typeof LaneConfigSchema>),
  /** The admin's own rules, before the built-in ones (the longest match wins). */
  routes: z.array(RouteRuleSchema).max(50),
});

export type TrafficConfig = z.infer<typeof TrafficConfigSchema>;

export function trafficDefaults(): TrafficConfig {
  return {
    mode: "watch",
    globalLimit: 96,
    slowMs: 1000,
    lanes: {
      critical: { limit: 32, queue: 200, waitMs: 15_000, weight: 8 },
      admin: { limit: 16, queue: 100, waitMs: 10_000, weight: 4 },
      normal: { limit: 48, queue: 400, waitMs: 8_000, weight: 4 },
      heavy: { limit: 3, queue: 30, waitMs: 6_000, weight: 1 },
    },
    routes: [],
  };
}

export function mergeTrafficConfig(saved: unknown, base: TrafficConfig = trafficDefaults()): TrafficConfig {
  const s = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const out: TrafficConfig = { ...base, lanes: { ...base.lanes }, routes: [...base.routes] };
  for (const k of ["mode", "globalLimit", "slowMs", "routes"] as const) {
    if (!(k in s)) continue;
    const ok = TrafficConfigSchema.shape[k].safeParse(s[k]);
    if (ok.success) (out as Record<string, unknown>)[k] = ok.data;
  }
  const lanes = s.lanes && typeof s.lanes === "object" ? (s.lanes as Record<string, unknown>) : {};
  for (const l of LANE_NAMES) {
    const part = lanes[l];
    if (!part || typeof part !== "object") continue;
    const ok = LaneConfigSchema.safeParse({ ...base.lanes[l], ...(part as object) });
    if (ok.success) out.lanes[l] = ok.data;
  }
  return out;
}

/** "traffic.lanes.heavy.limit"-style names of what differs. */
export function trafficChanges(a: TrafficConfig, b: TrafficConfig): string[] {
  const out: string[] = [];
  for (const k of ["mode", "globalLimit", "slowMs"] as const) if (a[k] !== b[k]) out.push(`traffic.${k}`);
  for (const l of LANE_NAMES) {
    for (const f of Object.keys(a.lanes[l]) as Array<keyof LaneConfig>) if (a.lanes[l][f] !== b.lanes[l][f]) out.push(`traffic.lanes.${l}.${f}`);
  }
  if (JSON.stringify(a.routes) !== JSON.stringify(b.routes)) out.push("traffic.routes");
  return out;
}

/* ---------------- Which lane ---------------- */

/** Built-in rules: [method or "*", path start, lane]. The longest match wins (an admin rule beats a built-in one of the same length). */
export const BUILT_IN_ROUTES: Array<[string, string, LaneName]> = [
  ["POST", "/v1/catalog/order-requests", "critical"],
  ["POST", "/v1/catalog/cart-quote", "critical"],
  ["POST", "/v1/catalog/quote", "critical"],
  ["*", "/v1/storefront/checkout", "critical"],
  ["*", "/v1/webhooks", "critical"],
  ["*", "/v1/auth", "critical"],
  ["*", "/v1/customer/auth", "critical"],
  ["*", "/v1/orders", "critical"],
  ["*", "/v1/storefront/search/image", "heavy"],
  ["*", "/v1/storefront/chatbot", "heavy"],
  ["*", "/v1/storefront/recommend", "heavy"],
  ["*", "/v1/ai", "heavy"],
  // The admin's AI work (writing descriptions, answering questions); its settings page stays in "admin".
  ["*", "/v1/admin/ai-catalog", "heavy"],
  ["*", "/v1/admin/ai-orders", "heavy"],
  ["*", "/v1/admin/ai-ask", "heavy"],
  ["*", "/v1/admin/system/backups", "heavy"],
  ["*", "/v1/admin", "admin"],
];

function parseRule(match: string): [string, string] {
  const sp = match.indexOf(" ");
  return sp > 0 ? [match.slice(0, sp), match.slice(sp + 1)] : ["*", match];
}

const startsAt = (path: string, prefix: string) => path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`) || (prefix.endsWith("/") && path.startsWith(prefix));

/** The lane of a request (admin rules, built-in rules, then: semantic search is heavy; the rest normal). */
export function laneOf(method: string, path: string, query: Record<string, unknown> | undefined, rules: RouteRule[] = []): LaneName {
  let best: { len: number; lane: LaneName } | null = null;
  const consider = (m: string, prefix: string, lane: LaneName, bonus: number) => {
    if (m !== "*" && m !== method) return;
    if (!startsAt(path, prefix)) return;
    const len = prefix.length * 2 + (m === "*" ? 0 : 1) + bonus;
    if (!best || len > best.len) best = { len, lane };
  };
  for (const r of rules) {
    const [m, p] = parseRule(r.match);
    consider(m, p, r.lane, 1);
  }
  for (const [m, p, lane] of BUILT_IN_ROUTES) consider(m, p, lane, 0);
  if (best) return (best as { lane: LaneName }).lane;
  // A search by meaning (embeddings) does what an image search does.
  const semantic = query?.semantic;
  if (path === "/v1/catalog/products" && (semantic === "1" || semantic === "true" || semantic === true)) return "heavy";
  return "normal";
}

/* ---------------- The scheduler ---------------- */

export type LaneStats = {
  running: number;
  waiting: number;
  peak: number;
  admitted: number;
  queued: number;
  waitMsTotal: number;
  waitMsMax: number;
  timedOut: number;
  rejected: number;
  abandoned: number;
  wouldQueue: number;
  servedStale: number;
};

const emptyLaneStats = (): LaneStats => ({
  running: 0,
  waiting: 0,
  peak: 0,
  admitted: 0,
  queued: 0,
  waitMsTotal: 0,
  waitMsMax: 0,
  timedOut: 0,
  rejected: 0,
  abandoned: 0,
  wouldQueue: 0,
  servedStale: 0,
});

type Waiter = {
  ip: string;
  since: number;
  start: (waitedMs: number, release: () => void) => void;
  timeout: () => void;
  timer: ReturnType<typeof setTimeout> | null;
};

type Lane = {
  stats: LaneStats;
  /** Waiting per visitor, oldest first; `ring` is the visitors' turn order. */
  byIp: Map<string, Waiter[]>;
  ring: string[];
  next: number;
  /** Smooth weighted round robin. */
  current: number;
};

export type Admission = {
  /** The client went away while waiting (or the request ended): forget it. */
  cancel: () => void;
};

export type Callbacks = {
  start: (waitedMs: number, release: () => void) => void;
  timeout: () => void;
  reject: () => void;
};

export class LaneScheduler {
  private lanes = new Map<LaneName, Lane>(LANE_NAMES.map((l) => [l, { stats: emptyLaneStats(), byIp: new Map(), ring: [], next: 0, current: 0 }]));
  private running = 0;

  constructor(
    private config: () => TrafficConfig,
    private now: () => number = Date.now,
  ) {}

  private lane(l: LaneName) {
    return this.lanes.get(l)!;
  }

  private canStart(l: LaneName, c: TrafficConfig) {
    return this.lane(l).stats.running < c.lanes[l].limit && this.running < c.globalLimit;
  }

  admit(l: LaneName, ip: string, cb: Callbacks): Admission {
    const c = this.config();
    if (c.mode === "off") {
      cb.start(0, () => undefined);
      return { cancel: () => undefined };
    }
    const lane = this.lane(l);
    if (c.mode === "watch") {
      if (!this.canStart(l, c)) lane.stats.wouldQueue += 1;
      this.begin(l, 0, cb.start);
      return { cancel: () => undefined };
    }
    if (this.canStart(l, c) && lane.stats.waiting === 0) {
      this.begin(l, 0, cb.start);
      return { cancel: () => undefined };
    }
    if (lane.stats.waiting >= c.lanes[l].queue) {
      lane.stats.rejected += 1;
      cb.reject();
      return { cancel: () => undefined };
    }
    const w: Waiter = { ip, since: this.now(), start: cb.start, timeout: cb.timeout, timer: null };
    w.timer = setTimeout(() => {
      if (this.remove(l, w)) {
        lane.stats.timedOut += 1;
        w.timeout();
      }
    }, c.lanes[l].waitMs);
    w.timer.unref?.();
    const q = lane.byIp.get(ip);
    if (q) q.push(w);
    else {
      lane.byIp.set(ip, [w]);
      lane.ring.push(ip);
    }
    lane.stats.waiting += 1;
    // A place may be free in a lane with nobody waiting before: hand it out now.
    this.dispatch();
    return {
      cancel: () => {
        if (this.remove(l, w)) lane.stats.abandoned += 1;
      },
    };
  }

  private remove(l: LaneName, w: Waiter) {
    const lane = this.lane(l);
    const q = lane.byIp.get(w.ip);
    const i = q ? q.indexOf(w) : -1;
    if (!q || i < 0) return false;
    q.splice(i, 1);
    if (w.timer) clearTimeout(w.timer);
    lane.stats.waiting -= 1;
    if (!q.length) this.dropIp(lane, w.ip);
    return true;
  }

  private dropIp(lane: Lane, ip: string) {
    lane.byIp.delete(ip);
    const at = lane.ring.indexOf(ip);
    if (at >= 0) {
      lane.ring.splice(at, 1);
      if (lane.next > at) lane.next -= 1;
      if (lane.next >= lane.ring.length) lane.next = 0;
    }
  }

  private begin(l: LaneName, waitedMs: number, start: Callbacks["start"]) {
    const s = this.lane(l).stats;
    s.running += 1;
    s.admitted += 1;
    s.peak = Math.max(s.peak, s.running);
    this.running += 1;
    if (waitedMs > 0) {
      s.queued += 1;
      s.waitMsTotal += waitedMs;
      s.waitMsMax = Math.max(s.waitMsMax, waitedMs);
    }
    let released = false;
    start(waitedMs, () => {
      if (released) return;
      released = true;
      s.running -= 1;
      this.running -= 1;
      this.dispatch();
    });
  }

  /** Hands free places to waiting requests: weighted round robin between lanes, round robin between visitors. */
  dispatch() {
    const c = this.config();
    if (c.mode !== "on") return;
    while (this.running < c.globalLimit) {
      const ready = LANE_NAMES.filter((l) => this.lane(l).stats.waiting > 0 && this.lane(l).stats.running < c.lanes[l].limit);
      if (!ready.length) return;
      let total = 0;
      let pick: LaneName = ready[0];
      for (const l of ready) {
        const lane = this.lane(l);
        lane.current += c.lanes[l].weight;
        total += c.lanes[l].weight;
        if (lane.current > this.lane(pick).current) pick = l;
      }
      this.lane(pick).current -= total;
      const w = this.takeNext(pick);
      if (!w) return;
      this.begin(pick, Math.max(1, this.now() - w.since), w.start);
    }
  }

  private takeNext(l: LaneName): Waiter | null {
    const lane = this.lane(l);
    if (!lane.ring.length) return null;
    if (lane.next >= lane.ring.length) lane.next = 0;
    const ip = lane.ring[lane.next];
    const q = lane.byIp.get(ip)!;
    const w = q.shift()!;
    if (w.timer) clearTimeout(w.timer);
    lane.stats.waiting -= 1;
    if (!q.length) this.dropIp(lane, ip);
    else lane.next = (lane.next + 1) % lane.ring.length;
    return w;
  }

  noteStale(l: LaneName) {
    this.lane(l).stats.servedStale += 1;
  }

  snapshot() {
    const c = this.config();
    return {
      mode: c.mode,
      running: this.running,
      globalLimit: c.globalLimit,
      lanes: Object.fromEntries(
        LANE_NAMES.map((l) => {
          const s = this.lane(l).stats;
          return [l, { ...s, limit: c.lanes[l].limit, queueLimit: c.lanes[l].queue, avgWaitMs: s.queued ? Math.round(s.waitMsTotal / s.queued) : 0 }];
        }),
      ) as Record<LaneName, LaneStats & { limit: number; queueLimit: number; avgWaitMs: number }>,
    };
  }

  /** Clears the counts (what is running or waiting stays). */
  resetStats() {
    for (const lane of this.lanes.values()) {
      const { running, waiting } = lane.stats;
      lane.stats = { ...emptyLaneStats(), running, waiting, peak: running };
    }
  }
}

/* ---------------- The settings in force ---------------- */

let current: TrafficConfig = trafficDefaults();
let loadedAt = 0;
let loading: Promise<void> | null = null;

export function trafficConfig(): TrafficConfig {
  if (Date.now() - loadedAt > 15_000 && !loading) void loadTrafficConfig();
  return current;
}

export function loadTrafficConfig(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
      const data = row?.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
      applyTrafficConfig(mergeTrafficConfig(data.traffic));
    } catch {
      // keep what we have
    } finally {
      loadedAt = Date.now();
      loading = null;
    }
  })();
  return loading;
}

/** The one scheduler of this server. */
export const lanes = new LaneScheduler(() => current);

export function applyTrafficConfig(next: TrafficConfig) {
  current = next;
  loadedAt = Date.now();
  // Higher limits may let waiting requests go now.
  lanes.dispatch();
}
