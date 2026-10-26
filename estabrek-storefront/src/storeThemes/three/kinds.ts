/**
 * The gaming models by name, without any 3D code (the server, the admin's list and the
 * page's picker use this; models.tsx draws them). Each knows the words that find its
 * category in a store (a store's own link wins: Admin → ثيمات المتجر → الموديلات).
 */
import type { Words } from "../types";

export const MODEL_KINDS = ["controller", "headset", "console", "handheld", "keyboard", "mouse", "arcade", "vr", "wheel", "dice", "trophy", "coin", "sword", "shield", "potion", "rocket", "helmet", "tv", "chair", "cartridge"] as const;
export type ModelKind = (typeof MODEL_KINDS)[number];

const w = (ar: string, en: string, he: string): Words => ({ ar, en, he });

export const MODEL_INFO: Record<ModelKind, { label: Words; find: string[] }> = {
  controller: { label: w("أيادي التحكم", "Controllers", "שלטים"), find: ["controller", "gamepad", "joystick", "يد", "ذراع", "جويستيك", "שלט"] },
  headset: { label: w("سماعات", "Headsets", "אוזניות"), find: ["headset", "headphone", "سماعة", "سماعات", "אוזניות"] },
  console: { label: w("أجهزة الكونسول", "Consoles", "קונסולות"), find: ["console", "playstation", "xbox", "ps5", "كونسول", "بلايستيشن", "اكس بوكس", "קונסולה"] },
  handheld: { label: w("أجهزة محمولة", "Handhelds", "מכשירים ניידים"), find: ["handheld", "switch", "nintendo", "steam deck", "سويتش", "نينتندو", "محمول"] },
  keyboard: { label: w("كيبوردات", "Keyboards", "מקלדות"), find: ["keyboard", "كيبورد", "لوحة مفاتيح", "מקלדת"] },
  mouse: { label: w("ماوسات", "Mice", "עכברים"), find: ["mouse", "mice", "ماوس", "فأرة", "עכבר"] },
  arcade: { label: w("ريترو وآركيد", "Retro & arcade", "רטרו וארקייד"), find: ["arcade", "retro", "ريترو", "آركيد", "רטרו"] },
  vr: { label: w("واقع افتراضي", "VR", "מציאות מדומה"), find: ["vr", "virtual", "quest", "واقع افتراضي", "מציאות"] },
  wheel: { label: w("مقود وسباق", "Wheels & racing", "הגאים ומרוצים"), find: ["wheel", "racing", "مقود", "سباق", "מרוץ"] },
  dice: { label: w("ألعاب طاولة", "Board games", "משחקי קופסה"), find: ["board", "dice", "tabletop", "طاولة", "لوحية", "نرد", "קופסה"] },
  trophy: { label: w("بطولات", "Tournaments", "טורנירים"), find: ["tournament", "esports", "بطولة", "بطولات", "טורניר"] },
  coin: { label: w("بطاقات وشحن", "Cards & top-ups", "כרטיסים וטעינות"), find: ["gift card", "top up", "credit", "بطاقة", "بطاقات", "شحن", "رصيد", "כרטיס"] },
  sword: { label: w("مغامرات", "Adventure", "הרפתקאות"), find: ["rpg", "adventure", "fantasy", "مغامرات", "مغامرة", "הרפתקה"] },
  shield: { label: w("ألعاب أدوار", "Role-playing", "משחקי תפקידים"), find: ["rpg", "role", "mmo", "أدوار", "تقمص", "תפקידים"] },
  potion: { label: w("عروض وصناديق", "Deals & loot boxes", "מבצעים ותיבות"), find: ["bundle", "loot", "deal", "offer", "عروض", "صندوق", "מבצע"] },
  rocket: { label: w("فضاء وخيال علمي", "Space & sci-fi", "חלל ומדע בדיוני"), find: ["space", "sci-fi", "scifi", "فضاء", "خيال علمي", "חלל"] },
  tv: { label: w("شاشات وريترو", "Screens & retro", "מסכים ורטרו"), find: ["monitor", "screen", "tv", "display", "شاشة", "شاشات", "تلفزيون", "מסך"] },
  chair: { label: w("كراسي جيمنغ", "Gaming chairs", "כיסאות גיימינג"), find: ["chair", "seat", "desk", "كرسي", "كراسي", "مكتب", "כיסא"] },
  cartridge: { label: w("ألعاب", "Games", "משחקים"), find: ["game", "games", "cartridge", "ألعاب", "لعبة", "משחק"] },
  helmet: { label: w("ملابس ومقتنيات", "Merch & collectibles", "מרצ'נדייז ואספנות"), find: ["merch", "collectible", "figure", "apparel", "ملابس", "مقتنيات", "تماثيل", "מרצ"] },
};

export const ANIMS = ["none", "spin", "float", "bounce", "pulse", "swing", "orbit"] as const;
export const TRIGGERS = ["always", "hover", "scroll"] as const;
export type StageAnim = { type: (typeof ANIMS)[number]; speed: number; amount: number; trigger: (typeof TRIGGERS)[number] };
export const FINISHES = ["neon", "metal", "toy", "voxel"] as const;
/** A model's parts that take a colour of their own (models.tsx ModelColours). */
export const PARTS = ["body", "trim", "accent", "glow", "screen", "metal"] as const;
export type StagePart = (typeof PARTS)[number];

/**
 * A model's own shape knobs: a part longer or bigger, or how many of something. 1 is the
 * model as drawn for the multipliers; `values` lists the only choices a count can take.
 */
export type KnobSpec = { id: string; label: Words; min: number; max: number; step: number; def: number; values?: number[] };
const knob = (id: string, label: Words, min: number, max: number, def = 1, step = 0.05, values?: number[]): KnobSpec => ({ id, label, min, max, step, def, ...(values ? { values } : {}) });
const count = (id: string, label: Words, min: number, max: number, def: number) => knob(id, label, min, max, def, 1);

export const MODEL_KNOBS: Record<ModelKind, KnobSpec[]> = {
  controller: [knob("grips", w("طول المقابض", "Grip length", "אורך הידיות"), 0.5, 1.6), knob("buttons", w("حجم الأزرار", "Button size", "גודל הכפתורים"), 0.5, 1.8)],
  headset: [knob("band", w("عرض الطوق", "Band width", "רוחב הקשת"), 0.8, 1.35), knob("cups", w("حجم السماعات", "Ear cup size", "גודל האוזניות"), 0.6, 1.4)],
  console: [knob("height", w("الطول", "Height", "גובה"), 0.6, 1.4), knob("stand", w("عرض القاعدة", "Stand width", "רוחב המעמד"), 0, 1.8)],
  handheld: [knob("screen", w("عرض الشاشة", "Screen width", "רוחב המסך"), 0.7, 1.5), knob("grips", w("حجم المقابض", "Grip size", "גודל הידיות"), 0.6, 1.5)],
  keyboard: [count("keys", w("عدد الأعمدة", "Key columns", "עמודות מקשים"), 8, 18, 14), knob("tilt", w("الميلان", "Tilt", "הטיה"), 0, 1.6)],
  mouse: [knob("length", w("الطول", "Length", "אורך"), 0.7, 1.4), knob("hump", w("الارتفاع", "Height", "גובה"), 0.6, 1.6)],
  arcade: [knob("screen", w("حجم الشاشة", "Screen size", "גודל המסך"), 0.6, 1.25), knob("height", w("الطول", "Height", "גובה"), 0.75, 1.35)],
  vr: [knob("visor", w("عمق النظارة", "Visor depth", "עומק המשקפת"), 0.6, 1.6), knob("strap", w("سماكة الحزام", "Strap thickness", "עובי הרצועה"), 0.4, 2)],
  wheel: [knob("rim", w("سماكة الإطار", "Rim thickness", "עובי החישוק"), 0.5, 2), count("spokes", w("عدد الأذرع", "Spokes", "חישורים"), 2, 6, 3)],
  dice: [knob("faces", w("عدد الأوجه", "Faces", "פאות"), 4, 20, 20, 1, [4, 6, 8, 12, 20])],
  trophy: [knob("cup", w("عرض الكأس", "Cup width", "רוחב הגביע"), 0.7, 1.4), knob("handles", w("حجم المقابض", "Handle size", "גודל הידיות"), 0, 1.6)],
  coin: [knob("thick", w("السماكة", "Thickness", "עובי"), 0.4, 3), count("sides", w("أضلاع الشعار", "Emblem sides", "צלעות הסמל"), 3, 8, 5)],
  sword: [knob("blade", w("طول النصل", "Blade length", "אורך הלהב"), 0.6, 1.35), knob("guard", w("عرض الواقي", "Guard width", "רוחב המגן"), 0.5, 1.8)],
  shield: [knob("width", w("العرض", "Width", "רוחב"), 0.7, 1.35), knob("gem", w("حجم الجوهرة", "Gem size", "גודל האבן"), 0, 2)],
  potion: [knob("neck", w("طول العنق", "Neck length", "אורך הצוואר"), 0.5, 1.6), knob("fill", w("كمية السائل", "Fill", "מילוי"), 0.15, 1, 0.6)],
  rocket: [knob("fins", w("حجم الأجنحة", "Fin size", "גודל הכנפיים"), 0.4, 1.8), knob("flame", w("طول اللهب", "Flame length", "אורך הלהבה"), 0, 2)],
  helmet: [knob("visor", w("حجم الواجهة", "Visor size", "גודל המצחייה"), 0.6, 1.3), knob("crest", w("ارتفاع العُرف", "Crest height", "גובה הכרבולת"), 0, 2)],
  tv: [knob("screen", w("حجم الشاشة", "Screen size", "גודל המסך"), 0.7, 1.1), knob("antennas", w("طول الهوائي", "Antenna length", "אורך האנטנות"), 0, 1.8)],
  chair: [knob("back", w("طول الظهر", "Back height", "גובה המשענת"), 0.7, 1.3), knob("wings", w("الأجنحة", "Side wings", "כנפי צד"), 0, 1.6)],
  cartridge: [knob("label", w("حجم الملصق", "Label size", "גודל התווית"), 0.5, 1.1), count("ridges", w("عدد الخطوط", "Ridges", "פסים"), 0, 8, 5)],
};

/** A model's knobs with the store's values (else each knob's own), each kept in range. */
export function knobsOf(kind: ModelKind, set?: Record<string, number>): Record<string, number> {
  return Object.fromEntries(MODEL_KNOBS[kind].map((k) => [k.id, fitKnob(k, set?.[k.id])]));
}
function fitKnob(k: KnobSpec, v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return k.def;
  if (k.values) return k.values.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
  const x = Math.min(k.max, Math.max(k.min, v));
  return k.step >= 1 ? Math.round(x) : x;
}

/**
 * How the store set a model up in the 3D scene editor (Admin → ثيمات المتجر → محرّر المشهد):
 * moved (stage units), turned (degrees) and sized from its place in the layout, stretched
 * (shape), its own knobs, its parts' colours, its finish and its animation. No animation
 * set = the stage's own gentle bob.
 */
export type StageLook = {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  shape?: { w: number; h: number; d: number };
  knobs?: Record<string, number>;
  colours?: Partial<Record<StagePart, string>>;
  finish?: (typeof FINISHES)[number];
  anim?: StageAnim;
  /** Its way through the scroll: the look above is where it starts, this is where it ends. */
  path?: StagePath;
};
type V3 = [number, number, number];
export const EASES = ["linear", "smooth", "early", "late"] as const;
/** The end of a model's way as the page scrolls past the opening (0 → 1), and how it gets there. */
export type StagePath = { pos: V3; rot: V3; scale: V3; ease: (typeof EASES)[number] };
/** The store's own 3D file for a model (binary glTF): drawn instead of the code model; `clip` = its animation to play. */
export type StageGlb = { url: string; name?: string; clip?: string };
/** A model the store shows: its kind, optional own words and link (else found as above), its look and its own file. */
export type StageModel = { kind: ModelKind; label?: string; href?: string; look?: StageLook; glb?: StageGlb };
/** A game the shopper can pick: it recolours the stage, swaps the model, and links to its products. */
export type StageGame = { name: string; color: string; href?: string; imageUrl?: string; model?: ModelKind };

export const LAYOUTS = ["orbit", "hero", "podium", "shelf"] as const;
export const FLOORS = ["grid", "stage", "none"] as const;
/**
 * The camera: its lens (fov, degrees), how far and how high it stands, the height it looks
 * at, how much it follows the pointer, and, over the scroll, how far it pulls back (dolly)
 * and goes down (drop); `orbit` turns it round the stage (radians a second).
 */
export type StageCamera = { fov: number; distance: number; height: number; target: number; sway: number; dolly: number; drop: number; orbit: number };
/** The lights: soft fill, the key light (strength and where it comes from, degrees), the two rim lights, reflections, halos. */
export type StageLights = { ambient: number; key: number; keyAngle: number; rim: number; env: number; halos: boolean; colours?: [string, string] };
/** The whole stage, the store's way (the theme's own where not set). */
export type StageScene = { layout?: (typeof LAYOUTS)[number]; floor?: (typeof FLOORS)[number]; floorColour?: string; floorGlow?: boolean; camera?: StageCamera; lights?: StageLights };
/** The stage as it was drawn before the editor (the editor's starting values). */
export const CAMERA_DEFAULT: StageCamera = { fov: 38, distance: 8, height: 0.4, target: 0, sway: 1, dolly: 1.5, drop: 1.2, orbit: 0 };
export const LIGHTS_DEFAULT: StageLights = { ambient: 0.55, key: 2, keyAngle: 31, rim: 30, env: 1, halos: true };
/** Each number's range, for the shop's checks and the admin's sliders. */
export const CAMERA_RANGE: Record<keyof StageCamera, [number, number]> = { fov: [20, 70], distance: [4, 16], height: [-3, 4], target: [-2, 2], sway: [0, 3], dolly: [-4, 6], drop: [-3, 4], orbit: [-1, 1] };
export const LIGHTS_RANGE: Record<"ambient" | "key" | "keyAngle" | "rim" | "env", [number, number]> = { ambient: [0, 3], key: [0, 8], keyAngle: [-180, 180], rim: [0, 120], env: [0, 4] };

/** The store's own choices for a theme (settings: header.storeThemeOptions[themeId]). */
export type StageOptions = { models?: StageModel[]; games?: StageGame[]; scene?: StageScene };

export const isModelKind = (v: unknown): v is ModelKind => typeof v === "string" && (MODEL_KINDS as readonly string[]).includes(v);

/** The store's category for a model: by the words above in its names and addresses. */
export function hrefFor(kind: ModelKind, categories: Array<{ name: string; slug: string }>, label: string): string {
  const words = MODEL_INFO[kind].find;
  const hit = categories.find((c) => {
    const text = `${c.name} ${c.slug}`.toLowerCase();
    return words.some((x) => text.includes(x.toLowerCase()));
  });
  return hit ? `/c/${encodeURIComponent(hit.slug)}` : `/search?q=${encodeURIComponent(label)}`;
}

const text = (v: unknown, max = 80) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const link = (v: unknown) => {
  const s = text(v, 300);
  return s && (/^\/(?!\/)/.test(s) || /^https:\/\//.test(s)) ? s : undefined;
};
const colour = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
/** A 3D file's address: https anywhere; plain http only on this computer, outside production (the store's own server in development). */
export const glbUrl = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length > 500 || /[\s"'<>]/.test(s)) return undefined;
  const local = process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(s);
  return local || /^https:\/\/[^/]+\//.test(s) ? s : undefined;
};
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);
const vec = (v: unknown, min: number, max: number, fallback: number): [number, number, number] | undefined =>
  Array.isArray(v) && v.length === 3 ? [num(v[0], min, max, fallback), num(v[1], min, max, fallback), num(v[2], min, max, fallback)] : undefined;

/** A model's look, checked: numbers kept in range, its own knobs only, unknown values dropped. */
export function cleanLook(raw: unknown, kind: ModelKind): StageLook | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const l = raw as Record<string, any>;
  const look: StageLook = {};
  const pos = vec(l.pos, -6, 6, 0);
  const rot = vec(l.rot, -360, 360, 0);
  const scale = vec(l.scale, 0.1, 4, 1);
  if (pos) look.pos = pos;
  if (rot) look.rot = rot;
  if (scale) look.scale = scale;
  if (l.shape && typeof l.shape === "object") look.shape = { w: num(l.shape.w, 0.4, 2.5, 1), h: num(l.shape.h, 0.4, 2.5, 1), d: num(l.shape.d, 0.4, 2.5, 1) };
  if (l.knobs && typeof l.knobs === "object") {
    const k = Object.fromEntries(MODEL_KNOBS[kind].filter((s) => typeof l.knobs[s.id] === "number").map((s) => [s.id, fitKnob(s, l.knobs[s.id])]));
    if (Object.keys(k).length) look.knobs = k;
  }
  if (l.colours && typeof l.colours === "object") {
    const c = Object.fromEntries(PARTS.map((part) => [part, colour(l.colours[part])]).filter(([, v]) => v));
    if (Object.keys(c).length) look.colours = c;
  }
  if ((FINISHES as readonly string[]).includes(l.finish)) look.finish = l.finish;
  if (l.anim && typeof l.anim === "object" && (ANIMS as readonly string[]).includes(l.anim.type)) {
    look.anim = {
      type: l.anim.type,
      speed: num(l.anim.speed, 0, 5, 1),
      amount: num(l.anim.amount, 0, 2, 1),
      trigger: (TRIGGERS as readonly string[]).includes(l.anim.trigger) ? l.anim.trigger : "always",
    };
  }
  if (l.path && typeof l.path === "object") {
    look.path = {
      pos: vec(l.path.pos, -6, 6, 0) ?? [0, 0, 0],
      rot: vec(l.path.rot, -360, 360, 0) ?? [0, 0, 0],
      scale: vec(l.path.scale, 0.1, 4, 1) ?? [1, 1, 1],
      ease: (EASES as readonly string[]).includes(l.path.ease) ? l.path.ease : "smooth",
    };
  }
  return Object.keys(look).length ? look : undefined;
}

/** A model's own file, checked (an address the shop may load, a short name and clip). */
export function cleanGlb(raw: unknown): StageGlb | undefined {
  const g = raw as Record<string, unknown> | null;
  const url = g && typeof g === "object" ? glbUrl(g.url) : undefined;
  return url ? { url, name: text(g!.name, 120), clip: text(g!.clip, 120) } : undefined;
}

/** The whole stage's settings, checked: numbers kept in range, unknown values dropped. */
export function cleanScene(raw: unknown): StageScene | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, any>;
  const scene: StageScene = {};
  if ((LAYOUTS as readonly string[]).includes(r.layout)) scene.layout = r.layout;
  if ((FLOORS as readonly string[]).includes(r.floor)) scene.floor = r.floor;
  if (colour(r.floorColour)) scene.floorColour = r.floorColour;
  if (typeof r.floorGlow === "boolean") scene.floorGlow = r.floorGlow;
  if (r.camera && typeof r.camera === "object") {
    scene.camera = Object.fromEntries(
      (Object.keys(CAMERA_DEFAULT) as Array<keyof StageCamera>).map((k) => [k, num(r.camera[k], CAMERA_RANGE[k][0], CAMERA_RANGE[k][1], CAMERA_DEFAULT[k])]),
    ) as StageCamera;
  }
  if (r.lights && typeof r.lights === "object") {
    const l = r.lights;
    const range = (k: keyof typeof LIGHTS_RANGE) => num(l[k], LIGHTS_RANGE[k][0], LIGHTS_RANGE[k][1], LIGHTS_DEFAULT[k]);
    const lights: StageLights = { ambient: range("ambient"), key: range("key"), keyAngle: range("keyAngle"), rim: range("rim"), env: range("env"), halos: l.halos !== false };
    if (Array.isArray(l.colours) && colour(l.colours[0]) && colour(l.colours[1])) lights.colours = [l.colours[0], l.colours[1]];
    scene.lights = lights;
  }
  return Object.keys(scene).length ? scene : undefined;
}

/** A list of models, checked (up to six; unknown kinds dropped). */
export function cleanModels(raw: unknown): StageModel[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .filter((m) => isModelKind(m?.kind))
    .slice(0, 6)
    .map((m) => ({ kind: m.kind as ModelKind, label: text(m.label), href: link(m.href), look: cleanLook(m.look, m.kind), glb: cleanGlb(m.glb) }));
  return list.length ? list : undefined;
}

/** A list of games, checked (up to twelve; each needs a name and a colour). */
export function cleanGames(raw: unknown): StageGame[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .filter((g) => text(g?.name) && colour(g?.color))
    .slice(0, 12)
    .map((g) => ({ name: text(g.name)!, color: colour(g.color)!, href: link(g.href), imageUrl: link(g.imageUrl), model: isModelKind(g.model) ? g.model : undefined }));
  return list.length ? list : undefined;
}

/** What the store chose for a theme, checked (wrong entries are dropped). */
export function stageOptionsOf(header: unknown, themeId: string): StageOptions {
  const all = (header as { storeThemeOptions?: Record<string, unknown> } | null | undefined)?.storeThemeOptions;
  const raw = (all && typeof all === "object" ? (all as Record<string, unknown>)[themeId] : null) as StageOptions | null;
  if (!raw || typeof raw !== "object") return {};
  return { models: cleanModels(raw.models), games: cleanGames(raw.games), scene: cleanScene(raw.scene) };
}

/**
 * The scene editor at work (the admin's theme gallery, through the studio frame): the
 * model being edited, the handle it shows (move, turn, size), whether the motion plays,
 * whether the handles snap to steps, which end of its scroll path the handles move
 * (`key`), and the scroll to show instead of the page's (`preview`, 0–1).
 */
export type StageEdit = { index: number; mode: "translate" | "rotate" | "scale"; play: boolean; snap: boolean; key: "start" | "end"; preview: number | null };
/**
 * The admin's draft, drawn live in the frame before it is saved. `ack` is the last handle
 * move the admin has taken in, so the frame knows when to stop holding its own copy.
 */
export type StageLive = { themeId: string; models: StageModel[]; games?: StageGame[]; scene?: StageScene; edit: StageEdit | null; ack: number };

/** A draft from the admin, checked like the saved choices. */
export function cleanLive(raw: unknown): StageLive | null {
  const d = raw as Record<string, any> | null;
  if (!d || typeof d !== "object" || typeof d.themeId !== "string") return null;
  const models = cleanModels(d.models);
  if (!models) return null;
  const e = d.edit as Record<string, unknown> | null;
  const edit: StageEdit | null =
    e && typeof e === "object"
      ? {
          index: Math.round(num(e.index, 0, models.length - 1, 0)),
          mode: e.mode === "rotate" || e.mode === "scale" ? e.mode : "translate",
          play: e.play !== false,
          snap: e.snap === true,
          key: e.key === "end" ? "end" : "start",
          preview: typeof e.preview === "number" && Number.isFinite(e.preview) ? num(e.preview, 0, 1, 0) : null,
        }
      : null;
  return { themeId: d.themeId, models, games: cleanGames(d.games), scene: cleanScene(d.scene), edit, ack: num(d.ack, 0, Number.MAX_SAFE_INTEGER, 0) };
}
