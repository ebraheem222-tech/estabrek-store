import{c as O,f as X,q as K}from"./c/RQQZVHDR.js";import{b as w}from"./c/PJXWZX4L.js";import{Af as Y,Gc as A,Gh as U,Hh as J,Ia as I,Ig as q,Mf as Z,Sg as G,Ve as _,a as $,b as ne,c as se,cd as R,d as ae,ib as D,lb as H,vf as W}from"./c/ODXAQTWC.js";var n=$(ne(),1),a=$(se(),1),k=$(ae(),1);var e=$(J(),1),P=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),oe={js:[[/\/\/[^\n]*|\/\*[\s\S]*?\*\//y,"text-zinc-500 italic"],[/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/y,"text-emerald-300"],[/\b(?:const|let|var|function|return|if|else|for|while|new|class|import|from|export|await|async|of|in|this|typeof)\b/y,"text-fuchsia-300"],[/\b(?:true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b/y,"text-amber-300"],[/\b[A-Za-z_$][\w$]*(?=\()/y,"text-sky-300"]],css:[[/\/\*[\s\S]*?\*\//y,"text-zinc-500 italic"],[/#[0-9a-fA-F]{3,8}\b/y,"text-amber-300"],[/[a-z-]+(?=\s*:[^{]*;)/y,"text-sky-300"],[/-?\d+(?:\.\d+)?(?:px|rem|em|%|s|ms|deg|vh|vw|fr)?/y,"text-amber-300"],[/"[^"\n]*"|'[^'\n]*'/y,"text-emerald-300"],[/[.#]?[a-zA-Z][\w-]*(?=[^{};]*\{)/y,"text-fuchsia-300"]],html:[[/<!--[\s\S]*?-->/y,"text-zinc-500 italic"],[/<\/?[a-zA-Z][\w-]*|\/?>/y,"text-fuchsia-300"],[/\s[a-zA-Z-]+(?==)/y,"text-sky-300"],[/"[^"]*"|'[^']*'/y,"text-emerald-300"]]};function ie(s,l){let x=oe[l],m="",c=0,r="";for(;c<s.length;){let p=null;for(let[y,N]of x){y.lastIndex=c;let d=y.exec(s);if(d&&d[0].length){p=[d[0],N];break}}p?(m+=P(r)+`<span class="${p[1]}">${P(p[0])}</span>`,r="",c+=p[0].length):(r+=s[c],c++)}return m+P(r)+`
`}var C={"Bouncing balls":{html:`<canvas id="c"></canvas>
<p class="hint">Click to add a ball</p>`,css:`body {
  margin: 0;
  background: #0f172a;
  font-family: system-ui;
}
canvas { display: block; }
.hint {
  position: fixed;
  top: 12px;
  left: 16px;
  color: #94a3b8;
}`,js:`const c = document.getElementById("c");
const ctx = c.getContext("2d");
const balls = [];
function size() {
  c.width = innerWidth;
  c.height = innerHeight;
}
size();
addEventListener("resize", size);

function add(x, y) {
  const hue = Math.random() * 360;
  balls.push({ x, y, vx: Math.random() * 6 - 3, vy: -4, r: 10 + Math.random() * 18, hue });
  console.log("Balls:", balls.length);
}
for (let i = 0; i < 6; i++) add(Math.random() * innerWidth, 60);
c.addEventListener("click", (e) => add(e.clientX, e.clientY));

function tick() {
  ctx.fillStyle = "rgba(15,23,42,0.3)";
  ctx.fillRect(0, 0, c.width, c.height);
  for (const b of balls) {
    b.vy += 0.25;
    b.x += b.vx;
    b.y += b.vy;
    if (b.y + b.r > c.height) { b.y = c.height - b.r; b.vy *= -0.85; }
    if (b.x < b.r || b.x > c.width - b.r) b.vx *= -1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = \`hsl(\${b.hue} 90% 60%)\`;
    ctx.fill();
  }
  requestAnimationFrame(tick);
}
tick();`},"To-do list":{html:`<main>
  <h1>Today</h1>
  <form id="f">
    <input id="t" placeholder="Add a task" />
    <button>Add</button>
  </form>
  <ul id="list"></ul>
</main>`,css:`body {
  font-family: system-ui;
  background: #fef3c7;
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
}
main {
  background: white;
  padding: 24px;
  border-radius: 16px;
  width: 280px;
  box-shadow: 0 20px 40px -20px #92400e55;
}
form { display: flex; gap: 8px; }
input { flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #ddd; }
button { border: 0; background: #f59e0b; color: white; border-radius: 8px; padding: 0 12px; }
li { padding: 8px 0; cursor: pointer; }
li.done { text-decoration: line-through; opacity: .5; }`,js:`const list = document.getElementById("list");
const tasks = ["Water the plants", "Call Sam"];

function render() {
  list.innerHTML = "";
  tasks.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    li.onclick = () => li.classList.toggle("done");
    list.append(li);
  });
  console.log(\`\${tasks.length} tasks\`);
}

document.getElementById("f").onsubmit = (e) => {
  e.preventDefault();
  const input = document.getElementById("t");
  if (!input.value.trim()) return console.warn("Type something first");
  tasks.push(input.value.trim());
  input.value = "";
  render();
};
render();`},"Hover card":{html:`<div class="card">
  <div class="glow"></div>
  <h2>Move your mouse</h2>
  <p>A card that tilts towards the pointer.</p>
</div>`,css:`body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #09090b;
  font-family: system-ui;
  perspective: 800px;
}
.card {
  position: relative;
  width: 260px;
  padding: 32px;
  border-radius: 20px;
  color: white;
  background: linear-gradient(135deg, #7c3aed, #db2777);
  transition: transform 0.1s;
  overflow: hidden;
}
.glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--x, 50%) var(--y, 50%), #fff6, transparent 40%);
}`,js:`const card = document.querySelector(".card");
document.addEventListener("mousemove", (e) => {
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  card.style.transform = \`rotateY(\${(x - 0.5) * 20}deg) rotateX(\${(0.5 - y) * 20}deg)\`;
  card.style.setProperty("--x", x * 100 + "%");
  card.style.setProperty("--y", y * 100 + "%");
});
console.log("Card ready");`},"Broken code":{html:'<button id="b">Click me</button>',css:"button { font: 600 18px system-ui; padding: 12px 20px; margin: 24px; }",js:`// This one has a bug on purpose \u2014 open the console.
const b = document.getElementById("b");
b.onclick = () => {
  console.log("Clicked!");
  undefinedFunction();
};
console.info("Try clicking the button");`}},le=[["Aurora gradient","@lumi","from-emerald-400 via-cyan-500 to-indigo-600",1240],["Pixel clock","@tock","from-amber-300 to-orange-600",860],["Glass buttons","@vitr","from-sky-300 via-fuchsia-300 to-rose-300",2310],["Starfield","@nox","from-slate-900 via-indigo-900 to-black",1675],["Liquid loader","@blob","from-violet-500 to-fuchsia-500",940],["Neon type","@volt","from-pink-500 via-red-500 to-yellow-400",3020]],re='<script>(function(){var send=function(k,a){try{parent.postMessage({__sandpit:1,k:k,m:[].map.call(a,function(x){try{return typeof x==="object"?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(" ")},"*")}catch(e){}};["log","info","warn","error"].forEach(function(k){var o=console[k];console[k]=function(){send(k,arguments);o.apply(console,arguments)}});addEventListener("error",function(e){send("error",[e.message+" (line "+(e.lineno-1)+")"])});})()<\/script>';function ce({lang:s,value:l,onChange:x}){let m=(0,n.useLx)(),c=(0,a.useRef)(null),r=(0,a.useRef)(null),p=(0,a.useMemo)(()=>ie(l,s),[l,s]),y=l.split(`
`).length,N=o=>{c.current.scrollTop=o.target.scrollTop,c.current.scrollLeft=o.target.scrollLeft,r.current.scrollTop=o.target.scrollTop},d=o=>{if(o.key!=="Tab")return;o.preventDefault();let g=o.target,b=g.selectionStart,v=g.selectionEnd;x(l.slice(0,b)+"  "+l.slice(v)),requestAnimationFrame(()=>g.selectionStart=g.selectionEnd=b+2)},u="font-mono text-[13px] leading-[20px]";return(0,e.jsxs)("div",{className:"relative flex h-full min-h-0",children:[(0,e.jsx)("div",{ref:r,className:`w-10 shrink-0 overflow-hidden border-r border-white/5 py-3 pr-2 text-right text-zinc-600 select-none ${u}`,"aria-hidden":"true",children:(0,e.jsx)(n.T,{s:Array.from({length:y},(o,g)=>(0,e.jsx)("div",{children:(0,e.jsx)(n.T,{s:g+1})},g))})}),(0,e.jsxs)("div",{className:"relative min-w-0 flex-1",children:[(0,e.jsx)("pre",{ref:c,className:`pointer-events-none absolute inset-0 m-0 overflow-hidden p-3 whitespace-pre text-zinc-200 ${u}`,"aria-hidden":"true",dangerouslySetInnerHTML:{__html:p}}),(0,e.jsx)("textarea",{value:l,onChange:o=>x(o.target.value),onScroll:N,onKeyDown:d,spellCheck:!1,className:`absolute inset-0 resize-none overflow-auto bg-transparent p-3 whitespace-pre text-transparent caret-yellow-300 outline-none selection:bg-sky-500/30 ${u}`,"aria-label":m(`${s.toUpperCase()} editor`)})]})]})}function B(){let s=(0,n.useLx)(),[l,x]=(0,a.useState)(C["Bouncing balls"]),[m,c]=(0,a.useState)("js"),[r,p]=(0,a.useState)(!0),[y,N]=(0,a.useState)(""),[d,u]=(0,a.useState)([]),[o,g]=(0,a.useState)("side"),[b,v]=(0,a.useState)("Bouncing balls"),[L,V]=(0,a.useState)({}),[Q,z]=X("bg-yellow-300 text-black font-semibold"),M=(0,a.useRef)(null),ee=(t=l)=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${re}<style>${t.css}</style></head><body>${t.html}<script>${t.js.replace(/<\/script/gi,"<\\/script")}<\/script></body></html>`,T=(t=l)=>{u([{k:"sys",m:"Running\u2026",t:Date.now()}]),N(ee(t))};(0,a.useEffect)(()=>{if(!r)return;let t=setTimeout(()=>T(),650);return()=>clearTimeout(t)},[l,r]),(0,a.useEffect)(()=>{let t=i=>{!i.data||!i.data.__sandpit||i.source!==M.current?.contentWindow||u(h=>[...h.slice(-80),{k:i.data.k,m:i.data.m,t:Date.now()}])};return window.addEventListener("message",t),()=>window.removeEventListener("message",t)},[]);let E=t=>{x(C[t]),v(t),c("js"),r||T(C[t]),document.getElementById("playground")?.scrollIntoView({behavior:"smooth"})},te={log:"text-zinc-200",info:"text-sky-300",warn:"text-amber-300",error:"text-rose-300",sys:"text-zinc-500"},j=(0,e.jsxs)("a",{href:"#top",className:"flex items-center gap-2 font-display text-xl font-bold text-white",children:[(0,e.jsx)("span",{className:"grid size-8 place-items-center rounded-lg bg-yellow-300 text-black",children:(0,e.jsx)(D,{className:"size-4"})}),(0,e.jsx)(n.T,{s:"sandpit"})]});return(0,e.jsxs)("div",{className:"min-h-screen bg-[#0c0e12] font-sans text-zinc-400 selection:bg-yellow-300/30",children:[(0,e.jsx)(O,{logo:j,links:[["Playground","playground"],["Explore","explore"],["Pricing","pricing"]],cta:(0,e.jsx)("button",{onClick:()=>E("Bouncing balls"),className:"rounded-lg bg-yellow-300 px-4 py-2 text-sm font-semibold text-black",children:(0,e.jsx)(n.T,{s:"New sandbox"})})}),(0,e.jsxs)("header",{id:"top",className:"mx-auto max-w-6xl px-4 pt-32 pb-10 sm:px-6",children:[(0,e.jsxs)(k.motion.h1,{...w(),className:"max-w-3xl font-display text-5xl leading-[0.95] font-bold tracking-tight text-white sm:text-7xl",children:[(0,e.jsx)(n.T,{s:"Write code. "}),(0,e.jsx)("span",{className:"text-yellow-300",children:(0,e.jsx)(n.T,{s:"See it run."})}),(0,e.jsx)(n.T,{s:" Share the link."})]}),(0,e.jsx)(k.motion.p,{...w(.08),className:"mt-5 max-w-xl text-lg",children:(0,e.jsx)(n.T,{s:"HTML, CSS and JavaScript with a live preview and a real console. Edit anything below \u2014 it re-runs as you type."})}),(0,e.jsx)(k.motion.div,{...w(.12),className:"mt-6 flex flex-wrap gap-2",children:(0,e.jsx)(n.T,{s:Object.keys(C).map(t=>(0,e.jsx)("button",{onClick:()=>E(t),className:`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${b===t?"bg-white text-black ring-white":"text-zinc-300 ring-white/15 hover:bg-white/5"}`,children:(0,e.jsx)(n.T,{s:t})},t))})})]}),(0,e.jsx)("section",{id:"playground",className:"mx-auto max-w-7xl scroll-mt-20 px-2 pb-20 sm:px-6",children:(0,e.jsxs)("div",{className:"overflow-hidden rounded-2xl bg-[#14171c] ring-1 ring-white/10",children:[(0,e.jsxs)("div",{className:"flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2",children:[(0,e.jsx)("input",{value:b,onChange:t=>v(t.target.value),className:"min-w-0 flex-1 bg-transparent font-semibold text-white outline-none","aria-label":s("Sandbox title")}),(0,e.jsx)("button",{onClick:()=>g(o==="side"?"stack":"side"),className:"hidden size-9 place-items-center rounded-lg text-zinc-300 hover:bg-white/10 lg:grid","aria-label":s("Switch layout"),children:(0,e.jsx)(n.T,{s:o==="side"?(0,e.jsx)(W,{className:"size-4"}):(0,e.jsx)(H,{className:"size-4"})})}),(0,e.jsxs)("label",{className:"flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-300",children:[(0,e.jsx)("input",{type:"checkbox",checked:r,onChange:t=>p(t.target.checked),className:"accent-yellow-300"}),(0,e.jsx)(n.T,{s:" Auto-run"})]}),(0,e.jsxs)("button",{onClick:()=>T(),className:"flex items-center gap-1.5 rounded-lg bg-yellow-300 px-3 py-2 text-sm font-semibold text-black",children:[(0,e.jsx)(_,{className:"size-4 fill-current"}),(0,e.jsx)(n.T,{s:" Run"})]}),(0,e.jsx)("button",{onClick:()=>z(`Saved \u2014 sandpit.dev/s/${b.toLowerCase().replace(/\W+/g,"-")}`),className:"grid size-9 place-items-center rounded-lg text-zinc-300 ring-1 ring-white/10 hover:bg-white/10","aria-label":s("Save"),children:(0,e.jsx)(Y,{className:"size-4"})}),(0,e.jsx)("button",{onClick:()=>(v(`${b} (fork)`),z("Forked \u2014 this copy is yours")),className:"grid size-9 place-items-center rounded-lg text-zinc-300 ring-1 ring-white/10 hover:bg-white/10","aria-label":s("Fork"),children:(0,e.jsx)(A,{className:"size-4"})}),(0,e.jsx)("button",{onClick:()=>(navigator.clipboard?.writeText("https://sandpit.dev/s/bouncing-balls").catch(()=>{}),z("Share link copied")),className:"grid size-9 place-items-center rounded-lg text-zinc-300 ring-1 ring-white/10 hover:bg-white/10","aria-label":s("Share"),children:(0,e.jsx)(Z,{className:"size-4"})})]}),(0,e.jsxs)("div",{className:`grid grid-cols-1 ${o==="side"?"lg:grid-cols-2":""}`,children:[(0,e.jsxs)("div",{className:`flex min-w-0 flex-col border-b border-white/10 ${o==="side"?"lg:border-r lg:border-b-0":""}`,children:[(0,e.jsx)("div",{className:"flex border-b border-white/10 text-sm font-semibold",children:(0,e.jsx)(n.T,{s:[["html","HTML","text-orange-300"],["css","CSS","text-sky-300"],["js","JS","text-yellow-300"]].map(([t,i,h])=>(0,e.jsxs)("button",{onClick:()=>c(t),className:`flex items-center gap-2 px-4 py-2.5 ${m===t?"bg-[#0f1216] text-white":"hover:text-zinc-200"}`,children:[(0,e.jsx)("span",{className:`text-[10px] font-bold ${h}`,children:"\u25CF"}),(0,e.jsx)(n.T,{s:i}),(0,e.jsx)("span",{className:"text-[11px] font-normal text-zinc-600",children:(0,e.jsx)(n.T,{s:l[t].split(`
`).length})})]},t))})}),(0,e.jsx)("div",{className:"h-[380px] bg-[#0f1216] sm:h-[460px]",children:(0,e.jsx)(ce,{lang:m,value:l[m],onChange:t=>x(i=>({...i,[m]:t}))},m)})]}),(0,e.jsxs)("div",{className:"flex min-w-0 flex-col",children:[(0,e.jsxs)("div",{className:"flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs",children:[(0,e.jsx)("span",{className:"size-2 rounded-full bg-emerald-400"}),(0,e.jsx)(n.T,{s:" Preview "}),(0,e.jsx)(n.T,{s:r&&(0,e.jsxs)("span",{className:"flex items-center gap-1 text-yellow-300/80",children:[(0,e.jsx)(U,{className:"size-3"}),(0,e.jsx)(n.T,{s:" live"})]})})]}),(0,e.jsx)("iframe",{ref:M,title:s("Preview"),sandbox:"allow-scripts allow-modals",srcDoc:y,className:"h-[260px] w-full bg-white sm:h-[300px]"}),(0,e.jsxs)("div",{className:"flex items-center gap-2 border-y border-white/10 px-3 py-1.5 text-xs",children:[(0,e.jsx)(q,{className:"size-3.5"}),(0,e.jsx)(n.T,{s:" Console "}),(0,e.jsx)("span",{className:"rounded bg-white/10 px-1.5",children:(0,e.jsx)(n.T,{s:d.filter(t=>t.k!=="sys").length})}),(0,e.jsx)(n.T,{s:d.some(t=>t.k==="error")&&(0,e.jsxs)("span",{className:"rounded bg-rose-500/20 px-1.5 text-rose-300",children:[(0,e.jsx)(n.T,{s:d.filter(t=>t.k==="error").length}),(0,e.jsx)(n.T,{s:" error"})]})}),(0,e.jsx)("button",{onClick:()=>u([]),className:"ml-auto grid size-6 place-items-center rounded hover:bg-white/10","aria-label":s("Clear console"),children:(0,e.jsx)(G,{className:"size-3.5"})})]}),(0,e.jsx)("div",{className:"h-36 overflow-y-auto bg-[#0f1216] p-2 font-mono text-xs sm:h-[124px]","aria-live":"polite",children:(0,e.jsx)(n.T,{s:d.length===0?(0,e.jsx)("p",{className:"text-zinc-600",children:(0,e.jsx)(n.T,{s:"Nothing logged yet."})}):d.map((t,i)=>(0,e.jsxs)("p",{className:`border-b border-white/5 px-1 py-1 ${te[t.k]} ${t.k==="error"?"bg-rose-500/5":t.k==="warn"?"bg-amber-500/5":""}`,children:[(0,e.jsx)(n.T,{s:t.k!=="sys"&&(0,e.jsx)("span",{className:"mr-2 text-zinc-600",children:(0,e.jsx)(n.T,{s:new Date(t.t).toLocaleTimeString("en-GB")})})}),(0,e.jsx)(n.T,{s:t.m})]},i))})})]})]})]})}),(0,e.jsx)("section",{id:"explore",className:"border-y border-white/10 bg-[#101318] py-20",children:(0,e.jsxs)("div",{className:"mx-auto max-w-6xl px-4 sm:px-6",children:[(0,e.jsx)("h2",{className:"font-display text-4xl font-bold text-white",children:(0,e.jsx)(n.T,{s:"Trending this week"})}),(0,e.jsx)("div",{className:"mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",children:(0,e.jsx)(n.T,{s:le.map(([t,i,h,f],S)=>(0,e.jsxs)(k.motion.div,{...w(.04*S),className:"group overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/10",children:[(0,e.jsxs)("div",{className:`relative aspect-video bg-linear-to-br ${h}`,children:[(0,e.jsx)("span",{className:"absolute inset-x-6 bottom-6 h-2 rounded-full bg-white/40 transition-all duration-700 group-hover:inset-x-14"}),(0,e.jsx)("span",{className:"absolute top-6 left-6 size-10 rounded-full bg-white/30 blur-sm transition duration-700 group-hover:translate-x-24"})]}),(0,e.jsxs)("div",{className:"flex items-center gap-3 p-4",children:[(0,e.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,e.jsx)("p",{className:"truncate font-semibold text-white",children:(0,e.jsx)(n.T,{s:t})}),(0,e.jsx)("p",{className:"text-xs",children:(0,e.jsx)(n.T,{s:i})})]}),(0,e.jsxs)("button",{onClick:()=>V(F=>({...F,[t]:!F[t]})),className:`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${L[t]?"bg-rose-500/15 text-rose-300 ring-rose-400/30":"ring-white/10"}`,"aria-label":s(`Like ${t}`),children:[(0,e.jsx)(R,{className:`size-3.5 ${L[t]?"fill-current":""}`}),(0,e.jsx)(n.T,{s:(f+(L[t]?1:0)).toLocaleString("en-US")})]}),(0,e.jsx)("button",{onClick:()=>(E("Hover card"),v(`${t} (fork)`),z(`Forked ${t}`)),className:"grid size-8 place-items-center rounded-full ring-1 ring-white/10 hover:bg-white/10","aria-label":s(`Fork ${t}`),children:(0,e.jsx)(A,{className:"size-3.5"})})]})]},t))})})]})}),(0,e.jsx)("section",{id:"pricing",className:"mx-auto max-w-5xl px-4 py-20 sm:px-6",children:(0,e.jsx)("div",{className:"grid grid-cols-1 gap-4 md:grid-cols-3",children:(0,e.jsx)(n.T,{s:[["Free","$0",["Unlimited public sandboxes","Live preview and console","Embeds"]],["Pro","$8",["Private sandboxes","Asset hosting","Custom domains for demos","No ads"]],["Teams","$12",["Shared team space","Live pair editing","Classroom mode","SSO"]]].map(([t,i,h],f)=>(0,e.jsxs)(k.motion.div,{...w(.05*f),className:`rounded-2xl p-6 ${f===1?"bg-yellow-300 text-black":"bg-white/[0.03] ring-1 ring-white/10"}`,children:[(0,e.jsx)("p",{className:`font-semibold ${f===1?"":"text-white"}`,children:(0,e.jsx)(n.T,{s:t})}),(0,e.jsxs)("p",{className:`mt-2 font-display text-4xl font-bold ${f===1?"":"text-white"}`,children:[(0,e.jsx)(n.T,{s:i}),(0,e.jsx)("span",{className:"text-base font-normal opacity-60",children:(0,e.jsx)(n.T,{s:"/mo"})})]}),(0,e.jsx)("ul",{className:"mt-5 space-y-2 text-sm",children:(0,e.jsx)(n.T,{s:h.map(S=>(0,e.jsxs)("li",{className:"flex gap-2",children:[(0,e.jsx)(I,{className:"size-4 shrink-0"})," ",(0,e.jsx)(n.T,{s:S})]},S))})}),(0,e.jsxs)("button",{onClick:()=>z(`${t} \u2014 happy hacking`),className:`mt-6 w-full rounded-lg py-2.5 font-semibold ${f===1?"bg-black text-white":"bg-white text-black"}`,children:[(0,e.jsx)(n.T,{s:"Choose "}),(0,e.jsx)(n.T,{s:t})]})]},t))})})}),(0,e.jsx)(K,{logo:j,className:"border-t border-white/10",links:["Docs","Embeds","Status","Privacy"],note:s("A made-up code playground. Your code runs in a sandboxed frame in this page.")}),(0,e.jsx)(n.T,{s:Q})]})}var ue=B;export{ue as default};
