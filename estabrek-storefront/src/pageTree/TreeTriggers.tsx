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
import { ask, burst, playMove, sound, toast } from "./triggerEffects";
import { changeVar, compareVar, fillVars, getVar, showVars, VARS_EVENT } from "./recipeVars";
import { getHands, mayRun, signedIn, wantHands, whenHands, WHO_EVENT } from "./recipeHands";
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

/**
 * `tryout`: the owner trying it from the editor (the preview takes no presses and mustn't leave its page): a
 * question answers itself, the bag and the wishlist aren't touched, and what would leave the page is only said.
 * With `fail`, the steps that can fail do.
 */
type Run = { self: HTMLElement; reduced: boolean; point?: { x: number; y: number }; alive: () => boolean; tryout?: { fail: boolean } };

/** A step failed (a "no" to a question, a product that can't be bought): the recipe's `fail` steps run instead of the rest. */
const FAIL = Symbol("fail");
/** The recipe ends here quietly (the product's quick view opened to choose: the rest isn't true yet). */
const STOP = Symbol("stop");
const langOf = (el: Element) => (el.closest("[lang]")?.getAttribute("lang") || document.documentElement.lang || "ar").slice(0, 2);
const YES_NO: Record<string, [string, string]> = { ar: ["نعم", "لا"], he: ["כן", "לא"], en: ["Yes", "No"] };
/** What a step would do in the shop, said instead of done when it's tried in the editor. */
const IN_SHOP: Record<string, Record<string, string>> = {
  link: { ar: "بالمتجر: بينفتح الرابط", he: "בחנות: הקישור נפתח", en: "In the shop: the link opens" },
  back: { ar: "بالمتجر: بيرجع للصفحة اللي قبل", he: "בחנות: חוזרים לעמוד הקודם", en: "In the shop: goes back a page" },
  share: { ar: "بالمتجر: بتنفتح المشاركة", he: "בחנות: נפתח שיתוף", en: "In the shop: sharing opens" },
  call: { ar: "بالمتجر: بيبلّش اتصال", he: "בחנות: מתחילה שיחה", en: "In the shop: a call starts" },
  whatsapp: { ar: "بالمتجر: بينفتح واتساب", he: "בחנות: נפתח וואטסאפ", en: "In the shop: WhatsApp opens" },
  download: { ar: "بالمتجر: الملف بينزل", he: "בחנות: הקובץ יורד", en: "In the shop: the file downloads" },
  bag: { ar: "بالمتجر: المنتج بينحط بالسلة", he: "בחנות: המוצר נכנס לסל", en: "In the shop: the product goes into the bag" },
  wish: { ar: "بالمتجر: المنتج بينحفظ بالمفضلة", he: "בחנות: המוצר נשמר במועדפים", en: "In the shop: the product is saved to the wishlist" },
};

/** One action. */
async function act(a: TriggerActionSpec, { self, reduced, point, tryout }: Run) {
  if (tryout && IN_SHOP[a.act]) {
    if (tryout.fail && (a.act === "bag" || a.act === "wish")) throw FAIL;
    const lang = langOf(self);
    toast((IN_SHOP[a.act][lang] ?? IN_SHOP[a.act].en));
    return;
  }
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
      case "back":
        if (window.history.length > 1) window.history.back();
        break;
      case "share": {
        const url = new URL(a.href || window.location.href, window.location.href).href;
        try {
          if (navigator.share) await navigator.share({ title: fillVars(a.title) || document.title, url });
          else {
            await navigator.clipboard.writeText(url);
            toast(url);
          }
        } catch {
          /* closed without sharing: nothing more */
        }
        break;
      }
      case "call": {
        // Its own number as written; none = the store's own.
        const own = a.phone.replace(/[^0-9+]/g, "");
        const store = own ? "" : (await whenHands())?.phone() ?? "";
        if (own || store) window.location.assign(`tel:${own || `+${store}`}`);
        break;
      }
      case "whatsapp": {
        const hands = await whenHands();
        const digits = a.phone.replace(/[^0-9]/g, "");
        // Its own number goes as written (with its country); the store's own comes from the shop.
        const url = hands?.whatsapp(a.phone, fillVars(a.text)) ?? (digits ? `https://wa.me/${digits}${a.text ? `?text=${encodeURIComponent(fillVars(a.text))}` : ""}` : null);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        break;
      }
      case "download": {
        const link = document.createElement("a");
        link.href = a.href;
        link.download = a.name || "";
        link.rel = "noopener";
        // A file on another site can't be forced to download: it opens beside the page, not instead of it.
        if (new URL(a.href, window.location.href).origin !== window.location.origin) link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        link.remove();
        break;
      }
      case "bag": {
        const hands = await whenHands();
        const done = hands ? await hands.bag(a.productId, a.quantity, self) : "fail";
        if (done === "fail") throw FAIL;
        if (done === "choose") throw STOP;
        break;
      }
      case "wish": {
        const hands = await whenHands();
        if (!hands || !(await hands.wish(a.productId, a.value))) throw FAIL;
        break;
      }
      case "confirm": {
        const lang = langOf(self);
        const [yes, no] = YES_NO[lang] ?? YES_NO.en;
        if (!(await ask(fillVars(a.text), a.yes || yes, a.no || no, lang === "ar" || lang === "he", tryout ? !tryout.fail : undefined, self))) throw FAIL;
        break;
      }
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
      return langOf(self) === c.value;
    case "signedIn":
      return signedIn() === c.value;
    case "bag": {
      const n = getHands()?.bagCount() ?? 0;
      return c.cmp === "eq" ? n === c.value : c.cmp === "gte" ? n >= c.value : n <= c.value;
    }
  }
}

/**
 * A recipe: its steps when all its conditions hold, else its `else` steps. A step that fails ends them and runs
 * its `fail` steps (which can't fail in turn).
 */
async function runRecipe(t: TriggerSpec, count: number, run: Run) {
  // A condition on the bag waits for the shop's hands (they may still be loading right after the page opens).
  if (t.if.some((c) => c.if === "bag")) await whenHands();
  const ok = t.if.every((c) => holds(c, count, run.self));
  try {
    await steps(ok ? t.do : t.else, run);
  } catch (why) {
    if (why === FAIL) await steps(t.fail ?? [], run).catch(() => {});
    else if (why !== STOP) throw why;
  }
}

/** Someone a recipe isn't for pressed it: sent to sign in, or told why (the hidden kind never gets here). */
function turnedAway(t: TriggerSpec) {
  if (t.deny === "signin" && t.signin) window.location.assign(t.signin);
  else if (t.note) toast(t.note);
}

/** How many recipes are running on an element (it shows as busy while one takes a moment). */
const running = new WeakMap<HTMLElement, number>();

/** The events that are someone pressing the element. */
const PRESSES = new Set<string>(["click", "dblclick", "longpress"]);
/** How long a press is held to be a long press. */
export const LONG_PRESS_MS = 550;
/** Steps after which the element's own link mustn't take the shopper away at once (the recipe goes on, or goes somewhere itself). */
const STAYS = new Set<string>(["link", "back", "wait", "waitUntil", "together", "repeat", "random", "confirm", "bag", "wish", "share", "whatsapp", "call", "download"]);

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
    // Recipes that reach for the bag, the wishlist or WhatsApp: the shop loads its hands for them.
    if (els.length) wantHands();
    // "Who may": the page knows who's signed in (the hidden kind is CSS, off html[data-pt-in]); a locked one says so.
    const who = () => {
      document.documentElement.toggleAttribute("data-pt-in", signedIn());
      for (const el of els) {
        const locked = !studio && listOf(el).some((t) => t.who && t.deny === "lock" && !mayRun(t.who));
        if (locked) el.setAttribute("data-pt-denied", "lock");
        else el.removeAttribute("data-pt-denied");
      }
    };
    who();
    window.addEventListener(WHO_EVENT, who);
    offs.push(() => window.removeEventListener(WHO_EVENT, who));
    // The recipes are listening from here on (tests wait for this).
    document.documentElement.setAttribute("data-pt-recipes", "");
    offs.push(() => document.documentElement.removeAttribute("data-pt-recipes"));
    // The editor tests one trigger (its number on the element) in the frame, its conditions too.
    const tried = new Map<string, number>();
    offs.push(studioLink.listen((msg) => {
      if (msg.type !== "motionTriggerTest" || typeof msg.nodeId !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(msg.nodeId)) return;
      const el = document.querySelector<HTMLElement>(`[data-tree-node="${msg.nodeId}"]`);
      const index = Number(msg.index) || 0;
      const t = el ? listOf(el)[index] : undefined;
      const key = `${msg.nodeId}:${index}`;
      tried.set(key, (tried.get(key) ?? 0) + 1);
      // The owner tries it whoever it is for; `fail` tries what happens when a step fails.
      if (el && t) void runRecipe(t, tried.get(key)!, { self: el, reduced: reduced(), alive, tryout: { fail: msg.fail === true } }).catch(() => {});
    }));
    if (!studio) {
      for (const el of els) {
        listOf(el).forEach((t) => {
          let spent = false;
          let count = 0;
          let busy = false;
          const fire = (point?: { x: number; y: number }) => {
            // Once is once; and it never runs over itself (a second press while it's still going does nothing).
            if (spent || busy) return;
            // Not for this shopper: a press says so (or sends them to sign in); the mouse passing by says nothing.
            if (!mayRun(t.who)) return PRESSES.has(t.on) ? turnedAway(t) : undefined;
            if (t.once) spent = true;
            busy = true;
            running.set(el, (running.get(el) ?? 0) + 1);
            // Busy shows only when it takes a moment (a wait, a question, the bag).
            const mark = window.setTimeout(() => { el.setAttribute("data-pt-busy", ""); el.setAttribute("aria-busy", "true"); }, 180);
            void runRecipe(t, ++count, { self: el, reduced: reduced(), point, alive }).catch(() => {}).finally(() => {
              busy = false;
              window.clearTimeout(mark);
              const left = (running.get(el) ?? 1) - 1;
              running.set(el, left);
              if (left <= 0) { el.removeAttribute("data-pt-busy"); el.removeAttribute("aria-busy"); }
            });
          };
          const on = (type: string, fn: (e: Event) => void, target: EventTarget = el) => {
            target.addEventListener(type, fn, { passive: type !== "click" && type !== "dblclick" && type !== "contextmenu" });
            offs.push(() => target.removeEventListener(type, fn));
          };
          switch (t.on) {
            case "click":
            case "dblclick":
              on(t.on, (e) => {
                // A link to nowhere ("#") stays here; a real one still goes (unless the trigger opens it itself).
                const a = (e.target as Element | null)?.closest?.("a[href]");
                if (a && (a.getAttribute("href") === "#" || [...t.do, ...t.else].some((x) => STAYS.has(x.act)) || !mayRun(t.who))) e.preventDefault();
                const m = e as MouseEvent;
                fire(m.clientX || m.clientY ? { x: m.clientX, y: m.clientY } : undefined);
              });
              break;
            case "longpress": {
              // Held still for a moment (a finger or the mouse); the click that ends it does nothing else.
              let timer = 0;
              let held = false;
              let from: { x: number; y: number } | null = null;
              const cancel = () => { window.clearTimeout(timer); timer = 0; };
              on("pointerdown", (e) => {
                const p = e as PointerEvent;
                if (p.button) return;
                cancel();
                held = false;
                from = { x: p.clientX, y: p.clientY };
                timer = window.setTimeout(() => { timer = 0; held = true; fire(from ?? undefined); }, LONG_PRESS_MS);
              });
              on("pointermove", (e) => {
                const p = e as PointerEvent;
                if (timer && from && Math.hypot(p.clientX - from.x, p.clientY - from.y) > 10) cancel();
              });
              on("pointerup", cancel);
              on("pointerleave", cancel);
              on("pointercancel", cancel);
              on("contextmenu", (e) => { if (timer || held) e.preventDefault(); });
              on("click", (e) => { if (held) { held = false; e.preventDefault(); } });
              offs.push(cancel);
              break;
            }
            case "key": {
              on("keydown", (e) => {
                const k = e as KeyboardEvent;
                if (k.repeat || k.ctrlKey || k.metaKey || k.altKey) return;
                // Typing in a field is typing.
                const field = k.target instanceof HTMLElement ? k.target : null;
                if (field && (field.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(field.tagName))) return;
                if ((k.key === " " ? "Space" : k.key.length === 1 ? k.key.toLowerCase() : k.key) === t.key) fire();
              }, window);
              break;
            }
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
