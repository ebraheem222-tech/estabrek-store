/** Closed, checked slider settings shared by the server markup and client controls. */
export const SLIDER_EFFECTS = ["slide", "fade", "zoom", "wipe", "flip", "coverflow", "slices"] as const;
export type SliderEffect = typeof SLIDER_EFFECTS[number];
export type SliderAxis = "x" | "y";
export type SliderSettings = { effect: SliderEffect; axis: SliderAxis; duration: number; zoom: number; thumbnails: boolean; progress: boolean; captionPosition: "bottom" | "center" | "split"; nativeLegacy: boolean };
export function sliderSettings(p: Record<string, unknown> = {}): SliderSettings {
  return {
    effect: SLIDER_EFFECTS.includes(p.effect as SliderEffect) ? p.effect as SliderEffect : "slide",
    axis: p.axis === "y" ? "y" : "x",
    duration: typeof p.duration === "number" && Number.isFinite(p.duration) && p.duration >= 0 && p.duration <= 2 ? p.duration : 0.7,
    zoom: typeof p.zoom === "number" && Number.isFinite(p.zoom) && p.zoom >= 0.7 && p.zoom <= 1.5 ? p.zoom : 1,
    thumbnails: p.thumbnails === true,
    progress: p.progress === true,
    captionPosition: p.captionPosition === "center" || p.captionPosition === "split" ? p.captionPosition : "bottom",
    nativeLegacy: p.effect === undefined && p.axis === undefined && p.duration === undefined,
  };
}

/** A slider's shape, arrows and dots (kept equal to the API's lists); drawn by sliderLookCss.ts. */
export const SLIDER_LOOKS = ["plain", "rounded", "card", "frame", "polaroid", "arch", "circle", "blob", "ticket", "film", "phone", "browser", "tilt", "stack", "peek", "trio"] as const;
export const SLIDER_ARROW_LOOKS = ["round", "square", "bare", "glass", "outline", "corner"] as const;
export const SLIDER_DOT_LOOKS = ["dots", "lines", "bars", "numbers"] as const;
export type SliderLooks = { look?: typeof SLIDER_LOOKS[number]; arrows?: typeof SLIDER_ARROW_LOOKS[number]; dots?: typeof SLIDER_DOT_LOOKS[number] };
/** Only what's on the lists, and nothing for the usual ones (plain, round arrows, dots). */
export function sliderLooksOf(p: Record<string, unknown> = {}): SliderLooks {
  const one = <T extends string>(v: unknown, list: readonly T[], usual: T): T | undefined => (typeof v === "string" && v !== usual && (list as readonly string[]).includes(v) ? (v as T) : undefined);
  return { look: one(p.look, SLIDER_LOOKS, "plain"), arrows: one(p.arrowLook, SLIDER_ARROW_LOOKS, "round"), dots: one(p.dotLook, SLIDER_DOT_LOOKS, "dots") };
}

/** Signed distance in document order, with wrapping only for a looping slider. */
export function slideDistance(i: number, at: number, count: number, loop: boolean): number {
  let d = i - at;
  if (loop && count > 2 && Math.abs(d) > count / 2) d += d > 0 ? -count : count;
  return d;
}

export function coverflowPose(distance: number, axis: SliderAxis, rtl: boolean): { transform: string; opacity: number; zIndex: number } {
  const d = Math.max(-3, Math.min(3, distance));
  const direction = axis === "x" && rtl ? -1 : 1;
  const shift = d * 46 * direction;
  const angle = d * 38 * direction * (axis === "y" ? 1 : -1);
  return {
    transform: d === 0 ? "translateZ(0) scale(1)" : `translate${axis.toUpperCase()}(${shift}%) translateZ(-${Math.abs(d) * 140}px) rotate${axis === "x" ? "Y" : "X"}(${angle}deg) scale(.78)`,
    opacity: Math.abs(distance) > 2 ? 0 : d === 0 ? 1 : Math.abs(d) === 1 ? 0.8 : 0.45,
    zIndex: 4 - Math.abs(d),
  };
}

export function transitionFrames(effect: SliderEffect, axis: SliderAxis, direction: number): { incoming: Keyframe[]; outgoing: Keyframe[] } {
  const incoming: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
  const outgoing: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];
  if (effect === "zoom") { incoming[0].transform = "scale(1.12)"; incoming[1].transform = "scale(1)"; outgoing[1].transform = "scale(.94)"; }
  if (effect === "wipe") {
    incoming[0] = { clipPath: axis === "y" ? (direction < 0 ? "inset(0 0 100% 0)" : "inset(100% 0 0 0)") : (direction < 0 ? "inset(0 100% 0 0)" : "inset(0 0 0 100%)") };
    incoming[1] = { clipPath: "inset(0 0 0 0)" };
    outgoing[1] = { opacity: 1 };
  }
  if (effect === "flip") {
    const rotate = axis === "x" ? "Y" : "X";
    incoming[0].transform = `perspective(1200px) rotate${rotate}(${direction * 90}deg)`;
    incoming[1].transform = `perspective(1200px) rotate${rotate}(0deg)`;
    outgoing[1].transform = `perspective(1200px) rotate${rotate}(${-direction * 90}deg)`;
  }
  return { incoming, outgoing };
}

export function sliceFrames(axis: SliderAxis, direction: number): Keyframe[] {
  return [{ opacity: 0, transform: `perspective(1000px) translateZ(-100px) rotate${axis === "x" ? "Y" : "X"}(${direction * 90}deg)` }, { opacity: 1, transform: `perspective(1000px) translateZ(0) rotate${axis === "x" ? "Y" : "X"}(0deg)` }];
}

/** Explicit duration uses a bounded animation; old documents keep the browser's native smooth scroll. */
export function scrollSlider(row: HTMLElement, target: number, settings: SliderSettings, reduced: boolean): () => void {
  const vertical = settings.axis === "y";
  const scroll = (value: number, behavior: ScrollBehavior) => row.scrollTo(vertical ? { top: value, behavior } : { left: value, behavior });
  if (settings.nativeLegacy || reduced || settings.duration === 0) {
    scroll(target, reduced || settings.duration === 0 ? "instant" as ScrollBehavior : "smooth");
    return () => {};
  }
  const start = vertical ? row.scrollTop : row.scrollLeft;
  const began = performance.now();
  let frame = 0;
  row.dataset.scrolling = "";
  row.style.scrollSnapType = "none";
  const clear = () => { cancelAnimationFrame(frame); row.removeAttribute("data-scrolling"); row.style.removeProperty("scroll-snap-type"); };
  const step = (now: number) => {
    const amount = Math.min(1, (now - began) / (settings.duration * 1000));
    scroll(start + (target - start) * (1 - Math.pow(1 - amount, 3)), "instant" as ScrollBehavior);
    if (amount < 1) frame = requestAnimationFrame(step); else clear();
  };
  frame = requestAnimationFrame(step);
  return clear;
}

/** Pointer and keyboard listeners live on this slider only; native touch scrolling stays native. */
export function bindSliderInput(root: HTMLElement, row: HTMLElement, settings: SliderSettings, getAt: () => number, go: (i: number) => void, loop: boolean): () => void {
  const enhanced = settings.effect !== "slide", vertical = settings.axis === "y";
  const rtl = () => !vertical && getComputedStyle(row).direction === "rtl";
  let start: { id: number; x: number; y: number; dragged: boolean } | null = null;
  let suppress = false, timer = 0, wheelUntil = 0;
  const key = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]")) return;
    const next = vertical ? "ArrowDown" : rtl() ? "ArrowLeft" : "ArrowRight";
    const prev = vertical ? "ArrowUp" : rtl() ? "ArrowRight" : "ArrowLeft";
    if (![next, prev, "Home", "End"].includes(e.key)) return;
    e.preventDefault(); go(e.key === "Home" ? 0 : e.key === "End" ? row.children.length - 1 : getAt() + (e.key === next ? 1 : -1));
  };
  const down = (e: PointerEvent) => {
    if (e.button !== 0 || (!enhanced && e.pointerType !== "mouse") || (e.target as HTMLElement).closest(".pt-slide-rich,button,input,textarea,select,video")) return;
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, dragged: false };
  };
  const move = (e: PointerEvent) => {
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!start.dragged && (Math.abs(vertical ? dy : dx) < 8 || Math.abs(vertical ? dy : dx) < Math.abs(vertical ? dx : dy))) return;
    start.dragged = true; e.preventDefault();
    if (!row.hasPointerCapture(e.pointerId)) row.setPointerCapture(e.pointerId);
  };
  const up = (e: PointerEvent) => {
    if (!start || start.id !== e.pointerId) return;
    const distance = vertical ? e.clientY - start.y : e.clientX - start.x;
    if (start.dragged) {
      suppress = true; window.clearTimeout(timer); timer = window.setTimeout(() => { suppress = false; }, 500);
      if (Math.abs(distance) > 35) go(getAt() + (distance * (rtl() ? -1 : 1) < 0 ? 1 : -1));
    }
    start = null;
    if (row.hasPointerCapture(e.pointerId)) row.releasePointerCapture(e.pointerId);
  };
  const cancel = () => { start = null; };
  const click = (e: MouseEvent) => { if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; } };
  const drag = (e: DragEvent) => { if (!(e.target as HTMLElement).closest(".pt-slide-rich")) e.preventDefault(); };
  const wheel = (e: WheelEvent) => {
    if (!enhanced || (e.target as HTMLElement).closest(".pt-slide-rich")) return;
    const value = vertical ? e.deltaY : e.deltaX;
    if (Math.abs(value) < 10 || Math.abs(value) < Math.abs(vertical ? e.deltaX : e.deltaY)) return;
    const delta = value * (rtl() ? -1 : 1) > 0 ? 1 : -1;
    if (!loop && (getAt() + delta < 0 || getAt() + delta >= row.children.length)) return;
    e.preventDefault();
    if (performance.now() >= wheelUntil) { wheelUntil = performance.now() + Math.max(350, settings.duration * 1000); go(getAt() + delta); }
  };
  root.addEventListener("keydown", key); row.addEventListener("pointerdown", down); row.addEventListener("pointermove", move);
  row.addEventListener("pointerup", up); row.addEventListener("pointercancel", cancel); row.addEventListener("click", click, true);
  row.addEventListener("dragstart", drag); row.addEventListener("wheel", wheel, { passive: false });
  return () => {
    window.clearTimeout(timer); root.removeEventListener("keydown", key); row.removeEventListener("pointerdown", down); row.removeEventListener("pointermove", move);
    row.removeEventListener("pointerup", up); row.removeEventListener("pointercancel", cancel); row.removeEventListener("click", click, true);
    row.removeEventListener("dragstart", drag); row.removeEventListener("wheel", wheel);
  };
}

/** Applies one transition and returns complete animation/overlay cleanup for changes and unmounts. */
export function animateSlider(row: HTMLElement, previous: number, at: number, settings: SliderSettings, loop: boolean, reduced: boolean): () => void {
  const slides = Array.from(row.children) as HTMLElement[];
  const rtl = getComputedStyle(row).direction === "rtl";
  const animations: Animation[] = [];
  const duration = reduced ? 0 : settings.duration * 1000;
  const old = slides[previous];
  const current = slides[at];
  let overlay: HTMLElement | undefined;
  let hiddenImage: HTMLElement | null = null;
  const animate = (el: HTMLElement, frames: Keyframe[], delay = 0, span = duration) => {
    if (duration && typeof el.animate === "function") animations.push(el.animate(frames, { duration: span, delay, fill: "both", easing: "cubic-bezier(.22,.7,.2,1)" }));
  };
  slides.forEach((slide, i) => {
    slide.dataset.sliderActive = String(i === at);
    slide.setAttribute("aria-hidden", String(i !== at));
    slide.inert = i !== at;
    if (settings.effect === "coverflow") {
      const pose = coverflowPose(slideDistance(i, at, slides.length, loop), settings.axis, rtl);
      slide.style.transform = pose.transform;
      slide.style.opacity = String(pose.opacity);
      slide.style.zIndex = String(pose.zIndex);
      slide.style.visibility = pose.opacity ? "visible" : "hidden";
      slide.style.transition = duration ? `transform ${duration}ms cubic-bezier(.22,.7,.2,1),opacity ${duration}ms ease` : "none";
    } else {
      ["transform", "opacity", "visibility", "transition"].forEach((key) => slide.style.removeProperty(key));
      slide.style.zIndex = i === at ? "2" : "1";
    }
  });
  if (!old || !current || previous === at || !duration || settings.effect === "coverflow") return () => animations.forEach((a) => a.cancel());
  old.style.visibility = "visible";
  const direction = (slideDistance(at, previous, slides.length, loop) < 0 ? -1 : 1) * (settings.axis === "x" && rtl ? -1 : 1);
  const image = current.querySelector<HTMLImageElement>(".pt-slide-media:is(img)");
  if (settings.effect === "slices" && image && typeof current.animate === "function") {
    overlay = document.createElement("div");
    overlay.className = "pt-slider-slices";
    overlay.setAttribute("aria-hidden", "true");
    overlay.dataset.axis = settings.axis;
    const size = row.getBoundingClientRect();
    const count = 8;
    for (let i = 0; i < count; i++) {
      const slice = document.createElement("span");
      const crop = document.createElement("span");
      const img = image.cloneNode() as HTMLImageElement;
      img.removeAttribute("loading"); img.alt = ""; img.draggable = false;
      img.style.width = `${size.width}px`; img.style.height = `${size.height}px`;
      img.style.position = "absolute"; img.style.left = settings.axis === "x" ? `${-i * size.width / count}px` : "0"; img.style.top = settings.axis === "y" ? `${-i * size.height / count}px` : "0";
      crop.append(img); slice.append(crop); overlay.append(slice);
      animate(slice, sliceFrames(settings.axis, direction), i * duration * 0.28 / (count - 1), duration * 0.72);
    }
    hiddenImage = image; image.style.visibility = "hidden";
    current.append(overlay);
  } else {
    const frames = transitionFrames(settings.effect === "slices" ? "fade" : settings.effect, settings.axis, direction);
    animate(current, frames.incoming); animate(old, frames.outgoing);
  }
  const clearVisuals = () => { old.style.removeProperty("visibility"); overlay?.remove(); hiddenImage?.style.removeProperty("visibility"); };
  const timer = window.setTimeout(() => { animations.forEach((a) => a.cancel()); clearVisuals(); }, duration + 30);
  return () => { window.clearTimeout(timer); animations.forEach((a) => a.cancel()); clearVisuals(); };
}
