import { DARK_THEMES } from "./templates/dark";
import { LIGHT_THEMES } from "./templates/light";
import { LUXURY_THEMES } from "./templates/luxury";
import { GRADIENT_THEMES } from "./templates/gradient";
import { MODERN_THEMES } from "./templates/modern";
import { GALLERY_EXTRA_THEMES } from "./templates/galleryExtra";
import type { WebsiteTheme, WebsiteThemeCategory } from "./types";

export type { WebsiteTheme, WebsiteThemeCategory };

export { DARK_THEMES, LIGHT_THEMES, LUXURY_THEMES, GRADIENT_THEMES, MODERN_THEMES, GALLERY_EXTRA_THEMES };

export const ALL_WEBSITE_THEMES: WebsiteTheme[] = [
  ...DARK_THEMES,
  ...LIGHT_THEMES,
  ...LUXURY_THEMES,
  ...GRADIENT_THEMES,
  ...MODERN_THEMES,
  ...GALLERY_EXTRA_THEMES,
];

const THEME_BY_ID = new Map(ALL_WEBSITE_THEMES.map((theme) => [theme.id, theme] as const));
const GALLERY_ID_RE = /^theme-gallery-(\d+)$/i;

function normalizeWebsiteThemeId(id: string | null | undefined): string | null {
  if (!id) return null;
  const raw = String(id).trim();
  if (!raw || raw === "default") return null;
  if (THEME_BY_ID.has(raw)) return raw;

  const galleryMatch = raw.match(GALLERY_ID_RE);
  if (galleryMatch) {
    const index = Number.parseInt(galleryMatch[1] ?? "", 10);
    if (Number.isFinite(index) && index > 0) {
      return `theme-gallery-${String(index).padStart(2, "0")}`;
    }
  }

  return raw;
}

function buildGeneratedGalleryTheme(id: string): WebsiteTheme | undefined {
  const match = id.match(GALLERY_ID_RE);
  if (!match) return undefined;

  const index = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(index) || index <= 0) return undefined;

  const variants: Array<{
    category: WebsiteThemeCategory;
    colors: WebsiteTheme["colors"];
    fonts: WebsiteTheme["fonts"];
    borderRadius: WebsiteTheme["borderRadius"];
  }> = [
    {
      category: "light",
      colors: {
        primary: "#7c3aed",
        secondary: "#06b6d4",
        accent: "#ec4899",
        background: "#f8f5ff",
        surface: "rgba(255,255,255,0.82)",
        text: "#0f172a",
        textMuted: "#64748b",
        border: "rgba(124,58,237,0.24)",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-3xl",
    },
    {
      category: "gradient",
      colors: {
        primary: "#ec4899",
        secondary: "#a855f7",
        accent: "#22d3ee",
        background: "#fdf2f8",
        surface: "#ffffff",
        text: "#4a044e",
        textMuted: "#86198f",
        border: "#f5d0fe",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
    {
      category: "dark",
      colors: {
        primary: "#6366f1",
        secondary: "#8b5cf6",
        accent: "#ec4899",
        background: "#020617",
        surface: "#0f172a",
        text: "#e2e8f0",
        textMuted: "#94a3b8",
        border: "#1e293b",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
    {
      category: "modern",
      colors: {
        primary: "#2563eb",
        secondary: "#06b6d4",
        accent: "#14b8a6",
        background: "#eff6ff",
        surface: "#ffffff",
        text: "#1e3a8a",
        textMuted: "#1d4ed8",
        border: "#bfdbfe",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
    {
      category: "luxury",
      colors: {
        primary: "#d4af37",
        secondary: "#f5d76e",
        accent: "#e5c76b",
        background: "#0a0a0a",
        surface: "#171717",
        text: "#fafafa",
        textMuted: "#a3a3a3",
        border: "#262626",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
      fonts: { heading: "font-serif", body: "font-sans" },
      borderRadius: "rounded-none",
    },
  ];

  const variant = variants[(index - 1) % variants.length];
  return {
    id,
    name: `Gallery Theme ${index}`,
    nameAr: `ثيم معرض ${index}`,
    category: variant.category,
    colors: variant.colors,
    fonts: variant.fonts,
    borderRadius: variant.borderRadius,
  };
}

export function getWebsiteThemeById(id: string | null | undefined): WebsiteTheme | undefined {
  const normalizedId = normalizeWebsiteThemeId(id);
  if (!normalizedId) return undefined;
  return THEME_BY_ID.get(normalizedId) ?? buildGeneratedGalleryTheme(normalizedId);
}

export function getWebsiteThemesByCategory(category: string): WebsiteTheme[] {
  return ALL_WEBSITE_THEMES.filter((t) => t.category === category);
}

export function getAllThemeCategories(): WebsiteThemeCategory[] {
  return [...new Set(ALL_WEBSITE_THEMES.map((t) => t.category))] as WebsiteThemeCategory[];
}

export const WEBSITE_THEME_CATEGORY_LABELS_AR: Record<string, string> = {
  dark: "داكن",
  light: "فاتح",
  luxury: "فاخر",
  gradient: "متدرج",
  modern: "حديث",
};

export function generateWebsiteThemeCssVars(theme: WebsiteTheme): Record<string, string> {
  const c = theme.colors;
  const surface2 = c.background;

  return {
    "--bg": c.background,
    "--surface": c.surface,
    "--surface-2": surface2,
    "--border": c.border,
    "--text": c.text,
    "--muted": c.textMuted,
    "--accent": c.primary,
    "--accent-soft": c.secondary,
    "--accent-hover": c.accent,

    "--color-bg": c.background,
    "--color-bg-alt": surface2,
    "--color-surface": c.surface,
    "--color-surface-hover": surface2,
    "--color-text": c.text,
    "--color-text-muted": c.textMuted,
    "--color-border": c.border,
    "--color-accent": c.primary,
    "--color-accent-soft": c.secondary,
    "--color-accent-hover": c.accent,
    "--color-success": c.success,
    "--color-warning": c.warning,
    "--color-error": c.error,
    "--color-info": c.accent,
  };
}
