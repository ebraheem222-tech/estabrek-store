/**
 * How far apart two designs are (phase 11): the axes on which they differ, a palette counted
 * as different when its brand colour or its page is far enough apart to the eye (CIE Lab), and
 * the signature section, which no two designs share. Every variant of a design is compared with
 * every variant of another. The rose design is Estabrek's own: every design stays far from it
 * and never takes its arches.
 */
import { hexToLab } from "../colour";
import { AXES, type Axis, type DNA, type Seed, type StoreKind } from "./axes";
import { variantsOf } from "./variants";

/** How different two colours look, in OKLab ×100 (about 2 is just seen, 10 is plainly another colour). */
export function deltaE(a: string, b: string): number {
  const [p, q] = [hexToLab(a), hexToLab(b)];
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}
/** Two palettes look alike when their brand colours and their pages are both close. */
export const ACCENT_APART = 10;
export const PAGE_APART = 5;
export const samePalette = (a: Seed, b: Seed) => a.mode === b.mode && deltaE(a.accent, b.accent) < ACCENT_APART && deltaE(a.bg, b.bg) < PAGE_APART;

const differs = (a: DNA, b: DNA, axis: Axis) => (axis === "seed" ? !samePalette(a.seed, b.seed) : a[axis] !== b[axis]);
/** The axes two designs differ on. */
export const differences = (a: DNA, b: DNA): Axis[] => AXES.filter((x) => differs(a, b, x));
/** How far apart two kinds' designs are: the axes their nearest variants differ on, and their signatures (always their own). */
export function distance(a: StoreKind, b: StoreKind): number {
  let least = Infinity;
  for (const x of variantsOf(a)) for (const y of variantsOf(b)) least = Math.min(least, differences(x.dna, y.dna).length);
  return least + (a.signature.id === b.signature.id ? 0 : 1);
}

/** Every two designs differ on at least this many of the 14 (13 axes and the signature). */
export const MIN_APART = 6;
/** The rose design's DNA (Estabrek's own): no design comes near it. */
export const ROSE: DNA = {
  archetype: "story", type: "amiri/tajawal", colours: "pastel", seed: { mode: "light", bg: "#fff8f4", accent: "#a43b64", strong: "#7c2a4a", ink: "#462c3b" },
  shape: "arch", surface: "paper", imagery: "framed", icons: "line", motion: "luxe", motif: "botanic", card: "arch", header: "centered", footer: "columns", voice: "warm",
};
export const MIN_FROM_ROSE = 9;
/** The rose design's own brand colour: a design this close to it stays further from the rest of the rose design too. */
export const ROSE_ACCENT_APART = 12;
export const ROSE_COLOUR_AND = 12;

export type Problem = { kind: string; other?: string; why: string };
/** Everything that keeps the designs from being their own: too near another, too near the rose design, a signature twice. */
export function problems(kinds: StoreKind[]): Problem[] {
  const out: Problem[] = [];
  const ids = new Set<string>();
  const sigs = new Map<string, string>();
  for (const k of kinds) {
    if (ids.has(k.id)) out.push({ kind: k.id, why: "the same id twice" });
    ids.add(k.id);
    const had = sigs.get(k.signature.id);
    if (had) out.push({ kind: k.id, other: had, why: `the same signature section (${k.signature.id})` });
    sigs.set(k.signature.id, k.id);
    if (k.dna.shape === "arch" || k.dna.card === "arch") out.push({ kind: k.id, why: "the rose design's arches" });
    for (const v of variantsOf(k)) {
      const rose = differences(v.dna, ROSE).length + 1;
      if (rose < MIN_FROM_ROSE) out.push({ kind: v.id, other: "rose", why: `only ${rose} apart from the rose design` });
      // Its colour alone isn't the rose design; its colour with much else of it is.
      if (deltaE(v.dna.seed.accent, ROSE.seed.accent) < ROSE_ACCENT_APART && rose < ROSE_COLOUR_AND) out.push({ kind: v.id, other: "rose", why: `the rose design's colour, and only ${rose} apart from it` });
    }
  }
  for (let i = 0; i < kinds.length; i++)
    for (let j = i + 1; j < kinds.length; j++) {
      const d = distance(kinds[i], kinds[j]);
      if (d < MIN_APART) out.push({ kind: kinds[i].id, other: kinds[j].id, why: `only ${d} apart (as first made, the same: ${AXES.filter((x) => !differences(kinds[i].dna, kinds[j].dna).includes(x)).join(", ")})` });
    }
  return out;
}
/** The closest pair for each design (to see who is nearest to whom). */
export function nearest(kinds: StoreKind[]): Array<{ kind: string; other: string; apart: number }> {
  return kinds.map((k) => {
    let best = { other: "", apart: Infinity };
    for (const o of kinds) if (o !== k) {
      const d = distance(k, o);
      if (d < best.apart) best = { other: o.id, apart: d };
    }
    return { kind: k.id, ...best };
  });
}
