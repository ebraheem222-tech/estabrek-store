"use client";
/**
 * The designs' signature sections (phase 11.2): one section per design that no other design
 * has, drawn by the mechanic its config names (dna/signatures.ts) with its own options. They
 * show the store's own products, categories and opening picture; quick-add buttons come in
 * already drawn (`adds`), since this runs in the browser.
 */
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { tr } from "@/lib/words";
import type { Mechanic, Signature } from "../dna/signatures";
import type { StoreTheme, Words } from "../types";
import type { ThProduct } from "./sections";

export type SigInput = {
  sig: Signature;
  title: Words;
  theme: StoreTheme;
  lang: Lang;
  products: ThProduct[];
  categories: Array<{ id: string; name: string; slug: string }>;
  picture: string | null;
  /** Each product's quick-add button, by its id or slug. */
  adds: Record<string, ReactNode>;
  /** The @font-face rules a mechanic writes in (the calligraphy's three scripts). */
  faces?: string;
};
type In = SigInput & { say: (w: Words) => string };
const keyOf = (p: ThProduct) => p.id || p.slug || p.title;
const href = (p: ThProduct) => (p.slug ? `/p/${encodeURIComponent(p.slug)}` : "/shop");
const search = (q: string) => `/search?q=${encodeURIComponent(q)}`;
const pics = (i: In) => i.products.filter((p) => p.imageUrl);

function Shot({ url, alt = "", sizes = "30vw" }: { url?: string | null; alt?: string; sizes?: string }) {
  return url ? <Image src={url} alt={alt} fill sizes={sizes} className="th-cover" /> : <span className="th-sig-empty" aria-hidden />;
}
function Mini({ p, add }: { p: ThProduct; add?: ReactNode }) {
  return (
    <div className="th-sig-mini">
      <Link href={href(p)} className="th-sig-mini-link">
        <span className="th-sig-mini-pic">
          <Shot url={p.imageUrl} alt={p.title} sizes="(max-width:640px) 40vw, 14vw" />
        </span>
        <span className="th-sig-mini-name">{p.title}</span>
        {p.priceText ? <span className="th-card-price">{p.priceText}</span> : null}
      </Link>
      {add}
    </div>
  );
}
const matches = (p: ThProduct, words: string[]) => words.some((w) => w && (p.title.toLowerCase().includes(w.toLowerCase()) || (p.category ?? "").toLowerCase().includes(w.toLowerCase())));

/* Pick a choice, see what of the store's matches it (or look for it). */
function Finder(i: In) {
  const { lang } = i;
  const options = i.sig.items?.length ? i.sig.items.map((x) => ({ label: i.say(x), words: [x.ar, x.en, x.he], to: search(i.say(x)) })) : i.categories.slice(0, 6).map((c) => ({ label: c.name, words: [c.name], to: `/c/${encodeURIComponent(c.slug)}` }));
  const [on, setOn] = useState(0);
  const pick = options[on];
  const found = pick ? i.products.filter((p) => matches(p, pick.words)).slice(0, 4) : [];
  if (!options.length) return null;
  return (
    <div className="th-sig-body">
      <div className="th-sig-chips" role="radiogroup">
        {options.map((o, n) => (
          <button key={o.label} type="button" role="radio" aria-checked={n === on} className="th-chip" onClick={() => setOn(n)}>
            {o.label}
          </button>
        ))}
      </div>
      {found.length ? (
        <div className="th-sig-row">{found.map((p) => <Mini key={keyOf(p)} p={p} add={i.adds[keyOf(p)]} />)}</div>
      ) : (
        <p className="th-sig-note">{tr(lang, "دوّر على كل اللي بيناسب", "Find everything that suits")} «{pick.label}»</p>
      )}
      <Link href={pick.to} className="th-button">
        {tr(lang, "شوف المنتجات", "See the products")}
        <span className="th-arrow" aria-hidden>→</span>
      </Link>
    </div>
  );
}

/* A slider along the design's stops. */
function Meter(i: In) {
  const { lang } = i;
  const stops = i.sig.items ?? [];
  const [at, setAt] = useState(Math.floor(stops.length / 2));
  if (!stops.length) return null;
  const label = i.say(stops[at]);
  return (
    <div className="th-sig-body th-sig-meter" style={{ "--at": stops.length > 1 ? at / (stops.length - 1) : 0 } as CSSProperties}>
      <output className="th-sig-big" aria-live="polite">{label}</output>
      <input type="range" min={0} max={stops.length - 1} step={1} value={at} onChange={(e) => setAt(Number(e.target.value))} aria-label={i.say(i.title)} />
      <div className="th-sig-stops" aria-hidden>
        {stops.map((s, n) => (
          <span key={n} data-on={n === at || undefined}>{i.say(s)}</span>
        ))}
      </div>
      <Link href={search(label)} className="th-button">
        {tr(lang, "شوف", "See")} «{label}»
      </Link>
    </div>
  );
}

/* Fill a box (tray, hamper, board…) with the store's products. */
function Builder(i: In) {
  const { lang } = i;
  const n = i.sig.n ?? 6;
  const list = i.products.slice(0, 12);
  const [chosen, setChosen] = useState<string[]>([]);
  const toggle = (k: string) => setChosen((c) => (c.includes(k) ? c.filter((x) => x !== k) : c.length < n ? [...c, k] : c));
  const as = i.sig.as;
  const box =
    as === "tray" ? tr(lang, "صينيتك", "Your tray") : as === "box" ? tr(lang, "علبتك", "Your box") : as === "board" ? tr(lang, "لوحتك", "Your board") : as === "hamper" ? tr(lang, "سلّتك", "Your hamper") : as === "basket" ? tr(lang, "سلّتك", "Your basket") : tr(lang, "عدّتك", "Your set");
  if (!list.length) return null;
  return (
    <div className="th-sig-body th-sig-builder">
      <div className="th-sig-shelf">
        {list.map((p) => (
          <button key={keyOf(p)} type="button" className="th-sig-pick" aria-pressed={chosen.includes(keyOf(p))} onClick={() => toggle(keyOf(p))} title={p.title}>
            <span className="th-sig-pick-pic"><Shot url={p.imageUrl} alt={p.title} sizes="12vw" /></span>
            <span className="th-sig-pick-name">{p.title}</span>
          </button>
        ))}
      </div>
      <aside className="th-sig-box">
        <p className="th-sig-box-title">{box} <b>{chosen.length}/{n}</b></p>
        <span className="th-sig-bar"><i style={{ width: `${(chosen.length / n) * 100}%` }} /></span>
        <ul>
          {chosen.map((k) => {
            const p = list.find((x) => keyOf(x) === k)!;
            return (
              <li key={k}>
                <Link href={href(p)}>{p.title}</Link>
                {i.adds[k]}
              </li>
            );
          })}
        </ul>
        {!chosen.length ? <p className="th-sig-note">{tr(lang, "اختار من الرف", "Pick from the shelf")}</p> : null}
      </aside>
    </div>
  );
}

/* Two of the store's products side by side. */
function Compare(i: In) {
  const { lang } = i;
  const list = i.products.slice(0, 12);
  const [a, setA] = useState(0);
  const [b, setB] = useState(Math.min(1, list.length - 1));
  if (list.length < 2) return null;
  const side = (p: ThProduct, n: number, set: (v: number) => void, which: string) => (
    <div className="th-sig-side">
      <select value={n} onChange={(e) => set(Number(e.target.value))} aria-label={which}>
        {list.map((x, k) => <option key={keyOf(x)} value={k}>{x.title}</option>)}
      </select>
      <span className="th-sig-side-pic"><Shot url={p.imageUrl} alt={p.title} sizes="(max-width:640px) 44vw, 24vw" /></span>
      <Link href={href(p)} className="th-sig-side-name">{p.title}</Link>
      <span className="th-card-price">{p.priceText ?? "—"}</span>
      {i.adds[keyOf(p)]}
    </div>
  );
  return (
    <div className="th-sig-body th-sig-compare">
      {side(list[a], a, setA, tr(lang, "الأول", "The first"))}
      <span className="th-sig-vs" aria-hidden>VS</span>
      {side(list[b], b, setB, tr(lang, "التاني", "The second"))}
    </div>
  );
}

/* Steps in order (a tracker lights them up one by one; a pyramid stacks them). */
function Steps(i: In) {
  const steps = i.sig.items ?? [];
  const [lit, setLit] = useState(0);
  useEffect(() => {
    if (i.sig.as !== "tracker") return;
    const t = window.setInterval(() => setLit((x) => (x + 1) % (steps.length + 1)), 1400);
    return () => window.clearInterval(t);
  }, [i.sig.as, steps.length]);
  return (
    <ol className={`th-sig-body th-sig-steps th-sig-steps-${i.sig.as ?? "line"}`}>
      {steps.map((s, n) => (
        <li key={n} data-lit={i.sig.as !== "tracker" || n < lit || undefined}>
          <b>{n + 1}</b>
          <span>{i.say(s)}</span>
        </li>
      ))}
    </ol>
  );
}

/* A list to tick off. */
function Checklist(i: In) {
  const { lang } = i;
  const items = i.sig.items ?? [];
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  const count = done.filter(Boolean).length;
  return (
    <div className="th-sig-body th-sig-check">
      <p className="th-sig-big">{count}/{items.length}</p>
      <ul>
        {items.map((x, n) => (
          <li key={n}>
            <label>
              <input type="checkbox" checked={done[n]} onChange={() => setDone((d) => d.map((v, k) => (k === n ? !v : v)))} />
              <span>{i.say(x)}</span>
            </label>
          </li>
        ))}
      </ul>
      <Link href="/shop" className="th-button">{tr(lang, "كمّل اللي ناقصك", "Get what's missing")}</Link>
    </div>
  );
}

/* Stages along a line, each with its tip. */
function Timeline(i: In) {
  const items = i.sig.items ?? [];
  const tips = i.sig.tips ?? [];
  const [at, setAt] = useState(0);
  return (
    <div className="th-sig-body th-sig-timeline">
      <input type="range" min={0} max={Math.max(0, items.length - 1)} value={at} onChange={(e) => setAt(Number(e.target.value))} aria-label={i.say(i.title)} />
      <ol>
        {items.map((x, n) => (
          <li key={n} data-on={n === at || undefined}>
            <button type="button" onClick={() => setAt(n)}>{i.say(x)}</button>
          </li>
        ))}
      </ol>
      {tips[at] ? <p className="th-sig-big">{i.say(tips[at])}</p> : null}
    </div>
  );
}

/* Words written in three scripts, or on a shirt, a card or a mug. */
function Script(i: In) {
  const { lang } = i;
  const [text, setText] = useState("");
  const shown = text.trim() || tr(lang, "اسمك هون", "Your name here");
  const on = i.sig.as;
  return (
    <div className="th-sig-body th-sig-script">
      <input value={text} onChange={(e) => setText(e.target.value.slice(0, 24))} placeholder={tr(lang, "اكتب اسمك…", "Write your name…")} aria-label={tr(lang, "الاسم", "The name")} />
      {i.faces ? <style dangerouslySetInnerHTML={{ __html: i.faces }} /> : null}
      {on ? (
        <div className={`th-sig-thing th-sig-thing-${on}`}>
          <svg viewBox="0 0 200 200" aria-hidden>
            {on === "shirt" ? <path d="M60 30L30 50L42 80L56 74V176H144V74L158 80L170 50L140 30C130 44 112 50 100 50S70 44 60 30Z" /> : on === "mug" ? <path d="M40 50H140V160C140 172 130 180 118 180H62C50 180 40 172 40 160ZM140 70H160C172 70 178 80 178 96S172 122 160 122H140" /> : <rect x="20" y="40" width="160" height="120" rx="12" />}
          </svg>
          <span className="th-sig-thing-text">{shown}</span>
        </div>
      ) : (
        <div className="th-sig-scripts">
          <span style={{ fontFamily: "th-aref-ruqaa, serif" }}>{shown}</span>
          <span style={{ fontFamily: "th-reem-kufi, sans-serif" }}>{shown}</span>
          <span style={{ fontFamily: "th-amiri, serif" }}>{shown}</span>
        </div>
      )}
    </div>
  );
}

/* A drawing that draws itself (a henna pattern, a flight path). */
function Draw(i: In) {
  const henna = i.sig.as === "henna";
  const petals = Array.from({ length: 8 }, (_, n) => n * 45);
  return (
    <div className="th-sig-body th-sig-draw">
      <svg viewBox="0 0 200 200" aria-hidden className="th-sig-drawing">
        {henna ? (
          <g>
            <circle cx="100" cy="100" r="14" />
            {petals.map((a) => <path key={a} transform={`rotate(${a} 100 100)`} d="M100 86C112 66 112 46 100 30C88 46 88 66 100 86Z" />)}
            <circle cx="100" cy="100" r="78" />
            {petals.map((a) => <circle key={`d${a}`} transform={`rotate(${a + 22.5} 100 100)`} cx="100" cy="16" r="5" />)}
          </g>
        ) : (
          <g>
            <path d="M10 170C50 120 70 160 100 110S150 40 190 30" />
            <circle cx="190" cy="30" r="6" />
          </g>
        )}
      </svg>
      <div className="th-sig-row">{pics(i).slice(0, 3).map((p) => <Mini key={keyOf(p)} p={p} add={i.adds[keyOf(p)]} />)}</div>
    </div>
  );
}

/* Petals, leaves or toys falling over the store's products. */
function Falling(i: In) {
  const bits = Array.from({ length: 14 }, (_, n) => n);
  return (
    <div className={`th-sig-body th-sig-falling th-sig-falling-${i.sig.as ?? "petals"}`}>
      <div className="th-sig-rain" aria-hidden>
        {bits.map((n) => <span key={n} style={{ "--x": `${(n * 37) % 100}%`, "--d": `${(n % 5) * 1.3}s`, "--s": `${7 + (n % 4) * 2}s` } as CSSProperties} />)}
      </div>
      <div className="th-sig-row">{i.products.slice(0, 4).map((p) => <Mini key={keyOf(p)} p={p} add={i.adds[keyOf(p)]} />)}</div>
    </div>
  );
}

/* A picture to look at closely: a lens that follows the pointer, or a zoom slider. */
function Lens(i: In) {
  const { lang } = i;
  const url = i.picture ?? pics(i)[0]?.imageUrl ?? null;
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(2);
  if (!url) return null;
  const slider = i.sig.as === "zoom";
  return (
    <div className="th-sig-body th-sig-lens">
      <div
        className="th-sig-lens-pic"
        onPointerMove={(e) => {
          if (slider) return;
          const r = e.currentTarget.getBoundingClientRect();
          setAt({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onPointerLeave={() => setAt(null)}
        style={slider ? ({ "--z": zoom } as CSSProperties) : undefined}
      >
        <Shot url={url} sizes="(max-width:640px) 90vw, 50vw" />
        {!slider && at ? <span className="th-sig-glass" style={{ left: `${at.x}%`, top: `${at.y}%`, backgroundImage: `url("${url}")`, backgroundPosition: `${at.x}% ${at.y}%` }} aria-hidden /> : null}
      </div>
      {slider ? (
        <label className="th-sig-zoom">
          {tr(lang, "البعد البؤري", "Focal length")} <b dir="ltr">{Math.round(16 + (zoom - 1) * 61)}mm</b>
          <input type="range" min={1} max={4} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
      ) : (
        <p className="th-sig-note">{tr(lang, "حرّك الماوس عالصورة لتشوف التفاصيل", "Move over the picture to see the details")}</p>
      )}
    </div>
  );
}

/* Two colours mixed. */
function Mixer(i: In) {
  const { lang } = i;
  const p = i.theme.palettes[i.theme.mode]!;
  const colours = i.sig.as === "fruit" ? ["#ff8c1a", "#e63946", "#8ac926", "#ffb703", "#5a4fcf", "#ffe066", "#9d0208", "#52b788"] : [p.accent, p.strong, p.glow, "#f4a261", "#2a9d8f", "#e76f51", "#8338ec", "#ffbe0b"];
  const [a, setA] = useState(0);
  const [b, setB] = useState(4);
  const row = (v: number, set: (n: number) => void, label: string) => (
    <div className="th-sig-swatches" role="radiogroup" aria-label={label}>
      {colours.map((c, n) => <button key={n} type="button" role="radio" aria-checked={n === v} aria-label={c} style={{ background: c }} onClick={() => set(n)} />)}
    </div>
  );
  return (
    <div className="th-sig-body th-sig-mixer">
      {row(a, setA, tr(lang, "اللون الأول", "The first colour"))}
      <span className="th-sig-mix" style={{ background: `color-mix(in oklab, ${colours[a]}, ${colours[b]})` }} aria-hidden />
      {row(b, setB, tr(lang, "اللون التاني", "The second colour"))}
      <Link href="/shop" className="th-button">{i.sig.as === "fruit" ? tr(lang, "اطلب هالخلطة", "Order this blend") : tr(lang, "لاقي هاللون", "Find this colour")}</Link>
    </div>
  );
}

/* A rough guide worked out from a number or two. */
function Calc(i: In) {
  const { lang } = i;
  const kind = i.sig.as ?? "protein";
  const [v, setV] = useState(kind === "bike" ? 170 : kind === "tank" ? 60 : kind === "gym" ? 9 : 70);
  const [goal, setGoal] = useState(1.6);
  const field =
    kind === "bike" ? tr(lang, "طولك (سم)", "Your height (cm)") : kind === "tank" ? tr(lang, "حجم الحوض (لتر)", "Tank size (litres)") : kind === "gym" ? tr(lang, "المساحة (م²)", "The space (m²)") : tr(lang, "وزنك (كغ)", "Your weight (kg)");
  const result =
    kind === "protein"
      ? tr(lang, `حوالي ${Math.round(v * goal)} غرام بروتين باليوم`, "About {0} g of protein a day", [Math.round(v * goal)])
      : kind === "bike"
        ? `${tr(lang, "المقاس", "Size")} ${v < 160 ? "XS" : v < 170 ? "S" : v < 180 ? "M" : v < 190 ? "L" : "XL"}`
        : kind === "tank"
          ? tr(lang, `حوالي ${Math.max(1, Math.floor(v / 8))} سمكات صغار`, "About {0} small fish", [Math.max(1, Math.floor(v / 8))])
          : v < 6
            ? tr(lang, "أوزان وحبل وحصيرة", "Weights, a rope and a mat")
            : v < 12
              ? tr(lang, "أوزان ومقعد ودراجة", "Weights, a bench and a bike")
              : tr(lang, "جهاز متعدد وأوزان كاملة", "A multi-gym and a full set of weights");
  return (
    <div className="th-sig-body th-sig-calc">
      <label>
        {field}
        <input type="number" inputMode="numeric" value={v} min={1} max={kind === "tank" ? 2000 : 300} onChange={(e) => setV(Math.max(1, Number(e.target.value) || 1))} />
      </label>
      {kind === "protein" ? (
        <label>
          {tr(lang, "هدفك", "Your goal")}
          <select value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
            <option value={1.2}>{tr(lang, "حافظ على وزني", "Keep my weight")}</option>
            <option value={1.6}>{tr(lang, "نزّل دهون", "Lose fat")}</option>
            <option value={2}>{tr(lang, "عضل أكتر", "More muscle")}</option>
          </select>
        </label>
      ) : null}
      <output className="th-sig-big" aria-live="polite">{result}</output>
      <p className="th-sig-note">{tr(lang, "تقدير تقريبي، مش نصيحة مختص.", "A rough guide, not a specialist's advice.")}</p>
    </div>
  );
}

/* A countdown: to midnight, a cup steeping, or a chosen day. */
function Timer(i: In) {
  const { lang } = i;
  const as = i.sig.as;
  const [now, setNow] = useState<number | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [day, setDay] = useState("");
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const two = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");
  if (as === "date") {
    const days = day && now ? Math.ceil((new Date(day).getTime() - now) / 86_400_000) : null;
    return (
      <div className="th-sig-body th-sig-timer">
        <label>{tr(lang, "اليوم الكبير", "The big day")} <input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
        <output className="th-sig-big">{days === null ? "—" : days > 0 ? tr(lang, `باقي ${days} يوم`, "{0} days to go", [days]) : tr(lang, "مبروك!", "Congratulations!")}</output>
      </div>
    );
  }
  if (as === "steep") {
    const total = (i.sig.n ?? 3) * 60;
    const left = start && now ? Math.max(0, total - (now - start) / 1000) : total;
    return (
      <div className="th-sig-body th-sig-timer th-sig-steep" style={{ "--brew": 1 - left / total } as CSSProperties}>
        <span className="th-sig-cup" aria-hidden><i /></span>
        <output className="th-sig-big" dir="ltr">{two(left / 60)}:{two(left % 60)}</output>
        <button type="button" className="th-button" onClick={() => setStart(Date.now())}>{left === total || left === 0 ? tr(lang, "ابدأ النقع", "Start steeping") : tr(lang, "من الأول", "Start again")}</button>
      </div>
    );
  }
  const end = new Date(now ?? 0);
  end.setHours(24, 0, 0, 0);
  const s = now ? (end.getTime() - now) / 1000 : 0;
  return (
    <div className="th-sig-body th-sig-timer">
      <output className="th-sig-big th-sig-clock" dir="ltr">{now ? `${two(s / 3600)}:${two((s % 3600) / 60)}:${two(s % 60)}` : "--:--:--"}</output>
      <div className="th-sig-row">{i.products.slice(0, 4).map((p) => <Mini key={keyOf(p)} p={p} add={i.adds[keyOf(p)]} />)}</div>
    </div>
  );
}

/* Before and after: dark and lit, dull and shining. */
function BeforeAfter(i: In) {
  const url = i.picture ?? pics(i)[0]?.imageUrl ?? null;
  const [at, setAt] = useState(50);
  if (!url) return null;
  return (
    <div className={`th-sig-body th-sig-ba th-sig-ba-${i.sig.as ?? "shine"}`}>
      <div className="th-sig-ba-pic" style={{ "--at": `${at}%` } as CSSProperties}>
        <Shot url={url} sizes="(max-width:640px) 90vw, 60vw" />
        <span className="th-sig-ba-before" aria-hidden><Shot url={url} sizes="(max-width:640px) 90vw, 60vw" /></span>
        <span className="th-sig-ba-line" aria-hidden />
      </div>
      {/* Left to right in every language, like the line it moves. */}
      <input type="range" dir="ltr" min={0} max={100} value={at} onChange={(e) => setAt(Number(e.target.value))} aria-label={i.say(i.title)} />
    </div>
  );
}

/* The store's products going by slowly, stopping under the pointer. */
function Runway(i: In) {
  const first = i.products.slice(0, 10);
  if (!first.length) return null;
  // Enough to run wider than the widest screen, then the same again for the loop.
  const list = Array.from({ length: Math.ceil(8 / first.length) }, () => first).flat();
  return (
    <div className={`th-sig-body th-sig-runway${i.sig.as === "slow" ? " is-slow" : ""}`}>
      <div className="th-sig-track">
        {[...list, ...list].map((p, n) => (
          <Link key={n} href={href(p)} className="th-sig-walk" aria-hidden={n >= first.length || undefined} tabIndex={n >= first.length ? -1 : undefined}>
            <span className="th-sig-walk-pic"><Shot url={p.imageUrl} alt={p.title} sizes="22vw" /></span>
            <span>{p.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* Moving bars (a sound, strings, an engine) that follow the pointer. */
function Wave(i: In) {
  const [power, setPower] = useState(0.5);
  return (
    <div className={`th-sig-body th-sig-wave th-sig-wave-${i.sig.as ?? "sound"}`} onPointerMove={(e) => setPower(0.3 + ((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth) * 0.7)} style={{ "--p": power } as CSSProperties}>
      <div className="th-sig-bars" aria-hidden>
        {Array.from({ length: 36 }, (_, n) => <span key={n} style={{ "--n": n } as CSSProperties} />)}
      </div>
      <div className="th-sig-row">{i.products.slice(0, 4).map((p) => <Mini key={keyOf(p)} p={p} add={i.adds[keyOf(p)]} />)}</div>
    </div>
  );
}

/* Dots on the store's picture, each one a product. */
function Hotspots(i: In) {
  const list = i.products.slice(0, 3);
  const spots = [[28, 38], [62, 56], [44, 76]];
  return (
    <div className="th-sig-body th-sig-hotspots">
      <div className="th-sig-scene">
        <Shot url={i.picture ?? pics(i)[0]?.imageUrl} sizes="(max-width:640px) 90vw, 70vw" />
        {list.map((p, n) => (
          <Link key={keyOf(p)} href={href(p)} className="th-sig-spot" style={{ insetInlineStart: `${spots[n][0]}%`, top: `${spots[n][1]}%` }}>
            <i aria-hidden />
            <span>{p.title}{p.priceText ? ` · ${p.priceText}` : ""}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* A turning wheel of choices (or a record with the store's picture at its middle). */
function Wheel(i: In) {
  const { lang } = i;
  const record = i.sig.as === "record";
  const items = (i.categories.length ? i.categories.map((c) => ({ label: c.name, to: `/c/${encodeURIComponent(c.slug)}` })) : i.products.map((p) => ({ label: p.title, to: href(p) }))).slice(0, 8);
  const [turn, setTurn] = useState(0);
  const at = items.length ? ((Math.round(-turn / (360 / items.length)) % items.length) + items.length) % items.length : 0;
  return (
    <div className="th-sig-body th-sig-wheel">
      <div className="th-sig-dial">
        {record ? null : <i className="th-sig-pointer" aria-hidden />}
        <div className={`th-sig-disc${record ? " is-record" : ""}`} style={{ "--turn": `${turn}deg`, "--seg": `${360 / Math.max(1, items.length)}deg` } as CSSProperties}>
          {record ? <span className="th-sig-label"><Shot url={i.picture ?? pics(i)[0]?.imageUrl} sizes="20vw" /></span> : items.map((x, n) => <span key={x.label} className="th-sig-slice" style={{ "--a": `${(360 / items.length) * n}deg` } as CSSProperties}>{x.label}</span>)}
        </div>
      </div>
      <div className="th-sig-wheel-side">
        <button type="button" className="th-button" onClick={() => setTurn((t) => t - (360 / Math.max(1, items.length)) * (2 + Math.floor(Math.random() * items.length)))}>{record ? tr(lang, "شغّل", "Play") : tr(lang, "لفّ الدولاب", "Spin the wheel")}</button>
        {items[at] ? <Link href={items[at].to} className="th-sig-big">{items[at].label}</Link> : null}
      </div>
    </div>
  );
}

/* The store's products in a honeycomb. */
function Hex(i: In) {
  return (
    <div className="th-sig-body th-sig-hex">
      {i.products.slice(0, 7).map((p) => (
        <Link key={keyOf(p)} href={href(p)} className="th-sig-cell" title={p.title}>
          <Shot url={p.imageUrl} alt={p.title} sizes="18vw" />
          <span>{p.title}</span>
        </Link>
      ))}
    </div>
  );
}

/* Seats to pick. */
function Seats(i: In) {
  const { lang } = i;
  const [taken, setTaken] = useState<Set<number>>(() => new Set());
  const toggle = (n: number) => setTaken((t) => { const x = new Set(t); if (x.has(n)) x.delete(n); else if (x.size < 6) x.add(n); return x; });
  return (
    <div className="th-sig-body th-sig-seats">
      <span className="th-sig-stage">{tr(lang, "المسرح", "Stage")}</span>
      <div className="th-sig-grid" role="group" aria-label={i.say(i.title)}>
        {Array.from({ length: 60 }, (_, n) => <button key={n} type="button" aria-pressed={taken.has(n)} aria-label={`${tr(lang, "مقعد", "Seat")} ${n + 1}`} onClick={() => toggle(n)} />)}
      </div>
      <p className="th-sig-big">{tr(lang, `${taken.size} مقاعد`, "{0} seats", [taken.size])}</p>
      <Link href="/shop" className="th-button">{tr(lang, "احجز", "Book")}</Link>
    </div>
  );
}

/* A big search, with the categories as examples. */
function Search(i: In) {
  const { lang } = i;
  return (
    <form action="/search" role="search" className="th-sig-body th-sig-search">
      <input name="q" type="search" dir="auto" placeholder={tr(lang, "رقم القطعة أو اسمها…", "Part number or name…")} aria-label={tr(lang, "بحث", "Search")} />
      <button type="submit" className="th-button">{tr(lang, "دوّر", "Search")}</button>
      <div className="th-sig-chips">{i.categories.slice(0, 6).map((c) => <Link key={c.id} href={`/c/${encodeURIComponent(c.slug)}`} className="th-chip">{c.name}</Link>)}</div>
    </form>
  );
}

/* Typed out letter by letter: the products' names (or a key appearing). */
function Typewriter(i: In) {
  const { lang } = i;
  const lines = useMemo(() => (i.sig.as === "key" ? ["XXXXX-XXXXX-XXXXX"] : i.products.slice(0, 6).map((p) => p.title)), [i.sig.as, i.products]);
  const [n, setN] = useState(0);
  const [k, setK] = useState(0);
  useEffect(() => {
    if (!lines.length) return;
    const t = window.setTimeout(() => (k < lines[n].length + 12 ? setK(k + 1) : (setK(0), setN((n + 1) % lines.length))), k < lines[n].length ? 70 : 140);
    return () => window.clearTimeout(t);
  }, [k, n, lines]);
  if (!lines.length) return null;
  const text = i.sig.as === "key" ? lines[0].slice(0, k).replace(/X/g, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]) : lines[n].slice(0, k);
  return (
    <div className="th-sig-body th-sig-type">
      <p className="th-sig-big" dir="auto">{text}<span className="th-sig-caret" aria-hidden /></p>
      {i.sig.as === "key" ? <p className="th-sig-note">{tr(lang, "الكود بيوصلك فور الدفع.", "Your key arrives as soon as you pay.")}</p> : <Link href="/shop" className="th-button">{tr(lang, "كمّل القراءة", "Read on")}</Link>}
    </div>
  );
}

/* Cards that turn over to show their back. */
function Flip(i: In) {
  return (
    <div className="th-sig-body th-sig-flip">
      {i.products.slice(0, 4).map((p) => (
        <Link key={keyOf(p)} href={href(p)} className="th-sig-flipcard">
          <span className="th-sig-front"><Shot url={p.imageUrl} alt={p.title} sizes="22vw" /></span>
          <span className="th-sig-back"><b>{p.title}</b>{p.priceText ? <span>{p.priceText}</span> : null}</span>
        </Link>
      ))}
    </div>
  );
}

/* A print on a wall, in three sizes. */
function Wall(i: In) {
  const sizes = [["30×40", 0.5], ["50×70", 0.72], ["70×100", 0.95]] as const;
  const [on, setOn] = useState(1);
  const url = pics(i)[0]?.imageUrl ?? i.picture;
  return (
    <div className="th-sig-body th-sig-wall">
      <div className="th-sig-room">
        <span className="th-sig-print" style={{ "--k": sizes[on][1] } as CSSProperties}><Shot url={url} sizes="40vw" /></span>
        <span className="th-sig-sofa" aria-hidden />
      </div>
      <div className="th-sig-chips">
        {sizes.map(([s], n) => <button key={s} type="button" className="th-chip" aria-pressed={n === on} onClick={() => setOn(n)} dir="ltr">{s} cm</button>)}
      </div>
    </div>
  );
}

const DRAW: Record<Mechanic, ComponentType<In>> = {
  finder: Finder, meter: Meter, builder: Builder, compare: Compare, steps: Steps, checklist: Checklist, timeline: Timeline, script: Script, draw: Draw, falling: Falling, lens: Lens,
  mixer: Mixer, calc: Calc, timer: Timer, beforeafter: BeforeAfter, runway: Runway, wave: Wave, hotspots: Hotspots, wheel: Wheel, hex: Hex, seats: Seats, search: Search,
  typewriter: Typewriter, flip: Flip, wall: Wall,
};

/** A design's signature section. */
export function DesignSignature(input: SigInput) {
  const { lang } = input;
  const M = DRAW[input.sig.m];
  if (!M) return null;
  const say = (w: Words) => w[input.lang] || w.en;
  return (
    <section className="th-section th-sig" data-th-sig={input.sig.m} aria-label={say(input.title)}>
      <header className="th-section-head" data-th-reveal="block">
        <div>
          <p className="th-eyebrow">{tr(lang, "خاص فينا", "Only here")}</p>
          <h2 className="th-section-title">{say(input.title)}</h2>
        </div>
      </header>
      <M {...input} say={say} />
    </section>
  );
}
