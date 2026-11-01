/**
 * A page tree's 3D model (model3d) as the shop draws it (Model3dSpot → Model3dCanvas): its
 * settings checked again here with the backend's rules — a built-in model the shop knows
 * (storeThemes/three/kinds.ts) or the store's own .glb, its finish, colours and shape knobs,
 * its pose, motion, camera, light, floor, and how shoppers may move it. Anything unknown or
 * out of range falls back to its default. No 3D code here, so the server and tests load it.
 */
import { ANIMS, FINISHES, MODEL_KNOBS, PARTS, TRIGGERS, glbUrl, isModelKind, type ModelKind, type StagePart } from "../storeThemes/three/kinds";

export const LIGHT_PRESETS = ["studio", "soft", "sunset", "neon", "night", "warm"] as const;
export const FLOORS = ["none", "shadow", "grid", "disc"] as const;
type Lights = { ambient: number; key: number; env: number; rim: number; colours: [string, string] };
/** Each light's own values (a theme colour like "accent" is read from the page). */
export const LIGHTS: Record<(typeof LIGHT_PRESETS)[number], Lights> = {
  studio: { ambient: 0.6, key: 2.2, env: 1.2, rim: 20, colours: ["#ffffff", "#ffffff"] },
  soft: { ambient: 1, key: 1.2, env: 0.8, rim: 8, colours: ["#ffe9f1", "#e9f1ff"] },
  sunset: { ambient: 0.5, key: 2.4, env: 1, rim: 40, colours: ["#ff8a5b", "#ff4f9a"] },
  neon: { ambient: 0.3, key: 1, env: 0.8, rim: 70, colours: ["accent", "#22d3ee"] },
  night: { ambient: 0.2, key: 0.8, env: 0.5, rim: 50, colours: ["#3b82f6", "#a855f7"] },
  warm: { ambient: 0.7, key: 2, env: 1, rim: 25, colours: ["#fbbf24", "#f97316"] },
};

export type Model3dSpec = {
  /** A built-in model, or the store's own file (the file wins). */
  model: ModelKind | null;
  file: { url: string; clip?: string } | null;
  finish: (typeof FINISHES)[number];
  colours: Partial<Record<StagePart, string>>;
  knobs: Record<string, number>;
  /** Turned (radians), sized, and raised or lowered (scene units). */
  turn: [number, number, number];
  size: number;
  lift: number;
  anim: { type: (typeof ANIMS)[number]; speed: number; amount: number; trigger: (typeof TRIGGERS)[number] };
  camera: { fov: number; distance: number; height: number };
  lights: Lights & { preset: (typeof LIGHT_PRESETS)[number] };
  floor: (typeof FLOORS)[number];
  bg: string | null;
  drag: boolean;
  zoom: boolean;
  auto: number;
  tilt: boolean;
};

const num = (v: unknown, min: number, max: number, def: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : def);
const one = <T extends string>(v: unknown, list: readonly T[], def: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : def);
const TOKEN = /^(text|muted|accent|accent-soft|accent-contrast|bg|surface|border|white|black|transparent)$/;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const colourOf = (v: unknown) => (typeof v === "string" && (TOKEN.test(v) || HEX.test(v)) ? v : undefined);
const rad = (deg: number) => (deg * Math.PI) / 180;
const obj = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});

/** The 3D model the shop may draw, or null when it has neither a model it knows nor a .glb. */
export function model3dOf(raw: unknown): Model3dSpec | null {
  const p = obj(raw);
  const f = obj(p.file);
  // The theme stage's rule for a file's address (https, the shop's own path, or a local one while developing).
  const at = typeof f.url === "string" ? (/^\/(?!\/)[^\s"'<>]{1,499}$/.test(f.url) ? f.url : glbUrl(f.url)) : undefined;
  const url = at && /\.glb([?#]|$)/i.test(at) ? at : null;
  const model = isModelKind(p.model) ? p.model : null;
  if (!url && !model) return null;
  const knobs: Record<string, number> = {};
  if (model) for (const k of MODEL_KNOBS[model]) if (typeof obj(p.knobs)[k.id] === "number") knobs[k.id] = num(obj(p.knobs)[k.id], k.min, k.max, k.def);
  const colours: Partial<Record<StagePart, string>> = {};
  for (const part of PARTS) {
    const c = colourOf(obj(p.colours)[part]);
    if (c) colours[part] = c;
  }
  const t = obj(p.turn);
  const a = obj(p.anim);
  const cam = obj(p.camera);
  const l = obj(p.lights);
  const preset = one(l.preset, LIGHT_PRESETS, "studio");
  const base = LIGHTS[preset];
  const lc = Array.isArray(l.colours) && l.colours.length === 2 && l.colours.every((c: unknown) => colourOf(c)) ? (l.colours as [string, string]) : base.colours;
  return {
    model,
    file: url ? { url, ...(typeof f.clip === "string" && f.clip.trim() && f.clip.length <= 100 ? { clip: f.clip.trim() } : {}) } : null,
    finish: one(p.finish, FINISHES, "metal"),
    colours,
    knobs,
    turn: [rad(num(t.x, -180, 180, 0)), rad(num(t.y, -180, 180, 0)), rad(num(t.z, -180, 180, 0))],
    size: num(p.size, 0.2, 3, 1),
    lift: num(p.lift, -2, 2, 0),
    anim: { type: one(a.type, ANIMS, "none"), speed: num(a.speed, 0, 5, 1), amount: num(a.amount, 0, 2, 1), trigger: one(a.trigger, TRIGGERS, "always") },
    camera: { fov: num(cam.fov, 15, 80, 34), distance: num(cam.distance, 2, 20, 6.2), height: num(cam.height, -5, 5, 0.4) },
    lights: { preset, ambient: num(l.ambient, 0, 3, base.ambient), key: num(l.key, 0, 8, base.key), env: num(l.env, 0, 4, base.env), rim: num(l.rim, 0, 120, base.rim), colours: lc },
    floor: one(p.floor, FLOORS, "shadow"),
    bg: colourOf(p.bg) ?? null,
    drag: p.drag === true && !p.href,
    zoom: p.zoom === true,
    auto: num(p.auto, -2, 2, 0),
    tilt: p.tilt === true,
  };
}

/** Whether it moves at all (else it's drawn once and again only when something changes). */
export const model3dMoves = (s: Model3dSpec) => s.anim.type !== "none" || s.auto !== 0 || s.tilt || s.drag || Boolean(s.file?.clip);
