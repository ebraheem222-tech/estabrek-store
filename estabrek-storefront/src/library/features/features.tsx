// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Features/src/features.jsx): do not edit.
import { T, useLx, cv, cvs } from "../runtime";
/* 10 feature sections. */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { BarChart3, Bell, Bot, Check, ChevronLeft, ChevronRight, Clock, Cloud, Code2, Cpu, Globe, Layers, Lock, MapPin, MessageSquare, Minus, Plug, Rocket, Shield, Sparkles, Users, Workflow, X, Zap } from "lucide-react";
import { Avatar, Counter, EASE, FakeLines, reveal } from "./shared";
function Heading({
  eyebrow,
  title,
  sub,
  dark,
  center = true
}) {
  return <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <motion.p {...reveal(0)} className={`text-sm font-semibold tracking-widest uppercase ${dark ? "text-violet-300" : "text-indigo-600"}`}>
        <T s={eyebrow} />
      </motion.p>
      <motion.h3 {...reveal(0.08)} className="mt-3 font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
        <T s={title} />
      </motion.h3>
      <T s={sub && <motion.p {...reveal(0.16)} className={`mt-4 text-lg ${dark ? "text-white/55" : "text-slate-500"}`}>
          <T s={sub} />
        </motion.p>} />
    </div>;
}

/* ───────────── 01 · Icon Grid ───────────── */
const GRID = [[Zap, "Instant sync", "Changes appear on every device in milliseconds.", "bg-amber-100 text-amber-600"], [Shield, "Bank-grade security", "Encryption at rest and in transit, always on.", "bg-emerald-100 text-emerald-600"], [Users, "Built for teams", "Roles, comments and shared spaces out of the box.", "bg-sky-100 text-sky-600"], [Plug, "200+ integrations", "Connect the tools you already love.", "bg-violet-100 text-violet-600"], [BarChart3, "Clear analytics", "See what's working with dashboards that make sense.", "bg-rose-100 text-rose-600"], [Globe, "Works offline", "Keep going on the plane — we'll sync when you land.", "bg-cyan-100 text-cyan-600"]];
export function IconGrid() {
  const __lx = useLx();
  return <section className="bg-white px-6 py-20 text-slate-900 [color-scheme:light]">
      <Heading eyebrow={__lx("Features")} title={__lx("Everything you need. Nothing you don't.")} sub={__lx("Six reasons teams switch — and never switch back.")} />
      <div className="mx-auto mt-14 grid max-w-5xl gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        <T s={GRID.map(([I, t, d, c], i) => <motion.div key={t} {...reveal(i * 0.06)} className="group">
            <motion.span whileHover={{
          rotate: -8,
          scale: 1.1
        }} className={`grid size-12 place-items-center rounded-2xl ${c} shadow-sm transition-shadow group-hover:shadow-lg`}>
              <I className="size-6" />
            </motion.span>
            <p className="mt-4 text-lg font-semibold"><T s={t} /></p>
            <p className="mt-1 text-slate-500"><T s={d} /></p>
          </motion.div>)} />
      </div>
    </section>;
}

/* ───────────── 02 · Feature Bento ───────────── */
export function FeatureBento() {
  const __lx = useLx();
  return <section className="bg-[#09090f] px-5 py-20 text-white">
      <Heading dark eyebrow={__lx("Platform")} title={__lx("One workspace, endless flow.")} />
      <div className="mx-auto mt-12 grid max-w-6xl gap-4 md:grid-cols-3">
        <motion.div {...reveal(0)} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:col-span-2">
          <p className="flex items-center gap-2 font-semibold">
            <Bot className="size-5 text-violet-300" /><T s={" AI assistant"} /></p>
          <div className="mt-5 space-y-3">
            <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-violet-500 px-4 py-2 text-sm"><T s={"Summarise this week's feedback"} /></div>
            <div className="flex gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10">
                <Sparkles className="size-4 text-violet-300" />
              </span>
              <div className="rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3 text-sm text-white/80">
                <T s={["Users love the new editor (42 mentions).", "Top request: dark mode on mobile.", "Two bugs reported in export."].map((l, i) => <motion.p key={l} initial={{
                opacity: 0
              }} whileInView={{
                opacity: 1
              }} viewport={{
                once: true
              }} transition={{
                delay: 0.6 + i * 0.5
              }}>
                    • <T s={l} />
                  </motion.p>)} />
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div {...reveal(0.1)} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="flex items-center gap-2 font-semibold">
            <Clock className="size-5 text-emerald-300" /><T s={" 99.99% uptime"} /></p>
          <div className="mt-6 flex h-20 items-end gap-1">
            <T s={Array.from({
            length: 30
          }).map((_, i) => <motion.span key={i} className={`flex-1 rounded-sm ${i === 17 ? "bg-amber-400" : "bg-emerald-400"}`} initial={{
            height: 0
          }} whileInView={{
            height: i === 17 ? "55%" : "100%"
          }} viewport={{
            once: true
          }} transition={{
            delay: i * 0.02
          }} />)} />
          </div>
          <p className="mt-3 text-xs text-white/40"><T s={"Last 30 days"} /></p>
        </motion.div>
        <motion.div {...reveal(0.15)} className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="flex items-center gap-2 font-semibold">
            <MapPin className="size-5 text-sky-300" /><T s={" 32 regions"} /></p>
          <div className="relative mt-4 h-28 rounded-2xl [background-image:radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:10px_10px]">
            <T s={[[20, 30], [48, 52], [70, 25], [82, 68], [35, 75]].map(([x, y], i) => <motion.span key={i} className="absolute size-2.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]" style={{
            left: `${x}%`,
            top: `${y}%`
          }} animate={{
            scale: [1, 1.8, 1]
          }} transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4
          }} />)} />
          </div>
        </motion.div>
        <motion.div {...reveal(0.2)} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <p className="flex items-center gap-2 font-semibold">
            <Bell className="size-5 text-amber-300" /><T s={" Smart alerts"} /></p>
          <div className="mt-4 space-y-2">
            <T s={["Deploy succeeded", "New sign-up from Berlin", "Invoice paid"].map((t, i) => <motion.div key={t} initial={{
            x: 40,
            opacity: 0
          }} whileInView={{
            x: 0,
            opacity: 1
          }} viewport={{
            once: true
          }} transition={{
            delay: 0.3 + i * 0.2
          }} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/75">
                <span className="size-1.5 rounded-full bg-amber-300" /> <T s={t} />
              </motion.div>)} />
          </div>
        </motion.div>
        <motion.div {...reveal(0.25)} className="rounded-3xl border border-white/10 bg-linear-to-br from-violet-600 to-fuchsia-600 p-6">
          <p className="flex items-center gap-2 font-semibold">
            <Users className="size-5" /><T s={" Multiplayer"} /></p>
          <div className="mt-6 flex -space-x-3">
            <T s={["Ana K", "Mo S", "Lea R", "Jo D", "Nia O"].map((n, i) => <motion.span key={n} initial={{
            x: -20,
            opacity: 0
          }} whileInView={{
            x: 0,
            opacity: 1
          }} viewport={{
            once: true
          }} transition={{
            delay: i * 0.1
          }}>
                <Avatar name={n} i={i} className="size-12 ring-4 ring-violet-600" />
              </motion.span>)} />
          </div>
          <p className="mt-4 text-sm text-white/80"><T s={"Edit together, live."} /></p>
        </motion.div>
      </div>
    </section>;
}

/* ───────────── 03 · Zig-zag Rows ───────────── */
const ZIG = [["Plan in minutes", "Drag tasks onto a timeline and watch dependencies sort themselves out.", "from-sky-400 to-indigo-500", Workflow], ["Automate the boring", "Recurring tasks, reminders and hand-offs that run on their own.", "from-emerald-400 to-teal-500", Cpu], ["Report without effort", "Live dashboards your boss will actually read.", "from-orange-400 to-rose-500", BarChart3]];
export function ZigZagFeatures() {
  const __lx = useLx();
  return <section className="bg-[#fbfaf7] px-6 py-20 text-stone-900 [color-scheme:light]">
      <Heading eyebrow={__lx("How it helps")} title={__lx("Less busywork. More real work.")} />
      <div className="mx-auto mt-16 max-w-5xl space-y-20">
        <T s={ZIG.map(([t, d, g, I], i) => <div key={t} className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <motion.div initial={{
          opacity: 0,
          x: i % 2 ? 60 : -60
        }} whileInView={{
          opacity: 1,
          x: 0
        }} viewport={{
          once: true,
          margin: "-60px"
        }} transition={{
          duration: 0.8,
          ease: EASE
        }} className={`relative aspect-[4/3] overflow-hidden rounded-3xl bg-linear-to-br p-6 shadow-xl ${g}`}>
              <div className="absolute inset-6 rounded-2xl bg-white/90 p-5 shadow-lg">
                <div className="flex items-center gap-2">
                  <I className="size-5 text-stone-700" />
                  <div className="h-2.5 w-24 rounded-full bg-stone-200" />
                </div>
                <div className="mt-5">
                  <FakeLines n={4} className="bg-stone-200" />
                </div>
                <motion.div className={`mt-5 h-10 rounded-xl bg-linear-to-r ${g}`} initial={{
              width: "10%"
            }} whileInView={{
              width: "70%"
            }} viewport={{
              once: true
            }} transition={{
              duration: 1.2,
              delay: 0.4
            }} />
              </div>
            </motion.div>
            <motion.div {...reveal(0.15)}>
              <span className="font-mono text-sm text-stone-400">0<T s={i + 1} /></span>
              <p className="mt-2 font-serif text-4xl"><T s={t} /></p>
              <p className="mt-3 text-lg text-stone-600"><T s={d} /></p>
              <a href="#" className="mt-5 inline-flex items-center gap-1 font-semibold text-indigo-600"><T s={"Learn more "} /><ChevronRight className="size-4" />
              </a>
            </motion.div>
          </div>)} />
      </div>
    </section>;
}

/* ───────────── 04 · Tabbed Features ───────────── */
const TABS = [{
  k: "Plan",
  icon: Layers,
  d: "Roadmaps, sprints and goals in one view.",
  c: "from-sky-500 to-indigo-600",
  rows: ["Q3 roadmap", "Sprint 24", "Design review"]
}, {
  k: "Build",
  icon: Code2,
  d: "Branches, previews and reviews, connected.",
  c: "from-violet-500 to-fuchsia-600",
  rows: ["feat/auth — preview ready", "fix/export — 2 approvals", "chore/deps — merged"]
}, {
  k: "Ship",
  icon: Rocket,
  d: "Release notes and rollouts on autopilot.",
  c: "from-orange-500 to-rose-600",
  rows: ["v2.4 rolling out — 40%", "Changelog published", "Customers notified"]
}];
export function TabbedFeatures() {
  const __lx = useLx();
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setT(v => (v + 1) % TABS.length), 5000);
    return () => clearTimeout(id);
  }, [t]);
  const tab = TABS[t];
  return <section className="bg-[#0c0c12] px-5 py-20 text-white">
      <Heading dark eyebrow={__lx("Workflow")} title={__lx("From idea to shipped.")} />
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-3">
          <T s={TABS.map((x, i) => <button key={x.k} onClick={() => setT(i)} className={`relative w-full overflow-hidden rounded-2xl border p-5 text-left transition ${t === i ? "border-white/20 bg-white/[0.06]" : "border-white/5 hover:bg-white/[0.03]"}`}>
              <p className="flex items-center gap-3 font-semibold">
                <x.icon className={`size-5 ${t === i ? "text-violet-300" : "text-white/40"}`} /> <T s={x.k} />
              </p>
              <p className="mt-1 text-sm text-white/50"><T s={x.d} /></p>
              <T s={t === i && <motion.span key={t} className="absolute bottom-0 left-0 h-0.5 bg-violet-400" initial={{
            width: 0
          }} animate={{
            width: "100%"
          }} transition={{
            duration: 5,
            ease: "linear"
          }} />} />
            </button>)} />
        </div>
        <div className={`relative min-h-[320px] overflow-hidden rounded-3xl bg-linear-to-br p-6 transition-colors duration-500 ${tab.c}`}>
          <AnimatePresence mode="wait">
            <motion.div key={tab.k} initial={{
            opacity: 0,
            y: 20,
            scale: 0.97
          }} animate={{
            opacity: 1,
            y: 0,
            scale: 1
          }} exit={{
            opacity: 0,
            y: -20
          }} transition={{
            duration: 0.35
          }} className="rounded-2xl bg-[#0c0c12]/85 p-5 backdrop-blur">
              <p className="font-display text-2xl font-semibold"><T s={tab.k} /></p>
              <div className="mt-4 space-y-2">
                <T s={tab.rows.map((r, i) => <motion.div key={r} initial={{
                opacity: 0,
                x: -12
              }} animate={{
                opacity: 1,
                x: 0
              }} transition={{
                delay: 0.15 + i * 0.1
              }} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm">
                    <T s={r} /> <Check className="size-4 text-emerald-300" />
                  </motion.div>)} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>;
}

/* ───────────── 05 · Sticky Scroll ───────────── */
const STICKY = [["Capture", "Save anything — links, notes, screenshots — in one tap.", "#6366f1", MessageSquare], ["Organise", "Tags and smart folders sort it for you.", "#0ea5e9", Layers], ["Connect", "Related ideas link themselves automatically.", "#10b981", Workflow], ["Share", "Publish a page or invite a friend in seconds.", "#f59e0b", Globe]];
function StickyItem({
  i,
  title,
  text,
  onActive
}) {
  const ref = useRef(null);
  const inView = useInView(ref, {
    margin: "-45% 0px -45% 0px"
  });
  useEffect(() => {
    if (inView) onActive(i);
  }, [inView, i, onActive]);
  return <div ref={ref} className="flex min-h-[260px] flex-col justify-center">
      <span className="font-mono text-sm text-slate-400"><T s={"Step 0"} /><T s={i + 1} /></span>
      <p className="mt-2 font-display text-3xl font-semibold"><T s={title} /></p>
      <p className="mt-2 text-lg text-slate-500"><T s={text} /></p>
    </div>;
}
export function StickyScrollFeatures() {
  const __lx = useLx();
  const [active, setActive] = useState(0);
  const [,, color, Icon] = STICKY[active];
  return <section className="bg-white px-6 py-20 text-slate-900 [color-scheme:light]">
      <Heading eyebrow={__lx("Scroll down")} title={__lx("Your second brain, in four steps.")} />
      <div className="mx-auto mt-10 grid max-w-5xl gap-10 md:grid-cols-2">
        <div className="md:sticky md:top-28 md:h-[360px]">
          <motion.div animate={{
          backgroundColor: color
        }} transition={{
          duration: 0.5
        }} className="grid h-[300px] place-items-center rounded-3xl md:h-full">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{
              scale: 0.6,
              rotate: -20,
              opacity: 0
            }} animate={{
              scale: 1,
              rotate: 0,
              opacity: 1
            }} exit={{
              scale: 0.6,
              rotate: 20,
              opacity: 0
            }} transition={{
              type: "spring",
              stiffness: 200,
              damping: 16
            }} className="grid size-32 place-items-center rounded-[2rem] bg-white/90 shadow-2xl">
                <Icon className="size-14" style={{
                color: cv(color)
              }} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
        <div>
          <T s={STICKY.map(([t, d], i) => <StickyItem key={t} i={i} title={__lx(t)} text={d} onActive={setActive} />)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 06 · Accordion Features ───────────── */
const ACC = [["Real-time collaboration", "See cursors, comments and edits as they happen.", "from-pink-400 to-rose-500"], ["Version history", "Every change saved. Restore any moment with one click.", "from-indigo-400 to-violet-600"], ["Granular permissions", "Viewer, commenter, editor — per page, per person.", "from-emerald-400 to-cyan-500"], ["Lightning search", "Find any word in any file in under 50ms.", "from-amber-300 to-orange-500"]];
export function AccordionFeatures() {
  const __lx = useLx();
  const [open, setOpen] = useState(0);
  return <section className="bg-[#f6f5ff] px-6 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
        <div>
          <Heading center={false} eyebrow={__lx("Details")} title={__lx("Thoughtful down to the last pixel.")} />
          <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            <T s={ACC.map(([t, d], i) => <div key={t}>
                <button onClick={() => setOpen(i)} className="flex w-full items-center justify-between py-4 text-left font-semibold">
                  <T s={t} />
                  <motion.span animate={{
                rotate: open === i ? 45 : 0
              }} className="text-2xl leading-none text-indigo-600">
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  <T s={open === i && <motion.p initial={{
                height: 0,
                opacity: 0
              }} animate={{
                height: "auto",
                opacity: 1
              }} exit={{
                height: 0,
                opacity: 0
              }} className="overflow-hidden pb-4 text-slate-500">
                      <T s={d} />
                    </motion.p>} />
                </AnimatePresence>
              </div>)} />
          </div>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-3xl">
          <AnimatePresence mode="popLayout">
            <motion.div key={open} initial={{
            clipPath: "inset(0 0 100% 0)"
          }} animate={{
            clipPath: "inset(0 0 0% 0)"
          }} exit={{
            opacity: 0
          }} transition={{
            duration: 0.6,
            ease: EASE
          }} className={`absolute inset-0 grid place-items-center bg-linear-to-br ${ACC[open][2]}`}>
              <div className="w-3/4 rounded-2xl bg-white/90 p-5 shadow-2xl">
                <p className="font-semibold"><T s={ACC[open][0]} /></p>
                <div className="mt-3">
                  <FakeLines n={3} className="bg-slate-200" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>;
}

/* ───────────── 07 · Comparison Table ───────────── */
const COMPARE = [["Unlimited projects", true, false], ["Real-time collaboration", true, true], ["AI assistant", true, false], ["Offline mode", true, false], ["SSO on every plan", true, "Enterprise only"], ["Price per seat", "$8", "$15"]];
export function ComparisonFeatures() {
  const __lx = useLx();
  const cell = v => v === true ? <motion.span initial={{
    scale: 0
  }} whileInView={{
    scale: 1
  }} viewport={{
    once: true
  }} transition={{
    type: "spring",
    stiffness: 300,
    damping: 15
  }} className="mx-auto grid size-7 place-items-center rounded-full bg-emerald-400/20 text-emerald-300">
        <Check className="size-4" />
      </motion.span> : v === false ? <span className="mx-auto grid size-7 place-items-center rounded-full bg-white/5 text-white/30">
        <X className="size-4" />
      </span> : <span className="text-sm text-white/70"><T s={v} /></span>;
  return <section className="bg-[#0a0a12] px-5 py-20 text-white">
      <Heading dark eyebrow={__lx("Compare")} title={__lx("Why teams switch.")} />
      <motion.div {...reveal(0.1)} className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl border border-white/10">
        <div className="grid grid-cols-[1.5fr_1fr_1fr] bg-white/[0.04] px-5 py-4 text-sm font-semibold">
          <span><T s={"Feature"} /></span>
          <span className="text-center text-violet-300"><T s={"Flowly"} /></span>
          <span className="text-center text-white/50"><T s={"Others"} /></span>
        </div>
        <T s={COMPARE.map(([f, a, b], i) => <motion.div key={f} initial={{
        opacity: 0,
        x: -20
      }} whileInView={{
        opacity: 1,
        x: 0
      }} viewport={{
        once: true
      }} transition={{
        delay: i * 0.06
      }} className="grid grid-cols-[1.5fr_1fr_1fr] items-center border-t border-white/5 px-5 py-4 text-center">
            <span className="text-left text-sm"><T s={f} /></span>
            <span className="relative">
              <span className="absolute inset-y-[-16px] inset-x-2 bg-violet-500/[0.07]" />
              <span className="relative block"><T s={cell(a)} /></span>
            </span>
            <span><T s={cell(b)} /></span>
          </motion.div>)} />
      </motion.div>
    </section>;
}

/* ───────────── 08 · Stats + Features ───────────── */
const STATS = [[Users, 40000, "+", "teams onboard", ""], [Cloud, 2.4, "B", "files synced", ""], [Zap, 38, "ms", "median latency", ""], [Lock, 0, "", "breaches. Ever.", ""]];
export function StatsFeatures() {
  const __lx = useLx();
  return <section className="relative overflow-hidden bg-indigo-700 px-6 py-20 text-white">
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative">
        <Heading dark eyebrow={__lx("By the numbers")} title={__lx("Trusted at serious scale.")} />
        <div className="mx-auto mt-14 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <T s={STATS.map(([I, v, s, l], i) => <motion.div key={l} {...reveal(i * 0.1)} className="text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/15">
                <I className="size-6" />
              </span>
              <p className="mt-4 font-display text-5xl font-semibold">
                <Counter to={v} decimals={v % 1 ? 1 : 0} suffix={s} />
              </p>
              <p className="mt-1 text-indigo-100/80"><T s={l} /></p>
            </motion.div>)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 09 · Feature Carousel ───────────── */
const CAROUSEL = [["Smart inbox", "Priority mail floats to the top.", "from-sky-400 to-blue-600", MessageSquare], ["Auto-scheduling", "Meetings find their own time.", "from-violet-400 to-purple-600", Clock], ["Focus mode", "Silence everything but what matters.", "from-emerald-400 to-teal-600", Minus], ["Team pulse", "Weekly check-ins in 30 seconds.", "from-rose-400 to-pink-600", Users], ["Workflows", "If this, then that — for your whole company.", "from-amber-400 to-orange-600", Workflow], ["Global search", "Every doc, chat and file in one box.", "from-cyan-400 to-sky-600", Globe]];
export function FeatureCarousel() {
  const __lx = useLx();
  const ref = useRef(null);
  const scroll = d => ref.current?.scrollBy({
    left: d * 320,
    behavior: "smooth"
  });
  return <section className="bg-[#0b0b10] py-20 text-white">
      <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-6">
        <Heading dark center={false} eyebrow={__lx("Explore")} title={__lx("Small features, big wins.")} />
        <div className="hidden gap-2 sm:flex">
          <T s={[-1, 1].map(d => <button key={d} onClick={() => scroll(d)} className="grid size-11 place-items-center rounded-full border border-white/15 transition hover:bg-white/10" aria-label={__lx(d < 0 ? "Previous" : "Next")}>
              <T s={d < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />} />
            </button>)} />
        </div>
      </div>
      <div ref={ref} className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-4 [scrollbar-width:none] sm:px-[max(1.5rem,calc((100%-72rem)/2+1.5rem))]">
        <T s={CAROUSEL.map(([t, d, g, I], i) => <motion.div key={t} {...reveal(i * 0.05)} whileHover={{
        y: -6
      }} className="w-72 shrink-0 snap-start overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className={`grid h-44 place-items-center bg-linear-to-br ${g}`}>
              <motion.span whileHover={{
            rotate: 12,
            scale: 1.1
          }} className="grid size-16 place-items-center rounded-2xl bg-white/25 backdrop-blur">
                <I className="size-8" />
              </motion.span>
            </div>
            <div className="p-5">
              <p className="font-semibold"><T s={t} /></p>
              <p className="mt-1 text-sm text-white/55"><T s={d} /></p>
            </div>
          </motion.div>)} />
      </div>
    </section>;
}

/* ───────────── 10 · How It Works ───────────── */
const HOW = [["Sign up", "Create a free account in 30 seconds.", Users], ["Connect", "Plug in the tools you already use.", Plug], ["Relax", "Let the automations do the work.", Sparkles]];
export function HowItWorks() {
  const __lx = useLx();
  return <section className="bg-white px-6 py-20 text-slate-900 [color-scheme:light]">
      <Heading eyebrow={__lx("How it works")} title={__lx("Up and running in three steps.")} />
      <div className="relative mx-auto mt-16 max-w-4xl">
        <div className="absolute top-8 right-[16%] left-[16%] hidden h-0.5 bg-slate-100 md:block">
          <motion.div className="h-full origin-left bg-linear-to-r from-indigo-500 to-fuchsia-500" initial={{
          scaleX: 0
        }} whileInView={{
          scaleX: 1
        }} viewport={{
          once: true
        }} transition={{
          duration: 1.6,
          delay: 0.3,
          ease: EASE
        }} />
        </div>
        <div className="grid gap-10 md:grid-cols-3">
          <T s={HOW.map(([t, d, I], i) => <motion.div key={t} initial={{
          opacity: 0,
          y: 30
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: 0.3 + i * 0.5,
          duration: 0.6
        }} className="relative text-center">
              <motion.span initial={{
            scale: 0
          }} whileInView={{
            scale: 1
          }} viewport={{
            once: true
          }} transition={{
            delay: 0.3 + i * 0.5,
            type: "spring",
            stiffness: 260,
            damping: 14
          }} className="relative mx-auto grid size-16 place-items-center rounded-full bg-linear-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
                <I className="size-7" />
                <span className="absolute -top-1 -right-1 grid size-6 place-items-center rounded-full bg-white text-xs font-bold text-indigo-600 shadow"><T s={i + 1} /></span>
              </motion.span>
              <p className="mt-5 text-xl font-semibold"><T s={t} /></p>
              <p className="mt-1 text-slate-500"><T s={d} /></p>
            </motion.div>)} />
        </div>
      </div>
    </section>;
}
