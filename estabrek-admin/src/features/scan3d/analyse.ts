/**
 * A filmed turn, from frames to what the 3D scan needs (Admin → الوسائط → مسح 3D):
 * 1. The background: the first frames, before the product is put on the mat (the
 *    "clean plate"); the moment something comes in ends them.
 * 2. The mat, found in that background: where it is, how high the camera is, how big a
 *    millimetre is. Without it, the turn is taken to be steady.
 * 3. Every later frame: its exposure against the background, whether the frame's edges
 *    still show the background, whether the rings are where they were (the camera hasn't
 *    moved), how far the mat has turned, and the product's mask.
 * 4. The turn: the longest stretch where the product stands alone in the frame (a hand
 *    putting it down reaches the frame's edge), cut to exactly one turn.
 * 5. The checks: anything that would spoil the 3D shape rejects the video, with why.
 * Plain arithmetic on frames already decoded (video.ts decodes them), so it is tested
 * on drawn scenes.
 */
import { MAT_UNIT_MM } from "./mat";
import {
  borderBand,
  cleanMask,
  codeProfile,
  dilate,
  edgeChange,
  findMat,
  foregroundScore,
  gainOf,
  inkAndPaper,
  iou,
  lumaOf,
  matAngle,
  medianImage,
  noiseOf,
  ringsInPlace,
  fitMatModel,
  matMap,
  scaleFit,
  shrink,
  smoothScores,
  type Box,
  type Ellipse,
  type Img,
  SHADOW,
  type MatColours,
  type MatFit,
  type MatModel,
} from "./vision";

export type Level = "ok" | "warn" | "reject";
export type CheckId = "plate" | "product" | "mat" | "edges" | "camera" | "light" | "turn" | "steady" | "reading" | "gaps" | "speed" | "size" | "contrast";
/** One check: its result and the number it is about (seconds, degrees, a share…). */
export type Check = { id: CheckId; level: Level; value?: number };
/** `mask`: the product (the cut-outs); `solid`: the product with what only looks like shadow kept (the 3D carving). */
export type ScanFrame = { index: number; time: number; angle: number; mask: Uint8Array; solid: Uint8Array; box: Box; area: number };
export type Analysis = {
  w: number;
  h: number;
  plate: { end: number; seconds: number } | null;
  /**
   * The mat: its outer ring, the camera's height (degrees) and scale, which way its code
   * is printed, the camera model at this size, and which way the turntable turned in the
   * mat's own angles (+1: from x towards the camera), so a frame at `angle` has turned the
   * product by spin·angle.
   */
  mat: { outer: Ellipse; elevation: number; mmPerPx: number; mirror: 1 | -1; camera: MatModel; spin: 1 | -1 } | null;
  /** The frames of one turn, their angle from the first (degrees, growing). */
  turn: ScanFrame[];
  /** Degrees the turn covers. */
  rotation: number;
  /** The product's height (mm), from the mat's size; null without the mat. */
  heightMm: number | null;
  checks: Check[];
  verdict: Level;
};
export type AnalyseInput = {
  frames: Img[];
  times: number[];
  /** The background at the video's own size, for finding the mat's rings sharply. */
  hiPlate?: Img | null;
  /** Told how far along it is (0–1); awaited, so the page can draw. */
  onProgress?: (fraction: number) => unknown;
};

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = xs.slice().sort((a, b) => a - b);
  return s[s.length >> 1];
};
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** Where the background ends: the first frame (of two in a row) where much more changed than at the start. */
export function plateEnd(frames: Img[], times: number[]) {
  const small = frames.map((f) => lumaOf(shrink(f, 96)));
  const ref = small[0];
  const frac = small.map((l) => {
    let c = 0;
    for (let i = 0; i < l.length; i++) if (Math.abs(l[i] - ref[i]) > 0.08) c++;
    return c / l.length;
  });
  const early = frac.filter((_, k) => times[k] - times[0] < 0.6);
  const base = median(early.length >= 2 ? early : frac.slice(0, 3));
  for (let k = 1; k < frames.length - 1; k++) if (frac[k] > base + 0.07 && frac[k + 1] > base + 0.07) return k;
  return frames.length;
}

export async function analyse({ frames, times, hiPlate, onProgress }: AnalyseInput): Promise<Analysis> {
  const { w, h } = frames[0];
  const checks: Check[] = [];
  const done = (extra: Partial<Analysis> = {}): Analysis => {
    const verdict: Level = checks.some((c) => c.level === "reject") ? "reject" : checks.some((c) => c.level === "warn") ? "warn" : "ok";
    return { w, h, plate: null, mat: null, turn: [], rotation: 0, heightMm: null, checks, verdict, ...extra };
  };

  // 1. The background.
  const end = plateEnd(frames, times);
  const plateSeconds = end > 0 && end < frames.length ? times[end - 1] - times[0] : 0;
  if (end >= frames.length) {
    // Nothing ever came in: the product was there from the start (no empty background), or never.
    checks.push({ id: "plate", level: "reject", value: 0 });
    return done();
  }
  if (end < 3 || plateSeconds < 0.6) {
    checks.push({ id: "plate", level: "reject", value: plateSeconds });
    return done();
  }
  checks.push({ id: "plate", level: "ok", value: plateSeconds });
  const plates = frames.slice(0, Math.max(2, end - 1));
  const pick = plates.filter((_, k) => k % Math.max(1, Math.floor(plates.length / 15)) === 0).slice(0, 15);
  const plate = medianImage(pick);
  const noise = noiseOf(pick);
  const band = borderBand(w, h);
  const plateInfo = { end, seconds: plateSeconds };

  // 2. The mat.
  let fit: MatFit | null = null;
  if (hiPlate) {
    const found = findMat(hiPlate);
    if (found) fit = scaleFit(found, w / hiPlate.w);
  } else {
    fit = findMat(plate);
  }
  const outer = fit?.outer ?? null;
  // The camera from the rings, and where every pixel is on the mat, once: the camera doesn't move.
  const model: MatModel | null = fit ? fitMatModel(fit) : null;
  const map = model ? matMap(model, w, h) : null;
  checks.push({ id: "mat", level: fit ? "ok" : "warn" });

  // 3. Every later frame: exposure, edges, rings, angle (both mirror sides, decided by vote).
  const rest = frames.length - end;
  const gains: number[] = [];
  const edges: number[] = [];
  const rings: number[] = [];
  const colours: Array<MatColours | null> = [];
  const reads: Array<{ plus: ReturnType<typeof matAngle>; minus: ReturnType<typeof matAngle> } | null> = [];
  for (let k = end; k < frames.length; k++) {
    const f = frames[k];
    const g = gainOf(f, plate, band);
    gains.push(g);
    edges.push(edgeChange(f, plate, band, g, noise));
    if (model) {
      const c = inkAndPaper(f, model);
      colours.push(c);
      rings.push(ringsInPlace(f, model, c));
      const p = codeProfile(f, model, c);
      reads.push({ plus: matAngle(p.v, p.w, 1), minus: matAngle(p.v, p.w, -1) });
    } else {
      colours.push(null);
      reads.push(null);
    }
    await onProgress?.(((k - end + 1) / rest) * 0.45);
  }
  let mirror: 1 | -1 = 1;
  if (outer) {
    let votes = 0;
    for (const r of reads) if (r) votes += r.plus.score > r.minus.score ? 1 : -1;
    mirror = votes >= 0 ? 1 : -1;
  }
  const thetas = reads.map((r) => (r ? (mirror === 1 ? r.plus : r.minus) : null));

  // The product's mask in every frame (first pass, for finding the turn).
  const scores: Uint8Array[] = [];
  const firstMasks: ReturnType<typeof cleanMask>[] = [];
  for (let i = 0; i < rest; i++) {
    const read = thetas[i];
    const s = foregroundScore(frames[end + i], plate, gains[i], noise, map && read ? { map, theta: read.theta, mirror, colours: colours[i]! } : null);
    scores.push(s);
    firstMasks.push(cleanMask(s, w, h));
    await onProgress?.(0.45 + ((i + 1) / rest) * 0.3);
  }

  // 4. The turn: the longest stretch with the product alone in the frame (two odd frames allowed).
  const alone = firstMasks.map((m) => m.area > 0.004 * w * h && !m.touches.left && !m.touches.right && !m.touches.top);
  let best = { from: 0, to: -1 };
  let from = -1;
  let bad = 0;
  for (let i = 0; i <= rest; i++) {
    if (i < rest && alone[i]) {
      if (from < 0) from = i;
      bad = 0;
    } else if (from >= 0) {
      bad++;
      if (bad > 2 || i === rest) {
        const to = i - bad;
        if (to - from > best.to - best.from) best = { from, to };
        from = -1;
        bad = 0;
      }
    }
  }
  const touchedAfter = alone.slice(best.to + 1).filter((a) => !a).length;
  if (best.to - best.from < 8) {
    checks.push({ id: firstMasks.some((m) => m.area > 0.004 * w * h) ? "turn" : "product", level: "reject", value: 0 });
    return done({ plate: plateInfo });
  }

  // Angles along it: the mat's, unwrapped and cleaned of odd readings; or a steady turn found by its loop.
  const seg: number[] = [];
  for (let i = best.from; i <= best.to; i++) seg.push(i);
  let angles: number[] = [];
  let direction: 1 | -1 = 1;
  let outliers = 0;
  let reversals = 0;
  let cut = seg.length;
  if (outer) {
    const raw = seg.map((i) => thetas[i]!.theta);
    const steps = raw.slice(1).map((t, k) => wrap(t - raw[k]));
    const typical = median(steps);
    direction = typical >= 0 ? 1 : -1;
    const spread = median(steps.map((d) => Math.abs(d - typical))) || 0.5;
    const fixed = steps.map((d) => {
      if (Math.abs(d - typical) > Math.max(6, 4 * spread)) {
        outliers++;
        return typical;
      }
      if (d * direction < -1) reversals++;
      return d;
    });
    angles = [0];
    for (const d of fixed) angles.push(angles[angles.length - 1] + d * direction);
    const over = angles.findIndex((a) => a >= 360);
    if (over > 0) cut = over;
  } else {
    // Without the mat: the frame that looks most like the first again is one turn on.
    const first = firstMasks[seg[0]].mask;
    let loop = -1;
    let bestScore = 0;
    for (let k = Math.max(8, Math.floor(seg.length * 0.3)); k < seg.length; k++) {
      const s = iou(first, firstMasks[seg[k]].mask);
      if (s > bestScore) {
        bestScore = s;
        loop = k;
      }
    }
    if (loop > 0 && bestScore > 0.85) {
      cut = loop;
      angles = seg.map((_, k) => (360 * k) / loop);
    } else angles = seg.map(() => 0);
  }
  const turnIdx = seg.slice(0, cut);
  const turnAngles = angles.slice(0, cut);
  const rotation = outer ? (cut < seg.length ? 360 : angles[angles.length - 1]) : cut < seg.length ? 360 : 0;

  // Final masks: each eased with its neighbours in the turn.
  const turn: ScanFrame[] = [];
  for (let n = 0; n < turnIdx.length; n++) {
    const i = turnIdx[n];
    const s = smoothScores(n > 0 ? scores[turnIdx[n - 1]] : null, scores[i], n < turnIdx.length - 1 ? scores[turnIdx[n + 1]] : null);
    const m = cleanMask(s, w, h);
    if (m.box && alone[i]) turn.push({ index: end + i, time: times[end + i], angle: turnAngles[n], mask: m.mask, solid: cleanMask(s, w, h, { threshold: SHADOW }).mask, box: m.box, area: m.area });
    await onProgress?.(0.75 + ((n + 1) / turnIdx.length) * 0.25);
  }

  // 5. The checks: the background and the camera over all the time the product stood on
  // the mat on its own (a change splits the turn, so the turn alone would miss it), the
  // rest over the turn's frames.
  const inTurn = (xs: number[]) => turnIdx.map((i) => xs[i]);
  const share = (xs: boolean[]) => (xs.length ? xs.filter(Boolean).length / xs.length : 0);
  const firstAlone = alone.indexOf(true);
  const lastAlone = alone.lastIndexOf(true);
  const standing = (xs: number[]) => xs.slice(firstAlone, lastAlone + 1);
  // Changed at the frame's edges, or anything changed away from the product (someone
  // passing behind it): the background didn't stay the same.
  const strays = firstMasks.map((m) => m.stray / (w * h));
  const edgeShare = share(standing(edges).map((e, k) => e > 0.04 || strays[firstAlone + k] > 0.003));
  checks.push({ id: "edges", level: edgeShare > 0.05 ? "reject" : "ok", value: edgeShare });
  if (outer) {
    const moved = share(standing(rings).map((r) => r < 0.6));
    checks.push({ id: "camera", level: moved > 0.05 ? "reject" : "ok", value: moved });
  }
  const g = inTurn(gains);
  const swing = Math.max(...g) / Math.max(1e-3, Math.min(...g));
  checks.push({ id: "light", level: swing > 1.6 ? "reject" : swing > 1.25 ? "warn" : "ok", value: swing });
  const turnLevel: Level = rotation >= 345 ? "ok" : "reject";
  checks.push({ id: "turn", level: turnLevel, value: Math.round(rotation) });
  if (turnLevel === "reject" && touchedAfter > 2) checks[checks.length - 1].value = -1; // it left the frame
  if (outer) {
    const back = reversals / Math.max(1, turnIdx.length);
    checks.push({ id: "steady", level: back > 0.05 ? "reject" : "ok", value: back });
    const readScores = turnIdx.map((i) => thetas[i]!.score);
    const readLevel: Level = outliers / Math.max(1, turnIdx.length) > 0.1 || median(readScores) < 0.45 ? "warn" : "ok";
    checks.push({ id: "reading", level: readLevel, value: median(readScores) });
  }
  const sorted = turn.map((f) => f.angle).sort((a, b) => a - b);
  let gap = sorted.length ? 360 - sorted[sorted.length - 1] + sorted[0] : 360;
  for (let k = 1; k < sorted.length; k++) gap = Math.max(gap, sorted[k] - sorted[k - 1]);
  checks.push({ id: "gaps", level: gap > 15 ? "warn" : "ok", value: Math.round(gap) });
  const seconds = turn.length > 1 ? turn[turn.length - 1].time - turn[0].time : 0;
  const speed = seconds > 0 ? rotation / seconds : 0;
  checks.push({ id: "speed", level: speed > 72 ? "warn" : "ok", value: Math.round(speed) });
  const heights = turn.map((f) => (f.box.y1 - f.box.y0) / h);
  const tall = median(heights);
  checks.push({ id: "size", level: tall < 0.2 ? "warn" : "ok", value: tall });
  // Contrast: how much of the product's edge area is neither clearly product nor background.
  let unsure = 0;
  let near = 0;
  for (const f of turn.filter((_, k) => k % 6 === 0)) {
    const s = scores[f.index - end];
    const zone = dilate(f.mask, w, h, 3);
    for (let p = 0; p < zone.length; p++) {
      if (!zone[p]) continue;
      near++;
      if (s[p] > 60 && s[p] < 190 && s[p] !== SHADOW) unsure++;
    }
  }
  const unclear = near ? unsure / near : 0;
  checks.push({ id: "contrast", level: unclear > 0.25 ? "warn" : "ok", value: unclear });

  const mat = outer && model ? { outer, elevation: (model.e * 180) / Math.PI, mmPerPx: MAT_UNIT_MM / model.k, mirror, camera: model, spin: (mirror * direction) as 1 | -1 } : null;
  // The product's height: from the mat's centre (where the turn's axis meets it) up to the
  // product's top, over the whole turn (a top off the axis comes nearer and goes further
  // as it turns: the middle value evens that out). The whole outline's height would count
  // the product's depth too, seen from above.
  // Through the camera: a point H above the centre shows k·H·cos e / (1 − rho·H·sin e) higher.
  let heightMm: number | null = null;
  if (model) {
    const rise = median(turn.map((f) => model.cy - f.box.y0));
    const H = rise / (model.k * Math.cos(model.e) + model.rho * rise * Math.sin(model.e));
    heightMm = rise > 0 && H > 0 ? H * MAT_UNIT_MM : null;
  }
  return done({ plate: plateInfo, mat, turn, rotation, heightMm });
}
