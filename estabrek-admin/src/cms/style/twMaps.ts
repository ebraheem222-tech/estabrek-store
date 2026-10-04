import type {
  BgPreset,
  DisplayPreset,
  PositionPreset,
  OverflowPreset,
  RadiusPreset,
  ShadowPreset,
  HoverPreset,
  AnimPreset,
  DelayPreset,
  DurationPreset,
  PaddingPreset,
  GapPreset,
  MarginPreset,
  TextSizePreset,
  TextAlignPreset,
  FontFamilyPreset,
  FontWeightPreset,
  TextColorPreset,
  LineHeightPreset,
  LetterSpacingPreset,
  BorderWidthPreset,
  BorderStylePreset,
  MaxWidthPreset,
  OpacityPreset,
  BlurPreset,
  FlexDirPreset,
  FlexWrapPreset,
  JustifyPreset,
  ItemsPreset,
  GridColsPreset,
  GridRowsPreset,
  JustifyItemsPreset,
  PlaceItemsPreset,
} from "./tokens";

// Layout
export const displayMap: Record<DisplayPreset, string> = {
  "block": "block",
  "inline-block": "inline-block",
  "inline-flex": "inline-flex",
  "flex": "flex",
  "grid": "grid",
  "hidden": "hidden",
};

export const positionMap: Record<PositionPreset, string> = {
  static: "static",
  relative: "relative",
  absolute: "absolute",
  fixed: "fixed",
  sticky: "sticky top-0",
};

export const overflowMap: Record<OverflowPreset, string> = {
  auto: "overflow-auto",
  hidden: "overflow-hidden",
  visible: "overflow-visible",
  scroll: "overflow-scroll",
};

// Flex presets
export const flexDirMap: Record<FlexDirPreset, string> = {
  row: "flex-row",
  "row-reverse": "flex-row-reverse",
  col: "flex-col",
  "col-reverse": "flex-col-reverse",
};

export const flexWrapMap: Record<FlexWrapPreset, string> = {
  nowrap: "flex-nowrap",
  wrap: "flex-wrap",
  "wrap-reverse": "flex-wrap-reverse",
};

export const justifyMap: Record<JustifyPreset, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

export const contentMap: Record<JustifyPreset, string> = {
  start: "content-start",
  center: "content-center",
  end: "content-end",
  between: "content-between",
  around: "content-around",
  evenly: "content-evenly",
};

export const itemsMap: Record<ItemsPreset, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

// Grid presets
export const gridColsMap: Record<GridColsPreset, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  12: "grid-cols-12",
};

export const gridRowsMap: Record<GridRowsPreset, string> = {
  auto: "auto-rows-auto",
  1: "grid-rows-1",
  2: "grid-rows-2",
  3: "grid-rows-3",
  4: "grid-rows-4",
  5: "grid-rows-5",
  6: "grid-rows-6",
};

export const justifyItemsMap: Record<JustifyItemsPreset, string> = {
  start: "justify-items-start",
  center: "justify-items-center",
  end: "justify-items-end",
  stretch: "justify-items-stretch",
};

export const placeItemsMap: Record<PlaceItemsPreset, string> = {
  start: "place-items-start",
  center: "place-items-center",
  end: "place-items-end",
  stretch: "place-items-stretch",
};

export const gridFlowMap: Record<"row" | "col" | "dense" | "row-dense" | "col-dense", string> = {
  row: "grid-flow-row",
  col: "grid-flow-col",
  dense: "grid-flow-dense",
  "row-dense": "grid-flow-row-dense",
  "col-dense": "grid-flow-col-dense",
};

// Radius / shadow
export const radiusMap: Record<RadiusPreset, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
};

export const shadowMap: Record<ShadowPreset, string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  "2xl": "shadow-2xl",
  inner: "shadow-inner",
  glow: "shadow-[0_0_20px_rgba(111,166,161,0.3)]",
};

// Background presets (Tailwind-only)
export const bgMap: Record<BgPreset, string> = {
  none: "",
  "solid-paper": "bg-[var(--color-bg,#F7F4E9)] text-[var(--color-text,#0B0B0B)]",
  "solid-surface": "bg-[var(--color-surface,#FFFFFF)] dark:bg-[var(--color-surface,#1A1A1A)]",
  "solid-muted": "bg-black/5 dark:bg-white/5",
  "solid-black": "bg-[#0B0B0B] text-[#F7F4E9]",
  "solid-white": "bg-white text-[#0B0B0B]",
  "solid-gold": "bg-[var(--color-gold,#C6A75E)] text-[#0B0B0B]",
  "solid-primary": "bg-black text-white dark:bg-white dark:text-black",
  "solid-secondary": "bg-white text-black border border-black/10 dark:bg-white/10 dark:text-white dark:border-white/15",
  "solid-accent": "bg-[var(--color-accent,#6FA6A1)] text-white",
  "solid-cream": "bg-[#F7F4E9] text-[#1A1A1A]",
  "gradient-sunset": "bg-gradient-to-r from-rose-500/90 via-orange-500/80 to-amber-400/80 text-white",
  "gradient-ocean": "bg-gradient-to-r from-cyan-500/80 via-sky-500/80 to-indigo-500/80 text-white",
  "gradient-neon": "bg-gradient-to-r from-fuchsia-500/80 via-purple-500/80 to-blue-500/80 text-white",
  "gradient-goldlux": "bg-gradient-to-r from-[#0B0B0B] via-[#1A1A1A] to-[var(--color-gold,#C6A75E)] text-[#F7F4E9]",
  "gradient-accent": "bg-gradient-to-r from-[var(--color-accent,#6FA6A1)] to-[var(--color-accent-hover,#5B918C)] text-white",
  "gradient-warm": "bg-gradient-to-br from-[#F7F4E9] via-[#EDE9DA] to-[#E6D8A8]",
  "glass-sm": "bg-white/5 backdrop-blur-sm border border-white/10",
  "glass-md": "bg-white/10 backdrop-blur-md border border-white/10",
  "glass-lg": "bg-white/15 backdrop-blur-lg border border-white/10",
};

// State
export const hoverMap: Record<HoverPreset, string> = {
  none: "",
  lift: "transition-transform hover:-translate-y-0.5",
  glow: "transition-shadow hover:shadow-xl",
  underline: "hover:underline underline-offset-4",
  scale: "transition-transform hover:scale-[1.02]",
  brighten: "transition-all hover:brightness-110",
  darken: "transition-all hover:brightness-90",
};

// Motion - GSAP handles these, but we can use CSS for fallback
export const animMap: Record<AnimPreset, string> = {
  none: "",
  "fade-in": "animate-cms-fade-in",
  "fade-up": "animate-cms-fade-up",
  "fade-down": "animate-cms-fade-down",
  "fade-left": "animate-cms-fade-left",
  "fade-right": "animate-cms-fade-right",
  "zoom-in": "animate-cms-zoom-in",
  "zoom-out": "animate-cms-zoom-out",
  "slide-up": "animate-cms-slide-up",
  "slide-down": "animate-cms-slide-down",
  "slide-left": "animate-cms-slide-left",
  "slide-right": "animate-cms-slide-right",
  "scale-in": "animate-cms-scale-in",
  "scale-up": "animate-cms-scale-up",
  "rotate-in": "animate-cms-rotate-in",
  "flip-up": "animate-cms-flip-up",
  "flip-left": "animate-cms-flip-left",
  "bounce-in": "animate-cms-bounce-in",
  "elastic-in": "animate-cms-elastic-in",
  "blur-in": "animate-cms-blur-in",
  "reveal-up": "animate-cms-reveal-up",
  "reveal-left": "animate-cms-reveal-left",
  "stagger-fade": "", // Handled by GSAP
  "stagger-slide": "", // Handled by GSAP
  "stagger-scale": "", // Handled by GSAP
  "parallax-slow": "", // Handled by GSAP
  "parallax-fast": "", // Handled by GSAP
  "float": "animate-cms-float",
  "pulse": "animate-pulse",
};

export const delayMap: Record<DelayPreset, string> = {
  0: "delay-0",
  75: "delay-75",
  100: "delay-100",
  150: "delay-150",
  200: "delay-200",
  300: "delay-300",
  500: "delay-500",
  700: "delay-700",
  1000: "delay-1000",
};

export const durationMap: Record<DurationPreset, string> = {
  150: "duration-150",
  200: "duration-200",
  300: "duration-300",
  400: "duration-400",
  500: "duration-500",
  600: "duration-600",
  800: "duration-800",
  1000: "duration-1000",
  1500: "duration-[1500ms]",
  2000: "duration-[2000ms]",
};

// Spacing
export const paddingMap: Record<PaddingPreset, string> = {
  none: "p-0",
  xs: "p-2",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
  "2xl": "p-12",
  "3xl": "p-16",
};

export const gapMap: Record<GapPreset, string> = {
  none: "gap-0",
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
  "2xl": "gap-12",
};

export const marginMap: Record<MarginPreset, string> = {
  none: "m-0",
  auto: "m-auto",
  xs: "m-2",
  sm: "m-3",
  md: "m-4",
  lg: "m-6",
  xl: "m-8",
  "2xl": "m-12",
};

// Typography
export const textSizeMap: Record<TextSizePreset, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
  "6xl": "text-6xl",
};

export const textAlignMap: Record<TextAlignPreset, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

export const fontWeightMap: Record<FontWeightPreset, string> = {
  thin: "font-thin",
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
  black: "font-black",
};

export const fontFamilyMap: Record<FontFamilyPreset, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
  arabic: "font-arabic",
  display: "font-display",
};

export const textColorMap: Record<TextColorPreset, string> = {
  default: "text-[var(--color-text,#1A1A1A)] dark:text-[var(--color-text,#F7F4E9)]",
  muted: "text-[var(--color-text-muted,#5A5A5A)] dark:text-[var(--color-text-muted,#B8B5A8)]",
  subtle: "text-[var(--color-text-subtle,#8A8A7A)]",
  primary: "text-[var(--color-accent,#6FA6A1)]",
  secondary: "text-[var(--color-text-muted,#5A5A5A)]",
  accent: "text-[var(--color-accent,#6FA6A1)]",
  gold: "text-[var(--color-gold,#C6A75E)]",
  onPrimary: "text-white",
  danger: "text-[var(--color-error,#DC2626)]",
  success: "text-[var(--color-success,#2D8A5F)]",
  warning: "text-[var(--color-warning,#D97706)]",
  info: "text-[var(--color-info,#0EA5E9)]",
  white: "text-white",
  black: "text-black",
};

export const lineHeightMap: Record<LineHeightPreset, string> = {
  none: "leading-none",
  tight: "leading-tight",
  snug: "leading-snug",
  normal: "leading-normal",
  relaxed: "leading-relaxed",
  loose: "leading-loose",
};

export const letterSpacingMap: Record<LetterSpacingPreset, string> = {
  tighter: "tracking-tighter",
  tight: "tracking-tight",
  normal: "tracking-normal",
  wide: "tracking-wide",
  wider: "tracking-wider",
  widest: "tracking-widest",
};

// Border presets
export const borderWidthMap: Record<BorderWidthPreset, string> = {
  "0": "border-0",
  "1": "border",
  "2": "border-2",
  "4": "border-4",
  "8": "border-8",
};

export const borderStyleMap: Record<BorderStylePreset, string> = {
  solid: "border-solid",
  dashed: "border-dashed",
  dotted: "border-dotted",
  double: "border-double",
  none: "border-none",
};

export const borderColorMap: Record<TextColorPreset, string> = {
  default: "border-[var(--color-text,#1A1A1A)] dark:border-[var(--color-text,#F7F4E9)]",
  muted: "border-[var(--color-text-muted,#5A5A5A)] dark:border-[var(--color-text-muted,#B8B5A8)]",
  subtle: "border-[var(--color-text-subtle,#8A8A7A)]",
  primary: "border-[var(--color-accent,#6FA6A1)]",
  secondary: "border-[var(--color-text-muted,#5A5A5A)]",
  accent: "border-[var(--color-accent,#6FA6A1)]",
  gold: "border-[var(--color-gold,#C6A75E)]",
  onPrimary: "border-white",
  danger: "border-[var(--color-error,#DC2626)]",
  success: "border-[var(--color-success,#2D8A5F)]",
  warning: "border-[var(--color-warning,#D97706)]",
  info: "border-[var(--color-info,#0EA5E9)]",
  white: "border-white",
  black: "border-black",
};

// Sizing
export const maxWMap: Record<MaxWidthPreset, string> = {
  none: "max-w-none",
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  prose: "prose dark:prose-invert",
  full: "max-w-full",
};

export const opacityMap: Record<OpacityPreset, string> = {
  "0": "opacity-0",
  "5": "opacity-5",
  "10": "opacity-10",
  "20": "opacity-20",
  "25": "opacity-25",
  "30": "opacity-30",
  "40": "opacity-40",
  "50": "opacity-50",
  "60": "opacity-60",
  "70": "opacity-70",
  "75": "opacity-75",
  "80": "opacity-80",
  "90": "opacity-90",
  "95": "opacity-95",
  "100": "opacity-100",
};

export const blurMap: Record<BlurPreset, string> = {
  none: "blur-none",
  sm: "blur-sm",
  md: "blur-md",
  lg: "blur-lg",
  xl: "blur-xl",
  "2xl": "blur-2xl",
  "3xl": "blur-3xl",
};

export const backdropBlurMap: Record<BlurPreset, string> = {
  none: "backdrop-blur-none",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
  "2xl": "backdrop-blur-2xl",
  "3xl": "backdrop-blur-3xl",
};
