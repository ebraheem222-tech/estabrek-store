import{a as ee,e as te,f as ae,g as se,l as oe,r as re,s as ie,t as ne,u as le,v as ce,w as de,x as me}from"./c/YLG3IVGJ.js";import{c as K,f as Q,q as X}from"./c/3ZBEHKSD.js";import{b as M}from"./c/M3QI6TVS.js";import{Be as J,Bh as j,Gh as V,Hh as Z,Ia as F,K as R,Qd as I,Xe as U,a as $,b as ue,c as be,d as fe,ha as D,ib as O,ig as H,sf as Y,tb as B,zc as W}from"./c/QLRGKSQP.js";var t=$(ue(),1),p=$(be(),1),G=$(fe(),1);var e=$(Z(),1),f=24,pe=[[.95,.42,.12,0],[.9,.9,.95,1],[.12,.75,.62,0],[.98,.78,.3,1],[.93,.25,.45,0],[.3,.38,.95,0]],xe=re+`
#define STEPS 80
uniform vec4 u_b[${f}]; uniform vec4 u_m[${f}]; uniform float u_n; uniform float u_hot;
`+ie+`
float sdFrame(vec3 p, vec3 b, float e){ p = abs(p) - b; vec3 q = abs(p + e) - e;
  return min(min(length(max(vec3(p.x, q.y, q.z), 0.0)) + min(max(p.x, max(q.y, q.z)), 0.0), length(max(vec3(q.x, p.y, q.z), 0.0)) + min(max(q.x, max(p.y, q.z)), 0.0)), length(max(vec3(q.x, q.y, p.z), 0.0)) + min(max(q.x, max(q.y, p.z)), 0.0)); }
vec2 map(vec3 p){
  vec2 res = vec2(p.y, 1.0);
  float back = p.z + 2.05; if (back < res.x) res = vec2(back, 2.0);
  float fr = sdFrame(p - vec3(0.0, 2.25, 0.0), vec3(2.65, 2.25, 2.05), 0.025); if (fr < res.x) res = vec2(fr, 3.0);
  for (int i = 0; i < ${f}; i++){
    if (float(i) >= u_n) break;
    float d = length(p - u_b[i].xyz) - u_b[i].w;
    if (d < res.x) res = vec2(d, 10.0 + float(i));
  }
  return res;
}
`+ne+`
vec3 sky(vec3 rd){ return mix(vec3(0.09, 0.1, 0.14), vec3(0.5, 0.56, 0.7), smoothstep(-0.2, 1.0, rd.y)) + vec3(2.0) * smoothstep(0.97, 1.0, dot(rd, normalize(vec3(0.4, 0.8, 0.5)))); }
vec4 matOf(float id, vec3 p){
  if (id < 1.5){ vec2 c = floor(p.xz * 2.0); float k = mod(c.x + c.y, 2.0); return vec4(mix(vec3(0.16, 0.17, 0.2), vec3(0.2, 0.21, 0.25), k), 0.15); }
  if (id < 2.5) return vec4(vec3(0.12, 0.13, 0.17) + 0.04 * step(0.96, fract(p.y * 2.0)), 0.0);
  if (id < 3.5) return vec4(vec3(0.75, 0.85, 1.0), 0.6);
  vec4 m = vec4(0.0);
  for (int i = 0; i < ${f}; i++){ if (float(i) == id - 10.0) m = u_m[i]; }
  return m;
}
vec3 light(vec3 p, vec3 n, vec3 rd, vec4 m, float id){
  vec3 l = normalize(vec3(0.5, 0.9, 0.45));
  float dif = max(dot(n, l), 0.0) * softShadow(p + n * 0.01, l, 10.0);
  float amb = 0.35 + 0.35 * n.y;
  float ao = calcAO(p, n);
  vec3 h = normalize(l - rd);
  float spe = pow(max(dot(n, h), 0.0), 60.0) * dif;
  vec3 c = m.rgb * (dif * vec3(1.0, 0.95, 0.88) * 1.2 + amb * vec3(0.4, 0.45, 0.6) * ao) + spe * (0.3 + m.a);
  return c;
}
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  vec3 ta = vec3(u_res.x / u_res.y > 1.3 ? -1.5 : 0.0, 1.8, 0.0), ro = orbitPos(u_cam, ta), rd = camRay(uv, ro, ta, 1.9);
  vec3 col = sky(rd);
  vec2 h = march(ro, rd, 30.0);
  if (h.y > 0.0){
    vec3 p = ro + rd * h.x, n = calcNormal(p);
    vec4 m = matOf(h.y, p);
    col = light(p, n, rd, m, h.y);
    float fres = pow(1.0 - max(dot(-rd, n), 0.0), 4.0);
    if (h.y < 1.5) col += sky(reflect(rd, n)) * (0.04 + 0.25 * fres);
    if (m.a > 0.5 && h.y > 9.5){
      vec3 r = reflect(rd, n);
      vec2 h2 = march(p + n * 0.02, r, 20.0);
      vec3 rc = sky(r);
      if (h2.y > 0.0){ vec3 p2 = p + n * 0.02 + r * h2.x, n2 = calcNormal(p2); rc = light(p2, n2, r, matOf(h2.y, p2), h2.y); }
      float k = h.y < 1.5 ? 0.12 + 0.4 * fres : (h.y > 9.5 ? 0.85 : 0.3);
      col = mix(col, rc * (h.y > 9.5 ? m.rgb * 1.1 + 0.1 : vec3(1.0)), k);
    } else col += fres * 0.15;
    if (abs(h.y - 10.0 - u_hot) < 0.5) col += vec3(0.25, 0.22, 0.1) * (0.5 + 0.5 * fres);
    col = mix(col, sky(rd) * 0.6, 1.0 - exp(-0.0015 * h.x * h.x));
  }
  col = col / (1.0 + col * 0.35);
  gl_FragColor = vec4(pow(col, vec3(0.9)), 1.0);
}`;function ge({cmd:n,onStats:d}){let N=(0,t.useLx)();return(0,e.jsx)(de,{className:"absolute inset-0",scale:.7,interactive:!0,label:N("A room of balls with physics. Drag a ball to throw it, drag elsewhere to turn the room."),setup:({gl:h,box:l})=>{let g=ae(h,oe,xe),s=new me({min:[-2.62,0,-2.02],max:[2.62,4.5,2.02],e:.62,drag:.0015}),v=0,x=!1,k=a=>{let r=.28+a*37%10/40;s.add([a*53%9/9*3-1.5,3.4+a%4*.5,a*31%7/7*2-1],r,{v:[Math.sin(a)*2,0,Math.cos(a)*2],data:{m:pe[a%pe.length]}})};for(let a=0;a<12;a++)k(a);if(ee())for(let a=0;a<240;a++)s.step(1/60);let S=()=>{s.gravity=x?[0,0,0]:[Math.sin(v)*9.8,-Math.cos(v)*9.8,0],s.drag=x?4e-4:.0015},E=12;n.current={add:()=>s.bodies.length>=f?!1:(k(E++),s.bodies.length),zeroG:a=>{x=a,S(),a&&s.bodies.forEach((r,c)=>{r.v[1]+=1.5+c%3})},tilt:a=>{v=a*Math.PI/180,S()},blast:()=>s.blast([0,0,0],9),reset:()=>{s.clear();for(let a=0;a<12;a++)k(a);return E=12,12},world:s};let z=-1,u=0,C=a=>{let r=l.getBoundingClientRect();return te(a.clientX-r.left,a.clientY-r.top,r.width,r.height,i,[r.width/r.height>1.3?-1.5:0,1.8,0],1.9)},_=a=>{let{ro:r,rd:c}=C(a),m=s.pick(r,c);if(m){s.grabbed=m.body,u=m.t,s.target=[...(0,t.spell)(N,m.body.p,"spread")],z=s.bodies.indexOf(m.body);try{l.setPointerCapture(a.pointerId)}catch{}}},b=a=>{if(!s.grabbed){let{ro:m,rd:he}=C(a),q=s.pick(m,he);z=q?s.bodies.indexOf(q.body):-1;return}let{ro:r,rd:c}=C(a);s.target=[r[0]+c[0]*u,Math.max(s.grabbed.r,r[1]+c[1]*u),r[2]+c[2]*u]},o=()=>{s.grabbed=null,s.target=null};l.addEventListener("pointerdown",_),l.addEventListener("pointermove",b),l.addEventListener("pointerup",o),l.addEventListener("pointercancel",o);let i=ce(l,{yaw:.35,pitch:.32,dist:8.2,minPitch:.05,maxPitch:1.2,canDrag:()=>!s.grabbed}),y=new Float32Array(f*4),P=new Float32Array(f*4),w=0,L=(a,r)=>{i.update(r),s.step(Math.min(r,1/30)),s.bodies.forEach((c,m)=>{y.set([c.p[0],c.p[1],c.p[2],c.r],m*4),P.set(c.data.m,m*4)}),h.useProgram(g),se(h,g,{u_time:a,u_res:[h.canvas.width,h.canvas.height],u_cam:i.vec(),u_b:{v4:y},u_m:{v4:P},u_n:s.bodies.length,u_hot:z}),le(h,g),w+=r,w>.5&&(w=0,d?.({n:s.bodies.length,e:s.energy()}))};return L.dispose=()=>{i.detach(),l.removeEventListener("pointerdown",_),l.removeEventListener("pointermove",b),l.removeEventListener("pointerup",o),l.removeEventListener("pointercancel",o)},d?.({n:s.bodies.length,e:s.energy()}),L}})}var T={JavaScript:`import { World, Sphere } from "gravitas";

const world = new World({ gravity: [0, -9.8, 0] });
const ball = world.add(new Sphere({ radius: 0.3, bounce: 0.6 }));

ball.applyImpulse([2, 6, 0]);

function frame(dt) {
  world.step(dt);          // 4 sub-steps, sleeping bodies skipped
  render(world.bodies);
}`,React:`import { usePhysics, Sphere } from "gravitas/react";

export function Pit() {
  const { bodies, add } = usePhysics({ bounds: [5, 4, 4] });
  return (
    <Canvas onClick={() => add(Sphere.random())}>
      {bodies.map((b) => <Ball key={b.id} body={b} />)}
    </Canvas>
  );
}`,Worker:`// Run the simulation off the main thread
const sim = new Worker(new URL("gravitas/worker", import.meta.url));
sim.postMessage({ type: "init", bodies: 5000 });

sim.onmessage = ({ data }) => {
  positions.set(data.positions);   // shared Float32Array
};`};function A(){let n=(0,t.useLx)(),d=(0,p.useRef)(null),[N,h]=(0,p.useState)({n:12,e:0}),[l,g]=(0,p.useState)(!1),[s,v]=(0,p.useState)(0),[x,k]=(0,p.useState)("JavaScript"),[S,E]=(0,p.useState)(!0),[z,u]=Q("bg-orange-500 text-black font-bold"),C=Math.min(100,Math.round(Math.sqrt(N.e)*9));(0,p.useEffect)(()=>{d.current?.tilt(s)},[s]);let _=(0,e.jsxs)("a",{href:"#top",className:"flex items-center gap-2 font-display text-xl font-bold text-white",children:[(0,e.jsx)(R,{className:"size-6 text-orange-400"}),(0,e.jsx)(t.T,{s:"gravitas"})]}),b="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20";return(0,e.jsxs)("div",{className:"min-h-screen bg-[#0a0b10] font-sans text-white/65 selection:bg-orange-500/40",children:[(0,e.jsx)(K,{logo:_,links:[["Playground","top"],["Code","code"],["Benchmarks","bench"],["Pricing","pricing"]],solid:"border-b border-white/10 bg-[#0a0b10]/85 backdrop-blur-xl",sheet:"bg-[#0a0b10] text-white",cta:(0,e.jsx)("a",{href:"#pricing",className:"block rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-black",children:(0,e.jsx)(t.T,{s:"Start free"})})}),(0,e.jsxs)("header",{id:"top",className:"relative h-[100svh] min-h-[620px] overflow-hidden",children:[(0,e.jsx)(ge,{cmd:d,onStats:h}),(0,e.jsx)("div",{className:"pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-[#0a0b10] via-[#0a0b10]/70 to-transparent pt-28 pb-24",children:(0,e.jsxs)("div",{className:"mx-auto max-w-7xl px-4 sm:px-6",children:[(0,e.jsx)(G.motion.p,{...M(),className:"font-mono text-xs tracking-widest text-orange-300 uppercase",children:(0,e.jsx)(t.T,{s:"Diamond \xB7 real physics, real 3D"})}),(0,e.jsx)(G.motion.h1,{...M(.05),className:"mt-3 max-w-3xl font-display text-5xl leading-[1] font-bold tracking-tight text-white sm:text-7xl",children:(0,e.jsx)(t.T,{s:"Things that fall, bounce and collide. In 4 KB."})}),(0,e.jsx)("p",{className:"mt-4 max-w-lg text-lg",children:(0,e.jsx)(t.T,{s:"Grab a ball and throw it. Drag anywhere else to turn the room."})})]})}),(0,e.jsx)("div",{className:"absolute inset-x-0 bottom-0 bg-linear-to-t from-[#0a0b10] to-transparent pt-16 pb-6",children:(0,e.jsxs)("div",{className:"mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 sm:px-6",children:[(0,e.jsxs)("button",{onClick:()=>{d.current?.add()===!1&&u(`That's the limit here (${(0,t.spell)(n,f,"tpl")})`)},className:b,children:[(0,e.jsx)(U,{className:"size-4"}),(0,e.jsx)(t.T,{s:"Add ball"})]}),(0,e.jsxs)("button",{onClick:()=>{let o=!l;g(o),d.current?.zeroG(o)},"aria-pressed":l,className:`${(0,t.spell)(n,b,"tpl")} ${(0,t.spell)(n,l?"bg-orange-500! text-black!":"","tpl")}`,children:[(0,e.jsx)(J,{className:"size-4"}),(0,e.jsx)(t.T,{s:"Zero-G"})]}),(0,e.jsxs)("button",{onClick:()=>d.current?.blast(),className:b,children:[(0,e.jsx)(V,{className:"size-4"}),(0,e.jsx)(t.T,{s:"Explode"})]}),(0,e.jsxs)("button",{onClick:()=>{d.current?.reset(),g(!1),d.current?.zeroG(!1),v(0)},className:b,children:[(0,e.jsx)(Y,{className:"size-4"}),(0,e.jsx)(t.T,{s:"Reset"})]}),(0,e.jsxs)("label",{className:`${(0,t.spell)(n,b,"tpl")} cursor-default`,children:[(0,e.jsx)(j,{className:"size-4"}),(0,e.jsx)(t.T,{s:"Tilt"}),(0,e.jsx)("input",{type:"range",min:"-40",max:"40",value:s,onChange:o=>v(Number(o.target.value)),className:"w-24 accent-orange-500","aria-label":n("Tilt gravity")})]}),(0,e.jsxs)("div",{className:"ml-auto flex items-center gap-4 rounded-2xl bg-black/40 px-4 py-2 font-mono text-xs text-white/80 backdrop-blur","aria-live":"polite",children:[(0,e.jsxs)("span",{children:[(0,e.jsx)(t.T,{s:N.n}),(0,e.jsx)(t.T,{s:" bodies"})]}),(0,e.jsxs)("span",{className:"flex items-center gap-2",children:[(0,e.jsx)(t.T,{s:"energy"}),(0,e.jsx)("span",{className:"h-1.5 w-20 overflow-hidden rounded-full bg-white/10",children:(0,e.jsx)("span",{className:"block h-full bg-orange-400",style:{width:`${(0,t.spell)(n,C,"tpl")}%`}})})]})]})]})})]}),(0,e.jsx)("section",{id:"code",className:"mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6",children:(0,e.jsxs)("div",{className:"grid grid-cols-1 gap-10 lg:grid-cols-2",children:[(0,e.jsxs)("div",{children:[(0,e.jsx)("h2",{className:"font-display text-4xl font-bold text-white",children:(0,e.jsx)(t.T,{s:"Ten lines to a living scene"})}),(0,e.jsx)("p",{className:"mt-3 max-w-md",children:(0,e.jsx)(t.T,{s:"The same engine that runs the room above. Plain JavaScript, a React hook, or a worker when you need thousands of bodies."})}),(0,e.jsx)("ul",{className:"mt-6 space-y-3",children:(0,e.jsx)(t.T,{s:[[D,"Spheres, boxes, capsules and convex hulls"],[I,"Joints, springs and constraints"],[B,"Sleeping, broad-phase grid and SIMD maths"],[W,"Deterministic: same input, same result"]].map(([o,i])=>(0,e.jsxs)("li",{className:"flex items-center gap-3",children:[(0,e.jsx)("span",{className:"grid size-9 place-items-center rounded-xl bg-orange-500/15 text-orange-300",children:(0,e.jsx)(o,{className:"size-4"})}),(0,e.jsx)(t.T,{s:i})]},i))})})]}),(0,e.jsxs)("div",{className:"overflow-hidden rounded-3xl bg-[#11131a] ring-1 ring-white/10",children:[(0,e.jsxs)("div",{className:"flex gap-1 border-b border-white/10 p-2",children:[(0,e.jsx)(t.T,{s:Object.keys(T).map(o=>(0,e.jsx)("button",{onClick:()=>k(o),className:`rounded-lg px-3 py-1.5 font-mono text-xs ${(0,t.spell)(n,x===o?"bg-white/10 text-white":"text-white/50","tpl")}`,children:(0,e.jsx)(t.T,{s:o})},o))}),(0,e.jsxs)("button",{onClick:()=>{navigator.clipboard?.writeText(T[x]).catch(()=>{}),u("Copied")},className:"ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 font-mono text-xs text-white/60 hover:text-white",children:[(0,e.jsx)(O,{className:"size-3.5"}),(0,e.jsx)(t.T,{s:"Copy"})]})]}),(0,e.jsx)("pre",{className:"overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-orange-100/80",children:(0,e.jsx)("code",{children:(0,e.jsx)(t.T,{s:T[x]})})})]})]})}),(0,e.jsx)("section",{id:"bench",className:"scroll-mt-20 border-y border-white/10 bg-white/[0.02] py-20",children:(0,e.jsxs)("div",{className:"mx-auto max-w-7xl px-4 sm:px-6",children:[(0,e.jsx)("h2",{className:"font-display text-4xl font-bold text-white",children:(0,e.jsx)(t.T,{s:"Bodies at 60 fps on a mid-range laptop"})}),(0,e.jsx)("div",{className:"mt-8 space-y-3",children:(0,e.jsx)(t.T,{s:[["Gravitas",5200,!0],["Engine B",2900],["Engine C",1700],["Engine D",900]].map(([o,i,y])=>(0,e.jsxs)("div",{className:"flex items-center gap-4",children:[(0,e.jsx)("span",{className:"w-24 shrink-0 font-mono text-sm",children:(0,e.jsx)(t.T,{s:o})}),(0,e.jsx)("div",{className:"h-8 flex-1 overflow-hidden rounded-lg bg-white/5",children:(0,e.jsx)(G.motion.div,{initial:{width:0},whileInView:{width:`${i/5200*100}%`},viewport:{once:!0},transition:{duration:1.1},className:`flex h-full items-center justify-end rounded-lg pr-3 font-mono text-xs font-bold ${(0,t.spell)(n,y?"bg-orange-500 text-black":"bg-white/15 text-white","tpl")}`,children:(0,e.jsx)(t.T,{s:i.toLocaleString("en-GB")})})})]},o))})}),(0,e.jsx)("p",{className:"mt-4 text-xs text-white/40",children:(0,e.jsx)(t.T,{s:"Our own made-up test: spheres in a box, 4 sub-steps. Your numbers will vary."})})]})}),(0,e.jsxs)("section",{id:"pricing",className:"mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6",children:[(0,e.jsxs)("div",{className:"flex flex-wrap items-end justify-between gap-4",children:[(0,e.jsx)("h2",{className:"font-display text-4xl font-bold text-white",children:(0,e.jsx)(t.T,{s:"Pricing"})}),(0,e.jsx)("div",{className:"flex rounded-full bg-white/5 p-1 ring-1 ring-white/10",children:(0,e.jsx)(t.T,{s:[[!1,"Monthly"],[!0,"Yearly \u221220%"]].map(([o,i])=>(0,e.jsx)("button",{onClick:()=>E(o),className:`rounded-full px-4 py-1.5 text-sm font-semibold ${(0,t.spell)(n,S===o?"bg-white text-black":"","tpl")}`,children:(0,e.jsx)(t.T,{s:i})},i))})})]}),(0,e.jsx)("div",{className:"mt-8 grid grid-cols-1 gap-4 md:grid-cols-3",children:(0,e.jsx)(t.T,{s:[["Hobby",0,["Up to 500 bodies","Spheres & boxes","Community help"]],["Pro",24,["Unlimited bodies","Joints & constraints","Worker build","Email support"]],["Studio",99,["Everything in Pro","Deterministic replays","Source access","Priority support"]]].map(([o,i,y],P)=>(0,e.jsxs)("div",{className:`rounded-3xl p-6 ring-1 ${(0,t.spell)(n,P===1?"bg-orange-500 text-black ring-orange-500":"bg-white/5 ring-white/10","tpl")}`,children:[(0,e.jsx)("p",{className:"font-bold",children:(0,e.jsx)(t.T,{s:o})}),(0,e.jsx)("p",{className:"mt-2 font-display text-5xl font-bold",children:(0,e.jsx)(t.T,{s:i?`\xA3${(0,t.spell)(n,S?Math.round(i*.8):i,"tpl")}`:"Free"})}),(0,e.jsx)("p",{className:"text-sm opacity-70",children:(0,e.jsx)(t.T,{s:i?"per month":"forever"})}),(0,e.jsx)("ul",{className:"mt-5 space-y-2 text-sm",children:(0,e.jsx)(t.T,{s:y.map(w=>(0,e.jsxs)("li",{className:"flex items-center gap-2",children:[(0,e.jsx)(F,{className:"size-4"}),(0,e.jsx)(t.T,{s:w})]},w))})}),(0,e.jsx)("button",{onClick:()=>u(`${(0,t.spell)(n,o,"tpl")} plan: check your inbox to finish signing up`),className:`mt-6 w-full rounded-full py-2.5 text-sm font-bold ${(0,t.spell)(n,P===1?"bg-black text-white":"bg-white/10 text-white","tpl")}`,children:(0,e.jsx)(t.T,{s:i?"Start trial":"Get started"})})]},o))})}),(0,e.jsxs)("p",{className:"mt-6 flex items-center gap-2 text-sm",children:[(0,e.jsx)(H,{className:"size-4 text-orange-300"}),(0,e.jsx)(t.T,{s:"Free for open-source projects."})]})]}),(0,e.jsx)(X,{logo:_,className:"border-t border-white/10",links:["Docs","Examples","Changelog","GitHub"],note:n("A made-up library. The room above is real WebGL and real physics.")}),(0,e.jsx)(t.T,{s:z})]})}var ze=A;export{ze as default};
