/**
 * Razan's settings from the admin page «رزان» (SiteSettings.header.razan).
 * Same shape and defaults as the backend (src/modules/razan/razan.settings.ts);
 * anything missing or broken falls back to its default, field by field.
 */
import type { RoseOutfit } from "./roseEvents";

export type RazanText = { ar: string; en: string };
export type RazanSeason = "ramadan" | "eid" | "summer" | "winter";

export type RazanSettings = {
  enabled: boolean;
  greeting: boolean;
  reactions: boolean;
  idleHabits: boolean;
  maxBubbles: number;
  quietPaths: string[];
  phone: "full" | "quiet" | "hidden";
  texts: { welcome: RazanText; greetingChat: RazanText; greetingOffline: RazanText };
  seasonal: { mode: "auto" | "off" | RazanSeason; outfit: boolean; lines: Record<RazanSeason, RazanText> };
  outfits: { default: RoseOutfit; rules: Array<{ match: string; outfit: RoseOutfit; pearls: boolean }> };
  history: { enabled: boolean; ttlHours: number; offer: boolean };
  helpOrder: { enabled: boolean; idleSeconds: number; snoozeDays: number };
  styleQuiz: { enabled: boolean; results: number; variety: "low" | "medium" | "high" };
};

const OUTFITS: RoseOutfit[] = ["abaya", "dress", "coat", "khimar", "tunic", "eid"];
const SEASONS: RazanSeason[] = ["ramadan", "eid", "summer", "winter"];
const T = (): RazanText => ({ ar: "", en: "" });

export const RAZAN_DEFAULTS: RazanSettings = {
  enabled: true,
  greeting: true,
  reactions: true,
  idleHabits: true,
  maxBubbles: 8,
  quietPaths: ["/cart", "/checkout", "/order"],
  phone: "full",
  texts: { welcome: T(), greetingChat: T(), greetingOffline: T() },
  seasonal: { mode: "auto", outfit: true, lines: { ramadan: T(), eid: T(), summer: T(), winter: T() } },
  outfits: { default: "abaya", rules: [] },
  history: { enabled: false, ttlHours: 24, offer: true },
  helpOrder: { enabled: false, idleSeconds: 25, snoozeDays: 3 },
  styleQuiz: { enabled: false, results: 6, variety: "medium" },
};

type Raw = Record<string, unknown>;
const o = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const int = (v: unknown, d: number, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d);
const oneOf = <K extends string>(v: unknown, list: readonly K[], d: K) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as K) : d);
const txt = (v: unknown): RazanText => {
  const r = o(v);
  return { ar: typeof r.ar === "string" ? r.ar.trim().slice(0, 160) : "", en: typeof r.en === "string" ? r.en.trim().slice(0, 160) : "" };
};

export function normalizeRazan(input: unknown): RazanSettings {
  const r = o(input);
  const d = RAZAN_DEFAULTS;
  const texts = o(r.texts), seasonal = o(r.seasonal), lines = o(seasonal.lines), outfits = o(r.outfits);
  const history = o(r.history), help = o(r.helpOrder), quiz = o(r.styleQuiz);
  return {
    enabled: bool(r.enabled, d.enabled),
    greeting: bool(r.greeting, d.greeting),
    reactions: bool(r.reactions, d.reactions),
    idleHabits: bool(r.idleHabits, d.idleHabits),
    maxBubbles: int(r.maxBubbles, d.maxBubbles, 0, 100),
    quietPaths: Array.isArray(r.quietPaths) ? r.quietPaths.filter((p): p is string => typeof p === "string" && p.startsWith("/")).slice(0, 20) : d.quietPaths,
    phone: oneOf(r.phone, ["full", "quiet", "hidden"] as const, d.phone),
    texts: { welcome: txt(texts.welcome), greetingChat: txt(texts.greetingChat), greetingOffline: txt(texts.greetingOffline) },
    seasonal: {
      mode: oneOf(seasonal.mode, ["auto", "off", ...SEASONS] as const, d.seasonal.mode),
      outfit: bool(seasonal.outfit, d.seasonal.outfit),
      lines: { ramadan: txt(lines.ramadan), eid: txt(lines.eid), summer: txt(lines.summer), winter: txt(lines.winter) },
    },
    outfits: {
      default: oneOf(outfits.default, OUTFITS, d.outfits.default),
      rules: (Array.isArray(outfits.rules) ? outfits.rules : [])
        .map(o)
        .filter((x) => typeof x.match === "string" && x.match.trim() && OUTFITS.includes(x.outfit as RoseOutfit))
        .slice(0, 30)
        .map((x) => ({ match: String(x.match).trim(), outfit: x.outfit as RoseOutfit, pearls: x.pearls === true })),
    },
    history: { enabled: bool(history.enabled, false), ttlHours: int(history.ttlHours, 24, 1, 24 * 30), offer: bool(history.offer, true) },
    helpOrder: { enabled: bool(help.enabled, false), idleSeconds: int(help.idleSeconds, 25, 8, 300), snoozeDays: int(help.snoozeDays, 3, 0, 60) },
    styleQuiz: { enabled: bool(quiz.enabled, false), results: int(quiz.results, 6, 3, 12), variety: oneOf(quiz.variety, ["low", "medium", "high"] as const, "medium") },
  };
}

/* ---------------- Seasons ---------------- */

/** Hijri month/day (Umm al-Qura) and Gregorian month, in Israel time. */
function calendar(now: Date) {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: "Asia/Jerusalem", month: "numeric", day: "numeric" }).formatToParts(now);
    const hm = Number(parts.find((p) => p.type === "month")?.value);
    const hd = Number(parts.find((p) => p.type === "day")?.value);
    const gm = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Jerusalem", month: "numeric" }).format(now));
    return { hm, hd, gm };
  } catch {
    return { hm: 0, hd: 0, gm: now.getMonth() + 1 };
  }
}

/** The season right now: Ramadan, the two Eids, summer (Jun–Aug), winter (Dec–Feb), or none. */
export function seasonNow(s: RazanSettings, now = new Date()): RazanSeason | null {
  if (s.seasonal.mode === "off") return null;
  if (s.seasonal.mode !== "auto") return s.seasonal.mode;
  const { hm, hd, gm } = calendar(now);
  if (hm === 9) return "ramadan";
  if ((hm === 10 && hd <= 3) || (hm === 12 && hd >= 9 && hd <= 13)) return "eid";
  if (gm >= 6 && gm <= 8) return "summer";
  if (gm === 12 || gm <= 2) return "winter";
  return null;
}

export const SEASON_LINES: Record<RazanSeason, RazanText> = {
  ramadan: { ar: "رمضان كريم 🌙 أهلاً فيكِ في استبرق", en: "Ramadan Kareem 🌙 welcome to Estabrek" },
  eid: { ar: "عيدكِ مبارك ✨ أهلاً فيكِ في استبرق", en: "Eid Mubarak ✨ welcome to Estabrek" },
  summer: { ar: "صيف حلو ☀️ شوفي القطع الخفيفة", en: "Hello summer ☀️ see the light pieces" },
  winter: { ar: "دفّي حالكِ ❄️ وصلت قطع الشتا", en: "Stay warm ❄️ winter pieces are here" },
};

/** Her outfit for the season (when the owner lets the season dress her). */
export function seasonOutfit(season: RazanSeason | null): RoseOutfit | null {
  if (season === "ramadan" || season === "eid") return "eid";
  if (season === "winter") return "coat";
  return null;
}

/** An owner's text in the current language, else the built-in one. */
export function pickText(t: RazanText | undefined, ar: boolean, fallback: string) {
  const v = (ar ? t?.ar : t?.en)?.trim();
  return v || fallback;
}
