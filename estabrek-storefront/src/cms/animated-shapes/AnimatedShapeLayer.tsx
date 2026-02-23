import React from "react";
import type { AnimatedShapeConfig } from "../style/tokens";
import {
  animatedShapeComponents,
  getAnimatedShapeTheme,
  animationKeyframes,
} from "./AnimatedShapes";
import { additionalShapeComponents } from "./AnimatedShapesExtra";

const SHAPE_COMPONENTS: Record<string, React.FC<any>> = {
  ...animatedShapeComponents,
  ...additionalShapeComponents,
};
const SHAPE_IDS = Object.keys(SHAPE_COMPONENTS);

const SHAPE_THEME_ALIASES: Record<string, string> = {
  "circle-scale": "circle-pulse-glow",
  "circle-rotate": "circle-float-simple",
  "circle-bounce": "circle-float-simple",
  "circle-fade": "circle-float-simple",
  "circles-concentric": "circles-ripple",
  "circles-trail": "circles-multiple",
  "rect-float": "rect-rotate",
  "rect-pulse": "rect-rotate",
  "rect-slide": "rect-rotate",
  "squares-grid": "squares-scatter",
  "squares-cascade": "squares-scatter",
  "squares-rotate": "squares-scatter",
  "rect-3d": "rect-rotate",
  "rect-gradient": "rect-rotate",
  "rect-outline": "rect-rotate",
  "rect-stack": "squares-scatter",
  "rect-morph": "rect-rotate",
  "star-rotate": "star-float",
  "star-pulse": "star-float",
  "star-glow": "star-float",
  "stars-spiral": "stars-scatter",
  "star-burst": "stars-scatter",
  "stars-constellation": "stars-scatter",
  "stars-sparkle": "stars-scatter",
  "triangle-pulse": "triangle-float",
  "triangle-3d": "triangle-rotate",
  "triangles-pattern": "triangles-scatter",
  "triangle-arrow": "triangle-float",
  "triangles-cascade": "triangles-scatter",
  "triangle-pyramid": "triangles-scatter",
  "blob-float": "blob-morph",
  "blob-pulse": "blob-morph",
  "blob-glow": "blob-morph",
  "blob-glass": "blob-morph",
  "blob-neon": "blob-morph",
  "blobs-lava": "blobs-multiple",
  "blob-aurora": "blob-morph",
  "blob-wave": "blob-morph",
  "blob-liquid": "blob-morph",
  "dots-float": "particles-float",
  "dots-pulse": "dots-grid",
  "dots-wave": "particles-float",
  "dots-scatter": "particles-float",
  "particles-rise": "particles-float",
  "particles-fall": "particles-float",
  "particles-explode": "confetti",
  "lines-float": "lines-wave",
  "lines-rotate": "lines-wave",
  "lines-pulse": "lines-wave",
  "lines-grid": "lines-wave",
  "lines-diagonal": "lines-wave",
  "lines-cross": "lines-wave",
  "lines-zigzag": "lines-wave",
  "lines-spiral": "lines-wave",
  "lines-connect": "lines-wave",
  "glass-shapes": "gradient-shapes",
  "outline-shapes": "minimal-shapes",
  "dynamic-shapes": "geometric-mix",
};

const SHAPE_FALLBACKS_BY_TYPE: Record<string, string[]> = {
  circle: ["circles-multiple", "circle-pulse-glow", "circle-float-simple"],
  rectangle: ["squares-scatter", "rect-rotate"],
  star: ["stars-scatter", "star-float"],
  triangle: ["triangles-scatter", "triangle-float"],
  blob: ["blob-morph", "blobs-multiple"],
  dot: ["particles-float", "dots-grid", "confetti"],
  line: ["lines-wave"],
  mixed: ["geometric-mix", "gradient-shapes", "minimal-shapes", "neon-shapes"],
};

function pushUnique(target: string[], ...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue;
    if (!target.includes(value)) target.push(value);
  }
}

function normalizeThemeId(themeId: string): string {
  const raw = themeId.trim();
  if (!raw) return "";
  if (SHAPE_COMPONENTS[raw]) return raw;

  const lower = raw.toLowerCase();
  if (SHAPE_COMPONENTS[lower]) return lower;
  if (SHAPE_THEME_ALIASES[lower]) return lower;

  const lastToken = lower.split(/[|:/\\>]+/).pop()?.trim() ?? lower;
  if (SHAPE_COMPONENTS[lastToken]) return lastToken;
  if (SHAPE_THEME_ALIASES[lastToken]) return lastToken;

  const normalizedSlug = lower
    .replace(/[\u0600-\u06ff]+/g, " ")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (SHAPE_COMPONENTS[normalizedSlug]) return normalizedSlug;
  if (SHAPE_THEME_ALIASES[normalizedSlug]) return normalizedSlug;

  if (/\b(star|stars)\b/.test(lower)) return "stars-scatter";
  if (/\b(triangle|triangles)\b/.test(lower)) return "triangles-scatter";
  if (/\b(square|squares|rect|rectangle|rectangles)\b/.test(lower)) return "squares-scatter";
  if (/\b(dot|dots|particle|particles)\b/.test(lower)) return "particles-float";
  if (/\b(circle|circles)\b/.test(lower)) return "circles-multiple";

  const knownThemeId = getAnimatedShapeTheme(lower)?.id ?? getAnimatedShapeTheme(raw)?.id;
  if (knownThemeId) return knownThemeId;

  const includedId = SHAPE_IDS.find((id) => lower.includes(id));
  return includedId ?? lower;
}

function buildFallbackCandidates(themeId: string): string[] {
  const normalizedId = themeId.trim().toLowerCase();
  const themeMeta = getAnimatedShapeTheme(normalizedId) ?? getAnimatedShapeTheme(themeId);
  const candidates: string[] = [];

  if (normalizedId.startsWith("circle-")) {
    if (normalizedId.includes("pulse")) pushUnique(candidates, "circle-pulse-glow");
    pushUnique(candidates, "circle-float-simple");
  } else if (normalizedId.startsWith("circles-")) {
    if (normalizedId.includes("ripple")) pushUnique(candidates, "circles-ripple");
    if (normalizedId.includes("orbit")) pushUnique(candidates, "circles-orbit");
    pushUnique(candidates, "circles-multiple");
  }

  if (normalizedId.startsWith("rect-") || normalizedId.startsWith("squares-")) {
    if (
      normalizedId.includes("scatter") ||
      normalizedId.includes("grid") ||
      normalizedId.includes("cascade")
    ) {
      pushUnique(candidates, "squares-scatter");
    }
    pushUnique(candidates, "rect-rotate");
  }

  if (normalizedId.startsWith("star-") || normalizedId.startsWith("stars-")) {
    if (
      normalizedId.includes("scatter") ||
      normalizedId.includes("field") ||
      normalizedId.includes("constellation") ||
      normalizedId.includes("sparkle") ||
      normalizedId.includes("spiral") ||
      normalizedId.includes("burst")
    ) {
      pushUnique(candidates, "stars-scatter");
    }
    if (normalizedId.includes("shoot")) pushUnique(candidates, "stars-shooting");
    pushUnique(candidates, "star-float");
  }

  if (normalizedId.startsWith("triangle-") || normalizedId.startsWith("triangles-")) {
    if (
      normalizedId.includes("scatter") ||
      normalizedId.includes("geometric") ||
      normalizedId.includes("pattern") ||
      normalizedId.includes("cascade") ||
      normalizedId.includes("pyramid")
    ) {
      pushUnique(candidates, "triangles-scatter");
    }
    if (normalizedId.includes("rotate") || normalizedId.includes("3d")) {
      pushUnique(candidates, "triangle-rotate");
    }
    pushUnique(candidates, "triangle-float");
  }

  if (normalizedId.startsWith("blob-") || normalizedId.startsWith("blobs-")) {
    if (normalizedId.includes("multiple") || normalizedId.includes("lava")) {
      pushUnique(candidates, "blobs-multiple");
    }
    pushUnique(candidates, "blob-morph");
  }

  if (normalizedId.startsWith("dots-")) {
    if (normalizedId.includes("grid")) pushUnique(candidates, "dots-grid");
    pushUnique(candidates, "particles-float");
  }

  if (normalizedId.startsWith("particles-")) {
    if (normalizedId.includes("explode")) pushUnique(candidates, "confetti");
    pushUnique(candidates, "particles-float");
  }

  if (normalizedId.startsWith("lines-")) pushUnique(candidates, "lines-wave");

  if (normalizedId.includes("glass")) pushUnique(candidates, "gradient-shapes", "minimal-shapes");
  if (normalizedId.includes("outline")) pushUnique(candidates, "minimal-shapes", "geometric-mix");
  if (normalizedId.includes("dynamic")) pushUnique(candidates, "geometric-mix", "cyber-shapes");
  if (normalizedId.includes("tech")) pushUnique(candidates, "tech-grid");
  if (normalizedId.includes("cyber")) pushUnique(candidates, "cyber-shapes");
  if (normalizedId.includes("retro")) pushUnique(candidates, "retro-shapes");
  if (normalizedId.includes("nature")) pushUnique(candidates, "nature-shapes");
  if (normalizedId.includes("cosmic")) pushUnique(candidates, "cosmic-shapes");
  if (normalizedId.includes("playful")) pushUnique(candidates, "playful-shapes");
  if (normalizedId.includes("elegant")) pushUnique(candidates, "elegant-shapes");
  if (normalizedId.includes("gradient") || normalizedId.includes("abstract")) {
    pushUnique(candidates, "gradient-shapes");
  }
  if (normalizedId.includes("neon")) pushUnique(candidates, "neon-shapes");

  if (themeMeta?.shape) {
    pushUnique(candidates, ...(SHAPE_FALLBACKS_BY_TYPE[themeMeta.shape] ?? []));
  }

  // Final guaranteed fallback so never render null for a valid theme id.
  pushUnique(candidates, "geometric-mix");
  return candidates;
}

function resolveShapeComponent(themeId: string): React.FC<any> | null {
  const normalizedId = normalizeThemeId(themeId);
  if (!normalizedId) return null;

  const aliasId = SHAPE_THEME_ALIASES[normalizedId];
  if (aliasId && SHAPE_COMPONENTS[aliasId]) return SHAPE_COMPONENTS[aliasId];

  const direct = SHAPE_COMPONENTS[normalizedId];
  if (direct) return direct;

  for (const candidate of buildFallbackCandidates(normalizedId)) {
    const component = SHAPE_COMPONENTS[candidate];
    if (component) return component;
  }

  return null;
}

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
  const ShapeComponent = resolveShapeComponent(themeId);
  if (!ShapeComponent) return null;
  const placementKey = config?.placement ?? "background";
  const placement = placementClass(placementKey);
  const sizeKey = config?.size ?? "md";
  const blurKey = typeof config?.blur === "string" ? config.blur : "none";
  const blurPx = BLUR_PX[blurKey] ?? 0;
  const isBackground = placementKey === "background";
  const boxSize = BOX_SIZES[sizeKey];
  const scale = SIZE_SCALE[sizeKey] ?? 1;
  const layerClass = config?.layer === "below" ? "z-0" : "z-20";
  const clipToBounds = placementKey === "background";

  return (
    <div
      className={cls(
        "pointer-events-none absolute inset-0",
        clipToBounds ? "overflow-hidden" : "overflow-visible",
        className,
        layerClass
      )}
      style={clipToBounds ? { borderRadius: "inherit" } : undefined}
      aria-hidden="true"
    >
      <style>{animationKeyframes}</style>
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
