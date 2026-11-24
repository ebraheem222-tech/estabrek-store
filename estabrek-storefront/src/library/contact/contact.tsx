// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Contact/src/contact.jsx): do not edit.
import { T, useLx, cv, cvs } from "../runtime";
/* 10 contact sections. Forms are demos: nothing is sent. */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, Loader2, Mail, MapPin, MessageCircle, Phone, Send, X } from "lucide-react";
import { Avatar, rand, reveal } from "./shared";
function useSend() {
  const [s, setS] = useState("idle");
  const send = e => {
    e?.preventDefault();
    setS("sending");
    setTimeout(() => setS("sent"), 1200);
  };
  return [s, send, () => setS("idle")];
}
function Sent({
  onReset,
  dark
}) {
  return <motion.div initial={{
    opacity: 0,
    scale: 0.9
  }} animate={{
    opacity: 1,
    scale: 1
  }} className="py-10 text-center">
      <motion.div initial={{
      scale: 0,
      rotate: -90
    }} animate={{
      scale: 1,
      rotate: 0
    }} transition={{
      type: "spring",
      stiffness: 260,
      damping: 14
    }}>
        <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
      </motion.div>
      <p className="mt-4 font-display text-2xl font-semibold"><T s={"Message sent!"} /></p>
      <p className={dark ? "text-white/60" : "text-slate-500"}><T s={"We'll get back to you within a day. (Demo — nothing was sent.)"} /></p>
      <button onClick={onReset} className="mt-4 text-sm underline"><T s={"Send another"} /></button>
    </motion.div>;
}
const input = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15";

/* ───────────── 01 · Split Contact ───────────── */
export function SplitContact() {
  const __lx = useLx();
  const [s, send, reset] = useSend();
  const dots = useMemo(() => Array.from({
    length: 140
  }, (_, i) => rand(i) > 0.55), []);
  return <section className="bg-white px-5 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2">
        <motion.div {...reveal(0)}>
          <h3 className="font-display text-4xl font-semibold"><T s={"Get in touch"} /></h3>
          <p className="mt-3 text-slate-500"><T s={"Questions, ideas or just want to say hello? We'd love to hear from you."} /></p>
          <ul className="mt-8 space-y-4">
            <T s={[[Mail, "hello@northwind.dev"], [Phone, "+962 6 555 0199"], [MapPin, "Rainbow St 21, Amman, Jordan"]].map(([I, t]) => <li key={t} className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <I className="size-5" />
                </span>
                <T s={t} />
              </li>)} />
          </ul>
          <div className="relative mt-8 grid grid-cols-14 gap-1.5 rounded-3xl bg-slate-50 p-5">
            <T s={dots.map((on, i) => <span key={i} className={`size-1.5 rounded-full ${on ? "bg-slate-300" : "bg-transparent"}`} />)} />
            <span className="absolute top-[45%] left-[58%] flex size-4">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex size-4 rounded-full border-2 border-white bg-indigo-600" />
            </span>
          </div>
        </motion.div>
        <motion.div {...reveal(0.15)} className="rounded-3xl border border-slate-200 p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <AnimatePresence mode="wait">
            <T s={s === "sent" ? <Sent key="sent" onReset={reset} /> : <motion.form key="f" exit={{
            opacity: 0
          }} onSubmit={send} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input required placeholder={__lx("Your name")} className={input} />
                  <input required type="email" placeholder={__lx("Email")} className={input} />
                </div>
                <select className={input} defaultValue="General">
                  <T s={["General", "Sales", "Support", "Press"].map(o => <option key={o}><T s={o} /></option>)} />
                </select>
                <textarea required rows={5} placeholder={__lx("How can we help?")} className={`${input} resize-none`} />
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-500">
                  <T s={s === "sending" ? <Loader2 className="size-5 animate-spin" /> : <><Send className="size-4" /><T s={" Send message"} /></>} />
                </button>
              </motion.form>} />
          </AnimatePresence>
        </motion.div>
      </div>
    </section>;
}

/* ───────────── 02 · Floating Labels ───────────── */
function FloatField({
  label,
  type = "text",
  value,
  onChange,
  error,
  textarea
}) {
  const [focus, setFocus] = useState(false);
  const up = focus || value;
  const Tag = textarea ? "textarea" : "input";
  return <motion.label animate={error ? {
    x: [0, -8, 8, -6, 6, 0]
  } : {}} transition={{
    duration: 0.4
  }} className="relative block">
      <Tag type={type} rows={textarea ? 4 : undefined} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} className={`peer w-full resize-none rounded-2xl border-2 bg-transparent px-4 pt-6 pb-2 text-white outline-none transition ${error ? "border-rose-400" : "border-white/15 focus:border-cyan-400"}`} />
      <motion.span animate={{
      y: up ? -10 : 4,
      scale: up ? 0.8 : 1,
      color: error ? "#fb7185" : focus ? "#22d3ee" : "rgba(255,255,255,0.5)"
    }} className="pointer-events-none absolute top-3 left-4 origin-left">
        <T s={label} />
      </motion.span>
      <T s={error && <span className="mt-1 block text-xs text-rose-300"><T s={error} /></span>} />
    </motion.label>;
}
export function FloatingLabelForm() {
  const __lx = useLx();
  const [f, setF] = useState({
    name: "",
    email: "",
    msg: ""
  });
  const [err, setErr] = useState({});
  const [s, send, reset] = useSend();
  const done = s === "sent";
  const submit = e => {
    e.preventDefault();
    const er = {};
    if (!f.name) er.name = "Please tell us your name";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = "That email doesn't look right";
    if (f.msg.length < 10) er.msg = "A little more detail, please (10+ characters)";
    setErr(er);
    if (!Object.keys(er).length) send();
  };
  return <section className="bg-[#0b1120] px-5 py-20 text-white">
      <div className="mx-auto max-w-lg">
        <motion.h3 {...reveal(0)} className="font-display text-4xl font-semibold"><T s={"Say hello"} /></motion.h3>
        <p className="mt-2 text-white/50"><T s={"Try submitting it empty to see the validation."} /></p>
        <AnimatePresence mode="wait">
          <T s={done ? <Sent key="s" dark onReset={() => {
          reset();
          setF({
            name: "",
            email: "",
            msg: ""
          });
        }} /> : <motion.form key="f" exit={{
          opacity: 0
        }} onSubmit={submit} noValidate className="mt-8 space-y-5">
              <FloatField label={__lx("Name")} value={f.name} onChange={v => setF({
            ...f,
            name: v
          })} error={err.name} />
              <FloatField label={__lx("Email")} type="email" value={f.email} onChange={v => setF({
            ...f,
            email: v
          })} error={err.email} />
              <FloatField label={__lx("Message")} textarea value={f.msg} onChange={v => setF({
            ...f,
            msg: v
          })} error={err.msg} />
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 py-3.5 font-semibold text-slate-900">
                <T s={s === "sending" ? <Loader2 className="size-5 animate-spin" /> : "Send"} />
              </button>
            </motion.form>} />
        </AnimatePresence>
      </div>
    </section>;
}

/* ───────────── 03 · Project Wizard ───────────── */
const TYPES = ["Website", "Mobile app", "Branding", "E-commerce", "UI audit", "Other"];
const BUDGETS = ["< $5k", "$5–15k", "$15–50k", "$50k+"];
export function ProjectWizard() {
  const __lx = useLx();
  const [types, setTypes] = useState(["Website"]);
  const [budget, setBudget] = useState(1);
  const [s, send, reset] = useSend();
  const toggle = t => setTypes(x => x.includes(t) ? x.filter(y => y !== t) : [...x, t]);
  return <section className="bg-[#f5f2ff] px-5 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto max-w-2xl rounded-[2rem] bg-white p-7 shadow-xl sm:p-10">
        <AnimatePresence mode="wait">
          <T s={s === "sent" ? <Sent key="s" onReset={reset} /> : <motion.form key="f" exit={{
          opacity: 0
        }} onSubmit={send}>
              <h3 className="font-display text-3xl font-semibold"><T s={"Start a project"} /></h3>
              <p className="mt-6 text-sm font-semibold"><T s={"What do you need?"} /></p>
              <div className="mt-3 flex flex-wrap gap-2">
                <T s={TYPES.map(t => {
              const on = types.includes(t);
              return <motion.button key={t} type="button" whileTap={{
                scale: 0.92
              }} onClick={() => toggle(t)} className={`flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors ${on ? "border-violet-600 bg-violet-600 text-white" : "border-slate-200 hover:border-slate-300"}`}>
                      <AnimatePresence initial={false}>
                        <T s={on && <motion.span initial={{
                    width: 0,
                    opacity: 0
                  }} animate={{
                    width: "auto",
                    opacity: 1
                  }} exit={{
                    width: 0,
                    opacity: 0
                  }} className="overflow-hidden">
                            <Check className="size-4" />
                          </motion.span>} />
                      </AnimatePresence>
                      <T s={t} />
                    </motion.button>;
            })} />
              </div>
              <p className="mt-7 text-sm font-semibold"><T s={"Budget"} /></p>
              <div className="relative mt-3 grid grid-cols-4 rounded-2xl bg-slate-100 p-1 text-sm">
                <T s={BUDGETS.map((b, i) => <button key={b} type="button" onClick={() => setBudget(i)} className="relative py-2.5 font-medium">
                    <T s={budget === i && <motion.span layoutId="budget-pill" className="absolute inset-0 rounded-xl bg-white shadow" transition={{
                type: "spring",
                stiffness: 500,
                damping: 35
              }} />} />
                    <span className="relative"><T s={b} /></span>
                  </button>)} />
              </div>
              <p className="mt-7 text-sm font-semibold"><T s={"Tell us more"} /></p>
              <textarea rows={3} placeholder={__lx("Goals, timeline, links…")} className={`${input} mt-3 resize-none`} />
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm text-slate-500">
                  <T s={types.length || "No"} /><T s={" service"} /><T s={types.length === 1 ? "" : "s"} /> · <T s={BUDGETS[budget]} />
                </p>
                <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">
                  <T s={s === "sending" ? <Loader2 className="size-5 animate-spin" /> : <><T s={"Send brief "} /><ArrowRight className="size-4" /></>} />
                </button>
              </div>
            </motion.form>} />
        </AnimatePresence>
      </div>
    </section>;
}

/* ───────────── 04 · Offices Map ───────────── */
const OFFICES = [{
  city: "Amman",
  addr: "Rainbow St 21",
  x: 58,
  y: 44,
  tz: "Asia/Amman"
}, {
  city: "Berlin",
  addr: "Torstraße 140",
  x: 51,
  y: 30,
  tz: "Europe/Berlin"
}, {
  city: "New York",
  addr: "155 Water St",
  x: 27,
  y: 37,
  tz: "America/New_York"
}, {
  city: "Singapore",
  addr: "1 Raffles Pl",
  x: 77,
  y: 58,
  tz: "Asia/Singapore"
}];
export function OfficesMap() {
  const __lx = useLx();
  const [sel, setSel] = useState(0);
  const dots = useMemo(() => {
    const out = [];
    for (let y = 0; y < 22; y++) for (let x = 0; x < 50; x++) {
      const lat = y / 22;
      const lon = x / 50;
      const land = lon > 0.15 && lon < 0.35 && lat > 0.2 && lat < 0.75 || lon > 0.45 && lon < 0.62 && lat > 0.15 && lat < 0.8 || lon > 0.6 && lon < 0.9 && lat > 0.15 && lat < 0.55 || lon > 0.78 && lon < 0.9 && lat > 0.65 && lat < 0.85;
      if (land && rand(x * 31 + y) > 0.25) out.push([x * 2 + 1, y * 4.5 + 2]);
    }
    return out;
  }, []);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return <section className="bg-[#0a0d14] px-5 py-20 text-white">
      <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"Come say hi"} /></motion.h3>
      <div className="mx-auto mt-10 max-w-5xl">
        <div className="relative aspect-[2/1] rounded-3xl border border-white/10 bg-white/[0.02]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
            <T s={dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.45" fill="rgba(255,255,255,0.22)" />)} />
          </svg>
          <T s={OFFICES.map((o, i) => <button key={o.city} onClick={() => setSel(i)} className="absolute -translate-x-1/2 -translate-y-1/2" style={{
          left: `${o.x}%`,
          top: `${o.y}%`
        }} aria-label={__lx(o.city)}>
              <span className="relative flex size-4">
                <span className={`absolute inline-flex size-full rounded-full opacity-75 ${sel === i ? "animate-ping bg-orange-400" : ""}`} />
                <span className={`relative inline-flex size-4 rounded-full border-2 border-white ${sel === i ? "bg-orange-500" : "bg-slate-500"}`} />
              </span>
              <AnimatePresence>
                <T s={sel === i && <motion.span initial={{
              opacity: 0,
              y: 6
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0
            }} className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-white px-2 py-1 text-xs font-semibold whitespace-nowrap text-black">
                    <T s={o.city} />
                  </motion.span>} />
              </AnimatePresence>
            </button>)} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <T s={OFFICES.map((o, i) => <button key={o.city} onClick={() => setSel(i)} className={`rounded-2xl border p-4 text-left transition ${sel === i ? "border-orange-400/60 bg-orange-400/10" : "border-white/10 hover:bg-white/5"}`}>
              <p className="font-semibold"><T s={o.city} /></p>
              <p className="text-sm text-white/50"><T s={o.addr} /></p>
              <p className="mt-2 flex items-center gap-1 text-xs text-white/40">
                <Clock className="size-3" /> <T s={now.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: o.tz
            })} /><T s={" local"} /></p>
            </button>)} />
        </div>
      </div>
    </section>;
}

/* ───────────── 05 · Chat Widget ───────────── */
export function ChatWidget() {
  const __lx = useLx();
  const [open, setOpen] = useState(true);
  const [msgs, setMsgs] = useState([]);
  useEffect(() => {
    if (!open) return;
    setMsgs([]);
    const t = setTimeout(() => setMsgs([{
      me: false,
      t: "Hey there 👋 I'm Rana from the team. How can I help today?"
    }]), 700);
    return () => clearTimeout(t);
  }, [open]);
  const reply = q => {
    setMsgs(m => [...m, {
      me: true,
      t: q
    }]);
    setTimeout(() => setMsgs(m => [...m, {
      me: false,
      t: "Great question! I'll send you a link in a second. 🙌"
    }]), 900);
  };
  return <section className="relative h-[560px] overflow-hidden bg-slate-100 p-8 text-slate-900 [color-scheme:light]">
      <p className="font-display text-2xl font-semibold"><T s={"A friendly chat launcher"} /></p>
      <p className="text-slate-500"><T s={"Click the bubble in the corner."} /></p>
      <AnimatePresence>
        <T s={open && <motion.div initial={{
        opacity: 0,
        scale: 0.6,
        y: 40
      }} animate={{
        opacity: 1,
        scale: 1,
        y: 0
      }} exit={{
        opacity: 0,
        scale: 0.6,
        y: 40
      }} transition={{
        type: "spring",
        stiffness: 260,
        damping: 22
      }} className="absolute right-6 bottom-24 flex h-[380px] w-80 origin-bottom-right flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-linear-to-br from-indigo-600 to-violet-600 p-5 text-white">
              <div className="flex items-center gap-3">
                <Avatar name="Rana Saleh" i={2} className="size-10 ring-2 ring-white/40" />
                <div>
                  <p className="font-semibold"><T s={"Rana from Support"} /></p>
                  <p className="flex items-center gap-1 text-xs text-white/80">
                    <span className="size-1.5 rounded-full bg-emerald-300" /><T s={" Replies in ~2 min"} /></p>
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden p-4">
              <AnimatePresence initial={false}>
                <T s={msgs.slice(-4).map((m, i) => <motion.p key={`${i}-${m.t}`} layout initial={{
              opacity: 0,
              y: 10
            }} animate={{
              opacity: 1,
              y: 0
            }} className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.me ? "ml-auto rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md bg-slate-100"}`}>
                    <T s={m.t} />
                  </motion.p>)} />
              </AnimatePresence>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 p-3">
              <T s={["Pricing", "Book a demo", "Report a bug"].map(q => <button key={q} onClick={() => reply(q)} className="rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50">
                  <T s={q} />
                </button>)} />
            </div>
          </motion.div>} />
      </AnimatePresence>
      <motion.button whileHover={{
      scale: 1.08
    }} whileTap={{
      scale: 0.92
    }} onClick={() => setOpen(o => !o)} className="absolute right-6 bottom-6 grid size-14 place-items-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/40" aria-label={__lx("Toggle chat")}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? "x" : "c"} initial={{
          rotate: -90,
          opacity: 0
        }} animate={{
          rotate: 0,
          opacity: 1
        }} exit={{
          rotate: 90,
          opacity: 0
        }}>
            <T s={open ? <X className="size-6" /> : <MessageCircle className="size-6" />} />
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </section>;
}

/* ───────────── 06 · Big Email ───────────── */
export function BigEmail() {
  const [copied, setCopied] = useState(false);
  return <section className="bg-[#ff5b3a] px-6 py-24 text-[#1a0a06] [color-scheme:light]">
      <div className="mx-auto max-w-5xl">
        <motion.p {...reveal(0)} className="font-mono text-sm tracking-widest uppercase"><T s={"Drop us a line"} /></motion.p>
        <motion.button {...reveal(0.1)} onClick={() => {
        navigator.clipboard?.writeText("hi@loud.studio").catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }} className="group mt-4 flex flex-wrap items-center gap-4 text-left font-syne text-5xl font-extrabold tracking-tight sm:text-8xl">
          <span className="underline decoration-4 underline-offset-8 transition group-hover:decoration-[10px]"><T s={"hi@loud.studio"} /></span>
          <span className="grid size-14 place-items-center rounded-full bg-[#1a0a06] text-[#ff5b3a] sm:size-20">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={copied ? "y" : "n"} initial={{
              scale: 0
            }} animate={{
              scale: 1
            }} exit={{
              scale: 0
            }}>
                <T s={copied ? <Check className="size-7" /> : <Copy className="size-7" />} />
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>
        <p className="mt-3 h-5 text-sm font-semibold"><T s={copied ? "Copied to clipboard!" : "Click to copy"} /></p>
        <motion.div {...reveal(0.2)} className="mt-14 grid gap-6 border-t-2 border-[#1a0a06] pt-8 sm:grid-cols-3">
          <T s={["Instagram", "LinkedIn", "Behance"].map(s => <a key={s} href="#" className="group flex items-center justify-between text-2xl font-bold">
              <T s={s} /> <ArrowRight className="size-6 -rotate-45 transition group-hover:rotate-0" />
            </a>)} />
        </motion.div>
      </div>
    </section>;
}

/* ───────────── 07 · Booking Calendar ───────────── */
const SLOTS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];
export function BookingCalendar() {
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [booked, setBooked] = useState(false);
  const first = 3;
  const days = 30;
  return <section className="bg-white px-5 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto grid max-w-4xl gap-6 rounded-3xl border border-slate-200 p-6 shadow-xl sm:p-8 md:grid-cols-[1fr_1.2fr_1fr]">
        <div>
          <Avatar name="Maya Chen" i={1} className="size-12" />
          <p className="mt-3 text-sm text-slate-500"><T s={"Maya Chen"} /></p>
          <p className="font-display text-2xl font-semibold"><T s={"Intro call"} /></p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <Clock className="size-4" /><T s={" 30 min · Video call"} /></p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="font-semibold"><T s={"April 2027"} /></p>
            <div className="flex gap-1 text-slate-400">
              <ChevronLeft className="size-5" />
              <ChevronRight className="size-5" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
            <T s={["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}><T s={d} /></span>)} />
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
            <T s={Array.from({
            length: first
          }).map((_, i) => <span key={`e${i}`} />)} />
            <T s={Array.from({
            length: days
          }).map((_, i) => {
            const d = i + 1;
            const avail = (d + first) % 7 !== 6 && (d + first) % 7 !== 0 && d > 4;
            return <button key={d} disabled={!avail} onClick={() => {
              setDay(d);
              setSlot(null);
              setBooked(false);
            }} className={`relative aspect-square rounded-full font-medium transition ${!avail ? "text-slate-300" : day === d ? "text-white" : "text-indigo-700 hover:bg-indigo-50"}`}>
                  <T s={day === d && <motion.span layoutId="cal-day" className="absolute inset-0 rounded-full bg-indigo-600" transition={{
                type: "spring",
                stiffness: 500,
                damping: 35
              }} />} />
                  <span className="relative"><T s={d} /></span>
                </button>;
          })} />
          </div>
        </div>
        <div>
          <AnimatePresence mode="wait">
            <T s={booked ? <motion.div key="b" initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="size-6" />
                <p className="mt-2 font-semibold"><T s={"You're booked!"} /></p>
                <p><T s={"April "} /><T s={day} /><T s={" at "} /><T s={slot} /><T s={". A calendar invite is on its way (demo)."} /></p>
              </motion.div> : day ? <motion.div key={day} initial={{
            opacity: 0,
            x: 20
          }} animate={{
            opacity: 1,
            x: 0
          }} exit={{
            opacity: 0
          }}>
                <p className="text-sm font-semibold"><T s={"April "} /><T s={day} /></p>
                <div className="mt-3 space-y-2">
                  <T s={SLOTS.map((t, i) => <motion.div key={t} initial={{
                opacity: 0,
                y: 6
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: i * 0.04
              }} className="flex gap-2">
                      <button onClick={() => setSlot(t)} className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${slot === t ? "border-slate-900 bg-slate-900 text-white" : "border-indigo-200 text-indigo-700 hover:border-indigo-500"}`}>
                        <T s={t} />
                      </button>
                      <AnimatePresence>
                        <T s={slot === t && <motion.button initial={{
                    width: 0,
                    opacity: 0
                  }} animate={{
                    width: "auto",
                    opacity: 1
                  }} exit={{
                    width: 0,
                    opacity: 0
                  }} onClick={() => setBooked(true)} className="overflow-hidden rounded-xl bg-indigo-600 px-3 text-sm font-semibold whitespace-nowrap text-white"><T s={"Confirm"} /></motion.button>} />
                      </AnimatePresence>
                    </motion.div>)} />
                </div>
              </motion.div> : <motion.p key="pick" initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="size-4" /><T s={" Pick a day to see times"} /></motion.p>} />
          </AnimatePresence>
        </div>
      </div>
    </section>;
}

/* ───────────── 08 · Support Options ───────────── */
export function SupportOptions() {
  const opts = [[MessageCircle, "Live chat", "Talk to a human right now.", "Online now", "bg-emerald-400", "from-emerald-400 to-teal-500"], [Mail, "Email", "Detailed answers within 24 hours.", "Avg. reply 3h", "bg-sky-400", "from-sky-400 to-indigo-500"], [Phone, "Phone", "Mon–Fri, 9am–6pm (GMT+3).", "Opens in 2h", "bg-amber-400", "from-amber-400 to-orange-500"]];
  return <section className="bg-[#0c0c12] px-5 py-20 text-white">
      <motion.h3 {...reveal(0)} className="text-center font-display text-4xl font-semibold"><T s={"We're here to help"} /></motion.h3>
      <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
        <T s={opts.map(([I, t, d, st, dot, g], i) => <motion.a key={t} href="#" {...reveal(i * 0.1)} whileHover={{
        y: -8
      }} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className={`absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-linear-to-r transition-transform duration-500 group-hover:scale-x-100 ${g}`} />
            <span className={`grid size-12 place-items-center rounded-2xl bg-linear-to-br ${g}`}>
              <I className="size-6" />
            </span>
            <p className="mt-5 text-xl font-semibold"><T s={t} /></p>
            <p className="mt-1 text-sm text-white/55"><T s={d} /></p>
            <p className="mt-6 flex items-center gap-2 text-xs text-white/60">
              <span className={`size-2 rounded-full ${dot} ${i === 0 ? "animate-pulse" : ""}`} /> <T s={st} />
            </p>
            <ArrowRight className="absolute right-6 bottom-6 size-5 -translate-x-2 text-white/40 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
          </motion.a>)} />
      </div>
    </section>;
}

/* ───────────── 09 · Gradient Border Form ───────────── */
function GlowInput({
  textarea,
  ...props
}) {
  const [focus, setFocus] = useState(false);
  const Tag = textarea ? "textarea" : "input";
  return <div className="relative rounded-2xl p-px">
      <motion.div className="absolute inset-0 rounded-2xl" animate={{
      opacity: focus ? 1 : 0.25
    }} style={{
      background: cv("linear-gradient(120deg, #f472b6, #a78bfa, #22d3ee)")
    }} />
      <Tag {...props} rows={textarea ? 4 : undefined} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} className="relative w-full resize-none rounded-[15px] bg-[#0d0b18] px-4 py-3.5 text-white outline-none placeholder:text-white/35" />
    </div>;
}
export function GradientBorderForm() {
  const __lx = useLx();
  const [s, send, reset] = useSend();
  return <section className="relative overflow-hidden bg-[#07060d] px-5 py-20 text-white">
      <div className="pointer-events-none absolute top-0 right-0 size-96 rounded-full bg-fuchsia-600/20 blur-[100px]" />
      <div className="relative mx-auto max-w-xl">
        <motion.h3 {...reveal(0)} className="font-display text-4xl font-semibold"><T s={"Let's build something "} /><span className="bg-linear-to-r from-pink-400 via-violet-300 to-cyan-300 bg-clip-text text-transparent"><T s={"beautiful."} /></span>
        </motion.h3>
        <AnimatePresence mode="wait">
          <T s={s === "sent" ? <Sent key="s" dark onReset={reset} /> : <motion.form key="f" exit={{
          opacity: 0
        }} onSubmit={send} className="mt-8 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <GlowInput required placeholder={__lx("Name")} />
                <GlowInput required type="email" placeholder={__lx("Email")} />
              </div>
              <GlowInput placeholder={__lx("Company (optional)")} />
              <GlowInput required textarea placeholder={__lx("Tell us about your project")} />
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-pink-500 via-violet-500 to-cyan-500 py-3.5 font-semibold transition hover:opacity-90">
                <T s={s === "sending" ? <Loader2 className="size-5 animate-spin" /> : <><T s={"Send it "} /><Send className="size-4" /></>} />
              </button>
            </motion.form>} />
        </AnimatePresence>
      </div>
    </section>;
}

/* ───────────── 10 · Feedback Form ───────────── */
const FACES = ["😡", "😕", "😐", "🙂", "😍"];
const TAGS = ["Design", "Speed", "Support", "Pricing", "Features"];
export function FeedbackForm() {
  const __lx = useLx();
  const [rate, setRate] = useState(null);
  const [tags, setTags] = useState([]);
  const [done, setDone] = useState(false);
  return <section className="bg-linear-to-b from-yellow-50 to-orange-50 px-5 py-20 text-slate-900 [color-scheme:light]">
      <div className="mx-auto max-w-lg rounded-[2rem] bg-white p-8 shadow-xl">
        <AnimatePresence mode="wait">
          <T s={done ? <motion.div key="d" initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1
        }} className="py-8 text-center">
              <motion.p animate={{
            y: [0, -14, 0],
            rotate: [0, 10, -10, 0]
          }} transition={{
            duration: 1,
            repeat: 2
          }} className="text-6xl">
                <T s={FACES[rate ?? 4]} />
              </motion.p>
              <p className="mt-4 font-display text-2xl font-semibold"><T s={"Thanks for the feedback!"} /></p>
              <button onClick={() => {
            setDone(false);
            setRate(null);
            setTags([]);
          }} className="mt-3 text-sm underline"><T s={"Leave more"} /></button>
            </motion.div> : <motion.form key="f" exit={{
          opacity: 0
        }} onSubmit={e => {
          e.preventDefault();
          setDone(true);
        }}>
              <h3 className="font-display text-2xl font-semibold"><T s={"How are we doing?"} /></h3>
              <div className="mt-6 flex justify-between">
                <T s={FACES.map((f, i) => <motion.button key={f} type="button" onClick={() => setRate(i)} whileHover={{
              scale: 1.25,
              y: -4
            }} animate={{
              scale: rate === i ? 1.3 : 1,
              filter: rate === null || rate === i ? "grayscale(0)" : "grayscale(1)",
              opacity: rate === null || rate === i ? 1 : 0.5
            }} className="text-4xl" aria-label={__lx(`Rating ${i + 1}`)}>
                    <T s={f} />
                  </motion.button>)} />
              </div>
              <AnimatePresence>
                <T s={rate !== null && <motion.div initial={{
              height: 0,
              opacity: 0
            }} animate={{
              height: "auto",
              opacity: 1
            }} className="overflow-hidden">
                    <p className="mt-7 text-sm font-semibold"><T s={rate >= 3 ? "What did you like?" : "What can we improve?"} /></p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <T s={TAGS.map(t => <button key={t} type="button" onClick={() => setTags(x => x.includes(t) ? x.filter(y => y !== t) : [...x, t])} className={`rounded-full border px-3 py-1.5 text-sm transition ${tags.includes(t) ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200"}`}>
                          <T s={t} />
                        </button>)} />
                    </div>
                    <textarea rows={3} placeholder={__lx("Anything else? (optional)")} className={`${input} mt-4 resize-none`} />
                    <button className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white"><T s={"Send feedback"} /></button>
                  </motion.div>} />
              </AnimatePresence>
            </motion.form>} />
        </AnimatePresence>
      </div>
    </section>;
}
