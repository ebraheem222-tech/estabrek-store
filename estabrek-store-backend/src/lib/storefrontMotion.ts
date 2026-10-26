/**
 * How the shop moves and loads, set from the admin (Performance → الحركة والتحميل)
 * and saved in PerformanceSettings.data.storefront. Sent to the shop with the
 * public settings (site.performance); the shop's motion code reads it
 * (estabrek-storefront/src/lib/motionSettings.ts). Every default is what the shop
 * did before these settings existed, so nothing changes until the owner changes it.
 */
import { z } from "zod";
import { prisma } from "./prisma.js";

/** The scroll scenes, top of the home page down. */
export const MOTION_SECTIONS = ["hero", "opening", "study", "seasons", "collections", "campaign"] as const;
export type MotionSection = (typeof MOTION_SECTIONS)[number];

export const FPS_CHOICES = [30, 45, 60, 90, 120] as const;

/** Allowed range of every number, shared with the admin page. */
export const MOTION_LIMITS = {
  smoothMs: { min: 30, max: 300 },
  maxStepMs: { min: 50, max: 500 },
  liteMemoryGb: { min: 0, max: 8 },
  dpr: { min: 100, max: 200 },
  lazyPercent: { min: 25, max: 400 },
  prebuildAfterMs: { min: 0, max: 15_000 },
  rumPercent: { min: 0, max: 100 },
} as const;

const n = (key: keyof typeof MOTION_LIMITS) => z.coerce.number().int().min(MOTION_LIMITS[key].min).max(MOTION_LIMITS[key].max);

export const MotionSectionSchema = z.object({
  /** The scroll animation runs (off = the still version, as with "reduce motion"). */
  on: z.boolean(),
  /** How long the scene takes to catch up with the scroll (the spring's smooth time), ms. */
  smoothMs: n("smoothMs"),
});

export const StorefrontMotionSchema = z.object({
  sections: z.object(
    Object.fromEntries(MOTION_SECTIONS.map((s) => [s, MotionSectionSchema])) as Record<MotionSection, typeof MotionSectionSchema>,
  ),
  /** Fast scrolls through a film jump to its nearest key frames (smoother, slightly less exact). */
  keyframeSnap: z.boolean(),
  /** The longest time one frame may move the scenes (after a stall), ms. */
  maxStepMs: n("maxStepMs"),
  /** The 3D scenes never draw faster than this. */
  maxFps: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90), z.literal(120)]),
  /** Lower the 3D frame rate on devices that can't keep up (and raise it again). */
  adaptive: z.boolean(),
  /** Devices with this much memory or less get the light mode (0 = never). */
  liteMemoryGb: n("liteMemoryGb"),
  /** Phones in data-saver mode get the light mode. */
  liteOnSaveData: z.boolean(),
  /** Frosted-glass effects on phones (costly on their graphics chips; off since the speed work). */
  phoneGlass: z.boolean(),
  /** Sharpest 3D on computers / phones, ×100 of the screen (160 = 1.6). */
  desktopDpr: n("dpr"),
  phoneDpr: n("dpr"),
  /** How early sections, videos and 3D start loading before they're on screen (100 = as before). */
  lazyPercent: n("lazyPercent"),
  /** Build the 3D scenes in advance while the shopper reads (after the page has been still). */
  prebuild3d: z.boolean(),
  /** …starting this long after the page opens (the next scenes follow 1 and 2 s later). */
  prebuildAfterMs: n("prebuildAfterMs"),
  /** How much of the films the browser fetches before they're needed. */
  videoPreload: z.enum(["auto", "metadata", "none"]),
  /** Page views that report their speed (تجربة الزباين), in %. 0 = none. */
  rumPercent: n("rumPercent"),
});

export type StorefrontMotion = z.infer<typeof StorefrontMotionSchema>;

export function storefrontMotionDefaults(): StorefrontMotion {
  return {
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
}

type TopField = Exclude<keyof StorefrontMotion, "sections">;
const TOP_FIELDS = Object.keys(StorefrontMotionSchema.shape).filter((k) => k !== "sections") as TopField[];

/** Saved (possibly partial or old) data on top of the defaults; a broken part falls back. */
export function mergeStorefrontMotion(saved: unknown, base: StorefrontMotion = storefrontMotionDefaults()): StorefrontMotion {
  const s = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const out: StorefrontMotion = { ...base, sections: { ...base.sections } };
  for (const f of TOP_FIELDS) {
    if (!(f in s)) continue;
    const ok = StorefrontMotionSchema.shape[f].safeParse(s[f]);
    if (ok.success) (out as Record<string, unknown>)[f] = ok.data;
  }
  const sections = s.sections && typeof s.sections === "object" ? (s.sections as Record<string, unknown>) : {};
  for (const name of MOTION_SECTIONS) {
    const part = sections[name];
    if (!part || typeof part !== "object") continue;
    const ok = MotionSectionSchema.safeParse({ ...base.sections[name], ...(part as object) });
    if (ok.success) out.sections[name] = ok.data;
  }
  return out;
}

/** "storefront.sections.hero.smoothMs"-style names of what differs. */
export function storefrontMotionChanges(a: StorefrontMotion, b: StorefrontMotion): string[] {
  const out: string[] = [];
  for (const name of MOTION_SECTIONS) {
    for (const f of Object.keys(a.sections[name]) as Array<keyof StorefrontMotion["sections"][MotionSection]>) {
      if (a.sections[name][f] !== b.sections[name][f]) out.push(`storefront.sections.${name}.${f}`);
    }
  }
  for (const f of TOP_FIELDS) if (a[f] !== b[f]) out.push(`storefront.${f}`);
  return out;
}

/** What the shop gets (public settings): read fresh, the public settings are cached anyway. */
export async function publicStorefrontMotion(): Promise<StorefrontMotion> {
  try {
    const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
    const data = row?.data && typeof row.data === "object" ? (row.data as Record<string, unknown>) : {};
    return mergeStorefrontMotion(data.storefront);
  } catch {
    return storefrontMotionDefaults();
  }
}
