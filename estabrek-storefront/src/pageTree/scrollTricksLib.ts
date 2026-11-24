/**
 * The theme library's scroll tricks (its Premium "Deck that Fans Out", "Parallax Columns", "Depth Tunnel Gallery",
 * "Zoom-through Mask" and "Scroll Timeline"), as any element's scroll motion (TreeMotion runs them):
 * - fan: what it holds starts gathered at its middle, fanned like cards in a hand, and spreads to its places as it
 *   comes up the screen (and gathers again going back);
 * - drift: what it holds drifts at different speeds, some up, some down, as it crosses the screen;
 * - depth: held on the screen while the page flies through what it holds, one after another in depth;
 * - through: a huge word the page dives through: its section held, the word grows until it fills the screen, then
 *   what's around it comes in;
 * - timeline: a line down its start side draws as the page scrolls through it, and each thing it holds lights up as
 *   it's reached.
 * They move individual transform properties (translate, scale, rotate), so an element's own look stays. Each returns
 * what undoes it.
 */
type Gsap = typeof import("gsap").gsap;
type ST = typeof import("gsap/ScrollTrigger").ScrollTrigger;

/** What an element holds, as the page tree draws it (straight in it, or in its inner width). */
const kidsOf = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>(":scope > [data-tree-node], :scope > .pt-inner > [data-tree-node]"));
const clear = (els: HTMLElement[], props: string[]) => els.forEach((k) => props.forEach((x) => k.style.removeProperty(x)));

export function scrollTrick(gsap: Gsap, ScrollTrigger: ST, el: HTMLElement, kind: "fan" | "drift" | "depth" | "through" | "timeline", o: { speed?: number; length?: number; rtl: boolean }): () => void {
  if (kind === "fan") {
    const kids = kidsOf(el);
    if (!kids.length) return () => {};
    let gaps: Array<{ dx: number; dy: number }> = [];
    const at = { p: 0 };
    const place = () => {
      const g = 1 - at.p;
      kids.forEach((k, i) => {
        const c = i - (kids.length - 1) / 2;
        const d = gaps[i] ?? { dx: 0, dy: 0 };
        k.style.translate = `${((d.dx + c * 46) * g).toFixed(1)}px ${((d.dy + Math.abs(c) * 22) * g).toFixed(1)}px`;
        k.style.rotate = `${(c * 13 * g * (o.rtl ? -1 : 1)).toFixed(2)}deg`;
        k.style.zIndex = String(50 - Math.round(Math.abs(c)));
      });
    };
    // Where each is from the middle, measured at its own place.
    const measure = () => {
      clear(kids, ["translate", "rotate"]);
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      gaps = kids.map((k) => {
        const b = k.getBoundingClientRect();
        return { dx: cx - (b.left + b.width / 2), dy: cy - (b.top + b.height / 2) };
      });
      place();
    };
    measure();
    const tw = gsap.to(at, { p: 1, ease: "power2.out", onUpdate: place, scrollTrigger: { trigger: el, start: "top 85%", end: "center 55%", scrub: 0.6, onRefresh: measure } });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); clear(kids, ["translate", "rotate", "z-index"]); };
  }

  if (kind === "drift") {
    const kids = kidsOf(el);
    if (!kids.length) return () => {};
    const amount = 140 * (o.speed ?? 1);
    const pattern = [-1, 0.6, -0.35, 0.85, -0.7, 0.45];
    const at = { p: 0 };
    const place = () => kids.forEach((k, i) => { k.style.translate = `0 ${(pattern[i % pattern.length] * amount * (1 - 2 * at.p)).toFixed(1)}px`; });
    place();
    const tw = gsap.to(at, { p: 1, ease: "none", onUpdate: place, scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); clear(kids, ["translate"]); };
  }

  if (kind === "depth") {
    const kids = kidsOf(el);
    if (!kids.length) return () => {};
    el.setAttribute("data-pt-depth", "");
    const n = kids.length, gap = 900;
    const at = { p: 0 };
    const opacityAt = (z: number) => {
      // Far away it's faint, near it's whole, past the eye it's gone.
      if (z < -5000) return 0;
      if (z < -2600) return ((z + 5000) / 2400) * 0.25;
      if (z < -500) return 0.25 + ((z + 2600) / 2100) * 0.75;
      if (z < 250) return 1;
      if (z < 600) return 1 - (z - 250) / 350;
      return 0;
    };
    const place = () => {
      const w = el.clientWidth, h = el.clientHeight;
      kids.forEach((k, i) => {
        const z = -i * gap - 300 + at.p * n * gap;
        const side = i % 2 ? 1 : -1;
        const ox = side * w * (0.12 + ((i % 3) / 3) * 0.16) * (o.rtl ? -1 : 1), oy = ((i % 3) - 1) * h * 0.16;
        k.style.translate = `calc(-50% + ${ox.toFixed(1)}px) calc(-50% + ${oy.toFixed(1)}px) ${z.toFixed(1)}px`;
        k.style.opacity = opacityAt(z).toFixed(3);
      });
    };
    place();
    const tw = gsap.to(at, { p: 1, ease: "none", onUpdate: place, scrollTrigger: { trigger: el, start: "top top", end: `+=${o.length ?? 300}%`, pin: true, scrub: 0.8, invalidateOnRefresh: true } });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); clear(kids, ["translate", "opacity"]); el.removeAttribute("data-pt-depth"); };
  }

  if (kind === "through") {
    // Held in its section (or the place that holds it), it grows from its middle until the page is inside it.
    const holder = el.closest<HTMLElement>("section[data-tree-node], .pt-section") ?? el.parentElement ?? el;
    const others = kidsOf(holder).filter((k) => k !== el && !k.contains(el));
    el.style.transformOrigin = "50% 54%";
    gsap.set(others, { autoAlpha: 0, y: 40 });
    const at = { p: 0 };
    const tl = gsap.timeline({ scrollTrigger: { trigger: holder, start: "top top", end: `+=${o.length ?? 250}%`, pin: holder, scrub: 0.6, invalidateOnRefresh: true } });
    tl.to(at, { p: 1, ease: "power2.in", duration: 0.75, onUpdate: () => { el.style.scale = (1 + at.p * 37).toFixed(3); } }, 0);
    tl.to(el, { autoAlpha: 0, duration: 0.12 }, 0.68);
    if (others.length) tl.to(others, { autoAlpha: 1, y: 0, duration: 0.15, stagger: 0.03 }, 0.72);
    tl.to({}, { duration: 0.1 });
    return () => { tl.scrollTrigger?.kill(); tl.kill(); gsap.set(others, { clearProps: "opacity,visibility,transform" }); gsap.set(el, { clearProps: "opacity,visibility" }); clear([el], ["scale", "transform-origin"]); };
  }

  // timeline
  const kids = kidsOf(el);
  el.setAttribute("data-pt-timeline", "");
  const line = document.createElement("span");
  line.className = "pt-tl-line";
  line.setAttribute("aria-hidden", "true");
  el.appendChild(line);
  const tw = gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 60%", end: "bottom 60%", scrub: 0.4 } });
  const lights = kids.map((k) => ScrollTrigger.create({ trigger: k, start: "top 62%", onEnter: () => k.classList.add("pt-tl-on"), onLeaveBack: () => k.classList.remove("pt-tl-on") }));
  return () => {
    tw.scrollTrigger?.kill();
    tw.kill();
    lights.forEach((t) => t.kill());
    kids.forEach((k) => k.classList.remove("pt-tl-on"));
    line.remove();
    el.removeAttribute("data-pt-timeline");
  };
}
