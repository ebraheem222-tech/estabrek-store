/**
 * What triggers can do that needs no motion engine (pageTree/TreeTriggers.tsx): a burst of
 * confetti, hearts, stars… from a point (a small particle world on one canvas over the page:
 * velocity, gravity, air drag and spin, stepped by the frame's own time, gone when the last
 * piece has fallen), a short message at the foot of the screen, a sound made on the spot
 * (Web Audio, no files), and short moves on any element (Web Animations on the separate
 * translate/rotate/scale properties, so they add to whatever transform it already has).
 */
type Burst = "confetti" | "hearts" | "stars" | "sparkles" | "snow" | "bubbles";
type Piece = { x: number; y: number; vx: number; vy: number; r: number; spin: number; size: number; color: string; life: number; age: number; shape: Burst };

const MIX = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"];
let canvas: HTMLCanvasElement | null = null;
let pieces: Piece[] = [];
let raf = 0;
let last = 0;

function shapePath(c: CanvasRenderingContext2D, p: Piece) {
  const s = p.size;
  c.beginPath();
  switch (p.shape) {
    case "hearts":
      c.moveTo(0, s * 0.35);
      c.bezierCurveTo(-s, -s * 0.3, -s * 0.45, -s, 0, -s * 0.45);
      c.bezierCurveTo(s * 0.45, -s, s, -s * 0.3, 0, s * 0.35);
      break;
    case "stars":
    case "sparkles": {
      const points = p.shape === "stars" ? 5 : 4;
      const inner = p.shape === "stars" ? 0.45 : 0.25;
      for (let i = 0; i < points * 2; i++) {
        const a = (Math.PI * i) / points - Math.PI / 2;
        const r = i % 2 ? s * inner : s;
        if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath();
      break;
    }
    case "snow":
    case "bubbles":
      c.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      break;
    default:
      c.rect(-s / 2, -s / 4, s, s / 2);
  }
}

function frame(now: number) {
  raf = 0;
  if (!canvas) return;
  const c = canvas.getContext("2d");
  if (!c) return;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(innerWidth * dpr) || canvas.height !== Math.round(innerHeight * dpr)) {
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, innerWidth, innerHeight);
  pieces = pieces.filter((p) => p.age < p.life && p.y < innerHeight + 40);
  for (const p of pieces) {
    const light = p.shape === "bubbles" || p.shape === "snow";
    // Gravity (bubbles rise), air drag, a little sway, spin.
    p.vy += (light ? (p.shape === "bubbles" ? -260 : 60) : 900) * dt;
    const drag = Math.pow(light ? 0.2 : 0.5, dt);
    p.vx *= drag;
    p.vy *= light ? Math.pow(0.6, dt) : 1;
    p.x += (p.vx + (light ? Math.sin(p.age * 3 + p.r) * 30 : 0)) * dt;
    p.y += p.vy * dt;
    p.r += p.spin * dt;
    p.age += dt;
    const fade = Math.min(1, (p.life - p.age) / 0.5);
    c.save();
    c.globalAlpha = Math.max(0, fade);
    c.translate(p.x, p.y);
    c.rotate(p.r);
    if (p.shape === "confetti") c.scale(1, Math.cos(p.age * 9 + p.r));
    shapePath(c, p);
    if (p.shape === "bubbles") {
      c.strokeStyle = p.color;
      c.lineWidth = 1.5;
      c.stroke();
    } else {
      c.fillStyle = p.color;
      c.fill();
    }
    c.restore();
  }
  if (pieces.length) raf = requestAnimationFrame(frame);
  else {
    last = 0;
    canvas.remove();
    canvas = null;
  }
}

/** A burst from a point of the screen (the clicked element's middle). */
export function burst(kind: Burst, at: { x: number; y: number }, amount: number, color?: string) {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000";
    document.body.appendChild(canvas);
  }
  const n = Math.max(5, Math.min(200, amount));
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * (kind === "snow" ? Math.PI * 2 : Math.PI * 1.1);
    const speed = (kind === "snow" || kind === "bubbles" ? 120 : 420) + Math.random() * 380;
    pieces.push({
      x: at.x, y: at.y,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      r: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 12,
      size: (kind === "confetti" ? 10 : 12) + Math.random() * 8,
      color: color ?? MIX[i % MIX.length],
      life: 1.6 + Math.random() * 1.4, age: 0, shape: kind,
    });
  }
  if (pieces.length > 600) pieces = pieces.slice(-600);
  if (!raf) raf = requestAnimationFrame(frame);
}

/** A short message at the foot of the screen, read out by screen readers. */
export function toast(text: string) {
  let box = document.getElementById("pt-toast");
  if (!box) {
    box = document.createElement("div");
    box.id = "pt-toast";
    box.setAttribute("role", "status");
    box.style.cssText = "position:fixed;inset-inline:0;bottom:24px;margin-inline:auto;width:max-content;max-width:min(92vw,520px);padding:12px 18px;border-radius:999px;background:rgba(20,20,24,.92);color:#fff;font:500 14px/1.4 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.25);z-index:2147483001;transition:opacity .25s,translate .25s;opacity:0;translate:0 12px;pointer-events:none";
    document.body.appendChild(box);
  }
  box.textContent = text;
  requestAnimationFrame(() => {
    box!.style.opacity = "1";
    box!.style.translate = "0 0";
  });
  window.clearTimeout(Number(box.dataset.timer));
  box.dataset.timer = String(window.setTimeout(() => {
    box!.style.opacity = "0";
    box!.style.translate = "0 12px";
  }, 2600));
}

let audio: AudioContext | null = null;
/** A sound made on the spot (no files): a click, a pop, a chime, a whoosh, a little success tune. */
export function sound(kind: "click" | "pop" | "chime" | "whoosh" | "success", volume: number) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    if (audio.state === "suspended") void audio.resume();
    const ctx = audio;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = Math.max(0, Math.min(1, volume)) * 0.6;
    out.connect(ctx.destination);
    const tone = (freq: number, at: number, len: number, type: OscillatorType = "sine", to?: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t + at);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + at + len);
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(1, t + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + len);
      o.connect(g).connect(out);
      o.start(t + at);
      o.stop(t + at + len + 0.02);
    };
    if (kind === "click") tone(1800, 0, 0.04, "square");
    else if (kind === "pop") tone(600, 0, 0.12, "sine", 120);
    else if (kind === "chime") { tone(880, 0, 0.6); tone(1320, 0.08, 0.7); }
    else if (kind === "success") { tone(523, 0, 0.18, "triangle"); tone(659, 0.12, 0.18, "triangle"); tone(784, 0.24, 0.35, "triangle"); }
    else {
      // A whoosh: noise through a sweeping filter.
      const len = 0.45;
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(3000, t + len);
      src.connect(f).connect(out);
      src.start(t);
    }
  } catch {
    /* no sound here */
  }
}

/** Short moves on the separate transform properties (they add to its own transform and motion). */
const MOVES: Record<string, { frames: Keyframe[]; duration: number; origin?: string }> = {
  bounce: { frames: [{ translate: "0 0" }, { translate: "0 -14px" }, { translate: "0 0" }, { translate: "0 -6px" }, { translate: "0 0" }], duration: 700 },
  shake: { frames: [{ translate: "0 0" }, { translate: "-8px 0" }, { translate: "8px 0" }, { translate: "-5px 0" }, { translate: "5px 0" }, { translate: "0 0" }], duration: 500 },
  pulse: { frames: [{ scale: "1" }, { scale: "1.08" }, { scale: "1" }], duration: 450 },
  wiggle: { frames: [{ rotate: "0deg" }, { rotate: "-7deg" }, { rotate: "7deg" }, { rotate: "-4deg" }, { rotate: "4deg" }, { rotate: "0deg" }], duration: 600 },
  jello: { frames: [{ rotate: "0deg", scale: "1" }, { rotate: "-4deg", scale: "1.05" }, { rotate: "3deg", scale: ".97" }, { rotate: "-1.5deg", scale: "1.02" }, { rotate: "0deg", scale: "1" }], duration: 800 },
  rubber: { frames: [{ scale: "1 1" }, { scale: "1.25 .75" }, { scale: ".75 1.25" }, { scale: "1.15 .85" }, { scale: ".95 1.05" }, { scale: "1 1" }], duration: 800 },
  heartbeat: { frames: [{ scale: "1" }, { scale: "1.12" }, { scale: "1" }, { scale: "1.12" }, { scale: "1" }], duration: 900 },
  swing: { frames: [{ rotate: "0deg" }, { rotate: "12deg" }, { rotate: "-8deg" }, { rotate: "4deg" }, { rotate: "-2deg" }, { rotate: "0deg" }], duration: 900, origin: "50% 0%" },
  flip: { frames: [{ rotate: "y 0deg" }, { rotate: "y 360deg" }], duration: 700 },
  spin: { frames: [{ rotate: "0deg" }, { rotate: "360deg" }], duration: 700 },
  pop: { frames: [{ scale: "1" }, { scale: "1.18" }, { scale: "1" }], duration: 400 },
  flash: { frames: [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], duration: 800 },
  tada: { frames: [{ scale: "1", rotate: "0deg" }, { scale: ".9", rotate: "-3deg" }, { scale: "1.1", rotate: "3deg" }, { scale: "1.1", rotate: "-3deg" }, { scale: "1.1", rotate: "3deg" }, { scale: "1", rotate: "0deg" }], duration: 1000 },
};
export function playMove(el: HTMLElement, kind: string) {
  const m = MOVES[kind];
  if (!m || !el.animate) return;
  if (m.origin) el.style.transformOrigin = m.origin;
  el.animate(m.frames, { duration: m.duration, easing: "ease-in-out" });
}
