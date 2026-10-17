// Plain-Arabic labels and small helpers for the speed & cache page. Pure (tested).
import { describeTrafficField } from "./speedText";
import { describeJobField } from "./jobNames";
import type { CacheConfig, CacheLimits, CacheNamespaceName, CachePatch, CachePolicy, MotionLimits, MotionSection, StorefrontMotion } from "../../api/cache.api";

export const NAMESPACE_TEXT: Record<CacheNamespaceName, { label: string; note: string }> = {
  settings: { label: "إعدادات المتجر والقوائم", note: "اسم المتجر، الهيدر والفوتر، القوائم، وأول بيانات بيحمّلها الموقع." },
  pages: { label: "الصفحات", note: "الصفحات المنشورة وأقسامها." },
  categories: { label: "الأقسام والمقاسات", note: "شجرة الأقسام، المقاسات، وأنواع المنتجات." },
  products: { label: "صفحات المنتجات", note: "كل تفاصيل المنتج: الصور والألوان والمقاسات والسعر." },
  listings: { label: "شبكات المنتجات", note: "صفحة المتجر، المجموعات، الجديد والأكثر مبيعاً." },
  filters: { label: "الفلاتر", note: "خيارات الفلترة وعدد المنتجات بكل خيار." },
  sku: { label: "الألوان والمقاسات والمخزون (SKU)", note: "ألوان ومقاسات ومخزون وصور منتج واحد." },
  search: { label: "البحث", note: "نتائج البحث والاقتراحات وأنت عم تكتب." },
  misc: { label: "غيرها", note: "أي شي تاني بيستخدم الكاش." },
};

export const POLICY_TEXT: Record<CachePolicy, { label: string; hint: string }> = {
  smart: {
    label: "ذكي",
    hint: "الجديد بيبلّش «تجربة»، واللي بينطلب مرة تانية بينقل للقسم المحمي (80% من المساحة). زيارة بوت لألف صفحة ما بتطلّع المنتجات المطلوبة.",
  },
  lru: { label: "LRU", hint: "لما تمتلي، بيطلع الأقدم استخداماً." },
  fifo: { label: "FIFO", hint: "لما تمتلي، بيطلع الأقدم تخزيناً، مهما انطلب." },
  lfu: { label: "LFU", hint: "لما تمتلي، بيطلع الأقل طلباً. الطلبات القديمة بتخفّ (النص كل 10 دقايق)." },
};

export const GROUP_TEXT = {
  catalog: "المنتجات والمخزون",
  cms: "الصفحات والقوائم",
  settings: "الإعدادات",
} as const;

export const POPULARITY_TEXT: Record<string, string> = {
  enabled: "الكاش الذكي (الشعبية)",
  halfLifeHours: "سرعة نسيان الشعبية",
  weightView: "وزن المشاهدة",
  weightWishlist: "وزن المفضلة",
  weightBag: "وزن الإضافة للسلة",
  weightPurchase: "وزن الشراء",
  maxTtlMultiplier: "أطول مدة للأكثر شعبية",
  hotCount: "عدد المنتجات المحمية",
  warmCount: "عدد المنتجات اللي بتتجهّز مسبقاً",
  warmOnChange: "التجهيز بعد كل تعديل",
  pinned: "المنتجات المثبّتة",
};

export const SECTION_TEXT: Record<MotionSection, { label: string; note: string }> = {
  hero: { label: "فيلم البداية (الشال)", note: "الشال اللي بيطير وبيلتف حجاب مع السكرول." },
  opening: { label: "افتتاحية الصورة", note: "صورة البداية لما الفيلم مش شغّال." },
  study: { label: "دراسة القماش (3D)", note: "الحجاب اللي بيلف مع السكرول وفصوله." },
  seasons: { label: "الفصول (3D)", note: "الشتاء والربيع والصيف والخريف." },
  collections: { label: "عوالم المجموعات (3D)", note: "الإكسسوارات والأطفال والبخور." },
  campaign: { label: "فيديو الحملة", note: "الفيديو بعد البداية، بيمشي مع السكرول." },
};

export const MOTION_TEXT: Record<string, string> = {
  keyframeSnap: "القفز للإطارات الرئيسية بالسكرول السريع",
  maxStepMs: "أكبر خطوة بالإطار الواحد",
  maxFps: "أعلى سرعة للـ 3D",
  adaptive: "تخفيف السرعة لحاله على الأجهزة الضعيفة",
  liteMemoryGb: "الوضع الخفيف لأجهزة الذاكرة القليلة",
  liteOnSaveData: "الوضع الخفيف مع توفير البيانات",
  phoneGlass: "تأثير الزجاج على التلفونات",
  desktopDpr: "دقة الـ 3D على الكمبيوتر",
  phoneDpr: "دقة الـ 3D على التلفون",
  lazyPercent: "مسافة التحميل المسبق",
  prebuild3d: "تجهيز الـ 3D مسبقاً",
  prebuildAfterMs: "بداية تجهيز الـ 3D",
  videoPreload: "تحميل فيديو الحملة",
  rumPercent: "الزيارات اللي بتقيس سرعتها",
  on: "الحركة",
  smoothMs: "النعومة",
};

export const MEDIA_TEXT: Record<string, string> = {
  maxUploadMb: "أكبر حجم",
  maxDimension: "أطول ضلع",
  stripMetadata: "شيل المعلومات المخفية",
  format: "الصيغة",
  quality: "الجودة",
  defaultPreset: "النسخة التلقائية",
  autoConvert: "نسخة تلقائية بعد الرفع",
  posterSecond: "ثانية الغلاف",
};

export const PRELOAD_TEXT: Record<StorefrontMotion["videoPreload"], string> = {
  auto: "كله",
  metadata: "المعلومات بس",
  none: "لا شي لحتى يوصله",
};

/** "65 = سريع" style words for a section's smooth time. */
export function smoothText(ms: number): string {
  if (!Number.isFinite(ms)) return "";
  if (ms < 75) return "سريع";
  if (ms < 100) return "متوازن";
  if (ms < 125) return "ناعم";
  return "سينمائي";
}

/** Only what differs between two motion settings, ready to send. */
export function motionPatch(draft: StorefrontMotion, saved: StorefrontMotion): NonNullable<CachePatch["storefront"]> {
  const out: NonNullable<CachePatch["storefront"]> = {};
  for (const [name, part] of Object.entries(draft.sections) as Array<[MotionSection, StorefrontMotion["sections"][MotionSection]]>) {
    const before = saved.sections[name];
    const diff: Record<string, unknown> = {};
    for (const f of Object.keys(part) as Array<keyof typeof part>) if (part[f] !== before?.[f]) diff[f] = part[f];
    if (Object.keys(diff).length) out.sections = { ...(out.sections ?? {}), [name]: diff };
  }
  for (const f of Object.keys(draft) as Array<keyof StorefrontMotion>) {
    if (f === "sections") continue;
    if (draft[f] !== saved[f]) (out as Record<string, unknown>)[f] = draft[f];
  }
  return out;
}

/** Motion numbers outside their range ("storefront.maxStepMs" style). */
export function motionOutOfRange(draft: StorefrontMotion, limits: MotionLimits): string[] {
  const bad: string[] = [];
  const check = (path: string, v: number, key: keyof MotionLimits) => {
    const { min, max } = limits[key];
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) bad.push(path);
  };
  for (const [name, part] of Object.entries(draft.sections)) check(`storefront.sections.${name}.smoothMs`, part.smoothMs, "smoothMs");
  check("storefront.maxStepMs", draft.maxStepMs, "maxStepMs");
  check("storefront.liteMemoryGb", draft.liteMemoryGb, "liteMemoryGb");
  check("storefront.desktopDpr", draft.desktopDpr, "dpr");
  check("storefront.phoneDpr", draft.phoneDpr, "dpr");
  check("storefront.lazyPercent", draft.lazyPercent, "lazyPercent");
  check("storefront.prebuildAfterMs", draft.prebuildAfterMs, "prebuildAfterMs");
  check("storefront.rumPercent", draft.rumPercent, "rumPercent");
  return bad;
}

/** The shop opened with these settings for this browser only (see the shop's lib/motionSettings.ts). */
export function motionPreviewUrl(storefront: string, settings: StorefrontMotion): string {
  const bytes = new TextEncoder().encode(JSON.stringify(settings));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${storefront.replace(/\/+$/, "")}/?motion-preview=${b64}`;
}

export function endPreviewUrl(storefront: string): string {
  return `${storefront.replace(/\/+$/, "")}/?motion-preview=off`;
}

export const WARM_REASON_TEXT: Record<string, string> = {
  start: "بعد تشغيل السيرفر",
  change: "بعد تعديل منتج أو مخزون",
  purge: "بعد تفضية الكاش",
  admin: "من الزر هون",
};

export const FIELD_TEXT: Record<string, string> = {
  enabled: "الكاش",
  memoryMb: "الذاكرة",
  useRedis: "Redis",
  ttlSeconds: "مدة الصلاحية (TTL)",
  staleSeconds: "النسخة القديمة وقت التحديث",
  browserSeconds: "بمتصفح الزبون",
  policy: "قاعدة الإخراج",
  share: "حصّة الذاكرة",
};

/** "namespaces.products.ttlSeconds" → "صفحات المنتجات: مدة الصلاحية (TTL)". */
export function describeField(path: string): string {
  const parts = path.split(".");
  if (parts[0] === "popularity" && parts.length === 2) return POPULARITY_TEXT[parts[1]] ?? parts[1];
  if (parts[0] === "storefront" && parts[1] === "sections" && parts.length === 4) {
    return `${SECTION_TEXT[parts[2] as MotionSection]?.label ?? parts[2]}: ${MOTION_TEXT[parts[3]] ?? parts[3]}`;
  }
  if (parts[0] === "storefront" && parts.length === 2) return MOTION_TEXT[parts[1]] ?? parts[1];
  if (parts[0] === "traffic") return describeTrafficField(path) ?? path;
  if (parts[0] === "jobs") return describeJobField(path) ?? path;
  if (parts[0] === "media" && parts.length === 3) return `${parts[1] === "images" ? "رفع الصور" : "رفع الفيديو"}: ${MEDIA_TEXT[parts[2]] ?? parts[2]}`;
  if (parts[0] === "namespaces" && parts.length === 3) {
    const ns = NAMESPACE_TEXT[parts[1] as CacheNamespaceName]?.label ?? parts[1];
    return `${ns}: ${FIELD_TEXT[parts[2]] ?? parts[2]}`;
  }
  return FIELD_TEXT[path] ?? path;
}

export function describeChanged(changed: string[]): string {
  if (!changed.length) return "بدون تغيير";
  const names = changed.map(describeField);
  return names.length > 3 ? `${names.slice(0, 3).join("، ")} و${names.length - 3} غيرها` : names.join("، ");
}

/** Only what differs from the saved settings, ready to send. */
export function cachePatch(draft: CacheConfig, saved: CacheConfig): CachePatch {
  const out: CachePatch = {};
  if (draft.enabled !== saved.enabled) out.enabled = draft.enabled;
  if (draft.memoryMb !== saved.memoryMb) out.memoryMb = draft.memoryMb;
  if (draft.useRedis !== saved.useRedis) out.useRedis = draft.useRedis;
  for (const name of Object.keys(draft.namespaces) as CacheNamespaceName[]) {
    const a = draft.namespaces[name];
    const b = saved.namespaces[name];
    const diff: Record<string, unknown> = {};
    for (const f of Object.keys(a) as Array<keyof typeof a>) if (a[f] !== b?.[f]) diff[f] = a[f];
    if (Object.keys(diff).length) out.namespaces = { ...(out.namespaces ?? {}), [name]: diff };
  }
  if (draft.popularity && saved.popularity) {
    const diff: Record<string, unknown> = {};
    for (const f of Object.keys(draft.popularity) as Array<keyof typeof draft.popularity>) {
      if (JSON.stringify(draft.popularity[f]) !== JSON.stringify(saved.popularity[f])) diff[f] = draft.popularity[f];
    }
    if (Object.keys(diff).length) out.popularity = diff;
  }
  return out;
}

/** Paths ("memoryMb", "namespaces.sku.ttlSeconds") that differ. */
export function changedPaths(draft: CacheConfig, saved: CacheConfig): string[] {
  const p = cachePatch(draft, saved);
  const out = (["enabled", "memoryMb", "useRedis"] as const).filter((k) => k in p).map(String);
  for (const [name, fields] of Object.entries(p.namespaces ?? {})) for (const f of Object.keys(fields ?? {})) out.push(`namespaces.${name}.${f}`);
  for (const f of Object.keys(p.popularity ?? {})) out.push(`popularity.${f}`);
  return out;
}

/** Paths whose number is outside its allowed range (or not a whole number). */
export function outOfRange(draft: CacheConfig, limits: CacheLimits): string[] {
  const bad: string[] = [];
  const check = (path: string, v: number, key: keyof CacheLimits) => {
    const { min, max } = limits[key];
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) bad.push(path);
  };
  check("memoryMb", draft.memoryMb, "memoryMb");
  for (const [name, c] of Object.entries(draft.namespaces)) {
    for (const f of ["ttlSeconds", "staleSeconds", "browserSeconds", "share"] as const) check(`namespaces.${name}.${f}`, c[f], f);
  }
  const p = draft.popularity;
  if (p && limits.weight) {
    check("popularity.halfLifeHours", p.halfLifeHours, "halfLifeHours");
    for (const f of ["weightView", "weightWishlist", "weightBag", "weightPurchase"] as const) check(`popularity.${f}`, p[f], "weight");
    check("popularity.maxTtlMultiplier", p.maxTtlMultiplier, "maxTtlMultiplier");
    check("popularity.hotCount", p.hotCount, "hotCount");
    check("popularity.warmCount", p.warmCount, "warmCount");
  }
  return bad;
}

/** "× 2.5" style. */
export function timesText(x: number): string {
  if (!Number.isFinite(x)) return "";
  const r = Math.round(x * 10) / 10;
  return `× ${Number.isInteger(r) ? r : r.toFixed(1)}`;
}

/** The TTL a product's pages get now: "10 دقايق ← 40 دقيقة". */
export function boostedTtlText(ttlSeconds: number, multiplier: number): string {
  const boosted = Math.round(ttlSeconds * multiplier);
  return multiplier <= 1.01 ? durationText(ttlSeconds) : `${durationText(ttlSeconds)} ← ${durationText(boosted)}`;
}

/** Pin or unpin a product (at most 50). */
export function togglePinned(pinned: string[], id: string): string[] {
  return pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id].slice(0, 50);
}

/** Each namespace's memory in bytes: the total split by the shares (as the server does). */
export function budgets(config: CacheConfig): Record<CacheNamespaceName, number> {
  const total = config.memoryMb * 1024 * 1024;
  const names = Object.keys(config.namespaces) as CacheNamespaceName[];
  const sum = names.reduce((s, k) => s + (Number.isFinite(config.namespaces[k].share) ? config.namespaces[k].share : 0), 0) || 1;
  return Object.fromEntries(names.map((k) => [k, Math.floor((total * Math.max(0, config.namespaces[k].share || 0)) / sum)])) as Record<
    CacheNamespaceName,
    number
  >;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(bytes < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function ratioText(r: number | null): string {
  return r == null ? "—" : `${Math.round(r * 100)}%`;
}

/** "45 ثانية" / "5 دقايق" / "2 ساعات" / "يوم" for TTL hints. */
export function durationText(seconds: number): string {
  if (!Number.isFinite(seconds)) return "";
  if (seconds <= 0) return "لا";
  if (seconds < 60) return `${Math.round(seconds)} ثانية`;
  if (seconds < 3600) {
    const m = Math.round(seconds / 60);
    return m === 1 ? "دقيقة" : m === 2 ? "دقيقتين" : `${m} دقايق`;
  }
  if (seconds < 86400) {
    const h = Math.round(seconds / 3600);
    return h === 1 ? "ساعة" : h === 2 ? "ساعتين" : `${h} ساعات`;
  }
  const d = Math.round(seconds / 86400);
  return d === 1 ? "يوم" : d === 2 ? "يومين" : `${d} أيام`;
}

/** Time the cache saved the database: "0.4 ثانية" / "12 دقيقة" / "3.5 ساعات". */
export function savedText(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  if (s < 90) return `${s < 10 ? s.toFixed(1) : Math.round(s)} ثانية`;
  const m = s / 60;
  if (m < 90) return `${Math.round(m)} دقيقة`;
  return `${(m / 60).toFixed(1)} ساعات`;
}

export function uptimeText(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} دقيقة`;
  if (seconds < 86400) return durationText(seconds);
  return durationText(seconds);
}

export function redisText(r: { configured: boolean; status: string; inUse: boolean }, useRedis: boolean) {
  if (!r.configured)
    return {
      label: "Redis مش مضبوط",
      variant: "default" as const,
      hint: "الكاش بذاكرة السيرفر بس. لتشاركه بين أكثر من سيرفر وتحفظه وقت إعادة التشغيل، ضيف REDIS_URL على Railway.",
    };
  if (!useRedis) return { label: "Redis متوقف من هون", variant: "default" as const, hint: "Redis موجود بس الكاش ما بيستخدمه (من الإعدادات تحت)." };
  if (r.inUse) return { label: "Redis متصل", variant: "success" as const, hint: "كل جواب بينحفظ بذاكرة السيرفر وبـ Redis كمان." };
  return { label: `Redis مش متصل (${r.status})`, variant: "warning" as const, hint: "السيرفر مش قادر يوصل لـ Redis هلّق. الكاش شغّال بالذاكرة بس لحتى يرجع." };
}

/** A cached URL shown short: the path without /v1, and POST bodies as "(…)". */
export function shortKey(key: string): string {
  return key
    .replace(/^POST /, "POST ")
    .replace("/v1/", "/")
    .replace(/#.*$/, " (…)");
}
