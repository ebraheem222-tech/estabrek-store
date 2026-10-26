// ============================================================
// ESTABREK - LOADING ANIMATIONS
// ============================================================
// مجموعة شاملة من حركات التحميل
// ============================================================

export type LoadingAnimationCategory = "spinner" | "dots" | "bars" | "skeleton" | "special" | "ring";

export interface LoadingAnimation {
  id: string;
  name: string;
  nameAr: string;
  category: LoadingAnimationCategory;
  html: string;
  css: string;
}

export const LOADING_CATEGORY_LABELS_AR: Record<LoadingAnimationCategory, string> = {
  spinner: "دوارات",
  dots: "نقاط",
  bars: "أعمدة",
  skeleton: "هياكل",
  special: "خاصة",
  ring: "حلقات",
};

const LOADER_KEYFRAME_PREFIX = "estabrek-loading";

function isDurationToken(token: string) {
  return /^\d*\.?\d+(ms|s)$/i.test(token);
}

function isTimingFunctionToken(token: string) {
  const t = token.toLowerCase();
  return (
    t === "linear" ||
    t === "ease" ||
    t === "ease-in" ||
    t === "ease-out" ||
    t === "ease-in-out" ||
    /^steps\(/i.test(token) ||
    /^cubic-bezier\(/i.test(token)
  );
}

function isAnimationKeyword(token: string) {
  const t = token.toLowerCase();
  return (
    t === "infinite" ||
    t === "normal" ||
    t === "reverse" ||
    t === "alternate" ||
    t === "alternate-reverse" ||
    t === "forwards" ||
    t === "backwards" ||
    t === "both" ||
    t === "running" ||
    t === "paused" ||
    t === "step-start" ||
    t === "step-end"
  );
}

function extractAnimationNameFromShorthand(segment: string): string | null {
  const tokens = segment.trim().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token === "none") return null;
    if (isDurationToken(token)) continue;
    if (isTimingFunctionToken(token)) continue;
    if (isAnimationKeyword(token)) continue;
    if (/^\d+$/.test(token)) continue;
    return token;
  }
  return null;
}

function namespaceLoadingCss(id: string, css: string): string {
  const defined = new Set<string>();
  const keyframesRe = /@(?:-webkit-)?keyframes\s+([a-zA-Z0-9_-]+)\s*{/g;
  for (const m of css.matchAll(keyframesRe)) {
    if (m[1]) defined.add(m[1]);
  }

  const referenced = new Set<string>();

  const animationNameRe = /animation-name\s*:\s*([^;]+);/g;
  for (const m of css.matchAll(animationNameRe)) {
    const raw = (m[1] ?? "").trim();
    if (!raw) continue;
    for (const name of raw.split(",").map((s) => s.trim())) {
      if (!name || name === "none") continue;
      referenced.add(name);
    }
  }

  const animationRe = /animation\s*:\s*([^;]+);/g;
  for (const m of css.matchAll(animationRe)) {
    const raw = (m[1] ?? "").trim();
    if (!raw) continue;
    for (const part of raw.split(",").map((s) => s.trim())) {
      const name = extractAnimationNameFromShorthand(part);
      if (!name) continue;
      referenced.add(name);
    }
  }

  const mapName = (name: string) => `${LOADER_KEYFRAME_PREFIX}-${id}-${name}`;
  const allNames = new Set([...defined, ...referenced]);
  const mapping = new Map<string, string>([...allNames].map((n) => [n, mapName(n)]));

  let out = css;

  out = out.replace(/@keyframes\s+([a-zA-Z0-9_-]+)\s*{/g, (full, name: string) => {
    const next = mapping.get(name);
    if (!next) return full;
    return `@keyframes ${next} {`;
  });
  out = out.replace(/@-webkit-keyframes\s+([a-zA-Z0-9_-]+)\s*{/g, (full, name: string) => {
    const next = mapping.get(name);
    if (!next) return full;
    return `@-webkit-keyframes ${next} {`;
  });

  out = out.replace(/animation-name\s*:\s*([^;]+);/g, (full, raw: string) => {
    const parts = String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => {
        if (name === "none") return name;
        return mapping.get(name) ?? name;
      });
    return `animation-name: ${parts.join(", ")};`;
  });

  out = out.replace(/animation\s*:\s*([^;]+);/g, (full, raw: string) => {
    const parts = String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((segment) => {
        const tokens = segment.split(/\s+/).filter(Boolean);
        if (!tokens.length) return segment;

        let nameIndex: number | null = null;
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i]!;
          if (token === "none") {
            nameIndex = null;
            break;
          }
          if (isDurationToken(token)) continue;
          if (isTimingFunctionToken(token)) continue;
          if (isAnimationKeyword(token)) continue;
          if (/^\d+$/.test(token)) continue;
          nameIndex = i;
          break;
        }

        if (nameIndex !== null) {
          const name = tokens[nameIndex]!;
          const next = mapping.get(name);
          if (next) tokens[nameIndex] = next;
        }

        return tokens.join(" ");
      });
    return `animation: ${parts.join(", ")};`;
  });

  const fallbacks: string[] = [];
  if (referenced.has("spin") && !defined.has("spin")) {
    fallbacks.push(`@keyframes ${mapping.get("spin") ?? mapName("spin")} { to { transform: rotate(360deg); } }`);
  }
  if (referenced.has("shimmer") && !defined.has("shimmer")) {
    fallbacks.push(
      `@keyframes ${mapping.get("shimmer") ?? mapName("shimmer")} { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`
    );
  }

  if (fallbacks.length) {
    out = `${fallbacks.join("\n")}\n${out}`;
  }

  return out;
}

// ============================================================
// 🔄 SPINNER LOADERS (12)
// ============================================================

const RAW_SPINNER_LOADERS: LoadingAnimation[] = [
  {
    id: "spinner-simple",
    name: "Simple Spinner",
    nameAr: "دوار بسيط",
    category: "spinner",
    html: `<div class="spinner-simple"></div>`,
    css: `
.spinner-simple {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}`,
  },
  {
    id: "spinner-thick",
    name: "Thick Spinner",
    nameAr: "دوار سميك",
    category: "spinner",
    html: `<div class="spinner-thick"></div>`,
    css: `
.spinner-thick {
  width: 40px;
  height: 40px;
  border: 6px solid #e5e7eb;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}`,
  },
  {
    id: "spinner-dual",
    name: "Dual Ring Spinner",
    nameAr: "دوار مزدوج",
    category: "spinner",
    html: `<div class="spinner-dual"></div>`,
    css: `
.spinner-dual {
  width: 40px;
  height: 40px;
  border: 4px solid transparent;
  border-top-color: #3b82f6;
  border-bottom-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}`,
  },
  {
    id: "spinner-gradient",
    name: "Gradient Spinner",
    nameAr: "دوار متدرج",
    category: "spinner",
    html: `<div class="spinner-gradient"></div>`,
    css: `
.spinner-gradient {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent, #3b82f6);
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
  animation: spin 1s linear infinite;
}`,
  },
  {
    id: "spinner-dashed",
    name: "Dashed Spinner",
    nameAr: "دوار متقطع",
    category: "spinner",
    html: `<div class="spinner-dashed"></div>`,
    css: `
.spinner-dashed {
  width: 40px;
  height: 40px;
  border: 4px dashed #3b82f6;
  border-radius: 50%;
  animation: spin 2s linear infinite;
}`,
  },
  {
    id: "spinner-double",
    name: "Double Spinner",
    nameAr: "دوار ثنائي",
    category: "spinner",
    html: `<div class="spinner-double"><div></div><div></div></div>`,
    css: `
.spinner-double {
  width: 40px;
  height: 40px;
  position: relative;
}
.spinner-double div {
  position: absolute;
  inset: 0;
  border: 4px solid transparent;
  border-radius: 50%;
}
.spinner-double div:nth-child(1) {
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
}
.spinner-double div:nth-child(2) {
  border-bottom-color: #ec4899;
  animation: spin 1s linear infinite reverse;
}`,
  },
  {
    id: "spinner-triple",
    name: "Triple Spinner",
    nameAr: "دوار ثلاثي",
    category: "spinner",
    html: `<div class="spinner-triple"><div></div><div></div><div></div></div>`,
    css: `
.spinner-triple {
  width: 40px;
  height: 40px;
  position: relative;
}
.spinner-triple div {
  position: absolute;
  border: 3px solid transparent;
  border-radius: 50%;
}
.spinner-triple div:nth-child(1) {
  inset: 0;
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
}
.spinner-triple div:nth-child(2) {
  inset: 5px;
  border-right-color: #ec4899;
  animation: spin 1.5s linear infinite reverse;
}
.spinner-triple div:nth-child(3) {
  inset: 10px;
  border-bottom-color: #10b981;
  animation: spin 2s linear infinite;
}`,
  },
  {
    id: "spinner-arc",
    name: "Arc Spinner",
    nameAr: "دوار قوسي",
    category: "spinner",
    html: `<div class="spinner-arc"></div>`,
    css: `
.spinner-arc {
  width: 40px;
  height: 40px;
  border: 4px solid transparent;
  border-top-color: #3b82f6;
  border-right-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}`,
  },
  {
    id: "spinner-glow",
    name: "Glow Spinner",
    nameAr: "دوار متوهج",
    category: "spinner",
    html: `<div class="spinner-glow"></div>`,
    css: `
.spinner-glow {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
}`,
  },
  {
    id: "spinner-neon",
    name: "Neon Spinner",
    nameAr: "دوار نيون",
    category: "spinner",
    html: `<div class="spinner-neon"></div>`,
    css: `
.spinner-neon {
  width: 40px;
  height: 40px;
  border: 4px solid transparent;
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, inset 0 0 10px rgba(0,255,255,0.2);
}`,
  },
  {
    id: "spinner-segmented",
    name: "Segmented Spinner",
    nameAr: "دوار مجزأ",
    category: "spinner",
    html: `<div class="spinner-segmented"><span></span><span></span><span></span><span></span></div>`,
    css: `
.spinner-segmented {
  width: 40px;
  height: 40px;
  position: relative;
  animation: spin 1.5s linear infinite;
}
.spinner-segmented span {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
}
.spinner-segmented span:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
.spinner-segmented span:nth-child(2) { right: 0; top: 50%; transform: translateY(-50%); }
.spinner-segmented span:nth-child(3) { bottom: 0; left: 50%; transform: translateX(-50%); }
.spinner-segmented span:nth-child(4) { left: 0; top: 50%; transform: translateY(-50%); }`,
  },
  {
    id: "spinner-orbit",
    name: "Orbit Spinner",
    nameAr: "دوار مداري",
    category: "spinner",
    html: `<div class="spinner-orbit"><div></div></div>`,
    css: `
.spinner-orbit {
  width: 40px;
  height: 40px;
  border: 2px solid #e5e7eb;
  border-radius: 50%;
  position: relative;
}
.spinner-orbit div {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  animation: orbit 1s linear infinite;
  transform-origin: 50% 25px;
}
@keyframes orbit {
  to { transform: translateX(-50%) rotate(360deg); }
}`,
  },
];

export const SPINNER_LOADERS: LoadingAnimation[] = RAW_SPINNER_LOADERS.map((l) => ({
  ...l,
  css: namespaceLoadingCss(l.id, l.css),
}));

// ============================================================
// ⚫ DOT LOADERS (10)
// ============================================================

const RAW_DOT_LOADERS: LoadingAnimation[] = [
  {
    id: "dots-bounce",
    name: "Bouncing Dots",
    nameAr: "نقاط نطاطة",
    category: "dots",
    html: `<div class="dots-bounce"><span></span><span></span><span></span></div>`,
    css: `
.dots-bounce {
  display: flex;
  gap: 6px;
}
.dots-bounce span {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
  animation: bounce 0.6s infinite alternate;
}
.dots-bounce span:nth-child(2) { animation-delay: 0.2s; }
.dots-bounce span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  to { transform: translateY(-10px); opacity: 0.3; }
}`,
  },
  {
    id: "dots-pulse",
    name: "Pulsing Dots",
    nameAr: "نقاط نابضة",
    category: "dots",
    html: `<div class="dots-pulse"><span></span><span></span><span></span></div>`,
    css: `
.dots-pulse {
  display: flex;
  gap: 6px;
}
.dots-pulse span {
  width: 10px;
  height: 10px;
  background: #8b5cf6;
  border-radius: 50%;
  animation: pulse 1s infinite ease-in-out;
}
.dots-pulse span:nth-child(2) { animation-delay: 0.2s; }
.dots-pulse span:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.5); opacity: 0.5; }
}`,
  },
  {
    id: "dots-fade",
    name: "Fading Dots",
    nameAr: "نقاط متلاشية",
    category: "dots",
    html: `<div class="dots-fade"><span></span><span></span><span></span></div>`,
    css: `
.dots-fade {
  display: flex;
  gap: 6px;
}
.dots-fade span {
  width: 10px;
  height: 10px;
  background: #ec4899;
  border-radius: 50%;
  animation: fade 1.2s infinite ease-in-out;
}
.dots-fade span:nth-child(2) { animation-delay: 0.2s; }
.dots-fade span:nth-child(3) { animation-delay: 0.4s; }
@keyframes fade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}`,
  },
  {
    id: "dots-wave",
    name: "Wave Dots",
    nameAr: "نقاط موجية",
    category: "dots",
    html: `<div class="dots-wave"><span></span><span></span><span></span><span></span><span></span></div>`,
    css: `
.dots-wave {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 30px;
}
.dots-wave span {
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
  animation: wave 1s infinite ease-in-out;
}
.dots-wave span:nth-child(2) { animation-delay: 0.1s; }
.dots-wave span:nth-child(3) { animation-delay: 0.2s; }
.dots-wave span:nth-child(4) { animation-delay: 0.3s; }
.dots-wave span:nth-child(5) { animation-delay: 0.4s; }
@keyframes wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}`,
  },
  {
    id: "dots-typing",
    name: "Typing Dots",
    nameAr: "نقاط كتابة",
    category: "dots",
    html: `<div class="dots-typing"><span></span><span></span><span></span></div>`,
    css: `
.dots-typing {
  display: flex;
  gap: 4px;
  padding: 10px 15px;
  background: #f3f4f6;
  border-radius: 20px;
}
.dots-typing span {
  width: 8px;
  height: 8px;
  background: #6b7280;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}
.dots-typing span:nth-child(2) { animation-delay: 0.2s; }
.dots-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}`,
  },
  {
    id: "dots-elastic",
    name: "Elastic Dots",
    nameAr: "نقاط مرنة",
    category: "dots",
    html: `<div class="dots-elastic"><span></span><span></span><span></span></div>`,
    css: `
.dots-elastic {
  display: flex;
  gap: 6px;
}
.dots-elastic span {
  width: 10px;
  height: 10px;
  background: #10b981;
  border-radius: 50%;
  animation: elastic 0.8s infinite;
}
.dots-elastic span:nth-child(2) { animation-delay: 0.1s; }
.dots-elastic span:nth-child(3) { animation-delay: 0.2s; }
@keyframes elastic {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.5); }
}`,
  },
  {
    id: "dots-circular",
    name: "Circular Dots",
    nameAr: "نقاط دائرية",
    category: "dots",
    html: `<div class="dots-circular"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>`,
    css: `
.dots-circular {
  width: 40px;
  height: 40px;
  position: relative;
}
.dots-circular span {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
  animation: circular-fade 1.2s infinite;
}
.dots-circular span:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
.dots-circular span:nth-child(2) { top: 6px; right: 6px; animation-delay: 0.15s; }
.dots-circular span:nth-child(3) { right: 0; top: 50%; transform: translateY(-50%); animation-delay: 0.3s; }
.dots-circular span:nth-child(4) { bottom: 6px; right: 6px; animation-delay: 0.45s; }
.dots-circular span:nth-child(5) { bottom: 0; left: 50%; transform: translateX(-50%); animation-delay: 0.6s; }
.dots-circular span:nth-child(6) { bottom: 6px; left: 6px; animation-delay: 0.75s; }
.dots-circular span:nth-child(7) { left: 0; top: 50%; transform: translateY(-50%); animation-delay: 0.9s; }
.dots-circular span:nth-child(8) { top: 6px; left: 6px; animation-delay: 1.05s; }
@keyframes circular-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}`,
  },
  {
    id: "dots-flipping",
    name: "Flipping Dots",
    nameAr: "نقاط منقلبة",
    category: "dots",
    html: `<div class="dots-flipping"><span></span><span></span><span></span></div>`,
    css: `
.dots-flipping {
  display: flex;
  gap: 6px;
}
.dots-flipping span {
  width: 10px;
  height: 10px;
  background: #f59e0b;
  border-radius: 50%;
  animation: flip 1s infinite;
}
.dots-flipping span:nth-child(2) { animation-delay: 0.2s; }
.dots-flipping span:nth-child(3) { animation-delay: 0.4s; }
@keyframes flip {
  0%, 100% { transform: rotateY(0); }
  50% { transform: rotateY(180deg); background: #ef4444; }
}`,
  },
  {
    id: "dots-growing",
    name: "Growing Dots",
    nameAr: "نقاط نامية",
    category: "dots",
    html: `<div class="dots-growing"><span></span><span></span><span></span></div>`,
    css: `
.dots-growing {
  display: flex;
  gap: 8px;
  align-items: center;
}
.dots-growing span {
  width: 8px;
  height: 8px;
  background: #6366f1;
  border-radius: 50%;
  animation: grow 1s infinite;
}
.dots-growing span:nth-child(2) { animation-delay: 0.2s; }
.dots-growing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes grow {
  0%, 100% { transform: scale(0.5); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
}`,
  },
  {
    id: "dots-square",
    name: "Square Dots",
    nameAr: "نقاط مربعة",
    category: "dots",
    html: `<div class="dots-square"><span></span><span></span><span></span><span></span></div>`,
    css: `
.dots-square {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  width: 30px;
  height: 30px;
}
.dots-square span {
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 2px;
  animation: square-pulse 1.2s infinite;
}
.dots-square span:nth-child(2) { animation-delay: 0.2s; }
.dots-square span:nth-child(3) { animation-delay: 0.4s; }
.dots-square span:nth-child(4) { animation-delay: 0.6s; }
@keyframes square-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.8); }
}`,
  },
];

export const DOT_LOADERS: LoadingAnimation[] = RAW_DOT_LOADERS.map((l) => ({
  ...l,
  css: namespaceLoadingCss(l.id, l.css),
}));

// ============================================================
// 📊 BAR LOADERS (10)
// ============================================================

const RAW_BAR_LOADERS: LoadingAnimation[] = [
  {
    id: "bars-wave",
    name: "Wave Bars",
    nameAr: "أعمدة موجية",
    category: "bars",
    html: `<div class="bars-wave"><span></span><span></span><span></span><span></span><span></span></div>`,
    css: `
.bars-wave {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 40px;
}
.bars-wave span {
  width: 6px;
  height: 20px;
  background: #3b82f6;
  border-radius: 3px;
  animation: bars-wave 1s infinite ease-in-out;
}
.bars-wave span:nth-child(2) { animation-delay: 0.1s; }
.bars-wave span:nth-child(3) { animation-delay: 0.2s; }
.bars-wave span:nth-child(4) { animation-delay: 0.3s; }
.bars-wave span:nth-child(5) { animation-delay: 0.4s; }
@keyframes bars-wave {
  0%, 100% { height: 20px; }
  50% { height: 40px; }
}`,
  },
  {
    id: "bars-equalizer",
    name: "Equalizer Bars",
    nameAr: "أعمدة معادل الصوت",
    category: "bars",
    html: `<div class="bars-equalizer"><span></span><span></span><span></span><span></span></div>`,
    css: `
.bars-equalizer {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 40px;
}
.bars-equalizer span {
  width: 8px;
  background: linear-gradient(to top, #3b82f6, #8b5cf6);
  border-radius: 2px;
  animation: equalizer 0.8s infinite ease-in-out;
}
.bars-equalizer span:nth-child(1) { animation-duration: 0.7s; }
.bars-equalizer span:nth-child(2) { animation-duration: 0.5s; }
.bars-equalizer span:nth-child(3) { animation-duration: 0.9s; }
.bars-equalizer span:nth-child(4) { animation-duration: 0.6s; }
@keyframes equalizer {
  0%, 100% { height: 10px; }
  50% { height: 40px; }
}`,
  },
  {
    id: "bars-loading",
    name: "Loading Bars",
    nameAr: "أعمدة تحميل",
    category: "bars",
    html: `<div class="bars-loading"><span></span><span></span><span></span></div>`,
    css: `
.bars-loading {
  display: flex;
  gap: 4px;
}
.bars-loading span {
  width: 8px;
  height: 30px;
  background: #10b981;
  border-radius: 4px;
  animation: loading-bars 1s infinite;
}
.bars-loading span:nth-child(2) { animation-delay: 0.2s; }
.bars-loading span:nth-child(3) { animation-delay: 0.4s; }
@keyframes loading-bars {
  0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
  50% { transform: scaleY(1); opacity: 1; }
}`,
  },
  {
    id: "bars-flip",
    name: "Flip Bars",
    nameAr: "أعمدة منقلبة",
    category: "bars",
    html: `<div class="bars-flip"><span></span><span></span><span></span></div>`,
    css: `
.bars-flip {
  display: flex;
  gap: 4px;
}
.bars-flip span {
  width: 10px;
  height: 30px;
  background: #f59e0b;
  animation: flip-bars 1.2s infinite;
}
.bars-flip span:nth-child(2) { animation-delay: 0.2s; }
.bars-flip span:nth-child(3) { animation-delay: 0.4s; }
@keyframes flip-bars {
  0%, 100% { transform: rotateX(0); }
  50% { transform: rotateX(180deg); }
}`,
  },
  {
    id: "bars-progress",
    name: "Progress Bars",
    nameAr: "أعمدة تقدم",
    category: "bars",
    html: `<div class="bars-progress"><span></span><span></span><span></span><span></span><span></span></div>`,
    css: `
.bars-progress {
  display: flex;
  gap: 3px;
}
.bars-progress span {
  width: 6px;
  height: 25px;
  background: #e5e7eb;
  border-radius: 3px;
  animation: progress-bars 1.5s infinite;
}
.bars-progress span:nth-child(1) { animation-delay: 0s; }
.bars-progress span:nth-child(2) { animation-delay: 0.2s; }
.bars-progress span:nth-child(3) { animation-delay: 0.4s; }
.bars-progress span:nth-child(4) { animation-delay: 0.6s; }
.bars-progress span:nth-child(5) { animation-delay: 0.8s; }
@keyframes progress-bars {
  0%, 100% { background: #e5e7eb; }
  50% { background: #3b82f6; }
}`,
  },
  {
    id: "bars-gradient",
    name: "Gradient Bars",
    nameAr: "أعمدة متدرجة",
    category: "bars",
    html: `<div class="bars-gradient"><span></span><span></span><span></span><span></span></div>`,
    css: `
.bars-gradient {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 40px;
}
.bars-gradient span {
  width: 8px;
  background: linear-gradient(to top, #ec4899, #8b5cf6, #3b82f6);
  border-radius: 4px;
  animation: gradient-bars 1s infinite;
}
.bars-gradient span:nth-child(1) { animation-delay: 0s; height: 15px; }
.bars-gradient span:nth-child(2) { animation-delay: 0.15s; height: 20px; }
.bars-gradient span:nth-child(3) { animation-delay: 0.3s; height: 25px; }
.bars-gradient span:nth-child(4) { animation-delay: 0.45s; height: 20px; }
@keyframes gradient-bars {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
}`,
  },
  {
    id: "bars-slide",
    name: "Sliding Bars",
    nameAr: "أعمدة منزلقة",
    category: "bars",
    html: `<div class="bars-slide"><span></span></div>`,
    css: `
.bars-slide {
  width: 60px;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}
.bars-slide span {
  display: block;
  width: 30px;
  height: 100%;
  background: #3b82f6;
  border-radius: 3px;
  animation: slide-bar 1s infinite ease-in-out;
}
@keyframes slide-bar {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}`,
  },
  {
    id: "bars-fill",
    name: "Fill Bar",
    nameAr: "عمود ملء",
    category: "bars",
    html: `<div class="bars-fill"><span></span></div>`,
    css: `
.bars-fill {
  width: 80px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}
.bars-fill span {
  display: block;
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  animation: fill-bar 2s infinite;
}
@keyframes fill-bar {
  0% { width: 0%; }
  50% { width: 100%; }
  100% { width: 0%; }
}`,
  },
  {
    id: "bars-bounce",
    name: "Bouncing Bars",
    nameAr: "أعمدة نطاطة",
    category: "bars",
    html: `<div class="bars-bounce"><span></span><span></span><span></span></div>`,
    css: `
.bars-bounce {
  display: flex;
  gap: 5px;
  align-items: flex-end;
  height: 40px;
}
.bars-bounce span {
  width: 10px;
  height: 10px;
  background: #6366f1;
  border-radius: 2px;
  animation: bounce-bar 0.6s infinite alternate;
}
.bars-bounce span:nth-child(2) { animation-delay: 0.2s; }
.bars-bounce span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce-bar {
  to { height: 40px; }
}`,
  },
  {
    id: "bars-rotate",
    name: "Rotating Bars",
    nameAr: "أعمدة دوارة",
    category: "bars",
    html: `<div class="bars-rotate"><span></span><span></span><span></span><span></span></div>`,
    css: `
.bars-rotate {
  width: 40px;
  height: 40px;
  position: relative;
  animation: spin 2s linear infinite;
}
.bars-rotate span {
  position: absolute;
  width: 6px;
  height: 16px;
  background: #3b82f6;
  border-radius: 3px;
  left: 50%;
  transform: translateX(-50%);
}
.bars-rotate span:nth-child(1) { top: 0; opacity: 1; }
.bars-rotate span:nth-child(2) { bottom: 0; opacity: 0.7; }
.bars-rotate span:nth-child(3) { top: 50%; left: 0; transform: translateY(-50%) rotate(90deg); opacity: 0.5; }
.bars-rotate span:nth-child(4) { top: 50%; right: 0; left: auto; transform: translateY(-50%) rotate(90deg); opacity: 0.3; }`,
  },
];

export const BAR_LOADERS: LoadingAnimation[] = RAW_BAR_LOADERS.map((l) => ({
  ...l,
  css: namespaceLoadingCss(l.id, l.css),
}));

// ============================================================
// 💀 SKELETON LOADERS (8)
// ============================================================

const RAW_SKELETON_LOADERS: LoadingAnimation[] = [
  {
    id: "skeleton-text",
    name: "Skeleton Text",
    nameAr: "هيكل نص",
    category: "skeleton",
    html: `<div class="skeleton-text"><div></div><div></div><div></div></div>`,
    css: `
.skeleton-text div {
  height: 12px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}
.skeleton-text div:nth-child(1) { width: 100%; }
.skeleton-text div:nth-child(2) { width: 80%; }
.skeleton-text div:nth-child(3) { width: 60%; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`,
  },
  {
    id: "skeleton-card",
    name: "Skeleton Card",
    nameAr: "هيكل بطاقة",
    category: "skeleton",
    html: `<div class="skeleton-card"><div class="img"></div><div class="text"></div><div class="text short"></div></div>`,
    css: `
.skeleton-card {
  width: 200px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.skeleton-card .img {
  width: 100%;
  height: 120px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}
.skeleton-card .text {
  height: 12px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}
.skeleton-card .text.short { width: 60%; }`,
  },
  {
    id: "skeleton-avatar",
    name: "Skeleton Avatar",
    nameAr: "هيكل صورة",
    category: "skeleton",
    html: `<div class="skeleton-avatar"><div class="circle"></div><div class="lines"><div></div><div></div></div></div>`,
    css: `
.skeleton-avatar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.skeleton-avatar .circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-avatar .lines div {
  height: 10px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 6px;
}
.skeleton-avatar .lines div:first-child { width: 120px; }
.skeleton-avatar .lines div:last-child { width: 80px; }`,
  },
  {
    id: "skeleton-image",
    name: "Skeleton Image",
    nameAr: "هيكل صورة",
    category: "skeleton",
    html: `<div class="skeleton-image"></div>`,
    css: `
.skeleton-image {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  position: relative;
}
.skeleton-image::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: #d1d5db;
  border-radius: 4px;
}`,
  },
  {
    id: "skeleton-list",
    name: "Skeleton List",
    nameAr: "هيكل قائمة",
    category: "skeleton",
    html: `<div class="skeleton-list"><div class="item"><div class="circle"></div><div class="line"></div></div><div class="item"><div class="circle"></div><div class="line"></div></div><div class="item"><div class="circle"></div><div class="line"></div></div></div>`,
    css: `
.skeleton-list .item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}
.skeleton-list .circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}
.skeleton-list .line {
  flex: 1;
  height: 12px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}`,
  },
  {
    id: "skeleton-table",
    name: "Skeleton Table",
    nameAr: "هيكل جدول",
    category: "skeleton",
    html: `<div class="skeleton-table"><div class="row header"><span></span><span></span><span></span></div><div class="row"><span></span><span></span><span></span></div><div class="row"><span></span><span></span><span></span></div></div>`,
    css: `
.skeleton-table .row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}
.skeleton-table .row.header { border-bottom: 2px solid #e5e7eb; }
.skeleton-table span {
  flex: 1;
  height: 12px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}`,
  },
  {
    id: "skeleton-button",
    name: "Skeleton Button",
    nameAr: "هيكل زر",
    category: "skeleton",
    html: `<div class="skeleton-button"></div>`,
    css: `
.skeleton-button {
  width: 120px;
  height: 40px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}`,
  },
  {
    id: "skeleton-paragraph",
    name: "Skeleton Paragraph",
    nameAr: "هيكل فقرة",
    category: "skeleton",
    html: `<div class="skeleton-paragraph"><div></div><div></div><div></div><div></div><div></div></div>`,
    css: `
.skeleton-paragraph div {
  height: 10px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}
.skeleton-paragraph div:nth-child(1) { width: 100%; }
.skeleton-paragraph div:nth-child(2) { width: 95%; }
.skeleton-paragraph div:nth-child(3) { width: 100%; }
.skeleton-paragraph div:nth-child(4) { width: 90%; }
.skeleton-paragraph div:nth-child(5) { width: 70%; }`,
  },
];

export const SKELETON_LOADERS: LoadingAnimation[] = RAW_SKELETON_LOADERS.map((l) => ({
  ...l,
  css: namespaceLoadingCss(l.id, l.css),
}));

// ============================================================
// 💫 SPECIAL LOADERS (12)
// ============================================================

const RAW_SPECIAL_LOADERS: LoadingAnimation[] = [
  {
    id: "loader-ripple",
    name: "Ripple",
    nameAr: "تموج",
    category: "special",
    html: `<div class="loader-ripple"><div></div><div></div></div>`,
    css: `
.loader-ripple {
  width: 40px;
  height: 40px;
  position: relative;
}
.loader-ripple div {
  position: absolute;
  inset: 0;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ripple 1.5s infinite ease-out;
}
.loader-ripple div:nth-child(2) { animation-delay: 0.5s; }
@keyframes ripple {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}`,
  },
  {
    id: "loader-heartbeat",
    name: "Heartbeat",
    nameAr: "نبضة قلب",
    category: "special",
    html: `<div class="loader-heartbeat">❤</div>`,
    css: `
.loader-heartbeat {
  font-size: 40px;
  color: #ef4444;
  animation: heartbeat 1s infinite;
}
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.2); }
  50% { transform: scale(1); }
  75% { transform: scale(1.2); }
}`,
  },
  {
    id: "loader-cube",
    name: "3D Cube",
    nameAr: "مكعب ثلاثي الأبعاد",
    category: "special",
    html: `<div class="loader-cube"><div></div></div>`,
    css: `
.loader-cube {
  width: 40px;
  height: 40px;
  perspective: 100px;
}
.loader-cube div {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  animation: cube 1.2s infinite ease-in-out;
}
@keyframes cube {
  0% { transform: rotateX(0) rotateY(0); }
  25% { transform: rotateX(180deg) rotateY(0); }
  50% { transform: rotateX(180deg) rotateY(180deg); }
  75% { transform: rotateX(0) rotateY(180deg); }
  100% { transform: rotateX(0) rotateY(0); }
}`,
  },
  {
    id: "loader-infinity",
    name: "Infinity",
    nameAr: "لانهاية",
    category: "special",
    html: `<div class="loader-infinity"><div></div><div></div></div>`,
    css: `
.loader-infinity {
  width: 60px;
  height: 30px;
  position: relative;
}
.loader-infinity div {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid #3b82f6;
  border-radius: 50%;
  animation: infinity 2s infinite;
}
.loader-infinity div:nth-child(1) { left: 0; animation-direction: normal; }
.loader-infinity div:nth-child(2) { right: 0; animation-direction: reverse; }
@keyframes infinity {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(40px); }
}`,
  },
  {
    id: "loader-hourglass",
    name: "Hourglass",
    nameAr: "ساعة رملية",
    category: "special",
    html: `<div class="loader-hourglass">⏳</div>`,
    css: `
.loader-hourglass {
  font-size: 40px;
  animation: hourglass 2s infinite;
}
@keyframes hourglass {
  0% { transform: rotate(0); }
  50% { transform: rotate(180deg); }
  100% { transform: rotate(180deg); }
}`,
  },
  {
    id: "loader-dna",
    name: "DNA Helix",
    nameAr: "حلزون الحمض النووي",
    category: "special",
    html: `<div class="loader-dna"><span></span><span></span><span></span><span></span><span></span></div>`,
    css: `
.loader-dna {
  display: flex;
  gap: 5px;
  align-items: center;
  height: 40px;
}
.loader-dna span {
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  animation: dna 1s infinite ease-in-out;
}
.loader-dna span:nth-child(1) { animation-delay: 0s; }
.loader-dna span:nth-child(2) { animation-delay: 0.1s; }
.loader-dna span:nth-child(3) { animation-delay: 0.2s; }
.loader-dna span:nth-child(4) { animation-delay: 0.3s; }
.loader-dna span:nth-child(5) { animation-delay: 0.4s; }
@keyframes dna {
  0%, 100% { transform: translateY(-15px); background: #3b82f6; }
  50% { transform: translateY(15px); background: #ec4899; }
}`,
  },
  {
    id: "loader-orbit-dots",
    name: "Orbit Dots",
    nameAr: "نقاط مدارية",
    category: "special",
    html: `<div class="loader-orbit-dots"><span></span><span></span></div>`,
    css: `
.loader-orbit-dots {
  width: 50px;
  height: 50px;
  position: relative;
  animation: spin 2s linear infinite;
}
.loader-orbit-dots span {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;
}
.loader-orbit-dots span:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
.loader-orbit-dots span:nth-child(2) { bottom: 0; left: 50%; transform: translateX(-50%); background: #ec4899; }`,
  },
  {
    id: "loader-atom",
    name: "Atom",
    nameAr: "ذرة",
    category: "special",
    html: `<div class="loader-atom"><div class="nucleus"></div><div class="orbit o1"></div><div class="orbit o2"></div><div class="orbit o3"></div></div>`,
    css: `
.loader-atom {
  width: 50px;
  height: 50px;
  position: relative;
}
.loader-atom .nucleus {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
}
.loader-atom .orbit {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top-color: #3b82f6;
  border-radius: 50%;
}
.loader-atom .o1 { animation: spin 1s linear infinite; }
.loader-atom .o2 { animation: spin 1.5s linear infinite; transform: rotate(60deg); }
.loader-atom .o3 { animation: spin 2s linear infinite; transform: rotate(120deg); }`,
  },
  {
    id: "loader-clock",
    name: "Clock",
    nameAr: "ساعة",
    category: "special",
    html: `<div class="loader-clock"><div class="hand"></div><div class="hand minute"></div></div>`,
    css: `
.loader-clock {
  width: 40px;
  height: 40px;
  border: 3px solid #3b82f6;
  border-radius: 50%;
  position: relative;
}
.loader-clock .hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  width: 2px;
  height: 35%;
  background: #3b82f6;
  transform-origin: bottom center;
  animation: clock-hour 12s linear infinite;
}
.loader-clock .hand.minute {
  height: 45%;
  animation: clock-minute 1s linear infinite;
}
@keyframes clock-hour {
  to { transform: rotate(360deg); }
}
@keyframes clock-minute {
  to { transform: rotate(360deg); }
}`,
  },
  {
    id: "loader-wifi",
    name: "WiFi",
    nameAr: "واي فاي",
    category: "special",
    html: `<div class="loader-wifi"><span></span><span></span><span></span></div>`,
    css: `
.loader-wifi {
  width: 40px;
  height: 40px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.loader-wifi span {
  position: absolute;
  border: 3px solid transparent;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: wifi 1.5s infinite;
}
.loader-wifi span:nth-child(1) { width: 15px; height: 15px; bottom: 0; animation-delay: 0s; }
.loader-wifi span:nth-child(2) { width: 25px; height: 25px; bottom: 0; animation-delay: 0.3s; }
.loader-wifi span:nth-child(3) { width: 35px; height: 35px; bottom: 0; animation-delay: 0.6s; }
@keyframes wifi {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}`,
  },
  {
    id: "loader-battery",
    name: "Battery",
    nameAr: "بطارية",
    category: "special",
    html: `<div class="loader-battery"><div class="level"></div></div>`,
    css: `
.loader-battery {
  width: 50px;
  height: 24px;
  border: 3px solid #3b82f6;
  border-radius: 4px;
  position: relative;
  padding: 2px;
}
.loader-battery::after {
  content: "";
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 10px;
  background: #3b82f6;
  border-radius: 0 2px 2px 0;
}
.loader-battery .level {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  animation: battery 2s infinite;
}
@keyframes battery {
  0% { width: 0%; }
  100% { width: 100%; }
}`,
  },
  {
    id: "loader-pacman",
    name: "Pacman",
    nameAr: "باك مان",
    category: "special",
    html: `<div class="loader-pacman"><div class="pacman"></div><div class="dots"><span></span><span></span><span></span></div></div>`,
    css: `
.loader-pacman {
  display: flex;
  align-items: center;
  gap: 5px;
}
.loader-pacman .pacman {
  width: 30px;
  height: 30px;
  background: #facc15;
  border-radius: 50%;
  position: relative;
  animation: pacman 0.5s infinite;
}
.loader-pacman .pacman::before {
  content: "";
  position: absolute;
  top: 5px;
  right: 12px;
  width: 5px;
  height: 5px;
  background: #000;
  border-radius: 50%;
}
.loader-pacman .dots {
  display: flex;
  gap: 5px;
}
.loader-pacman .dots span {
  width: 8px;
  height: 8px;
  background: #facc15;
  border-radius: 50%;
  animation: pacman-dots 0.5s infinite;
}
.loader-pacman .dots span:nth-child(2) { animation-delay: 0.1s; }
.loader-pacman .dots span:nth-child(3) { animation-delay: 0.2s; }
@keyframes pacman {
  0%, 100% { clip-path: polygon(100% 0, 100% 100%, 50% 50%, 100% 0); }
  50% { clip-path: polygon(100% 50%, 100% 50%, 50% 50%, 100% 50%); }
}
@keyframes pacman-dots {
  0%, 100% { opacity: 1; transform: translateX(0); }
  50% { opacity: 0; transform: translateX(-10px); }
}`,
  },
];

export const SPECIAL_LOADERS: LoadingAnimation[] = RAW_SPECIAL_LOADERS.map((l) => ({
  ...l,
  css: namespaceLoadingCss(l.id, l.css),
}));

// (ALL_LOADING_ANIMATIONS is defined after all loader groups)

// ============================================================
// 🔵 RING LOADERS (8)
// ============================================================

const RAW_RING_LOADERS: LoadingAnimation[] = [
  {
    id: "ring-chase",
    name: "Ring Chase",
    nameAr: "حلقة مطاردة",
    category: "ring",
    html: `<div class="ring-chase"><div></div><div></div><div></div></div>`,
    css: `
.ring-chase {
  width: 40px;
  height: 40px;
  position: relative;
}
.ring-chase div {
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: ring-chase 1.5s infinite;
}
.ring-chase div:nth-child(2) { animation-delay: 0.2s; inset: 4px; }
.ring-chase div:nth-child(3) { animation-delay: 0.4s; inset: 8px; }
@keyframes ring-chase {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}`,
  },
  {
    id: "ring-scale",
    name: "Ring Scale",
    nameAr: "حلقة متغيرة الحجم",
    category: "ring",
    html: `<div class="ring-scale"></div>`,
    css: `
.ring-scale {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ring-scale 1s infinite;
}
@keyframes ring-scale {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.5; }
}`,
  },
  {
    id: "ring-bounce",
    name: "Ring Bounce",
    nameAr: "حلقة نطاطة",
    category: "ring",
    html: `<div class="ring-bounce"></div>`,
    css: `
.ring-bounce {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ring-bounce 0.6s infinite alternate;
}
@keyframes ring-bounce {
  to { transform: translateY(-15px); }
}`,
  },
  {
    id: "ring-morph",
    name: "Ring Morph",
    nameAr: "حلقة متحولة",
    category: "ring",
    html: `<div class="ring-morph"></div>`,
    css: `
.ring-morph {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  animation: ring-morph 1.5s infinite;
}
@keyframes ring-morph {
  0%, 100% { border-radius: 50%; }
  25% { border-radius: 50% 0 50% 0; }
  50% { border-radius: 0; }
  75% { border-radius: 0 50% 0 50%; }
}`,
  },
  {
    id: "ring-fade",
    name: "Ring Fade",
    nameAr: "حلقة متلاشية",
    category: "ring",
    html: `<div class="ring-fade"><div></div><div></div><div></div></div>`,
    css: `
.ring-fade {
  width: 40px;
  height: 40px;
  position: relative;
}
.ring-fade div {
  position: absolute;
  inset: 0;
  border: 3px solid #3b82f6;
  border-radius: 50%;
  animation: ring-fade 1.5s infinite;
}
.ring-fade div:nth-child(2) { animation-delay: 0.5s; }
.ring-fade div:nth-child(3) { animation-delay: 1s; }
@keyframes ring-fade {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}`,
  },
  {
    id: "ring-pulse",
    name: "Ring Pulse",
    nameAr: "حلقة نابضة",
    category: "ring",
    html: `<div class="ring-pulse"></div>`,
    css: `
.ring-pulse {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ring-pulse 1s infinite;
  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
}
@keyframes ring-pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
  100% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
}`,
  },
  {
    id: "ring-dash",
    name: "Ring Dash",
    nameAr: "حلقة متقطعة",
    category: "ring",
    html: `<svg class="ring-dash" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20"></circle></svg>`,
    css: `
.ring-dash {
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;
}
.ring-dash circle {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 75;
}`,
  },
  {
    id: "ring-double-bounce",
    name: "Ring Double Bounce",
    nameAr: "حلقة نطاطة مزدوجة",
    category: "ring",
    html: `<div class="ring-double-bounce"><div></div><div></div></div>`,
    css: `
.ring-double-bounce {
  width: 40px;
  height: 40px;
  position: relative;
}
.ring-double-bounce div {
  position: absolute;
  inset: 0;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: double-bounce 2s infinite ease-in-out;
}
.ring-double-bounce div:nth-child(2) {
  animation-delay: -1s;
}
@keyframes double-bounce {
  0%, 100% { transform: scale(0); }
  50% { transform: scale(1); }
}`,
  },
];

export const RING_LOADERS: LoadingAnimation[] = RAW_RING_LOADERS.map((l) => ({
  ...l,
  css: namespaceLoadingCss(l.id, l.css),
}));

export const ALL_LOADING_ANIMATIONS: LoadingAnimation[] = [
  ...SPINNER_LOADERS,
  ...DOT_LOADERS,
  ...BAR_LOADERS,
  ...SKELETON_LOADERS,
  ...SPECIAL_LOADERS,
  ...RING_LOADERS,
];


export function getLoadingById(id: string): LoadingAnimation | undefined {
  return ALL_LOADING_ANIMATIONS.find((l) => l.id === id);
}

export function getLoadingsByCategory(category: LoadingAnimationCategory): LoadingAnimation[] {
  return ALL_LOADING_ANIMATIONS.filter((l) => l.category === category);
}

export function getAllLoadingCategories(): LoadingAnimationCategory[] {
  return [...new Set(ALL_LOADING_ANIMATIONS.map((l) => l.category))];
}

export function getAllLoadingCSS(): string {
  return ALL_LOADING_ANIMATIONS.map((l) => l.css).join("\n");
}
