import React from "react";
import {
  SHAPES,
  DECOR_SIZE_HEIGHTS,
  DECOR_COLOR_TO_CSS,
  DECOR_BLUR_VALUES,
} from "../shapes/shapeRegistry";
import type {
  DecorLayer,
  DecorPlacementPreset,
  DecorSizePreset,
  DecorColorPreset,
  DecorBlurPreset,
} from "../style/tokens";

export type SectionDecorationsConfig = {
  before?: DecorLayer;
  after?: DecorLayer;
};

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

  const placement = (config.placement || "bottom") as DecorPlacementPreset;
  const size = (config.size || "md") as DecorSizePreset;
  const colorPreset = (config.color || "accent") as DecorColorPreset;
  const opacity = config.opacity || "100";
  const blur = (config.blur || "0") as DecorBlurPreset;
  const fillMode = config.fill;
  const flipX = config.flipX ?? false;
  const flipY = config.flipY ?? false;
  const zIndex = config.zIndex ?? 0;
  const offsetX = resolveOffsetValue(config.offsetX);
  const offsetY = resolveOffsetValue(config.offsetY);
  const rotate = Number.isFinite(config.rotate as number) ? `rotate(${Number(config.rotate)}deg)` : undefined;
  const scale = Number.isFinite(config.scale as number) ? `scale(${Number(config.scale)})` : undefined;

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

  const positionStyles = getPositionStyles(placement);
  const baseTransform = positionStyles.transform as string | undefined;
  const translate = offsetX || offsetY ? `translate(${offsetX ?? "0px"}, ${offsetY ?? "0px"})` : undefined;
  const combinedTransform = [baseTransform, translate, rotate, scale].filter(Boolean).join(" ");

  const transforms: string[] = [];
  if (flipX) transforms.push("scaleX(-1)");
  if (flipY) transforms.push("scaleY(-1)");
  const flipTransform = transforms.length > 0 ? transforms.join(" ") : undefined;

  const blurValue = DECOR_BLUR_VALUES[blur] || "0";
  const filterStyle = blurValue !== "0" ? `blur(${blurValue})` : undefined;
  const opacityValue = Math.max(0, Math.min(100, Number(opacity))) / 100;
  const layerOpacity = opacityValue * (resolvedFillMode === "glass" ? 0.6 : 1);

  const baseStyle: React.CSSProperties = {
    ...positionStyles,
    transform: combinedTransform || undefined,
  };

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
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
        }}
        aria-hidden="true"
      />
    );
  }

  if (config.shape === "gradient-fade") {
    const gradientColor =
      config.customColor ||
      (colorPreset === "white" ? "255,255,255" : colorPreset === "black" ? "0,0,0" : "0,0,0");
    const direction =
      placement === "top"
        ? "to bottom"
        : placement === "bottom"
          ? "to top"
          : placement === "left"
            ? "to right"
            : "to left";

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

  const isVertical = placement === "left" || placement === "right";
  const svgHeight = isVertical ? "100%" : height;
  const svgWidth = "100%";

  return (
    <span
      className={`pointer-events-none overflow-hidden ${className}`}
      style={{
        ...baseStyle,
        height: placement === "background" ? "100%" : svgHeight,
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
        {isGradient && gradientId && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={parseGradientColor(gradientValue, 0)} />
              <stop offset="100%" stopColor={parseGradientColor(gradientValue, 1)} />
            </linearGradient>
          </defs>
        )}
        <path d={shape.d} fill={isGradient && gradientId ? `url(#${gradientId})` : solidColor} />
      </svg>
    </span>
  );
};

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
      {decorations.before ? (
        <DecorationLayer config={decorations.before} className={className} />
      ) : null}
      {decorations.after ? (
        <DecorationLayer config={decorations.after} className={className} />
      ) : null}
    </>
  );
};

function parseGradientColor(gradient: string, stopIndex: 0 | 1): string {
  const match = gradient.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^)]+)\)/);
  if (match) {
    return stopIndex === 0 ? match[1].trim() : match[2].trim();
  }
  return stopIndex === 0 ? "#6FA6A1" : "#5B918C";
}
