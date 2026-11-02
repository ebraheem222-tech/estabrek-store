/**
 * Theme packs (v2): a theme's whole look for the new editor's pages and the store around them.
 * Besides its colours and fonts (the theme itself), a pack is its kit: text, button and box
 * styles, what a hover does, the focus ring, its icon set, the shape, pattern and edge of its
 * drawings, how things come in, its cursor, its loading indicator and the look of its 3D.
 *
 * Each theme's kit is worked out from what the theme already is (its motion, drawings, cards,
 * corners, shadows); a theme may set any part itself (StoreTheme.kit). A store applies a pack in
 * the admin, which keeps the kit at header.storeKit (its parts may come from other packs: the
 * mix); with none kept nothing here changes the shop.
 */
import { CURSOR_THEMES } from "@/cms/style/cursorStyles";
import { EASES, ENTER_KINDS, HOVER_KINDS } from "@/pageTree/tree";
import type { CardStyle, MotionStyle, StoreTheme, SvgKit } from "./types";

/** The cursor themes and loading indicators a kit may name (the shop's own: cms/style, cms/effects). */
const CURSORS = ["none", ...CURSOR_THEMES.map((t) => t.id).filter((id) => id !== "theme-default")] as const;
const LOADERS = ["none", "spinner-simple", "spinner-arc", "spinner-glow", "spinner-orbit", "dots-bounce", "dots-pulse", "dots-wave", "bars-progress", "bars-slide", "bars-equalizer", "ring-pulse", "ring-dash", "loader-heartbeat", "loader-infinity", "loader-pacman"] as const;

export const KIT_OPTIONS = {
  button: ["solid", "outline", "soft", "shadow", "glow", "underline"],
  box: ["flat", "line", "shadow", "soft", "glass", "pop"],
  buttonHover: ["none", "lift", "grow", "glow", "magnetic", "pop", "pulse", "jelly", "shake"],
  imageHover: ["none", "zoom", "tilt", "glow", "lift"],
  focus: ["ring", "glow", "underline", "offset", "dashed", "thick"],
  icons: ["lucide", "tabler", "tabler-filled", "ph-regular", "ph-thin", "ph-light", "ph-bold", "ph-fill", "ph-duotone"],
  shape: ["rounded", "rect", "pill", "arch", "circle", "squircle", "blob", "blob2", "hexagon", "octagon", "diamond", "leaf", "drop", "flower", "star", "shield", "ticket", "bubble", "slant", "wave"],
  pattern: ["none", "dots", "polka", "grid", "lines", "columns", "diagonal", "stripes", "checks", "hatch", "zigzag", "rings", "triangles"],
  edge: ["none", "wave", "slant", "arc", "zigzag"],
  enter: ["none", "fade", "up", "zoom-in", "blur", "wipe-up", "start", "flip-x"],
  heading: ["same", "lines", "words", "letters", "scramble"],
  ease: EASES,
  cursor: CURSORS,
  loader: LOADERS,
  finish: ["neon", "metal", "toy", "voxel", "matte", "glass", "gold"],
  lights: ["studio", "soft", "sunset", "neon", "night", "warm"],
  floor: ["none", "shadow", "grid", "disc"],
} as const;
type Of<K extends keyof typeof KIT_OPTIONS> = (typeof KIT_OPTIONS)[K][number];

export type PackKit = {
  /** Headings: each level this much bigger than the one under it; their weight; capitals (Latin only). */
  type: { scale: number; weight: number; caps: boolean };
  button: { look: Of<"button">; weight: number };
  box: { look: Of<"box"> };
  hover: { button: Of<"buttonHover">; image: Of<"imageHover"> };
  focus: Of<"focus">;
  icons: Of<"icons">;
  decor: { shape: Of<"shape">; pattern: Of<"pattern">; edge: Of<"edge"> };
  /** How a page's elements come in when they have no motion of their own ("none": they don't). */
  motion: { enter: Of<"enter">; heading: Of<"heading">; ease: Of<"ease">; duration: number; stagger: number };
  cursor: Of<"cursor">;
  loader: Of<"loader">;
  model: { finish: Of<"finish">; lights: Of<"lights">; floor: Of<"floor"> };
};

/** Some parts of a kit, each part partly (what a theme sets itself, or a mix takes from another pack). */
export type KitParts = { [K in keyof PackKit]?: PackKit[K] extends object ? Partial<PackKit[K]> : PackKit[K] };

/* ------------------------------------------------------- from the theme */

/** What a theme's way of moving says about the rest of its kit. */
const BY_MOTION: Record<MotionStyle, Pick<PackKit, "type" | "hover" | "focus" | "motion" | "cursor" | "loader">> = {
  editorial: { type: { scale: 1.4, weight: 600, caps: false }, hover: { button: "lift", image: "zoom" }, focus: "underline", motion: { enter: "up", heading: "lines", ease: "smooth", duration: 1.1, stagger: 0.12 }, cursor: "none", loader: "bars-progress" },
  precise: { type: { scale: 1.25, weight: 700, caps: false }, hover: { button: "grow", image: "zoom" }, focus: "ring", motion: { enter: "fade", heading: "words", ease: "strong", duration: 0.7, stagger: 0.06 }, cursor: "theme-professional", loader: "spinner-arc" },
  arcade: { type: { scale: 1.33, weight: 800, caps: true }, hover: { button: "pop", image: "tilt" }, focus: "glow", motion: { enter: "zoom-in", heading: "scramble", ease: "back", duration: 0.55, stagger: 0.04 }, cursor: "theme-gaming", loader: "loader-pacman" },
  soft: { type: { scale: 1.3, weight: 600, caps: false }, hover: { button: "lift", image: "zoom" }, focus: "offset", motion: { enter: "blur", heading: "words", ease: "soft", duration: 1.2, stagger: 0.08 }, cursor: "theme-nature", loader: "dots-pulse" },
  bouncy: { type: { scale: 1.33, weight: 800, caps: false }, hover: { button: "jelly", image: "tilt" }, focus: "thick", motion: { enter: "up", heading: "words", ease: "back", duration: 0.9, stagger: 0.07 }, cursor: "theme-playful", loader: "dots-bounce" },
  luxe: { type: { scale: 1.42, weight: 500, caps: false }, hover: { button: "glow", image: "zoom" }, focus: "underline", motion: { enter: "fade", heading: "lines", ease: "soft", duration: 1.6, stagger: 0.16 }, cursor: "theme-minimal", loader: "ring-pulse" },
  sporty: { type: { scale: 1.38, weight: 800, caps: true }, hover: { button: "magnetic", image: "tilt" }, focus: "ring", motion: { enter: "start", heading: "words", ease: "strong", duration: 0.6, stagger: 0.04 }, cursor: "theme-dark", loader: "bars-slide" },
};

/** What its drawings say: the shape pictures are cut to, a pattern, a section's edge, the icons that suit. */
const BY_SVG: Record<SvgKit, { decor: PackKit["decor"]; icons: PackKit["icons"] }> = {
  deco: { decor: { shape: "diamond", pattern: "lines", edge: "slant" }, icons: "ph-thin" },
  circuit: { decor: { shape: "hexagon", pattern: "grid", edge: "zigzag" }, icons: "tabler" },
  neon: { decor: { shape: "squircle", pattern: "grid", edge: "slant" }, icons: "ph-bold" },
  organic: { decor: { shape: "blob", pattern: "dots", edge: "wave" }, icons: "ph-light" },
  candy: { decor: { shape: "flower", pattern: "polka", edge: "wave" }, icons: "ph-fill" },
  pixel: { decor: { shape: "rect", pattern: "checks", edge: "zigzag" }, icons: "tabler-filled" },
  arena: { decor: { shape: "shield", pattern: "stripes", edge: "slant" }, icons: "ph-bold" },
  synth: { decor: { shape: "squircle", pattern: "lines", edge: "zigzag" }, icons: "ph-duotone" },
  fantasy: { decor: { shape: "star", pattern: "rings", edge: "arc" }, icons: "ph-duotone" },
  space: { decor: { shape: "circle", pattern: "dots", edge: "arc" }, icons: "ph-thin" },
  glitch: { decor: { shape: "slant", pattern: "hatch", edge: "zigzag" }, icons: "tabler" },
  zen: { decor: { shape: "circle", pattern: "none", edge: "arc" }, icons: "ph-light" },
  frost: { decor: { shape: "hexagon", pattern: "triangles", edge: "wave" }, icons: "ph-thin" },
  ember: { decor: { shape: "drop", pattern: "diagonal", edge: "slant" }, icons: "ph-fill" },
  brush: { decor: { shape: "blob2", pattern: "hatch", edge: "wave" }, icons: "ph-regular" },
  ink: { decor: { shape: "rect", pattern: "lines", edge: "slant" }, icons: "ph-regular" },
  silk: { decor: { shape: "arch", pattern: "rings", edge: "wave" }, icons: "ph-light" },
  facet: { decor: { shape: "diamond", pattern: "triangles", edge: "zigzag" }, icons: "ph-thin" },
  wave: { decor: { shape: "wave", pattern: "polka", edge: "wave" }, icons: "lucide" },
  botanic: { decor: { shape: "leaf", pattern: "dots", edge: "wave" }, icons: "ph-light" },
  steam: { decor: { shape: "octagon", pattern: "grid", edge: "zigzag" }, icons: "tabler" },
  paw: { decor: { shape: "blob", pattern: "polka", edge: "arc" }, icons: "ph-fill" },
  track: { decor: { shape: "pill", pattern: "stripes", edge: "slant" }, icons: "ph-bold" },
  vinyl: { decor: { shape: "circle", pattern: "rings", edge: "arc" }, icons: "ph-regular" },
  arabesque: { decor: { shape: "arch", pattern: "triangles", edge: "arc" }, icons: "ph-light" },
  cloud: { decor: { shape: "bubble", pattern: "polka", edge: "wave" }, icons: "ph-fill" },
  mono: { decor: { shape: "rect", pattern: "none", edge: "none" }, icons: "lucide" },
};

/** What its product cards say about boxes and buttons. */
const BY_CARD: Record<CardStyle, { box: PackKit["box"]["look"]; button: PackKit["button"]["look"] }> = {
  portrait: { box: "flat", button: "solid" },
  spec: { box: "line", button: "outline" },
  angled: { box: "shadow", button: "solid" },
  arch: { box: "soft", button: "soft" },
  sticker: { box: "pop", button: "shadow" },
  pixel: { box: "line", button: "solid" },
  frame: { box: "line", button: "underline" },
  book: { box: "soft", button: "solid" },
  minimal: { box: "flat", button: "underline" },
  tile: { box: "soft", button: "solid" },
  overlay: { box: "flat", button: "glow" },
  list: { box: "line", button: "outline" },
  polaroid: { box: "flat", button: "soft" },
  round: { box: "soft", button: "solid" },
};

/** The finish its 3D models take, by kind of store. */
const FINISH: Record<string, PackKit["model"]["finish"]> = { gaming: "neon", electronics: "metal", jewelry: "gold", beauty: "glass", kids: "toy", pets: "toy", food: "matte", art: "matte", books: "matte", music: "metal", sports: "metal" };

/** A theme's kit: worked out from the theme, with any part the theme sets itself. */
export function themeKit(t: StoreTheme): PackKit {
  const m = BY_MOTION[t.motion];
  const s = BY_SVG[t.svg];
  const c = BY_CARD[t.card];
  const dark = t.mode === "dark";
  const base: PackKit = {
    type: m.type,
    button: { look: t.shadow === "glow" ? "glow" : t.shadow === "deep" ? "shadow" : c.button, weight: m.type.weight >= 700 ? 700 : 600 },
    box: { look: t.shadow === "deep" ? "pop" : t.shadow === "glow" ? "glass" : c.box },
    hover: m.hover,
    focus: m.focus,
    icons: s.icons,
    decor: { ...s.decor, shape: t.round <= 0.15 && s.decor.shape === "rounded" ? "rect" : s.decor.shape },
    motion: m.motion,
    cursor: m.cursor,
    loader: m.loader,
    model: {
      finish: t.stage?.finish ?? FINISH[t.family] ?? "matte",
      lights: t.motion === "arcade" ? "neon" : dark ? "night" : t.motion === "luxe" ? "warm" : t.motion === "soft" ? "soft" : "studio",
      floor: t.stage?.floor === "grid" ? "grid" : "shadow",
    },
  };
  return t.kit ? mergeKit(base, t.kit) : base;
}

/** A kit with some parts changed (each part a whole group: its type, its hover, its decor…). */
export function mergeKit(base: PackKit, parts: KitParts): PackKit {
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(parts)) {
    if (v === undefined) continue;
    const was = (base as Record<string, unknown>)[k];
    out[k] = v && typeof v === "object" && was && typeof was === "object" ? { ...(was as object), ...(v as object) } : v;
  }
  return out as PackKit;
}

/** A neutral kit, for a store without a theme (the rose design) that keeps a kit anyway. */
export const PLAIN_KIT: PackKit = {
  type: { scale: 1.3, weight: 700, caps: false },
  button: { look: "solid", weight: 600 },
  box: { look: "soft" },
  hover: { button: "lift", image: "zoom" },
  focus: "ring",
  icons: "lucide",
  decor: { shape: "rounded", pattern: "dots", edge: "wave" },
  motion: { enter: "up", heading: "words", ease: "smooth", duration: 0.9, stagger: 0.08 },
  cursor: "none",
  loader: "none",
  model: { finish: "matte", lights: "studio", floor: "shadow" },
};

/* ------------------------------------------------------- the store's own */

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const pick = <K extends keyof typeof KIT_OPTIONS>(k: K, v: unknown): Of<K> | undefined => ((KIT_OPTIONS[k] as readonly unknown[]).includes(v) ? (v as Of<K>) : undefined);
const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined);
const weight = (v: unknown) => (typeof v === "number" && v >= 100 && v <= 900 && v % 100 === 0 ? v : undefined);
const kept = <T extends object>(o: T): T | undefined => {
  const out = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  return Object.keys(out).length ? (out as T) : undefined;
};

/**
 * The store's kit (header.storeKit) checked, over `base` (its theme's kit): every known part in
 * range is kept, anything else is the base's. Nothing kept (or no object) = null: no kit at all.
 */
export function cleanKit(raw: unknown, base: PackKit): PackKit | null {
  if (!isObj(raw)) return null;
  const o = (k: string) => (isObj(raw[k]) ? (raw[k] as Record<string, unknown>) : {});
  const parts: KitParts = {
    type: kept({ scale: num(o("type").scale, 1.1, 1.6), weight: weight(o("type").weight), caps: typeof o("type").caps === "boolean" ? (o("type").caps as boolean) : undefined }),
    button: kept({ look: pick("button", o("button").look), weight: weight(o("button").weight) }),
    box: kept({ look: pick("box", o("box").look) }),
    hover: kept({ button: pick("buttonHover", o("hover").button), image: pick("imageHover", o("hover").image) }),
    focus: pick("focus", raw.focus),
    icons: pick("icons", raw.icons),
    decor: kept({ shape: pick("shape", o("decor").shape), pattern: pick("pattern", o("decor").pattern), edge: pick("edge", o("decor").edge) }),
    motion: kept({ enter: pick("enter", o("motion").enter), heading: pick("heading", o("motion").heading), ease: pick("ease", o("motion").ease), duration: num(o("motion").duration, 0.2, 3), stagger: num(o("motion").stagger, 0, 0.5) }),
    cursor: pick("cursor", raw.cursor),
    loader: pick("loader", raw.loader),
    model: kept({ finish: pick("finish", o("model").finish), lights: pick("lights", o("model").lights), floor: pick("floor", o("model").floor) }),
  };
  const any = Object.values(parts).some((v) => v !== undefined);
  return any ? mergeKit(base, parts) : null;
}

// The lists a kit names must stay the shop's own (checked in tests/store-themes.spec.ts too).
export const KIT_KNOWN = { enter: ENTER_KINDS as readonly string[], hover: HOVER_KINDS as readonly string[] };

/* ------------------------------------------------------------- the shop */

/** The store's kit from its settings, over its theme's (or the plain one): null = none applied. */
export const kitOfHeader = (header: unknown, theme: StoreTheme | null): PackKit | null =>
  cleanKit((header as { storeKit?: unknown } | null | undefined)?.storeKit, theme ? themeKit(theme) : PLAIN_KIT);

/** A kit being tried in the admin (?kit=, its JSON), over the theme's. */
export function kitFromParam(v: string | null | undefined, theme: StoreTheme | null): PackKit | null {
  if (!v || v.length > 4000) return null;
  try {
    return cleanKit(JSON.parse(v), theme ? themeKit(theme) : PLAIN_KIT);
  } catch {
    return null;
  }
}

/** The kit's focus ring for everything that takes the keyboard, in the theme's colour. */
const FOCUS: Record<PackKit["focus"], string> = {
  ring: "outline:2px solid var(--kit-c);outline-offset:2px",
  glow: "outline:2px solid transparent;box-shadow:0 0 0 4px color-mix(in srgb,var(--kit-c) 45%,transparent)",
  underline: "outline:2px solid transparent;box-shadow:0 3px 0 0 var(--kit-c)",
  offset: "outline:3px solid var(--kit-c);outline-offset:5px",
  dashed: "outline:2px dashed var(--kit-c);outline-offset:3px",
  thick: "outline:4px solid var(--kit-c);outline-offset:2px",
};
export function kitCss(kit: PackKit): string {
  return `:root[data-store-kit]{--kit-c:var(--th-strong,var(--accent,#a43b64))}:root[data-store-kit] :focus-visible{${FOCUS[kit.focus]}}`;
}

/** What comes in when a page loads, if it has no motion of its own. */
const MOVES = new Set(["heading", "text", "button", "image", "icon", "video", "slider", "model3d", "products", "categories", "testimonials", "pricing", "team", "accordion", "form"]);

/**
 * A page's tree with the kit's motion on what has none of its own: things come in the kit's way
 * (headings in theirs), one after another within what holds them, and buttons and pictures
 * answer the mouse as the kit says. Old sections and scenes stay as they are.
 */
export function withKit<N extends { type: string; motion?: unknown; children?: N[] }>(node: N, kit: PackKit, i = 0): N {
  const own = node.motion && typeof node.motion === "object" ? (node.motion as Record<string, unknown>) : null;
  const add: Record<string, unknown> = {};
  const m = kit.motion;
  if (m.enter !== "none" && !own?.enter && MOVES.has(node.type)) {
    const kind = node.type === "heading" && m.heading !== "same" ? m.heading : m.enter;
    add.enter = { kind, duration: m.duration, ease: m.ease, ...(i ? { delay: Math.round(Math.min(0.6, i * m.stagger) * 100) / 100 } : {}) };
  }
  if (!own?.hover && node.type === "button" && kit.hover.button !== "none") add.hover = { kind: kit.hover.button };
  if (!own?.hover && node.type === "image" && kit.hover.image !== "none") add.hover = { kind: kit.hover.image };
  const children = node.type === "legacy" || node.type === "roseBlock" ? node.children : node.children?.map((c, j) => withKit(c, kit, j));
  return { ...node, ...(Object.keys(add).length ? { motion: { ...(own ?? {}), ...add } } : {}), ...(children ? { children } : {}) };
}
