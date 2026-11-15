import { useEffect, type RefObject } from "react";
import { pointerFxOf } from "../../../shared/pictureFx";

/**
 * A live effect (shared/pictureFx.ts) on the picture inside `host` while the pointer is on it: rings of water, a
 * flow, a colour split. The graphics card draws it (pageTree/pictureFxRun.ts), and that code is a script of its
 * own, loaded by the first picture that has an effect.
 *
 * `kind` is the setting as it was read (anything that isn't one of those kinds means no effect); `picture` is the
 * picture the host shows now: the effect starts again when it changes. Nothing for whoever asked for less motion.
 */
export function usePictureFx(host: RefObject<HTMLElement>, kind: string | null | undefined, picture: string | null | undefined) {
  useEffect(() => {
    const el = host.current;
    const fx = pointerFxOf(kind);
    if (!el || !fx || !picture) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const stops: Array<() => void> = [];
    let live = true;
    void import("@/pageTree/pictureFxRun").then(({ runPictureFx }) => { if (live) runPictureFx(el, { kind: fx }, stops); }).catch(() => undefined);
    return () => { live = false; stops.splice(0).forEach((stop) => stop()); };
  }, [host, kind, picture]);
}
