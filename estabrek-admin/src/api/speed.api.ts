// The speed monitor and request lanes (admin → مراقبة السرعة والأولوية).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type LaneName = "critical" | "admin" | "normal" | "heavy";
export type LaneConfig = { limit: number; queue: number; waitMs: number; weight: number };
export type RouteRule = { match: string; lane: LaneName };

export type TrafficConfig = {
  mode: "off" | "watch" | "on";
  globalLimit: number;
  slowMs: number;
  lanes: Record<LaneName, LaneConfig>;
  routes: RouteRule[];
};

export type TrafficLimits = Record<"limit" | "queue" | "waitMs" | "weight" | "globalLimit" | "slowMs", { min: number; max: number }>;

export type LaneLive = {
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
  limit: number;
  queueLimit: number;
  avgWaitMs: number;
};

export type MonitorRoute = {
  route: string;
  lane: string | null;
  count: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  totalMs: number;
  dbShare: number;
  avgDbQueries: number;
  avgWaitMs: number;
  cacheShare: number;
  errors: number;
  clientErrors: number;
  lastAt: string;
};

export type Monitor = {
  now: number;
  since: string;
  totals: { requests: number; avgMs: number; errors: number };
  eventLoop: { now: { t: number; p50: number; p99: number; max: number }; history: Array<{ t: number; p50: number; p99: number; max: number }> };
  workerThreads: { size: number; fromEnv: boolean; cpus: number };
  databasePool: { limit: number; fromUrl: boolean; timeoutSeconds: number };
  memory: { rssBytes: number; heapUsedBytes: number };
  minutes: Array<{ t: number; requests: number; slow: number; errors: number; totalMs: number }>;
  routes: MonitorRoute[];
  queries: Array<{ sql: string; count: number; avgMs: number; maxMs: number; totalMs: number; lastAt: string }>;
  slow: Array<{ at: string; route: string; path: string; status: number; ms: number; waitedMs: number; dbMs: number; dbCount: number; lane: string | null }>;
  errors: Array<{ route: string; count: number; lastAt: string; lastMessage: string | null; status: number }>;
};

export type LanesLive = { mode: TrafficConfig["mode"]; running: number; globalLimit: number; lanes: Record<LaneName, LaneLive> };

export type SpeedLive = { lanes: LanesLive; monitor: Monitor };

export type SpeedPage = SpeedLive & {
  config: TrafficConfig;
  defaults: TrafficConfig;
  limits: TrafficLimits;
  builtInRoutes: RouteRule[];
  updatedAt: string | null;
};

export type SpeedPatch = Partial<Omit<TrafficConfig, "lanes">> & { lanes?: Partial<Record<LaneName, Partial<LaneConfig>>> };

/* ---------------- Real shoppers' speed (تجربة الزباين) ---------------- */

export type RumMetric = "lcp" | "inp" | "cls" | "fcp" | "ttfb" | "scrollFps" | "slowFrames" | "sceneFps";
export type RumPage = "home" | "shop" | "product" | "category" | "search" | "cart" | "checkout" | "account" | "order" | "page" | "other";
export type RumDevice = "phone" | "tablet" | "desktop";
export type RumOs = "android" | "ios" | "windows" | "mac" | "linux" | "other";
export type RumRating = "good" | "okay" | "poor";

/** value: what 75% of visits did better than (p75 for times, p25 for frames a second). */
export type RumValue = { value: number | null; rating: RumRating | null; count: number; avg: number };
export type RumValues = Partial<Record<RumMetric, RumValue>>;

export type RumItem = {
  page: RumPage;
  device: RumDevice;
  /** "all" unless the report was split by system. */
  os: RumOs | "all";
  visits: number;
  metrics: RumValues;
  /** Worse in the last 3 days than the 7 before. */
  worse: RumMetric[];
  daily: Array<{ day: string; lcp: number | null; inp: number | null; scrollFps: number | null }>;
};

export type RumReport = {
  now: number;
  days: number;
  overall: RumValues;
  items: RumItem[];
  /** Since the server started. */
  collected: { reports: number; bots: number; waiting: number };
  thresholds: Record<RumMetric, { better: "lower" | "higher"; good: number; poor: number }>;
};

export type RumQuery = { days: number; device?: RumDevice; os?: RumOs; split: "os" | "device" };

const S = ENDPOINTS.admin.systemSpeed;

/** A missing index for a slow query (nothing is created: it's a line for schema.prisma). */
export type IndexSuggestion = {
  table: string;
  columns: string[];
  why: "filter" | "order";
  prisma: string;
  sql: string;
  /** Postgres' estimate; null when the table was never counted. */
  rows: number | null;
  query: { sql: string; count: number; avgMs: number; totalMs: number };
};

export async function getIndexAdvice() {
  return (await api.get(S.indexes)).data as { checked: number; suggestions: IndexSuggestion[] };
}

export async function getRum(q: RumQuery) {
  const params: Record<string, string | number> = { days: q.days, split: q.split };
  if (q.device) params.device = q.device;
  if (q.os) params.os = q.os;
  return (await api.get(S.rum, { params })).data as RumReport;
}

export async function getSpeedPage() {
  return (await api.get(S.base)).data as SpeedPage;
}

export async function getSpeedLive() {
  return (await api.get(S.live)).data as SpeedLive;
}

export async function saveSpeed(patch: SpeedPatch) {
  return (await api.patch(S.base, patch)).data as { config: TrafficConfig; changed: string[] };
}

export async function resetSpeed() {
  return (await api.post(S.reset, {})).data as { config: TrafficConfig; changed: string[] };
}

export async function resetSpeedStats() {
  return (await api.post(S.resetStats, {})).data as SpeedLive & { ok: true };
}
