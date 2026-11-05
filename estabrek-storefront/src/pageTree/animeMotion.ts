/**
 * Anime.js implementation of the small tween API used by TreeMotion. This module is
 * imported only for a node choosing Anime. ScrollTrigger owns geometry and pinning;
 * its scrub tween writes a progress object, while Anime alone writes the element.
 * DrawSVG, MorphSVG and ScrambleText keep their specialized GSAP implementations.
 */
import { animate, createTimeline, type AnimationParams, type JSAnimation, type Timeline, type TargetsParam } from "animejs";

type Gsap = typeof import("gsap").gsap;
type ST = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type Vars = Record<string, any>;
type Player = JSAnimation | Timeline;
const settings = new Set(["duration", "delay", "ease", "stagger", "repeat", "repeatDelay", "yoyo", "paused", "scrollTrigger", "onStart", "onComplete", "onUpdate", "clearProps", "keyframes"]);
const specialized = (vars: Vars) => "drawSVG" in vars || "morphSVG" in vars || "scrambleText" in vars;
const eases: Record<string, string> = {
  "power1.out": "outQuad", "power1.inOut": "inOutQuad", "power2.out": "outCubic", "power3.out": "outQuart", "power4.out": "outQuint",
  "sine.inOut": "inOutSine", "back.out(1.6)": "outBack(1.6)", "elastic.out(1, 0.5)": "outElastic(1, .5)", "bounce.out": "outBounce", none: "linear",
};
const cssName = (name: string) => name.startsWith("--") ? name : name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`);
const alias = (name: string) => name === "autoAlpha" ? "opacity" : name === "yPercent" ? "translateY" : name;
const styleName = (name: string) => ["y", "x", "yPercent", "rotate", "scale"].includes(name) ? "transform" : cssName(alias(name));

export function createAnimeMotionEngine(gsap: Gsap, ScrollTrigger?: ST): { engine: Gsap; dispose: () => void } {
  let dead = false;
  const players = new Set<Player>();
  const coordinators: Array<() => void> = [];
  // Snapshot each affected property once, even after many completed hover plays.
  // Completed Anime players can then be released without losing route/editor cleanup.
  const styles = new Map<HTMLElement | SVGElement, Map<string, [string, string]>>();
  const objects = new Map<Record<string, any>, Map<string, { present: boolean; value: any }>>();
  const targetsOf = (targets: any): any[] => typeof targets === "string" ? Array.from(document.querySelectorAll(targets)) : Array.isArray(targets) ? targets : targets && typeof targets.length === "number" && !targets.style ? Array.from(targets) : [targets];
  const remember = (targets: any, ...all: Vars[]) => {
    const names = new Set(all.flatMap(vars => Object.keys(vars).filter(key => !settings.has(key))));
    for (const target of targetsOf(targets)) {
      if (!target) continue;
      if (typeof Element !== "undefined" && target instanceof Element && "style" in target) {
        const el = target as HTMLElement | SVGElement;
        const values = styles.get(el) ?? new Map<string, [string, string]>();
        styles.set(el, values);
        for (const key of names) {
          const name = styleName(key);
          if (!values.has(name)) values.set(name, [el.style.getPropertyValue(name), el.style.getPropertyPriority(name)]);
        }
      } else {
        const values = objects.get(target) ?? new Map();
        objects.set(target, values);
        for (const key of names) if (!values.has(key)) values.set(key, { present: Object.hasOwn(target, key), value: target[key] });
      }
    }
  };
  const valueOf = (key: string, value: any) => {
    if (typeof value === "function") return (target: any, index: number, targets: any[]) => valueOf(key, value(index, target, targets));
    return key === "yPercent" ? `${value}%` : value;
  };
  const paramsFor = (from: Vars | null, to: Vars, targets: TargetsParam): AnimationParams => {
    const params: Vars = {};
    for (const key of new Set([...Object.keys(from ?? {}), ...Object.keys(to)])) {
      if (settings.has(key)) continue;
      const end = valueOf(key, to[key] ?? from?.[key]);
      params[alias(key)] = from && key in from ? { from: valueOf(key, from[key]), to: end } : end;
    }
    const duration = (to.duration ?? 0.5) * 1000;
    params.duration = duration;
    params.delay = to.stagger ? (_: unknown, i: number) => ((to.delay ?? 0) + i * to.stagger) * 1000 : (to.delay ?? 0) * 1000;
    params.ease = eases[to.ease] ?? to.ease ?? "outCubic";
    params.loop = to.repeat === -1 ? true : to.repeat ?? 0;
    params.alternate = to.yoyo === true;
    params.loopDelay = (to.repeatDelay ?? 0) * 1000;
    params.autoplay = !to.paused && !to.scrollTrigger;
    if (to.onStart) params.onBegin = () => { if (!dead) to.onStart(); };
    if (to.onUpdate) params.onRender = () => { if (!dead) to.onUpdate(); };
    if (to.onComplete || to.clearProps) params.onComplete = () => {
      if (dead) return;
      if (to.clearProps) for (const el of targetsOf(targets)) for (const key of String(to.clearProps).split(",")) {
        const name = cssName(key);
        const previous = styles.get(el)?.get(name);
        if (previous) previous[0] ? el.style.setProperty(name, ...previous) : el.style.removeProperty(name);
      }
      to.onComplete?.();
    };
    if (Array.isArray(to.keyframes)) params.keyframes = to.keyframes.map((step: Vars) => {
      const frame: Vars = { duration: duration / to.keyframes.length };
      for (const [key, value] of Object.entries(step)) frame[alias(key)] = valueOf(key, value);
      return frame;
    });
    return params as AnimationParams;
  };
  const track = <T extends Player>(player: T): T => {
    for (const prior of players) if (prior.completed || prior.cancelled) { prior.cancel(); players.delete(prior); }
    players.add(player);
    return player;
  };
  const controls = (player: Player) => {
    const wrapper = {
      play: () => { if (!dead) player.resume(); return wrapper; },
      pause: () => { player.pause(); return wrapper; },
      isActive: () => !dead && !player.paused && !player.completed,
      progress: (value?: number) => {
        if (value === undefined) return player.iterationProgress;
        if (!dead) player.seek(value * player.iterationDuration);
        return wrapper;
      },
      totalTime: (seconds?: number) => {
        if (seconds === undefined) return player.currentTime / 1000;
        if (!dead) player.seek(seconds * 1000);
        return wrapper;
      },
    };
    return wrapper;
  };
  const scroll = (player: Player, vars: Vars) => {
    if (!vars.scrollTrigger || !ScrollTrigger) return;
    const spec = vars.scrollTrigger;
    if (spec.scrub) {
      const progress = { value: 0 };
      const geometry = gsap.fromTo(progress, { value: 0 }, {
        value: 1, duration: 1, paused: true, ease: "none",
        onUpdate: () => { if (!dead) player.seek(progress.value * player.iterationDuration); },
      });
      const trigger = ScrollTrigger.create({ ...spec, animation: geometry });
      coordinators.push(() => { trigger.kill(); geometry.kill(); });
    } else {
      let started = false;
      const play = () => { if (!dead && !started) { started = true; player.play(); } };
      const trigger = ScrollTrigger.create({ ...spec, onEnter: play, onEnterBack: play });
      coordinators.push(() => trigger.kill());
    }
  };
  const run = (targets: TargetsParam, from: Vars | null, to: Vars) => {
    if (specialized(to) || (from && specialized(from))) return from ? gsap.fromTo(targets, from, to) : gsap.to(targets, to);
    remember(targets, from ?? {}, to, ...(to.keyframes ?? []));
    const player = track(animate(targets, paramsFor(from, to, targets)));
    scroll(player, to);
    return controls(player);
  };
  const engine = {
    ...gsap,
    to: (targets: TargetsParam, vars: Vars) => run(targets, null, vars),
    fromTo: (targets: TargetsParam, from: Vars, to: Vars) => run(targets, from, to),
    set: (targets: TargetsParam, vars: Vars) => run(targets, null, { ...vars, duration: 0 }),
    timeline: (options: Vars = {}) => {
      let fallback: ReturnType<Gsap["timeline"]> | null = null;
      let player: Timeline | null = null;
      const timeline = {
        fromTo: (targets: TargetsParam, from: Vars, to: Vars, position?: string | number) => {
          if (fallback || options.scrollTrigger || specialized(from) || specialized(to)) {
            fallback ??= gsap.timeline(options);
            fallback.fromTo(targets, from, to, position);
            return timeline;
          }
          remember(targets, from, to);
          player ??= track(createTimeline({ autoplay: false, delay: (options.delay ?? 0) * 1000, loop: options.repeat === -1 ? true : options.repeat ?? 0, alternate: options.yoyo === true, loopDelay: (options.repeatDelay ?? 0) * 1000 }));
          const params = paramsFor(from, to, targets);
          delete params.autoplay;
          player.add(targets, params, typeof position === "number" ? position * 1000 : position);
          if (!options.paused && !options.scrollTrigger) player.resume();
          return timeline;
        },
        play: () => { if (!dead) { fallback?.play(); player?.resume(); } return timeline; },
        pause: () => { fallback?.pause(); player?.pause(); return timeline; },
        isActive: () => !dead && (fallback?.isActive() ?? (!!player && !player.paused && !player.completed)),
        totalTime: (seconds: number) => { if (!dead) { fallback?.totalTime(seconds); player?.seek(seconds * 1000); } return timeline; },
      };
      return timeline;
    },
  } as unknown as Gsap;
  return {
    engine,
    dispose: () => {
      if (dead) return;
      dead = true;
      coordinators.forEach(stop => stop());
      players.forEach(player => player.cancel());
      players.clear();
      for (const [el, values] of styles) for (const [name, [value, priority]] of values) value ? el.style.setProperty(name, value, priority) : el.style.removeProperty(name);
      for (const [target, values] of objects) for (const [key, before] of values) before.present ? target[key] = before.value : delete target[key];
      styles.clear();
      objects.clear();
    },
  };
}
