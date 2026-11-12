"use client";
import Link from "next/link";
import { watchNear } from "@/lib/watchNear";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { moodOf, type Mood } from "@/lib/categoryMood";
import { cityPoint, CITY_BOUNDS } from "@/lib/cityPoints";
import { formatMoney } from "@/lib/catalog";
import type { DeliverySettings } from "@/lib/delivery";
import { tr } from "@/lib/words";
import { collectionSeeds, photoColour, sceneTheme } from "@/lib/sceneColour";
import { useLanguage } from "./Language";
import { DRAWINGS } from "./RoseProductBackdrop";

/** `themeColor`: the colour the owner gave the collection, if any. */
export type WorldCollection = { label: string; href: string; imageUrl?: string | null; themeColor?: string | null };

/*
 * The store's world (rose-wonders.css, "the world"): a map to explore by dragging (and zooming with the
 * buttons, a pinch, or Ctrl+wheel), with clouds drifting over it. Two maps:
 * - the collections, as islands on a soft sea, each with its picture and its mood's drawing; a tap flies
 *   to it and opens its card;
 * - the delivery, the cities from the delivery settings where they are, routes from the store, and each
 *   city's price; a tap opens its card. Cities the map doesn't know are listed beside it with their price.
 * A hint shows how to move until the first touch. The wheel alone still scrolls the page.
 * Each island's land is in its collection's colour (its photo's, else its mood's); a tap on one washes the sea
 * and dresses the page (the header too) in that colour while the map is in view (lib/sceneColour.ts).
 */
const W = 1600, H = 1000;
type View = { x: number; y: number; z: number };

const rand = (s: number) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
/** A soft island outline (closed, smooth), seeded. */
function islandPath(seed: number, r: number) {
  const pts = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const k = r * (0.78 + rand(seed + i) * 0.36);
    return [Math.cos(a) * k * 1.25, Math.sin(a) * k * 0.82] as const;
  });
  const mid = (a: readonly number[], b: readonly number[]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(pts[8], pts[0]).join(" ")}`;
  for (let i = 0; i < 9; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % 9]); d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`; }
  return `${d}Z`;
}
const MOOD_TINT: Record<Mood, string> = { winter: "#cbd9f2", spring: "#ffd9bd", incense: "#ecd2b2", accessories: "#f3e2b8", kids: "#f3d4ee", prayer: "#d4e6d4", hijab: "#f6d3e0", dresses: "#f2cfdc", default: "#efd6e2" };

export function RoseWorld({ collections, delivery, currencyCode, title }: { collections: WorldCollection[]; delivery: DeliverySettings | null; currencyCode?: string | null; title?: string }) {
  const { language: lang } = useLanguage();
  const frame = useRef<HTMLDivElement>(null);
  const hasDelivery = Boolean(delivery && delivery.zones.length);
  const [mode, setMode] = useState<"collections" | "delivery">(collections.length ? "collections" : "delivery");
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 0.5 });
  const [picked, setPicked] = useState<number | null>(null);
  const [hint, setHint] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const section = useRef<HTMLElement>(null);
  // Each collection's colour: the same as in the collections story (the owner's, else its photo's, else its kind's).
  const [photos, setPhotos] = useState<Array<string | null>>([]);
  useEffect(() => {
    let live = true;
    void Promise.all(collections.slice(0, 10).map((c) => (c.themeColor ? Promise.resolve(null) : photoColour(c.imageUrl)))).then((found) => { if (live) setPhotos(found); });
    return () => { live = false; };
  }, [collections]);
  const isleColours = useMemo(() => collectionSeeds(collections.slice(0, 10).map((c) => ({ label: c.label, href: c.href, themeColor: c.themeColor ?? undefined })), photos), [collections, photos]);
  const fit = useRef(0.5);
  const viewRef = useRef(view);
  viewRef.current = view;

  // The islands, around the middle of the sea.
  const islands = useMemo(() => {
    const placed = collections.slice(0, 10).map((c, i) => {
      const a = i * 2.39996 + 0.6;
      const r = 150 + 210 * Math.sqrt(i / Math.max(1, collections.length - 1));
      const mood = moodOf([c.label, c.href]);
      // A wide band on a computer; on a phone's tall frame, more of a column.
      return { ...c, mood, x: W / 2 + Math.cos(a) * r * (narrow ? 0.7 : 1.55), y: H / 2 + Math.sin(a) * r * (narrow ? 1.1 : 0.85), size: 92 + rand(i + 3) * 26, seed: i * 7 + 1 };
    });
    // The archipelago in the middle of the sea, whatever the spiral's turn.
    if (!placed.length) return placed;
    const xs = placed.map((p) => p.x), ys = placed.map((p) => p.y);
    const dx = W / 2 - (Math.min(...xs) + Math.max(...xs)) / 2, dy = H / 2 - (Math.min(...ys) + Math.max(...ys)) / 2;
    return placed.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
  }, [collections, narrow]);

  // A picked island dresses the page in its colour while the map is in view; closing it, or leaving, gives it back.
  const pickedColour = mode === "collections" && picked != null ? (isleColours[picked] ?? MOOD_TINT[islands[picked]?.mood ?? "default"]) : null;
  const theme = useRef<ReturnType<typeof sceneTheme>>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    theme.current = sceneTheme(el, "world");
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    // Its routes and clouds move only near the screen (lib/watchNear.ts).
    const offNear = watchNear(el);
    return () => { io.disconnect(); offNear(); theme.current?.giveBack(true); theme.current = null; };
  }, []);
  useEffect(() => {
    if (pickedColour && inView) theme.current?.wear(pickedColour, 0.8);
    else theme.current?.giveBack();
  }, [pickedColour, inView]);

  // The delivery cities where they are (a city the map doesn't know is only listed).
  const map = useMemo(() => {
    if (!delivery) return { pins: [] as Array<{ city: string; zone: string; fee: number; x: number; y: number }>, unplaced: [] as Array<{ zone: string; fee: number; cities: string[] }>, origin: null as null | { x: number; y: number; city: string } };
    const latSpan = CITY_BOUNDS.north - CITY_BOUNDS.south, lngSpan = (CITY_BOUNDS.east - CITY_BOUNDS.west) * Math.cos((31.8 * Math.PI) / 180);
    const k = Math.min((W * 0.8) / lngSpan, (H * 0.88) / latSpan);
    const ox = (W - lngSpan * k) / 2, oy = (H - latSpan * k) / 2;
    const place = (lat: number, lng: number) => ({ x: ox + (lng - CITY_BOUNDS.west) * Math.cos((31.8 * Math.PI) / 180) * k, y: oy + (CITY_BOUNDS.north - lat) * k });
    const pins: Array<{ city: string; zone: string; fee: number; x: number; y: number }> = [];
    const unplaced: Array<{ zone: string; fee: number; cities: string[] }> = [];
    for (const z of delivery.zones) {
      const missing: string[] = [];
      for (const city of z.cities) {
        const at = cityPoint(city);
        if (at) pins.push({ city, zone: z.name, fee: z.fee, ...place(at[0], at[1]) });
        else missing.push(city);
      }
      if (missing.length || !z.cities.length) unplaced.push({ zone: z.name, fee: z.fee, cities: missing });
    }
    const home = pins.find((p) => /القدس|jerusalem/i.test(p.city)) ?? pins[0] ?? null;
    return { pins, unplaced, origin: home ? { x: home.x, y: home.y, city: home.city } : null };
  }, [delivery]);

  // The first view: the islands (or the cities) filling the frame, never closer than 2.4× the whole world.
  const places = mode === "collections" ? islands : map.pins;
  const reset = useCallback(() => {
    const el = frame.current;
    if (!el) return;
    const world = Math.min(el.clientWidth / W, el.clientHeight / H) * 1.02;
    fit.current = world;
    let box = { x0: 0, y0: 0, x1: W, y1: H };
    if (places.length) {
      const pad = mode === "collections" ? 190 : 110;
      box = { x0: Math.min(...places.map((p) => p.x)) - pad, x1: Math.max(...places.map((p) => p.x)) + pad, y0: Math.min(...places.map((p) => p.y)) - pad, y1: Math.max(...places.map((p) => p.y)) + pad };
    }
    const z = Math.min(world * 2.4, Math.max(world, Math.min(el.clientWidth / (box.x1 - box.x0), el.clientHeight / (box.y1 - box.y0))));
    setView({ z, x: el.clientWidth / 2 - ((box.x0 + box.x1) / 2) * z, y: el.clientHeight / 2 - ((box.y0 + box.y1) / 2) * z });
    setPicked(null);
  }, [places, mode]);
  useEffect(() => { reset(); window.addEventListener("resize", reset); return () => window.removeEventListener("resize", reset); }, [reset]);
  useEffect(() => {
    const look = () => setNarrow((frame.current?.clientWidth ?? 1000) < 600);
    look();
    window.addEventListener("resize", look);
    return () => window.removeEventListener("resize", look);
  }, []);
  useEffect(() => { const t = window.setTimeout(() => setHint(false), 7000); return () => window.clearTimeout(t); }, []);

  const clamp = (v: View): View => {
    const el = frame.current;
    if (!el) return v;
    const z = Math.min(fit.current * 4, Math.max(fit.current * 0.8, v.z));
    const margin = 120;
    const minX = el.clientWidth - W * z - margin, maxX = margin;
    const minY = el.clientHeight - H * z - margin, maxY = margin;
    return { z, x: Math.min(Math.max(v.x, Math.min(minX, maxX)), Math.max(minX, maxX)), y: Math.min(Math.max(v.y, Math.min(minY, maxY)), Math.max(minY, maxY)) };
  };
  const zoomAt = (factor: number, cx?: number, cy?: number) => {
    const el = frame.current;
    if (!el) return;
    const v = viewRef.current;
    const px = cx ?? el.clientWidth / 2, py = cy ?? el.clientHeight / 2;
    const z = Math.min(fit.current * 4, Math.max(fit.current * 0.8, v.z * factor));
    const k = z / v.z;
    setView(clamp({ z, x: px - (px - v.x) * k, y: py - (py - v.y) * k }));
  };
  // Fly to a place on the world (an island, a city).
  const flyTo = (x: number, y: number, zoom = 1.7) => {
    const el = frame.current;
    if (!el) return;
    const z = fit.current * zoom;
    setView(clamp({ z, x: el.clientWidth / 2 - x * z, y: el.clientHeight * 0.42 - y * z }));
  };

  // Drag to move (with a little glide), two fingers to zoom, Ctrl+wheel to zoom.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number; t: number } | null = null;
    let vel = { x: 0, y: 0 };
    let glide = 0;
    let pinch = 0;
    let mid: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      if ((e.target as Element).closest("button, a")) return;
      setHint(false);
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelAnimationFrame(glide);
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
      el.dataset.dragging = "true";
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const r = el.getBoundingClientRect();
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        // Two fingers move the map and zoom it (on a phone one finger up or down scrolls the page).
        if (mid) { const v = viewRef.current; setView(clamp({ ...v, x: v.x + m.x - mid.x, y: v.y + m.y - mid.y })); }
        if (pinch) zoomAt(d / pinch, m.x - r.left, m.y - r.top);
        pinch = d;
        mid = m;
        return;
      }
      if (!last) return;
      const now = performance.now();
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      vel = { x: dx / Math.max(1, now - last.t), y: dy / Math.max(1, now - last.t) };
      last = { x: e.clientX, y: e.clientY, t: now };
      const v = viewRef.current;
      setView(clamp({ ...v, x: v.x + dx, y: v.y + dy }));
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size) return;
      delete el.dataset.dragging;
      last = null;
      pinch = 0;
      mid = null;
      // A short glide after letting go.
      const step = () => {
        vel = { x: vel.x * 0.92, y: vel.y * 0.92 };
        if (Math.abs(vel.x) + Math.abs(vel.y) < 0.02) return;
        const v = viewRef.current;
        setView(clamp({ ...v, x: v.x + vel.x * 16, y: v.y + vel.y * 16 }));
        glide = requestAnimationFrame(step);
      };
      glide = requestAnimationFrame(step);
    };
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; // the wheel alone scrolls the page
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.004), e.clientX - r.left, e.clientY - r.top);
    };
    const key = (e: KeyboardEvent) => {
      const v = viewRef.current;
      const step = 60;
      if (e.key === "ArrowLeft") setView(clamp({ ...v, x: v.x + step }));
      else if (e.key === "ArrowRight") setView(clamp({ ...v, x: v.x - step }));
      else if (e.key === "ArrowUp") setView(clamp({ ...v, y: v.y + step }));
      else if (e.key === "ArrowDown") setView(clamp({ ...v, y: v.y - step }));
      else if (e.key === "+" || e.key === "=") zoomAt(1.25);
      else if (e.key === "-") zoomAt(0.8);
      else return;
      e.preventDefault();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(glide);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const money = (n: number) => formatMoney(n, currencyCode ?? null);
  const card = picked == null ? null : mode === "collections" ? islands[picked] : map.pins[picked];
  const showTabs = hasDelivery && collections.length > 0;

  return (
    <section ref={section} className="rose-world" data-mode={mode} data-dressed={pickedColour ? "true" : undefined} aria-label={title || tr(lang, "عالم المتجر", "The store's world")}>
      <header className="rose-world-head">
        <span className="atelier-eyebrow">{tr(lang, "عالم المتجر", "THE STORE'S WORLD")}</span>
        <h2>{title || (mode === "collections" ? tr(lang, "تجوّلي بين المجموعات.", "Wander through the collections.") : tr(lang, "لوين بنوصّل، وبقديش.", "Where we deliver, and for how much."))}</h2>
        {showTabs ? (
          <div className="rose-world-tabs" role="tablist" aria-label={tr(lang, "الخريطة", "The map")}>
            <button type="button" role="tab" aria-selected={mode === "collections"} onClick={() => setMode("collections")}>{tr(lang, "المجموعات", "Collections")}</button>
            <button type="button" role="tab" aria-selected={mode === "delivery"} onClick={() => setMode("delivery")}>{tr(lang, "التوصيل", "Delivery")}</button>
          </div>
        ) : null}
      </header>
      <div className="rose-world-body">
        <div ref={frame} className="rose-world-frame" tabIndex={0} aria-label={tr(lang, "خريطة: اسحبي للتنقل، وكبّري بالأزرار", "Map: drag to move, zoom with the buttons")} style={{ "--pan-x": `${view.x}px`, "--pan-y": `${view.y}px` } as CSSProperties}>
          <span className="rose-world-wash" aria-hidden="true" />
          <div className="rose-world-map" dir="ltr" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
            {mode === "collections" ? (
              <>
                <svg className="rose-world-routes" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
                  {islands.slice(1).map((isle, i) => {
                    const from = islands[i];
                    const mx = (from.x + isle.x) / 2 + (isle.y - from.y) * 0.2, my = (from.y + isle.y) / 2 - (isle.x - from.x) * 0.2;
                    return <path key={i} d={`M${from.x} ${from.y}Q${mx} ${my} ${isle.x} ${isle.y}`} />;
                  })}
                </svg>
                {islands.map((isle, i) => (
                  <button key={isle.href + i} type="button" className="rose-island" data-picked={picked === i || undefined}
                    style={{ left: isle.x, top: isle.y, "--isle": isleColours[i] ? `color-mix(in srgb, ${isleColours[i]} 55%, #fff)` : MOOD_TINT[isle.mood], "--s": isle.size / 100 } as CSSProperties}
                    onClick={() => { setPicked(i); flyTo(isle.x, isle.y); }} aria-label={isle.label}>
                    <svg className="rose-island-land" viewBox="-160 -110 320 220" aria-hidden="true"><path d={islandPath(isle.seed, 100)} /></svg>
                    <svg className="rose-island-mark" viewBox="0 0 48 48" aria-hidden="true">{DRAWINGS[isle.mood][0]}</svg>
                    {isle.imageUrl ? <span className="rose-island-photo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={isle.imageUrl} alt="" loading="lazy" draggable={false} /></span> : null}
                    <span className="rose-island-name">{isle.label}</span>
                  </button>
                ))}
              </>
            ) : (
              <>
                <svg className="rose-world-routes rose-world-roads" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
                  {map.origin ? map.pins.filter((p) => p.city !== map.origin!.city).map((p, i) => {
                    const o = map.origin!;
                    const mx = (o.x + p.x) / 2 + (p.y - o.y) * 0.15, my = (o.y + p.y) / 2 - (p.x - o.x) * 0.15;
                    return <path key={i} d={`M${o.x} ${o.y}Q${mx} ${my} ${p.x} ${p.y}`} />;
                  }) : null}
                </svg>
                {map.pins.map((p, i) => (
                  <button key={p.city + i} type="button" className="rose-pin" data-home={map.origin?.city === p.city || undefined} data-picked={picked === i || undefined}
                    style={{ left: p.x, top: p.y } as CSSProperties} onClick={() => { setPicked(i); flyTo(p.x, p.y, 2.2); }} aria-label={`${p.city}: ${money(p.fee)}`}>
                    <span className="rose-pin-dot" aria-hidden="true" />
                    <span className="rose-pin-name">{p.city}</span>
                    <span className="rose-pin-fee">{money(p.fee)}</span>
                  </button>
                ))}
              </>
            )}
          </div>
          <span className="rose-world-clouds" aria-hidden="true"><i /><i /><i /></span>
          {hint ? (
            <span className="rose-world-hint" aria-hidden="true">
              <svg viewBox="0 0 48 48"><path d="M20 30V14a3 3 0 0 1 6 0v12m0-4a3 3 0 0 1 6 0v6m0-2a3 3 0 0 1 6 0v8c0 7-5 12-12 12h-2c-5 0-8-2-11-6l-5-7a3 3 0 0 1 5-4l3 3" /></svg>
              {tr(lang, "اسحبي للتنقل", "Drag to explore")}
            </span>
          ) : null}
          <div className="rose-world-zoom">
            <button type="button" onClick={() => zoomAt(1.3)} aria-label={tr(lang, "تكبير", "Zoom in")}>+</button>
            <button type="button" onClick={() => zoomAt(0.77)} aria-label={tr(lang, "تصغير", "Zoom out")}>−</button>
            <button type="button" onClick={reset} aria-label={tr(lang, "رجوع للخريطة كاملة", "Back to the whole map")}>⤢</button>
          </div>
          {card ? (
            <div className="rose-world-card" role="status">
              {"label" in card ? (
                <>
                  {card.imageUrl ? <span className="rose-world-card-photo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={card.imageUrl} alt="" /></span> : null}
                  <div>
                    <strong>{card.label}</strong>
                    <Link href={card.href} className="atelier-text-link">{tr(lang, "ادخلي المجموعة", "Enter the collection")}</Link>
                  </div>
                </>
              ) : (
                <div>
                  <strong>{card.city}</strong>
                  <span>{card.zone} · {money(card.fee)}</span>
                  {delivery?.freeOver != null ? <small>{tr(lang, `التوصيل مجاني فوق ${money(delivery.freeOver)}`, "Free delivery over {0}", [money(delivery.freeOver)])}</small> : null}
                </div>
              )}
              <button type="button" className="rose-world-card-close" onClick={() => setPicked(null)} aria-label={tr(lang, "إغلاق", "Close")}>✕</button>
            </div>
          ) : null}
        </div>
        {mode === "delivery" && delivery ? (
          <aside className="rose-world-legend">
            <h3>{tr(lang, "أسعار التوصيل", "Delivery prices")}</h3>
            <ul>
              {delivery.zones.map((z) => (
                <li key={z.id}><strong>{z.name}</strong><span>{money(z.fee)}</span>{z.cities.length ? <small>{z.cities.join("، ")}</small> : null}</li>
              ))}
              {delivery.defaultFee != null ? <li><strong>{tr(lang, "باقي المناطق", "Everywhere else")}</strong><span>{money(delivery.defaultFee)}</span></li> : null}
            </ul>
            {delivery.freeOver != null ? <p className="rose-world-free">{tr(lang, `🎁 التوصيل مجاني فوق ${money(delivery.freeOver)}`, "🎁 Free delivery over {0}", [money(delivery.freeOver)])}</p> : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
