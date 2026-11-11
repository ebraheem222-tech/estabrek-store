"use client";
import { useEffect } from "react";

/**
 * Page states the CSS reads from <html> (cinematic.css, rose-showcase.css, rose-wonders.css): a layer that
 * covers the page is open, the small bag is open, a page with no "you viewed" note, the note showing, the
 * maintenance screen, the shop. They used to be :has() rules on <html>: some phone browsers don't know :has(),
 * so the helpers stayed over open drawers there, and an attribute inside :has() on <html> makes Chrome
 * restyle the whole page whenever anything is added anywhere.
 */
const STATES: Array<[key: string, selector: string]> = [
  ["uiCover", ".quick-add-layer, .size-guide-dialog.is-open, .rose-viewer, .rose-sheet-layer"],
  ["uiBag", ".rose-minibag[data-open]"],
  ["uiNoRecent", ".rose-product-page, .rose-cart-page, .rose-search-page"],
  ["uiRecent", '.rose-recent[aria-hidden="false"]'],
  ["uiMaint", ".rose-maint"],
  ["uiShop", ".rose-shop"],
];

/** The helpers that stand in the bottom row on a phone (Razan, her WhatsApp button, accessibility, chat). */
const ROW = ".rose-companion-figure, .rose-companion-mini, .rose-companion-wa, .whatsapp-floating-btn, .a11y-fab, .chat-widget-root > button";

/** What reads the dock's numbers (rose-wonders.css): the story pill, the particles' pill and words, the note. */
const READERS = ".rose-story-pill, .rose-particles-pill, .rose-particles-words, .recent-activity-popup.rose-recent";

/*
 * The floating helpers' dock (rose-wonders.css, "the dock"). On a phone the bottom of the screen holds Razan
 * and WhatsApp on one side and the accessibility button on the other; this measures that row and tells the CSS
 * where the free lane between them is (--dock-left, --dock-right) and how tall the row is (--dock-lift), so the
 * story pill stays in the lane, the "you viewed" note shows above the row (and above Razan's speech bubble while
 * she speaks: --dock-clear), and scene controls sit above it:
 * nothing floating covers anything else. It also keeps the page states above up to date.
 */
export function FloatingDock() {
  useEffect(() => {
    const root = document.documentElement;
    let checkTimer = 0, lastCheck = 0, measureFrame = 0, wantMeasure = false;
    // The numbers go in one small style sheet, for the few things that read them. Written on <html>, every
    // change was inherited by the whole page: all ~2,900 elements of the home restyled (about 190 ms on a
    // mid-range phone), each time Razan in the corner stepped aside for a scene, as the collection worlds came in.
    const sheet = document.createElement("style");
    sheet.dataset.dock = "";
    document.head.appendChild(sheet);
    const values = new Map<string, string>();
    let dirty = false;
    const set = (name: string, value: string) => {
      if (values.get(name) === value) return;
      values.set(name, value);
      dirty = true;
    };
    const write = () => {
      if (!dirty) return;
      dirty = false;
      sheet.textContent = `${READERS} { ${Array.from(values, ([name, value]) => `${name}: ${value};`).join(" ")} }`;
    };
    /** Where the bottom row stands (it reads sizes and styles: only when something may have moved, see below). */
    const measure = () => {
      measureFrame = 0;
      if (window.innerWidth > 760 || root.dataset.uiCover || root.dataset.uiBag) return;
      const w = window.innerWidth, h = window.innerHeight;
      let left = 12, right = 12, top = h;
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(ROW))) {
        const r = el.getBoundingClientRect();
        if (!r.width || r.bottom < h - 160 || r.top > h) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) continue;
        if (r.left + r.width / 2 < w / 2) left = Math.max(left, r.right + 8);
        else right = Math.max(right, w - r.left + 8);
        top = Math.min(top, r.top);
      }
      set("--dock-left", `${Math.round(left)}px`);
      set("--dock-right", `${Math.round(right)}px`);
      set("--dock-lift", `${Math.round(Math.max(64, h - top))}px`);
      // Above the row and Razan's speech bubble while she speaks: where the "you viewed" note may show.
      const said = document.querySelector<HTMLElement>('.rose-companion .rose-mascot-bubble[data-show="true"]')?.getBoundingClientRect();
      const clear = said && said.width && said.bottom > h - 260 ? Math.min(top, said.top) : top;
      set("--dock-clear", `${Math.round(Math.max(64, h - clear))}px`);
      write();
    };
    const measureSoon = () => { if (!measureFrame) measureFrame = requestAnimationFrame(measure); };
    /** The page states (a few look-ups, no sizes); a state that changed moves the row, so it is measured then. */
    const check = () => {
      checkTimer = 0;
      lastCheck = performance.now();
      let changed = false;
      for (const [key, selector] of STATES) {
        const on = Boolean(document.querySelector(selector));
        if (on !== (root.dataset[key] === "true")) {
          changed = true;
          if (on) root.dataset[key] = "true";
          else delete root.dataset[key];
        }
      }
      if (changed || wantMeasure) { wantMeasure = false; measureSoon(); }
    };
    // At most four checks a second, however busy the page: checking (and measuring) on every change cost about a
    // second of a mid-range phone's processor in the home's first seconds, the scenes change classes all the time.
    const schedule = () => {
      if (checkTimer) return;
      checkTimer = window.setTimeout(check, Math.max(0, 250 - (performance.now() - lastCheck)));
    };
    // Layers open and close by being added or by a class or attribute; the scroll scenes' style writes don't count.
    const watch = new MutationObserver((records) => {
      // Razan starting or ending a sentence changes the space above her (the note's place).
      for (const r of records) if (r.attributeName === "data-show" && (r.target as Element).classList?.contains("rose-mascot-bubble")) { wantMeasure = true; break; }
      schedule();
    });
    watch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-open", "data-show", "aria-hidden"] });
    const again = () => { wantMeasure = true; schedule(); };
    window.addEventListener("resize", again);
    // Razan moves now and then (her walks, a scene's own spot for her): measure again from time to time.
    const tick = window.setInterval(again, 2000);
    check();
    measureSoon();
    return () => {
      window.clearTimeout(checkTimer);
      cancelAnimationFrame(measureFrame);
      watch.disconnect();
      window.removeEventListener("resize", again);
      window.clearInterval(tick);
      for (const [key] of STATES) delete root.dataset[key];
      sheet.remove();
    };
  }, []);
  return null;
}
