/**
 * A world (props.world, pageTree/physics.ts) at work: what it holds become bodies of Matter.js (loaded only on a
 * page with a world). Each body's place, measured from the element where the design put it, is carried back to
 * the element as --pt-qx / --pt-qy / --pt-qrz (TREE_TRANSFORM), so the page itself never moves anything else.
 *  - Its walls hug the element's box (open at the top, a floor only, all four or none); bodies that fall out of a
 *    box with no floor are dropped from the world.
 *  - Dropped in: the bodies wait above the box (out of sight: the box clips while it runs) until it starts.
 *  - Bodies are grabbed with the pointer (a finger after a short hold, so a swipe still scrolls) and thrown; the
 *    pointer can push or pull them; a click bursts them apart or turns gravity over; a phone's tilt moves
 *    gravity; a wind blows in gusts. Ropes and springs are drawn as thin lines.
 *  - Steady steps (60 a second) whatever the screen's rate; resting when every body sleeps, when off screen.
 * bakeWorld runs the same world without drawing and gives each body's run as keyframes (physics.ts bakeFrames).
 */
import type * as MatterTypes from "matter-js";
import type { KeyFrameSpec } from "./keyframes";
import { bakeFrames, bodyOf, seeded, type BodySpec, type Sample, type WorldSpec } from "./physics";

type M = typeof MatterTypes;
type Body = MatterTypes.Body;
type Constraint = MatterTypes.Constraint;
type Engine = MatterTypes.Engine;

export type Item = { el: HTMLElement; id: string; body: Body; rest: { x: number; y: number }; w: number; h: number; spec: BodySpec | null; hang: Constraint | null; line: SVGLineElement | null; gone: boolean };
type Built = { engine: Engine; items: Item[]; w: number; h: number; top: Body | null };
const STEP = 1000 / 60;
const VARS = ["--pt-qx", "--pt-qy", "--pt-qrz"] as const;

export async function loadMatter(): Promise<M> {
  const mod = (await import("matter-js")) as unknown as M & { default?: M };
  return mod.default ?? mod;
}

/** The elements a world holds: its own children in the page (those set "not in the world" left out). */
export function worldChildren(host: HTMLElement): Array<{ el: HTMLElement; id: string; spec: BodySpec | null }> {
  const out: Array<{ el: HTMLElement; id: string; spec: BodySpec | null }> = [];
  for (const el of host.querySelectorAll<HTMLElement>("[data-tree-node]")) {
    if (el.parentElement?.closest("[data-tree-node]") !== host) continue;
    let spec: BodySpec | null = null;
    try { spec = bodyOf(JSON.parse(el.dataset.ptBody ?? "null")); } catch { spec = null; }
    if (spec?.out) continue;
    out.push({ el, id: el.dataset.treeNode ?? "", spec });
  }
  return out;
}

const idSeed = (id: string) => [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const clear = (el: HTMLElement) => VARS.forEach((v) => el.style.removeProperty(v));

/** A corner's rounding in px (a % of the shorter side counted too). */
function roundingOf(el: HTMLElement, w: number, h: number) {
  const r = getComputedStyle(el).borderTopLeftRadius;
  const v = parseFloat(r);
  if (!Number.isFinite(v)) return 0;
  return r.trim().endsWith("%") ? (v / 100) * Math.min(w, h) : v;
}

function build(Matter: M, host: HTMLElement, spec: WorldSpec, rnd: () => number, limit: number): Built {
  const { Bodies, Body, Composite, Constraint, Engine } = Matter;
  const kids = worldChildren(host).slice(0, limit);
  kids.forEach((k) => clear(k.el));
  const box = host.getBoundingClientRect();
  const W = box.width, H = box.height;
  const engine = Engine.create({ enableSleeping: true });
  engine.gravity.x = spec.gx;
  engine.gravity.y = spec.gy;
  const T = 400;
  const wall = (x: number, y: number, w: number, h: number) => Bodies.rectangle(x, y, w, h, { isStatic: true, friction: spec.friction, restitution: spec.bounce });
  const walls: Body[] = [];
  if (spec.walls !== "none") walls.push(wall(W / 2, H + T / 2, W + T * 2, T));
  if (spec.walls === "open" || spec.walls === "box") walls.push(wall(-T / 2, H / 2 - H, T, H * 3 + T), wall(W + T / 2, H / 2 - H, T, H * 3 + T));
  // All four: the top closes once the dropped bodies are in.
  const top = spec.walls === "box" ? wall(W / 2, -T / 2, W + T * 2, T) : null;
  Composite.add(engine.world, walls);
  if (top && spec.start !== "drop") Composite.add(engine.world, top);
  const items: Item[] = [];
  for (const k of kids) {
    const r = k.el.getBoundingClientRect();
    const w = Math.max(4, r.width), h = Math.max(4, r.height);
    const x = r.left - box.left + w / 2, y = r.top - box.top + h / 2;
    const round = roundingOf(k.el, w, h);
    const shape = k.spec?.shape ?? "auto";
    const circle = shape === "circle" || (shape === "auto" && Math.abs(w - h) < 0.12 * Math.max(w, h) && round >= 0.45 * Math.min(w, h));
    const opts: MatterTypes.IChamferableBodyDefinition = {
      restitution: k.spec?.bounce ?? spec.bounce,
      friction: spec.friction,
      frictionAir: spec.air,
      density: 0.001 * (k.spec?.mass ?? 1),
      isStatic: k.spec?.fixed === true,
      sleepThreshold: 50,
      ...(!circle && round > 1 ? { chamfer: { radius: Math.min(round, Math.min(w, h) / 2 - 1) } } : {}),
    };
    const body = circle ? Bodies.circle(x, y, Math.min(w, h) / 2, opts) : Bodies.rectangle(x, y, w, h, opts);
    let hang: Constraint | null = null;
    if (k.spec?.hang && k.spec.hang !== "none" && !k.spec.fixed) {
      const rope = k.spec.hang === "rope";
      hang = Constraint.create({ pointA: { x, y: 0 }, bodyB: body, pointB: { x: 0, y: -h / 2 }, length: Math.max(8, y - h / 2), stiffness: rope ? 0.9 : 0.014, damping: rope ? 0.02 : 0.04 });
    } else if (spec.start === "drop" && !k.spec?.fixed) {
      Body.setPosition(body, { x: x + (rnd() - 0.5) * 24, y: -h / 2 - 24 - rnd() * H * 0.9 });
      Body.setAngle(body, (rnd() - 0.5) * 0.7);
    }
    items.push({ el: k.el, id: k.id, body, rest: { x, y }, w, h, spec: k.spec, hang, line: null, gone: false });
  }
  Composite.add(engine.world, items.map((i) => i.body));
  const ropes = items.map((i) => i.hang).filter((c): c is Constraint => Boolean(c));
  if (ropes.length) Composite.add(engine.world, ropes);
  return { engine, items, w: W, h: H, top };
}

/** Bursting apart from a point (the middle when started that way): each body pushed away, nearer ones harder. */
function burst(Matter: M, b: Built, at: { x: number; y: number }, reach: number, power: number) {
  for (const it of b.items) {
    if (it.body.isStatic || it.gone) continue;
    const dx = it.body.position.x - at.x, dy = it.body.position.y - at.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > reach) continue;
    const k = power * (1 - d / reach * 0.6);
    Matter.Sleeping.set(it.body, false);
    Matter.Body.setVelocity(it.body, { x: it.body.velocity.x + (dx / d) * k, y: it.body.velocity.y + (dy / d) * k - power * 0.35 });
    Matter.Body.setAngularVelocity(it.body, (Math.random() - 0.5) * 0.3);
  }
}

/** One steady step's own pushes: the wind's gusts and the pointer pushing or pulling. */
function forces(Matter: M, b: Built, spec: WorldSpec, t: number, pointer: { x: number; y: number } | null) {
  for (let i = 0; i < b.items.length; i++) {
    const body = b.items[i].body;
    if (body.isStatic || b.items[i].gone) continue;
    if (spec.wind) Matter.Body.applyForce(body, body.position, { x: spec.wind * body.mass * 0.00028 * (0.55 + 0.45 * Math.sin(t / 650 + i * 1.7)), y: 0 });
    if (pointer && spec.pointer !== "none") {
      const dx = body.position.x - pointer.x, dy = body.position.y - pointer.y;
      const d = Math.hypot(dx, dy) || 1;
      const R = 150;
      if (d < R) {
        const f = (1 - d / R) * 0.0011 * body.mass * (spec.pointer === "push" ? 1 : -1);
        Matter.Sleeping.set(body, false);
        Matter.Body.applyForce(body, body.position, { x: (dx / d) * f, y: (dy / d) * f });
      }
    }
  }
}

/** Where each body is, carried to its element; bodies far out of an open box leave the world. */
function draw(Matter: M, b: Built) {
  for (const it of b.items) {
    if (it.gone) continue;
    const { x, y } = it.body.position;
    if (y > b.h + 600 || x < -800 || x > b.w + 800) {
      it.gone = true;
      Matter.Composite.remove(b.engine.world, it.body);
      it.el.style.setProperty("visibility", "hidden");
      continue;
    }
    it.el.style.setProperty("--pt-qx", `${(x - it.rest.x).toFixed(1)}px`);
    it.el.style.setProperty("--pt-qy", `${(y - it.rest.y).toFixed(1)}px`);
    it.el.style.setProperty("--pt-qrz", `${((it.body.angle * 180) / Math.PI).toFixed(2)}deg`);
    if (it.line && it.hang) {
      const a = it.body.angle, p = it.hang.pointB ?? { x: 0, y: 0 };
      it.line.setAttribute("x1", String(it.hang.pointA.x));
      it.line.setAttribute("y1", String(it.hang.pointA.y));
      it.line.setAttribute("x2", String(x + p.x * Math.cos(a) - p.y * Math.sin(a)));
      it.line.setAttribute("y2", String(y + p.x * Math.sin(a) + p.y * Math.cos(a)));
    }
  }
}

export type WorldRun = { begin(): void; stop(): void };

/**
 * A world on the page: built at once (dropped bodies wait above, out of sight), moving from `begin()` (its
 * start: seen, clicked, the pointer over it… TreePhysics calls it), until `stop()` puts everything back.
 */
export function startWorld(Matter: M, host: HTMLElement, spec: WorldSpec, opts: { phone: boolean; onRest?: () => void }): WorldRun {
  const id = host.dataset.treeNode ?? "w";
  let b = build(Matter, host, spec, seeded(idSeed(id)), opts.phone ? 24 : 60);
  const before = { overflow: host.style.overflow, position: host.style.position };
  host.style.overflow = typeof CSS !== "undefined" && CSS.supports?.("overflow", "clip") ? "clip" : "hidden";
  if (getComputedStyle(host).position === "static") host.style.position = "relative";
  host.setAttribute("data-pt-world-on", "");
  // Ropes and springs as thin lines behind the bodies.
  let svg: SVGSVGElement | null = null;
  const lines = () => {
    svg?.remove();
    svg = null;
    if (!b.items.some((i) => i.hang)) return;
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("style", "position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:0");
    for (const it of b.items) {
      if (!it.hang) continue;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("stroke", "currentColor");
      line.setAttribute("stroke-opacity", "0.45");
      line.setAttribute("stroke-width", it.spec?.hang === "spring" ? "1.5" : "1");
      if (it.spec?.hang === "spring") line.setAttribute("stroke-dasharray", "3 3");
      svg.appendChild(line);
      it.line = line;
    }
    host.prepend(svg);
  };
  const dress = () => {
    for (const it of b.items) {
      it.el.style.removeProperty("visibility");
      if (spec.drag && !it.body.isStatic) {
        it.el.style.setProperty("cursor", "grab");
        it.el.style.setProperty("user-select", "none");
      }
    }
  };
  lines();
  dress();
  draw(Matter, b);

  let raf = 0, last = 0, acc = 0, t = 0, began = false, visible = true, dead = false;
  let pointer: { x: number; y: number } | null = null;
  let grab: { c: Constraint; pointerId: number } | null = null;
  let again = 0;
  const g = { x: spec.gx, y: spec.gy };
  const frame = (now: number) => {
    raf = 0;
    if (dead || !visible || !began) return;
    acc += last ? Math.min(100, now - last) : STEP;
    last = now;
    let n = 0;
    while (acc >= STEP && n < 4) {
      forces(Matter, b, spec, t, pointer);
      Matter.Engine.update(b.engine, STEP);
      acc -= STEP;
      t += STEP;
      n++;
      if (b.top && t > 1600 && !b.engine.world.bodies.includes(b.top)) Matter.Composite.add(b.engine.world, b.top);
    }
    if (n === 4) acc = 0;
    draw(Matter, b);
    const still = b.items.every((i) => i.gone || i.body.isStatic || i.body.isSleeping);
    if (still && !grab && !spec.wind && !(spec.pointer !== "none" && pointer)) { last = 0; opts.onRest?.(); return; }
    raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    if (dead || !began) return;
    for (const it of b.items) if (!it.gone) Matter.Sleeping.set(it.body, false);
    if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); }
  };
  const restart = () => {
    if (dead) return;
    Matter.Engine.clear(b.engine);
    b = build(Matter, host, spec, seeded(idSeed(id)), opts.phone ? 24 : 60);
    b.engine.gravity.x = g.x;
    b.engine.gravity.y = g.y;
    t = 0;
    lines();
    dress();
    draw(Matter, b);
    if (spec.start === "burst") burst(Matter, b, { x: b.w / 2, y: b.h / 2 }, Math.max(b.w, b.h), 14);
    wake();
    if (spec.again) again = window.setTimeout(restart, spec.again * 1000);
  };

  const local = (e: { clientX: number; clientY: number }) => {
    const r = host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  let pressAt: { x: number; y: number } | null = null;
  let hold = 0;
  const take = (e: PointerEvent, it: Item) => {
    const p = local(e);
    const a = it.body.angle, dx = p.x - it.body.position.x, dy = p.y - it.body.position.y;
    const c = Matter.Constraint.create({ pointA: p, bodyB: it.body, pointB: { x: dx * Math.cos(-a) - dy * Math.sin(-a), y: dx * Math.sin(-a) + dy * Math.cos(-a) }, length: 0.01, stiffness: 0.12, damping: 0.08 });
    Matter.Composite.add(b.engine.world, c);
    grab = { c, pointerId: e.pointerId };
    it.el.style.setProperty("cursor", "grabbing");
    try { host.setPointerCapture(e.pointerId); } catch { /* not captured: moves still come while over it */ }
    wake();
  };
  const down = (e: PointerEvent) => {
    pressAt = { x: e.clientX, y: e.clientY };
    askTilt();
    if (!began && spec.on === "click") return;
    if (!spec.drag || !began) return;
    const it = b.items.find((i) => !i.gone && !i.body.isStatic && i.el.contains(e.target as Node));
    if (!it) return;
    if (e.pointerType === "touch") {
      // A finger holds a moment before it takes a body, so a swipe over the world still scrolls the page.
      hold = window.setTimeout(() => { hold = 0; take(e, it); }, 180);
      return;
    }
    e.preventDefault();
    take(e, it);
  };
  const move = (e: PointerEvent) => {
    pointer = local(e);
    if (hold && pressAt && Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > 8) { window.clearTimeout(hold); hold = 0; }
    if (grab && e.pointerId === grab.pointerId) grab.c.pointA = pointer;
    if (spec.pointer !== "none" || grab) wake();
  };
  const up = (e: PointerEvent) => {
    if (hold) { window.clearTimeout(hold); hold = 0; }
    if (!grab || e.pointerId !== grab.pointerId) return;
    Matter.Composite.remove(b.engine.world, grab.c);
    const body = grab.c.bodyB;
    grab = null;
    for (const it of b.items) if (it.body === body) it.el.style.setProperty("cursor", "grab");
  };
  const leave = () => { pointer = null; };
  const touchMove = (e: TouchEvent) => { if (grab) e.preventDefault(); };
  const click = (e: MouseEvent) => {
    const moved = pressAt ? Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) : 0;
    if (!began) { if (spec.on === "click") run.begin(); return; }
    if (moved > 6) return;
    if (spec.click === "burst") { burst(Matter, b, local(e), 280, 12); wake(); }
    else if (spec.click === "flip") { g.y = -g.y; b.engine.gravity.y = g.y; wake(); }
  };
  const enter = () => { if (!began && spec.on === "hover") run.begin(); };
  const dragStart = (e: Event) => e.preventDefault();
  // The phone's tilt: gravity leans as the phone does (iPhones ask once, on the first touch).
  let tilting = false;
  const tilt = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    const strength = Math.hypot(spec.gx, spec.gy) || 1;
    g.x = Math.sin((Math.max(-90, Math.min(90, e.gamma)) * Math.PI) / 180) * strength;
    g.y = Math.sin((Math.max(-90, Math.min(90, e.beta)) * Math.PI) / 180) * strength;
    b.engine.gravity.x = g.x;
    b.engine.gravity.y = g.y;
    wake();
  };
  function askTilt() {
    if (!spec.tilt || tilting) return;
    tilting = true;
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    if (D?.requestPermission) void D.requestPermission().then((s) => { if (s === "granted") window.addEventListener("deviceorientation", tilt); }).catch(() => undefined);
    else window.addEventListener("deviceorientation", tilt);
  }
  if (spec.tilt && !(window.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined)?.requestPermission) askTilt();

  host.addEventListener("pointerdown", down);
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerup", up);
  host.addEventListener("pointercancel", up);
  host.addEventListener("pointerleave", leave);
  host.addEventListener("pointerenter", enter);
  host.addEventListener("click", click);
  host.addEventListener("dragstart", dragStart);
  host.addEventListener("touchmove", touchMove, { passive: false });
  const io = typeof IntersectionObserver === "function"
    ? new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !began && spec.on === "view" && e.intersectionRatio > 0) run.begin();
        else if (visible) wake();
      }, { threshold: [0, 0.2] })
    : null;
  io?.observe(host);

  const run: WorldRun = {
    begin() {
      if (began || dead) return;
      began = true;
      if (spec.start === "burst") burst(Matter, b, { x: b.w / 2, y: b.h / 2 }, Math.max(b.w, b.h), 14);
      else if (b.items.some((i) => i.hang)) for (const it of b.items) if (it.hang) Matter.Body.setVelocity(it.body, { x: (Math.random() - 0.5) * 5, y: 0 });
      wake();
      if (spec.again) again = window.setTimeout(restart, spec.again * 1000);
    },
    stop() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      if (hold) window.clearTimeout(hold);
      window.clearTimeout(again);
      io?.disconnect();
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("click", click);
      host.removeEventListener("dragstart", dragStart);
      host.removeEventListener("touchmove", touchMove);
      window.removeEventListener("deviceorientation", tilt);
      for (const it of b.items) {
        clear(it.el);
        for (const p of ["visibility", "cursor", "user-select"]) it.el.style.removeProperty(p);
      }
      svg?.remove();
      host.style.overflow = before.overflow;
      host.style.position = before.position;
      host.removeAttribute("data-pt-world-on");
      Matter.Engine.clear(b.engine);
    },
  };
  if (spec.on === "load") run.begin();
  return run;
}

/**
 * The same world run for `seconds` without drawing it (no pointer, the same steady randomness as when it's tried),
 * each body that moves given as keyframes: px from its place and degrees turned.
 */
export function bakeWorld(Matter: M, host: HTMLElement, spec: WorldSpec, seconds: number): Record<string, KeyFrameSpec[]> {
  const b = build(Matter, host, spec, seeded(idSeed(host.dataset.treeNode ?? "w")), 60);
  if (spec.start === "burst") burst(Matter, b, { x: b.w / 2, y: b.h / 2 }, Math.max(b.w, b.h), 14);
  const runs = new Map<Item, Sample[]>(b.items.map((i) => [i, []]));
  const sample = (t: number) => {
    for (const it of b.items) {
      if (it.gone || it.body.isStatic) continue;
      runs.get(it)!.push({ t: t / 1000, x: it.body.position.x - it.rest.x, y: it.body.position.y - it.rest.y, a: (it.body.angle * 180) / Math.PI });
    }
  };
  sample(0);
  const steps = Math.round((seconds * 1000) / STEP);
  for (let n = 1; n <= steps; n++) {
    forces(Matter, b, spec, n * STEP, null);
    Matter.Engine.update(b.engine, STEP);
    if (b.top && n * STEP > 1600 && !b.engine.world.bodies.includes(b.top)) Matter.Composite.add(b.engine.world, b.top);
    for (const it of b.items) if (!it.gone && it.body.position.y > b.h + 600) it.gone = true;
    if (n % 2 === 0) sample(n * STEP);
  }
  const out: Record<string, KeyFrameSpec[]> = {};
  for (const [it, s] of runs) {
    if (!it.id || s.length < 2 || s.every((p) => Math.abs(p.x) < 0.5 && Math.abs(p.y) < 0.5 && Math.abs(p.a) < 0.5)) continue;
    out[it.id] = bakeFrames(s);
  }
  Matter.Engine.clear(b.engine);
  return out;
}
