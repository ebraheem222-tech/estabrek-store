"use client";
/**
 * The page tree's animated media, each player loaded only on a page that has one: Lottie
 * animations (dotLottie, .json or .lottie), Rive animations (.riv, with their state
 * machines), particles behind a section (tsParticles), and the page's smooth scrolling
 * (Lenis). The players' WebAssembly comes from the shop itself (public/vendor, copied by
 * scripts/vendor-wasm.cjs), never a public CDN.
 *
 * An animation plays by itself, once it's seen, with the mouse over it, or (Lottie) with the
 * scroll. "Reduce motion" shows each one still, with no particles and the page's own scroll.
 * Inside the editor's frame the page keeps its own scroll (the editor scrolls the frame).
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { particleOptions, type ParticleSpec } from "./particles";
import { ViewRuntimeRegistry, viewTargets } from "./viewRuntime";

type Stop = () => void;
/** Whether this page's run is still on (a player loaded after it ended is never started). */
type Live = () => boolean;
type LottieSpec = { src: string; play?: string; loop?: boolean; speed?: number };
type RiveSpec = { src: string; play?: string; stateMachine?: string; artboard?: string };

const read = <T,>(el: HTMLElement, key: string): T | null => {
  try {
    return JSON.parse(el.dataset[key] ?? "null") as T;
  } catch {
    return null;
  }
};
/** Calls `on(true/false)` as the element comes into and out of sight. */
function watchSight(el: Element, on: (seen: boolean) => void, stops: Stop[]) {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => on(e.isIntersecting)), { threshold: 0.2 });
  io.observe(el);
  stops.push(() => io.disconnect());
}

async function lotties(els: HTMLCanvasElement[], still: boolean, stops: Stop[], live: Live) {
  const { DotLottie } = await import("@lottiefiles/dotlottie-web");
  if (!live()) return;
  DotLottie.setWasmUrl("/vendor/dotlottie-player.wasm");
  for (const canvas of els) {
    const s = read<LottieSpec>(canvas, "ptLottie");
    if (!s?.src) continue;
    const play = still ? "still" : s.play ?? "auto";
    const anim = new DotLottie({
      canvas, src: s.src, autoplay: play === "auto", loop: s.loop !== false && play !== "scroll", speed: s.speed ?? 1,
      renderConfig: { autoResize: true }, layout: { fit: "contain", align: [0.5, 0.5] },
    });
    stops.push(() => anim.destroy());
    const host = canvas.parentElement ?? canvas;
    if (play === "view") watchSight(host, (seen) => (seen ? anim.play() : anim.pause()), stops);
    if (play === "hover") {
      const on = () => anim.play();
      const off = () => anim.pause();
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      stops.push(() => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      });
    }
    if (play === "scroll") {
      // Its frames follow the page: the first as it comes up the screen, the last as it leaves at the top.
      let ticking = false;
      const draw = () => {
        ticking = false;
        const r = host.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        if (anim.totalFrames > 1) anim.setFrame(p * (anim.totalFrames - 1));
      };
      const onScroll = () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(draw);
        }
      };
      anim.addEventListener("load", draw);
      window.addEventListener("scroll", onScroll, { passive: true });
      stops.push(() => window.removeEventListener("scroll", onScroll));
    }
  }
}

async function rives(els: HTMLCanvasElement[], still: boolean, stops: Stop[], live: Live) {
  const { Rive, RuntimeLoader, Layout, Fit, Alignment } = await import("@rive-app/canvas");
  if (!live()) return;
  RuntimeLoader.setWasmUrl("/vendor/rive.wasm");
  RuntimeLoader.setWasmFallbackUrl("/vendor/rive_fallback.wasm");
  for (const canvas of els) {
    const s = read<RiveSpec>(canvas, "ptRive");
    if (!s?.src) continue;
    const play = still ? "still" : s.play ?? "auto";
    const anim = new Rive({
      src: s.src, canvas, autoplay: play === "auto",
      ...(s.stateMachine ? { stateMachines: s.stateMachine } : {}),
      ...(s.artboard ? { artboard: s.artboard } : {}),
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => anim.resizeDrawingSurfaceToCanvas(),
    });
    const resize = new ResizeObserver(() => anim.resizeDrawingSurfaceToCanvas());
    resize.observe(canvas);
    stops.push(() => {
      resize.disconnect();
      anim.cleanup();
    });
    const host = canvas.parentElement ?? canvas;
    if (play === "view") watchSight(host, (seen) => (seen ? anim.play() : anim.pause()), stops);
    if (play === "hover") {
      const on = () => anim.play();
      const off = () => anim.pause();
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      stops.push(() => {
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
      });
    }
  }
}

async function particles(els: HTMLElement[], stops: Stop[], live: Live) {
  const [{ tsParticles }, { loadSlim }] = await Promise.all([import("@tsparticles/engine"), import("@tsparticles/slim")]);
  await loadSlim(tsParticles);
  for (const el of els) {
    const s = read<ParticleSpec>(el, "ptParticles");
    if (!s || !live()) continue;
    // Its colour as the theme draws it (a theme colour is a CSS variable).
    const container = await tsParticles.load({ element: el, options: particleOptions(s, getComputedStyle(el).color) });
    if (container && live()) stops.push(() => container.destroy());
    else container?.destroy();
  }
}

export function TreeMedia({ smooth, revision = 0 }: { smooth?: boolean; revision?: number }) {
  const pathname = usePathname();
  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const studio = window.parent !== window && /\/studio-frame/.test(window.location.pathname);
    const stops: Stop[] = [];
    let dead = false;
    const live = () => !dead;
    // A player that fails to load leaves its element as the page drew it.
    const keep = (p: Promise<void>) => void p.catch(() => undefined);
    const players = new ViewRuntimeRegistry(({ node }) => {
      const playerStops: Stop[] = [];
      let active = true;
      const playerLive = () => !dead && active && node.isConnected;
      if (node.matches("canvas[data-pt-lottie]")) keep(lotties([node as HTMLCanvasElement], still, playerStops, playerLive));
      else if (node.matches("canvas[data-pt-rive]")) keep(rives([node as HTMLCanvasElement], still, playerStops, playerLive));
      else keep(particles([node as HTMLElement], playerStops, playerLive));
      return () => { active = false; playerStops.splice(0).forEach(stop => stop()); };
    });
    const reconcile = () => players.reconcile([
      ...viewTargets(document, "canvas[data-pt-lottie]", ["data-pt-lottie"]),
      ...viewTargets(document, "canvas[data-pt-rive]", ["data-pt-rive"]),
      ...(still ? [] : viewTargets(document, "[data-pt-particles]", ["data-pt-particles", "$color"])),
    ]);
    reconcile();
    if (studio) window.addEventListener("studio-view-updated", reconcile);
    const smoothOn = smooth ?? Boolean(document.querySelector("[data-pt-smooth]"));
    if (smoothOn && !still && !studio) {
      keep(
        import("lenis").then(({ default: Lenis }) => {
          if (!live()) return;
          const lenis = new Lenis({ autoRaf: true, anchors: true });
          stops.push(() => lenis.destroy());
        }),
      );
    }
    return () => {
      dead = true;
      window.removeEventListener("studio-view-updated", reconcile);
      players.clear();
      stops.splice(0).forEach((f) => f());
    };
  }, [pathname, smooth, revision]);
  return null;
}
