"use client";
/**
 * Triggers (pageTree/pieces.ts triggersOf, written by TreeNodeView into data-pt-triggers): when
 * something happens to an element — a click, a double click, the mouse coming or going, coming
 * into or out of sight, the page opening, the page scrolled past a point, a time on the page —
 * its actions run one after another (`wait` pauses between them): play keyframes or a short move
 * on any element, show or hide one, scroll to one or to a scroll scene's moment, open a link or a
 * popup, play or pause a clip, burst confetti, copy a code, say something, make a sound, buzz.
 *
 * They are recipes: when → if → do, else. Its conditions (a variable, how many times it ran, the
 * device, the time of day, the language) must all hold for its steps to run, else its `else` steps
 * run. A step can be a group (several at once, repeated, one at random), a wait until a variable
 * holds, or a change to a variable (recipeVars.ts: kept for the visit, shown in texts by {{name}}).
 *
 * Whoever asked for less motion still gets every action except the moves and bursts. In the
 * editor's frame nothing runs by itself (clicks there select); the editor tests a trigger.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { ConditionSpec, StepSpec, TriggerActionSpec, TriggerSpec, VarValue } from "./pieces";
import { keyPlayers } from "./motionPlayers";
import { sceneScrollTop } from "./TreeScenes";
import { studioLink } from "./studioLink";
import { burst, playMove, sound, toast } from "./triggerEffects";
import { changeVar, compareVar, fillVars, getVar, showVars, VARS_EVENT } from "./recipeVars";
import { useStudioViewRevision } from "./useStudioViewRevision";

const sleep = (s: number) => new Promise<void>((r) => window.setTimeout(r, s * 1000));

function targetOf(self: HTMLElement, id: string): HTMLElement | null {
  if (id === "self") return self;
  return document.querySelector<HTMLElement>(`[data-tree-node="${id}"]`);
}

/** Shown or hidden for this visit; what the page hid itself comes back as a block. */
function setVisible(el: HTMLElement, value: "show" | "hide" | "toggle", reduced: boolean) {
  const hiddenNow = el.hidden || getComputedStyle(el).display === "none";
  const hide = value === "hide" || (value === "toggle" && !hiddenNow);
  if (hide) {
    el.style.setProperty("display", "none", "important");
    return;
  }
  el.hidden = false;
  el.style.removeProperty("display");
  if (getComputedStyle(el).display === "none") el.style.setProperty("display", el.matches("span,a,i,b") ? "inline-block" : "block", "important");
  if (!reduced && el.animate) el.animate([{ opacity: 0, translate: "0 10px" }, { opacity: 1, translate: "0 0" }], { duration: 320, easing: "ease-out" });
}

type Run = { self: HTMLElement; reduced: boolean; point?: { x: number; y: number }; alive: () => boolean };

/** One action. */
async function act(a: TriggerActionSpec, { self, reduced, point }: Run) {
  {
    const at = () => {
      if (point) return point;
      const r = self.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    switch (a.act) {
      case "wait":
        await sleep(a.seconds);
        break;
      case "play": {
        const el = targetOf(self, a.target);
        if (!el) break;
        if (a.what === "keys") {
          const p = keyPlayers.get(el);
          if (!p) break;
          if (a.mode === "reverse") p.reverse();
          else if (a.mode === "toggle") p.toggle();
          else if (a.mode === "restart") p.restart();
          else p.play();
        } else if (!reduced) playMove(el, a.what);
        break;
      }
      case "visible": {
        const el = targetOf(self, a.target);
        if (el) setVisible(el, a.value, reduced);
        break;
      }
      case "scrollTo": {
        const el = targetOf(self, a.target);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - a.offset, behavior: reduced ? "instant" as ScrollBehavior : "smooth" });
        break;
      }
      case "scene": {
        const el = targetOf(self, a.target);
        const scene = el?.matches("[data-pt-scroll-scene]") ? el : el?.querySelector("[data-pt-scroll-scene]");
        if (scene) window.scrollTo({ top: sceneScrollTop(scene, a.at), behavior: reduced ? "instant" as ScrollBehavior : "smooth" });
        break;
      }
      case "link":
        if (a.newTab) window.open(a.href, "_blank", "noopener,noreferrer");
        else window.location.assign(a.href);
        break;
      case "popup":
        window.dispatchEvent(new CustomEvent("pt:popup", { detail: { id: a.target === "self" ? self.dataset.treeNode : a.target, open: a.value === "open" } }));
        break;
      case "video": {
        const el = targetOf(self, a.target);
        const v = el instanceof HTMLVideoElement ? el : el?.querySelector("video");
        if (!v) break;
        if (a.value === "mute" || a.value === "unmute") v.muted = a.value === "mute";
        else if (a.value === "pause" || (a.value === "toggle" && !v.paused)) v.pause();
        else {
          if (a.value === "restart") v.currentTime = 0;
          void v.play().catch(() => {});
        }
        break;
      }
      case "burst":
        if (!reduced) burst(a.kind, at(), a.amount, a.color ? colourOf(self, a.color) : undefined);
        break;
      case "copy": {
        const text = fillVars(a.text);
        try {
          await navigator.clipboard.writeText(text);
          if (a.note) toast(fillVars(a.note));
        } catch {
          toast(text);
        }
        break;
      }
      case "toast":
        toast(fillVars(a.text));
        break;
      case "sound":
        sound(a.kind, a.volume);
        break;
      case "vibrate":
        navigator.vibrate?.(35);
        break;
    }
  }
}

/** Waits until a variable holds (or `seconds` pass). */
function until(name: string, cmp: string, value: VarValue | undefined, seconds: number, run: Run) {
  return new Promise<void>((done) => {
    if (compareVar(getVar(name), cmp, value)) return done();
    let timer = 0;
    const finish = () => {
      window.clearTimeout(timer);
      window.removeEventListener(VARS_EVENT, check);
      done();
    };
    const check = () => {
      if (!run.alive() || compareVar(getVar(name), cmp, value)) finish();
    };
    timer = window.setTimeout(finish, seconds * 1000);
    window.addEventListener(VARS_EVENT, check);
  });
}

/** Steps one after another; a group's own steps at once, again and again, or one of them. */
async function steps(list: StepSpec[], run: Run): Promise<void> {
  for (const s of list) {
    if (!run.alive()) return;
    switch (s.act) {
      case "together":
        await Promise.all(s.do.map((x) => steps([x], run)));
        break;
      case "repeat":
        for (let i = 0; i < s.times && run.alive(); i++) await steps(s.do, run);
        break;
      case "random":
        await steps([s.do[Math.floor(Math.random() * s.do.length)]], run);
        break;
      case "set":
        changeVar(s.name, s.op, s.value);
        break;
      case "waitUntil":
        await until(s.name, s.cmp, s.value, s.seconds, run);
        break;
      default:
        await act(s, run);
    }
  }
}

/** Phone, tablet or computer, by the screen's width. */
const device = () => (window.innerWidth < 768 ? "phone" : window.innerWidth < 1100 ? "tablet" : "desktop");

/** Whether a condition holds now (`count`: how many times this recipe ran, with this one). */
function holds(c: ConditionSpec, count: number, self: HTMLElement): boolean {
  switch (c.if) {
    case "var":
      return compareVar(getVar(c.name), c.cmp, c.value);
    case "count":
      return c.cmp === "eq" ? count === c.value : c.cmp === "gte" ? count >= c.value : c.cmp === "lte" ? count <= c.value : count % c.value === 0;
    case "device":
      return device() === c.value;
    case "time": {
      const h = new Date().getHours();
      return c.from <= c.to ? h >= c.from && h <= c.to : h >= c.from || h <= c.to;
    }
    case "lang":
      return (self.closest("[lang]")?.getAttribute("lang") || document.documentElement.lang || "").slice(0, 2) === c.value;
  }
}

/** A recipe: its steps when all its conditions hold, else its `else` steps. */
function runRecipe(t: TriggerSpec, count: number, run: Run) {
  const ok = t.if.every((c) => holds(c, count, run.self));
  return steps(ok ? t.do : t.else, run);
}

const TOKEN_VAR: Record<string, string> = { text: "--text", muted: "--muted", accent: "--accent", "accent-soft": "--accent-soft", "accent-contrast": "--accent-contrast", bg: "--bg", surface: "--surface", border: "--border" };
function colourOf(el: Element, c: string): string {
  if (c === "white") return "#ffffff";
  if (c === "black") return "#000000";
  const name = TOKEN_VAR[c];
  return name ? getComputedStyle(el).getPropertyValue(name).trim() || "#888888" : c;
}

export function TreeTriggers({ revision = 0 }: { revision?: number }) {
  const pathname = usePathname();
  const viewRevision = useStudioViewRevision("[data-pt-triggers]", ["data-pt-triggers"], `${pathname}:${revision}`);
  useEffect(() => {
    const studio = window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offs: Array<() => void> = [];
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-pt-triggers]"));
    const listOf = (el: HTMLElement): TriggerSpec[] => {
      try {
        const v = JSON.parse(el.dataset.ptTriggers ?? "[]");
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    };
    let live = true;
    const alive = () => live;
    offs.push(() => { live = false; });
    // Texts showing variables show what this visit set (TreeNodeView drew what to show before).
    showVars();
    // The editor tests one trigger (its number on the element) in the frame, its conditions too.
    const tried = new Map<string, number>();
    offs.push(studioLink.listen((msg) => {
      if (msg.type !== "motionTriggerTest" || typeof msg.nodeId !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(msg.nodeId)) return;
      const el = document.querySelector<HTMLElement>(`[data-tree-node="${msg.nodeId}"]`);
      const index = Number(msg.index) || 0;
      const t = el ? listOf(el)[index] : undefined;
      const key = `${msg.nodeId}:${index}`;
      tried.set(key, (tried.get(key) ?? 0) + 1);
      if (el && t) void runRecipe(t, tried.get(key)!, { self: el, reduced: reduced(), alive });
    }));
    if (!studio) {
      for (const el of els) {
        listOf(el).forEach((t) => {
          let spent = false;
          let count = 0;
          const fire = (point?: { x: number; y: number }) => {
            if (spent) return;
            if (t.once) spent = true;
            void runRecipe(t, ++count, { self: el, reduced: reduced(), point, alive });
          };
          const on = (type: string, fn: (e: Event) => void, target: EventTarget = el) => {
            target.addEventListener(type, fn, { passive: type !== "click" && type !== "dblclick" });
            offs.push(() => target.removeEventListener(type, fn));
          };
          switch (t.on) {
            case "click":
            case "dblclick":
              on(t.on, (e) => {
                // A link to nowhere ("#") stays here; a real one still goes (unless the trigger opens it itself).
                const a = (e.target as Element | null)?.closest?.("a[href]");
                if (a && (a.getAttribute("href") === "#" || [...t.do, ...t.else].some((x) => x.act === "link" || x.act === "wait" || x.act === "waitUntil" || x.act === "together" || x.act === "repeat" || x.act === "random"))) e.preventDefault();
                const m = e as MouseEvent;
                fire(m.clientX || m.clientY ? { x: m.clientX, y: m.clientY } : undefined);
              });
              break;
            case "hover":
              on("pointerenter", () => fire());
              break;
            case "leave":
              on("pointerleave", () => fire());
              break;
            case "view":
            case "leaveView": {
              let seen = false;
              const io = new IntersectionObserver(([e]) => {
                if (t.on === "view" && e.isIntersecting && !seen) fire();
                if (t.on === "leaveView" && !e.isIntersecting && seen) fire();
                seen = e.isIntersecting;
              }, { threshold: 0.35 });
              io.observe(el);
              offs.push(() => io.disconnect());
              break;
            }
            case "load": {
              const timer = window.setTimeout(() => fire(), (t.at ?? 0) * 1000);
              offs.push(() => window.clearTimeout(timer));
              break;
            }
            case "timer": {
              const timer = window.setTimeout(() => fire(), (t.at ?? 5) * 1000);
              offs.push(() => window.clearTimeout(timer));
              break;
            }
            case "scrolled": {
              let past = false;
              const check = () => {
                const most = document.documentElement.scrollHeight - window.innerHeight;
                const now = most > 0 && (window.scrollY / most) * 100 >= (t.at ?? 50);
                if (now && !past) fire();
                past = now;
              };
              on("scroll", check, window);
              check();
              break;
            }
          }
        });
      }
    }
    return () => offs.forEach((f) => f());
  }, [pathname, revision, viewRevision]);
  return null;
}
