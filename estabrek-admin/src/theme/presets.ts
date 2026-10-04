export type ThemePresetId =
  | "estabrak_soft_gold"
  | "luxury_gold"
  | "clean_tech"
  | "street_dark"
  | "soft_pastel"
  | "earth_minimal"
  | "ocean_mist"
  | "desert_sand"
  | "plum_night"
  | (string & {});

export type ThemeVars = Record<string, string>;

export type ThemePreset = {
  id: ThemePresetId;
  name: string;
  accentStops: [string, string, string];
  light: ThemeVars;
  dark: ThemeVars;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "estabrak_soft_gold",
    name: "Estabrak Soft (Teal + Gold)",
    accentStops: ["#E6D8A8", "#C6A75E", "#6FA6A1"],
    light: {
      "--bg": "#F7F4E9",
      "--surface": "#FFFFFF",
      "--surface-2": "#EFEADB",
      "--border": "#E2DBC8",
      "--text": "#1A1A1A",
      "--muted": "#5A5A5A",
      "--accent": "#6FA6A1",
      "--accent-hover": "#5B918C",
      "--accent-soft": "#C6A75E",
    },
    dark: {
      "--bg": "#0B0B0B",
      "--surface": "#111111",
      "--surface-2": "#1A1A1A",
      "--border": "#2A2A2A",
      "--text": "#F7F4E9",
      "--muted": "#C9C2B2",
      "--accent": "#6FA6A1",
      "--accent-hover": "#C6A75E",
      "--accent-soft": "#E6D8A8",
    },
  },
  {
    id: "luxury_gold",
    name: "Luxury Paper (Black + Gold)",
    accentStops: ["#E6D8A8", "#C6A75E", "#A88C3E"],
    light: {
      "--bg": "#F7F4E9",
      "--surface": "#FFFFFF",
      "--surface-2": "#EFEADB",
      "--border": "#E2DBC8",
      "--text": "#0B0B0B",
      "--muted": "#3A3A3A",
      "--accent": "#C6A75E",
      "--accent-hover": "#A88C3E",
      "--accent-soft": "#E6D8A8",
    },
    dark: {
      "--bg": "#0B0B0B",
      "--surface": "#111111",
      "--surface-2": "#1A1A1A",
      "--border": "#2A2A2A",
      "--text": "#F7F4E9",
      "--muted": "#C9C2B2",
      "--accent": "#C6A75E",
      "--accent-hover": "#E6D8A8",
      "--accent-soft": "#A88C3E",
    },
  },
  {
    id: "clean_tech",
    name: "Clean Tech (Blue)",
    accentStops: ["#2563EB", "#60A5FA", "#EEF3FF"],
    light: {
      "--bg": "#F6F8FC",
      "--surface": "#FFFFFF",
      "--surface-2": "#EEF3FF",
      "--border": "#D9E2F2",
      "--text": "#0F172A",
      "--muted": "#475569",
      "--accent": "#2563EB",
      "--accent-hover": "#1D4ED8",
      "--accent-soft": "#93C5FD",
    },
    dark: {
      "--bg": "#0B1020",
      "--surface": "#0F172A",
      "--surface-2": "#111C35",
      "--border": "#223152",
      "--text": "#E5E7EB",
      "--muted": "#A1A1AA",
      "--accent": "#60A5FA",
      "--accent-hover": "#93C5FD",
      "--accent-soft": "#2563EB",
    },
  },
  {
    id: "street_dark",
    name: "Street Dark (Neon Lime)",
    accentStops: ["#A3E635", "#84CC16", "#D9F99D"],
    light: {
      "--bg": "#F3F4F6",
      "--surface": "#FFFFFF",
      "--surface-2": "#E5E7EB",
      "--border": "#D1D5DB",
      "--text": "#0B0F14",
      "--muted": "#374151",
      "--accent": "#84CC16",
      "--accent-hover": "#65A30D",
      "--accent-soft": "#D9F99D",
    },
    dark: {
      "--bg": "#0B0F14",
      "--surface": "#101826",
      "--surface-2": "#0E1623",
      "--border": "#1F2A3A",
      "--text": "#E5E7EB",
      "--muted": "#9CA3AF",
      "--accent": "#A3E635",
      "--accent-hover": "#84CC16",
      "--accent-soft": "#D9F99D",
    },
  },
  {
    id: "soft_pastel",
    name: "Soft Pastel (Rose)",
    accentStops: ["#FB7185", "#FDBA74", "#FFF7F0"],
    light: {
      "--bg": "#FFF7F0",
      "--surface": "#FFFFFF",
      "--surface-2": "#FFE8E2",
      "--border": "#F3D6CF",
      "--text": "#1F2937",
      "--muted": "#6B7280",
      "--accent": "#FB7185",
      "--accent-hover": "#E11D48",
      "--accent-soft": "#FECDD3",
    },
    dark: {
      "--bg": "#111111",
      "--surface": "#151515",
      "--surface-2": "#1F1F1F",
      "--border": "#2A2A2A",
      "--text": "#FFF7F0",
      "--muted": "#D1D5DB",
      "--accent": "#FB7185",
      "--accent-hover": "#FECDD3",
      "--accent-soft": "#E11D48",
    },
  },
  {
    id: "earth_minimal",
    name: "Earth Minimal (Forest)",
    accentStops: ["#166534", "#86EFAC", "#F4F1EA"],
    light: {
      "--bg": "#F4F1EA",
      "--surface": "#FFFFFF",
      "--surface-2": "#E9E4D7",
      "--border": "#D8D0BF",
      "--text": "#1B1F1D",
      "--muted": "#4B5563",
      "--accent": "#166534",
      "--accent-hover": "#14532D",
      "--accent-soft": "#86EFAC",
    },
    dark: {
      "--bg": "#0D1411",
      "--surface": "#111C17",
      "--surface-2": "#15231D",
      "--border": "#2A3A33",
      "--text": "#F4F1EA",
      "--muted": "#C9C2B2",
      "--accent": "#86EFAC",
      "--accent-hover": "#BBF7D0",
      "--accent-soft": "#166534",
    },
  },
  {
    id: "ocean_mist",
    name: "Ocean Mist (Sky)",
    accentStops: ["#7DD3FC", "#0EA5E9", "#0284C7"],
    light: {
      "--bg": "#F2FAFF",
      "--surface": "#FFFFFF",
      "--surface-2": "#E3F1FA",
      "--border": "#CFE3EF",
      "--text": "#0F172A",
      "--muted": "#475569",
      "--accent": "#0EA5E9",
      "--accent-hover": "#0284C7",
      "--accent-soft": "#7DD3FC",
    },
    dark: {
      "--bg": "#0B1420",
      "--surface": "#0F1B2E",
      "--surface-2": "#12233A",
      "--border": "#1F324D",
      "--text": "#E2E8F0",
      "--muted": "#94A3B8",
      "--accent": "#38BDF8",
      "--accent-hover": "#0EA5E9",
      "--accent-soft": "#7DD3FC",
    },
  },
  {
    id: "desert_sand",
    name: "Desert Sand (Amber)",
    accentStops: ["#F2C18D", "#D97706", "#B45309"],
    light: {
      "--bg": "#FFF6E9",
      "--surface": "#FFFFFF",
      "--surface-2": "#F7E9D4",
      "--border": "#E9D6BC",
      "--text": "#3B2F2A",
      "--muted": "#6B5B52",
      "--accent": "#D97706",
      "--accent-hover": "#B45309",
      "--accent-soft": "#F2C18D",
    },
    dark: {
      "--bg": "#1A120D",
      "--surface": "#221812",
      "--surface-2": "#2A1F18",
      "--border": "#3B2A20",
      "--text": "#FCEFE0",
      "--muted": "#D5C4B5",
      "--accent": "#F59E0B",
      "--accent-hover": "#D97706",
      "--accent-soft": "#F2C18D",
    },
  },
  {
    id: "plum_night",
    name: "Plum Night (Purple)",
    accentStops: ["#E9D5FF", "#A855F7", "#7E22CE"],
    light: {
      "--bg": "#F8F5FF",
      "--surface": "#FFFFFF",
      "--surface-2": "#EEE7F7",
      "--border": "#DDD0EE",
      "--text": "#1C102A",
      "--muted": "#5B4B70",
      "--accent": "#A855F7",
      "--accent-hover": "#7E22CE",
      "--accent-soft": "#E9D5FF",
    },
    dark: {
      "--bg": "#0F0B14",
      "--surface": "#15111B",
      "--surface-2": "#1D1626",
      "--border": "#2D2338",
      "--text": "#F5F3FF",
      "--muted": "#C4BBD9",
      "--accent": "#C084FC",
      "--accent-hover": "#A855F7",
      "--accent-soft": "#E9D5FF",
    },
  },
];

export function getThemePreset(id?: string | null, customPresets?: ThemePreset[] | null) {
  const all = [...THEME_PRESETS, ...(customPresets ?? [])];
  return all.find((p) => p.id === id) ?? THEME_PRESETS[0];
}

// ============================================================
// ENHANCED THEME SYSTEM (ADDITIONAL EXPORTS)
// ============================================================

export type ThemeMode = "light" | "dark" | "system";

// Full theme configuration for advanced theming
export interface FullThemeConfig {
  id: string;
  name: string;
  nameAr?: string;
  colors: {
    light: ThemeVars;
    dark: ThemeVars;
  };
  shadows?: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    glow: string;
    inner: string;
  };
  radius?: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
    full: string;
  };
  typography?: {
    fontSans: string;
    fontSerif: string;
    fontMono: string;
    fontArabic: string;
    fontDisplay: string;
  };
  spacing?: {
    sectionSm: string;
    sectionMd: string;
    sectionLg: string;
    sectionXl: string;
  };
  transition?: {
    fast: string;
    normal: string;
    slow: string;
    bounce: string;
  };
}

// Default shadows
export const DEFAULT_SHADOWS = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
  glow: "0 0 20px rgba(111, 166, 161, 0.3)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
};

// Default radius
export const DEFAULT_RADIUS = {
  none: "0",
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.5rem",
  "3xl": "2rem",
  full: "9999px",
};

// Default typography
export const DEFAULT_TYPOGRAPHY = {
  fontSans: "Inter, system-ui, -apple-system, sans-serif",
  fontSerif: "Playfair Display, Georgia, serif",
  fontMono: "JetBrains Mono, Menlo, Monaco, monospace",
  fontArabic: "IBM Plex Sans Arabic, Tajawal, sans-serif",
  fontDisplay: "Playfair Display, serif",
};

// Default spacing
export const DEFAULT_SPACING = {
  sectionSm: "2rem",
  sectionMd: "4rem",
  sectionLg: "6rem",
  sectionXl: "8rem",
};

// Default transitions
export const DEFAULT_TRANSITION = {
  fast: "150ms ease",
  normal: "300ms ease",
  slow: "500ms ease",
  bounce: "500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)",
};

// Generate full CSS variables from theme
export function generateThemeCssVars(
  preset: ThemePreset,
  mode: "light" | "dark"
): Record<string, string> {
  const colors = mode === "dark" ? preset.dark : preset.light;
  
  return {
    // Colors from preset
    "--color-bg": colors["--bg"] || "#F7F4E9",
    "--color-bg-alt": colors["--surface-2"] || "#EFEADB",
    "--color-surface": colors["--surface"] || "#FFFFFF",
    "--color-surface-hover": colors["--surface-2"] || "#FDFCF9",
    "--color-text": colors["--text"] || "#1A1A1A",
    "--color-text-muted": colors["--muted"] || "#5A5A5A",
    "--color-accent": colors["--accent"] || "#6FA6A1",
    "--color-accent-hover": colors["--accent-hover"] || "#5B918C",
    "--color-accent-soft": colors["--accent-soft"] || "#C6A75E",
    "--color-border": colors["--border"] || "#E2DBC8",
    
    // Additional colors
    "--color-gold": colors["--accent-soft"] || "#C6A75E",
    "--color-gold-light": preset.accentStops?.[0] || "#E6D8A8",
    "--color-gold-dark": preset.accentStops?.[2] || "#A88C3E",
    "--color-success": mode === "dark" ? "#34D399" : "#2D8A5F",
    "--color-warning": mode === "dark" ? "#FBBF24" : "#D97706",
    "--color-error": mode === "dark" ? "#F87171" : "#DC2626",
    "--color-info": mode === "dark" ? "#38BDF8" : "#0EA5E9",
    
    // Shadows
    "--shadow-sm": DEFAULT_SHADOWS.sm,
    "--shadow-md": DEFAULT_SHADOWS.md,
    "--shadow-lg": DEFAULT_SHADOWS.lg,
    "--shadow-xl": DEFAULT_SHADOWS.xl,
    "--shadow-glow": DEFAULT_SHADOWS.glow,
    "--shadow-inner": DEFAULT_SHADOWS.inner,
    
    // Radius
    "--radius-none": DEFAULT_RADIUS.none,
    "--radius-sm": DEFAULT_RADIUS.sm,
    "--radius-md": DEFAULT_RADIUS.md,
    "--radius-lg": DEFAULT_RADIUS.lg,
    "--radius-xl": DEFAULT_RADIUS.xl,
    "--radius-2xl": DEFAULT_RADIUS["2xl"],
    "--radius-3xl": DEFAULT_RADIUS["3xl"],
    "--radius-full": DEFAULT_RADIUS.full,
    
    // Typography
    "--font-sans": DEFAULT_TYPOGRAPHY.fontSans,
    "--font-serif": DEFAULT_TYPOGRAPHY.fontSerif,
    "--font-mono": DEFAULT_TYPOGRAPHY.fontMono,
    "--font-arabic": DEFAULT_TYPOGRAPHY.fontArabic,
    "--font-display": DEFAULT_TYPOGRAPHY.fontDisplay,
    
    // Spacing
    "--section-sm": DEFAULT_SPACING.sectionSm,
    "--section-md": DEFAULT_SPACING.sectionMd,
    "--section-lg": DEFAULT_SPACING.sectionLg,
    "--section-xl": DEFAULT_SPACING.sectionXl,
    
    // Transitions
    "--transition-fast": DEFAULT_TRANSITION.fast,
    "--transition-normal": DEFAULT_TRANSITION.normal,
    "--transition-slow": DEFAULT_TRANSITION.slow,
    "--transition-bounce": DEFAULT_TRANSITION.bounce,
  };
}

// Inject CSS variables into document
export function injectThemeCssVars(
  preset: ThemePreset,
  mode: "light" | "dark"
): void {
  if (typeof document === "undefined") return;
  
  const vars = generateThemeCssVars(preset, mode);
  const root = document.documentElement;
  
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

// Get all available theme IDs
export function getThemeIds(): string[] {
  return THEME_PRESETS.map(p => p.id);
}

// CSS variable helper
export function cssVar(name: string): string {
  return `var(${name})`;
}
