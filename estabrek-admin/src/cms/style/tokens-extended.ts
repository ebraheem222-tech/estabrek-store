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
// EXTENDED LABELS (Arabic)
// ============================================================
export const TEXT_EFFECT_LABELS: Partial<Record<TextEffectPreset, { ar: string; en: string }>> = {
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
  "gradient-royal": { ar: "تدرج ملكي", en: "Royal" },
  "gradient-silver": { ar: "تدرج فضي", en: "Silver" },
  "gradient-rose": { ar: "تدرج وردي", en: "Rose" },
  "gradient-midnight": { ar: "تدرج منتصف الليل", en: "Midnight" },
  "gradient-tropical": { ar: "تدرج استوائي", en: "Tropical" },
  "gradient-custom": { ar: "تدرج مخصص", en: "Custom Gradient" },
  "glow": { ar: "توهج", en: "Glow" },
  "glow-accent": { ar: "توهج أساسي", en: "Accent Glow" },
  "glow-gold": { ar: "توهج ذهبي", en: "Gold Glow" },
  "glow-neon": { ar: "توهج نيون", en: "Neon Glow" },
  "glow-pulse": { ar: "توهج نابض", en: "Pulse Glow" },
  "glow-cyan": { ar: "توهج سماوي", en: "Glow Cyan" },
  "glow-pink": { ar: "توهج وردي", en: "Glow Pink" },
  "glow-green": { ar: "توهج أخضر", en: "Glow Green" },
  "glow-purple": { ar: "توهج بنفسجي", en: "Glow Purple" },
  "glow-orange": { ar: "توهج برتقالي", en: "Glow Orange" },
  "glow-red": { ar: "توهج أحمر", en: "Glow Red" },
  "glow-yellow": { ar: "توهج أصفر", en: "Glow Yellow" },
  "glow-blue": { ar: "توهج أزرق", en: "Glow Blue" },
  "glow-white": { ar: "توهج أبيض", en: "Glow White" },
  "glow-neon-multi": { ar: "توهج نيون متعدد", en: "Glow Neon Multi" },
  "glow-soft": { ar: "توهج ناعم", en: "Glow Soft" },
  "neon": { ar: "نيون", en: "Neon" },
  "neon-cyan": { ar: "نيون سماوي", en: "Neon Cyan" },
  "neon-blue": { ar: "نيون أزرق", en: "Blue Neon" },
  "neon-pink": { ar: "نيون وردي", en: "Pink Neon" },
  "neon-green": { ar: "نيون أخضر", en: "Green Neon" },
  "neon-purple": { ar: "نيون بنفسجي", en: "Purple Neon" },
  "neon-orange": { ar: "نيون برتقالي", en: "Neon Orange" },
  "neon-red": { ar: "نيون أحمر", en: "Neon Red" },
  "neon-yellow": { ar: "نيون أصفر", en: "Neon Yellow" },
  "neon-white": { ar: "نيون أبيض", en: "Neon White" },
  "neon-multi": { ar: "نيون متعدد", en: "Multi Neon" },
  "neon-flicker": { ar: "نيون متقطع", en: "Neon Flicker" },
  "shadow-soft": { ar: "ظل ناعم", en: "Shadow Soft" },
  "shadow-hard": { ar: "ظل قوي", en: "Shadow Hard" },
  "shadow-long": { ar: "ظل طويل", en: "Shadow Long" },
  "shadow-3d": { ar: "ظل ثلاثي الأبعاد", en: "Shadow 3D" },
  "shadow-retro": { ar: "ظل ريترو", en: "Shadow Retro" },
  "shadow-double": { ar: "ظل مزدوج", en: "Shadow Double" },
  "shadow-outline": { ar: "ظل محدد", en: "Shadow Outline" },
  "shadow-blur": { ar: "ظل ضبابي", en: "Shadow Blur" },
  "shadow-inset": { ar: "ظل داخلي", en: "Shadow Inset" },
  "shadow-emboss": { ar: "ظل بارز", en: "Shadow Emboss" },
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
  "outline-thin": { ar: "محدد رفيع", en: "Outline Thin" },
  "outline-medium": { ar: "محدد متوسط", en: "Outline Medium" },
  "outline-thick": { ar: "إطار سميك", en: "Thick Outline" },
  "outline-colored": { ar: "محدد ملون", en: "Outline Colored" },
  "outline-double": { ar: "إطار مزدوج", en: "Double Outline" },
  "outline-gradient": { ar: "إطار متدرج", en: "Gradient Outline" },
  "outline-neon": { ar: "إطار نيون", en: "Neon Outline" },
  "outline-shadow": { ar: "محدد بظل", en: "Outline Shadow" },
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
  "anim-bounce": { ar: "متحرك نطاط", en: "Animated Bounce" },
  "anim-pulse": { ar: "متحرك نابض", en: "Animated Pulse" },
  "anim-spin": { ar: "متحرك دوار", en: "Animated Spin" },
  "anim-ping": { ar: "متحرك رنين", en: "Animated Ping" },
  "anim-shake": { ar: "متحرك اهتزاز", en: "Animated Shake" },
  "anim-fade-in": { ar: "متحرك ظهور", en: "Animated Fade In" },
  "anim-slide-up": { ar: "متحرك انزلاق للأعلى", en: "Animated Slide Up" },
  "anim-slide-down": { ar: "متحرك انزلاق للأسفل", en: "Animated Slide Down" },
  "anim-scale": { ar: "متحرك تكبير", en: "Animated Scale" },
  "anim-glow-pulse": { ar: "متحرك توهج نابض", en: "Animated Glow Pulse" },
  "anim-rainbow": { ar: "متحرك قوس قزح", en: "Animated Rainbow" },
  "anim-typing": { ar: "متحرك كتابة", en: "Animated Typing" },
  "anim-wave": { ar: "متحرك موجة", en: "Animated Wave" },
  "anim-float": { ar: "متحرك طفو", en: "Animated Float" },
  "anim-glitch": { ar: "متحرك خلل", en: "Animated Glitch" },
  "typo-elegant": { ar: "طباعة أنيقة", en: "Typography Elegant" },
  "typo-modern": { ar: "طباعة حديثة", en: "Typography Modern" },
  "typo-bold": { ar: "طباعة عريضة", en: "Typography Bold" },
  "typo-thin": { ar: "طباعة رفيعة", en: "Typography Thin" },
  "typo-mono": { ar: "طباعة أحادية", en: "Typography Mono" },
  "typo-display": { ar: "طباعة عرض", en: "Typography Display" },
  "typo-handwritten": { ar: "طباعة يدوية", en: "Typography Handwritten" },
  "typo-condensed": { ar: "طباعة مضغوطة", en: "Typography Condensed" },
  "typo-expanded": { ar: "طباعة موسعة", en: "Typography Expanded" },
  "typo-small-caps": { ar: "طباعة أحرف صغيرة", en: "Typography Small Caps" },
  "typo-drop-cap": { ar: "طباعة حرف كبير", en: "Typography Drop Cap" },
  "typo-justified": { ar: "طباعة مضبوطة", en: "Typography Justified" },
  "glass": { ar: "زجاج", en: "Glass" },
  "frosted": { ar: "مثلج", en: "Frosted" },
  "blur-bg": { ar: "خلفية ضبابية", en: "Blur Background" },
  "highlight": { ar: "تمييز", en: "Highlight" },
  "underline-animated": { ar: "خط متحرك", en: "Animated Underline" },
  "strikethrough": { ar: "شطب", en: "Strikethrough" },
  "split": { ar: "انقسام", en: "Split" },
  "masked": { ar: "مقنع", en: "Masked" },
  "clip-text": { ar: "قص النص", en: "Clip Text" },
  "special-stroke": { ar: "خاص محدد", en: "Special Stroke" },
  "special-stroke-gradient": { ar: "خاص محدد متدرج", en: "Special Stroke Gradient" },
  "special-hollow": { ar: "خاص مفرغ", en: "Special Hollow" },
  "special-double-stroke": { ar: "خاص محدد مزدوج", en: "Special Double Stroke" },
  "special-metallic": { ar: "خاص معدني", en: "Special Metallic" },
  "special-chrome": { ar: "خاص كروم", en: "Special Chrome" },
  "special-gold-foil": { ar: "خاص ورق ذهبي", en: "Special Gold Foil" },
  "special-fire": { ar: "خاص ناري", en: "Special Fire" },
  "special-ice": { ar: "خاص جليدي", en: "Special Ice" },
  "special-blood": { ar: "خاص دموي", en: "Special Blood" },
  "special-poison": { ar: "خاص سام", en: "Special Poison" },
  "special-electric": { ar: "خاص كهربائي", en: "Special Electric" },
  "deco-underline": { ar: "زخرفة خط سفلي", en: "Decorative Underline" },
  "deco-underline-wavy": { ar: "زخرفة خط سفلي متموج", en: "Decorative Underline Wavy" },
  "deco-strikethrough": { ar: "زخرفة شطب", en: "Decorative Strikethrough" },
  "deco-highlight": { ar: "زخرفة تظليل", en: "Decorative Highlight" },
  "deco-highlight-gradient": { ar: "زخرفة تظليل متدرج", en: "Decorative Highlight Gradient" },
  "deco-box": { ar: "زخرفة صندوق", en: "Decorative Box" },
  "deco-tag": { ar: "زخرفة وسم", en: "Decorative Tag" },
  "deco-bracket": { ar: "زخرفة أقواس", en: "Decorative Bracket" },
  "dark-subtle": { ar: "داكن خفيف", en: "Dark Subtle" },
  "dark-bright": { ar: "داكن مشرق", en: "Dark Bright" },
  "dark-muted": { ar: "داكن باهت", en: "Dark Muted" },
  "dark-accent": { ar: "داكن مميز", en: "Dark Accent" },
  "dark-warm": { ar: "داكن دافئ", en: "Dark Warm" },
  "dark-cool": { ar: "داكن بارد", en: "Dark Cool" },
  "dark-contrast": { ar: "داكن متباين", en: "Dark Contrast" },
  "dark-glow": { ar: "داكن متوهج", en: "Dark Glow" },
  "light-default": { ar: "فاتح افتراضي", en: "Light Default" },
  "light-muted": { ar: "فاتح باهت", en: "Light Muted" },
  "light-bold": { ar: "فاتح عريض", en: "Light Bold" },
  "light-accent": { ar: "فاتح مميز", en: "Light Accent" },
  "light-warm": { ar: "فاتح دافئ", en: "Light Warm" },
  "light-cool": { ar: "فاتح بارد", en: "Light Cool" },
  "light-elegant": { ar: "فاتح أنيق", en: "Light Elegant" },
  "light-shadow": { ar: "فاتح بظل", en: "Light Shadow" },
  "label-primary": { ar: "وسم أساسي", en: "Label Primary" },
  "label-secondary": { ar: "وسم ثانوي", en: "Label Secondary" },
  "label-success": { ar: "وسم نجاح", en: "Label Success" },
  "label-danger": { ar: "وسم خطر", en: "Label Danger" },
  "label-warning": { ar: "وسم تحذير", en: "Label Warning" },
  "label-outline": { ar: "وسم محدد", en: "Label Outline" },
  "heading-hero": { ar: "عنوان بطل", en: "Heading Hero" },
  "heading-section": { ar: "عنوان قسم", en: "Heading Section" },
  "heading-subtitle": { ar: "عنوان فرعي", en: "Heading Subtitle" },
  "heading-elegant": { ar: "عنوان أنيق", en: "Heading Elegant" },
  "heading-bold": { ar: "عنوان عريض", en: "Heading Bold" },
  "heading-accent": { ar: "عنوان مميز", en: "Heading Accent" },
  "para-default": { ar: "فقرة افتراضية", en: "Paragraph Default" },
  "para-large": { ar: "فقرة كبيرة", en: "Paragraph Large" },
  "para-small": { ar: "فقرة صغيرة", en: "Paragraph Small" },
  "para-quote": { ar: "فقرة اقتباس", en: "Paragraph Quote" },
  "para-lead": { ar: "فقرة رئيسية", en: "Paragraph Lead" },
  "para-caption": { ar: "فقرة تسمية", en: "Paragraph Caption" },
  "art-watercolor": { ar: "فني ألوان مائية", en: "Art Watercolor" },
  "art-sketch": { ar: "فني رسم", en: "Art Sketch" },
  "art-vintage": { ar: "فني عتيق", en: "Art Vintage" },
  "art-comic": { ar: "فني كوميدي", en: "Art Comic" },
  "art-graffiti": { ar: "فني غرافيتي", en: "Art Graffiti" },
  "art-neon-sign": { ar: "فني لافتة نيون", en: "Art Neon Sign" },
};

export const CARD_TEMPLATE_LABELS: Record<CardTemplatePreset, { ar: string; en: string }> = {
  "default": { ar: "افتراضي", en: "Default" },
  "gaming": { ar: "ألعاب", en: "Gaming" },
  "gaming-common": { ar: "عادي", en: "Common" },
  "gaming-uncommon": { ar: "غير شائع", en: "Uncommon" },
  "gaming-rare": { ar: "نادر", en: "Rare" },
  "gaming-epic": { ar: "ملحمي", en: "Epic" },
  "gaming-legendary": { ar: "أسطوري", en: "Legendary" },
  "gaming-mythic": { ar: "خرافي", en: "Mythic" },
  "gaming-holographic": { ar: "هولوغرافي", en: "Holographic" },
  "gaming-neon-frame": { ar: "إطار نيون", en: "Neon Frame" },
  "gaming-pixel": { ar: "بكسل", en: "Pixel" },
  "gaming-cyberpunk": { ar: "سايبربانك", en: "Cyberpunk" },
  "glass": { ar: "زجاج", en: "Glass" },
  "glass-frost": { ar: "زجاج متجمد", en: "Frost Glass" },
  "glass-dark": { ar: "زجاج داكن", en: "Dark Glass" },
  "glass-light": { ar: "زجاج فاتح", en: "Light Glass" },
  "glass-colored": { ar: "زجاج ملون", en: "Colored Glass" },
  "glass-aurora": { ar: "شفق زجاجي", en: "Aurora Glass" },
  "glass-rainbow": { ar: "قوس قزح", en: "Rainbow Glass" },
  "glass-metallic": { ar: "زجاج معدني", en: "Metallic Glass" },
  "glass-blur-heavy": { ar: "زجاج ضبابي", en: "Heavy Blur Glass" },
  "glass-neon-glow": { ar: "زجاج نيون متوهج", en: "Neon Glow Glass" },
  "glass-morphism": { ar: "جلاسمورفيزم برو", en: "Glassmorphism Pro" },
  "neon": { ar: "نيون", en: "Neon" },
  "neon-cyan": { ar: "نيون سماوي", en: "Cyan Neon" },
  "neon-pink": { ar: "نيون وردي", en: "Pink Neon" },
  "neon-green": { ar: "نيون أخضر", en: "Green Neon" },
  "neon-purple": { ar: "نيون بنفسجي", en: "Purple Neon" },
  "neon-orange": { ar: "نيون برتقالي", en: "Orange Neon" },
  "neon-multi": { ar: "نيون متعدد", en: "Multi Neon" },
  "neon-red": { ar: "نيون أحمر", en: "Red Neon" },
  "neon-yellow": { ar: "نيون أصفر", en: "Yellow Neon" },
  "neon-flicker": { ar: "نيون متقطع", en: "Neon Flicker" },
  "neon-pulse": { ar: "نيون نابض", en: "Neon Pulse" },
  "gradient-sunset": { ar: "تدرج غروب", en: "Gradient Sunset" },
  "gradient-ocean": { ar: "تدرج محيط", en: "Gradient Ocean" },
  "gradient-forest": { ar: "تدرج غابة", en: "Gradient Forest" },
  "gradient-fire": { ar: "تدرج ناري", en: "Gradient Fire" },
  "gradient-royal": { ar: "تدرج ملكي", en: "Gradient Royal" },
  "gradient-midnight": { ar: "تدرج منتصف الليل", en: "Gradient Midnight" },
  "gradient-rose-gold": { ar: "تدرج روز جولد", en: "Gradient Rose Gold" },
  "gradient-aurora": { ar: "تدرج شفق قطبي", en: "Gradient Aurora" },
  "gradient-candy": { ar: "تدرج حلوى", en: "Gradient Candy" },
  "gradient-mesh": { ar: "تدرج شبكي", en: "Gradient Mesh" },
  "minimal-clean": { ar: "بسيط نظيف", en: "Minimal Clean" },
  "minimal-border": { ar: "بسيط بإطار", en: "Minimal Border" },
  "minimal-shadow": { ar: "بسيط بظل", en: "Minimal Shadow" },
  "minimal-flat": { ar: "بسيط مسطح", en: "Minimal Flat" },
  "minimal-accent": { ar: "بسيط مع لمسة", en: "Minimal Accent" },
  "minimal-dark": { ar: "بسيط داكن", en: "Minimal Dark" },
  "minimal-outline": { ar: "بسيط محدد", en: "Minimal Outline" },
  "minimal-rounded": { ar: "بسيط مستدير", en: "Minimal Rounded" },
  "minimal-paper": { ar: "بسيط ورقي", en: "Minimal Paper" },
  "minimal-mono": { ar: "بسيط أحادي", en: "Minimal Mono" },
  "luxury-gold": { ar: "فاخر ذهبي", en: "Luxury Gold" },
  "luxury-platinum": { ar: "فاخر بلاتيني", en: "Luxury Platinum" },
  "luxury-black": { ar: "فاخر أسود", en: "Luxury Black" },
  "luxury-rose": { ar: "فاخر وردي", en: "Luxury Rose" },
  "luxury-marble": { ar: "فاخر رخامي", en: "Luxury Marble" },
  "luxury-velvet": { ar: "فاخر مخملي", en: "Luxury Velvet" },
  "luxury-champagne": { ar: "فاخر شامبانيا", en: "Luxury Champagne" },
  "luxury-emerald": { ar: "فاخر زمردي", en: "Luxury Emerald" },
  "luxury-sapphire": { ar: "فاخر ياقوتي", en: "Luxury Sapphire" },
  "luxury-ruby": { ar: "فاخر ياقوت أحمر", en: "Luxury Ruby" },
  "3d": { ar: "ثلاثي الأبعاد", en: "3D" },
  "3d-sm": { ar: "3D صغير", en: "3D Small" },
  "3d-md": { ar: "3D متوسط", en: "3D Medium" },
  "3d-lg": { ar: "3D كبير", en: "3D Large" },
  "3d-xl": { ar: "3D ضخم", en: "3D XL" },
  "3d-lift": { ar: "رفع ثلاثي الأبعاد", en: "3D Lift" },
  "3d-tilt": { ar: "ميلان ثلاثي الأبعاد", en: "3D Tilt" },
  "3d-flip": { ar: "انقلاب ثلاثي الأبعاد", en: "3D Flip" },
  "3d-pop": { ar: "بروز ثلاثي الأبعاد", en: "3D Pop" },
  "3d-float": { ar: "طفو ثلاثي الأبعاد", en: "3D Float" },
  "3d-layered": { ar: "طبقات ثلاثية الأبعاد", en: "3D Layered" },
  "3d-shadow-box": { ar: "صندوق ظل ثلاثي الأبعاد", en: "3D Shadow Box" },
  "3d-prism": { ar: "موشور ثلاثي الأبعاد", en: "3D Prism" },
  "3d-perspective": { ar: "منظور ثلاثي الأبعاد", en: "3D Perspective" },
  "3d-fold": { ar: "طي ثلاثي الأبعاد", en: "3D Fold" },
  "pricing": { ar: "تسعير", en: "Pricing" },
  "pricing-simple": { ar: "تسعير بسيط", en: "Pricing Simple" },
  "pricing-popular": { ar: "تسعير مميز", en: "Pricing Popular" },
  "pricing-bordered": { ar: "تسعير بإطار", en: "Pricing Bordered" },
  "pricing-gradient": { ar: "تسعير متدرج", en: "Pricing Gradient" },
  "pricing-dark": { ar: "تسعير داكن", en: "Pricing Dark" },
  "pricing-glass": { ar: "تسعير زجاجي", en: "Pricing Glass" },
  "pricing-neon": { ar: "تسعير نيون", en: "Pricing Neon" },
  "pricing-enterprise": { ar: "تسعير المؤسسات", en: "Pricing Enterprise" },
  "team-simple": { ar: "فريق بسيط", en: "Team Simple" },
  "team-overlay": { ar: "فريق بتغطية", en: "Team Overlay" },
  "team-bordered": { ar: "فريق بإطار", en: "Team Bordered" },
  "team-dark": { ar: "فريق داكن", en: "Team Dark" },
  "team-horizontal": { ar: "فريق أفقي", en: "Team Horizontal" },
  "team-creative": { ar: "فريق إبداعي", en: "Team Creative" },
  "blog-classic": { ar: "مقال كلاسيكي", en: "Blog Classic" },
  "blog-minimal": { ar: "مقال بسيط", en: "Blog Minimal" },
  "blog-featured": { ar: "مقال مميز", en: "Blog Featured" },
  "blog-horizontal": { ar: "مقال أفقي", en: "Blog Horizontal" },
  "blog-dark": { ar: "مقال داكن", en: "Blog Dark" },
  "blog-magazine": { ar: "مقال مجلة", en: "Blog Magazine" },
  "testimonial": { ar: "شهادة", en: "Testimonial" },
  "testimonial-simple": { ar: "شهادة بسيطة", en: "Testimonial Simple" },
  "testimonial-bordered": { ar: "شهادة بإطار", en: "Testimonial Bordered" },
  "testimonial-dark": { ar: "شهادة داكنة", en: "Testimonial Dark" },
  "testimonial-gradient": { ar: "شهادة متدرجة", en: "Testimonial Gradient" },
  "testimonial-bubble": { ar: "شهادة فقاعة", en: "Testimonial Bubble" },
  "testimonial-card": { ar: "شهادة بطاقة", en: "Testimonial Card" },
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
