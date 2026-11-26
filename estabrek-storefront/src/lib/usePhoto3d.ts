import { useEffect, type RefObject } from "react";
import { PHOTO3D_DEFAULT } from "../../../shared/photo3d";

/**
 * A product picture in 3D (shared/photo3d.ts): lifted by its depth picture (made in the admin, beside the photo) or,
 * until it has one, by a quick depth from its own light, drawn by the graphics card over the picture in `host`
 * (pageTree/photo3dRun.ts, a script of its own loaded by the first such picture).
 *
 *  - `hover`: a card's: made while the mouse is on it, turning toward it, and put away once it left.
 *  - else: the product page's big picture: made as it comes near the screen; it turns with the pointer where there is
 *    one (and an Android phone's tilt), with the page's scroll on a phone.
 *
 * `picture` is the picture shown now: it starts again when it changes (another photo, another colour). Nothing for
 * whoever asked for less motion, nor without a picture.
 */
export function usePhoto3d(host: RefObject<HTMLElement | null>, o: { on: boolean; picture: string | null | undefined; depth?: string | null; hover?: boolean; cols?: number }) {
  const { on, picture, depth, hover, cols } = o;
  useEffect(() => {
    const el = host.current;
    if (!el || !on || !picture) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const pointer = window.matchMedia?.("(hover: hover)").matches ?? true;
    const stops: Array<() => void> = [];
    let live = true;
    void import("@/pageTree/photo3dRun").then(({ runPhoto3d }) => {
      if (!live) return;
      runPhoto3d(el, { ...PHOTO3D_DEFAULT, map: depth || null, move: hover || pointer ? "pointer" : "scroll", depth: hover ? 0.55 : 0.5, turn: hover ? 0.6 : 0.5, light: 0.3 }, stops, { hover, cols });
    }).catch(() => undefined);
    return () => { live = false; stops.splice(0).forEach((stop) => stop()); };
  }, [host, on, picture, depth, hover, cols]);
}
