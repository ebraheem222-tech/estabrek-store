// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Templates/src/sites/maison.jsx): do not edit.
import { T, useLx, cv, cvs } from "../../runtime";
/* Maison Lune — a luxury fashion store with filters, quick view, wishlist, lookbook and a working bag. */
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, Gift, Heart, Minus, Plus, RotateCcw, Search, ShoppingBag, Sparkles, Truck, X } from "lucide-react";
import { EASE, reveal } from "../shared";
import { Drawer, Marquee, Mesh, Modal, SiteNav, money, useCart, useToast } from "../kit";
const GOLD = "#c8a75d";

/* Products are drawn, not photographed. Each takes a main colour `c`. */
function Art({
  type,
  c
}) {
  const shade = {
    filter: "brightness(0.82)"
  };
  const box = "h-[78%] w-auto drop-shadow-[0_24px_30px_rgba(60,40,20,0.22)]";
  if (type === "bag") return <svg viewBox="0 0 200 240" className={box}>
        <path d="M68 104V82a32 32 0 0 1 64 0v22" fill="none" stroke={cv(c)} strokeWidth="9" strokeLinecap="round" style={cvs(shade)} />
        <path d="M36 102h128l10 112a12 12 0 0 1-12 13H38a12 12 0 0 1-12-13z" fill={cv(c)} />
        <path d="M36 102h128l3 40c-20 14-114 14-134 0z" fill="black" opacity="0.13" />
        <path d="M44 214h112" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="4 4" />
        <rect x="90" y="132" width="20" height="15" rx="3" fill={cv(GOLD)} />
        <circle cx="100" cy="139" r="3" fill={cv("#8a6d2c")} />
      </svg>;
  if (type === "perfume") return <svg viewBox="0 0 200 240" className={box}>
        <defs>
          <linearGradient id={`pf${c.slice(1)}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="0.55" />
            <stop offset="0.35" stopColor="white" stopOpacity="0.1" />
            <stop offset="1" stopColor="white" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <rect x="78" y="34" width="44" height="36" rx="4" fill={cv(GOLD)} />
        <rect x="88" y="70" width="24" height="16" fill={cv("#a8894a")} />
        <rect x="46" y="86" width="108" height="130" rx="14" fill={cv(c)} opacity="0.85" />
        <rect x="46" y="86" width="108" height="130" rx="14" fill={cv(`url(#pf${c.slice(1)})`)} />
        <rect x="70" y="140" width="60" height="34" fill={cv("#f5f1ea")} opacity="0.9" />
        <text x="100" y="162" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="15" fill={cv("#1c1917")}><T s={"NUIT"} /></text>
      </svg>;
  if (type === "glasses") return <svg viewBox="0 0 220 140" className="w-[78%] drop-shadow-[0_20px_24px_rgba(60,40,20,0.25)]">
        <path d="M20 46h180" stroke={cv(c)} strokeWidth="6" />
        <path d="M14 44c0-8 8-10 12-8M206 44c0-8-8-10-12-8" stroke={cv(c)} strokeWidth="5" fill="none" />
        <T s={[62, 158].map(x => <g key={x}>
            <circle cx={x} cy="72" r="40" fill={cv(c)} />
            <circle cx={x} cy="72" r="33" fill={cv("#2b1d12")} />
            <ellipse cx={x - 12} cy="60" rx="10" ry="6" fill="white" opacity="0.25" transform={`rotate(-30 ${x - 12} 60)`} />
          </g>)} />
        <path d="M98 66q12-10 24 0" stroke={cv(c)} strokeWidth="6" fill="none" />
      </svg>;
  if (type === "heel") return <svg viewBox="0 0 240 180" className="w-[82%] drop-shadow-[0_24px_24px_rgba(60,40,20,0.25)]">
        <path d="M20 128c30-6 62-24 92-48 10-8 26-6 32 6l48 66c6 8 18 10 30 10v8H30c-12 0-16-12-10-18z" fill={cv(c)} />
        <path d="M150 92l12 84h-10l-18-70z" fill={cv(c)} style={cvs(shade)} />
        <path d="M24 136c40 0 80-30 104-52" stroke="white" strokeOpacity="0.25" strokeWidth="2" fill="none" />
        <path d="M196 160h26v8h-26z" fill={cv("#1c1917")} opacity="0.7" />
      </svg>;
  if (type === "scarf") return <svg viewBox="0 0 200 240" className={box}>
        <path d="M40 40h120l-10 150-40 30-40-30z" fill={cv(c)} />
        <T s={[0, 1, 2, 3, 4].map(k => <path key={k} d={`M${50 + k * 4} ${60 + k * 28}h${100 - k * 8}`} stroke={cv(GOLD)} strokeWidth="3" opacity="0.8" />)} />
        <circle cx="100" cy="120" r="26" fill="none" stroke={cv(GOLD)} strokeWidth="3" />
        <path d="M100 98a22 22 0 1 0 14 40 18 18 0 1 1-14-40z" fill={cv(GOLD)} />
        <path d="M70 190l40 30 40-30" stroke="black" strokeOpacity="0.15" strokeWidth="2" fill="none" />
      </svg>;
  // coat and knit share a body; the coat is longer with lapels and a belt
  const coat = type === "coat";
  return <svg viewBox="0 0 200 260" className="h-[84%] w-auto drop-shadow-[0_24px_30px_rgba(60,40,20,0.22)]">
      <T s={coat && <path d="M100 8v10M100 18c-4 0-6 4-4 7l4 3 4-3c2-3 0-7-4-7z" stroke={cv("#8a6d2c")} strokeWidth="3" fill="none" />} />
      <T s={coat && <path d="M100 28 42 50h116z" fill="none" stroke={cv("#8a6d2c")} strokeWidth="3" />} />
      <path d={coat ? "M70 44h60l30 14 22 120-20 4-10-60v128H48V122l-10 60-20-4 22-120z" : "M72 48h56l34 16 18 90-22 6-12-52v84H58v-84l-12 52-22-6 18-90z"} fill={cv(c)} />
      <T s={coat ? <>
          <path d="M70 44l30 70 30-70" fill="none" stroke="black" strokeOpacity="0.18" strokeWidth="3" />
          <path d="M70 44l-6 40 36 30M130 44l6 40-36 30" fill={cv(c)} stroke="black" strokeOpacity="0.15" strokeWidth="2" style={cvs(shade)} />
          <path d="M48 150h104v12H48z" fill={cv(c)} style={{
        filter: "brightness(0.75)"
      }} />
          <rect x="92" y="148" width="16" height="16" rx="2" fill="none" stroke={cv(GOLD)} strokeWidth="3" />
          <T s={[180, 210].map(y => <circle key={y} cx="112" cy={y} r="3.5" fill={cv("#1c1917")} opacity="0.5" />)} />
        </> : <>
          <path d="M84 48q16 16 32 0" fill="none" stroke="black" strokeOpacity="0.2" strokeWidth="5" />
          <T s={Array.from({
        length: 9
      }).map((_, k) => <path key={k} d={`M${66 + k * 9} 196v14`} stroke="black" strokeOpacity="0.15" strokeWidth="2" />)} />
          <path d="M58 100h84M58 130h84M58 160h84" stroke="white" strokeOpacity="0.08" strokeWidth="6" />
        </>} />
    </svg>;
}
const PRODUCTS = [{
  id: "coat",
  name: "Lune Wool Coat",
  cat: "Women",
  type: "coat",
  price: 1450,
  tag: "New",
  colors: [["Camel", "#b98d5f"], ["Noir", "#26211e"], ["Ivory", "#e4dccd"]],
  sizes: ["XS", "S", "M", "L"]
}, {
  id: "bag",
  name: "Crescent Bag",
  cat: "Bags",
  type: "bag",
  price: 2200,
  tag: "Icon",
  colors: [["Noir", "#1f1b18"], ["Bordeaux", "#6b1d2a"], ["Sand", "#cbb594"]]
}, {
  id: "perfume",
  name: "Nuit Eau de Parfum",
  cat: "Fragrance",
  type: "perfume",
  price: 185,
  colors: [["Amber", "#c0814a"], ["Rose", "#d59a9a"], ["Smoke", "#6b6460"]]
}, {
  id: "glasses",
  name: "Orbit Sunglasses",
  cat: "Accessories",
  type: "glasses",
  price: 420,
  colors: [["Tortoise", "#7a4a26"], ["Noir", "#1c1917"], ["Gold", "#c8a75d"]]
}, {
  id: "heel",
  name: "Étoile Pump 95",
  cat: "Shoes",
  type: "heel",
  price: 890,
  tag: "New",
  colors: [["Noir", "#1c1917"], ["Nude", "#d8b59a"], ["Rouge", "#9f1d2f"]],
  sizes: ["36", "37", "38", "39", "40"]
}, {
  id: "scarf",
  name: "Silk Carré 90",
  cat: "Accessories",
  type: "scarf",
  price: 460,
  colors: [["Navy", "#1e2a44"], ["Terracotta", "#a85a3a"], ["Sage", "#7d8b6f"]]
}, {
  id: "knit",
  name: "Cashmere Crew",
  cat: "Men",
  type: "knit",
  price: 780,
  colors: [["Oat", "#d8ccb6"], ["Charcoal", "#3b3936"], ["Forest", "#2f4a3a"]],
  sizes: ["S", "M", "L", "XL"]
}, {
  id: "weekender",
  name: "Le Weekender",
  cat: "Bags",
  type: "bag",
  price: 2600,
  colors: [["Cognac", "#8a4b25"], ["Noir", "#1f1b18"], ["Olive", "#5c5a3a"]]
}];
const CATS = ["All", "Women", "Men", "Bags", "Shoes", "Fragrance", "Accessories"];
const LOOKS = [["Look 01", "Camel & Noir", ["#e9dfcf", "#d2b48c", "#f5efe4"], ["coat", 0], ["bag", 0]], ["Look 02", "Evening in Bordeaux", ["#2a1a1c", "#6b1d2a", "#3d2326"], ["heel", 2], ["bag", 1]], ["Look 03", "Riviera", ["#e8eef0", "#b9d3dd", "#f3efe6"], ["glasses", 0], ["scarf", 0]]];
function Quick({
  p,
  onClose,
  onAdd
}) {
  const __lx = useLx();
  const [ci, setCi] = useState(0);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [acc, setAcc] = useState(-1);
  if (!p) return null;
  const needSize = p.sizes && !size;
  return <div className="grid grid-cols-1 overflow-hidden bg-[#f5f1ea] text-stone-800 md:grid-cols-2">
      <div className="relative grid aspect-square place-items-center bg-[#ebe4d8] md:aspect-auto">
        <AnimatePresence mode="wait">
          <motion.div key={ci} initial={{
          opacity: 0,
          scale: 0.94
        }} animate={{
          opacity: 1,
          scale: 1
        }} exit={{
          opacity: 0
        }} transition={{
          duration: 0.4
        }} className="grid size-full place-items-center p-10">
            <Art type={p.type} c={p.colors[ci][1]} />
          </motion.div>
        </AnimatePresence>
        <button onClick={onClose} className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/70 md:hidden" aria-label={__lx("Close")}>
          <X className="size-4" />
        </button>
      </div>
      <div className="relative p-7 sm:p-10">
        <button onClick={onClose} className="absolute top-5 right-5 hidden size-10 place-items-center rounded-full hover:bg-black/5 md:grid" aria-label={__lx("Close")}>
          <X className="size-4" />
        </button>
        <p className="text-[11px] tracking-[0.25em] text-stone-500 uppercase"><T s={p.cat} /></p>
        <h3 className="mt-2 font-cormorant text-4xl font-semibold text-stone-900"><T s={p.name} /></h3>
        <p className="mt-2 text-lg"><T s={money(p.price, "€")} /></p>
        <p className="mt-6 text-xs tracking-widest text-stone-500 uppercase"><T s={"Colour — "} /><span className="text-stone-900"><T s={p.colors[ci][0]} /></span>
        </p>
        <div className="mt-3 flex gap-2">
          <T s={p.colors.map(([n, c], k) => <button key={n} onClick={() => setCi(k)} className={`size-8 rounded-full border-2 transition ${ci === k ? "border-stone-900" : "border-transparent"}`} aria-label={__lx(n)}>
              <span className="block size-full rounded-full border border-black/10" style={{
            background: cv(c)
          }} />
            </button>)} />
        </div>
        <T s={p.sizes && <>
            <p className="mt-6 text-xs tracking-widest text-stone-500 uppercase"><T s={"Size"} /></p>
            <div className="mt-3 flex flex-wrap gap-2">
              <T s={p.sizes.map(s => <button key={s} onClick={() => setSize(s)} className={`h-10 min-w-12 border px-3 text-sm transition ${size === s ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 hover:border-stone-900"}`}>
                  <T s={s} />
                </button>)} />
            </div>
          </>} />
        <div className="mt-8 flex gap-3">
          <div className="flex items-center border border-stone-300">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid size-12 place-items-center" aria-label={__lx("One less")}>
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center"><T s={qty} /></span>
            <button onClick={() => setQty(qty + 1)} className="grid size-12 place-items-center" aria-label={__lx("One more")}>
              <Plus className="size-4" />
            </button>
          </div>
          <button disabled={needSize} onClick={() => onAdd(p, ci, size, qty)} className="flex-1 bg-stone-900 text-sm tracking-[0.2em] text-white uppercase transition hover:bg-black disabled:opacity-40">
            <T s={needSize ? "Select a size" : "Add to bag"} />
          </button>
        </div>
        <div className="mt-8 divide-y divide-stone-300 border-y border-stone-300 text-sm">
          <T s={[["Composition", "100% virgin wool, lined in silk. Made in Italy in a family-run atelier."], ["Care", "Dry clean only. Store on a wide hanger, away from direct light."], ["Delivery & returns", "Complimentary express delivery in 1–3 days and free returns within 30 days."]].map(([h, t], k) => <div key={h}>
              <button onClick={() => setAcc(acc === k ? -1 : k)} className="flex w-full items-center justify-between py-4 text-left tracking-wide">
                <T s={h} /> <ChevronDown className={`size-4 transition ${acc === k ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                <T s={acc === k && <motion.p initial={{
              height: 0,
              opacity: 0
            }} animate={{
              height: "auto",
              opacity: 1
            }} exit={{
              height: 0,
              opacity: 0
            }} className="overflow-hidden pb-4 text-stone-500">
                    <T s={t} />
                  </motion.p>} />
              </AnimatePresence>
            </div>)} />
        </div>
      </div>
    </div>;
}
export default function Maison() {
  const __lx = useLx();
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("featured");
  const [swatch, setSwatch] = useState({});
  const [wish, setWish] = useState({});
  const [quick, setQuick] = useState(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [wrap, setWrap] = useState(false);
  const cart = useCart();
  const [toast, show] = useToast("bg-stone-900 text-white tracking-wide");
  const list = useMemo(() => {
    const l = cat === "All" ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
    return sort === "low" ? [...l].sort((a, b) => a.price - b.price) : sort === "high" ? [...l].sort((a, b) => b.price - a.price) : l;
  }, [cat, sort]);
  const add = (p, ci, size, qty = 1) => {
    const [cn, c] = p.colors[ci];
    cart.add({
      key: `${p.id}-${ci}-${size}`,
      name: p.name,
      detail: [cn, size].filter(Boolean).join(" · "),
      price: p.price,
      type: p.type,
      c
    }, qty);
    setQuick(null);
    setBagOpen(true);
  };
  const wishes = Object.values(wish).filter(Boolean).length;
  const logo = <a href="#top" className="flex items-center gap-2 font-cormorant text-2xl font-semibold tracking-[0.18em] text-stone-900">
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path d="M15 3a9 9 0 1 0 6 15A8 8 0 0 1 15 3z" fill={cv("#1c1917")} />
      </svg><T s={"MAISON LUNE"} /></a>;
  return <div className="min-h-screen bg-[#f5f1ea] font-sans text-stone-700 selection:bg-stone-900 selection:text-white">
      <div className="fixed inset-x-0 top-0 z-[55] h-8 bg-stone-900 text-[11px] tracking-[0.2em] text-stone-200 uppercase">
        <Marquee duration="45s" className="h-full items-center" gap="gap-16">
          <T s={["Complimentary express delivery", "Free returns within 30 days", "Private appointments in Paris & Milan", "Gift wrapping on every order"].map(t => <span key={t} className="flex items-center gap-16 whitespace-nowrap">
              <T s={t} /> <span>✦</span>
            </span>)} />
        </Marquee>
      </div>
      <SiteNav className="top-8!" logo={logo} inner="max-w-[1500px]" links={[["Shop", "shop"], ["Lookbook", "lookbook"], ["Maison", "story"], ["Services", "services"]]} linkClass="text-[13px] tracking-[0.18em] uppercase text-stone-600 hover:text-stone-900" top="bg-[#f5f1ea]/0" solid="border-b border-stone-300/60 bg-[#f5f1ea]/90 backdrop-blur-xl" sheet="bg-[#f5f1ea] text-stone-900 font-cormorant" extra={<div className="flex items-center gap-1 text-stone-800">
            <button onClick={() => (setCat("All"), document.getElementById("shop")?.scrollIntoView({
        behavior: "smooth"
      }))} className="hidden size-10 place-items-center rounded-full hover:bg-black/5 sm:grid" aria-label={__lx("Search")}>
              <Search className="size-[18px]" />
            </button>
            <button onClick={() => show(wishes ? `${wishes} saved to your wishlist` : "Tap ♡ on any piece to save it")} className="relative grid size-10 place-items-center rounded-full hover:bg-black/5" aria-label={__lx("Wishlist")}>
              <Heart className="size-[18px]" />
              <T s={wishes > 0 && <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-stone-900 text-[9px] text-white"><T s={wishes} /></span>} />
            </button>
            <button onClick={() => setBagOpen(true)} className="relative grid size-10 place-items-center rounded-full hover:bg-black/5" aria-label={__lx("Shopping bag")}>
              <ShoppingBag className="size-[18px]" />
              <T s={cart.count > 0 && <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-stone-900 text-[9px] text-white"><T s={cart.count} /></span>} />
            </button>
          </div>} />

      <section id="top" className="mx-auto grid grid-cols-1 max-w-[1500px] gap-6 px-5 pt-32 pb-16 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:pt-36">
        <div className="lg:pr-10">
          <motion.p initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.2
        }} className="text-xs tracking-[0.35em] text-stone-500 uppercase"><T s={"Autumn — Winter 2026"} /></motion.p>
          <motion.h1 initial={{
          opacity: 0,
          y: 30
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 1.2,
          ease: EASE
        }} className="mt-6 font-cormorant text-[clamp(3.4rem,9vw,8.5rem)] leading-[0.88] font-medium text-stone-900"><T s={"The "} /><i><T s={"Winter"} /></i>
            <br /><T s={"Edit"} /></motion.h1>
          <motion.p initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.4
        }} className="mt-8 max-w-sm leading-relaxed"><T s={"Soft tailoring in camel and noir, sculpted leather and a new fragrance for long nights. Made slowly, to be worn for decades."} /></motion.p>
          <motion.div initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.55
        }} className="mt-10 flex flex-wrap gap-4">
            <a href="#shop" className="group flex items-center gap-3 bg-stone-900 px-8 py-4 text-xs tracking-[0.25em] text-white uppercase transition hover:bg-black"><T s={"Shop the collection "} /><ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </a>
            <a href="#lookbook" className="border-b border-stone-900 py-4 text-xs tracking-[0.25em] text-stone-900 uppercase"><T s={"View lookbook"} /></a>
          </motion.div>
        </div>
        <div className="grid grid-cols-[1.3fr_1fr] gap-4">
          <motion.div initial={{
          opacity: 0,
          y: 40
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 1.2,
          delay: 0.1,
          ease: EASE
        }}>
            <Mesh seed={2} colors={["#e6dccb", "#cfb48c", "#f3ece0", "#b99a74"]} className="grid aspect-[3/4] place-items-center">
              <Art type="coat" c="#b98d5f" />
              <span className="absolute bottom-4 left-4 bg-[#f5f1ea]/85 px-3 py-1.5 text-[11px] tracking-[0.2em] uppercase backdrop-blur"><T s={"Lune Wool Coat"} /></span>
            </Mesh>
          </motion.div>
          <div className="grid gap-4">
            <motion.div initial={{
            opacity: 0,
            y: 40
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 1.2,
            delay: 0.25,
            ease: EASE
          }}>
              <Mesh seed={5} colors={["#2a2320", "#4a3a30", "#1c1917", "#6b1d2a"]} className="grid aspect-square place-items-center">
                <Art type="bag" c="#6b1d2a" />
              </Mesh>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 40
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 1.2,
            delay: 0.4,
            ease: EASE
          }}>
              <Mesh seed={8} colors={["#efe6d8", "#e0c9a6", "#f8f3ea", "#d6b88c"]} className="grid aspect-square place-items-center">
                <Art type="perfume" c="#c0814a" />
              </Mesh>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-[1500px] px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-stone-300 pb-6">
          <h2 className="font-cormorant text-5xl font-medium text-stone-900"><T s={"The collection"} /></h2>
          <label className="relative flex items-center gap-2 text-xs tracking-widest uppercase"><T s={"Sort"} /><select value={sort} onChange={e => setSort(e.target.value)} className="appearance-none border-b border-stone-400 bg-transparent py-1 pr-6 text-stone-900 focus:outline-none">
              <option value="featured"><T s={"Featured"} /></option>
              <option value="low"><T s={"Price: low to high"} /></option>
              <option value="high"><T s={"Price: high to low"} /></option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 size-3.5" />
          </label>
        </div>
        <div className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <T s={CATS.map(c => <button key={c} onClick={() => setCat(c)} className={`shrink-0 border px-4 py-2 text-xs tracking-[0.18em] uppercase transition ${cat === c ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 hover:border-stone-900"}`}>
              <T s={c} />
            </button>)} />
        </div>
        <motion.div layout className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            <T s={list.map(p => {
            const ci = swatch[p.id] ?? 0;
            return <motion.div key={p.id} layout initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              scale: 0.96
            }} transition={{
              duration: 0.45,
              ease: EASE
            }} className="group">
                  <div className="relative grid aspect-[4/5] place-items-center overflow-hidden bg-[#ebe4d8]">
                    <div className="grid size-full place-items-center p-6 transition duration-700 group-hover:scale-105">
                      <Art type={p.type} c={p.colors[ci][1]} />
                    </div>
                    <T s={p.tag && <span className="absolute top-3 left-3 text-[10px] tracking-[0.2em] text-stone-600 uppercase"><T s={p.tag} /></span>} />
                    <button onClick={() => (setWish({
                  ...wish,
                  [p.id]: !wish[p.id]
                }), show(wish[p.id] ? "Removed from wishlist" : `${p.name} saved to wishlist`))} className="absolute top-2 right-2 grid size-9 place-items-center rounded-full transition hover:bg-white/60" aria-label={__lx("Save to wishlist")}>
                      <Heart className={`size-4 ${wish[p.id] ? "fill-stone-900 text-stone-900" : ""}`} />
                    </button>
                    <button onClick={() => setQuick(p)} className="absolute inset-x-3 bottom-3 bg-[#f5f1ea]/95 py-3 text-[11px] tracking-[0.22em] text-stone-900 uppercase opacity-100 backdrop-blur transition md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"><T s={"Quick view"} /></button>
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm text-stone-900"><T s={p.name} /></h3>
                      <p className="mt-1 text-sm"><T s={money(p.price, "€")} /></p>
                    </div>
                    <div className="flex shrink-0 gap-1.5 pt-1">
                      <T s={p.colors.map(([n, c], k) => <button key={n} onClick={() => setSwatch({
                    ...swatch,
                    [p.id]: k
                  })} className={`size-3.5 rounded-full border ${ci === k ? "ring-1 ring-stone-900 ring-offset-2 ring-offset-[#f5f1ea]" : "border-black/10"}`} style={{
                    background: cv(c)
                  }} aria-label={__lx(n)} />)} />
                    </div>
                  </div>
                </motion.div>;
          })} />
          </AnimatePresence>
        </motion.div>
      </section>

      <section id="lookbook" className="bg-stone-900 py-24 text-stone-200">
        <div className="mx-auto flex max-w-[1500px] items-end justify-between px-5 sm:px-8">
          <h2 className="font-cormorant text-5xl font-medium text-white sm:text-6xl">
            <i><T s={"Lookbook"} /></i>
          </h2>
          <p className="hidden text-xs tracking-[0.25em] text-stone-400 uppercase sm:block"><T s={"Scroll →"} /></p>
        </div>
        <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 sm:px-8">
          <T s={LOOKS.map(([n, title, colors, a, b], k) => {
          const pa = PRODUCTS.find(p => p.id === a[0]),
            pb = PRODUCTS.find(p => p.id === b[0]);
          return <motion.div key={n} {...reveal(0.1 * k)} className="w-[85vw] max-w-[620px] shrink-0 snap-start">
                <Mesh seed={k + 11} colors={colors} className="grid aspect-[5/4] grid-cols-2 items-center">
                  <div className="grid h-full place-items-center p-6">
                    <Art type={pa.type} c={pa.colors[a[1]][1]} />
                  </div>
                  <div className="grid h-full place-items-center p-8">
                    <Art type={pb.type} c={pb.colors[b[1]][1]} />
                  </div>
                </Mesh>
                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] tracking-[0.25em] text-stone-500 uppercase"><T s={n} /></p>
                    <p className="font-cormorant text-3xl text-white"><T s={title} /></p>
                  </div>
                  <button onClick={() => {
                add(pa, a[1], pa.sizes?.[1] ?? null);
                add(pb, b[1], pb.sizes?.[2] ?? null);
              }} className="border border-stone-500 px-5 py-3 text-[11px] tracking-[0.22em] text-white uppercase transition hover:bg-white hover:text-stone-900"><T s={"Shop the look · "} /><T s={money(pa.price + pb.price, "€")} />
                  </button>
                </div>
              </motion.div>;
        })} />
        </div>
      </section>

      <section id="story" className="mx-auto grid grid-cols-1 max-w-[1500px] items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2">
        <Mesh seed={21} colors={["#d9cbb5", "#a68a64", "#efe6d6", "#7a6247"]} className="aspect-[4/3]">
          <div className="absolute inset-0 grid place-items-center">
            <p className="font-cormorant text-[clamp(4rem,12vw,9rem)] text-white/80 italic">1987</p>
          </div>
        </Mesh>
        <div>
          <p className="text-xs tracking-[0.35em] text-stone-500 uppercase"><T s={"The Maison"} /></p>
          <h2 className="mt-5 font-cormorant text-5xl leading-tight font-medium text-stone-900"><T s={"Made by hand, in no hurry."} /></h2>
          <p className="mt-6 max-w-lg leading-relaxed"><T s={"Every Lune coat passes through eleven pairs of hands in our Florence atelier. We cut in small runs, repair for life and buy wool from three farms we've worked with since the beginning."} /></p>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-stone-300 pt-8">
            <T s={[["11", "artisans per coat"], ["38", "hours of work"], ["∞", "free repairs"]].map(([v, l]) => <div key={l}>
                <p className="font-cormorant text-4xl text-stone-900"><T s={v} /></p>
                <p className="mt-1 text-xs tracking-wide text-stone-500"><T s={l} /></p>
              </div>)} />
          </div>
        </div>
      </section>

      <section id="services" className="border-y border-stone-300">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 lg:grid-cols-4">
          <T s={[[Truck, "Express delivery", "Complimentary, 1–3 days"], [RotateCcw, "Easy returns", "Free within 30 days"], [Gift, "Gift wrapping", "On every order"], [Sparkles, "Private styling", "Book an appointment"]].map(([I, t, d]) => <div key={t} className="flex flex-col items-center gap-3 border-stone-300 px-4 py-10 text-center [&:not(:last-child)]:border-r max-lg:[&:nth-child(2)]:border-r-0 max-lg:[&:nth-child(-n+2)]:border-b">
              <I className="size-6 text-stone-900" strokeWidth={1.4} />
              <p className="text-xs tracking-[0.2em] text-stone-900 uppercase"><T s={t} /></p>
              <p className="text-xs text-stone-500"><T s={d} /></p>
            </div>)} />
        </div>
      </section>

      <section className="px-5 py-24 text-center sm:px-8">
        <h2 className="font-cormorant text-5xl font-medium text-stone-900"><T s={"Join the Maison"} /></h2>
        <p className="mx-auto mt-4 max-w-md"><T s={"First access to new collections, private sales and invitations to our ateliers."} /></p>
        <form onSubmit={e => (e.preventDefault(), e.currentTarget.reset(), show("Welcome to the Maison"))} className="mx-auto mt-10 flex max-w-md border-b border-stone-900">
          <input required type="email" placeholder={__lx("Email address")} className="min-w-0 flex-1 bg-transparent py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none" />
          <button className="text-xs tracking-[0.25em] text-stone-900 uppercase"><T s={"Subscribe"} /></button>
        </form>
      </section>

      <footer className="bg-stone-900 px-5 pt-16 pb-10 text-stone-400 sm:px-8">
        <div className="mx-auto grid grid-cols-1 max-w-[1500px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-cormorant text-2xl tracking-[0.18em] text-white"><T s={"MAISON LUNE"} /></p>
            <p className="mt-4 max-w-xs text-sm"><T s={"Florence · Paris · Milan. A made-up fashion house."} /></p>
          </div>
          <T s={[["Client care", ["Contact us", "Delivery", "Returns", "Repairs"]], ["The Maison", ["Our story", "Ateliers", "Sustainability", "Careers"]], ["Legal", ["Terms", "Privacy", "Cookies", "Accessibility"]]].map(([h, ls]) => <div key={h}>
              <p className="text-[11px] tracking-[0.25em] text-white uppercase"><T s={h} /></p>
              <ul className="mt-4 space-y-2 text-sm">
                <T s={ls.map(l => <li key={l}>
                    <a href="#" className="hover:text-white">
                      <T s={l} />
                    </a>
                  </li>)} />
              </ul>
            </div>)} />
        </div>
      </footer>

      <Modal open={!!quick} onClose={() => setQuick(null)} className="max-w-4xl" backdrop="bg-stone-900/50">
        <Quick key={quick?.id} p={quick} onClose={() => setQuick(null)} onAdd={add} />
      </Modal>

      <Drawer open={bagOpen} onClose={() => setBagOpen(false)} className="bg-[#f5f1ea] text-stone-800">
        <div className="flex items-center justify-between border-b border-stone-300 px-6 py-5">
          <h3 className="font-cormorant text-3xl text-stone-900"><T s={"Your bag ("} /><T s={cart.count} />)</h3>
          <button onClick={() => setBagOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-black/5" aria-label={__lx("Close bag")}>
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
          <T s={!cart.count && <p className="py-20 text-center text-stone-500"><T s={"Your bag is empty."} /></p>} />
          <T s={cart.items.map(it => <div key={it.key} className="flex gap-4 border-b border-stone-200 py-5">
              <div className="grid h-28 w-24 shrink-0 place-items-center bg-[#ebe4d8] p-2">
                <Art type={it.type} c={it.c} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-sm text-stone-900"><T s={it.name} /></p>
                <p className="mt-1 text-xs text-stone-500"><T s={it.detail} /></p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center border border-stone-300">
                    <button onClick={() => cart.setQty(it.key, it.qty - 1)} className="grid size-8 place-items-center" aria-label={__lx("One less")}>
                      <Minus className="size-3" />
                    </button>
                    <span className="w-6 text-center text-sm"><T s={it.qty} /></span>
                    <button onClick={() => cart.setQty(it.key, it.qty + 1)} className="grid size-8 place-items-center" aria-label={__lx("One more")}>
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <p className="text-sm text-stone-900"><T s={money(it.price * it.qty, "€")} /></p>
                </div>
              </div>
            </div>)} />
        </div>
        <div className="border-t border-stone-300 px-6 py-5">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={wrap} onChange={e => setWrap(e.target.checked)} className="accent-stone-900" /><T s={" Add complimentary gift wrapping"} /></label>
          <div className="mt-4 flex justify-between text-sm">
            <span><T s={"Subtotal"} /></span>
            <span className="text-stone-900"><T s={money(cart.total, "€")} /></span>
          </div>
          <p className="mt-1 text-xs text-stone-500"><T s={"Express delivery and duties included."} /></p>
          <button disabled={!cart.count} onClick={() => (cart.clear(), setBagOpen(false), show("Thank you — your order is confirmed (demo)"))} className="mt-5 w-full bg-stone-900 py-4 text-xs tracking-[0.25em] text-white uppercase transition hover:bg-black disabled:opacity-40"><T s={"Checkout"} /></button>
        </div>
      </Drawer>
      <T s={toast} />
    </div>;
}
