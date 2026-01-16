"use client";

import React, { useEffect, useMemo, useState } from "react";
import { generateThemeCssVars, getThemePreset, type ThemePreset } from "@/theme/presets";
import { generateWebsiteThemeCssVars, getWebsiteThemeById } from "@/cms/themes/websiteThemes";
import { applyCursorTheme } from "@/theme/cursorTheme";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

type ThemeCfg = {
  mode?: "dark" | "light";
  /** Theme Engine preset id (recommended) */
  presetId?: string;
  /** Optional Website Theme id (curated list from settings) */
  websiteThemeId?: string;
  /** optional custom theme presets stored in settings */
  customThemes?: any[];
  /** optional override colors */
  primary?: string;
  secondary?: string;
  /** legacy: per-accent settings (still supported) */
  accent?: string;
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

function toCustomPresets(customThemes?: any[] | null): ThemePreset[] {
  if (!Array.isArray(customThemes)) return [];
  return customThemes
    .map((ct) => {
      if (!ct) return null;
      const id = String(ct.id ?? "");
      if (!id) return null;
      const name = String(ct.name ?? id);
      const accentStops = Array.isArray(ct.accentStops) && ct.accentStops.length === 3 ? ct.accentStops : ["var(--accent)", "var(--accent-soft)", "var(--accent-hover)"];
      const light = ct.light ?? ct.vars ?? ct;
      const dark = ct.dark ?? light;
      // Basic validation: must look like css var map
      if (!light || typeof light !== "object") return null;
      return {
        id,
        name,
        accentStops,
        light,
        dark,
      } as ThemePreset;
    })
    .filter(Boolean) as ThemePreset[];
}

export function ThemeWrap({
  theme,
  cursorThemeId,
  children,
}: {
  theme?: ThemeCfg | null;
  cursorThemeId?: string | null;
  children: React.ReactNode;
}) {
  const t = theme ?? {};
  const storefront = useStorefrontSettings();
  const storefrontAccent = resolveCustomColor(storefront.accentColor);
  const storefrontAccentSoft = resolveCustomColor(storefront.accentColor2);
  const glassEnabled = storefront.glassEffectsEnabled !== false;
  const baseMode: "dark" | "light" = t.mode === "light" ? "light" : "dark";
  // Default: Estabrak Soft (matches logo + paper background). Keep luxury_gold as selectable preset.
  const basePresetId = t.presetId ?? (t.accent === "gold" ? "estabrak_soft_gold" : "estabrak_soft_gold");

  const customPresets = useMemo(() => toCustomPresets(t.customThemes), [t.customThemes]);

  const [preview, setPreview] = useState<{ presetId?: string; mode?: "dark" | "light" } | null>(null);

  useEffect(() => {
    // Preview without saving: /?themePreview=luxury_gold&themeMode=light
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get("themePreview");
    if (!p) return;
    const m = sp.get("themeMode");
    setPreview({
      presetId: p,
      mode: m === "dark" || m === "light" ? (m as any) : undefined,
    });
  }, []);

  useEffect(() => {
    applyCursorTheme(cursorThemeId);
  }, [cursorThemeId]);

  const mode: "dark" | "light" = preview?.mode ?? baseMode;
  const presetId = preview?.presetId ?? basePresetId;

  const preset = getThemePreset(presetId ?? null, customPresets);
  const vars = mode === "dark" ? preset.dark : preset.light;
  const themeVars = useMemo(() => generateThemeCssVars(preset, mode), [preset, mode]);

  const websiteTheme = getWebsiteThemeById(typeof t.websiteThemeId === "string" ? t.websiteThemeId : null);
  const websiteVars = websiteTheme ? generateWebsiteThemeCssVars(websiteTheme) : null;

  const r: NonNullable<ThemeCfg["radius"]> = t.radius === "md" || t.radius === "xl" || t.radius === "2xl" ? t.radius : "2xl";
  const surface: "classic" | "glass" = t.surface === "classic" ? "classic" : "glass";
  const primary = resolveCustomColor(t.primary);
  const secondary = resolveCustomColor(t.secondary);

  const baseAccent = websiteTheme?.colors.primary ?? vars["--accent"];
  const baseAccentSoft = websiteTheme?.colors.secondary ?? vars["--accent-soft"] ?? baseAccent;
  const baseAccentHover = websiteTheme?.colors.accent ?? vars["--accent-hover"] ?? baseAccent;

  const accent = storefrontAccent ?? primary ?? baseAccent;
  const accentSoft = storefrontAccentSoft ?? secondary ?? baseAccentSoft ?? accent;
  const accentHover = storefrontAccentSoft ?? secondary ?? baseAccentHover ?? accent;
  const accentContrast = contrastTextColor(accent, vars["--text"]);
  const [a1, a2, a3] = websiteTheme
    ? [
        accentSoft ?? websiteTheme.colors.secondary,
        accent ?? websiteTheme.colors.primary,
        accentHover ?? websiteTheme.colors.accent,
      ]
    : [accentSoft ?? preset.accentStops[0], accent ?? preset.accentStops[1], accentHover ?? preset.accentStops[2]];

  return (
    <div
      data-theme={mode}
      data-glass-effects={glassEnabled ? "1" : "0"}
      className={
        "min-h-screen bg-[var(--bg)] text-[var(--text)]" +
        (surface === "classic" || !glassEnabled ? "" : " [--glass-bg:rgba(0,0,0,0.45)]")
      }
      style={
        {
          ...vars,
          ...themeVars,
          ...(websiteVars ?? {}),
          "--accent": accent,
          "--accent-soft": accentSoft,
          "--accent-hover": accentHover,
          "--accent-1": a1,
          "--accent-2": a2,
          "--accent-3": a3,
          "--color-accent": accent,
          "--color-accent-soft": accentSoft ?? accent,
          "--color-accent-hover": accentHover ?? accent,
          "--color-gold": accentSoft ?? (themeVars["--color-gold"] as string),
          "--color-gold-light": a1,
          "--color-gold-dark": a3,
          "--primary": accent,
          "--secondary": accentSoft ?? accent,
          "--radius": radiusMap[r],
          "--accent-contrast": accentContrast ?? "#0B0B0B",
          colorScheme: mode,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
