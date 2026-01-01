// ============================================================
// ESTABREK CMS TOKENS - MEGA EXTENDED VERSION
// ============================================================
// Comprehensive design tokens with 100+ options
// ============================================================

// Re-export everything from base tokens
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
  // Glow/Neon
  "glow", "glow-accent", "glow-gold", "glow-neon", "glow-pulse",
  "neon", "neon-blue", "neon-pink", "neon-green", "neon-purple", "neon-multi",
  // 3D Effects
  "3d", "3d-shadow", "3d-emboss", "3d-deboss", "3d-extrude", "3d-stack",
  "3d-pop", "3d-float", "3d-retro", "3d-chrome", "3d-gold",
  // Outline
  "outline", "outline-thick", "outline-double", "outline-gradient", "outline-neon",
  // Animated
  "shimmer", "shimmer-gold", "wave", "bounce", "pulse", "glitch",
  "typewriter", "reveal", "slide-up", "fade-in", "blur-in", "scale-in",
  // Special
  "glass", "frosted", "blur-bg", "highlight", "underline-animated",
  "strikethrough", "split", "masked", "clip-text",
] as const;
export type TextEffectPreset = typeof TEXT_EFFECT_PRESETS[number];

// ============================================================
// CARD TEMPLATE PRESETS
// ============================================================
export const CARD_TEMPLATE_PRESETS = [
  "default",
  // Gaming
  "gaming", "gaming-common", "gaming-uncommon", "gaming-rare", "gaming-epic", "gaming-legendary",
  // Glass
  "glass", "glass-frost", "glass-dark", "glass-light", "glass-colored", "glass-aurora", "glass-rainbow",
  // Neon
  "neon", "neon-cyan", "neon-pink", "neon-green", "neon-purple", "neon-orange", "neon-multi",
  // 3D
  "3d", "3d-sm", "3d-md", "3d-lg", "3d-xl",
  // Special
  "holographic", "retro", "retro-terminal", "retro-gameboy", "retro-arcade",
  "neumorphic", "neumorphic-raised", "neumorphic-pressed", "neumorphic-flat",
  "gradient-border", "animated-border", "flip", "tilt", "spotlight", "morphing", "layered",
  // Business
  "pricing", "testimonial", "stat",
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
// EXTENDED LABELS (Arabic)
// ============================================================
export const TEXT_EFFECT_LABELS: Record<TextEffectPreset, { ar: string; en: string }> = {
  "none": { ar: "بدون", en: "None" },
  "gradient": { ar: "تدرج", en: "Gradient" },
  "gradient-gold": { ar: "تدرج ذهبي", en: "Gold Gradient" },
  "gradient-sunset": { ar: "غروب", en: "Sunset" },
  "gradient-ocean": { ar: "محيط", en: "Ocean" },
  "gradient-forest": { ar: "غابة", en: "Forest" },
  "gradient-neon": { ar: "نيون", en: "Neon" },
  "gradient-rainbow": { ar: "قوس قزح", en: "Rainbow" },
  "gradient-fire": { ar: "نار", en: "Fire" },
  "gradient-ice": { ar: "جليد", en: "Ice" },
  "gradient-aurora": { ar: "شفق", en: "Aurora" },
  "gradient-cosmic": { ar: "كوني", en: "Cosmic" },
  "gradient-candy": { ar: "حلوى", en: "Candy" },
  "gradient-metal": { ar: "معدن", en: "Metal" },
  "gradient-holographic": { ar: "هولوغرام", en: "Holographic" },
  "glow": { ar: "توهج", en: "Glow" },
  "glow-accent": { ar: "توهج أساسي", en: "Accent Glow" },
  "glow-gold": { ar: "توهج ذهبي", en: "Gold Glow" },
  "glow-neon": { ar: "توهج نيون", en: "Neon Glow" },
  "glow-pulse": { ar: "توهج نابض", en: "Pulse Glow" },
  "neon": { ar: "نيون", en: "Neon" },
  "neon-blue": { ar: "نيون أزرق", en: "Blue Neon" },
  "neon-pink": { ar: "نيون وردي", en: "Pink Neon" },
  "neon-green": { ar: "نيون أخضر", en: "Green Neon" },
  "neon-purple": { ar: "نيون بنفسجي", en: "Purple Neon" },
  "neon-multi": { ar: "نيون متعدد", en: "Multi Neon" },
  "3d": { ar: "ثلاثي الأبعاد", en: "3D" },
  "3d-shadow": { ar: "ظل 3D", en: "3D Shadow" },
  "3d-emboss": { ar: "نقش بارز", en: "Emboss" },
  "3d-deboss": { ar: "نقش غائر", en: "Deboss" },
  "3d-extrude": { ar: "بروز", en: "Extrude" },
  "3d-stack": { ar: "تراكب", en: "Stack" },
  "3d-pop": { ar: "قفز", en: "Pop" },
  "3d-float": { ar: "طفو", en: "Float" },
  "3d-retro": { ar: "ريترو", en: "Retro" },
  "3d-chrome": { ar: "كروم", en: "Chrome" },
  "3d-gold": { ar: "ذهبي 3D", en: "Gold 3D" },
  "outline": { ar: "إطار", en: "Outline" },
  "outline-thick": { ar: "إطار سميك", en: "Thick Outline" },
  "outline-double": { ar: "إطار مزدوج", en: "Double Outline" },
  "outline-gradient": { ar: "إطار متدرج", en: "Gradient Outline" },
  "outline-neon": { ar: "إطار نيون", en: "Neon Outline" },
  "shimmer": { ar: "لمعان", en: "Shimmer" },
  "shimmer-gold": { ar: "لمعان ذهبي", en: "Gold Shimmer" },
  "wave": { ar: "موجة", en: "Wave" },
  "bounce": { ar: "ارتداد", en: "Bounce" },
  "pulse": { ar: "نبض", en: "Pulse" },
  "glitch": { ar: "خلل", en: "Glitch" },
  "typewriter": { ar: "آلة كاتبة", en: "Typewriter" },
  "reveal": { ar: "كشف", en: "Reveal" },
  "slide-up": { ar: "انزلاق للأعلى", en: "Slide Up" },
  "fade-in": { ar: "ظهور تدريجي", en: "Fade In" },
  "blur-in": { ar: "ضبابي", en: "Blur In" },
  "scale-in": { ar: "تكبير", en: "Scale In" },
  "glass": { ar: "زجاج", en: "Glass" },
  "frosted": { ar: "مثلج", en: "Frosted" },
  "blur-bg": { ar: "خلفية ضبابية", en: "Blur Background" },
  "highlight": { ar: "تمييز", en: "Highlight" },
  "underline-animated": { ar: "خط متحرك", en: "Animated Underline" },
  "strikethrough": { ar: "شطب", en: "Strikethrough" },
  "split": { ar: "انقسام", en: "Split" },
  "masked": { ar: "مقنع", en: "Masked" },
  "clip-text": { ar: "قص النص", en: "Clip Text" },
};

export const CARD_TEMPLATE_LABELS: Record<CardTemplatePreset, { ar: string; en: string }> = {
  "default": { ar: "افتراضي", en: "Default" },
  "gaming": { ar: "ألعاب", en: "Gaming" },
  "gaming-common": { ar: "عادي", en: "Common" },
  "gaming-uncommon": { ar: "غير شائع", en: "Uncommon" },
  "gaming-rare": { ar: "نادر", en: "Rare" },
  "gaming-epic": { ar: "ملحمي", en: "Epic" },
  "gaming-legendary": { ar: "أسطوري", en: "Legendary" },
  "glass": { ar: "زجاج", en: "Glass" },
  "glass-frost": { ar: "زجاج متجمد", en: "Frost Glass" },
  "glass-dark": { ar: "زجاج داكن", en: "Dark Glass" },
  "glass-light": { ar: "زجاج فاتح", en: "Light Glass" },
  "glass-colored": { ar: "زجاج ملون", en: "Colored Glass" },
  "glass-aurora": { ar: "شفق زجاجي", en: "Aurora Glass" },
  "glass-rainbow": { ar: "قوس قزح", en: "Rainbow Glass" },
  "neon": { ar: "نيون", en: "Neon" },
  "neon-cyan": { ar: "نيون سماوي", en: "Cyan Neon" },
  "neon-pink": { ar: "نيون وردي", en: "Pink Neon" },
  "neon-green": { ar: "نيون أخضر", en: "Green Neon" },
  "neon-purple": { ar: "نيون بنفسجي", en: "Purple Neon" },
  "neon-orange": { ar: "نيون برتقالي", en: "Orange Neon" },
  "neon-multi": { ar: "نيون متعدد", en: "Multi Neon" },
  "3d": { ar: "ثلاثي الأبعاد", en: "3D" },
  "3d-sm": { ar: "3D صغير", en: "3D Small" },
  "3d-md": { ar: "3D متوسط", en: "3D Medium" },
  "3d-lg": { ar: "3D كبير", en: "3D Large" },
  "3d-xl": { ar: "3D ضخم", en: "3D XL" },
  "holographic": { ar: "هولوغرافي", en: "Holographic" },
  "retro": { ar: "ريترو", en: "Retro" },
  "retro-terminal": { ar: "طرفية", en: "Terminal" },
  "retro-gameboy": { ar: "جيم بوي", en: "Gameboy" },
  "retro-arcade": { ar: "أركيد", en: "Arcade" },
  "neumorphic": { ar: "نيومورفيك", en: "Neumorphic" },
  "neumorphic-raised": { ar: "بارز", en: "Raised" },
  "neumorphic-pressed": { ar: "مضغوط", en: "Pressed" },
  "neumorphic-flat": { ar: "مسطح", en: "Flat" },
  "gradient-border": { ar: "حدود متدرجة", en: "Gradient Border" },
  "animated-border": { ar: "حدود متحركة", en: "Animated Border" },
  "flip": { ar: "انقلاب", en: "Flip" },
  "tilt": { ar: "ميلان", en: "Tilt" },
  "spotlight": { ar: "ضوء", en: "Spotlight" },
  "morphing": { ar: "تحول", en: "Morphing" },
  "layered": { ar: "طبقات", en: "Layered" },
  "pricing": { ar: "تسعير", en: "Pricing" },
  "testimonial": { ar: "شهادة", en: "Testimonial" },
  "stat": { ar: "إحصائية", en: "Stat" },
};

export const HOVER_LABELS: Record<HoverPresetExtended, { ar: string; en: string }> = {
  "none": { ar: "بدون", en: "None" },
  "lift": { ar: "رفع", en: "Lift" },
  "glow": { ar: "توهج", en: "Glow" },
  "underline": { ar: "خط سفلي", en: "Underline" },
  "scale": { ar: "تكبير", en: "Scale" },
  "brighten": { ar: "إضاءة", en: "Brighten" },
  "darken": { ar: "تعتيم", en: "Darken" },
  "float": { ar: "طفو", en: "Float" },
  "bounce": { ar: "ارتداد", en: "Bounce" },
  "shake": { ar: "اهتزاز", en: "Shake" },
  "pulse": { ar: "نبض", en: "Pulse" },
  "swing": { ar: "تأرجح", en: "Swing" },
  "wobble": { ar: "ترنح", en: "Wobble" },
  "flip-x": { ar: "قلب أفقي", en: "Flip X" },
  "flip-y": { ar: "قلب عمودي", en: "Flip Y" },
  "rotate-3d": { ar: "دوران 3D", en: "Rotate 3D" },
  "skew": { ar: "انحراف", en: "Skew" },
  "glow-accent": { ar: "توهج أساسي", en: "Accent Glow" },
  "glow-gold": { ar: "توهج ذهبي", en: "Gold Glow" },
  "glow-neon": { ar: "توهج نيون", en: "Neon Glow" },
  "shadow-lift": { ar: "ظل مرفوع", en: "Shadow Lift" },
  "shadow-glow": { ar: "ظل متوهج", en: "Shadow Glow" },
  "border-accent": { ar: "حدود أساسية", en: "Accent Border" },
  "border-gold": { ar: "حدود ذهبية", en: "Gold Border" },
  "border-gradient": { ar: "حدود متدرجة", en: "Gradient Border" },
  "border-animate": { ar: "حدود متحركة", en: "Animated Border" },
  "bg-accent": { ar: "خلفية أساسية", en: "Accent BG" },
  "bg-gold": { ar: "خلفية ذهبية", en: "Gold BG" },
  "bg-gradient": { ar: "خلفية متدرجة", en: "Gradient BG" },
  "bg-glass": { ar: "خلفية زجاجية", en: "Glass BG" },
  "text-accent": { ar: "نص أساسي", en: "Accent Text" },
  "text-gold": { ar: "نص ذهبي", en: "Gold Text" },
  "text-gradient": { ar: "نص متدرج", en: "Gradient Text" },
  "card-lift": { ar: "بطاقة مرفوعة", en: "Card Lift" },
  "card-glow": { ar: "بطاقة متوهجة", en: "Card Glow" },
  "card-3d": { ar: "بطاقة 3D", en: "Card 3D" },
  "button-pop": { ar: "زر بارز", en: "Button Pop" },
  "link-underline": { ar: "رابط مخطط", en: "Link Underline" },
};

// ============================================================
// EXTENDED TwTokens TYPE
// ============================================================
export type TwTokensExtended = {
  textEffect?: TextEffectPreset;
  cardTemplate?: CardTemplatePreset;
  buttonStyle?: ButtonStylePreset;
  hoverExtended?: HoverPresetExtended;
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
