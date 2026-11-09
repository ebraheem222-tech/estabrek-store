"use client";
/**
 * Held and covered sections (pieces.ts coverOf, drawn by TreeNodeView): a section stays on the
 * screen while the page scrolls, then the section after it slides up over it from below.
 *
 * The CSS does the holding (sticky, with a room under it as long as the hold); this measures what
 * CSS can't know and writes it as variables, each only when it changed:
 * - --pt-cv-top: where it sticks. One taller than the screen sticks once its end is in sight, so
 *   all of it is seen first;
 * - --pt-cv-d: how far the next one comes over it, the part of it on the screen or the next one's
 *   own height when that's shorter. The room grows by it and the next one is pulled up by it (and
 *   put over it), so nothing after them moves and it lets go just as it's covered;
 * - --pt-cv-p: how much of it is covered (0–1), for what it does under (darkens, shrinks…).
 * Phones skip it when it says so; whoever asked for less motion still gets it held and covered,
 * without what it does under.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { coverAmount, coverMeasure, coverOf, type CoverSpec } from "./pieces";
import { useStudioViewRevision } from "./useStudioViewRevision";

/** The box a held section is drawn in when the box is its own (one of the page's sections), else null. */
export function coverBox(el: Element): HTMLElement | null {
  const box = el.parentElement;
  return box && [...box.children].every((c) => c === el || !c.classList.contains("pt")) ? box : null;
}

const UNSEEN = new Set(["STYLE", "SCRIPT", "TEMPLATE", "LINK", "META", "NOSCRIPT"]);

/**
 * What comes after a held section's box: the next thing on the page, found going up through the
 * boxes that hold this section alone (the home wraps each section in a few), and the box it follows.
 */
export function coverNext(box: HTMLElement): { next: HTMLElement; after: HTMLElement } | null {
  let at: HTMLElement = box;
  for (let up = 0; up < 6; up++) {
    let sib = at.nextElementSibling;
    // Past what isn't drawn or takes no room (an empty block).
    while (sib && (UNSEEN.has(sib.tagName) || (sib as HTMLElement).hidden || getComputedStyle(sib).display === "none" || (sib as HTMLElement).offsetHeight === 0)) sib = sib.nextElementSibling;
    if (sib instanceof HTMLElement) return { next: sib, after: at };
    const parent = at.parentElement;
    if (!parent || parent === document.body || parent.tagName === "MAIN" || parent.hasAttribute("data-page-tree-root") || parent.querySelectorAll(".pt-section").length > 1) return null;
    at = parent;
  }
  return null;
}

function mountCover(el: HTMLElement, spec: CoverSpec, env: { phone: boolean; reduced: boolean }): () => void {
  const room = el.nextElementSibling instanceof HTMLElement && el.nextElementSibling.classList.contains("pt-cover-room") ? el.nextElementSibling : null;
  if (!room || (env.phone && !spec.phone)) return () => {};
  // Sharing its box with other things, it stays put (it would stick under all of them).
  const box = coverBox(el);
  if (!box) {
    el.setAttribute("data-pt-cover-off", "");
    return () => el.removeAttribute("data-pt-cover-off");
  }
  const written = new Map<HTMLElement, Set<string>>();
  const put = (node: HTMLElement, key: string, value: string, priority = "") => {
    if (node.style.getPropertyValue(key) === value && node.style.getPropertyPriority(key) === priority) return;
    node.style.setProperty(key, value, priority);
    (written.get(node) ?? written.set(node, new Set()).get(node)!).add(key);
  };
  const ro = new ResizeObserver(() => resized());
  ro.observe(el);
  // What comes after it (the editor may move another section there): it goes over, pulled up by how far
  // it comes, plus whatever the boxes around this one leave under it (so it starts right at the room's end).
  let next: HTMLElement | null = null;
  let after: HTMLElement = box;
  const unbind = () => {
    if (!next) return;
    ro.unobserve(next);
    next.style.removeProperty("margin-top");
    next.classList.remove("pt-cover-next");
    next.removeAttribute("data-pt-cv-enter");
    next.removeAttribute("data-pt-cv-entering");
    next.style.removeProperty("--pt-cv-q");
    written.get(next)?.delete("margin-top");
  };
  const bind = () => {
    const found = coverNext(box);
    after = found?.after ?? box;
    if ((found?.next ?? null) === next) return;
    unbind();
    next = found?.next ?? null;
    if (!next) return;
    next.classList.add("pt-cover-next");
    if (spec.enter !== "rise") next.setAttribute("data-pt-cv-enter", spec.enter);
    ro.observe(next);
  };
  let m = { top: 0, seen: 0, d: 0 };
  let raf = 0;
  let shown = -1;
  const measure = () => {
    bind();
    m = coverMeasure(el.offsetHeight, window.innerHeight, next?.offsetHeight ?? 0);
    put(el, "--pt-cv-top", `${Math.round(m.top)}px`);
    put(el, "--pt-cv-d", `${Math.round(m.d)}px`);
    put(room, "--pt-cv-d", `${Math.round(m.d)}px`);
    if (next && m.d > 0) {
      const below = after === box ? 0 : Math.max(0, after.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom);
      put(next, "margin-top", `${-Math.round(m.d + below)}px`, "important");
    } else if (next) {
      next.style.removeProperty("margin-top");
    }
  };
  const frame = () => {
    raf = 0;
    const p = env.reduced || !next ? 0 : Math.round(coverAmount(next.getBoundingClientRect().top, m.seen, m.d) * 1000) / 1000;
    if (p === shown) return;
    shown = p;
    put(el, "--pt-cv-p", String(p));
    // Its edge's shape follows how far it has come (straight once it's all over).
    if (next && spec.enter !== "rise" && !env.reduced) {
      const q = m.d > 0 ? p : 1;
      next.style.setProperty("--pt-cv-q", String(q));
      if (q < 1) next.setAttribute("data-pt-cv-entering", "");
      else next.removeAttribute("data-pt-cv-entering");
    }
    if (p > 0) el.setAttribute("data-pt-covering", "");
    else el.removeAttribute("data-pt-covering");
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const resized = () => {
    measure();
    wake();
  };
  measure();
  frame();
  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", resized);
  addEventListener("studio-view-updated", resized);
  return () => {
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    removeEventListener("scroll", wake);
    removeEventListener("resize", resized);
    removeEventListener("studio-view-updated", resized);
    unbind();
    for (const [node, keys] of written) keys.forEach((k) => node.style.removeProperty(k));
    el.removeAttribute("data-pt-covering");
  };
}

export function TreeCovers({ revision = 0 }: { revision?: number }) {
  const pathname = usePathname();
  const viewRevision = useStudioViewRevision("[data-pt-cover]", ["data-pt-cover"], `${pathname}:${revision}`);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 639.98px)");
    let stops: Array<() => void> = [];
    const build = () => {
      stops.forEach((s) => s());
      stops = [];
      const env = { phone: phone.matches, reduced: reduced.matches };
      document.querySelectorAll<HTMLElement>("[data-pt-cover]").forEach((el) => {
        let spec: CoverSpec | null = null;
        try {
          spec = coverOf(JSON.parse(el.dataset.ptCover ?? "null"));
        } catch {
          spec = null;
        }
        if (spec) stops.push(mountCover(el, spec, env));
      });
    };
    build();
    reduced.addEventListener("change", build);
    phone.addEventListener("change", build);
    return () => {
      reduced.removeEventListener("change", build);
      phone.removeEventListener("change", build);
      stops.forEach((s) => s());
    };
  }, [pathname, revision, viewRevision]);
  return null;
}
