"use client";
/**
 * Physics at work in the page (pageTree/physics.ts), loaded only on a page that has it:
 *  - elements' own physics (motion.physics, marked data-pt-physics): springs and gravity worked out in one frame
 *    loop for all of them, written to --pt-qx / --pt-qy / --pt-qrz / --pt-qsx / --pt-qsy / --pt-qky
 *    (TREE_TRANSFORM), the loop resting whenever nothing moves;
 *  - worlds (props.world, marked data-pt-world): Matter.js loaded then, each world run by physicsWorld.ts.
 * Nothing moves for "reduce motion", for an element set light (perf.ts), or on a phone where its motion says so
 * ("lite" keeps only a drop, "off" nothing). Inside the editor's frame it all waits until the editor plays it
 * (motionLive, motionPlay / physicsPlay for one), stops on physicsStop, and a world is baked on physicsBake: run
 * without drawing, its bodies' keyframes sent back (physicsBaked).
 */
import { useEffect } from "react";
import { lightNow } from "./perf";
import { feelOf, fallStep, pendulumStep, physicsOf, springRests, springStep, worldOf, type PhysicsSpec, type Spring } from "./physics";
import { studioLink } from "./studioLink";
import type { WorldRun } from "./physicsWorld";

const OWN = ["--pt-qx", "--pt-qy", "--pt-qrz", "--pt-qsx", "--pt-qsy", "--pt-qky"] as const;
type Own = { el: HTMLElement; spec: PhysicsSpec; step: (dt: number, t: number) => boolean; start?: () => void; stop: () => void; seen: boolean; watch?: HTMLElement };
/** What tells whether an element is seen: the box it sits in (the element itself is moved, a drop starts out of sight). */
const watchOf = (el: HTMLElement) => el.parentElement?.closest<HTMLElement>("[data-tree-node]") ?? el.parentElement ?? el;
type Shared = { pointer: { x: number; y: number; vx: number; vy: number; at: number } | null; scrollV: number; wake: () => void };

const sp = (): Spring => ({ x: 0, v: 0 });
const clamp = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));
const put = (el: HTMLElement, k: (typeof OWN)[number], v: number, unit: string) => el.style.setProperty(k, `${+v.toFixed(unit === "" ? 4 : 2)}${unit}`);
const centreOf = (el: HTMLElement, off: { x: number; y: number }) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - off.x, y: r.top + r.height / 2 - off.y };
};

/** One element's own physics: its state, and what one step does to it (true while it still moves). */
function ownOf(el: HTMLElement, spec: PhysicsSpec, sh: Shared): Own {
  const f = feelOf(spec);
  const x = sp(), y = sp(), a = sp(), sq = sp();
  const off = { x: 0, y: 0 };
  const clear = () => OWN.forEach((k) => el.style.removeProperty(k));
  const stop = () => { clear(); el.style.removeProperty("opacity"); el.style.removeProperty("cursor"); el.style.removeProperty("touch-action"); };
  const spring = (s: Spring, target: number, dt: number) => springStep(s, target, f.stiffness, f.damping, f.mass, dt);
  switch (spec.kind) {
    case "follow":
    case "magnet": {
      return {
        el, spec, seen: false, stop,
        step(dt) {
          let tx = 0, ty = 0;
          if (sh.pointer) {
            const c = centreOf(el, { x: x.x, y: y.x });
            const dx = sh.pointer.x - c.x, dy = sh.pointer.y - c.y;
            if (spec.kind === "follow") { tx = clamp(dx * 0.08 * f.amount, 32 * f.amount); ty = clamp(dy * 0.08 * f.amount, 32 * f.amount); }
            else if (Math.hypot(dx, dy) < 150 * f.amount) { tx = clamp(dx * 0.35, 44 * f.amount); ty = clamp(dy * 0.35, 44 * f.amount); }
          }
          spring(x, tx, dt);
          spring(y, ty, dt);
          put(el, "--pt-qx", x.x, "px");
          put(el, "--pt-qy", y.x, "px");
          return !(springRests(x, tx) && springRests(y, ty)) || Boolean(sh.pointer && Date.now() - sh.pointer.at < 400);
        },
      };
    }
    case "throw": {
      let held: { id: number; sx: number; sy: number; ox: number; oy: number } | null = null;
      let restFor = 0;
      const down = (e: PointerEvent) => {
        held = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: x.x, oy: y.x };
        x.v = y.v = 0;
        try { el.setPointerCapture(e.pointerId); } catch { /* moves still come while over it */ }
        el.style.setProperty("cursor", "grabbing");
        e.preventDefault();
        sh.wake();
      };
      const move = (e: PointerEvent) => {
        if (!held || e.pointerId !== held.id) return;
        const nx = held.ox + e.clientX - held.sx, ny = held.oy + e.clientY - held.sy;
        const now = performance.now();
        const dt = Math.max(8, now - last) / 1000;
        last = now;
        x.v = x.v * 0.4 + ((nx - x.x) / dt) * 0.6;
        y.v = y.v * 0.4 + ((ny - y.x) / dt) * 0.6;
        x.x = nx;
        y.x = ny;
        sh.wake();
      };
      let last = performance.now();
      const up = (e: PointerEvent) => { if (held && e.pointerId === held.id) { held = null; restFor = 0; el.style.setProperty("cursor", "grab"); sh.wake(); } };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.style.setProperty("cursor", "grab");
      el.style.setProperty("touch-action", "none");
      return {
        el, spec, seen: false,
        stop() {
          el.removeEventListener("pointerdown", down);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
          stop();
        },
        step(dt) {
          if (!held) {
            const speed = Math.hypot(x.v, y.v);
            if (speed > 4) {
              x.x += x.v * dt;
              y.x += y.v * dt;
              const keep = Math.exp(-2.4 * dt);
              x.v *= keep;
              y.v *= keep;
              // Its box: the element it sits in.
              const box = el.parentElement?.closest<HTMLElement>("[data-tree-node]")?.getBoundingClientRect();
              if (box) {
                const r = el.getBoundingClientRect();
                const rest = { l: r.left - (x.x - x.v * dt), r: r.right - (x.x - x.v * dt), t: r.top - (y.x - y.v * dt), b: r.bottom - (y.x - y.v * dt) };
                const minX = box.left - rest.l, maxX = box.right - rest.r, minY = box.top - rest.t, maxY = box.bottom - rest.b;
                if (minX < maxX) { if (x.x < minX) { x.x = minX; x.v = -x.v * f.bounce; } else if (x.x > maxX) { x.x = maxX; x.v = -x.v * f.bounce; } }
                if (minY < maxY) { if (y.x < minY) { y.x = minY; y.v = -y.v * f.bounce; } else if (y.x > maxY) { y.x = maxY; y.v = -y.v * f.bounce; } }
              }
              restFor = 0;
            } else if (spec.home !== "stay") {
              restFor += dt;
              if (restFor > 1.2) { spring(x, 0, dt); spring(y, 0, dt); }
            } else { x.v = y.v = 0; }
          }
          spring(a, held ? 0 : clamp(x.v * 0.012, 14), dt);
          put(el, "--pt-qx", x.x, "px");
          put(el, "--pt-qy", y.x, "px");
          put(el, "--pt-qrz", a.x, "deg");
          const resting = !held && Math.hypot(x.v, y.v) <= 4 && (spec.home === "stay" ? true : springRests(x, 0, 0.3) && springRests(y, 0, 0.3)) && springRests(a, 0);
          return Boolean(held) || !resting;
        },
      };
    }
    case "drop": {
      const height = 260 * f.amount;
      let going = false;
      y.x = height;
      put(el, "--pt-qy", -height, "px");
      el.style.setProperty("opacity", "0");
      return {
        el, spec, seen: false, stop,
        start() { going = true; el.style.removeProperty("opacity"); sh.wake(); },
        step(dt) {
          if (!going) return false;
          const { hit } = fallStep(y, 2600, f.bounce, dt);
          if (hit) { const s = Math.min(0.22, hit / 5000); sq.x = s; sq.v = 0; }
          springStep(sq, 0, 420, 16, 1, dt);
          put(el, "--pt-qy", -y.x, "px");
          put(el, "--pt-qsx", 1 + sq.x, "");
          put(el, "--pt-qsy", 1 - sq.x, "");
          return !(y.x === 0 && y.v === 0 && springRests(sq, 0, 0.002));
        },
      };
    }
    case "pendulum": {
      let len = 0;
      const pass = () => {
        if (!sh.pointer) return;
        a.v += clamp(sh.pointer.vx * 0.0009 * f.amount, 3);
        sh.wake();
      };
      el.addEventListener("pointermove", pass);
      return {
        el, spec, seen: false,
        stop() { el.removeEventListener("pointermove", pass); stop(); },
        start() { a.v += 1.6 * f.amount; sh.wake(); },
        step(dt) {
          if (!len) len = Math.max(40, el.offsetHeight);
          pendulumStep(a, len, 2400, f.damping, dt);
          const h = el.offsetHeight / 2;
          put(el, "--pt-qrz", (a.x * 180) / Math.PI, "deg");
          put(el, "--pt-qx", -h * Math.sin(a.x), "px");
          put(el, "--pt-qy", h * (Math.cos(a.x) - 1), "px");
          return !(Math.abs(a.x) < 0.002 && Math.abs(a.v) < 0.01);
        },
      };
    }
    case "float": {
      const phase = Math.random() * Math.PI * 2;
      const push = () => { y.v += 220 * f.amount; sh.wake(); };
      el.addEventListener("pointerenter", push);
      return {
        el, spec, seen: false,
        stop() { el.removeEventListener("pointerenter", push); stop(); },
        step(dt, t) {
          spring(y, 0, dt);
          const bob = Math.sin((t / 3.2) * Math.PI * 2 + phase) * 6 * f.amount;
          put(el, "--pt-qy", y.x + bob, "px");
          put(el, "--pt-qrz", Math.sin((t / 4.1) * Math.PI * 2 + phase) * 1.5 * f.amount, "deg");
          return true;
        },
      };
    }
    case "scroll": {
      const k = sp();
      return {
        el, spec, seen: false, stop,
        step(dt) {
          const ty = clamp(-sh.scrollV * 0.05 * f.amount, 70), tk = clamp(sh.scrollV * 0.01 * f.amount, 8);
          spring(y, ty, dt);
          spring(k, tk, dt);
          put(el, "--pt-qy", y.x, "px");
          put(el, "--pt-qky", k.x, "deg");
          return Math.abs(sh.scrollV) > 1 || !(springRests(y, ty) && springRests(k, tk));
        },
      };
    }
  }
}

export function TreePhysics({ revision }: { revision: number }) {
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const phone = matchMedia("(max-width: 639.98px)");
    const studio = window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    const mode = { live: !studio, only: null as string | null };
    let owns: Own[] = [];
    let worlds: Array<{ host: HTMLElement; run: WorldRun }> = [];
    let raf = 0, last = 0, t = 0, dead = false, gen = 0;
    const sh: Shared = { pointer: null, scrollV: 0, wake: () => { if (!raf && !dead) { last = 0; raf = requestAnimationFrame(frame); } } };
    // In the editor's frame: once things rest, its boxes are measured again (StudioBridge).
    const settled = () => { if (studio) window.dispatchEvent(new Event("studio-remeasure")); };
    function frame(now: number) {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      t += dt;
      let moving = false;
      for (const o of owns) if (o.seen && o.step(dt, t)) moving = true;
      sh.scrollV *= Math.exp(-6 * dt);
      if (Math.abs(sh.scrollV) < 1) sh.scrollV = 0;
      if (moving) raf = requestAnimationFrame(frame);
      else settled();
    }
    const io = typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          for (const e of entries) {
            for (const o of owns) {
              if (o.watch !== e.target) continue;
              const was = o.seen;
              o.seen = e.isIntersecting;
              if (o.seen && !was) { o.start?.(); sh.wake(); }
            }
          }
        }, { threshold: 0, rootMargin: "0px 0px -12% 0px" })
      : null;
    // The pointer and the scroll, heard only when something answers them.
    let lastScroll = window.scrollY, lastScrollAt = performance.now();
    const onMove = (e: PointerEvent) => {
      const now = Date.now(), p = sh.pointer;
      const dt = p ? Math.max(8, now - p.at) / 1000 : 1;
      sh.pointer = { x: e.clientX, y: e.clientY, vx: p ? (e.clientX - p.x) / dt : 0, vy: p ? (e.clientY - p.y) / dt : 0, at: now };
      sh.wake();
    };
    const onLeave = () => { sh.pointer = null; sh.wake(); };
    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max(8, now - lastScrollAt) / 1000;
      sh.scrollV = sh.scrollV * 0.5 + ((window.scrollY - lastScroll) / dt) * 0.5;
      lastScroll = window.scrollY;
      lastScrollAt = now;
      sh.wake();
    };
    const listening = { pointer: false, scroll: false };

    const stopAll = () => {
      gen++;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      io?.disconnect();
      owns.forEach((o) => o.stop());
      owns = [];
      worlds.forEach((w) => w.run.stop());
      worlds = [];
      if (listening.pointer) { window.removeEventListener("pointermove", onMove); document.documentElement.removeEventListener("pointerleave", onLeave); listening.pointer = false; }
      if (listening.scroll) { window.removeEventListener("scroll", onScroll); listening.scroll = false; }
      settled();
    };
    const plays = (el: HTMLElement) => mode.live || (mode.only !== null && (el.dataset.treeNode === mode.only || Boolean(el.closest(`[data-tree-node="${CSS.escape(mode.only)}"]`))));
    // Which of them are light now (TreePerf's marks): built again only when that changes.
    const lightSig = () => Array.from(document.querySelectorAll<HTMLElement>("[data-pt-physics],[data-pt-world]"), (el) => (lightNow(el) ? "1" : "0")).join("");
    let sig = "";
    const build = () => {
      stopAll();
      sig = lightSig();
      if (reduced.matches) return;
      const my = gen;
      for (const el of document.querySelectorAll<HTMLElement>("[data-pt-physics]")) {
        if (!plays(el) || lightNow(el)) continue;
        let raw: { physics?: unknown; phone?: string } | null = null;
        try { raw = JSON.parse(el.dataset.ptMotion ?? "null"); } catch { raw = null; }
        const spec = physicsOf(raw?.physics);
        if (!spec) continue;
        if (phone.matches && (raw?.phone === "off" || (raw?.phone === "lite" && spec.kind !== "drop"))) continue;
        const o = ownOf(el, spec, sh);
        o.watch = watchOf(el);
        owns.push(o);
        io?.observe(o.watch);
        if (!io) { o.seen = true; o.start?.(); }
        if (["follow", "magnet", "pendulum"].includes(spec.kind) && !listening.pointer) {
          window.addEventListener("pointermove", onMove, { passive: true });
          document.documentElement.addEventListener("pointerleave", onLeave);
          listening.pointer = true;
        }
        if (spec.kind === "scroll" && !listening.scroll) { lastScroll = window.scrollY; window.addEventListener("scroll", onScroll, { passive: true }); listening.scroll = true; }
      }
      const hosts = Array.from(document.querySelectorAll<HTMLElement>("[data-pt-world]")).filter((h) => plays(h) && !lightNow(h));
      if (hosts.length) {
        void import("./physicsWorld").then(async (pw) => {
          const Matter = await pw.loadMatter();
          if (dead || my !== gen) return;
          for (const host of hosts) {
            let spec = null;
            try { spec = worldOf(JSON.parse(host.dataset.ptWorld ?? "null")); } catch { spec = null; }
            if (!spec || spec.baked) continue;
            const run = pw.startWorld(Matter, host, spec, { phone: phone.matches, onRest: settled });
            // Played from the editor: it starts at once, whatever starts it on the page.
            if (studio) run.begin();
            worlds.push({ host, run });
          }
        }).catch(() => undefined);
      }
    };

    const unlisten = studio
      ? studioLink.listen((msg) => {
          if (msg.type === "motionLive") { mode.live = msg.on === true; mode.only = null; build(); }
          else if ((msg.type === "motionPlay" || msg.type === "physicsPlay") && typeof msg.nodeId === "string") {
            const el = document.querySelector(`[data-tree-node="${CSS.escape(msg.nodeId)}"]`);
            if (!el || !(el.matches("[data-pt-physics],[data-pt-world]") || el.closest("[data-pt-world]"))) return;
            const host = el.closest<HTMLElement>("[data-pt-world]");
            mode.only = el.matches("[data-pt-physics]") || !host ? msg.nodeId : (host.dataset.treeNode ?? msg.nodeId);
            build();
          } else if (msg.type === "physicsStop") { mode.only = null; mode.live = false; stopAll(); }
          else if (msg.type === "physicsBake" && typeof msg.nodeId === "string") {
            const requestId = msg.requestId;
            const host = document.querySelector<HTMLElement>(`[data-tree-node="${CSS.escape(msg.nodeId)}"]`);
            const seconds = typeof msg.seconds === "number" && msg.seconds >= 0.5 && msg.seconds <= 20 ? msg.seconds : 4;
            stopAll();
            let spec = null;
            try { spec = worldOf(JSON.parse(host?.dataset.ptWorld ?? "null")); } catch { spec = null; }
            if (!host || !spec) { studioLink.send({ type: "physicsBaked", requestId, nodeId: msg.nodeId, keys: null }); return; }
            void import("./physicsWorld").then(async (pw) => {
              const Matter = await pw.loadMatter();
              const keys = pw.bakeWorld(Matter, host, { ...spec, baked: false }, seconds);
              studioLink.send({ type: "physicsBaked", requestId, nodeId: msg.nodeId, seconds, keys });
            }).catch(() => studioLink.send({ type: "physicsBaked", requestId, nodeId: msg.nodeId, keys: null }));
          }
        })
      : () => {};
    build();
    const again = () => build();
    const perfChanged = () => { if (lightSig() !== sig) build(); };
    window.addEventListener("studio-view-updated", again);
    reduced.addEventListener("change", again);
    phone.addEventListener("change", again);
    window.addEventListener("pt:perf", perfChanged);
    return () => {
      dead = true;
      stopAll();
      unlisten();
      window.removeEventListener("studio-view-updated", again);
      reduced.removeEventListener("change", again);
      phone.removeEventListener("change", again);
      window.removeEventListener("pt:perf", perfChanged);
    };
  }, [revision]);
  return null;
}
