/**
 * Each theme's drawings, coloured by its variables (--th-*). They hold still until the
 * motion engine (motion/ThemeMotion.tsx) reads their marks:
 *   data-th-draw    the line draws itself (DrawSVG)
 *   data-th-morph   the shape turns into the path given, and back (MorphSVG)
 *   data-th-float   drifts up and down; data-th-spin turns; data-th-pulse breathes
 *   data-th-dash    a light runs along the line
 * All are decoration: hidden from screen readers.
 */
import type { SvgKit } from "../types";

const A = "var(--th-accent)";
const S = "var(--th-strong)";
const G = "var(--th-glow)";
const L = "var(--th-line)";
const SOFT = "var(--th-soft)";

/* ------------------------------------------------------------ backdrops */

function DecoBackdrop() {
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <g fill="none" stroke={A} strokeWidth="1" opacity=".55">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} data-th-draw="" d={`M600 820 L${120 + i * 160} -20`} opacity={0.35 + (i % 2) * 0.2} />
        ))}
        <circle data-th-draw="" cx="600" cy="820" r="260" />
        <circle data-th-draw="" cx="600" cy="820" r="360" opacity=".6" />
        <rect data-th-draw="" x="40" y="40" width="1120" height="720" />
        <rect data-th-draw="" x="56" y="56" width="1088" height="688" opacity=".5" />
      </g>
    </svg>
  );
}

function CircuitBackdrop() {
  const traces = [
    "M0 120 H220 L260 160 H420 L460 120 H640",
    "M1200 220 H980 L940 260 H760 L720 300 H560",
    "M0 520 H160 L200 480 H380 L420 520 H600 L640 560 H820",
    "M1200 640 H1040 L1000 600 H860",
    "M300 800 V660 L340 620 V500",
    "M900 0 V140 L860 180 V300",
  ];
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <pattern id="th-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke={L} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#th-grid)" opacity=".7" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {traces.map((d, i) => (
          <g key={i}>
            <path d={d} stroke={L} strokeWidth="3" />
            <path data-th-dash="" d={d} stroke={A} strokeWidth="3" strokeDasharray="40 900" />
          </g>
        ))}
      </g>
      {[[640, 120], [560, 300], [820, 560], [860, 600], [340, 500], [860, 300]].map(([x, y], i) => (
        <circle key={i} data-th-pulse="" cx={x} cy={y} r="7" fill={A} />
      ))}
    </svg>
  );
}

function NeonBackdrop() {
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <filter id="th-neon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="th-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={S} stopOpacity="0" />
          <stop offset="1" stopColor={S} stopOpacity=".55" />
        </linearGradient>
      </defs>
      {/* A grid floor running to the horizon. */}
      <g stroke="url(#th-floor)" strokeWidth="1.5" fill="none">
        {Array.from({ length: 13 }, (_, i) => (
          <path key={`v${i}`} d={`M600 470 L${-600 + i * 200} 800`} />
        ))}
        {[490, 520, 560, 615, 690, 790].map((y) => (
          <path key={`h${y}`} d={`M0 ${y} H1200`} />
        ))}
      </g>
      <g filter="url(#th-neon)" fill="none" strokeWidth="3">
        <path data-th-morph="M600 150 L700 230 L660 360 L540 360 L500 230 Z" d="M600 130 L720 210 L720 350 L600 420 L480 350 L480 210 Z" stroke={A} />
        <circle data-th-pulse="" cx="600" cy="280" r="40" stroke={S} />
        <path data-th-draw="" d="M140 170 l40 -40 l40 40 l-40 40 z M1020 130 l30 52 h-60 z" stroke={S} />
      </g>
    </svg>
  );
}

function OrganicBackdrop() {
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <radialGradient id="th-bloom" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={G} stopOpacity=".9" />
          <stop offset="1" stopColor={G} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="880" cy="300" r="380" fill="url(#th-bloom)" />
      <path
        data-th-morph="M860,140 C1010,150 1100,260 1080,400 C1060,540 940,640 800,620 C660,600 560,500 580,360 C600,220 710,130 860,140 Z"
        d="M880,120 C1040,160 1120,300 1060,440 C1000,580 860,650 740,600 C620,550 560,420 600,300 C640,180 740,90 880,120 Z"
        fill={SOFT}
      />
      <path
        data-th-morph="M260,560 C340,520 430,560 440,640 C450,720 370,780 290,760 C210,740 170,660 200,610 C215,585 235,572 260,560 Z"
        d="M240,540 C330,500 440,550 450,640 C460,730 360,790 270,770 C180,750 150,650 180,600 C195,575 215,552 240,540 Z"
        fill={G}
        opacity=".55"
      />
      {[[180, 160, 0], [1040, 700, 40], [520, 90, 80], [1120, 120, 120]].map(([x, y, r], i) => (
        <path key={i} data-th-float="" transform={`translate(${x} ${y}) rotate(${r})`} d="M0 -26 C18 -14 18 14 0 26 C-18 14 -18 -14 0 -26 Z" fill={A} opacity=".35" />
      ))}
    </svg>
  );
}

function CandyBackdrop() {
  const colours = [A, S, G, "var(--th-ink)"];
  const sprinkles = Array.from({ length: 26 }, (_, i) => {
    const x = (i * 137) % 1200;
    const y = (i * 251) % 800;
    return { x, y, r: (i * 47) % 180, c: colours[i % colours.length] };
  });
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      {sprinkles.map((s, i) => (
        <rect key={i} data-th-float="" x={s.x} y={s.y} width="26" height="8" rx="4" fill={s.c} opacity=".55" transform={`rotate(${s.r} ${s.x + 13} ${s.y + 4})`} />
      ))}
      <circle data-th-pulse="" cx="1040" cy="160" r="70" fill={SOFT} />
      <circle data-th-pulse="" cx="140" cy="660" r="90" fill={SOFT} />
    </svg>
  );
}

function PixelBackdrop() {
  // Clouds, coins and stars on an 8-bit grid (every shape on 20-unit steps).
  const cloud = (x: number, y: number) => `M${x} ${y}h60v-20h40v20h40v20h20v20h-180v-20h20z`;
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false" shapeRendering="crispEdges">
      {[[120, 140], [860, 90], [520, 620]].map(([x, y], i) => (
        <path key={i} data-th-float="" d={cloud(x, y)} fill={SOFT} />
      ))}
      {[[300, 220], [980, 320], [180, 520], [1060, 600], [700, 160]].map(([x, y], i) => (
        <g key={i} data-th-pulse="">
          <rect x={x} y={y} width="20" height="20" fill={i % 2 ? A : S} />
          <rect x={x - 20} y={y} width="20" height="20" fill={i % 2 ? A : S} opacity=".5" />
          <rect x={x + 20} y={y} width="20" height="20" fill={i % 2 ? A : S} opacity=".5" />
          <rect x={x} y={y - 20} width="20" height="20" fill={i % 2 ? A : S} opacity=".5" />
          <rect x={x} y={y + 20} width="20" height="20" fill={i % 2 ? A : S} opacity=".5" />
        </g>
      ))}
      <path d="M0 760h1200v40H0z" fill={L} />
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={i * 40} y={740} width="20" height="20" fill={L} />
      ))}
    </svg>
  );
}

function ArenaBackdrop() {
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <linearGradient id="th-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={S} stopOpacity=".55" />
          <stop offset="1" stopColor={S} stopOpacity="0" />
        </linearGradient>
        <pattern id="th-hex" width="56" height="48" patternUnits="userSpaceOnUse">
          <path d="M14 0h28l14 24-14 24H14L0 24z" fill="none" stroke={L} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#th-hex)" opacity=".5" />
      {[[200, -10], [600, 25], [1000, 10]].map(([x, r], i) => (
        <path key={i} data-th-float="" d={`M${x - 30} 0 L${x + 30} 0 L${x + 220} 800 L${x - 220} 800 Z`} fill="url(#th-beam)" transform={`rotate(${r} ${x} 0)`} opacity=".7" />
      ))}
      <path data-th-draw="" d="M80 700 Q600 560 1120 700" fill="none" stroke={A} strokeWidth="3" />
      <path data-th-draw="" d="M140 740 Q600 620 1060 740" fill="none" stroke={S} strokeWidth="2" opacity=".7" />
    </svg>
  );
}

function SynthBackdrop() {
  // A striped sun setting behind mountains, over a grid running to the horizon.
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <linearGradient id="th-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={S} />
          <stop offset="1" stopColor={A} />
        </linearGradient>
        <clipPath id="th-sun-cut">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x="0" y={250 + i * 36 + i * i * 1.5} width="1200" height={30 - i * 3.4} />
          ))}
          <rect x="0" y="0" width="1200" height="250" />
        </clipPath>
      </defs>
      <circle data-th-pulse="" cx="600" cy="420" r="200" fill="url(#th-sun)" clipPath="url(#th-sun-cut)" opacity=".9" />
      <path d="M0 470 L180 360 L300 430 L460 320 L600 440 L760 330 L900 420 L1040 350 L1200 460 V480 H0 Z" fill={SOFT} opacity=".9" />
      <g stroke={A} strokeWidth="1.5" fill="none" opacity=".7">
        {Array.from({ length: 15 }, (_, i) => (
          <path key={`v${i}`} d={`M600 480 L${-800 + i * 200} 800`} />
        ))}
        {[500, 530, 575, 640, 720, 800].map((y) => (
          <path key={`h${y}`} d={`M0 ${y} H1200`} />
        ))}
      </g>
    </svg>
  );
}

function FantasyBackdrop() {
  // Runes on a circle that turns, stars, and a banner on each side.
  const runes = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ"];
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <g data-th-spin="" style={{ transformOrigin: "600px 400px" }} opacity=".55">
        <circle cx="600" cy="400" r="300" fill="none" stroke={A} strokeWidth="1.5" />
        <circle cx="600" cy="400" r="260" fill="none" stroke={L} strokeWidth="1" strokeDasharray="4 10" />
        {runes.map((r, i) => {
          const a = (i / runes.length) * Math.PI * 2;
          return (
            <text key={i} x={600 + Math.sin(a) * 280} y={408 - Math.cos(a) * 280} fontSize="26" textAnchor="middle" fill={S}>
              {r}
            </text>
          );
        })}
      </g>
      {[[160, 140], [1040, 120], [980, 640], [220, 620], [700, 90]].map(([x, y], i) => (
        <path key={i} data-th-pulse="" d={`M${x} ${y - 14} L${x + 4} ${y - 4} L${x + 14} ${y} L${x + 4} ${y + 4} L${x} ${y + 14} L${x - 4} ${y + 4} L${x - 14} ${y} L${x - 4} ${y - 4} Z`} fill={G} />
      ))}
      {[-1, 1].map((side) => (
        <path key={side} data-th-float="" d={side < 0 ? "M60 0 H160 V300 L110 260 L60 300 Z" : "M1040 0 H1140 V300 L1090 260 L1040 300 Z"} fill={SOFT} opacity=".85" />
      ))}
    </svg>
  );
}

function SpaceBackdrop() {
  const stars = Array.from({ length: 60 }, (_, i) => ({ x: (i * 197) % 1200, y: (i * 113) % 800, r: 1 + ((i * 7) % 3) }));
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      {stars.map((s, i) => (
        <circle key={i} data-th-pulse={i % 5 ? undefined : ""} cx={s.x} cy={s.y} r={s.r} fill={i % 7 ? "var(--th-ink)" : S} opacity={0.35 + (i % 4) * 0.15} />
      ))}
      <g fill="none" stroke={A} strokeWidth="1.2" opacity=".6">
        <ellipse data-th-draw="" cx="600" cy="420" rx="460" ry="120" />
        <ellipse data-th-draw="" cx="600" cy="420" rx="320" ry="80" stroke={S} />
      </g>
      <circle data-th-float="" cx="1010" cy="170" r="70" fill={SOFT} />
      <ellipse data-th-float="" cx="1010" cy="170" rx="120" ry="22" fill="none" stroke={G} strokeWidth="6" />
      <circle data-th-float="" cx="170" cy="610" r="40" fill={G} opacity=".8" />
    </svg>
  );
}

function GlitchBackdrop() {
  // Torn scan bars sliding out of place, in the accent and the strong colour.
  const bars = Array.from({ length: 14 }, (_, i) => ({ y: 40 + i * 56 + ((i * 37) % 23), w: 120 + ((i * 173) % 520), x: (i * 211) % 900, h: 4 + ((i * 5) % 14) }));
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false" shapeRendering="crispEdges">
      {bars.map((b, i) => (
        <rect key={i} data-th-float={i % 3 ? undefined : ""} x={b.x} y={b.y} width={b.w} height={b.h} fill={i % 2 ? A : S} opacity={0.18 + (i % 4) * 0.12} />
      ))}
      <g opacity=".55">
        <rect data-th-pulse="" x="880" y="120" width="220" height="140" fill="none" stroke={A} strokeWidth="2" />
        <rect x="888" y="128" width="220" height="140" fill="none" stroke={S} strokeWidth="2" />
        <rect data-th-pulse="" x="90" y="560" width="160" height="100" fill="none" stroke={S} strokeWidth="2" />
      </g>
    </svg>
  );
}

function ZenBackdrop() {
  // An ink circle (ensō) drawing itself, bamboo stems, and a few falling leaves.
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <path data-th-draw="" d="M820 160 C980 150 1060 300 1020 420 C980 540 820 590 700 520 C590 455 590 300 680 220" fill="none" stroke={S} strokeWidth="26" strokeLinecap="round" opacity=".22" />
      {[90, 150, 1110].map((x, i) => (
        <g key={x} opacity=".35">
          <path d={`M${x} 800 V${120 + i * 60}`} stroke={A} strokeWidth={i === 1 ? 10 : 14} />
          {[300, 470, 640].map((y) => (
            <path key={y} d={`M${x - 9} ${y} H${x + 9}`} stroke={L} strokeWidth="4" />
          ))}
        </g>
      ))}
      {[[380, 120], [560, 260], [300, 420]].map(([x, y], i) => (
        <path key={i} data-th-float="" transform={`translate(${x} ${y}) rotate(${i * 40})`} d="M0 -18 C12 -6 12 6 0 18 C-12 6 -12 -6 0 -18 Z" fill={G} opacity=".5" />
      ))}
    </svg>
  );
}

function FrostBackdrop() {
  const flake = (x: number, y: number, r: number) =>
    [0, 60, 120].map((a) => `M${x + Math.cos((a * Math.PI) / 180) * r} ${y + Math.sin((a * Math.PI) / 180) * r} L${x - Math.cos((a * Math.PI) / 180) * r} ${y - Math.sin((a * Math.PI) / 180) * r}`).join(" ");
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      {[[140, 140, 26], [1040, 120, 34], [980, 620, 22], [260, 640, 30], [640, 80, 18], [760, 700, 16]].map(([x, y, r], i) => (
        <path key={i} data-th-float="" d={flake(x, y, r)} stroke={A} strokeWidth="3" strokeLinecap="round" opacity=".7" />
      ))}
      {/* Ice crystals rising from the floor. */}
      <path d="M0 800 L60 640 L110 760 L170 600 L230 780 L300 680 L360 800 Z M840 800 L900 690 L950 790 L1030 610 L1090 760 L1150 660 L1200 800 Z" fill={SOFT} opacity=".8" />
      <path data-th-draw="" d="M60 640 L110 760 M170 600 L230 780 M1030 610 L1090 760" stroke={G} strokeWidth="2" fill="none" />
    </svg>
  );
}

function EmberBackdrop() {
  const sparks = Array.from({ length: 28 }, (_, i) => ({ x: (i * 157) % 1200, y: 300 + ((i * 89) % 480), r: 2 + (i % 4) }));
  return (
    <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
      <defs>
        <linearGradient id="th-heat" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={A} stopOpacity=".55" />
          <stop offset="1" stopColor={A} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="420" width="1200" height="380" fill="url(#th-heat)" />
      {/* Glowing cracks in dark rock. */}
      <path data-th-draw="" d="M0 700 L160 660 L240 720 L380 650 L470 700 L620 640 L760 710 L880 660 L1020 720 L1200 670" fill="none" stroke={S} strokeWidth="3" />
      <path data-th-draw="" d="M240 720 L270 800 M620 640 L600 560 M880 660 L920 800" fill="none" stroke={A} strokeWidth="2" />
      {sparks.map((s, i) => (
        <circle key={i} data-th-float="" cx={s.x} cy={s.y} r={s.r} fill={i % 3 ? S : A} opacity=".8" />
      ))}
    </svg>
  );
}

export function Backdrop({ kit }: { kit: SvgKit }) {
  if (kit === "glitch") return <GlitchBackdrop />;
  if (kit === "zen") return <ZenBackdrop />;
  if (kit === "frost") return <FrostBackdrop />;
  if (kit === "ember") return <EmberBackdrop />;
  if (kit === "synth") return <SynthBackdrop />;
  if (kit === "fantasy") return <FantasyBackdrop />;
  if (kit === "space") return <SpaceBackdrop />;
  if (kit === "pixel") return <PixelBackdrop />;
  if (kit === "arena") return <ArenaBackdrop />;
  if (kit === "deco") return <DecoBackdrop />;
  if (kit === "circuit") return <CircuitBackdrop />;
  if (kit === "neon") return <NeonBackdrop />;
  if (kit === "organic") return <OrganicBackdrop />;
  return <CandyBackdrop />;
}

/* ------------------------------------------------------------- dividers */

export function Divider({ kit }: { kit: SvgKit }) {
  if (kit === "glitch")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false" shapeRendering="crispEdges">
        <rect x="0" y="16" width="1200" height="4" fill={A} />
        <rect data-th-float="" x="420" y="10" width="260" height="6" fill={S} />
        <rect x="760" y="22" width="120" height="6" fill={A} opacity=".6" />
      </svg>
    );
  if (kit === "zen")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <path data-th-draw="" d="M200 22 C400 14 800 30 1000 20" stroke={S} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".5" />
      </svg>
    );
  if (kit === "frost")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <path d="M0 0 H1200 V14 L1140 30 L1080 14 L1020 34 L960 14 L900 28 L840 14 L780 32 L720 14 L660 30 L600 14 L540 34 L480 14 L420 28 L360 14 L300 32 L240 14 L180 30 L120 14 L60 34 L0 14 Z" fill={SOFT} />
      </svg>
    );
  if (kit === "ember")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <path data-th-draw="" d="M0 24 L200 18 L320 28 L480 16 L620 26 L780 14 L920 26 L1060 18 L1200 24" fill="none" stroke={A} strokeWidth="3" />
      </svg>
    );
  if (kit === "synth")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        {[6, 16, 24, 30].map((y, i) => (
          <path key={y} d={`M0 ${y} H1200`} stroke={i % 2 ? A : S} strokeWidth={4 - i} opacity={1 - i * 0.2} />
        ))}
      </svg>
    );
  if (kit === "fantasy")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <path data-th-draw="" d="M0 20 H540 M660 20 H1200" stroke={A} strokeWidth="1.5" fill="none" />
        <path d="M600 4 L612 20 L600 36 L588 20 Z M570 20 l8 -6 l8 6 l-8 6 z M614 20 l8 -6 l8 6 l-8 6 z" fill={S} />
      </svg>
    );
  if (kit === "space")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <path data-th-dash="" d="M0 20 Q600 -10 1200 20" fill="none" stroke={A} strokeWidth="2" strokeDasharray="6 14" />
        <circle cx="600" cy="12" r="6" fill={S} />
      </svg>
    );
  if (kit === "pixel")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false" shapeRendering="crispEdges">
        {Array.from({ length: 30 }, (_, i) => (
          <rect key={i} x={i * 40} y={i % 2 ? 20 : 0} width="40" height="20" fill={i % 3 ? L : A} />
        ))}
      </svg>
    );
  if (kit === "arena")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <path data-th-draw="" d="M0 20 H520 L540 6 H660 L680 20 H1200" fill="none" stroke={A} strokeWidth="2" />
        <path d="M560 14 h80 v12 h-80 z" fill={S} />
      </svg>
    );
  if (kit === "deco")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <g fill="none" stroke={A} strokeWidth="1">
          <path data-th-draw="" d="M0 20 H540 M660 20 H1200" />
          <path data-th-draw="" d="M560 20 L600 4 L640 20 L600 36 Z" />
        </g>
      </svg>
    );
  if (kit === "circuit")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <path d="M0 20 H400 L420 8 H780 L800 20 H1200" fill="none" stroke={L} strokeWidth="2" />
        <path data-th-dash="" d="M0 20 H400 L420 8 H780 L800 20 H1200" fill="none" stroke={A} strokeWidth="2" strokeDasharray="60 1400" />
      </svg>
    );
  if (kit === "neon")
    return (
      <svg className="th-divider" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden focusable="false">
        <path data-th-draw="" d="M0 20 H480 L500 6 L520 34 L540 6 L560 34 L580 20 H1200" fill="none" stroke={A} strokeWidth="2" />
      </svg>
    );
  if (kit === "organic")
    return (
      <svg className="th-divider th-divider-wave" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden focusable="false">
        <path data-th-morph="M0 30 C200 0 400 60 600 30 C800 0 1000 60 1200 30 V60 H0 Z" d="M0 30 C200 60 400 0 600 30 C800 60 1000 0 1200 30 V60 H0 Z" fill={SOFT} />
      </svg>
    );
  return (
    <svg className="th-divider th-divider-wave" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden focusable="false">
      <path
        data-th-morph="M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20 V60 H0 Z"
        d="M0 20 Q50 40 100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20 V60 H0 Z"
        fill={SOFT}
      />
    </svg>
  );
}

/* ------------------------------------------- the opening's own drawing */

/** What the opening shows when the store hasn't picked a picture. */
export function HeroArt({ kit }: { kit: SvgKit }) {
  if (kit === "circuit")
    return (
      <svg className="th-hero-art" viewBox="0 0 400 400" aria-hidden focusable="false">
        <rect x="110" y="40" width="180" height="320" rx="34" fill="var(--th-surface)" stroke={S} strokeWidth="3" />
        <rect x="126" y="70" width="148" height="250" rx="18" fill={SOFT} />
        <circle cx="200" cy="340" r="8" fill={A} />
        <path data-th-draw="" d="M150 130 H250 M150 160 H230 M150 190 H210" stroke={A} strokeWidth="6" strokeLinecap="round" />
        <circle data-th-pulse="" cx="200" cy="250" r="34" fill="none" stroke={A} strokeWidth="4" />
      </svg>
    );
  if (kit === "neon")
    return (
      <svg className="th-hero-art" viewBox="0 0 400 400" aria-hidden focusable="false">
        <g fill="none" stroke={A} strokeWidth="5" strokeLinejoin="round">
          <path data-th-draw="" d="M90 200 C90 140 130 120 170 140 H230 C270 120 310 140 310 200 C310 270 280 300 250 270 L230 250 H170 L150 270 C120 300 90 270 90 200 Z" />
          <path data-th-draw="" d="M140 190 H180 M160 170 V210" stroke={S} />
        </g>
        <circle data-th-pulse="" cx="245" cy="180" r="10" fill={S} />
        <circle data-th-pulse="" cx="270" cy="205" r="10" fill={A} />
      </svg>
    );
  if (kit === "organic")
    return (
      <svg className="th-hero-art" viewBox="0 0 400 400" aria-hidden focusable="false">
        <path data-th-morph="M200,40 C290,40 350,110 340,200 C330,300 270,360 190,350 C110,340 50,280 60,190 C70,100 120,40 200,40 Z" d="M210,50 C300,60 360,130 340,220 C320,310 250,370 170,350 C90,330 50,250 70,170 C90,90 140,40 210,50 Z" fill={SOFT} />
        <rect x="165" y="150" width="70" height="150" rx="16" fill="var(--th-surface)" stroke={S} strokeWidth="3" />
        <rect x="178" y="110" width="44" height="44" rx="8" fill={A} />
      </svg>
    );
  if (kit === "candy")
    return (
      <svg className="th-hero-art" viewBox="0 0 400 400" aria-hidden focusable="false">
        <path d="M80 220 H320 L300 330 H100 Z" fill={SOFT} stroke="var(--th-ink)" strokeWidth="5" strokeLinejoin="round" />
        <path data-th-morph="M80 220 C80 150 140 120 200 120 C260 120 320 150 320 220 Z" d="M80 220 C90 140 150 110 200 110 C250 110 310 140 320 220 Z" fill={A} stroke="var(--th-ink)" strokeWidth="5" />
        <circle data-th-float="" cx="200" cy="100" r="22" fill={S} stroke="var(--th-ink)" strokeWidth="5" />
      </svg>
    );
  return (
    <svg className="th-hero-art" viewBox="0 0 400 400" aria-hidden focusable="false">
      <g fill="none" stroke={A} strokeWidth="2">
        <path data-th-draw="" d="M200 40 C150 90 150 150 170 190 L120 360 H280 L230 190 C250 150 250 90 200 40 Z" />
        <path data-th-draw="" d="M150 250 H250" />
      </g>
    </svg>
  );
}
