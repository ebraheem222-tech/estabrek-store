// @ts-nocheck
/* eslint-disable */
// Made by scripts/library/convert.mjs from the owner's Themes folder (CTA/src/shared.jsx): do not edit.
import { T } from "../runtime";
import { Fragment, useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "motion/react";
import { Star } from "lucide-react";
export const EASE = [0.22, 1, 0.36, 1];

/** Spread onto a motion element: fades + lifts in when it scrolls into view. */
export const reveal = (delay = 0, y = 24) => ({
  initial: {
    opacity: 0,
    y
  },
  whileInView: {
    opacity: 1,
    y: 0
  },
  viewport: {
    once: true,
    margin: "-40px"
  },
  transition: {
    duration: 0.7,
    delay,
    ease: EASE
  }
});

/** Word-by-word blur-in when visible. */
export function Words({
  text,
  className = "",
  wordClass = "",
  delay = 0,
  stagger = 0.06
}) {
  const words = text.split(" ");
  return <span className={className}>
      <T s={words.map((w, i) => <Fragment key={i}>
          <motion.span className={`inline-block ${wordClass}`} initial={{
        opacity: 0,
        y: "0.4em",
        filter: "blur(8px)"
      }} whileInView={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)"
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.7,
        delay: delay + i * stagger,
        ease: EASE
      }}>
            <T s={w} />
          </motion.span>
          <T s={i < words.length - 1 && " "} />
        </Fragment>)} />
    </span>;
}
export const GRADS = ["from-rose-400 to-orange-300", "from-sky-400 to-indigo-400", "from-emerald-400 to-teal-300", "from-fuchsia-400 to-violet-400", "from-amber-300 to-yellow-200", "from-cyan-400 to-blue-500", "from-pink-400 to-rose-500", "from-lime-300 to-emerald-500"];
export function Avatar({
  name = "AK",
  i = 0,
  className = "size-10",
  ring = ""
}) {
  const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2);
  return <span className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br text-xs font-semibold text-white ${GRADS[i % GRADS.length]} ${ring} ${className}`}><T s={initials} /></span>;
}
export function Avatars({
  n = 4,
  size = "size-8",
  ring = "ring-2 ring-white",
  className = ""
}) {
  const names = ["Ana K", "Mo S", "Lea R", "Jo D", "Nia O", "Sam T"];
  return <div className={`flex -space-x-2 ${className}`}>
      <T s={Array.from({
      length: n
    }).map((_, i) => <Avatar key={i} name={names[i % names.length]} i={i} className={size} ring={ring} />)} />
    </div>;
}
export function Stars({
  n = 5,
  className = "text-amber-400",
  size = "size-4"
}) {
  return <div className={`flex gap-0.5 ${className}`}>
      <T s={Array.from({
      length: 5
    }).map((_, i) => <Star key={i} className={`${size} ${i < n ? "fill-current" : "opacity-30"}`} />)} />
    </div>;
}

/** Counts up from 0 when visible. */
export function Counter({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.8
}) {
  const ref = useRef(null);
  const inView = useInView(ref, {
    once: true
  });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: setV
    });
    return () => c.stop();
  }, [inView, to, duration]);
  return <span ref={ref} className="tabular-nums">
      <T s={prefix} />
      <T s={v.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })} />
      <T s={suffix} />
    </span>;
}

/** Cycles 0..n-1 every ms. */
export function useCycle(n, ms) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(v => (v + 1) % n), ms);
    return () => clearInterval(id);
  }, [n, ms]);
  return i;
}

/** Deterministic pseudo-random in [0,1). */
export const rand = seed => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/** A simple brand mark: gradient tile + name. */
export function Logo({
  name = "Brand",
  icon: Icon,
  tile = "from-violet-500 to-cyan-400",
  className = ""
}) {
  return <a href="#" className={`flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className={`grid size-8 place-items-center rounded-lg bg-linear-to-br ${tile} text-white shadow-sm`}><T s={Icon ? <Icon className="size-4" /> : name[0]} /></span>
      <T s={name} />
    </a>;
}

/** Placeholder lines that look like page content. */
export function FakeLines({
  n = 3,
  className = "bg-white/10"
}) {
  return <div className="space-y-2.5">
      <T s={Array.from({
      length: n
    }).map((_, i) => <div key={i} className={`h-2.5 rounded-full ${className}`} style={{
      width: `${90 - i * 23 % 40}%`
    }} />)} />
    </div>;
}
