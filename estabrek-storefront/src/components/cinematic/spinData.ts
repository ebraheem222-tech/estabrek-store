/**
 * Picking a product's 360° view from its saved list. Kept apart from ProductSpin.tsx
 * (a client module) so the server, like the page tree, can call it: a function from a
 * "use client" file is only a client reference there, not something it can run.
 */
export type ProductSpinData = { id: string; url: string; cols: number; rows: number; cellW: number; cellH: number; count: number; itemId: string | null; modelUrl: string | null };

const SAFE = /^(\/(?!\/)|https?:\/\/)[^\s<>"'`\\()]+$/;
/** The view for the colour on screen: its own, else the one for every colour. */
export function spinFor(spins: unknown, itemId?: string | null): ProductSpinData | null {
  const list = (Array.isArray(spins) ? spins : []).filter(
    (s): s is ProductSpinData => Boolean(s) && typeof s.url === "string" && SAFE.test(s.url) && s.cols > 0 && s.rows > 0 && s.cellW > 0 && s.cellH > 0 && s.count > 1,
  );
  return list.find((s) => itemId && s.itemId === itemId) ?? list.find((s) => !s.itemId) ?? null;
}
