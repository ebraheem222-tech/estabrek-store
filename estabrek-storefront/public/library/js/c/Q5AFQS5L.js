import{a as x,b as p,e as L}from"./XRXHRINY.js";import{a as f,e as T}from"./VFXPJIQT.js";import{Ad as k,E as h,G as v,Hh as C,Lb as N,Mg as z,Qg as S,a as d,b as E,c as R,d as F,ig as u,nb as y,pe as _,zc as w}from"./QLRGKSQP.js";var t=d(E(),1),m=d(R(),1),r=d(F(),1);var e=d(C(),1),I=`
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  uv -= (u_mouse - 0.5) * 0.35;
  float r = length(uv) + 0.0001;
  float a = atan(uv.y, uv.x);
  float t = u_time;
  float z = 0.32 / r + t * 1.4;
  float ang = a / 3.14159265 * 8.0 + t * 0.1;
  vec2 f = abs(fract(vec2(ang, z)) - 0.5);
  float line = smoothstep(0.38, 0.5, max(f.x, f.y));
  vec3 hue = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + z * 0.04));
  float pulse = smoothstep(0.85, 1.0, fract(z * 0.125));
  vec3 col = hue * line * 1.3 + vec3(1.0) * pulse * line * 0.8;
  col += hue * 0.06;
  col *= smoothstep(0.0, 0.45, r);
  col += vec3(0.75, 0.85, 1.0) * exp(-r * 9.0) * 0.9;
  gl_FragColor = vec4(col, 1.0);
}`,D=[["07:40","Aqaba","Boarding"],["08:15","Irbid","On time"],["08:50","Dead Sea","On time"]];function G(){return(0,e.jsxs)("section",{className:"relative h-[660px] overflow-hidden bg-black text-white",children:[(0,e.jsx)(p,{frag:I,scale:.7,fallback:"bg-[radial-gradient(circle,#312e81,#000_70%)]"}),(0,e.jsx)("div",{className:"pointer-events-none absolute inset-0 bg-[radial-gradient(circle,transparent_30%,rgba(0,0,0,0.65)_80%)]"}),(0,e.jsxs)("div",{className:"relative z-10 flex h-full flex-col items-center justify-center px-8 text-center",children:[(0,e.jsxs)(r.motion.p,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},className:"flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-xs tracking-widest uppercase backdrop-blur",children:[(0,e.jsx)(S,{className:"size-4 text-cyan-300"}),(0,e.jsx)(t.T,{s:" Lumen Rail \xB7 line 1"})]}),(0,e.jsxs)(r.motion.h2,{initial:{opacity:0,scale:.6,filter:"blur(20px)"},animate:{opacity:1,scale:1,filter:"blur(0px)"},transition:{duration:1.2,ease:f},className:"mt-6 font-display text-6xl leading-none font-bold md:text-8xl",children:[(0,e.jsx)(t.T,{s:"Amman \u2192 Aqaba"}),(0,e.jsx)("br",{}),(0,e.jsx)("span",{className:"text-cyan-300",children:(0,e.jsx)(t.T,{s:"in 38 minutes."})})]}),(0,e.jsx)("p",{className:"mt-5 max-w-lg text-white/70",children:(0,e.jsx)(t.T,{s:"A sealed tube, almost no air, and pods that glide at airline speed. Move your mouse to steer."})}),(0,e.jsxs)("div",{className:"mt-8 flex items-center gap-6 rounded-2xl border border-white/15 bg-black/50 px-6 py-4 backdrop-blur",children:[(0,e.jsx)(w,{className:"size-6 text-cyan-300"}),(0,e.jsxs)("div",{className:"text-left",children:[(0,e.jsxs)("p",{className:"font-display text-3xl font-bold tabular-nums",children:[(0,e.jsx)(T,{to:760,duration:3})," ",(0,e.jsx)("span",{className:"text-base text-white/50",children:(0,e.jsx)(t.T,{s:"km/h"})})]}),(0,e.jsx)("p",{className:"text-xs text-white/50",children:(0,e.jsx)(t.T,{s:"cruise speed"})})]}),(0,e.jsx)("span",{className:"h-10 w-px bg-white/15"}),(0,e.jsx)("ul",{className:"space-y-1 text-left font-mono text-xs",children:(0,e.jsx)(t.T,{s:D.map(([o,s,c])=>(0,e.jsxs)("li",{className:"flex gap-3",children:[(0,e.jsx)("span",{className:"text-white/50",children:(0,e.jsx)(t.T,{s:o})}),(0,e.jsx)("span",{className:"w-20",children:(0,e.jsx)(t.T,{s})}),(0,e.jsx)("span",{className:c==="Boarding"?"text-amber-300":"text-emerald-300",children:(0,e.jsx)(t.T,{s:c})})]},s))})})]}),(0,e.jsxs)("a",{href:"#",className:"pointer-events-auto mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-300 px-6 py-3 font-semibold text-black",children:[(0,e.jsx)(t.T,{s:"Book a pod "}),(0,e.jsx)(h,{className:"size-4"})]})]})]})}var H=x+`
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float r = length(uv);
  float a = atan(uv.y, uv.x) + u_time * 0.08 + (u_mouse.x - 0.5) * 2.0;
  float seg = 6.2831 / 8.0;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  vec2 p = vec2(cos(a), sin(a)) * r;
  float t = u_time * 0.2;
  vec2 q = p * 3.0 + vec2(t, -t * 0.7);
  float f = fbm(q + fbm(q * 2.0 + t));
  float bands = sin(f * 18.0 + r * 6.0 - u_time) * 0.5 + 0.5;
  vec3 col = 0.5 + 0.5 * cos(6.2831 * (f * 1.2 + vec3(0.0, 0.15, 0.3) + r * 0.4 - u_time * 0.03));
  col *= 0.3 + 0.8 * bands;
  col *= smoothstep(1.3, 0.15, r);
  gl_FragColor = vec4(col, 1.0);
}`,A=[["Fri",["Nour & The Lanterns","Velvet Dunes","Kai Moreno"]],["Sat",["Sahara Static","Mira Lune","The Quiet Engines"]],["Sun",["Oud Machine","Lea & Leo","Neon Caravan"]]],b=[["Day pass",35],["Weekend",85],["VIP",190]];function U(){let o=(0,t.useLx)(),[s,c]=(0,m.useState)(0),[i,n]=(0,m.useState)(1);return(0,e.jsxs)("section",{className:"relative min-h-[680px] overflow-hidden bg-black text-white",children:[(0,e.jsx)(p,{frag:H,scale:.6,fallback:"bg-[conic-gradient(from_0deg,#f43f5e,#a855f7,#06b6d4,#f59e0b,#f43f5e)]"}),(0,e.jsxs)("div",{className:"relative z-10 grid min-h-[680px] items-center gap-8 px-6 py-12 sm:px-10 lg:grid-cols-2",children:[(0,e.jsxs)("div",{children:[(0,e.jsxs)(r.motion.h2,{initial:{opacity:0,rotate:-6,scale:.8},animate:{opacity:1,rotate:0,scale:1},transition:{type:"spring",stiffness:70,damping:12},className:"font-syne text-6xl leading-[0.85] font-extrabold tracking-tighter mix-blend-difference sm:text-8xl md:text-9xl",children:[(0,e.jsx)(t.T,{s:"PRISM"}),(0,e.jsx)("br",{}),(0,e.jsx)(t.T,{s:"FEST"})]}),(0,e.jsx)("p",{className:"mt-6 text-lg font-semibold",children:(0,e.jsx)(t.T,{s:"21 \u2014 23 May 2027 \xB7 Wadi Rum"})}),(0,e.jsx)("p",{className:"mt-1 max-w-sm text-white/70",children:(0,e.jsx)(t.T,{s:"Three nights of music under the desert stars. 30 artists, 4 stages, one big sky."})})]}),(0,e.jsxs)(r.motion.div,{initial:{opacity:0,x:40},animate:{opacity:1,x:0},transition:{delay:.3,duration:.8,ease:f},className:"rounded-[2rem] border border-white/20 bg-black/55 p-6 backdrop-blur-xl",children:[(0,e.jsx)("div",{className:"flex gap-2",children:(0,e.jsx)(t.T,{s:A.map(([a],l)=>(0,e.jsx)("button",{onClick:()=>c(l),className:`rounded-full px-4 py-1.5 text-sm font-semibold transition ${(0,t.spell)(o,s===l?"bg-white text-black":"bg-white/10 text-white/70 hover:bg-white/20","tpl")}`,children:(0,e.jsx)(t.T,{s:a})},a))})}),(0,e.jsx)("ul",{className:"mt-5 space-y-1",children:(0,e.jsx)(r.AnimatePresence,{mode:"popLayout",initial:!1,children:(0,e.jsx)(t.T,{s:A[s][1].map((a,l)=>(0,e.jsxs)(r.motion.li,{initial:{opacity:0,x:30},animate:{opacity:1,x:0},exit:{opacity:0,x:-30},transition:{delay:l*.06},className:"flex items-center justify-between border-b border-white/10 py-3 font-display text-2xl font-bold",children:[(0,e.jsx)(t.T,{s:a}),(0,e.jsx)("span",{className:"text-sm font-normal text-white/40",children:(0,e.jsx)(t.T,{s:["20:00","22:00","00:30"][l]})})]},s+a))})})}),(0,e.jsx)("div",{className:"mt-6 grid grid-cols-3 gap-2",children:(0,e.jsx)(t.T,{s:b.map(([a,l],g)=>(0,e.jsxs)("button",{onClick:()=>n(g),className:`rounded-2xl border p-3 text-left transition ${(0,t.spell)(o,i===g?"border-white bg-white/15":"border-white/15 hover:border-white/40","tpl")}`,children:[(0,e.jsx)("span",{className:"block text-xs text-white/60",children:(0,e.jsx)(t.T,{s:a})}),(0,e.jsxs)("span",{className:"block font-display text-xl font-bold",children:["$",(0,e.jsx)(t.T,{s:l})]})]},a))})}),(0,e.jsxs)("button",{className:"mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-rose-500 via-fuchsia-500 to-cyan-400 py-3.5 font-bold",children:[(0,e.jsx)(z,{className:"size-5"}),(0,e.jsx)(t.T,{s:" Get "}),(0,e.jsx)(t.T,{s:(0,t.spell)(o,b[i][0],"toLowerCase").toLowerCase()})," \xB7 $",(0,e.jsx)(t.T,{s:b[i][1]})]})]})]})]})}var M=x+`
float th(vec2 p){ float v = 0.0, a = 1.0; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(3.1, 1.7); a *= 0.45; } return v; }
float H(vec2 p){ return th(p * 0.35) * 2.4 - 0.6; }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 1.3;
  vec3 ro = vec3(sin(u_time * 0.2) * 2.0, 4.2, t);
  float yaw = (u_mouse.x - 0.5) * 0.9 + sin(u_time * 0.13) * 0.2;
  vec3 fw = normalize(vec3(sin(yaw), -0.24 + (u_mouse.y - 0.5) * 0.25, cos(yaw)));
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(fw + uv.x * rt + uv.y * up);
  float d = 0.0, hit = 0.0;
  vec3 p = ro;
  for (int i = 0; i < 80; i++) {
    p = ro + rd * d;
    float dh = p.y - H(p.xz);
    if (dh < 0.002 * d) { hit = 1.0; break; }
    d += max(dh * 0.45, 0.04 + d * 0.004);
    if (d > 45.0) break;
  }
  vec3 sunDir = normalize(vec3(-0.6, 0.32, 1.0));
  vec3 sky = mix(vec3(1.0, 0.62, 0.42), vec3(0.22, 0.28, 0.58), clamp(rd.y * 3.0 + 0.25, 0.0, 1.0));
  float sd = max(dot(rd, sunDir), 0.0);
  sky += vec3(1.0, 0.75, 0.45) * pow(sd, 40.0) * 0.9 + vec3(1.0, 0.5, 0.3) * pow(sd, 6.0) * 0.25;
  vec3 col = sky;
  if (hit > 0.5) {
    float e = 0.04;
    float h0 = H(p.xz);
    vec3 n = normalize(vec3(h0 - H(p.xz + vec2(e, 0.0)), e, h0 - H(p.xz + vec2(0.0, e))));
    float diff = max(dot(n, sunDir), 0.0);
    vec3 rock = mix(vec3(0.2, 0.15, 0.2), vec3(0.5, 0.32, 0.28), smoothstep(0.0, 2.0, p.y));
    float snow = smoothstep(2.2, 2.6, p.y + n.y * 0.4) * smoothstep(0.55, 0.85, n.y);
    rock = mix(rock, vec3(0.95, 0.93, 1.0), snow);
    col = rock * (0.22 + diff * vec3(1.0, 0.82, 0.62));
    col = mix(col, sky * 0.95, 1.0 - exp(-d * 0.055));
  }
  gl_FragColor = vec4(pow(col, vec3(0.92)), 1.0);
}`;function V(){let o=(0,t.useLx)(),[s,c]=(0,m.useState)(4210),[i,n]=(0,m.useState)(12);return(0,m.useEffect)(()=>{let a=setInterval(()=>c(l=>Math.round(l+(Math.random()-.5)*18)),400);return()=>clearInterval(a)},[]),(0,e.jsxs)("section",{onPointerMove:a=>{let l=a.currentTarget.getBoundingClientRect();n(Math.round(((a.clientX-l.left)/l.width-.5)*50+12+360)%360)},className:"relative h-[660px] overflow-hidden bg-[#2a2440] text-white",children:[(0,e.jsx)(p,{frag:M,scale:.5,fallback:"bg-linear-to-b from-indigo-900 via-orange-300 to-stone-800"}),(0,e.jsx)("div",{className:"pointer-events-none absolute inset-0 bg-linear-to-r from-black/45 via-transparent to-transparent"}),(0,e.jsxs)("div",{className:"relative z-10 flex h-full flex-col justify-between p-10",children:[(0,e.jsxs)("div",{className:"flex items-center justify-between",children:[(0,e.jsxs)("p",{className:"flex items-center gap-2 font-display text-lg font-bold",children:[(0,e.jsx)(_,{className:"size-5"}),(0,e.jsx)(t.T,{s:" Altitude"})]}),(0,e.jsxs)("div",{className:"flex gap-3 font-mono text-xs",children:[(0,e.jsxs)("span",{className:"rounded-lg border border-white/20 bg-black/30 px-3 py-2 backdrop-blur",children:[(0,e.jsx)(t.T,{s:"ALT "}),(0,e.jsx)(t.T,{s:s.toLocaleString("en-US")}),(0,e.jsx)(t.T,{s:" m"})]}),(0,e.jsxs)("span",{className:"flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/30 px-3 py-2 backdrop-blur",children:[(0,e.jsx)(y,{className:"size-3.5",style:{rotate:`${(0,t.spell)(o,i,"tpl")}deg`}}),(0,e.jsx)(t.T,{s:" HDG "}),(0,e.jsx)(t.T,{s:String(i).padStart(3,"0")}),"\xB0"]})]})]}),(0,e.jsxs)("div",{className:"max-w-xl",children:[(0,e.jsxs)(r.motion.h2,{initial:{opacity:0,y:40},animate:{opacity:1,y:0},transition:{duration:1,ease:f},className:"font-display text-6xl leading-[0.95] font-bold md:text-7xl",children:[(0,e.jsx)(t.T,{s:"Gear for the"}),(0,e.jsx)("br",{}),(0,e.jsx)(t.T,{s:"next ridge."})]}),(0,e.jsx)("p",{className:"mt-4 text-white/75",children:(0,e.jsx)(t.T,{s:"Shells, packs and boots tested above 4,000 metres. You are flying over a mountain range made of pure math."})}),(0,e.jsx)("div",{className:"mt-6 flex flex-wrap gap-2 text-sm",children:(0,e.jsx)(t.T,{s:["Storm shell \xB7 340 g","Trail pack \xB7 28 L","Alpine boot \xB7 Vibram"].map(a=>(0,e.jsx)("span",{className:"rounded-full border border-white/25 bg-white/10 px-4 py-1.5 backdrop-blur",children:(0,e.jsx)(t.T,{s:a})},a))})}),(0,e.jsxs)("a",{href:"#",className:"mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black",children:[(0,e.jsx)(t.T,{s:"Shop the expedition kit "}),(0,e.jsx)(v,{className:"size-4"})]})]})]})]})}var $=x+`
vec3 film(float th){ return 0.5 + 0.5 * cos(6.2831 * (th * vec3(1.0, 0.82, 0.68) + vec3(0.0, 0.25, 0.5))); }
vec4 bubble(vec2 uv, vec2 c, float R, float seed){
  vec2 d = (uv - c) / R;
  float r = length(d);
  if (r > 1.0) return vec4(0.0);
  float z = sqrt(1.0 - r * r);
  float th = 1.0 + fbm(d * 1.8 + vec2(u_time * 0.12 + seed, seed * 3.0)) * 1.6 + (1.0 - z) * 0.9 + d.y * 0.4;
  float rim = pow(1.0 - z, 2.5);
  float spec = smoothstep(0.16, 0.0, length(d - vec2(-0.38, 0.42))) + smoothstep(0.08, 0.0, length(d - vec2(0.3, -0.45))) * 0.5;
  float edge = smoothstep(1.0, 0.97, r);
  vec3 col = film(th) * (0.5 + rim * 1.2) + spec;
  return vec4(col, clamp((0.08 + rim * 0.9 + spec) * edge, 0.0, 1.0));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float asp = u_res.x / u_res.y;
  vec3 col = mix(vec3(0.03, 0.02, 0.07), vec3(0.1, 0.05, 0.16), gl_FragCoord.y / u_res.y);
  col += vec3(0.25, 0.1, 0.35) * exp(-length(uv - vec2(asp * 0.25, 0.0)) * 2.0) * 0.5;
  float t = u_time;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float R = 0.06 + 0.06 * fract(fi * 0.618 + 0.3);
    vec2 c = vec2((fract(fi * 0.381 + 0.1) - 0.5) * asp * 0.95, mod(t * (0.05 + 0.02 * fi) + fi * 0.37, 1.4) - 0.7);
    c.x += sin(t * 0.7 + fi) * 0.04;
    vec4 b = bubble(uv, c, R, fi);
    col = mix(col, b.rgb, b.a);
  }
  vec2 mc = vec2(asp > 1.3 ? asp * 0.22 : 0.0, -0.02) + (u_mouse - 0.5) * 0.06;
  vec4 big = bubble(uv, mc + vec2(0.0, sin(t * 0.8) * 0.015), 0.3, 7.0);
  col = mix(col, big.rgb, big.a);
  gl_FragColor = vec4(col, 1.0);
}`;function W(){let o=(0,t.useLx)(),[s,c]=(0,m.useState)(1);return(0,e.jsxs)("section",{className:"relative h-[640px] overflow-hidden bg-[#0a0614] text-white",children:[(0,e.jsx)(p,{frag:$,scale:.7,fallback:"bg-linear-to-b from-[#0a0614] to-[#1b0d2b]"}),(0,e.jsxs)("div",{className:"relative z-10 flex h-full max-w-xl flex-col justify-center px-10",children:[(0,e.jsxs)("p",{className:"flex items-center gap-2 text-sm text-violet-200/80",children:[(0,e.jsx)(u,{className:"size-4"}),(0,e.jsx)(t.T,{s:" Halo Skin \xB7 new"})]}),(0,e.jsxs)(r.motion.h2,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{duration:1,ease:f},className:"mt-5 font-serif text-7xl leading-[0.95]",children:[(0,e.jsx)(t.T,{s:"Clean that"}),(0,e.jsx)("br",{}),(0,e.jsx)("span",{className:"italic",children:(0,e.jsx)(t.T,{s:"floats."})})]}),(0,e.jsx)("p",{className:"mt-5 text-white/65",children:(0,e.jsx)(t.T,{s:"A cloud-light foam cleanser with rose water and oat. Gentle enough for every morning, and every skin."})}),(0,e.jsx)("div",{className:"mt-6 flex flex-wrap gap-2 text-sm",children:(0,e.jsx)(t.T,{s:[[N,"Rose water"],[k,"Oat milk"],[u,"pH 5.5"]].map(([i,n])=>(0,e.jsxs)("span",{className:"flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5",children:[(0,e.jsx)(i,{className:"size-3.5 text-violet-200"})," ",(0,e.jsx)(t.T,{s:n})]},n))})}),(0,e.jsxs)("div",{className:"mt-7 flex items-center gap-4",children:[(0,e.jsx)("div",{className:"flex rounded-full bg-white/10 p-1 text-sm",children:(0,e.jsx)(t.T,{s:["50 ml","150 ml"].map((i,n)=>(0,e.jsxs)("button",{onClick:()=>c(n),className:"relative rounded-full px-4 py-1.5",children:[(0,e.jsx)(t.T,{s:s===n&&(0,e.jsx)(r.motion.span,{layoutId:"bubble-size",className:"absolute inset-0 rounded-full bg-white"})}),(0,e.jsx)("span",{className:`relative ${(0,t.spell)(o,s===n?"text-black":"","tpl")}`,children:(0,e.jsx)(t.T,{s:i})})]},i))})}),(0,e.jsxs)("p",{className:"font-display text-3xl font-bold tabular-nums",children:["$",(0,e.jsx)(t.T,{s:s?32:14})]})]}),(0,e.jsx)("button",{className:"mt-6 w-fit rounded-full bg-linear-to-r from-pink-300 via-violet-300 to-cyan-200 px-7 py-3.5 font-semibold text-black",children:(0,e.jsx)(t.T,{s:"Add to bag"})})]})]})}var B=x+`
float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }
void main(){
  vec2 px = floor(gl_FragCoord.xy / 3.0);
  float asp = u_res.x / u_res.y;
  vec2 uv = px * 3.0 / u_res.y;
  float t = u_time * 0.15;
  vec2 c = asp > 1.3 ? vec2(asp * 0.7, 0.5) : vec2(asp * 0.62, 0.8);
  vec2 d = (uv - c) / (asp > 1.3 ? 0.34 : 0.24);
  float r2 = dot(d, d);
  float shade;
  if (r2 < 1.0) {
    vec3 n = vec3(d, sqrt(1.0 - r2));
    vec2 lm = (u_mouse * vec2(asp, 1.0) - c) * 2.5;
    vec3 l = normalize(vec3(lm, 1.0));
    shade = pow(max(dot(n, l), 0.0), 1.4) * 0.95 + 0.03;
    shade += 0.07 * sin(n.y * 18.0 + u_time);
  } else {
    float g = fbm(uv * 2.5 + vec2(t * 2.0, -t));
    shade = smoothstep(0.35, 0.85, g) * 0.42 * smoothstep(1.0, 1.6, sqrt(r2));
  }
  float on = step(bayer8(px), shade);
  gl_FragColor = vec4(mix(vec3(0.05, 0.05, 0.06), vec3(0.83, 1.0, 0.35), on), 1.0);
}`,j=["Brand systems","Product design","Creative code","Motion & 3D"];function K(){return(0,e.jsxs)("section",{className:"relative h-[640px] overflow-hidden bg-[#0d0d0f] font-mono text-[#d4ff59]",children:[(0,e.jsx)(p,{frag:B,scale:1,fallback:"bg-[#0d0d0f]"}),(0,e.jsxs)("div",{className:"pointer-events-none relative z-10 flex h-full flex-col justify-between p-8",children:[(0,e.jsxs)("div",{className:"flex items-center justify-between text-xs",children:[(0,e.jsx)("span",{className:"font-pixel text-[11px]",children:(0,e.jsx)(t.T,{s:"BITWISE_"})}),(0,e.jsxs)("span",{className:"hidden gap-6 md:flex",children:[(0,e.jsx)("span",{children:(0,e.jsx)(t.T,{s:"[work]"})}),(0,e.jsx)("span",{children:(0,e.jsx)(t.T,{s:"[studio]"})}),(0,e.jsx)("span",{children:(0,e.jsx)(t.T,{s:"[contact]"})})]})]}),(0,e.jsxs)("div",{className:"max-w-xl",children:[(0,e.jsx)("h2",{className:"font-pixel text-2xl leading-[1.6] sm:text-3xl md:text-4xl",children:(0,e.jsxs)("span",{className:"bg-[#0d0d0f] box-decoration-clone px-1",children:[(0,e.jsx)(t.T,{s:"LOW-RES."}),(0,e.jsx)("br",{}),(0,e.jsx)(t.T,{s:"HIGH-TOUCH."})]})}),(0,e.jsx)("p",{className:"mt-5 max-w-sm bg-[#0d0d0f]/80 text-sm text-[#d4ff59]/80",children:(0,e.jsx)(t.T,{s:"A tiny studio making sharp brands with a soft spot for pixels. Move the mouse to move the light."})}),(0,e.jsx)("ul",{className:"pointer-events-auto mt-6 max-w-sm border-t border-[#d4ff59]/30 text-sm",children:(0,e.jsx)(t.T,{s:j.map((o,s)=>(0,e.jsxs)("li",{className:"group flex cursor-pointer items-center justify-between border-b border-[#d4ff59]/30 bg-[#0d0d0f]/80 px-2 py-2.5 transition-colors hover:bg-[#d4ff59] hover:text-[#0d0d0f]",children:[(0,e.jsxs)("span",{children:["0",(0,e.jsx)(t.T,{s:s+1})," ",(0,e.jsx)(t.T,{s:o})]}),(0,e.jsx)(v,{className:"size-4 transition-transform group-hover:rotate-45"})]},o))})})]})]}),(0,e.jsx)(L,{opacity:.05})]})}export{G as a,U as b,V as c,W as d,K as e};
