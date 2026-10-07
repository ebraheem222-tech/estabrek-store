"use client";
/**
 * Rose (رَزان), the storefront's little guide: a 2D hijabi character drawn in SVG.
 * She greets shoppers, reacts to the season (umbrella and a shiver in winter, a
 * flower in spring), holds the 3D collection models on her palm, changes outfit
 * with the category, cheers at shop moments and talks as the chat.
 * Her hijab and clothes follow the shopper's colour (--selection-seed).
 *
 * Everything moves from one requestAnimationFrame loop that only runs while she
 * is on screen; with reduced motion she simply stands still.
 */
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useSyncExternalStore, type MutableRefObject } from "react";
import { razanMaySpeak, razanNow, type SpeakKind } from "@/lib/razanRuntime";
import { ROSE_EVENT, roseLine, type RoseExtras, type RoseMoment, type RoseOutfit } from "@/lib/roseEvents";

/* Which scene Roses (hero, seasons, collections) are on screen, so the floating companion can step aside. */
const sceneOnScreen = new Set<string>();
const sceneListeners = new Set<() => void>();
function setSceneOnScreen(id: string, on: boolean) {
  if (on === sceneOnScreen.has(id)) return;
  if (on) sceneOnScreen.add(id); else sceneOnScreen.delete(id);
  sceneListeners.forEach((l) => l());
}
/** True while a Rose that belongs to a page scene is visible. */
export function useSceneRoseOnScreen() {
  return useSyncExternalStore(
    (cb) => { sceneListeners.add(cb); return () => sceneListeners.delete(cb); },
    () => sceneOnScreen.size > 0,
    () => false,
  );
}

export type MascotPose = "idle" | "wave" | "hold";
export type MascotProp = "none" | "umbrella" | "flower";
export type MascotMood = "happy" | "cold";

export type MascotHandle = {
  wave: () => void;
  joy: () => void;
  dance: () => void;
  cheer: () => void;
  wink: () => void;
  surprise: () => void;
  /** Hand on chin while she thinks (the chat is waiting for an answer). */
  think: (on: boolean) => void;
  /** Mouth moves for a while, as if she is speaking. */
  talk: (ms?: number) => void;
  /** A speech bubble; it shows only when the owner's Razan settings allow it now (see razanMaySpeak). */
  say: (text: string, ms?: number, kind?: SpeakKind) => void;
  /** Look towards a point on screen for a while (e.g. something flying past); the pointer takes over again afterwards. */
  lookAt?: (clientX: number, clientY: number, holdMs?: number) => void;
};

/** Screen position (viewport px) of her open palm, written every frame while she holds something. */
export type PalmRef = MutableRefObject<{ x: number; y: number; dir: 1 | -1 } | null>;

type Props = {
  className?: string;
  pose?: MascotPose;
  prop?: MascotProp;
  mood?: MascotMood;
  outfit?: RoseOutfit;
  extras?: RoseExtras;
  /** Faces the other way (her palm on the left). */
  mirrored?: boolean;
  /** Said once when she first appears. */
  greeting?: string;
  /** Walks in from the side on her first appearance. */
  walkIn?: boolean;
  palm?: PalmRef;
  label: string;
  ar?: boolean;
  /** Answers shop moments (add to bag, wishlist, colour and size picks). */
  reactive?: boolean;
  /** The floating companion: doesn't count as a scene Rose. */
  companion?: boolean;
  /** Present but stepping aside (another Rose is on screen): no reactions. */
  muted?: boolean;
  /** Little idle habits (looking around, fixing her hijab, a hop). */
  idleHabits?: boolean;
};

type Action = "wave" | "joy" | "dance" | "cheer" | "adjust" | "hop" | "look";
const ACTION_LENGTH: Record<Action, number> = { wave: 2.4, joy: 1.6, dance: 1.9, cheer: 1.5, adjust: 1.6, hop: 0.8, look: 2.2 };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const back = (x: number) => { const k = clamp01(x), c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
/** 0 → 1 → 0 over an action: rises in `a`, holds, falls in the last `b`. */
const envelope = (t: number, len: number, a = 0.3, b = 0.45) => ease(t / a) * (1 - ease((t - (len - b)) / b));
const f = (n: number) => n.toFixed(1);

/** A short chubby sleeve from the shoulder to the hand. */
function armPath(sx: number, sy: number, angle: number, len: number) {
  const r = (angle * Math.PI) / 180;
  const hx = sx + Math.sin(r) * len, hy = sy + Math.cos(r) * len;
  const nx = Math.cos(r), ny = -Math.sin(r);
  const d = `M${f(sx + nx * 13)} ${f(sy + ny * 13)} L${f(hx + nx * 15)} ${f(hy + ny * 15)} Q${f(hx + Math.sin(r) * 10)} ${f(hy + Math.cos(r) * 10)} ${f(hx - nx * 15)} ${f(hy - ny * 15)} L${f(sx - nx * 13)} ${f(sy - ny * 13)} Z`;
  const cuff = `M${f(hx + nx * 15)} ${f(hy + ny * 15)} Q${f(hx + Math.sin(r) * 10)} ${f(hy + Math.cos(r) * 10)} ${f(hx - nx * 15)} ${f(hy - ny * 15)}`;
  return { d, cuff, hand: [hx + Math.sin(r) * 9, hy + Math.cos(r) * 9] as const };
}

function tailPath(t: number, wind: number) {
  const N = 14, top: Array<[number, number]> = [], bottom: Array<[number, number]> = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = 206 + s * (58 + 14 * wind), y = 228 + s * (70 - 20 * wind) + Math.sin(s * 4 - t * 3) * 8 * s * wind;
    top.push([x, y - (5 + 10 * s)]);
    bottom.push([x - 2, y + (5 + 10 * s)]);
  }
  const all = top.concat(bottom.reverse());
  let d = `M${f(all[0][0])} ${f(all[0][1])}`;
  for (let i = 1; i < all.length; i++) {
    const [x0, y0] = all[i - 1], [x1, y1] = all[i];
    d += ` Q${f(x0)} ${f(y0)} ${f((x0 + x1) / 2)} ${f((y0 + y1) / 2)}`;
  }
  return d + " Z";
}

const MOUTH = {
  smile: "M140 192 Q150 201 160 192",
  small: "M144 194 Q150 190 156 194 Q150 199 144 194 Z",
  flat: "M143 195 Q150 197 157 195",
};

export const RoseMascot = forwardRef<MascotHandle, Props>(function RoseMascot(
  {
    className, pose = "idle", prop = "none", mood = "happy", outfit = "abaya", extras, mirrored = false, greeting, walkIn = false,
    palm, label, ar = true, reactive = false, companion = false, muted = false, idleHabits = true,
  },
  ref,
) {
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const id = (name: string) => `${name}-${uid}`;
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const state = useRef({
    pose, prop, mood, muted, outfit, pearls: Boolean(extras?.pearls),
    shownOutfit: outfit, shownPearls: Boolean(extras?.pearls), swapAt: -10,
    action: null as Action | null, actionAt: 0, start: 0, look: [0, 0] as [number, number],
    bagUntil: 0, winkUntil: 0, surpriseUntil: 0, talkUntil: 0, thinking: false, nextHabit: 0,
  });
  const s0 = state.current;
  s0.pose = pose; s0.prop = prop; s0.mood = mood; s0.muted = muted;
  if (s0.outfit !== outfit || s0.pearls !== Boolean(extras?.pearls)) {
    // Outfit change: a little twirl, and the new clothes appear halfway through it.
    s0.outfit = outfit;
    s0.pearls = Boolean(extras?.pearls);
    s0.swapAt = typeof performance === "undefined" ? 0 : performance.now() / 1000;
  }
  const sayTimer = useRef<number>(0);

  const api = useRef<MascotHandle>(null as unknown as MascotHandle);
  if (!api.current) {
    const now = () => performance.now() / 1000;
    const act = (a: Action) => { const s = state.current; s.action = a; s.actionAt = now(); };
    const burst = (kind: "heart" | "star", n = 6) => {
      const fx = svg.current?.querySelector<SVGGElement>("[data-fx]");
      if (!fx) return;
      for (let i = 0; i < n; i++) {
        const h = document.createElementNS("http://www.w3.org/2000/svg", "path");
        h.setAttribute("d", kind === "heart" ? "M0 3 C-6 -3 -2 -9 0 -5 C2 -9 6 -3 0 3 Z" : "M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z");
        h.setAttribute("class", kind === "heart" ? (i % 2 ? "m-heart" : "m-heart m-heart-alt") : "m-star");
        const x = 150 + (Math.random() - 0.5) * 170, y0 = kind === "heart" ? 170 : 120 + Math.random() * 200;
        h.setAttribute("transform", `translate(${f(x)} ${f(y0)}) scale(${kind === "heart" ? 1.6 : 0.6})`);
        fx.appendChild(h);
        window.setTimeout(() => {
          h.setAttribute("transform", kind === "heart"
            ? `translate(${f(x + (Math.random() - 0.5) * 40)} ${f(40 + Math.random() * 30)}) scale(2.2)`
            : `translate(${f(x + (Math.random() - 0.5) * 30)} ${f(y0 - 30 - Math.random() * 30)}) scale(1.6) rotate(45)`);
          h.style.opacity = "0";
        }, 30 + i * 80);
        window.setTimeout(() => h.remove(), 1700 + i * 80);
      }
    };
    api.current = {
      say: (text, ms = 2400, kind = "react") => {
        const b = bubble.current;
        if (!b || !razanMaySpeak(kind)) return;
        b.textContent = text;
        b.dataset.show = "true";
        state.current.talkUntil = now() + Math.min(1.6, 0.4 + text.length * 0.05);
        window.clearTimeout(sayTimer.current);
        sayTimer.current = window.setTimeout(() => { delete b.dataset.show; }, ms);
      },
      wave: () => act("wave"),
      joy: () => { act("joy"); burst("heart"); },
      dance: () => { act("dance"); burst("heart", 4); burst("star", 4); },
      cheer: () => { act("cheer"); burst("star", 6); },
      wink: () => { state.current.winkUntil = now() + 0.7; },
      surprise: () => { state.current.surpriseUntil = now() + 1.1; act("hop"); },
      think: (on) => { state.current.thinking = on; },
      talk: (ms = 1400) => { state.current.talkUntil = now() + ms / 1000; },
    };
    // The twirl when the outfit changes also throws a few stars.
    (api.current as MascotHandle & { poof?: () => void }).poof = () => burst("star", 8);
  }
  useImperativeHandle(ref, () => api.current, []);

  useEffect(() => {
    const el = svg.current, box = wrap.current;
    if (!el || !box) return;
    const q = <T extends Element>(sel: string) => el.querySelector<T>(sel)!;
    const stage = q<SVGGElement>("[data-stage]"), char = q<SVGGElement>("[data-char]"), head = q<SVGGElement>("[data-head]"), body = q<SVGGElement>("[data-body]");
    const tail = q<SVGPathElement>("[data-tail]"), shadow = q<SVGEllipseElement>("[data-shadow]");
    const armL = q<SVGGElement>("[data-arm-l]"), armR = q<SVGGElement>("[data-arm-r]"), front = q<SVGGElement>("[data-front]");
    const eyes = [q<SVGGElement>("[data-eye-l]"), q<SVGGElement>("[data-eye-r]")];
    const brows = q<SVGGElement>("[data-brows]");
    const happyEyes = q<SVGGElement>("[data-eyes-happy]"), winkEye = q<SVGPathElement>("[data-eye-wink]");
    const mouth = q<SVGPathElement>("[data-mouth]"), mouthOpen = q<SVGGElement>("[data-mouth-open]"), mouthO = q<SVGEllipseElement>("[data-mouth-o]");
    const umbrella = q<SVGGElement>("[data-umbrella]"), flower = q<SVGGElement>("[data-flower]"), bag = q<SVGGElement>("[data-bag]");
    const feet = [q<SVGGElement>("[data-foot-l]"), q<SVGGElement>("[data-foot-r]")];
    const khimar = q<SVGGElement>("[data-khimar]");
    const handR = armR.querySelector<SVGCircleElement>("circle")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = state.current;
    s.start = performance.now() / 1000;
    s.nextHabit = s.start + 9 + Math.random() * 5;
    let blinkAt = s.start + 2.4;
    let frame = 0, visible = false;
    const walking = walkIn && !reduce;

    const setArm = (g: SVGGElement, sx: number, sy: number, angle: number, len: number) => {
      const a = armPath(sx, sy, angle, len);
      const paths = g.querySelectorAll("path");
      paths[0].setAttribute("d", a.d);
      paths[1].setAttribute("d", a.cuff);
      const c = g.querySelector("circle")!;
      c.setAttribute("cx", f(a.hand[0]));
      c.setAttribute("cy", f(a.hand[1]));
      return a.hand;
    };
    const showOutfit = (o: RoseOutfit, pearls: boolean) => {
      box.dataset.outfit = o;
      box.dataset.pearls = pearls ? "true" : "false";
    };
    showOutfit(s.shownOutfit, s.shownPearls);

    const draw = (nowMs: number) => {
      const now = nowMs / 1000, t = reduce ? 0 : now - s.start;

      // Arrival: drops in with a bounce, or walks in from the side.
      const walkK = walking ? clamp01(t / 1.7) : 1;
      const enter = reduce || walking ? 1 : back(t / 0.9);
      char.style.opacity = String(reduce ? 1 : Math.min(1, t / 0.3));
      const walkX = walking ? (1 - ease(walkK)) * -170 : 0;
      const stepping = walking && walkK < 1;
      const step = stepping ? Math.sin(t * 11) : 0;

      // Current action, if any.
      let act: Action | null = s.action;
      let at = act ? now - s.actionAt : 0;
      if (act && at > ACTION_LENGTH[act]) { s.action = null; act = null; at = 0; }
      // Idle habits now and then.
      if (!reduce && idleHabits && razanNow().idleHabits && !act && !s.thinking && now > s.nextHabit && visible) {
        const habits: Action[] = ["look", "adjust", "hop", "look"];
        s.action = habits[Math.floor(Math.random() * habits.length)];
        s.actionAt = now;
        s.nextHabit = now + 10 + Math.random() * 7;
      }
      const k = act ? envelope(at, ACTION_LENGTH[act]) : 0;

      // Outfit twirl: squeeze to a sliver and back, swapping clothes in the middle.
      const sw = now - s.swapAt;
      let twirl = 1;
      if (sw >= 0 && sw < 0.6) {
        twirl = Math.max(0.04, Math.abs(Math.cos((sw / 0.6) * Math.PI)));
        if (sw > 0.3 && (s.shownOutfit !== s.outfit || s.shownPearls !== s.pearls)) {
          s.shownOutfit = s.outfit; s.shownPearls = s.pearls;
          showOutfit(s.shownOutfit, s.shownPearls);
          (api.current as MascotHandle & { poof?: () => void }).poof?.();
        }
      } else if (s.shownOutfit !== s.outfit || s.shownPearls !== s.pearls) {
        s.shownOutfit = s.outfit; s.shownPearls = s.pearls;
        showOutfit(s.shownOutfit, s.shownPearls);
      }

      const bob = reduce ? 0 : stepping ? Math.abs(step) * -4 : Math.sin(t * 2.4);
      let jump = 0, squash = 1 + (stepping ? 0 : bob * 0.012), spin = 0;
      if (act === "joy" || act === "hop") {
        const len = act === "joy" ? 1.1 : 0.8, kk = at / len;
        if (kk < 1) {
          jump = -Math.sin(Math.min(1, kk * 1.25) * Math.PI) * (act === "joy" ? 46 : 22);
          squash = kk < 0.12 ? 1 - (kk / 0.12) * 0.08 : kk > 0.85 ? 1 - ((1 - kk) / 0.15) * 0.06 : 1.04;
        }
      } else if (act === "dance") {
        spin = Math.sin(at * 9) * 8 * k;
        jump = -Math.abs(Math.sin(at * 9)) * 12 * k;
      } else if (act === "cheer") {
        jump = -Math.abs(Math.sin(at * 7)) * 16 * k;
      }
      const cold = s.mood === "cold";
      const shiver = cold && !reduce ? Math.sin(now * 55) * 1.1 : 0;
      stage.setAttribute("transform", `translate(${f(walkX)} 0) translate(150 0) scale(${twirl.toFixed(3)} 1) translate(-150 0)`);
      const charT = `translate(${f(shiver)} ${f((1 - enter) * -120 + jump + bob * 1.5)}) rotate(${f(spin)} 150 400) translate(150 400) scale(${(2 - squash).toFixed(3)} ${squash.toFixed(3)}) translate(-150 -400)`;
      char.setAttribute("transform", charT);
      front.setAttribute("transform", charT);
      shadow.setAttribute("rx", f(70 + jump * 0.4 - bob * 1.5));
      feet[0].setAttribute("transform", `translate(0 ${f(stepping ? Math.min(0, step) * 6 : 0)})`);
      feet[1].setAttribute("transform", `translate(0 ${f(stepping ? Math.min(0, -step) * 6 : 0)})`);

      // Head: a gentle tilt; looks around, tilts while waving, down while thinking.
      let tilt = reduce ? 0 : Math.sin(t * 1.1) * 2.2;
      let [lx, ly] = s.look;
      if (act === "wave") tilt += 6 * k;
      if (act === "look") { lx = Math.sin(at * 2.6) * k; tilt += Math.sin(at * 2.6) * 5 * k; }
      if (act === "adjust") tilt -= 5 * k;
      if (s.thinking) { tilt += 7; lx = -0.7; ly = -1; }
      if (cold) tilt -= 4;
      head.setAttribute("transform", `rotate(${f(tilt)} 150 250)`);
      body.setAttribute("transform", `rotate(${f(reduce ? 0 : Math.sin(t * 1.1 + 0.6) * 0.8)} 150 400)`);

      // Arms.
      const swing = reduce ? 0 : stepping ? step * 14 : Math.sin(t * 2.4) * 3;
      const holding = s.pose === "hold";
      const umbrellaOn = s.prop === "umbrella";
      const flowerOn = s.prop === "flower";
      const bagOn = !holding && now < s.bagUntil;
      let lAngle = -24 - swing, lLen = 46;
      let rAngle = 24 + swing, rLen = 46;
      if (umbrellaOn) { lAngle = -150; lLen = 50; }
      else if (holding) lAngle = -36;
      if (holding) { rAngle = 100 + (reduce ? 0 : Math.sin(t * 1.6) * 3); rLen = 66; }
      else if (bagOn) { rAngle = 62 + (reduce ? 0 : Math.sin(now * 6) * 6); rLen = 50; }
      else if (flowerOn) { rAngle = 146; rLen = 44; }
      if (act === "wave") {
        rAngle += (holding ? 22 : 108) * k + Math.sin(at * 13) * 18 * k;
        rLen += holding ? 0 : 14 * k;
      } else if (act === "cheer" || act === "dance") {
        const w = act === "dance" ? Math.sin(at * 9) * 40 : Math.sin(at * 12) * 10;
        if (!umbrellaOn) lAngle = lAngle + (-150 - lAngle) * k + w * k;
        if (!holding) rAngle = rAngle + (150 - rAngle) * k - w * k;
      } else if (act === "adjust" && !umbrellaOn) {
        lAngle = lAngle + (-168 - lAngle) * k; lLen = 46 + 8 * k;
      }
      if (s.thinking && !holding && !bagOn) { rAngle = 152; rLen = 38; }
      setArm(armL, 120, 262, lAngle, lLen);
      const rHand = setArm(armR, 182, 262, rAngle, rLen);
      const lHandUp = lAngle < -100;
      const lHand = armL.querySelector("circle")!;
      // A raised hand comes in front of the hijab; a resting one stays tucked under it.
      const rFront = act === "wave" || act === "cheer" || act === "dance" || holding || flowerOn || bagOn || s.thinking;
      if (rFront && armR.parentNode !== front) front.insertBefore(armR, front.firstChild);
      if (!rFront && armR.parentNode === front) char.insertBefore(armR, khimar);
      const lFront = lHandUp && !umbrellaOn;
      if (lFront && armL.parentNode !== front) front.insertBefore(armL, front.firstChild);
      if (!lFront && armL.parentNode === front) char.insertBefore(armL, armR.parentNode === char ? armR : khimar);

      umbrella.style.display = umbrellaOn ? "" : "none";
      if (umbrellaOn) umbrella.setAttribute("transform", `translate(${lHand.getAttribute("cx")} ${lHand.getAttribute("cy")}) rotate(${f(12 + Math.sin(t * 1.4) * 2)})`);
      flower.style.display = flowerOn && !holding && !bagOn && !s.thinking ? "" : "none";
      if (flowerOn) flower.setAttribute("transform", `translate(${f(rHand[0])} ${f(rHand[1])}) rotate(${f(-20 + Math.sin(t * 2) * 4)})`);
      bag.style.display = bagOn ? "" : "none";
      if (bagOn) bag.setAttribute("transform", `translate(${f(rHand[0])} ${f(rHand[1])}) rotate(${f(Math.sin(now * 6) * 8)})`);

      tail.setAttribute("d", tailPath(t, cold ? 0.9 : act === "dance" ? 1 : 0.6 + 0.4 * Math.sin(t * 0.7)));

      // Face.
      const happy = act === "joy" || act === "cheer" || act === "dance" ? 1 : 0;
      const surprised = now < s.surpriseUntil;
      const winking = now < s.winkUntil;
      let open = 1;
      if (!reduce && now > blinkAt) {
        const b = now - blinkAt;
        open = b < 0.07 ? 1 - b / 0.07 : b < 0.14 ? (b - 0.07) / 0.07 : 1;
        if (b > 0.14) blinkAt = now + 2.5 + Math.random() * 3;
      }
      const big = surprised ? 1.15 : 1;
      eyes.forEach((e, i) => {
        const closed = happy || (winking && i === 1);
        e.setAttribute("transform", `translate(${f((i ? 174 : 126) + lx * 4)} ${f(164 + ly * 3)}) scale(${big} ${(Math.max(0.08, open) * (closed ? 0 : 1) * big).toFixed(3)})`);
      });
      happyEyes.setAttribute("opacity", String(happy));
      winkEye.setAttribute("opacity", winking && !happy ? "1" : "0");
      brows.setAttribute("transform", `translate(0 ${surprised ? -5 : s.thinking ? -2 : cold ? 2 : 0})`);
      const talking = now < s.talkUntil && !reduce;
      const flap = talking && Math.sin(now * 22) > 0;
      const mouthIsOpen = happy || act === "wave" || flap;
      mouthO.setAttribute("opacity", surprised && !happy ? "1" : "0");
      mouthOpen.setAttribute("opacity", mouthIsOpen && !surprised ? "1" : "0");
      mouth.setAttribute("opacity", mouthIsOpen || surprised ? "0" : "1");
      mouth.setAttribute("d", cold ? MOUTH.small : s.thinking ? MOUTH.flat : MOUTH.smile);
      mouth.setAttribute("class", cold ? "m-line m-mouth-fill" : "m-line");

      if (palm) {
        if (holding) {
          const r = handR.getBoundingClientRect(), me = el.getBoundingClientRect();
          const x = r.left + r.width / 2;
          // dir: which side of her the palm is on, so held things lean away from her.
          palm.current = { x, y: r.top - r.height * 0.15, dir: x >= me.left + me.width / 2 ? 1 : -1 };
        } else palm.current = null;
      }
    };

    // ~30 frames a second is plenty for a 2D character and leaves the page's 3D scenes the rest.
    let last = 0;
    const loop = (ms: number) => {
      if (ms - last >= 32) { last = ms; draw(ms); }
      if (visible && !reduce) frame = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!companion) setSceneOnScreen(uid, visible);
      cancelAnimationFrame(frame);
      if (visible) frame = requestAnimationFrame(loop);
    });
    io.observe(box);
    draw(performance.now());

    let lookHold = 0;
    // Where she stands, read at most a few times a second: reading it on every pointer
    // move (and every look while the film scrolls) made the browser lay the page out
    // again in the middle of a frame, once per Rose on the page.
    let spot: DOMRect | null = null;
    let spotAt = 0;
    const where = () => {
      const t = performance.now();
      if (!spot || t - spotAt > 250) { spot = el.getBoundingClientRect(); spotAt = t; }
      return spot;
    };
    const lookAt = (x: number, y: number) => {
      const b = where();
      const cx = b.left + b.width / 2, cy = b.top + b.height * 0.38;
      const sign = mirrored ? -1 : 1;
      s.look = [Math.max(-1, Math.min(1, ((x - cx) / 300) * sign)), Math.max(-1, Math.min(1, (y - cy) / 300))];
    };
    const onMove = (e: PointerEvent) => {
      if (!visible) return; // off screen: nobody sees where she looks
      if (performance.now() < lookHold) return; // she is watching something else just now
      lookAt(e.clientX, e.clientY);
    };
    api.current.lookAt = (x, y, holdMs = 1200) => { lookHold = performance.now() + holdMs; lookAt(x, y); };
    window.addEventListener("pointermove", onMove, { passive: true });

    // Shop moments: whichever Rose is on screen (and not stepping aside) answers.
    let lastSaid = 0;
    const answer = (kind: RoseMoment | "color-pick") => {
      if (!reactive || !visible || s.muted || !razanNow().reactions || !razanNow().enabled) return;
      const t = performance.now() / 1000;
      if (kind === "product-view" && t - lastSaid < 4) return; // never talk over a fresh reaction
      lastSaid = t;
      if (kind === "cart-add") { s.bagUntil = t + 2.6; api.current.dance(); }
      else if (kind === "wishlist-add") api.current.cheer();
      else if (kind === "color-pick") api.current.joy();
      else if (kind === "product-view") api.current.surprise();
      else { api.current.wave(); api.current.wink(); }
      api.current.say(roseLine(kind, ar), 2400);
    };
    const onMoment = (e: Event) => answer((e as CustomEvent<RoseMoment>).detail);
    const onColor = (e: Event) => { const c = e as Event & { restored?: boolean; auto?: boolean }; if (!c.restored && !c.auto) answer("color-pick"); };
    if (reactive) {
      window.addEventListener(ROSE_EVENT, onMoment);
      window.addEventListener("storefront-color-selected", onColor);
    }
    let greetTimer = 0;
    if (greeting) {
      greetTimer = window.setTimeout(() => {
        api.current.wave();
        api.current.say(greeting, 2800, "greet");
      }, reduce ? 0 : walking ? 1800 : 1100);
    }
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener(ROSE_EVENT, onMoment);
      window.removeEventListener("storefront-color-selected", onColor);
      window.clearTimeout(greetTimer);
      window.clearTimeout(sayTimer.current);
      if (!companion) setSceneOnScreen(uid, false);
      if (palm) palm.current = null;
    };
  }, [greeting, mirrored, palm, reactive, companion, ar, uid, walkIn, idleHabits]);

  const g = (name: string) => `url(#${id(name)})`;
  return (
    <div ref={wrap} className={`rose-mascot${className ? ` ${className}` : ""}`} data-mirrored={mirrored ? "true" : undefined}>
      <span ref={bubble} className="rose-mascot-bubble" aria-live="polite" />
      <svg ref={svg} viewBox="0 0 300 420" role="img" aria-label={label} onClick={() => { api.current.joy(); api.current.wink(); }}>
        <defs>
          <radialGradient id={id("cheek")} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#f08aa0" stopOpacity=".55" /><stop offset="1" stopColor="#f08aa0" stopOpacity="0" /></radialGradient>
          <radialGradient id={id("face")} cx=".45" cy=".35" r=".75">
            <stop offset="0" className="m-stop-skin-light" /><stop offset=".75" className="m-stop-skin" /><stop offset="1" className="m-stop-skin-dark" />
          </radialGradient>
          <radialGradient id={id("iris")} cx=".5" cy=".62" r=".6">
            <stop offset="0" stopColor="#8a5236" /><stop offset=".55" stopColor="#4b2618" /><stop offset="1" stopColor="#2a1219" />
          </radialGradient>
          <linearGradient id={id("dress")} x1="0" x2="1">
            <stop offset="0" className="m-stop-dress-light" /><stop offset=".6" className="m-stop-dress" /><stop offset="1" className="m-stop-dress-dark" />
          </linearGradient>
          <linearGradient id={id("frock")} x1="0" x2="1">
            <stop offset="0" className="m-stop-frock-light" /><stop offset=".6" className="m-stop-frock" /><stop offset="1" className="m-stop-frock-dark" />
          </linearGradient>
          <linearGradient id={id("coat")} x1="0" x2="1">
            <stop offset="0" className="m-stop-coat-light" /><stop offset=".6" className="m-stop-coat" /><stop offset="1" className="m-stop-coat-dark" />
          </linearGradient>
          <linearGradient id={id("hijab")} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" className="m-stop-hijab-light" /><stop offset=".55" className="m-stop-hijab" /><stop offset="1" className="m-stop-hijab-dark" />
          </linearGradient>
          <pattern id={id("flowers")} width="26" height="26" patternUnits="userSpaceOnUse">
            <g transform="translate(7 8)" className="m-print"><circle cx="0" cy="-2.6" r="2.2" /><circle cx="2.5" cy="-.8" r="2.2" /><circle cx="1.5" cy="2.2" r="2.2" /><circle cx="-1.5" cy="2.2" r="2.2" /><circle cx="-2.5" cy="-.8" r="2.2" /></g>
            <circle cx="7" cy="8" r="1.2" fill="#f2c14e" />
            <circle cx="20" cy="20" r="1.6" className="m-print" />
          </pattern>
        </defs>

        <ellipse data-shadow cx="150" cy="404" rx="70" ry="9" className="m-shadow" />

        <g data-stage>
          <g data-char>
            <path data-tail className="m-hijab-dark m-tail" />

            {/* feet (and the little trousers of the playful outfit) */}
            <g data-foot-l>
              <path className="m-o m-o-tunic m-pants" d="M124 356 L124 392 Q132 398 141 392 L142 356 Z" />
              <ellipse cx="130" cy="396" rx="15" ry="8" className="m-shoe" />
              <ellipse cx="125" cy="393" rx="5" ry="2.2" className="m-shoe-shine" />
            </g>
            <g data-foot-r>
              <path className="m-o m-o-tunic m-pants" d="M158 356 L159 392 Q168 398 176 392 L176 356 Z" />
              <ellipse cx="170" cy="396" rx="15" ry="8" className="m-shoe" />
              <ellipse cx="165" cy="393" rx="5" ry="2.2" className="m-shoe-shine" />
            </g>

            <g data-body>
              {/* abaya (also under the coat, khimar and Eid looks) */}
              <g className="m-o m-o-abaya m-o-coat m-o-khimar m-o-eid">
                <path className="m-outline" fill={g("dress")} d="M120 252 C110 290 100 340 90 388 Q120 402 150 398 Q180 402 210 388 C200 340 190 290 180 252 Z" />
                <path className="m-side-shade" d="M180 252 C190 290 200 340 210 388 Q201 393 193 394 C187 340 177 292 170 256 Z" />
                <path className="m-dress-fold" d="M138 300 C134 330 130 360 126 390" />
                <path className="m-dress-fold" d="M162 300 C166 330 170 360 174 390" />
                <path className="m-placket" d="M150 296 L150 394" />
                <path className="m-hem" d="M94 380 Q122 394 150 390 Q178 394 206 380" />
                <path className="m-belt" d="M124 300 Q150 308 176 300 L177 309 Q150 317 123 309 Z" />
                <circle cx="150" cy="306" r="5.5" className="m-belt-pin" />
              </g>
              {/* Eid: gold embroidery */}
              <g className="m-o m-o-eid">
                <path className="m-gold-line" d="M94 382 Q122 396 150 392 Q178 396 206 382" />
                <path className="m-gold-line m-thin" d="M98 370 Q124 382 150 378 Q176 382 202 370" />
                {[316, 330, 344, 358, 372].map((y) => <circle key={y} cx="150" cy={y} r="2.2" className="m-gold" />)}
                <path className="m-gold" d="M123 300 Q150 309 177 300 L177 305 Q150 314 123 305 Z" />
                <path className="m-gold" d="M238 120 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" opacity=".8" />
                <path className="m-gold" d="M58 200 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" opacity=".7" />
              </g>
              {/* dress: fitted top, full floral skirt with a scalloped hem */}
              <g className="m-o m-o-dress">
                <path className="m-outline" fill={g("frock")} d="M122 252 C120 270 124 288 128 300 L172 300 C176 288 180 270 178 252 Z" />
                <path className="m-outline" fill={g("frock")} d="M128 300 C112 330 94 362 82 390 Q100 402 116 394 Q133 404 150 396 Q167 404 184 394 Q200 402 218 390 C206 362 188 330 172 300 Z" />
                <path fill={g("flowers")} d="M128 300 C112 330 94 362 82 390 Q100 402 116 394 Q133 404 150 396 Q167 404 184 394 Q200 402 218 390 C206 362 188 330 172 300 Z" opacity=".9" />
                <path className="m-dress-fold" d="M140 310 C132 340 120 370 112 394" />
                <path className="m-dress-fold" d="M160 310 C168 340 180 370 188 394" />
                <g transform="translate(150 300)" className="m-bow">
                  <path d="M0 0 C-6 -8 -16 -8 -16 0 C-16 8 -6 8 0 0 Z" /><path d="M0 0 C6 -8 16 -8 16 0 C16 8 6 8 0 0 Z" /><circle r="3.4" />
                </g>
              </g>
              {/* winter coat over the abaya */}
              <g className="m-o m-o-coat">
                <path className="m-outline" fill={g("coat")} d="M118 252 C108 292 100 336 94 372 Q122 380 150 377 Q178 380 206 372 C200 336 192 292 182 252 Z" />
                <path className="m-coat-seam" d="M150 290 L150 376" />
                {[304, 324, 344, 362].map((y) => <circle key={y} cx="142" cy={y} r="3.2" className="m-button" />)}
                {[304, 324, 344, 362].map((y) => <circle key={`r${y}`} cx="158" cy={y} r="3.2" className="m-button" />)}
                <path className="m-coat-seam" d="M112 340 Q122 344 132 340 M168 340 Q178 344 188 340" />
                <path className="m-belt" d="M121 312 Q150 320 179 312 L180 321 Q150 329 120 321 Z" />
              </g>
              {/* playful tunic */}
              <g className="m-o m-o-tunic">
                <path className="m-outline" fill={g("frock")} d="M120 252 C112 290 104 330 100 360 Q125 370 150 366 Q175 370 200 360 C196 330 188 290 180 252 Z" />
                <path fill={g("flowers")} d="M120 252 C112 290 104 330 100 360 Q125 370 150 366 Q175 370 200 360 C196 330 188 290 180 252 Z" opacity=".75" />
                <path className="m-ruffle" d="M100 360 Q108 370 116 362 Q124 372 133 364 Q141 373 150 366 Q159 373 167 364 Q176 372 184 362 Q192 370 200 360" />
              </g>
            </g>

            <g data-arm-l><path className="m-sleeve m-outline" /><path className="m-cuff" /><circle className="m-skin m-outline" r="10" /></g>
            <g data-arm-r><path className="m-sleeve m-outline" /><path className="m-cuff" /><circle className="m-skin m-outline" r="10" /></g>

            {/* the long khimar falls over the arms */}
            <g data-khimar className="m-o m-o-khimar">
              <path className="m-outline" fill={g("hijab")} d="M98 242 C88 270 88 300 96 330 Q110 342 123 336 Q136 348 150 342 Q164 348 177 336 Q190 342 204 330 C212 300 212 270 202 242 Z" />
              <path className="m-hijab-fold" d="M122 292 C119 308 118 322 121 336 M178 292 C181 308 182 322 179 336 M150 300 L150 340" />
            </g>

            <g data-head>
              <path className="m-outline" fill={g("hijab")} d="M150 52 C206 52 236 92 236 146 C236 186 222 214 204 230 C222 240 230 256 226 270 C206 284 178 290 150 290 C122 290 94 284 74 270 C70 256 78 240 96 230 C78 214 64 186 64 146 C64 92 94 52 150 52 Z" />
              <path className="m-hijab-shadow" d="M100 228 Q150 256 200 228 Q150 244 100 228 Z" />
              <ellipse cx="150" cy="160" rx="56" ry="58" fill={g("face")} />
              {/* the hijab band framing her face, with a lighter underscarf */}
              <path className="m-outline" fill={g("hijab")} fillRule="evenodd" d="M150 60 C200 60 228 96 228 146 C228 190 206 226 150 232 C94 226 72 190 72 146 C72 96 100 60 150 60 Z M150 104 C184 104 204 128 204 160 C204 196 180 218 150 218 C120 218 96 196 96 160 C96 128 116 104 150 104 Z" />
              <path className="m-underscarf" d="M98 140 C108 116 128 106 150 106 C172 106 192 116 202 140 C190 124 170 116 150 116 C130 116 110 124 98 140 Z" />
              <path className="m-hijab-shine" d="M92 112 C100 88 122 72 150 68" />
              <path className="m-hijab-fold" d="M98 120 C112 96 132 86 150 86 C168 86 188 96 202 120" />
              <path className="m-hijab-fold" d="M90 196 C104 222 126 236 150 238" />
              <g transform="translate(205 132)" className="m-pin-flower">
                <g className="m-pin"><circle cx="0" cy="-6" r="4.6" /><circle cx="5.7" cy="-1.9" r="4.6" /><circle cx="3.5" cy="4.9" r="4.6" /><circle cx="-3.5" cy="4.9" r="4.6" /><circle cx="-5.7" cy="-1.9" r="4.6" /></g>
                <circle r="3.4" fill="#f2c14e" />
              </g>
              <g transform="translate(206 128)" className="m-o m-o-tunic m-bow">
                <path d="M0 0 C-7 -10 -18 -9 -18 0 C-18 9 -7 10 0 0 Z" /><path d="M0 0 C7 -10 18 -9 18 0 C18 9 7 10 0 0 Z" /><circle r="4" />
              </g>

              <g data-brows>
                <path className="m-line m-brow" d="M114 140 Q124 134 134 139" />
                <path className="m-line m-brow" d="M166 139 Q176 134 186 140" />
              </g>
              <g data-eye-l transform="translate(126 164)">
                <ellipse rx="9.5" ry="12" fill={g("iris")} />
                <path className="m-lid" d="M-10.5 -4 C-8 -12.5 8 -12.5 10.5 -4" />
                <circle cx="3" cy="-4" r="3.6" fill="#fff" /><circle cx="-3" cy="4" r="1.6" fill="#fff" opacity=".85" />
                <path className="m-line m-lash" d="M-10 -6 L-15 -10 M-7 -10 L-10 -14" />
              </g>
              <g data-eye-r transform="translate(174 164)">
                <ellipse rx="9.5" ry="12" fill={g("iris")} />
                <path className="m-lid" d="M-10.5 -4 C-8 -12.5 8 -12.5 10.5 -4" />
                <circle cx="3" cy="-4" r="3.6" fill="#fff" /><circle cx="-3" cy="4" r="1.6" fill="#fff" opacity=".85" />
                <path className="m-line m-lash" d="M10 -6 L15 -10 M7 -10 L10 -14" />
              </g>
              <g data-eyes-happy opacity="0">
                <path className="m-line m-thick" d="M116 166 Q126 156 136 166" />
                <path className="m-line m-thick" d="M164 166 Q174 156 184 166" />
              </g>
              <path data-eye-wink className="m-line m-thick" d="M164 164 Q174 158 184 164" opacity="0" />
              <path className="m-nose" d="M147 181 Q150 184 153 181" />
              <ellipse cx="112" cy="186" rx="14" ry="9" fill={g("cheek")} />
              <ellipse cx="188" cy="186" rx="14" ry="9" fill={g("cheek")} />
              <path data-mouth className="m-line" d={MOUTH.smile} />
              <g data-mouth-open opacity="0">
                <path d="M139 190 Q150 208 161 190 Q150 194 139 190 Z" className="m-mouth-fill" />
                <path d="M144 200 Q150 204 156 200 Q150 197 144 200 Z" className="m-tongue" />
              </g>
              <ellipse data-mouth-o cx="150" cy="196" rx="5" ry="6.5" className="m-mouth-fill" opacity="0" />
            </g>

            {/* pearl necklace over the drape (accessories) */}
            <g className="m-pearls">
              {Array.from({ length: 11 }, (_, i) => {
                const a = Math.PI * (0.18 + (i / 10) * 0.64);
                return <circle key={i} cx={f(150 - Math.cos(a) * 46)} cy={f(258 + Math.sin(a) * 24)} r="4.2" className="m-pearl" />;
              })}
            </g>

            <g data-umbrella style={{ display: "none" }}>
              <path d="M0 0 C0 6 -8 8 -9 2" className="m-umbrella-handle" />
              <line x1="0" y1="0" x2="20" y2="-196" className="m-umbrella-handle" />
              <g transform="translate(20 -196) rotate(6)">
                <path d="M-118 26 C-110 -40 -40 -70 0 -70 C40 -70 110 -40 118 26 Q99 12 79 26 Q59 12 39 26 Q19 12 0 26 Q-19 12 -39 26 Q-59 12 -79 26 Q-99 12 -118 26 Z" className="m-umbrella" />
                <path d="M-39 26 C-36 -20 -18 -60 0 -70 M39 26 C36 -20 18 -60 0 -70 M0 26 L0 -70" className="m-umbrella-rib" />
                <circle cx="0" cy="-72" r="4" className="m-hijab-dark" />
              </g>
            </g>
          </g>

          <g data-front>
            <g data-flower style={{ display: "none" }}>
              <path d="M0 0 C-2 -14 2 -26 0 -40" className="m-stem" />
              <path d="M0 -20 C8 -24 14 -20 14 -14 C8 -14 4 -16 0 -20 Z" className="m-leaf" />
              <g transform="translate(0 -46)">
                <circle cx="0" cy="-8" r="7" className="m-petal" /><circle cx="7.6" cy="-2.5" r="7" className="m-petal" /><circle cx="4.7" cy="6.5" r="7" className="m-petal" />
                <circle cx="-4.7" cy="6.5" r="7" className="m-petal" /><circle cx="-7.6" cy="-2.5" r="7" className="m-petal" />
                <circle r="4.6" fill="#f2c14e" />
              </g>
            </g>
            <g data-bag style={{ display: "none" }}>
              <path d="M-9 4 C-9 -10 9 -10 9 4" className="m-bag-handle" />
              <path d="M-17 2 L17 2 L20 40 L-20 40 Z" className="m-bag" />
              <g transform="translate(0 21)">
                <circle cx="0" cy="-4.5" r="3.6" className="m-bag-flower" /><circle cx="4.3" cy="-1.4" r="3.6" className="m-bag-flower" /><circle cx="2.7" cy="3.7" r="3.6" className="m-bag-flower" />
                <circle cx="-2.7" cy="3.7" r="3.6" className="m-bag-flower" /><circle cx="-4.3" cy="-1.4" r="3.6" className="m-bag-flower" /><circle r="2.4" fill="#f2c14e" />
              </g>
            </g>
          </g>
        </g>
        <g data-fx />
      </svg>
    </div>
  );
});
