/**
 * A template drawn small for the gallery: its real words, in the store theme's colours,
 * at a computer's width and zoomed down. Pictures are soft boxes and the store's blocks
 * (products, categories, a map…) their outline; nothing loads from the shop.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import type { ThumbColours } from "./templates/colours";


const WIDTH = 1200;
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const say = (v: unknown, lang: Lang): string => {
  const t = obj(v);
  return String(t[lang] ?? t.ar ?? t.en ?? t.he ?? "");
};
/** A length as the drawing's pixels (a screen's height is 800 here). */
const len = (v: unknown) => (typeof v !== "string" ? undefined : v.endsWith("vh") ? `${parseFloat(v) * 8}px` : v.endsWith("vw") ? `${parseFloat(v) * 12}px` : v);
const JUSTIFY: Obj = { start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around" };
const ALIGN: Obj = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
const SHAPES: Obj = { circle: "50%", pill: "999px", arch: "999px 999px 12px 12px", blob: "42% 58% 55% 45% / 48% 40% 60% 52%", rounded: "28px" };
/** The point of a placed element that sits at its x/y, as % of its own size (the shop's pageTree/css.ts ANCHORS). */
const ANCHORS: Record<string, [number, number]> = { "top-start": [0, 0], top: [50, 0], "top-end": [100, 0], start: [0, 50], center: [50, 50], end: [100, 50], "bottom-start": [0, 100], bottom: [50, 100], "bottom-end": [100, 100] };
const SHADOWS: Obj = { sm: "0 2px 8px rgba(0,0,0,.10)", md: "0 8px 24px rgba(0,0,0,.14)", lg: "0 18px 44px rgba(0,0,0,.20)" };

function css(n: PageTreeNode, c: ThumbColours, rtl = false): CSSProperties {
  const s = obj(obj(n.style).base);
  const paint = (v: unknown): string | undefined => (typeof v !== "string" ? undefined : v.startsWith("#") ? v : v === "white" ? "#ffffff" : v === "black" ? "#000000" : v === "transparent" ? "transparent" : c[v as keyof ThumbColours]);
  const out: CSSProperties = {};
  const pad = Array.isArray(s.pad) ? (s.pad as number[]) : null;
  if (pad) Object.assign(out, { paddingTop: pad[0], paddingInlineEnd: pad[1], paddingBottom: pad[2], paddingInlineStart: pad[3] });
  const margin = Array.isArray(s.margin) ? (s.margin as number[]) : null;
  if (margin) Object.assign(out, { marginTop: margin[0], marginInlineEnd: margin[1], marginBottom: margin[2], marginInlineStart: margin[3] });
  if (s.bg) out.background = paint(s.bg);
  if (s.color) out.color = paint(s.color);
  const fill = obj(s.fill);
  if (fill.color) Object.assign(out, { background: `linear-gradient(${num(fill.angle) ?? 90}deg, ${paint(fill.color)}, ${paint(fill.to)})`, WebkitBackgroundClip: "text", color: "transparent" });
  if (num(s.size)) out.fontSize = num(s.size);
  if (num(s.weight)) out.fontWeight = num(s.weight);
  if (num(s.lineHeight)) out.lineHeight = num(s.lineHeight);
  if (typeof s.textAlign === "string") out.textAlign = s.textAlign as CSSProperties["textAlign"];
  if (s.italic === true) out.fontStyle = "italic";
  if (num(s.opacity) !== undefined) out.opacity = num(s.opacity);
  if (num(s.radius) !== undefined) out.borderRadius = num(s.radius);
  if (typeof s.shape === "string" && SHAPES[s.shape]) out.borderRadius = SHAPES[s.shape] as string;
  const border = obj(s.border);
  if (num(border.width)) out.border = `${num(border.width)}px ${String(border.style ?? "solid")} ${paint(border.color)}`;
  for (const k of ["width", "maxWidth", "height", "minHeight"] as const) if (len(s[k])) out[k] = len(s[k]);
  if (typeof s.aspect === "string") out.aspectRatio = s.aspect.replace(/\s/g, "");
  if (num(s.gap) !== undefined) out.gap = num(s.gap);
  if (s.direction === "row") out.flexDirection = "row";
  if (s.wrap === true) out.flexWrap = "wrap";
  if (typeof s.justify === "string") out.justifyContent = JUSTIFY[s.justify] as string;
  if (typeof s.align === "string") out.alignItems = ALIGN[s.align] as string;
  if (typeof s.self === "string") out.alignSelf = ALIGN[s.self] as string;
  if (typeof s.col === "string") out.gridColumn = s.col;
  if (typeof s.row === "string") out.gridRow = s.row;
  const pattern = obj(s.pattern);
  if (pattern.kind) {
    out.backgroundImage = `radial-gradient(${paint(pattern.color)} 2px, transparent 2.5px)`;
    out.backgroundSize = `${num(pattern.size) ?? 20}px ${num(pattern.size) ?? 20}px`;
  }
  if (typeof s.shadow === "string" && SHADOWS[s.shadow]) out.boxShadow = SHADOWS[s.shadow] as string;
  if (s.overflow === "hidden" || s.overflow === "clip") out.overflow = "hidden";
  // Where it sits and how it's turned, in one transform: placed by its anchor (the start side follows the language).
  const moves: string[] = [];
  const layer = obj(s.layer);
  if (num(layer.x) !== undefined) {
    const [ax, ay] = ANCHORS[String(layer.anchor ?? "center")] ?? ANCHORS.center;
    Object.assign(out, { position: "absolute", insetInlineStart: `${layer.x}%`, top: `${layer.y}%`, zIndex: 2 });
    moves.push(`translate(${rtl ? ax : -ax}%, ${-ay}%)`);
  }
  if (num(s.moveY)) moves.push(`translateY(${num(s.moveY)}px)`);
  if (num(s.rotateZ)) moves.push(`rotate(${num(s.rotateZ)}deg)`);
  if (moves.length) out.transform = moves.join(" ");
  return out;
}

/** A picture's place: a soft box (dimmed under words over it). */
const Pic = ({ c, style, dim }: { c: ThumbColours; style?: CSSProperties; dim?: boolean }) => (
  <div style={{ width: "100%", aspectRatio: "4/5", borderRadius: 20, background: `linear-gradient(135deg, ${c["accent-soft"]}, ${c.border})`, filter: dim ? "brightness(.55)" : undefined, ...style }} />
);
const boxes = (n: number, c: ThumbColours, item: (i: number) => ReactNode, columns = n) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 20, width: "100%" }}>{Array.from({ length: n }, (_, i) => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>{item(i)}</div>)}</div>
);
const line = (c: ThumbColours, w = "70%") => <div style={{ height: 12, width: w, borderRadius: 6, background: c.border }} />;

function Node({ n, c, lang }: { n: PageTreeNode; c: ThumbColours; lang: Lang }): ReactNode {
  const p = obj(n.props);
  const s = css(n, c, lang !== "en");
  const kids = () => (n.children ?? []).map((k) => <Node key={k.id} n={k} c={c} lang={lang} />);
  const list = (v: unknown) => (Array.isArray(v) ? v.map(obj) : []);
  switch (n.type) {
    case "section": {
      const inner = p.contained !== false ? <div style={{ maxWidth: 1100, marginInline: "auto" }}>{kids()}</div> : kids();
      const dots = obj(p.particles).kind ? <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(${c["accent-soft"]} 1.5px, transparent 2px)`, backgroundSize: "46px 46px", opacity: 0.6 }} /> : null;
      return <div style={{ position: "relative", padding: "56px 24px", ...s }}>{dots}<div style={{ position: "relative" }}>{inner}</div></div>;
    }
    case "popup":
      return (
        <div style={{ background: "rgba(0,0,0,.45)", padding: "90px 24px", display: "flex", justifyContent: "center" }}>
          <div style={{ background: c.bg, color: c.text, borderRadius: 24, padding: 40, width: p.size === "l" ? 860 : p.size === "s" ? 420 : 620, display: "flex", flexDirection: "column", gap: 16 }}>{kids()}</div>
        </div>
      );
    case "columns": {
      const widths = Array.isArray(obj(obj(n.style).base).widths) ? (obj(obj(n.style).base).widths as number[]) : (n.children ?? []).map(() => 1);
      return <div style={{ display: "grid", gridTemplateColumns: widths.map((x) => `${x}fr`).join(" "), gap: 24, ...s }}>{kids()}</div>;
    }
    case "cell":
      return <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, minWidth: 0, ...s }}>{kids()}</div>;
    case "grid":
      return <div style={{ display: "grid", gridTemplateColumns: `repeat(${num(obj(obj(n.style).base).columns) ?? 1}, minmax(0, 1fr))`, gap: 24, ...s }}>{kids()}</div>;
    case "deck": {
      // A presentation: its panels' names as tabs (down the side or along the top), and the first panel.
      const panels = (n.children ?? []).filter((k) => k.type === "stack");
      const labels = obj(p.labels);
      const side = p.presentation === "vertical-tabs";
      const tabs = panels.map((k, i) => <span key={k.id} style={{ padding: "8px 18px", borderRadius: 999, whiteSpace: "nowrap", background: i === 0 ? c.accent : c.surface, color: i === 0 ? c["accent-contrast"] : c.text, border: `1px solid ${c.border}` }}>{say(labels[k.id], lang) || i + 1}</span>);
      return (
        <div style={{ display: "flex", flexDirection: side ? "row" : "column", gap: 20, width: "100%", ...s }}>
          {p.presentation === "tabs" || side ? <div style={{ display: "flex", flexDirection: side ? "column" : "row", gap: 10, justifyContent: side ? "flex-start" : "center", flex: "none" }}>{tabs}</div> : null}
          <div style={{ flex: 1, minWidth: 0 }}>{panels[0] ? <Node n={panels[0]} c={c} lang={lang} /> : null}</div>
        </div>
      );
    }
    case "stack":
    case "scrollScene":
      return <div style={{ display: "flex", flexDirection: "column", gap: 16, position: s.position ?? "relative", ...s }}>{kids()}</div>;
    case "heading":
      return <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, ...s }}>{say(p.text, lang)}</div>;
    case "text":
      return <div style={{ fontSize: 17, lineHeight: 1.7, whiteSpace: "pre-line", ...s }}>{say(p.text, lang)}</div>;
    case "button": {
      const v = p.variant ?? "solid";
      const look: CSSProperties = v === "solid" ? { background: c.accent, color: c["accent-contrast"] } : v === "outline" ? { border: "2px solid currentColor", color: c.accent } : { color: c.accent, textDecoration: "underline", padding: 0 };
      return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 26px", borderRadius: 999, fontWeight: 600, fontSize: 17, ...look, ...s }}>{say(p.label, lang)}</span>;
    }
    case "image":
      return <Pic c={c} style={s} dim={Boolean(obj(obj(obj(n.style).base).overlay).color)} />;
    case "icon":
      return <span style={{ display: "inline-grid", placeItems: "center", width: 48, height: 48, borderRadius: "50%", background: c["accent-soft"], color: c.accent, fontSize: 24, ...s }}>✦</span>;
    case "model3d":
      return <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 24, display: "grid", placeItems: "center", background: `radial-gradient(circle at 50% 45%, ${c["accent-soft"]}, transparent 65%)`, color: c.accent, fontSize: 160, ...s }}>◆</div>;
    case "products": {
      const cols = num(p.columns) ?? 4;
      return boxes(Math.min(num(p.limit) ?? 8, cols * 2), c, () => <><Pic c={c} />{line(c)}{line(c, "40%")}</>, p.layout === "row" ? 4 : cols);
    }
    case "categories": {
      if (p.look === "pill") return <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{Array.from({ length: 6 }, (_, i) => <span key={i} style={{ width: 130, height: 44, borderRadius: 999, background: c.surface, border: `1px solid ${c.border}` }} />)}</div>;
      const cols = num(p.columns) ?? 3;
      const round = p.look === "circle" ? "50%" : 18;
      const aspect = p.look === "banner" ? "16/9" : p.look === "tall" || !p.look ? "3/4" : "1/1";
      return boxes(cols, c, () => <><Pic c={c} style={{ aspectRatio: aspect, borderRadius: round }} />{line(c, "50%")}</>);
    }
    case "instrument":
      return <div style={{ padding: 24, borderRadius: 16, background: "#14212a", color: "#f1f3ec", minHeight: 160 }}><div style={{ marginBottom: 12 }}>{p.kind === "guitar" ? "E A D G B E" : "♫"}</div><div style={{ display: "flex", gap: 2 }}>{Array.from({ length: p.kind === "guitar" ? 6 : 13 }, (_, index) => <div key={index} style={{ flex: 1, height: p.kind === "guitar" ? 4 : 90, background: index % 3 === 1 ? "#344450" : "#ecebe2" }} />)}</div></div>;
    case "clock":
      return <div style={{ padding: 24, fontSize: 36 }}>{String(p.timezone ?? "UTC")} · 00:00</div>;
    case "chart":
      return <div style={{ padding: 24 }}>{(Array.isArray(p.items) ? p.items : []).map((row: any, index: number) => <div key={index} style={{ marginBottom: 10, height: 14, width: `${Math.max(5, Math.min(100, Number(row.value) || 5))}%`, background: "currentColor", opacity: .6 }} />)}</div>;
    case "filterGallery":
      return <div style={{ display: "grid", gridTemplateColumns: `repeat(${Number(p.columns) || 3},minmax(0,1fr))`, gap: 12 }}>{(Array.isArray(p.items) ? p.items : []).slice(0, 6).map((row: any, index: number) => <div key={index} style={{ minHeight: 140, padding: 16, border: "1px solid currentColor", opacity: .65 }}>{say(row.title, lang)}</div>)}</div>;
    case "schedule": {
      // A programme: a line for each item (its day, its time, what it is).
      const items = list(p.items).slice(0, 6);
      const cards = p.layout === "cards";
      return (
        <div style={{ display: cards ? "grid" : "flex", gridTemplateColumns: cards ? "repeat(2, minmax(0, 1fr))" : undefined, flexDirection: "column", gap: cards ? 16 : 0, width: "100%", ...s }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", gap: 20, alignItems: "baseline", padding: cards ? 20 : "14px 0", borderRadius: cards ? 16 : 0, border: cards ? `1px solid ${c.border}` : undefined, borderBottom: `1px solid ${c.border}`, ...(p.layout === "timeline" ? { borderInlineStart: `3px solid ${c.accent}`, paddingInlineStart: 20, borderBottom: "none" } : {}) }}>
              <span style={{ color: c.accent, fontWeight: 700, whiteSpace: "nowrap" }}>{say(it.day, lang)}</span>
              <span style={{ color: c.muted, whiteSpace: "nowrap" }}>{String(it.time ?? "")}</span>
              <b style={{ minWidth: 0 }}>{say(it.title, lang)}</b>
            </div>
          ))}
        </div>
      );
    }
    case "comparison": {
      // A table: what is compared along the top, a line for each row, a tick or a dash in each cell.
      const columns = list(p.columns);
      const cols = `1.4fr ${columns.map(() => "1fr").join(" ")}`;
      const cell = (v: Obj) => (v.state === "yes" ? "✓" : v.state === "no" ? "–" : say(v.text, lang));
      return (
        <div style={{ width: "100%", border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden", ...s }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, background: c.surface, fontWeight: 700 }}>
            <span />
            {columns.map((col, i) => <span key={i} style={{ padding: "14px 12px", textAlign: "center", color: col.highlight ? c.accent : c.text }}>{say(col.title, lang)}</span>)}
          </div>
          {list(p.rows).slice(0, 6).map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: cols, borderTop: `1px solid ${c.border}` }}>
              <span style={{ padding: "12px 16px" }}>{say(row.label, lang)}</span>
              {list(row.values).map((v, j) => <span key={j} style={{ padding: "12px", textAlign: "center", color: v.state === "yes" ? c.accent : c.muted }}>{cell(v)}</span>)}
            </div>
          ))}
        </div>
      );
    }
    case "logos":
      return <div style={{ display: "flex", flexWrap: p.moving === true ? "nowrap" : "wrap", justifyContent: "center", gap: "28px 44px", width: "100%", overflow: "hidden", ...s }}>{list(p.items).map((_, i) => <span key={i} style={{ width: 130, height: 40, borderRadius: 10, background: c.border, flex: "none" }} />)}</div>;
    case "accordion":
      return <div style={{ width: "100%", maxWidth: 820, ...s }}>{list(p.items).map((it, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${c.border}`, fontWeight: 600 }}><span>{say(it.q, lang)}</span><span>+</span></div>)}</div>;
    case "showcase": {
      const items = list(p.items).slice(0, 8);
      const initial = Math.max(0, Math.min(items.length - 1, Math.trunc(num(p.initial) ?? 0)));
      return <div style={{ display: "flex", flexDirection: p.layout === "vertical" ? "column" : "row", gap: 8, height: num(p.height) ?? 480, width: "100%", ...s }}>{items.map((item, i) => <div key={i} style={{ flex: i === initial ? num(p.ratio) ?? 4 : 1, minWidth: 0, minHeight: 0, overflow: "hidden", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", justifyContent: "end", background: `linear-gradient(${110 + i * 25}deg, ${c.surface}, ${c["accent-soft"]})`, color: c.text }}><b style={{ overflowWrap: "anywhere" }}>{say(item.title, lang)}</b>{i === initial ? <span style={{ fontSize: 14 }}>{say(item.text, lang)}</span> : null}</div>)}</div>;
    }
    case "testimonials": {
      const items = list(p.items);
      const single = p.layout === "single";
      return boxes(single ? 1 : Math.min(3, items.length), c, (i) => <div style={{ padding: 24, borderRadius: 18, background: c.surface, border: `1px solid ${c.border}`, display: "flex", flexDirection: "column", gap: 10, textAlign: single ? "center" : undefined }}><span style={{ color: c.accent }}>★★★★★</span><span>{say(items[i]?.quote, lang)}</span><b>{say(items[i]?.name, lang)}</b></div>);
    }
    case "pricing": {
      const items = list(p.items);
      return boxes(items.length, c, (i) => <div style={{ padding: 28, borderRadius: 20, background: c.surface, border: `${items[i].featured ? 2 : 1}px solid ${items[i].featured ? c.accent : c.border}`, display: "flex", flexDirection: "column", gap: 10 }}><b>{say(items[i].name, lang)}</b><span style={{ fontSize: 38, fontWeight: 800 }}>{say(items[i].price, lang)}</span>{line(c)}{line(c, "55%")}</div>);
    }
    case "team": {
      const items = list(p.items);
      return boxes(items.length, c, (i) => <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><Pic c={c} style={{ width: 140, aspectRatio: "1/1", borderRadius: "50%" }} /><b>{say(items[i].name, lang)}</b></div>);
    }
    case "countdown":
      return <div style={{ display: "flex", gap: 12, ...s }}>{[0, 1, 2, 3].map((i) => <span key={i} style={{ width: 76, height: 76, borderRadius: 14, background: p.look === "plain" ? "transparent" : c.surface, border: `1px solid ${c.border}`, display: "grid", placeItems: "center", fontSize: 30, fontWeight: 800, color: c.text }}>--</span>)}</div>;
    case "marquee":
      return <div style={{ whiteSpace: "nowrap", overflow: "hidden", width: "100%", fontSize: 18, fontWeight: 600, ...s }}>{Array.from({ length: 3 }, () => list(p.items).map((t) => say(t, lang)).join("  ✦  ")).join("  ✦  ")}</div>;
    case "tabs": {
      const items = list(p.items);
      return <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}><div style={{ display: "flex", gap: 10 }}>{items.map((t, i) => <span key={i} style={{ padding: "8px 18px", borderRadius: 999, background: i === 0 ? c.accent : c.surface, color: i === 0 ? c["accent-contrast"] : c.text }}>{say(t.label, lang)}</span>)}</div><div>{say(items[0]?.text, lang)}</div></div>;
    }
    case "hotspots":
      return <div style={{ position: "relative", width: "100%", ...s }}><Pic c={c} style={{ aspectRatio: "4/3" }} />{list(p.items).map((d, i) => <span key={i} style={{ position: "absolute", insetInlineStart: `${d.x}%`, top: `${d.y}%`, width: 26, height: 26, borderRadius: "50%", background: c.bg, border: `6px solid ${c.accent}` }} />)}</div>;
    case "beforeAfter":
      return <div style={{ position: "relative", width: "100%", ...s }}><Pic c={c} style={{ aspectRatio: "16/10" }} /><span style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: `${num(p.start) ?? 50}%`, width: 4, background: c.bg }} /></div>;
    case "map":
      return <div style={{ width: "100%", height: 320, borderRadius: 20, background: `repeating-linear-gradient(0deg, ${c.border} 0 2px, transparent 2px 60px), repeating-linear-gradient(90deg, ${c.border} 0 2px, transparent 2px 60px), ${c.surface}`, display: "grid", placeItems: "center", color: c.accent, fontSize: 60, ...s }}>⌖</div>;
    case "form":
      return <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 520, ...s }}><span style={{ flex: 1, height: 50, borderRadius: 12, background: c.surface, border: `1px solid ${c.border}` }} /><span style={{ width: 130, height: 50, borderRadius: 999, background: c.accent }} /></div>;
    case "search":
      return <div style={{ height: 50, width: "100%", maxWidth: 560, borderRadius: 999, background: c.surface, border: `1px solid ${c.border}`, ...s }} />;
    case "menu":
      return <div style={{ display: "flex", flexDirection: p.layout === "column" ? "column" : "row", gap: p.layout === "column" ? 10 : 24, flexWrap: "wrap", fontSize: 16, ...s }}>{list(p.items).map((it, i) => <span key={i}>{say(it.label, lang)}</span>)}</div>;
    case "slider":
      return <Pic c={c} style={{ aspectRatio: String(p.aspect ?? "16/9").replace(/\s/g, ""), ...s }} />;
    case "alert":
      return <div style={{ padding: "14px 18px", borderRadius: 14, background: c["accent-soft"], color: c.text, width: "100%" }}>{say(p.text, lang)}</div>;
    case "spacer":
      return <div style={{ height: num(p.size) ?? 32 }} />;
    case "divider":
      return <hr style={{ border: 0, borderTop: `1px solid ${c.border}`, width: "100%" }} />;
    default:
      return <div style={s}>{kids()}</div>;
  }
}

/** Is it on the screen yet (the gallery draws a template only once it's seen)? */
function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setSeen(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

/**
 * Sections drawn at `width` px wide (zoomed from a computer's 1200): cut to `height` for a
 * card, or whole for the preview. `build` runs only once it's seen.
 */
export function TemplateThumb({ build, colours, lang, width, height }: { build: () => PageTreeNode[] | null; colours: ThumbColours; lang: Lang; width: number; height?: number }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  // Built once, when first seen (a different template or setting comes with a new key).
  const [make] = useState(() => build);
  const nodes = useMemo(() => (seen ? make() : null), [seen, make]);
  return (
    <div ref={ref} dir={lang === "en" ? "ltr" : "rtl"} style={{ width, height, overflow: "hidden", background: colours.bg, color: colours.text }} aria-hidden="true">
      {nodes ? <div style={{ width: WIDTH, zoom: width / WIDTH, fontFamily: "inherit" } as CSSProperties}>{nodes.map((n) => <Node key={n.id} n={n} c={colours} lang={lang} />)}</div> : null}
    </div>
  );
}
