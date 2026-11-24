// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Footers/src/footers.jsx): do not edit.
import { T, useLx, cv, cvs } from "../runtime";
/* 10 footers. */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring } from "motion/react";
import { ArrowRight, ArrowUp, Check, ChevronDown, Copy, Globe, Heart, Mail, MessageCircle, Moon, Rss, Send, Smartphone, Sun, Zap } from "lucide-react";
import { EASE, Logo, rand, reveal } from "./shared";
const COLS = [["Product", ["Features", "Integrations", "Pricing", "Changelog", "Roadmap"]], ["Company", ["About", "Careers", "Blog", "Press", "Partners"]], ["Resources", ["Docs", "Guides", "Community", "Templates", "Status"]], ["Legal", ["Privacy", "Terms", "Security", "Cookies"]]];
const SOCIAL = [Globe, Mail, MessageCircle, Rss];

/* ───────────── 01 · Mega Footer ───────────── */
export function MegaFooter() {
  const __lx = useLx();
  const [sent, setSent] = useState(false);
  return <footer className="relative overflow-hidden bg-[#07070c] px-6 pt-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <motion.div {...reveal(0)}>
            <Logo name="Northwind" icon={Zap} tile="from-violet-500 to-fuchsia-500" className="text-lg text-white" />
            <p className="mt-4 max-w-xs text-sm text-white/50"><T s={"The operating system for modern teams. Plan, build and ship — together."} /></p>
            <form onSubmit={e => {
            e.preventDefault();
            setSent(true);
          }} className="mt-6 flex max-w-sm gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
              <T s={sent ? <p className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-300">
                  <Check className="size-4" /><T s={" Subscribed — welcome aboard!"} /></p> : <>
                  <input type="email" required placeholder={__lx("Your email")} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-white/30" />
                  <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"><T s={"Subscribe"} /></button>
                </>} />
            </form>
            <div className="mt-6 flex gap-2">
              <T s={SOCIAL.map((I, i) => <motion.a key={i} href="#" whileHover={{
              y: -3,
              scale: 1.05
            }} className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white">
                  <I className="size-4" />
                </motion.a>)} />
            </div>
          </motion.div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <T s={COLS.map(([t, links], ci) => <motion.div key={t} {...reveal(0.08 * ci)}>
                <p className="text-sm font-semibold"><T s={t} /></p>
                <ul className="mt-4 space-y-2.5">
                  <T s={links.map(l => <li key={l}>
                      <a href="#" className="text-sm text-white/50 transition hover:text-white">
                        <T s={l} />
                      </a>
                    </li>)} />
                </ul>
              </motion.div>)} />
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-white/10 py-6 text-xs text-white/40 sm:flex-row">
          <p><T s={"© 2026 Northwind Labs, Inc."} /></p>
          <p><T s={"Made in Amman & Lisbon"} /></p>
        </div>
      </div>
      <div className="flex justify-center select-none" aria-hidden>
        <T s={"NORTHWIND".split("").map((ch, i) => <motion.span key={i} initial={{
        y: "60%",
        opacity: 0
      }} whileInView={{
        y: "28%",
        opacity: 1
      }} viewport={{
        once: true
      }} transition={{
        delay: i * 0.05,
        duration: 0.8,
        ease: EASE
      }} className="bg-linear-to-b from-white/20 to-transparent bg-clip-text font-display text-[15vw] leading-none font-bold text-transparent lg:text-[12rem]">
            <T s={ch} />
          </motion.span>)} />
      </div>
    </footer>;
}

/* ───────────── 02 · Minimal Centered ───────────── */
export function MinimalFooter() {
  return <footer className="bg-white px-6 py-14 text-center text-slate-900 [color-scheme:light]">
      <motion.div {...reveal(0)} className="flex justify-center">
        <Logo name="Paperline" tile="from-slate-800 to-slate-600" />
      </motion.div>
      <motion.nav {...reveal(0.1)} className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-slate-600">
        <T s={["About", "Blog", "Jobs", "Press", "Accessibility", "Partners"].map(l => <a key={l} href="#" className="group relative hover:text-slate-900">
            <T s={l} />
            <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-slate-900 transition-transform duration-300 group-hover:scale-x-100" />
          </a>)} />
      </motion.nav>
      <motion.div {...reveal(0.2)} className="mt-8 flex justify-center gap-5 text-slate-400">
        <T s={SOCIAL.map((I, i) => <a key={i} href="#" className="transition hover:text-slate-900">
            <I className="size-5" />
          </a>)} />
      </motion.div>
      <motion.p {...reveal(0.3)} className="mt-8 flex items-center justify-center gap-1.5 text-sm text-slate-400"><T s={"© 2026 Paperline. Made with"} /><motion.span animate={{
        scale: [1, 1.3, 1]
      }} transition={{
        duration: 0.9,
        repeat: Infinity,
        repeatDelay: 0.6
      }}>
          <Heart className="size-4 fill-rose-500 text-rose-500" />
        </motion.span><T s={"in Berlin."} /></motion.p>
    </footer>;
}

/* ───────────── 03 · Big CTA Footer ───────────── */
export function CtaFooter() {
  const ref = useRef(null);
  const x = useSpring(0, {
    stiffness: 200,
    damping: 15
  });
  const y = useSpring(0, {
    stiffness: 200,
    damping: 15
  });
  const [copied, setCopied] = useState(false);
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Amman"
    }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return <footer className="bg-[#111] px-6 pt-20 pb-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display text-5xl leading-[1.02] font-semibold tracking-tight sm:text-7xl">
          <motion.span {...reveal(0)} className="block"><T s={"Let's make"} /></motion.span>
          <motion.span {...reveal(0.1)} className="block text-white/40"><T s={"something great."} /></motion.span>
        </h2>
        <div className="mt-12 flex flex-col items-start gap-8 border-t border-white/15 pt-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <a href="#" className="text-xl font-medium sm:text-2xl"><T s={"hello@studio.dev"} /></a>
            <button onClick={() => {
            navigator.clipboard?.writeText("hello@studio.dev").catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }} className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
              <T s={copied ? <Check className="size-3.5 text-lime-300" /> : <Copy className="size-3.5" />} />
              <T s={copied ? "Copied!" : "Copy"} />
            </button>
          </div>
          <motion.a ref={ref} href="#" style={{
          x,
          y
        }} onMouseMove={e => {
          const r = ref.current.getBoundingClientRect();
          x.set((e.clientX - r.left - r.width / 2) * 0.35);
          y.set((e.clientY - r.top - r.height / 2) * 0.35);
        }} onMouseLeave={() => {
          x.set(0);
          y.set(0);
        }} className="grid size-36 place-items-center rounded-full bg-lime-300 text-center font-semibold text-black transition-colors hover:bg-lime-200"><T s={"Get in touch ↗"} /></motion.a>
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-4 text-sm text-white/40">
          <p><T s={"Amman, Jordan · "} /><T s={time} /><T s={" local"} /></p>
          <div className="flex gap-6">
            <T s={["Instagram", "LinkedIn", "Dribbble"].map(s => <a key={s} href="#" className="hover:text-white"><T s={s} /></a>)} />
          </div>
        </div>
      </div>
    </footer>;
}

/* ───────────── 04 · Status & Settings ───────────── */
const LANGS = ["English", "العربية", "Français", "Español"];
export function StatusFooter() {
  const __lx = useLx();
  const [lang, setLang] = useState(0);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  return <footer className="bg-linear-to-b from-[#0c1222] to-[#05070f] px-6 py-14 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo name="Cloudline" icon={Globe} tile="from-sky-400 to-blue-600" className="text-white" />
          <p className="mt-4 max-w-xs text-sm text-white/50"><T s={"Infrastructure for teams who'd rather be building."} /></p>
          <a href="#" className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span><T s={"All systems normal"} /></a>
        </div>
        <T s={COLS.slice(0, 3).map(([t, links]) => <div key={t}>
            <p className="text-sm font-semibold"><T s={t} /></p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/50">
              <T s={links.slice(0, 4).map(l => <li key={l}>
                  <a href="#" className="hover:text-white"><T s={l} /></a>
                </li>)} />
            </ul>
          </div>)} />
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
        <p className="text-xs text-white/40"><T s={"© 2026 Cloudline"} /></p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70">
              <Globe className="size-4" /> <T s={LANGS[lang]} /> <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              <T s={open && <motion.ul initial={{
              opacity: 0,
              y: 6
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: 6
            }} className="absolute right-0 bottom-11 z-10 w-40 rounded-xl border border-white/10 bg-[#111827] p-1 shadow-2xl">
                  <T s={LANGS.map((l, i) => <li key={l}>
                      <button onClick={() => {
                  setLang(i);
                  setOpen(false);
                }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                        <T s={l} /> <T s={lang === i && <Check className="size-4 text-sky-400" />} />
                      </button>
                    </li>)} />
                </motion.ul>} />
            </AnimatePresence>
          </div>
          <button onClick={() => setDark(d => !d)} className={`flex h-8 w-16 items-center rounded-full p-1 transition-colors ${dark ? "justify-end bg-sky-600" : "justify-start bg-amber-300"}`} aria-label={__lx("Toggle theme")}>
            <motion.span layout transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }} className="grid size-6 place-items-center rounded-full bg-white text-slate-900">
              <T s={dark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />} />
            </motion.span>
          </button>
        </div>
      </div>
    </footer>;
}

/* ───────────── 05 · Wave Footer ───────────── */
const WAVE = "M0,40 Q150,0 300,40 T600,40 L600,80 L0,80 Z";
export function WaveFooter() {
  return <footer className="relative bg-[#fff7ed] pt-0 text-[#431407] [color-scheme:light]">
      <div className="relative h-20 overflow-hidden bg-white">
        <T s={[["#fdba74", "22s", "opacity-60"], ["#fb923c", "14s", "opacity-100"]].map(([fill, dur, op]) => <div key={dur} className={`absolute inset-x-0 bottom-0 flex h-full w-[200%] animate-marquee ${op}`} style={{
        "--duration": cv(dur)
      }}>
            <T s={[0, 1].map(k => <svg key={k} viewBox="0 0 600 80" preserveAspectRatio="none" className="h-full w-1/2">
                <path d={WAVE} fill={cv(fill)} />
              </svg>)} />
          </div>)} />
      </div>
      <div className="bg-[#fb923c] px-6 pt-8 pb-12 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
          <div>
            <p className="font-fun text-3xl font-extrabold"><T s={"Sunny Side"} /></p>
            <p className="mt-2 text-sm text-white/85"><T s={"Breakfast all day, every day. ☀️"} /></p>
          </div>
          <T s={[["Visit", ["12 Rainbow St", "Amman", "Open 7am–4pm"]], ["Menu", ["Breakfast", "Brunch", "Coffee", "Kids"]], ["Follow", ["Instagram", "TikTok", "Newsletter"]]].map(([t, items]) => <div key={t}>
              <p className="font-fun font-bold"><T s={t} /></p>
              <ul className="mt-3 space-y-1.5 text-sm text-white/90">
                <T s={items.map(x => <li key={x}><T s={x} /></li>)} />
              </ul>
            </div>)} />
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl items-center justify-between border-t border-white/30 pt-6 text-sm">
          <p><T s={"© 2026 Sunny Side Café"} /></p>
          <a href="#" className="group flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-[#c2410c]"><T s={"Back to top"} /><motion.span animate={{
            y: [0, -3, 0]
          }} transition={{
            duration: 1.2,
            repeat: Infinity
          }}>
              <ArrowUp className="size-4" />
            </motion.span>
          </a>
        </div>
      </div>
    </footer>;
}

/* ───────────── 06 · Floating Newsletter Card ───────────── */
export function NewsletterCardFooter() {
  const __lx = useLx();
  const [sent, setSent] = useState(false);
  return <div className="bg-slate-100 pt-24 [color-scheme:light]">
      <footer className="relative bg-slate-950 px-6 pt-32 pb-10 text-white">
        <motion.div {...reveal(0, 40)} className="absolute inset-x-6 -top-20 mx-auto max-w-4xl overflow-hidden rounded-3xl bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-8 shadow-2xl shadow-violet-900/40 sm:p-10">
          <div className="absolute -top-16 -right-10 size-48 rounded-full bg-white/20 blur-2xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-2xl font-semibold sm:text-3xl"><T s={"Get the weekly digest"} /></p>
              <p className="mt-1 text-white/80"><T s={"One email. The best of design & code. No spam."} /></p>
            </div>
            <form onSubmit={e => {
            e.preventDefault();
            setSent(true);
          }} className="flex w-full max-w-sm gap-2 rounded-2xl bg-white/15 p-1.5 backdrop-blur">
              <AnimatePresence mode="wait" initial={false}>
                <T s={sent ? <motion.p key="ok" initial={{
                opacity: 0,
                y: 6
              }} animate={{
                opacity: 1,
                y: 0
              }} className="flex items-center gap-2 px-3 py-2.5 font-medium">
                    <Check className="size-5" /><T s={" You're in!"} /></motion.p> : <motion.div key="form" exit={{
                opacity: 0
              }} className="flex w-full gap-2">
                    <input type="email" required placeholder={__lx("you@email.com")} className="min-w-0 flex-1 bg-transparent px-3 text-white outline-none placeholder:text-white/60" />
                    <button className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 font-semibold text-violet-700">
                      <Send className="size-4" /><T s={" Join"} /></button>
                  </motion.div>} />
              </AnimatePresence>
            </form>
          </div>
        </motion.div>
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
          <T s={COLS.map(([t, links]) => <div key={t}>
              <p className="text-sm font-semibold"><T s={t} /></p>
              <ul className="mt-3 space-y-2 text-sm text-white/50">
                <T s={links.slice(0, 4).map(l => <li key={l}>
                    <a href="#" className="hover:text-white"><T s={l} /></a>
                  </li>)} />
              </ul>
            </div>)} />
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-xs text-white/40"><T s={"© 2026 Digest Co."} /></p>
      </footer>
    </div>;
}

/* ───────────── 07 · App Download ───────────── */
export function AppFooter() {
  const qr = useMemo(() => Array.from({
    length: 121
  }, (_, i) => rand(i + 7) > 0.5), []);
  return <footer className="overflow-hidden bg-[#0f172a] px-6 pt-14 text-white">
      <div className="mx-auto grid max-w-6xl items-end gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="pb-12">
          <Logo name="Trailmate" icon={Smartphone} tile="from-emerald-400 to-teal-600" className="text-white" />
          <p className="mt-6 font-display text-3xl font-semibold sm:text-4xl"><T s={"Take every trail with you."} /></p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <T s={[["Download on", "iOS"], ["Get it on", "Android"]].map(([a, b]) => <a key={b} href="#" className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 transition hover:bg-white/10">
                <Smartphone className="size-6" />
                <span className="leading-tight">
                  <span className="block text-[10px] text-white/50"><T s={a} /></span>
                  <span className="block font-semibold"><T s={b} /></span>
                </span>
              </a>)} />
            <div className="grid size-20 grid-cols-11 gap-px rounded-lg bg-white p-1.5">
              <T s={qr.map((on, i) => <span key={i} className={on ? "bg-slate-900" : ""} />)} />
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50">
            <T s={["About", "Safety", "Careers", "Privacy", "Terms"].map(l => <a key={l} href="#" className="hover:text-white"><T s={l} /></a>)} />
            <span><T s={"© 2026 Trailmate"} /></span>
          </div>
        </div>
        <motion.div initial={{
        y: 120
      }} whileInView={{
        y: 30
      }} viewport={{
        once: true
      }} transition={{
        duration: 1,
        ease: EASE
      }} className="mx-auto h-80 w-60 rounded-t-[2.5rem] border-[8px] border-b-0 border-slate-700 bg-linear-to-b from-emerald-400 to-teal-700 p-5">
          <div className="mx-auto h-4 w-16 rounded-full bg-slate-800" />
          <p className="mt-6 text-sm text-white/80"><T s={"Today's hike"} /></p>
          <p className="font-display text-2xl font-semibold"><T s={"Wadi Ghuweir"} /></p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <T s={[["12km", "distance"], ["4h", "time"], ["640m", "climb"]].map(([v, l]) => <div key={l} className="rounded-xl bg-white/20 py-2">
                <p className="font-semibold"><T s={v} /></p>
                <p className="text-white/70"><T s={l} /></p>
              </div>)} />
          </div>
        </motion.div>
      </div>
    </footer>;
}

/* ───────────── 08 · Accordion Sitemap ───────────── */
export function AccordionFooter() {
  const [open, setOpen] = useState(0);
  return <footer className="bg-[#f4f4f0] px-6 py-14 text-[#1a1a1a] [color-scheme:light]">
      <div className="mx-auto max-w-6xl">
        <p className="font-serif text-4xl"><T s={"Everything, in one place."} /></p>
        <p className="mt-2 text-sm text-black/50"><T s={"On small screens the columns fold into an accordion — try it on mobile width."} /></p>
        <div className="mt-10 grid border-t border-black/10 md:grid-cols-4 md:gap-8 md:border-t-0">
          <T s={COLS.map(([t, links], i) => <div key={t} className="border-b border-black/10 md:border-0">
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between py-4 text-left font-semibold md:pointer-events-none md:py-0">
                <T s={t} />
                <ChevronDown className={`size-4 transition md:hidden ${open === i ? "rotate-180" : ""}`} />
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 md:grid-rows-[1fr] ${open === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <ul className="space-y-2.5 overflow-hidden pb-4 text-sm md:mt-4">
                  <T s={links.map(l => <li key={l}>
                      <a href="#" className="group inline-flex items-center gap-1 text-black/60 hover:text-black">
                        <T s={l} />
                        <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                      </a>
                    </li>)} />
                </ul>
              </div>
            </div>)} />
        </div>
        <p className="mt-10 text-xs text-black/40"><T s={"© 2026 Atelier Index"} /></p>
      </div>
    </footer>;
}

/* ───────────── 09 · Marquee Footer ───────────── */
export function MarqueeFooter() {
  return <footer className="overflow-hidden bg-[#e9ff70] pt-14 pb-10 text-black [color-scheme:light]">
      <div className="flex w-max animate-marquee border-y-2 border-black py-4 font-display text-6xl font-bold whitespace-nowrap sm:text-8xl" style={{
      "--duration": cv("22s")
    }}>
        <T s={[0, 1].map(k => <span key={k} className="flex items-center gap-8 pr-8"><T s={"LET'S TALK "} /><span className="text-stroke-dark"><T s={"LET'S TALK"} /></span><T s={" ✺ LET'S TALK "} /><span className="text-stroke-dark"><T s={"LET'S TALK"} /></span> ✺
          </span>)} />
      </div>
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 px-6 sm:grid-cols-3">
        <T s={[["New business", "work@loud.studio"], ["Careers", "jobs@loud.studio"], ["Studio", "Rainbow St 21, Amman"]].map(([t, v], i) => <motion.div key={t} {...reveal(i * 0.1)}>
            <p className="text-xs font-bold tracking-widest uppercase"><T s={t} /></p>
            <a href="#" className="mt-2 block text-xl font-medium underline decoration-2 underline-offset-4 hover:decoration-[6px]">
              <T s={v} />
            </a>
          </motion.div>)} />
      </div>
      <p className="mx-auto mt-12 max-w-6xl px-6 text-sm"><T s={"© 2026 Loud Studio — all rights reserved"} /></p>
    </footer>;
}

/* ───────────── 10 · Terminal Footer ───────────── */
export function TerminalFooter() {
  const [uptime, setUptime] = useState(1284523);
  useEffect(() => {
    const id = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const d = Math.floor(uptime / 86400);
  const h = Math.floor(uptime % 86400 / 3600);
  const m = Math.floor(uptime % 3600 / 60);
  const s = uptime % 60;
  return <footer className="bg-black px-6 py-12 font-mono text-sm text-green-400">
      <div className="mx-auto max-w-6xl">
        <pre className="text-xs leading-tight text-green-300 [text-shadow:0_0_8px_rgba(74,222,128,0.6)] sm:text-sm"><T s={`┌─────────────────────────┐
│  ▓▓ devtools.sh  v4.2.0 │
└─────────────────────────┘`} /></pre>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <T s={[["docs", ["getting-started", "cli-reference", "plugins"]], ["community", ["discord", "forum", "showcase"]], ["legal", ["license.md", "privacy.md", "security.md"]]].map(([dir, files], i) => <motion.div key={dir} {...reveal(i * 0.1)}>
              <p>
                <span className="text-green-700">$</span><T s={" ls ./"} /><T s={dir} />
              </p>
              <ul className="mt-2 space-y-1">
                <T s={files.map(f => <li key={f}>
                    <a href="#" className="group text-green-300/80 hover:text-green-200">
                      <span className="text-green-700 group-hover:text-green-400">→</span> <T s={f} />
                    </a>
                  </li>)} />
              </ul>
            </motion.div>)} />
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-green-900 pt-5 text-xs text-green-600">
          <p><T s={"uptime: "} /><T s={d} /><T s={"d "} /><T s={String(h).padStart(2, "0")} />:<T s={String(m).padStart(2, "0")} />:<T s={String(s).padStart(2, "0")} />
          </p>
          <p><T s={"© 2026 devtools.sh "} /><span className="inline-block h-3.5 w-2 translate-y-0.5 bg-green-400" style={{
            animation: "lx-h-blink 1s step-end infinite"
          }} />
          </p>
        </div>
      </div>
    </footer>;
}
