import type { CSSProperties } from "react";
import type { TwTokens } from "./tokens";
import {
  bgMap,
  displayMap,
  positionMap,
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
  fontWeightMap,
  textColorMap,
  borderWidthMap,
  borderStyleMap,
  borderColorMap,
  maxWMap,
  flexDirMap,
  flexWrapMap,
  justifyMap,
  itemsMap,
  gridColsMap,
  gridRowsMap,
  justifyItemsMap,
  placeItemsMap,
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

export function tokensToClassName(tokens?: TwTokens): string {
  if (!tokens) return "";
  const parts: string[] = [];
  const styleTokens = tokens.style as (TwTokens["style"] & { bgColor?: string; bgCustom?: string }) | undefined;

  // layout
  if (tokens.layout?.display) parts.push(displayMap[tokens.layout.display]);

  // advanced flex/grid settings
  const display = tokens.layout?.display;
  if (display === "flex" || display === "inline-flex") {
    const fx = tokens.layout?.flex;
    if (fx?.dir) parts.push(flexDirMap[fx.dir]);
    if (fx?.wrap) parts.push(flexWrapMap[fx.wrap]);
    if (fx?.justify) parts.push(justifyMap[fx.justify]);
    if (fx?.items) parts.push(itemsMap[fx.items]);
  }

  if (display === "grid") {
    const gr = tokens.layout?.grid;
    if (gr?.cols) parts.push(gridColsMap[gr.cols]);
    if (gr?.rows) parts.push(gridRowsMap[gr.rows]);
    if (gr?.justifyItems) parts.push(justifyItemsMap[gr.justifyItems]);
    if (gr?.placeItems) parts.push(placeItemsMap[gr.placeItems]);
  }

  if (tokens.layout?.position) parts.push(positionMap[tokens.layout.position]);
  if (tokens.layout?.zIndex) parts.push(tokens.layout.zIndex === "auto" ? "z-auto" : `z-${tokens.layout.zIndex}`);

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
  if (tokens.typography?.size) parts.push(textSizeMap[tokens.typography.size]);
  if (tokens.typography?.align) parts.push(textAlignMap[tokens.typography.align]);
  if (tokens.typography?.weight) parts.push(fontWeightMap[tokens.typography.weight]);
  if (tokens.typography?.color) parts.push(textColorMap[tokens.typography.color]);

  // style
  if (tokens.style?.bg) parts.push(bgMap[tokens.style.bg]);
  if (tokens.style?.radius) parts.push(radiusMap[tokens.style.radius]);
  if (tokens.style?.shadow) parts.push(shadowMap[tokens.style.shadow]);
  if (tokens.style?.borderWidth) parts.push(borderWidthMap[tokens.style.borderWidth]);
  if (tokens.style?.borderStyle) parts.push(borderStyleMap[tokens.style.borderStyle]);
  if (tokens.style?.borderColor) parts.push(borderColorMap[tokens.style.borderColor]);

  // state
  if (tokens.state?.hover) parts.push(hoverMap[tokens.state.hover]);

  // motion
  const motionAnim = tokens.motion?.anim ?? tokens.motion?.preset;
  if (motionAnim) parts.push(animMap[motionAnim]);
  if (tokens.motion?.delay !== undefined) parts.push(delayMap[tokens.motion.delay]);
  if (tokens.motion?.duration) parts.push(durationMap[tokens.motion.duration]);

  // custom colors (inline vars)
  const customBg = resolveCustomBackground(styleTokens?.bgCustom ?? styleTokens?.bgColor ?? styleTokens?.bg);
  const customText = resolveCustomColor(tokens.typography?.colorCustom ?? tokens.typography?.color);
  if (customBg?.type === "color") parts.push("cms-inline-bg");
  if (customText) parts.push("cms-inline-text");

  return parts.filter(Boolean).join(" ").trim();
}

export function tokensToInlineStyle(tokens?: TwTokens): CSSProperties | undefined {
  if (!tokens) return undefined;
  const style: CSSProperties = {};
  const styleTokens = tokens.style as (TwTokens["style"] & { bgColor?: string; bgCustom?: string; borderCustomColor?: string }) | undefined;
  const textTokens = tokens.typography as (TwTokens["typography"] & { colorCustom?: string }) | undefined;
  const motionTokens = tokens.motion;
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
  if (typeof motionTokens?.duration === "number" && Number.isFinite(motionTokens.duration)) {
    style.animationDuration = motionTokens.duration >= 10 ? `${motionTokens.duration}ms` : `${motionTokens.duration}s`;
  }
  if (typeof motionTokens?.delay === "number" && Number.isFinite(motionTokens.delay)) {
    style.animationDelay = motionTokens.delay >= 10 ? `${motionTokens.delay}ms` : `${motionTokens.delay}s`;
  }
  return Object.keys(style).length ? style : undefined;
}
