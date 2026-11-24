// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (Premium/src/premium-a.jsx): do not edit.
import { T, useLx, cv, cvs } from "../runtime";
/* Premium 01–05 — heavy, layered, interactive sections. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useAnimationFrame, useMotionTemplate, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { Activity, ArrowRight, Camera, ChevronLeft, ChevronRight, FolderOpen, Heart, Play, Share2, Sparkles, Zap } from "lucide-react";
import { Avatar, Avatars, Counter, EASE, GRADS } from "./shared";
import { Grain, NOISE, Shader, useCanvas, usePointer } from "./fx";

/* ════════════════════ 01 · Aurora Shader Hero ════════════════════ */
const AURORA = NOISE + `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv; p.x *= u_res.x / u_res.y;
  float t = u_time * 0.06;
  vec2 m = (u_mouse - 0.5) * 0.5;
  vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 - t + 4.0));
  vec2 r = vec2(fbm(p * 1.2 + q * 2.0 + m + vec2(1.7, 9.2) + t * 1.5), fbm(p * 1.2 + q * 2.0 - m + vec2(8.3, 2.8) - t));
  float f = fbm(p + r * 1.6);
  vec3 col = vec3(0.02, 0.01, 0.06);
  col = mix(col, vec3(0.42, 0.14, 0.95), smoothstep(0.2, 0.7, f));
  col = mix(col, vec3(0.0, 0.85, 0.95), smoothstep(0.4, 0.9, r.x) * 0.85);
  col = mix(col, vec3(1.0, 0.36, 0.62), smoothstep(0.5, 0.95, r.y * f * 1.7) * 0.8);
  col *= 0.45 + 0.85 * uv.y;
  col += 0.12 * vec3(0.6, 0.4, 1.0) * smoothstep(0.35, 0.0, distance(uv, u_mouse));
  gl_FragColor = vec4(col, 1.0);
}`;
const ROTATE = ["faster.", "brighter.", "together.", "today."];
function Magnetic({
  children,
  className
}) {
  const ref = useRef(null);
  const x = useSpring(0, {
    stiffness: 220,
    damping: 14
  });
  const y = useSpring(0, {
    stiffness: 220,
    damping: 14
  });
  return <motion.a ref={ref} href="#" style={{
    x,
    y
  }} onMouseMove={e => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.35);
    y.set((e.clientY - r.top - r.height / 2) * 0.35);
  }} onMouseLeave={() => {
    x.set(0);
    y.set(0);
  }} className={className}>
      <T s={children} />
    </motion.a>;
}
function Float({
  mx,
  my,
  depth,
  className,
  children,
  delay
}) {
  const x = useTransform(mx, v => v * depth);
  const y = useTransform(my, v => v * depth);
  return <motion.div style={{
    x,
    y
  }} className={`absolute ${className}`}>
      <motion.div initial={{
      opacity: 0,
      y: 40,
      scale: 0.9
    }} animate={{
      opacity: 1,
      y: 0,
      scale: 1
    }} transition={{
      delay,
      duration: 1,
      ease: EASE
    }} className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <T s={children} />
      </motion.div>
    </motion.div>;
}
export function AuroraShaderHero() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setW(v => (v + 1) % ROTATE.length), 2400);
    return () => clearInterval(id);
  }, []);
  const mx = useSpring(0, {
    stiffness: 60,
    damping: 20
  });
  const my = useSpring(0, {
    stiffness: 60,
    damping: 20
  });
  const words = ["Build", "the", "impossible,"];
  return <section onMouseMove={e => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }} className="relative h-[720px] overflow-hidden bg-black text-white">
      <Shader frag={AURORA} />
      <Grain opacity={0.12} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black to-transparent" />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-display text-lg font-bold"><span className="grid size-8 place-items-center rounded-xl bg-white text-black"><Sparkles className="size-4" /></span><T s={" Lumina"} /></span>
        <div className="hidden gap-1 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-md md:flex">
          <T s={["Product", "Showcase", "Pricing", "Docs"].map(l => <a key={l} href="#" className="rounded-full px-4 py-1.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"><T s={l} /></a>)} />
        </div>
        <a href="#" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"><T s={"Get access"} /></a>
      </nav>

      <div className="relative z-10 mx-auto mt-16 max-w-4xl px-6 text-center">
        <motion.a href="#" initial={{
        opacity: 0,
        y: -10
      }} animate={{
        opacity: 1,
        y: 0
      }} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 pr-3 pl-1 text-xs backdrop-blur-md">
          <span className="rounded-full bg-linear-to-r from-fuchsia-500 to-cyan-400 px-2 py-0.5 font-semibold"><T s={"New"} /></span><T s={" Real-time shader engine 2.0 "} /><ArrowRight className="size-3" />
        </motion.a>
        <h2 className="mt-7 font-display text-5xl leading-[1.02] font-bold tracking-tight sm:text-7xl">
          <T s={words.map((wd, i) => <span key={wd} className="mr-[0.25em] inline-block overflow-hidden pb-2 align-bottom">
              <motion.span initial={{
            y: "110%",
            rotate: 6
          }} animate={{
            y: 0,
            rotate: 0
          }} transition={{
            delay: 0.15 + i * 0.12,
            duration: 0.9,
            ease: EASE
          }} className="inline-block"><T s={wd} /></motion.span>
            </span>)} />
          <br />
          <span className="relative inline-grid h-[1.1em] overflow-hidden align-bottom">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={w} initial={{
              y: "100%",
              opacity: 0,
              filter: "blur(10px)"
            }} animate={{
              y: 0,
              opacity: 1,
              filter: "blur(0px)"
            }} exit={{
              y: "-100%",
              opacity: 0,
              filter: "blur(10px)"
            }} transition={{
              duration: 0.7,
              ease: EASE
            }} className="bg-linear-to-r from-cyan-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
                <T s={ROTATE[w]} />
              </motion.span>
            </AnimatePresence>
          </span>
        </h2>
        <motion.p initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.8
      }} className="mx-auto mt-5 max-w-xl text-lg text-white/70"><T s={"One canvas for design, motion and code. Ship experiences that feel alive — without writing a single shader."} /></motion.p>
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        delay: 1
      }} className="mt-8 flex flex-wrap justify-center gap-3">
          <Magnetic className="group relative overflow-hidden rounded-full bg-white px-7 py-3.5 font-semibold text-black">
            <span className="absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-linear-to-r from-transparent via-fuchsia-300/70 to-transparent transition-all duration-700 group-hover:left-[120%]" />
            <span className="relative flex items-center gap-2"><T s={"Start creating "} /><ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
          </Magnetic>
          <a href="#" className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 font-medium backdrop-blur-md"><Play className="size-4 fill-current" /><T s={" Watch film"} /></a>
        </motion.div>
      </div>

      <Float mx={mx} my={my} depth={-40} delay={1.2} className="top-56 left-[6%] hidden lg:block">
        <p className="text-xs text-white/60"><T s={"Revenue"} /></p>
        <p className="font-display text-2xl font-bold">+312%</p>
        <svg viewBox="0 0 120 36" className="mt-1 w-32"><motion.path d="M0 30 L20 26 L40 28 L60 16 L80 20 L100 8 L120 4" fill="none" stroke="#67e8f9" strokeWidth="2.5" initial={{
          pathLength: 0
        }} animate={{
          pathLength: 1
        }} transition={{
          delay: 1.6,
          duration: 1.4
        }} /></svg>
      </Float>
      <Float mx={mx} my={my} depth={60} delay={1.4} className="top-72 right-[7%] hidden lg:block">
        <p className="flex items-center gap-1.5 text-xs text-white/60"><Zap className="size-3.5 text-amber-300" /><T s={" Deploys today"} /></p>
        <p className="font-display text-2xl font-bold"><Counter to={2481} /></p>
        <div className="mt-2"><Avatars n={4} size="size-6" ring="ring-2 ring-white/20" /></div>
      </Float>
      <Float mx={mx} my={my} depth={30} delay={1.6} className="bottom-28 left-[16%] hidden xl:block">
        <p className="flex items-center gap-2 text-sm"><Activity className="size-4 text-emerald-300" /><T s={" p95 latency "} /><b><T s={"18ms"} /></b></p>
      </Float>

      <div className="absolute inset-x-0 bottom-6 z-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
        <div className="flex w-max animate-marquee gap-14 text-sm font-semibold tracking-[0.3em] text-white/40 [--duration:30s]">
          <T s={[0, 1].flatMap(k => ["NORTHWIND", "ORBIS", "VOLTIX", "STACKR", "CORELAB", "PRISMA", "HALO"].map(n => <span key={k + n}><T s={n} /></span>))} />
        </div>
      </div>
    </section>;
}

/* ════════════════════ 02 · Particle Text ════════════════════ */
const PWORDS = ["DESIGN", "MOTION", "MAGIC", "YOU"];
function sampleText(word, w, h) {
  if (w < 2 || h < 2) return []; // not laid out yet; it samples again on resize
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const o = off.getContext("2d");
  const size = Math.min(h * 0.42, w * 1.55 / word.length);
  o.font = `800 ${size}px Syne, "Space Grotesk", sans-serif`;
  o.textAlign = "center";
  o.textBaseline = "middle";
  o.fillStyle = "#fff";
  o.fillText(word, w / 2, h / 2 - 10);
  const data = o.getImageData(0, 0, w, h).data;
  const gap = w < 700 ? 5 : 6;
  const pts = [];
  for (let y = 0; y < h; y += gap) for (let x = 0; x < w; x += gap) if (data[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
  return pts;
}
export function ParticleTextHero() {
  const wrap = useRef(null);
  const mouse = usePointer(wrap);
  const [word, setWord] = useState(0);
  const wordRef = useRef(0);
  wordRef.current = word;
  useEffect(() => {
    const id = setInterval(() => setWord(v => (v + 1) % PWORDS.length), 3800);
    return () => clearInterval(id);
  }, []);
  const [cv, state] = useCanvas((ctx, t, w, h, s) => {
    if (!s.parts) s.parts = [];
    if (s.resized || s.word !== wordRef.current) {
      s.word = wordRef.current;
      const pts = sampleText(PWORDS[s.word], Math.round(w), Math.round(h));
      while (s.parts.length < pts.length) s.parts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0,
        vy: 0
      });
      s.parts.forEach((p, i) => {
        const tp = pts[i % Math.max(1, pts.length)] || [w / 2, h / 2];
        p.tx = tp[0];
        p.ty = tp[1];
        p.on = i < pts.length;
        p.vx += (Math.random() - 0.5) * 18;
        p.vy += (Math.random() - 0.5) * 18;
      });
    }
    if (s.blast) {
      s.parts.forEach(p => {
        p.vx += (Math.random() - 0.5) * 60;
        p.vy += (Math.random() - 0.5) * 60;
      });
      s.blast = false;
    }
    ctx.fillStyle = "rgba(5,5,12,0.35)";
    ctx.fillRect(0, 0, w, h);
    const m = mouse.current;
    for (const p of s.parts) {
      p.vx += (p.tx - p.x) * 0.045;
      p.vy += (p.ty - p.y) * 0.045;
      if (m) {
        const dx = p.x - m.x,
          dy = p.y - m.y,
          d2 = dx * dx + dy * dy;
        if (d2 < 9000) {
          const f = (9000 - d2) / 9000;
          p.vx += dx * f * 0.35;
          p.vy += dy * f * 0.35;
        }
      }
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.x += p.vx;
      p.y += p.vy;
      if (!p.on) continue;
      const hue = 190 + p.x / w * 120 + Math.sin(t + p.y * 0.02) * 15;
      ctx.fillStyle = `hsl(${hue} 95% ${62 + Math.min(25, Math.abs(p.vx) * 4)}%)`;
      ctx.fillRect(p.x, p.y, 2.6, 2.6);
    }
  });
  return <section ref={wrap} onClick={() => state.current.blast = true} className="relative h-[600px] cursor-crosshair overflow-hidden bg-[#05050c] text-white">
      <canvas ref={cv} className="absolute inset-0 size-full" />
      <div className="pointer-events-none absolute inset-x-0 top-8 text-center">
        <p className="text-xs tracking-[0.4em] text-white/40 uppercase"><T s={"Studio Kinetik · est. 2026"} /></p>
      </div>
      <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <T s={PWORDS.map((p, i) => <button key={p} onClick={e => {
          e.stopPropagation();
          setWord(i);
        }} className="relative rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest">
              <T s={word === i && <motion.span layoutId="ptext-pill" className="absolute inset-0 rounded-full bg-white" />} />
              <span className={`relative ${word === i ? "text-black" : "text-white/50"}`}><T s={p} /></span>
            </button>)} />
        </div>
        <p className="text-xs text-white/40"><T s={"Move your mouse through the letters · click to scatter"} /></p>
      </div>
    </section>;
}

/* ════════════════════ 03 · 3D Carousel Ring ════════════════════ */
const RING = [["Nebula", "Generative identity", "from-fuchsia-500 via-violet-600 to-indigo-700"], ["Tidal", "Ocean data viz", "from-cyan-400 via-sky-600 to-blue-800"], ["Ember", "Coffee brand", "from-amber-400 via-orange-600 to-rose-700"], ["Verdant", "Plant care app", "from-lime-300 via-emerald-500 to-teal-700"], ["Halo", "Meditation app", "from-rose-300 via-pink-500 to-fuchsia-700"], ["Monolith", "Architecture site", "from-zinc-300 via-zinc-500 to-zinc-800"], ["Solace", "Hotel booking", "from-yellow-200 via-amber-400 to-orange-600"], ["Pulse", "Fitness tracker", "from-red-400 via-rose-600 to-purple-800"], ["Drift", "Travel journal", "from-sky-300 via-indigo-400 to-violet-700"], ["Quartz", "Jewelry store", "from-teal-200 via-cyan-400 to-indigo-600"]];
export function Carousel3D() {
  const __lx = useLx();
  const N = RING.length;
  const step = 360 / N;
  const rot = useMotionValue(0);
  const spin = useSpring(rot, {
    stiffness: 80,
    damping: 20
  });
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  useMotionValueEvent(spin, "change", v => setActive((-Math.round(v / step) % N + N) % N));
  useAnimationFrame((_, dt) => {
    if (!hold) rot.set(rot.get() - dt * 0.006);
  });
  const go = d => rot.set(Math.round(rot.get() / step) * step - d * step);
  const tf = useMotionTemplate`translateZ(-420px) rotateX(-8deg) rotateY(${spin}deg)`;
  return <section className="relative h-[620px] overflow-hidden bg-[radial-gradient(ellipse_at_center,#1e1b4b,#030308_70%)] text-white" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
      <p className="pt-8 text-center text-xs tracking-[0.4em] text-white/40 uppercase"><T s={"Selected work · drag to spin"} /></p>
      <motion.div onPan={(_, i) => {
      setHold(true);
      rot.set(rot.get() + i.delta.x * 0.25);
    }} onPanEnd={(_, i) => rot.set(Math.round((rot.get() + i.velocity.x * 0.05) / step) * step)} className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" style={{
      perspective: 1300
    }}>
        <motion.div style={{
        transform: tf,
        transformStyle: "preserve-3d"
      }} className="absolute top-[34%] left-1/2 h-64 w-48 -translate-x-1/2">
          <T s={RING.map(([n, d, g], i) => <div key={n} className={`absolute inset-0 overflow-hidden rounded-2xl bg-linear-to-br ${g} p-4 shadow-2xl [backface-visibility:hidden]`} style={{
          transform: `rotateY(${i * step}deg) translateZ(420px)`
        }}>
              <div className="absolute -top-10 -right-10 size-32 rounded-full bg-white/20 blur-xl" />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.25)_50%,transparent_60%)]" />
              <p className="relative font-mono text-xs text-white/70">0<T s={i + 1} /></p>
              <p className="relative mt-36 font-display text-2xl font-bold"><T s={n} /></p>
              <p className="relative text-xs text-white/80"><T s={d} /></p>
            </div>)} />
        </motion.div>
      </motion.div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-[#030308] to-transparent" />
      <div className="absolute inset-x-0 bottom-8 z-10 flex items-center justify-center gap-6">
        <button onClick={() => go(-1)} className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/5 backdrop-blur hover:bg-white/15" aria-label={__lx("Previous")}><ChevronLeft className="size-5" /></button>
        <div className="w-56 text-center">
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{
            opacity: 0,
            y: 10,
            filter: "blur(6px)"
          }} animate={{
            opacity: 1,
            y: 0,
            filter: "blur(0px)"
          }} exit={{
            opacity: 0,
            y: -10,
            filter: "blur(6px)"
          }}>
              <p className="font-display text-2xl font-bold"><T s={RING[active][0]} /></p>
              <p className="text-sm text-white/50"><T s={RING[active][1]} /></p>
            </motion.div>
          </AnimatePresence>
        </div>
        <button onClick={() => go(1)} className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/5 backdrop-blur hover:bg-white/15" aria-label={__lx("Next")}><ChevronRight className="size-5" /></button>
      </div>
    </section>;
}

/* ════════════════════ 04 · Scroll Story ════════════════════ */
const STORY = [[Camera, "Capture", "Snap receipts, notes and ideas. Everything lands in one inbox.", "#0ea5e9"], [FolderOpen, "Organise", "Smart folders sort it all for you — by project, client or date.", "#8b5cf6"], [Share2, "Share", "Send a live link. People see updates the second you make them.", "#ec4899"], [Heart, "Celebrate", "Hit your goals and watch the streak grow. Confetti included.", "#f59e0b"]];
function Screen({
  k
}) {
  if (k === 0) return <div className="grid h-full place-items-center bg-sky-50">
        <div className="relative size-40 rounded-3xl border-4 border-dashed border-sky-300">
          <motion.span animate={{
        top: ["8%", "84%", "8%"]
      }} transition={{
        duration: 2.2,
        repeat: Infinity
      }} className="absolute inset-x-2 h-1 rounded bg-sky-500 shadow-[0_0_12px_#0ea5e9]" />
          <Camera className="absolute inset-0 m-auto size-10 text-sky-400" />
        </div>
      </div>;
  if (k === 1) return <div className="space-y-2 bg-violet-50 p-4 pt-10">
        <T s={["Clients", "Receipts", "Ideas", "Travel"].map((f, i) => <motion.div key={f} initial={{
      x: 60,
      opacity: 0
    }} animate={{
      x: 0,
      opacity: 1
    }} transition={{
      delay: i * 0.08
    }} className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm">
            <span className={`size-8 rounded-lg bg-linear-to-br ${GRADS[i + 2]}`} /> <T s={f} /> <span className="ml-auto text-xs text-slate-400"><T s={12 + i * 7} /></span>
          </motion.div>)} />
      </div>;
  if (k === 2) return <div className="grid h-full place-items-center bg-pink-50 p-4">
        <div className="relative">
          <Avatar name="You" i={4} className="size-16" />
          <T s={[0, 1, 2, 3, 4].map(i => {
        const a = i / 5 * Math.PI * 2;
        return <motion.span key={i} initial={{
          x: 0,
          y: 0,
          opacity: 0
        }} animate={{
          x: Math.cos(a) * 70,
          y: Math.sin(a) * 70,
          opacity: 1
        }} transition={{
          delay: 0.1 + i * 0.08,
          type: "spring"
        }} className="absolute top-4 left-4">
                <Avatar name={["Ana K", "Mo S", "Lea R", "Jo D", "Nia O"][i]} i={i} className="size-8" ring="ring-2 ring-white" />
              </motion.span>;
      })} />
        </div>
      </div>;
  return <div className="relative grid h-full place-items-center overflow-hidden bg-amber-50">
      <T s={Array.from({
      length: 24
    }).map((_, i) => <motion.span key={i} initial={{
      y: -20,
      x: 0,
      rotate: 0
    }} animate={{
      y: 420,
      x: (i % 2 ? 1 : -1) * (10 + i * 7 % 40),
      rotate: 360
    }} transition={{
      duration: 1.8 + i % 5 * 0.3,
      repeat: Infinity,
      delay: i * 0.1,
      ease: "linear"
    }} className="absolute top-0 size-2 rounded-sm" style={{
      left: `${i * 37 % 100}%`,
      background: cv(["#f59e0b", "#ec4899", "#8b5cf6", "#0ea5e9"][i % 4])
    }} />)} />
      <div className="text-center"><p className="font-display text-5xl font-bold text-amber-500">42</p><p className="text-sm text-amber-700"><T s={"day streak 🔥"} /></p></div>
    </div>;
}
export function ScrollStory() {
  const box = useRef(null);
  const {
    scrollYProgress
  } = useScroll({
    container: box
  });
  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", v => setStep(Math.min(3, Math.floor(v * 4.0001))));
  const bg = useTransform(scrollYProgress, [0, 0.33, 0.66, 1], ["#06121f", "#120a24", "#1f0a18", "#1f1405"]);
  const rotY = useTransform(scrollYProgress, [0, 1], [-22, 22]);
  const ring = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24
  });
  return <div ref={box} className="relative h-[640px] overflow-y-auto text-white [scrollbar-width:thin]">
      <motion.div style={{
      backgroundColor: cv(bg)
    }} className="relative h-[2800px]">
        <div className="sticky top-0 grid h-[640px] items-center gap-8 px-8 md:grid-cols-2">
          <div className="relative">
            <p className="mb-6 text-xs tracking-[0.4em] text-white/40 uppercase"><T s={"Scroll inside this box ↓"} /></p>
            <T s={STORY.map(([I, t, d, c], i) => <motion.div key={t} animate={{
            opacity: step === i ? 1 : 0.18,
            x: step === i ? 0 : -10
          }} transition={{
            duration: 0.4
          }} className="mb-6 flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{
              background: cv(step === i ? c : "rgba(255,255,255,0.06)")
            }}><I className="size-5" /></span>
                <span>
                  <span className="block font-display text-3xl font-bold"><T s={t} /></span>
                  <span className="block max-w-sm text-white/60"><T s={d} /></span>
                </span>
              </motion.div>)} />
            <div className="mt-2 flex items-center gap-3">
              <svg viewBox="0 0 36 36" className="size-10 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" /><motion.circle cx="18" cy="18" r="15" fill="none" stroke={STORY[step][3]} strokeWidth="3" strokeLinecap="round" style={{
                pathLength: ring
              }} /></svg>
              <span className="font-mono text-sm text-white/50">0<T s={step + 1} /> / 04</span>
            </div>
          </div>
          <div className="relative hidden place-items-center md:grid" style={{
          perspective: 1200
        }}>
            <motion.span animate={{
            backgroundColor: STORY[step][3]
          }} transition={{
            duration: 0.6
          }} className="absolute size-80 rounded-full opacity-30 blur-3xl" />
            <motion.div style={{
            rotateY: rotY,
            rotateX: 6
          }} className="relative h-[520px] w-[260px] rounded-[2.8rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
              <span className="absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />
              <div className="relative h-full overflow-hidden rounded-[2.1rem] text-slate-900">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div key={step} initial={{
                  y: "100%"
                }} animate={{
                  y: 0
                }} exit={{
                  y: "-30%",
                  opacity: 0
                }} transition={{
                  duration: 0.6,
                  ease: EASE
                }} className="absolute inset-0">
                    <Screen k={step} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>;
}

/* ════════════════════ 05 · Horizontal Scroll ════════════════════ */
const PANELS = [["01", "Discovery", "We listen first. Interviews, data, and a lot of coffee.", "from-violet-600 to-indigo-900"], ["02", "Strategy", "A clear plan with fewer, better ideas.", "from-rose-500 to-orange-700"], ["03", "Design", "Systems, not screens. Built to grow with you.", "from-emerald-500 to-teal-900"], ["04", "Build", "Fast, accessible, and tested on real phones.", "from-sky-500 to-blue-900"], ["05", "Launch", "Ship, measure, improve. Then do it again.", "from-amber-400 to-rose-700"]];
function Panel({
  p,
  i,
  progress
}) {
  const shift = useTransform(progress, [0, 1], [i * 60, i * 60 - 300]);
  const counter = useTransform(shift, v => v * -0.4);
  const [n, t, d, g] = p;
  return <div className={`relative flex h-[440px] w-[min(78vw,720px)] shrink-0 flex-col justify-end overflow-hidden rounded-[2rem] bg-linear-to-br ${g} p-10`}>
      <motion.span style={{
      x: shift
    }} className="absolute -top-16 right-6 font-display text-[16rem] leading-none font-bold text-white/10"><T s={n} /></motion.span>
      <motion.div style={{
      x: counter
    }} className="absolute top-10 left-10 size-40 rounded-full border-[18px] border-white/15" />
      <p className="relative font-display text-5xl font-bold"><T s={t} /></p>
      <p className="relative mt-2 max-w-sm text-white/80"><T s={d} /></p>
    </div>;
}
export function HorizontalScroll() {
  const box = useRef(null);
  const stage = useRef(null);
  const track = useRef(null);
  const [dist, setDist] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setDist(Math.max(0, track.current.scrollWidth - stage.current.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage.current);
    return () => ro.disconnect();
  }, []);
  const {
    scrollYProgress
  } = useScroll({
    container: box
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30
  });
  const x = useTransform(smooth, v => -v * dist);
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(smooth, "change", v => setIdx(Math.min(PANELS.length - 1, Math.round(v * (PANELS.length - 1)))));
  return <div ref={box} className="relative h-[600px] overflow-y-auto bg-[#09090b] text-white">
      <div className="h-[2600px]">
        <div ref={stage} className="sticky top-0 h-[600px] overflow-hidden">
          <div className="flex items-end justify-between px-8 pt-8">
            <p className="font-display text-3xl font-bold"><T s={"How we work"} /></p>
            <p className="font-mono text-sm text-white/50">
              <AnimatePresence mode="popLayout"><motion.span key={idx} initial={{
                y: -12,
                opacity: 0
              }} animate={{
                y: 0,
                opacity: 1
              }} className="inline-block">0<T s={idx + 1} /></motion.span></AnimatePresence> / 0<T s={PANELS.length} /><T s={" · scroll ↓"} /></p>
          </div>
          <motion.div ref={track} style={{
          x
        }} className="mt-8 flex w-max gap-6 px-8">
            <T s={PANELS.map((p, i) => <Panel key={p[0]} p={p} i={i} progress={smooth} />)} />
          </motion.div>
          <div className="absolute inset-x-8 bottom-6 h-1 overflow-hidden rounded-full bg-white/10">
            <motion.div style={{
            scaleX: smooth
          }} className="h-full origin-left bg-linear-to-r from-violet-400 via-rose-400 to-amber-300" />
          </div>
        </div>
      </div>
    </div>;
}
