/**
 * Razan (رَزان), the storefront guide: everything the owner tunes from the
 * admin page «رزان». Kept under SiteSettings.header.razan (public: the
 * storefront reads it with the other settings), so a new option needs no
 * database change. The storefront has the same defaults (src/lib/razanSettings.ts).
 */
import { z } from "zod";

export const OUTFITS = ["abaya", "dress", "coat", "khimar", "tunic", "eid"] as const;
export const SEASONS = ["ramadan", "eid", "summer", "winter"] as const;

const Line = z.string().trim().max(160);
const Txt = z.object({ ar: Line.default(""), en: Line.default("") }).default({ ar: "", en: "" });

export const RazanSchema = z.object({
  /** Razan on the shop at all (rose design). */
  enabled: z.boolean().default(true),
  /** She walks in and says hello on the home page. */
  greeting: z.boolean().default(true),
  /** She reacts to shop moments (bag, wishlist, size, colour). */
  reactions: z.boolean().default(true),
  /** Small idle moves (fix hijab, look around). */
  idleHabits: z.boolean().default(true),
  /** Speech bubbles per visit (0 = no limit). Offers count too. */
  maxBubbles: z.number().int().min(0).max(100).default(8),
  /** Pages where she stays quiet (no bubbles, no offers). Path prefixes. */
  quietPaths: z.array(z.string().trim().regex(/^\/[\w\-/[\]]*$/).max(80)).max(20).default(["/cart", "/checkout", "/order"]),
  /** On phones: as on desktop, quiet (no bubbles), or hidden. */
  phone: z.enum(["full", "quiet", "hidden"]).default("full"),
  texts: z
    .object({
      /** Home page hello. */
      welcome: Txt,
      /** First line in her panel when the AI chat is on / off. */
      greetingChat: Txt,
      greetingOffline: Txt,
    })
    .prefault({}),
  seasonal: z
    .object({
      /** auto = from the Hijri / Gregorian calendar; off; or one season forced. */
      mode: z.enum(["auto", "off", ...SEASONS]).default("auto"),
      /** Her outfit follows the season (Eid look in Ramadan/Eid, coat in winter). */
      outfit: z.boolean().default(true),
      lines: z
        .object({ ramadan: Txt, eid: Txt, summer: Txt, winter: Txt })
        .prefault({}),
    })
    .prefault({}),
  outfits: z
    .object({
      default: z.enum(OUTFITS).default("abaya"),
      /** Category text contains `match` → this outfit (checked before the built-in rules). */
      rules: z
        .array(z.object({ match: z.string().trim().min(1).max(40), outfit: z.enum(OUTFITS), pearls: z.boolean().default(false) }))
        .max(30)
        .default([]),
    })
    .prefault({}),
  /* Ideas that plug into Razan (each has its own switch). */
  history: z
    .object({ enabled: z.boolean().default(false), ttlHours: z.number().int().min(1).max(24 * 30).default(24), offer: z.boolean().default(true) })
    .prefault({}),
  helpOrder: z
    .object({ enabled: z.boolean().default(false), idleSeconds: z.number().int().min(8).max(300).default(25), snoozeDays: z.number().int().min(0).max(60).default(3) })
    .prefault({}),
  /** «رزان بتختارلك»: a short quiz, then pieces ranked for her (KNN + variety). */
  styleQuiz: z
    .object({
      enabled: z.boolean().default(false),
      /** Pieces shown per answer. */
      results: z.number().int().min(3).max(12).default(6),
      /** How different the pieces are from each other. */
      variety: z.enum(["low", "medium", "high"]).default("medium"),
    })
    .prefault({}),
});

export type RazanSettings = z.infer<typeof RazanSchema>;

export const RAZAN_DEFAULTS: RazanSettings = RazanSchema.parse({});

/** The saved settings, filled with defaults (a broken value falls back to the default). */
export function razanOf(header: unknown): RazanSettings {
  const raw = header && typeof header === "object" ? (header as Record<string, unknown>).razan : undefined;
  let value: unknown = raw && typeof raw === "object" ? structuredClone(raw) : {};
  // A bad value only loses itself: drop the broken keys and try again.
  for (let i = 0; i < 8; i++) {
    const ok = RazanSchema.safeParse(value);
    if (ok.success) return ok.data;
    for (const issue of ok.error.issues) dropPath(value, issue.path);
  }
  return RAZAN_DEFAULTS;
}

function dropPath(root: unknown, path: PropertyKey[]) {
  // Inside a list: drop the whole broken item.
  const lastIndex = path.map((k) => typeof k === "number").lastIndexOf(true);
  const cut = lastIndex >= 0 ? path.slice(0, lastIndex + 1) : path;
  if (!cut.length || !root || typeof root !== "object") return;
  let node: any = root;
  for (const k of cut.slice(0, -1)) {
    if (!node || typeof node !== "object") return;
    node = node[k as any];
  }
  const last = cut[cut.length - 1];
  if (Array.isArray(node) && typeof last === "number") node.splice(last, 1);
  else if (node && typeof node === "object") {
    if (last in node) delete node[last as any];
    else dropPath(root, cut.slice(0, -1)); // a missing required key: drop its parent
  }
}

/** Things counted for the report (no personal data, just how often). */
export const RAZAN_EVENTS = [
  "open",
  "greet",
  "offer:help",
  "accept:help",
  "call:help",
  "order:help",
  "offer:history",
  "accept:history",
  "quiz:start",
  "quiz:done",
  "quiz:like",
  "quiz:dislike",
  "quiz:nomatch",
  "request:sent",
] as const;
export type RazanEvent = (typeof RAZAN_EVENTS)[number];
