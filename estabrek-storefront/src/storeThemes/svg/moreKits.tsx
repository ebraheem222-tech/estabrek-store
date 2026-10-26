/**
 * The drawings of the themes for every kind of store (kits.tsx has the first ones and the
 * gaming ones): brush strokes, ink and pages, silk and thread, cut stones, sound waves,
 * leaves, steam, paws, a running track, records, Arabic geometry, clouds, plain lines.
 * The same marks move them (data-th-draw, -morph, -float, -spin, -pulse, -dash; kits.tsx).
 */
import type { ReactNode } from "react";
import type { SvgKit } from "../types";

const A = "var(--th-accent)";
const S = "var(--th-strong)";
const G = "var(--th-glow)";
const L = "var(--th-line)";
const SOFT = "var(--th-soft)";
const INK = "var(--th-ink)";
const SURFACE = "var(--th-surface)";

type Kit = Exclude<SvgKit, "deco" | "circuit" | "neon" | "organic" | "candy" | "pixel" | "arena" | "synth" | "fantasy" | "space" | "glitch" | "zen" | "frost" | "ember">;

const Back = ({ children }: { children: ReactNode }) => (
  <svg className="th-backdrop" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false">
    {children}
  </svg>
);
const Line = ({ children, h = 40, wave = false }: { children: ReactNode; h?: number; wave?: boolean }) => (
  <svg className={wave ? "th-divider th-divider-wave" : "th-divider"} viewBox={`0 0 1200 ${h}`} preserveAspectRatio="none" aria-hidden focusable="false">
    {children}
  </svg>
);
const Art = ({ children }: { children: ReactNode }) => (
  <svg className="th-hero-art" viewBox="0 0 400 400" aria-hidden focusable="false">
    {children}
  </svg>
);

/** An eight-pointed star (two squares), the base of the Arabic geometry. */
const star8 = (cx: number, cy: number, r: number) => {
  const pt = (a: number) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  const sq = (o: number) => `M${[0, 1, 2, 3].map((i) => pt(o + (i * Math.PI) / 2)).join(" L")} Z`;
  return `${sq(0)} ${sq(Math.PI / 4)}`;
};
/** A four-pointed sparkle. */
const sparkle = (x: number, y: number, r: number) => `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;
/** A paw print: pad and four toes. */
const Paw = ({ x, y, r = 1, rot = 0, fill = A, ...rest }: { x: number; y: number; r?: number; rot?: number; fill?: string; [k: string]: unknown }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${r})`} fill={fill} {...rest}>
    <ellipse cx="0" cy="10" rx="16" ry="13" />
    <ellipse cx="-17" cy="-10" rx="6" ry="8" />
    <ellipse cx="-6" cy="-19" rx="6" ry="8" />
    <ellipse cx="6" cy="-19" rx="6" ry="8" />
    <ellipse cx="17" cy="-10" rx="6" ry="8" />
  </g>
);
/** A soft cloud. */
const cloud = (x: number, y: number, s: number) =>
  `M${x} ${y} a${30 * s} ${30 * s} 0 0 1 ${50 * s} ${-28 * s} a${42 * s} ${42 * s} 0 0 1 ${78 * s} ${-6 * s} a${30 * s} ${30 * s} 0 0 1 ${40 * s} ${34 * s} a${22 * s} ${22 * s} 0 0 1 ${-8 * s} ${42 * s} H${x + 4 * s} a${22 * s} ${22 * s} 0 0 1 ${-4 * s} ${-42 * s} Z`;

/* ------------------------------------------------------------ backdrops */

const BACKDROPS: Record<Kit, () => ReactNode> = {
  brush: () => (
    <Back>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path data-th-draw="" d="M-40 640 C200 520 420 700 640 560 S1000 420 1260 520" stroke={A} strokeWidth="90" opacity=".22" />
        <path data-th-draw="" d="M80 160 C300 90 520 220 760 140 S1080 60 1240 120" stroke={G} strokeWidth="60" opacity=".35" />
        <path data-th-draw="" d="M920 760 C980 600 1080 520 1240 470" stroke={S} strokeWidth="28" opacity=".3" />
      </g>
      {[[220, 300, 14], [980, 260, 22], [700, 700, 10], [140, 520, 8], [1080, 640, 12], [520, 120, 9]].map(([x, y, r], i) => (
        <circle key={i} data-th-float="" cx={x} cy={y} r={r} fill={i % 2 ? A : S} opacity=".45" />
      ))}
    </Back>
  ),
  ink: () => (
    <Back>
      <g stroke={L} strokeWidth="1">
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M0 ${70 + i * 46} H1200`} opacity=".6" />
        ))}
      </g>
      <path d="M150 0 V800" stroke={A} strokeWidth="1.5" opacity=".35" />
      <path data-th-draw="" d="M260 560 C360 420 520 470 560 380 C600 290 520 220 460 280 C400 340 520 420 640 400 C780 380 860 260 1000 300" fill="none" stroke={S} strokeWidth="3" strokeLinecap="round" opacity=".55" />
      {[[1040, 300, 9], [1070, 330, 5], [300, 600, 6]].map(([x, y, r], i) => (
        <circle key={i} data-th-float="" cx={x} cy={y} r={r} fill={INK} opacity=".35" />
      ))}
    </Back>
  ),
  silk: () => (
    <Back>
      <defs>
        <linearGradient id="th-silk-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={G} stopOpacity=".85" />
          <stop offset="1" stopColor={SOFT} stopOpacity=".2" />
        </linearGradient>
      </defs>
      <path
        data-th-morph="M-20 300 C220 180 420 420 660 300 C880 190 1040 320 1220 220 V420 C1040 520 880 380 660 500 C420 620 220 380 -20 500 Z"
        d="M-20 260 C240 220 420 360 660 260 C900 160 1040 360 1220 260 V460 C1040 560 880 400 660 520 C420 640 240 420 -20 460 Z"
        fill="url(#th-silk-a)"
      />
      <path data-th-draw="" d="M60 720 C260 640 380 700 520 660 S820 560 1140 640" fill="none" stroke={A} strokeWidth="2" strokeDasharray="10 8" />
      <path data-th-float="" d="M1100 120 l70 -70 M1170 50 l-8 18 l-10 -10 z" stroke={S} strokeWidth="3" fill={S} />
    </Back>
  ),
  facet: () => (
    <Back>
      <g fill="none" stroke={A} strokeWidth="1" opacity=".5">
        <path data-th-draw="" d="M600 80 L860 300 L600 760 L340 300 Z M340 300 H860 M470 300 L600 80 L730 300 M470 300 L600 760 L730 300" />
        <path data-th-draw="" d="M120 520 L240 420 L360 520 L240 720 Z M120 520 H360" opacity=".7" />
        <path data-th-draw="" d="M900 600 L990 520 L1080 600 L990 760 Z M900 600 H1080" opacity=".7" />
      </g>
      {[[320, 160, 18], [940, 200, 24], [1080, 420, 14], [180, 320, 12], [760, 680, 16]].map(([x, y, r], i) => (
        <path key={i} data-th-pulse="" d={sparkle(x, y, r)} fill={i % 2 ? S : G} />
      ))}
    </Back>
  ),
  wave: () => (
    <Back>
      <g fill="none" strokeLinecap="round">
        {[0, 1, 2, 3].map((i) => {
          const d = `M0 ${400 + i * 18} C150 ${300 - i * 30} 300 ${500 + i * 30} 450 ${400 + i * 10} S750 ${280 - i * 20} 900 ${400 - i * 6} S1100 ${520 + i * 18} 1200 ${400 + i * 12}`;
          return (
            <g key={i}>
              <path d={d} stroke={L} strokeWidth="2" />
              <path data-th-dash="" d={d} stroke={i % 2 ? S : A} strokeWidth="2.5" strokeDasharray="90 1300" opacity={1 - i * 0.18} />
            </g>
          );
        })}
      </g>
      {[120, 200, 280].map((r, i) => (
        <circle key={r} data-th-pulse="" cx="1040" cy="160" r={r / 2} fill="none" stroke={A} strokeWidth="2" opacity={0.5 - i * 0.12} />
      ))}
      <g fill={G} opacity=".5">
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} data-th-float="" x={80 + i * 26} y={700 - ((i * 53) % 90)} width="12" height={30 + ((i * 53) % 90)} rx="6" />
        ))}
      </g>
    </Back>
  ),
  botanic: () => (
    <Back>
      <g fill={G} opacity=".55">
        <path data-th-float="" d="M980 120 C1120 160 1180 300 1120 420 C1000 380 940 260 980 120 Z" />
        <path data-th-float="" d="M160 520 C280 470 380 540 400 660 C270 690 180 640 160 520 Z" />
      </g>
      <g fill="none" stroke={A} strokeWidth="2.5" strokeLinecap="round">
        <path data-th-draw="" d="M1000 140 C1060 260 1090 340 1110 420" />
        <path data-th-draw="" d="M60 800 C120 640 160 520 260 420 C340 340 420 320 500 300" />
        <path data-th-draw="" d="M160 600 c-40 -20 -60 -60 -40 -100 c40 20 60 60 40 100 Z M220 500 c-30 -30 -30 -70 0 -100 c30 30 30 70 0 100 Z M320 400 c-10 -40 10 -80 50 -90 c10 40 -10 80 -50 90 Z" />
      </g>
      <g data-th-spin="">
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx="820" cy="610" rx="18" ry="34" fill={S} opacity=".55" transform={`rotate(${i * 72} 820 640)`} />
        ))}
        <circle cx="820" cy="640" r="12" fill={A} />
      </g>
    </Back>
  ),
  steam: () => (
    <Back>
      <g fill="none" stroke={A} strokeWidth="3" strokeLinecap="round" opacity=".45">
        {[220, 560, 900].map((x, i) => (
          <path key={x} data-th-draw="" d={`M${x} 760 C${x - 60} 660 ${x + 60} 600 ${x} 500 C${x - 60} 400 ${x + 60} 340 ${x} 240`} opacity={1 - i * 0.2} />
        ))}
      </g>
      {[[120, 180, 20], [1060, 260, -30], [760, 120, 50], [380, 640, 10], [1120, 660, 70], [640, 420, -20]].map(([x, y, r], i) => (
        <g key={i} data-th-float="" transform={`translate(${x} ${y}) rotate(${r})`}>
          <ellipse rx="22" ry="32" fill={S} opacity=".5" />
          <path d="M0 -26 C-8 -8 8 8 0 26" stroke={SOFT} strokeWidth="3" fill="none" />
        </g>
      ))}
    </Back>
  ),
  paw: () => (
    <Back>
      {[[140, 680, -20], [260, 590, -10], [360, 500, 0], [470, 430, 10], [580, 340, 20], [700, 280, 25], [820, 200, 30], [960, 150, 35]].map(([x, y, r], i) => (
        <Paw key={i} x={x} y={y} r={1.6} rot={r} fill={i % 2 ? A : G} opacity=".4" data-th-pulse="" />
      ))}
      {[[1040, 560, -20], [200, 220, 30]].map(([x, y, r], i) => (
        <path key={i} data-th-float="" transform={`translate(${x} ${y}) rotate(${r})`} d="M-50 -10 a14 14 0 1 1 10 -18 h80 a14 14 0 1 1 10 18 a14 14 0 1 1 -10 18 h-80 a14 14 0 1 1 -10 -18 z" fill={S} opacity=".35" />
      ))}
    </Back>
  ),
  track: () => (
    <Back>
      <g fill="none" stroke={A} strokeWidth="3" opacity=".35">
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M-40 ${520 + i * 60} C300 ${380 + i * 60} 900 ${380 + i * 60} 1240 ${520 + i * 60}`} />
        ))}
      </g>
      <path data-th-dash="" d="M-40 640 C300 500 900 500 1240 640" fill="none" stroke={S} strokeWidth="5" strokeDasharray="120 1600" />
      <g stroke={G} strokeWidth="6" strokeLinecap="round" opacity=".6">
        {[[760, 140, 1040], [820, 190, 1100], [700, 240, 960], [860, 290, 1160]].map(([x1, y, x2], i) => (
          <path key={i} data-th-draw="" d={`M${x1} ${y} H${x2}`} />
        ))}
      </g>
      <text x="80" y="300" fontSize="220" fontWeight="800" fill={SOFT} opacity=".6" fontFamily="var(--th-display)">
        01
      </text>
    </Back>
  ),
  vinyl: () => (
    <Back>
      <g data-th-spin="">
        <circle cx="980" cy="420" r="300" fill={INK} opacity=".08" />
        {[260, 220, 180, 140].map((r) => (
          <circle key={r} cx="980" cy="420" r={r} fill="none" stroke={L} strokeWidth="2" />
        ))}
        <circle cx="980" cy="420" r="80" fill={A} opacity=".22" />
        <path d="M980 340 A80 80 0 0 1 1060 420" stroke={SURFACE} strokeWidth="6" fill="none" opacity=".6" />
      </g>
      <g fill={S} opacity=".55">
        {[[160, 220], [320, 140], [260, 520], [560, 260]].map(([x, y], i) => (
          <g key={i} data-th-float="" transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="40" rx="18" ry="13" transform="rotate(-20 0 40)" />
            <rect x="14" y="-40" width="5" height="80" />
            {i % 2 ? <path d="M19 -40 q30 10 30 40 q-10 -20 -30 -20 z" /> : null}
          </g>
        ))}
      </g>
    </Back>
  ),
  arabesque: () => (
    <Back>
      <defs>
        <pattern id="th-arabesque" width="160" height="160" patternUnits="userSpaceOnUse">
          <path d={star8(80, 80, 46)} fill="none" stroke={L} strokeWidth="1.5" />
          <path d={star8(0, 0, 46)} fill="none" stroke={L} strokeWidth="1.5" />
          <path d={star8(160, 0, 46)} fill="none" stroke={L} strokeWidth="1.5" />
          <path d={star8(0, 160, 46)} fill="none" stroke={L} strokeWidth="1.5" />
          <path d={star8(160, 160, 46)} fill="none" stroke={L} strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#th-arabesque)" opacity=".8" />
      <path data-th-draw="" d="M820 800 V360 C820 220 920 140 1000 100 C1080 140 1180 220 1180 360 V800" fill="none" stroke={A} strokeWidth="3" opacity=".35" />
      <path data-th-draw="" d={star8(1000, 210, 38)} fill="none" stroke={S} strokeWidth="2" opacity=".45" />
      <path data-th-pulse="" d={star8(200, 160, 30)} fill={G} opacity=".6" />
    </Back>
  ),
  cloud: () => (
    <Back>
      {[[80, 200, 1.4], [860, 160, 1.8], [500, 640, 1.2], [1000, 620, 1], [260, 520, 0.8]].map(([x, y, s], i) => (
        <path key={i} data-th-float="" d={cloud(x, y, s)} fill={i % 2 ? SOFT : G} opacity=".75" />
      ))}
      {[[640, 120], [380, 300], [1120, 380], [180, 720], [760, 420]].map(([x, y], i) => (
        <path key={i} data-th-pulse="" d={sparkle(x, y, 14)} fill={i % 2 ? A : S} />
      ))}
      <path data-th-float="" d="M1080 120 a60 60 0 1 0 50 90 a48 48 0 1 1 -50 -90 z" fill={S} opacity=".6" />
    </Back>
  ),
  mono: () => (
    <Back>
      <g stroke={L} strokeWidth="1">
        {Array.from({ length: 7 }, (_, i) => (
          <path key={`v${i}`} d={`M${i * 200} 0 V800`} />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <path key={`h${i}`} d={`M0 ${i * 200} H1200`} />
        ))}
      </g>
      <circle data-th-draw="" cx="900" cy="300" r="220" fill="none" stroke={INK} strokeWidth="1.5" />
      <rect data-th-float="" x="180" y="520" width="80" height="80" fill={A} />
    </Back>
  ),
};

/* ------------------------------------------------------------- dividers */

const DIVIDERS: Record<Kit, () => ReactNode> = {
  brush: () => (
    <Line h={50}>
      <path data-th-draw="" d="M40 28 C300 10 500 40 760 22 S1100 18 1160 26" fill="none" stroke={A} strokeWidth="14" strokeLinecap="round" opacity=".7" />
    </Line>
  ),
  ink: () => (
    <Line>
      <path data-th-draw="" d="M100 20 H540 M660 20 H1100" stroke={A} strokeWidth="1" fill="none" />
      <path d="M600 8 C590 14 590 26 600 32 C610 26 610 14 600 8 Z M568 20 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M620 20 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0" fill={S} />
    </Line>
  ),
  silk: () => (
    <Line>
      <path data-th-draw="" d="M0 20 C200 8 400 32 600 20 S1000 8 1200 20" fill="none" stroke={A} strokeWidth="1.5" strokeDasharray="12 8" />
    </Line>
  ),
  facet: () => (
    <Line>
      <path d="M0 20 H560 M640 20 H1200" stroke={L} strokeWidth="1" />
      <path data-th-pulse="" d="M600 6 L616 20 L600 34 L584 20 Z" fill={A} />
      <path data-th-pulse="" d={sparkle(650, 12, 6)} fill={S} />
    </Line>
  ),
  wave: () => (
    <Line>
      <path
        data-th-draw=""
        d={`M0 20 ${Array.from({ length: 60 }, (_, i) => `L${i * 20 + 10} ${20 + (i % 2 ? -1 : 1) * (4 + ((i * 7) % 12))}`).join(" ")} L1200 20`}
        fill="none"
        stroke={A}
        strokeWidth="2"
      />
    </Line>
  ),
  botanic: () => (
    <Line h={50}>
      <path data-th-draw="" d="M0 30 C300 10 600 46 900 24 S1150 20 1200 30" fill="none" stroke={A} strokeWidth="2" />
      {[200, 420, 640, 860, 1060].map((x, i) => (
        <path key={x} d={`M${x} ${26 + (i % 2) * 4} c-14 -16 -10 -24 6 -26 c4 12 2 20 -6 26 z`} fill={G} />
      ))}
    </Line>
  ),
  steam: () => (
    <Line>
      <path data-th-draw="" d="M0 20 Q50 0 100 20 T200 20 T300 20 T400 20 T500 20 T600 20 T700 20 T800 20 T900 20 T1000 20 T1100 20 T1200 20" fill="none" stroke={A} strokeWidth="2" opacity=".6" />
    </Line>
  ),
  paw: () => (
    <Line>
      <path d="M0 20 H1200" stroke={L} strokeWidth="2" strokeDasharray="2 14" strokeLinecap="round" />
      <Paw x={600} y={22} r={0.6} fill={A} />
    </Line>
  ),
  track: () => (
    <Line>
      {[8, 20, 32].map((y, i) => (
        <path key={y} d={`M0 ${y} H1200`} stroke={i === 1 ? A : L} strokeWidth={i === 1 ? 3 : 1.5} strokeDasharray={i === 1 ? "60 30" : undefined} />
      ))}
    </Line>
  ),
  vinyl: () => (
    <Line h={44}>
      {[6, 14, 22, 30, 38].map((y) => (
        <path key={y} d={`M0 ${y} H1200`} stroke={L} strokeWidth="1" />
      ))}
      {[180, 420, 700, 960].map((x, i) => (
        <ellipse key={x} cx={x} cy={i % 2 ? 26 : 18} rx="7" ry="5" fill={A} />
      ))}
    </Line>
  ),
  arabesque: () => (
    <Line>
      <path d="M0 20 H1200" stroke={L} strokeWidth="1" />
      {[300, 600, 900].map((x) => (
        <path key={x} data-th-pulse="" d={star8(x, 20, 12)} fill={x === 600 ? A : G} />
      ))}
    </Line>
  ),
  cloud: () => (
    <Line h={60} wave>
      <path d={`M0 60 V30 ${Array.from({ length: 12 }, (_, i) => `a50 30 0 0 1 100 0`).join(" ")} V60 Z`} fill={SOFT} />
    </Line>
  ),
  mono: () => (
    <Line>
      <path d="M0 20 H1200" stroke={L} strokeWidth="1" />
      <circle data-th-pulse="" cx="600" cy="20" r="4" fill={A} />
    </Line>
  ),
};

/* ------------------------------------------- the opening's own drawing */

const ART: Record<Kit, () => ReactNode> = {
  brush: () => (
    <Art>
      <g stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none">
        <path data-th-draw="" d="M200 80 L120 370 M200 80 L280 370 M200 80 V360 M150 300 H250" />
      </g>
      <rect x="110" y="110" width="180" height="150" fill={SURFACE} stroke={INK} strokeWidth="5" />
      <circle data-th-pulse="" cx="160" cy="170" r="32" fill={A} />
      <path data-th-draw="" d="M130 230 C180 190 220 250 270 200" stroke={S} strokeWidth="10" strokeLinecap="round" fill="none" />
    </Art>
  ),
  ink: () => (
    <Art>
      <path d="M200 120 C150 100 90 100 50 120 V320 C90 300 150 300 200 320 C250 300 310 300 350 320 V120 C310 100 250 100 200 120 Z" fill={SURFACE} stroke={INK} strokeWidth="4" />
      <path d="M200 120 V320" stroke={INK} strokeWidth="3" />
      <g stroke={L} strokeWidth="4" strokeLinecap="round">
        {[160, 190, 220, 250].map((y) => (
          <path key={y} data-th-draw="" d={`M80 ${y} H170 M230 ${y} H320`} />
        ))}
      </g>
      <path data-th-float="" d="M300 40 C340 60 350 110 320 150 L250 260 L270 150 C280 110 280 70 300 40 Z" fill={A} />
    </Art>
  ),
  silk: () => (
    <Art>
      <path data-th-draw="" d="M150 60 C130 120 140 160 160 200 C120 250 110 300 120 330 H280 C290 300 280 250 240 200 C260 160 270 120 250 60 C230 80 170 80 150 60 Z" fill={SOFT} stroke={INK} strokeWidth="4" />
      <path d="M200 330 V380 M160 380 H240" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path data-th-draw="" d="M60 220 C120 180 280 260 340 200" stroke={A} strokeWidth="6" strokeDasharray="10 6" fill="none" />
    </Art>
  ),
  facet: () => (
    <Art>
      <g fill="none" stroke={A} strokeWidth="4" strokeLinejoin="round">
        <path data-th-draw="" d="M200 330 L70 170 L120 100 H280 L330 170 Z M70 170 H330 M120 100 L160 170 L200 100 L240 170 L280 100 M160 170 L200 330 L240 170" />
      </g>
      <path data-th-pulse="" d={sparkle(320, 80, 22)} fill={S} />
      <path data-th-pulse="" d={sparkle(80, 290, 14)} fill={G} />
    </Art>
  ),
  wave: () => (
    <Art>
      <rect x="130" y="50" width="140" height="300" rx="28" fill={SURFACE} stroke={INK} strokeWidth="4" />
      <rect x="146" y="76" width="108" height="244" rx="14" fill={SOFT} />
      <g fill={A}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} data-th-pulse="" x={156 + i * 14} y={200 - ((i * 37) % 60)} width="8" height={20 + ((i * 37) % 60) * 2} rx="4" />
        ))}
      </g>
      {[40, 70].map((r) => (
        <path key={r} data-th-draw="" d={`M${290 + r * 0.2} ${200 - r} A${r} ${r} 0 0 1 ${290 + r * 0.2} ${200 + r}`} stroke={S} strokeWidth="5" fill="none" strokeLinecap="round" />
      ))}
    </Art>
  ),
  botanic: () => (
    <Art>
      <path data-th-draw="" d="M200 380 C200 300 190 220 200 120" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />
      {[[200, 260, -1], [200, 200, 1], [200, 150, -1]].map(([x, y, s], i) => (
        <path key={i} data-th-draw="" d={`M${x} ${y} C${x + s * 30} ${y - 40} ${x + s * 90} ${y - 30} ${x + s * 100} ${y - 10} C${x + s * 80} ${y + 20} ${x + s * 30} ${y + 20} ${x} ${y} Z`} fill={G} stroke={INK} strokeWidth="3" />
      ))}
      <g data-th-spin="">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <ellipse key={i} cx="200" cy="70" rx="16" ry="30" fill={A} stroke={INK} strokeWidth="3" transform={`rotate(${i * 60} 200 100)`} />
        ))}
      </g>
      <circle cx="200" cy="100" r="14" fill={S} stroke={INK} strokeWidth="3" />
    </Art>
  ),
  steam: () => (
    <Art>
      <path d="M90 200 H290 V260 C290 320 250 350 190 350 C130 350 90 320 90 260 Z" fill={A} stroke={INK} strokeWidth="5" />
      <path d="M290 220 C340 220 340 290 290 290" stroke={INK} strokeWidth="5" fill="none" />
      <path d="M60 360 H320" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      {[140, 190, 240].map((x) => (
        <path key={x} data-th-draw="" d={`M${x} 180 C${x - 20} 150 ${x + 20} 130 ${x} 100 C${x - 20} 70 ${x + 20} 50 ${x} 30`} stroke={S} strokeWidth="5" fill="none" strokeLinecap="round" />
      ))}
    </Art>
  ),
  paw: () => (
    <Art>
      <g fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round">
        <path data-th-draw="" d="M100 140 L120 60 L170 110 H230 L280 60 L300 140 C320 190 310 280 200 330 C90 280 80 190 100 140 Z" fill={SOFT} />
      </g>
      <circle cx="160" cy="190" r="12" fill={INK} />
      <circle cx="240" cy="190" r="12" fill={INK} />
      <path d="M190 230 h20 l-10 12 z" fill={A} />
      <g stroke={INK} strokeWidth="3" strokeLinecap="round">
        <path data-th-draw="" d="M150 240 L80 230 M150 252 L84 262 M250 240 L320 230 M250 252 L316 262" />
      </g>
      <Paw x={330} y={340} r={0.9} fill={A} data-th-float="" />
    </Art>
  ),
  track: () => (
    <Art>
      <circle cx="210" cy="220" r="120" fill={SURFACE} stroke={INK} strokeWidth="6" />
      <path d="M190 90 h40 M210 90 v10" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <path data-th-draw="" d="M210 220 L210 140 M210 220 L270 250" stroke={A} strokeWidth="8" strokeLinecap="round" />
      <circle cx="210" cy="220" r="10" fill={S} />
      <g stroke={S} strokeWidth="8" strokeLinecap="round">
        {[170, 220, 270].map((y, i) => (
          <path key={y} data-th-draw="" d={`M${20 + i * 10} ${y} H${70 + i * 10}`} />
        ))}
      </g>
    </Art>
  ),
  vinyl: () => (
    <Art>
      <g data-th-spin="">
        <circle cx="180" cy="220" r="140" fill={INK} />
        {[120, 100, 80].map((r) => (
          <circle key={r} cx="180" cy="220" r={r} fill="none" stroke={L} strokeWidth="2" opacity=".5" />
        ))}
        <circle cx="180" cy="220" r="44" fill={A} />
        <circle cx="180" cy="220" r="6" fill={SURFACE} />
      </g>
      <path data-th-draw="" d="M350 60 V200 L250 250" stroke={S} strokeWidth="8" strokeLinecap="round" fill="none" />
      <circle cx="350" cy="60" r="16" fill={S} />
    </Art>
  ),
  arabesque: () => (
    <Art>
      <path d="M200 30 V60" stroke={INK} strokeWidth="5" />
      <path data-th-draw="" d="M150 100 L200 60 L250 100 V280 C250 320 230 350 200 370 C170 350 150 320 150 280 Z" fill={SOFT} stroke={INK} strokeWidth="5" />
      <path d="M150 100 H250 M150 280 H250" stroke={INK} strokeWidth="4" />
      <path data-th-pulse="" d={star8(200, 190, 40)} fill={A} stroke={INK} strokeWidth="2" />
      <circle data-th-pulse="" cx="200" cy="190" r="12" fill={G} />
    </Art>
  ),
  cloud: () => (
    <Art>
      <path data-th-float="" d="M200 40 C280 40 330 100 330 170 C330 230 270 270 230 300 H170 C130 270 70 230 70 170 C70 100 120 40 200 40 Z" fill={A} stroke={INK} strokeWidth="5" />
      <path d="M120 120 C150 200 170 260 170 300 M280 120 C250 200 230 260 230 300 M200 40 V300" stroke={INK} strokeWidth="3" fill="none" opacity=".5" />
      <path d="M170 300 L180 340 H220 L230 300" stroke={INK} strokeWidth="4" fill="none" />
      <rect x="175" y="340" width="50" height="36" rx="6" fill={S} stroke={INK} strokeWidth="4" />
      <path data-th-float="" d={cloud(20, 330, 0.6)} fill={SOFT} />
    </Art>
  ),
  mono: () => (
    <Art>
      <circle data-th-draw="" cx="230" cy="170" r="110" fill="none" stroke={INK} strokeWidth="3" />
      <rect data-th-float="" x="90" y="210" width="120" height="120" fill={A} />
      <path data-th-draw="" d="M40 360 H360" stroke={INK} strokeWidth="3" />
    </Art>
  ),
};

const isMore = (kit: SvgKit): kit is Kit => kit in BACKDROPS;

export function moreBackdrop(kit: SvgKit): ReactNode | null {
  return isMore(kit) ? BACKDROPS[kit]() : null;
}
export function moreDivider(kit: SvgKit): ReactNode | null {
  return isMore(kit) ? DIVIDERS[kit]() : null;
}
export function moreArt(kit: SvgKit): ReactNode | null {
  return isMore(kit) ? ART[kit]() : null;
}
