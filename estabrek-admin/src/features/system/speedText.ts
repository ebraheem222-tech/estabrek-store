// Plain-Arabic labels and small helpers for the speed monitor and request lanes. Pure (tested).
import type { LaneName, RouteRule, SpeedPatch, TrafficConfig, TrafficLimits } from "../../api/speed.api";

export const LANE_TEXT: Record<LaneName, { label: string; note: string }> = {
  critical: { label: "مهم جداً", note: "الدفع، الطلبات، الدخول. بياخد أكثر دور." },
  admin: { label: "لوحة الإدارة", note: "كل شي بلوحة الإدارة." },
  normal: { label: "تصفّح المتجر", note: "المنتجات، الصفحات، الفلاتر." },
  heavy: { label: "شغل تقيل", note: "البحث بالصورة، الذكاء الاصطناعي، الشات، الاقتراحات." },
};

export const LANES: LaneName[] = ["critical", "admin", "normal", "heavy"];

export const MODE_TEXT: Record<TrafficConfig["mode"], { label: string; hint: string }> = {
  off: { label: "مطفي", hint: "كل الطلبات بتمشي مع بعض متل قبل، وما في عدّ." },
  watch: { label: "مراقبة بس", hint: "ما في انتظار. بنعدّ بس كم طلب كان رح يستنى لو كانت الحدود شغّالة. ابدأ فيها لتشوف الأرقام." },
  on: { label: "شغّال", hint: "كل مسار إله حد. اللي زيادة بيستنى دوره، والمهم بياخد أدوار أكثر. اللي استنى كثير بياخد «مشغول، جرّب كمان شوي»، أو نسخة قديمة من الكاش إذا في." },
};

export const TRAFFIC_FIELD_TEXT: Record<string, string> = {
  mode: "تشغيل المسارات",
  globalLimit: "الحد الكلي",
  slowMs: "حد الطلب البطيء",
  routes: "قواعد المسارات",
  limit: "الحد",
  queue: "طول الدور",
  waitMs: "أطول انتظار",
  weight: "الأولوية",
};

/** "traffic.lanes.heavy.limit" → "شغل تقيل: الحد". */
export function describeTrafficField(path: string): string | null {
  const parts = path.split(".");
  if (parts[0] !== "traffic") return null;
  if (parts[1] === "lanes" && parts.length === 4) return `${LANE_TEXT[parts[2] as LaneName]?.label ?? parts[2]}: ${TRAFFIC_FIELD_TEXT[parts[3]] ?? parts[3]}`;
  return TRAFFIC_FIELD_TEXT[parts[1]] ?? parts[1];
}

/** The main thread's delay: under 50 ms fine, under 200 ms some waiting, above that everything waits. */
export function loopStatus(p99: number): { label: string; variant: "success" | "warning" | "danger" } {
  if (p99 < 50) return { label: "سريع", variant: "success" };
  if (p99 < 200) return { label: "في شوية انتظار", variant: "warning" };
  return { label: "كل الطلبات عم تستنى", variant: "danger" };
}

export function msText(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} ث`;
}

export function shareText(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** Only what differs, ready to send (the routes list goes whole). */
export function speedPatch(draft: TrafficConfig, saved: TrafficConfig): SpeedPatch {
  const out: SpeedPatch = {};
  if (draft.mode !== saved.mode) out.mode = draft.mode;
  if (draft.globalLimit !== saved.globalLimit) out.globalLimit = draft.globalLimit;
  if (draft.slowMs !== saved.slowMs) out.slowMs = draft.slowMs;
  for (const l of LANES) {
    const diff: Record<string, number> = {};
    for (const f of ["limit", "queue", "waitMs", "weight"] as const) if (draft.lanes[l][f] !== saved.lanes[l][f]) diff[f] = draft.lanes[l][f];
    if (Object.keys(diff).length) out.lanes = { ...(out.lanes ?? {}), [l]: diff };
  }
  if (JSON.stringify(draft.routes) !== JSON.stringify(saved.routes)) out.routes = draft.routes;
  return out;
}

export function speedChangedPaths(draft: TrafficConfig, saved: TrafficConfig): string[] {
  const p = speedPatch(draft, saved);
  const out = (["mode", "globalLimit", "slowMs", "routes"] as const).filter((k) => k in p).map((k) => `traffic.${k}`);
  for (const [l, fields] of Object.entries(p.lanes ?? {})) for (const f of Object.keys(fields ?? {})) out.push(`traffic.lanes.${l}.${f}`);
  return out;
}

export function speedOutOfRange(draft: TrafficConfig, limits: TrafficLimits): string[] {
  const bad: string[] = [];
  const check = (path: string, v: number, key: keyof TrafficLimits) => {
    const { min, max } = limits[key];
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) bad.push(path);
  };
  check("traffic.globalLimit", draft.globalLimit, "globalLimit");
  check("traffic.slowMs", draft.slowMs, "slowMs");
  for (const l of LANES) for (const f of ["limit", "queue", "waitMs", "weight"] as const) check(`traffic.lanes.${l}.${f}`, draft.lanes[l][f], f);
  return bad;
}

/** "GET /v1/catalog/products/:id" → the rule that moves it to another lane (method + the path before its first ":"). */
export function ruleForRoute(route: string, lane: LaneName): RouteRule {
  const [method, ...rest] = route.split(" ");
  const path = rest.join(" ").split("/:")[0] || "/";
  return { match: `${method} ${path}`, lane };
}

/** Adds or replaces the rule for the same match. */
export function upsertRule(rules: RouteRule[], rule: RouteRule): RouteRule[] {
  const others = rules.filter((r) => r.match !== rule.match);
  return [...others, rule].slice(-50);
}

export const isValidMatch = (m: string) => /^((GET|POST|PUT|PATCH|DELETE) )?\/[^\s]*$/.test(m.trim());

/** Why an index is suggested, in words. */
export function indexWhyText(s: { why: "filter" | "order"; columns: string[]; table: string }): string {
  return s.why === "filter"
    ? `الاستعلام بيدوّر بـ ${s.table}، وما في فهرس بيبلّش بأي عمود بيدوّر فيه: قاعدة البيانات بتقرا الجدول كله. فهرس على ${s.columns.join(" و")} بيحلّها.`
    : `الاستعلام بيرتّب ${s.table} حسب ${s.columns.join(" و")} وبياخد أول كم سطر، وما في فهرس للترتيب: بيرتّب الجدول كله كل مرة.`;
}

export function rowsText(rows: number | null): string {
  if (rows == null) return "حجم الجدول مش معروف";
  if (rows >= 1_000_000) return `حوالي ${(rows / 1_000_000).toFixed(1)} مليون سطر`;
  if (rows >= 1000) return `حوالي ${Math.round(rows / 1000).toLocaleString("en")} ألف سطر`;
  return `${rows.toLocaleString("en")} سطر`;
}

/** Advice when a shared piece is small. */
export function poolAdvice(pool: { limit: number; fromUrl: boolean }): string | null {
  if (pool.fromUrl && pool.limit >= 10) return null;
  return `قاعدة البيانات عندها ${pool.limit} اتصالات بس${pool.fromUrl ? "" : " (الافتراضي)"}. على Railway ضيف connection_limit=10 لرابط DATABASE_URL (بعد ? أو &) إذا خطة قاعدة البيانات بتسمح.`;
}

export function threadsAdvice(t: { size: number; fromEnv: boolean }): string | null {
  if (t.size >= 8) return null;
  return `في ${t.size} خيوط بس لتصغير الصور وكلمات المرور. على Railway ضيف المتغيّر UV_THREADPOOL_SIZE=8.`;
}
