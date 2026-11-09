/**
 * What the shop reads, cleaned again, for three things the editor adds to any element
 * (the backend checks them first: lib/pageTree.ts):
 *
 * - a scroll scene's settings (a clip that plays with the scroll, or a picture held still);
 * - an element's two extra layers, `before` (behind its content) and `after` (in front when
 *   `front`), real pieces that its keyframes can move like CSS ::before/::after can't;
 * - its triggers: when something happens (a click, the mouse, coming into sight, a time…), what
 *   to do, one after another. Links and words are turned into what this page shows here
 *   (its language, its language's address) before they reach the browser.
 *
 * No DOM and no "@/" imports, so tests load this file directly.
 */
const within = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
const inList = <T extends string>(v: unknown, list: readonly T[]) => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);
const obj = (v: unknown): Record<string, unknown> | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);
const COLOR_TOKENS = ["text", "muted", "accent", "accent-soft", "accent-contrast", "bg", "surface", "border", "white", "black", "transparent"];
const isColor = (v: unknown): v is string => typeof v === "string" && (COLOR_TOKENS.includes(v) || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v));
const NO_ODD = /^[^\s<>"'`\\]+$/;
const safeSrc = (v: unknown) => (typeof v === "string" && NO_ODD.test(v) && /^(\/(?!\/)|https:\/\/)/i.test(v) ? v : undefined);
const ID = /^[A-Za-z0-9_-]{1,40}$/;

/* ------------------------------------------------------------ scroll scene */

export type SceneRange = { from: number; to: number };
export type ScrollSceneSpec = {
  media: { kind: "video" | "image" | "none"; src?: string; phone?: string; poster?: string; fit: "cover" | "contain"; focus?: { x: number; y: number }; label?: unknown };
  mode: "pin" | "flow";
  length: number;
  chapters: number;
  smooth: number;
  fps: number;
  blur?: SceneRange & { amount: number };
  dim?: SceneRange & { opacity: number; color?: string };
  zoom?: SceneRange & { scale: number };
  progress: "none" | "bar" | "dots" | "line";
};
const range = (r: Record<string, unknown> | undefined) => {
  const from = within(r?.from, 0, 100);
  const to = within(r?.to, 0, 100);
  return from !== undefined && to !== undefined ? { from, to } : undefined;
};

/** A scroll scene's settings, every value in range (defaults for what's missing). */
export function scrollSceneOf(p: Record<string, unknown> | undefined): ScrollSceneSpec {
  const m = obj(p?.media);
  const kind = inList(m?.kind, ["video", "image", "none"] as const) ?? "none";
  const src = safeSrc(m?.src);
  const focus = obj(m?.focus);
  const fx = within(focus?.x, 0, 100), fy = within(focus?.y, 0, 100);
  const blur = obj(p?.blur), dim = obj(p?.dim), zoom = obj(p?.zoom);
  const blurAmount = within(blur?.amount, 0, 40), dimOpacity = within(dim?.opacity, 0, 0.95), zoomScale = within(zoom?.scale, 0.5, 3);
  const br = range(blur), dr = range(dim), zr = range(zoom);
  return {
    media: {
      kind: src ? kind : "none",
      ...(src ? { src } : {}),
      ...(safeSrc(m?.phone) ? { phone: safeSrc(m?.phone) } : {}),
      ...(safeSrc(m?.poster) ? { poster: safeSrc(m?.poster) } : {}),
      fit: m?.fit === "contain" ? "contain" : "cover",
      ...(fx !== undefined && fy !== undefined ? { focus: { x: fx, y: fy } } : {}),
      ...(m?.label ? { label: m.label } : {}),
    },
    mode: p?.mode === "flow" ? "flow" : "pin",
    length: within(p?.length, 1, 12) ?? 4,
    chapters: Math.round(within(p?.chapters, 1, 20) ?? 10),
    smooth: within(p?.smooth, 0, 1) ?? 0.35,
    fps: Math.round(within(p?.fps, 12, 120) ?? 30),
    ...(br && blurAmount !== undefined ? { blur: { ...br, amount: blurAmount } } : {}),
    ...(dr && dimOpacity !== undefined ? { dim: { ...dr, opacity: dimOpacity, ...(isColor(dim?.color) ? { color: dim!.color as string } : {}) } } : {}),
    ...(zr && zoomScale !== undefined ? { zoom: { ...zr, scale: zoomScale } } : {}),
    progress: inList(p?.progress, ["none", "bar", "dots", "line"] as const) ?? "none",
  };
}

/* ------------------------------------------------------------- the layers */

export type PieceLayerSpec = {
  bg?: string; to?: string; angle?: number; radial?: boolean;
  inset?: [number, number, number, number];
  at?: "fill" | "top" | "bottom" | "start" | "end" | "center";
  w?: number; h?: number;
  radius?: number; opacity?: number; blend?: string; blur?: number;
  border?: { width: number; color: string; style?: "solid" | "dashed" | "dotted" };
  front?: boolean;
};
export type LayersSpec = { before?: PieceLayerSpec; after?: PieceLayerSpec };
const BLENDS = ["normal", "multiply", "screen", "overlay", "soft-light", "color", "luminosity"] as const;

function layerOf(raw: unknown): PieceLayerSpec | undefined {
  const r = obj(raw);
  if (!r) return undefined;
  const out: PieceLayerSpec = {};
  if (isColor(r.bg)) out.bg = r.bg;
  if (isColor(r.to)) out.to = r.to;
  const angle = within(r.angle, 0, 360);
  if (angle !== undefined) out.angle = Math.round(angle);
  if (r.radial === true) out.radial = true;
  if (Array.isArray(r.inset) && r.inset.length === 4 && r.inset.every((v) => within(v, -400, 400) !== undefined)) out.inset = r.inset.slice() as PieceLayerSpec["inset"];
  const at = inList(r.at, ["fill", "top", "bottom", "start", "end", "center"] as const);
  if (at) out.at = at;
  const w = within(r.w, 0, 2000);
  if (w !== undefined) out.w = w;
  const h = within(r.h, 0, 2000);
  if (h !== undefined) out.h = h;
  const radius = within(r.radius, 0, 999);
  if (radius !== undefined) out.radius = radius;
  const opacity = within(r.opacity, 0, 1);
  if (opacity !== undefined) out.opacity = opacity;
  const blend = inList(r.blend, BLENDS);
  if (blend) out.blend = blend;
  const blur = within(r.blur, 0, 60);
  if (blur !== undefined) out.blur = blur;
  const b = obj(r.border);
  const bw = within(b?.width, 0, 20);
  if (b && bw !== undefined && isColor(b.color)) out.border = { width: bw, color: b.color, ...(inList(b.style, ["solid", "dashed", "dotted"] as const) ? { style: b.style as "solid" } : {}) };
  if (r.front === true) out.front = true;
  return out;
}

/** An element's extra layers, or undefined when it has none. */
export function layersOf(raw: unknown): LayersSpec | undefined {
  const r = obj(raw);
  if (!r) return undefined;
  const before = layerOf(r.before);
  const after = layerOf(r.after);
  return before || after ? { ...(before ? { before } : {}), ...(after ? { after } : {}) } : undefined;
}

/* ------------------------------------------------------------- the triggers */

export const TRIGGER_EVENTS = ["click", "dblclick", "hover", "leave", "view", "leaveView", "load", "scrolled", "timer"] as const;
export const PLAY_PRESETS = ["bounce", "shake", "pulse", "wiggle", "jello", "rubber", "heartbeat", "swing", "flip", "spin", "pop", "flash", "tada"] as const;
export const BURSTS = ["confetti", "hearts", "stars", "sparkles", "snow", "bubbles"] as const;
export const SOUNDS = ["click", "pop", "chime", "whoosh", "success"] as const;
export type TriggerActionSpec =
  | { act: "play"; target: string; what: "keys" | (typeof PLAY_PRESETS)[number]; mode: "play" | "reverse" | "toggle" | "restart" }
  | { act: "visible"; target: string; value: "show" | "hide" | "toggle" }
  | { act: "scrollTo"; target: string; offset: number }
  | { act: "scene"; target: string; at: number }
  | { act: "link"; href: string; newTab: boolean }
  | { act: "popup"; target: string; value: "open" | "close" }
  | { act: "video"; target: string; value: "play" | "pause" | "toggle" | "restart" | "mute" | "unmute" }
  | { act: "burst"; kind: (typeof BURSTS)[number]; color?: string; amount: number }
  | { act: "copy"; text: string; note: string }
  | { act: "toast"; text: string }
  | { act: "sound"; kind: (typeof SOUNDS)[number]; volume: number }
  | { act: "vibrate" }
  | { act: "wait"; seconds: number };
export type TriggerSpec = { on: (typeof TRIGGER_EVENTS)[number]; at?: number; once: boolean; do: TriggerActionSpec[] };

/**
 * An element's triggers for this page: unknown ones drop out, links get the page's language
 * (`link`, null = not a safe link) and words the page's language (`say`).
 */
export function triggersOf(raw: unknown, link: (href: unknown) => string | null, say: (words: unknown) => string): TriggerSpec[] {
  if (!Array.isArray(raw)) return [];
  const out: TriggerSpec[] = [];
  for (const t of raw.slice(0, 8)) {
    const r = obj(t);
    const on = inList(r?.on, TRIGGER_EVENTS);
    if (!r || !on || !Array.isArray(r.do)) continue;
    const acts: TriggerActionSpec[] = [];
    for (const a of r.do.slice(0, 8)) {
      const x = obj(a);
      if (!x) continue;
      const target = typeof x.target === "string" && ID.test(x.target) ? x.target : "self";
      switch (x.act) {
        case "play": {
          const what = x.what === "keys" ? "keys" : inList(x.what, PLAY_PRESETS);
          if (what) acts.push({ act: "play", target, what, mode: inList(x.mode, ["play", "reverse", "toggle", "restart"] as const) ?? "play" });
          break;
        }
        case "visible": {
          const value = inList(x.value, ["show", "hide", "toggle"] as const);
          if (value) acts.push({ act: "visible", target, value });
          break;
        }
        case "scrollTo":
          acts.push({ act: "scrollTo", target, offset: within(x.offset, -400, 400) ?? 0 });
          break;
        case "scene": {
          const at = within(x.at, 0, 100);
          if (at !== undefined) acts.push({ act: "scene", target, at });
          break;
        }
        case "link": {
          const href = link(x.href);
          if (href) acts.push({ act: "link", href, newTab: x.newTab === true });
          break;
        }
        case "popup": {
          const value = inList(x.value, ["open", "close"] as const);
          if (value) acts.push({ act: "popup", target, value });
          break;
        }
        case "video": {
          const value = inList(x.value, ["play", "pause", "toggle", "restart", "mute", "unmute"] as const);
          if (value) acts.push({ act: "video", target, value });
          break;
        }
        case "burst": {
          const kind = inList(x.kind, BURSTS);
          if (kind) acts.push({ act: "burst", kind, ...(isColor(x.color) ? { color: x.color } : {}), amount: Math.round(within(x.amount, 5, 200) ?? 60) });
          break;
        }
        case "copy": {
          const text = say(x.text).slice(0, 200);
          if (text) acts.push({ act: "copy", text, note: say(x.note).slice(0, 120) });
          break;
        }
        case "toast": {
          const text = say(x.text).slice(0, 200);
          if (text) acts.push({ act: "toast", text });
          break;
        }
        case "sound": {
          const kind = inList(x.kind, SOUNDS);
          if (kind) acts.push({ act: "sound", kind, volume: within(x.volume, 0, 1) ?? 0.35 });
          break;
        }
        case "vibrate":
          acts.push({ act: "vibrate" });
          break;
        case "wait": {
          const seconds = within(x.seconds, 0, 30);
          if (seconds !== undefined) acts.push({ act: "wait", seconds });
          break;
        }
        default:
          break;
      }
    }
    if (acts.length) out.push({ on, ...(within(r.at, 0, 600) !== undefined ? { at: within(r.at, 0, 600) } : {}), once: r.once === true, do: acts });
  }
  return out;
}
