/**
 * Words' live effects from the theme library (its Premium "Proximity Type" and "Particle Text"), for any heading or
 * text of the page tree (motion.fx "proximity" or "particles", TreeMotion runs them):
 * - proximity: each letter (an Arabic word, so its letters stay joined) grows, thickens and takes the effect's colour
 *   as the pointer comes near it;
 * - particles: its words drawn in particles (where its own letters are, in its own font) that scatter from the pointer
 *   and gather again; a press on it scatters them all. Its words stay in the page, unseen, for readers and search.
 * Each returns what undoes it.
 */

/** A colour as the page paints it (a theme variable, a #hex) read where it's used; "" when there's none. */
export function fxPaint(host: HTMLElement, css: string | null): string {
  if (!css) return "";
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  probe.style.color = css;
  host.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}

/** The effect's own colour (its layer's --pt-fxc, css.ts), as the page paints it. */
export function fxColour(el: HTMLElement): string {
  const layer = el.querySelector<HTMLElement>(":scope > .pt-fx");
  if (!layer) return "";
  const raw = getComputedStyle(layer).getPropertyValue("--pt-fxc").trim();
  return raw ? fxPaint(el, raw) : "";
}

export function proximity(el: HTMLElement, parts: HTMLElement[], tint: string, reach = 260): () => void {
  const base = Number(getComputedStyle(el).fontWeight) || 400;
  for (const p of parts) {
    p.style.display = "inline-block";
    p.style.transformOrigin = "50% 100%";
    p.style.willChange = "transform";
  }
  let mx = -1e5, my = -1e5, raf = 0;
  const frame = () => {
    raf = 0;
    // Read every place first, then write.
    const rects = parts.map((p) => p.getBoundingClientRect());
    parts.forEach((p, i) => {
      const r = rects[i];
      let f = Math.max(0, 1 - Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my) / reach);
      f = f * f * (3 - 2 * f);
      p.style.fontWeight = f > 0.01 ? String(Math.min(900, Math.round((base + f * 400) / 100) * 100)) : "";
      p.style.transform = f > 0.01 ? `translateY(${(-f * 0.18).toFixed(3)}em) scaleY(${(1 + f * 0.35).toFixed(3)})` : "";
      p.style.color = f > 0.02 && tint ? `color-mix(in oklab, ${tint} ${Math.round(f * 100)}%, currentColor)` : "";
      p.style.textShadow = f > 0.3 && tint ? `0 0 ${Math.round(f * 30)}px ${tint}` : "";
    });
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; ask(); };
  const onAway = () => { mx = my = -1e5; ask(); };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("scroll", ask, { passive: true });
  document.documentElement.addEventListener("pointerleave", onAway);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("scroll", ask);
    document.documentElement.removeEventListener("pointerleave", onAway);
    for (const p of parts) for (const k of ["display", "transform-origin", "will-change", "font-weight", "transform", "color", "text-shadow"]) p.style.removeProperty(k);
  };
}

type Dot = { x: number; y: number; vx: number; vy: number; tx: number; ty: number };

/** `pieces`: its letters (an Arabic text's words) as they're laid out, to draw them where they are. */
export function particles(el: HTMLElement, pieces: () => { parts: HTMLElement[]; done: () => void }, tint: string, tint2: string): () => void {
  const pad = 48;
  const canvas = document.createElement("canvas");
  canvas.className = "pt-fx-dots";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `position:absolute;inset:-${pad}px;width:calc(100% + ${pad * 2}px);height:calc(100% + ${pad * 2}px);pointer-events:none;z-index:1`;
  const moved = getComputedStyle(el).position === "static";
  if (moved) el.style.position = "relative";
  const ink = tint || getComputedStyle(el).color;
  el.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let dots: Dot[] = [];
  let w = 0, h = 0, raf = 0, live = true, near = true;
  let mx = -1e5, my = -1e5, blast = false;
  /** Where its words are, drawn on a hidden canvas in their own font, sampled every few pixels. */
  const sample = () => {
    const box = el.getBoundingClientRect();
    w = Math.round(box.width + pad * 2);
    h = Math.round(box.height + pad * 2);
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const off = document.createElement("canvas");
    off.width = Math.max(1, w);
    off.height = Math.max(1, h);
    const o = off.getContext("2d");
    if (!o) return;
    // Splitting its words and putting them back rebuilds what it holds from its saved markup: the canvas steps out
    // meanwhile, or the one drawn on would no longer be the one on the page.
    canvas.remove();
    const { parts, done } = pieces();
    let size = 16;
    for (const p of parts) {
      const r = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      size = parseFloat(cs.fontSize) || size;
      o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      o.direction = cs.direction === "rtl" ? "rtl" : "ltr";
      o.textAlign = "center";
      o.textBaseline = "middle";
      o.fillStyle = "#fff";
      o.fillText(p.textContent ?? "", r.left - box.left + pad + r.width / 2, r.top - box.top + pad + r.height / 2);
    }
    done();
    el.appendChild(canvas);
    const data = o.getImageData(0, 0, off.width, off.height).data;
    const gap = Math.max(3, Math.round(size / 16));
    const targets: Array<[number, number]> = [];
    for (let y = 0; y < off.height; y += gap) for (let x = 0; x < off.width; x += gap) if (data[(y * off.width + x) * 4 + 3] > 128) targets.push([x, y]);
    const next: Dot[] = targets.map(([tx, ty], i) => {
      const was = dots[i];
      return was ? { ...was, tx, ty } : { x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0, tx, ty };
    });
    dots = next;
    canvas.dataset.dots = String(dots.length);
  };
  const frame = () => {
    raf = 0;
    if (!live || !ctx) return;
    if (blast) {
      for (const d of dots) { d.vx += (Math.random() - 0.5) * 60; d.vy += (Math.random() - 0.5) * 60; }
      blast = false;
    }
    const box = canvas.getBoundingClientRect();
    const px = mx - box.left, py = my - box.top;
    ctx.clearRect(0, 0, w, h);
    const g = tint2 ? ctx.createLinearGradient(0, 0, w, 0) : null;
    if (g) { g.addColorStop(0, ink); g.addColorStop(1, tint2); }
    ctx.fillStyle = g ?? ink;
    let busy = false;
    for (const d of dots) {
      d.vx += (d.tx - d.x) * 0.045;
      d.vy += (d.ty - d.y) * 0.045;
      const dx = d.x - px, dy = d.y - py, d2 = dx * dx + dy * dy;
      if (d2 < 9000) { const f = (9000 - d2) / 9000; d.vx += dx * f * 0.35; d.vy += dy * f * 0.35; }
      d.vx *= 0.82;
      d.vy *= 0.82;
      d.x += d.vx;
      d.y += d.vy;
      if (Math.abs(d.vx) + Math.abs(d.vy) > 0.05) busy = true;
      ctx.fillRect(d.x, d.y, 2.4, 2.4);
    }
    // Still and the pointer away: it rests until something moves.
    if (busy || d2Near()) raf = requestAnimationFrame(frame);
  };
  const d2Near = () => {
    const r = canvas.getBoundingClientRect();
    return mx > r.left - 100 && mx < r.right + 100 && my > r.top - 100 && my < r.bottom + 100;
  };
  const go = () => { if (!raf && near) raf = requestAnimationFrame(frame); };
  const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; go(); };
  const onDown = () => { blast = true; go(); };
  el.classList.add("pt-fx-dots-on");
  window.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerdown", onDown);
  const io = new IntersectionObserver(([e]) => { near = e.isIntersecting; go(); }, { rootMargin: "100px" });
  io.observe(el);
  let ro: ResizeObserver | null = null;
  // A failed sampling leaves its words as they are (seen), never a blank place.
  const safeSample = () => {
    try {
      sample();
    } catch (e) {
      console.warn("[pt-fx particles]", e);
      el.classList.remove("pt-fx-dots-on");
      if (!canvas.isConnected) el.appendChild(canvas);
    }
  };
  void document.fonts?.ready.then(() => {
    if (!live) return;
    safeSample();
    go();
    ro = new ResizeObserver(() => { safeSample(); go(); });
    ro.observe(el);
  });
  return () => {
    live = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    ro?.disconnect();
    window.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerdown", onDown);
    el.classList.remove("pt-fx-dots-on");
    canvas.remove();
    if (moved) el.style.removeProperty("position");
  };
}
