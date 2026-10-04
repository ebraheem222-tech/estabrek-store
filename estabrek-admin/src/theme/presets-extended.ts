// ============================================================
// ESTABREK THEME PRESETS - MEGA EXTENDED (70+ THEMES)
// ============================================================

import type { ThemePreset } from "./presets";

// Re-export base presets
export * from "./presets";

// ============================================================
// GAMING THEMES
// ============================================================
export const GAMING_THEMES: ThemePreset[] = [
  {
    id: "gaming",
    name: "Gaming Red",
    accentStops: ["#FF4D4D", "#FF0000", "#CC0000"],
    light: {
      "--bg": "#1A1A2E", "--surface": "#16213E", "--surface-2": "#0F3460",
      "--border": "#E94560", "--text": "#EAEAEA", "--muted": "#B0B0B0",
      "--accent": "#E94560", "--accent-hover": "#FF2E63", "--accent-soft": "#FF6B6B",
    },
    dark: {
      "--bg": "#0D0D1A", "--surface": "#16213E", "--surface-2": "#1A1A2E",
      "--border": "#E94560", "--text": "#FFFFFF", "--muted": "#A0A0A0",
      "--accent": "#E94560", "--accent-hover": "#FF2E63", "--accent-soft": "#FF6B6B",
    },
  },
  {
    id: "gaming_green",
    name: "Gaming Green",
    accentStops: ["#00FF87", "#00D26A", "#00994D"],
    light: {
      "--bg": "#0A1612", "--surface": "#0F1F1A", "--surface-2": "#142821",
      "--border": "#00FF87", "--text": "#EAEAEA", "--muted": "#8AFFB0",
      "--accent": "#00FF87", "--accent-hover": "#00D26A", "--accent-soft": "#7FFFAB",
    },
    dark: {
      "--bg": "#050B09", "--surface": "#0A1612", "--surface-2": "#0F1F1A",
      "--border": "#00FF87", "--text": "#FFFFFF", "--muted": "#8AFFB0",
      "--accent": "#00FF87", "--accent-hover": "#00D26A", "--accent-soft": "#7FFFAB",
    },
  },
  {
    id: "gaming_blue",
    name: "Gaming Blue",
    accentStops: ["#00D4FF", "#00A8CC", "#007A99"],
    light: {
      "--bg": "#0A1520", "--surface": "#0F1F2E", "--surface-2": "#14293D",
      "--border": "#00D4FF", "--text": "#EAEAEA", "--muted": "#8AE0FF",
      "--accent": "#00D4FF", "--accent-hover": "#00A8CC", "--accent-soft": "#7FE7FF",
    },
    dark: {
      "--bg": "#050A10", "--surface": "#0A1520", "--surface-2": "#0F1F2E",
      "--border": "#00D4FF", "--text": "#FFFFFF", "--muted": "#8AE0FF",
      "--accent": "#00D4FF", "--accent-hover": "#00A8CC", "--accent-soft": "#7FE7FF",
    },
  },
  {
    id: "retro",
    name: "Retro Arcade",
    accentStops: ["#FFEE00", "#FFD700", "#FF8C00"],
    light: {
      "--bg": "#1a0a2e", "--surface": "#2d1b4e", "--surface-2": "#3d2b5e",
      "--border": "#ff00ff", "--text": "#00ffff", "--muted": "#ff00ff",
      "--accent": "#ffff00", "--accent-hover": "#ff8c00", "--accent-soft": "#ff00ff",
    },
    dark: {
      "--bg": "#0d051a", "--surface": "#1a0a2e", "--surface-2": "#2d1b4e",
      "--border": "#ff00ff", "--text": "#00ffff", "--muted": "#ff00ff",
      "--accent": "#ffff00", "--accent-hover": "#ff8c00", "--accent-soft": "#ff00ff",
    },
  },
];

// ============================================================
// NEON THEMES
// ============================================================
export const NEON_THEMES: ThemePreset[] = [
  {
    id: "neon_cyan",
    name: "Neon Cyan",
    accentStops: ["#00FFFF", "#00E5E5", "#00CCCC"],
    light: {
      "--bg": "#0A0A0A", "--surface": "#111111", "--surface-2": "#1A1A1A",
      "--border": "#00FFFF", "--text": "#FFFFFF", "--muted": "#8AFFFF",
      "--accent": "#00FFFF", "--accent-hover": "#00E5E5", "--accent-soft": "#7FFFFF",
    },
    dark: {
      "--bg": "#000000", "--surface": "#0A0A0A", "--surface-2": "#111111",
      "--border": "#00FFFF", "--text": "#FFFFFF", "--muted": "#8AFFFF",
      "--accent": "#00FFFF", "--accent-hover": "#00E5E5", "--accent-soft": "#7FFFFF",
    },
  },
  {
    id: "neon_pink",
    name: "Neon Pink",
    accentStops: ["#FF00FF", "#E500E5", "#CC00CC"],
    light: {
      "--bg": "#0A0A0A", "--surface": "#111111", "--surface-2": "#1A1A1A",
      "--border": "#FF00FF", "--text": "#FFFFFF", "--muted": "#FF8AFF",
      "--accent": "#FF00FF", "--accent-hover": "#E500E5", "--accent-soft": "#FF7FFF",
    },
    dark: {
      "--bg": "#000000", "--surface": "#0A0A0A", "--surface-2": "#111111",
      "--border": "#FF00FF", "--text": "#FFFFFF", "--muted": "#FF8AFF",
      "--accent": "#FF00FF", "--accent-hover": "#E500E5", "--accent-soft": "#FF7FFF",
    },
  },
  {
    id: "neon_green",
    name: "Neon Green",
    accentStops: ["#39FF14", "#32E512", "#2BCC10"],
    light: {
      "--bg": "#0A0A0A", "--surface": "#111111", "--surface-2": "#1A1A1A",
      "--border": "#39FF14", "--text": "#FFFFFF", "--muted": "#8AFF75",
      "--accent": "#39FF14", "--accent-hover": "#32E512", "--accent-soft": "#7FFF6A",
    },
    dark: {
      "--bg": "#000000", "--surface": "#0A0A0A", "--surface-2": "#111111",
      "--border": "#39FF14", "--text": "#FFFFFF", "--muted": "#8AFF75",
      "--accent": "#39FF14", "--accent-hover": "#32E512", "--accent-soft": "#7FFF6A",
    },
  },
  {
    id: "neon_purple",
    name: "Neon Purple",
    accentStops: ["#BF00FF", "#A800E5", "#9100CC"],
    light: {
      "--bg": "#0A0A0A", "--surface": "#111111", "--surface-2": "#1A1A1A",
      "--border": "#BF00FF", "--text": "#FFFFFF", "--muted": "#DA8AFF",
      "--accent": "#BF00FF", "--accent-hover": "#A800E5", "--accent-soft": "#D17FFF",
    },
    dark: {
      "--bg": "#000000", "--surface": "#0A0A0A", "--surface-2": "#111111",
      "--border": "#BF00FF", "--text": "#FFFFFF", "--muted": "#DA8AFF",
      "--accent": "#BF00FF", "--accent-hover": "#A800E5", "--accent-soft": "#D17FFF",
    },
  },
  {
    id: "neon_orange",
    name: "Neon Orange",
    accentStops: ["#FF6600", "#E55C00", "#CC5200"],
    light: {
      "--bg": "#0A0A0A", "--surface": "#111111", "--surface-2": "#1A1A1A",
      "--border": "#FF6600", "--text": "#FFFFFF", "--muted": "#FF9F5A",
      "--accent": "#FF6600", "--accent-hover": "#E55C00", "--accent-soft": "#FF944D",
    },
    dark: {
      "--bg": "#000000", "--surface": "#0A0A0A", "--surface-2": "#111111",
      "--border": "#FF6600", "--text": "#FFFFFF", "--muted": "#FF9F5A",
      "--accent": "#FF6600", "--accent-hover": "#E55C00", "--accent-soft": "#FF944D",
    },
  },
];

// ============================================================
// CYBERPUNK THEMES
// ============================================================
export const CYBERPUNK_THEMES: ThemePreset[] = [
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    accentStops: ["#00FFF0", "#FF00A0", "#9600FF"],
    light: {
      "--bg": "#0c0014", "--surface": "#150020", "--surface-2": "#1e002b",
      "--border": "#ff00a0", "--text": "#00fff0", "--muted": "#ff00a0",
      "--accent": "#00fff0", "--accent-hover": "#ff00a0", "--accent-soft": "#9600ff",
    },
    dark: {
      "--bg": "#06000a", "--surface": "#0c0014", "--surface-2": "#150020",
      "--border": "#ff00a0", "--text": "#00fff0", "--muted": "#ff00a0",
      "--accent": "#00fff0", "--accent-hover": "#ff00a0", "--accent-soft": "#9600ff",
    },
  },
  {
    id: "matrix",
    name: "Matrix",
    accentStops: ["#00FF00", "#00CC00", "#009900"],
    light: {
      "--bg": "#000000", "--surface": "#001100", "--surface-2": "#002200",
      "--border": "#00FF00", "--text": "#00FF00", "--muted": "#008800",
      "--accent": "#00FF00", "--accent-hover": "#00CC00", "--accent-soft": "#00AA00",
    },
    dark: {
      "--bg": "#000000", "--surface": "#001100", "--surface-2": "#002200",
      "--border": "#00FF00", "--text": "#00FF00", "--muted": "#008800",
      "--accent": "#00FF00", "--accent-hover": "#00CC00", "--accent-soft": "#00AA00",
    },
  },
  {
    id: "tron",
    name: "Tron",
    accentStops: ["#00D4FF", "#0099CC", "#006699"],
    light: {
      "--bg": "#000814", "--surface": "#001020", "--surface-2": "#00182B",
      "--border": "#00D4FF", "--text": "#00D4FF", "--muted": "#006699",
      "--accent": "#00D4FF", "--accent-hover": "#FF6600", "--accent-soft": "#0099CC",
    },
    dark: {
      "--bg": "#000408", "--surface": "#000814", "--surface-2": "#001020",
      "--border": "#00D4FF", "--text": "#00D4FF", "--muted": "#006699",
      "--accent": "#00D4FF", "--accent-hover": "#FF6600", "--accent-soft": "#0099CC",
    },
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    accentStops: ["#FF71CE", "#01CDFE", "#B967FF"],
    light: {
      "--bg": "#2D1B4E", "--surface": "#3D2B5E", "--surface-2": "#4D3B6E",
      "--border": "#FF71CE", "--text": "#01CDFE", "--muted": "#B967FF",
      "--accent": "#FF71CE", "--accent-hover": "#01CDFE", "--accent-soft": "#B967FF",
    },
    dark: {
      "--bg": "#1A0A2E", "--surface": "#2D1B4E", "--surface-2": "#3D2B5E",
      "--border": "#FF71CE", "--text": "#01CDFE", "--muted": "#B967FF",
      "--accent": "#FF71CE", "--accent-hover": "#01CDFE", "--accent-soft": "#B967FF",
    },
  },
  {
    id: "synthwave",
    name: "Synthwave",
    accentStops: ["#F72585", "#7209B7", "#3A0CA3"],
    light: {
      "--bg": "#10002B", "--surface": "#240046", "--surface-2": "#3C096C",
      "--border": "#F72585", "--text": "#FFFFFF", "--muted": "#B5179E",
      "--accent": "#F72585", "--accent-hover": "#7209B7", "--accent-soft": "#B5179E",
    },
    dark: {
      "--bg": "#0A0018", "--surface": "#10002B", "--surface-2": "#240046",
      "--border": "#F72585", "--text": "#FFFFFF", "--muted": "#B5179E",
      "--accent": "#F72585", "--accent-hover": "#7209B7", "--accent-soft": "#B5179E",
    },
  },
];

// ============================================================
// NATURE THEMES
// ============================================================
export const NATURE_THEMES: ThemePreset[] = [
  {
    id: "nature",
    name: "Nature",
    accentStops: ["#4CAF50", "#45A049", "#3D9142"],
    light: {
      "--bg": "#F1F8E9", "--surface": "#FFFFFF", "--surface-2": "#E8F5E9",
      "--border": "#C8E6C9", "--text": "#1B5E20", "--muted": "#4CAF50",
      "--accent": "#4CAF50", "--accent-hover": "#45A049", "--accent-soft": "#81C784",
    },
    dark: {
      "--bg": "#0D1F12", "--surface": "#1B3D24", "--surface-2": "#2D5A3D",
      "--border": "#4CAF50", "--text": "#E8F5E9", "--muted": "#81C784",
      "--accent": "#66BB6A", "--accent-hover": "#4CAF50", "--accent-soft": "#A5D6A7",
    },
  },
  {
    id: "ocean",
    name: "Ocean Deep",
    accentStops: ["#006994", "#004D70", "#00354D"],
    light: {
      "--bg": "#E0F7FA", "--surface": "#FFFFFF", "--surface-2": "#B2EBF2",
      "--border": "#80DEEA", "--text": "#004D40", "--muted": "#26A69A",
      "--accent": "#00ACC1", "--accent-hover": "#0097A7", "--accent-soft": "#4DD0E1",
    },
    dark: {
      "--bg": "#001F2B", "--surface": "#00354D", "--surface-2": "#004D70",
      "--border": "#00ACC1", "--text": "#E0F7FA", "--muted": "#4DD0E1",
      "--accent": "#00BCD4", "--accent-hover": "#00ACC1", "--accent-soft": "#80DEEA",
    },
  },
  {
    id: "desert",
    name: "Desert",
    accentStops: ["#D4A574", "#C49464", "#B48454"],
    light: {
      "--bg": "#FFF8E1", "--surface": "#FFFFFF", "--surface-2": "#FFECB3",
      "--border": "#FFD54F", "--text": "#5D4037", "--muted": "#8D6E63",
      "--accent": "#FF8F00", "--accent-hover": "#FF6F00", "--accent-soft": "#FFC107",
    },
    dark: {
      "--bg": "#2E1F14", "--surface": "#4A3728", "--surface-2": "#5D4037",
      "--border": "#FF8F00", "--text": "#FFF8E1", "--muted": "#BCAAA4",
      "--accent": "#FFB300", "--accent-hover": "#FF8F00", "--accent-soft": "#FFD54F",
    },
  },
  {
    id: "cherry",
    name: "Cherry Blossom",
    accentStops: ["#FFB7C5", "#FF99AC", "#FF7B93"],
    light: {
      "--bg": "#FFF0F3", "--surface": "#FFFFFF", "--surface-2": "#FFE4E9",
      "--border": "#FFB7C5", "--text": "#880E4F", "--muted": "#AD1457",
      "--accent": "#F06292", "--accent-hover": "#EC407A", "--accent-soft": "#F48FB1",
    },
    dark: {
      "--bg": "#1A0A10", "--surface": "#2D1520", "--surface-2": "#401A2A",
      "--border": "#F06292", "--text": "#FFF0F3", "--muted": "#F48FB1",
      "--accent": "#F48FB1", "--accent-hover": "#F06292", "--accent-soft": "#F8BBD0",
    },
  },
];

// ============================================================
// LUXURY THEMES
// ============================================================
export const LUXURY_THEMES: ThemePreset[] = [
  {
    id: "black_gold",
    name: "Black Gold",
    accentStops: ["#FFD700", "#DAA520", "#B8860B"],
    light: {
      "--bg": "#0B0B0B", "--surface": "#111111", "--surface-2": "#1A1A1A",
      "--border": "#DAA520", "--text": "#FFD700", "--muted": "#B8860B",
      "--accent": "#FFD700", "--accent-hover": "#DAA520", "--accent-soft": "#F0E68C",
    },
    dark: {
      "--bg": "#000000", "--surface": "#0B0B0B", "--surface-2": "#111111",
      "--border": "#DAA520", "--text": "#FFD700", "--muted": "#B8860B",
      "--accent": "#FFD700", "--accent-hover": "#DAA520", "--accent-soft": "#F0E68C",
    },
  },
  {
    id: "platinum",
    name: "Platinum",
    accentStops: ["#E5E4E2", "#D4D4D2", "#C4C4C2"],
    light: {
      "--bg": "#0A0A0A", "--surface": "#141414", "--surface-2": "#1E1E1E",
      "--border": "#E5E4E2", "--text": "#E5E4E2", "--muted": "#A9A9A9",
      "--accent": "#E5E4E2", "--accent-hover": "#D4D4D2", "--accent-soft": "#F5F5F5",
    },
    dark: {
      "--bg": "#000000", "--surface": "#0A0A0A", "--surface-2": "#141414",
      "--border": "#E5E4E2", "--text": "#E5E4E2", "--muted": "#A9A9A9",
      "--accent": "#E5E4E2", "--accent-hover": "#D4D4D2", "--accent-soft": "#F5F5F5",
    },
  },
  {
    id: "ruby",
    name: "Ruby",
    accentStops: ["#E0115F", "#C00050", "#A00040"],
    light: {
      "--bg": "#0A0508", "--surface": "#140A10", "--surface-2": "#1E0F18",
      "--border": "#E0115F", "--text": "#FFE4EC", "--muted": "#FF6B9D",
      "--accent": "#E0115F", "--accent-hover": "#C00050", "--accent-soft": "#FF4081",
    },
    dark: {
      "--bg": "#050204", "--surface": "#0A0508", "--surface-2": "#140A10",
      "--border": "#E0115F", "--text": "#FFE4EC", "--muted": "#FF6B9D",
      "--accent": "#E0115F", "--accent-hover": "#C00050", "--accent-soft": "#FF4081",
    },
  },
  {
    id: "sapphire",
    name: "Sapphire",
    accentStops: ["#0F52BA", "#0D47A1", "#0A3880"],
    light: {
      "--bg": "#050A14", "--surface": "#0A1428", "--surface-2": "#0F1E3C",
      "--border": "#0F52BA", "--text": "#E3F2FD", "--muted": "#64B5F6",
      "--accent": "#0F52BA", "--accent-hover": "#0D47A1", "--accent-soft": "#2196F3",
    },
    dark: {
      "--bg": "#02050A", "--surface": "#050A14", "--surface-2": "#0A1428",
      "--border": "#0F52BA", "--text": "#E3F2FD", "--muted": "#64B5F6",
      "--accent": "#0F52BA", "--accent-hover": "#0D47A1", "--accent-soft": "#2196F3",
    },
  },
  {
    id: "emerald_lux",
    name: "Emerald Luxury",
    accentStops: ["#50C878", "#45B069", "#3A985A"],
    light: {
      "--bg": "#050A08", "--surface": "#0A140F", "--surface-2": "#0F1E17",
      "--border": "#50C878", "--text": "#E8F5E9", "--muted": "#81C784",
      "--accent": "#50C878", "--accent-hover": "#45B069", "--accent-soft": "#69F0AE",
    },
    dark: {
      "--bg": "#020504", "--surface": "#050A08", "--surface-2": "#0A140F",
      "--border": "#50C878", "--text": "#E8F5E9", "--muted": "#81C784",
      "--accent": "#50C878", "--accent-hover": "#45B069", "--accent-soft": "#69F0AE",
    },
  },
];

// ============================================================
// SPACE THEMES
// ============================================================
export const SPACE_THEMES: ThemePreset[] = [
  {
    id: "space",
    name: "Space",
    accentStops: ["#667EEA", "#5A67D8", "#4C51BF"],
    light: {
      "--bg": "#0B0D17", "--surface": "#161B2E", "--surface-2": "#1F2744",
      "--border": "#667EEA", "--text": "#E2E8F0", "--muted": "#A0AEC0",
      "--accent": "#667EEA", "--accent-hover": "#5A67D8", "--accent-soft": "#7F9CF5",
    },
    dark: {
      "--bg": "#05060B", "--surface": "#0B0D17", "--surface-2": "#161B2E",
      "--border": "#667EEA", "--text": "#F7FAFC", "--muted": "#CBD5E0",
      "--accent": "#667EEA", "--accent-hover": "#5A67D8", "--accent-soft": "#7F9CF5",
    },
  },
  {
    id: "galaxy",
    name: "Galaxy",
    accentStops: ["#9F7AEA", "#805AD5", "#6B46C1"],
    light: {
      "--bg": "#0D0B17", "--surface": "#1A162E", "--surface-2": "#271F44",
      "--border": "#9F7AEA", "--text": "#FAF5FF", "--muted": "#D6BCFA",
      "--accent": "#9F7AEA", "--accent-hover": "#805AD5", "--accent-soft": "#B794F4",
    },
    dark: {
      "--bg": "#06050B", "--surface": "#0D0B17", "--surface-2": "#1A162E",
      "--border": "#9F7AEA", "--text": "#FFFFFF", "--muted": "#D6BCFA",
      "--accent": "#9F7AEA", "--accent-hover": "#805AD5", "--accent-soft": "#B794F4",
    },
  },
  {
    id: "nebula",
    name: "Nebula",
    accentStops: ["#EC4899", "#DB2777", "#BE185D"],
    light: {
      "--bg": "#170B14", "--surface": "#2E162A", "--surface-2": "#441F3F",
      "--border": "#EC4899", "--text": "#FDF2F8", "--muted": "#F9A8D4",
      "--accent": "#EC4899", "--accent-hover": "#DB2777", "--accent-soft": "#F472B6",
    },
    dark: {
      "--bg": "#0B050A", "--surface": "#170B14", "--surface-2": "#2E162A",
      "--border": "#EC4899", "--text": "#FFFFFF", "--muted": "#F9A8D4",
      "--accent": "#EC4899", "--accent-hover": "#DB2777", "--accent-soft": "#F472B6",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    accentStops: ["#38B2AC", "#319795", "#2C7A7B"],
    light: {
      "--bg": "#0B1717", "--surface": "#162E2E", "--surface-2": "#1F4444",
      "--border": "#38B2AC", "--text": "#E6FFFA", "--muted": "#81E6D9",
      "--accent": "#38B2AC", "--accent-hover": "#319795", "--accent-soft": "#4FD1C5",
    },
    dark: {
      "--bg": "#050B0B", "--surface": "#0B1717", "--surface-2": "#162E2E",
      "--border": "#38B2AC", "--text": "#FFFFFF", "--muted": "#81E6D9",
      "--accent": "#38B2AC", "--accent-hover": "#319795", "--accent-soft": "#4FD1C5",
    },
  },
];

// ============================================================
// MINIMAL THEMES
// ============================================================
export const MINIMAL_THEMES: ThemePreset[] = [
  {
    id: "paper",
    name: "Paper",
    accentStops: ["#333333", "#555555", "#777777"],
    light: {
      "--bg": "#FFFDF8", "--surface": "#FFFFFF", "--surface-2": "#FBF9F4",
      "--border": "#E8E4DC", "--text": "#2C2C2C", "--muted": "#6B6B6B",
      "--accent": "#333333", "--accent-hover": "#1A1A1A", "--accent-soft": "#666666",
    },
    dark: {
      "--bg": "#1A1A18", "--surface": "#252523", "--surface-2": "#2F2F2D",
      "--border": "#404040", "--text": "#FFFDF8", "--muted": "#A0A0A0",
      "--accent": "#E8E4DC", "--accent-hover": "#FFFFFF", "--accent-soft": "#C0C0C0",
    },
  },
  {
    id: "ink",
    name: "Ink",
    accentStops: ["#1A1A2E", "#2D2D44", "#40405A"],
    light: {
      "--bg": "#FFFFFF", "--surface": "#FAFAFA", "--surface-2": "#F5F5F5",
      "--border": "#E0E0E0", "--text": "#1A1A2E", "--muted": "#4A4A5A",
      "--accent": "#1A1A2E", "--accent-hover": "#0D0D17", "--accent-soft": "#3D3D52",
    },
    dark: {
      "--bg": "#0D0D12", "--surface": "#1A1A20", "--surface-2": "#27272E",
      "--border": "#3A3A42", "--text": "#FAFAFA", "--muted": "#9A9AA0",
      "--accent": "#FFFFFF", "--accent-hover": "#E0E0E0", "--accent-soft": "#C0C0C6",
    },
  },
];

// ============================================================
// GRADIENT THEMES
// ============================================================
export const GRADIENT_THEMES: ThemePreset[] = [
  {
    id: "gradient_sunset",
    name: "Sunset Gradient",
    accentStops: ["#F59E0B", "#EF4444", "#DC2626"],
    light: {
      "--bg": "#FEF3C7", "--surface": "#FFFFFF", "--surface-2": "#FFFBEB",
      "--border": "#FCD34D", "--text": "#92400E", "--muted": "#D97706",
      "--accent": "#F59E0B", "--accent-hover": "#D97706", "--accent-soft": "#FBBF24",
    },
    dark: {
      "--bg": "#1F1508", "--surface": "#2D1F0B", "--surface-2": "#3B290F",
      "--border": "#F59E0B", "--text": "#FEF3C7", "--muted": "#FCD34D",
      "--accent": "#FBBF24", "--accent-hover": "#F59E0B", "--accent-soft": "#FCD34D",
    },
  },
  {
    id: "gradient_ocean",
    name: "Ocean Gradient",
    accentStops: ["#06B6D4", "#3B82F6", "#1D4ED8"],
    light: {
      "--bg": "#ECFEFF", "--surface": "#FFFFFF", "--surface-2": "#CFFAFE",
      "--border": "#67E8F9", "--text": "#164E63", "--muted": "#0891B2",
      "--accent": "#06B6D4", "--accent-hover": "#0891B2", "--accent-soft": "#22D3EE",
    },
    dark: {
      "--bg": "#0C1929", "--surface": "#122438", "--surface-2": "#183047",
      "--border": "#06B6D4", "--text": "#ECFEFF", "--muted": "#67E8F9",
      "--accent": "#22D3EE", "--accent-hover": "#06B6D4", "--accent-soft": "#67E8F9",
    },
  },
  {
    id: "gradient_fire",
    name: "Fire Gradient",
    accentStops: ["#EF4444", "#F97316", "#F59E0B"],
    light: {
      "--bg": "#FEF2F2", "--surface": "#FFFFFF", "--surface-2": "#FEE2E2",
      "--border": "#FCA5A5", "--text": "#7F1D1D", "--muted": "#DC2626",
      "--accent": "#EF4444", "--accent-hover": "#DC2626", "--accent-soft": "#F87171",
    },
    dark: {
      "--bg": "#1C0808", "--surface": "#2A0D0D", "--surface-2": "#381212",
      "--border": "#EF4444", "--text": "#FEF2F2", "--muted": "#FCA5A5",
      "--accent": "#F87171", "--accent-hover": "#EF4444", "--accent-soft": "#FCA5A5",
    },
  },
];

// ============================================================
// ALL EXTENDED THEMES
// ============================================================
export const ALL_EXTENDED_THEMES: ThemePreset[] = [
  ...GAMING_THEMES,
  ...NEON_THEMES,
  ...CYBERPUNK_THEMES,
  ...NATURE_THEMES,
  ...LUXURY_THEMES,
  ...SPACE_THEMES,
  ...MINIMAL_THEMES,
  ...GRADIENT_THEMES,
];

// ============================================================
// THEME CATEGORIES
// ============================================================
export const THEME_CATEGORIES = {
  "العلامة التجارية": ["estabrak_soft_gold", "luxury_gold", "clean_tech", "street_dark", "soft_pastel", "earth_minimal", "ocean_mist", "desert_sand", "plum_night"],
  "الألعاب": ["gaming", "gaming_green", "gaming_blue", "retro"],
  "النيون": ["neon_cyan", "neon_pink", "neon_green", "neon_purple", "neon_orange"],
  "سايبربانك": ["cyberpunk", "matrix", "tron", "vaporwave", "synthwave"],
  "الطبيعة": ["nature", "ocean", "desert", "cherry"],
  "الفاخرة": ["black_gold", "platinum", "ruby", "sapphire", "emerald_lux"],
  "الفضاء": ["space", "galaxy", "nebula", "aurora"],
  "المينمال": ["paper", "ink"],
  "التدرجات": ["gradient_sunset", "gradient_ocean", "gradient_fire"],
} as const;

// ============================================================
// GET ALL THEMES
// ============================================================
import { THEME_PRESETS } from "./presets";

export function getAllThemes(): ThemePreset[] {
  return [...THEME_PRESETS, ...ALL_EXTENDED_THEMES];
}

export function getThemeById(id: string): ThemePreset | undefined {
  return getAllThemes().find(t => t.id === id);
}

export function getThemesByCategory(category: keyof typeof THEME_CATEGORIES): ThemePreset[] {
  const ids = THEME_CATEGORIES[category];
  return getAllThemes().filter(t => ids.includes(t.id as any));
}
