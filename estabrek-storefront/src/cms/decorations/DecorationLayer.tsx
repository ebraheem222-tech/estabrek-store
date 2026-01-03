// ============================================================
// ESTABREK DECORATION LAYER
// ============================================================
// React components for rendering SVG decorations on sections
// Supports placement, colors, blur, and transforms
// ============================================================

"use client";

import React from "react";
import { SHAPES, DECOR_SIZE_HEIGHTS, DECOR_COLOR_TO_CSS, DECOR_BLUR_VALUES } from "../shapes/shapeRegistry";
import type { DecorLayer, DecorPlacementPreset, DecorSizePreset, DecorColorPreset, DecorBlurPreset } from "../style/tokens";

// ============================================================
// TYPES
// ============================================================

export type SectionDecorationsConfig = {
  before?: DecorLayer;
  after?: DecorLayer;
};

// ============================================================
// POSITION STYLES
// ============================================================

function getPositionStyles(placement: DecorPlacementPreset): React.CSSProperties {
  switch (placement) {
    case "top":
      return {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        transform: "translateY(-100%) scaleY(-1)",
        transformOrigin: "bottom",
      };
    case "bottom":
      return {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        transform: "translateY(100%)",
        transformOrigin: "top",
      };
    case "left":
      return {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        height: "100%",
        transform: "translateX(-100%) rotate(90deg)",
        transformOrigin: "right center",
      };
    case "right":
      return {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        height: "100%",
        transform: "translateX(100%) rotate(-90deg)",
        transformOrigin: "left center",
      };
    case "background":
    default:
      return {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
      };
  }
}

function resolveOffsetValue(value?: number | string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

function isGradientValue(value?: string): boolean {
  if (!value) return false;
  return /gradient\(/i.test(value);
}

// ============================================================
// DECORATION LAYER COMPONENT
// ============================================================

interface DecorationLayerProps {
  config: DecorLayer;
  className?: string;
}

export const DecorationLayer: React.FC<DecorationLayerProps> = ({
  config,
  className = "",
}) => {
  if (!config.shape || config.shape === "none") return null;

  const shape = SHAPES[config.shape];
  if (!shape) return null;

  const placement = config.placement || "bottom";
  const size = config.size || "md";
  const colorPreset = config.color || "accent";
  const opacity = config.opacity || "100";
  const blur = config.blur || "0";
  const fillMode = config.fill;
  const flipX = config.flipX ?? false;
  const flipY = config.flipY ?? false;
  const zIndex = config.zIndex ?? 0;
  const offsetX = resolveOffsetValue(config.offsetX);
  const offsetY = resolveOffsetValue(config.offsetY);
  const rotate = Number.isFinite(config.rotate as number) ? `rotate(${Number(config.rotate)}deg)` : undefined;
  const scale = Number.isFinite(config.scale as number) ? `scale(${Number(config.scale)})` : undefined;

  // Get height based on size preset
  const height = DECOR_SIZE_HEIGHTS[size] || 100;

  const customColor = typeof config.customColor === "string" ? config.customColor.trim() : "";
  const baseColor =
    customColor ||
    (colorPreset === "custom" ? "" : DECOR_COLOR_TO_CSS[colorPreset]) ||
    DECOR_COLOR_TO_CSS.accent;
  const resolvedColor = baseColor || DECOR_COLOR_TO_CSS.accent;
  const baseIsGradient = isGradientValue(resolvedColor);
  const resolvedFillMode = fillMode ?? (baseIsGradient ? "gradient" : "solid");
  const wantsGradient = resolvedFillMode === "gradient";
  const gradientValue = wantsGradient
    ? baseIsGradient
      ? resolvedColor
      : `linear-gradient(135deg, ${resolvedColor}, ${resolvedColor})`
    : "";
  const solidColor = baseIsGradient ? parseGradientColor(resolvedColor, 0) : resolvedColor;
  const isGradient = wantsGradient && isGradientValue(gradientValue);
  const gradientId = isGradient ? `gradient-${config.shape}-${placement}` : null;

  // Position styles
  const positionStyles = getPositionStyles(placement);
  const baseTransform = positionStyles.transform as string | undefined;
  const translate = offsetX || offsetY ? `translate(${offsetX ?? "0px"}, ${offsetY ?? "0px"})` : undefined;
  const combinedTransform = [baseTransform, translate, rotate, scale].filter(Boolean).join(" ");

  // Transform for flipping
  const transforms: string[] = [];
  if (flipX) transforms.push("scaleX(-1)");
  if (flipY) transforms.push("scaleY(-1)");
  const flipTransform = transforms.length > 0 ? transforms.join(" ") : undefined;

  // Blur filter
  const blurValue = DECOR_BLUR_VALUES[blur] || "0";
  const filterStyle = blurValue !== "0" ? `blur(${blurValue})` : undefined;
  const opacityValue = Math.max(0, Math.min(100, Number(opacity))) / 100;
  const layerOpacity = opacityValue * (resolvedFillMode === "glass" ? 0.6 : 1);

  const baseStyle: React.CSSProperties = {
    ...positionStyles,
    transform: combinedTransform || undefined,
  };

  // Handle special shapes
  if (config.shape === "noise") {
    const noiseTransform = [combinedTransform, flipTransform].filter(Boolean).join(" ");
    return (
      <span
        className={`pointer-events-none ${className}`}
        style={{
          ...baseStyle,
          transform: noiseTransform || undefined,
          zIndex,
          opacity: layerOpacity,
          filter: filterStyle,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
        aria-hidden="true"
      />
    );
  }

  if (config.shape === "gradient-fade") {
    const gradientColor = config.customColor || (colorPreset === "white" ? "255,255,255" : colorPreset === "black" ? "0,0,0" : "0,0,0");
    const direction = placement === "top" ? "to bottom" : placement === "bottom" ? "to top" : placement === "left" ? "to right" : "to left";
    
    const fadeTransform = [combinedTransform, flipTransform].filter(Boolean).join(" ");
    return (
      <span
        className={`pointer-events-none ${className}`}
        style={{
          ...baseStyle,
          transform: fadeTransform || undefined,
          height: placement === "top" || placement === "bottom" ? height : "100%",
          width: placement === "left" || placement === "right" ? height : "100%",
          zIndex,
          opacity: layerOpacity,
          filter: filterStyle,
          background: `linear-gradient(${direction}, rgba(${gradientColor}, 0) 0%, rgba(${gradientColor}, 1) 100%)`,
        }}
        aria-hidden="true"
      />
    );
  }

  // Determine dimensions based on placement
  const isVertical = placement === "left" || placement === "right";
  const isBackground = placement === "background";
  const svgHeight = isVertical || isBackground ? "100%" : height;
  const svgWidth = "100%";
  const usesStroke = config.shape === "lines-horizontal" || config.shape === "lines-diagonal";
  const paint = isGradient && gradientId ? `url(#${gradientId})` : solidColor;

  return (
    <span
      className={`pointer-events-none overflow-hidden ${className}`}
      style={{
        ...baseStyle,
        height: isBackground ? "100%" : svgHeight,
        zIndex,
        opacity: layerOpacity,
        filter: filterStyle,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox={shape.viewBox}
        preserveAspectRatio="none"
        style={{
          width: svgWidth,
          height: svgHeight,
          display: "block",
          transform: flipTransform,
        }}
      >
        {/* Define gradient if needed */}
        {isGradient && gradientId && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {/* Parse gradient stops from CSS gradient */}
              <stop offset="0%" stopColor={parseGradientColor(gradientValue, 0)} />
              <stop offset="100%" stopColor={parseGradientColor(gradientValue, 1)} />
            </linearGradient>
          </defs>
        )}
        <path
          d={shape.d}
          fill={usesStroke ? "none" : paint}
          stroke={usesStroke ? paint : undefined}
          strokeWidth={usesStroke ? 2 : undefined}
          strokeLinecap={usesStroke ? "round" : undefined}
          strokeLinejoin={usesStroke ? "round" : undefined}
        />
      </svg>
    </span>
  );
};

// ============================================================
// SECTION DECORATIONS COMPONENT
// ============================================================

interface SectionDecorationsProps {
  decorations?: SectionDecorationsConfig;
  className?: string;
}

export const SectionDecorations: React.FC<SectionDecorationsProps> = ({
  decorations,
  className = "",
}) => {
  if (!decorations) return null;

  return (
    <>
      {decorations.before && (
        <DecorationLayer
          config={decorations.before}
          className={className}
        />
      )}
      {decorations.after && (
        <DecorationLayer
          config={decorations.after}
          className={className}
        />
      )}
    </>
  );
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function parseGradientColor(gradient: string, stopIndex: 0 | 1): string {
  // Simple parser for linear-gradient colors
  // e.g., "linear-gradient(135deg, #f59e0b, #ef4444)"
  const match = gradient.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^)]+)\)/);
  if (match) {
    return stopIndex === 0 ? match[1].trim() : match[2].trim();
  }
  return stopIndex === 0 ? "#6FA6A1" : "#5B918C";
}

// ============================================================
// DECORATION PRESETS
// ============================================================

export const DEFAULT_WAVE_TOP: DecorLayer = {
  shape: "wave",
  placement: "top",
  size: "md",
  color: "accent",
  opacity: "100",
};

export const DEFAULT_WAVE_BOTTOM: DecorLayer = {
  shape: "wave",
  placement: "bottom",
  size: "md",
  color: "accent",
  opacity: "100",
};

export const DEFAULT_BLOB_CORNER: DecorLayer = {
  shape: "blob-corner",
  placement: "background",
  size: "xl",
  color: "accent",
  opacity: "20",
};

export const DEFAULT_DOTS_BACKGROUND: DecorLayer = {
  shape: "dots-grid",
  placement: "background",
  size: "xl",
  color: "muted",
  opacity: "30",
};

// Preset combinations
export const DECORATION_PRESETS: Record<string, SectionDecorationsConfig> = {
  none: {},
  waveTop: { before: DEFAULT_WAVE_TOP },
  waveBottom: { after: DEFAULT_WAVE_BOTTOM },
  waveBoth: {
    before: { ...DEFAULT_WAVE_TOP, flipY: true },
    after: DEFAULT_WAVE_BOTTOM,
  },
  blobAccent: {
    before: { shape: "blob", placement: "background", size: "lg", color: "accent", opacity: "20" },
  },
  diagonalGold: {
    after: { shape: "diagonal", placement: "bottom", size: "lg", color: "gold" },
  },
  dotsPattern: {
    before: { shape: "dots-grid", placement: "background", size: "xl", color: "muted", opacity: "30" },
  },
  noiseTexture: {
    before: { shape: "noise", placement: "background", size: "xl", color: "white", opacity: "10" },
  },
  curveElegant: {
    after: { shape: "curve-deep", placement: "bottom", size: "lg", color: "cream" },
  },
  zigzagPlayful: {
    after: { shape: "zigzag", placement: "bottom", size: "md", color: "accent" },
  },
  triangleModern: {
    after: { shape: "triangle", placement: "bottom", size: "lg", color: "gold" },
  },
  gradientFade: {
    before: { shape: "gradient-fade", placement: "top", size: "lg", color: "black", opacity: "50" },
    after: { shape: "gradient-fade", placement: "bottom", size: "lg", color: "black", opacity: "50" },
  },
};
