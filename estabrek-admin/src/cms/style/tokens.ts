// ============================================================
// ESTABREK CMS TOKENS - COMPREHENSIVE TAILWIND DESIGN TOKENS
// ============================================================

export const DISPLAY_PRESETS = ["block","inline-block","inline-flex","flex","grid","hidden"] as const;
export type DisplayPreset = typeof DISPLAY_PRESETS[number];

export const POSITION_PRESETS = ["static","relative","absolute","fixed","sticky"] as const;
export type PositionPreset = typeof POSITION_PRESETS[number];

// Flex / Grid (advanced layout presets)
export const FLEX_DIR_PRESETS = ["row", "row-reverse", "col", "col-reverse"] as const;
export type FlexDirPreset = typeof FLEX_DIR_PRESETS[number];

export const FLEX_WRAP_PRESETS = ["nowrap", "wrap", "wrap-reverse"] as const;
export type FlexWrapPreset = typeof FLEX_WRAP_PRESETS[number];

export const JUSTIFY_PRESETS = ["start", "center", "end", "between", "around", "evenly"] as const;
export type JustifyPreset = typeof JUSTIFY_PRESETS[number];

export const ITEMS_PRESETS = ["start", "center", "end", "stretch", "baseline"] as const;
export type ItemsPreset = typeof ITEMS_PRESETS[number];

export const GRID_COLS_PRESETS = [1, 2, 3, 4, 5, 6, 12] as const;
export type GridColsPreset = typeof GRID_COLS_PRESETS[number];

export const GRID_ROWS_PRESETS = ["auto", 1, 2, 3, 4, 5, 6] as const;
export type GridRowsPreset = typeof GRID_ROWS_PRESETS[number];

export const JUSTIFY_ITEMS_PRESETS = ["start", "center", "end", "stretch"] as const;
export type JustifyItemsPreset = typeof JUSTIFY_ITEMS_PRESETS[number];

export const PLACE_ITEMS_PRESETS = ["start", "center", "end", "stretch"] as const;
export type PlaceItemsPreset = typeof PLACE_ITEMS_PRESETS[number];

export const RADIUS_PRESETS = ["none","sm","md","lg","xl","2xl","3xl","full"] as const;
export type RadiusPreset = typeof RADIUS_PRESETS[number];

export const SHADOW_PRESETS = ["none","sm","md","lg","xl","2xl","inner","glow"] as const;
export type ShadowPreset = typeof SHADOW_PRESETS[number];

export const BG_PRESETS = [
  "none",
  "solid-paper",
  "solid-surface",
  "solid-muted",
  "solid-black",
  "solid-white",
  "solid-gold",
  "solid-primary",
  "solid-secondary",
  "solid-accent",
  "solid-cream",
  "gradient-sunset",
  "gradient-ocean",
  "gradient-neon",
  "gradient-goldlux",
  "gradient-accent",
  "gradient-warm",
  "glass-sm",
  "glass-md",
  "glass-lg",
] as const;
export type BgPreset = typeof BG_PRESETS[number];

export const HOVER_PRESETS = ["none","lift","glow","underline","scale","brighten","darken"] as const;
export type HoverPreset = typeof HOVER_PRESETS[number];

// Enhanced animation presets with GSAP support
export const ANIM_PRESETS = [
  "none",
  "fade-in",
  "fade-up",
  "fade-down",
  "fade-left",
  "fade-right",
  "zoom-in",
  "zoom-out",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "scale-in",
  "scale-up",
  "rotate-in",
  "flip-up",
  "flip-left",
  "bounce-in",
  "elastic-in",
  "blur-in",
  "reveal-up",
  "reveal-left",
  "stagger-fade",
  "stagger-slide",
  "stagger-scale",
  "parallax-slow",
  "parallax-fast",
  "float",
  "pulse",
] as const;
export type AnimPreset = typeof ANIM_PRESETS[number];

export const EASING_PRESETS = [
  "power1.out",
  "power2.out",
  "power3.out",
  "power4.out",
  "back.out(1.7)",
  "elastic.out(1, 0.3)",
  "bounce.out",
  "circ.out",
  "expo.out",
  "sine.out",
] as const;
export type EasingPreset = typeof EASING_PRESETS[number];

export const DELAY_PRESETS = [0,75,100,150,200,300,500,700,1000] as const;
export type DelayPreset = typeof DELAY_PRESETS[number];

export const DURATION_PRESETS = [150,200,300,400,500,600,800,1000,1500,2000] as const;
export type DurationPreset = typeof DURATION_PRESETS[number];

export const STAGGER_PRESETS = [0.05,0.1,0.15,0.2,0.25,0.3] as const;
export type StaggerPreset = typeof STAGGER_PRESETS[number];

export const STAGGER_DIR_PRESETS = ["start","end","center","edges","random"] as const;
export type StaggerDirPreset = typeof STAGGER_DIR_PRESETS[number];

export const PADDING_PRESETS = ["none","xs","sm","md","lg","xl","2xl","3xl"] as const;
export type PaddingPreset = typeof PADDING_PRESETS[number];

export const GAP_PRESETS = ["none","xs","sm","md","lg","xl","2xl"] as const;
export type GapPreset = typeof GAP_PRESETS[number];

export const MARGIN_PRESETS = ["none","auto","xs","sm","md","lg","xl","2xl"] as const;
export type MarginPreset = typeof MARGIN_PRESETS[number];

export const TEXT_SIZE_PRESETS = ["xs","sm","base","lg","xl","2xl","3xl","4xl","5xl","6xl"] as const;
export type TextSizePreset = typeof TEXT_SIZE_PRESETS[number];

export const TEXT_ALIGN_PRESETS = ["left","center","right","justify"] as const;
export type TextAlignPreset = typeof TEXT_ALIGN_PRESETS[number];

export const FONT_WEIGHT_PRESETS = ["thin","light","normal","medium","semibold","bold","extrabold","black"] as const;
export type FontWeightPreset = typeof FONT_WEIGHT_PRESETS[number];

export const FONT_FAMILY_PRESETS = ["sans","serif","mono","arabic","display"] as const;
export type FontFamilyPreset = typeof FONT_FAMILY_PRESETS[number];

export const TEXT_COLOR_PRESETS = ["default","muted","subtle","primary","secondary","accent","gold","onPrimary","danger","success","warning","info","white","black"] as const;
export type TextColorPreset = typeof TEXT_COLOR_PRESETS[number];

export const LINE_HEIGHT_PRESETS = ["none","tight","snug","normal","relaxed","loose"] as const;
export type LineHeightPreset = typeof LINE_HEIGHT_PRESETS[number];

export const LETTER_SPACING_PRESETS = ["tighter","tight","normal","wide","wider","widest"] as const;
export type LetterSpacingPreset = typeof LETTER_SPACING_PRESETS[number];

export const MAX_W_PRESETS = ["none","xs","sm","md","lg","xl","2xl","3xl","4xl","5xl","6xl","7xl","prose","full"] as const;
export type MaxWidthPreset = typeof MAX_W_PRESETS[number];

export const MIN_H_PRESETS = ["0","screen","min","max","fit"] as const;
export type MinHeightPreset = typeof MIN_H_PRESETS[number];

export const OVERFLOW_PRESETS = ["auto","hidden","visible","scroll"] as const;
export type OverflowPreset = typeof OVERFLOW_PRESETS[number];

export const BORDER_WIDTH_PRESETS = ["0","1","2","4","8"] as const;
export type BorderWidthPreset = typeof BORDER_WIDTH_PRESETS[number];

export const BORDER_STYLE_PRESETS = ["solid","dashed","dotted","double","none"] as const;
export type BorderStylePreset = typeof BORDER_STYLE_PRESETS[number];

export const OPACITY_PRESETS = ["0","5","10","20","25","30","40","50","60","70","75","80","90","95","100"] as const;
export type OpacityPreset = typeof OPACITY_PRESETS[number];

export const BLUR_PRESETS = ["none","sm","md","lg","xl","2xl","3xl"] as const;
export type BlurPreset = typeof BLUR_PRESETS[number];

// ============================================================
// DECORATION TOKENS (SVG SHAPES)
// ============================================================

export const DECOR_SHAPE_PRESETS = [
  "none",
  "wave",
  "wave-smooth",
  "wave-rough",
  "wave-double",
  "wave2",
  "curve",
  "curve-deep",
  "diagonal",
  "diagonal-reverse",
  "zigzag",
  "zigzag-sharp",
  "triangle",
  "triangle-asymmetric",
  "blob",
  "blob-organic",
  "blob-corner",
  "blob2",
  "dots-grid",
  "dots-scatter",
  "lines-horizontal",
  "lines-diagonal",
  "gradient-fade",
  "noise",
] as const;
export type DecorShapePreset = typeof DECOR_SHAPE_PRESETS[number];

export const DECOR_PLACEMENT_PRESETS = ["top","bottom","left","right","background"] as const;
export type DecorPlacementPreset = typeof DECOR_PLACEMENT_PRESETS[number];

export const DECOR_SIZE_PRESETS = ["xs","sm","md","lg","xl"] as const;
export type DecorSizePreset = typeof DECOR_SIZE_PRESETS[number];

export const DECOR_COLOR_PRESETS = ["muted","white","black","cream","sunset","ocean","neon","primary","accent","gold","gradient-accent","gradient-gold","gradient-sunset","custom"] as const;
export type DecorColorPreset = typeof DECOR_COLOR_PRESETS[number];

export const DECOR_FILL_PRESETS = ["solid","gradient","glass"] as const;
export type DecorFillPreset = typeof DECOR_FILL_PRESETS[number];

export const DECOR_BLUR_PRESETS = ["0","sm","md","lg"] as const;
export type DecorBlurPreset = typeof DECOR_BLUR_PRESETS[number];

export type DecorLayer = {
  shape?: DecorShapePreset;
  placement?: DecorPlacementPreset;
  size?: DecorSizePreset;
  fill?: DecorFillPreset;
  color?: DecorColorPreset;
  customColor?: string;
  opacity?: "10"|"20"|"30"|"40"|"50"|"60"|"70"|"80"|"90"|"100";
  flipX?: boolean;
  flipY?: boolean;
  blur?: DecorBlurPreset;
  zIndex?: number;
};

// Decoration preset combinations
export const DECOR_PRESETS = {
  none: {},
  waveTop: { before: { shape: "wave", placement: "top", size: "md", color: "accent" } },
  waveBottom: { after: { shape: "wave", placement: "bottom", size: "md", color: "accent" } },
  waveBoth: { 
    before: { shape: "wave", placement: "top", size: "md", color: "accent" },
    after: { shape: "wave", placement: "bottom", size: "md", color: "muted", flipY: true }
  },
  blobAccent: { before: { shape: "blob", placement: "background", size: "lg", color: "accent", opacity: "20" } },
  diagonalGold: { after: { shape: "diagonal", placement: "bottom", size: "lg", color: "gold" } },
  dotsPattern: { before: { shape: "dots-grid", placement: "background", size: "xl", color: "muted", opacity: "30" } },
  noiseTexture: { before: { shape: "noise", placement: "background", size: "xl", color: "white", opacity: "10" } },
  curveElegant: { after: { shape: "curve-deep", placement: "bottom", size: "lg", color: "cream" } },
} as const;
export type DecorPresetKey = keyof typeof DECOR_PRESETS;

// ============================================================
// MOTION CONFIG (GSAP ANIMATIONS)
// ============================================================

export type MotionConfig = {
  preset?: AnimPreset;
  anim?: AnimPreset;
  duration?: number;
  delay?: number;
  easing?: EasingPreset;
  stagger?: number;
  staggerDir?: StaggerDirPreset;
  threshold?: number;
  once?: boolean;
  scrub?: boolean;
};

// ============================================================
// MAIN TOKENS TYPE
// ============================================================

export type TwTokens = {
  layout?: {
    display?: DisplayPreset;
    position?: PositionPreset;
    zIndex?: "auto"|"0"|"10"|"20"|"30"|"40"|"50";
    overflow?: OverflowPreset;
    overflowX?: OverflowPreset;
    overflowY?: OverflowPreset;

    // Shown when display === flex / inline-flex
    flex?: {
      dir?: FlexDirPreset;
      wrap?: FlexWrapPreset;
      justify?: JustifyPreset;
      items?: ItemsPreset;
      content?: JustifyPreset;
    };

    // Shown when display === grid
    grid?: {
      cols?: GridColsPreset;
      rows?: GridRowsPreset;
      justifyItems?: JustifyItemsPreset;
      placeItems?: PlaceItemsPreset;
      flow?: "row"|"col"|"dense"|"row-dense"|"col-dense";
    };
  };
  
  style?: {
    bg?: BgPreset;
    bgColor?: string;
    bgCustom?: string;
    bgOpacity?: OpacityPreset;
    radius?: RadiusPreset;
    shadow?: ShadowPreset;
    shadowColor?: TextColorPreset;
    borderWidth?: BorderWidthPreset;
    borderStyle?: BorderStylePreset;
    borderColor?: TextColorPreset;
    borderCustomColor?: string;
  };
  
  state?: {
    hover?: HoverPreset;
    hoverBg?: BgPreset;
    hoverText?: TextColorPreset;
    hoverScale?: "95"|"100"|"105"|"110";
    hoverShadow?: ShadowPreset;
    focusRing?: boolean;
    focusRingColor?: TextColorPreset;
    transition?: "none"|"all"|"colors"|"opacity"|"shadow"|"transform";
    transitionDuration?: "75"|"100"|"150"|"200"|"300"|"500"|"700"|"1000";
  };
  
  motion?: MotionConfig;

  spacing?: {
    padding?: PaddingPreset;
    paddingX?: PaddingPreset;
    paddingY?: PaddingPreset;
    paddingTop?: PaddingPreset;
    paddingBottom?: PaddingPreset;
    margin?: MarginPreset;
    marginX?: MarginPreset;
    marginY?: MarginPreset;
    marginTop?: MarginPreset;
    marginBottom?: MarginPreset;
    gap?: GapPreset;
    gapX?: GapPreset;
    gapY?: GapPreset;
  };
  
  typography?: {
    family?: FontFamilyPreset;
    size?: TextSizePreset;
    align?: TextAlignPreset;
    weight?: FontWeightPreset;
    color?: TextColorPreset;
    colorCustom?: string;
    lineHeight?: LineHeightPreset;
    letterSpacing?: LetterSpacingPreset;
    decoration?: "underline"|"overline"|"line-through"|"none";
    transform?: "uppercase"|"lowercase"|"capitalize"|"normal-case";
    truncate?: boolean;
    lineClamp?: 1|2|3|4|5|6;
  };
  
  size?: {
    width?: "auto"|"full"|"screen"|"min"|"max"|"fit"|string;
    minW?: "0"|"full"|"min"|"max"|"fit";
    maxW?: MaxWidthPreset;
    height?: "auto"|"full"|"screen"|"min"|"max"|"fit"|string;
    minH?: MinHeightPreset;
    maxH?: "none"|"full"|"screen"|"min"|"max"|"fit";
  };
  
  effects?: {
    opacity?: OpacityPreset;
    blur?: BlurPreset;
    backdropBlur?: BlurPreset;
    backdropBrightness?: "0"|"50"|"75"|"90"|"95"|"100"|"105"|"110"|"125"|"150"|"200";
    grayscale?: boolean;
    invert?: boolean;
    sepia?: boolean;
    mixBlend?: "normal"|"multiply"|"screen"|"overlay"|"darken"|"lighten";
  };
  
  decor?: {
    before?: DecorLayer;
    after?: DecorLayer;
    preset?: DecorPresetKey;
  };
};

// ============================================================
// LABELS FOR ADMIN UI (Arabic/English)
// ============================================================

export const ANIM_LABELS: Record<AnimPreset, { en: string; ar: string }> = {
  "none": { en: "None", ar: "بدون" },
  "fade-in": { en: "Fade In", ar: "ظهور تدريجي" },
  "fade-up": { en: "Fade Up", ar: "ظهور للأعلى" },
  "fade-down": { en: "Fade Down", ar: "ظهور للأسفل" },
  "fade-left": { en: "Fade Left", ar: "ظهور لليسار" },
  "fade-right": { en: "Fade Right", ar: "ظهور لليمين" },
  "zoom-in": { en: "Zoom In", ar: "تكبير للداخل" },
  "zoom-out": { en: "Zoom Out", ar: "تصغير للخارج" },
  "slide-up": { en: "Slide Up", ar: "انزلاق للأعلى" },
  "slide-down": { en: "Slide Down", ar: "انزلاق للأسفل" },
  "slide-left": { en: "Slide Left", ar: "انزلاق لليسار" },
  "slide-right": { en: "Slide Right", ar: "انزلاق لليمين" },
  "scale-in": { en: "Scale In", ar: "تكبير" },
  "scale-up": { en: "Scale Up", ar: "تكبير للأعلى" },
  "rotate-in": { en: "Rotate In", ar: "دوران" },
  "flip-up": { en: "Flip Up", ar: "قلب للأعلى" },
  "flip-left": { en: "Flip Left", ar: "قلب لليسار" },
  "bounce-in": { en: "Bounce In", ar: "ارتداد" },
  "elastic-in": { en: "Elastic In", ar: "مطاطي" },
  "blur-in": { en: "Blur In", ar: "ضبابي" },
  "reveal-up": { en: "Reveal Up", ar: "كشف للأعلى" },
  "reveal-left": { en: "Reveal Left", ar: "كشف لليسار" },
  "stagger-fade": { en: "Stagger Fade", ar: "تتابع ظهور" },
  "stagger-slide": { en: "Stagger Slide", ar: "تتابع انزلاق" },
  "stagger-scale": { en: "Stagger Scale", ar: "تتابع تكبير" },
  "parallax-slow": { en: "Parallax Slow", ar: "تمرير بطيء" },
  "parallax-fast": { en: "Parallax Fast", ar: "تمرير سريع" },
  "float": { en: "Float", ar: "طفو" },
  "pulse": { en: "Pulse", ar: "نبض" },
};

export const SHAPE_LABELS: Record<DecorShapePreset, { en: string; ar: string }> = {
  "none": { en: "None", ar: "بدون" },
  "wave": { en: "Wave", ar: "موجة" },
  "wave-smooth": { en: "Smooth Wave", ar: "موجة ناعمة" },
  "wave-rough": { en: "Rough Wave", ar: "موجة خشنة" },
  "wave-double": { en: "Double Wave", ar: "موجة مزدوجة" },
  "wave2": { en: "Wave 2", ar: "موجة 2" },
  "curve": { en: "Curve", ar: "منحنى" },
  "curve-deep": { en: "Deep Curve", ar: "منحنى عميق" },
  "diagonal": { en: "Diagonal", ar: "قطري" },
  "diagonal-reverse": { en: "Diagonal Reverse", ar: "قطري معكوس" },
  "zigzag": { en: "Zigzag", ar: "متعرج" },
  "zigzag-sharp": { en: "Sharp Zigzag", ar: "متعرج حاد" },
  "triangle": { en: "Triangle", ar: "مثلث" },
  "triangle-asymmetric": { en: "Asymmetric Triangle", ar: "مثلث غير متماثل" },
  "blob": { en: "Blob", ar: "شكل عضوي" },
  "blob-organic": { en: "Organic Blob", ar: "شكل عضوي 2" },
  "blob-corner": { en: "Corner Blob", ar: "شكل ركني" },
  "blob2": { en: "Blob 2", ar: "شكل عضوي 3" },
  "dots-grid": { en: "Dots Grid", ar: "شبكة نقاط" },
  "dots-scatter": { en: "Scattered Dots", ar: "نقاط متناثرة" },
  "lines-horizontal": { en: "Horizontal Lines", ar: "خطوط أفقية" },
  "lines-diagonal": { en: "Diagonal Lines", ar: "خطوط قطرية" },
  "gradient-fade": { en: "Gradient Fade", ar: "تدرج" },
  "noise": { en: "Noise Texture", ar: "نسيج" },
};
