/**
 * An element's own speed settings (props.perf, the editor's speed per element: docs/cms-big-engine-plan.ar.md J),
 * read again as the backend checked them, and the marks the page carries for them:
 *  - data-perf-tier: balanced (no frosted glass) or light (no blur, shadows, filters or endless motion: css.ts);
 *  - data-perf-phone="light", data-perf-strong: light on phones, light on weak devices (TreePerf marks them
 *    data-perf-light-now when it applies; canvases, clips and 3D read that);
 *  - data-perf-fps: the cap on its canvases' frames;
 *  - data-own-pause: it keeps moving while the page rests (lib/pageIdleCore.ts leaves it);
 *  - data-perf-watch: it rests while off screen (TreePerf).
 * No "@/" imports (the tests load it directly).
 */
export type Perf = { tier?: "full" | "balanced" | "light"; fps?: 24 | 30 | 60; offscreen?: "pause" | "keep"; rest?: "pause" | "keep"; phone?: "same" | "light"; strong?: boolean };

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function perfOf(raw: unknown): Perf | null {
  const r = obj(raw);
  const out: Perf = {};
  if (r.tier === "full" || r.tier === "balanced" || r.tier === "light") out.tier = r.tier;
  if (r.fps === 24 || r.fps === 30 || r.fps === 60) out.fps = r.fps;
  if (r.offscreen === "pause" || r.offscreen === "keep") out.offscreen = r.offscreen;
  if (r.rest === "pause" || r.rest === "keep") out.rest = r.rest;
  if (r.phone === "same" || r.phone === "light") out.phone = r.phone;
  if (r.strong === true) out.strong = true;
  return Object.keys(out).length ? out : null;
}

/**
 * The page's marks for an element's speed settings. `endless`: it has motion without an end (a loop, an effect,
 * sparkles, a looping morph, a clip that plays by itself), so it rests off screen unless told to keep moving.
 */
export function perfMarks(perf: Perf | null, endless: boolean): Record<string, string> {
  const m: Record<string, string> = {};
  if (perf?.tier === "balanced" || perf?.tier === "light") m["data-perf-tier"] = perf.tier;
  if (perf?.phone === "light") m["data-perf-phone"] = "light";
  if (perf?.strong) m["data-perf-strong"] = "";
  if (perf?.fps) m["data-perf-fps"] = String(perf.fps);
  if (perf?.rest === "keep") m["data-own-pause"] = "";
  if (endless && perf?.offscreen !== "keep") m["data-perf-watch"] = "";
  return m;
}

/** Whether an element moves without end (a loop, an effect, sparkles, a looping morph, a clip playing by itself). */
export function endlessOf(n: { type: string; props?: Record<string, unknown>; style?: unknown }, motion: { loop?: unknown; fx?: unknown } | null | undefined): boolean {
  const p = n.props ?? {};
  return Boolean(motion?.loop || motion?.fx || (n.type === "image" && p.sparkle) || (n.type === "svg" && (p.morph as { on?: string } | undefined)?.on === "loop") || (n.type === "video" && p.autoplay === true) || formFlowsIn(n.style));
}
/** Whether a screen's shape by equations flows (its waves running, a blob breathing: shared/shapeForm.ts). */
function formFlowsIn(style: unknown): boolean {
  const st = (style && typeof style === "object" ? style : {}) as Record<string, { form?: { whole?: { flow?: unknown }; edges?: Record<string, { flow?: unknown } | undefined> } } | undefined>;
  return ["base", "tablet", "mobile"].some((k) => {
    const f = st[k]?.form;
    return Boolean(f && (Number(f.whole?.flow) > 0 || Object.values(f.edges ?? {}).some((e) => Number(e?.flow) > 0)));
  });
}

/** Whether a page needs its speed settings at work (TreePerf): an element light on phones or weak devices, or moving without end. */
export function perfNeeded(n: { type: string; props?: Record<string, unknown>; style?: unknown }, motion: { loop?: unknown; fx?: unknown } | null | undefined): boolean {
  const perf = perfOf(n.props?.perf);
  return Boolean(perf?.tier === "light" || perf?.phone === "light" || perf?.strong || (endlessOf(n, motion) && perf?.offscreen !== "keep"));
}

/** Whether an element is to be light now (its own setting, or light on phones / weak devices as TreePerf marked). */
export const lightNow = (el: Element | null) => Boolean(el?.closest("[data-perf-tier=light],[data-perf-light-now]"));
/** The cap on an element's canvases' frames a second (none: Infinity). */
export function fpsCap(el: Element | null): number {
  const v = Number(el?.closest("[data-perf-fps]")?.getAttribute("data-perf-fps"));
  if (Number.isFinite(v) && v > 0) return v;
  return el?.closest("[data-perf-tier=balanced]") ? 30 : Infinity;
}
