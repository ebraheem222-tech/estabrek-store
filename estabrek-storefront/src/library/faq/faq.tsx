// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (FAQ/src/faq.jsx): do not edit.
import { T, useLx } from "../runtime";
/* 10 FAQ sections. */
import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ChevronDown, CreditCard, HelpCircle, MessageCircle, Search, Shield, ThumbsDown, ThumbsUp, User, Zap } from "lucide-react";
import { Avatars, EASE, reveal } from "./shared";
const QA = [["How does the free trial work?", "You get every feature for 14 days. No credit card needed — we'll remind you three days before it ends.", "General"], ["Can I change plans later?", "Yes, upgrade or downgrade any time from Settings. We prorate the difference automatically.", "Billing"], ["Is my data secure?", "Everything is encrypted at rest and in transit. We're SOC 2 Type II certified and run yearly penetration tests.", "Account"], ["Do you offer discounts for students?", "Students and teachers get 50% off with a valid school email address.", "Billing"], ["Can I export my data?", "Any time, in one click — CSV, JSON or PDF. Your data is always yours.", "Account"], ["Which languages are supported?", "The app is available in English, Arabic, French, Spanish, German and Japanese.", "General"]];
function Answer({
  open,
  children,
  className = ""
}) {
  return <AnimatePresence initial={false}>
      <T s={open && <motion.div initial={{
      height: 0,
      opacity: 0
    }} animate={{
      height: "auto",
      opacity: 1
    }} exit={{
      height: 0,
      opacity: 0
    }} transition={{
      duration: 0.35,
      ease: EASE
    }} className="overflow-hidden">
          <div className={className}><T s={children} /></div>
        </motion.div>} />
    </AnimatePresence>;
}

/* ───────────── 01 · Classic Accordion ───────────── */
export function ClassicAccordion() {
  const [open, setOpen] = useState(0);
  return <section className="bg-white px-6 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto max-w-2xl">
        <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"Frequently asked questions"} /></motion.h3>
        <div className="mt-10 space-y-3">
          <T s={QA.map(([q, a], i) => <motion.div key={q} {...reveal(i * 0.05)} className={`rounded-2xl border transition-colors ${open === i ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200"}`}>
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium" aria-expanded={open === i}>
                <T s={q} />
                <motion.span animate={{
              rotate: open === i ? 45 : 0
            }} className={`grid size-7 shrink-0 place-items-center rounded-full text-lg ${open === i ? "bg-indigo-600 text-white" : "bg-slate-100"}`}>
                  +
                </motion.span>
              </button>
              <Answer open={open === i} className="px-5 pb-5 text-slate-600">
                <T s={a} />
              </Answer>
            </motion.div>)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 02 · Category Tabs ───────────── */
const CATS = ["General", "Billing", "Account"];
export function CategoryTabsFaq() {
  const [cat, setCat] = useState("General");
  const [open, setOpen] = useState(null);
  const list = QA.filter(x => x[2] === cat);
  return <section className="bg-[#0b0b12] px-5 py-20 text-white">
      <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"Got questions?"} /></motion.h3>
      <div className="mt-8 flex justify-center">
        <div className="flex gap-1 rounded-full bg-white/5 p-1">
          <T s={CATS.map(c => <button key={c} onClick={() => {
          setCat(c);
          setOpen(null);
        }} className="relative rounded-full px-5 py-2 text-sm font-medium">
              <T s={cat === c && <motion.span layoutId="faq-cat" className="absolute inset-0 rounded-full bg-violet-500" transition={{
            type: "spring",
            stiffness: 500,
            damping: 35
          }} />} />
              <span className="relative"><T s={c} /></span>
            </button>)} />
        </div>
      </div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
        <AnimatePresence mode="popLayout">
          <T s={list.map(([q, a], i) => <motion.div key={q} layout initial={{
          opacity: 0,
          y: 16
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          scale: 0.95
        }} transition={{
          delay: i * 0.05
        }} className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <button onClick={() => setOpen(open === q ? null : q)} className="flex w-full items-center justify-between gap-4 p-5 text-left font-medium">
                <T s={q} />
                <ChevronDown className={`size-5 shrink-0 text-white/40 transition ${open === q ? "rotate-180" : ""}`} />
              </button>
              <Answer open={open === q} className="px-5 pb-5 text-sm text-white/60">
                <T s={a} />
              </Answer>
            </motion.div>)} />
        </AnimatePresence>
      </div>
    </section>;
}

/* ───────────── 03 · Searchable ───────────── */
function Highlight({
  text,
  q
}) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>
      <T s={text.slice(0, i)} />
      <mark className="rounded bg-amber-200 px-0.5 text-slate-900"><T s={text.slice(i, i + q.length)} /></mark>
      <T s={text.slice(i + q.length)} />
    </>;
}
export function SearchFaq() {
  const __lx = useLx();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const list = QA.filter(([qq, a]) => `${qq} ${a}`.toLowerCase().includes(q.trim().toLowerCase()));
  return <section className="bg-amber-50 px-6 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto max-w-2xl">
        <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"How can we help?"} /></motion.h3>
        <motion.label {...reveal(0.1)} className="mt-8 flex items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 shadow-sm focus-within:ring-4 focus-within:ring-amber-200">
          <Search className="size-5 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={__lx("Try \"export\" or \"trial\"")} className="w-full bg-transparent py-4 outline-none" />
          <T s={q && <span className="text-xs text-slate-400"><T s={list.length} /><T s={" found"} /></span>} />
        </motion.label>
        <motion.div layout className="mt-6 space-y-2">
          <AnimatePresence initial={false}>
            <T s={list.map(([qq, a]) => <motion.div key={qq} layout initial={{
            opacity: 0,
            height: 0
          }} animate={{
            opacity: 1,
            height: "auto"
          }} exit={{
            opacity: 0,
            height: 0
          }} className="overflow-hidden rounded-2xl bg-white">
                <button onClick={() => setOpen(open === qq ? null : qq)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium">
                  <span>
                    <Highlight text={qq} q={q.trim()} />
                  </span>
                  <ChevronDown className={`size-5 shrink-0 transition ${open === qq ? "rotate-180" : ""}`} />
                </button>
                <Answer open={open === qq || q.trim() && a.toLowerCase().includes(q.trim().toLowerCase())} className="px-5 pb-5 text-slate-600">
                  <Highlight text={a} q={q.trim()} />
                </Answer>
              </motion.div>)} />
          </AnimatePresence>
          <T s={list.length === 0 && <motion.p initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} className="py-8 text-center text-slate-500"><T s={"No answers for \""} /><T s={q} />". <a href="#" className="font-semibold text-amber-700"><T s={"Ask our team →"} /></a>
            </motion.p>} />
        </motion.div>
      </div>
    </section>;
}

/* ───────────── 04 · Chat Style ───────────── */
export function ChatFaq() {
  const [msgs, setMsgs] = useState([{
    from: "bot",
    t: "Hi! 👋 Tap a question and I'll answer it."
  }]);
  const [typing, setTyping] = useState(false);
  const ask = (q, a) => {
    if (typing) return;
    setMsgs(m => [...m, {
      from: "me",
      t: q
    }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m.slice(-5), {
        from: "bot",
        t: a
      }]);
    }, 1100);
  };
  return <section className="bg-linear-to-br from-sky-100 to-indigo-100 px-5 py-16 text-slate-900 [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_1.3fr]">
        <div>
          <h3 className="font-display text-4xl font-semibold"><T s={"Ask away."} /></h3>
          <div className="mt-6 space-y-2">
            <T s={QA.slice(0, 5).map(([q, a]) => <button key={q} onClick={() => ask(q, a)} className="block w-full rounded-xl border border-white bg-white/70 px-4 py-3 text-left text-sm font-medium backdrop-blur transition hover:bg-white">
                <T s={q} />
              </button>)} />
          </div>
        </div>
        <div className="flex h-[420px] flex-col rounded-3xl bg-white shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
            <span className="grid size-9 place-items-center rounded-full bg-indigo-600 text-white">
              <HelpCircle className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold"><T s={"Help bot"} /></p>
              <p className="flex items-center gap-1 text-xs text-emerald-600">
                <span className="size-1.5 rounded-full bg-emerald-500" /><T s={" Online"} /></p>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden p-4">
            <AnimatePresence initial={false}>
              <T s={msgs.map((m, i) => <motion.div key={`${i}-${m.t}`} layout initial={{
              opacity: 0,
              y: 12,
              scale: 0.95
            }} animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.from === "me" ? "ml-auto rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md bg-slate-100"}`}>
                  <T s={m.t} />
                </motion.div>)} />
              <T s={typing && <motion.div key="typing" layout initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} exit={{
              opacity: 0
            }} className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3">
                  <T s={[0, 1, 2].map(k => <motion.span key={k} className="size-2 rounded-full bg-slate-400" animate={{
                y: [0, -4, 0]
              }} transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: k * 0.15
              }} />)} />
                </motion.div>} />
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>;
}

/* ───────────── 05 · Card Grid ───────────── */
const ICONS = [Zap, CreditCard, Shield, User, MessageCircle, HelpCircle];
export function GridFaq() {
  const [open, setOpen] = useState(null);
  return <section className="bg-[#fdfbf7] px-5 py-20 text-stone-900 [color-scheme:light]">
      <motion.h3 {...reveal(0)} className="text-center font-fun text-4xl font-extrabold"><T s={"Quick answers"} /></motion.h3>
      <LayoutGroup>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <T s={QA.map(([q, a], i) => {
          const I = ICONS[i];
          const isOpen = open === i;
          return <motion.button key={q} layout onClick={() => setOpen(isOpen ? null : i)} className={`rounded-3xl border-2 p-5 text-left transition-colors ${isOpen ? "border-stone-900 bg-amber-200" : "border-stone-200 bg-white hover:border-stone-400"}`} transition={{
            layout: {
              type: "spring",
              stiffness: 300,
              damping: 30
            }
          }}>
                <motion.span layout className={`grid size-10 place-items-center rounded-xl ${isOpen ? "bg-stone-900 text-amber-200" : "bg-stone-100"}`}>
                  <I className="size-5" />
                </motion.span>
                <motion.p layout className="mt-4 font-semibold">
                  <T s={q} />
                </motion.p>
                <AnimatePresence>
                  <T s={isOpen && <motion.p initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} exit={{
                opacity: 0
              }} className="mt-2 text-sm text-stone-700">
                      <T s={a} />
                    </motion.p>} />
                </AnimatePresence>
              </motion.button>;
        })} />
        </div>
      </LayoutGroup>
    </section>;
}

/* ───────────── 06 · Numbered Editorial ───────────── */
export function NumberedFaq() {
  const [open, setOpen] = useState(1);
  return <section className="bg-[#efe9df] px-6 py-20 text-[#1c1917] [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_2fr]">
        <motion.h3 {...reveal(0)} className="font-serif text-5xl leading-tight"><T s={"Questions,"} /><br />
          <em><T s={"answered."} /></em>
        </motion.h3>
        <div className="border-t border-black/20">
          <T s={QA.slice(0, 5).map(([q, a], i) => <div key={q} className="border-b border-black/20">
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-baseline gap-6 py-5 text-left">
                <span className="font-mono text-sm text-black/40">0<T s={i + 1} /></span>
                <span className="flex-1 font-serif text-2xl"><T s={q} /></span>
                <span className="relative size-4">
                  <span className="absolute top-1/2 left-0 h-px w-4 bg-black" />
                  <motion.span className="absolute top-0 left-1/2 h-4 w-px bg-black" animate={{
                scaleY: open === i ? 0 : 1
              }} />
                </span>
              </button>
              <Answer open={open === i} className="pb-6 pl-12 text-black/65">
                <T s={a} />
              </Answer>
            </div>)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 07 · Glass Glow ───────────── */
export function GlassFaq() {
  const [open, setOpen] = useState(0);
  return <section className="relative overflow-hidden bg-[#06050f] px-5 py-20 text-white">
      <div className="pointer-events-none absolute top-0 left-1/4 size-80 rounded-full bg-violet-600/30 blur-[100px]" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 size-80 rounded-full bg-cyan-500/20 blur-[100px]" />
      <div className="relative mx-auto max-w-2xl">
        <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"Need to know"} /></motion.h3>
        <div className="mt-10 space-y-3">
          <T s={QA.slice(0, 5).map(([q, a], i) => <motion.div key={q} animate={{
          boxShadow: open === i ? "0 0 0 1px rgba(167,139,250,0.6), 0 0 40px rgba(139,92,246,0.25)" : "0 0 0 1px rgba(255,255,255,0.1), 0 0 0 rgba(0,0,0,0)"
        }} className="rounded-2xl bg-white/[0.05] backdrop-blur-xl">
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium">
                <T s={q} />
                <ChevronDown className={`size-5 shrink-0 transition ${open === i ? "rotate-180 text-violet-300" : "text-white/40"}`} />
              </button>
              <Answer open={open === i} className="px-5 pb-5 text-sm text-white/65">
                <T s={a} />
              </Answer>
            </motion.div>)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 08 · Sidebar Categories ───────────── */
const SIDE = [["Getting started", Zap], ["Billing", CreditCard], ["Privacy & security", Shield], ["Your account", User]];
export function SidebarFaq() {
  const [cat, setCat] = useState(0);
  return <section className="bg-white px-5 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[240px_1fr]">
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          <T s={SIDE.map(([l, I], i) => <button key={l} onClick={() => setCat(i)} className="relative flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium">
              <T s={cat === i && <motion.span layoutId="side-faq" className="absolute inset-0 rounded-xl bg-teal-50 ring-1 ring-teal-200" transition={{
            type: "spring",
            stiffness: 500,
            damping: 35
          }} />} />
              <I className={`relative size-4 ${cat === i ? "text-teal-600" : "text-slate-400"}`} />
              <span className="relative"><T s={l} /></span>
            </button>)} />
        </nav>
        <AnimatePresence mode="wait">
          <motion.div key={cat} initial={{
          opacity: 0,
          x: 20
        }} animate={{
          opacity: 1,
          x: 0
        }} exit={{
          opacity: 0,
          x: -20
        }} transition={{
          duration: 0.25
        }}>
            <h3 className="font-display text-3xl font-semibold"><T s={SIDE[cat][0]} /></h3>
            <div className="mt-6 space-y-5">
              <T s={[QA[cat], QA[(cat + 3) % QA.length]].map(([q, a], i) => <motion.div key={q} initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: 0.1 + i * 0.1
            }}>
                  <p className="font-semibold"><T s={q} /></p>
                  <p className="mt-1 text-slate-600"><T s={a} /></p>
                </motion.div>)} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>;
}

/* ───────────── 09 · FAQ + Contact Card ───────────── */
export function ContactFaq() {
  const [open, setOpen] = useState(0);
  return <section className="bg-slate-50 px-5 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <motion.h3 {...reveal(0)} className="font-display text-4xl font-semibold"><T s={"FAQ"} /></motion.h3>
          <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            <T s={QA.slice(0, 4).map(([q, a], i) => <div key={q}>
                <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium">
                  <T s={q} />
                  <ChevronDown className={`size-5 shrink-0 transition ${open === i ? "rotate-180" : ""}`} />
                </button>
                <Answer open={open === i} className="px-5 pb-5 text-slate-600">
                  <T s={a} />
                </Answer>
              </div>)} />
          </div>
        </div>
        <motion.div {...reveal(0.2)} className="h-fit rounded-3xl bg-slate-900 p-7 text-white lg:mt-14">
          <Avatars n={3} size="size-11" ring="ring-2 ring-slate-900" />
          <p className="mt-5 font-display text-2xl font-semibold"><T s={"Still have questions?"} /></p>
          <p className="mt-2 text-sm text-white/60"><T s={"Our team usually replies in under 5 minutes, 7 days a week."} /></p>
          <a href="#" className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-slate-900">
            <MessageCircle className="size-4" /><T s={" Start a chat"} /></a>
        </motion.div>
      </div>
    </section>;
}

/* ───────────── 10 · Was This Helpful? ───────────── */
export function HelpfulFaq() {
  const __lx = useLx();
  const [open, setOpen] = useState(0);
  const [votes, setVotes] = useState({});
  return <section className="bg-[#0f1115] px-5 py-20 text-white">
      <div className="mx-auto max-w-2xl">
        <motion.h3 {...reveal(0)} className="font-display text-4xl font-semibold"><T s={"Help center"} /></motion.h3>
        <div className="mt-8 space-y-3">
          <T s={QA.slice(0, 4).map(([q, a], i) => <div key={q} className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium">
                <T s={q} />
                <ChevronDown className={`size-5 shrink-0 text-white/40 transition ${open === i ? "rotate-180" : ""}`} />
              </button>
              <Answer open={open === i} className="px-5 pb-5">
                <p className="text-sm text-white/65"><T s={a} /></p>
                <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4 text-sm text-white/50">
                  <AnimatePresence mode="wait" initial={false}>
                    <T s={votes[i] ? <motion.span key="t" initial={{
                  opacity: 0,
                  y: 6
                }} animate={{
                  opacity: 1,
                  y: 0
                }} className="text-emerald-300">
                        <T s={votes[i] === "up" ? "Thanks — glad it helped! 💚" : "Thanks — we'll improve this answer."} />
                      </motion.span> : <motion.span key="q" exit={{
                  opacity: 0
                }} className="flex items-center gap-3"><T s={"Was this helpful?"} /><T s={[["up", ThumbsUp], ["down", ThumbsDown]].map(([k, I]) => <motion.button key={k} whileTap={{
                    scale: 0.8
                  }} whileHover={{
                    scale: 1.15
                  }} onClick={() => setVotes(v => ({
                    ...v,
                    [i]: k
                  }))} className="grid size-8 place-items-center rounded-full border border-white/15 hover:bg-white/10" aria-label={__lx(k === "up" ? "Yes" : "No")}>
                            <I className="size-4" />
                          </motion.button>)} />
                      </motion.span>} />
                  </AnimatePresence>
                </div>
              </Answer>
            </div>)} />
        </div>
      </div>
    </section>;
}
