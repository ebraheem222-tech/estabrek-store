/**
 * How the shop moves and loads, from the admin (السرعة والكاش → الحركة والتحميل),
 * sent with the public settings (site.performance) and written into the page by
 * the root layout (window.__estabrekMotion) before any scene starts.
 *
 * Preview: the admin's "preview" button opens the shop with
 * ?motion-preview=<settings>; they apply to that visit only (this browser), until
 * ?motion-preview=off. Every value is checked again here, so a hand-made link
 * can't break anything.
 *
 * Every default is what the shop did before these settings existed.
 *
 * A/B tests (admin → تجارب A/B) can give this visit another value of one setting
 * (lib/ab.ts); the owner's preview always wins over a test.
 */
import { abTests, abValue } from "./ab";

export const MOTION_SECTIONS = ["hero", "opening", "study", "seasons", "collections", "campaign"] as const;
export type MotionSection = (typeof MOTION_SECTIONS)[number];

export type MotionSettings = {
  sections: Record<MotionSection, { on: boolean; smoothMs: number }>;
  keyframeSnap: boolean;
  maxStepMs: number;
  maxFps: 30 | 45 | 60 | 90 | 120;
  adaptive: boolean;
  liteMemoryGb: number;
  liteOnSaveData: boolean;
  phoneGlass: boolean;
  desktopDpr: number;
  phoneDpr: number;
  lazyPercent: number;
  prebuild3d: boolean;
  prebuildAfterMs: number;
  videoPreload: "auto" | "metadata" | "none";
  /** Page views that report their speed (admin → تجربة الزباين), in %. */
  rumPercent: number;
};

export const MOTION_DEFAULTS: MotionSettings = {
  sections: {
    hero: { on: true, smoothMs: 110 },
    opening: { on: true, smoothMs: 90 },
    study: { on: true, smoothMs: 90 },
    seasons: { on: true, smoothMs: 90 },
    collections: { on: true, smoothMs: 90 },
    campaign: { on: true, smoothMs: 90 },
  },
  keyframeSnap: true,
  maxStepMs: 250,
  maxFps: 120,
  adaptive: true,
  liteMemoryGb: 2,
  liteOnSaveData: true,
  phoneGlass: false,
  desktopDpr: 160,
  phoneDpr: 140,
  lazyPercent: 100,
  prebuild3d: true,
  prebuildAfterMs: 1500,
  videoPreload: "auto",
  rumPercent: 100,
};

const PREVIEW_KEY = "estabrek_motion_preview";
const FPS = [30, 45, 60, 90, 120] as const;

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n))) : fallback;
};
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** Any (partial, old or hand-made) value → complete settings within range. */
export function normalizeMotion(raw: unknown, base: MotionSettings = MOTION_DEFAULTS): MotionSettings {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rs = r.sections && typeof r.sections === "object" ? (r.sections as Record<string, unknown>) : {};
  const sections = {} as MotionSettings["sections"];
  for (const name of MOTION_SECTIONS) {
    const s = rs[name] && typeof rs[name] === "object" ? (rs[name] as Record<string, unknown>) : {};
    sections[name] = { on: bool(s.on, base.sections[name].on), smoothMs: int(s.smoothMs, 30, 300, base.sections[name].smoothMs) };
  }
  const fps = Number(r.maxFps);
  return {
    sections,
    keyframeSnap: bool(r.keyframeSnap, base.keyframeSnap),
    maxStepMs: int(r.maxStepMs, 50, 500, base.maxStepMs),
    maxFps: (FPS as readonly number[]).includes(fps) ? (fps as MotionSettings["maxFps"]) : base.maxFps,
    adaptive: bool(r.adaptive, base.adaptive),
    liteMemoryGb: int(r.liteMemoryGb, 0, 8, base.liteMemoryGb),
    liteOnSaveData: bool(r.liteOnSaveData, base.liteOnSaveData),
    phoneGlass: bool(r.phoneGlass, base.phoneGlass),
    desktopDpr: int(r.desktopDpr, 100, 200, base.desktopDpr),
    phoneDpr: int(r.phoneDpr, 100, 200, base.phoneDpr),
    lazyPercent: int(r.lazyPercent, 25, 400, base.lazyPercent),
    prebuild3d: bool(r.prebuild3d, base.prebuild3d),
    prebuildAfterMs: int(r.prebuildAfterMs, 0, 15_000, base.prebuildAfterMs),
    videoPreload: r.videoPreload === "metadata" || r.videoPreload === "none" || r.videoPreload === "auto" ? r.videoPreload : base.videoPreload,
    rumPercent: int(r.rumPercent, 0, 100, base.rumPercent),
  };
}

/** Settings → the ?motion-preview= value (base64url JSON). */
export function encodeMotionPreview(settings: MotionSettings) {
  const json = JSON.stringify(settings);
  const b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeMotionPreview(value: string): unknown {
  try {
    const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type MotionWindow = Window & { __estabrekMotion?: unknown };

let resolved: MotionSettings | null = null;
let previewing = false;

/** The settings in force in this browser (the admin's, or a preview). */
export function motionSettings(): MotionSettings {
  if (resolved) return resolved;
  if (typeof window === "undefined") return MOTION_DEFAULTS;
  const base = normalizeMotion((window as MotionWindow).__estabrekMotion);
  let preview: unknown = null;
  try {
    const asked = new URLSearchParams(window.location.search).get("motion-preview");
    if (asked === "off") sessionStorage.removeItem(PREVIEW_KEY);
    else if (asked) sessionStorage.setItem(PREVIEW_KEY, asked);
    const kept = sessionStorage.getItem(PREVIEW_KEY);
    if (kept) preview = decodeMotionPreview(kept);
  } catch {
    // storage blocked: no preview
  }
  previewing = !!preview;
  resolved = preview ? normalizeMotion(preview, base) : withTests(base);
  return resolved;
}

/** This visit's side of the running motion tests (each counts the visit). */
function withTests(base: MotionSettings): MotionSettings {
  const overrides: Record<string, unknown> = {};
  for (const t of abTests()) {
    if (t.kind !== "motion" || !t.field) continue;
    const v = abValue("motion", t.field);
    if (v) overrides[t.field] = v.value;
  }
  return Object.keys(overrides).length ? normalizeMotion({ ...base, sections: base.sections, ...overrides }, base) : base;
}

/** True while the admin's preview settings are in use in this browser. */
export function motionPreviewing() {
  motionSettings();
  return previewing;
}

/** The scroll animation of this section runs (with the shop's global switch). */
export function sectionMotionOn(section: MotionSection) {
  return motionSettings().sections[section].on;
}

/** The section's smooth time in seconds (the spring that follows the scroll). */
export function sectionSmoothTime(section: MotionSection) {
  return motionSettings().sections[section].smoothMs / 1000;
}

/** A section's "start loading" distance, scaled by the admin's lazy-loading setting. */
export function lazyMargin(px: number) {
  return `${Math.round((px * motionSettings().lazyPercent) / 100)}px 0px`;
}

/** When the n-th 3D scene (0, 1, 2…) is built in advance; null = not in advance. */
export function prebuildAfter(order: number) {
  const s = motionSettings();
  return s.prebuild3d ? s.prebuildAfterMs + order * 1000 : null;
}

/** Tests: read the settings again. */
export function resetMotionSettingsForTests() {
  resolved = null;
  previewing = false;
}
