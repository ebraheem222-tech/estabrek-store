export interface ButtonThemeTokens {
  solidBg: string;
  solidHover: string;
  solidText: string;
  solidBorder: string;
  accentFrom: string;
  accentTo: string;
  accentFromHover: string;
  accentToHover: string;
  accentText: string;
  secondaryBg: string;
  secondaryBgHover: string;
  secondaryText: string;
  secondaryBorder: string;
  ghostText: string;
  ghostTextHover: string;
  ghostBgHover: string;
}

export interface ButtonTheme {
  id: string;
  name: string;
  nameAr: string;
  family: string;
  category: string;
  tokens: ButtonThemeTokens;
}

type ButtonTone = "light" | "dark" | "mixed";

type ButtonColorFamily = {
  id: string;
  name: string;
  nameAr: string;
  base: string;
  accent: string;
};

type ButtonStyleProfile = {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  tone: ButtonTone;
  baseShift: number;
  hoverShift: number;
  accentFromShift: number;
  accentToShift: number;
  secondaryAlpha: number;
  secondaryHoverAlpha: number;
  borderAlpha: number;
  ghostAlpha: number;
  ghostHoverAlpha: number;
};

const BUTTON_COLOR_FAMILIES: ButtonColorFamily[] = [
  { id: "ocean", name: "Ocean", nameAr: "محيطي", base: "#0EA5E9", accent: "#2563EB" },
  { id: "emerald", name: "Emerald", nameAr: "زمردي", base: "#10B981", accent: "#059669" },
  { id: "violet", name: "Violet", nameAr: "بنفسجي", base: "#8B5CF6", accent: "#7C3AED" },
  { id: "rose", name: "Rose", nameAr: "وردي", base: "#F43F5E", accent: "#E11D48" },
  { id: "amber", name: "Amber", nameAr: "عنبر", base: "#F59E0B", accent: "#D97706" },
  { id: "teal", name: "Teal", nameAr: "فيروزي", base: "#14B8A6", accent: "#0F766E" },
  { id: "indigo", name: "Indigo", nameAr: "نيلي", base: "#6366F1", accent: "#4338CA" },
  { id: "slate", name: "Slate", nameAr: "رمادي مزرق", base: "#475569", accent: "#1E293B" },
  { id: "coral", name: "Coral", nameAr: "مرجاني", base: "#FB7185", accent: "#F97316" },
  { id: "lime", name: "Lime", nameAr: "ليموني", base: "#84CC16", accent: "#4D7C0F" },
];

const BUTTON_STYLE_PROFILES: ButtonStyleProfile[] = [
  {
    id: "classic",
    name: "Classic",
    nameAr: "كلاسيكي",
    category: "classic",
    tone: "mixed",
    baseShift: 0.14,
    hoverShift: 0.08,
    accentFromShift: 0.08,
    accentToShift: 0.14,
    secondaryAlpha: 0.12,
    secondaryHoverAlpha: 0.2,
    borderAlpha: 0.3,
    ghostAlpha: 0.72,
    ghostHoverAlpha: 0.11,
  },
  {
    id: "soft",
    name: "Soft",
    nameAr: "ناعم",
    category: "soft",
    tone: "light",
    baseShift: 0.36,
    hoverShift: 0.12,
    accentFromShift: 0.22,
    accentToShift: 0.1,
    secondaryAlpha: 0.18,
    secondaryHoverAlpha: 0.28,
    borderAlpha: 0.24,
    ghostAlpha: 0.82,
    ghostHoverAlpha: 0.14,
  },
  {
    id: "glass",
    name: "Glass",
    nameAr: "زجاجي",
    category: "glass",
    tone: "light",
    baseShift: 0.46,
    hoverShift: 0.1,
    accentFromShift: 0.3,
    accentToShift: 0.16,
    secondaryAlpha: 0.2,
    secondaryHoverAlpha: 0.3,
    borderAlpha: 0.2,
    ghostAlpha: 0.86,
    ghostHoverAlpha: 0.18,
  },
  {
    id: "neon",
    name: "Neon",
    nameAr: "نيون",
    category: "neon",
    tone: "dark",
    baseShift: 0.34,
    hoverShift: 0.16,
    accentFromShift: 0.18,
    accentToShift: 0.3,
    secondaryAlpha: 0.16,
    secondaryHoverAlpha: 0.26,
    borderAlpha: 0.38,
    ghostAlpha: 0.8,
    ghostHoverAlpha: 0.19,
  },
  {
    id: "retro",
    name: "Retro",
    nameAr: "ريترو",
    category: "retro",
    tone: "mixed",
    baseShift: 0.26,
    hoverShift: 0.08,
    accentFromShift: 0.16,
    accentToShift: 0.18,
    secondaryAlpha: 0.15,
    secondaryHoverAlpha: 0.24,
    borderAlpha: 0.32,
    ghostAlpha: 0.78,
    ghostHoverAlpha: 0.13,
  },
  {
    id: "luxury",
    name: "Luxury",
    nameAr: "فاخر",
    category: "luxury",
    tone: "dark",
    baseShift: 0.22,
    hoverShift: 0.12,
    accentFromShift: 0.14,
    accentToShift: 0.22,
    secondaryAlpha: 0.14,
    secondaryHoverAlpha: 0.22,
    borderAlpha: 0.28,
    ghostAlpha: 0.76,
    ghostHoverAlpha: 0.1,
  },
  {
    id: "minimal",
    name: "Minimal",
    nameAr: "مينيمال",
    category: "minimal",
    tone: "light",
    baseShift: 0.4,
    hoverShift: 0.08,
    accentFromShift: 0.18,
    accentToShift: 0.12,
    secondaryAlpha: 0.1,
    secondaryHoverAlpha: 0.16,
    borderAlpha: 0.2,
    ghostAlpha: 0.7,
    ghostHoverAlpha: 0.08,
  },
  {
    id: "bold",
    name: "Bold",
    nameAr: "جريء",
    category: "bold",
    tone: "mixed",
    baseShift: 0.04,
    hoverShift: 0.06,
    accentFromShift: 0.02,
    accentToShift: 0.1,
    secondaryAlpha: 0.22,
    secondaryHoverAlpha: 0.34,
    borderAlpha: 0.42,
    ghostAlpha: 0.88,
    ghostHoverAlpha: 0.2,
  },
  {
    id: "matte",
    name: "Matte",
    nameAr: "مطفي",
    category: "matte",
    tone: "mixed",
    baseShift: 0.22,
    hoverShift: 0.1,
    accentFromShift: 0.12,
    accentToShift: 0.14,
    secondaryAlpha: 0.14,
    secondaryHoverAlpha: 0.22,
    borderAlpha: 0.24,
    ghostAlpha: 0.74,
    ghostHoverAlpha: 0.12,
  },
  {
    id: "midnight",
    name: "Midnight",
    nameAr: "ليلي",
    category: "midnight",
    tone: "dark",
    baseShift: 0.46,
    hoverShift: 0.22,
    accentFromShift: 0.24,
    accentToShift: 0.36,
    secondaryAlpha: 0.18,
    secondaryHoverAlpha: 0.3,
    borderAlpha: 0.34,
    ghostAlpha: 0.82,
    ghostHoverAlpha: 0.22,
  },
];

type Rgb = { r: number; g: number; b: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(hex: string): string {
  const clean = String(hex || "").trim().replace(/^#/, "");
  if (clean.length === 3) return `#${clean.split("").map((c) => `${c}${c}`).join("")}`;
  if (clean.length === 6) return `#${clean}`;
  return "#2563eb";
}

function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex).replace(/^#/, "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(rgb: Rgb): string {
  const r = clamp(Math.round(rgb.r), 0, 255).toString(16).padStart(2, "0");
  const g = clamp(Math.round(rgb.g), 0, 255).toString(16).padStart(2, "0");
  const b = clamp(Math.round(rgb.b), 0, 255).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function mixHex(colorA: string, colorB: string, amount: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const t = clamp(amount, 0, 1);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

function lighten(color: string, amount: number): string {
  return mixHex(color, "#ffffff", amount);
}

function darken(color: string, amount: number): string {
  return mixHex(color, "#000000", amount);
}

function withAlpha(color: string, alpha: number): string {
  const rgb = hexToRgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1).toFixed(3)})`;
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((value) => {
    const n = value / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function pickTextColor(background: string): string {
  return luminance(background) > 0.52 ? "#0f172a" : "#f8fafc";
}

function buildThemeTokens(family: ButtonColorFamily, profile: ButtonStyleProfile): ButtonThemeTokens {
  const mixedBase = mixHex(family.base, family.accent, 0.35);
  const solidBg =
    profile.tone === "light"
      ? lighten(family.base, profile.baseShift)
      : profile.tone === "dark"
        ? darken(mixedBase, profile.baseShift)
        : lighten(mixedBase, profile.baseShift * 0.55);

  const solidHover =
    profile.tone === "dark"
      ? lighten(solidBg, profile.hoverShift)
      : darken(solidBg, profile.hoverShift);

  const accentFrom =
    profile.tone === "dark"
      ? lighten(darken(family.base, profile.accentFromShift), 0.06)
      : lighten(family.base, profile.accentFromShift);

  const accentTo =
    profile.tone === "dark"
      ? lighten(darken(family.accent, profile.accentToShift), 0.04)
      : darken(family.accent, profile.accentToShift);

  const accentFromHover = lighten(accentFrom, profile.tone === "dark" ? 0.08 : 0.06);
  const accentToHover = lighten(accentTo, profile.tone === "dark" ? 0.08 : 0.05);

  const secondaryTone = profile.tone === "dark" ? lighten(family.base, 0.35) : darken(family.base, 0.12);
  const ghostTone = profile.tone === "dark" ? lighten(family.base, 0.58) : darken(family.base, 0.26);

  return {
    solidBg,
    solidHover,
    solidText: profile.tone === "light" ? "#0b1220" : pickTextColor(solidBg),
    solidBorder: withAlpha(profile.tone === "dark" ? lighten(family.base, 0.4) : darken(family.base, 0.08), profile.borderAlpha),
    accentFrom,
    accentTo,
    accentFromHover,
    accentToHover,
    accentText: pickTextColor(mixHex(accentFrom, accentTo, 0.5)),
    secondaryBg: withAlpha(secondaryTone, profile.secondaryAlpha),
    secondaryBgHover: withAlpha(secondaryTone, profile.secondaryHoverAlpha),
    secondaryText: profile.tone === "dark" ? "#e2e8f0" : darken(secondaryTone, 0.42),
    secondaryBorder: withAlpha(secondaryTone, profile.borderAlpha),
    ghostText: withAlpha(ghostTone, profile.ghostAlpha),
    ghostTextHover: profile.tone === "dark" ? "#ffffff" : darken(ghostTone, 0.35),
    ghostBgHover: withAlpha(secondaryTone, profile.ghostHoverAlpha),
  };
}

function createButtonTheme(family: ButtonColorFamily, profile: ButtonStyleProfile): ButtonTheme {
  return {
    id: `btn-${family.id}-${profile.id}`,
    name: `${family.name} ${profile.name}`,
    nameAr: `${family.nameAr} ${profile.nameAr}`,
    family: family.id,
    category: profile.category,
    tokens: buildThemeTokens(family, profile),
  };
}

export const buttonThemes: ButtonTheme[] = BUTTON_COLOR_FAMILIES.flatMap((family) =>
  BUTTON_STYLE_PROFILES.map((profile) => createButtonTheme(family, profile))
);

export const DEFAULT_BUTTON_THEME_ID = buttonThemes[0]?.id ?? "btn-ocean-classic";

export const BUTTON_THEME_CATEGORY_LABELS_AR: Record<string, string> = {
  classic: "كلاسيكي",
  soft: "ناعم",
  glass: "زجاجي",
  neon: "نيون",
  retro: "ريترو",
  luxury: "فاخر",
  minimal: "مينيمال",
  bold: "جريء",
  matte: "مطفي",
  midnight: "ليلي",
};

export const buttonThemeCategories = [...new Set(buttonThemes.map((theme) => theme.category))];

export function getButtonTheme(themeId: string): ButtonTheme | undefined {
  return buttonThemes.find((theme) => theme.id === themeId);
}

export function getButtonThemesByCategory(category: string): ButtonTheme[] {
  return buttonThemes.filter((theme) => theme.category === category);
}

export function resolveButtonTheme(themeId?: string | null): ButtonTheme {
  if (themeId && themeId !== "default") {
    const match = getButtonTheme(themeId);
    if (match) return match;
  }
  return getButtonTheme(DEFAULT_BUTTON_THEME_ID) as ButtonTheme;
}

