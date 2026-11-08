/**
 * Particles behind a section (tsParticles slim, pageTree/TreeMedia.tsx): a hundred kinds, each
 * a small recipe (shape, how many, size, which way and how fast, and what it does: twinkle,
 * pulse, spin, glow, links, gravity, bounce, outline), in the section's colour (or a few for the
 * mixed ones), `amount` = how many, `speed` = how fast. Shapes beyond the built-in ones are the
 * shop's own SVGs (public/particles), painted in the particle's colour. They draw inside the
 * section only, rest while it's out of sight, and never take the mouse.
 */
type Glyph =
  | "heart" | "leaf" | "petal" | "snowflake" | "note" | "drop" | "moon" | "flower" | "diamond" | "ring" | "plus" | "bolt" | "cloud" | "feather"
  | "butterfly" | "star8" | "lantern" | "gift" | "tag" | "bean" | "sun" | "bird" | "balloon" | "percent" | "ribbon" | "coin" | "bag";
type Shape = "circle" | "square" | "triangle" | "hexagon" | "star" | "spark" | "line" | Glyph;
type Move = "fall" | "rise" | "left" | "right" | "float" | "still" | "diagonal" | "blizzard";
type Def = {
  shape: Shape | Shape[];
  n: number;
  size: [number, number];
  move: Move;
  speed: [number, number];
  op?: [number, number];
  twinkle?: number;
  pulse?: number;
  spin?: number;
  links?: number;
  glow?: number;
  gravity?: boolean;
  bounce?: boolean;
  outline?: number;
  mix?: boolean;
  straight?: boolean;
};

const D = (shape: Def["shape"], n: number, size: Def["size"], move: Move, speed: Def["speed"], more: Partial<Def> = {}): Def => ({ shape, n, size, move, speed, ...more });

/** The hundred kinds, by key (the backend's PARTICLES list is the same, in the same order). */
export const PARTICLE_DEFS = {
  // Weather
  snow: D("circle", 80, [1, 4], "fall", [.4, 1.4], { op: [.4, .9] }),
  "snow-heavy": D("circle", 110, [2, 6], "fall", [.6, 1.6], { op: [.5, 1] }),
  snowflakes: D("snowflake", 40, [6, 14], "fall", [.4, 1.1], { spin: 6, op: [.5, .9] }),
  blizzard: D("circle", 120, [1, 3], "blizzard", [3, 6], { op: [.4, .9], straight: true }),
  raindrops: D("drop", 70, [3, 6], "fall", [5, 9], { op: [.4, .8], straight: true }),
  drizzle: D("line", 80, [4, 9], "fall", [6, 10], { op: [.25, .6], straight: true }),
  clouds: D("cloud", 10, [26, 48], "right", [.2, .6], { op: [.12, .3] }),
  sunshine: D("sun", 14, [10, 22], "float", [.2, .5], { spin: 3, op: [.3, .7] }),
  bolts: D("bolt", 18, [8, 16], "float", [.3, .8], { twinkle: 2, op: [0, 1] }),
  // Night sky
  stars: D("circle", 120, [.5, 2], "float", [.1, .2], { twinkle: .8, op: [.1, 1] }),
  "twinkle-stars": D("star", 50, [2, 5], "still", [.05, .1], { twinkle: 1.2, op: [.1, 1] }),
  "star-dust": D("circle", 160, [.3, 1.2], "float", [.1, .3], { twinkle: 1, op: [.1, .8] }),
  shooting: D("circle", 12, [1, 2.5], "diagonal", [8, 14], { glow: 8, straight: true }),
  moons: D("moon", 12, [10, 20], "float", [.2, .5], { op: [.4, .9], spin: 1 }),
  "night-mix": D(["moon", "star8", "star"], 40, [4, 12], "float", [.2, .4], { twinkle: 1, op: [.2, 1] }),
  constellation: D("circle", 60, [1, 2.5], "float", [.2, .4], { links: 110, twinkle: .6, op: [.3, 1] }),
  "galaxy-dust": D("circle", 140, [.4, 1.4], "float", [.2, .5], { links: 50, op: [.2, .8] }),
  orbs: D("circle", 16, [10, 30], "float", [.2, .5], { op: [.08, .25], glow: 20 }),
  fireflies: D("circle", 40, [1, 3], "float", [.4, .8], { twinkle: 1.2, glow: 8, op: [.1, 1] }),
  "fireflies-warm": D("circle", 60, [1.5, 4], "float", [.3, .7], { twinkle: 1.5, glow: 14, op: [.1, 1] }),
  // Nature
  leaves: D("leaf", 30, [8, 16], "fall", [.6, 1.4], { spin: 8, op: [.5, .9] }),
  "leaves-wind": D("leaf", 30, [8, 16], "right", [1, 2.4], { spin: 10, op: [.5, .9] }),
  petals: D("petal", 40, [6, 12], "fall", [.5, 1.3], { spin: 9, op: [.5, .9] }),
  sakura: D("flower", 34, [6, 12], "fall", [.4, 1], { spin: 5, op: [.5, .9] }),
  feathers: D("feather", 16, [12, 22], "fall", [.3, .8], { spin: 4, op: [.4, .8] }),
  butterflies: D("butterfly", 18, [8, 16], "float", [.6, 1.4], { pulse: 4, op: [.6, 1] }),
  birds: D("bird", 16, [10, 18], "left", [1, 2.2], { op: [.4, .8] }),
  pollen: D("circle", 70, [.6, 2], "rise", [.2, .6], { twinkle: 1, op: [.2, .8] }),
  dandelion: D("spark", 40, [2, 5], "rise", [.3, .8], { spin: 3, op: [.4, .9] }),
  "nature-mix": D(["leaf", "flower", "butterfly"], 30, [7, 14], "float", [.4, 1], { spin: 4, op: [.5, .9] }),
  // Water
  bubbles: D("circle", 30, [4, 18], "rise", [.4, 1.2], { op: [.15, .4] }),
  "bubbles-big": D("ring", 22, [14, 30], "rise", [.4, 1], { op: [.25, .6] }),
  foam: D("circle", 120, [1, 4], "rise", [1.2, 2.6], { op: [.2, .6] }),
  "bubble-pop": D("circle", 30, [4, 14], "float", [.2, .5], { pulse: 3, twinkle: 1, op: [.1, .5] }),
  "ocean-mix": D(["ring", "drop"], 36, [5, 14], "rise", [.4, 1], { op: [.3, .7] }),
  // Celebration
  confetti: D(["square", "circle"], 60, [3, 6], "fall", [1, 2.5], { spin: 12, mix: true, op: [.9, .9] }),
  "confetti-fall": D(["square", "circle", "triangle"], 90, [3, 7], "fall", [.5, 1.5], { spin: 15, mix: true, gravity: true, op: [.85, 1] }),
  ribbons: D("ribbon", 30, [10, 18], "fall", [.8, 1.8], { spin: 10, mix: true, op: [.8, 1] }),
  balloons: D("balloon", 18, [14, 26], "rise", [.6, 1.4], { mix: true, op: [.7, .95] }),
  gifts: D("gift", 18, [10, 18], "fall", [.5, 1.2], { spin: 5, op: [.6, .95] }),
  hearts: D("heart", 24, [6, 14], "rise", [.4, 1.1], { op: [.3, .8] }),
  "hearts-fall": D("heart", 30, [6, 14], "fall", [.5, 1.3], { spin: 4, op: [.4, .9] }),
  "hearts-pulse": D("heart", 20, [8, 16], "float", [.2, .5], { pulse: 3, op: [.4, .9] }),
  sparkles: D("spark", 50, [1, 4], "float", [.3, .5], { twinkle: 1.5, op: [0, 1] }),
  glitter: D("square", 120, [1, 2.5], "float", [.3, .8], { spin: 20, twinkle: 3, mix: true, op: [0, 1] }),
  "stars-gold": D("star", 36, [4, 9], "fall", [.6, 1.4], { spin: 8, op: [.6, 1] }),
  diamonds: D("diamond", 24, [6, 12], "float", [.3, .6], { twinkle: 1.4, spin: 3, op: [.3, 1] }),
  rings: D("ring", 22, [8, 16], "float", [.3, .6], { spin: 4, op: [.4, .9] }),
  "party-mix": D(["square", "balloon", "star8"], 60, [5, 14], "fall", [.6, 1.4], { spin: 8, mix: true, op: [.7, 1] }),
  wedding: D(["heart", "ring"], 34, [6, 14], "float", [.3, .6], { twinkle: .8, op: [.4, .9] }),
  // Occasions
  lanterns: D("lantern", 16, [12, 22], "rise", [.3, .7], { glow: 12, op: [.6, 1] }),
  ramadan: D(["lantern", "moon", "star8"], 30, [8, 18], "float", [.2, .5], { twinkle: .8, glow: 8, op: [.5, 1] }),
  eid: D(["gift", "star8", "balloon"], 34, [8, 16], "float", [.3, .7], { spin: 3, mix: true, op: [.6, 1] }),
  star8: D("star8", 30, [8, 16], "float", [.2, .5], { spin: 4, op: [.4, .9] }),
  "winter-mix": D(["snowflake", "circle"], 70, [3, 12], "fall", [.4, 1.1], { spin: 4, op: [.5, .9] }),
  "spring-mix": D(["flower", "petal", "butterfly"], 36, [6, 14], "fall", [.4, 1], { spin: 5, op: [.5, .9] }),
  "autumn-mix": D(["leaf", "feather"], 34, [8, 16], "fall", [.5, 1.2], { spin: 8, op: [.5, .9] }),
  summer: D(["sun", "drop"], 26, [8, 18], "float", [.3, .6], { spin: 2, op: [.4, .9] }),
  kids: D(["balloon", "heart", "star"], 40, [8, 16], "float", [.4, 1], { pulse: 2, mix: true, op: [.6, 1] }),
  valentine: D(["heart", "petal"], 40, [6, 14], "fall", [.4, 1], { spin: 4, op: [.5, .95] }),
  // Shopping
  coins: D("coin", 30, [8, 14], "fall", [.6, 1.4], { spin: 8, gravity: true, op: [.8, 1] }),
  percent: D("percent", 26, [8, 16], "fall", [.6, 1.4], { spin: 6, op: [.6, 1] }),
  tags: D("tag", 26, [8, 16], "fall", [.5, 1.2], { spin: 6, op: [.6, 1] }),
  "sale-mix": D(["percent", "tag", "bolt"], 36, [8, 16], "fall", [.6, 1.4], { spin: 6, op: [.7, 1] }),
  bags: D("bag", 20, [10, 18], "rise", [.4, 1], { op: [.5, .9] }),
  coffee: D("bean", 34, [6, 12], "fall", [.5, 1.2], { spin: 8, op: [.6, 1] }),
  notes: D("note", 30, [8, 16], "rise", [.4, 1], { spin: 4, op: [.5, .95] }),
  "notes-fall": D("note", 30, [8, 16], "fall", [.4, 1], { spin: 4, op: [.5, .95] }),
  "music-mix": D(["note", "star"], 36, [6, 14], "float", [.3, .7], { twinkle: 1, op: [.4, 1] }),
  // Geometry
  links: D("circle", 60, [2, 2], "float", [1, 1], { links: 130, op: [.7, .7] }),
  network: D("circle", 90, [1, 2.5], "float", [.6, 1], { links: 90, op: [.5, .9] }),
  "network-wide": D("circle", 40, [2, 3], "float", [.4, .8], { links: 200, op: [.6, 1] }),
  molecules: D("circle", 30, [4, 8], "float", [.8, 1.4], { links: 140, bounce: true, op: [.7, 1] }),
  bouncing: D("circle", 24, [6, 14], "float", [1.5, 3], { bounce: true, op: [.5, .9] }),
  triangles: D("triangle", 30, [5, 12], "float", [.3, .8], { spin: 5, op: [.4, .9] }),
  squares: D("square", 30, [4, 10], "float", [.3, .8], { spin: 6, op: [.4, .9] }),
  hexagons: D("hexagon", 26, [6, 14], "float", [.3, .7], { spin: 3, op: [.4, .9] }),
  "shapes-mix": D(["circle", "square", "triangle", "hexagon"], 40, [4, 12], "float", [.3, .8], { spin: 5, mix: true, op: [.5, .9] }),
  "circles-outline": D("circle", 26, [6, 16], "float", [.3, .7], { outline: 1.5, op: [.5, .9] }),
  "squares-outline": D("square", 26, [6, 14], "float", [.3, .7], { outline: 1.5, spin: 5, op: [.5, .9] }),
  "triangles-outline": D("triangle", 26, [7, 15], "float", [.3, .7], { outline: 1.5, spin: 5, op: [.5, .9] }),
  "hexagons-outline": D("hexagon", 26, [8, 16], "float", [.3, .7], { outline: 1.5, spin: 3, op: [.5, .9] }),
  "stars-outline": D("star", 26, [6, 14], "float", [.3, .7], { outline: 1.5, spin: 6, op: [.5, .9] }),
  plus: D("plus", 30, [5, 11], "float", [.3, .7], { spin: 6, op: [.4, .9] }),
  "dots-drift": D("circle", 70, [1.5, 3], "right", [.6, .8], { straight: true, op: [.3, .7] }),
  "pulse-dots": D("circle", 40, [2, 8], "still", [.05, .1], { pulse: 3, twinkle: 1, op: [.2, .8] }),
  lines: D("line", 40, [6, 14], "float", [.3, .7], { spin: 6, op: [.3, .7] }),
  // Tech and light
  pixels: D("square", 70, [2, 4], "fall", [1.5, 3], { straight: true, op: [.3, .9] }),
  "data-up": D("square", 70, [1.5, 3], "rise", [2.5, 5], { straight: true, op: [.3, .8] }),
  sparks: D("circle", 60, [.6, 1.8], "float", [2, 4], { glow: 6, op: [.4, 1] }),
  embers: D("circle", 60, [1, 3], "rise", [.6, 1.6], { twinkle: 2, glow: 8, op: [.1, 1] }),
  "glow-dots": D("circle", 24, [3, 7], "float", [.3, .6], { glow: 18, op: [.4, .9] }),
  "neon-lines": D("line", 30, [8, 16], "float", [.4, .9], { spin: 4, glow: 10, op: [.5, 1] }),
  comets: D("circle", 24, [1.5, 3], "diagonal", [5, 9], { glow: 10, straight: true, op: [.6, 1] }),
  "magic-dust": D("spark", 60, [1.5, 4], "rise", [.3, .8], { twinkle: 2, glow: 8, op: [0, 1] }),
  bokeh: D("circle", 22, [16, 40], "right", [.1, .3], { op: [.06, .2] }),
  "fairy-lights": D("circle", 50, [1.5, 3.5], "still", [.05, .1], { twinkle: 1.6, glow: 10, op: [.1, 1] }),
  "aurora-dust": D("circle", 30, [8, 20], "right", [.2, .5], { twinkle: .6, glow: 24, op: [.08, .3] }),
  "snow-globe": D(["circle", "star"], 70, [1.5, 5], "rise", [.2, .6], { twinkle: .8, op: [.4, 1] }),
  "rose-rain": D("petal", 80, [6, 12], "fall", [.8, 1.8], { spin: 10, mix: true, op: [.6, 1] }),
} satisfies Record<string, Def>;

export const PARTICLE_KINDS = Object.keys(PARTICLE_DEFS) as Array<keyof typeof PARTICLE_DEFS>;
export type ParticleKind = keyof typeof PARTICLE_DEFS;
export type ParticleSpec = { kind: ParticleKind; amount?: number; speed?: number };

const within = (v: unknown, min: number, max: number, def: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : def);

/** A section's particles as the shop keeps them, or null (unknown kinds and numbers out of range drop out). */
export function particlesOf(raw: unknown): (ParticleSpec & { color?: string }) | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const kind = r && Object.prototype.hasOwnProperty.call(PARTICLE_DEFS, String(r.kind)) ? (r.kind as ParticleKind) : null;
  if (!r || !kind) return null;
  return { kind, amount: within(r.amount, 0.2, 3, 1), speed: within(r.speed, 0.2, 3, 1), ...(typeof r.color === "string" ? { color: r.color } : {}) };
}

const GLYPHS = new Set<string>(["heart", "leaf", "petal", "snowflake", "note", "drop", "moon", "flower", "diamond", "ring", "plus", "bolt", "cloud", "feather", "butterfly", "star8", "lantern", "gift", "tag", "bean", "sun", "bird", "balloon", "percent", "ribbon", "coin", "bag"]);
const DIRECTION: Record<Move, string> = { fall: "bottom", rise: "top", left: "left", right: "right", float: "none", still: "none", diagonal: "bottom-left", blizzard: "bottom-left" };
const MIX = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];

/** tsParticles' shape options for one or several shapes (the shop's SVGs painted in the particle's colour). */
function shapeOf(shapes: Shape[], fill: boolean) {
  const types = new Set<string>(), options: Record<string, unknown> = {}, images: unknown[] = [];
  for (const s of shapes) {
    if (GLYPHS.has(s)) { types.add("image"); images.push({ src: `/particles/${s}.svg`, width: 32, height: 32, replaceColor: true }); }
    else if (s === "triangle" || s === "hexagon") { types.add("polygon"); options.polygon = { sides: s === "triangle" ? 3 : 6 }; }
    else if (s === "star" || s === "spark") { types.add("star"); options.star = s === "spark" ? { sides: 4, inset: 3 } : { sides: 5, inset: 2 }; }
    else types.add(s);
  }
  if (images.length) options.image = images;
  return { type: [...types].length === 1 ? [...types][0] : [...types], options, fill };
}

export function particleOptions(s: ParticleSpec, color: string): Record<string, unknown> {
  const def: Def = PARTICLE_DEFS[s.kind] ?? PARTICLE_DEFS.snow;
  // At most 360 on a section (150 when they link up: links cost the square of the count).
  const n = (v: number) => Math.min(def.links ? 150 : 360, Math.max(1, Math.round(v * (s.amount ?? 1))));
  const v = (x: number) => +(x * (s.speed ?? 1)).toFixed(2);
  const shapes = Array.isArray(def.shape) ? def.shape : [def.shape];
  const line = shapes.includes("line");
  const outline = def.outline ?? (line ? 1.4 : 0);
  return {
    fullScreen: { enable: false }, fpsLimit: 60, detectRetina: true, pauseOnOutsideViewport: true, background: { color: "transparent" },
    interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } },
    particles: {
      number: { value: n(def.n) },
      color: { value: def.mix ? [color, ...MIX] : color },
      shape: shapeOf(shapes, !def.outline),
      ...(outline ? { stroke: { width: outline, color: { value: color } } } : {}),
      size: { value: { min: def.size[0], max: def.size[1] }, ...(def.pulse ? { animation: { enable: true, speed: v(def.pulse), sync: false } } : {}) },
      opacity: { value: { min: (def.op ?? [.5, .9])[0], max: (def.op ?? [.5, .9])[1] }, ...(def.twinkle ? { animation: { enable: true, speed: v(def.twinkle), sync: false } } : {}) },
      ...(def.spin || line ? { rotate: { value: { min: 0, max: 360 }, ...(def.spin ? { animation: { enable: true, speed: v(def.spin) } } : {}) } } : {}),
      ...(def.glow ? { shadow: { enable: true, blur: def.glow, color: { value: color } } } : {}),
      ...(def.links ? { links: { enable: true, distance: def.links, color, opacity: .35, width: 1 } } : {}),
      ...(def.bounce ? { collisions: { enable: true, mode: "bounce" } } : {}),
      move: {
        enable: true, direction: DIRECTION[def.move], speed: { min: v(def.speed[0]), max: v(def.speed[1]) },
        random: !def.straight, straight: Boolean(def.straight), outModes: { default: def.bounce || def.links ? "bounce" : "out" },
        ...(def.gravity ? { gravity: { enable: true, acceleration: 2, maxSpeed: v(6) } } : {}),
      },
    },
  };
}
