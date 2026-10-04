import React, { useMemo } from "react";
import { cn } from "./ui/cn";
import { generateThemeCssVars, getThemePreset } from "../theme/presets";
import { generateWebsiteThemeCssVars, getWebsiteThemeById } from "../cms/themes/websiteThemes";
import { GalleryThemeMotionBackdrop } from "../cms/themes/GalleryThemeMotionBackdrop";

type ThemeCfg = {
  mode?: "dark" | "light";
  presetId?: string;
  websiteThemeId?: string;
  primary?: string;
  secondary?: string;
  radius?: "md" | "xl" | "2xl";
  surface?: "classic" | "glass";
};

const radiusMap: Record<NonNullable<ThemeCfg["radius"]>, string> = {
  md: "12px",
  xl: "16px",
  "2xl": "20px",
};

function resolveCustomColor(value?: string): string | undefined {
  if (!value || typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(v)) return v;
  if (/^var\\(--.+\\)$/.test(v)) return v;
  if (v === "transparent" || v === "currentColor") return v;
  return undefined;
}

function hexToRgb(input?: string): { r: number; g: number; b: number } | null {
  if (!input) return null;
  const hex = input.replace("#", "").trim();
  if (![3, 4, 6, 8].includes(hex.length)) return null;
  const full =
    hex.length === 3 || hex.length === 4
      ? hex
          .slice(0, 3)
          .split("")
          .map((c) => c + c)
          .join("")
      : hex.slice(0, 6);
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function contrastTextColor(color?: string, fallback?: string): string | undefined {
  const rgb = hexToRgb(color ?? "");
  if (!rgb) return fallback;
  const lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return lum > 0.6 ? "#0B0B0B" : "#F7F4E9";
}

export function ThemePreview({
  theme,
  className,
  children,
}: {
  theme?: ThemeCfg | null;
  className?: string;
  children: React.ReactNode;
}) {
  const t = theme ?? {};
  const mode: "dark" | "light" = t.mode === "light" ? "light" : "dark";
  const preset = useMemo(() => getThemePreset(t.presetId ?? null), [t.presetId]);
  const baseVars = mode === "dark" ? preset.dark : preset.light;
  const themeVars = useMemo(() => generateThemeCssVars(preset, mode), [preset, mode]);
  const websiteTheme = useMemo(
    () => getWebsiteThemeById(typeof t.websiteThemeId === "string" ? t.websiteThemeId : null),
    [t.websiteThemeId]
  );
  const websiteVars = useMemo(
    () => (websiteTheme ? generateWebsiteThemeCssVars(websiteTheme) : null),
    [websiteTheme]
  );
  const primary = resolveCustomColor(t.primary);
  const secondary = resolveCustomColor(t.secondary);
  const accent = primary ?? websiteTheme?.colors.primary ?? baseVars["--accent"];
  const accentSoft =
    secondary ?? websiteTheme?.colors.secondary ?? baseVars["--accent-soft"] ?? accent;
  const accentHover =
    secondary ?? websiteTheme?.colors.accent ?? baseVars["--accent-hover"] ?? accent;
  const accentStops: [string, string, string] = [
    accentSoft ?? accent,
    accent ?? accentSoft ?? accent,
    accentHover ?? accent,
  ];
  const radius = t.radius === "md" || t.radius === "xl" || t.radius === "2xl" ? t.radius : "2xl";
  const surface: "classic" | "glass" = t.surface === "classic" ? "classic" : "glass";
  const accentContrast = contrastTextColor(accent, baseVars["--text"]);

  return (
    <div
      data-skin-reset=""
      data-theme={mode}
      data-gallery-theme-active={websiteTheme?.id?.startsWith("theme-gallery-") ? "1" : "0"}
      className={cn(
        "theme-preview relative isolate",
        surface === "classic" ? undefined : "[--glass-bg:rgba(0,0,0,0.45)]",
        className
      )}
      style={
        {
          ...baseVars,
          ...themeVars,
          ...(websiteVars ?? {}),
          "--accent": accent,
          "--accent-soft": accentSoft,
          "--accent-hover": accentHover,
          "--accent-1": accentStops[0],
          "--accent-2": accentStops[1],
          "--accent-3": accentStops[2],
          "--color-accent": accent,
          "--color-accent-soft": accentSoft ?? accent,
          "--color-accent-hover": accentHover ?? accent,
          "--color-gold": accentSoft ?? themeVars["--color-gold"],
          "--color-gold-light": accentStops[0],
          "--color-gold-dark": accentStops[2],
          "--primary": accent,
          "--secondary": accentSoft ?? accent,
          "--radius": radiusMap[radius],
          "--accent-contrast": accentContrast ?? "#0B0B0B",
          backgroundColor: baseVars["--bg"],
          color: baseVars["--text"],
          colorScheme: mode,
        } as React.CSSProperties
      }
    >
      <GalleryThemeMotionBackdrop websiteThemeId={websiteTheme?.id} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
