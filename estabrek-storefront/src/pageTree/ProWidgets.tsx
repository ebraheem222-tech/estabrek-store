"use client";
/**
 * Four page-tree elements that need the shopper's browser (loaded through lazyParts.tsx, only on pages that have them):
 *  - a table of contents: the page's own headings as links down to each, the one being read lit up;
 *  - share buttons: this page sent to a network, the phone's own share sheet, or its link copied;
 *  - a reading bar: how far down the page the shopper has read, along the window's edge or as a ring in a corner;
 *  - a moving headline: its words taking turns, or one word marked by a line drawn round it.
 * Each is drawn on the server first (the contents' title, the buttons, a still headline with its first word) and
 * stays still in the editor's frame and for shoppers who asked their device for less motion.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const inStudio = () => window.parent !== window && /\/studio-frame/.test(window.location.pathname);
const lessMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/* ---------------------------------------------------------- table of contents */

type TocEntry = { id: string; text: string; level: number };
const TOC_SELECTORS: Record<string, string> = { "2": "h2", "2-3": "h2,h3", "2-4": "h2,h3,h4" };
/** A heading's address on the page: its own id, else one made from its words (kept unique). */
function slugOf(text: string, taken: Set<string>): string {
  const base = `pt-h-${text.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "part"}`;
  let id = base;
  for (let n = 2; taken.has(id) || (document.getElementById(id) && !document.getElementById(id)!.matches("h2,h3,h4")); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}
/** The page's headings at those levels, in order: not a popup's, a header's or a footer's, nor the contents' own. */
function headingsOf(levels: string, from: Element | null): TocEntry[] {
  const taken = new Set<string>();
  const out: TocEntry[] = [];
  // The page's own part: its tree, else the <main> it sits in.
  const root = document.querySelector("[data-page-tree-root]") ?? from?.closest("main") ?? document.body;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(TOC_SELECTORS[levels] ?? TOC_SELECTORS["2-3"]))) {
    if (el.closest("dialog,header,footer,nav,.pt-toc,.pt-popup-studio,[aria-hidden=true],[hidden]")) continue;
    const text = (el.dataset.ptToc ?? el.querySelector(".pt-sr")?.textContent ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (!el.id) el.id = slugOf(text, taken);
    else taken.add(el.id);
    out.push({ id: el.id, text: text.slice(0, 120), level: Number(el.tagName.slice(1)) });
  }
  return out;
}

export function TocView({ title, levels, look, fold, empty }: { title: string; levels: string; look: string; fold: boolean; empty: string }) {
  const [entries, setEntries] = useState<TocEntry[] | null>(null);
  const [at, setAt] = useState<string | null>(null);
  const [studio, setStudio] = useState(false);
  const box = useRef<HTMLDetailsElement>(null);
  const self = useRef<HTMLElement>(null);
  useEffect(() => {
    setStudio(inStudio());
    const look = () => setEntries((was) => {
      const found = headingsOf(levels, self.current);
      return was && was.length === found.length && was.every((e, i) => e.id === found[i].id && e.text === found[i].text) ? was : found;
    });
    look();
    // On a phone a folding one starts closed.
    if (fold && box.current && window.matchMedia("(max-width: 639.98px)").matches) box.current.open = false;
    window.addEventListener("studio-view-updated", look);
    return () => window.removeEventListener("studio-view-updated", look);
  }, [levels, fold]);
  useEffect(() => {
    if (!entries?.length) return;
    // The one being read: the last heading that has passed the top third of the window.
    let frame = 0;
    const pick = () => {
      frame = 0;
      let current: string | null = null;
      for (const e of entries) {
        const el = document.getElementById(e.id);
        if (el && el.getBoundingClientRect().top < innerHeight * 0.34) current = e.id;
      }
      setAt(current ?? entries[0].id);
    };
    const soon = () => { if (!frame) frame = requestAnimationFrame(pick); };
    pick();
    addEventListener("scroll", soon, { passive: true });
    addEventListener("resize", soon);
    return () => { removeEventListener("scroll", soon); removeEventListener("resize", soon); cancelAnimationFrame(frame); };
  }, [entries]);
  if (entries && !entries.length && !studio) return null;
  const go = (id: string) => (e: React.MouseEvent) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: lessMotion() ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setAt(id);
  };
  const top = entries?.length ? Math.min(...entries.map((e) => e.level)) : 2;
  const list = entries?.length ? (
    <ol className="pt-tc-list">
      {entries.map((e) => (
        <li key={e.id} className={`pt-tc-l${e.level - top}`}>
          <a href={`#${e.id}`} onClick={go(e.id)} aria-current={at === e.id ? "location" : undefined}>{e.text}</a>
        </li>
      ))}
    </ol>
  ) : <p className="pt-tc-empty">{entries ? empty : "…"}</p>;
  const name = <span data-pt-field="title">{title}</span>;
  return (
    <nav ref={self} className={`pt-tc pt-tc-${look}`} aria-label={title}>
      {fold ? (
        <details ref={box} open>
          <summary className="pt-tc-title">{name}</summary>
          {list}
        </details>
      ) : (
        <>
          <div className="pt-tc-title">{name}</div>
          {list}
        </>
      )}
    </nav>
  );
}

/* --------------------------------------------------------------- share buttons */

export type ShareNetwork = "whatsapp" | "facebook" | "x" | "telegram" | "linkedin" | "pinterest" | "email" | "copy" | "native";
/** Each network's mark, drawn here on a 24×24 grid (simple shapes of our own, in the button's colour). */
const SHARE_ICON: Record<ShareNetwork, ReactNode> = {
  whatsapp: <><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 8.6c.3 2.9 2.4 5.1 5.4 5.9l1-1.2-1.8-.9-.8.8c-1-.5-1.8-1.3-2.3-2.3l.8-.8-.9-1.8z" fill="currentColor" /></>,
  facebook: <path d="M13.5 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z" fill="currentColor" />,
  x: <path d="M5 4.5h4.2l3.3 4.6 4-4.6h1.9l-5 5.7L19 19.5h-4.2l-3.6-5-4.4 5H4.9l5.4-6.2z" fill="currentColor" />,
  telegram: <path d="M3.5 11.3l15.8-6.2c.8-.3 1.5.2 1.2 1.4l-2.7 12.6c-.2.9-.8 1.1-1.5.7l-4.1-3-2 1.9c-.2.2-.4.4-.8.4l.3-4.2 7.6-6.9c.3-.3-.1-.5-.5-.2l-9.4 5.9-4-1.3c-.9-.3-.9-.9.1-1.1z" fill="currentColor" />,
  linkedin: <><rect x="4" y="9" width="3.4" height="11" fill="currentColor" /><circle cx="5.7" cy="5.6" r="2" fill="currentColor" /><path d="M10 9h3.2v1.6c.5-.9 1.7-1.9 3.5-1.9 3.4 0 3.8 2.2 3.8 5V20h-3.4v-5.4c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V20H10z" fill="currentColor" /></>,
  pinterest: <path d="M12.3 3.5c-4.7 0-7.3 3.1-7.3 6.6 0 1.6.9 3.6 2.3 4.2.2.1.3 0 .4-.2l.3-1.2c0-.1 0-.3-.1-.4-.5-.6-.8-1.5-.8-2.4 0-2.4 1.8-4.6 4.8-4.6 2.6 0 4.5 1.8 4.5 4.4 0 2.9-1.5 5-3.4 5-1.1 0-1.9-.9-1.6-2l.8-3c.2-.9-.1-1.8-1.2-1.8-1.1 0-1.8 1.1-1.8 2.5 0 .9.3 1.5.3 1.5l-1.4 5.8c-.3 1.4 0 3.4.1 4.2 0 .1.2.2.3.1.2-.2 1.6-2.3 2-3.8l.7-2.6c.4.7 1.4 1.3 2.5 1.3 3.3 0 5.7-3 5.7-6.8 0-3.6-3-6.3-6.9-6.3z" fill="currentColor" />,
  email: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M4.5 7l7.5 6 7.5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></>,
  copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" strokeWidth="1.8" /></>,
  native: <><path d="M12 15V4m0 0L8 8m4-4l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 11H6a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
};
/** Where each network takes the page and its words. */
function shareAddress(net: ShareNetwork, url: string, text: string): string | null {
  const u = encodeURIComponent(url), t = encodeURIComponent(text);
  switch (net) {
    case "whatsapp": return `https://wa.me/?text=${encodeURIComponent(text ? `${text} ${url}` : url)}`;
    case "facebook": return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "x": return `https://x.com/intent/post?url=${u}${text ? `&text=${t}` : ""}`;
    case "telegram": return `https://t.me/share/url?url=${u}${text ? `&text=${t}` : ""}`;
    case "linkedin": return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "pinterest": return `https://pinterest.com/pin/create/button/?url=${u}${text ? `&description=${t}` : ""}`;
    case "email": return `mailto:?subject=${encodeURIComponent(text || document.title)}&body=${u}`;
    default: return null;
  }
}
/** The page's address to share: without the editor's or a campaign's own marks. */
function pageAddress(): string {
  const at = new URL(window.location.href);
  for (const key of Array.from(at.searchParams.keys())) if (/^(utm_|fbclid|gclid|preview|draft|token)/i.test(key)) at.searchParams.delete(key);
  at.hash = "";
  return at.toString();
}

export function ShareView({ networks, look, labels, tint, text, words }: { networks: ShareNetwork[]; look: string; labels: boolean; tint: string; text: string; words: Record<ShareNetwork | "copied" | "label", string> }) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { window.prompt(words.copy, url); }
  };
  const press = (net: ShareNetwork) => () => {
    if (inStudio()) return;
    const url = pageAddress();
    if (net === "copy") return void copy(url);
    if (net === "native") {
      if (navigator.share) return void navigator.share({ title: document.title, text: text || undefined, url }).catch(() => undefined);
      return void copy(url);
    }
    const to = shareAddress(net, url, text);
    if (!to) return;
    if (net === "email") window.location.href = to;
    else window.open(to, "_blank", "noopener,noreferrer,width=640,height=560");
  };
  // The phone's own share sheet only where there is one.
  const shown = networks.filter((n) => n !== "native" || canShare);
  return (
    <div className={`pt-shr pt-shr-${look} pt-shr-${tint}${labels ? " pt-shr-labels" : ""}`} role="group" aria-label={words.label}>
      {shown.map((net) => (
        <button key={net} type="button" className={`pt-shr-btn pt-shr-${net}`} onClick={press(net)} aria-label={labels ? undefined : words[net]} title={labels ? undefined : words[net]}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">{SHARE_ICON[net]}</svg>
          {labels ? <span>{net === "copy" && copied ? words.copied : words[net]}</span> : null}
        </button>
      ))}
      <span className="pt-sr" aria-live="polite">{copied ? words.copied : ""}</span>
    </div>
  );
}

/* ----------------------------------------------------------------- reading bar */

/** How far down the page is read, 0…1. */
const readShare = () => {
  const most = document.documentElement.scrollHeight - window.innerHeight;
  return most > 0 ? Math.min(1, Math.max(0, window.scrollY / most)) : 0;
};

export function ReadProgress({ kind, place, thickness, label, note }: { kind: "bar" | "ring"; place: "top" | "bottom"; thickness: number; label: string; note: string }) {
  const [mounted, setMounted] = useState(false);
  const [studio, setStudio] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMounted(true); setStudio(inStudio()); }, []);
  useEffect(() => {
    if (!mounted) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const share = readShare();
      bar.current?.style.setProperty("--pt-read", String(share));
      if (ring.current) {
        ring.current.style.setProperty("--pt-read", String(share));
        ring.current.toggleAttribute("data-shown", share > 0.04);
      }
    };
    const soon = () => { if (!frame) frame = requestAnimationFrame(draw); };
    draw();
    addEventListener("scroll", soon, { passive: true });
    addEventListener("resize", soon);
    return () => { removeEventListener("scroll", soon); removeEventListener("resize", soon); cancelAnimationFrame(frame); };
  }, [mounted, kind]);
  const up = () => window.scrollTo({ top: 0, behavior: lessMotion() ? "auto" : "smooth" });
  // On the body, so nothing it sits in (a moving section, a frosted box) changes where "fixed" is.
  const live = mounted
    ? createPortal(
        kind === "ring" ? (
          <button ref={ring} type="button" className="pt-read-ring" onClick={up} aria-label={label}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="20" pathLength={1} className="pt-read-track" />
              <circle cx="24" cy="24" r="20" pathLength={1} className="pt-read-fill" />
              <path d="M24 31V17m0 0l-6 6m6-6l6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <div ref={bar} className={`pt-read-bar pt-read-${place}`} style={{ "--pt-read-h": `${thickness}px` } as React.CSSProperties} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} />
        ),
        document.body,
      )
    : null;
  return (
    <>
      {/* In the editor, a note in its place (the bar itself is drawn along the window). */}
      {studio ? <span className="pt-read-note">{note}</span> : null}
      {live}
    </>
  );
}

/* ------------------------------------------------------------- moving headline */

const VIEW = { w: 500, h: 150 };
/** A wave or a zigzag along the bottom of the word's box. */
const along = (fn: (x: number) => number, step: number) => {
  const pts: string[] = [];
  for (let x = 6; x <= VIEW.w - 6; x += step) pts.push(`${x},${fn(x).toFixed(1)}`);
  return `M${pts.join(" L")}`;
};
/** The lines each shape draws round the word, on a 500×150 box stretched over it. */
export function markPaths(shape: string): string[] {
  switch (shape) {
    case "underline": return ["M10,132 C150,118 330,116 490,126"];
    case "double": return ["M10,124 C160,112 340,112 490,120", "M40,142 C180,132 330,132 470,138"];
    case "strike": return ["M8,82 C160,72 340,70 492,76"];
    case "cross": return ["M18,18 L482,132", "M482,18 L18,132"];
    case "box": return ["M18,12 H482 Q492,12 492,22 V128 Q492,138 482,138 H18 Q8,138 8,128 V22 Q8,12 18,12 Z"];
    case "swoosh": return ["M8,128 C120,140 260,146 380,122 C430,112 470,96 492,74"];
    case "curly": return [along((x) => 132 + 9 * Math.sin((x / VIEW.w) * Math.PI * 7), 4)];
    case "zigzag": return [along((x) => (Math.round(x / 54) % 2 ? 120 : 144), 54)];
    default: return ["M260,12 C120,6 14,30 14,75 C14,122 140,140 260,138 C390,136 488,112 486,70 C484,30 380,10 230,16"];
  }
}

/** Letters as the eye counts them (joined Arabic letters and emoji stay whole). */
const lettersOf = (s: string): string[] => {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (t: string) => Iterable<{ segment: string }> } }).Segmenter;
  return Seg ? Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(s), (p) => p.segment) : Array.from(s);
};

/** The moving part of a headline; the rest of it (before, after) is drawn on the server around it. */
export function HeadlineMotion({ words, mode, effect, shape, seconds, again, children }: { words: string[]; mode: "rotate" | "mark"; effect: string; shape: string; seconds: number; again: boolean; children?: ReactNode }) {
  const box = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState(0);
  const [typed, setTyped] = useState<string | null>(null);
  const [on, setOn] = useState(false);
  const [still, setStill] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (inStudio() || lessMotion()) { setOn(true); return; }
    setStill(false);
    let seen = false;
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) setOn(true); else if (mode === "rotate") setOn(false); }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);
  // Words taking turns while in sight (typed letter by letter, or each coming in with its effect).
  useEffect(() => {
    if (still || mode !== "rotate" || !on || words.length < 1) return;
    let stop = false;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((done) => timers.push(window.setTimeout(done, ms)));
    const run = async () => {
      let i = at;
      while (!stop) {
        if (effect === "type") {
          const letters = lettersOf(words[i]);
          for (let n = 1; n <= letters.length && !stop; n++) { setTyped(letters.slice(0, n).join("")); await wait(70); }
          await wait(seconds * 1000);
          if (words.length < 2) return;
          for (let n = letters.length - 1; n >= 0 && !stop; n--) { setTyped(letters.slice(0, n).join("")); await wait(35); }
          i = (i + 1) % words.length;
          setAt(i);
          await wait(200);
        } else {
          if (words.length < 2) return;
          await wait(seconds * 1000);
          if (stop) return;
          i = (i + 1) % words.length;
          setAt(i);
        }
      }
    };
    void run();
    return () => { stop = true; timers.forEach(clearTimeout); };
    // `at` is where it carries on from, not a reason to start over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, mode, on, effect, seconds, words]);
  // A mark drawn again every few seconds.
  useEffect(() => {
    if (still || mode !== "mark" || !again || !on) return;
    const t = window.setInterval(() => {
      setOn(false);
      window.setTimeout(() => setOn(true), 120);
    }, Math.max(3, seconds * 2) * 1000);
    return () => clearInterval(t);
  }, [still, mode, again, on, seconds]);
  if (mode === "mark") {
    return (
      <span ref={box} className={`pt-hl-mark pt-hl-s-${shape}${on ? " pt-hl-on" : ""}${still ? " pt-hl-still" : ""}`}>
        {children}
        <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="none" aria-hidden="true">
          {markPaths(shape).map((d, i) => <path key={i} d={d} pathLength={1} />)}
        </svg>
      </span>
    );
  }
  if (effect === "type" && typed !== null) {
    return <span ref={box} className="pt-hl-words pt-hl-type" aria-hidden="true"><span className="pt-hl-w pt-hl-w-on">{typed}</span><span className="pt-hl-caret" /></span>;
  }
  return (
    <span ref={box} className={`pt-hl-words pt-hl-${effect}`} aria-hidden="true">
      {words.map((w, i) => (
        <span key={i} className={`pt-hl-w${i === at ? " pt-hl-w-on" : i === (at - 1 + words.length) % words.length && !still ? " pt-hl-w-off" : ""}`} {...(i === 0 ? { "data-pt-field": "words.0" } : {})}>{w}</span>
      ))}
    </span>
  );
}
