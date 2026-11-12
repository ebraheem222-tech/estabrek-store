/**
 * What the shop reads, cleaned again, for three things the editor adds to any element
 * (the backend checks them first: lib/pageTree.ts):
 *
 * - a scroll scene's settings (a clip that plays with the scroll, or a picture held still);
 * - a section held on the screen until the next one covers it;
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
  /** The picture seen through a window that opens from small to the whole screen between two moments. */
  window?: SceneRange & { shape: (typeof SCENE_WINDOWS)[number] };
};
export const SCENE_WINDOWS = ["circle", "arch", "rounded", "diamond"] as const;
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
    ...(range(obj(p?.window)) && inList(obj(p?.window)?.shape, SCENE_WINDOWS) ? { window: { ...range(obj(p?.window))!, shape: inList(obj(p?.window)?.shape, SCENE_WINDOWS)! } } : {}),
  };
}

/* ---------------------------------------------------------- held and covered */

/** What a held section does while the next one covers it. */
export const COVER_UNDER = ["none", "dim", "shrink", "blur", "slow", "fade"] as const;
/** How the next one's top edge comes over it: straight, an arch that flattens, a slant that levels. */
export const COVER_ENTER = ["rise", "arch", "tilt"] as const;
export type CoverSpec = { hold: number; under: (typeof COVER_UNDER)[number]; phone: boolean; enter: (typeof COVER_ENTER)[number] };

/**
 * A section held on the screen while the page scrolls (`hold` screens), then covered by the
 * section after it, which slides up over it from below; null when it isn't.
 */
export function coverOf(v: unknown): CoverSpec | null {
  const c = obj(v);
  if (!c) return null;
  return { hold: within(c.hold, 0, 6) ?? 0, under: inList(c.under, COVER_UNDER) ?? "none", phone: c.phone !== false, enter: inList(c.enter, COVER_ENTER) ?? "rise" };
}

/** Where it sticks (one taller than the screen once its end is in sight), the part of it on the screen, and how far the next one comes over it. */
export function coverMeasure(height: number, screen: number, next: number) {
  const top = Math.min(0, screen - height);
  const seen = Math.min(height, screen);
  return { top, seen, d: Math.max(0, Math.min(seen, next)) };
}

/** How much of it is covered (0–1): the next one's top going from its end on the screen up by `d`. */
export const coverAmount = (nextTop: number, seen: number, d: number) => (d > 0 ? Math.max(0, Math.min(1, (seen - nextTop) / d)) : 0);

/** The painted section in the middle of the screen (its colour), or null (TreePaint). */
export function paintAt(spots: Array<{ top: number; bottom: number; paint: string }>, middle: number): string | null {
  return spots.find((s) => s.top <= middle && s.bottom > middle)?.paint ?? null;
}

/* -------------------------------------------------------------- the cursor */

/** The page's cursor (a dot, a ring, or one that turns what's under it around), its colour drawn by `paint`. */
export function cursorOf(v: unknown, paint: (c: unknown) => string | undefined): { kind: "dot" | "ring" | "blend"; color?: string; size?: number } | null {
  const c = obj(v);
  const kind = inList(c?.kind, ["dot", "ring", "blend"] as const);
  if (!kind) return null;
  const drawn = isColor(c?.color) ? paint(c!.color) : undefined;
  const size = within(c?.size, 8, 120);
  return { kind, ...(drawn ? { color: drawn } : {}), ...(size !== undefined ? { size } : {}) };
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

export const TRIGGER_EVENTS = ["click", "dblclick", "longpress", "hover", "leave", "view", "leaveView", "load", "scrolled", "timer", "key"] as const;
/** The keys a "key" trigger listens for: these by name, or one letter or digit. */
export const TRIGGER_KEYS = ["Enter", "Escape", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
export const TRIGGER_KEY = /^(Enter|Escape|Space|Arrow(Up|Down|Left|Right)|[a-z0-9])$/;
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
  | { act: "wait"; seconds: number }
  // What a button does in a shop (phase D): `href` "" = this page, `phone` "" = the store's own number.
  | { act: "back" }
  | { act: "share"; title: string; href: string }
  | { act: "call"; phone: string }
  | { act: "whatsapp"; phone: string; text: string }
  | { act: "download"; href: string; name: string }
  | { act: "bag"; productId: string; quantity: number }
  | { act: "wish"; productId: string; value: "add" | "remove" | "toggle" }
  | { act: "confirm"; text: string; yes: string; no: string };
/** The steps that can fail (a "no" to a question, a product that can't be bought): the recipe's `fail` steps run then. */
export const CAN_FAIL: ReadonlyArray<TriggerActionSpec["act"]> = ["confirm", "bag", "wish"];

/* Recipes (the backend's lib/pageTree.ts NodeTrigger): when → if → do, else; groups, variables. */
export const VAR_NAME = /^[A-Za-z][A-Za-z0-9_]{0,23}$/;
export const VAR_CMPS = ["eq", "ne", "gt", "lt", "gte", "lte", "set", "unset"] as const;
export const COUNT_CMPS = ["eq", "gte", "lte", "every"] as const;
export type VarValue = number | string | boolean;
export type ConditionSpec =
  | { if: "var"; name: string; cmp: (typeof VAR_CMPS)[number]; value?: VarValue }
  | { if: "count"; cmp: (typeof COUNT_CMPS)[number]; value: number }
  | { if: "device"; value: "phone" | "tablet" | "desktop" }
  | { if: "time"; from: number; to: number }
  | { if: "lang"; value: "ar" | "en" | "he" }
  | { if: "signedIn"; value: boolean }
  | { if: "bag"; cmp: "eq" | "gte" | "lte"; value: number };
export type PlainStepSpec =
  | TriggerActionSpec
  | { act: "set"; name: string; op: "set" | "add" | "toggle"; value?: VarValue }
  | { act: "waitUntil"; name: string; cmp: (typeof VAR_CMPS)[number]; value?: VarValue; seconds: number };
export type StepSpec =
  | PlainStepSpec
  | { act: "together" | "random"; do: PlainStepSpec[] }
  | { act: "repeat"; times: number; do: PlainStepSpec[] };
/**
 * `who`: who may run it (nothing = everyone); `deny`: what the others get: the element hidden, shown locked (with
 * `note` when pressed) or sent to sign in (`signin`, the sign-in page in this page's language). `fail`: the steps
 * that run when one of its steps fails.
 */
export type TriggerSpec = {
  on: (typeof TRIGGER_EVENTS)[number]; at?: number; once: boolean; key?: string;
  who?: "customer" | "guest"; deny?: "hide" | "lock" | "signin"; note?: string; signin?: string;
  if: ConditionSpec[]; do: StepSpec[]; else: StepSpec[]; fail: StepSpec[];
};

type Readers = { link: (href: unknown) => string | null; say: (words: unknown) => string };
const varValueOf = (v: unknown): VarValue | undefined =>
  typeof v === "boolean" ? v : typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1e9 ? v : typeof v === "string" ? v.slice(0, 80) : undefined;
const varNameOf = (v: unknown) => (typeof v === "string" && VAR_NAME.test(v) ? v : undefined);
const phoneOf = (v: unknown) => (typeof v === "string" && /^\+?[0-9][0-9 ()-]{4,19}$/.test(v.trim()) ? v.trim() : undefined);
const productOf = (v: unknown) => (typeof v === "string" && /^[\w-]{1,64}$/.test(v) ? v : undefined);
/** A file to download: on this site or over https, never a script. */
const fileOf = (v: unknown) => (typeof v === "string" && /^(https:\/\/|\/(?!\/))[^\s<>"'`\\]{1,500}$/.test(v) ? v : undefined);

function actionOf(x: Record<string, unknown>, { link, say }: Readers): TriggerActionSpec | null {
  const target = typeof x.target === "string" && ID.test(x.target) ? x.target : "self";
  switch (x.act) {
    case "play": {
      const what = x.what === "keys" ? "keys" : inList(x.what, PLAY_PRESETS);
      if (what) return ({ act: "play", target, what, mode: inList(x.mode, ["play", "reverse", "toggle", "restart"] as const) ?? "play" });
      break;
    }
    case "visible": {
      const value = inList(x.value, ["show", "hide", "toggle"] as const);
      if (value) return ({ act: "visible", target, value });
      break;
    }
    case "scrollTo":
      return { act: "scrollTo", target, offset: within(x.offset, -400, 400) ?? 0 };
    case "scene": {
      const at = within(x.at, 0, 100);
      if (at !== undefined) return ({ act: "scene", target, at });
      break;
    }
    case "link": {
      const href = link(x.href);
      if (href) return ({ act: "link", href, newTab: x.newTab === true });
      break;
    }
    case "popup": {
      const value = inList(x.value, ["open", "close"] as const);
      if (value) return ({ act: "popup", target, value });
      break;
    }
    case "video": {
      const value = inList(x.value, ["play", "pause", "toggle", "restart", "mute", "unmute"] as const);
      if (value) return ({ act: "video", target, value });
      break;
    }
    case "burst": {
      const kind = inList(x.kind, BURSTS);
      if (kind) return ({ act: "burst", kind, ...(isColor(x.color) ? { color: x.color } : {}), amount: Math.round(within(x.amount, 5, 200) ?? 60) });
      break;
    }
    case "copy": {
      const text = say(x.text).slice(0, 200);
      if (text) return ({ act: "copy", text, note: say(x.note).slice(0, 120) });
      break;
    }
    case "toast": {
      const text = say(x.text).slice(0, 200);
      if (text) return ({ act: "toast", text });
      break;
    }
    case "sound": {
      const kind = inList(x.kind, SOUNDS);
      if (kind) return ({ act: "sound", kind, volume: within(x.volume, 0, 1) ?? 0.35 });
      break;
    }
    case "vibrate":
      return { act: "vibrate" };
    case "wait": {
      const seconds = within(x.seconds, 0, 30);
      if (seconds !== undefined) return ({ act: "wait", seconds });
      break;
    }
    case "back":
      return { act: "back" };
    case "share": {
      const href = x.href === undefined || x.href === "" ? "" : link(x.href);
      if (href !== null) return { act: "share", title: say(x.title).slice(0, 120), href };
      break;
    }
    case "call": {
      const phone = x.phone === undefined || x.phone === "" ? "" : phoneOf(x.phone);
      if (phone !== undefined) return { act: "call", phone };
      break;
    }
    case "whatsapp": {
      const phone = x.phone === undefined || x.phone === "" ? "" : phoneOf(x.phone);
      if (phone !== undefined) return { act: "whatsapp", phone, text: say(x.text).slice(0, 300) };
      break;
    }
    case "download": {
      const file = fileOf(x.href);
      if (file) return { act: "download", href: file, name: typeof x.name === "string" ? x.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim().slice(0, 80) : "" };
      break;
    }
    case "bag": {
      const productId = productOf(x.productId);
      if (productId) return { act: "bag", productId, quantity: Math.round(within(x.quantity, 1, 20) ?? 1) };
      break;
    }
    case "wish": {
      const productId = productOf(x.productId);
      const value = inList(x.value, ["add", "remove", "toggle"] as const);
      if (productId && value) return { act: "wish", productId, value };
      break;
    }
    case "confirm": {
      const text = say(x.text).slice(0, 200);
      if (text) return { act: "confirm", text, yes: say(x.yes).slice(0, 24), no: say(x.no).slice(0, 24) };
      break;
    }
    default:
      break;
  }
  return null;
}

function plainStepOf(x: Record<string, unknown>, r: Readers): PlainStepSpec | null {
  if (x.act === "set") {
    const name = varNameOf(x.name);
    const op = inList(x.op, ["set", "add", "toggle"] as const);
    const value = varValueOf(x.value);
    if (!name || !op || (op === "add" && typeof value !== "number")) return null;
    return { act: "set", name, op, ...(value !== undefined && op !== "toggle" ? { value } : {}) };
  }
  if (x.act === "waitUntil") {
    const name = varNameOf(x.name);
    const cmp = inList(x.cmp, VAR_CMPS);
    if (!name || !cmp) return null;
    const value = varValueOf(x.value);
    return { act: "waitUntil", name, cmp, ...(value !== undefined ? { value } : {}), seconds: within(x.seconds, 0, 60) ?? 10 };
  }
  return actionOf(x, r);
}

function stepsOf(raw: unknown, r: Readers, max: number, groups: boolean): StepSpec[] {
  if (!Array.isArray(raw)) return [];
  const out: StepSpec[] = [];
  for (const a of raw.slice(0, max)) {
    const x = obj(a);
    if (!x) continue;
    if (groups && (x.act === "together" || x.act === "random" || x.act === "repeat")) {
      const inner = stepsOf(x.do, r, 8, false) as PlainStepSpec[];
      if (!inner.length) continue;
      if (x.act === "repeat") out.push({ act: "repeat", times: Math.round(within(x.times, 1, 20) ?? 2), do: inner });
      else out.push({ act: x.act, do: inner });
      continue;
    }
    const step = plainStepOf(x, r);
    if (step) out.push(step);
  }
  return out;
}

function conditionOf(raw: unknown): ConditionSpec | null {
  const c = obj(raw);
  if (!c) return null;
  switch (c.if) {
    case "var": {
      const name = varNameOf(c.name);
      const cmp = inList(c.cmp, VAR_CMPS);
      if (!name || !cmp) return null;
      const value = varValueOf(c.value);
      return { if: "var", name, cmp, ...(value !== undefined ? { value } : {}) };
    }
    case "count": {
      const cmp = inList(c.cmp, COUNT_CMPS);
      const value = within(c.value, 1, 1000);
      return cmp && value !== undefined ? { if: "count", cmp, value: Math.round(value) } : null;
    }
    case "device": {
      const value = inList(c.value, ["phone", "tablet", "desktop"] as const);
      return value ? { if: "device", value } : null;
    }
    case "time": {
      const from = within(c.from, 0, 23), to = within(c.to, 0, 23);
      return from !== undefined && to !== undefined ? { if: "time", from: Math.round(from), to: Math.round(to) } : null;
    }
    case "lang": {
      const value = inList(c.value, ["ar", "en", "he"] as const);
      return value ? { if: "lang", value } : null;
    }
    case "signedIn":
      return typeof c.value === "boolean" ? { if: "signedIn", value: c.value } : null;
    case "bag": {
      const cmp = inList(c.cmp, ["eq", "gte", "lte"] as const);
      const value = within(c.value, 0, 999);
      return cmp && value !== undefined ? { if: "bag", cmp, value: Math.round(value) } : null;
    }
    default:
      return null;
  }
}

/** Who alone sees an element: one of its recipes is for customers (or guests) and hides it from the others. */
export function hiddenFrom(list: TriggerSpec[]): "customer" | "guest" | undefined {
  return list.find((t) => t.who && t.deny === "hide")?.who;
}

/**
 * An element's recipes for this page: unknown ones drop out, links get the page's language
 * (`link`, null = not a safe link) and words the page's language (`say`).
 */
export function triggersOf(raw: unknown, link: (href: unknown) => string | null, say: (words: unknown) => string): TriggerSpec[] {
  if (!Array.isArray(raw)) return [];
  const r: Readers = { link, say };
  const out: TriggerSpec[] = [];
  for (const t of raw.slice(0, 8)) {
    const x = obj(t);
    const on = inList(x?.on, TRIGGER_EVENTS);
    if (!x || !on) continue;
    const steps = stepsOf(x.do, r, 16, true);
    const otherwise = stepsOf(x.else, r, 16, true);
    if (!steps.length && !otherwise.length) continue;
    const conditions = Array.isArray(x.if) ? x.if.slice(0, 6).map(conditionOf).filter((c): c is ConditionSpec => Boolean(c)) : [];
    // A key trigger without a key we know listens for nothing.
    const key = on === "key" && typeof x.key === "string" && TRIGGER_KEY.test(x.key) ? x.key : undefined;
    if (on === "key" && !key) continue;
    const who = inList(x.who, ["customer", "guest"] as const);
    const deny = who ? inList(x.deny, ["hide", "lock", "signin"] as const) ?? "lock" : undefined;
    const note = who ? say(x.note).slice(0, 120) : "";
    out.push({
      on, ...(within(x.at, 0, 600) !== undefined ? { at: within(x.at, 0, 600) } : {}), once: x.once === true, ...(key ? { key } : {}),
      ...(who ? { who, deny, ...(note ? { note } : {}), ...(deny === "signin" ? { signin: link("/account") ?? "/account" } : {}) } : {}),
      if: conditions, do: steps, else: conditions.length ? otherwise : [], fail: stepsOf(x.fail, r, 8, true),
    });
  }
  return out;
}
