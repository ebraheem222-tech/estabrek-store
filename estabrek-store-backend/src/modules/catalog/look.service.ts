import { hexToLab, stylePieces, type StylePiece } from "../razan/styleQuiz.service.js";

/**
 * «كمّلي اللوك» without AI, for every store: pieces from the shop's other categories that go with this one in the
 * colour she picked (or its own colours), the other kind of piece when that is known (an abaya → a hijab, a
 * bag; a hijab → an abaya), in stock, one per category first. The AI stylist (admin → الذكاء الاصطناعي)
 * picks from the same pieces when it is on; this is what a store gets without it.
 */
type Lab = [number, number, number];
const deltaE = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** Black, white, beige, grey: they go with anything. */
const neutral = (lab: Lab) => Math.hypot(lab[1], lab[2]) < 12;

export type LookPiece = { id: string; title: string; slug: string; image: string | null; price: number | null; colorName: string | null };

export async function completeTheLook(productId: string, colorHex?: string | null, limit = 4): Promise<{ products: LookPiece[] }> {
  const pieces = await stylePieces();
  const base = pieces.find((p) => p.id === productId);
  if (!base) return { products: [] }; // sold out (or not shipped): nothing to complete
  const picked = colorHex ? hexToLab(colorHex.startsWith("#") ? colorHex : `#${colorHex}`) : null;
  const targets: Lab[] = picked ? [picked] : base.colors.map((c) => c.lab);
  const anyGoes = targets.length > 0 && targets.every(neutral);

  const others = pieces.filter((p) => p.id !== base.id && p.categoryId !== base.categoryId);
  const otherKind = others.filter((p) => base.full == null || p.full !== base.full);
  const pool = otherKind.length >= 2 ? otherKind : others;

  const scored = pool.map((p) => {
    let best = 0;
    let colorName: string | null = p.colors[0]?.name ?? null;
    for (const c of p.colors) {
      let s = 0;
      for (const t of targets) s = Math.max(s, Math.exp(-deltaE(t, c.lab) / 40));
      // A neutral goes with anything, and anything goes with a neutral.
      if (neutral(c.lab) || anyGoes) s = Math.max(s, 0.6);
      if (s > best) { best = s; colorName = c.name; }
    }
    const together = [...p.occasions].some((o) => base.occasions.has(o)) ? 0.15 : 0;
    return { p, colorName, score: best + together };
  });
  scored.sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id));

  // One per category first (a hijab, a bag, shoes…), then the next best.
  const picks: typeof scored = [];
  const seen = new Set<string>();
  for (const s of scored) if (picks.length < limit && !seen.has(s.p.categoryId)) { picks.push(s); seen.add(s.p.categoryId); }
  for (const s of scored) if (picks.length < limit && !picks.includes(s)) picks.push(s);

  return { products: picks.map(({ p, colorName }) => piece(p, colorName)) };
}

const piece = (p: StylePiece, colorName: string | null): LookPiece => ({ id: p.id, title: p.title, slug: p.slug, image: p.image, price: p.price, colorName });
