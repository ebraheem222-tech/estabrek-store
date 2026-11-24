// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Templates/src/kit.jsx): do not edit.
import { T, useLx, cv, cvs } from "../runtime";
/* Building blocks the templates share: navbar, modal, drawer, toast, marquee, countdown and generated pictures.
   Links inside a template can use plain href="#section-id": the viewer scrolls to the section instead of changing the URL. */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { EASE, rand } from "./shared";

/** True once the page has scrolled past `y` pixels. */
export function useScrolled(y = 24) {
  const [s, set] = useState(false);
  useEffect(() => {
    const on = () => set(window.scrollY > y);
    on();
    window.addEventListener("scroll", on, {
      passive: true
    });
    return () => window.removeEventListener("scroll", on);
  }, [y]);
  return s;
}

/** Stops the page behind an overlay from scrolling while `on`. */
export function useLockScroll(on) {
  useEffect(() => {
    if (!on) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [on]);
}
function useEscape(on, close) {
  useEffect(() => {
    if (!on) return;
    const k = e => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [on, close]);
}

/**
 * Fixed navbar that turns solid on scroll, with a full-screen menu on phones.
 * links: [[label, sectionId], …]. Everything visual comes in through the class props.
 */
export function SiteNav({
  logo,
  links,
  cta,
  extra,
  top = "bg-transparent",
  solid = "border-b border-white/10 bg-black/70 backdrop-blur-xl",
  linkClass = "text-white/70 hover:text-white",
  sheet = "bg-[#09090b] text-white",
  inner = "max-w-7xl",
  className = ""
}) {
  const __lx = useLx();
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEscape(open, close);
  useLockScroll(open);
  return <>
      <header className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${scrolled ? solid : `border-b border-transparent ${top}`} ${className}`}>
        <div className={`mx-auto flex h-16 items-center gap-6 px-5 sm:px-8 ${inner}`}>
          <T s={logo} />
          <nav className="ml-auto hidden items-center gap-7 text-sm font-medium lg:flex">
            <T s={links.map(([label, id]) => <a key={label} href={`#${id}`} className={`transition ${linkClass}`}>
                <T s={label} />
              </a>)} />
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <T s={extra} />
            <T s={cta && <div className="hidden sm:block"><T s={cta} /></div>} />
            <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full lg:hidden" aria-label={__lx("Open menu")}>
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        <T s={open && <motion.div className={`fixed inset-0 z-[60] flex flex-col overflow-y-auto px-6 pt-4 pb-28 ${sheet}`} initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} transition={{
        duration: 0.25
      }}>
            <div className="flex h-12 items-center justify-between">
              <T s={logo} />
              <button onClick={close} className="grid size-10 place-items-center rounded-full" aria-label={__lx("Close menu")}>
                <X className="size-5" />
              </button>
            </div>
            <nav className="mt-10 flex flex-col">
              <T s={links.map(([label, id], i) => <motion.a key={label} href={`#${id}`} onClick={close} initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            delay: 0.04 * i,
            ease: EASE
          }} className="border-b border-current/10 py-4 text-3xl font-semibold">
                  <T s={label} />
                </motion.a>)} />
            </nav>
            <T s={cta && <div className="mt-10" onClick={close}>
                <T s={cta} />
              </div>} />
          </motion.div>} />
      </AnimatePresence>
    </>;
}

/** Centered dialog. Closes on Escape and on a click outside the panel. */
export function Modal({
  open,
  onClose,
  children,
  className = "max-w-lg",
  backdrop = "bg-black/70"
}) {
  useEscape(open, onClose);
  useLockScroll(open);
  return <AnimatePresence>
      <T s={open && <motion.div className={`fixed inset-0 z-[200] overflow-y-auto backdrop-blur-sm ${backdrop}`} initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} onClick={onClose}>
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} initial={{
          opacity: 0,
          y: 24,
          scale: 0.97
        }} animate={{
          opacity: 1,
          y: 0,
          scale: 1
        }} exit={{
          opacity: 0,
          y: 16,
          scale: 0.98
        }} transition={{
          duration: 0.35,
          ease: EASE
        }} className={`relative w-full ${className}`}>
              <T s={children} />
            </motion.div>
          </div>
        </motion.div>} />
    </AnimatePresence>;
}

/** Panel that slides in from the right (carts, filters, chats). */
export function Drawer({
  open,
  onClose,
  children,
  className = "bg-white text-slate-900",
  width = "max-w-md"
}) {
  useEscape(open, onClose);
  useLockScroll(open);
  return <AnimatePresence>
      <T s={open && <>
          <motion.div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px]" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} onClick={onClose} />
          <motion.aside role="dialog" aria-modal="true" className={`fixed inset-y-0 right-0 z-[201] flex w-full flex-col shadow-2xl ${width} ${className}`} initial={{
        x: "100%"
      }} animate={{
        x: 0
      }} exit={{
        x: "100%"
      }} transition={{
        duration: 0.45,
        ease: EASE
      }}>
            <T s={children} />
          </motion.aside>
        </>} />
    </AnimatePresence>;
}

/** [toastElement, show(message)] — a small message that pops up above the bottom of the screen. */
export function useToast(className = "bg-white text-black") {
  const [msg, setMsg] = useState(null);
  const timer = useRef();
  const show = useCallback(m => {
    setMsg({
      m,
      k: Date.now()
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2400);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[400] flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        <T s={msg && <motion.div key={msg.k} initial={{
        opacity: 0,
        y: 16,
        scale: 0.95
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: 8
      }} transition={{
        duration: 0.3,
        ease: EASE
      }} className={`rounded-full px-5 py-2.5 text-sm font-medium shadow-2xl ${className}`}>
            <T s={msg.m} />
          </motion.div>} />
      </AnimatePresence>
    </div>;
  return [node, show];
}

/** Endless horizontal strip. Children are drawn twice so the loop has no gap. */
export function Marquee({
  children,
  className = "",
  duration = "40s",
  reverse = false,
  gap = "gap-12"
}) {
  return <div className={`flex overflow-hidden ${className}`}>
      <div className={`flex w-max shrink-0 ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`} style={{
      "--duration": cv(duration)
    }}>
        <div className={`flex shrink-0 items-center pr-12 ${gap}`}><T s={children} /></div>
        <div className={`flex shrink-0 items-center pr-12 ${gap}`} aria-hidden="true">
          <T s={children} />
        </div>
      </div>
    </div>;
}

/** Counts down to a moment `ms` after the component first mounted. */
export function useCountdown(ms) {
  const [end] = useState(() => Date.now() + ms);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, end - now);
  return {
    d: Math.floor(left / 864e5),
    h: Math.floor(left / 36e5) % 24,
    m: Math.floor(left / 6e4) % 60,
    s: Math.floor(left / 1e3) % 60,
    left
  };
}
export const pad = n => String(n).padStart(2, "0");
export const money = (n, cur = "$", dec = 0) => `${cur}${n.toLocaleString("en-US", {
  minimumFractionDigits: dec,
  maximumFractionDigits: dec
})}`;

/** A cart kept in state: items keyed by id with a quantity. */
export function useCart() {
  const [items, setItems] = useState([]);
  const add = useCallback((item, qty = 1) => setItems(list => list.some(x => x.key === item.key) ? list.map(x => x.key === item.key ? {
    ...x,
    qty: x.qty + qty
  } : x) : [...list, {
    ...item,
    qty
  }]), []);
  const setQty = useCallback((key, qty) => setItems(list => qty <= 0 ? list.filter(x => x.key !== key) : list.map(x => x.key === key ? {
    ...x,
    qty
  } : x)), []);
  const clear = useCallback(() => setItems([]), []);
  const count = items.reduce((n, x) => n + x.qty, 0);
  const total = items.reduce((n, x) => n + x.qty * x.price, 0);
  return {
    items,
    add,
    setQty,
    clear,
    count,
    total
  };
}

/* ───────────── generated pictures (no image files anywhere) ───────────── */

// Pictures are "relative" by default so their layers fill them; a caller that positions one itself
// (absolute, fixed or sticky) wins, otherwise "relative" would cancel it and the picture would collapse.
const pos = className => /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className) ? "" : "relative ";

/** Soft mesh gradient — a stand-in for a photo. `colors[0]` is the base. */
export function Mesh({
  seed = 1,
  colors,
  className = "",
  children,
  style
}) {
  const r = k => rand(seed * 17 + k);
  const bg = colors.slice(1).map((c, i) => `radial-gradient(at ${Math.round(r(i) * 100)}% ${Math.round(r(i + 9) * 100)}%, ${c} 0px, transparent ${45 + Math.round(r(i + 3) * 25)}%)`).join(",");
  return <div className={`${pos(className)}overflow-hidden ${className}`} style={{
    backgroundColor: cv(colors[0]),
    backgroundImage: cv(bg),
    ...style
  }}>
      <T s={children} />
    </div>;
}

// A smooth ridge line across a 400-wide box, as a closed SVG path.
const ridge = (seed, base, amp, n = 7) => {
  const pts = Array.from({
    length: n + 1
  }, (_, i) => [i / n * 400, base - rand(seed + i * 3.1) * amp]);
  let d = `M0 300 L0 ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i],
      [x2, y2] = pts[i + 1];
    d += ` Q${x1.toFixed(1)} ${y1.toFixed(1)} ${((x1 + x2) / 2).toFixed(1)} ${((y1 + y2) / 2).toFixed(1)}`;
  }
  return d + ` L400 ${pts[n][1].toFixed(1)} L400 300 Z`;
};
export const SKIES = {
  dusk: ["#1e1b4b", "#f472b6", "#fde68a", "#7c3aed", "#4c1d95", "#2e1065"],
  dawn: ["#38bdf8", "#fecaca", "#fff7ed", "#94a3b8", "#64748b", "#334155"],
  sunset: ["#7c2d12", "#fb923c", "#fef3c7", "#9a3412", "#7c2d12", "#431407"],
  night: ["#020617", "#1e3a8a", "#e0f2fe", "#1e293b", "#0f172a", "#020617"],
  ocean: ["#0ea5e9", "#bae6fd", "#ffffff", "#0284c7", "#0369a1", "#075985"],
  forest: ["#134e4a", "#a7f3d0", "#fefce8", "#166534", "#14532d", "#052e16"],
  desert: ["#f59e0b", "#fde68a", "#fffbeb", "#d97706", "#b45309", "#78350f"],
  mist: ["#cbd5e1", "#f1f5f9", "#ffffff", "#94a3b8", "#64748b", "#475569"]
};

/**
 * An illustrated landscape that fills its box like a cover photo.
 * kind: "mountains" | "sea" | "city" | "dunes". sky: a SKIES name or [top, bottom, sun, far, mid, near].
 */
export function Scene({
  kind = "mountains",
  sky = "dusk",
  seed = 1,
  className = "",
  sun = true,
  children
}) {
  const [top, bottom, sunC, far, mid, near] = Array.isArray(sky) ? sky : SKIES[sky];
  const id = `sc${kind}${seed}${String(top).replace("#", "")}`;
  const sx = 80 + rand(seed) * 240;
  return <div className={`${pos(className)}overflow-hidden ${className}`}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={cv(top)} />
            <stop offset="1" stopColor={cv(bottom)} />
          </linearGradient>
          <radialGradient id={`${id}g`}>
            <stop offset="0" stopColor={cv(sunC)} stopOpacity="0.9" />
            <stop offset="1" stopColor={cv(sunC)} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={cv(mid)} />
            <stop offset="1" stopColor={cv(near)} />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill={cv(`url(#${id}s)`)} />
        <T s={sun && <>
            <circle cx={sx} cy={kind === "sea" ? 150 : 120} r="70" fill={cv(`url(#${id}g)`)} />
            <circle cx={sx} cy={kind === "sea" ? 150 : 120} r="22" fill={cv(sunC)} />
          </>} />
        <T s={kind === "mountains" && <>
            <path d={ridge(seed, 170, 70)} fill={cv(far)} opacity="0.75" />
            <path d={ridge(seed + 20, 215, 60)} fill={cv(mid)} opacity="0.9" />
            <path d={ridge(seed + 40, 255, 40, 5)} fill={cv(near)} />
          </>} />
        <T s={kind === "dunes" && <>
            <path d={ridge(seed, 200, 40, 3)} fill={cv(far)} />
            <path d={ridge(seed + 9, 238, 34, 3)} fill={cv(mid)} />
            <path d={ridge(seed + 17, 272, 26, 2)} fill={cv(near)} />
          </>} />
        <T s={kind === "sea" && <>
            <rect y="150" width="400" height="150" fill={cv(`url(#${id}w)`)} />
            <T s={sun && <rect x={sx - 20} y="152" width="40" height="120" fill={cv(sunC)} opacity="0.25" />} />
            <T s={Array.from({
          length: 9
        }).map((_, i) => <rect key={i} x={rand(seed + i) * 360} y={160 + i * 14} width={30 + rand(seed + i * 2) * 60} height="1.6" rx="1" fill="white" opacity={0.35 - i * 0.03} />)} />
            <path d={ridge(seed + 5, 150, 16, 4).replace("M0 300", "M0 151").replace("L400 300", "L400 151")} fill={cv(far)} opacity="0.8" />
          </>} />
        <T s={kind === "city" && <>
            <T s={Array.from({
          length: 22
        }).map((_, i) => {
          const w = 14 + rand(seed + i) * 18,
            h = 60 + rand(seed + i * 7) * 130,
            x = i * 19 - 6;
          return <rect key={`f${i}`} x={x} y={300 - h - 40} width={w} height={h + 40} fill={cv(far)} opacity="0.7" />;
        })} />
            <T s={Array.from({
          length: 14
        }).map((_, i) => {
          const w = 24 + rand(seed + i * 3) * 20,
            h = 50 + rand(seed + i * 11) * 110,
            x = i * 30 - 8;
          return <g key={`n${i}`}>
                  <rect x={x} y={300 - h} width={w} height={h} fill={cv(near)} />
                  <T s={Array.from({
              length: Math.floor(h / 14)
            }).map((_, j) => rand(seed + i * 31 + j) > 0.55 ? <rect key={j} x={x + 4 + j % 2 * (w / 2 - 2)} y={300 - h + 8 + j * 12} width="5" height="4" fill={cv(sunC)} opacity="0.7" /> : null)} />
                </g>;
        })} />
          </>} />
      </svg>
      <T s={children} />
    </div>;
}

/** A movie-poster style card: generated art with a title set in `font`. */
export function Poster({
  title,
  seed = 1,
  colors,
  font = "font-display",
  className = "",
  tag,
  kind
}) {
  const k = kind ?? ["mountains", "sea", "city", "dunes"][Math.floor(rand(seed * 5) * 4)];
  return <div className={`${pos(className)}overflow-hidden ${className}`}>
      <Scene kind={k} sky={colors} seed={seed} className="absolute inset-0" />
      <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent" />
      <T s={tag && <span className="absolute top-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase backdrop-blur"><T s={tag} /></span>} />
      <p className={`absolute inset-x-3 bottom-3 text-lg leading-tight font-bold text-white ${font}`}><T s={title} /></p>
    </div>;
}

/* ───────────── more shared pieces ───────────── */

/** Accordion. items: [[question, answer], …]. Style it through the class props. */
export function Faq({
  items,
  className = "",
  item = "border-b border-current/10",
  q = "py-5 font-semibold",
  a = "pb-5 opacity-70",
  first = 0
}) {
  const [open, setOpen] = useState(first);
  return <div className={className}>
      <T s={items.map(([qq, aa], k) => <div key={qq} className={item}>
          <button onClick={() => setOpen(open === k ? -1 : k)} className={`flex w-full items-center justify-between gap-4 text-left ${q}`} aria-expanded={open === k}>
            <T s={qq} />
            <ChevronDown className={`size-4 shrink-0 transition duration-300 ${open === k ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence initial={false}>
            <T s={open === k && <motion.div initial={{
          height: 0,
          opacity: 0
        }} animate={{
          height: "auto",
          opacity: 1
        }} exit={{
          height: 0,
          opacity: 0
        }} transition={{
          duration: 0.3,
          ease: EASE
        }} className="overflow-hidden">
                <p className={a}><T s={aa} /></p>
              </motion.div>} />
          </AnimatePresence>
        </div>)} />
    </div>;
}

/** Phone mockup. Put a screen inside it. */
export function Phone({
  children,
  className = "w-64",
  frame = "border-neutral-900 bg-neutral-900",
  screen = "bg-white",
  style
}) {
  return <div className={`relative aspect-[9/19] shrink-0 rounded-[2.6rem] border-[7px] shadow-2xl ${frame} ${className}`} style={cvs(style)}>
      <div className="absolute top-2 left-1/2 z-30 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
      <div className={`relative size-full overflow-hidden rounded-[2.1rem] ${screen}`}><T s={children} /></div>
    </div>;
}

/** Simple one-row footer: logo, links, small print. */
export function Footer({
  logo,
  links = ["About", "Careers", "Privacy", "Terms"],
  note,
  className = ""
}) {
  return <footer className={`px-5 py-12 sm:px-8 ${className}`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <T s={logo} />
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <T s={links.map(l => <a key={l} href="#" className="opacity-70 transition hover:opacity-100">
              <T s={l} />
            </a>)} />
        </nav>
        <T s={note && <p className="text-xs opacity-50"><T s={note} /></p>} />
      </div>
    </footer>;
}

/** A side-on car. `paint` is the body colour; wheel 0–2 picks the rim style; spin turns the wheels. */
export function Car({
  paint = "#e5e7eb",
  wheel = 0,
  spin = false,
  glow = "#a3e635",
  className = "w-full"
}) {
  const body = "M58 204C56 176 86 164 128 158L238 150C288 110 352 88 432 86C516 84 574 104 636 146L704 156C744 162 764 178 766 198L768 214C768 224 760 230 748 230L68 230C60 230 56 222 58 212Z";
  const id = `car${String(glow).replace("#", "")}`;
  const anim = spin ? {
    animation: "h-spin 0.9s linear infinite",
    transformBox: "fill-box",
    transformOrigin: "center"
  } : undefined;
  const W = ({
    x
  }) => <g>
      <circle cx={x} cy="226" r="52" fill={cv("#09090b")} />
      <circle cx={x} cy="226" r="47" fill={cv("#0b0b0d")} />
      <circle cx={x} cy="226" r="34" fill={cv("#2a2d33")} />
      <g style={cvs(anim)}>
        <T s={wheel === 0 && <circle cx={x} cy="226" r="31" fill={cv("#3f444c")} />} />
        <T s={wheel === 1 && [0, 72, 144, 216, 288].map(a => <rect key={a} x={x - 4} y={194} width="8" height="30" rx="3" fill={cv("#c7ccd4")} transform={`rotate(${a} ${x} 226)`} />)} />
        <T s={wheel === 2 && Array.from({
        length: 10
      }).map((_, k) => <path key={k} d={`M${x} 226 q10 -16 4 -32`} stroke={cv("#d4d4d8")} strokeWidth="4" fill="none" transform={`rotate(${k * 36} ${x} 226)`} />)} />
        <circle cx={x} cy="226" r="7" fill={cv(glow)} />
      </g>
    </g>;
  return <svg viewBox="0 0 820 300" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="white" stopOpacity="0.08" />
          <stop offset="0.6" stopColor="black" stopOpacity="0" />
          <stop offset="1" stopColor="black" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={cv("#334155")} />
          <stop offset="0.5" stopColor={cv("#0f172a")} />
          <stop offset="1" stopColor={cv("#1e293b")} />
        </linearGradient>
        <radialGradient id={`${id}u`}>
          <stop offset="0" stopColor={cv(glow)} stopOpacity="0.55" />
          <stop offset="1" stopColor={cv(glow)} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="410" cy="272" rx="360" ry="22" fill={cv(`url(#${id}u)`)} />
      <ellipse cx="410" cy="268" rx="330" ry="9" fill="black" opacity="0.6" />
      <motion.path initial={false} animate={{
      fill: paint
    }} transition={{
      duration: 0.7,
      ease: EASE
    }} d={body} />
      <path d={body} fill={cv(`url(#${id}s)`)} />
      <path d="M262 146C302 114 352 100 424 98C488 97 536 112 584 146Z" fill={cv(`url(#${id}g)`)} />
      <path d="M422 98V148" stroke={cv("#0b0b0d")} strokeWidth="6" />
      <path d="M300 152V214M520 150V214" stroke="black" strokeOpacity="0.22" strokeWidth="2" />
      <path d="M712 172C734 174 752 180 760 190" stroke={cv("#ecfccb")} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M60 186C66 176 80 170 98 168" stroke={cv("#ef4444")} strokeWidth="5" strokeLinecap="round" fill="none" />
      <W x={194} />
      <W x={626} />
    </svg>;
}

/** Small line chart from a list of numbers. */
export function Spark({
  data,
  className = "h-12 w-full",
  stroke = "currentColor",
  fill = "none",
  width = 2
}) {
  const max = Math.max(...data),
    min = Math.min(...data),
    span = max - min || 1;
  const pts = data.map((v, i) => `${i / (data.length - 1) * 100},${100 - (v - min) / span * 90 - 5}`).join(" ");
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden="true">
      <T s={fill !== "none" && <polygon points={`0,100 ${pts} 100,100`} fill={cv(fill)} />} />
      <polyline points={pts} fill="none" stroke={cv(stroke)} strokeWidth={width} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>;
}

/* ───────────── booking pieces (salons, barbers, venues, restaurants) ───────────── */

/** The next `days` days from today as Date objects (midnight). */
export const nextDays = (days = 14) => Array.from({
  length: days
}, (_, i) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + i);
  return d;
});

/** The first day index at or after `from` that is not one of the closed weekdays (0 = Sunday). */
export const firstOpen = (from = 0, closed = []) => {
  const d = nextDays(from + 8);
  let i = from;
  while (closed.includes(d[i].getDay())) i++;
  return i;
};

/** A row of day buttons. value is an index into nextDays(days); closedDays are weekdays (0 = Sunday) that can't be picked,
    and days before `minIndex` (notice needed) can't be picked either. */
export function DayStrip({
  value,
  onChange,
  days = 14,
  closedDays = [],
  minIndex = 0,
  className = "",
  active = "bg-black text-white",
  idle = "bg-white text-black ring-1 ring-black/10",
  off = "opacity-30"
}) {
  return <div className={`flex gap-1.5 overflow-x-auto pb-1 ${className}`}>
      <T s={nextDays(days).map((d, i) => {
      const closed = closedDays.includes(d.getDay()) || i < minIndex;
      return <button key={i} type="button" disabled={closed} onClick={() => onChange(i)} className={`flex w-14 shrink-0 flex-col items-center rounded-xl py-2 text-xs font-semibold transition ${value === i ? active : idle} ${closed ? off : ""}`} aria-label={d.toDateString()} aria-pressed={value === i}>
            <span className="opacity-70"><T s={i === 0 ? "Today" : d.toLocaleDateString("en-GB", {
            weekday: "short"
          })} /></span>
            <span className="text-base"><T s={d.getDate()} /></span>
          </button>;
    })} />
    </div>;
}

/** Time slots between `from` and `to` (hours) every `step` minutes; some are taken, decided by `seed` so they stay put. */
export const slotsFor = (seed, from = 9, to = 18, step = 30, busy = 0.32) => {
  const out = [];
  for (let m = from * 60; m < to * 60; m += step) {
    const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    out.push([t, rand(seed * 13.7 + m * 0.31) < busy]);
  }
  return out;
};

/** Marks slots that have already gone (or start within 15 minutes) as taken when the day is today. */
export const notPast = (slots, isToday) => {
  if (!isToday) return slots;
  const n = new Date(),
    now = n.getHours() * 60 + n.getMinutes();
  return slots.map(([t, b]) => [t, b || Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) <= now + 15]);
};

/** Grid of time slot buttons. Taken slots are crossed out. */
export function TimeSlots({
  slots,
  value,
  onChange,
  className = "grid grid-cols-3 gap-1.5 sm:grid-cols-4",
  active = "bg-black text-white",
  idle = "bg-white text-black ring-1 ring-black/10",
  taken = "text-black/25 line-through"
}) {
  const __lx = useLx();
  return <div className={className}>
      <T s={slots.map(([t, busy]) => <button key={t} type="button" disabled={busy} onClick={() => onChange(t)} className={`rounded-lg py-2 text-sm font-semibold transition ${busy ? taken : value === t ? active : idle}`} aria-label={__lx(`${t}${busy ? " taken" : ""}`)}>
          <T s={t} />
        </button>)} />
    </div>;
}

/** − n + stepper. */
export function Qty({
  value,
  onChange,
  min = 0,
  max = 99,
  className = "",
  btn = "grid size-8 place-items-center rounded-full bg-black/5",
  label = ""
}) {
  return <span className={`inline-flex items-center gap-2 ${className}`}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className={btn} aria-label={`Less ${label}`.trim()}>−</button>
      <span className="w-6 text-center font-semibold tabular-nums"><T s={value} /></span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className={btn} aria-label={`More ${label}`.trim()}>+</button>
    </span>;
}
