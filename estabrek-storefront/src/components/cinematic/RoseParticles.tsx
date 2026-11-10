"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cldUrl } from "@/lib/cloudinary";
import { tr } from "@/lib/words";
import { useLanguage } from "./Language";

/*
 * Particles that become the store's logo, then a hijab, then a bag as the page scrolls (rose-wonders.css,
 * "the particles"): the section holds the screen; between two shapes the points scatter into a soft cloud and
 * gather again; the pointer pushes them aside. The logo is the store's own (its picture's shape, or its name
 * when there is no picture); the hijab and the bag are drawn here. A 2D canvas: light enough for phones.
 */
type Shape = Float32Array; // x0,y0,x1,y1… in -1…1

const HIJAB = "M100 14C69 14 50 38 50 70c0 22 8 38 15 48-19 14-38 42-42 82l-2 30h158l-2-30c-4-40-23-68-42-82 7-10 15-26 15-48 0-32-19-56-50-56ZM100 46c-15 0-24 13-24 30 0 19 10 32 24 32s24-13 24-32c0-17-9-30-24-30Z";
const BAG_BODY = "M36 84h128l12 146H24Z";
const BAG_HANDLE = "M68 86c0-46 64-46 64 0";
const BAG_HEART = "M100 196s-30-18-30-38a14 14 0 0 1 30-6 14 14 0 0 1 30 6c0 20-30 38-30 38Z";

/** Points spread over a drawn shape (its filled pixels), n of them, centred in -1…1. */
function sample(draw: (ctx: CanvasRenderingContext2D, size: number) => void, n: number): Shape {
  const size = 220;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  draw(ctx, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const filled: number[] = [];
  for (let y = 0; y < size; y += 2) for (let x = 0; x < size; x += 2) if (data[(y * size + x) * 4 + 3] > 120) filled.push(x, y);
  const out = new Float32Array(n * 2);
  const count = filled.length / 2;
  for (let i = 0; i < n; i++) {
    const k = count ? Math.floor(Math.random() * count) : 0;
    out[i * 2] = count ? (filled[k * 2] + Math.random() * 2) / size * 2 - 1 : (Math.random() * 2 - 1) * 0.6;
    out[i * 2 + 1] = count ? (filled[k * 2 + 1] + Math.random() * 2) / size * 2 - 1 : (Math.random() * 2 - 1) * 0.6;
  }
  return out;
}

const drawPath = (paths: Array<{ d: string; stroke?: number; rule?: CanvasFillRule }>) => (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.save();
  ctx.translate(size * 0.06, size * 0.02);
  ctx.scale((size * 0.88) / 200, (size * 0.88) / 240);
  ctx.fillStyle = ctx.strokeStyle = "#000";
  for (const p of paths) {
    const path = new Path2D(p.d);
    if (p.stroke) { ctx.lineWidth = p.stroke; ctx.lineCap = "round"; ctx.stroke(path); }
    else ctx.fill(path, p.rule ?? "nonzero");
  }
  ctx.restore();
};

function loadLogo(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = cldUrl(url, { w: 440 });
  });
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export function RoseParticles({ logoUrl, storeName }: { logoUrl?: string | null; storeName: string }) {
  const { language: lang } = useLanguage();
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [chapter, setChapter] = useState(0);
  const chapters = [
    { title: storeName, line: tr(lang, "أناقة تليق بكِ.", "Elegance that suits you.") },
    { title: tr(lang, "حجابات بكل لون.", "Hijabs in every colour."), line: tr(lang, "قماش ناعم، ألوان بتشبهكِ.", "Soft fabrics, colours that feel like you.") },
    { title: tr(lang, "وبكبسة بتوصلك.", "One tap, and it's on its way."), line: tr(lang, "اختاري، أضيفي للحقيبة، وخلّي الباقي علينا.", "Pick, add to your bag, and leave the rest to us.") },
  ];

  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 760px)").matches;
    const n = phone ? 900 : 1700;
    let shapes: Shape[] = [];
    let raf = 0;
    let visible = false;
    let shown = -1;
    let w = 0, h = 0, dpr = 1;
    const px = new Float32Array(n), py = new Float32Array(n), vx = new Float32Array(n), vy = new Float32Array(n);
    const size = new Float32Array(n), tone = new Float32Array(n), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { size[i] = 0.6 + Math.random() * 1.6; tone[i] = Math.random(); seed[i] = Math.random() * Math.PI * 2; }
    const pointer = { x: -9999, y: -9999 };
    let light = "#fde6ef", deep = "#e8a8c3";
    const readColours = () => {
      const cs = getComputedStyle(el);
      light = cs.getPropertyValue("--selection-soft").trim() || "#fde6ef";
      deep = cs.getPropertyValue("--selection-decorative").trim() || cs.getPropertyValue("--selection-seed").trim() || "#e8a8c3";
    };
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const nw = cv.clientWidth, nh = cv.clientHeight;
      if (!nw || !nh || (nw === w && nh === h)) return;
      // A first real size: the points start as a cloud there.
      if (!w) for (let i = 0; i < n; i++) { px[i] = nw / 2 + (Math.random() - 0.5) * nw * 0.8; py[i] = nh / 2 + (Math.random() - 0.5) * nh * 0.8; }
      w = nw; h = nh;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    readColours();
    // Its own size, watched (the page may still be laying out when this starts).
    const sized = new ResizeObserver(resize);
    sized.observe(cv);

    void loadLogo(logoUrl).then((img) => {
      const logo = sample((c, s) => {
        if (img) {
          const k = Math.min(s / img.width, s / img.height) * 0.92;
          c.drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k);
        } else {
          c.fillStyle = "#000"; c.textAlign = "center"; c.textBaseline = "middle";
          c.font = `700 ${Math.round(s / Math.max(3, storeName.length * 0.62))}px serif`;
          c.fillText(storeName, s / 2, s / 2);
        }
      }, n);
      shapes = [logo, sample(drawPath([{ d: HIJAB, rule: "evenodd" }]), n), sample(drawPath([{ d: BAG_BODY }, { d: BAG_HANDLE, stroke: 12 }, { d: BAG_HEART }]), n)];
      if (!raf && visible) raf = requestAnimationFrame(frame);
      if (reduced) frame(performance.now());
    });

    // Where the scroll is in the section: 0 … chapters-1, with each shape held for a while.
    const position = () => {
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / span));
      return p * (shapes.length - 1 || 2);
    };
    let last = performance.now();
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!shapes.length) return;
      if (!w) { if (visible) raf = requestAnimationFrame(frame); return; }
      const at = position();
      const a = Math.min(shapes.length - 1, Math.floor(at));
      const b = Math.min(shapes.length - 1, a + 1);
      // Each shape holds, then the points scatter and gather into the next.
      const local = at - a;
      const t = smooth(Math.min(1, Math.max(0, (local - 0.35) / 0.4)));
      const scatter = Math.sin(Math.PI * t) * (phone ? 70 : 120);
      const lead = Math.round(at);
      if (lead !== shown) { shown = lead; setChapter(lead); }
      const scale = Math.min(w, h) * (phone ? 0.4 : 0.36);
      const cx = w / 2, cy = h * (phone ? 0.42 : 0.46);
      const time = now / 1000;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        const sa = shapes[a], sb = shapes[b];
        let tx = cx + (sa[i * 2] + (sb[i * 2] - sa[i * 2]) * t) * scale;
        let ty = cy + (sa[i * 2 + 1] + (sb[i * 2 + 1] - sa[i * 2 + 1]) * t) * scale;
        tx += Math.cos(seed[i] + time * 0.6) * (3 + scatter * tone[i]);
        ty += Math.sin(seed[i] * 1.3 + time * 0.5) * (3 + scatter * (1 - tone[i]));
        // The pointer pushes them aside.
        const dx = px[i] - pointer.x, dy = py[i] - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 9000) { const f = (9000 - d2) / 9000 * 900; const d = Math.sqrt(d2) || 1; vx[i] += (dx / d) * f * dt; vy[i] += (dy / d) * f * dt; }
        // A firm pull and a soft brake: the points gather into the shape in about a second.
        vx[i] += (tx - px[i]) * (reduced ? 1 : 15) * dt;
        vy[i] += (ty - py[i]) * (reduced ? 1 : 15) * dt;
        vx[i] *= reduced ? 0 : 0.8; vy[i] *= reduced ? 0 : 0.8;
        if (reduced) { px[i] = tx; py[i] = ty; } else { px[i] += vx[i] * dt * 10; py[i] += vy[i] * dt * 10; }
        ctx.fillStyle = tone[i] > 0.72 ? deep : light;
        ctx.globalAlpha = 0.55 + tone[i] * 0.45;
        ctx.fillRect(px[i], py[i], size[i], size[i]);
      }
      ctx.globalAlpha = 1;
      if (visible && !reduced) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf && shapes.length) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    io.observe(el);
    const onScroll = () => { if (reduced && visible) frame(performance.now()); };
    const onMove = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; };
    const onLeave = () => { pointer.x = pointer.y = -9999; };
    const colours = window.setInterval(readColours, 900);
    window.addEventListener("scroll", onScroll, { passive: true });
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.clearInterval(colours);
      sized.disconnect();
      window.removeEventListener("scroll", onScroll);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerleave", onLeave);
    };
  }, [logoUrl, storeName]);

  return (
    <section ref={root} className="rose-particles" style={{ "--rp-n": chapters.length } as CSSProperties} aria-label={tr(lang, "حكاية المتجر", "The store's story")}>
      <div className="rose-particles-stage">
        <canvas ref={canvas} className="rose-particles-canvas" aria-hidden="true" />
        <div className="rose-particles-words" key={chapter} aria-live="polite">
          <h2>{chapters[chapter]?.title}</h2>
          <p>{chapters[chapter]?.line}</p>
        </div>
        <ol className="rose-particles-pill" aria-hidden="true">
          {chapters.map((c, i) => <li key={i} data-on={i === chapter || undefined}><span>{String(i + 1).padStart(2, "0")}</span></li>)}
        </ol>
      </div>
    </section>
  );
}
