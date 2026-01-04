// ============================================================
// ESTABREK CMS TOKENS - EXTENDED VERSION (Storefront)
// ============================================================
// Subset of extended design tokens needed by the storefront renderer.
// ============================================================

export * from "./tokens";

// ============================================================
// TEXT EFFECT PRESETS
// ============================================================
export const TEXT_EFFECT_PRESETS = [
  "none",
  // Gradients
  "gradient", "gradient-gold", "gradient-sunset", "gradient-ocean", "gradient-forest",
  "gradient-neon", "gradient-rainbow", "gradient-fire", "gradient-ice", "gradient-aurora",
  "gradient-cosmic", "gradient-candy", "gradient-metal", "gradient-holographic",
  "gradient-royal", "gradient-silver", "gradient-rose", "gradient-midnight", "gradient-tropical",
  "gradient-custom",
  // Glow/Neon
  "glow", "glow-accent", "glow-gold", "glow-neon", "glow-pulse",
  "glow-cyan", "glow-pink", "glow-green", "glow-purple", "glow-orange", "glow-red",
  "glow-yellow", "glow-blue", "glow-white", "glow-neon-multi", "glow-soft",
  "neon", "neon-cyan", "neon-blue", "neon-pink", "neon-green", "neon-purple", "neon-orange",
  "neon-red", "neon-yellow", "neon-white", "neon-multi", "neon-flicker",
  // Shadows
  "shadow-soft", "shadow-hard", "shadow-long", "shadow-3d", "shadow-retro",
  "shadow-double", "shadow-outline", "shadow-blur", "shadow-inset", "shadow-emboss",
  // 3D Effects
  "3d", "3d-shadow", "3d-emboss", "3d-deboss", "3d-extrude", "3d-stack",
  "3d-pop", "3d-float", "3d-retro", "3d-chrome", "3d-gold",
  // Outline
  "outline", "outline-thick", "outline-double", "outline-gradient", "outline-neon",
  "outline-thin", "outline-medium", "outline-colored", "outline-shadow",
  // Animated
  "shimmer", "shimmer-gold", "wave", "bounce", "pulse", "glitch",
  "typewriter", "reveal", "slide-up", "fade-in", "blur-in", "scale-in",
  "anim-bounce", "anim-pulse", "anim-spin", "anim-ping", "anim-shake",
  "anim-fade-in", "anim-slide-up", "anim-slide-down", "anim-scale", "anim-glow-pulse",
  "anim-rainbow", "anim-typing", "anim-wave", "anim-float", "anim-glitch",
  // Typography
  "typo-elegant", "typo-modern", "typo-bold", "typo-thin", "typo-mono", "typo-display",
  "typo-handwritten", "typo-condensed", "typo-expanded", "typo-small-caps", "typo-drop-cap", "typo-justified",
  // Special
  "glass", "frosted", "blur-bg", "highlight", "underline-animated",
  "strikethrough", "split", "masked", "clip-text",
  "special-stroke", "special-stroke-gradient", "special-hollow", "special-double-stroke",
  "special-metallic", "special-chrome", "special-gold-foil", "special-fire", "special-ice",
  "special-blood", "special-poison", "special-electric",
  // Decorative
  "deco-underline", "deco-underline-wavy", "deco-strikethrough", "deco-highlight",
  "deco-highlight-gradient", "deco-box", "deco-tag", "deco-bracket",
  // Dark
  "dark-subtle", "dark-bright", "dark-muted", "dark-accent", "dark-warm", "dark-cool", "dark-contrast", "dark-glow",
  // Light
  "light-default", "light-muted", "light-bold", "light-accent", "light-warm", "light-cool", "light-elegant", "light-shadow",
  // Labels
  "label-primary", "label-secondary", "label-success", "label-danger", "label-warning", "label-outline",
  // Headings
  "heading-hero", "heading-section", "heading-subtitle", "heading-elegant", "heading-bold", "heading-accent",
  // Paragraphs
  "para-default", "para-large", "para-small", "para-quote", "para-lead", "para-caption",
  // Artistic
  "art-watercolor", "art-sketch", "art-vintage", "art-comic", "art-graffiti", "art-neon-sign",
] as const;
export type TextEffectPreset = typeof TEXT_EFFECT_PRESETS[number];

// ============================================================
// CARD TEMPLATE PRESETS
// ============================================================
export const CARD_TEMPLATE_PRESETS = [
  "default",
  // Gaming
  "gaming", "gaming-common", "gaming-uncommon", "gaming-rare", "gaming-epic", "gaming-legendary",
  "gaming-mythic", "gaming-holographic", "gaming-neon-frame", "gaming-pixel", "gaming-cyberpunk",
  // Glass
  "glass", "glass-frost", "glass-dark", "glass-light", "glass-colored", "glass-aurora", "glass-rainbow",
  "glass-metallic", "glass-blur-heavy", "glass-neon-glow", "glass-morphism",
  // Neon
  "neon", "neon-cyan", "neon-pink", "neon-green", "neon-purple", "neon-orange", "neon-multi",
  "neon-red", "neon-yellow", "neon-flicker", "neon-pulse",
  // Gradient
  "gradient-sunset", "gradient-ocean", "gradient-forest", "gradient-fire", "gradient-royal",
  "gradient-midnight", "gradient-rose-gold", "gradient-aurora", "gradient-candy", "gradient-mesh",
  // Minimal
  "minimal-clean", "minimal-border", "minimal-shadow", "minimal-flat", "minimal-accent",
  "minimal-dark", "minimal-outline", "minimal-rounded", "minimal-paper", "minimal-mono",
  // Luxury
  "luxury-gold", "luxury-platinum", "luxury-black", "luxury-rose", "luxury-marble",
  "luxury-velvet", "luxury-champagne", "luxury-emerald", "luxury-sapphire", "luxury-ruby",
  // 3D
  "3d", "3d-sm", "3d-md", "3d-lg", "3d-xl",
  "3d-lift", "3d-tilt", "3d-flip", "3d-pop", "3d-float",
  "3d-layered", "3d-shadow-box", "3d-prism", "3d-perspective", "3d-fold",
  // Pricing
  "pricing", "pricing-simple", "pricing-popular", "pricing-bordered", "pricing-gradient",
  "pricing-dark", "pricing-glass", "pricing-neon", "pricing-enterprise",
  // Team
  "team-simple", "team-overlay", "team-bordered", "team-dark", "team-horizontal", "team-creative",
  // Blog
  "blog-classic", "blog-minimal", "blog-featured", "blog-horizontal", "blog-dark", "blog-magazine",
  // Testimonials
  "testimonial", "testimonial-simple", "testimonial-bordered", "testimonial-dark", "testimonial-gradient", "testimonial-bubble", "testimonial-card",
  // Special
  "holographic", "retro", "retro-terminal", "retro-gameboy", "retro-arcade",
  "neumorphic", "neumorphic-raised", "neumorphic-pressed", "neumorphic-flat",
  "gradient-border", "animated-border", "flip", "tilt", "spotlight", "morphing", "layered",
  // Business
  "stat",
] as const;
export type CardTemplatePreset = typeof CARD_TEMPLATE_PRESETS[number];

// ============================================================
// BUTTON STYLE PRESETS
// ============================================================
export const BUTTON_STYLE_PRESETS = [
  "solid", "outline", "ghost", "link", "soft", "gradient",
  "neon", "glass", "3d", "minimal", "pill", "icon",
  "floating", "pulse", "shimmer", "glow",
] as const;
export type ButtonStylePreset = typeof BUTTON_STYLE_PRESETS[number];

// ============================================================
// ENHANCED HOVER PRESETS
// ============================================================
export const HOVER_PRESETS_EXTENDED = [
  "none",
  // Basic
  "lift", "glow", "underline", "scale", "brighten", "darken",
  // Advanced
  "float", "bounce", "shake", "pulse", "swing", "wobble",
  "flip-x", "flip-y", "rotate-3d", "skew",
  // Effects
  "glow-accent", "glow-gold", "glow-neon", "shadow-lift", "shadow-glow",
  // Border
  "border-accent", "border-gold", "border-gradient", "border-animate",
  // Background
  "bg-accent", "bg-gold", "bg-gradient", "bg-glass",
  // Text
  "text-accent", "text-gold", "text-gradient",
  // Combined
  "card-lift", "card-glow", "card-3d", "button-pop", "link-underline",
] as const;
export type HoverPresetExtended = typeof HOVER_PRESETS_EXTENDED[number];

// ============================================================
// LOADER PRESETS
// ============================================================
export const LOADER_PRESETS = [
  "spinner", "dots", "pulse", "bounce", "wave",
  "ring", "dual-ring", "ripple", "ellipsis", "grid",
  "heart", "hourglass", "roller", "facebook", "default",
  "skeleton", "shimmer", "progress", "circular",
  // Gaming
  "gaming-bar", "gaming-circle", "retro-bar",
  // Neon
  "neon-spinner", "neon-pulse", "neon-wave",
] as const;
export type LoaderPreset = typeof LOADER_PRESETS[number];

// ============================================================
// TRANSITION PRESETS
// ============================================================
export const TRANSITION_PRESETS = [
  "none", "all", "colors", "opacity", "shadow", "transform",
  "fast", "normal", "slow", "slower",
  "bounce", "elastic", "spring",
] as const;
export type TransitionPreset = typeof TRANSITION_PRESETS[number];

// ============================================================
// SCROLL ANIMATION PRESETS
// ============================================================
export const SCROLL_ANIM_PRESETS = [
  "none",
  "fade-in", "fade-up", "fade-down", "fade-left", "fade-right",
  "zoom-in", "zoom-out",
  "slide-up", "slide-down", "slide-left", "slide-right",
  "rotate-in", "flip-up", "flip-left",
  "bounce-in", "elastic-in",
  "reveal-up", "reveal-left", "reveal-right",
  "stagger-fade", "stagger-slide", "stagger-scale",
  "parallax-slow", "parallax-fast",
  "counter", "typewriter",
] as const;
export type ScrollAnimPreset = typeof SCROLL_ANIM_PRESETS[number];

// ============================================================
// EXTENDED TwTokens TYPE
// ============================================================
export type TextGradientKind = "linear" | "radial";
export type TextGradientTokens = {
  kind?: TextGradientKind;
  mode?: 2 | 3;
  color1?: string;
  color2?: string;
  color3?: string;
  direction?: string;
  radialPosition?: string;
};

export type TwTokensExtended = {
  textEffect?: TextEffectPreset;
  textGradient?: TextGradientTokens;
  cardTemplate?: CardTemplatePreset;
  buttonStyle?: ButtonStylePreset;
  hoverExtended?: HoverPresetExtended;
  hoverEffectId?: string;
  focusEffectId?: string;
  loader?: LoaderPreset;
  transitionPreset?: TransitionPreset;
  scrollAnim?: ScrollAnimPreset;

  // Counter animation
  counter?: {
    enabled?: boolean;
    from?: number;
    to?: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
  };

  // Typewriter
  typewriter?: {
    enabled?: boolean;
    texts?: string[];
    speed?: number;
    deleteSpeed?: number;
    pauseTime?: number;
    loop?: boolean;
  };

  // Parallax
  parallax?: {
    enabled?: boolean;
    speed?: number;
    direction?: "up" | "down" | "left" | "right";
  };

  // Sticky
  sticky?: {
    enabled?: boolean;
    top?: string;
    zIndex?: number;
  };
};
