"use client";
/**
 * Triggers (pageTree/pieces.ts triggersOf, written by TreeNodeView into data-pt-triggers): when
 * something happens to an element — a click, a double click, the mouse coming or going, coming
 * into or out of sight, the page opening, the page scrolled past a point, a time on the page —
 * its actions run one after another (`wait` pauses between them): play keyframes or a short move
 * on any element, show or hide one, scroll to one or to a scroll scene's moment, open a link or a
 * popup, play or pause a clip, burst confetti, copy a code, say something, make a sound, buzz.
 *
 * Whoever asked for less motion still gets every action except the moves and bursts. In the
 * editor's frame nothing runs by itself (clicks there select); the editor tests a trigger.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { TriggerActionSpec, TriggerSpec } from "./pieces";
import { keyPlayers } from "./motionPlayers";
import { sceneScrollTop } from "./TreeScenes";
import { studioLink } from "./studioLink";
import { burst, playMove, sound, toast } from "./triggerEffects";
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

async function run(actions: TriggerActionSpec[], self: HTMLElement, reduced: boolean, point?: { x: number; y: number }) {
  for (const a of actions) {
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
      case "copy":
        try {
          await navigator.clipboard.writeText(a.text);
          if (a.note) toast(a.note);
        } catch {
          toast(a.text);
        }
        break;
      case "toast":
        toast(a.text);
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
    // The editor tests one trigger (its number on the element) in the frame.
    offs.push(studioLink.listen((msg) => {
      if (msg.type !== "motionTriggerTest" || typeof msg.nodeId !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(msg.nodeId)) return;
      const el = document.querySelector<HTMLElement>(`[data-tree-node="${msg.nodeId}"]`);
      const t = el ? listOf(el)[Number(msg.index) || 0] : undefined;
      if (el && t) void run(t.do, el, reduced());
    }));
    if (!studio) {
      for (const el of els) {
        listOf(el).forEach((t) => {
          let spent = false;
          const fire = (point?: { x: number; y: number }) => {
            if (spent) return;
            if (t.once) spent = true;
            void run(t.do, el, reduced(), point);
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
                if (a && (a.getAttribute("href") === "#" || t.do.some((x) => x.act === "link" || x.act === "wait"))) e.preventDefault();
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
