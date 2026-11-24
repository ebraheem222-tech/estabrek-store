// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Navbars/src/navbars.jsx): do not edit.
import { T, useLx } from "../runtime";
/* 10 navigation bars. Each export shows the nav inside a small demo page. */
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, BarChart3, Bell, BookOpen, Calendar, Check, ChevronDown, ChevronsUpDown, Code2, Compass, CreditCard, Folder, FolderKanban, Globe, Heart, HelpCircle, Home, Inbox, Layers, LayoutDashboard, LifeBuoy, LogOut, Mail, Menu, Music, Newspaper, PieChart, Plus, Search, Settings, Shield, ShoppingBag, Sparkles, Trash2, User, Users, X, Zap } from "lucide-react";
import { Avatar, EASE, FakeLines, Logo } from "./shared";

/* ───────────── 01 · Glass Pill ───────────── */
const PILL_LINKS = ["Product", "Solutions", "Pricing", "Docs", "Blog"];
export function GlassPillNav() {
  const __lx = useLx();
  const [hover, setHover] = useState(null);
  const [open, setOpen] = useState(false);
  return <div className="relative h-[380px] overflow-hidden bg-[radial-gradient(ellipse_at_top,#3b0764,#0b0b10_65%)] px-4 pt-6 text-white">
      <div className="pointer-events-none absolute -top-24 left-1/4 size-80 rounded-full bg-fuchsia-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 right-1/4 size-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <motion.nav initial={{
      y: -30,
      opacity: 0
    }} whileInView={{
      y: 0,
      opacity: 1
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6,
      ease: EASE
    }} className="relative z-10 mx-auto flex max-w-4xl items-center justify-between rounded-full border border-white/15 bg-white/10 py-2 pr-2 pl-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <Logo name="Nebula" icon={Sparkles} tile="from-fuchsia-500 to-cyan-400" className="text-white" />
        <ul className="hidden md:flex" onMouseLeave={() => setHover(null)}>
          <T s={PILL_LINKS.map(l => <li key={l} className="relative" onMouseEnter={() => setHover(l)}>
              <T s={hover === l && <motion.span layoutId="glass-pill-hover" className="absolute inset-0 rounded-full bg-white/15" transition={{
            type: "spring",
            stiffness: 450,
            damping: 32
          }} />} />
              <a href="#" className="relative block px-4 py-2 text-sm text-white/75 transition-colors hover:text-white">
                <T s={l} />
              </a>
            </li>)} />
        </ul>
        <div className="flex items-center gap-2">
          <a href="#" className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/85 sm:block"><T s={"Get started"} /></a>
          <button onClick={() => setOpen(o => !o)} className="grid size-9 place-items-center rounded-full bg-white/10 md:hidden" aria-label={__lx("Toggle menu")}>
            <T s={open ? <X className="size-4" /> : <Menu className="size-4" />} />
          </button>
        </div>
      </motion.nav>
      <AnimatePresence>
        <T s={open && <motion.div initial={{
        opacity: 0,
        y: -10,
        scale: 0.97
      }} animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }} exit={{
        opacity: 0,
        y: -10,
        scale: 0.97
      }} className="relative z-10 mx-auto mt-3 max-w-4xl rounded-3xl border border-white/15 bg-[#160a24]/90 p-2 backdrop-blur-xl md:hidden">
            <T s={PILL_LINKS.map((l, i) => <motion.a key={l} href="#" initial={{
          opacity: 0,
          x: -8
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          delay: i * 0.04
        }} className="block rounded-2xl px-4 py-3 text-white/85 hover:bg-white/10">
                <T s={l} />
              </motion.a>)} />
          </motion.div>} />
      </AnimatePresence>
      <div className="relative mx-auto mt-20 max-w-lg text-center">
        <p className="font-display text-3xl font-semibold text-white/90"><T s={"Your page goes here"} /></p>
        <div className="mx-auto mt-5 max-w-sm">
          <FakeLines n={3} className="bg-white/10" />
        </div>
      </div>
    </div>;
}

/* ───────────── 02 · Mega Menu ───────────── */
const PRODUCTS = [[Zap, "Automations", "Workflows that run themselves", "text-amber-500 bg-amber-50"], [BarChart3, "Analytics", "Dashboards for every team", "text-sky-500 bg-sky-50"], [Shield, "Security", "SSO, audit logs and SOC 2", "text-emerald-500 bg-emerald-50"], [Layers, "Integrations", "Connect 2,000+ tools", "text-violet-500 bg-violet-50"], [Code2, "API", "Build anything on top", "text-rose-500 bg-rose-50"], [Globe, "Edge network", "Fast everywhere on Earth", "text-cyan-500 bg-cyan-50"]];
const RESOURCES = [[BookOpen, "Documentation"], [Newspaper, "Blog"], [LifeBuoy, "Help center"], [Users, "Community"]];
export function MegaMenuNav() {
  const [menu, setMenu] = useState(null);
  return <div className="relative h-[480px] bg-slate-50 text-slate-900 [color-scheme:light]" onMouseLeave={() => setMenu(null)}>
      <nav className="relative z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo name="Orbitly" icon={Compass} tile="from-sky-500 to-indigo-500" />
          <div className="hidden items-center gap-1 md:flex">
            <T s={[["products", "Products"], ["resources", "Resources"]].map(([k, label]) => <button key={k} onMouseEnter={() => setMenu(k)} onClick={() => setMenu(menu === k ? null : k)} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${menu === k ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:text-slate-900"}`}>
                <T s={label} />
                <ChevronDown className={`size-4 transition-transform ${menu === k ? "rotate-180" : ""}`} />
              </button>)} />
            <T s={["Customers", "Pricing"].map(l => <a key={l} href="#" onMouseEnter={() => setMenu(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                <T s={l} />
              </a>)} />
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="hidden text-sm font-medium text-slate-600 sm:block"><T s={"Log in"} /></a>
            <a href="#" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><T s={"Start free"} /></a>
          </div>
        </div>
        <AnimatePresence>
          <T s={menu && <motion.div key={menu} initial={{
          opacity: 0,
          y: -8
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -8
        }} transition={{
          duration: 0.2
        }} className="absolute inset-x-0 top-full border-b border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <T s={menu === "products" ? <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 md:grid-cols-[2fr_1fr]">
                  <div className="grid gap-1 sm:grid-cols-2">
                    <T s={PRODUCTS.map(([I, t, d, c], i) => <motion.a key={t} href="#" initial={{
                opacity: 0,
                y: 8
              }} animate={{
                opacity: 1,
                y: 0
              }} transition={{
                delay: i * 0.035
              }} className="group flex gap-3 rounded-xl p-3 transition hover:bg-slate-50">
                        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${c}`}>
                          <I className="size-5" />
                        </span>
                        <span>
                          <span className="flex items-center gap-1 text-sm font-semibold">
                            <T s={t} /> <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                          </span>
                          <span className="text-sm text-slate-500"><T s={d} /></span>
                        </span>
                      </motion.a>)} />
                  </div>
                  <motion.a href="#" initial={{
              opacity: 0,
              scale: 0.96
            }} animate={{
              opacity: 1,
              scale: 1
            }} transition={{
              delay: 0.1
            }} className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-5 text-white">
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs"><T s={"New"} /></span>
                    <p className="mt-3 font-display text-xl font-semibold"><T s={"AI copilot is here"} /></p>
                    <p className="mt-1 text-sm text-white/80"><T s={"Ask questions about your data in plain English."} /></p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"><T s={"Learn more "} /><ArrowRight className="size-4" />
                    </span>
                    <div className="absolute -right-8 -bottom-8 size-32 rounded-full bg-white/20 blur-xl" />
                  </motion.a>
                </div> : <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-5 py-5 md:grid-cols-4">
                  <T s={RESOURCES.map(([I, t], i) => <motion.a key={t} href="#" initial={{
              opacity: 0,
              y: 8
            }} animate={{
              opacity: 1,
              y: 0
            }} transition={{
              delay: i * 0.04
            }} className="flex items-center gap-3 rounded-xl p-3 text-sm font-medium hover:bg-slate-50">
                      <I className="size-5 text-slate-400" /> <T s={t} />
                    </motion.a>)} />
                </div>} />
            </motion.div>} />
        </AnimatePresence>
      </nav>
      <div className="mx-auto max-w-6xl px-5 pt-16">
        <p className="font-display text-3xl font-semibold"><T s={"Hover \"Products\" or \"Resources\""} /></p>
        <div className="mt-5 max-w-md">
          <FakeLines n={3} className="bg-slate-200" />
        </div>
      </div>
    </div>;
}

/* ───────────── 03 · Sliding Underline ───────────── */
const UL_LINKS = ["Work", "Studio", "Journal", "Contact"];
export function UnderlineNav() {
  const [active] = useState("Work");
  const [hover, setHover] = useState(null);
  const current = hover ?? active;
  return <div className="relative h-[300px] bg-[#f5f0e8] px-6 text-[#1c1917] [color-scheme:light]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between py-6">
        <a href="#" className="font-serif text-3xl italic"><T s={"Halden"} /></a>
        <ul className="hidden gap-8 md:flex" onMouseLeave={() => setHover(null)}>
          <T s={UL_LINKS.map(l => <li key={l} className="relative" onMouseEnter={() => setHover(l)}>
              <a href="#" className={`block pb-1.5 text-sm tracking-wide transition-colors ${current === l ? "text-[#1c1917]" : "text-[#1c1917]/50"}`}>
                <T s={l} />
              </a>
              <T s={current === l && <motion.span layoutId="underline-nav" className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[#c2410c]" transition={{
            type: "spring",
            stiffness: 500,
            damping: 35
          }} />} />
            </li>)} />
        </ul>
        <a href="#" className="group flex items-center gap-2 text-sm font-medium"><T s={"Let's talk"} /><span className="grid size-8 place-items-center rounded-full bg-[#1c1917] text-[#f5f0e8] transition group-hover:rotate-[-45deg]">
            <ArrowRight className="size-4" />
          </span>
        </a>
      </nav>
      <div className="mx-auto max-w-6xl pt-10">
        <p className="max-w-2xl font-serif text-5xl leading-tight"><T s={"Hover the links — the line follows you."} /></p>
      </div>
    </div>;
}

/* ───────────── 04 · Magnify Dock ───────────── */
const DOCK = [[Home, "Home", "from-sky-400 to-blue-600"], [Search, "Search", "from-zinc-400 to-zinc-600"], [Folder, "Files", "from-amber-300 to-orange-500"], [Music, "Music", "from-pink-400 to-rose-600"], [Mail, "Mail", "from-cyan-400 to-sky-600"], [Calendar, "Calendar", "from-red-400 to-red-600"], [Settings, "Settings", "from-slate-400 to-slate-700"], [Trash2, "Trash", "from-stone-300 to-stone-500"]];
function DockIcon({
  mouseX,
  icon: Icon,
  label,
  grad,
  extra = ""
}) {
  const __lx = useLx();
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  const dist = useTransform(mouseX, x => {
    const b = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0
    };
    return x - b.x - b.width / 2;
  });
  const size = useSpring(useTransform(dist, [-150, 0, 150], [48, 84, 48]), {
    mass: 0.1,
    stiffness: 170,
    damping: 13
  });
  return <motion.button ref={ref} style={{
    width: size,
    height: size
  }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} className={`${extra} relative grid shrink-0 place-items-center rounded-2xl bg-linear-to-br shadow-lg ${grad}`} aria-label={__lx(label)}>
      <AnimatePresence>
        <T s={hover && <motion.span initial={{
        opacity: 0,
        y: 6
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: 4
      }} className="absolute -top-9 rounded-md bg-black/80 px-2 py-1 text-xs whitespace-nowrap text-white">
            <T s={label} />
          </motion.span>} />
      </AnimatePresence>
      <Icon className="size-1/2 text-white" />
    </motion.button>;
}
export function MagnifyDock() {
  const __lx = useLx();
  const mouseX = useMotionValue(Infinity);
  return <div className="relative flex h-[380px] items-end justify-center overflow-hidden bg-linear-to-br from-[#ff9a8b] via-[#a18cd1] to-[#5ee7df] pb-6">
      <p className="absolute top-10 left-1/2 -translate-x-1/2 text-center font-display text-3xl font-semibold text-white/90 drop-shadow"><T s={"Move your mouse along the dock"} /></p>
      <motion.div onMouseMove={e => mouseX.set(e.clientX)} onMouseLeave={() => mouseX.set(Infinity)} initial={{
      y: 80
    }} whileInView={{
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      type: "spring",
      stiffness: 120,
      damping: 16
    }} className="flex h-[76px] items-end gap-3 rounded-3xl border border-white/40 bg-white/25 px-3 pb-3 shadow-2xl backdrop-blur-2xl">
        <T s={DOCK.map(([I, l, g], i) => <DockIcon key={l} mouseX={mouseX} icon={I} label={__lx(l)} grad={g} extra={i >= 5 ? "max-sm:hidden" : ""} />)} />
      </motion.div>
    </div>;
}

/* ───────────── 05 · Sidebar Rail ───────────── */
const RAIL = [[LayoutDashboard, "Dashboard"], [Inbox, "Inbox"], [FolderKanban, "Projects"], [PieChart, "Reports"], [Users, "Team"], [Settings, "Settings"]];
export function SidebarRail() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("Dashboard");
  return <div className="flex h-[460px] bg-[#0d0f14] text-white">
      <motion.aside onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} animate={{
      width: open ? 230 : 72
    }} transition={{
      type: "spring",
      stiffness: 300,
      damping: 30
    }} className="relative z-10 flex shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#11141b] py-4">
        <div className="flex items-center gap-3 px-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-emerald-400 to-cyan-500 font-bold"><T s={"P"} /></span>
          <motion.span animate={{
          opacity: open ? 1 : 0
        }} className="font-semibold whitespace-nowrap"><T s={"Pulse HQ"} /></motion.span>
        </div>
        <ul className="mt-8 flex-1 space-y-1 px-3">
          <T s={RAIL.map(([I, l]) => <li key={l}>
              <button onClick={() => setActive(l)} className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm">
                <T s={active === l && <motion.span layoutId="rail-active" className="absolute inset-0 rounded-xl bg-emerald-400/15 ring-1 ring-emerald-400/30" transition={{
              type: "spring",
              stiffness: 500,
              damping: 35
            }} />} />
                <I className={`relative size-5 shrink-0 ${active === l ? "text-emerald-300" : "text-white/55"}`} />
                <motion.span animate={{
              opacity: open ? 1 : 0,
              x: open ? 0 : -8
            }} className={`relative whitespace-nowrap ${active === l ? "text-white" : "text-white/65"}`}>
                  <T s={l} />
                </motion.span>
              </button>
            </li>)} />
        </ul>
        <div className="flex items-center gap-3 px-4">
          <Avatar name="Rana Saleh" i={2} className="size-10" />
          <motion.div animate={{
          opacity: open ? 1 : 0
        }} className="text-sm whitespace-nowrap">
            <p className="font-medium"><T s={"Rana Saleh"} /></p>
            <p className="text-xs text-white/50"><T s={"Admin"} /></p>
          </motion.div>
        </div>
      </motion.aside>
      <main className="flex-1 p-6">
        <p className="text-sm text-white/50"><T s={"Hover the sidebar to expand it"} /></p>
        <h3 className="mt-1 font-display text-2xl font-semibold"><T s={active} /></h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <T s={[0, 1, 2].map(k => <div key={k} className="h-28 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <FakeLines n={2} className="bg-white/10" />
            </div>)} />
        </div>
        <div className="mt-4 h-40 rounded-2xl border border-white/10 bg-white/[0.03]" />
      </main>
    </div>;
}

/* ───────────── 06 · Search & Profile ───────────── */
export function SearchProfileNav() {
  const __lx = useLx();
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  return <div className="relative h-[420px] bg-slate-100 text-slate-900 [color-scheme:light]">
      <nav className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-8">
          <Logo name="Quill" icon={BookOpen} tile="from-rose-500 to-orange-400" />
          <div className="hidden gap-6 text-sm text-slate-600 md:flex">
            <T s={["Home", "Explore", "Library"].map((l, i) => <a key={l} href="#" className={i === 0 ? "font-semibold text-slate-900" : "hover:text-slate-900"}>
                <T s={l} />
              </a>)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.div animate={{
          width: search ? 240 : 40
        }} transition={{
          type: "spring",
          stiffness: 300,
          damping: 28
        }} className="flex h-10 items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
            <button onClick={() => setSearch(s => !s)} className="grid size-10 shrink-0 place-items-center text-slate-500" aria-label={__lx("Search")}>
              <Search className="size-4" />
            </button>
            <T s={search && <input autoFocus placeholder={__lx("Search stories…")} className="w-full bg-transparent pr-3 text-sm outline-none" />} />
          </motion.div>
          <button className="relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100" aria-label={__lx("Notifications")}>
            <Bell className="size-5" />
            <span className="absolute top-2 right-2 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
            </span>
          </button>
          <div className="relative">
            <button onClick={() => setMenu(m => !m)} className="flex items-center gap-1 rounded-full p-0.5 pr-2 hover:bg-slate-100" aria-label={__lx("Account menu")}>
              <Avatar name="Dana Kim" i={1} className="size-9" />
              <ChevronDown className={`size-4 text-slate-500 transition ${menu ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              <T s={menu && <motion.div initial={{
              opacity: 0,
              scale: 0.9,
              y: -6
            }} animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }} exit={{
              opacity: 0,
              scale: 0.9,
              y: -6
            }} transition={{
              type: "spring",
              stiffness: 400,
              damping: 28
            }} className="absolute top-12 right-0 z-20 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-sm font-semibold"><T s={"Dana Kim"} /></p>
                    <p className="text-xs text-slate-500"><T s={"dana@quill.app"} /></p>
                  </div>
                  <T s={[[User, "Profile"], [Settings, "Settings"], [CreditCard, "Billing"], [LogOut, "Sign out"]].map(([I, l]) => <a key={l} href="#" className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 ${l === "Sign out" ? "text-rose-600" : ""}`}>
                      <I className="size-4" /> <T s={l} />
                    </a>)} />
                </motion.div>} />
            </AnimatePresence>
          </div>
        </div>
      </nav>
      <div className="mx-auto grid max-w-5xl gap-4 p-6 sm:grid-cols-3">
        <T s={[0, 1, 2].map(k => <div key={k} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 h-24 rounded-xl bg-slate-100" />
            <FakeLines n={2} className="bg-slate-200" />
          </div>)} />
      </div>
    </div>;
}

/* ───────────── 07 · Fullscreen Overlay ───────────── */
const OVERLAY_LINKS = ["New in", "Collections", "Atelier", "Journal", "Stores"];
export function OverlayMenuNav() {
  const [open, setOpen] = useState(false);
  return <div className="relative h-[480px] overflow-hidden bg-[#ece4d8] text-[#1f1a14] [color-scheme:light]">
      <nav className="relative z-30 grid grid-cols-3 items-center px-6 py-5">
        <button onClick={() => setOpen(o => !o)} className={`flex w-fit items-center gap-3 text-xs tracking-[0.25em] uppercase transition-colors ${open ? "text-[#ece4d8]" : ""}`}>
          <span className="relative block h-3 w-6">
            <motion.span className="absolute left-0 h-[1.5px] w-6 bg-current" animate={open ? {
            top: 6,
            rotate: 45
          } : {
            top: 0,
            rotate: 0
          }} />
            <motion.span className="absolute left-0 h-[1.5px] w-6 bg-current" animate={open ? {
            top: 6,
            rotate: -45
          } : {
            top: 11,
            rotate: 0
          }} />
          </span>
          <T s={open ? "Close" : "Menu"} />
        </button>
        <a href="#" className={`text-center font-serif text-2xl tracking-[0.3em] transition-colors ${open ? "text-[#ece4d8]" : ""}`}><T s={"LUNE"} /></a>
        <div className={`flex justify-end gap-5 transition-colors ${open ? "text-[#ece4d8]" : ""}`}>
          <Search className="size-5" />
          <span className="relative">
            <ShoppingBag className="size-5" />
            <span className="absolute -top-1.5 -right-2 grid size-4 place-items-center rounded-full bg-[#b45309] text-[9px] text-white">2</span>
          </span>
        </div>
      </nav>
      <AnimatePresence>
        <T s={open && <motion.div initial={{
        clipPath: "circle(0% at 40px 30px)"
      }} animate={{
        clipPath: "circle(150% at 40px 30px)"
      }} exit={{
        clipPath: "circle(0% at 40px 30px)"
      }} transition={{
        duration: 0.7,
        ease: EASE
      }} className="absolute inset-0 z-20 flex items-center bg-[#1f1a14] px-10 pt-10 text-[#ece4d8]">
            <ul className="space-y-1">
              <T s={OVERLAY_LINKS.map((l, i) => <li key={l} className="overflow-hidden">
                  <motion.a href="#" initial={{
              y: "110%"
            }} animate={{
              y: 0
            }} exit={{
              y: "110%"
            }} transition={{
              delay: 0.25 + i * 0.06,
              duration: 0.6,
              ease: EASE
            }} className="group flex items-baseline gap-4 font-serif text-5xl italic sm:text-6xl">
                    <span className="font-mono text-xs not-italic opacity-40">0<T s={i + 1} /></span>
                    <span className="transition group-hover:translate-x-3 group-hover:text-[#f59e0b]"><T s={l} /></span>
                  </motion.a>
                </li>)} />
            </ul>
            <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.6
        }} className="ml-auto hidden max-w-xs text-sm opacity-70 md:block">
              <p className="font-serif text-xl italic opacity-100"><T s={"Spring / Summer 27"} /></p>
              <p className="mt-2"><T s={"Free returns · Complimentary gift wrapping · Paris, Milan, Dubai"} /></p>
            </motion.div>
          </motion.div>} />
      </AnimatePresence>
      <div className="grid grid-cols-3 gap-4 px-6 pt-6">
        <T s={["from-[#c8b6a6] to-[#8b6f5c]", "from-[#d6c7b8] to-[#a68a73]", "from-[#b9a597] to-[#6f5747]"].map(g => <div key={g} className={`h-72 rounded-t-full bg-linear-to-b ${g}`} />)} />
      </div>
    </div>;
}

/* ───────────── 08 · Shrink on Scroll ───────────── */
export function ShrinkOnScroll() {
  const ref = useRef(null);
  const {
    scrollY
  } = useScroll({
    container: ref
  });
  const [small, setSmall] = useState(false);
  useMotionValueEvent(scrollY, "change", v => setSmall(v > 30));
  return <div ref={ref} className="relative h-[420px] overflow-y-auto bg-linear-to-b from-indigo-600 to-violet-700 text-white">
      <motion.nav animate={{
      paddingTop: small ? 8 : 22,
      paddingBottom: small ? 8 : 22,
      backgroundColor: small ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0)",
      color: small ? "#1e1b4b" : "#ffffff"
    }} transition={{
      duration: 0.3
    }} className={`sticky top-0 z-10 flex items-center justify-between px-6 ${small ? "shadow-lg backdrop-blur" : ""}`}>
        <motion.span animate={{
        scale: small ? 0.85 : 1
      }} className="origin-left font-display text-2xl font-bold"><T s={"Driftwood"} /></motion.span>
        <div className="hidden gap-6 text-sm md:flex">
          <T s={["Features", "Stories", "Pricing"].map(l => <a key={l} href="#"><T s={l} /></a>)} />
        </div>
        <motion.a href="#" animate={{
        backgroundColor: small ? "#4f46e5" : "#ffffff",
        color: small ? "#ffffff" : "#312e81"
      }} className="rounded-full px-4 py-2 text-sm font-semibold"><T s={"Download"} /></motion.a>
      </motion.nav>
      <div className="px-6 pt-16 pb-10 text-center">
        <p className="font-display text-4xl font-semibold"><T s={"Scroll inside this box ↓"} /></p>
        <p className="mt-2 text-white/70"><T s={"The navbar shrinks and turns solid as you scroll."} /></p>
      </div>
      <div className="mx-auto grid max-w-4xl gap-4 px-6 pb-16 sm:grid-cols-2">
        <T s={Array.from({
        length: 6
      }).map((_, k) => <div key={k} className="h-36 rounded-2xl bg-white/10 p-4">
            <FakeLines n={3} className="bg-white/20" />
          </div>)} />
      </div>
    </div>;
}

/* ───────────── 09 · Dashboard Top Bar ───────────── */
const WORKSPACES = ["Acme Inc", "Side project", "Personal"];
const NOTES = [["Sara commented on", "Homepage v3", "2m"], ["Deploy finished for", "api-server", "14m"], ["Omar invited you to", "Q3 Planning", "1h"]];
export function DashboardTopBar() {
  const __lx = useLx();
  const [ws, setWs] = useState(0);
  const [pop, setPop] = useState(null);
  const toggle = k => setPop(p => p === k ? null : k);
  return <div className="relative h-[440px] bg-[#0a0b10] text-white">
      <nav className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="relative">
          <button onClick={() => toggle("ws")} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
            <span className="grid size-7 place-items-center rounded-md bg-linear-to-br from-orange-400 to-pink-500 text-xs font-bold"><T s={WORKSPACES[ws][0]} /></span>
            <span className="hidden text-sm font-medium sm:block"><T s={WORKSPACES[ws]} /></span>
            <ChevronsUpDown className="size-4 text-white/40" />
          </button>
          <AnimatePresence>
            <T s={pop === "ws" && <motion.div initial={{
            opacity: 0,
            y: -6
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -6
          }} className="absolute top-11 left-0 z-20 w-56 rounded-xl border border-white/10 bg-[#14161d] p-1 shadow-2xl">
                <T s={WORKSPACES.map((w, i) => <button key={w} onClick={() => {
              setWs(i);
              setPop(null);
            }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                    <T s={w} /> <T s={ws === i && <Check className="size-4 text-orange-400" />} />
                  </button>)} />
                <button className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-white/10 px-3 py-2 text-sm text-white/60 hover:bg-white/5">
                  <Plus className="size-4" /><T s={" New workspace"} /></button>
              </motion.div>} />
          </AnimatePresence>
        </div>
        <div className="hidden items-center gap-2 text-sm text-white/50 md:flex">
          <span>/</span> <a href="#" className="hover:text-white"><T s={"Projects"} /></a> <span>/</span> <a href="#" className="hover:text-white"><T s={"Website redesign"} /></a> <span>/</span> <span className="text-white"><T s={"Tasks"} /></span>
        </div>
        <button className="ml-auto hidden w-64 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/40 lg:flex">
          <Search className="size-4" /><T s={" Search… "} /><kbd className="ml-auto rounded border border-white/15 px-1.5 text-[10px]"><T s={"⌘K"} /></kbd>
        </button>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <button className="grid size-9 place-items-center rounded-lg text-white/60 hover:bg-white/5" aria-label={__lx("Help")}>
            <HelpCircle className="size-5" />
          </button>
          <div className="relative">
            <button onClick={() => toggle("bell")} className="relative grid size-9 place-items-center rounded-lg text-white/60 hover:bg-white/5" aria-label={__lx("Notifications")}>
              <Bell className="size-5" />
              <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-orange-500 text-[9px] font-bold">3</span>
            </button>
            <AnimatePresence>
              <T s={pop === "bell" && <motion.div initial={{
              opacity: 0,
              y: -6,
              scale: 0.96
            }} animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }} exit={{
              opacity: 0,
              y: -6,
              scale: 0.96
            }} className="absolute top-11 right-0 z-20 w-72 origin-top-right rounded-xl border border-white/10 bg-[#14161d] p-2 shadow-2xl">
                  <p className="px-2 py-1 text-xs font-semibold text-white/50"><T s={"Notifications"} /></p>
                  <T s={NOTES.map(([a, b, t], i) => <motion.div key={b} initial={{
                opacity: 0,
                x: 10
              }} animate={{
                opacity: 1,
                x: 0
              }} transition={{
                delay: i * 0.05
              }} className="flex gap-3 rounded-lg p-2 hover:bg-white/5">
                      <Avatar name={b} i={i + 3} className="size-8" />
                      <p className="text-sm text-white/70">
                        <T s={a} /> <span className="font-medium text-white"><T s={b} /></span>
                        <span className="block text-xs text-white/40"><T s={t} /><T s={" ago"} /></span>
                      </p>
                    </motion.div>)} />
                </motion.div>} />
            </AnimatePresence>
          </div>
          <Avatar name="Yara M" i={4} className="ml-1 size-8" />
        </div>
      </nav>
      <div className="grid gap-4 p-6 md:grid-cols-[1fr_2fr]">
        <div className="h-64 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <FakeLines n={5} className="bg-white/10" />
        </div>
        <div className="h-64 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/50"><T s={"Click the workspace name or the bell"} /></p>
        </div>
      </div>
    </div>;
}

/* ───────────── 10 · Mobile Tab Bar ───────────── */
const TABS = [[Home, "Home"], [Compass, "Explore"], [Plus, "New"], [Heart, "Saved"], [User, "Me"]];
export function MobileTabBar() {
  const __lx = useLx();
  const [tab, setTab] = useState("Home");
  return <div className="grid h-[520px] place-items-center bg-linear-to-br from-teal-200 via-sky-200 to-indigo-300 [color-scheme:light]">
      <div className="relative h-[460px] w-[260px] overflow-hidden rounded-[2.6rem] border-[8px] border-slate-900 bg-white shadow-2xl">
        <div className="absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
        <div className="px-5 pt-12">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} transition={{
            duration: 0.2
          }}>
              <p className="text-xs text-slate-400"><T s={"Tab"} /></p>
              <p className="font-display text-2xl font-semibold text-slate-900"><T s={tab} /></p>
              <div className="mt-4 space-y-3">
                <T s={[0, 1, 2].map(k => <div key={k} className="h-16 rounded-2xl bg-slate-100" />)} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-around rounded-3xl bg-slate-900 px-2 py-2 shadow-xl">
          <T s={TABS.map(([I, l]) => l === "New" ? <button key={l} onClick={() => setTab(l)} className="-mt-8 grid size-12 place-items-center rounded-full bg-linear-to-br from-teal-400 to-indigo-500 text-white shadow-lg shadow-indigo-500/40" aria-label={__lx("New")}>
                <Plus className="size-6" />
              </button> : <button key={l} onClick={() => setTab(l)} className="relative grid size-11 place-items-center" aria-label={__lx(l)}>
                <T s={tab === l && <motion.span layoutId="tabbar-bubble" className="absolute inset-0 rounded-2xl bg-white/15" transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }} />} />
                <motion.span animate={{
            y: tab === l ? -2 : 0
          }} className="relative">
                  <I className={`size-5 ${tab === l ? "text-teal-300" : "text-white/50"}`} />
                </motion.span>
              </button>)} />
        </div>
      </div>
    </div>;
}
