// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Pricing/src/pricing.jsx): do not edit.
import { T, useLx, cv, cvs } from "../runtime";
/* 10 pricing sections. Prices are examples. */
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building2, Check, Coins, Crown, Minus, Rocket, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import { Avatars, EASE, reveal } from "./shared";
function Num({
  value,
  className = ""
}) {
  return <span className={`relative inline-flex overflow-hidden ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{
        y: "100%",
        opacity: 0
      }} animate={{
        y: 0,
        opacity: 1
      }} exit={{
        y: "-100%",
        opacity: 0
      }} transition={{
        duration: 0.35,
        ease: EASE
      }} className="inline-block tabular-nums">
          <T s={value} />
        </motion.span>
      </AnimatePresence>
    </span>;
}
function PeriodToggle({
  yearly,
  setYearly,
  id,
  dark
}) {
  return <div className={`relative inline-flex rounded-full p-1 text-sm font-medium ${dark ? "bg-white/10" : "bg-slate-200/70"}`}>
      <T s={[[false, "Monthly"], [true, "Yearly"]].map(([v, l]) => <button key={l} onClick={() => setYearly(v)} className="relative px-5 py-2">
          <T s={yearly === v && <motion.span layoutId={id} className={`absolute inset-0 rounded-full shadow ${dark ? "bg-white" : "bg-white"}`} transition={{
        type: "spring",
        stiffness: 500,
        damping: 35
      }} />} />
          <span className={`relative ${yearly === v ? "text-slate-900" : dark ? "text-white/70" : "text-slate-600"}`}>
            <T s={l} /> <T s={v && <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] text-white">-20%</span>} />
          </span>
        </button>)} />
    </div>;
}

/* ───────────── 01 · Three Tiers ───────────── */
const TIERS = [{
  n: "Starter",
  m: 9,
  y: 7,
  d: "For individuals getting started",
  f: ["3 projects", "5 GB storage", "Basic analytics", "Email support"]
}, {
  n: "Pro",
  m: 29,
  y: 23,
  d: "For growing teams",
  f: ["Unlimited projects", "100 GB storage", "Advanced analytics", "Priority support", "Automations"],
  pop: true
}, {
  n: "Business",
  m: 79,
  y: 63,
  d: "For companies at scale",
  f: ["Everything in Pro", "1 TB storage", "SSO & SAML", "Audit logs", "Dedicated manager"]
}];
export function ThreeTiers() {
  const [yearly, setYearly] = useState(false);
  return <section className="bg-slate-50 px-5 py-20 text-slate-900 [color-scheme:light]">
      <div className="text-center">
        <motion.h3 {...reveal(0)} className="font-display text-4xl font-semibold sm:text-5xl"><T s={"Simple, honest pricing"} /></motion.h3>
        <motion.p {...reveal(0.1)} className="mt-3 text-slate-500"><T s={"Start free. Upgrade when you're ready."} /></motion.p>
        <motion.div {...reveal(0.2)} className="mt-8">
          <PeriodToggle yearly={yearly} setYearly={setYearly} id="three-tier-toggle" />
        </motion.div>
      </div>
      <div className="mx-auto mt-12 grid max-w-5xl items-start gap-6 md:grid-cols-3">
        <T s={TIERS.map((t, i) => <motion.div key={t.n} {...reveal(i * 0.1)} className={`relative rounded-3xl p-7 ${t.pop ? "bg-slate-900 text-white shadow-2xl shadow-indigo-900/30 md:-mt-4 md:pb-11" : "border border-slate-200 bg-white"}`}>
            <T s={t.pop && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-indigo-500 to-fuchsia-500 px-3 py-1 text-xs font-semibold text-white"><T s={"Most popular"} /></span>} />
            <p className="font-semibold"><T s={t.n} /></p>
            <p className={`text-sm ${t.pop ? "text-white/60" : "text-slate-500"}`}><T s={t.d} /></p>
            <p className="mt-6 flex items-end gap-1">
              <span className="text-2xl">$</span>
              <Num value={yearly ? t.y : t.m} className="font-display text-5xl font-semibold" />
              <span className={`mb-1.5 text-sm ${t.pop ? "text-white/50" : "text-slate-400"}`}><T s={"/month"} /></span>
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <T s={t.f.map(f => <li key={f} className="flex items-center gap-2">
                  <Check className={`size-4 ${t.pop ? "text-fuchsia-300" : "text-indigo-600"}`} /> <T s={f} />
                </li>)} />
            </ul>
            <button className={`mt-8 w-full rounded-xl py-3 font-semibold transition ${t.pop ? "bg-white text-slate-900 hover:bg-indigo-50" : "bg-slate-900 text-white hover:bg-slate-700"}`}><T s={"Choose "} /><T s={t.n} /></button>
          </motion.div>)} />
      </div>
    </section>;
}

/* ───────────── 02 · Seat Slider ───────────── */
export function SliderPricing() {
  const __lx = useLx();
  const [seats, setSeats] = useState(12);
  const per = seats < 10 ? 12 : seats < 50 ? 10 : 8;
  const total = seats * per;
  return <section className="bg-[#0b0b12] px-5 py-20 text-white">
      <motion.div {...reveal(0)} className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
        <p className="text-sm font-semibold tracking-widest text-violet-300 uppercase"><T s={"Pay per seat"} /></p>
        <h3 className="mt-2 font-display text-3xl font-semibold sm:text-4xl"><T s={"How big is your team?"} /></h3>
        <div className="mt-10 flex items-end justify-between">
          <p className="font-display text-6xl font-semibold">
            <Num value={seats} />
            <span className="ml-2 text-lg font-normal text-white/50"><T s={seats === 1 ? "seat" : "seats"} /></span>
          </p>
          <p className="text-right">
            <span className="block text-sm text-white/50">$<T s={per} /><T s={" per seat"} /></span>
            <span className="font-display text-3xl font-semibold text-violet-300">
              $<Num value={total.toLocaleString("en-US")} />
              <span className="text-base text-white/40"><T s={"/mo"} /></span>
            </span>
          </p>
        </div>
        <div className="relative mt-6">
          <div className="h-2 rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500" animate={{
            width: `${(seats - 1) / 99 * 100}%`
          }} transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }} />
          </div>
          <input type="range" min={1} max={100} value={seats} onChange={e => setSeats(+e.target.value)} className="absolute inset-0 h-2 w-full cursor-pointer opacity-0" aria-label={__lx("Team size")} />
          <motion.span className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-fuchsia-500 bg-white shadow-lg" animate={{
          left: `${(seats - 1) / 99 * 100}%`
        }} transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }} />
        </div>
        <div className="mt-3 flex justify-between text-xs text-white/40">
          <span>1</span>
          <span><T s={"10 · $10/seat"} /></span>
          <span><T s={"50 · $8/seat"} /></span>
          <span>100</span>
        </div>
        <button className="mt-8 w-full rounded-xl bg-white py-3 font-semibold text-black"><T s={"Start 14-day trial"} /></button>
      </motion.div>
    </section>;
}

/* ───────────── 03 · Comparison Table ───────────── */
const PLANS3 = [["Free", "$0"], ["Team", "$12"], ["Scale", "$39"]];
const ROWS = [["Usage", [["Projects", "3", "Unlimited", "Unlimited"], ["Storage", "2 GB", "100 GB", "2 TB"], ["Members", "1", "25", "Unlimited"]]], ["Features", [["Automations", false, true, true], ["Custom domains", false, true, true], ["Audit log", false, false, true]]], ["Support", [["Community", true, true, true], ["Priority email", false, true, true], ["Dedicated manager", false, false, true]]]];
export function ComparisonPricing() {
  const cell = v => v === true ? <Check className="mx-auto size-5 text-emerald-500" /> : v === false ? <Minus className="mx-auto size-5 text-slate-300" /> : <span className="text-sm"><T s={v} /></span>;
  return <section className="bg-white px-4 py-16 text-slate-900 [color-scheme:light]">
      <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"Compare plans"} /></motion.h3>
      <div className="mx-auto mt-10 max-w-4xl">
        <div className="sticky top-24 z-10 grid grid-cols-4 gap-2 rounded-2xl border border-slate-200 bg-white/90 p-3 backdrop-blur">
          <span />
          <T s={PLANS3.map(([n, p], i) => <div key={n} className="text-center">
              <p className="text-sm font-semibold"><T s={n} /></p>
              <p className="font-display text-2xl font-semibold">
                <T s={p} />
                <span className="text-xs font-normal text-slate-400"><T s={"/mo"} /></span>
              </p>
              <button className={`mt-1 w-full rounded-lg py-1.5 text-xs font-semibold ${i === 1 ? "bg-indigo-600 text-white" : "border border-slate-200"}`}><T s={"Choose"} /></button>
            </div>)} />
        </div>
        <T s={ROWS.map(([group, rows]) => <div key={group} className="mt-6">
            <p className="px-3 text-xs font-semibold tracking-widest text-slate-400 uppercase"><T s={group} /></p>
            <T s={rows.map(([f, ...vals], i) => <motion.div key={f} initial={{
          opacity: 0
        }} whileInView={{
          opacity: 1
        }} viewport={{
          once: true
        }} transition={{
          delay: i * 0.05
        }} className="grid grid-cols-4 items-center gap-2 border-b border-slate-100 px-3 py-3 text-center">
                <span className="text-left text-sm"><T s={f} /></span>
                <T s={vals.map((v, k) => <span key={k} className={k === 1 ? "rounded-lg bg-indigo-50/60 py-1" : ""}>
                    <T s={cell(v)} />
                  </span>)} />
              </motion.div>)} />
          </div>)} />
      </div>
    </section>;
}

/* ───────────── 04 · One Plan Spotlight ───────────── */
export function SpotlightPlan() {
  return <section className="relative overflow-hidden bg-[#07070d] px-5 py-20 text-white">
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/15 blur-[120px]" />
      <motion.div {...reveal(0, 40)} className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-amber-200/20 bg-linear-to-b from-[#1a1508] to-[#0d0b06] p-8 sm:p-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-3 py-1 text-xs font-semibold text-amber-200">
              <Crown className="size-3.5" /><T s={" One plan. Everything included."} /></span>
            <p className="mt-4 font-display text-6xl font-semibold">
              $29<span className="text-xl font-normal text-white/50"><T s={"/month"} /></span>
            </p>
            <p className="mt-2 text-white/60"><T s={"No tiers, no add-ons, no surprises."} /></p>
          </div>
          <div className="text-center">
            <button className="rounded-2xl bg-linear-to-r from-amber-300 to-orange-400 px-8 py-4 font-semibold text-black shadow-[0_0_40px_rgba(251,191,36,0.4)] transition hover:scale-105"><T s={"Get full access"} /></button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/50">
              <ShieldCheck className="size-4 text-emerald-400" /><T s={" 30-day money-back guarantee"} /></p>
          </div>
        </div>
        <div className="mt-10 grid gap-3 border-t border-white/10 pt-8 sm:grid-cols-2">
          <T s={["Unlimited projects", "All templates", "AI assistant", "Custom domains", "Team spaces", "Priority support", "API access", "Lifetime updates"].map((f, i) => <motion.p key={f} initial={{
          opacity: 0,
          x: -10
        }} whileInView={{
          opacity: 1,
          x: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: 0.2 + i * 0.05
        }} className="flex items-center gap-2 text-sm text-white/80">
              <span className="grid size-5 place-items-center rounded-full bg-amber-300/20 text-amber-200">
                <Check className="size-3" />
              </span>
              <T s={f} />
            </motion.p>)} />
        </div>
        <div className="mt-8 flex items-center gap-3 text-sm text-white/50">
          <Avatars n={5} size="size-7" ring="ring-2 ring-[#120f07]" /><T s={" Joined by 18,000+ creators"} /></div>
      </motion.div>
    </section>;
}

/* ───────────── 05 · Neon Tiers ───────────── */
export function NeonTiers() {
  const [yearly, setYearly] = useState(true);
  const plans = [["Rookie", 0, 0, ["1 server", "Community"], "#22d3ee"], ["Pro", 19, 15, ["10 servers", "DDoS shield", "Priority queue"], "#e879f9"], ["Legend", 49, 39, ["Unlimited", "Custom bots", "24/7 support"], "#a3e635"]];
  return <section className="bg-[#050508] px-5 py-20 text-white">
      <div className="text-center">
        <motion.h3 {...reveal(0)} className="font-syne text-4xl font-extrabold tracking-tight uppercase sm:text-5xl"><T s={"Choose your class"} /></motion.h3>
        <div className="mt-6">
          <PeriodToggle yearly={yearly} setYearly={setYearly} id="neon-toggle" dark />
        </div>
      </div>
      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
        <T s={plans.map(([n, m, y, f, c], i) => {
        const pop = i === 1;
        return <motion.div key={n} {...reveal(i * 0.1)} className="relative overflow-hidden rounded-3xl p-px">
              <T s={pop ? <motion.div className="absolute top-1/2 left-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2" style={{
            background: cv(`conic-gradient(from 0deg, transparent 0 60%, ${c}, transparent 90%)`)
          }} animate={{
            rotate: 360
          }} transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }} /> : <div className="absolute inset-0 bg-white/10" />} />
              <div className="relative h-full rounded-[23px] bg-[#0c0c12] p-7">
                <p className="font-syne text-xl font-bold" style={{
              color: cv(c),
              textShadow: cv(`0 0 18px ${c}`)
            }}>
                  <T s={n} />
                </p>
                <p className="mt-4 font-display text-5xl font-semibold">
                  $<Num value={yearly ? y : m} />
                </p>
                <p className="text-sm text-white/40"><T s={"per month"} /></p>
                <ul className="mt-6 space-y-2.5 text-sm text-white/75">
                  <T s={f.map(x => <li key={x} className="flex items-center gap-2">
                      <Zap className="size-4" style={{
                  color: cv(c)
                }} /> <T s={x} />
                    </li>)} />
                </ul>
                <button className="mt-8 w-full rounded-xl py-3 font-bold text-black transition hover:brightness-110" style={{
              background: cv(c),
              boxShadow: cv(`0 0 24px ${c}66`)
            }}>
                  <T s={m === 0 ? "Play free" : "Level up"} />
                </button>
              </div>
            </motion.div>;
      })} />
      </div>
    </section>;
}

/* ───────────── 06 · Usage Calculator ───────────── */
export function UsageCalculator() {
  const [req, setReq] = useState(5);
  const [gb, setGb] = useState(50);
  const [region, setRegion] = useState(1);
  const regionMult = [0.9, 1, 1.15][region];
  const parts = [["Requests", req * 2.5 * regionMult, "#6366f1"], ["Storage", gb * 0.05 * regionMult, "#06b6d4"], ["Base", 10, "#f59e0b"]];
  const total = parts.reduce((s, [, v]) => s + v, 0);
  return <section className="bg-[#f4f6fb] px-5 py-20 text-slate-900 [color-scheme:light]">
      <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"Estimate your bill"} /></motion.h3>
      <motion.div {...reveal(0.1)} className="mx-auto mt-10 grid max-w-4xl gap-6 rounded-3xl bg-white p-6 shadow-xl sm:p-8 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-7">
          <T s={[["Requests per month", `${req}M`, req, setReq, 1, 50], ["Storage", `${gb} GB`, gb, setGb, 10, 500]].map(([l, shown, v, set, min, max]) => <label key={l} className="block">
              <span className="flex justify-between text-sm">
                <span className="font-medium"><T s={l} /></span>
                <span className="font-mono text-indigo-600"><T s={shown} /></span>
              </span>
              <input type="range" min={min} max={max} value={v} onChange={e => set(+e.target.value)} className="mt-3 w-full accent-indigo-600" />
            </label>)} />
          <div>
            <p className="text-sm font-medium"><T s={"Region"} /></p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <T s={["Europe", "US", "Asia"].map((r, i) => <button key={r} onClick={() => setRegion(i)} className={`rounded-xl border py-2 text-sm transition ${region === i ? "border-indigo-600 bg-indigo-50 font-semibold text-indigo-700" : "border-slate-200"}`}>
                  <T s={r} />
                </button>)} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-900 p-6 text-white">
          <p className="text-sm text-white/60"><T s={"Estimated monthly"} /></p>
          <p className="mt-1 font-display text-5xl font-semibold">
            $<Num value={total.toFixed(2)} />
          </p>
          <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-white/10">
            <T s={parts.map(([l, v, c]) => <motion.div key={l} animate={{
            width: `${v / total * 100}%`
          }} transition={{
            type: "spring",
            stiffness: 200,
            damping: 25
          }} style={{
            background: cv(c)
          }} />)} />
          </div>
          <ul className="mt-5 space-y-2 text-sm">
            <T s={parts.map(([l, v, c]) => <li key={l} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-white/70">
                  <span className="size-2.5 rounded-full" style={{
                background: cv(c)
              }} /> <T s={l} />
                </span>
                <span className="font-mono">$<T s={v.toFixed(2)} /></span>
              </li>)} />
          </ul>
        </div>
      </motion.div>
    </section>;
}

/* ───────────── 07 · Currency Switch ───────────── */
const CUR = [["USD", "en-US", 1], ["EUR", "de-DE", 0.92], ["JOD", "ar-JO", 0.71]];
export function CurrencyPricing() {
  const [c, setC] = useState(0);
  const [code, locale, rate] = CUR[c];
  const fmt = usd => new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0
  }).format(Math.round(usd * rate));
  return <section className="bg-[#101418] px-5 py-20 text-white">
      <div className="flex flex-col items-center gap-5 text-center">
        <motion.h3 {...reveal(0)} className="font-display text-4xl font-semibold"><T s={"Pricing in your currency"} /></motion.h3>
        <div className="flex gap-2">
          <T s={CUR.map(([k], i) => <button key={k} onClick={() => setC(i)} className={`relative rounded-full px-4 py-2 text-sm font-semibold ${c === i ? "text-black" : "text-white/60"}`}>
              <T s={c === i && <motion.span layoutId="cur-pill" className="absolute inset-0 rounded-full bg-emerald-300" transition={{
            type: "spring",
            stiffness: 500,
            damping: 35
          }} />} />
              <span className="relative"><T s={k} /></span>
            </button>)} />
        </div>
      </div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-3">
        <T s={[["Solo", 15, Sparkles], ["Studio", 45, Users], ["Agency", 120, Building2]].map(([n, usd, I], i) => <motion.div key={n} {...reveal(i * 0.1)} className={`rounded-3xl border p-6 ${i === 1 ? "border-emerald-300/40 bg-emerald-300/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
            <I className="size-6 text-emerald-300" />
            <p className="mt-4 font-semibold"><T s={n} /></p>
            <p className="mt-2 font-display text-4xl font-semibold">
              <Num value={fmt(usd)} />
            </p>
            <p className="text-sm text-white/40"><T s={"per month"} /></p>
            <button className="mt-6 w-full rounded-xl border border-white/15 py-2.5 text-sm font-semibold hover:bg-white/5"><T s={"Select"} /></button>
          </motion.div>)} />
      </div>
    </section>;
}

/* ───────────── 08 · Credit Packs ───────────── */
const PACKS = [[100, 5, null], [500, 20, "+10% bonus"], [1200, 45, "+20% bonus"], [3000, 99, "Best value"]];
export function CreditPacks() {
  const [sel, setSel] = useState(2);
  return <section className="bg-linear-to-b from-violet-50 to-white px-5 py-20 text-slate-900 [color-scheme:light]">
      <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"Top up your credits"} /></motion.h3>
      <p className="mt-2 text-center text-slate-500"><T s={"1 credit = 1 AI image. Credits never expire."} /></p>
      <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <T s={PACKS.map(([cr, price, badge], i) => <motion.button key={cr} {...reveal(i * 0.08)} onClick={() => setSel(i)} whileHover={{
        y: -4
      }} className={`relative rounded-3xl border-2 bg-white p-6 text-left transition-colors ${sel === i ? "border-violet-600 shadow-xl shadow-violet-600/15" : "border-slate-200"}`}>
            <T s={badge && <span className="absolute -top-3 right-4 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white"><T s={badge} /></span>} />
            <Coins className={`size-7 ${sel === i ? "text-violet-600" : "text-slate-400"}`} />
            <p className="mt-4 font-display text-3xl font-semibold"><T s={cr.toLocaleString("en-US")} /></p>
            <p className="text-sm text-slate-500"><T s={"credits"} /></p>
            <p className="mt-4 text-xl font-semibold">$<T s={price} /></p>
            <p className="text-xs text-slate-400">$<T s={(price / cr * 100).toFixed(1)} /><T s={"¢ per credit"} /></p>
            <T s={sel === i && <motion.span layoutId="pack-check" className="absolute top-4 right-4 grid size-6 place-items-center rounded-full bg-violet-600 text-white">
                <Check className="size-3.5" />
              </motion.span>} />
          </motion.button>)} />
      </div>
      <div className="mt-8 text-center">
        <button className="rounded-full bg-violet-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-violet-600/30"><T s={"Buy "} /><T s={PACKS[sel][0].toLocaleString("en-US")} /><T s={" credits · $"} /><T s={PACKS[sel][1]} />
        </button>
      </div>
    </section>;
}

/* ───────────── 09 · Minimal List ───────────── */
export function ListPricing() {
  return <section className="bg-[#f7f3ec] px-6 py-20 text-[#1f1a14] [color-scheme:light]">
      <div className="mx-auto max-w-3xl">
        <motion.h3 {...reveal(0)} className="font-serif text-5xl"><T s={"Membership"} /></motion.h3>
        <div className="mt-10 border-t border-black/15">
          <T s={[["Reader", "Weekly essays and the full archive.", "$5"], ["Supporter", "Everything above, plus quarterly print issue.", "$12"], ["Patron", "Everything, plus dinners with the writers.", "$40"]].map(([n, d, p], i) => <motion.a key={n} href="#" {...reveal(i * 0.1)} className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-black/15 py-6 transition-colors hover:bg-black/[0.03] sm:grid-cols-[180px_1fr_auto_auto]">
              <p className="font-serif text-3xl"><T s={n} /></p>
              <p className="hidden text-black/60 sm:block"><T s={d} /></p>
              <p className="font-serif text-3xl">
                <T s={p} />
                <span className="text-sm"><T s={"/mo"} /></span>
              </p>
              <span className="hidden size-10 place-items-center rounded-full border border-black/30 transition group-hover:bg-black group-hover:text-[#f7f3ec] sm:grid">→</span>
            </motion.a>)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 10 · Plans + Enterprise ───────────── */
export function EnterpriseSplit() {
  return <section className="bg-white px-5 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <T s={[["Basic", "$0", "Up to 3 users", Rocket], ["Growth", "$24", "Up to 50 users", Zap]].map(([n, p, d, I], i) => <motion.div key={n} {...reveal(i * 0.1)} className="flex items-center gap-4 rounded-3xl border border-slate-200 p-6">
              <span className="grid size-12 place-items-center rounded-2xl bg-slate-100">
                <I className="size-6" />
              </span>
              <div className="flex-1">
                <p className="font-semibold"><T s={n} /></p>
                <p className="text-sm text-slate-500"><T s={d} /></p>
              </div>
              <p className="font-display text-3xl font-semibold">
                <T s={p} />
                <span className="text-sm font-normal text-slate-400"><T s={"/mo"} /></span>
              </p>
            </motion.div>)} />
        </div>
        <motion.div {...reveal(0.2)} className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 text-white">
          <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-indigo-600/40 blur-3xl" />
          <Building2 className="relative size-8 text-indigo-300" />
          <p className="relative mt-4 font-display text-3xl font-semibold"><T s={"Enterprise"} /></p>
          <p className="relative mt-2 text-white/60"><T s={"Custom contracts, SSO, data residency and a team that picks up the phone."} /></p>
          <ul className="relative mt-6 grid gap-2 text-sm sm:grid-cols-2">
            <T s={["Unlimited users", "99.99% SLA", "SAML SSO", "Audit logs", "Data residency", "Dedicated CSM"].map(f => <li key={f} className="flex items-center gap-2 text-white/80">
                <Check className="size-4 text-indigo-300" /> <T s={f} />
              </li>)} />
          </ul>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <button className="rounded-xl bg-white px-5 py-3 font-semibold text-slate-900"><T s={"Talk to sales"} /></button>
            <button className="rounded-xl border border-white/20 px-5 py-3 font-semibold"><T s={"Read case studies"} /></button>
          </div>
          <p className="relative mt-6 text-xs tracking-widest text-white/40 uppercase"><T s={"Trusted by Quantix · Lumora · Zenara · Kinetiq"} /></p>
        </motion.div>
      </div>
    </section>;
}
