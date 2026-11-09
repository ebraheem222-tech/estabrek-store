"use client";
/**
 * Two page-wide tricks of the page tree:
 * - TreePaint: a section with `paint` gives the page its colour while it's in the middle of the screen,
 *   and the page glides back once it has passed (the CSS fades between colours);
 * - TreeCursor: the page's `cursor` (a dot, a ring, or one that turns what's under it around) follows the
 *   mouse softly; over an element with words for the cursor (`cursorText`) it grows and shows them.
 *   Only for a mouse (never a finger), and right on the mouse for whoever asked for less motion.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { paintAt } from "./pieces";
import { useStudioViewRevision } from "./useStudioViewRevision";

export function TreePaint({ revision = 0 }: { revision?: number }) {
  const pathname = usePathname();
  const viewRevision = useStudioViewRevision("[data-pt-paint]", ["data-pt-paint"], `${pathname}:${revision}`);
  useEffect(() => {
    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-pt-paint]"));
    if (!sections.length) return;
    root.setAttribute("data-pt-paints", "");
    let raf = 0;
    let shown: string | null = null;
    const frame = () => {
      raf = 0;
      const now = paintAt(sections.map((s) => {
        const r = s.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, paint: s.dataset.ptPaint ?? "" };
      }), window.innerHeight / 2);
      if (now === shown) return;
      shown = now;
      if (now) {
        root.style.setProperty("--pt-paint", now);
        root.setAttribute("data-pt-painting", "");
      } else root.removeAttribute("data-pt-painting");
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    frame();
    addEventListener("scroll", wake, { passive: true });
    addEventListener("resize", wake);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      removeEventListener("scroll", wake);
      removeEventListener("resize", wake);
      root.removeAttribute("data-pt-paints");
      root.removeAttribute("data-pt-painting");
      root.style.removeProperty("--pt-paint");
    };
  }, [pathname, revision, viewRevision]);
  return null;
}

type CursorSpec = { kind: "dot" | "ring" | "blend"; color?: string; size?: number };

export function TreeCursor({ revision = 0 }: { revision?: number }) {
  const pathname = usePathname();
  const viewRevision = useStudioViewRevision("[data-pt-cursor]", ["data-pt-cursor"], `${pathname}:${revision}`);
  useEffect(() => {
    const host = document.querySelector<HTMLElement>("[data-pt-cursor]");
    if (!host || !window.matchMedia("(pointer: fine)").matches) return;
    let spec: CursorSpec | null = null;
    try {
      spec = JSON.parse(host.dataset.ptCursor ?? "null");
    } catch {
      spec = null;
    }
    if (!spec || !["dot", "ring", "blend"].includes(spec.kind)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mark = document.createElement("div");
    mark.className = `pt-cursor pt-cursor-${spec.kind}`;
    mark.setAttribute("aria-hidden", "true");
    if (spec.color) mark.style.setProperty("--pt-cur-c", spec.color);
    if (spec.size) mark.style.setProperty("--pt-cur-s", `${Math.max(8, Math.min(120, spec.size))}px`);
    const dot = document.createElement("i");
    const words = document.createElement("span");
    dot.append(words);
    mark.append(dot);
    document.body.append(mark);
    const to = { x: -100, y: -100 };
    const at = { x: -100, y: -100 };
    let raf = 0;
    const frame = () => {
      raf = 0;
      const k = reduced ? 1 : 0.22;
      at.x += (to.x - at.x) * k;
      at.y += (to.y - at.y) * k;
      mark.style.translate = `${at.x.toFixed(1)}px ${at.y.toFixed(1)}px`;
      if (Math.abs(to.x - at.x) + Math.abs(to.y - at.y) > 0.3) raf = requestAnimationFrame(frame);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      to.x = e.clientX;
      to.y = e.clientY;
      mark.classList.add("pt-cursor-in");
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const over = (e: Event) => {
      const t = e.target instanceof Element ? e.target : null;
      const labelled = t?.closest<HTMLElement>("[data-pt-cursor-text]");
      const text = labelled?.dataset.ptCursorText ?? "";
      words.textContent = text;
      mark.classList.toggle("pt-cursor-label", Boolean(text));
      mark.classList.toggle("pt-cursor-link", !text && Boolean(t?.closest("a,button,[role=button],input,select,textarea,summary")));
    };
    const away = () => mark.classList.remove("pt-cursor-in");
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", away);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", away);
      mark.remove();
    };
  }, [pathname, revision, viewRevision]);
  return null;
}
