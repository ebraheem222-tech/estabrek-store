import type { CSSProperties } from "react";
import type { TwTokens } from "./tokens";
import type { CardTemplatePreset, HoverPresetExtended, TextEffectPreset, TwTokensExtended } from "./tokens-extended";
import {
  bgMap,
  displayMap,
  positionMap,
  overflowMap,
  radiusMap,
  shadowMap,
  hoverMap,
  animMap,
  delayMap,
  durationMap,
  paddingMap,
  gapMap,
  marginMap,
  textSizeMap,
  textAlignMap,
  fontFamilyMap,
  fontWeightMap,
  textColorMap,
  lineHeightMap,
  letterSpacingMap,
  borderWidthMap,
  borderStyleMap,
  borderColorMap,
  maxWMap,
  opacityMap,
  blurMap,
  backdropBlurMap,
  flexDirMap,
  flexWrapMap,
  justifyMap,
  contentMap,
  itemsMap,
  gridColsMap,
  gridRowsMap,
  justifyItemsMap,
  placeItemsMap,
  gridFlowMap,
} from "./twMaps";

export function resolveCustomColor(value?: string): string | undefined {
  if (!value || typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(v)) return v;
  if (/^var\(--.+\)$/.test(v)) return v;
  if (v === "transparent" || v === "currentColor") return v;
  return undefined;
}

export function resolveCustomBackground(value?: string):
  | { type: "color"; value: string }
  | { type: "gradient"; value: string }
  | undefined {
  if (!value || typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/gradient\(/i.test(v)) return { type: "gradient", value: v };
  const color = resolveCustomColor(v);
  return color ? { type: "color", value: color } : undefined;
}

type CmsTokens = TwTokens & TwTokensExtended;

const PADDING_VALUE_MAP: Record<keyof typeof paddingMap, string> = {
  none: "0",
  xs: "0.5rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4rem",
};

const GAP_VALUE_MAP: Record<keyof typeof gapMap, string> = {
  none: "0",
  xs: "0.5rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
};

const MARGIN_VALUE_MAP: Record<keyof typeof marginMap, string> = {
  none: "0",
  auto: "auto",
  xs: "0.5rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
};

function resolvePresetSpacingValue(map: Record<string, string>, preset: unknown): string | undefined {
  if (typeof preset !== "string") return undefined;
  return map[preset];
}

function resolveSizeValue(value: unknown, axis: "width" | "height"): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v === "0") return "0";
  const keywordMap: Record<string, string> = {
    auto: "auto",
    full: "100%",
    screen: axis === "width" ? "100vw" : "100vh",
    min: "min-content",
    max: "max-content",
    fit: "fit-content",
    none: "none",
  };
  if (keywordMap[v]) return keywordMap[v];
  if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

function resolveOffsetValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v === "0" || v === "auto") return v;
  if (/^\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

function textEffectClass(effect?: TextEffectPreset): string {
  if (!effect || effect === "none") return "";
  return `text-${effect}`;
}

function cardTemplateClass(preset?: CardTemplatePreset): string {
  if (!preset || preset === "default") return "";
  if (preset === "gaming") return "card-gaming";
  if (preset.startsWith("gaming-")) {
    return `card-gaming rarity-${preset.replace("gaming-", "")}`;
  }
  if (preset === "neon") return "card-neon";
  if (preset.startsWith("neon-")) return `card-neon card-${preset}`;
  if (preset.startsWith("glass-")) {
    if (preset === "glass-light" || preset === "glass-colored") return "card-glass";
    if (preset === "glass-rainbow") return "card-glass-aurora";
    return `card-${preset}`;
  }
  if (preset.startsWith("3d")) return "card-3d card-3d-shadow";
  if (preset === "gradient-border" || preset === "animated-border") return "card-animated-border";
  if (preset === "holographic") return "card-holographic";
  return `card-${preset}`;
}

function hoverExtendedClass(preset?: HoverPresetExtended): string {
  if (!preset || preset === "none") return "";
  switch (preset) {
    case "lift":
      return "hover-lift";
    case "glow":
      return "hover-glow";
    case "underline":
      return "hover-underline";
    case "scale":
      return "hover-scale";
    case "brighten":
      return "hover-brighten";
    case "darken":
      return "hover-darken";
    case "rotate-3d":
      return "hover-rotate-3d";
    default:
      return `hover-${preset}`;
  }
}

function hasTypographyOverrides(tokens?: CmsTokens): boolean {
  const typography = tokens?.typography as any;
  if (!typography || typeof typography !== "object") return false;
  if (typography.family) return true;
  if (typography.size && typography.size !== "base") return true;
  if (typography.align && typography.align !== "left") return true;
  if (typography.weight && typography.weight !== "normal") return true;
  if (typography.color && typography.color !== "default") return true;
  if (typography.colorCustom) return true;
  if (typography.lineHeight) return true;
  if (typography.letterSpacing) return true;
  if (typography.decoration) return true;
  if (typography.transform) return true;
  if (typography.truncate) return true;
  if (typography.lineClamp) return true;
  return false;
}

export function tokensToClassName(tokens?: CmsTokens): string {
  if (!tokens) return "";
  const parts: string[] = [];

  // layout
  if (tokens.layout?.display) parts.push(displayMap[tokens.layout.display]);

  const display = tokens.layout?.display;
  if (display === "flex" || display === "inline-flex") {
    const fx = tokens.layout?.flex;
    if (fx?.dir) parts.push(flexDirMap[fx.dir]);
    if (fx?.wrap) parts.push(flexWrapMap[fx.wrap]);
    if (fx?.justify) parts.push(justifyMap[fx.justify]);
    if (fx?.items) parts.push(itemsMap[fx.items]);
    if (fx?.content) parts.push(contentMap[fx.content]);
  }

  if (display === "grid") {
    const gr = tokens.layout?.grid;
    if (gr?.cols) parts.push(gridColsMap[gr.cols]);
    if (gr?.rows) parts.push(gridRowsMap[gr.rows]);
    if (gr?.justifyItems) parts.push(justifyItemsMap[gr.justifyItems]);
    if (gr?.placeItems) parts.push(placeItemsMap[gr.placeItems]);
    if (gr?.flow) parts.push(gridFlowMap[gr.flow]);
  }

  if (tokens.layout?.position) {
    if (tokens.layout.position === "sticky") {
      const hasOffset = !!(tokens.layout.top || tokens.layout.bottom || tokens.layout.left || tokens.layout.right);
      parts.push(hasOffset ? "sticky" : positionMap.sticky);
    } else {
      parts.push(positionMap[tokens.layout.position]);
    }
  }
  if (tokens.layout?.zIndex) parts.push(tokens.layout.zIndex === "auto" ? "z-auto" : `z-${tokens.layout.zIndex}`);
  if (tokens.layout?.overflow) parts.push(overflowMap[tokens.layout.overflow]);
  if (tokens.layout?.overflowX) parts.push(overflowMap[tokens.layout.overflowX].replace(/^overflow-/, "overflow-x-"));
  if (tokens.layout?.overflowY) parts.push(overflowMap[tokens.layout.overflowY].replace(/^overflow-/, "overflow-y-"));

  // size
  if (tokens.size?.maxW) parts.push(maxWMap[tokens.size.maxW]);

  // spacing
  if (tokens.spacing?.padding) parts.push(paddingMap[tokens.spacing.padding]);
  if (tokens.spacing?.paddingX) parts.push(paddingMap[tokens.spacing.paddingX].replace(/^p-/, "px-"));
  if (tokens.spacing?.paddingY) parts.push(paddingMap[tokens.spacing.paddingY].replace(/^p-/, "py-"));
  if (tokens.spacing?.paddingTop) parts.push(paddingMap[tokens.spacing.paddingTop].replace(/^p-/, "pt-"));
  if (tokens.spacing?.paddingBottom) parts.push(paddingMap[tokens.spacing.paddingBottom].replace(/^p-/, "pb-"));
  if (tokens.spacing?.gap) parts.push(gapMap[tokens.spacing.gap]);
  if (tokens.spacing?.gapX) parts.push(gapMap[tokens.spacing.gapX].replace(/^gap-/, "gap-x-"));
  if (tokens.spacing?.gapY) parts.push(gapMap[tokens.spacing.gapY].replace(/^gap-/, "gap-y-"));
  if (tokens.spacing?.margin) parts.push(marginMap[tokens.spacing.margin]);
  if (tokens.spacing?.marginX) parts.push(marginMap[tokens.spacing.marginX].replace(/^m-/, "mx-"));
  if (tokens.spacing?.marginY) parts.push(marginMap[tokens.spacing.marginY].replace(/^m-/, "my-"));
  if (tokens.spacing?.marginTop) parts.push(marginMap[tokens.spacing.marginTop].replace(/^m-/, "mt-"));
  if (tokens.spacing?.marginBottom) parts.push(marginMap[tokens.spacing.marginBottom].replace(/^m-/, "mb-"));

  // typography
  const typography = tokens.typography;
  if (typography?.family) {
    parts.push(fontFamilyMap[typography.family]);
    parts.push("cms-typography-family-override");
  }
  if (typography?.size) {
    parts.push(textSizeMap[typography.size]);
    if (typography.size !== "base") parts.push("cms-typography-size-override");
  }
  if (typography?.align) {
    parts.push(textAlignMap[typography.align]);
    if (typography.align !== "left") parts.push("cms-typography-align-override");
  }
  if (typography?.weight) {
    parts.push(fontWeightMap[typography.weight]);
    if (typography.weight !== "normal") parts.push("cms-typography-weight-override");
  }
  if (typography?.color) {
    parts.push(textColorMap[typography.color]);
    if (typography.color !== "default") parts.push("cms-typography-color-override");
  }
  if (typography?.lineHeight) {
    parts.push(lineHeightMap[typography.lineHeight]);
    if (typography.lineHeight !== "normal") parts.push("cms-typography-lineheight-override");
  }
  if (typography?.letterSpacing) {
    parts.push(letterSpacingMap[typography.letterSpacing]);
    if (typography.letterSpacing !== "normal") parts.push("cms-typography-letterspacing-override");
  }
  if (typography?.decoration) {
    if (typography.decoration === "underline") {
      parts.push("underline");
      parts.push("cms-typography-decoration-override");
    } else if (typography.decoration === "overline") {
      parts.push("overline");
      parts.push("cms-typography-decoration-override");
    } else if (typography.decoration === "line-through") {
      parts.push("line-through");
      parts.push("cms-typography-decoration-override");
    } else if (typography.decoration === "none") {
      parts.push("no-underline");
    }
  }
  if (typography?.transform) {
    if (typography.transform === "uppercase") {
      parts.push("uppercase");
      parts.push("cms-typography-transform-override");
    } else if (typography.transform === "lowercase") {
      parts.push("lowercase");
      parts.push("cms-typography-transform-override");
    } else if (typography.transform === "capitalize") {
      parts.push("capitalize");
      parts.push("cms-typography-transform-override");
    } else if (typography.transform === "normal-case") {
      parts.push("normal-case");
    }
  }
  if (typography?.truncate) parts.push("truncate");
  if (typography?.lineClamp) parts.push(`line-clamp-${typography.lineClamp}`);
  if (hasTypographyOverrides(tokens)) parts.push("cms-typography-override");

  // style
  if (tokens.style?.bg) parts.push(bgMap[tokens.style.bg]);
  if (tokens.style?.bgOpacity) parts.push(opacityMap[tokens.style.bgOpacity].replace(/^opacity-/, "bg-opacity-"));
  if (tokens.style?.radius) parts.push(radiusMap[tokens.style.radius]);
  if (tokens.style?.shadow) parts.push(shadowMap[tokens.style.shadow]);
  if (tokens.style?.borderWidth) parts.push(borderWidthMap[tokens.style.borderWidth]);
  if (tokens.style?.borderStyle) parts.push(borderStyleMap[tokens.style.borderStyle]);
  if (tokens.style?.borderColor) parts.push(borderColorMap[tokens.style.borderColor]);

  // motion
  const motionAnim = tokens.motion?.anim ?? tokens.motion?.preset;
  if (motionAnim) parts.push(animMap[motionAnim]);
  if (tokens.motion?.delay !== undefined) {
    const delayKey = tokens.motion.delay as keyof typeof delayMap;
    const delayClass = delayMap[delayKey];
    if (delayClass) parts.push(delayClass);
  }
  if (tokens.motion?.duration !== undefined) {
    const durationKey = tokens.motion.duration as keyof typeof durationMap;
    const durationClass = durationMap[durationKey];
    if (durationClass) parts.push(durationClass);
  }

  // effects
  if (tokens.effects?.opacity) parts.push(opacityMap[tokens.effects.opacity]);
  if (tokens.effects?.blur) parts.push(blurMap[tokens.effects.blur]);
  if (tokens.effects?.backdropBlur) parts.push(backdropBlurMap[tokens.effects.backdropBlur]);
  if (tokens.effects?.backdropBrightness) parts.push(`backdrop-brightness-${tokens.effects.backdropBrightness}`);
  if (tokens.effects?.grayscale) parts.push("grayscale");
  if (tokens.effects?.invert) parts.push("invert");
  if (tokens.effects?.sepia) parts.push("sepia");
  if (tokens.effects?.mixBlend) parts.push(`mix-blend-${tokens.effects.mixBlend}`);

  // extended effects
  const textEffectCls = textEffectClass(tokens.textEffect);
  if (textEffectCls) {
    parts.push(textEffectCls);
    parts.push("cms-text-effects");
  }
  const cardTemplateCls = cardTemplateClass(tokens.cardTemplate);
  if (cardTemplateCls) parts.push(cardTemplateCls);
  const hoverExtendedCls = hoverExtendedClass(tokens.hoverExtended);
  if (hoverExtendedCls) parts.push(hoverExtendedCls);
  if (!hoverExtendedCls && tokens.state?.hover) parts.push(hoverMap[tokens.state.hover]);

  // custom colors (inline vars)
  const styleTokens = tokens.style as (TwTokens["style"] & { bgColor?: string; bgCustom?: string }) | undefined;
  const customBg = resolveCustomBackground(styleTokens?.bgCustom ?? styleTokens?.bgColor ?? styleTokens?.bg);
  const customText = resolveCustomColor(tokens.typography?.colorCustom ?? tokens.typography?.color);
  if (customBg?.type === "color") parts.push("cms-inline-bg");
  if (customText) {
    parts.push("cms-inline-text");
    parts.push("cms-typography-color-override");
  }

  return parts.filter(Boolean).join(" ").trim();
}

export function tokensToInlineStyle(tokens?: CmsTokens): CSSProperties | undefined {
  if (!tokens) return undefined;
  const style: CSSProperties = {};
  const styleTokens = tokens.style as (TwTokens["style"] & { bgColor?: string; bgCustom?: string; borderCustomColor?: string }) | undefined;
  const textTokens = tokens.typography as (TwTokens["typography"] & { colorCustom?: string }) | undefined;
  const motionTokens = tokens.motion;
  const spacingTokens = tokens.spacing;
  const sizeTokens = tokens.size;
  const customBg = resolveCustomBackground(styleTokens?.bgCustom ?? styleTokens?.bgColor ?? styleTokens?.bg);
  const textColor = resolveCustomColor(textTokens?.colorCustom ?? textTokens?.color);
  const borderColor = resolveCustomColor(styleTokens?.borderCustomColor ?? styleTokens?.borderColor);

  if (customBg?.type === "gradient") {
    style.backgroundImage = customBg.value;
    style.backgroundColor = "transparent";
    (style as Record<string, string>)["--cms-bg-gradient"] = customBg.value;
  } else if (customBg?.type === "color") {
    style.backgroundColor = customBg.value;
    style.backgroundImage = "none";
    (style as Record<string, string>)["--cms-bg-color"] = customBg.value;
  }
  if (textColor) {
    style.color = textColor;
    (style as Record<string, string>)["--cms-text-color"] = textColor;
  }
  if (borderColor) {
    style.borderColor = borderColor;
    (style as Record<string, string>)["--cms-border-color"] = borderColor;
  }

  // spacing (inline to reliably override hard-coded padding/margins)
  const padding = resolvePresetSpacingValue(PADDING_VALUE_MAP, spacingTokens?.padding);
  if (padding !== undefined) style.padding = padding;
  const paddingX = resolvePresetSpacingValue(PADDING_VALUE_MAP, spacingTokens?.paddingX);
  if (paddingX !== undefined) {
    style.paddingLeft = paddingX;
    style.paddingRight = paddingX;
  }
  const paddingY = resolvePresetSpacingValue(PADDING_VALUE_MAP, spacingTokens?.paddingY);
  if (paddingY !== undefined) {
    style.paddingTop = paddingY;
    style.paddingBottom = paddingY;
  }
  const paddingTop = resolvePresetSpacingValue(PADDING_VALUE_MAP, spacingTokens?.paddingTop);
  if (paddingTop !== undefined) style.paddingTop = paddingTop;
  const paddingBottom = resolvePresetSpacingValue(PADDING_VALUE_MAP, spacingTokens?.paddingBottom);
  if (paddingBottom !== undefined) style.paddingBottom = paddingBottom;

  const gap = resolvePresetSpacingValue(GAP_VALUE_MAP, spacingTokens?.gap);
  if (gap !== undefined) style.gap = gap;
  const gapX = resolvePresetSpacingValue(GAP_VALUE_MAP, spacingTokens?.gapX);
  if (gapX !== undefined) style.columnGap = gapX;
  const gapY = resolvePresetSpacingValue(GAP_VALUE_MAP, spacingTokens?.gapY);
  if (gapY !== undefined) style.rowGap = gapY;

  const margin = resolvePresetSpacingValue(MARGIN_VALUE_MAP, spacingTokens?.margin);
  if (margin !== undefined) style.margin = margin;
  const marginX = resolvePresetSpacingValue(MARGIN_VALUE_MAP, spacingTokens?.marginX);
  if (marginX !== undefined) {
    style.marginLeft = marginX;
    style.marginRight = marginX;
  }
  const marginY = resolvePresetSpacingValue(MARGIN_VALUE_MAP, spacingTokens?.marginY);
  if (marginY !== undefined) {
    style.marginTop = marginY;
    style.marginBottom = marginY;
  }
  const marginTop = resolvePresetSpacingValue(MARGIN_VALUE_MAP, spacingTokens?.marginTop);
  if (marginTop !== undefined) style.marginTop = marginTop;
  const marginBottom = resolvePresetSpacingValue(MARGIN_VALUE_MAP, spacingTokens?.marginBottom);
  if (marginBottom !== undefined) style.marginBottom = marginBottom;

  if (sizeTokens?.width) style.width = resolveSizeValue(sizeTokens.width, "width");
  if (sizeTokens?.minW) style.minWidth = resolveSizeValue(sizeTokens.minW, "width");
  if (sizeTokens?.height) style.height = resolveSizeValue(sizeTokens.height, "height");
  if (sizeTokens?.minH) style.minHeight = resolveSizeValue(sizeTokens.minH, "height");
  if (sizeTokens?.maxH) style.maxHeight = resolveSizeValue(sizeTokens.maxH, "height");
  if (tokens.layout?.top !== undefined) {
    const v = resolveOffsetValue(tokens.layout.top);
    if (v !== undefined) style.top = v;
  }
  if (tokens.layout?.right !== undefined) {
    const v = resolveOffsetValue(tokens.layout.right);
    if (v !== undefined) style.right = v;
  }
  if (tokens.layout?.bottom !== undefined) {
    const v = resolveOffsetValue(tokens.layout.bottom);
    if (v !== undefined) style.bottom = v;
  }
  if (tokens.layout?.left !== undefined) {
    const v = resolveOffsetValue(tokens.layout.left);
    if (v !== undefined) style.left = v;
  }
  if (typeof motionTokens?.duration === "number" && Number.isFinite(motionTokens.duration)) {
    style.animationDuration = motionTokens.duration >= 10 ? `${motionTokens.duration}ms` : `${motionTokens.duration}s`;
  }
  if (typeof motionTokens?.delay === "number" && Number.isFinite(motionTokens.delay)) {
    style.animationDelay = motionTokens.delay >= 10 ? `${motionTokens.delay}ms` : `${motionTokens.delay}s`;
  }
  if (tokens.sticky?.enabled) {
    style.position = "sticky";
    style.top = tokens.sticky?.top ?? "0";
    if (typeof tokens.sticky?.zIndex === "number") style.zIndex = tokens.sticky.zIndex;
  }
  return Object.keys(style).length ? style : undefined;
}
