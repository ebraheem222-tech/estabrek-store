import{a as F,b as m,c as $,d as L,e as N}from"./2E5RASL6.js";import{a as y,c as R,e as b}from"./VFXPJIQT.js";import{Be as S,E as g,Hh as q,Ia as M,Qf as A,a as c,b as G,c as j,d as B,ef as E,ig as I,ub as C}from"./QLRGKSQP.js";var t=c(G(),1),r=c(j(),1),o=c(B(),1);var e=c(q(),1),D=`
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float map(vec3 p){
  float t = u_time * 0.6;
  p.xz *= rot((u_mouse.x - 0.5) * 3.0 + t * 0.2);
  p.yz *= rot((u_mouse.y - 0.5) * 1.5);
  float d = length(p - vec3(sin(t) * 0.9, cos(t * 1.3) * 0.5, 0.0)) - 0.55;
  d = smin(d, length(p - vec3(cos(t * 0.8) * 0.8, sin(t * 1.1) * 0.7, sin(t * 0.7) * 0.6)) - 0.45, 0.5);
  d = smin(d, length(p - vec3(sin(t * 1.7) * 0.6, sin(t * 0.9) * 0.9, cos(t * 1.2) * 0.5)) - 0.4, 0.5);
  d = smin(d, length(p - vec3(cos(t * 1.4) * 1.0, cos(t * 0.6) * 0.3, sin(t * 1.5) * 0.4)) - 0.35, 0.5);
  return d;
}
vec3 normalAt(vec3 p){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  uv.x -= u_res.x / u_res.y > 1.3 ? 0.42 : 0.0;
  vec3 ro = vec3(0.0, 0.0, 4.3);
  vec3 rd = normalize(vec3(uv, -1.4));
  float d = 0.0, hit = 0.0;
  for (int i = 0; i < 70; i++) {
    float h = map(ro + rd * d);
    if (h < 0.001) { hit = 1.0; break; }
    d += h;
    if (d > 8.0) break;
  }
  vec3 col = mix(vec3(0.01, 0.01, 0.04), vec3(0.08, 0.03, 0.14), uv.y + 0.5);
  if (hit > 0.5) {
    vec3 p = ro + rd * d;
    vec3 n = normalAt(p);
    vec3 l = normalize(vec3(0.6, 0.8, 0.5));
    float diff = max(dot(n, l), 0.0);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    vec3 base = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + n.y * 0.35 + n.x * 0.15 + u_time * 0.05));
    float spec = pow(max(dot(reflect(rd, n), l), 0.0), 48.0);
    col = base * (0.2 + 0.8 * diff) + fres * vec3(0.55, 0.65, 1.0) + spec;
    col = pow(col, vec3(0.4545));
  }
  gl_FragColor = vec4(col, 1.0);
}`;function Z(){return(0,e.jsxs)("section",{className:"relative h-[640px] overflow-hidden bg-black text-white",children:[(0,e.jsx)(m,{frag:D,scale:.6}),(0,e.jsx)("div",{className:"pointer-events-none absolute inset-0 bg-black/35 md:hidden"}),(0,e.jsx)(N,{opacity:.08}),(0,e.jsxs)("div",{className:"pointer-events-none relative z-10 flex h-full flex-col justify-between p-10",children:[(0,e.jsxs)("p",{className:"flex items-center gap-2 text-xs tracking-[0.4em] text-white/60 uppercase",children:[(0,e.jsx)(S,{className:"size-4"}),(0,e.jsx)(t.T,{s:" Real-time 3D \xB7 no libraries"})]}),(0,e.jsxs)("div",{className:"max-w-xl",children:[(0,e.jsxs)(o.motion.h2,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{duration:1,ease:y},className:"font-display text-6xl leading-none font-bold",children:[(0,e.jsx)(t.T,{s:"Matter that"}),(0,e.jsx)("br",{}),(0,e.jsx)(t.T,{s:"thinks in curves."})]}),(0,e.jsx)("p",{className:"mt-4 text-white/60",children:(0,e.jsx)(t.T,{s:"Four spheres, melting together in real time. Move your mouse to turn the camera."})}),(0,e.jsxs)("a",{href:"#",className:"pointer-events-auto mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black",children:[(0,e.jsx)(t.T,{s:"Explore the lab "}),(0,e.jsx)(g,{className:"size-4"})]})]})]})]})}var J=`
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv; p.x *= u_res.x / u_res.y;
  float t = u_time * 0.15;
  float a = sin(p.x * 2.0 + t * 2.0 + sin(p.y * 3.0 + t)) * 0.5 + 0.5;
  float b = sin(p.y * 2.5 - t * 1.5 + cos(p.x * 2.0 - t)) * 0.5 + 0.5;
  float c = sin((p.x + p.y) * 1.8 + t * 1.2 + (u_mouse.x - 0.5) * 2.0) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.39, 0.4, 0.95), vec3(1.0, 0.37, 0.58), a);
  col = mix(col, vec3(1.0, 0.78, 0.3), b * 0.6);
  col = mix(col, vec3(0.15, 0.85, 0.85), c * 0.45);
  gl_FragColor = vec4(col, 1.0);
}`;function ee(){let a=(0,t.useLx)();return(0,e.jsxs)("section",{className:"relative h-[680px] overflow-hidden bg-white text-slate-900 [color-scheme:light]",children:[(0,e.jsx)("div",{className:"absolute inset-0 [clip-path:polygon(0_0,100%_0,100%_58%,0_86%)]",children:(0,e.jsx)(m,{frag:J,scale:.5,fallback:"bg-linear-to-br from-indigo-400 via-rose-400 to-amber-300"})}),(0,e.jsxs)("div",{className:"relative z-10 mx-auto grid max-w-6xl gap-10 px-6 pt-16 sm:px-8 lg:grid-cols-[1.1fr_1fr]",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)("p",{className:"font-display text-xl font-bold text-white",children:(0,e.jsx)(t.T,{s:"paylane"})}),(0,e.jsx)(o.motion.h2,{initial:{opacity:0,y:30},animate:{opacity:1,y:0},transition:{duration:.9,ease:y},className:"mt-10 font-display text-4xl leading-[1.02] font-bold tracking-tight text-slate-900 mix-blend-color-burn sm:text-6xl",children:(0,e.jsx)(t.T,{s:"Payments infrastructure for the Arab internet"})}),(0,e.jsx)("p",{className:"mt-5 max-w-md text-lg text-slate-800",children:(0,e.jsx)(t.T,{s:"Accept cards, wallets and local methods in 40 currencies. One API, one dashboard."})}),(0,e.jsxs)("div",{className:"mt-7 flex gap-3",children:[(0,e.jsxs)("a",{href:"#",className:"flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 font-semibold text-white",children:[(0,e.jsx)(t.T,{s:"Start now "}),(0,e.jsx)(g,{className:"size-4"})]}),(0,e.jsx)("a",{href:"#",className:"rounded-full bg-white/70 px-6 py-3 font-semibold backdrop-blur",children:(0,e.jsx)(t.T,{s:"Contact sales"})})]})]}),(0,e.jsxs)("div",{className:"relative hidden h-[460px] lg:block",children:[(0,e.jsxs)(o.motion.div,{initial:{y:60,opacity:0,rotate:-4},animate:{y:0,opacity:1,rotate:-4},transition:{delay:.3,type:"spring",stiffness:90,damping:16},className:"absolute top-6 left-4 w-72 rounded-2xl bg-white p-5 shadow-2xl",children:[(0,e.jsx)("p",{className:"text-sm text-slate-500",children:(0,e.jsx)(t.T,{s:"Pay Studio Nine"})}),(0,e.jsx)("p",{className:"font-display text-3xl font-bold",children:(0,e.jsx)(t.T,{s:"JOD 129.00"})}),(0,e.jsxs)("div",{className:"mt-4 flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm",children:[(0,e.jsx)(C,{className:"size-4 text-slate-400"})," \u2022\u2022\u2022\u2022 4242 ",(0,e.jsx)("span",{className:"ml-auto text-xs text-slate-400",children:"12/29"})]}),(0,e.jsx)(o.motion.button,{whileTap:{scale:.97},className:"mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white",children:(0,e.jsx)(t.T,{s:"Pay"})})]}),(0,e.jsxs)(o.motion.div,{initial:{y:60,opacity:0,rotate:5},animate:{y:[0,-10,0],opacity:1,rotate:5},transition:{delay:.55,y:{duration:5,repeat:1/0,ease:"easeInOut"}},className:"absolute top-44 right-0 w-64 rounded-2xl bg-white p-5 shadow-2xl",children:[(0,e.jsxs)("p",{className:"flex items-center gap-2 text-sm font-semibold",children:[(0,e.jsx)("span",{className:"grid size-6 place-items-center rounded-full bg-emerald-500 text-white",children:(0,e.jsx)(M,{className:"size-3.5"})}),(0,e.jsx)(t.T,{s:" Payment succeeded"})]}),(0,e.jsx)("div",{className:"mt-3 flex h-16 items-end gap-1",children:(0,e.jsx)(t.T,{s:[40,65,45,80,60,95,75].map((n,i)=>(0,e.jsx)(o.motion.span,{initial:{height:0},animate:{height:`${(0,t.spell)(a,n,"tpl")}%`},transition:{delay:.9+i*.06},className:"flex-1 rounded-t bg-indigo-500/80"},i))})}),(0,e.jsxs)("p",{className:"mt-2 text-xs text-slate-500",children:[(0,e.jsx)(t.T,{s:"Volume this week \xB7 "}),(0,e.jsxs)("b",{className:"text-slate-900",children:["+",(0,e.jsx)(b,{to:38}),"%"]})]})]}),(0,e.jsxs)(o.motion.div,{initial:{scale:0},animate:{scale:1},transition:{delay:.9,type:"spring"},className:"absolute bottom-6 left-16 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-xl",children:[(0,e.jsx)(A,{className:"size-4 text-emerald-600"}),(0,e.jsx)(t.T,{s:" 3-D Secure verified"})]})]})]})]})}var W=`
vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.y;
  vec2 m = u_mouse * vec2(u_res.x / u_res.y, 1.0);
  vec2 p = uv * 6.0;
  vec2 ip = floor(p), fp = fract(p);
  float d1 = 8.0, d2 = 8.0;
  vec2 cell = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = 0.5 + 0.5 * sin(u_time * 0.8 + 6.2831 * hash2(ip + g));
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; cell = ip + g; } else if (d < d2) { d2 = d; }
    }
  }
  float edge = sqrt(d2) - sqrt(d1);
  float glow = smoothstep(0.65, 0.0, length(uv - m));
  vec3 base = 0.5 + 0.5 * cos(6.2831 * (hash2(cell).x * 0.35 + vec3(0.45, 0.6, 0.75)));
  vec3 col = base * (0.1 + 0.4 * glow) * smoothstep(0.0, 0.3, edge);
  col += vec3(0.3, 1.0, 0.7) * smoothstep(0.07, 0.0, edge) * (0.3 + 1.3 * glow);
  col += vec3(0.3, 1.0, 0.7) * smoothstep(0.12, 0.0, sqrt(d1)) * 0.6 * glow;
  gl_FragColor = vec4(col, 1.0);
}`;function te(){return(0,e.jsxs)("section",{className:"relative h-[600px] overflow-hidden bg-black text-white",children:[(0,e.jsx)(m,{frag:W,scale:.7,fallback:"bg-emerald-950"}),(0,e.jsx)("div",{className:"pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.75))]"}),(0,e.jsx)("div",{className:"pointer-events-none relative z-10 grid h-full place-items-center text-center",children:(0,e.jsxs)("div",{children:[(0,e.jsx)("p",{className:"font-mono text-xs tracking-[0.4em] text-emerald-300/80",children:(0,e.jsx)(t.T,{s:"BIOTECH \xB7 SERIES B"})}),(0,e.jsxs)("h2",{className:"mt-3 font-display text-6xl font-bold",children:[(0,e.jsx)(t.T,{s:"Life, at the"}),(0,e.jsx)("br",{}),(0,e.jsx)(t.T,{s:"speed of code."})]}),(0,e.jsx)("p",{className:"mx-auto mt-4 max-w-md text-white/60",children:(0,e.jsx)(t.T,{s:"We model millions of cells in real time to find new medicines faster. Move your mouse to look closer."})}),(0,e.jsx)("div",{className:"mt-8 flex justify-center gap-8",children:(0,e.jsx)(t.T,{s:[[2.4,"M","cells simulated / sec"],[37,"","drug candidates"],[11,"","labs worldwide"]].map(([a,n,i])=>(0,e.jsxs)("div",{children:[(0,e.jsx)("p",{className:"font-display text-3xl font-bold text-emerald-300",children:(0,e.jsx)(b,{to:a,decimals:a%1?1:0,suffix:n})}),(0,e.jsx)("p",{className:"text-xs text-white/50",children:(0,e.jsx)(t.T,{s:i})})]},i))})})]})})]})}var Y=F+`
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  uv -= (u_mouse - 0.5) * 0.12;
  float r = length(uv);
  float t = u_time;
  vec2 q = vec2(uv.x, uv.y * 3.2);
  float rq = length(q);
  float ang = 2.6 / (rq + 0.2) - t * 0.6;
  float c = cos(ang), s = sin(ang);
  vec2 rp = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  float n = fbm(rp * 4.0 + vec2(0.0, t * 0.1));
  float disk = smoothstep(0.22, 0.3, rq) * smoothstep(1.05, 0.45, rq);
  vec3 hot = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.95, 0.82), n);
  vec3 col = hot * disk * (0.35 + 1.3 * n);
  float ring = smoothstep(0.018, 0.0, abs(r - 0.205));
  col += vec3(1.0, 0.75, 0.45) * ring * 1.6;
  float halo = smoothstep(0.06, 0.0, abs(r - 0.27)) * smoothstep(-0.08, 0.16, uv.y);
  col += vec3(1.0, 0.55, 0.25) * halo * 0.7 * (0.4 + n);
  col *= smoothstep(0.17, 0.2, r);
  vec2 sg = floor(gl_FragCoord.xy / 3.0);
  col += step(0.997, hash(sg)) * 0.8 * smoothstep(0.3, 0.6, r);
  gl_FragColor = vec4(col, 1.0);
}`;function ae(){return(0,e.jsxs)("section",{className:"relative h-[660px] overflow-hidden bg-black text-white",children:[(0,e.jsx)(m,{frag:Y,fallback:"bg-[radial-gradient(circle,#000_15%,#7c2d12_25%,#000_45%)]"}),(0,e.jsx)(N,{opacity:.1}),(0,e.jsxs)("div",{className:"pointer-events-none relative z-10 flex h-full flex-col items-center justify-end pb-12 text-center",children:[(0,e.jsx)("p",{className:"font-mono text-xs tracking-[0.5em] text-orange-200/70",children:(0,e.jsx)(t.T,{s:"A FILM IN 70MM \xB7 SUMMER 2027"})}),(0,e.jsx)("h2",{className:"mt-3 font-serif text-7xl tracking-tight italic",children:(0,e.jsx)(t.T,{s:"Event Horizon"})}),(0,e.jsxs)("div",{className:"pointer-events-auto mt-6 flex gap-3",children:[(0,e.jsx)("a",{href:"#",className:"rounded-full bg-orange-100 px-6 py-3 text-sm font-semibold text-black",children:(0,e.jsx)(t.T,{s:"Watch the trailer"})}),(0,e.jsx)("a",{href:"#",className:"rounded-full border border-white/25 px-6 py-3 text-sm backdrop-blur",children:(0,e.jsx)(t.T,{s:"Get tickets"})})]})]})]})}var x="\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD\u30BF\u30C1\u30C4\u30C6\u30C80123456789\u0627\u0628\u062A\u062B\u062C\u062D\u062E\u062F\u0630\u0631\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063A\u0641\u0642\u0643\u0644\u0645\u0646\u0647\u0648\u064A",w="Follow the signal.";function se(){let a=(0,t.useLx)(),n=(0,r.useRef)(null),i=L(n),[_,O]=(0,r.useState)(0);(0,r.useEffect)(()=>{let s=setInterval(()=>O(f=>f>=(0,t.spell)(a,w,"length").length+25?0:f+1),120);return()=>clearInterval(s)},[]);let[T]=$((s,f,k,v,d)=>{let z=Math.ceil(k/16);(!d.drops||d.drops.length!==z)&&(d.drops=Array.from({length:z},()=>({y:Math.random()*-v,v:2+Math.random()*4}))),s.fillStyle=(0,t.paint)(s,a,"rgba(0,6,2,0.12)"),s.fillRect(0,0,k,v),s.font='600 14px "JetBrains Mono", monospace';let h=i.current;d.drops.forEach((l,P)=>{let u=P*16,H=x[Math.random()*x.length|0],p=h?Math.max(0,1-Math.hypot(h.x-u,h.y-l.y)/140):0;s.fillStyle=(0,t.paint)(s,a,p>0?`hsl(${150+p*140} 100% ${70+p*20}%)`:"#d1fae5"),(0,t.canvasText)(s,"fillText",a,H,u,l.y),s.fillStyle=(0,t.paint)(s,a,"rgba(16,185,129,0.85)"),(0,t.canvasText)(s,"fillText",a,x[Math.random()*x.length|0],u,l.y-16),l.y+=l.v*(1+p*2),l.y>v+40&&(l.y=Math.random()*-200,l.v=2+Math.random()*4)})});return(0,e.jsxs)("section",{ref:n,className:"relative h-[600px] overflow-hidden bg-[#000602] text-emerald-100",children:[(0,e.jsx)("canvas",{ref:T,className:"absolute inset-0 size-full"}),(0,e.jsx)("div",{className:"relative z-10 grid h-full place-items-center",children:(0,e.jsxs)("div",{className:"rounded-2xl border border-emerald-400/30 bg-black/70 px-10 py-8 text-center shadow-[0_0_60px_-10px_#10b981] backdrop-blur",children:[(0,e.jsxs)("p",{className:"flex items-center justify-center gap-2 font-mono text-xs tracking-[0.4em] text-emerald-400",children:[(0,e.jsx)(E,{className:"size-4"}),(0,e.jsx)(t.T,{s:" INCOMING TRANSMISSION"})]}),(0,e.jsxs)("p",{className:"mt-4 min-h-12 font-mono text-4xl text-emerald-200",children:[(0,e.jsx)(t.T,{s:(0,t.spell)(a,w,"slice").slice(0,_)}),(0,e.jsx)("span",{className:"animate-blink",children:"\u2588"})]}),(0,e.jsx)(o.AnimatePresence,{children:(0,e.jsx)(t.T,{s:_>(0,t.spell)(a,w,"length").length&&(0,e.jsxs)(o.motion.a,{href:"#",initial:{opacity:0,y:10},animate:{opacity:1,y:0},exit:{opacity:0},className:"mt-5 inline-flex items-center gap-2 rounded-lg border border-emerald-400 px-5 py-2 font-mono text-sm text-emerald-300 hover:bg-emerald-400 hover:text-black",children:[(0,e.jsx)(I,{className:"size-4"}),(0,e.jsx)(t.T,{s:" ENTER"})]})})}),(0,e.jsxs)("div",{className:"mt-5 flex items-center justify-center gap-2 text-xs text-emerald-300/50",children:[(0,e.jsx)(R,{name:"Op X",i:2,className:"size-5"}),(0,e.jsx)(t.T,{s:" operator online"})]})]})})]})}export{Z as a,ee as b,te as c,ae as d,se as e};
