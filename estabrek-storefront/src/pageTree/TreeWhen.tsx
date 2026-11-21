"use client";
/**
 * Elements with a time to show (props.when: from a moment, until another, in the shop's own time). The stylesheet
 * leaves each of them out (css.ts) until it's marked as its time (`data-pt-when-on`). TreeNodeView draws one of these
 * beside every such element (loaded through lazyParts.tsx, so only those pages load it, whichever way the page is
 * drawn); they share one check, run at once and every minute after, so an offer goes at its moment on a page left
 * open. In the editor's frame all of them show.
 */
import { useEffect } from "react";
import { whenNow } from "./pieces";

let watchers = 0;
let timer = 0;

/** Marks every element whose time it is now, and unmarks the rest. */
export function markWhen(now = Date.now(), root: ParentNode = document) {
  const studio = window.parent !== window && /\/studio-frame/.test(window.location.pathname);
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-pt-when]"))) {
    let on = studio;
    if (!on) {
      try { on = whenNow(JSON.parse(el.dataset.ptWhen ?? "{}"), now); } catch { on = false; }
    }
    if (el.hasAttribute("data-pt-when-on") !== on) el.toggleAttribute("data-pt-when-on", on);
  }
}
const look = () => markWhen();

export function WhenWatch() {
  useEffect(() => {
    look();
    if (watchers++ === 0) {
      timer = window.setInterval(look, 60_000);
      window.addEventListener("studio-view-updated", look);
      // A list's cards are copied after the page is drawn: look again once they're in.
      window.addEventListener("load", look);
    }
    return () => {
      if (--watchers === 0) {
        clearInterval(timer);
        window.removeEventListener("studio-view-updated", look);
        window.removeEventListener("load", look);
      }
    };
  }, []);
  return null;
}
