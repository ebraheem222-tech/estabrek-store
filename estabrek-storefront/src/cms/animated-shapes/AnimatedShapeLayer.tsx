import React from "react";
import type { AnimatedShapeConfig } from "../style/tokens";
import { animatedShapeComponents, additionalShapeComponents } from "./index";

const SHAPE_COMPONENTS: Record<string, React.FC<any>> = {
  ...animatedShapeComponents,
  ...additionalShapeComponents,
};

function cls(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

function placementClass(placement?: AnimatedShapeConfig["placement"]) {
  switch (placement) {
    case "top-left":
      return "top-0 left-0";
    case "top-right":
      return "top-0 right-0";
    case "bottom-left":
      return "bottom-0 left-0";
    case "bottom-right":
      return "bottom-0 right-0";
    case "center":
      return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    case "background":
    default:
      return "inset-0";
  }
}

function placementOrigin(placement?: AnimatedShapeConfig["placement"]) {
  switch (placement) {
    case "top-left":
      return "top left";
    case "top-right":
      return "top right";
    case "bottom-left":
      return "bottom left";
    case "bottom-right":
      return "bottom right";
    case "center":
      return "center";
    case "background":
    default:
      return "center";
  }
}

const BOX_SIZES: Record<NonNullable<AnimatedShapeConfig["size"]>, string> = {
  sm: "clamp(180px, 26vw, 260px)",
  md: "clamp(240px, 34vw, 360px)",
  lg: "clamp(320px, 44vw, 480px)",
  xl: "clamp(420px, 56vw, 640px)",
};

const SIZE_SCALE: Record<NonNullable<AnimatedShapeConfig["size"]>, number> = {
  sm: 0.75,
  md: 1,
  lg: 1.2,
  xl: 1.45,
};

const BLUR_PX: Record<string, number> = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  "3xl": 32,
};

export function AnimatedShapeLayer({
  config,
  className,
}: {
  config?: AnimatedShapeConfig;
  className?: string;
}) {
  const themeId = typeof config?.themeId === "string" ? config.themeId.trim() : "";
  if (!themeId) return null;
  const ShapeComponent = SHAPE_COMPONENTS[themeId];
  if (!ShapeComponent) return null;
  const placementKey = config?.placement ?? "background";
  const placement = placementClass(placementKey);
  const sizeKey = config?.size ?? "md";
  const blurKey = typeof config?.blur === "string" ? config.blur : "none";
  const blurPx = BLUR_PX[blurKey] ?? 0;
  const isBackground = placementKey === "background";
  const boxSize = BOX_SIZES[sizeKey];
  const scale = SIZE_SCALE[sizeKey] ?? 1;
  const layerClass = config?.layer === "above" ? "z-20" : "z-0";

  return (
    <div className={cls("pointer-events-none absolute inset-0 overflow-visible", className, layerClass)} aria-hidden="true">
      <div
        className={cls("absolute", placement)}
        style={{
          width: isBackground ? "100%" : boxSize,
          height: isBackground ? "100%" : boxSize,
          transform: isBackground ? `scale(${scale})` : undefined,
          transformOrigin: placementOrigin(placementKey),
          filter: blurPx ? `blur(${blurPx}px)` : undefined,
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
        <ShapeComponent
          className="absolute inset-0"
          color={config?.color}
          size={config?.size}
          speed={config?.speed}
          opacity={config?.opacity}
        />
      </div>
    </div>
  );
}

export default AnimatedShapeLayer;
