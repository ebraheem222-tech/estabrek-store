import{a as p,b as n,e as f}from"./2E5RASL6.js";import{a as l,e as z}from"./VFXPJIQT.js";import{Bc as y,E as d,Hf as N,Hh as k,K as u,Td as h,a as m,b as F,c as R,d as M,jh as w,wa as g,wh as _,xb as b}from"./QLRGKSQP.js";var t=m(F(),1),r=m(R(),1),a=m(M(),1);var e=m(k(),1),O=p+`
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  if (u_res.x / u_res.y > 1.3) uv.x -= 0.42;
  uv -= (u_mouse - 0.5) * 0.12;
  float r = length(uv);
  float R = 0.3;
  float t = u_time;
  vec3 col = vec3(0.01, 0.0, 0.03);
  float a = atan(uv.y, uv.x);
  float cor = fbm(vec2(a * 2.0 + t * 0.25, r * 7.0 - t * 0.9));
  float halo = exp(-max(r - R, 0.0) * 8.0);
  col += vec3(0.75, 0.25, 1.0) * halo * (0.25 + 0.75 * cor) * step(R, r);
  col += vec3(0.2, 0.6, 1.0) * exp(-max(r - R, 0.0) * 30.0) * 0.6 * step(R, r);
  if (r < R) {
    float z = sqrt(R * R - r * r) / R;
    vec3 n = normalize(vec3(uv / R, z));
    vec2 q = n.xy * 2.2 + vec2(t * 0.12, 0.0);
    float f = fbm(q * 1.6 + vec2(t * 0.25, -t * 0.2) + fbm(q * 3.0 - t * 0.3));
    float veins = pow(1.0 - abs(f * 2.0 - 1.0), 7.0);
    vec3 base = mix(vec3(0.12, 0.02, 0.32), vec3(0.95, 0.3, 1.0), f);
    base += vec3(0.55, 0.9, 1.0) * veins * 1.4;
    float rim = pow(1.0 - z, 2.0);
    col = base * (0.3 + 0.7 * z) + rim * vec3(1.0, 0.55, 1.0) * 1.2;
  }
  float s = hash(floor(gl_FragCoord.xy * 0.5));
  col += step(0.997, s) * 0.5 * step(R + 0.08, r);
  gl_FragColor = vec4(col, 1.0);
}`;function j(){return(0,e.jsxs)("section",{className:"relative h-[680px] overflow-hidden bg-black text-white",children:[(0,e.jsx)(n,{frag:O,scale:.7,fallback:"bg-[radial-gradient(circle_at_72%_50%,#a21caf,#000_55%)]"}),(0,e.jsx)(f,{opacity:.06}),(0,e.jsx)("div",{className:"pointer-events-none absolute inset-0 bg-black/50 md:hidden"}),(0,e.jsxs)("div",{className:"pointer-events-none relative z-10 flex h-full flex-col justify-center px-10",children:[(0,e.jsxs)(a.motion.p,{initial:{opacity:0},animate:{opacity:1},className:"flex items-center gap-2 text-xs tracking-[0.4em] text-fuchsia-200/70 uppercase",children:[(0,e.jsx)(u,{className:"size-4"}),(0,e.jsx)(t.T,{s:" Voltaic \xB7 fusion grid"})]}),(0,e.jsxs)(a.motion.h2,{initial:{opacity:0,y:40,filter:"blur(12px)"},animate:{opacity:1,y:0,filter:"blur(0px)"},transition:{duration:1.1,ease:l},className:"mt-6 font-display text-7xl leading-[0.95] font-bold tracking-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)] md:text-8xl",children:[(0,e.jsx)(t.T,{s:"Energy,"}),(0,e.jsx)("br",{}),(0,e.jsx)("span",{className:"bg-linear-to-r from-fuchsia-300 via-violet-200 to-sky-300 bg-clip-text font-serif font-normal text-transparent italic",children:(0,e.jsx)(t.T,{s:"bottled."})})]}),(0,e.jsx)(a.motion.p,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.3,duration:.8},className:"mt-6 max-w-md text-lg text-white/65",children:(0,e.jsx)(t.T,{s:"A star-hot plasma core the size of a shipping container. Clean power for a city block, all day and all night."})}),(0,e.jsxs)(a.motion.div,{initial:{opacity:0,y:20},animate:{opacity:1,y:0},transition:{delay:.45,duration:.8},className:"pointer-events-auto mt-8 flex flex-wrap gap-3",children:[(0,e.jsxs)("a",{href:"#",className:"flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black shadow-[0_0_40px_rgba(217,70,239,0.5)]",children:[(0,e.jsx)(t.T,{s:"Reserve a core "}),(0,e.jsx)(d,{className:"size-4"})]}),(0,e.jsx)("a",{href:"#",className:"rounded-full border border-white/20 bg-white/5 px-6 py-3 font-semibold backdrop-blur",children:(0,e.jsx)(t.T,{s:"How it works"})})]}),(0,e.jsx)("div",{className:"mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6",children:(0,e.jsx)(t.T,{s:[[150,"M \xB0C","core temperature"],[0," g","CO\u2082 per kWh"],[24,"/7","steady output"]].map(([o,s,i],c)=>(0,e.jsxs)(a.motion.div,{initial:{opacity:0,y:16},animate:{opacity:1,y:0},transition:{delay:.6+c*.1},children:[(0,e.jsx)("p",{className:"font-display text-2xl font-bold whitespace-nowrap sm:text-3xl",children:(0,e.jsx)(z,{to:o,suffix:s})}),(0,e.jsx)("p",{className:"text-xs text-white/50",children:(0,e.jsx)(t.T,{s:i})})]},i))})})]})]})}var I=p+`
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  float hz = 0.4;
  float t = u_time;
  vec2 sun = vec2(0.5 + (u_mouse.x - 0.5) * 0.35, hz + 0.1 + (u_mouse.y - 0.5) * 0.08);
  vec3 col;
  if (uv.y > hz) {
    float h = (uv.y - hz) / (1.0 - hz);
    col = mix(vec3(1.0, 0.52, 0.32), vec3(0.16, 0.09, 0.32), pow(h, 0.55));
    float d = length((uv - sun) * vec2(asp, 1.0));
    col += vec3(1.0, 0.78, 0.5) * smoothstep(0.075, 0.07, d);
    col += vec3(1.0, 0.45, 0.25) * exp(-d * 5.0) * 0.55;
    float c = fbm(vec2(uv.x * asp * 1.6 + t * 0.012, uv.y * 7.0));
    col = mix(col, vec3(0.98, 0.55, 0.5), smoothstep(0.55, 0.85, c) * 0.4 * h);
  } else {
    float dy = hz - uv.y;
    float z = 0.06 / (dy + 0.004);
    vec2 p = vec2((uv.x - 0.5) * asp * z, z);
    float w = fbm(p * vec2(1.4, 3.0) + vec2(0.0, t * 0.5)) + 0.5 * fbm(p * 4.0 - vec2(t * 0.35, 0.0));
    vec3 deep = vec3(0.04, 0.06, 0.18), near = vec3(0.32, 0.17, 0.36);
    col = mix(near, deep, smoothstep(0.0, 0.35, dy));
    col = mix(col, vec3(0.9, 0.45, 0.35), pow(1.0 - dy / hz, 14.0) * 0.7);
    float rx = abs((uv.x - sun.x) * asp);
    float glint = smoothstep(0.62, 1.05, w) * exp(-rx * (4.0 + dy * 12.0));
    col += vec3(1.0, 0.72, 0.45) * glint * 2.0;
    col += vec3(0.06, 0.05, 0.12) * w;
  }
  gl_FragColor = vec4(col, 1.0);
}`;function J(){let[o,s]=(0,r.useState)(2);return(0,e.jsxs)("section",{className:"relative h-[680px] overflow-hidden bg-[#1b0d24] text-white",children:[(0,e.jsx)(n,{frag:I,scale:.6,fallback:"bg-linear-to-b from-indigo-950 via-orange-400 to-indigo-950"}),(0,e.jsxs)("div",{className:"relative z-10 flex h-full flex-col px-10 pt-8 pb-10",children:[(0,e.jsxs)("nav",{className:"flex items-center justify-between text-sm",children:[(0,e.jsx)("span",{className:"font-serif text-2xl italic",children:(0,e.jsx)(t.T,{s:"Saltwind"})}),(0,e.jsxs)("span",{className:"hidden gap-8 text-white/80 md:flex",children:[(0,e.jsx)("a",{href:"#",children:(0,e.jsx)(t.T,{s:"Villas"})}),(0,e.jsx)("a",{href:"#",children:(0,e.jsx)(t.T,{s:"Journeys"})}),(0,e.jsx)("a",{href:"#",children:(0,e.jsx)(t.T,{s:"Journal"})})]}),(0,e.jsx)("a",{href:"#",className:"rounded-full border border-white/30 px-4 py-1.5 backdrop-blur",children:(0,e.jsx)(t.T,{s:"Sign in"})})]}),(0,e.jsxs)("div",{className:"mt-auto mb-10 text-center",children:[(0,e.jsx)(a.motion.p,{initial:{opacity:0,letterSpacing:"0.1em"},animate:{opacity:1,letterSpacing:"0.5em"},transition:{duration:1.6,ease:l},className:"text-xs text-white/70 uppercase",children:(0,e.jsx)(t.T,{s:"Golden hour, every evening"})}),(0,e.jsx)(a.motion.h2,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{duration:1,ease:l},className:"mt-4 font-serif text-7xl leading-none drop-shadow-[0_2px_20px_rgba(80,20,40,0.5)] md:text-8xl",children:(0,e.jsx)(t.T,{s:"Chase the last light."})})]}),(0,e.jsxs)(a.motion.div,{initial:{opacity:0,y:40},animate:{opacity:1,y:0},transition:{delay:.4,duration:.9,ease:l},className:"mx-auto grid w-full max-w-3xl gap-2 rounded-3xl border border-white/20 bg-white/10 p-2 backdrop-blur-xl sm:grid-cols-[1.2fr_1fr_auto_auto]",children:[(0,e.jsxs)("label",{className:"flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/10",children:[(0,e.jsx)(h,{className:"size-5 text-orange-200"}),(0,e.jsxs)("span",{children:[(0,e.jsx)("span",{className:"block text-[11px] text-white/60",children:(0,e.jsx)(t.T,{s:"Where"})}),(0,e.jsx)("span",{className:"block font-medium",children:(0,e.jsx)(t.T,{s:"Aqaba, Red Sea"})})]})]}),(0,e.jsxs)("label",{className:"flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-white/10",children:[(0,e.jsx)(g,{className:"size-5 text-orange-200"}),(0,e.jsxs)("span",{children:[(0,e.jsx)("span",{className:"block text-[11px] text-white/60",children:(0,e.jsx)(t.T,{s:"When"})}),(0,e.jsx)("span",{className:"block font-medium",children:(0,e.jsx)(t.T,{s:"14 \u2013 19 May"})})]})]}),(0,e.jsxs)("div",{className:"flex items-center gap-3 rounded-2xl px-4 py-3",children:[(0,e.jsx)(w,{className:"size-5 text-orange-200"}),(0,e.jsx)("button",{onClick:()=>s(i=>Math.max(1,i-1)),className:"grid size-7 place-items-center rounded-full border border-white/30",children:"\u2212"}),(0,e.jsxs)("span",{className:"w-14 text-center font-medium tabular-nums",children:[(0,e.jsx)(a.AnimatePresence,{mode:"popLayout",children:(0,e.jsx)(a.motion.span,{initial:{y:-10,opacity:0},animate:{y:0,opacity:1},exit:{y:10,opacity:0},className:"inline-block",children:(0,e.jsx)(t.T,{s:o})},o)}),(0,e.jsx)(t.T,{s:" guests"})]}),(0,e.jsx)("button",{onClick:()=>s(i=>Math.min(8,i+1)),className:"grid size-7 place-items-center rounded-full border border-white/30",children:"+"})]}),(0,e.jsxs)("button",{className:"flex items-center justify-center gap-2 rounded-2xl bg-orange-300 px-6 py-3 font-semibold text-[#2a1020]",children:[(0,e.jsx)(N,{className:"size-4"}),(0,e.jsx)(t.T,{s:" Search"})]})]})]})]})}var P=p+`
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.y;
  float t = u_time * 0.05;
  vec2 m = u_mouse * vec2(u_res.x / u_res.y, 1.0);
  vec2 q = vec2(fbm(uv * 1.5 + t), fbm(uv * 1.5 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(uv * 1.5 + 4.0 * q + vec2(1.7, 9.2) + t * 1.5), fbm(uv * 1.5 + 4.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(uv * 1.5 + 4.0 * r + (m - uv) * 0.35);
  vec3 paper = vec3(0.96, 0.93, 0.87);
  vec3 ink = vec3(0.06, 0.08, 0.26);
  vec3 red = vec3(0.82, 0.22, 0.16);
  vec3 col = mix(paper, ink, smoothstep(0.48, 0.86, f));
  col = mix(col, red, smoothstep(0.62, 0.95, length(q)) * 0.6 * smoothstep(0.35, 0.7, f));
  col = mix(col, ink * 0.6, smoothstep(0.82, 0.95, f) * 0.6);
  gl_FragColor = vec4(col, 1.0);
}`;function W(){return(0,e.jsxs)("section",{className:"relative h-[660px] overflow-hidden bg-[#f5eedf] text-[#141936] [color-scheme:light]",children:[(0,e.jsx)(n,{frag:P,scale:.5,fallback:"bg-[#f5eedf]"}),(0,e.jsx)(f,{opacity:.12}),(0,e.jsxs)("div",{className:"relative z-10 grid h-full items-center gap-10 px-10 md:grid-cols-[1fr_auto]",children:[(0,e.jsxs)(a.motion.div,{initial:{opacity:0,x:-40},animate:{opacity:1,x:0},transition:{duration:1,ease:l},className:"max-w-md rounded-[2rem] bg-[#f5eedf]/85 p-9 shadow-[0_30px_80px_-30px_rgba(20,25,54,0.45)] backdrop-blur-md",children:[(0,e.jsx)("p",{className:"text-xs tracking-[0.35em] text-[#b8382a] uppercase",children:(0,e.jsx)(t.T,{s:"Gallery Nine \xB7 Amman"})}),(0,e.jsxs)("h2",{className:"mt-4 font-serif text-6xl leading-[0.95]",children:[(0,e.jsx)(t.T,{s:"Ink & "}),(0,e.jsx)("span",{className:"italic",children:(0,e.jsx)(t.T,{s:"Silence"})})]}),(0,e.jsx)("p",{className:"mt-4 text-[#141936]/70",children:(0,e.jsx)(t.T,{s:"Moving calligraphy, poured in water and filmed in slow motion. Forty works by eleven artists, shown together for the first time."})}),(0,e.jsxs)("dl",{className:"mt-6 grid grid-cols-2 gap-4 border-t border-[#141936]/15 pt-5 text-sm",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)("dt",{className:"text-[#141936]/50",children:(0,e.jsx)(t.T,{s:"Opens"})}),(0,e.jsx)("dd",{className:"font-semibold",children:(0,e.jsx)(t.T,{s:"12 March 2027"})})]}),(0,e.jsxs)("div",{children:[(0,e.jsx)("dt",{className:"text-[#141936]/50",children:(0,e.jsx)(t.T,{s:"Tickets"})}),(0,e.jsx)("dd",{className:"font-semibold",children:(0,e.jsx)(t.T,{s:"from JOD 6"})})]})]}),(0,e.jsxs)("a",{href:"#",className:"mt-6 inline-flex items-center gap-2 rounded-full bg-[#141936] px-6 py-3 font-semibold text-[#f5eedf]",children:[(0,e.jsx)(t.T,{s:"Book a visit "}),(0,e.jsx)(d,{className:"size-4"})]})]}),(0,e.jsx)(a.motion.p,{initial:{opacity:0,scale:.9},animate:{opacity:1,scale:1},transition:{delay:.4,duration:1.4,ease:l},dir:"rtl",lang:"ar",className:"hidden text-[13rem] leading-none font-bold text-[#141936]/85 mix-blend-multiply md:block",children:(0,e.jsx)(t.T,{s:"\u062D\u0650\u0628\u0631"})})]})]})}var q=p+`
float ridge(vec2 p){ return pow(1.0 - abs(noise(p) * 2.0 - 1.0), 9.0); }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.y;
  float t = u_time * 0.45;
  vec2 w = vec2(fbm(uv * 2.0 + t * 0.3), fbm(uv * 2.0 - t * 0.25 + 3.1));
  vec2 p = uv * 5.5 + w * 1.7;
  float c = ridge(p + vec2(t, t * 0.6)) + ridge(p * 1.35 - vec2(t * 0.7, -t * 0.4)) * 0.8 + ridge(p * 0.7 + vec2(-t * 0.3, t * 0.5)) * 0.5;
  vec3 deep = vec3(0.0, 0.3, 0.44), light = vec3(0.12, 0.72, 0.8);
  vec3 col = mix(deep, light, gl_FragCoord.y / u_res.y * 0.6 + 0.2);
  vec2 g = fract(uv * 7.0 + w * 0.12);
  float grout = smoothstep(0.035, 0.0, min(g.x, g.y));
  col = mix(col, col * 0.72, grout * 0.7);
  col += vec3(0.8, 1.0, 1.0) * c * 0.5;
  vec2 m = u_mouse * vec2(u_res.x / u_res.y, 1.0);
  float d = length(uv - m);
  col += vec3(0.7, 1.0, 1.0) * 0.18 * sin(d * 48.0 - u_time * 5.0) * exp(-d * 5.0);
  gl_FragColor = vec4(col, 1.0);
}`,C=[["Plunge","3 \xD7 2 m","JOD 9k \u2013 14k","Small yards and rooftops."],["Lap","12 \xD7 2.5 m","JOD 22k \u2013 30k","Long, narrow, made for laps."],["Infinity","10 \xD7 4 m","JOD 38k +","An edge that meets the view."]];function G(){let o=(0,t.useLx)(),[s,i]=(0,r.useState)(1),[,c,S,A]=C[s];return(0,e.jsxs)("section",{className:"relative min-h-[640px] overflow-hidden bg-cyan-900 text-white",children:[(0,e.jsx)(n,{frag:q,scale:.6,fallback:"bg-linear-to-b from-cyan-500 to-cyan-900"}),(0,e.jsxs)("div",{className:"relative z-10 grid min-h-[640px] items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[1.2fr_1fr]",children:[(0,e.jsxs)("div",{children:[(0,e.jsxs)("p",{className:"flex items-center gap-2 text-sm font-medium text-cyan-50/80",children:[(0,e.jsx)(_,{className:"size-4"}),(0,e.jsx)(t.T,{s:" Azure & Stone"})]}),(0,e.jsx)(a.motion.h2,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{duration:.9,ease:l},className:"mt-5 font-display text-5xl leading-[1.02] font-bold drop-shadow-[0_4px_24px_rgba(0,40,60,0.45)] sm:text-6xl md:text-7xl",children:(0,e.jsx)(t.T,{s:"Pools built like jewellery."})}),(0,e.jsx)("p",{className:"mt-5 max-w-md text-lg text-cyan-50/85",children:(0,e.jsx)(t.T,{s:"Hand-cut stone, quiet pumps and light that dances on the floor. Move your mouse over the water."})})]}),(0,e.jsxs)(a.motion.div,{initial:{opacity:0,y:40},animate:{opacity:1,y:0},transition:{delay:.3,duration:.9,ease:l},className:"rounded-[2rem] border border-white/30 bg-white/15 p-6 shadow-2xl backdrop-blur-xl",children:[(0,e.jsx)("p",{className:"font-semibold",children:(0,e.jsx)(t.T,{s:"Choose a shape"})}),(0,e.jsx)("div",{className:"mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-cyan-950/30 p-1.5",children:(0,e.jsx)(t.T,{s:C.map(([v],x)=>(0,e.jsxs)("button",{onClick:()=>i(x),className:"relative rounded-xl px-3 py-2.5 text-sm font-semibold",children:[(0,e.jsx)(t.T,{s:s===x&&(0,e.jsx)(a.motion.span,{layoutId:"pool-pick",className:"absolute inset-0 rounded-xl bg-white",transition:{type:"spring",stiffness:380,damping:30}})}),(0,e.jsx)("span",{className:`relative ${(0,t.spell)(o,s===x?"text-cyan-900":"text-white","tpl")}`,children:(0,e.jsx)(t.T,{s:v})})]},v))})}),(0,e.jsx)(a.AnimatePresence,{mode:"wait",children:(0,e.jsxs)(a.motion.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},transition:{duration:.25},className:"mt-5 grid grid-cols-2 gap-4",children:[(0,e.jsxs)("div",{className:"rounded-2xl bg-white/10 p-4",children:[(0,e.jsx)("p",{className:"text-xs text-cyan-50/70",children:(0,e.jsx)(t.T,{s:"Typical size"})}),(0,e.jsx)("p",{className:"mt-1 font-display text-2xl font-bold",children:(0,e.jsx)(t.T,{s:c})})]}),(0,e.jsxs)("div",{className:"rounded-2xl bg-white/10 p-4",children:[(0,e.jsx)("p",{className:"text-xs text-cyan-50/70",children:(0,e.jsx)(t.T,{s:"Budget"})}),(0,e.jsx)("p",{className:"mt-1 font-display text-2xl font-bold",children:(0,e.jsx)(t.T,{s:S})})]}),(0,e.jsxs)("p",{className:"col-span-2 flex items-center gap-2 text-sm text-cyan-50/85",children:[(0,e.jsx)(y,{className:"size-4"})," ",(0,e.jsx)(t.T,{s:A})]})]},s)}),(0,e.jsxs)("button",{className:"mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-semibold text-cyan-900",children:[(0,e.jsx)(t.T,{s:"Book a design visit "}),(0,e.jsx)(d,{className:"size-4"})]})]})]})]})}var L=`
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float cyc = mod(u_time * 0.3, 8.0);
  float zoom = exp(-cyc);
  float a = u_time * 0.05;
  uv = mat2(cos(a), -sin(a), sin(a), cos(a)) * uv;
  vec2 c = vec2(-0.743643887, 0.131825904) + uv * zoom * 2.2;
  vec2 z = vec2(0.0);
  float it = 0.0, m2 = 0.0, esc = 0.0;
  for (int i = 0; i < 220; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    m2 = dot(z, z);
    if (m2 > 256.0) { esc = 1.0; break; }
    it += 1.0;
  }
  vec3 col = vec3(0.0);
  if (esc > 0.5) {
    float sm = it - log2(log2(m2)) + 4.0;
    col = 0.5 + 0.5 * cos(3.0 + sm * 0.11 + vec3(0.0, 0.6, 1.0) + u_time * 0.15 + u_mouse.x * 4.0);
    col *= 0.6 + 0.4 * smoothstep(0.0, 30.0, sm);
  }
  float fade = smoothstep(0.0, 0.35, cyc) * smoothstep(8.0, 7.65, cyc);
  gl_FragColor = vec4(col * fade, 1.0);
}`;function $(){let[o,s]=(0,r.useState)(1);return(0,r.useEffect)(()=>{let i=performance.now(),c=setInterval(()=>s(Math.exp((performance.now()-i)/1e3*.3%8)),120);return()=>clearInterval(c)},[]),(0,e.jsxs)("section",{className:"relative h-[640px] overflow-hidden bg-black font-mono text-white",children:[(0,e.jsx)(n,{frag:L,scale:.6,fallback:"bg-linear-to-br from-sky-900 via-black to-orange-900"}),(0,e.jsx)("div",{className:"pointer-events-none absolute inset-0 z-10 grid place-items-center",children:(0,e.jsx)(b,{className:"size-10 text-white/40",strokeWidth:1})}),(0,e.jsxs)("div",{className:"pointer-events-none relative z-10 flex h-full flex-col justify-between p-8",children:[(0,e.jsxs)("div",{className:"flex items-start justify-between text-xs text-white/70",children:[(0,e.jsxs)("div",{className:"space-y-1 rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur",children:[(0,e.jsx)("p",{children:(0,e.jsx)(t.T,{s:"re \u22120.743643887"})}),(0,e.jsx)("p",{children:(0,e.jsx)(t.T,{s:"im +0.131825904"})}),(0,e.jsx)("p",{children:(0,e.jsx)(t.T,{s:"iter 220"})})]}),(0,e.jsxs)("div",{className:"rounded-xl border border-white/15 bg-black/40 p-4 text-right backdrop-blur",children:[(0,e.jsx)("p",{className:"text-white/50",children:(0,e.jsx)(t.T,{s:"zoom"})}),(0,e.jsxs)("p",{className:"font-display text-3xl font-bold tabular-nums",children:["\xD7",(0,e.jsx)(t.T,{s:o<1e3?o.toFixed(1):Math.round(o).toLocaleString("en-US")})]})]})]}),(0,e.jsxs)("div",{className:"max-w-xl",children:[(0,e.jsxs)("h2",{className:"font-display text-6xl leading-none font-bold drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]",children:[(0,e.jsx)(t.T,{s:"Infinite detail."}),(0,e.jsx)("br",{}),(0,e.jsx)(t.T,{s:"Zero lag."})]}),(0,e.jsx)("p",{className:"mt-4 text-sm text-white/70",children:(0,e.jsx)(t.T,{s:"Deepfield renders math in real time on your graphics card. This is the same shape, getting closer forever."})}),(0,e.jsxs)("a",{href:"#",className:"pointer-events-auto mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-sans font-semibold text-black",children:[(0,e.jsx)(t.T,{s:"Try the renderer "}),(0,e.jsx)(d,{className:"size-4"})]})]})]})]})}export{j as a,J as b,W as c,G as d,$ as e};
