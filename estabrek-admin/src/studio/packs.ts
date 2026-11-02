/**
 * Theme packs (v2) in the admin: a theme's kit as the shop sends it (its storeThemes/packs.ts,
 * which checks it again), mixed from several packs, turned into the editor's shared styles
 * (h1–h6, body text, the three buttons and a "card" box), and the store's kit as the editor
 * uses it for what it adds (icons, 3D, templates). Pure (tested).
 */
import type { SiteStyle } from "../api/siteStyles.api";

export type PackKit = {
  type: { scale: number; weight: number; caps: boolean };
  button: { look: string; weight: number };
  box: { look: string };
  hover: { button: string; image: string };
  focus: string;
  icons: string;
  decor: { shape: string; pattern: string; edge: string };
  motion: { enter: string; heading: string; ease: string; duration: number; stagger: number };
  cursor: string;
  loader: string;
  model: { finish: string; lights: string; floor: string };
};
export type KitOptions = Record<string, readonly string[]>;

/** The parts a pack is made of, in the order the admin shows them; colours and fonts are the theme's. */
export const PACK_PARTS = ["colours", "fonts", "type", "button", "box", "hover", "focus", "icons", "decor", "motion", "cursor", "loader", "model"] as const;
export type PackPart = (typeof PACK_PARTS)[number];
export type KitPart = Exclude<PackPart, "colours" | "fonts">;
export const isKitPart = (p: PackPart): p is KitPart => p !== "colours" && p !== "fonts";

/** A kit with each part taken from the pack named for it (else the base's). */
export function mixKit(base: PackKit, from: Partial<Record<KitPart, PackKit | undefined>>): PackKit {
  const out = { ...base } as Record<string, unknown>;
  for (const [part, kit] of Object.entries(from)) if (kit) out[part] = structuredClone((kit as Record<string, unknown>)[part]);
  return out as PackKit;
}

/** The store's kit as the editor uses it: the one applied (header.storeKit) over the theme's, else the theme's. */
export function storeKitOf(header: unknown, themeKit: PackKit | null | undefined, plain: PackKit | null | undefined): PackKit | null {
  const base = themeKit ?? plain ?? null;
  const own = (header as { storeKit?: unknown } | null | undefined)?.storeKit;
  if (!base) return null;
  if (!own || typeof own !== "object" || Array.isArray(own)) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(own as Record<string, unknown>)) {
    if (!(k in base) || v === undefined || v === null) continue;
    const was = out[k];
    out[k] = v && typeof v === "object" && was && typeof was === "object" ? { ...(was as object), ...(v as object) } : v;
  }
  return out as PackKit;
}

/* ------------------------------------------------------- shared styles */

/** The shop's font pairs by their first family (storeThemes/themes/kit.ts FONTS), for taking another pack's fonts. */
const FONT_IDS: Record<string, string> = {
  "th-amiri": "amiri", "th-aref-ruqaa": "ruqaa", "th-el-messiri": "messiri", "th-reem-kufi": "kufi", "th-cairo": "cairo", "th-alexandria": "alexandria",
  "th-readex-pro": "readex", "th-changa": "changa", "th-lalezar": "lalezar", "th-marhey": "marhey", "th-tajawal": "tajawal", "th-rubik": "rubik",
};
export const fontPresetOf = (family: string | undefined): string | undefined => (family ? FONT_IDS[family] : undefined);

/** A button's corners from the theme's (its pill: "999px", "4px"…). */
const pillOf = (pill: string | undefined) => {
  const n = Number.parseFloat(pill ?? "");
  return Number.isFinite(n) ? Math.max(0, Math.min(999, Math.round(n))) : 999;
};

/** The ids a pack's shared styles take (the rest of the store's own stay). */
export const PACK_STYLE_IDS = ["h1", "h2", "h3", "h4", "h5", "h6", "body", "solid", "outline", "link", "card"] as const;

/**
 * A kit as the editor's shared styles: heading sizes on the kit's scale (fluid down to a phone),
 * their weight and capitals, the body text, the three buttons in the kit's look and the theme's
 * corners, and a "card" box.
 */
export function stylesOfKit(kit: PackKit, theme: { round?: number; pill?: string }): SiteStyle[] {
  const s = Math.max(1.1, Math.min(1.6, kit.type.scale));
  const weight = Math.round(Math.max(100, Math.min(900, kit.type.weight)) / 100) * 100;
  const radius = Math.round(16 * Math.max(0, Math.min(2, theme.round ?? 1)));
  const heading = (level: number): SiteStyle => {
    const size = level === 6 ? 16 : Math.min(72, Math.round(18 * s ** (5 - level)));
    return {
      id: `h${level}`, kind: "text",
      style: { base: { font: "heading", size, sizeMin: Math.max(16, Math.round(size * 0.6)), weight: level >= 5 ? Math.min(weight, 700) : weight, lineHeight: level <= 2 ? 1.15 : 1.25, balance: "balance", ...(kit.type.caps && level <= 3 ? { caps: "upper" } : {}) } },
    };
  };
  const pill = pillOf(theme.pill);
  const bw = Math.round(Math.max(400, Math.min(800, kit.button.weight)) / 100) * 100;
  const solid: Record<string, unknown> = { radius: pill, weight: bw };
  const outline: Record<string, unknown> = { radius: pill, weight: bw, border: { width: 2, color: "accent" } };
  switch (kit.button.look) {
    case "soft":
      Object.assign(solid, { bg: "accent-soft", color: "text" });
      break;
    case "shadow":
      Object.assign(solid, { shadow: "md", hover: { shadow: "lg" } });
      break;
    case "glow":
      Object.assign(solid, { glow: { color: "accent", size: 14 }, hover: { glow: { color: "accent", size: 28 } } });
      break;
    case "outline":
      Object.assign(solid, { bg: "transparent", color: "accent", border: { width: 2, color: "accent" }, hover: { bg: "accent", color: "accent-contrast" } });
      break;
    case "underline":
      Object.assign(outline, { border: { width: 0, color: "transparent" }, decoration: { line: "underline", width: 2, offset: 6 } });
      break;
  }
  const BOX: Record<string, Record<string, unknown>> = {
    flat: { bg: "surface" },
    line: { border: { width: 1, color: "border" } },
    shadow: { bg: "surface", shadow: "md" },
    soft: { bg: "accent-soft" },
    glass: { bg: "surface", backdrop: { blur: 12 }, border: { width: 1, color: "border" } },
    pop: { bg: "surface", border: { width: 2, color: "text" }, shade: { x: 6, y: 6, blur: 0, color: "text" } },
  };
  return [
    ...[1, 2, 3, 4, 5, 6].map(heading),
    { id: "body", kind: "text", style: { base: { font: "body", size: 17, lineHeight: 1.75 } } },
    { id: "solid", kind: "button", style: { base: solid } },
    { id: "outline", kind: "button", style: { base: outline } },
    { id: "link", kind: "button", style: { base: { weight: bw, decoration: { line: "underline", width: 2, offset: 4 } } } },
    { id: "card", kind: "box", name: "Card", style: { base: { radius, pad: [24, 24, 24, 24], ...(BOX[kit.box.look] ?? BOX.flat) } } },
  ];
}

/** The store's shared styles with a pack's in place of the same ones (its own named styles stay). */
export function withPackStyles(styles: SiteStyle[], pack: SiteStyle[]): SiteStyle[] {
  const ids = new Set(pack.map((s) => s.id));
  return [...pack, ...styles.filter((s) => !ids.has(s.id))];
}

/* ------------------------------------------------------- for the editor */

/** What the templates take from the store's kit (templates/build.ts). */
export type TemplateKit = { shape: string; pattern: string; edge: string; finish: string; lights: string; floor: string; buttonHover: string; imageHover: string; box: string };
export const templateKitOf = (kit: PackKit | null): TemplateKit | undefined =>
  kit ? { shape: kit.decor.shape, pattern: kit.decor.pattern, edge: kit.decor.edge, finish: kit.model.finish, lights: kit.model.lights, floor: kit.model.floor, buttonHover: kit.hover.button, imageHover: kit.hover.image, box: kit.box.look } : undefined;
