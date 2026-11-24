// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Cards/src/cards.jsx): do not edit.
import { T, useLx, cv, cvs } from "../runtime";
/* 10 card sets. */
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowUpRight, Check, Clock, Crown, Heart, Layers, Lock, MapPin, Plus, RotateCcw, ShoppingBag, Sparkles, TrendingDown, TrendingUp, X, Zap } from "lucide-react";
import { Avatar, Counter, EASE, reveal } from "./shared";
const Stage = ({
  dark,
  className = "",
  children
}) => <div className={`px-5 py-12 sm:px-8 ${dark ? "bg-[#0b0b10] text-white" : "bg-slate-100 text-slate-900 [color-scheme:light]"} ${className}`}><T s={children} /></div>;

/* ───────────── 01 · Product Cards ───────────── */
const PRODUCTS = [{
  name: "Aero Runner",
  price: 129,
  g: "from-orange-200 via-rose-200 to-pink-300",
  swatches: ["#fb7185", "#0f172a", "#e2e8f0"],
  tag: "New"
}, {
  name: "Cloud Hoodie",
  price: 89,
  g: "from-sky-200 via-indigo-200 to-violet-300",
  swatches: ["#818cf8", "#f5f5f4", "#334155"]
}, {
  name: "Trail Bottle",
  price: 34,
  g: "from-emerald-200 via-teal-200 to-cyan-300",
  swatches: ["#14b8a6", "#facc15"],
  tag: "-20%"
}];
function ProductCard({
  p,
  i
}) {
  const __lx = useLx();
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);
  const [sw, setSw] = useState(0);
  return <motion.div {...reveal(i * 0.1)} className="group overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow hover:shadow-xl">
      <div className={`relative aspect-[4/3] overflow-hidden bg-linear-to-br ${p.g}`}>
        <motion.div className="absolute inset-0 grid place-items-center" whileHover={{
        scale: 1.08
      }} transition={{
        duration: 0.5
      }}>
          <motion.div animate={{
          backgroundColor: p.swatches[sw]
        }} className="size-28 rounded-[40%] shadow-2xl" />
        </motion.div>
        <T s={p.tag && <span className="absolute top-3 left-3 rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white"><T s={p.tag} /></span>} />
        <button onClick={() => setLiked(l => !l)} className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/80 backdrop-blur" aria-label={__lx("Wishlist")}>
          <motion.span animate={liked ? {
          scale: [1, 1.4, 1]
        } : {
          scale: 1
        }}>
            <Heart className={`size-4 ${liked ? "fill-rose-500 text-rose-500" : "text-slate-600"}`} />
          </motion.span>
        </button>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <p className="font-semibold"><T s={p.name} /></p>
          <p className="font-display text-lg font-semibold">$<T s={p.price} /></p>
        </div>
        <div className="mt-3 flex gap-2">
          <T s={p.swatches.map((c, k) => <button key={c} onClick={() => setSw(k)} className={`size-6 rounded-full ring-2 ring-offset-2 transition ${sw === k ? "ring-slate-900" : "ring-transparent"}`} style={{
          background: cv(c)
        }} aria-label={__lx(`Color ${k + 1}`)} />)} />
        </div>
        <button onClick={() => setAdded(a => !a)} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${added ? "bg-emerald-500 text-white" : "bg-slate-900 text-white"}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={added ? "y" : "n"} initial={{
            y: 12,
            opacity: 0
          }} animate={{
            y: 0,
            opacity: 1
          }} exit={{
            y: -12,
            opacity: 0
          }} className="flex items-center gap-2">
              <T s={added ? <Check className="size-4" /> : <ShoppingBag className="size-4" />} />
              <T s={added ? "Added to bag" : "Add to bag"} />
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </motion.div>;
}
export function ProductCards() {
  return <Stage>
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
        <T s={PRODUCTS.map((p, i) => <ProductCard key={p.name} p={p} i={i} />)} />
      </div>
    </Stage>;
}

/* ───────────── 02 · Profile Cards ───────────── */
const PEOPLE = [{
  n: "Lina Haddad",
  r: "Product designer",
  loc: "Amman",
  f: 2410,
  cover: "from-fuchsia-500 to-orange-400"
}, {
  n: "Marcus Chen",
  r: "Frontend engineer",
  loc: "Berlin",
  f: 1780,
  cover: "from-sky-500 to-indigo-600"
}, {
  n: "Sara Okafor",
  r: "Illustrator",
  loc: "Lagos",
  f: 5320,
  cover: "from-emerald-400 to-teal-600"
}];
function ProfileCard({
  p,
  i
}) {
  const [following, setFollowing] = useState(false);
  return <motion.div {...reveal(i * 0.1)} whileHover={{
    y: -6
  }} className="overflow-hidden rounded-3xl border border-white/10 bg-[#13131b]">
      <div className={`h-24 bg-linear-to-br ${p.cover}`} />
      <div className="-mt-10 px-5 pb-5">
        <Avatar name={p.n} i={i + 2} className="size-20 text-xl ring-4 ring-[#13131b]" />
        <p className="mt-3 text-lg font-semibold"><T s={p.n} /></p>
        <p className="text-sm text-white/55"><T s={p.r} /></p>
        <p className="mt-1 flex items-center gap-1 text-xs text-white/40">
          <MapPin className="size-3" /> <T s={p.loc} />
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <T s={[[p.f + (following ? 1 : 0), "followers"], [48, "projects"], [312, "likes"]].map(([v, l]) => <div key={l} className="rounded-xl bg-white/5 py-2">
              <p className="text-sm font-semibold tabular-nums"><T s={v.toLocaleString("en-US")} /></p>
              <p className="text-white/40"><T s={l} /></p>
            </div>)} />
        </div>
        <motion.button whileTap={{
        scale: 0.95
      }} onClick={() => setFollowing(f => !f)} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${following ? "bg-white/10 text-white" : "bg-white text-black"}`}>
          <T s={following ? <Check className="size-4" /> : <Plus className="size-4" />} />
          <T s={following ? "Following" : "Follow"} />
        </motion.button>
      </div>
    </motion.div>;
}
export function ProfileCards() {
  return <Stage dark>
      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
        <T s={PEOPLE.map((p, i) => <ProfileCard key={p.n} p={p} i={i} />)} />
      </div>
    </Stage>;
}

/* ───────────── 03 · 3D Tilt Cards ───────────── */
function TiltCard({
  title,
  text,
  g,
  icon: Icon
}) {
  const ref = useRef(null);
  const rx = useSpring(0, {
    stiffness: 200,
    damping: 18
  });
  const ry = useSpring(0, {
    stiffness: 200,
    damping: 18
  });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.35), transparent 50%)`;
  return <div style={{
    perspective: 900
  }}>
      <motion.div ref={ref} onMouseMove={e => {
      const r = ref.current.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry.set((px - 0.5) * 24);
      rx.set((0.5 - py) * 24);
      gx.set(px * 100);
      gy.set(py * 100);
    }} onMouseLeave={() => {
      rx.set(0);
      ry.set(0);
    }} style={{
      rotateX: rx,
      rotateY: ry,
      transformStyle: "preserve-3d"
    }} className={`relative h-72 overflow-hidden rounded-3xl bg-linear-to-br p-6 text-white shadow-2xl ${g}`}>
        <motion.div className="pointer-events-none absolute inset-0" style={{
        background: cv(glare)
      }} />
        <div style={{
        transform: "translateZ(40px)"
      }} className="relative flex h-full flex-col justify-between">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon className="size-6" />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold"><T s={title} /></p>
            <p className="mt-1 text-sm text-white/80"><T s={text} /></p>
          </div>
        </div>
      </motion.div>
    </div>;
}
export function TiltCards() {
  const __lx = useLx();
  return <Stage dark>
      <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
        <TiltCard title={__lx("Lightning fast")} text={__lx("Pages load in under 100ms, everywhere.")} g="from-violet-600 to-indigo-800" icon={Zap} />
        <TiltCard title={__lx("Private by default")} text={__lx("End-to-end encrypted, always.")} g="from-emerald-500 to-teal-700" icon={Lock} />
        <TiltCard title={__lx("Beautifully layered")} text={__lx("Design systems that scale with you.")} g="from-orange-500 to-rose-700" icon={Layers} />
      </div>
      <p className="mt-6 text-center text-sm text-white/40"><T s={"Move your mouse over the cards"} /></p>
    </Stage>;
}

/* ───────────── 04 · Spotlight Border ───────────── */
const SPOT = [["Realtime sync", "Every change lands everywhere instantly."], ["Version history", "Rewind any file to any moment."], ["Offline mode", "Keep working on the plane."], ["Smart search", "Find anything with natural language."], ["Granular roles", "Control who sees what."], ["Open API", "Automate the boring parts."]];
export function SpotlightBorderCards() {
  const refs = useRef([]);
  const onMove = e => {
    refs.current.forEach(el => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--x", `${e.clientX - r.left}px`);
      el.style.setProperty("--y", `${e.clientY - r.top}px`);
    });
  };
  return <Stage dark>
      <div onMouseMove={onMove} className="group/grid mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <T s={SPOT.map(([t, d], i) => <div key={t} ref={el => refs.current[i] = el} className="relative rounded-2xl bg-white/10 p-px">
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/grid:opacity-100" style={{
          background: cv("radial-gradient(260px circle at var(--x) var(--y), rgba(167,139,250,0.9), transparent 60%)")
        }} />
            <div className="relative h-full rounded-[15px] bg-[#101018] p-6">
              <div className="pointer-events-none absolute inset-0 rounded-[15px] opacity-0 transition-opacity duration-300 group-hover/grid:opacity-100" style={{
            background: cv("radial-gradient(300px circle at var(--x) var(--y), rgba(139,92,246,0.12), transparent 60%)")
          }} />
              <Sparkles className="relative size-5 text-violet-300" />
              <p className="relative mt-4 font-semibold"><T s={t} /></p>
              <p className="relative mt-1 text-sm text-white/50"><T s={d} /></p>
            </div>
          </div>)} />
      </div>
    </Stage>;
}

/* ───────────── 05 · Blog Cards ───────────── */
const POSTS = [{
  tag: "Design",
  t: "The quiet power of whitespace",
  e: "Why the best interfaces say less — and how to get there.",
  a: "Nadia F.",
  m: 6,
  g: "from-amber-200 via-orange-300 to-rose-400"
}, {
  tag: "Engineering",
  t: "Shipping 300 deploys a day",
  e: "What we learned scaling CI without losing our minds.",
  a: "Tom W.",
  m: 9,
  g: "from-sky-300 via-cyan-300 to-emerald-300"
}, {
  tag: "Culture",
  t: "Four-day weeks, one year in",
  e: "The data, the surprises and what we'd change.",
  a: "Rania A.",
  m: 5,
  g: "from-violet-300 via-fuchsia-300 to-pink-300"
}];
export function BlogCards() {
  return <Stage>
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
        <T s={POSTS.map((p, i) => <motion.a key={p.t} href="#" {...reveal(i * 0.1)} whileHover={{
        y: -6
      }} className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm transition-shadow hover:shadow-xl">
            <div className="relative aspect-[16/10] overflow-hidden">
              <div className={`absolute inset-0 bg-linear-to-br transition-transform duration-700 group-hover:scale-110 ${p.g}`} />
              <div className="absolute bottom-0 left-6 size-24 translate-y-1/3 rounded-full bg-white/40 blur-sm transition-transform duration-700 group-hover:-translate-y-2" />
              <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold"><T s={p.tag} /></span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <p className="font-display text-xl leading-snug font-semibold"><T s={p.t} /></p>
              <p className="mt-2 flex-1 text-sm text-slate-500"><T s={p.e} /></p>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Avatar name={p.a} i={i} className="size-7" /> <T s={p.a} />
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="size-3.5" /> <T s={p.m} /><T s={" min"} /><ArrowUpRight className="ml-1 size-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </span>
              </div>
            </div>
          </motion.a>)} />
      </div>
    </Stage>;
}

/* ───────────── 06 · Flip Cards ───────────── */
const FLIPS = [{
  t: "Starter",
  front: "from-sky-400 to-blue-600",
  icon: Sparkles,
  back: ["3 projects", "5 GB storage", "Email support"]
}, {
  t: "Pro",
  front: "from-violet-500 to-fuchsia-600",
  icon: Crown,
  back: ["Unlimited projects", "100 GB storage", "Priority support"]
}, {
  t: "Team",
  front: "from-amber-400 to-orange-600",
  icon: Layers,
  back: ["Everything in Pro", "SSO & roles", "Dedicated manager"]
}];
function FlipCard({
  f
}) {
  const __lx = useLx();
  const [flip, setFlip] = useState(false);
  const face = "absolute inset-0 rounded-3xl p-6 [backface-visibility:hidden]";
  return <button onClick={() => setFlip(x => !x)} className="h-72 text-left" style={{
    perspective: 1000
  }} aria-label={__lx(`Flip ${f.t}`)}>
      <motion.div animate={{
      rotateY: flip ? 180 : 0
    }} transition={{
      duration: 0.7,
      ease: EASE
    }} className="relative size-full" style={{
      transformStyle: "preserve-3d"
    }}>
        <div className={`${face} flex flex-col justify-between bg-linear-to-br text-white shadow-xl ${f.front}`}>
          <f.icon className="size-8" />
          <div>
            <p className="font-display text-3xl font-semibold"><T s={f.t} /></p>
            <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
              <RotateCcw className="size-3.5" /><T s={" Click to flip"} /></p>
          </div>
        </div>
        <div className={`${face} bg-white text-slate-900 shadow-xl [transform:rotateY(180deg)]`}>
          <p className="font-display text-2xl font-semibold"><T s={f.t} /><T s={" includes"} /></p>
          <ul className="mt-5 space-y-3 text-sm">
            <T s={f.back.map(b => <li key={b} className="flex items-center gap-2">
                <Check className="size-4 text-emerald-500" /> <T s={b} />
              </li>)} />
          </ul>
        </div>
      </motion.div>
    </button>;
}
export function FlipCards() {
  return <Stage>
      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
        <T s={FLIPS.map(f => <FlipCard key={f.t} f={f} />)} />
      </div>
    </Stage>;
}

/* ───────────── 07 · KPI Cards ───────────── */
const KPIS = [{
  l: "Revenue",
  v: 84320,
  p: "$",
  ch: 12.4,
  path: "M0 30 L15 26 L30 28 L45 18 L60 20 L75 10 L90 12 L105 4 L120 6",
  c: "#8b5cf6"
}, {
  l: "Active users",
  v: 12480,
  ch: 8.1,
  path: "M0 28 L15 24 L30 25 L45 20 L60 14 L75 16 L90 9 L105 10 L120 5",
  c: "#06b6d4"
}, {
  l: "Churn",
  v: 2.4,
  d: 1,
  s: "%",
  ch: -0.6,
  path: "M0 8 L15 10 L30 9 L45 14 L60 13 L75 18 L90 20 L105 22 L120 26",
  c: "#10b981"
}, {
  l: "Avg. order",
  v: 64.2,
  d: 2,
  p: "$",
  ch: 3.2,
  path: "M0 22 L15 20 L30 24 L45 16 L60 18 L75 12 L90 14 L105 9 L120 10",
  c: "#f59e0b"
}];
export function KpiCards() {
  return <Stage dark>
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <T s={KPIS.map((k, i) => {
        const up = k.ch > 0;
        const good = k.l === "Churn" ? !up : up;
        return <motion.div key={k.l} {...reveal(i * 0.08)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/55"><T s={k.l} /></span>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${good ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                  <T s={up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} />
                  <T s={Math.abs(k.ch)} />%
                </span>
              </div>
              <p className="mt-3 font-display text-3xl font-semibold">
                <Counter to={k.v} decimals={k.d ?? 0} prefix={k.p ?? ""} suffix={k.s ?? ""} />
              </p>
              <svg viewBox="0 0 120 34" className="mt-4 w-full overflow-visible">
                <motion.path d={k.path} fill="none" stroke={k.c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{
              pathLength: 0
            }} whileInView={{
              pathLength: 1
            }} viewport={{
              once: true
            }} transition={{
              duration: 1.4,
              delay: 0.3 + i * 0.1
            }} />
              </svg>
            </motion.div>;
      })} />
      </div>
    </Stage>;
}

/* ───────────── 08 · Expandable Cards ───────────── */
const PLACES = [{
  id: "petra",
  t: "Petra",
  s: "Jordan",
  g: "from-orange-300 via-rose-400 to-red-500",
  d: "Walk through the Siq at sunrise and watch the Treasury glow pink. Stay two days to reach the Monastery."
}, {
  id: "kyoto",
  t: "Kyoto",
  s: "Japan",
  g: "from-pink-300 via-rose-300 to-red-400",
  d: "Temples, tea houses and quiet gardens. Visit in early April for the cherry blossoms."
}, {
  id: "lisbon",
  t: "Lisbon",
  s: "Portugal",
  g: "from-amber-200 via-yellow-300 to-sky-400",
  d: "Seven hills, yellow trams and pastel de nata. Sunset at a miradouro is non-negotiable."
}, {
  id: "reykjavik",
  t: "Reykjavík",
  s: "Iceland",
  g: "from-cyan-300 via-sky-500 to-indigo-700",
  d: "Northern lights, hot springs and black sand beaches — all within a short drive."
}];
export function ExpandableCards() {
  const __lx = useLx();
  const [open, setOpen] = useState(null);
  const sel = PLACES.find(p => p.id === open);
  return <Stage className="relative min-h-[520px]">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
        <T s={PLACES.map(p => <motion.button key={p.id} layoutId={`place-${p.id}`} onClick={() => setOpen(p.id)} className={`relative h-64 overflow-hidden rounded-3xl bg-linear-to-br text-left text-white ${p.g}`}>
            <motion.div layoutId={`place-t-${p.id}`} className="absolute bottom-4 left-4">
              <p className="text-xs text-white/80"><T s={p.s} /></p>
              <p className="font-display text-2xl font-semibold"><T s={p.t} /></p>
            </motion.div>
          </motion.button>)} />
      </div>
      <AnimatePresence>
        <T s={sel && <>
            <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} onClick={() => setOpen(null)} className="absolute inset-0 z-10 bg-black/40 backdrop-blur-sm" />
            <motion.div layoutId={`place-${sel.id}`} className={`absolute inset-x-4 top-8 z-20 mx-auto max-w-xl overflow-hidden rounded-3xl bg-linear-to-br text-white shadow-2xl ${sel.g}`}>
              <div className="h-44" />
              <div className="bg-white p-6 text-slate-900">
                <motion.div layoutId={`place-t-${sel.id}`}>
                  <p className="text-xs text-slate-500"><T s={sel.s} /></p>
                  <p className="font-display text-3xl font-semibold"><T s={sel.t} /></p>
                </motion.div>
                <motion.p initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.2
            }} className="mt-3 text-slate-600">
                  <T s={sel.d} />
                </motion.p>
                <button onClick={() => setOpen(null)} className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><T s={"Close"} /></button>
              </div>
              <button onClick={() => setOpen(null)} className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-black/30" aria-label={__lx("Close")}>
                <X className="size-4" />
              </button>
            </motion.div>
          </>} />
      </AnimatePresence>
    </Stage>;
}

/* ───────────── 09 · Swipe Deck ───────────── */
const DECK = [{
  n: "Yasmin, 27",
  t: "Loves hiking & coffee",
  g: "from-rose-400 to-orange-300"
}, {
  n: "Omar, 30",
  t: "Chef · plays oud",
  g: "from-sky-400 to-indigo-500"
}, {
  n: "Lea, 25",
  t: "Architect · cat person",
  g: "from-emerald-400 to-teal-500"
}, {
  n: "Karim, 29",
  t: "Climber & photographer",
  g: "from-violet-400 to-fuchsia-500"
}];
function SwipeCard({
  c,
  top,
  onGone
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const like = useTransform(x, [20, 120], [0, 1]);
  const nope = useTransform(x, [-120, -20], [1, 0]);
  return <motion.div drag={top ? "x" : false} dragConstraints={{
    left: 0,
    right: 0
  }} style={{
    x,
    rotate
  }} onDragEnd={(_, info) => {
    if (Math.abs(info.offset.x) > 120) onGone(info.offset.x > 0 ? 1 : -1);
  }} initial={{
    scale: 0.95,
    y: 10
  }} animate={{
    scale: top ? 1 : 0.95,
    y: top ? 0 : 10
  }} variants={{
    exit: d => ({
      x: d * 500,
      opacity: 0,
      transition: {
        duration: 0.35
      }
    })
  }} exit="exit" className={`absolute inset-0 flex cursor-grab flex-col justify-end overflow-hidden rounded-3xl bg-linear-to-br p-6 text-white shadow-2xl active:cursor-grabbing ${c.g}`}>
      <motion.span style={{
      opacity: like
    }} className="absolute top-6 left-6 rotate-[-12deg] rounded-lg border-4 border-emerald-300 px-3 py-1 text-2xl font-black text-emerald-200"><T s={"LIKE"} /></motion.span>
      <motion.span style={{
      opacity: nope
    }} className="absolute top-6 right-6 rotate-[12deg] rounded-lg border-4 border-rose-300 px-3 py-1 text-2xl font-black text-rose-200"><T s={"NOPE"} /></motion.span>
      <p className="font-display text-3xl font-semibold"><T s={c.n} /></p>
      <p className="text-white/85"><T s={c.t} /></p>
    </motion.div>;
}
export function SwipeDeck() {
  const __lx = useLx();
  const [cards, setCards] = useState(() => DECK.map((c, i) => ({
    ...c,
    id: i
  })));
  const [dir, setDir] = useState(1);
  const gone = d => {
    setDir(d);
    setCards(cs => cs.slice(1));
  };
  const swipe = gone;
  return <Stage className="flex flex-col items-center">
      <div className="relative h-96 w-72">
        <AnimatePresence custom={dir}>
          <T s={cards.slice(0, 3).reverse().map(c => <SwipeCard key={c.id} c={c} top={c.id === cards[0]?.id} onGone={gone} />)} />
        </AnimatePresence>
        <T s={cards.length === 0 && <div className="absolute inset-0 grid place-items-center rounded-3xl border-2 border-dashed border-slate-300 text-center">
            <div>
              <p className="font-semibold"><T s={"That's everyone!"} /></p>
              <button onClick={() => setCards(DECK.map((c, i) => ({
            ...c,
            id: Date.now() + i
          })))} className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm text-white"><T s={"Start over"} /></button>
            </div>
          </div>} />
      </div>
      <div className="mt-6 flex gap-4">
        <button onClick={() => swipe(-1)} className="grid size-14 place-items-center rounded-full bg-white text-rose-500 shadow-lg" aria-label={__lx("Nope")}>
          <X className="size-6" />
        </button>
        <button onClick={() => swipe(1)} className="grid size-14 place-items-center rounded-full bg-white text-emerald-500 shadow-lg" aria-label={__lx("Like")}>
          <Heart className="size-6 fill-current" />
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-500"><T s={"Drag a card left or right"} /></p>
    </Stage>;
}

/* ───────────── 10 · Glass Cards ───────────── */
export function GlassCards() {
  return <div className="relative overflow-hidden bg-[#0c0820] px-5 py-14 text-white sm:px-8">
      <motion.div className="pointer-events-none absolute top-0 left-1/4 size-72 rounded-full bg-fuchsia-500/60 blur-[90px]" animate={{
      x: [0, 80, 0]
    }} transition={{
      duration: 10,
      repeat: Infinity
    }} />
      <motion.div className="pointer-events-none absolute right-1/4 bottom-0 size-72 rounded-full bg-cyan-400/50 blur-[90px]" animate={{
      y: [0, -60, 0]
    }} transition={{
      duration: 12,
      repeat: Infinity
    }} />
      <div className="relative mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
        <T s={[["Basic", "$9", ["1 seat", "Core features"]], ["Plus", "$19", ["5 seats", "Automations", "Analytics"]], ["Max", "$49", ["Unlimited seats", "Everything", "24/7 support"]]].map(([t, p, f], i) => <motion.div key={t} {...reveal(i * 0.1)} whileHover={{
        y: -8
      }} className={`rounded-3xl border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl ${i === 1 ? "sm:-translate-y-4" : ""}`}>
            <p className="text-sm text-white/70"><T s={t} /></p>
            <p className="mt-2 font-display text-4xl font-semibold">
              <T s={p} />
              <span className="text-base font-normal text-white/50"><T s={"/mo"} /></span>
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <T s={f.map(x => <li key={x} className="flex items-center gap-2">
                  <Check className="size-4 text-cyan-300" /> <T s={x} />
                </li>)} />
            </ul>
            <button className="mt-6 w-full rounded-xl bg-white/90 py-2.5 text-sm font-semibold text-black"><T s={"Choose "} /><T s={t} /></button>
          </motion.div>)} />
      </div>
    </div>;
}
