"use client";
/**
 * The chart's five new kinds (plan 3.7, from the theme library's data pieces; the maths are in chartMaths.ts):
 * a sunburst that opens a group, a sankey of flows, flight lines from one city over a dotted map, bars in 3D, and a
 * live line of the owner's table (its rows counted per minute, hour or day, read again the moment a row is added).
 * Every one has its values in words beside it too (a list a screen reader reads, and that a tap or a key works).
 * The owner's values only: nothing here is made up, and the live line counts real rows or shows nothing.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import { listenLive } from "./liveHub";
import { wantHands } from "./recipeHands";
import {
  EVERY_MS, LIVE_EVERY, SANKEY, arcPath, blendSlices, cityName, cityOf, flightPath, iso, isoBar, isoGrid, kmBetween, liveSeries,
  mapDots, mapFrame, onMap, paletteAt, ribbon, sankeyLayout, smoothLine, sunGroups, sunSlices, type ChartItem, type LiveEvery, type NewChartKind, type Slice,
} from "./chartMaths";
import css from "./ChartKinds.module.css";

type Lang = "ar" | "en" | "he";
export type ChartKindProps = { kind: NewChartKind; label: string; items: ChartItem[]; unit: string; showValues: boolean; hub: string; table: string; every: LiveEvery; last: number; lang: Lang };

const WORDS = {
  ar: { back: "رجوع", total: "المجموع", open: "كبسي على قطعة لتفتحيها", live: "مباشر", now: "هلأ", low: "الأقل", high: "الأعلى", avg: "المعدّل", per: { minute: "بالدقيقة", hour: "بالساعة", day: "باليوم" }, closed: "هالجدول مش مفتوح للزوار.", failed: "ما قدرنا نقرأ الأرقام هلأ.", km: "كم", from: "من", flows: "تدفّق", needTo: "اكتبي لكل بند «لوين» بيروح.", needHub: "اختاري المدينة اللي بتطلع منها الخطوط، ومدن البنود.", needTable: "اختاري الجدول اللي بدّك تعدّي سطوره." },
  en: { back: "Back", total: "Total", open: "Tap a slice to open it", live: "Live", now: "Now", low: "Lowest", high: "Highest", avg: "Average", per: { minute: "Per minute", hour: "Per hour", day: "Per day" }, closed: "This table isn't open to visitors.", failed: "The numbers couldn't be read just now.", km: "km", from: "From", flows: "flow", needTo: "Write where each item flows to.", needHub: "Pick the city the lines start from, and the items' cities.", needTable: "Pick the table whose rows to count." },
  he: { back: "חזרה", total: "סה״כ", open: "הקישו על פלח כדי לפתוח", live: "חי", now: "עכשיו", low: "הכי נמוך", high: "הכי גבוה", avg: "ממוצע", per: { minute: "לדקה", hour: "לשעה", day: "ליום" }, closed: "הטבלה הזאת לא פתוחה למבקרים.", failed: "לא הצלחנו לקרוא את המספרים כרגע.", km: "ק״מ", from: "מ־", flows: "זרימה", needTo: "כתבו לכל פריט לאן הוא זורם.", needHub: "בחרו את העיר שממנה יוצאים הקווים, ואת ערי הפריטים.", needTable: "בחרו את הטבלה שאת השורות שלה סופרים." },
} as const;
type Words = (typeof WORDS)["en"] | (typeof WORDS)["ar"] | (typeof WORDS)["he"];

const NUM = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const num = (n: number, unit: string) => (unit ? `${NUM.format(n)} ${unit}` : NUM.format(n));
const pct = (part: number, whole: number) => `${whole > 0 ? Math.round((part / whole) * 100) : 0}%`;
const calm = () => typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
const inEditor = () => typeof window !== "undefined" && window.parent !== window && /\/studio-frame/.test(window.location.pathname);
/** A fill that also takes a token colour ("var(--accent)") or a colour mixed lighter/darker where the browser can. */
const fill = (c: string): CSSProperties => ({ fill: c });
const shade = (c: string, k: "dark" | "light"): CSSProperties => ({ fill: `color-mix(in srgb, ${c}, ${k === "dark" ? "#000 28%" : "#fff 30%"})` });

/** A note only the editor shows (the shop hides the element until it is set: data-pt-needs-product). */
const Note = ({ text }: { text: string }) => <p className={css.note}>{text}</p>;

export function ChartKindView(p: ChartKindProps) {
  const w = WORDS[p.lang] ?? WORDS.en;
  return (
    <figure className={css.chart} data-chart={p.kind} aria-label={p.label} lang={p.lang}>
      {p.label ? <figcaption className={css.title}>{p.label}</figcaption> : null}
      {p.kind === "sunburst" ? <Sunburst {...p} w={w} />
        : p.kind === "sankey" ? <Sankey {...p} w={w} />
        : p.kind === "flights" ? <Flights {...p} w={w} />
        : p.kind === "bars3d" ? <Bars3d {...p} w={w} />
        : <Live {...p} w={w} />}
    </figure>
  );
}
type Inner = ChartKindProps & { w: Words };

/* ── Sunburst: the groups inside, their items outside; a group tapped fills the circle ── */
function Sunburst({ items, unit, showValues, w }: Inner) {
  const groups = useMemo(() => sunGroups(items), [items]);
  const [focus, setFocus] = useState(-1);
  const [slices, setSlices] = useState<Slice[]>(() => sunSlices(groups, -1));
  const [hot, setHot] = useState<string | null>(null);
  const now = useRef(slices);
  now.current = slices;
  const raf = useRef(0);
  useEffect(() => { setFocus(-1); setSlices(sunSlices(groups, -1)); }, [groups]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const zoom = (to: number) => {
    const a = now.current;
    const b = sunSlices(groups, to);
    setFocus(to);
    setHot(null);
    cancelAnimationFrame(raf.current);
    if (calm()) return setSlices(b);
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 650);
      setSlices(blendSlices(a, b, 1 - (1 - k) ** 3));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const total = groups.reduce((s, g) => s + g.value, 0);
  const g = focus >= 0 ? groups[focus] : null;
  const hotSlice = slices.find((s) => s.key === hot);
  const rows = g ? (g.items.length ? g.items.map((x) => ({ key: "", label: x.label, value: x.value, color: x.color, opens: -1 })) : []) : groups.map((x, i) => ({ key: `${i}`, label: x.name, value: x.value, color: x.color, opens: x.items.length ? i : -1 }));
  const whole = g ? g.value : total;
  const canOpen = !g && groups.some((x) => x.items.length);
  return (
    <div className={css.split}>
      <svg viewBox="-250 -250 500 500" className={css.sun} role="img" aria-label={g ? g.name : `${w.total} ${num(total, unit)}`}>
        {slices.map((s) => {
          const mid = (s.a0 + s.a1) / 2;
          const rm = (s.r0 + s.r1) / 2;
          const lit = !hot || hot === s.key || (hot.indexOf(".") < 0 && s.key.startsWith(`${hot}.`));
          const opens = !g && s.strong && (groups[s.group]?.items.length ?? 0) > 0;
          return (
            <g key={s.key} className={opens || g ? css.tap : undefined} onPointerEnter={() => setHot(s.key)} onPointerLeave={() => setHot(null)} onClick={() => (g ? zoom(-1) : opens ? zoom(s.group) : undefined)}>
              <path d={arcPath(s.a0, s.a1, s.r0, s.r1)} style={{ ...fill(s.color), opacity: lit ? (s.strong ? 0.95 : 0.6) : 0.25 }} />
              {s.a1 - s.a0 > 0.34 && s.r1 - s.r0 > 40 ? <text x={rm * Math.sin(mid)} y={-rm * Math.cos(mid)} className={css.sliceText}>{s.label.slice(0, 14)}</text> : null}
            </g>
          );
        })}
        <circle r="68" className={`${css.hub} ${g ? css.tap : ""}`} onClick={() => g && zoom(-1)} />
        <text y="-12" className={css.hubName}>{(hotSlice?.label ?? g?.name ?? w.total).slice(0, 18)}</text>
        {showValues || hotSlice ? <text y="16" className={css.hubValue}>{num(hotSlice?.value ?? whole, unit)}</text> : null}
        {g ? <text y="40" className={css.hubBack}>{w.back}</text> : canOpen ? <text y="40" className={css.hubHint}>{w.open}</text> : null}
      </svg>
      <div className={css.side}>
        {g ? <button type="button" className={css.back} onClick={() => zoom(-1)} data-pt-chart-back>← {w.back}</button> : null}
        <ul className={css.list}>
          {rows.map((r, i) => (
            <li key={`${focus}.${i}`}>
              <button type="button" className={css.row} disabled={r.opens < 0} onClick={() => r.opens >= 0 && zoom(r.opens)} onPointerEnter={() => setHot(g ? `${focus}.${i}` : r.key)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(g ? `${focus}.${i}` : r.key)} onBlur={() => setHot(null)} data-pt-chart-row={r.label}>
                <span className={css.dot} style={{ background: r.color }} />
                <span className={css.name}>{r.label}</span>
                {showValues ? <span className={css.value}>{num(r.value, unit)}</span> : null}
                <span className={css.share}>{pct(r.value, whole)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Sankey: where things flow, a name to another ── */
function Sankey({ items, unit, showValues, w }: Inner) {
  const { nodes, links } = useMemo(() => sankeyLayout(items), [items]);
  const [hot, setHot] = useState<{ link?: number; node?: number } | null>(null);
  if (!links.length) return <Note text={w.needTo} />;
  const lit = (i: number) => !hot || hot.link === i || hot.node === links[i].from || hot.node === links[i].to;
  const shown = hot?.link !== undefined ? links[hot.link] : null;
  const lastCol = Math.max(...nodes.map((n) => n.col));
  return (
    <div className={css.sankeyBox}>
      <p className={css.tip} aria-live="polite">
        {shown ? <>{nodes[shown.from].name} → {nodes[shown.to].name} · {num(shown.value, unit)} <span>({pct(shown.value, nodes[shown.from].value)})</span></> : " "}
      </p>
      <svg viewBox={`-10 -10 ${SANKEY.W + 20} ${SANKEY.H + 20}`} className={css.sankey} role="img" aria-label={links.map((l) => `${nodes[l.from].name} → ${nodes[l.to].name}: ${num(l.value, unit)}`).join(", ")}>
        <defs>
          {links.map((l, i) => (
            <linearGradient key={i} id={`pt-sk-${i}`} gradientUnits="userSpaceOnUse" x1={nodes[l.from].x} x2={nodes[l.to].x}>
              <stop offset="0" style={{ stopColor: nodes[l.from].color }} />
              <stop offset="1" style={{ stopColor: nodes[l.to].color }} />
            </linearGradient>
          ))}
        </defs>
        {links.map((l, i) => (
          <g key={i} onPointerEnter={() => setHot({ link: i })} onPointerLeave={() => setHot(null)}>
            <path d={ribbon(l, nodes)} fill={`url(#pt-sk-${i})`} className={css.ribbon} style={{ opacity: lit(i) ? 0.55 : 0.08 }} data-pt-flow={`${nodes[l.from].name}>${nodes[l.to].name}`} />
            {l.width > 6 ? <path d={`M${nodes[l.from].x + SANKEY.NODE} ${l.y0 + l.width / 2}C${(nodes[l.from].x + nodes[l.to].x) / 2} ${l.y0 + l.width / 2} ${(nodes[l.from].x + nodes[l.to].x) / 2} ${l.y1 + l.width / 2} ${nodes[l.to].x} ${l.y1 + l.width / 2}`} className={css.stream} style={{ opacity: lit(i) ? 0.4 : 0 }} /> : null}
          </g>
        ))}
        {nodes.map((n, i) => {
          const end = n.col === lastCol && lastCol > 0;
          return (
            <g key={i} onPointerEnter={() => setHot({ node: i })} onPointerLeave={() => setHot(null)}>
              <rect x={n.x} y={n.y} width={SANKEY.NODE} height={Math.max(1, n.h)} rx="3" style={fill(n.color)} />
              <text x={end ? n.x - 10 : n.x + SANKEY.NODE + 10} y={n.y + n.h / 2} textAnchor={end ? "end" : "start"} className={css.nodeText}>
                <tspan className={css.nodeName}>{n.name}</tspan>{showValues ? <tspan className={css.nodeValue}> {num(n.value, unit)}</tspan> : null}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Flights: lines from one city to the items' cities, over a dotted map ── */
function Flights({ items, hub, unit, showValues, lang, w }: Inner) {
  const from = cityOf(hub);
  const dests = useMemo(() => items.flatMap((it, i) => { const c = cityOf(it.city); return c && c !== from ? [{ it, i, c, km: from ? Math.round(kmBetween([from[1], from[2]], [c[1], c[2]])) : 0 }] : []; }).sort((a, b) => a.km - b.km), [items, from]);
  const frame = useMemo(() => mapFrame([...(from ? [[from[1], from[2]] as const] : []), ...dests.map((d) => [d.c[1], d.c[2]] as const)]), [from, dests]);
  const dots = useMemo(() => mapDots(frame), [frame]);
  const [hot, setHot] = useState<number | null>(null);
  const still = useStill();
  if (!from || !dests.length) return <Note text={w.needHub} />;
  const hubAt = onMap(frame, from[1], from[2]);
  const few = dests.length <= 8;
  return (
    <div className={`${css.split} ${css.splitMap}`}>
      <svg viewBox={`0 0 ${frame.w} ${frame.h}`} className={css.map} role="img" aria-label={`${w.from} ${cityName(hub, lang)}: ${dests.map((d) => d.it.label || cityName(d.c[0], lang)).join(", ")}`}>
        {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.2" className={css.land} />)}
        {dests.map((d, n) => {
          const at = onMap(frame, d.c[1], d.c[2]);
          const path = flightPath(hubAt, at);
          const on = hot === null || hot === d.i;
          return (
            <g key={d.i} style={{ opacity: on ? 1 : 0.15 }} className={css.route} onPointerEnter={() => setHot(d.i)} onPointerLeave={() => setHot(null)}>
              <path d={path} pathLength={1} className={css.arc} style={{ animationDelay: `${n * 70}ms`, strokeWidth: hot === d.i ? 6 : 3 }} />
              {!still ? (
                <path d="M-12 -7.5L13 0L-12 7.5L-6 0Z" className={css.plane}>
                  <animateMotion dur={`${4 + (n % 4)}s`} begin={`-${(n * 0.7).toFixed(1)}s`} repeatCount="indefinite" rotate="auto" path={path} />
                </path>
              ) : null}
              <circle cx={at[0]} cy={at[1]} r="7" className={css.city} />
              {few || hot === d.i ? <text x={at[0] + 12} y={at[1] + 8} className={css.cityText}>{d.it.label || cityName(d.c[0], lang)}</text> : null}
            </g>
          );
        })}
        <circle cx={hubAt[0]} cy={hubAt[1]} r="13" className={css.hubPulse} />
        <circle cx={hubAt[0]} cy={hubAt[1]} r="10" className={css.hubDot} />
        <text x={hubAt[0] + 15} y={hubAt[1] - 13} className={css.hubText}>{cityName(hub, lang)}</text>
      </svg>
      <div className={css.side}>
        <p className={css.sideTitle}>{w.from} {cityName(hub, lang)}</p>
        <ul className={css.list}>
          {dests.map((d) => (
            <li key={d.i}>
              <button type="button" className={css.row} aria-pressed={hot === d.i} onPointerEnter={() => setHot(d.i)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(d.i)} onBlur={() => setHot(null)} data-pt-chart-row={d.c[0]}>
                <span className={css.dot} style={{ background: d.it.color ?? "var(--accent,#86b696)" }} />
                <span className={css.name}>{d.it.label || cityName(d.c[0], lang)}</span>
                <span className={css.share}>{NUM.format(d.km)} {w.km}</span>
                {showValues ? <span className={css.value}>{num(d.it.value, unit)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Bars in 3D: a bar per item, a row per group, rising when seen ── */
function Bars3d({ items, unit, showValues, w }: Inner) {
  const grid = useMemo(() => isoGrid(items), [items]);
  const max = Math.max(1, ...items.map((x) => x.value));
  const [hot, setHot] = useState<number | null>(null);
  const box = useRef<SVGSVGElement>(null);
  const [rise, setRise] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el || calm() || typeof IntersectionObserver === "undefined") return;
    setRise(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => { const k = Math.min(1, (t - t0) / 900); setRise(1 - (1 - k) ** 3); if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  const rows = grid.rows.length;
  const left = iso(0, rows)[0] - 60;
  const right = iso(grid.cols, 0)[0] + 20;
  const bottom = iso(grid.cols, rows)[1] + 26;
  const total = items.reduce((s, x) => s + x.value, 0);
  const shown = hot !== null ? items[hot] : null;
  return (
    <div className={css.split}>
      <svg ref={box} viewBox={`${left} -175 ${right - left} ${bottom + 175}`} className={css.iso} role="img" aria-label={items.map((x) => `${x.label}: ${num(x.value, unit)}`).join(", ")}>
        <polygon points={[iso(0, 0), iso(grid.cols, 0), iso(grid.cols, rows), iso(0, rows)].map((p) => p.join(",")).join(" ")} className={css.floor} />
        {grid.cells.map(({ gx, gy, item }) => {
          const it = items[item];
          const c = it.color ?? paletteAt(gy);
          const f = isoBar(gx, gy, (it.value / max) * 150 * rise + 3);
          const on = hot === item;
          return (
            <g key={item} className={css.bar} onPointerEnter={() => setHot(item)} onPointerLeave={() => setHot(null)} data-pt-bar={it.label}>
              <polygon points={f.left} style={on ? shade(c, "light") : fill(c)} />
              <polygon points={f.right} style={shade(c, "dark")} />
              <polygon points={f.top} style={on ? { fill: "#fff" } : shade(c, "light")} />
            </g>
          );
        })}
        {grid.rows.map((name, gy) => (name ? <text key={gy} x={iso(0, gy + 0.5)[0] - 12} y={iso(0, gy + 0.5)[1] + 4} textAnchor="end" className={`${css.axis} ${css.rowName}`}>{name.slice(0, 12)}</text> : null))}
      </svg>
      <div className={css.side}>
        <div className={css.card} aria-live="polite">
          <p className={css.cardLabel}>{shown ? [shown.group, shown.label].filter(Boolean).join(" · ") : w.total}</p>
          {showValues || shown ? <p className={css.cardValue}>{num(shown ? shown.value : total, unit)}</p> : null}
        </div>
        <ul className={css.list}>
          {items.map((x, i) => (
            <li key={i}>
              <button type="button" className={css.row} onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(i)} onBlur={() => setHot(null)}>
                <span className={css.dot} style={{ background: x.color ?? paletteAt(grid.rows.indexOf(x.group.trim())) }} />
                <span className={css.name}>{[x.group, x.label].filter(Boolean).join(" · ")}</span>
                {showValues ? <span className={css.value}>{num(x.value, unit)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Live: a table's rows counted per minute, hour or day; read again the moment one is added ── */
function Live({ table, every: first, last, unit, lang, w }: Inner) {
  const [every, setEvery] = useState<LiveEvery>(first);
  const [series, setSeries] = useState<Array<{ at: number; n: number }> | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "closed" | "failed">("loading");
  const [ping, setPing] = useState(0);
  const [hot, setHot] = useState<number | null>(null);
  useEffect(() => setEvery(first), [first]);
  const read = useCallback(async () => {
    if (!table) return;
    try {
      const res = await fetch(`${apiBaseClient()}/data/${encodeURIComponent(table)}/per/${every}?last=${last}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403 || res.status === 404) return setState("closed");
      if (!res.ok) return setState("failed");
      setSeries(liveSeries(await res.json(), every, last));
      setState("ready");
    } catch {
      setState("failed");
    }
  }, [table, every, last]);
  useEffect(() => {
    if (!table) return;
    let alive = true;
    let soon = 0;
    let tick = 0;
    void read();
    // A new bucket begins: the line moves along.
    const next = () => {
      const step = EVERY_MS[every];
      tick = window.setTimeout(() => { if (alive) { void read(); next(); } }, step - (Date.now() % step) + 400);
    };
    next();
    // A row added: every visitor reads again, each a moment apart (the page's one live stream, opened by the shop's hands).
    if (!inEditor()) wantHands();
    const stop = inEditor() ? () => {} : listenLive(table, (note) => {
      if (note.op === "added") setPing((n) => n + 1);
      window.clearTimeout(soon);
      soon = window.setTimeout(() => void read(), 400 + Math.random() * 1200);
    });
    return () => { alive = false; stop(); window.clearTimeout(soon); window.clearTimeout(tick); };
  }, [table, every, read]);
  if (!table) return <Note text={w.needTable} />;
  const W = 600;
  const H = 220;
  const pad = { l: 8, r: 46, t: 14, b: 24 };
  const s = series ?? [];
  const high = Math.max(1, ...s.map((x) => x.n));
  const X = (i: number) => pad.l + (s.length > 1 ? (i / (s.length - 1)) * (W - pad.l - pad.r) : 0);
  const Y = (n: number) => pad.t + (1 - n / (high * 1.15)) * (H - pad.t - pad.b);
  const points = s.map((x, i) => [X(i), Y(x.n)] as [number, number]);
  const line = smoothLine(points);
  const area = points.length ? `${line}L${X(s.length - 1)} ${H - pad.b}L${X(0)} ${H - pad.b}Z` : "";
  const locale = lang === "ar" ? "ar" : lang === "he" ? "he" : "en-GB";
  const when = (at: number) => new Intl.DateTimeFormat(locale, every === "day" ? { day: "numeric", month: "short" } : { hour: "2-digit", minute: "2-digit", hour12: false }).format(at);
  const nowN = s.length ? s[s.length - 1].n : 0;
  const avg = s.length ? s.reduce((t, x) => t + x.n, 0) / s.length : 0;
  const low = s.length ? Math.min(...s.map((x) => x.n)) : 0;
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    if (s.length < 2) return;
    setHot(Math.max(0, Math.min(s.length - 1, Math.round(((x - pad.l) / (W - pad.l - pad.r)) * (s.length - 1)))));
  };
  return (
    <div className={css.live} data-state={state}>
      <div className={css.liveHead}>
        <p className={css.liveNow}>
          <span className={css.liveDot} data-ping={ping % 2} />
          <span className={css.liveWord}>{w.live}</span>
          <b data-pt-live-now>{num(nowN, unit)}</b>
          <span className={css.liveEvery}>{w.per[every]}</span>
        </p>
        <dl className={css.stats}>
          <div><dt>{w.low}</dt><dd>{NUM.format(low)}</dd></div>
          <div><dt>{w.avg}</dt><dd>{NUM.format(avg)}</dd></div>
          <div><dt>{w.high}</dt><dd>{NUM.format(s.length ? Math.max(...s.map((x) => x.n)) : 0)}</dd></div>
        </dl>
        <div className={css.chips} role="group">
          {LIVE_EVERY.map((e) => <button key={e} type="button" aria-pressed={e === every} className={css.chip} onClick={() => { setEvery(e); setSeries(null); setState("loading"); }}>{w.per[e]}</button>)}
        </div>
      </div>
      {state === "closed" ? <p className={css.liveNote}>{w.closed}</p> : state === "failed" && !series ? <p className={css.liveNote}>{w.failed}</p> : null}
      <svg viewBox={`0 0 ${W} ${H}`} className={css.liveSvg} role="img" aria-label={s.map((x) => `${when(x.at)}: ${x.n}`).join(", ")} onPointerMove={pick} onPointerLeave={() => setHot(null)}>
        <defs>
          <linearGradient id="pt-live-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" className={css.liveStop0} />
            <stop offset="1" className={css.liveStop1} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((k) => { const y = pad.t + (k / 3) * (H - pad.t - pad.b); return <g key={k}><line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className={css.grid} /><text x={W - pad.r + 6} y={y + 4} className={css.axis}>{NUM.format(Math.round(high * 1.15 * (1 - k / 3)))}</text></g>; })}
        {area ? <path d={area} fill="url(#pt-live-fill)" /> : null}
        {line ? <path d={line} className={css.liveLine} /> : null}
        {s.length ? <text x={pad.l} y={H - 6} className={css.axis}>{when(s[0].at)}</text> : null}
        {s.length ? <text x={W - pad.r} y={H - 6} textAnchor="end" className={css.axis}>{when(s[s.length - 1].at)}</text> : null}
        {points.length ? <>
          <circle key={ping} cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="5" className={css.livePulse} />
          <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="4.5" className={css.liveHeadDot} />
        </> : null}
        {hot !== null && points[hot] ? <g className={css.cross}>
          <line x1={points[hot][0]} x2={points[hot][0]} y1={pad.t} y2={H - pad.b} />
          <circle cx={points[hot][0]} cy={points[hot][1]} r="5" />
          <text x={Math.min(points[hot][0] + 10, W - pad.r - 110)} y={Math.max(pad.t + 12, points[hot][1] - 12)}>{`${num(s[hot].n, unit)} · ${when(s[hot].at)}`}</text>
        </g> : null}
      </svg>
    </div>
  );
}

/** Still: the visitor asked for less motion (the planes stay home). */
function useStill() {
  const [still, setStill] = useState(true);
  useEffect(() => setStill(calm()), []);
  return still;
}
