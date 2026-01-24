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
  const placement = placementClass(config?.placement);

  return (
    <div className={cls("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <ShapeComponent
        className={placement}
        color={config?.color}
        size={config?.size}
        speed={config?.speed}
        opacity={config?.opacity}
      />
    </div>
  );
}

export default AnimatedShapeLayer;
