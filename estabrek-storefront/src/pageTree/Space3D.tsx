"use client";

/**
 * A box laying out what it holds in 3D (spaceSpec.ts says each way): drawn inside the box, it places the box's own
 * elements (they stay the owner's, each edited as usual) and turns them. It runs only while the box is near the
 * screen; in the editor's frame nothing turns by itself; for less motion everything stays flat, where it was.
 */
import { useEffect, useRef } from "react";
import { bookPose, cubePose, helixPose, phonePose, ringPose, ringRadius, SPACE_MAX, type SpaceSpec } from "./spaceSpec";

const calm = () => typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
const PLACED = ["transform", "opacity", "z-index", "width", "height", "pointer-events", "visibility"];
const PHONE_W = 240, PHONE_H = 490, PHONE_D = 16;

export function Space3D({ spec }: { spec: SpaceSpec }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { kind, speed, drag, tilt } = spec;
  useEffect(() => {
    const gear = ref.current;
    const host = gear?.parentElement as HTMLElement | null;
    if (!gear || !host || calm()) return;
    const kids = Array.from(host.querySelectorAll<HTMLElement>(":scope > [data-tree-node], :scope > .pt-inner > [data-tree-node]")).slice(0, SPACE_MAX[kind]);
    if (!kids.length) return;
    const studio = window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    const rtl = getComputedStyle(host).direction === "rtl";
    // Their sizes where they stood, before they're lifted out of the row.
    const sizes = kids.map((k) => ({ w: k.offsetWidth, h: k.offsetHeight }));
    const hostW = host.clientWidth || 800;
    const maxH = Math.max(...sizes.map((s) => s.h), 60);
    host.setAttribute("data-pt-space", kind);
    if (rtl) host.setAttribute("data-pt-space-rtl", "");
    kids.forEach((k) => k.setAttribute("data-pt-space-on", ""));
    const setH = (px: number) => host.style.setProperty("--pt-space-h", `${Math.round(px)}px`);
    const auto = studio ? 0 : speed;

    const off: Array<() => void> = [];
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      off.push(() => el.removeEventListener(type, fn as EventListener));
    };
    // Turned by hand: a drag's move in px, and when it ends.
    const byHand = (move: (dx: number, dy: number) => void, end: () => void) => {
      if (!drag) return;
      let last: { x: number; y: number; id: number } | null = null;
      on(host, "pointerdown", (e) => {
        if ((e.target as HTMLElement).closest("a,button,input,select,textarea")) return;
        last = { x: e.clientX, y: e.clientY, id: e.pointerId };
      });
      on(window, "pointermove", (e) => {
        if (!last || e.pointerId !== last.id) return;
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        if (Math.abs(dx) + Math.abs(dy) < 1) return;
        host.setAttribute("data-pt-space-drag", "");
        last = { ...last, x: e.clientX, y: e.clientY };
        move(dx, dy);
      });
      const up = () => {
        if (!last) return;
        last = null;
        host.removeAttribute("data-pt-space-drag");
        end();
      };
      on(window, "pointerup", up);
      on(window, "pointercancel", up);
    };

    // A frame loop that runs only while the box is near the screen.
    let raf = 0, near = true, prev = 0;
    const loop = (frame: (dt: number) => void) => {
      const tick = (now: number) => {
        const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
        prev = now;
        frame(dt);
        raf = near ? requestAnimationFrame(tick) : 0;
      };
      const io = new IntersectionObserver(([e]) => {
        near = e.isIntersecting;
        if (near && !raf) { prev = 0; raf = requestAnimationFrame(tick); }
      }, { rootMargin: "200px" });
      io.observe(host);
      frame(0);
      raf = requestAnimationFrame(tick);
      off.push(() => { io.disconnect(); cancelAnimationFrame(raf); });
    };

    if (kind === "ring" || kind === "helix") {
      const w = Math.round(Math.min(Math.max(...sizes.map((s) => s.w)), Math.max(150, hostW * 0.26), 320));
      const n = kids.length, step = 360 / n;
      const radius = kind === "ring" ? ringRadius(n, w) : Math.max(w * 0.75, 140);
      const rise = Math.max(36, maxH * 0.42);
      kids.forEach((k) => { k.style.width = `${w}px`; });
      setH(kind === "ring" ? maxH * 1.25 + 120 : (n - 1) * rise + maxH + 60);
      let angle = 0, hold = false, snap: number | null = null, rest = 0;
      on(host, "pointerenter", () => { hold = true; });
      on(host, "pointerleave", () => { hold = false; });
      byHand((dx) => { snap = null; rest = 1.2; angle += dx * (rtl ? -0.3 : 0.3); }, () => { if (kind === "ring") snap = Math.round(angle / step) * step; });
      loop((dt) => {
        if (snap !== null) {
          angle += (snap - angle) * Math.min(1, dt * 8);
          if (Math.abs(snap - angle) < 0.05) { angle = snap; snap = null; }
        } else if (rest > 0) rest -= dt;
        else if (!hold) angle -= auto * dt * (kind === "ring" ? 12 : 30) * (rtl ? -1 : 1);
        kids.forEach((k, i) => {
          const pose = kind === "ring" ? ringPose(i, n, angle, radius, tilt) : helixPose(i, n, angle, radius, rise);
          k.style.transform = pose.transform;
          // The far side faint, the near side whole.
          k.style.opacity = (pose.facing < 0 ? 0.14 + 0.16 * (pose.facing + 1) : 0.3 + 0.7 * pose.facing).toFixed(3);
          k.style.zIndex = String(Math.round((pose.facing + 1) * 50));
        });
      });
    } else if (kind === "cube") {
      const size = Math.round(Math.min(hostW * 0.6, 340));
      kids.forEach((k) => { k.style.width = `${size}px`; k.style.height = `${size}px`; });
      setH(size * 1.7);
      let ax = tilt || -18, ay = 30, rest = 0;
      byHand((dx, dy) => { rest = 1.5; ay += dx * 0.45 * (rtl ? -1 : 1); ax = Math.max(-80, Math.min(80, ax - dy * 0.45)); }, () => {});
      loop((dt) => {
        if (rest > 0) rest -= dt;
        else ay += auto * dt * 24 * (rtl ? -1 : 1);
        kids.forEach((k, i) => { k.style.transform = cubePose(i, size, ax, ay); });
      });
    } else if (kind === "book") {
      const page = Math.round(Math.min(hostW / 2 - 12, 420));
      const tall = Math.round(Math.min(Math.max(page * 1.3, maxH), 640));
      const leaves = Math.ceil(kids.length / 2);
      kids.forEach((k) => { k.style.width = `${page}px`; k.style.height = `${tall}px`; });
      setH(tall + 40);
      // Turned with the arrow keys too.
      if (!host.hasAttribute("tabindex")) { host.setAttribute("tabindex", "0"); off.push(() => host.removeAttribute("tabindex")); }
      const turn = Array.from({ length: leaves }, () => 0);
      let at = 0;
      const go = (to: number) => {
        at = Math.max(0, Math.min(leaves, to));
        host.setAttribute("data-pt-space-page", String(at));
      };
      go(0);
      let downX: number | null = null;
      on(host, "pointerdown", (e) => { downX = e.clientX; });
      on(host, "pointerup", (e) => {
        if (downX === null) return;
        const dx = e.clientX - downX;
        downX = null;
        if (Math.abs(dx) > 40) { go(at + ((dx < 0) !== rtl ? 1 : -1)); return; }
        if ((e.target as HTMLElement).closest("a,button,input,select,textarea")) return;
        const i = kids.findIndex((k) => k.contains(e.target as Node));
        if (i < 0) return;
        go(i % 2 === 0 ? Math.floor(i / 2) + 1 : Math.floor(i / 2));
      });
      on(host, "keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        go(at + ((e.key === "ArrowRight") !== rtl ? 1 : -1));
      });
      loop((dt) => {
        for (let j = 0; j < leaves; j++) {
          const want = j < at ? 180 : 0;
          turn[j] += (want - turn[j]) * Math.min(1, dt * 5);
          if (Math.abs(want - turn[j]) < 0.2) turn[j] = want;
        }
        kids.forEach((k, i) => {
          const pose = bookPose(i, turn, page, rtl);
          k.style.transform = pose.transform;
          k.style.zIndex = String(pose.z);
        });
      });
    } else {
      // phone: its screens one by one, in a phone that turns as the page scrolls past it.
      kids.forEach((k) => { k.style.width = `${PHONE_W - 14}px`; k.style.height = `${PHONE_H - 14}px`; });
      setH(PHONE_H * 1.12 + 60);
      const n = kids.length;
      loop(() => {
        const r = host.getBoundingClientRect(), vh = window.innerHeight || 800;
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        const { ry, rx, scale } = phonePose(p);
        const shown = Math.min(n - 1, Math.max(0, Math.floor(((p - 0.2) / 0.6) * n)));
        const turn = `scale(${scale.toFixed(3)}) rotateX(${rx.toFixed(2)}deg) rotateY(${(rtl ? -ry : ry).toFixed(2)}deg)`;
        gear.style.transform = `translate(-50%,-50%) ${turn}`;
        host.setAttribute("data-pt-space-screen", String(shown));
        kids.forEach((k, i) => {
          k.style.transform = `translate(-50%,-50%) ${turn} translateZ(${PHONE_D / 2 + 1}px)`;
          k.style.opacity = i === shown ? "1" : "0";
          k.style.pointerEvents = i === shown ? "" : "none";
          k.style.visibility = i === shown ? "" : "hidden";
        });
      });
    }

    return () => {
      for (const f of off) f();
      kids.forEach((k) => {
        k.removeAttribute("data-pt-space-on");
        for (const p of PLACED) k.style.removeProperty(p);
      });
      gear.style.removeProperty("transform");
      for (const a of ["data-pt-space", "data-pt-space-rtl", "data-pt-space-drag", "data-pt-space-page", "data-pt-space-screen"]) host.removeAttribute(a);
      host.style.removeProperty("--pt-space-h");
    };
  }, [kind, speed, drag, tilt]);

  return (
    <span ref={ref} className="pt-space-gear" aria-hidden="true" data-kind={kind}>
      {kind === "phone" ? (
        <>
          <span className="pt-phone-front" />
          <span className="pt-phone-back" />
          <span className="pt-phone-side" data-side="start" />
          <span className="pt-phone-side" data-side="end" />
        </>
      ) : null}
    </span>
  );
}
