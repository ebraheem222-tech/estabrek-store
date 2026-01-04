import { generateThemeCssVars, getThemePreset } from "./presets";

export type AdminThemeConfig = {
  presetId?: string;
  mode?: "dark" | "light";
};

const ADMIN_THEME_ATTR = "data-admin-theme";

export function applyAdminTheme(config?: AdminThemeConfig | null) {
  if (typeof document === "undefined") return;

  const presetId = typeof config?.presetId === "string" ? config.presetId : "default";
  const mode: "dark" | "light" = config?.mode === "light" ? "light" : "dark";

  const root = document.documentElement;

  if (!presetId || presetId === "default") {
    root.removeAttribute(ADMIN_THEME_ATTR);
    return;
  }

  const preset = getThemePreset(presetId);
  const baseVars = mode === "dark" ? preset.dark : preset.light;
  const fullVars = generateThemeCssVars(preset, mode);

  root.setAttribute(ADMIN_THEME_ATTR, presetId);

  for (const [key, value] of Object.entries({ ...baseVars, ...fullVars })) {
    if (typeof value === "string" && value.trim()) root.style.setProperty(key, value);
  }

  root.style.colorScheme = mode;
}

