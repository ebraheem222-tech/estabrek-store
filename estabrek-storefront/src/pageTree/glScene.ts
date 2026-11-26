/**
 * A WebGL scene the owner builds in the editor: the theme library's particle and shader tricks (Particle Text, the
 * dotted globe, the galaxy, the morphing word, code rain, the warp tunnel…) made into settings. A scene is a
 * background (a colour, a gradient, a glow or one of the library's WebGL shaders) and up to four layers of
 * particles. Each layer takes a shape — a form its particles hold (a sphere, a helix, a galaxy, the owner's words or
 * picture…), or a flow they keep moving in (rain, snow, a fountain, fireworks, a vortex…) — and may morph from form
 * to form. The pointer, a press and the scroll act on it; the camera turns, tilts and zooms.
 *
 * Both the element `glScene` (with its height) and a section's background keep it as their `gl` prop. Plain data and maths only: the
 * shop draws it (glEngine.ts, GlSceneView.tsx), the admin imports this file by path (no "@/" imports, no React).
 */
import { SHADER_KIND_LIST, type ShaderKind } from "./shader";

/** Forms: shapes the particles hold (and morph between). */
export const GL_FORMS = [
  "sphere", "ball", "cube", "torus", "knot", "helix", "galaxy", "rings", "wave", "grid", "cylinder", "cone",
  "heart", "star", "cloud", "globe", "spiral", "text", "image",
  // Maths: a Lissajous knot, a Möbius strip, a Klein bottle, a superformula shape, a gyroid, the Hopf fibration,
  // a Sierpiński pyramid, a Barnsley fern, a rose curve, a blob of spherical harmonics.
  "lissajous", "mobius", "klein", "supershape", "gyroid", "hopf", "sierpinski", "fern", "rose", "blob",
] as const;
/** Flows: ways the particles keep moving (a flow never morphs). */
export const GL_FLOWS = [
  "rain", "snow", "rise", "warp", "fountain", "fireworks", "vortex", "flow", "orbit", "fireflies",
  // Maths and physics (glPhysics.ts): three strange attractors, a flock, gravity, double pendulums, electric field
  // lines, a cloth, a pond.
  "lorenz", "aizawa", "thomas", "flock", "gravity", "pendulum", "charge", "cloth", "pond",
] as const;
export const GL_SHAPES = [...GL_FORMS, ...GL_FLOWS] as const;
export type GlForm = (typeof GL_FORMS)[number];
export type GlFlow = (typeof GL_FLOWS)[number];
export type GlShape = (typeof GL_SHAPES)[number];
export const isFlow = (s: GlShape): s is GlFlow => (GL_FLOWS as readonly string[]).includes(s);

/** How one particle looks. */
export const GL_SPRITES = ["soft", "dot", "ring", "square", "star", "spark", "plus", "heart", "glyph", "streak"] as const;
export type GlSprite = (typeof GL_SPRITES)[number];
/** How a layer is coloured: one colour, two blended across it, three, a rainbow, mixed at random, or its picture's own. */
export const GL_COLOURING = ["one", "blend", "three", "rainbow", "random", "picture"] as const;
export type GlColouring = (typeof GL_COLOURING)[number];
export const GL_FONTS = ["page", "sans", "serif", "mono", "display"] as const;
/** How words or a picture become dots (glPicture.ts): every drawn pixel, the outlines, an engraver's stipple, blobs,
 *  corners as sparks, or the picture's own few colours. */
export const GL_PICTURE_MODES = ["pixels", "edges", "stipple", "blobs", "features", "palette"] as const;
export type GlPictureMode = (typeof GL_PICTURE_MODES)[number];
export type GlFont = (typeof GL_FONTS)[number];

export const GL_BGS = ["none", "color", "gradient", "radial", "shader"] as const;
export type GlBgKind = (typeof GL_BGS)[number];
/** The library's WebGL shaders a scene may stand on (the physics canvases are 2D and stay section backgrounds). */
export const GL_BG_SHADERS = SHADER_KIND_LIST.slice(0, SHADER_KIND_LIST.indexOf("cloth")) as readonly ShaderKind[];

export const GL_POINTER = ["none", "repel", "attract", "swirl", "bulge", "gravity"] as const;
export type GlPointer = (typeof GL_POINTER)[number];
export const GL_CLICK = ["none", "burst", "shock", "next"] as const;
export type GlClick = (typeof GL_CLICK)[number];
export const GL_SCROLL = ["none", "spin", "zoom", "scatter", "rise"] as const;
export type GlScroll = (typeof GL_SCROLL)[number];
/** What moves a layer from one form to the next. */
export const GL_MORPH_BY = ["auto", "scroll", "click", "hover"] as const;
export type GlMorphBy = (typeof GL_MORPH_BY)[number];

/** The most particles in one layer, and in all of a scene's layers. */
export const GL_MAX_COUNT = 30000;
export const GL_MAX_TOTAL = 60000;
export const GL_MAX_LAYERS = 4;
export const GL_MAX_FORMS = 4;
/** A layer draws lines between its near particles only up to this many of them. */
export const GL_LINK_MAX = 500;

export type GlLayer = {
  /** The first one, and the forms it morphs to after it (a flow alone). */
  shapes: GlShape[];
  /** Words for a `text` form, in the page's language. */
  text: string;
  font: GlFont;
  weight: number;
  /** A picture for an `image` form, and its depth picture (white = near), made in the editor. */
  image?: string;
  depthMap?: string;
  count: number;
  /** A particle's size in px, and how much sizes differ (0 all the same … 1 very). */
  size: number;
  vary: number;
  sprite: GlSprite;
  /** The characters a `glyph` particle shows (code rain). */
  glyphs: string;
  colouring: GlColouring;
  c1?: string; c2?: string; c3?: string;
  opacity: number;
  /** Light adds up (glows on a dark ground); off: plain dots. */
  glow: boolean;
  /** Its size in the box (1 = fills it), where it sits (-1 … 1 from the middle) and how deep it is. */
  scale: number;
  x: number;
  y: number;
  depth: number;
  speed: number;
  /** Each particle wanders about its place, the form moves in waves, stars twinkle, the form breathes, it turns. */
  wander: number;
  wave: number;
  twinkle: number;
  pulse: number;
  spin: number;
  /** Lines between near particles (a constellation, a network). */
  links: number;
  /** A picture in relief: its light parts come forward. */
  relief: number;
  /** How each of its words or pictures (in the order of its forms) becomes dots. */
  pictureModes: GlPictureMode[];
  /** The dots move along the picture's lines, like brush strokes. */
  strokes: number;
};
export type GlBg = { kind: GlBgKind; c1?: string; c2?: string; c3?: string; c4?: string; shader: ShaderKind; speed: number; rainbow?: boolean };
export type GlSpec = {
  bg: GlBg;
  layers: GlLayer[];
  /** It turns by itself (and how fast), its tilt in degrees, how near it is, how deep the view is, turned by hand. */
  camera: { spin: number; tilt: number; zoom: number; depth: number; drag: boolean; focus: number; blur: number };
  pointer: { mode: GlPointer; radius: number; strength: number };
  click: GlClick;
  scroll: GlScroll;
  morph: { by: GlMorphBy; hold: number; time: number };
  /** Trails left behind (0 none … 0.95 long), film grain, a dark edge, a veil for words over it. */
  trails: number;
  /** Light that spills round the bright parts (bloom), and colours that part at the edges (chromatic aberration). */
  bloom: number;
  chroma: number;
  grain: number;
  vignette: number;
  veil: number;
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const pick = <T extends string>(v: unknown, list: readonly T[], def: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : def);
const num = (v: unknown, min: number, max: number, def: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
/** A colour as the page tree writes one: a theme colour's name, a design variable or a #hex (css.ts color() reads it). */
const colour = (v: unknown) => (typeof v === "string" && /^[#a-z0-9_.:-]{1,48}$/i.test(v.trim()) ? v.trim() : undefined);
const SAFE_SRC = /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/i;

export const GL_LAYER_DEFAULT: GlLayer = {
  shapes: ["sphere"], text: "", font: "page", weight: 800, count: 3000, size: 2.5, vary: 0.5, sprite: "soft", glyphs: "",
  colouring: "blend", opacity: 0.9, glow: true, scale: 1, x: 0, y: 0, depth: 0.3,
  speed: 1, wander: 0.15, wave: 0, twinkle: 0.2, pulse: 0, spin: 0.2, links: 0, relief: 0, pictureModes: [], strokes: 0,
};

/** A layer from its saved settings (`say` reads a text in the page's language). */
export function glLayerOf(raw: unknown, say: (t: unknown) => string = (t) => (typeof t === "string" ? t : "")): GlLayer | null {
  const r = obj(raw);
  const shapes = (Array.isArray(r.shapes) ? r.shapes : [r.shape]).filter((s): s is GlShape => (GL_SHAPES as readonly unknown[]).includes(s));
  if (!shapes.length) return null;
  // A flow alone; forms up to four.
  const kept = isFlow(shapes[0]) ? [shapes[0]] : shapes.filter((s) => !isFlow(s)).slice(0, GL_MAX_FORMS);
  const d = GL_LAYER_DEFAULT;
  const image = typeof r.image === "string" && SAFE_SRC.test(r.image.trim()) ? r.image.trim() : undefined;
  const depthMap = typeof r.depthMap === "string" && SAFE_SRC.test(r.depthMap.trim()) ? r.depthMap.trim() : undefined;
  const out: GlLayer = {
    shapes: kept,
    text: say(r.text).replace(/\s+/g, " ").trim().slice(0, 40),
    font: pick(r.font, GL_FONTS, d.font),
    weight: Math.round(num(r.weight, 300, 900, d.weight) / 100) * 100,
    ...(image ? { image } : {}),
    ...(depthMap ? { depthMap } : {}),
    count: Math.round(num(r.count, 50, GL_MAX_COUNT, d.count)),
    size: num(r.size, 0.5, 40, d.size),
    vary: num(r.vary, 0, 1, d.vary),
    sprite: pick(r.sprite, GL_SPRITES, d.sprite),
    glyphs: typeof r.glyphs === "string" ? Array.from(r.glyphs.replace(/\s/g, "")).slice(0, 64).join("") : "",
    colouring: pick(r.colouring, GL_COLOURING, d.colouring),
    opacity: num(r.opacity, 0.05, 1, d.opacity),
    glow: r.glow !== false,
    scale: num(r.scale, 0.1, 3, d.scale),
    x: num(r.x, -1, 1, d.x),
    y: num(r.y, -1, 1, d.y),
    depth: num(r.depth, 0, 2, d.depth),
    speed: num(r.speed, 0, 4, d.speed),
    wander: num(r.wander, 0, 1, d.wander),
    wave: num(r.wave, 0, 1, d.wave),
    twinkle: num(r.twinkle, 0, 1, d.twinkle),
    pulse: num(r.pulse, 0, 1, d.pulse),
    spin: num(r.spin, -2, 2, d.spin),
    links: num(r.links, 0, 1, d.links),
    relief: num(r.relief, 0, 1, d.relief),
    pictureModes: (Array.isArray(r.pictureModes) ? r.pictureModes : []).slice(0, GL_MAX_FORMS).map((m) => pick(m, GL_PICTURE_MODES, "pixels")),
    strokes: num(r.strokes, 0, 1, d.strokes),
  };
  for (const k of ["c1", "c2", "c3"] as const) {
    const c = colour(r[k]);
    if (c) out[k] = c;
  }
  return out;
}

/** A scene from its saved settings, or null when it has no layer and nothing behind. */
export function glSceneOf(raw: unknown, say?: (t: unknown) => string): GlSpec | null {
  const r = obj(raw);
  if (!Object.keys(r).length) return null;
  const b = obj(r.bg);
  const bg: GlBg = {
    kind: pick(b.kind, GL_BGS, "color"),
    shader: pick(b.shader, GL_BG_SHADERS, "aurora"),
    speed: num(b.speed, 0, 3, 1),
  };
  for (const k of ["c1", "c2", "c3", "c4"] as const) {
    const c = colour(b[k]);
    if (c) bg[k] = c;
  }
  if (typeof b.rainbow === "boolean") bg.rainbow = b.rainbow;
  const layers: GlLayer[] = [];
  let total = 0;
  for (const l of Array.isArray(r.layers) ? r.layers.slice(0, GL_MAX_LAYERS) : []) {
    const layer = glLayerOf(l, say);
    if (!layer) continue;
    // All the layers together stay within what a page can draw.
    layer.count = Math.min(layer.count, GL_MAX_TOTAL - total);
    if (layer.count < 50) break;
    total += layer.count;
    layers.push(layer);
  }
  if (!layers.length && bg.kind === "none") return null;
  const c = obj(r.camera), p = obj(r.pointer), m = obj(r.morph);
  return {
    bg,
    layers,
    camera: { spin: num(c.spin, -2, 2, 0), tilt: num(c.tilt, -80, 80, 0), zoom: num(c.zoom, 0.3, 3, 1), depth: num(c.depth, 0, 1, 0.5), drag: c.drag === true, focus: num(c.focus, -1, 1, 0), blur: num(c.blur, 0, 1, 0) },
    pointer: { mode: pick(p.mode, GL_POINTER, "repel"), radius: num(p.radius, 0.05, 0.8, 0.22), strength: num(p.strength, 0, 3, 1) },
    click: pick(r.click, GL_CLICK, "burst"),
    scroll: pick(r.scroll, GL_SCROLL, "none"),
    morph: { by: pick(m.by, GL_MORPH_BY, "auto"), hold: num(m.hold, 0.3, 15, 2.5), time: num(m.time, 0.2, 6, 1.6) },
    trails: num(r.trails, 0, 0.95, 0),
    bloom: num(r.bloom, 0, 1, 0),
    chroma: num(r.chroma, 0, 1, 0),
    grain: num(r.grain, 0, 0.4, 0),
    vignette: num(r.vignette, 0, 1, 0),
    veil: num(r.veil, 0, 0.85, 0),
  };
}

/** The element's height in px. */
export const glHeightOf = (v: unknown) => Math.round(num(v, 160, 1400, 480));
/** How many particles a scene draws in all (for its weight on the page). */
export const glCount = (spec: GlSpec) => spec.layers.reduce((s, l) => s + l.count, 0);
