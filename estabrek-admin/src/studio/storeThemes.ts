/**
 * Store themes as the admin sees them: the list comes from the shop itself
 * (GET {shop}/api/store-themes, storeThemes/registry.ts there), so the admin keeps no copy.
 * The choice lives in the settings at header.storeTheme {id, mode}; none = the rose design.
 */
import { getSettings, updateSettings } from "../api/settings.api";
import { env } from "../config/env";
import type { Lang } from "../lib/lang";
import { tr } from "../lib/words";

export type Words = Record<Lang, string>;
export type StoreThemeInfo = {
  id: string;
  name: Words;
  family: string;
  blurb: Words;
  mode: "light" | "dark";
  modes: Array<"light" | "dark">;
  /** bg, surface, accent, strong, ink */
  swatch: string[];
  hero: string;
  motion: string;
  /** Gaming themes: the 3D stage the store can fill with its own models and games. */
  stage?: { layout: string; floor?: string; finish?: string; models: string[]; games: Array<{ name: Words; color: string; model: string }> } | null;
};
/** A model's own shape knob (the shop's kinds.ts MODEL_KNOBS): 1 is the model as drawn; `values` = the only choices. */
export type KnobSpec = { id: string; label: Words; min: number; max: number; step: number; def: number; values?: number[] };
export type StageModelInfo = { kind: string; label: Words; knobs?: KnobSpec[] };
export const STAGE_PARTS = ["body", "trim", "accent", "glow", "screen", "metal"] as const;
export const STAGE_FINISHES = ["neon", "metal", "toy", "voxel", "matte", "glass", "gold"] as const;
export const STAGE_ANIMS = ["none", "spin", "float", "bounce", "pulse", "swing", "orbit"] as const;
export const STAGE_TRIGGERS = ["always", "hover", "scroll"] as const;
export type StageAnim = { type: (typeof STAGE_ANIMS)[number]; speed: number; amount: number; trigger: (typeof STAGE_TRIGGERS)[number] };
/**
 * How the scene editor set a model up (the shop checks it again: kinds.ts cleanLook): moved
 * (stage units) and turned (degrees) from its place in the layout, sized, stretched, its
 * knobs, its parts' colours, its finish and its motion (none set = the stage's gentle bob).
 */
export type StageLook = {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  shape?: { w: number; h: number; d: number };
  knobs?: Record<string, number>;
  colours?: Partial<Record<(typeof STAGE_PARTS)[number], string>>;
  finish?: (typeof STAGE_FINISHES)[number];
  anim?: StageAnim;
  /** Its way through the scroll: the look is where it starts, this is where it ends. */
  path?: StagePath;
};
export type V3 = [number, number, number];
export const STAGE_EASES = ["smooth", "linear", "early", "late"] as const;
export type StagePath = { pos: V3; rot: V3; scale: V3; ease: (typeof STAGE_EASES)[number] };
/** The store's own 3D file for a model (drawn instead of the code model); `clip` = its animation ("*" = the first). */
export type StageGlb = { url: string; name?: string; clip?: string };
export const STAGE_LAYOUTS = ["orbit", "hero", "podium", "shelf"] as const;
export const STAGE_FLOORS = ["grid", "stage", "none"] as const;
export type StageCamera = { fov: number; distance: number; height: number; target: number; sway: number; dolly: number; drop: number; orbit: number };
export type StageLights = { ambient: number; key: number; keyAngle: number; rim: number; env: number; halos: boolean; colours?: [string, string] };
/** The whole stage, the store's way (the theme's own where not set). */
export type StageScene = {
  layout?: (typeof STAGE_LAYOUTS)[number];
  floor?: (typeof STAGE_FLOORS)[number];
  floorColour?: string;
  floorGlow?: boolean;
  camera?: StageCamera;
  lights?: StageLights;
};
/** The shop's camera and lights as drawn before the editor, and each number's range (GET /api/store-themes). */
export type StageDefaults = {
  camera: StageCamera;
  lights: StageLights;
  cameraRange: Record<keyof StageCamera, [number, number]>;
  lightsRange: Record<"ambient" | "key" | "keyAngle" | "rim" | "env", [number, number]>;
};
/** The store's own choices for a gaming theme (header.storeThemeOptions[themeId]). */
export type StageOptions = {
  models?: Array<{ kind: string; label?: string; href?: string; look?: StageLook; glb?: StageGlb }>;
  games?: Array<{ name: string; color: string; href?: string; imageUrl?: string; model?: string }>;
  scene?: StageScene;
};
export type StoreThemeChoice = { id: string; mode?: "light" | "dark" | null };

/** The rose design (no theme), shown first in the gallery. */
export const ROSE_ID = "rose";

export const shopOrigin = () => {
  try {
    return new URL(env.VITE_STOREFRONT_BASE_URL).origin;
  } catch {
    return "";
  }
};

export async function loadStoreThemes(): Promise<{ themes: StoreThemeInfo[]; models: StageModelInfo[]; stageDefaults: StageDefaults | null }> {
  const res = await fetch(`${shopOrigin()}/api/store-themes`, { credentials: "omit" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { themes?: StoreThemeInfo[]; models?: StageModelInfo[]; stageDefaults?: StageDefaults };
  return {
    themes: Array.isArray(data.themes) ? data.themes : [],
    models: Array.isArray(data.models) ? data.models : [],
    stageDefaults: data.stageDefaults?.camera && data.stageDefaults.lights ? data.stageDefaults : null,
  };
}
export const listStoreThemes = async () => (await loadStoreThemes()).themes;

export const stageOptionsOf = (header: unknown, themeId: string): StageOptions => {
  const all = (header as { storeThemeOptions?: Record<string, StageOptions> } | null | undefined)?.storeThemeOptions;
  return (all && typeof all === "object" && all[themeId]) || {};
};

/** Saves a gaming theme's models (with their looks) and games (other header fields and other themes' choices kept). */
export async function saveStageOptions(themeId: string, options: StageOptions) {
  const latest = await getSettings();
  const header = { ...((latest.header ?? {}) as Record<string, unknown>) };
  const all = { ...((header.storeThemeOptions as Record<string, StageOptions> | undefined) ?? {}) };
  all[themeId] = options;
  header.storeThemeOptions = all;
  return updateSettings({ header } as never);
}

export const currentStoreTheme = (header: unknown): StoreThemeChoice | null => {
  const t = (header as { storeTheme?: StoreThemeChoice } | null | undefined)?.storeTheme;
  return t && typeof t.id === "string" && t.id ? t : null;
};

/** Saves the theme for the whole store from the latest settings (other header fields kept); null = the rose design. */
export async function saveStoreTheme(choice: StoreThemeChoice | null) {
  const latest = await getSettings();
  const header = { ...((latest.header ?? {}) as Record<string, unknown>) };
  if (choice && choice.id !== ROSE_ID) header.storeTheme = { id: choice.id, mode: choice.mode ?? null };
  else delete header.storeTheme;
  return updateSettings({ header } as never);
}

export const FAMILY_LABEL: Record<string, () => string> = {
  fashion: () => tr("أزياء", "Fashion"),
  shoes: () => tr("أحذية", "Shoes"),
  electronics: () => tr("موبايلات وكمبيوتر وإلكترونيات", "Phones, computers & electronics"),
  gaming: () => tr("ألعاب", "Gaming"),
  beauty: () => tr("تجميل وعطور", "Beauty & perfume"),
  jewelry: () => tr("مجوهرات", "Jewellery"),
  books: () => tr("كتب وقرطاسية", "Books & stationery"),
  art: () => tr("فن ورسم", "Art"),
  home: () => tr("بيت وديكور", "Home & decor"),
  food: () => tr("أكل وحلويات", "Food & sweets"),
  kids: () => tr("أطفال", "Kids"),
  sports: () => tr("رياضة", "Sport"),
  pets: () => tr("حيوانات أليفة", "Pets"),
  flowers: () => tr("زهور ونباتات", "Flowers & plants"),
  music: () => tr("موسيقى", "Music"),
  general: () => tr("عام", "General"),
};

/** A gaming store's stage offers games; every other store's offers collections. */
export function stageWords(family: string) {
  const gaming = family === "gaming";
  return {
    title: gaming ? tr("الموديلات والألعاب", "Models and games") : tr("الموديلات والمجموعات", "Models and collections"),
    list: gaming ? tr("الألعاب", "Games") : tr("المجموعات", "Collections"),
    one: gaming ? tr("لعبة", "Game") : tr("مجموعة", "Collection"),
    name: gaming ? tr("اسم اللعبة", "Game name") : tr("اسم المجموعة", "Collection name"),
    picture: gaming ? tr("صورة اللعبة", "The game's picture") : tr("صورة المجموعة", "The collection's picture"),
    example: gaming ? "FIFA 25" : tr("فساتين السهرة", "Evening dresses"),
    help: gaming
      ? tr(
          "الموديلات بتطلع بمشهد الـ 3D، وكل موديل بيفتح قسمه. الزبون بيختار لعبة، فبيتلوّن المشهد بلونها وبيطلع موديلها وبيوصل لمنتجاتها.",
          "The models stand on the 3D stage and each opens its category. A shopper picks a game: the stage takes its colour, its model comes forward and it leads to its products.",
        )
      : tr(
          "الموديلات بتطلع بمشهد الـ 3D، وكل موديل بيفتح قسمه. الزبون بيختار مجموعة، فبيتلوّن المشهد بلونها وبيطلع موديلها وبيوصل لمنتجاتها.",
          "The models stand on the 3D stage and each opens its category. A shopper picks a collection: the stage takes its colour, its model comes forward and it leads to its products.",
        ),
  };
}
