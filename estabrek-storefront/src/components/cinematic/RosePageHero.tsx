"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motionLevel } from "@/lib/motionBudget";
import type { HeroPose } from "./PageHeroScene";

const PageHeroScene = dynamic(() => import("./PageHeroScene"), { ssr: false, loading: () => null });

/** A section box that has its own scene: the hero steps aside there (no two 3D things in one place). */
const BUSY = "canvas, video, .rose-ring, [data-hero-busy]";

/*
 * The page hero (rose-wonders.css, "the page hero"): a 3D silk hijab that travels with the shopper down the
 * whole home. It floats on one side of the screen, then the other, section after section; it steps aside
 * where a section has a scene of its own (a film, a 3D model, the particles, the map, the rooms) and comes
 * back after it; it turns with the scroll and takes the colour picked. A layer over the page that never takes
 * a tap. Only on the home, not in the editor's frame, not for less motion or a light device.
 */
export function RosePageHero({ enabled = true }: { enabled?: boolean }) {
  const pose = useRef<HeroPose>({ side: 1, weight: 0, spin: 0, speed: 0, tint: "", compact: false });
  const [on, setOn] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || window.self !== window.top) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || motionLevel() === "lite") return;
    const frame = document.querySelector<HTMLElement>(".rose-page-frame.rose-home");
    if (!frame) return;
    setOn(true);
    const rtl = getComputedStyle(frame).direction === "rtl";
    let raf = 0, idle = 0, lastY = window.scrollY, lastT = performance.now();
    const read = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      const boxes = Array.from(frame.children) as HTMLElement[];
      let index = -1;
      for (let i = 0; i < boxes.length; i++) {
        const r = boxes[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) { index = i; break; }
      }
      const box = index >= 0 ? boxes[index] : null;
      const busy = !box || Boolean(box.querySelector(BUSY)) || box.hasAttribute("data-hero-busy");
      const p = pose.current;
      p.compact = window.innerWidth < 760;
      p.weight = busy ? 0 : p.compact ? 0.5 : 1;
      p.side = (index % 2 === 0 ? 1 : -1) * (rtl ? -1 : 1);
      const now = performance.now();
      p.speed = ((window.scrollY - lastY) / Math.max(1, now - lastT)) * 16;
      lastY = window.scrollY;
      lastT = now;
      p.spin = window.scrollY / 900;
      const css = getComputedStyle(document.querySelector(".cinematic-shell") ?? document.documentElement);
      p.tint = css.getPropertyValue("--selection-seed").trim() || css.getPropertyValue("--selection-accent").trim() || "#d99fb6";
      window.clearTimeout(idle);
      if (p.weight > 0) setActive(true);
      // Gone for a while: the scene stops drawing.
      else idle = window.setTimeout(() => setActive(false), 1600);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const tick = window.setInterval(schedule, 1200); // sections built later, colours picked
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      window.clearInterval(tick);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled]);

  if (!on) return null;
  return <div className="rose-page-hero" aria-hidden="true" data-active={active || undefined}><PageHeroScene pose={pose} active={active} /></div>;
}
