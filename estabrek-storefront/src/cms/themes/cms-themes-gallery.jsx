import { useState, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// 50 ADVANCED WEBSITE THEMES — CMS THEME SELECTOR
// Glass · Candy · Aurora · Space · Gaming · Cyberpunk · Luxury
// ═══════════════════════════════════════════════════════════════

const T = (id, name, cat, render) => ({ id, name, category: cat, render });

export const CMS_THEME_GALLERY_THEMES = [

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔮 GLASS THEMES (1-7)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T(1, "Frosted Aurora Glass", "Glass", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs>
        <filter id="t1_blur"><feGaussianBlur stdDeviation="40"/></filter>
        <filter id="t1_glass"><feGaussianBlur stdDeviation="1"/></filter>
      </defs>
      <circle cx="200" cy="100" r="150" fill="#7c3aed" opacity="0.5" filter="url(#t1_blur)"><animate attributeName="cx" values="200;280;200" dur="12s" repeatCount="indefinite"/></circle>
      <circle cx="600" cy="300" r="180" fill="#ec4899" opacity="0.4" filter="url(#t1_blur)"><animate attributeName="cy" values="300;220;300" dur="10s" repeatCount="indefinite"/></circle>
      <circle cx="400" cy="200" r="120" fill="#06b6d4" opacity="0.3" filter="url(#t1_blur)"><animate attributeName="cx" values="400;450;400" dur="14s" repeatCount="indefinite"/></circle>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="w-full max-w-lg rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
        <div className="flex items-center gap-2 mb-4"><div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/><span className="text-white/50 text-xs tracking-widest uppercase">Live Now</span></div>
        <h2 className="text-3xl font-black text-white mb-2">Frosted Aurora</h2>
        <p className="text-white/40 text-sm mb-6">Premium glassmorphism with animated gradient orbs and frosted card overlays</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {["⚡ Fast","🔒 Secure","🎨 Custom"].map((f,i) => <div key={i} className="rounded-xl py-2 text-center text-xs text-white/70" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>{f}</div>)}
        </div>
        <div className="flex gap-3">
          <button className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>Get Started</button>
          <button className="px-6 py-2.5 rounded-xl text-sm text-white/60" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>Demo</button>
        </div>
      </div>
    </div>
  </div>
)),

T(2, "Crystal Ice Glass", "Glass", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #e0f2fe, #bae6fd, #7dd3fc)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t2_blur"><feGaussianBlur stdDeviation="30"/></filter></defs>
      <circle cx="150" cy="80" r="100" fill="white" opacity="0.5" filter="url(#t2_blur)"/>
      <circle cx="650" cy="320" r="120" fill="#38bdf8" opacity="0.3" filter="url(#t2_blur)"/>
      {[...Array(20)].map((_,i) => <polygon key={i} points={`${Math.random()*800},${Math.random()*400} ${Math.random()*800},${Math.random()*400} ${Math.random()*800},${Math.random()*400}`} fill="white" opacity={0.03+Math.random()*0.05}/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="rounded-3xl p-8 max-w-lg w-full" style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(56,189,248,0.15)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(56,189,248,0.2)" }}><span className="text-lg">❄️</span></div>
          <div><h3 className="text-sky-900 font-bold text-sm">Crystal Ice</h3><p className="text-sky-600/50 text-xs">Light Glass Theme</p></div>
        </div>
        <h2 className="text-3xl font-black text-sky-900 mb-2">Pure & Transparent</h2>
        <p className="text-sky-700/50 text-sm mb-6">Crystal clear glass design with icy blue tones and frosted transparency effects</p>
        <div className="flex gap-3">
          <button className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-sky-500">Apply Theme</button>
          <button className="px-6 py-2.5 rounded-xl text-sm text-sky-700 border border-sky-200">Preview</button>
        </div>
      </div>
    </div>
  </div>
)),

T(3, "Obsidian Glass", "Glass", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#0a0a0a" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t3_g"><feGaussianBlur stdDeviation="35"/></filter></defs>
      <circle cx="300" cy="200" r="200" fill="#1a1a2e" opacity="0.8" filter="url(#t3_g)"/>
      <circle cx="600" cy="150" r="100" fill="#16213e" opacity="0.6" filter="url(#t3_g)"/>
      {[...Array(15)].map((_,i) => <line key={i} x1={Math.random()*800} y1={Math.random()*400} x2={Math.random()*800} y2={Math.random()*400} stroke="white" strokeWidth="0.3" opacity="0.04"/>)}
    </svg>
    <div className="absolute inset-0 flex items-center p-10">
      <div className="flex gap-6 w-full max-w-2xl mx-auto">
        <div className="flex-1 rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-white/30 text-xs tracking-widest">01</span>
          <h3 className="text-white font-bold mt-2 text-lg">Dark Matter</h3>
          <p className="text-white/25 text-xs mt-1 mb-4">Obsidian black with subtle depth layers</p>
          <div className="h-1 rounded-full" style={{ background: "linear-gradient(90deg, #333, transparent)", width: "60%" }}/>
        </div>
        <div className="flex-1 rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-white/30 text-xs tracking-widest">02</span>
          <h3 className="text-white font-bold mt-2 text-lg">Shadow Play</h3>
          <p className="text-white/25 text-xs mt-1 mb-4">Layered glass with minimal opacity</p>
          <div className="h-1 rounded-full bg-white/10" style={{ width: "80%" }}/>
        </div>
        <div className="flex-1 rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="text-white/30 text-xs tracking-widest">03</span>
          <h3 className="text-white font-bold mt-2 text-lg">Void</h3>
          <p className="text-white/25 text-xs mt-1 mb-4">Nearly invisible glass on pure black</p>
          <div className="h-1 rounded-full bg-white/5" style={{ width: "45%" }}/>
        </div>
      </div>
    </div>
  </div>
)),

T(4, "Rainbow Glass Prism", "Glass", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t4_b"><feGaussianBlur stdDeviation="25"/></filter></defs>
      <circle cx="200" cy="100" r="120" fill="white" opacity="0.15" filter="url(#t4_b)"/>
      <circle cx="650" cy="350" r="100" fill="white" opacity="0.1" filter="url(#t4_b)"/>
      {[...Array(8)].map((_,i) => <line key={i} x1={i*110} y1="0" x2={i*110+80} y2="400" stroke="white" strokeWidth="0.5" opacity="0.06"/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="rounded-3xl p-8 max-w-md w-full text-center" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl" style={{ background: "rgba(255,255,255,0.15)" }}>🌈</div>
        <h2 className="text-3xl font-black text-white">Prism Glass</h2>
        <p className="text-white/60 text-sm mt-2 mb-6">Iridescent holographic glass over rainbow gradient mesh</p>
        <button className="w-full py-3 rounded-xl text-sm font-bold text-white/90" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>Activate Theme ✨</button>
      </div>
    </div>
  </div>
)),

T(5, "Emerald Glass", "Glass", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #064e3b, #065f46, #047857)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t5_b"><feGaussianBlur stdDeviation="35"/></filter></defs>
      <circle cx="250" cy="120" r="160" fill="#10b981" opacity="0.25" filter="url(#t5_b)"><animate attributeName="r" values="160;190;160" dur="8s" repeatCount="indefinite"/></circle>
      <circle cx="600" cy="300" r="140" fill="#34d399" opacity="0.2" filter="url(#t5_b)"/>
      {[...Array(6)].map((_,i) => <path key={i} d={`M${100+i*130},400 Q${120+i*130},${300-i*20} ${140+i*130},${250-i*15} T${180+i*130},${150-i*10}`} fill="none" stroke="#6ee7b7" strokeWidth="1" opacity="0.08"/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="rounded-3xl p-8 max-w-lg w-full" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)", border: "1px solid rgba(110,231,183,0.15)" }}>
        <h2 className="text-3xl font-black text-emerald-100 mb-2">Emerald Glass</h2>
        <p className="text-emerald-300/40 text-sm mb-6">Deep emerald tones with jewel-like transparency and organic shapes</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[{n:"Eco Mode",v:"Active"},{n:"Performance",v:"99.8%"},{n:"Carbon",v:"Neutral"},{n:"Users",v:"10K+"}].map((s,i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}><span className="text-emerald-300/40 text-xs">{s.n}</span><div className="text-emerald-100 font-bold text-sm">{s.v}</div></div>
          ))}
        </div>
        <button className="w-full py-3 rounded-xl text-sm font-bold text-emerald-900" style={{ background: "linear-gradient(135deg, #6ee7b7, #34d399)" }}>Use Emerald Glass</button>
      </div>
    </div>
  </div>
)),

T(6, "Smoke Glass", "Glass", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #18181b, #27272a)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t6_s"><feGaussianBlur stdDeviation="20"/></filter></defs>
      {[...Array(5)].map((_,i) => <ellipse key={i} cx={150+i*150} cy={200+Math.sin(i)*50} rx={80+i*10} ry={40+i*5} fill="white" opacity={0.02+i*0.005} filter="url(#t6_s)">
        <animate attributeName="cy" values={`${200+Math.sin(i)*50};${180+Math.sin(i)*50};${200+Math.sin(i)*50}`} dur={`${6+i*2}s`} repeatCount="indefinite"/>
      </ellipse>)}
    </svg>
    <div className="absolute inset-0 flex items-center p-10">
      <div className="w-full">
        <div className="max-w-md">
          <span className="text-zinc-500 text-xs tracking-[6px] uppercase">Premium</span>
          <h2 className="text-4xl font-black text-zinc-100 mt-2 mb-3">Smoke Glass</h2>
          <p className="text-zinc-500 text-sm mb-8">Ethereal smoke effects with barely-there glass cards floating on dark canvas</p>
        </div>
        <div className="flex gap-4">
          {["Dashboard","Analytics","Settings"].map((t,i) => (
            <div key={i} className="rounded-2xl px-6 py-4 w-40" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-zinc-400 text-xs">{t}</span>
              <div className="mt-2 h-1 rounded-full" style={{ background: `rgba(255,255,255,${0.05+i*0.03})`, width: `${50+i*20}%` }}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)),

T(7, "Stained Glass Cathedral", "Glass", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#1a1a2e" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[
        {p:"0,0 120,0 100,130 0,110",f:"#ef4444"},{p:"120,0 270,0 220,120 100,130",f:"#3b82f6"},{p:"270,0 420,0 400,140 220,120",f:"#10b981"},
        {p:"420,0 570,0 520,110 400,140",f:"#f59e0b"},{p:"570,0 720,0 700,130 520,110",f:"#8b5cf6"},{p:"720,0 800,0 800,120 700,130",f:"#ec4899"},
        {p:"0,110 100,130 80,260 0,240",f:"#06b6d4"},{p:"100,130 220,120 240,260 80,260",f:"#f97316"},{p:"220,120 400,140 380,270 240,260",f:"#84cc16"},
        {p:"400,140 520,110 540,250 380,270",f:"#e11d48"},{p:"520,110 700,130 680,260 540,250",f:"#6366f1"},{p:"700,130 800,120 800,270 680,260",f:"#14b8a6"},
        {p:"0,240 80,260 50,400 0,400",f:"#a855f7"},{p:"80,260 240,260 210,400 50,400",f:"#22d3ee"},{p:"240,260 380,270 360,400 210,400",f:"#fb923c"},
        {p:"380,270 540,250 560,400 360,400",f:"#4ade80"},{p:"540,250 680,260 700,400 560,400",f:"#f472b6"},{p:"680,260 800,270 800,400 700,400",f:"#818cf8"},
      ].map((s,i) => <polygon key={i} points={s.p} fill={s.f} opacity="0.5" stroke="#1a1a2e" strokeWidth="3"><animate attributeName="opacity" values="0.4;0.6;0.4" dur={`${3+i*0.2}s`} repeatCount="indefinite"/></polygon>)}
    </svg>
    <div className="absolute inset-0 bg-black/20"/>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center rounded-3xl p-8 max-w-md" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <h2 className="text-3xl font-black text-white">Cathedral Glass</h2>
        <p className="text-white/40 text-sm mt-2 mb-5">Inspired by medieval stained glass with 18 animated color panels</p>
        <button className="px-8 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(90deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6)" }}>Illuminate ✦</button>
      </div>
    </div>
  </div>
)),

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🍬 CANDY THEMES (8-13)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T(8, "Cotton Candy Dreams", "Candy", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #fce4ec, #f8bbd0, #e1bee7, #b3e5fc)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t8_b"><feGaussianBlur stdDeviation="25"/></filter></defs>
      <circle cx="200" cy="100" r="120" fill="#f48fb1" opacity="0.35" filter="url(#t8_b)"><animate attributeName="cx" values="200;250;200" dur="8s" repeatCount="indefinite"/></circle>
      <circle cx="600" cy="280" r="140" fill="#ce93d8" opacity="0.3" filter="url(#t8_b)"><animate attributeName="cy" values="280;240;280" dur="10s" repeatCount="indefinite"/></circle>
      <circle cx="400" cy="200" r="100" fill="#81d4fa" opacity="0.25" filter="url(#t8_b)"><animate attributeName="r" values="100;120;100" dur="12s" repeatCount="indefinite"/></circle>
      {[...Array(25)].map((_,i) => <g key={i} transform={`translate(${Math.random()*800},${Math.random()*400})`}><line x1="-4" y1="0" x2="4" y2="0" stroke="white" strokeWidth="1.5" opacity={0.3+Math.random()*0.3}><animate attributeName="opacity" values="0.2;0.7;0.2" dur={`${1.5+Math.random()*2}s`} repeatCount="indefinite"/></line><line x1="0" y1="-4" x2="0" y2="4" stroke="white" strokeWidth="1.5" opacity={0.3+Math.random()*0.3}/></g>)}
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
      <span className="text-3xl mb-3">🍭</span>
      <h2 className="text-4xl font-black text-pink-800" style={{ textShadow: "0 2px 15px rgba(244,143,177,0.3)" }}>Cotton Candy Dreams</h2>
      <p className="text-pink-600/50 text-sm mt-2 mb-6 max-w-sm">Soft pastel clouds with sparkling highlights and dreamy gradient blobs</p>
      <div className="flex gap-3">
        <button className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #f48fb1, #ce93d8)", boxShadow: "0 4px 20px rgba(244,143,177,0.3)" }}>Sweet Start ✨</button>
        <button className="px-6 py-3 rounded-full text-sm font-bold text-pink-600 border-2 border-pink-200">Preview</button>
      </div>
    </div>
  </div>
)),

T(9, "Neon Candy Store", "Candy", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#0f0f1a" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t9_n"><feGaussianBlur stdDeviation="4"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect x="80" y="60" width="180" height="100" rx="16" fill="none" stroke="#ff6b9d" strokeWidth="2" filter="url(#t9_n)" opacity="0.3"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite"/></rect>
      <circle cx="650" cy="300" r="60" fill="none" stroke="#00ffff" strokeWidth="2" filter="url(#t9_n)" opacity="0.25"><animate attributeName="opacity" values="0.15;0.4;0.15" dur="4s" repeatCount="indefinite"/></circle>
      <rect x="500" y="80" width="120" height="80" rx="12" fill="none" stroke="#ffd93d" strokeWidth="2" filter="url(#t9_n)" opacity="0.2"/>
      {/* Lollipop neon */}
      <g transform="translate(350, 300)" opacity="0.3"><line x1="0" y1="0" x2="0" y2="60" stroke="#ff6b9d" strokeWidth="3" filter="url(#t9_n)"/><circle cy="-20" r="25" fill="none" stroke="#ff6b9d" strokeWidth="2" filter="url(#t9_n)"/></g>
      {[...Array(15)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*400} r="1.5" fill={["#ff6b9d","#00ffff","#ffd93d"][i%3]} opacity="0.3"><animate attributeName="opacity" values="0.1;0.5;0.1" dur={`${1+Math.random()*2}s`} repeatCount="indefinite"/></circle>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-4xl font-black" style={{ color: "#ff6b9d", textShadow: "0 0 30px #ff6b9d, 0 0 60px #ff6b9d" }}>CANDY STORE</h2>
        <p className="mt-2 text-sm" style={{ color: "#00ffff", textShadow: "0 0 15px #00ffff" }}>Open 24/7 · Neon Dreams</p>
        <button className="mt-6 px-8 py-3 rounded-full text-sm font-bold" style={{ border: "2px solid #ff6b9d", color: "#ff6b9d", textShadow: "0 0 10px #ff6b9d" }}>Enter Store ✦</button>
      </div>
    </div>
  </div>
)),

T(10, "Gummy Bear World", "Candy", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #fefefe, #f0f9ff)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[{x:80,y:70,c:"#ef4444",s:1.3},{x:220,y:280,c:"#22c55e",s:1},{x:380,y:50,c:"#eab308",s:1.1},{x:530,y:300,c:"#f97316",s:0.9},{x:680,y:100,c:"#ec4899",s:1.2},{x:720,y:260,c:"#8b5cf6",s:0.8}].map((b,i) => (
        <g key={i} transform={`translate(${b.x},${b.y}) scale(${b.s})`} opacity="0.3">
          <ellipse cx="0" cy="0" rx="18" ry="22" fill={b.c}/><circle cx="-10" cy="-18" r="7" fill={b.c}/><circle cx="10" cy="-18" r="7" fill={b.c}/><ellipse cx="-12" cy="18" rx="6" ry="8" fill={b.c}/><ellipse cx="12" cy="18" rx="6" ry="8" fill={b.c}/>
          <circle cx="-5" cy="-5" r="2" fill="white" opacity="0.6"/><circle cx="5" cy="-5" r="2" fill="white" opacity="0.6"/>
          <animate attributeName="opacity" values="0.25;0.4;0.25" dur={`${3+i*0.5}s`} repeatCount="indefinite"/>
        </g>
      ))}
      {[...Array(30)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*400} r={2+Math.random()*4} fill={["#ef4444","#22c55e","#eab308","#f97316","#ec4899","#8b5cf6"][i%6]} opacity="0.08"/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><div className="text-center">
      <h2 className="text-4xl font-black" style={{ background: "linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Gummy Bear World</h2>
      <p className="text-gray-400 text-sm mt-2 mb-5">Playful, colorful, and irresistibly fun</p>
      <div className="flex justify-center gap-2">{["🔴","🟢","🟡","🟠","🟣"].map((e,i) => <span key={i} className="text-2xl">{e}</span>)}</div>
    </div></div>
  </div>
)),

T(11, "Chocolate Velvet", "Candy", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #3e2723, #4e342e, #5d4037)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[0,80,160,240,320,400,480,560,640,720,800].map((x,i) => <path key={i} d={`M${x-25},0 L${x+25},0 L${x+18},${25+Math.random()*35} Q${x},${40+Math.random()*50} ${x-18},${25+Math.random()*35}Z`} fill="#3e2723" opacity="0.5"/>)}
      {[...Array(35)].map((_,i) => <rect key={i} x={Math.random()*800} y={80+Math.random()*280} width={2+Math.random()*3} height={8+Math.random()*6} rx="1" fill="#ffd700" opacity={0.2+Math.random()*0.2} transform={`rotate(${Math.random()*360} ${Math.random()*800} ${Math.random()*400})`}/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center">
      <div><span className="text-3xl">🍫</span><h2 className="text-4xl font-bold text-amber-100 mt-2" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>Chocolate Velvet</h2><p className="text-amber-200/40 text-sm mt-2 mb-5">Rich, decadent, and luxuriously smooth</p>
      <button className="px-8 py-3 rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", color: "#3e2723" }}>Indulge Now</button></div>
    </div>
  </div>
)),

T(12, "Bubblegum Pop", "Candy", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #fdf2f8, #fce7f3, #fbcfe8)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(18)].map((_,i) => {
        const r=15+Math.random()*45, x=Math.random()*800, y=Math.random()*400;
        return <g key={i}><circle cx={x} cy={y} r={r} fill="none" stroke="#f9a8d4" strokeWidth="1.5" opacity={0.15+Math.random()*0.15}><animate attributeName="r" values={`${r};${r+6};${r}`} dur={`${3+Math.random()*3}s`} repeatCount="indefinite"/></circle><circle cx={x-r*0.3} cy={y-r*0.3} r={r*0.12} fill="white" opacity="0.25"/></g>;
      })}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><div className="text-center">
      <h2 className="text-4xl font-black text-pink-500" style={{ textShadow: "3px 3px 0 #fbcfe8" }}>Bubblegum Pop</h2>
      <p className="text-pink-400/50 text-sm mt-2 mb-5">Floaty, bubbly, and absolutely adorable</p>
      <button className="px-8 py-3 rounded-full text-sm font-bold text-white bg-pink-500" style={{ boxShadow: "0 4px 20px rgba(236,72,153,0.3)" }}>Pop & Play 🫧</button>
    </div></div>
  </div>
)),

T(13, "Rainbow Swirl", "Candy", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#fefefe" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899"].map((c,i) => (
        <path key={i} d={`M-50,${140+i*18} Q200,${95+i*22} 400,${150+i*14} T850,${110+i*20}`} fill="none" stroke={c} strokeWidth="10" opacity="0.18" strokeLinecap="round">
          <animate attributeName="d" values={`M-50,${140+i*18} Q200,${95+i*22} 400,${150+i*14} T850,${110+i*20};M-50,${128+i*18} Q200,${108+i*22} 400,${138+i*14} T850,${122+i*20};M-50,${140+i*18} Q200,${95+i*22} 400,${150+i*14} T850,${110+i*20}`} dur={`${6+i*0.5}s`} repeatCount="indefinite"/>
        </path>
      ))}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><div className="text-center">
      <h2 className="text-4xl font-black" style={{ background: "linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Rainbow Swirl</h2>
      <p className="text-gray-400 text-sm mt-2 mb-5">Seven animated flowing rainbow ribbons</p>
      <button className="px-8 py-3 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6, #8b5cf6)" }}>Taste the Rainbow 🌈</button>
    </div></div>
  </div>
)),

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌌 AURORA & SPACE THEMES (14-21)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T(14, "Northern Lights", "Aurora", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0a2e, #1a1a4e, #0d3b66)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
      <defs>
        <linearGradient id="t14_a" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00ff87" stopOpacity="0.6"><animate attributeName="stop-color" values="#00ff87;#60efff;#ff6b9d;#00ff87" dur="8s" repeatCount="indefinite"/></stop><stop offset="50%" stopColor="#60efff" stopOpacity="0.4"><animate attributeName="stop-color" values="#60efff;#ff6b9d;#00ff87;#60efff" dur="8s" repeatCount="indefinite"/></stop><stop offset="100%" stopColor="#ff6b9d" stopOpacity="0.5"><animate attributeName="stop-color" values="#ff6b9d;#00ff87;#60efff;#ff6b9d" dur="8s" repeatCount="indefinite"/></stop></linearGradient>
        <filter id="t14_b"><feGaussianBlur stdDeviation="25"/></filter>
      </defs>
      <path d="M0,180 Q100,60 200,140 T400,90 T600,150 T800,100" fill="none" stroke="url(#t14_a)" strokeWidth="70" filter="url(#t14_b)" opacity="0.6"><animate attributeName="d" values="M0,180 Q100,60 200,140 T400,90 T600,150 T800,100;M0,140 Q100,100 200,70 T400,160 T600,80 T800,140;M0,180 Q100,60 200,140 T400,90 T600,150 T800,100" dur="10s" repeatCount="indefinite"/></path>
      <path d="M0,220 Q200,120 350,180 T600,130 T800,190" fill="none" stroke="url(#t14_a)" strokeWidth="45" filter="url(#t14_b)" opacity="0.4"><animate attributeName="d" values="M0,220 Q200,120 350,180 T600,130 T800,190;M0,190 Q200,180 350,120 T600,190 T800,140;M0,220 Q200,120 350,180 T600,130 T800,190" dur="12s" repeatCount="indefinite"/></path>
      {[...Array(50)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*400} r={Math.random()*2} fill="white" opacity={Math.random()*0.7}><animate attributeName="opacity" values={`${Math.random()*0.2};${0.3+Math.random()*0.5};${Math.random()*0.2}`} dur={`${1+Math.random()*3}s`} repeatCount="indefinite"/></circle>)}
      <path d="M0,360 Q200,340 400,355 T800,345 L800,400 L0,400Z" fill="#0a1628" opacity="0.8"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><div className="text-center">
      <h2 className="text-4xl font-black text-white" style={{ textShadow: "0 0 40px rgba(0,255,135,0.4)" }}>Northern Lights</h2>
      <p className="text-green-200/50 text-sm mt-2 mb-5">Animated aurora borealis with 50+ twinkling stars</p>
      <button className="px-8 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "rgba(0,255,135,0.15)", border: "1px solid rgba(0,255,135,0.3)" }}>Explore the Sky</button>
    </div></div>
  </div>
)),

T(15, "Deep Space Nebula", "Space", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "radial-gradient(ellipse at 30% 50%, #2d1b69 0%, #0a0a0a 70%)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs>
        <radialGradient id="t15_n1" cx="30%" cy="50%"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4"/><stop offset="100%" stopColor="transparent"/></radialGradient>
        <radialGradient id="t15_n2" cx="70%" cy="40%"><stop offset="0%" stopColor="#ec4899" stopOpacity="0.3"/><stop offset="100%" stopColor="transparent"/></radialGradient>
        <filter id="t15_b"><feGaussianBlur stdDeviation="18"/></filter>
      </defs>
      <ellipse cx="250" cy="200" rx="220" ry="120" fill="url(#t15_n1)" filter="url(#t15_b)"><animate attributeName="rx" values="220;250;220" dur="10s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="580" cy="160" rx="180" ry="100" fill="url(#t15_n2)" filter="url(#t15_b)"><animate attributeName="ry" values="100;120;100" dur="12s" repeatCount="indefinite"/></ellipse>
      {[...Array(60)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*400} r={Math.random()*1.8+0.3} fill="white" opacity={Math.random()*0.6}/>)}
    </svg>
    <div className="absolute inset-0 flex items-center p-10"><div>
      <span className="text-purple-400/50 text-xs tracking-[6px] uppercase">Deep Space</span>
      <h2 className="text-4xl font-black text-white mt-2" style={{ textShadow: "0 0 30px rgba(139,92,246,0.5)" }}>Cosmic Nebula</h2>
      <p className="text-purple-300/40 text-sm mt-2 mb-6 max-w-md">Dual-nebula system with 60 stars and pulsating cosmic clouds</p>
      <button className="px-8 py-3 rounded-xl text-sm font-bold text-purple-200" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>Launch Explorer 🚀</button>
    </div></div>
  </div>
)),

T(16, "Galaxy Spiral", "Space", () => (
  <div className="relative w-full h-96 overflow-hidden bg-black">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><radialGradient id="t16_c"><stop offset="0%" stopColor="#818cf8" stopOpacity="0.5"/><stop offset="100%" stopColor="transparent"/></radialGradient><filter id="t16_g"><feGaussianBlur stdDeviation="10"/></filter></defs>
      <circle cx="400" cy="200" r="50" fill="url(#t16_c)" filter="url(#t16_g)"/>
      {[...Array(4)].map((_,arm) => <g key={arm}>{[...Array(25)].map((_,i) => {
        const a = (arm*90+i*12)*Math.PI/180, r = 25+i*12;
        return <circle key={i} cx={400+Math.cos(a)*r} cy={200+Math.sin(a)*r*0.5} r={1.5+Math.random()} fill={["#818cf8","#a78bfa","#c4b5fd","#ddd6fe"][arm]} opacity={0.5-i*0.015}/>;
      })}</g>)}
      {[...Array(40)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*400} r={Math.random()*1.2} fill="white" opacity={Math.random()*0.4}/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-3xl font-black text-indigo-200" style={{ textShadow: "0 0 25px rgba(129,140,248,0.5)" }}>Galaxy Spiral</h2>
      <p className="text-violet-300/40 text-sm mt-2">4-arm spiral with 100+ particles</p>
    </div></div>
  </div>
)),

T(17, "Meteor Shower", "Space", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #020617, #0f172a)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(40)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*400} r={Math.random()*1.5} fill="white" opacity={Math.random()*0.5}/>)}
      {[...Array(8)].map((_,i) => {
        const x1=100+Math.random()*600, y1=Math.random()*100;
        return <line key={i} x1={x1} y1={y1} x2={x1+60+Math.random()*40} y2={y1+40+Math.random()*30} stroke="white" strokeWidth={1+Math.random()} opacity="0">
          <animate attributeName="opacity" values="0;0.6;0" dur={`${1+Math.random()*2}s`} begin={`${Math.random()*5}s`} repeatCount="indefinite"/>
          <animate attributeName="x1" values={`${x1};${x1-100}`} dur={`${1+Math.random()*2}s`} begin={`${Math.random()*5}s`} repeatCount="indefinite"/>
          <animate attributeName="y1" values={`${y1};${y1+80}`} dur={`${1+Math.random()*2}s`} begin={`${Math.random()*5}s`} repeatCount="indefinite"/>
        </line>;
      })}
      <circle cx="650" cy="80" r="30" fill="#fef3c7" opacity="0.06"/>
      <circle cx="640" cy="75" r="26" fill="#020617"/>
    </svg>
    <div className="absolute inset-0 flex items-center p-10"><div>
      <h2 className="text-4xl font-black text-white">Meteor Shower</h2>
      <p className="text-slate-500 text-sm mt-2 mb-5">Animated shooting stars with crescent moon</p>
      <button className="px-8 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>Make a Wish ⭐</button>
    </div></div>
  </div>
)),

T(18, "Solar Flare", "Space", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "radial-gradient(circle at 70% 50%, #451a03, #1c1917, #0a0a0a)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t18_g"><feGaussianBlur stdDeviation="15"/></filter><radialGradient id="t18_s"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6"/><stop offset="40%" stopColor="#f97316" stopOpacity="0.3"/><stop offset="100%" stopColor="transparent"/></radialGradient></defs>
      <circle cx="600" cy="200" r="80" fill="url(#t18_s)" filter="url(#t18_g)"><animate attributeName="r" values="80;95;80" dur="5s" repeatCount="indefinite"/></circle>
      <circle cx="600" cy="200" r="40" fill="#fbbf24" opacity="0.15"/>
      {[...Array(12)].map((_,i) => { const a=(i*30)*Math.PI/180; return <line key={i} x1={600+Math.cos(a)*50} y1={200+Math.sin(a)*50} x2={600+Math.cos(a)*(120+Math.random()*60)} y2={200+Math.sin(a)*(120+Math.random()*60)} stroke="#f97316" strokeWidth={1+Math.random()} opacity="0.1"><animate attributeName="opacity" values="0.05;0.2;0.05" dur={`${2+i*0.3}s`} repeatCount="indefinite"/></line>; })}
      {[...Array(30)].map((_,i) => <circle key={i} cx={Math.random()*500} cy={Math.random()*400} r={Math.random()*1.2} fill="white" opacity={Math.random()*0.3}/>)}
    </svg>
    <div className="absolute inset-0 flex items-center p-10"><div>
      <h2 className="text-4xl font-black text-orange-200" style={{ textShadow: "0 0 20px rgba(251,191,36,0.3)" }}>Solar Flare</h2>
      <p className="text-orange-400/30 text-sm mt-2">Pulsating sun with radiating solar flares</p>
    </div></div>
  </div>
)),

T(19, "Aurora Waves", "Aurora", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #020617 0%, #0c1222 50%, #172033 100%)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
      <defs><filter id="t19_b"><feGaussianBlur stdDeviation="12"/></filter></defs>
      {["#22d3ee","#a78bfa","#34d399","#f472b6"].map((c,i) => (
        <path key={i} d={`M0,${180+i*30} Q200,${140+i*25} 400,${190+i*20} T800,${160+i*28}`} fill="none" stroke={c} strokeWidth={30-i*5} filter="url(#t19_b)" opacity={0.2-i*0.03}>
          <animate attributeName="d" values={`M0,${180+i*30} Q200,${140+i*25} 400,${190+i*20} T800,${160+i*28};M0,${160+i*30} Q200,${170+i*25} 400,${150+i*20} T800,${180+i*28};M0,${180+i*30} Q200,${140+i*25} 400,${190+i*20} T800,${160+i*28}`} dur={`${8+i*2}s`} repeatCount="indefinite"/>
        </path>
      ))}
      {[...Array(20)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*200} r={Math.random()*1.5} fill="white" opacity={Math.random()*0.4}/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-3xl font-black text-cyan-200" style={{ textShadow: "0 0 20px rgba(34,211,238,0.3)" }}>Aurora Waves</h2>
      <p className="text-cyan-400/30 text-sm mt-2">Multi-layered flowing aurora curtains</p>
    </div></div>
  </div>
)),

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 GAMING THEMES (20-26)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T(20, "Pixel Arcade", "Gaming", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#1a1c2c" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(60)].map((_,i) => {
        const cs = ["#f7d87c","#eb6b6f","#b13e53","#a7f070","#38b764","#3b5dc9","#41a6f6","#29366f"];
        return <rect key={i} x={Math.floor(Math.random()*40)*20} y={Math.floor(Math.random()*20)*20} width="20" height="20" fill={cs[Math.floor(Math.random()*cs.length)]} opacity={0.2+Math.random()*0.3}>
          <animate attributeName="opacity" values={`${0.15+Math.random()*0.2};${0.4+Math.random()*0.3};${0.15+Math.random()*0.2}`} dur={`${1.5+Math.random()*2}s`} repeatCount="indefinite"/>
        </rect>;
      })}
      {/* Score display */}
      <rect x="300" y="20" width="200" height="40" rx="4" fill="rgba(0,0,0,0.5)" stroke="#f7d87c" strokeWidth="1" opacity="0.4"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><div className="text-center">
      <h2 className="text-4xl font-black text-yellow-300" style={{ fontFamily: "monospace", letterSpacing: "6px", textShadow: "3px 3px 0 #29366f" }}>PIXEL ARCADE</h2>
      <p className="text-green-300/50 text-sm font-mono mt-2 mb-5">INSERT COIN TO PLAY</p>
      <button className="px-8 py-3 rounded-lg text-sm font-bold bg-yellow-400 text-gray-900 font-mono">▶ START GAME</button>
    </div></div>
  </div>
)),

T(21, "Cyberpunk Glitch", "Gaming", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#0a0a12" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t21_n"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {[...Array(12)].map((_,i) => <line key={i} x1={i*70} y1="0" x2={i*70} y2="400" stroke="#00ffff" strokeWidth="0.5" opacity="0.06"/>)}
      {[...Array(8)].map((_,i) => <line key={i} x1="0" y1={i*52} x2="800" y2={i*52} stroke="#ff00ff" strokeWidth="0.3" opacity="0.06"/>)}
      {/* Glitch rectangles */}
      {[...Array(6)].map((_,i) => <rect key={i} x={Math.random()*600} y={Math.random()*400} width={50+Math.random()*150} height={3+Math.random()*8} fill={["#ff00ff","#00ffff","#ffff00"][i%3]} opacity="0">
        <animate attributeName="opacity" values="0;0.15;0;0;0.1;0" dur={`${0.5+Math.random()*2}s`} repeatCount="indefinite"/>
      </rect>)}
      <line x1="0" y1="350" x2="800" y2="350" stroke="#ff00ff" strokeWidth="3" filter="url(#t21_n)" opacity="0.3"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite"/></line>
      <line x1="0" y1="50" x2="800" y2="50" stroke="#00ffff" strokeWidth="2" filter="url(#t21_n)" opacity="0.2"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><div className="text-center">
      <h2 className="text-4xl font-black" style={{ color: "#00ffff", textShadow: "3px 0 #ff00ff, -3px 0 #ffff00, 0 0 20px #00ffff" }}>CYBERPUNK</h2>
      <p className="text-sm mt-2" style={{ color: "#ff00ff" }}>GLITCH IN THE MATRIX</p>
    </div></div>
  </div>
)),

T(22, "RPG Quest", "Gaming", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #1a0e2e, #2d1b4e, #1a0e2e)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {/* Mystical runes */}
      {[...Array(8)].map((_,i) => {
        const x=80+i*95, y=60+Math.sin(i*0.8)*30;
        return <g key={i} transform={`translate(${x},${y})`} opacity="0.12">
          <polygon points="0,-15 13,8 -13,8" fill="none" stroke="#c084fc" strokeWidth="1"/><circle r="4" fill="#c084fc" opacity="0.4"/>
          <animate attributeName="opacity" values="0.08;0.2;0.08" dur={`${3+i*0.5}s`} repeatCount="indefinite"/>
        </g>;
      })}
      {/* Health bar */}
      <g transform="translate(50, 330)"><rect width="200" height="12" rx="6" fill="rgba(0,0,0,0.3)"/><rect width="140" height="12" rx="6" fill="#ef4444" opacity="0.6"/><text x="210" y="10" fill="#ef4444" fontSize="10" opacity="0.5">HP 70/100</text></g>
      {/* XP bar */}
      <g transform="translate(50, 355)"><rect width="200" height="8" rx="4" fill="rgba(0,0,0,0.3)"/><rect width="100" height="8" rx="4" fill="#3b82f6" opacity="0.5"/><text x="210" y="7" fill="#3b82f6" fontSize="9" opacity="0.4">XP 50/100</text></g>
      {[...Array(15)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*400} r={Math.random()*2} fill="#c084fc" opacity={Math.random()*0.15}/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-black text-purple-200" style={{ textShadow: "0 0 20px rgba(192,132,252,0.4)", fontVariant: "small-caps", letterSpacing: "4px" }}>Quest Realm</h2>
      <p className="text-purple-400/40 text-sm mt-2 mb-5">Begin your adventure in the enchanted lands</p>
      <div className="flex justify-center gap-3">
        <button className="px-6 py-2.5 rounded-lg text-sm font-bold text-purple-900" style={{ background: "linear-gradient(135deg, #c084fc, #a855f7)" }}>⚔️ New Quest</button>
        <button className="px-6 py-2.5 rounded-lg text-sm font-bold text-purple-300" style={{ border: "1px solid rgba(192,132,252,0.3)" }}>📖 Inventory</button>
      </div>
    </div></div>
  </div>
)),

T(23, "Racing Neon", "Gaming", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0a1a, #111133, #0a0a1a)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
      <defs><filter id="t23_g"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {/* Speed lines */}
      {[...Array(15)].map((_,i) => <line key={i} x1="0" y1={50+i*22} x2="800" y2={50+i*22} stroke="#3b82f6" strokeWidth={0.5+Math.random()} opacity={0.03+Math.random()*0.05}><animate attributeName="x1" values="0;-100;0" dur={`${0.5+Math.random()*0.5}s`} repeatCount="indefinite"/></line>)}
      {/* Neon road */}
      <line x1="400" y1="0" x2="200" y2="400" stroke="#3b82f6" strokeWidth="2" filter="url(#t23_g)" opacity="0.2"/>
      <line x1="400" y1="0" x2="600" y2="400" stroke="#3b82f6" strokeWidth="2" filter="url(#t23_g)" opacity="0.2"/>
      {[...Array(8)].map((_,i) => <line key={i} x1={350-i*15} y1={i*50} x2={450+i*15} y2={i*50} stroke="#ef4444" strokeWidth="1" opacity={0.05+i*0.02}/>)}
      {/* Speedometer */}
      <g transform="translate(700, 320)" opacity="0.2">
        <circle r="35" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="150 70" filter="url(#t23_g)"/>
        <line x1="0" y1="0" x2={Math.cos(-0.8)*25} y2={Math.sin(-0.8)*25} stroke="#ef4444" strokeWidth="2"/>
      </g>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-5xl font-black text-blue-400" style={{ textShadow: "0 0 30px rgba(59,130,246,0.5)", letterSpacing: "8px" }}>TURBO</h2>
      <p className="text-blue-400/30 text-sm mt-1 tracking-widest">MAXIMUM VELOCITY</p>
    </div></div>
  </div>
)),

T(24, "Retro Game Console", "Gaming", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #312e81, #4c1d95, #581c87)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {/* Console shape */}
      <rect x="250" y="100" width="300" height="200" rx="20" fill="rgba(0,0,0,0.2)" stroke="#a78bfa" strokeWidth="1" opacity="0.3"/>
      <rect x="280" y="120" width="180" height="120" rx="8" fill="rgba(0,0,0,0.3)" stroke="#818cf8" strokeWidth="0.5" opacity="0.4"/>
      {/* D-pad */}
      <g transform="translate(510, 220)" opacity="0.2"><rect x="-15" y="-5" width="30" height="10" rx="2" fill="#a78bfa"/><rect x="-5" y="-15" width="10" height="30" rx="2" fill="#a78bfa"/></g>
      {/* Buttons */}
      <circle cx="560" cy="200" r="6" fill="#ef4444" opacity="0.2"/><circle cx="575" cy="215" r="6" fill="#22c55e" opacity="0.2"/>
      {/* Screen content - pulsing */}
      <rect x="290" y="130" width="160" height="100" rx="4" fill="#818cf8" opacity="0.05"><animate attributeName="opacity" values="0.03;0.08;0.03" dur="2s" repeatCount="indefinite"/></rect>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-3xl font-black text-violet-200" style={{ fontFamily: "monospace" }}>RETRO CONSOLE</h2>
      <p className="text-violet-400/40 text-sm mt-2 font-mono">PRESS START TO CONTINUE</p>
    </div></div>
  </div>
)),

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✨ LUXURY & ELEGANT (25-30)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T(25, "Black Gold", "Luxury", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#0a0a0a" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><linearGradient id="t25_g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#bf953f"/><stop offset="25%" stopColor="#fcf6ba"/><stop offset="50%" stopColor="#b38728"/><stop offset="75%" stopColor="#fbf5b7"/><stop offset="100%" stopColor="#aa771c"/></linearGradient></defs>
      <rect x="50" y="40" width="700" height="320" fill="none" stroke="url(#t25_g)" strokeWidth="1" opacity="0.2" rx="8"/>
      <rect x="60" y="50" width="680" height="300" fill="none" stroke="url(#t25_g)" strokeWidth="0.5" opacity="0.1" rx="6"/>
      {[[70,60],[730,60],[70,340],[730,340]].map(([x,y],i) => <g key={i} transform={`translate(${x},${y})`}><circle r="6" fill="none" stroke="url(#t25_g)" strokeWidth="0.5" opacity="0.3"/><circle r="2" fill="url(#t25_g)" opacity="0.2"/></g>)}
      {[...Array(5)].map((_,i) => <line key={i} x1={160+i*120} y1="60" x2={160+i*120} y2="340" stroke="url(#t25_g)" strokeWidth="0.2" opacity="0.05"/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-bold" style={{ background: "linear-gradient(135deg, #bf953f, #fcf6ba, #b38728)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "8px" }}>BLACK GOLD</h2>
      <p className="text-amber-200/25 text-sm mt-3 tracking-[4px]">OPULENCE REDEFINED</p>
      <button className="mt-6 px-10 py-3 text-xs font-medium tracking-[4px]" style={{ border: "1px solid #bf953f", color: "#bf953f" }}>DISCOVER</button>
    </div></div>
  </div>
)),

T(26, "Art Deco", "Luxury", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#1a1a2e" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><linearGradient id="t26_g" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ffd700"/><stop offset="50%" stopColor="#daa520"/><stop offset="100%" stopColor="#b8860b"/></linearGradient></defs>
      <line x1="400" y1="0" x2="400" y2="400" stroke="url(#t26_g)" strokeWidth="1" opacity="0.2"/>
      <line x1="0" y1="200" x2="800" y2="200" stroke="url(#t26_g)" strokeWidth="1" opacity="0.2"/>
      {[70,110,150].map((r,i) => <circle key={i} cx="400" cy="200" r={r} fill="none" stroke="url(#t26_g)" strokeWidth="0.5" opacity={0.15-i*0.03}/>)}
      {[...Array(8)].map((_,i) => { const a=(i*45)*Math.PI/180; return <line key={i} x1="400" y1="200" x2={400+Math.cos(a)*180} y2={200+Math.sin(a)*180} stroke="url(#t26_g)" strokeWidth="0.5" opacity="0.08"/>; })}
      <polygon points="400,90 415,170 400,155 385,170" fill="url(#t26_g)" opacity="0.2"/>
      <polygon points="400,310 415,230 400,245 385,230" fill="url(#t26_g)" opacity="0.2"/>
      <rect x="310" y="168" width="180" height="64" fill="none" stroke="url(#t26_g)" strokeWidth="1" opacity="0.25" rx="2"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-3xl font-bold" style={{ color: "#ffd700", letterSpacing: "10px", fontVariant: "small-caps" }}>Art Deco</h2>
      <p className="mt-2 text-sm" style={{ color: "#daa520", letterSpacing: "5px" }}>Gatsby Era Elegance</p>
    </div></div>
  </div>
)),

T(27, "Marble Palace", "Luxury", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #f5f5f0, #e8e4de, #d4cfc5)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(10)].map((_,i) => <path key={i} d={`M${-50+i*60},${Math.random()*400} Q${200+Math.random()*200},${Math.random()*400} ${500+Math.random()*300},${Math.random()*400}`} fill="none" stroke="#b8a898" strokeWidth={0.5+Math.random()} opacity={0.08+Math.random()*0.08}/>)}
      <rect x="320" y="130" width="160" height="140" fill="none" stroke="#c9a96e" strokeWidth="1" opacity="0.25" rx="2"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-3xl font-bold" style={{ color: "#5c4a32", letterSpacing: "8px", fontVariant: "small-caps" }}>Marble Palace</h2>
      <p className="mt-2 text-sm" style={{ color: "#8b7355", letterSpacing: "4px" }}>Timeless Sophistication</p>
    </div></div>
  </div>
)),

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 CYBERPUNK & NEON (28-33)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T(28, "Neon Tokyo", "Cyberpunk", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #0f0f23, #1a0a2e)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t28_n"><feGaussianBlur stdDeviation="4"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {/* Neon signs */}
      <rect x="100" y="80" width="140" height="60" rx="8" fill="none" stroke="#ff00ff" strokeWidth="2" filter="url(#t28_n)" opacity="0.4"><animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/></rect>
      <rect x="560" y="120" width="160" height="50" rx="8" fill="none" stroke="#00ffff" strokeWidth="2" filter="url(#t28_n)" opacity="0.3"/>
      <circle cx="400" cy="200" r="40" fill="none" stroke="#ff6b9d" strokeWidth="2" filter="url(#t28_n)" opacity="0.25"><animate attributeName="r" values="40;45;40" dur="4s" repeatCount="indefinite"/></circle>
      {/* Grid floor */}
      {[...Array(10)].map((_,i) => <line key={i} x1={i*90} y1="320" x2={400+(i*90-400)*2} y2="400" stroke="#ff00ff" strokeWidth="0.5" opacity="0.08"/>)}
      {[0,1,2].map(i => <line key={i} x1="0" y1={330+i*25} x2="800" y2={330+i*25} stroke="#ff00ff" strokeWidth="0.5" opacity={0.06-i*0.015}/>)}
      {/* Rain effect */}
      {[...Array(20)].map((_,i) => <line key={`r${i}`} x1={Math.random()*800} y1={Math.random()*300} x2={Math.random()*800+2} y2={Math.random()*300+15} stroke="#00ffff" strokeWidth="0.5" opacity="0.08"/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-black" style={{ color: "#ff00ff", textShadow: "0 0 20px #ff00ff, 0 0 40px #ff00ff" }}>NEON TOKYO</h2>
      <p className="text-sm mt-1" style={{ color: "#00ffff", textShadow: "0 0 10px #00ffff" }}>ネオン東京</p>
    </div></div>
  </div>
)),

T(29, "Matrix Code", "Cyberpunk", () => (
  <div className="relative w-full h-96 overflow-hidden bg-black">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(25)].map((_,i) => (
        <text key={i} x={i*34} y="0" fill="#00ff41" fontSize="12" fontFamily="monospace" opacity={0.15+Math.random()*0.25}>
          {Array.from({length:30}, () => String.fromCharCode(0x30A0+Math.random()*96)).join('\n')}
          <animate attributeName="y" from={-400-Math.random()*200} to={800} dur={`${3+Math.random()*4}s`} repeatCount="indefinite"/>
        </text>
      ))}
    </svg>
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/70"/>
    <div className="absolute inset-0 flex items-center justify-center"><div className="text-center">
      <h2 className="text-4xl font-black" style={{ color: "#00ff41", textShadow: "0 0 20px #00ff41" }}>THE MATRIX</h2>
      <p className="text-green-400/40 text-sm font-mono mt-2">Follow the white rabbit</p>
    </div></div>
  </div>
)),

T(30, "Synthwave Grid", "Cyberpunk", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0015, #1a0030, #2d1b69, #ff6ec7)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
      <defs><linearGradient id="t30_s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6ec7"/><stop offset="100%" stopColor="#ff9a3c"/></linearGradient></defs>
      <circle cx="400" cy="260" r="60" fill="url(#t30_s)"/>
      {[...Array(5)].map((_,i) => <line key={i} x1="340" y1={260+i*12} x2="460" y2={260+i*12} stroke="#0a0015" strokeWidth="4"/>)}
      {[...Array(15)].map((_,i) => <line key={`v${i}`} x1={i*58} y1="290" x2={400+(i*58-400)*3} y2="400" stroke="#ff6ec7" strokeWidth="1" opacity="0.35"/>)}
      {[0,1,2,3,4].map(i => <line key={`h${i}`} x1="0" y1={290+i*22} x2="800" y2={290+i*22} stroke="#ff6ec7" strokeWidth="1" opacity={0.3-i*0.05}/>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center" style={{ paddingBottom: 100 }}><div>
      <h2 className="text-4xl font-bold italic" style={{ color: "#ff6ec7", textShadow: "0 0 25px #ff6ec7, 0 0 50px #ff6ec7" }}>SYNTHWAVE</h2>
      <p className="text-pink-300/50 text-sm mt-1">1986 · Retro Future</p>
    </div></div>
  </div>
)),

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌿 NATURE & ORGANIC (31-35)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T(31, "Cherry Blossom", "Nature", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #fce7f3, #fbcfe8, #f9a8d4)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(20)].map((_,i) => {
        const x=Math.random()*800, s=-30-Math.random()*50;
        return <ellipse key={i} cx={x} cy={s} rx="6" ry="4" fill="#f9a8d4" opacity={0.3+Math.random()*0.3}>
          <animate attributeName="cy" from={s} to="420" dur={`${5+Math.random()*7}s`} repeatCount="indefinite"/>
          <animate attributeName="cx" values={`${x};${x+25};${x-15};${x}`} dur={`${3+Math.random()*3}s`} repeatCount="indefinite"/>
        </ellipse>;
      })}
      <path d="M700,400 L700,160 Q710,140 730,130" fill="none" stroke="#78350f" strokeWidth="3" opacity="0.2"/>
      <path d="M700,240 Q720,230 740,235" fill="none" stroke="#78350f" strokeWidth="2" opacity="0.15"/>
      {[710,730,720,740,700].map((cx,i) => <circle key={i} cx={cx} cy={120+i*16+Math.random()*15} r={4+Math.random()*3} fill="#f472b6" opacity={0.2+Math.random()*0.15}/>)}
    </svg>
    <div className="absolute inset-0 flex items-center p-10"><div>
      <h2 className="text-4xl font-bold text-pink-800">Cherry Blossom</h2>
      <p className="text-pink-600/40 text-sm mt-2">桜 · Sakura Season</p>
    </div></div>
  </div>
)),

T(32, "Ocean Waves", "Nature", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #0077b6, #023e8a, #03045e)" }}>
    <svg className="absolute bottom-0 w-full" viewBox="0 0 800 220" preserveAspectRatio="none" style={{ height: "55%" }}>
      {[
        {fill:"#0096c7",o:0.4,d:"6s"},{fill:"#48cae4",o:0.3,d:"8s"},{fill:"#90e0ef",o:0.2,d:"10s"}
      ].map((w,i) => <path key={i} d={`M0,${80+i*35} C${150+i*20},${40+i*15} ${300+i*10},${120+i*10} ${450+i*5},${80+i*25} C${600-i*10},${40+i*20} ${750+i*5},${110+i*15} 800,${80+i*30} L800,220 L0,220Z`} fill={w.fill} opacity={w.o}>
        <animate attributeName="d" values={`M0,${80+i*35} C150,${40+i*15} 300,${120+i*10} 450,${80+i*25} C600,${40+i*20} 750,${110+i*15} 800,${80+i*30} L800,220 L0,220Z;M0,${100+i*35} C150,${120+i*15} 300,${40+i*10} 450,${100+i*25} C600,${120+i*20} 750,${50+i*15} 800,${100+i*30} L800,220 L0,220Z;M0,${80+i*35} C150,${40+i*15} 300,${120+i*10} 450,${80+i*25} C600,${40+i*20} 750,${110+i*15} 800,${80+i*30} L800,220 L0,220Z`} dur={w.d} repeatCount="indefinite"/>
      </path>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-black text-white drop-shadow-lg">Ocean Waves</h2>
      <p className="text-cyan-200/50 text-sm mt-2">Three-layer animated wave system</p>
    </div></div>
  </div>
)),

T(33, "Forest Canopy", "Nature", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #1b4332, #2d6a4f, #40916c)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(10)].map((_,i) => <ellipse key={i} cx={70+i*80} cy={50+Math.random()*40} rx={35+Math.random()*30} ry={25+Math.random()*18} fill={i%2?"#2d6a4f":"#40916c"} opacity={0.25+Math.random()*0.2}/>)}
      {[...Array(15)].map((_,i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*250} r={2+Math.random()*3} fill="#b7e4c7" opacity={0.15+Math.random()*0.2}><animate attributeName="opacity" values="0.1;0.35;0.1" dur={`${2+Math.random()*4}s`} repeatCount="indefinite"/></circle>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-bold text-green-100">Forest Canopy</h2>
      <p className="text-green-200/40 text-sm mt-2">Dappled light through digital foliage</p>
    </div></div>
  </div>
)),

T(34, "Volcanic Fire", "Nature", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #1a0000, #3d0000, #7f1d1d, #dc2626)" }}>
    <svg className="absolute bottom-0 w-full" viewBox="0 0 800 200" preserveAspectRatio="none" style={{ height: "45%" }}>
      <defs><filter id="t34_g"><feGaussianBlur stdDeviation="5"/></filter></defs>
      <path d="M0,60 Q100,20 200,50 Q350,80 450,30 Q600,70 800,40 L800,200 L0,200Z" fill="#991b1b" opacity="0.6"/>
      <path d="M0,90 Q150,60 300,85 Q500,110 700,70 L800,90 L800,200 L0,200Z" fill="#b91c1c" opacity="0.4"/>
      <path d="M100,120 Q200,100 300,120" fill="none" stroke="#fbbf24" strokeWidth="3" filter="url(#t34_g)" opacity="0.5"><animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/></path>
      <path d="M500,130 Q600,110 700,130" fill="none" stroke="#f97316" strokeWidth="2" filter="url(#t34_g)" opacity="0.4"><animate attributeName="opacity" values="0.4;0.2;0.4" dur="4s" repeatCount="indefinite"/></path>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center" style={{paddingBottom:80}}><div>
      <h2 className="text-4xl font-black text-orange-200" style={{ textShadow: "0 0 25px rgba(239,68,68,0.5)" }}>Volcanic Fire</h2>
      <p className="text-red-300/40 text-sm mt-2">Molten lava flows with ember glow</p>
    </div></div>
  </div>
)),

T(35, "Snowfall", "Nature", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #475569, #64748b, #cbd5e1)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(40)].map((_,i) => {
        const x=Math.random()*800, s=2+Math.random()*4;
        return <circle key={i} cx={x} cy={-10} r={s} fill="white" opacity={0.3+Math.random()*0.5}>
          <animate attributeName="cy" from={-10-Math.random()*100} to="420" dur={`${4+Math.random()*6}s`} repeatCount="indefinite"/>
          <animate attributeName="cx" values={`${x};${x+20};${x-10};${x}`} dur={`${3+Math.random()*3}s`} repeatCount="indefinite"/>
        </circle>;
      })}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-bold text-white drop-shadow-lg">Snowfall</h2>
      <p className="text-blue-100/50 text-sm mt-2">40 animated snowflakes drifting gently</p>
    </div></div>
  </div>
)),

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 ABSTRACT & MODERN (36-42)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T(36, "Morphing Blobs", "Abstract", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#faf5ff" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t36_b"><feGaussianBlur stdDeviation="15"/></filter></defs>
      <ellipse cx="200" cy="130" rx="140" ry="100" fill="#c084fc" opacity="0.3" filter="url(#t36_b)"><animate attributeName="rx" values="140;165;130;140" dur="8s" repeatCount="indefinite"/><animate attributeName="ry" values="100;115;90;100" dur="10s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="600" cy="250" rx="120" ry="110" fill="#fb7185" opacity="0.25" filter="url(#t36_b)"><animate attributeName="rx" values="120;140;110;120" dur="10s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="400" cy="190" rx="100" ry="85" fill="#60a5fa" opacity="0.2" filter="url(#t36_b)"><animate attributeName="ry" values="85;105;75;85" dur="9s" repeatCount="indefinite"/></ellipse>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-black text-purple-800">Morphing Blobs</h2>
      <p className="text-purple-500/40 text-sm mt-2">Organic shapes in perpetual motion</p>
    </div></div>
  </div>
)),

T(37, "Geometric Prism", "Abstract", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><linearGradient id="t37_p" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5"/><stop offset="33%" stopColor="#a78bfa" stopOpacity="0.5"/><stop offset="66%" stopColor="#fb7185" stopOpacity="0.5"/><stop offset="100%" stopColor="#34d399" stopOpacity="0.5"/></linearGradient></defs>
      <polygon points="400,40 520,160 460,310 340,310 280,160" fill="none" stroke="url(#t37_p)" strokeWidth="2" opacity="0.5"><animateTransform attributeName="transform" type="rotate" from="0 400 200" to="360 400 200" dur="25s" repeatCount="indefinite"/></polygon>
      <polygon points="400,80 480,160 450,270 350,270 320,160" fill="url(#t37_p)" opacity="0.08"><animateTransform attributeName="transform" type="rotate" from="0 400 200" to="-360 400 200" dur="18s" repeatCount="indefinite"/></polygon>
      {[0,72,144,216,288].map((a,i) => { const rad=a*Math.PI/180; return <line key={i} x1="400" y1="200" x2={400+Math.cos(rad)*350} y2={200+Math.sin(rad)*350} stroke={["#38bdf8","#a78bfa","#fb7185","#34d399","#fbbf24"][i]} strokeWidth="1" opacity="0.12"/>; })}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-3xl font-black text-white">Geometric Prism</h2>
      <p className="text-sky-300/40 text-sm mt-2">Rotating pentagonal prism with light refraction</p>
    </div></div>
  </div>
)),

T(38, "Topographic", "Abstract", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#f8fafc" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(16)].map((_,i) => <path key={i} d={`M${-50+i*10},${200+i*10} Q${200+i*5},${100+i*15} ${400+i*3},${180+i*8} T${850-i*10},${160+i*12}`} fill="none" stroke="#94a3b8" strokeWidth="1" opacity={0.08+i*0.02}/>)}
      <circle cx="550" cy="170" r="5" fill="#0ea5e9" opacity="0.6"/><circle cx="550" cy="170" r="16" fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.25"/>
    </svg>
    <div className="absolute inset-0 flex items-center p-10"><div>
      <h2 className="text-4xl font-black text-slate-800">Topographic</h2>
      <p className="text-slate-400 text-sm mt-2">Contour lines and elevation markers</p>
    </div></div>
  </div>
)),

T(39, "Noise Gradient", "Abstract", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #0ea5e9, #8b5cf6, #ec4899)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t39_n"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs>
      <rect width="800" height="400" filter="url(#t39_n)" opacity="0.08"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-black text-white" style={{ textShadow: "0 2px 15px rgba(0,0,0,0.3)" }}>Noise Gradient</h2>
      <p className="text-white/50 text-sm mt-2">Grainy texture over flowing gradients</p>
    </div></div>
  </div>
)),

T(40, "Holographic", "Abstract", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(20)].map((_,i) => <line key={i} x1={i*42} y1="0" x2={i*42+100} y2="400" stroke="white" strokeWidth="0.5" opacity={0.05+Math.random()*0.06}/>)}
    </svg>
    <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)" }}/>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-black text-white" style={{ textShadow: "0 0 25px rgba(255,255,255,0.5)" }}>Holographic</h2>
      <p className="text-white/50 text-sm mt-2">Iridescent rainbow with scan lines</p>
    </div></div>
  </div>
)),

T(41, "Diamond Grid", "Abstract", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(10)].map((_,r) => [...Array(12)].map((_,c) => <rect key={`${r}-${c}`} x={c*70+(r%2?35:0)} y={r*42-10} width="26" height="26" fill="none" stroke="#e94560" strokeWidth="1" opacity={0.1+Math.random()*0.2} transform={`rotate(45 ${c*70+(r%2?48:13)} ${r*42+3})`}><animate attributeName="opacity" values={`${0.06+Math.random()*0.1};${0.2+Math.random()*0.25};${0.06+Math.random()*0.1}`} dur={`${3+Math.random()*4}s`} repeatCount="indefinite"/></rect>))}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-3xl font-black text-white">Diamond Grid</h2>
      <p className="text-red-300/40 text-sm mt-2">120 pulsating diamond shapes</p>
    </div></div>
  </div>
)),

T(42, "Brutalist Raw", "Modern", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#e5e5e5" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <rect x="50" y="40" width="200" height="150" fill="#1a1a1a" opacity="0.06"/>
      <rect x="550" y="130" width="180" height="200" fill="#1a1a1a" opacity="0.04"/>
      <line x1="0" y1="260" x2="800" y2="260" stroke="#1a1a1a" strokeWidth="4"/>
      <line x1="0" y1="264" x2="800" y2="264" stroke="#1a1a1a" strokeWidth="1"/>
      <rect x="300" y="60" width="3" height="240" fill="#ef4444"/>
    </svg>
    <div className="absolute inset-0 flex items-center p-12"><div>
      <h2 className="text-5xl font-black text-black" style={{ letterSpacing: "-3px" }}>BRUTALIST</h2>
      <p className="text-gray-500 text-sm font-mono uppercase tracking-widest mt-2">RAW · HONEST · BOLD</p>
    </div></div>
  </div>
)),

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌊 SPECIAL EFFECTS (43-50)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T(43, "Lightning Storm", "Effects", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #1a1a2e, #2d2d44, #3d3d5c)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t43_g"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <polyline points="300,0 310,90 280,95 320,180 290,185 330,300" fill="none" stroke="#fbbf24" strokeWidth="3" filter="url(#t43_g)"><animate attributeName="opacity" values="0;1;0.8;0;0;0;0.9;0" dur="4s" repeatCount="indefinite"/></polyline>
      <polyline points="550,0 540,70 560,75 530,150 555,155 520,250" fill="none" stroke="#fbbf24" strokeWidth="2" filter="url(#t43_g)"><animate attributeName="opacity" values="0;0;0.7;0;0;1;0;0" dur="5s" repeatCount="indefinite"/></polyline>
      <rect width="800" height="400" fill="white" opacity="0"><animate attributeName="opacity" values="0;0.1;0;0;0;0;0.08;0" dur="4s" repeatCount="indefinite"/></rect>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-black text-yellow-200" style={{ textShadow: "0 0 20px rgba(251,191,36,0.4)" }}>Lightning Storm</h2>
      <p className="text-gray-400 text-sm mt-2">Dual animated lightning bolts with flash</p>
    </div></div>
  </div>
)),

T(44, "Liquid Chrome", "Effects", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #2c3e50, #3498db, #2c3e50)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><linearGradient id="t44_m" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#bdc3c7"/><stop offset="30%" stopColor="#ecf0f1"/><stop offset="50%" stopColor="#95a5a6"/><stop offset="70%" stopColor="#ecf0f1"/><stop offset="100%" stopColor="#7f8c8d"/></linearGradient><filter id="t44_b"><feGaussianBlur stdDeviation="8"/></filter></defs>
      <ellipse cx="300" cy="200" rx="220" ry="100" fill="url(#t44_m)" opacity="0.2" filter="url(#t44_b)"><animate attributeName="rx" values="220;260;220" dur="6s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="550" cy="180" rx="170" ry="85" fill="url(#t44_m)" opacity="0.15" filter="url(#t44_b)"><animate attributeName="cx" values="550;590;550" dur="8s" repeatCount="indefinite"/></ellipse>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-black text-white" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>Liquid Chrome</h2>
      <p className="text-gray-300/50 text-sm mt-2">Morphing metallic reflections</p>
    </div></div>
  </div>
)),

T(45, "Paper Cut Layers", "Effects", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#fef3c7" }}>
    <svg className="absolute bottom-0 w-full" viewBox="0 0 800 280" preserveAspectRatio="none" style={{ height: "70%" }}>
      <path d="M0,80 Q200,40 400,80 T800,60 L800,280 L0,280Z" fill="#fbbf24" opacity="0.35"/>
      <path d="M0,110 Q150,70 350,120 T700,80 L800,110 L800,280 L0,280Z" fill="#f59e0b" opacity="0.4"/>
      <path d="M0,150 Q250,110 450,155 T800,130 L800,280 L0,280Z" fill="#d97706" opacity="0.5"/>
      <path d="M0,190 Q200,165 400,195 T800,175 L800,280 L0,280Z" fill="#92400e" opacity="0.45"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center" style={{paddingBottom:50}}><div>
      <h2 className="text-4xl font-black text-amber-900">Paper Cut</h2>
      <p className="text-amber-700/50 text-sm mt-2">Four layered paper-cut wave effect</p>
    </div></div>
  </div>
)),

T(46, "Smoke Trail", "Effects", () => (
  <div className="relative w-full h-96 overflow-hidden bg-gray-950">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      <defs><filter id="t46_s"><feGaussianBlur stdDeviation="14"/></filter></defs>
      {[...Array(5)].map((_,i) => <path key={i} d={`M${80+i*160},380 Q${100+i*160},${280-i*20} ${150+i*140},${200-i*15} T${300+i*100},${80+i*10}`} fill="none" stroke={`rgba(255,255,255,${0.05+i*0.02})`} strokeWidth={18+i*4} filter="url(#t46_s)" strokeLinecap="round">
        <animate attributeName="d" values={`M${80+i*160},380 Q${100+i*160},${280-i*20} ${150+i*140},${200-i*15} T${300+i*100},${80+i*10};M${100+i*160},380 Q${120+i*160},${260-i*20} ${170+i*140},${210-i*15} T${280+i*100},${70+i*10};M${80+i*160},380 Q${100+i*160},${280-i*20} ${150+i*140},${200-i*15} T${300+i*100},${80+i*10}`} dur={`${8+i*2}s`} repeatCount="indefinite"/>
      </path>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-4xl font-black text-white/80">Smoke Trail</h2>
      <p className="text-gray-500 text-sm mt-2">Five animated wispy smoke paths</p>
    </div></div>
  </div>
)),

T(47, "Hexagon Network", "Tech", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(135deg, #0c0c1d, #1a1a3e)" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(8)].map((_,r) => [...Array(11)].map((_,c) => {
        const x=c*80+(r%2?40:0), y=r*50;
        const cs=["#6366f1","#8b5cf6","#a855f7","#c084fc"];
        return <path key={`${r}-${c}`} d="M0,-24 L21,-12 L21,12 L0,24 L-21,12 L-21,-12Z" transform={`translate(${x},${y})`} fill="none" stroke={cs[Math.floor(Math.random()*4)]} strokeWidth="1" opacity={0.08+Math.random()*0.2}>
          <animate attributeName="opacity" values={`${0.05+Math.random()*0.1};${0.2+Math.random()*0.25};${0.05+Math.random()*0.1}`} dur={`${3+Math.random()*4}s`} repeatCount="indefinite"/>
        </path>;
      }))}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-3xl font-black text-indigo-300">Hexagon Network</h2>
      <p className="text-violet-400/40 text-sm mt-2">88 pulsating hexagonal nodes</p>
    </div></div>
  </div>
)),

T(48, "Circuit Board", "Tech", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#0a1628" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(12)].map((_,i) => {
        const y=20+i*32;
        return <path key={i} d={`M${Math.random()*100},${y} L${180+Math.random()*100},${y} L${230+Math.random()*50},${y+18} L${380+Math.random()*200},${y+18}`} fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.15" strokeDasharray="5 15"><animate attributeName="stroke-dashoffset" from="1000" to="0" dur={`${5+Math.random()*5}s`} repeatCount="indefinite"/></path>;
      })}
      {[...Array(18)].map((_,i) => <circle key={i} cx={40+Math.random()*720} cy={20+Math.random()*360} r="3" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.25"><animate attributeName="fill" values="transparent;#22d3ee;transparent" dur={`${2+Math.random()*3}s`} repeatCount="indefinite"/></circle>)}
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center"><div>
      <h2 className="text-3xl font-black text-cyan-400" style={{ textShadow: "0 0 15px rgba(34,211,238,0.3)" }}>Circuit Board</h2>
      <p className="text-cyan-300/30 text-sm font-mono mt-2">Digital pathways illuminated</p>
    </div></div>
  </div>
)),

T(49, "Desert Dunes", "Nature", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "linear-gradient(180deg, #fef3c7, #fbbf24, #d97706)" }}>
    <svg className="absolute bottom-0 w-full" viewBox="0 0 800 200" preserveAspectRatio="none" style={{ height: "50%" }}>
      <path d="M0,80 Q100,30 250,70 Q400,110 550,50 Q700,0 800,40 L800,200 L0,200Z" fill="#b45309" opacity="0.35"/>
      <path d="M0,110 Q200,55 400,100 Q600,140 800,75 L800,200 L0,200Z" fill="#92400e" opacity="0.3"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center text-center" style={{paddingBottom:40}}><div>
      <h2 className="text-4xl font-black text-amber-900">Desert Dunes</h2>
      <p className="text-amber-800/40 text-sm mt-2">Golden sand waves under hot sun</p>
    </div></div>
  </div>
)),

T(50, "Zen Garden", "Minimal", () => (
  <div className="relative w-full h-96 overflow-hidden" style={{ background: "#f5f0e8" }}>
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400">
      {[...Array(12)].map((_,i) => <path key={i} d={`M0,${180+i*15} Q200,${175+i*15} 400,${180+i*15} T800,${178+i*15}`} fill="none" stroke="#c2b280" strokeWidth="0.8" opacity="0.15"/>)}
      <circle cx="600" cy="150" r="30" fill="#8b9467" opacity="0.2"/><circle cx="620" cy="170" r="20" fill="#6b7c47" opacity="0.15"/>
      <circle cx="200" cy="130" r="8" fill="#a09070" opacity="0.3"/><circle cx="230" cy="150" r="6" fill="#a09070" opacity="0.25"/>
    </svg>
    <div className="absolute inset-0 flex items-center p-12"><div>
      <h2 className="text-4xl font-light text-stone-700" style={{ letterSpacing: "8px" }}>禅 ZEN</h2>
      <p className="text-stone-400 text-sm mt-3" style={{ letterSpacing: "3px" }}>Simplicity · Balance · Peace</p>
    </div></div>
  </div>
)),

];

const themes = CMS_THEME_GALLERY_THEMES;

// ═══════════════════════════════════════════
// GALLERY COMPONENT
// ═══════════════════════════════════════════

export const CMS_THEME_GALLERY_CATEGORIES = ["All", ...new Set(themes.map(t => t.category))];
export const CMS_THEME_GALLERY_CATEGORY_ICONS = { All:"🎯", Glass:"🔮", Candy:"🍬", Aurora:"🌌", Space:"🚀", Gaming:"🎮", Cyberpunk:"⚡", Luxury:"💎", Nature:"🌿", Abstract:"🎨", Modern:"✨", Effects:"🔥", Tech:"🔌", Minimal:"◻️" };

export default function ThemeGallery() {
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [cols, setCols] = useState(2);

  const filtered = themes.filter(t => {
    const mc = cat === "All" || t.category === cat;
    const ms = t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  return (
    <div className="min-h-screen" style={{ background: "#050508", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-50" style={{ background: "rgba(5,5,8,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}>🎨</div>
              <div>
                <h1 className="text-lg font-bold text-white">CMS Theme Gallery</h1>
                <p className="text-gray-600 text-xs">{themes.length} Advanced Website Themes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="text" placeholder="Search themes..." value={search} onChange={e => setSearch(e.target.value)} className="text-sm rounded-xl px-4 py-2 w-48 outline-none" style={{ background: "rgba(255,255,255,0.04)", color: "white", border: "1px solid rgba(255,255,255,0.06)" }}/>
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {[1,2].map(n => <button key={n} onClick={() => setCols(n)} className="px-3 py-1.5 text-xs" style={{ background: cols===n ? "rgba(255,255,255,0.08)" : "transparent", color: cols===n ? "white" : "#444" }}>{n===1?"List":"Grid"}</button>)}
              </div>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {CMS_THEME_GALLERY_CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)} className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all" style={{
                background: cat===c ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.02)",
                color: cat===c ? "#c4b5fd" : "#555",
                border: `1px solid ${cat===c ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.04)"}`
              }}>{CMS_THEME_GALLERY_CATEGORY_ICONS[c]||"✦"} {c} {cat===c ? `(${filtered.length})`:""}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className={cols===2 ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "flex flex-col gap-6"}>
          {filtered.map(t => (
            <div key={t.id} className="group" onClick={() => setSelected(selected===t.id ? null : t.id)}>
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-violet-400/40 text-xs font-mono">#{String(t.id).padStart(2,'0')}</span>
                  <span className="text-gray-200 text-sm font-medium">{t.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.03)", color: "#666" }}>{t.category}</span>
                  {selected===t.id && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">Active</span>}
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300" style={{
                border: selected===t.id ? "2px solid rgba(124,58,237,0.5)" : "2px solid rgba(255,255,255,0.03)",
                boxShadow: selected===t.id ? "0 0 40px rgba(124,58,237,0.12)" : "none",
                transform: selected===t.id ? "scale(1.005)" : "none"
              }}>
                {t.render()}
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center py-24"><span className="text-3xl mb-3 block">🔍</span><p className="text-gray-600 text-sm">No themes match your search</p></div>}
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
        <p className="text-gray-700 text-xs">50 Advanced Themes · SVG Animated · CMS Ready</p>
      </div>
    </div>
  );
}
