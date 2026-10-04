export type FontFamilyCategory = "sans" | "serif" | "display" | "mono" | "arabic";

export interface FontFamilyPresetItem {
  id: string;
  label: string;
  family: string;
  category: FontFamilyCategory;
}

const FONT_FAMILY_CATEGORY_LABELS_EN: Record<FontFamilyCategory, string> = {
  sans: "Sans",
  serif: "Serif",
  display: "Display",
  mono: "Mono",
  arabic: "Arabic",
};

export const FONT_FAMILY_CATEGORY_LABELS_AR: Record<FontFamilyCategory, string> = {
  sans: "بدون زوائد",
  serif: "بزوائد",
  display: "عرض",
  mono: "أحادي",
  arabic: "عربي",
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function buildPreset(
  category: FontFamilyCategory,
  label: string,
  family: string,
): FontFamilyPresetItem {
  return {
    id: `font-${category}-${slugify(label)}`,
    label,
    family,
    category,
  };
}

function buildCategory(
  category: FontFamilyCategory,
  entries: ReadonlyArray<readonly [label: string, family: string]>,
): FontFamilyPresetItem[] {
  return entries.map(([label, family]) => buildPreset(category, label, family));
}

const SANS_ENTRIES = [
  ["Inter", "Inter, 'Segoe UI', Tahoma, sans-serif"],
  ["Poppins", "Poppins, 'Segoe UI', Tahoma, sans-serif"],
  ["Open Sans", "'Open Sans', 'Segoe UI', Tahoma, sans-serif"],
  ["Lato", "Lato, 'Segoe UI', Tahoma, sans-serif"],
  ["Montserrat", "Montserrat, 'Segoe UI', Tahoma, sans-serif"],
  ["Nunito", "Nunito, 'Segoe UI', Tahoma, sans-serif"],
  ["Raleway", "Raleway, 'Segoe UI', Tahoma, sans-serif"],
  ["Work Sans", "'Work Sans', 'Segoe UI', Tahoma, sans-serif"],
  ["DM Sans", "'DM Sans', 'Segoe UI', Tahoma, sans-serif"],
  ["Manrope", "Manrope, 'Segoe UI', Tahoma, sans-serif"],
  ["Rubik", "Rubik, 'Segoe UI', Tahoma, sans-serif"],
  ["Ubuntu", "Ubuntu, 'Segoe UI', Tahoma, sans-serif"],
  ["Fira Sans", "'Fira Sans', 'Segoe UI', Tahoma, sans-serif"],
  ["Source Sans 3", "'Source Sans 3', 'Segoe UI', Tahoma, sans-serif"],
  ["Cabin", "Cabin, 'Segoe UI', Tahoma, sans-serif"],
  ["Karla", "Karla, 'Segoe UI', Tahoma, sans-serif"],
  ["Quicksand", "Quicksand, 'Segoe UI', Tahoma, sans-serif"],
  ["Mulish", "Mulish, 'Segoe UI', Tahoma, sans-serif"],
  ["Nunito Sans", "'Nunito Sans', 'Segoe UI', Tahoma, sans-serif"],
  ["Assistant", "Assistant, 'Segoe UI', Tahoma, sans-serif"],
  ["Asap", "Asap, 'Segoe UI', Tahoma, sans-serif"],
  ["Hind", "Hind, 'Segoe UI', Tahoma, sans-serif"],
  ["Barlow", "Barlow, 'Segoe UI', Tahoma, sans-serif"],
  ["Barlow Condensed", "'Barlow Condensed', 'Segoe UI', Tahoma, sans-serif"],
  ["PT Sans", "'PT Sans', 'Segoe UI', Tahoma, sans-serif"],
  ["Noto Sans", "'Noto Sans', 'Segoe UI', Tahoma, sans-serif"],
  ["Archivo", "Archivo, 'Segoe UI', Tahoma, sans-serif"],
  ["Exo 2", "'Exo 2', 'Segoe UI', Tahoma, sans-serif"],
  ["Space Grotesk", "'Space Grotesk', 'Segoe UI', Tahoma, sans-serif"],
  ["Sora", "Sora, 'Segoe UI', Tahoma, sans-serif"],
  ["Plus Jakarta Sans", "'Plus Jakarta Sans', 'Segoe UI', Tahoma, sans-serif"],
  ["Urbanist", "Urbanist, 'Segoe UI', Tahoma, sans-serif"],
  ["Outfit", "Outfit, 'Segoe UI', Tahoma, sans-serif"],
  ["Public Sans", "'Public Sans', 'Segoe UI', Tahoma, sans-serif"],
  ["Lexend", "Lexend, 'Segoe UI', Tahoma, sans-serif"],
] as const;

const SERIF_ENTRIES = [
  ["Playfair Display", "'Playfair Display', Georgia, serif"],
  ["Merriweather", "Merriweather, Georgia, serif"],
  ["Lora", "Lora, Georgia, serif"],
  ["PT Serif", "'PT Serif', Georgia, serif"],
  ["Crimson Text", "'Crimson Text', Georgia, serif"],
  ["Libre Baskerville", "'Libre Baskerville', Georgia, serif"],
  ["Cormorant Garamond", "'Cormorant Garamond', Georgia, serif"],
  ["EB Garamond", "'EB Garamond', Georgia, serif"],
  ["Alegreya", "Alegreya, Georgia, serif"],
  ["Bitter", "Bitter, Georgia, serif"],
  ["Domine", "Domine, Georgia, serif"],
  ["Spectral", "Spectral, Georgia, serif"],
  ["Cardo", "Cardo, Georgia, serif"],
  ["Arvo", "Arvo, Georgia, serif"],
  ["Roboto Slab", "'Roboto Slab', Georgia, serif"],
  ["Zilla Slab", "'Zilla Slab', Georgia, serif"],
  ["Josefin Slab", "'Josefin Slab', Georgia, serif"],
  ["Vollkorn", "Vollkorn, Georgia, serif"],
  ["Prata", "Prata, Georgia, serif"],
  ["Cinzel", "Cinzel, Georgia, serif"],
  ["Noto Serif", "'Noto Serif', Georgia, serif"],
  ["Source Serif 4", "'Source Serif 4', Georgia, serif"],
  ["Fraunces", "Fraunces, Georgia, serif"],
  ["Bodoni Moda", "'Bodoni Moda', Georgia, serif"],
  ["DM Serif Display", "'DM Serif Display', Georgia, serif"],
  ["Old Standard TT", "'Old Standard TT', Georgia, serif"],
  ["Cormorant", "Cormorant, Georgia, serif"],
  ["Neuton", "Neuton, Georgia, serif"],
  ["Antic Slab", "'Antic Slab', Georgia, serif"],
  ["Tinos", "Tinos, Georgia, serif"],
] as const;

const DISPLAY_ENTRIES = [
  ["Bebas Neue", "'Bebas Neue', Impact, sans-serif"],
  ["Oswald", "Oswald, Impact, sans-serif"],
  ["Anton", "Anton, Impact, sans-serif"],
  ["Archivo Black", "'Archivo Black', Impact, sans-serif"],
  ["Alfa Slab One", "'Alfa Slab One', Impact, serif"],
  ["Bungee", "Bungee, Impact, sans-serif"],
  ["Bungee Shade", "'Bungee Shade', Impact, sans-serif"],
  ["Pacifico", "Pacifico, 'Brush Script MT', cursive"],
  ["Lobster", "Lobster, 'Brush Script MT', cursive"],
  ["Dancing Script", "'Dancing Script', 'Brush Script MT', cursive"],
  ["Great Vibes", "'Great Vibes', 'Brush Script MT', cursive"],
  ["Satisfy", "Satisfy, 'Brush Script MT', cursive"],
  ["Kaushan Script", "'Kaushan Script', 'Brush Script MT', cursive"],
  ["Caveat", "Caveat, 'Brush Script MT', cursive"],
  ["Permanent Marker", "'Permanent Marker', Impact, cursive"],
  ["Abril Fatface", "'Abril Fatface', Georgia, serif"],
  ["Passion One", "'Passion One', Impact, sans-serif"],
  ["Righteous", "Righteous, Impact, sans-serif"],
  ["Fredoka", "Fredoka, 'Trebuchet MS', sans-serif"],
  ["Baloo 2", "'Baloo 2', 'Trebuchet MS', sans-serif"],
  ["Luckiest Guy", "'Luckiest Guy', Impact, sans-serif"],
  ["Rye", "Rye, Georgia, serif"],
  ["Monoton", "Monoton, Impact, sans-serif"],
  ["Unbounded", "Unbounded, Impact, sans-serif"],
  ["Chakra Petch", "'Chakra Petch', 'Trebuchet MS', sans-serif"],
  ["Teko", "Teko, Impact, sans-serif"],
  ["Orbitron", "Orbitron, 'Trebuchet MS', sans-serif"],
  ["Audiowide", "Audiowide, 'Trebuchet MS', sans-serif"],
  ["Rajdhani", "Rajdhani, 'Trebuchet MS', sans-serif"],
  ["Press Start 2P", "'Press Start 2P', 'Courier New', monospace"],
] as const;

const MONO_ENTRIES = [
  ["JetBrains Mono", "'JetBrains Mono', 'Cascadia Code', monospace"],
  ["Fira Code", "'Fira Code', 'Cascadia Code', monospace"],
  ["Source Code Pro", "'Source Code Pro', 'Courier New', monospace"],
  ["IBM Plex Mono", "'IBM Plex Mono', 'Courier New', monospace"],
  ["Inconsolata", "Inconsolata, 'Courier New', monospace"],
  ["Space Mono", "'Space Mono', 'Courier New', monospace"],
  ["Roboto Mono", "'Roboto Mono', 'Courier New', monospace"],
  ["Ubuntu Mono", "'Ubuntu Mono', 'Courier New', monospace"],
  ["Anonymous Pro", "'Anonymous Pro', 'Courier New', monospace"],
  ["Cousine", "Cousine, 'Courier New', monospace"],
  ["Overpass Mono", "'Overpass Mono', 'Courier New', monospace"],
  ["PT Mono", "'PT Mono', 'Courier New', monospace"],
  ["DM Mono", "'DM Mono', 'Courier New', monospace"],
  ["Victor Mono", "'Victor Mono', 'Courier New', monospace"],
  ["Cascadia Code", "'Cascadia Code', 'Courier New', monospace"],
  ["Menlo", "Menlo, Monaco, 'Courier New', monospace"],
  ["Monaco", "Monaco, Menlo, 'Courier New', monospace"],
  ["Consolas", "Consolas, 'Courier New', monospace"],
  ["Courier Prime", "'Courier Prime', 'Courier New', monospace"],
  ["Cutive Mono", "'Cutive Mono', 'Courier New', monospace"],
  ["Major Mono Display", "'Major Mono Display', 'Courier New', monospace"],
  ["Share Tech Mono", "'Share Tech Mono', 'Courier New', monospace"],
  ["Nova Mono", "'Nova Mono', 'Courier New', monospace"],
  ["Lekton", "Lekton, 'Courier New', monospace"],
  ["Red Hat Mono", "'Red Hat Mono', 'Courier New', monospace"],
] as const;

const ARABIC_ENTRIES = [
  ["IBM Plex Sans Arabic", "'IBM Plex Sans Arabic', Tahoma, sans-serif"],
  ["Tajawal", "Tajawal, 'IBM Plex Sans Arabic', Tahoma, sans-serif"],
  ["Cairo", "Cairo, 'IBM Plex Sans Arabic', Tahoma, sans-serif"],
  ["Almarai", "Almarai, 'IBM Plex Sans Arabic', Tahoma, sans-serif"],
  ["Changa", "Changa, 'IBM Plex Sans Arabic', Tahoma, sans-serif"],
  ["Reem Kufi", "'Reem Kufi', 'IBM Plex Sans Arabic', Tahoma, sans-serif"],
  ["El Messiri", "'El Messiri', 'IBM Plex Sans Arabic', Tahoma, sans-serif"],
  ["Alexandria", "Alexandria, 'IBM Plex Sans Arabic', Tahoma, sans-serif"],
  ["Noto Kufi Arabic", "'Noto Kufi Arabic', Tahoma, sans-serif"],
  ["Noto Naskh Arabic", "'Noto Naskh Arabic', Tahoma, serif"],
  ["Amiri", "Amiri, 'Times New Roman', serif"],
  ["Markazi Text", "'Markazi Text', 'Times New Roman', serif"],
  ["Lateef", "Lateef, 'Times New Roman', serif"],
  ["Scheherazade New", "'Scheherazade New', 'Times New Roman', serif"],
  ["Harmattan", "Harmattan, Tahoma, sans-serif"],
  ["Aref Ruqaa", "'Aref Ruqaa', Tahoma, serif"],
  ["Aref Ruqaa Ink", "'Aref Ruqaa Ink', Tahoma, serif"],
  ["Baloo Bhaijaan 2", "'Baloo Bhaijaan 2', Tahoma, sans-serif"],
  ["Mada", "Mada, Tahoma, sans-serif"],
  ["Readex Pro", "'Readex Pro', Tahoma, sans-serif"],
] as const;

export const FONT_FAMILY_LIBRARY: FontFamilyPresetItem[] = [
  ...buildCategory("sans", SANS_ENTRIES),
  ...buildCategory("serif", SERIF_ENTRIES),
  ...buildCategory("display", DISPLAY_ENTRIES),
  ...buildCategory("mono", MONO_ENTRIES),
  ...buildCategory("arabic", ARABIC_ENTRIES),
];

export const FONT_FAMILY_LIBRARY_COUNT = FONT_FAMILY_LIBRARY.length;

const GENERIC_FONT_FAMILY_NAMES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

const COMMON_SYSTEM_FONT_NAMES = new Set([
  "arial",
  "helvetica",
  "georgia",
  "times new roman",
  "tahoma",
  "verdana",
  "impact",
  "trebuchet ms",
  "courier new",
  "menlo",
  "monaco",
  "consolas",
  "segoe ui",
  "cascadia code",
  "brush script mt",
]);

export function parsePrimaryFontFamilyName(fontFamily?: string | null): string | undefined {
  if (!fontFamily || typeof fontFamily !== "string") return undefined;
  const first = fontFamily.split(",")[0]?.trim();
  if (!first) return undefined;
  const unquoted = first.replace(/^['"]+|['"]+$/g, "").trim();
  return unquoted || undefined;
}

export function isSystemOrGenericFontFamilyName(name?: string | null): boolean {
  if (!name || typeof name !== "string") return true;
  const normalized = name.trim().toLowerCase();
  if (!normalized) return true;
  return GENERIC_FONT_FAMILY_NAMES.has(normalized) || COMMON_SYSTEM_FONT_NAMES.has(normalized);
}

export function toGoogleFontFamilyName(fontFamily?: string | null): string | undefined {
  const primary = parsePrimaryFontFamilyName(fontFamily);
  if (!primary) return undefined;
  if (isSystemOrGenericFontFamilyName(primary)) return undefined;
  if (!/[\p{L}\p{N}]/u.test(primary)) return undefined;
  return primary;
}

export function getFontFamilyPresetById(id?: string | null): FontFamilyPresetItem | undefined {
  if (!id) return undefined;
  return FONT_FAMILY_LIBRARY.find((item) => item.id === id);
}

export function getGoogleFontFamilyByPresetId(id?: string | null): string | undefined {
  const preset = getFontFamilyPresetById(id);
  if (!preset) return undefined;
  return toGoogleFontFamilyName(preset.family);
}

export function formatFontFamilyPresetLabel(item: FontFamilyPresetItem, lang: "ar" | "en" = "ar"): string {
  const categoryLabel = lang === "ar"
    ? FONT_FAMILY_CATEGORY_LABELS_AR[item.category]
    : FONT_FAMILY_CATEGORY_LABELS_EN[item.category];
  return `${categoryLabel} - ${item.label}`;
}
