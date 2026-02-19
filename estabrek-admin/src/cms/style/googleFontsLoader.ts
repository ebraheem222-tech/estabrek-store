import { getGoogleFontFamilyByPresetId, toGoogleFontFamilyName } from "./fontFamilyPresets";

const GOOGLE_FONTS_LINK_ID = "cms-google-fonts-dynamic";
const DEFAULT_FONT_WEIGHT = 400;

const TYPOGRAPHY_WEIGHT_MAP: Record<string, number> = {
  thin: 100,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

type FontStyle = "normal" | "italic";

type FontVariant = {
  family: string;
  weights: Set<number>;
  styles: Set<FontStyle>;
};

function normalizeGoogleFamilyQueries(families: string[]): string[] {
  return Array.from(
    new Set(
      families
        .map((query) => String(query ?? "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => {
    const familyA = a.split(":")[0]?.toLowerCase() ?? "";
    const familyB = b.split(":")[0]?.toLowerCase() ?? "";
    if (familyA === familyB) return a.localeCompare(b);
    return familyA.localeCompare(familyB);
  });
}

function encodeGoogleFamilyQuery(query: string): string {
  return encodeURIComponent(query)
    .replace(/%20/g, "+")
    .replace(/%3A/gi, ":")
    .replace(/%40/gi, "@")
    .replace(/%3B/gi, ";")
    .replace(/%2C/gi, ",");
}

function normalizeWeightValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(900, Math.max(100, Math.round(value / 100) * 100));
  }
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized in TYPOGRAPHY_WEIGHT_MAP) return TYPOGRAPHY_WEIGHT_MAP[normalized];
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) {
    return Math.min(900, Math.max(100, Math.round(numeric / 100) * 100));
  }
  return undefined;
}

function normalizeStyleValue(value: unknown): FontStyle | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "italic" || normalized === "oblique") return "italic";
  if (normalized === "normal") return "normal";
  return undefined;
}

function styleFromClassName(value: unknown): FontStyle | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.trim()) return undefined;
  if (/\bnot-italic\b/.test(value)) return "normal";
  if (/\bitalic\b/.test(value)) return "italic";
  return undefined;
}

function resolveTypographyStyle(typography: any, node: any): FontStyle {
  if (typography?.italic === true || node?.italic === true) return "italic";

  const directCandidates = [
    typography?.fontStyle,
    typography?.style,
    node?.fontStyle,
    node?.style?.fontStyle,
  ];
  for (const candidate of directCandidates) {
    const style = normalizeStyleValue(candidate);
    if (style) return style;
  }

  const classCandidates = [typography?.className, node?.className];
  for (const className of classCandidates) {
    const style = styleFromClassName(className);
    if (style) return style;
  }

  return "normal";
}

function toGoogleFamilyQuery(variant: FontVariant): string {
  const family = variant.family.trim();
  if (!family) return "";

  const weights = Array.from(variant.weights)
    .filter((weight) => Number.isFinite(weight))
    .map((weight) => Math.min(900, Math.max(100, Math.round(weight / 100) * 100)))
    .sort((a, b) => a - b);
  const normalizedWeights = weights.length ? Array.from(new Set(weights)) : [DEFAULT_FONT_WEIGHT];

  const hasItalic = variant.styles.has("italic");
  const hasNormal = variant.styles.size === 0 || variant.styles.has("normal");

  if (!hasItalic) {
    if (normalizedWeights.length === 1 && normalizedWeights[0] === DEFAULT_FONT_WEIGHT) return family;
    return `${family}:wght@${normalizedWeights.join(";")}`;
  }

  const styleWeightPairs: string[] = [];
  if (hasNormal) {
    for (const weight of normalizedWeights) styleWeightPairs.push(`0,${weight}`);
  }
  for (const weight of normalizedWeights) styleWeightPairs.push(`1,${weight}`);
  return `${family}:ital,wght@${styleWeightPairs.join(";")}`;
}

export function buildGoogleFontsHref(families: string[]): string | undefined {
  const normalized = normalizeGoogleFamilyQueries(families);
  if (!normalized.length) return undefined;
  const familyParams = normalized.map((familyQuery) => `family=${encodeGoogleFamilyQuery(familyQuery)}`).join("&");
  return `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
}

function extractTypographyGoogleFont(node: any): { family: string; weight: number; style: FontStyle } | undefined {
  const typography = node?.typography;
  if (!typography || typeof typography !== "object") return undefined;
  const presetId = typeof typography.familyPresetId === "string" ? typography.familyPresetId.trim() : "";
  let family = "";
  if (presetId) {
    const presetFont = getGoogleFontFamilyByPresetId(presetId);
    if (presetFont) family = presetFont;
  }
  if (!family) {
    const customStack = typeof typography.familyCustom === "string" ? typography.familyCustom.trim() : "";
    if (customStack) {
      const customFamily = toGoogleFontFamilyName(customStack);
      if (customFamily) family = customFamily;
    }
  }
  if (!family) return undefined;

  const weight = normalizeWeightValue(typography.weight) ?? DEFAULT_FONT_WEIGHT;
  const style = resolveTypographyStyle(typography, node);
  return { family, weight, style };
}

export function collectGoogleFontsFromValue(value: unknown): string[] {
  const found = new Map<string, FontVariant>();
  const visited = new WeakSet<object>();

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (visited.has(node as object)) return;
    visited.add(node as object);

    const typographyFont = extractTypographyGoogleFont(node as any);
    if (typographyFont) {
      const existing = found.get(typographyFont.family) ?? {
        family: typographyFont.family,
        weights: new Set<number>(),
        styles: new Set<FontStyle>(),
      };
      existing.weights.add(typographyFont.weight);
      existing.styles.add(typographyFont.style);
      found.set(typographyFont.family, existing);
    }

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    for (const child of Object.values(node as Record<string, unknown>)) {
      walk(child);
    }
  };

  walk(value);
  return normalizeGoogleFamilyQueries(Array.from(found.values()).map((variant) => toGoogleFamilyQuery(variant)).filter(Boolean));
}

export function ensureGoogleFontsLoaded(families: string[]): void {
  if (typeof document === "undefined") return;
  const href = buildGoogleFontsHref(families);
  const existing = document.getElementById(GOOGLE_FONTS_LINK_ID) as HTMLLinkElement | null;

  if (!href) {
    if (existing) existing.remove();
    return;
  }

  if (existing) {
    if (existing.getAttribute("href") !== href) {
      existing.setAttribute("href", href);
    }
    return;
  }

  const link = document.createElement("link");
  link.id = GOOGLE_FONTS_LINK_ID;
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-cms-google-fonts", "true");
  document.head.appendChild(link);
}
