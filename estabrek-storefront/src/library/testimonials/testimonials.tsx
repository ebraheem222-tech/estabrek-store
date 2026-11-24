// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Testimonials/src/testimonials.jsx): do not edit.
import { T, useLx, cv, cvs } from "../runtime";
/* 10 testimonial sections. All names and quotes are made up. */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, ChevronLeft, ChevronRight, Heart, MessageCircle, Pause, Play, Quote, Repeat2, Star, TrendingUp } from "lucide-react";
import { Avatar, Counter, EASE, Stars, rand, reveal, useCycle } from "./shared";
const PEOPLE = [["Lina Haddad", "CTO, Quantix", "We moved our whole team over in a weekend. Nobody wants to go back."], ["Marcus Chen", "Founder, Orbitly", "The best tool we adopted this year. It just gets out of the way."], ["Sara Okafor", "Design Lead, Hexabyte", "Finally, software that looks as good as the work we make with it."], ["Omar Khalil", "Engineer, Lumora", "Support answered in three minutes with a real fix. Unheard of."], ["Elena Rossi", "COO, Zenara", "We cut our weekly status meeting entirely. The dashboard says it all."], ["Daniel Kim", "PM, Kinetiq", "Onboarding new hires went from a week to an afternoon."], ["Noor Al-Amin", "Head of Ops, Cobalt", "It's the first thing I open every morning and the last thing I close."], ["James Walker", "SRE, Vertexa", "Rock solid. Zero incidents in eleven months."]];

/* ───────────── 01 · Marquee Wall ───────────── */
function MiniCard({
  p,
  i
}) {
  return <figure className="mr-4 w-80 shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <Stars size="size-3.5" />
      <blockquote className="mt-3 text-sm leading-relaxed text-white/80">“<T s={p[2]} />”</blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <Avatar name={p[0]} i={i} className="size-9" />
        <span>
          <span className="block text-sm font-semibold"><T s={p[0]} /></span>
          <span className="block text-xs text-white/45"><T s={p[1]} /></span>
        </span>
      </figcaption>
    </figure>;
}
export function MarqueeWall() {
  const rows = [PEOPLE.slice(0, 4), PEOPLE.slice(4)];
  return <section className="bg-[#09090f] py-20 text-white">
      <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"Loved by 40,000 teams"} /></motion.h3>
      <div className="mt-12 space-y-4 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <T s={rows.map((r, k) => <div key={k} className="overflow-hidden">
            <div className={`flex w-max hover:[animation-play-state:paused] ${k ? "animate-marquee-reverse" : "animate-marquee"}`} style={{
          "--duration": cv(k ? "55s" : "45s")
        }}>
              <T s={[...r, ...r, ...r, ...r].map((p, i) => <MiniCard key={i} p={p} i={i + k * 4} />)} />
            </div>
          </div>)} />
      </div>
    </section>;
}

/* ───────────── 02 · Quote Carousel ───────────── */
export function QuoteCarousel() {
  const __lx = useLx();
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setI(v => (v + 1) % 5), 5000);
    return () => clearTimeout(t);
  }, [i]);
  const p = PEOPLE[i];
  return <section className="bg-white px-6 py-20 text-center text-slate-900 [color-scheme:light]">
      <Quote className="mx-auto size-10 text-indigo-500" />
      <div className="mx-auto mt-6 min-h-[140px] max-w-3xl">
        <AnimatePresence mode="wait">
          <motion.blockquote key={i} initial={{
          opacity: 0,
          y: 20,
          filter: "blur(8px)"
        }} animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)"
        }} exit={{
          opacity: 0,
          y: -20,
          filter: "blur(8px)"
        }} transition={{
          duration: 0.5,
          ease: EASE
        }} className="font-display text-3xl leading-snug font-medium sm:text-4xl">
            “<T s={p[2]} />”
          </motion.blockquote>
        </AnimatePresence>
      </div>
      <div className="mt-10 flex items-center justify-center gap-3">
        <button onClick={() => setI((i + 4) % 5)} className="grid size-10 place-items-center rounded-full border border-slate-200" aria-label={__lx("Previous")}>
          <ChevronLeft className="size-5" />
        </button>
        <T s={PEOPLE.slice(0, 5).map((x, k) => <motion.button key={x[0]} onClick={() => setI(k)} animate={{
        scale: k === i ? 1.15 : 1,
        opacity: k === i ? 1 : 0.45
      }} className="rounded-full" aria-label={__lx(x[0])}>
            <Avatar name={x[0]} i={k} className={`size-12 ${k === i ? "ring-4 ring-indigo-200" : ""}`} />
          </motion.button>)} />
        <button onClick={() => setI((i + 1) % 5)} className="grid size-10 place-items-center rounded-full border border-slate-200" aria-label={__lx("Next")}>
          <ChevronRight className="size-5" />
        </button>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} className="mt-5">
          <span className="font-semibold"><T s={p[0]} /></span> <span className="text-slate-500">· <T s={p[1]} /></span>
        </motion.p>
      </AnimatePresence>
    </section>;
}

/* ───────────── 03 · Masonry Wall ───────────── */
const LONG = ["Honestly the nicest product launch we've ever done. The templates alone saved us weeks of design time and our customers noticed immediately.", "Short and sweet: it works.", "I was skeptical about switching tools mid-quarter, but the import took ten minutes and the team was productive the same day. The keyboard shortcuts are chef's kiss.", "Our designers and engineers finally speak the same language.", "We tried five alternatives. This is the only one that stuck.", "The mobile app is so good I sometimes plan the whole week from my phone on the bus."];
export function MasonryWall() {
  return <section className="bg-[#fbf6ef] px-6 py-20 text-[#2b2118] [color-scheme:light]">
      <motion.h3 {...reveal(0)} className="text-center font-serif text-5xl"><T s={"Kind words"} /></motion.h3>
      <div className="mx-auto mt-12 max-w-5xl columns-1 gap-5 sm:columns-2 lg:columns-3">
        <T s={LONG.map((q, i) => <motion.figure key={i} {...reveal(i % 3 * 0.1)} className="mb-5 break-inside-avoid rounded-3xl bg-white p-6 shadow-sm">
            <blockquote className="leading-relaxed text-[#2b2118]/80"><T s={q} /></blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <Avatar name={PEOPLE[i][0]} i={i} className="size-10" />
              <span>
                <span className="block font-semibold"><T s={PEOPLE[i][0]} /></span>
                <span className="block text-sm text-[#2b2118]/50"><T s={PEOPLE[i][1]} /></span>
              </span>
            </figcaption>
          </motion.figure>)} />
      </div>
    </section>;
}

/* ───────────── 04 · Video Testimonials ───────────── */
const VIDEOS = [["from-rose-500 to-orange-400", "1:42"], ["from-sky-500 to-indigo-600", "2:10"], ["from-emerald-500 to-teal-600", "0:58"]];
function VideoCard({
  g,
  len,
  p,
  i
}) {
  const __lx = useLx();
  const [play, setPlay] = useState(false);
  return <motion.div {...reveal(i * 0.1)} className="overflow-hidden rounded-3xl bg-[#14141c]">
      <button onClick={() => setPlay(x => !x)} className={`relative block aspect-[4/5] w-full bg-linear-to-br ${g}`} aria-label={__lx(play ? "Pause" : "Play")}>
        <Avatar name={p[0]} i={i} className="absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2 text-3xl opacity-90" />
        <motion.span animate={play ? {
        scale: 0.8,
        opacity: 0.6
      } : {
        scale: [1, 1.08, 1]
      }} transition={play ? {} : {
        duration: 1.6,
        repeat: Infinity
      }} className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-xl">
          <T s={play ? <Pause className="size-6 fill-current" /> : <Play className="ml-1 size-6 fill-current" />} />
        </motion.span>
        <span className="absolute top-3 right-3 rounded-md bg-black/50 px-2 py-0.5 text-xs text-white"><T s={len} /></span>
        <T s={play && <div className="absolute inset-x-4 bottom-4 flex h-8 items-end gap-1">
            <T s={Array.from({
          length: 24
        }).map((_, k) => <motion.span key={k} className="flex-1 rounded-full bg-white/80" animate={{
          height: ["20%", `${30 + rand(k + i * 30) * 70}%`, "20%"]
        }} transition={{
          duration: 0.6 + k % 4 * 0.1,
          repeat: Infinity
        }} />)} />
          </div>} />
      </button>
      <div className="p-5">
        <p className="text-sm text-white/75">“<T s={p[2]} />”</p>
        <p className="mt-3 text-sm font-semibold"><T s={p[0]} /></p>
        <p className="text-xs text-white/45"><T s={p[1]} /></p>
      </div>
    </motion.div>;
}
export function VideoTestimonials() {
  return <section className="bg-[#0b0b10] px-5 py-20 text-white">
      <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"Hear it from them"} /></motion.h3>
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
        <T s={VIDEOS.map(([g, len], i) => <VideoCard key={g} g={g} len={len} p={PEOPLE[i]} i={i} />)} />
      </div>
    </section>;
}

/* ───────────── 05 · Social Posts ───────────── */
function Post({
  p,
  i,
  likes0
}) {
  const [liked, setLiked] = useState(false);
  return <motion.article {...reveal(i * 0.08)} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <Avatar name={p[0]} i={i} className="size-10" />
        <div className="flex-1">
          <p className="flex items-center gap-1 text-sm font-semibold">
            <T s={p[0]} /> <BadgeCheck className="size-4 fill-sky-500 text-white" />
          </p>
          <p className="text-xs text-slate-500">@<T s={p[0].split(" ")[0].toLowerCase()} /> · <T s={i + 2} /><T s={"h"} /></p>
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed"><T s={p[2]} /> 🙌</p>
      <div className="mt-4 flex gap-6 text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <MessageCircle className="size-4" /> <T s={12 + i * 3} />
        </span>
        <span className="flex items-center gap-1.5">
          <Repeat2 className="size-4" /> <T s={30 + i * 7} />
        </span>
        <button onClick={() => setLiked(l => !l)} className={`flex items-center gap-1.5 ${liked ? "text-rose-500" : ""}`}>
          <motion.span animate={liked ? {
          scale: [1, 1.5, 1]
        } : {}}>
            <Heart className={`size-4 ${liked ? "fill-current" : ""}`} />
          </motion.span>
          <T s={likes0 + (liked ? 1 : 0)} />
        </button>
      </div>
    </motion.article>;
}
export function SocialPosts() {
  return <section className="bg-slate-100 px-5 py-20 text-slate-900 [color-scheme:light]">
      <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"People are talking"} /></motion.h3>
      <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
        <T s={PEOPLE.slice(0, 6).map((p, i) => <Post key={p[0]} p={p} i={i} likes0={120 + i * 41} />)} />
      </div>
    </section>;
}

/* ───────────── 06 · Big Quote ───────────── */
export function BigQuote() {
  return <section className="bg-[#111] px-6 py-24 text-white">
      <div className="mx-auto max-w-4xl">
        <Stars className="text-lime-300" size="size-5" />
        <motion.blockquote {...reveal(0.1)} className="mt-6 font-serif text-4xl leading-tight sm:text-6xl"><T s={"“It's the rare product that makes you"} /><T s={" "} />
          <span className="relative inline-block italic"><T s={"faster"} /><svg viewBox="0 0 200 20" className="absolute -bottom-2 left-0 w-full" preserveAspectRatio="none">
              <motion.path d="M3 14 Q 50 2 100 10 T 197 8" fill="none" stroke="#bef264" strokeWidth="4" strokeLinecap="round" initial={{
              pathLength: 0
            }} whileInView={{
              pathLength: 1
            }} viewport={{
              once: true
            }} transition={{
              duration: 1,
              delay: 0.6
            }} />
            </svg>
          </span><T s={" "} /><T s={"and calmer at the same time.”"} /></motion.blockquote>
        <motion.div {...reveal(0.3)} className="mt-10 flex items-center gap-4">
          <Avatar name="Elena Rossi" i={4} className="size-14" />
          <div>
            <p className="font-semibold"><T s={"Elena Rossi"} /></p>
            <p className="text-white/50"><T s={"COO at Zenara"} /></p>
          </div>
        </motion.div>
        <motion.div {...reveal(0.4)} className="mt-14 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-8 font-display text-xl font-semibold text-white/30">
          <T s={["Quantix", "Lumora", "Zenara", "Kinetiq", "Orbitly"].map(l => <span key={l} className="transition hover:text-white"><T s={l} /></span>)} />
        </motion.div>
      </div>
    </section>;
}

/* ───────────── 07 · Stacked Deck ───────────── */
export function StackedDeck() {
  const [order, setOrder] = useState([0, 1, 2, 3]);
  useEffect(() => {
    const id = setInterval(() => setOrder(o => [...o.slice(1), o[0]]), 3500);
    return () => clearInterval(id);
  }, []);
  const colors = ["bg-amber-200", "bg-sky-200", "bg-rose-200", "bg-emerald-200"];
  return <section className="grid place-items-center bg-[#fff8ee] px-5 py-20 text-slate-900 [color-scheme:light]">
      <motion.h3 {...reveal(0)} className="font-fun text-4xl font-extrabold"><T s={"Our favourite fans"} /></motion.h3>
      <div className="relative mt-12 h-72 w-full max-w-md">
        <T s={order.map((idx, pos) => {
        const p = PEOPLE[idx];
        return <motion.button key={idx} onClick={() => setOrder(o => [...o.slice(1), o[0]])} className={`absolute inset-0 rounded-3xl border-2 border-slate-900 p-7 text-left shadow-[6px_6px_0_#0f172a] ${colors[idx]}`} animate={{
          y: pos * 14,
          scale: 1 - pos * 0.05,
          rotate: pos === 0 ? 0 : pos % 2 ? 3 : -3,
          zIndex: 10 - pos,
          opacity: pos > 2 ? 0 : 1
        }} transition={{
          type: "spring",
          stiffness: 200,
          damping: 22
        }}>
              <Quote className="size-8" />
              <p className="mt-3 font-fun text-xl leading-snug font-bold">“<T s={p[2]} />”</p>
              <p className="mt-5 flex items-center gap-2 text-sm font-semibold">
                <Avatar name={p[0]} i={idx} className="size-8" /> <T s={p[0]} />
              </p>
            </motion.button>;
      })} />
      </div>
      <p className="mt-10 text-sm text-slate-500"><T s={"Click the card to see the next one"} /></p>
    </section>;
}

/* ───────────── 08 · Rating Summary ───────────── */
const DIST = [[5, 82], [4, 12], [3, 4], [2, 1], [1, 1]];
export function RatingSummary() {
  return <section className="bg-white px-5 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_1.6fr]">
        <motion.div {...reveal(0)}>
          <p className="font-display text-7xl font-semibold">
            <Counter to={4.8} decimals={1} />
          </p>
          <Stars size="size-5" />
          <p className="mt-2 text-sm text-slate-500"><T s={"Based on 2,481 reviews"} /></p>
          <div className="mt-6 space-y-2">
            <T s={DIST.map(([s, pct], i) => <div key={s} className="flex items-center gap-3 text-sm">
                <span className="flex w-8 items-center gap-1">
                  <T s={s} /> <Star className="size-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <motion.div className="h-full rounded-full bg-amber-400" initial={{
                width: 0
              }} whileInView={{
                width: `${pct}%`
              }} viewport={{
                once: true
              }} transition={{
                duration: 1,
                delay: 0.2 + i * 0.1,
                ease: EASE
              }} />
                </div>
                <span className="w-10 text-right text-slate-500"><T s={pct} />%</span>
              </div>)} />
          </div>
          <button className="mt-6 w-full rounded-xl border border-slate-300 py-2.5 text-sm font-semibold hover:bg-slate-50"><T s={"Write a review"} /></button>
        </motion.div>
        <div className="divide-y divide-slate-100">
          <T s={PEOPLE.slice(0, 3).map((p, i) => <motion.div key={p[0]} {...reveal(0.1 + i * 0.1)} className="py-5 first:pt-0">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <Avatar name={p[0]} i={i} className="size-9" />
                  <span>
                    <span className="block text-sm font-semibold"><T s={p[0]} /></span>
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <BadgeCheck className="size-3.5" /><T s={" Verified buyer"} /></span>
                  </span>
                </span>
                <Stars n={5 - (i === 2 ? 1 : 0)} size="size-3.5" />
              </div>
              <p className="mt-3 text-slate-600"><T s={p[2]} /></p>
            </motion.div>)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 09 · Case Study ───────────── */
export function CaseStudy() {
  return <section className="bg-linear-to-br from-indigo-950 via-slate-950 to-black px-5 py-20 text-white">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <motion.div {...reveal(0)}>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
            <span className="grid size-5 place-items-center rounded bg-linear-to-br from-sky-400 to-indigo-500 text-[10px] font-bold"><T s={"Q"} /></span><T s={" Case study · Quantix"} /></span>
          <blockquote className="mt-6 font-display text-3xl leading-snug font-medium"><T s={"“Within one quarter we doubled our release cadence without hiring a single extra engineer.”"} /></blockquote>
          <div className="mt-6 flex items-center gap-3">
            <Avatar name="Lina Haddad" i={0} className="size-11" />
            <div>
              <p className="font-semibold"><T s={"Lina Haddad"} /></p>
              <p className="text-sm text-white/50"><T s={"CTO, Quantix"} /></p>
            </div>
          </div>
          <a href="#" className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-sky-300"><T s={"Read the full story "} /><ChevronRight className="size-4" />
          </a>
        </motion.div>
        <div className="grid grid-cols-2 gap-4">
          <T s={[[2, "×", "release cadence"], [38, "%", "higher conversion"], [12, "h", "saved per person / week"], [94, "%", "team adoption"]].map(([v, s, l], i) => <motion.div key={l} {...reveal(0.1 + i * 0.08)} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <TrendingUp className="size-5 text-emerald-300" />
              <p className="mt-3 font-display text-4xl font-semibold">
                <Counter to={v} suffix={s} />
              </p>
              <p className="mt-1 text-sm text-white/55"><T s={l} /></p>
            </motion.div>)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 10 · Avatar Cloud ───────────── */
const SPOTS = [[12, 20], [30, 60], [22, 82], [48, 18], [55, 72], [70, 35], [82, 70], [88, 22]];
export function AvatarCloud() {
  const __lx = useLx();
  const auto = useCycle(SPOTS.length, 2600);
  const [hover, setHover] = useState(null);
  const active = hover ?? auto;
  const p = PEOPLE[active];
  const [x, y] = SPOTS[active];
  return <section className="relative h-[520px] overflow-hidden bg-[#f3f1ff] text-slate-900 [color-scheme:light]">
      <motion.h3 {...reveal(0)} className="relative z-10 pt-10 text-center font-display text-4xl font-semibold"><T s={"Real people. Real love."} /></motion.h3>
      <T s={SPOTS.map(([sx, sy], i) => <motion.button key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="absolute -translate-x-1/2 -translate-y-1/2" style={{
      left: `${sx}%`,
      top: `${sy}%`
    }} animate={{
      scale: active === i ? 1.25 : 1,
      y: [0, -6, 0]
    }} transition={{
      scale: {
        type: "spring",
        stiffness: 300,
        damping: 18
      },
      y: {
        duration: 3 + i % 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }} aria-label={__lx(PEOPLE[i][0])}>
          <Avatar name={PEOPLE[i][0]} i={i} className={`size-14 text-base shadow-lg ${active === i ? "ring-4 ring-violet-400" : "ring-4 ring-white"}`} />
        </motion.button>)} />
      <AnimatePresence mode="wait">
        <motion.div key={active} initial={{
        opacity: 0,
        scale: 0.9,
        y: 10
      }} animate={{
        opacity: 1,
        scale: 1,
        y: 0
      }} exit={{
        opacity: 0,
        scale: 0.9
      }} transition={{
        duration: 0.25
      }} className="absolute z-20 w-64 rounded-2xl bg-white p-4 text-sm shadow-2xl" style={{
        left: `clamp(8px, calc(${x}% - 128px), calc(100% - 264px))`,
        top: y > 50 ? `calc(${y}% - 150px)` : `calc(${y}% + 44px)`
      }}>
          <p className="text-slate-700">“<T s={p[2]} />”</p>
          <p className="mt-2 font-semibold"><T s={p[0]} /></p>
          <p className="text-xs text-slate-500"><T s={p[1]} /></p>
        </motion.div>
      </AnimatePresence>
    </section>;
}
