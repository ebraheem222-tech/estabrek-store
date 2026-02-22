import {
  GALLERY_THEME_SPECS,
  mapGalleryCategoryToWebsiteThemeCategory,
  type GalleryThemeSpecCategory,
} from "../galleryThemeSpecs";
import type { WebsiteTheme } from "../types";

type ThemePalette = {
  colors: Omit<WebsiteTheme["colors"], "success" | "warning" | "error">;
  fonts: WebsiteTheme["fonts"];
  borderRadius: WebsiteTheme["borderRadius"];
};

const BASE_STATUS_COLORS: Pick<WebsiteTheme["colors"], "success" | "warning" | "error"> = {
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
};

const CATEGORY_PALETTES: Record<GalleryThemeSpecCategory, ThemePalette[]> = {
  Glass: [
    {
      colors: {
        primary: "#7c3aed",
        secondary: "#06b6d4",
        accent: "#ec4899",
        background: "#eef2ff",
        surface: "rgba(255,255,255,0.78)",
        text: "#0f172a",
        textMuted: "#64748b",
        border: "rgba(99,102,241,0.25)",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-3xl",
    },
    {
      colors: {
        primary: "#0ea5e9",
        secondary: "#14b8a6",
        accent: "#6366f1",
        background: "#ecfeff",
        surface: "rgba(255,255,255,0.75)",
        text: "#0f172a",
        textMuted: "#475569",
        border: "rgba(14,165,233,0.22)",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
    {
      colors: {
        primary: "#10b981",
        secondary: "#06b6d4",
        accent: "#a855f7",
        background: "#f0fdf4",
        surface: "rgba(255,255,255,0.8)",
        text: "#052e16",
        textMuted: "#166534",
        border: "rgba(16,185,129,0.22)",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
  ],
  Candy: [
    {
      colors: {
        primary: "#ec4899",
        secondary: "#a855f7",
        accent: "#06b6d4",
        background: "#fdf4ff",
        surface: "#ffffff",
        text: "#4a044e",
        textMuted: "#86198f",
        border: "#f5d0fe",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-3xl",
    },
    {
      colors: {
        primary: "#fb7185",
        secondary: "#f59e0b",
        accent: "#8b5cf6",
        background: "#fff1f2",
        surface: "#ffffff",
        text: "#4c0519",
        textMuted: "#9f1239",
        border: "#fecdd3",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
    {
      colors: {
        primary: "#f97316",
        secondary: "#ec4899",
        accent: "#22d3ee",
        background: "#fffbeb",
        surface: "#ffffff",
        text: "#431407",
        textMuted: "#9a3412",
        border: "#fdba74",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
  ],
  Aurora: [
    {
      colors: {
        primary: "#22c55e",
        secondary: "#06b6d4",
        accent: "#8b5cf6",
        background: "#020617",
        surface: "#0f172a",
        text: "#f8fafc",
        textMuted: "#94a3b8",
        border: "#1e293b",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
    {
      colors: {
        primary: "#10b981",
        secondary: "#6366f1",
        accent: "#ec4899",
        background: "#0b1022",
        surface: "#111827",
        text: "#f1f5f9",
        textMuted: "#94a3b8",
        border: "#334155",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
  ],
  Space: [
    {
      colors: {
        primary: "#6366f1",
        secondary: "#8b5cf6",
        accent: "#ec4899",
        background: "#020617",
        surface: "#0f172a",
        text: "#e2e8f0",
        textMuted: "#94a3b8",
        border: "#1e293b",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
    {
      colors: {
        primary: "#0ea5e9",
        secondary: "#6366f1",
        accent: "#22d3ee",
        background: "#030712",
        surface: "#111827",
        text: "#f8fafc",
        textMuted: "#9ca3af",
        border: "#1f2937",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
  ],
  Gaming: [
    {
      colors: {
        primary: "#00ffff",
        secondary: "#ff00ff",
        accent: "#facc15",
        background: "#09090b",
        surface: "#18181b",
        text: "#fafafa",
        textMuted: "#a1a1aa",
        border: "#27272a",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
    {
      colors: {
        primary: "#22d3ee",
        secondary: "#818cf8",
        accent: "#f472b6",
        background: "#0f172a",
        surface: "#1e293b",
        text: "#f8fafc",
        textMuted: "#94a3b8",
        border: "#334155",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-lg",
    },
  ],
  Luxury: [
    {
      colors: {
        primary: "#d4af37",
        secondary: "#f5d76e",
        accent: "#e5c76b",
        background: "#0a0a0a",
        surface: "#171717",
        text: "#fafafa",
        textMuted: "#a3a3a3",
        border: "#262626",
      },
      fonts: { heading: "font-serif", body: "font-sans" },
      borderRadius: "rounded-none",
    },
    {
      colors: {
        primary: "#b76e79",
        secondary: "#d4a5a5",
        accent: "#f5d76e",
        background: "#1a1212",
        surface: "#241a1a",
        text: "#fff1f2",
        textMuted: "#fecdd3",
        border: "#4c1d2a",
      },
      fonts: { heading: "font-serif", body: "font-sans" },
      borderRadius: "rounded-none",
    },
  ],
  Cyberpunk: [
    {
      colors: {
        primary: "#22d3ee",
        secondary: "#f43f5e",
        accent: "#a855f7",
        background: "#07050f",
        surface: "#140b29",
        text: "#f5f3ff",
        textMuted: "#c4b5fd",
        border: "#312e81",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
    {
      colors: {
        primary: "#f59e0b",
        secondary: "#ec4899",
        accent: "#06b6d4",
        background: "#0b0f1a",
        surface: "#111827",
        text: "#f9fafb",
        textMuted: "#9ca3af",
        border: "#1f2937",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
  ],
  Nature: [
    {
      colors: {
        primary: "#16a34a",
        secondary: "#22c55e",
        accent: "#4ade80",
        background: "#f0fdf4",
        surface: "#ffffff",
        text: "#14532d",
        textMuted: "#166534",
        border: "#bbf7d0",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
    {
      colors: {
        primary: "#0284c7",
        secondary: "#06b6d4",
        accent: "#22d3ee",
        background: "#ecfeff",
        surface: "#ffffff",
        text: "#164e63",
        textMuted: "#0e7490",
        border: "#a5f3fc",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
    {
      colors: {
        primary: "#ea580c",
        secondary: "#f97316",
        accent: "#f59e0b",
        background: "#fff7ed",
        surface: "#ffffff",
        text: "#431407",
        textMuted: "#9a3412",
        border: "#fed7aa",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
  ],
  Abstract: [
    {
      colors: {
        primary: "#6366f1",
        secondary: "#ec4899",
        accent: "#06b6d4",
        background: "#faf5ff",
        surface: "#ffffff",
        text: "#1e1b4b",
        textMuted: "#6b7280",
        border: "#e9d5ff",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-3xl",
    },
    {
      colors: {
        primary: "#0f172a",
        secondary: "#334155",
        accent: "#3b82f6",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        textMuted: "#64748b",
        border: "#e2e8f0",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
  ],
  Modern: [
    {
      colors: {
        primary: "#6366f1",
        secondary: "#8b5cf6",
        accent: "#f59e0b",
        background: "#ffffff",
        surface: "#f8fafc",
        text: "#111827",
        textMuted: "#6b7280",
        border: "#e5e7eb",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
    {
      colors: {
        primary: "#0ea5e9",
        secondary: "#06b6d4",
        accent: "#22c55e",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        textMuted: "#64748b",
        border: "#e2e8f0",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
  ],
  Effects: [
    {
      colors: {
        primary: "#ef4444",
        secondary: "#f97316",
        accent: "#eab308",
        background: "#fef2f2",
        surface: "#ffffff",
        text: "#450a0a",
        textMuted: "#991b1b",
        border: "#fecaca",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-2xl",
    },
    {
      colors: {
        primary: "#64748b",
        secondary: "#94a3b8",
        accent: "#cbd5e1",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        textMuted: "#475569",
        border: "#cbd5e1",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
    {
      colors: {
        primary: "#a855f7",
        secondary: "#6366f1",
        accent: "#ec4899",
        background: "#f5f3ff",
        surface: "#ffffff",
        text: "#312e81",
        textMuted: "#6d28d9",
        border: "#ddd6fe",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-3xl",
    },
  ],
  Tech: [
    {
      colors: {
        primary: "#2563eb",
        secondary: "#06b6d4",
        accent: "#14b8a6",
        background: "#eff6ff",
        surface: "#ffffff",
        text: "#1e3a8a",
        textMuted: "#1d4ed8",
        border: "#bfdbfe",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
    {
      colors: {
        primary: "#0f172a",
        secondary: "#334155",
        accent: "#3b82f6",
        background: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        textMuted: "#64748b",
        border: "#cbd5e1",
      },
      fonts: { heading: "font-mono", body: "font-sans" },
      borderRadius: "rounded-xl",
    },
  ],
  Minimal: [
    {
      colors: {
        primary: "#18181b",
        secondary: "#3f3f46",
        accent: "#71717a",
        background: "#ffffff",
        surface: "#fafafa",
        text: "#18181b",
        textMuted: "#71717a",
        border: "#e4e4e7",
      },
      fonts: { heading: "font-sans", body: "font-sans" },
      borderRadius: "rounded-none",
    },
    {
      colors: {
        primary: "#78716c",
        secondary: "#a8a29e",
        accent: "#d6d3d1",
        background: "#fafaf9",
        surface: "#ffffff",
        text: "#1c1917",
        textMuted: "#57534e",
        border: "#e7e5e4",
      },
      fonts: { heading: "font-serif", body: "font-sans" },
      borderRadius: "rounded-lg",
    },
  ],
};

function getPalette(category: GalleryThemeSpecCategory, idx: number): ThemePalette {
  const list = CATEGORY_PALETTES[category] ?? CATEGORY_PALETTES.Modern;
  return list[idx % list.length];
}

function toThemeId(id: number) {
  return `theme-gallery-${String(id).padStart(2, "0")}`;
}

export const GALLERY_EXTRA_THEMES: WebsiteTheme[] = GALLERY_THEME_SPECS.map((spec, idx) => {
  const palette = getPalette(spec.category, idx);

  return {
    id: toThemeId(spec.id),
    name: spec.name,
    nameAr: `${spec.name} (معرض)`,
    category: mapGalleryCategoryToWebsiteThemeCategory(spec.category),
    colors: {
      ...palette.colors,
      ...BASE_STATUS_COLORS,
    },
    fonts: palette.fonts,
    borderRadius: palette.borderRadius,
  };
});
