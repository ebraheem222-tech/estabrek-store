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

type ParsedSvgNode = {
  tag: string;
  attrs: Record<string, string>;
  children: ParsedSvgNode[];
};

type ParsedCustomSvg = {
  viewBox: string;
  rootAttrs: Record<string, string>;
  nodes: ParsedSvgNode[];
};

const ALLOWED_SVG_TAGS = new Set([
  "g",
  "defs",
  "path",
  "circle",
  "rect",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "lineargradient",
  "radialgradient",
  "stop",
  "pattern",
  "mask",
  "filter",
  "feturbulence",
  "fegaussianblur",
  "fecolormatrix",
  "feoffset",
  "feblend",
  "fecomposite",
  "feflood",
  "femorphology",
  "fedropshadow",
  "clippath",
  "use",
  "title",
  "desc",
]);

const SHAPE_TAGS = new Set(["path", "circle", "rect", "ellipse", "line", "polyline", "polygon"]);

function toReactAttrName(name: string): string | null {
  const raw = name.trim();
  if (!raw) return null;
  if (raw.includes(":")) return null;
  if (raw.toLowerCase().startsWith("on")) return null;
  if (raw === "class") return "className";
  return raw.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function rewriteUrlRefs(value: string, idMap: Record<string, string>): string {
  if (!value) return value;
  const urlRewritten = value.replace(
    /url\(\s*['"]?#([^'")]+)['"]?\s*\)/gi,
    (_m, id: string) => `url(#${idMap[id] || id})`,
  );
  const hashMatch = urlRewritten.match(/^#(.+)$/);
  if (hashMatch) {
    const id = hashMatch[1];
    return `#${idMap[id] || id}`;
  }
  return urlRewritten;
}

function parseInlineStyle(styleText: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!styleText) return out;

  const pairs = styleText.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf(":");
    if (idx === -1) continue;
    const rawKey = pair.slice(0, idx).trim().toLowerCase();
    const rawValue = pair.slice(idx + 1).trim();
    if (!rawKey || !rawValue) continue;

    const key = rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = rawValue;
  }

  return out;
}

function inferViewBox(svgEl: Element): string | undefined {
  const widthRaw = svgEl.getAttribute("width")?.trim() || "";
  const heightRaw = svgEl.getAttribute("height")?.trim() || "";
  const width = Number(widthRaw.replace(/px$/i, ""));
  const height = Number(heightRaw.replace(/px$/i, ""));
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return `0 0 ${width} ${height}`;
  }
  return undefined;
}

function collectIds(root: Element, idPrefix: string): Record<string, string> {
  const idMap: Record<string, string> = {};
  const walk = (el: Element) => {
    const id = el.getAttribute("id")?.trim();
    if (id) idMap[id] = `${idPrefix}-${id}`;
    for (const child of Array.from(el.children)) walk(child);
  };
  walk(root);
  return idMap;
}

function sanitizeAttributes(
  el: Element,
  idMap: Record<string, string>,
  opts: { isRoot?: boolean },
): Record<string, string> {
  const out: Record<string, string> = {};

  for (const attr of Array.from(el.attributes)) {
    const rawName = attr.name;
    const value = attr.value?.trim();
    if (!value) continue;

    const lower = rawName.toLowerCase();
    if (lower === "xmlns" || lower.startsWith("xmlns:")) continue;
    if (opts.isRoot && (lower === "width" || lower === "height")) continue;
    if (lower === "viewbox") continue;

    if (lower === "style") {
      const styleAttrs = parseInlineStyle(value);
      for (const [k, v] of Object.entries(styleAttrs)) {
        out[k] = rewriteUrlRefs(v, idMap);
      }
      continue;
    }

    const propName = toReactAttrName(rawName);
    if (!propName) continue;

    if (propName === "id") out[propName] = idMap[value] || value;
    else out[propName] = rewriteUrlRefs(value, idMap);
  }

  return out;
}

function elementToNode(el: Element, idMap: Record<string, string>): ParsedSvgNode | null {
  const tag = el.tagName;
  const normalized = tag.toLowerCase();
  if (!ALLOWED_SVG_TAGS.has(normalized)) return null;

  const attrs = sanitizeAttributes(el, idMap, { isRoot: false });
  const children: ParsedSvgNode[] = [];
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType !== 1) continue;
    const node = elementToNode(child as Element, idMap);
    if (node) children.push(node);
  }

  return { tag, attrs, children };
}

function parseSvgViewBox(svg: string): string | undefined {
  const m = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  return m ? m[1].trim() : undefined;
}

function parseSvgPaths(svg: string): string[] {
  const paths: string[] = [];
  const re = /<path\b[^>]*\bd\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(svg)) !== null) {
    const d = (match[1] ?? "").trim();
    if (d) paths.push(d);
  }
  return paths;
}

function parseCustomSvg(config: DecorLayer, idPrefix: string): ParsedCustomSvg | null {
  const raw = typeof config.svg === "string" ? config.svg.trim() : "";
  if (!raw) return null;

  const viewBoxOverride = typeof config.svgViewBox === "string" ? config.svgViewBox.trim() : "";
  const looksLikeMarkup =
    /<\s*svg\b/i.test(raw) ||
    /<\s*(path|circle|rect|ellipse|line|polyline|polygon|defs|g|pattern|mask|filter)\b/i.test(raw);

  if (!looksLikeMarkup) {
    return {
      viewBox: viewBoxOverride || "0 0 100 100",
      rootAttrs: {},
      nodes: [{ tag: "path", attrs: { d: raw }, children: [] }],
    };
  }

  const markup = /<\s*svg\b/i.test(raw)
    ? raw
    : `<svg xmlns="http://www.w3.org/2000/svg"${viewBoxOverride ? ` viewBox="${viewBoxOverride}"` : ""}>${raw}</svg>`;

  if (typeof DOMParser === "undefined") {
    const paths = parseSvgPaths(markup);
    if (!paths.length) return null;
    return {
      viewBox: viewBoxOverride || parseSvgViewBox(markup) || "0 0 100 100",
      rootAttrs: {},
      nodes: paths.map((d) => ({ tag: "path", attrs: { d }, children: [] })),
    };
  }

  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  if (!doc || doc.getElementsByTagName("parsererror").length > 0) return null;

  const svgEl = doc.documentElement;
  if (!svgEl || svgEl.tagName.toLowerCase() !== "svg") return null;

  const idMap = collectIds(svgEl, idPrefix);
  const viewBox =
    viewBoxOverride ||
    svgEl.getAttribute("viewBox")?.trim() ||
    inferViewBox(svgEl) ||
    "0 0 100 100";

  const rootAttrs = sanitizeAttributes(svgEl, idMap, { isRoot: true });
  const nodes: ParsedSvgNode[] = [];
  for (const child of Array.from(svgEl.childNodes)) {
    if (child.nodeType !== 1) continue;
    const node = elementToNode(child as Element, idMap);
    if (node) nodes.push(node);
  }

  return { viewBox, rootAttrs, nodes };
}

function renderParsedSvgNode(
  node: ParsedSvgNode,
  key: string,
  paint: string,
  applyPaintToCurrentColor: boolean,
): React.ReactNode {
  const normalized = node.tag.toLowerCase();
  const nextAttrs: Record<string, string> = { ...node.attrs };

  if (applyPaintToCurrentColor && SHAPE_TAGS.has(normalized)) {
    const fill = (nextAttrs.fill || "").trim();
    const stroke = (nextAttrs.stroke || "").trim();

    if (normalized === "line") {
      nextAttrs.fill = "none";
      if (!stroke || stroke === "currentColor") nextAttrs.stroke = paint;
    } else {
      if (!fill || fill === "currentColor") nextAttrs.fill = paint;
      if (stroke === "currentColor") nextAttrs.stroke = paint;
    }
  }

  const children = node.children.map((c, idx) =>
    renderParsedSvgNode(c, `${key}.${idx}`, paint, applyPaintToCurrentColor),
  );
  return React.createElement(node.tag, { key, ...nextAttrs }, children.length ? children : undefined);
}

interface DecorationLayerProps {
  config: DecorLayer;
  className?: string;
}

export const DecorationLayer: React.FC<DecorationLayerProps> = ({
  config,
  className = "",
}) => {
  const reactId = React.useId();
  const idPrefix = `decor-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (!config.shape || config.shape === "none") return null;

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
  const gradientStops = wantsGradient && isGradientValue(gradientValue) ? parseGradientStops(gradientValue) : [];
  const solidColor = baseIsGradient ? (parseGradientStops(resolvedColor)[0] ?? resolvedColor) : resolvedColor;
  const isGradient = wantsGradient && gradientStops.length >= 2;
  const gradientId = isGradient ? `${idPrefix}-gradient-${placement}` : null;

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
  const isBackground = placement === "background";
  const svgHeight = isVertical || isBackground ? "100%" : height;
  const svgWidth = "100%";
  const usesStroke = config.shape === "lines-horizontal" || config.shape === "lines-diagonal";
  const paint = isGradient && gradientId ? `url(#${gradientId})` : solidColor;

  if (config.shape === "custom-svg") {
    const parsed = parseCustomSvg(config, idPrefix);
    if (!parsed) return null;

    const applyPaintToCurrentColor = isGradient && !!gradientId;
    const rootAttrs: Record<string, string> = { ...parsed.rootAttrs };
    const rootFill = (rootAttrs.fill || "").trim();
    const rootStroke = (rootAttrs.stroke || "").trim();

    if (applyPaintToCurrentColor) {
      if ((!rootFill || rootFill === "currentColor") && rootFill !== "none" && !/^url\(/i.test(rootFill)) {
        rootAttrs.fill = paint;
      }
      if (rootStroke === "currentColor") rootAttrs.stroke = paint;
    } else {
      if (!rootFill) rootAttrs.fill = "currentColor";
    }

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
          viewBox={parsed.viewBox}
          preserveAspectRatio="none"
          {...rootAttrs}
          style={{
            width: svgWidth,
            height: svgHeight,
            display: "block",
            transform: flipTransform,
            color: solidColor,
          }}
        >
          {isGradient && gradientId && (
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                {gradientStops.map((stopColor, idx) => {
                  const denom = Math.max(1, gradientStops.length - 1);
                  const offset = (idx / denom) * 100;
                  return <stop key={`${gradientId}-${idx}`} offset={`${offset}%`} stopColor={stopColor} />;
                })}
              </linearGradient>
            </defs>
          )}
          {parsed.nodes.map((n, idx) =>
            renderParsedSvgNode(n, `custom-svg-${idx}`, paint, applyPaintToCurrentColor),
          )}
        </svg>
      </span>
    );
  }

  const shape = SHAPES[config.shape];
  if (!shape) return null;

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
        {isGradient && gradientId && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {gradientStops.map((stopColor, idx) => {
                const denom = Math.max(1, gradientStops.length - 1);
                const offset = (idx / denom) * 100;
                return <stop key={`${gradientId}-${idx}`} offset={`${offset}%`} stopColor={stopColor} />;
              })}
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

function parseGradientStops(gradient: string): string[] {
  const fallback = ["#6FA6A1", "#5B918C"];
  const raw = String(gradient ?? "").trim();
  if (!raw || !isGradientValue(raw)) return [];

  const open = raw.indexOf("(");
  const close = raw.lastIndexOf(")");
  if (open < 0 || close <= open) return fallback;

  const inner = raw.slice(open + 1, close);
  const args = splitCommaArgs(inner).map((x) => x.trim()).filter(Boolean);
  if (args.length < 2) return fallback;

  const first = args[0]?.trim() ?? "";
  const startAt = isLikelyGradientDirection(first) ? 1 : 0;
  const colors = args
    .slice(startAt)
    .map(extractLeadingColorToken)
    .filter((x): x is string => !!x);

  if (colors.length >= 2) return colors;
  if (colors.length === 1) return [colors[0], colors[0]];
  return fallback;
}

function splitCommaArgs(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);

    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function isLikelyGradientDirection(value: string): boolean {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return false;
  if (v.startsWith("to ")) return true;
  if (v.includes(" at ")) return true;
  if (/(deg|grad|rad|turn)$/.test(v)) return true;
  if (v.startsWith("circle") || v.startsWith("ellipse")) return true;
  return false;
}

function extractLeadingColorToken(value: string): string | null {
  const v = String(value ?? "").trim();
  if (!v) return null;

  if (/^[a-zA-Z][a-zA-Z0-9_-]*\(/.test(v)) {
    let depth = 0;
    for (let i = 0; i < v.length; i++) {
      const ch = v[i];
      if (ch === "(") depth++;
      if (ch === ")") {
        depth--;
        if (depth === 0) return v.slice(0, i + 1).trim();
      }
    }
  }

  const token = v.split(/\s+/)[0];
  return token ? token.trim() : null;
}
