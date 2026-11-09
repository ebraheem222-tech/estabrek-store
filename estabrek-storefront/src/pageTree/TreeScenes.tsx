"use client";
/**
 * Scroll scenes (pageTree/pieces.ts scrollSceneOf, drawn by TreeNodeView): a clip that plays as the
 * page scrolls, or a picture held still, with what they hold coming and going at their moments.
 *
 * Each scene runs a small game loop, only while it's near the screen and something still has to
 * move (a scroll wakes it, it sleeps once settled):
 * - the scroll gives a target, 0–1 through the scene (pin: while its stage is held; flow: while
 *   what it holds passes over it);
 * - the moment shown eases toward it by the frame's own time (dt, so 60, 120 and 144 Hz screens
 *   move alike and a slow frame doesn't jump), `smooth` = how softly;
 * - the clip is moved on its own frame grid (`fps`), one seek at a time, never asking the decoder
 *   for the frame it's already showing (heroFilmPlayback's scrubber, the shop's 120 fps films' own);
 *   a clip small enough is loaded once into memory, so a seek never waits for the network;
 * - the picture's blur, darkness and zoom, the progress marks and what comes and goes are written
 *   as CSS variables and plain styles, each only when its value changed.
 * Whoever asked for less motion gets everything still and shown, one after another.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createFilmScrubber, filmDataSaver } from "@/components/cinematic/heroFilmPlayback";
import { between, cueAmount, cueLook, cueOf, type CueSpec } from "./keyframes";
import { keyPlayers } from "./motionPlayers";
import { studioLink } from "./studioLink";
import { useStudioViewRevision } from "./useStudioViewRevision";

type Range = { from: number; to: number };
type Live = {
  mode: "pin" | "flow";
  chapters: number;
  smooth: number;
  fps: number;
  kind: "video" | "image" | "none";
  phone?: string;
  blur?: Range & { amount: number };
  dim?: Range & { opacity: number };
  zoom?: Range & { scale: number };
};
type Env = { rtl: boolean; reduced: boolean; phone: boolean };

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const round = (v: number) => Math.round(v * 1000) / 1000;
/** The most a clip may weigh to be loaded into memory (phones less). */
const IN_MEMORY = { phone: 30e6, computer: 80e6 };
/** What a coming-in look may have written, back at rest. */
const AT_REST: Record<string, string> = { "--pt-ex": "0px", "--pt-ey": "0px", "--pt-es": "1", "--pt-erx": "0deg", "--pt-erz": "0deg", filter: "", "clip-path": "" };

/** The whole clip as a local address (seeking then never waits for the network), or null when it's too big or can't be read. */
async function intoMemory(url: string, limit: number, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(url, { signal, mode: "cors", credentials: "omit" });
    if (!res.ok || !res.body) return null;
    const size = Number(res.headers.get("content-length") || 0);
    if (size > limit) {
      void res.body.cancel();
      return null;
    }
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      got += value.byteLength;
      if (got > limit) {
        void reader.cancel();
        return null;
      }
      chunks.push(value as BlobPart);
    }
    return URL.createObjectURL(new Blob(chunks, { type: res.headers.get("content-type") || "video/mp4" }));
  } catch {
    return null;
  }
}

/** One scene's loop; gives back what stops it and puts everything back. */
function mountScene(el: HTMLElement, live: Live, env: Env): () => void {
  const stage = el.querySelector<HTMLElement>(":scope > .pt-ss-stage");
  const video = live.kind === "video" ? stage?.querySelector<HTMLVideoElement>(":scope > .pt-ss-frame > video.pt-ss-media") ?? null : null;
  const dots = Array.from(el.querySelectorAll<HTMLElement>(":scope > .pt-ss-stage > .pt-ss-progress-dots > i"));
  // What it shows at its moments (pin), and keyframes that follow it; a scene inside it has its own.
  type Cued = { el: HTMLElement; cue: CueSpec; rest: number; last: Record<string, string> };
  const cued: Cued[] = [];
  const followers: Array<{ el: HTMLElement; cue?: CueSpec }> = [];
  el.querySelectorAll<HTMLElement>("[data-pt-motion]").forEach((child) => {
    if (child.parentElement?.closest("[data-pt-scroll-scene]") !== el) return;
    let m: { cue?: unknown; keys?: { on?: string } } | null = null;
    try {
      m = JSON.parse(child.dataset.ptMotion ?? "null");
    } catch {
      m = null;
    }
    const cue = cueOf(m?.cue);
    if (cue && live.mode === "pin") cued.push({ el: child, cue, rest: Number(getComputedStyle(child).opacity) || 1, last: {} });
    if (m?.keys?.on === "scene") followers.push({ el: child, cue });
  });
  const waiting = Array.from(el.querySelectorAll<HTMLElement>("[data-pt-cue-wait]")).filter((w) => w.parentElement?.closest("[data-pt-scroll-scene]") === el);

  if (env.reduced) {
    el.classList.add("pt-ss-still");
    return () => el.classList.remove("pt-ss-still");
  }

  const written = new Map<HTMLElement, Set<string>>();
  const write = (node: HTMLElement, key: string, value: string, cache: Record<string, string>) => {
    if (cache[key] === value) return;
    cache[key] = value;
    if (value === "") node.style.removeProperty(key);
    else node.style.setProperty(key, value);
    let keys = written.get(node);
    if (!keys) written.set(node, (keys = new Set()));
    keys.add(key);
  };
  waiting.forEach((w) => w.removeAttribute("data-pt-cue-wait"));

  let target = 0;
  let shown = -1;
  let snap = true;
  let chapter = -1;
  let raf = 0;
  let last = 0;
  let near = false;
  let dead = false;
  const stageCache: Record<string, string> = {};
  const scrubber = video ? createFilmScrubber(video, () => {}, live.fps, 1) : null;
  const tau = live.smooth * 0.5;

  const measure = () => {
    const r = el.getBoundingClientRect();
    const h = window.innerHeight || 1;
    const run = r.height - h;
    target = run > 1 ? clamp(-r.top / run) : clamp((h - r.top) / (h + r.height));
  };

  const apply = (p: number) => {
    scrubber?.update(p);
    if (live.blur) write(el, "--pt-ss-blur", `${round(live.blur.amount * between(p, live.blur.from, live.blur.to))}px`, stageCache);
    if (live.dim) write(el, "--pt-ss-dim", String(round(live.dim.opacity * between(p, live.dim.from, live.dim.to))), stageCache);
    if (live.zoom) write(el, "--pt-ss-zoom", String(round(1 + (live.zoom.scale - 1) * between(p, live.zoom.from, live.zoom.to))), stageCache);
    write(el, "--pt-ss-p", String(round(p)), stageCache);
    const now = Math.min(live.chapters - 1, Math.floor(p * live.chapters));
    if (now !== chapter) {
      chapter = now;
      dots.forEach((d, i) => d.toggleAttribute("data-on", i === now));
      el.dataset.chapter = String(now + 1);
    }
    for (const c of cued) {
      const { v, phase } = cueAmount(c.cue, p);
      const kind = phase === "out" || phase === "after" ? (c.cue.out === "stay" ? c.cue.in : c.cue.out ?? c.cue.in) : c.cue.in;
      const look = { ...AT_REST, ...cueLook(kind ?? "fade", v, env.rtl) };
      if (look.clipPath) {
        look["clip-path"] = look.clipPath;
        delete look.clipPath;
      }
      look.opacity = String(round(Number(look.opacity) * c.rest));
      for (const [k, value] of Object.entries(look)) write(c.el, k, value, c.last);
      write(c.el, "visibility", v > 0.001 ? "visible" : "hidden", c.last);
      write(c.el, "pointer-events", v > 0.5 ? "" : "none", c.last);
    }
    for (const f of followers) keyPlayers.get(f.el)?.seek(f.cue ? (p * 100 - f.cue.from) / (f.cue.to - f.cue.from) : p);
  };

  const tick = (now: number) => {
    raf = 0;
    if (dead) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    measure();
    if (snap || shown < 0 || tau < 0.001) {
      shown = target;
      snap = false;
    } else {
      shown += (target - shown) * (1 - Math.exp(-dt / tau));
      if (Math.abs(target - shown) < 0.0005) shown = target;
    }
    apply(shown);
    if (shown !== target) raf = requestAnimationFrame(tick);
    else last = 0;
  };
  const wake = () => {
    if (!raf && near && !dead) raf = requestAnimationFrame(tick);
  };

  // The clip: a phone's lighter one, primed so a seek shows its frame (iOS), then into memory when small enough.
  const abort = new AbortController();
  let local: string | null = null;
  let loaded = false;
  const load = () => {
    if (loaded || !video) return;
    loaded = true;
    if (env.phone && live.phone) video.src = live.phone;
    const src = video.currentSrc || video.src;
    video.muted = true;
    video.pause();
    const primed = video.play();
    if (primed) primed.then(() => video.pause()).catch(() => {});
    if (src && !filmDataSaver()) {
      void intoMemory(src, env.phone ? IN_MEMORY.phone : IN_MEMORY.computer, abort.signal).then((url) => {
        if (!url) return;
        if (dead) return URL.revokeObjectURL(url);
        local = url;
        video.src = url;
        wake();
      });
    }
  };

  const io = new IntersectionObserver(
    ([e]) => {
      near = e.isIntersecting;
      if (near) {
        load();
        snap = shown < 0;
        wake();
      }
    },
    { rootMargin: "60% 0px 60% 0px" },
  );
  io.observe(el);
  const jump = () => {
    snap = true;
    near = true;
    wake();
  };
  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", wake);
  addEventListener("pt:scene-jump", jump);
  const unlisten = keyPlayers.listen(() => shown >= 0 && apply(shown));

  return () => {
    dead = true;
    if (raf) cancelAnimationFrame(raf);
    io.disconnect();
    removeEventListener("scroll", wake);
    removeEventListener("resize", wake);
    removeEventListener("pt:scene-jump", jump);
    unlisten();
    scrubber?.stop();
    abort.abort();
    if (local) URL.revokeObjectURL(local);
    for (const [node, keys] of written) keys.forEach((k) => node.style.removeProperty(k));
    waiting.forEach((w) => w.setAttribute("data-pt-cue-wait", ""));
    delete el.dataset.chapter;
  };
}

/** Scrolls the page to a scene's moment (0–100 %): the editor's preview, and the "scene" trigger. */
export function sceneScrollTop(scene: Element, at: number): number {
  const r = scene.getBoundingClientRect();
  const run = r.height - window.innerHeight;
  return window.scrollY + r.top + (run > 1 ? clamp(at / 100) * run : 0);
}

export function TreeScenes({ revision = 0 }: { revision?: number }) {
  const pathname = usePathname();
  const viewRevision = useStudioViewRevision("[data-pt-scroll-scene],[data-pt-motion]", ["data-pt-scroll-scene", "data-pt-motion"], `${pathname}:${revision}`);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 639.98px)");
    let stops: Array<() => void> = [];
    const build = () => {
      stops.forEach((s) => s());
      stops = [];
      const env: Env = { rtl: document.documentElement.dir === "rtl", reduced: reduced.matches, phone: phone.matches };
      document.querySelectorAll<HTMLElement>("[data-pt-scroll-scene]").forEach((el) => {
        let live: Live | null = null;
        try {
          live = JSON.parse(el.dataset.ptScrollScene ?? "null");
        } catch {
          live = null;
        }
        if (live) stops.push(mountScene(el, live, env));
      });
    };
    build();
    // The editor's "show this moment": the frame scrolls there and the scene snaps to it.
    const unlisten = studioLink.listen((msg) => {
      if (msg.type !== "motionSceneSeek" || typeof msg.nodeId !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(msg.nodeId)) return;
      const scene = document.querySelector(`[data-tree-node="${msg.nodeId}"][data-pt-scroll-scene]`);
      if (!scene) return;
      window.scrollTo({ top: sceneScrollTop(scene, Number(msg.at) || 0), behavior: "instant" as ScrollBehavior });
      window.dispatchEvent(new Event("pt:scene-jump"));
    });
    const changed = () => build();
    reduced.addEventListener("change", changed);
    phone.addEventListener("change", changed);
    return () => {
      unlisten();
      reduced.removeEventListener("change", changed);
      phone.removeEventListener("change", changed);
      stops.forEach((s) => s());
    };
  }, [pathname, revision, viewRevision]);
  return null;
}
