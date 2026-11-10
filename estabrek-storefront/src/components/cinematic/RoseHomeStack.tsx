"use client";
import { useEffect } from "react";

/*
 * The home's sections as a stack (rose-showcase.css, "the home's stack"): each section holds on screen once its
 * end is in sight, and the next one slides up over it with rounded corners, while the one underneath dims a
 * little. Every box straight under the home's frame is one section (RoseCmsHome / RoseHome wrap each one).
 * A tall section (a scroll scene) first plays out, then holds: its sticky top is the screen's height minus its
 * own. Off in the editor's frame, for reduced motion, and with Admin → the opening → «الأقسام فوق بعض».
 */
export function RoseHomeStack({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled || window.self !== window.top) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = document.querySelector<HTMLElement>(".rose-page-frame.rose-home");
    if (!frame) return;
    frame.dataset.stack = "true";
    let boxes: HTMLElement[] = [];
    let raf = 0;
    const measure = () => {
      const vh = window.innerHeight;
      boxes = Array.from(frame.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el.offsetHeight > 40);
      boxes.forEach((box, i) => {
        box.classList.add("rose-stack-box");
        box.style.setProperty("--stack-top", `${Math.min(0, vh - box.offsetHeight)}px`);
        box.style.zIndex = String(i + 1);
      });
    };
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      boxes.forEach((box, i) => {
        const next = boxes[i + 1];
        // How far the next section has come over this one (0: not yet, 1: it covers the screen).
        const p = next ? Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / vh)) : 0;
        const value = p.toFixed(3);
        if (box.dataset.stackP === value) return;
        box.dataset.stackP = value;
        box.style.setProperty("--stack-p", value);
        if (p > 0.001) box.dataset.covered = "true";
        else delete box.dataset.covered;
      });
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const remeasure = () => { measure(); schedule(); };
    measure();
    update();
    const sizes = new ResizeObserver(remeasure);
    sizes.observe(frame);
    Array.from(frame.children).forEach((el) => sizes.observe(el));
    // Sections that arrive later (a scene built when the page rests) are measured too.
    const kids = new MutationObserver(() => {
      Array.from(frame.children).forEach((el) => sizes.observe(el));
      remeasure();
    });
    kids.observe(frame, { childList: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(raf);
      sizes.disconnect();
      kids.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      delete frame.dataset.stack;
      boxes.forEach((box) => {
        box.classList.remove("rose-stack-box");
        box.style.removeProperty("--stack-top");
        box.style.removeProperty("--stack-p");
        box.style.zIndex = "";
        delete box.dataset.stackP;
        delete box.dataset.covered;
      });
    };
  }, [enabled]);
  return null;
}
