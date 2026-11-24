// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (CTA/src/cta.jsx): do not edit.
import { T, useLx, cv, cvs } from "../runtime";
/* 10 call-to-action sections. */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { ArrowRight, Calendar, Check, MapPin, PartyPopper, Smartphone, Sparkles, Star, Ticket, X } from "lucide-react";
import { Avatar, Avatars, FakeLines, Stars, rand, reveal } from "./shared";

/* ───────────── 01 · Conic Glow ───────────── */
export function ConicGlowCta() {
  const __lx = useLx();
  const [sent, setSent] = useState(false);
  return <section className="bg-[#07070c] px-5 py-20 text-white">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0e0e16] px-6 py-16 text-center sm:px-16">
        <motion.div className="pointer-events-none absolute top-1/2 left-1/2 size-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl" style={{
        background: cv("conic-gradient(from 0deg, #8b5cf6, #22d3ee, #34d399, #f472b6, #8b5cf6)")
      }} animate={{
        rotate: 360
      }} transition={{
        duration: 18,
        repeat: Infinity,
        ease: "linear"
      }} />
        <div className="pointer-events-none absolute inset-0 bg-[#0e0e16]/60" />
        <div className="relative">
          <motion.h3 {...reveal(0)} className="font-display text-4xl leading-tight font-semibold sm:text-6xl"><T s={"Start building today."} /></motion.h3>
          <motion.p {...reveal(0.1)} className="mx-auto mt-4 max-w-md text-lg text-white/70"><T s={"Free for 14 days. No credit card. Cancel whenever."} /></motion.p>
          <motion.form {...reveal(0.2)} onSubmit={e => {
          e.preventDefault();
          setSent(true);
        }} className="mx-auto mt-9 flex max-w-md gap-2 rounded-2xl border border-white/15 bg-white/5 p-1.5 backdrop-blur">
            <AnimatePresence mode="wait" initial={false}>
              <T s={sent ? <motion.p key="ok" initial={{
              opacity: 0,
              y: 8
            }} animate={{
              opacity: 1,
              y: 0
            }} className="flex w-full items-center justify-center gap-2 py-2.5 text-emerald-300">
                  <Check className="size-5" /><T s={" Check your inbox to get started"} /></motion.p> : <motion.div key="f" exit={{
              opacity: 0
            }} className="flex w-full gap-2">
                  <input type="email" required placeholder={__lx("you@company.com")} className="min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-white/35" />
                  <button className="rounded-xl bg-white px-5 py-2.5 font-semibold text-black"><T s={"Get started"} /></button>
                </motion.div>} />
            </AnimatePresence>
          </motion.form>
        </div>
      </div>
    </section>;
}

/* ───────────── 02 · App Download ───────────── */
export function AppCta() {
  return <section className="overflow-hidden bg-linear-to-br from-emerald-50 to-teal-100 px-5 pt-16 text-slate-900 [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl items-end gap-10 md:grid-cols-2">
        <div className="pb-16">
          <motion.div {...reveal(0)} className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Stars className="text-amber-500" size="size-3.5" /><T s={" 4.9 · 80k ratings"} /></motion.div>
          <motion.h3 {...reveal(0.1)} className="mt-3 font-display text-4xl leading-tight font-semibold sm:text-5xl"><T s={"Your habits, in your pocket."} /></motion.h3>
          <motion.p {...reveal(0.2)} className="mt-4 text-lg text-slate-600"><T s={"Track, nudge and celebrate — the app that makes good habits stick."} /></motion.p>
          <motion.div {...reveal(0.3)} className="mt-8 flex flex-wrap gap-3">
            <T s={[["Download on", "iOS"], ["Get it on", "Android"]].map(([a, b]) => <a key={b} href="#" className="flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-white transition hover:scale-105">
                <Smartphone className="size-6" />
                <span className="leading-tight">
                  <span className="block text-[10px] text-white/60"><T s={a} /></span>
                  <span className="block font-semibold"><T s={b} /></span>
                </span>
              </a>)} />
          </motion.div>
        </div>
        <motion.div initial={{
        y: 140,
        rotate: 8
      }} whileInView={{
        y: 0,
        rotate: -6
      }} viewport={{
        once: true
      }} transition={{
        type: "spring",
        stiffness: 80,
        damping: 16
      }} className="mx-auto h-[380px] w-[220px] rounded-t-[2.5rem] border-[8px] border-b-0 border-slate-900 bg-white p-4 shadow-2xl">
          <div className="mx-auto h-4 w-16 rounded-full bg-slate-900" />
          <p className="mt-5 text-xs text-slate-400"><T s={"Today"} /></p>
          <p className="font-display text-xl font-semibold"><T s={"3 of 4 done"} /></p>
          <div className="mt-4 space-y-2.5">
            <T s={["Drink water", "Read 10 pages", "Stretch", "Walk 8k steps"].map((h, i) => <motion.div key={h} initial={{
            opacity: 0,
            x: 20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} transition={{
            delay: 0.5 + i * 0.12
          }} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                <span className={`grid size-5 place-items-center rounded-full ${i < 3 ? "bg-emerald-500 text-white" : "border-2 border-slate-300"}`}><T s={i < 3 && <Check className="size-3" />} /></span>
                <T s={h} />
              </motion.div>)} />
          </div>
        </motion.div>
      </div>
    </section>;
}

/* ───────────── 03 · Marquee + Magnetic ───────────── */
export function MarqueeCta() {
  const ref = useRef(null);
  const x = useSpring(0, {
    stiffness: 180,
    damping: 14
  });
  const y = useSpring(0, {
    stiffness: 180,
    damping: 14
  });
  return <section className="relative flex h-[440px] items-center overflow-hidden bg-[#0a0a0a] text-white">
      <div className="w-full -rotate-3">
        <div className="flex w-max animate-marquee font-syne text-[16vw] leading-none font-extrabold whitespace-nowrap sm:text-[10rem]" style={{
        "--duration": cv("24s")
      }}>
          <T s={[0, 1].map(k => <span key={k} className="pr-10"><T s={"START A PROJECT "} /><span className="text-stroke-white"><T s={"START A PROJECT"} /></span><T s={" "} />
            </span>)} />
        </div>
      </div>
      <motion.a ref={ref} href="#" style={{
      x,
      y
    }} onMouseMove={e => {
      const r = ref.current.getBoundingClientRect();
      x.set((e.clientX - r.left - r.width / 2) * 0.4);
      y.set((e.clientY - r.top - r.height / 2) * 0.4);
    }} onMouseLeave={() => {
      x.set(0);
      y.set(0);
    }} whileHover={{
      scale: 1.1
    }} className="absolute top-1/2 left-1/2 -mt-20 -ml-20 grid size-40 place-items-center rounded-full bg-orange-500 text-center font-semibold shadow-[0_0_60px_rgba(249,115,22,0.6)]"><T s={"Let's talk ↗"} /></motion.a>
    </section>;
}

/* ───────────── 04 · Dotted Minimal ───────────── */
export function DottedCta() {
  return <section className="relative overflow-hidden bg-white px-6 py-24 text-center text-slate-900 [color-scheme:light]">
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      <div className="relative">
        <motion.h3 {...reveal(0)} className="mx-auto max-w-2xl font-display text-4xl leading-tight font-semibold sm:text-5xl"><T s={"Ready when you are."} /></motion.h3>
        <motion.p {...reveal(0.1)} className="mx-auto mt-4 max-w-md text-lg text-slate-500"><T s={"Join thousands of teams who ship calmer, faster and together."} /></motion.p>
        <motion.div {...reveal(0.2)} className="mt-9 flex flex-wrap justify-center gap-3">
          <a href="#" className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white"><T s={"Start for free "} /><ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </a>
          <a href="#" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold transition hover:border-slate-400"><T s={"Book a demo"} /></a>
        </motion.div>
        <motion.div {...reveal(0.3)} className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-500">
          <Avatars n={5} size="size-7" /><T s={" 4.9/5 from 2,000+ reviews"} /></motion.div>
      </div>
    </section>;
}

/* ───────────── 05 · Confetti Newsletter ───────────── */
const CONF = ["#f472b6", "#a78bfa", "#38bdf8", "#facc15", "#34d399"];
export function ConfettiCta() {
  const __lx = useLx();
  const [burst, setBurst] = useState(0);
  const bits = useMemo(() => Array.from({
    length: 40
  }, (_, i) => ({
    a: rand(i + burst * 50) * Math.PI * 2,
    d: 120 + rand(i + 7 + burst * 50) * 160,
    c: CONF[i % 5],
    r: rand(i + 3) * 720
  })), [burst]);
  return <section className="grid grid-cols-1 place-items-center bg-linear-to-br from-fuchsia-500 via-violet-600 to-indigo-700 px-5 py-20 text-white">
      <motion.h3 {...reveal(0)} className="text-center font-fun text-4xl font-extrabold sm:text-5xl"><T s={"Never miss a drop."} /></motion.h3>
      <p className="mt-3 text-white/80"><T s={"New releases, behind the scenes and secret discounts."} /></p>
      <form onSubmit={e => {
      e.preventDefault();
      setBurst(b => b + 1);
    }} className="relative mt-8 flex w-full max-w-md gap-2 rounded-full bg-white p-1.5">
        <input type="email" required placeholder={__lx("you@email.com")} className="min-w-0 flex-1 bg-transparent px-4 text-slate-900 outline-none placeholder:text-slate-400" />
        <button className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 font-semibold">
          <PartyPopper className="size-4" /><T s={" Subscribe"} /></button>
        <T s={burst > 0 && bits.map((b, i) => <motion.span key={`${burst}-${i}`} className="pointer-events-none absolute top-1/2 right-16 size-2.5 rounded-sm" style={{
        background: cv(b.c)
      }} initial={{
        x: 0,
        y: 0,
        opacity: 1,
        rotate: 0
      }} animate={{
        x: Math.cos(b.a) * b.d,
        y: Math.sin(b.a) * b.d + 60,
        opacity: 0,
        rotate: b.r
      }} transition={{
        duration: 1.2,
        ease: "easeOut"
      }} />)} />
      </form>
      <AnimatePresence>
        <T s={burst > 0 && <motion.p key={burst} initial={{
        opacity: 0,
        y: 6
      }} animate={{
        opacity: 1,
        y: 0
      }} className="mt-4 font-semibold"><T s={"🎉 You're on the list!"} /></motion.p>} />
      </AnimatePresence>
    </section>;
}

/* ───────────── 06 · Event Countdown ───────────── */
export function EventCta() {
  const [left, setLeft] = useState(9 * 86400 + 4 * 3600 + 17 * 60 + 40);
  useEffect(() => {
    const id = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const units = [[Math.floor(left / 86400), "days"], [Math.floor(left % 86400 / 3600), "hours"], [Math.floor(left % 3600 / 60), "min"], [left % 60, "sec"]];
  return <section className="bg-[#0d0a1f] px-5 py-20 text-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-10 rounded-[2rem] border border-white/10 bg-linear-to-br from-pink-600/20 via-transparent to-blue-600/20 p-8 sm:p-12 lg:flex-row">
        <div>
          <p className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4 text-pink-400" /><T s={" March 18, 2027"} /></span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-pink-400" /><T s={" Amman"} /></span>
          </p>
          <h3 className="mt-3 font-display text-4xl font-semibold"><T s={"Early-bird tickets end soon"} /></h3>
          <a href="#" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black">
            <Ticket className="size-4" /><T s={" Grab a ticket — $149"} /></a>
        </div>
        <div className="flex gap-3">
          <T s={units.map(([v, l]) => <div key={l} className="text-center">
              <div className="relative grid h-20 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 font-display text-3xl font-semibold sm:w-20">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={v} initial={{
                y: -30,
                opacity: 0
              }} animate={{
                y: 0,
                opacity: 1
              }} exit={{
                y: 30,
                opacity: 0
              }} transition={{
                duration: 0.35
              }}>
                    <T s={String(v).padStart(2, "0")} />
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="mt-2 text-xs text-white/50 uppercase"><T s={l} /></p>
            </div>)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 07 · Cursor Spotlight ───────────── */
export function SpotlightCta() {
  const ref = useRef(null);
  const mx = useMotionValue(-500);
  const my = useMotionValue(-500);
  const bg = useMotionTemplate`radial-gradient(420px circle at ${mx}px ${my}px, rgba(56,189,248,0.25), transparent 70%)`;
  return <section ref={ref} onMouseMove={e => {
    const r = ref.current.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
  }} className="relative overflow-hidden bg-black px-6 py-28 text-center text-white">
      <motion.div className="pointer-events-none absolute inset-0" style={{
      background: cv(bg)
    }} />
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="relative">
        <motion.h3 {...reveal(0)} className="mx-auto max-w-3xl font-display text-4xl leading-tight font-semibold sm:text-6xl"><T s={"See where your "} /><span className="text-sky-300"><T s={"attention"} /></span><T s={" goes."} /></motion.h3>
        <motion.p {...reveal(0.1)} className="mt-4 text-white/60"><T s={"Move your mouse — then try the real thing."} /></motion.p>
        <motion.a {...reveal(0.2)} href="#" className="mt-8 inline-flex items-center gap-2 rounded-full bg-sky-300 px-7 py-3.5 font-semibold text-black"><T s={"Try it free "} /><ArrowRight className="size-4" />
        </motion.a>
      </div>
    </section>;
}

/* ───────────── 08 · Light Beams ───────────── */
export function BeamsCta() {
  const beams = useMemo(() => Array.from({
    length: 9
  }, (_, i) => ({
    x: 6 + i * 11 + rand(i) * 4,
    d: rand(i + 3) * 4,
    dur: 3 + rand(i + 9) * 3
  })), []);
  return <section className="relative overflow-hidden bg-[#03030a] px-6 py-28 text-center text-white">
      <T s={beams.map((b, i) => <motion.span key={i} className="pointer-events-none absolute top-0 h-48 w-px bg-linear-to-b from-transparent via-violet-300 to-transparent" style={{
      left: `${b.x}%`
    }} animate={{
      y: ["-30%", "260%"],
      opacity: [0, 1, 0]
    }} transition={{
      duration: b.dur,
      repeat: Infinity,
      delay: b.d,
      ease: "linear"
    }} />)} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-violet-900/40 to-transparent" />
      <div className="relative">
        <motion.span {...reveal(0)} className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-sm text-violet-200">
          <Sparkles className="size-4" /><T s={" Limited beta"} /></motion.span>
        <motion.h3 {...reveal(0.1)} className="mx-auto mt-6 max-w-2xl font-display text-4xl leading-tight font-semibold sm:text-6xl"><T s={"The future is a click away."} /></motion.h3>
        <motion.div {...reveal(0.2)} className="mt-9 flex justify-center gap-3">
          <a href="#" className="rounded-full bg-violet-500 px-7 py-3.5 font-semibold shadow-[0_0_40px_rgba(139,92,246,0.6)]"><T s={"Request access"} /></a>
          <a href="#" className="rounded-full border border-white/15 px-7 py-3.5 font-semibold"><T s={"Learn more"} /></a>
        </motion.div>
      </div>
    </section>;
}

/* ───────────── 09 · Quote + CTA ───────────── */
export function QuoteCta() {
  return <section className="bg-[#f6f2ea] px-5 py-20 text-[#1f1a14] [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-xl md:grid-cols-2">
        <motion.div {...reveal(0)} className="bg-[#1f1a14] p-10 text-[#f6f2ea]">
          <div className="flex gap-0.5 text-amber-300">
            <T s={Array.from({
            length: 5
          }).map((_, i) => <Star key={i} className="size-4 fill-current" />)} />
          </div>
          <blockquote className="mt-5 font-serif text-3xl leading-snug"><T s={"“We launched our store in a weekend and made our first sale on Monday.”"} /></blockquote>
          <div className="mt-6 flex items-center gap-3">
            <Avatar name="Noor Saleh" i={3} className="size-11" />
            <div>
              <p className="font-semibold"><T s={"Noor Saleh"} /></p>
              <p className="text-sm opacity-60"><T s={"Founder, Olive & Clay"} /></p>
            </div>
          </div>
        </motion.div>
        <motion.div {...reveal(0.15)} className="flex flex-col justify-center p-10">
          <h3 className="font-serif text-4xl"><T s={"Your turn."} /></h3>
          <p className="mt-3 text-[#1f1a14]/60"><T s={"Open your shop today — free for 14 days, then $19/month."} /></p>
          <a href="#" className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#b45309] px-6 py-3 font-semibold text-white transition hover:bg-[#92400e]"><T s={"Start selling "} /><ArrowRight className="size-4" />
          </a>
        </motion.div>
      </div>
    </section>;
}

/* ───────────── 10 · Sticky Bottom Bar ───────────── */
export function StickyBarCta() {
  const __lx = useLx();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, []);
  return <section className="relative h-[380px] overflow-hidden bg-slate-50 p-8 text-slate-900 [color-scheme:light]">
      <p className="font-display text-2xl font-semibold"><T s={"A bar that slides up after a moment"} /></p>
      <div className="mt-4 max-w-xl">
        <FakeLines n={6} className="bg-slate-200" />
      </div>
      <T s={!open && <button onClick={() => setOpen(true)} className="mt-6 rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white"><T s={"Show it again"} /></button>} />
      <AnimatePresence>
        <T s={open && <motion.div initial={{
        y: 120
      }} animate={{
        y: 0
      }} exit={{
        y: 120
      }} transition={{
        type: "spring",
        stiffness: 220,
        damping: 24
      }} className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-4 rounded-2xl bg-slate-900 p-4 text-white shadow-2xl sm:flex-nowrap">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-amber-400 to-orange-500">
              <Sparkles className="size-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold"><T s={"Get 2 months free on yearly plans"} /></p>
              <p className="text-sm text-white/60"><T s={"Offer ends Sunday at midnight."} /></p>
            </div>
            <a href="#" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"><T s={"Claim offer"} /></a>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white" aria-label={__lx("Dismiss")}>
              <X className="size-5" />
            </button>
          </motion.div>} />
      </AnimatePresence>
    </section>;
}
