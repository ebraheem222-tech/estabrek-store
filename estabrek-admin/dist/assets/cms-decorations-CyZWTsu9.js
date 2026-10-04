import{j as w,R as K}from"./vendor-react-CZO0UtqT.js";import{D as a0,a as g0,b as W,S as h0}from"./cms-shapes-DAv6BJlf.js";function v0(t){switch(t){case"top":return{position:"absolute",top:0,left:0,right:0,width:"100%",transform:"translateY(-100%) scaleY(-1)",transformOrigin:"bottom"};case"bottom":return{position:"absolute",bottom:0,left:0,right:0,width:"100%",transform:"translateY(100%)",transformOrigin:"top"};case"left":return{position:"absolute",top:0,left:0,bottom:0,height:"100%",transform:"translateX(-100%) rotate(90deg)",transformOrigin:"right center"};case"right":return{position:"absolute",top:0,right:0,bottom:0,height:"100%",transform:"translateX(100%) rotate(-90deg)",transformOrigin:"left center"};default:return{position:"absolute",top:0,left:0,right:0,bottom:0,width:"100%",height:"100%"}}}function Y(t){if(t==null)return;if(typeof t=="number"&&Number.isFinite(t))return`${t}px`;if(typeof t!="string")return;const r=t.trim();if(r)return/^-?\d+(\.\d+)?$/.test(r)?`${r}px`:r}function _(t){return t?/gradient\(/i.test(t):!1}const p0=new Set(["g","defs","path","circle","rect","ellipse","line","polyline","polygon","lineargradient","radialgradient","stop","pattern","mask","filter","feturbulence","fegaussianblur","fecolormatrix","feoffset","feblend","fecomposite","feflood","femorphology","fedropshadow","clippath","use","title","desc"]),f0=new Set(["path","circle","rect","ellipse","line","polyline","polygon"]);function d0(t){const r=t.trim();return!r||r.includes(":")||r.toLowerCase().startsWith("on")?null:r==="class"?"className":r.replace(/-([a-z])/g,(l,o)=>o.toUpperCase())}function P(t,r){if(!t)return t;const l=t.replace(/url\(\s*['"]?#([^'")]+)['"]?\s*\)/gi,(e,s)=>`url(#${r[s]||s})`),o=l.match(/^#(.+)$/);if(o){const e=o[1];return`#${r[e]||e}`}return l}function x0(t){const r={};if(!t)return r;const l=t.split(";");for(const o of l){const e=o.indexOf(":");if(e===-1)continue;const s=o.slice(0,e).trim().toLowerCase(),n=o.slice(e+1).trim();if(!s||!n)continue;const i=s.replace(/-([a-z])/g,(c,a)=>a.toUpperCase());r[i]=n}return r}function u0(t){const r=t.getAttribute("width")?.trim()||"",l=t.getAttribute("height")?.trim()||"",o=Number(r.replace(/px$/i,"")),e=Number(l.replace(/px$/i,""));if(Number.isFinite(o)&&o>0&&Number.isFinite(e)&&e>0)return`0 0 ${o} ${e}`}function C0(t,r){const l={},o=e=>{const s=e.getAttribute("id")?.trim();s&&(l[s]=`${r}-${s}`);for(const n of Array.from(e.children))o(n)};return o(t),l}function J(t,r,l){const o={};for(const e of Array.from(t.attributes)){const s=e.name,n=e.value?.trim();if(!n)continue;const i=s.toLowerCase();if(i==="xmlns"||i.startsWith("xmlns:")||l.isRoot&&(i==="width"||i==="height")||i==="viewbox")continue;if(i==="style"){const a=x0(n);for(const[p,m]of Object.entries(a))o[p]=P(m,r);continue}const c=d0(s);c&&(c==="id"?o[c]=r[n]||n:o[c]=P(n,r))}return o}function t0(t,r){const l=t.tagName,o=l.toLowerCase();if(!p0.has(o))return null;const e=J(t,r,{isRoot:!1}),s=[];for(const n of Array.from(t.childNodes)){if(n.nodeType!==1)continue;const i=t0(n,r);i&&s.push(i)}return{tag:l,attrs:e,children:s}}function m0(t){const r=t.match(/viewBox\s*=\s*["']([^"']+)["']/i);return r?r[1].trim():void 0}function y0(t){const r=[],l=/<path\b[^>]*\bd\s*=\s*["']([^"']+)["'][^>]*>/gi;let o;for(;(o=l.exec(t))!==null;){const e=(o[1]??"").trim();e&&r.push(e)}return r}function k0(t,r){const l=typeof t.svg=="string"?t.svg.trim():"";if(!l)return null;const o=typeof t.svgViewBox=="string"?t.svgViewBox.trim():"";if(!(/<\s*svg\b/i.test(l)||/<\s*(path|circle|rect|ellipse|line|polyline|polygon|defs|g|pattern|mask|filter)\b/i.test(l)))return{viewBox:o||"0 0 100 100",rootAttrs:{},nodes:[{tag:"path",attrs:{d:l},children:[]}]};const s=/<\s*svg\b/i.test(l)?l:`<svg xmlns="http://www.w3.org/2000/svg"${o?` viewBox="${o}"`:""}>${l}</svg>`;if(typeof DOMParser>"u"){const h=y0(s);return h.length?{viewBox:o||m0(s)||"0 0 100 100",rootAttrs:{},nodes:h.map(d=>({tag:"path",attrs:{d},children:[]}))}:null}const n=new DOMParser().parseFromString(s,"image/svg+xml");if(!n||n.getElementsByTagName("parsererror").length>0)return null;const i=n.documentElement;if(!i||i.tagName.toLowerCase()!=="svg")return null;const c=C0(i,r),a=o||i.getAttribute("viewBox")?.trim()||u0(i)||"0 0 100 100",p=J(i,c,{isRoot:!0}),m=[];for(const h of Array.from(i.childNodes)){if(h.nodeType!==1)continue;const d=t0(h,c);d&&m.push(d)}return{viewBox:a,rootAttrs:p,nodes:m}}function r0(t,r,l,o){const e=t.tag.toLowerCase(),s={...t.attrs};if(o&&f0.has(e)){const i=(s.fill||"").trim(),c=(s.stroke||"").trim();e==="line"?(s.fill="none",(!c||c==="currentColor")&&(s.stroke=l)):((!i||i==="currentColor")&&(s.fill=l),c==="currentColor"&&(s.stroke=l))}const n=t.children.map((i,c)=>r0(i,`${r}.${c}`,l,o));return K.createElement(t.tag,{key:r,...s},n.length?n:void 0)}const X=({config:t,className:r=""})=>{const o=`decor-${K.useId().replace(/[^a-zA-Z0-9_-]/g,"")}`;if(!t.shape||t.shape==="none")return null;const e=t.placement||"bottom",s=t.size||"md",n=t.color||"accent",i=t.opacity||"100",c=t.blur||"0",a=t.fill,p=t.flipX??!1,m=t.flipY??!1,h=t.zIndex??0,d=Y(t.offsetX),E=Y(t.offsetY),e0=Number.isFinite(t.rotate)?`rotate(${Number(t.rotate)}deg)`:void 0,o0=Number.isFinite(t.scale)?`scale(${Number(t.scale)})`:void 0,z=g0[s]||100,x=(typeof t.customColor=="string"?t.customColor.trim():"")||(n==="custom"?"":W[n])||W.accent,R=_(x),I=a??(R?"gradient":"solid"),T=I==="gradient",N=T?R?x:`linear-gradient(135deg, ${x}, ${x})`:"",y=T&&_(N)?q(N):[],j=R?q(x)[0]??x:x,k=T&&y.length>=2,f=k?`${o}-gradient-${e}`:null,G=v0(e),l0=G.transform,s0=d||E?`translate(${d??"0px"}, ${E??"0px"})`:void 0,$=[l0,s0,e0,o0].filter(Boolean).join(" "),B=[];p&&B.push("scaleX(-1)"),m&&B.push("scaleY(-1)");const V=B.length>0?B.join(" "):void 0,F=a0[c]||"0",b=F!=="0"?`blur(${F})`:void 0,H=Math.max(0,Math.min(100,Number(i)))/100*(I==="glass"?.6:1),S={...G,transform:$||void 0};if(t.shape==="noise"){const g=[$,V].filter(Boolean).join(" ");return w.jsx("span",{className:`pointer-events-none ${r}`,style:{...S,transform:g||void 0,zIndex:h,opacity:H,filter:b,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,backgroundSize:"200px 200px"},"aria-hidden":"true"})}if(t.shape==="gradient-fade"){const g=t.customColor||(n==="white"?"255,255,255":"0,0,0"),u=e==="top"?"to bottom":e==="bottom"?"to top":e==="left"?"to right":"to left",v=[$,V].filter(Boolean).join(" ");return w.jsx("span",{className:`pointer-events-none ${r}`,style:{...S,transform:v||void 0,height:e==="top"||e==="bottom"?z:"100%",width:e==="left"||e==="right"?z:"100%",zIndex:h,opacity:H,filter:b,background:`linear-gradient(${u}, rgba(${g}, 0) 0%, rgba(${g}, 1) 100%)`},"aria-hidden":"true"})}const n0=e==="left"||e==="right",O=e==="background",Z=n0||O?"100%":z,Q="100%",L=t.shape==="lines-horizontal"||t.shape==="lines-diagonal",M=k&&f?`url(#${f})`:j;if(t.shape==="custom-svg"){const g=k0(t,o);if(!g)return null;const u=k&&!!f,v={...g.rootAttrs},C=(v.fill||"").trim(),i0=(v.stroke||"").trim();return u?((!C||C==="currentColor")&&C!=="none"&&!/^url\(/i.test(C)&&(v.fill=M),i0==="currentColor"&&(v.stroke=M)):C||(v.fill="currentColor"),w.jsx("span",{className:`pointer-events-none overflow-hidden ${r}`,style:{...S,height:O?"100%":Z,zIndex:h,opacity:H,filter:b},"aria-hidden":"true",children:w.jsxs("svg",{viewBox:g.viewBox,preserveAspectRatio:"none",...v,style:{width:Q,height:Z,display:"block",transform:V,color:j},children:[k&&f&&w.jsx("defs",{children:w.jsx("linearGradient",{id:f,x1:"0%",y1:"0%",x2:"100%",y2:"100%",children:y.map((D,A)=>{const c0=Math.max(1,y.length-1),w0=A/c0*100;return w.jsx("stop",{offset:`${w0}%`,stopColor:D},`${f}-${A}`)})})}),g.nodes.map((D,A)=>r0(D,`custom-svg-${A}`,M,u))]})})}const U=h0[t.shape];return U?w.jsx("span",{className:`pointer-events-none overflow-hidden ${r}`,style:{...S,height:O?"100%":Z,zIndex:h,opacity:H,filter:b},"aria-hidden":"true",children:w.jsxs("svg",{viewBox:U.viewBox,preserveAspectRatio:"none",style:{width:Q,height:Z,display:"block",transform:V},children:[k&&f&&w.jsx("defs",{children:w.jsx("linearGradient",{id:f,x1:"0%",y1:"0%",x2:"100%",y2:"100%",children:y.map((g,u)=>{const v=Math.max(1,y.length-1),C=u/v*100;return w.jsx("stop",{offset:`${C}%`,stopColor:g},`${f}-${u}`)})})}),w.jsx("path",{d:U.d,fill:L?"none":M,stroke:L?M:void 0,strokeWidth:L?2:void 0,strokeLinecap:L?"round":void 0,strokeLinejoin:L?"round":void 0})]})}):null},A0=({decorations:t,className:r=""})=>t?w.jsxs(w.Fragment,{children:[t.before?w.jsx(X,{config:t.before,className:r}):null,t.after?w.jsx(X,{config:t.after,className:r}):null]}):null;function q(t){const r=["#6FA6A1","#5B918C"],l=String(t??"").trim();if(!l||!_(l))return[];const o=l.indexOf("("),e=l.lastIndexOf(")");if(o<0||e<=o)return r;const s=l.slice(o+1,e),n=L0(s).map(p=>p.trim()).filter(Boolean);if(n.length<2)return r;const i=n[0]?.trim()??"",c=M0(i)?1:0,a=n.slice(c).map(B0).filter(p=>!!p);return a.length>=2?a:a.length===1?[a[0],a[0]]:r}function L0(t){const r=[];let l="",o=0;for(let e=0;e<t.length;e++){const s=t[e];if(s==="("&&o++,s===")"&&(o=Math.max(0,o-1)),s===","&&o===0){r.push(l),l="";continue}l+=s}return l.trim()&&r.push(l),r}function M0(t){const r=String(t??"").trim().toLowerCase();return r?!!(r.startsWith("to ")||r.includes(" at ")||/(deg|grad|rad|turn)$/.test(r)||r.startsWith("circle")||r.startsWith("ellipse")):!1}function B0(t){const r=String(t??"").trim();if(!r)return null;if(/^[a-zA-Z][a-zA-Z0-9_-]*\(/.test(r)){let o=0;for(let e=0;e<r.length;e++){const s=r[e];if(s==="("&&o++,s===")"&&(o--,o===0))return r.slice(0,e+1).trim()}}const l=r.split(/\s+/)[0];return l?l.trim():null}const z0={wave1:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L48 55C96 50 192 40 288 45C384 50 480 70 576 75C672 80 768 70 864 60C960 50 1056 40 1152 45C1248 50 1344 70 1392 80L1440 90V120H0V60Z" fill="currentColor"/>
</svg>`,wave2:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0L60 10C120 20 240 40 360 50C480 60 600 60 720 55C840 50 960 40 1080 35C1200 30 1320 30 1380 30L1440 30V120H0V0Z" fill="currentColor"/>
</svg>`,wave3:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 80L40 75C80 70 160 60 240 55C320 50 400 50 480 55C560 60 640 70 720 70C800 70 880 60 960 50C1040 40 1120 30 1200 35C1280 40 1360 60 1400 70L1440 80V120H0V80Z" fill="currentColor"/>
</svg>`,waveDouble:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 40L48 45C96 50 192 60 288 55C384 50 480 30 576 25C672 20 768 30 864 40C960 50 1056 60 1152 55C1248 50 1344 30 1392 20L1440 10V0H0V40Z" fill="currentColor" opacity="0.5"/>
  <path d="M0 80L48 75C96 70 192 60 288 65C384 70 480 90 576 95C672 100 768 90 864 80C960 70 1056 60 1152 65C1248 70 1344 90 1392 100L1440 110V120H0V80Z" fill="currentColor"/>
</svg>`,waveSoft:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60Q360 0 720 60T1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,waveSharp:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L180 30L360 70L540 20L720 80L900 40L1080 90L1260 50L1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,waveAsym:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 100C240 100 240 20 480 20C720 20 720 80 960 80C1200 80 1200 40 1440 40V120H0V100Z" fill="currentColor"/>
</svg>`,waveMultiple:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 20Q180 60 360 20T720 20T1080 20T1440 20V120H0V20Z" fill="currentColor" opacity="0.3"/>
  <path d="M0 40Q180 80 360 40T720 40T1080 40T1440 40V120H0V40Z" fill="currentColor" opacity="0.5"/>
  <path d="M0 60Q180 100 360 60T720 60T1080 60T1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,waveThin:`<svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 20Q360 0 720 20T1440 20V40H0V20Z" fill="currentColor"/>
</svg>`,waveThick:`<svg viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 100Q360 0 720 100T1440 100V200H0V100Z" fill="currentColor"/>
</svg>`,triangleUp:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M720 0L1440 120H0L720 0Z" fill="currentColor"/>
</svg>`,triangleDown:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H1440L720 120L0 0Z" fill="currentColor"/>
</svg>`,triangleLeft:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L1440 0V120L0 60Z" fill="currentColor"/>
</svg>`,triangleRight:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1440 60L0 120V0L1440 60Z" fill="currentColor"/>
</svg>`,angleUp:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120L720 0L1440 120H0Z" fill="currentColor"/>
</svg>`,angleDown:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0L720 120L1440 0V120H0V0Z" fill="currentColor"/>
</svg>`,angleAsym:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120L960 0L1440 80V120H0Z" fill="currentColor"/>
</svg>`,zigzag:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120L120 60L240 120L360 60L480 120L600 60L720 120L840 60L960 120L1080 60L1200 120L1320 60L1440 120V120H0Z" fill="currentColor"/>
</svg>`,zigzagSmall:`<svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L60 30L120 60L180 30L240 60L300 30L360 60L420 30L480 60L540 30L600 60L660 30L720 60L780 30L840 60L900 30L960 60L1020 30L1080 60L1140 30L1200 60L1260 30L1320 60L1380 30L1440 60H0Z" fill="currentColor"/>
</svg>`,arrow:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H600L720 60L840 0H1440V120H0V0Z" fill="currentColor"/>
</svg>`,curveUp:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120C0 53.7 322.7 0 720 0C1117.3 0 1440 53.7 1440 120H0Z" fill="currentColor"/>
</svg>`,curveDown:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0C0 66.3 322.7 120 720 120C1117.3 120 1440 66.3 1440 0V120H0V0Z" fill="currentColor"/>
</svg>`,curveAsym:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 80C480 80 480 0 960 0C1200 0 1440 40 1440 80V120H0V80Z" fill="currentColor"/>
</svg>`,arcUp:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120Q720 -40 1440 120H0Z" fill="currentColor"/>
</svg>`,arcDown:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0Q720 160 1440 0V120H0V0Z" fill="currentColor"/>
</svg>`,semicircle:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="720" cy="120" rx="400" ry="100" fill="currentColor"/>
</svg>`,scallop:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120C0 60 80 60 160 120C160 60 240 60 320 120C320 60 400 60 480 120C480 60 560 60 640 120C640 60 720 60 800 120C800 60 880 60 960 120C960 60 1040 60 1120 120C1120 60 1200 60 1280 120C1280 60 1360 60 1440 120H0Z" fill="currentColor"/>
</svg>`,scallopInverse:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0C0 60 80 60 160 0C160 60 240 60 320 0C320 60 400 60 480 0C480 60 560 60 640 0C640 60 720 60 800 0C800 60 880 60 960 0C960 60 1040 60 1120 0C1120 60 1200 60 1280 0C1280 60 1360 60 1440 0V120H0V0Z" fill="currentColor"/>
</svg>`,bump:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120H520C520 60 620 0 720 0C820 0 920 60 920 120H1440V120H0Z" fill="currentColor"/>
</svg>`,dip:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H520C520 60 620 120 720 120C820 120 920 60 920 0H1440V120H0V0Z" fill="currentColor"/>
</svg>`,slantLeft:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0L1440 120H0V0Z" fill="currentColor"/>
</svg>`,slantRight:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1440 0L0 120H1440V0Z" fill="currentColor"/>
</svg>`,slantDouble:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60L720 0L1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,steps:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120V100H288V80H576V60H864V40H1152V20H1440V120H0Z" fill="currentColor"/>
</svg>`,stepsReverse:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 20H288V40H576V60H864V80H1152V100H1440V120H0V20Z" fill="currentColor"/>
</svg>`,stepsCenter:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120V80H360V40H540V0H900V40H1080V80H1440V120H0Z" fill="currentColor"/>
</svg>`,hexagon:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M360 120L0 60L360 0H1080L1440 60L1080 120H360Z" fill="currentColor"/>
</svg>`,diamond:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 0L200 100L100 200L0 100L100 0Z" fill="currentColor"/>
</svg>`,parallelogram:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M200 0H1440L1240 120H0L200 0Z" fill="currentColor"/>
</svg>`,trapezoid:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M200 0H1240L1440 120H0L200 0Z" fill="currentColor"/>
</svg>`,blob1:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C87,14.6,81.4,29.2,73.1,42.2C64.8,55.2,53.8,66.6,40.5,74.6C27.2,82.6,11.6,87.2,-3.8,92.4C-19.2,97.6,-38.4,103.4,-54.6,98.5C-70.8,93.6,-84,78,-91.3,60.7C-98.6,43.4,-100,24.7,-97.8,7C-95.6,-10.7,-89.8,-27.4,-80.8,-41.8C-71.8,-56.2,-59.6,-68.3,-45.6,-75.6C-31.6,-82.9,-15.8,-85.4,-0.1,-85.2C15.6,-85,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,blob2:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M39.9,-65.7C54.3,-60.5,70.2,-54.3,78.4,-42.6C86.6,-30.9,87,-13.5,84.4,2.5C81.8,18.5,76.2,33,67.2,45.2C58.2,57.3,45.8,67,32.1,73.5C18.4,80,-7.6,83.3,-30.6,78.8C-53.6,74.3,-73.6,62,-83.1,45.3C-92.6,28.6,-91.6,7.5,-87.3,-12.1C-83,-31.7,-75.4,-49.8,-62.2,-55.7C-49,-61.6,-30.2,-55.3,-14.4,-51.8C1.4,-48.3,25.5,-70.9,39.9,-65.7Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,blob3:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M47.7,-51.2C59.5,-42.5,65.2,-25.2,67.4,-7.6C69.6,10,68.3,28,59.3,41.3C50.3,54.6,33.6,63.2,15.7,69.4C-2.2,75.6,-21.3,79.4,-37.1,73.1C-52.9,66.8,-65.4,50.4,-70.9,32.5C-76.4,14.6,-74.9,-4.8,-68.4,-21.7C-61.9,-38.6,-50.4,-53,-36.6,-61C-22.8,-69,-6.7,-70.6,7.1,-78.3C20.9,-86,35.9,-59.9,47.7,-51.2Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,blob4:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M54.2,-67.5C69.7,-56.9,81.3,-39.5,85.4,-20.8C89.5,-2.1,86.1,17.9,77.3,35.1C68.5,52.3,54.3,66.7,37.4,74.4C20.5,82.1,0.9,83.1,-18.7,79.3C-38.3,75.5,-58,66.9,-70.9,52C-83.8,37.1,-89.9,15.9,-87.7,-4.1C-85.5,-24.1,-75,-42.9,-60.5,-53.7C-46,-64.5,-27.5,-67.3,-9.5,-56.3C8.5,-45.3,38.7,-78.1,54.2,-67.5Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,blob5:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M41.3,-49.3C54.4,-40.3,66.5,-28.1,71.4,-13.1C76.3,1.9,74,19.7,66.1,35.1C58.2,50.5,44.7,63.5,28.9,70.1C13.1,76.7,-5,76.9,-21.8,72.1C-38.6,67.3,-54.1,57.5,-63.9,43.4C-73.7,29.3,-77.8,10.9,-75.3,-6.3C-72.8,-23.5,-63.7,-39.5,-50.6,-48.6C-37.5,-57.7,-20.4,-59.9,-3.4,-55.8C13.6,-51.7,28.2,-58.3,41.3,-49.3Z" transform="translate(100 100)" fill="currentColor"/>
</svg>`,blobFlat:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 60C160 20 320 100 480 60C640 20 800 100 960 60C1120 20 1280 100 1440 60V120H0V60Z" fill="currentColor"/>
</svg>`,cloud:`<svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M170 70C170 70 180 60 170 50C160 40 150 45 150 45C150 35 135 25 120 30C105 20 85 25 80 40C70 35 55 40 55 55C40 50 25 60 30 75C30 90 50 95 70 90H160C175 90 185 80 170 70Z" fill="currentColor"/>
</svg>`,cloudWave:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 120C80 80 120 100 200 80C280 60 320 100 400 80C480 60 520 100 600 80C680 60 720 100 800 80C880 60 920 100 1000 80C1080 60 1120 100 1200 80C1280 60 1360 100 1440 80V120H0Z" fill="currentColor"/>
</svg>`,splatter:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="60" fill="currentColor"/>
  <circle cx="60" cy="60" r="20" fill="currentColor"/>
  <circle cx="150" cy="70" r="15" fill="currentColor"/>
  <circle cx="140" cy="150" r="25" fill="currentColor"/>
  <circle cx="50" cy="140" r="18" fill="currentColor"/>
  <circle cx="100" cy="40" r="12" fill="currentColor"/>
  <circle cx="160" cy="120" r="10" fill="currentColor"/>
</svg>`,ink:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 20C60 20 40 60 40 100C40 140 60 180 100 180C140 180 160 140 160 100C160 60 140 20 100 20Z" fill="currentColor"/>
  <ellipse cx="100" cy="100" rx="80" ry="40" fill="currentColor"/>
  <circle cx="40" cy="80" r="15" fill="currentColor"/>
  <circle cx="160" cy="120" r="12" fill="currentColor"/>
</svg>`,dots:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="5" fill="currentColor"/>
  <circle cx="60" cy="20" r="5" fill="currentColor"/>
  <circle cx="100" cy="20" r="5" fill="currentColor"/>
  <circle cx="140" cy="20" r="5" fill="currentColor"/>
  <circle cx="180" cy="20" r="5" fill="currentColor"/>
  <circle cx="20" cy="60" r="5" fill="currentColor"/>
  <circle cx="60" cy="60" r="5" fill="currentColor"/>
  <circle cx="100" cy="60" r="5" fill="currentColor"/>
  <circle cx="140" cy="60" r="5" fill="currentColor"/>
  <circle cx="180" cy="60" r="5" fill="currentColor"/>
  <circle cx="20" cy="100" r="5" fill="currentColor"/>
  <circle cx="60" cy="100" r="5" fill="currentColor"/>
  <circle cx="100" cy="100" r="5" fill="currentColor"/>
  <circle cx="140" cy="100" r="5" fill="currentColor"/>
  <circle cx="180" cy="100" r="5" fill="currentColor"/>
  <circle cx="20" cy="140" r="5" fill="currentColor"/>
  <circle cx="60" cy="140" r="5" fill="currentColor"/>
  <circle cx="100" cy="140" r="5" fill="currentColor"/>
  <circle cx="140" cy="140" r="5" fill="currentColor"/>
  <circle cx="180" cy="140" r="5" fill="currentColor"/>
  <circle cx="20" cy="180" r="5" fill="currentColor"/>
  <circle cx="60" cy="180" r="5" fill="currentColor"/>
  <circle cx="100" cy="180" r="5" fill="currentColor"/>
  <circle cx="140" cy="180" r="5" fill="currentColor"/>
  <circle cx="180" cy="180" r="5" fill="currentColor"/>
</svg>`,grid:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="0" y1="50" x2="200" y2="50" stroke="currentColor" stroke-width="1"/>
  <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" stroke-width="1"/>
  <line x1="0" y1="150" x2="200" y2="150" stroke="currentColor" stroke-width="1"/>
  <line x1="50" y1="0" x2="50" y2="200" stroke="currentColor" stroke-width="1"/>
  <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" stroke-width="1"/>
  <line x1="150" y1="0" x2="150" y2="200" stroke="currentColor" stroke-width="1"/>
</svg>`,cross:`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M35 0H65V35H100V65H65V100H35V65H0V35H35V0Z" fill="currentColor"/>
</svg>`,plus:`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="40" y="10" width="20" height="80" rx="5" fill="currentColor"/>
  <rect x="10" y="40" width="80" height="20" rx="5" fill="currentColor"/>
</svg>`,star4:`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0L60 40L100 50L60 60L50 100L40 60L0 50L40 40L50 0Z" fill="currentColor"/>
</svg>`,star6:`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0L58 35L93 20L65 50L93 80L58 65L50 100L42 65L7 80L35 50L7 20L42 35L50 0Z" fill="currentColor"/>
</svg>`,star8:`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0L56 33L85 15L67 44L100 50L67 56L85 85L56 67L50 100L44 67L15 85L33 56L0 50L33 44L15 15L44 33L50 0Z" fill="currentColor"/>
</svg>`,sparkle:`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0C50 30 70 50 100 50C70 50 50 70 50 100C50 70 30 50 0 50C30 50 50 30 50 0Z" fill="currentColor"/>
</svg>`,burst:`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0L55 25L75 10L60 30L90 25L65 40L100 50L65 60L90 75L60 70L75 90L55 75L50 100L45 75L25 90L40 70L10 75L35 60L0 50L35 40L10 25L40 30L25 10L45 25L50 0Z" fill="currentColor"/>
</svg>`,ring:`<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="10" fill="none"/>
</svg>`,layeredWave:`<svg viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 100L1440 50V200H0V100Z" fill="currentColor" opacity="0.3"/>
  <path d="M0 120L1440 80V200H0V120Z" fill="currentColor" opacity="0.5"/>
  <path d="M0 150L1440 120V200H0V150Z" fill="currentColor"/>
</svg>`,layeredCurve:`<svg viewBox="0 0 1440 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 80Q720 0 1440 80V200H0V80Z" fill="currentColor" opacity="0.3"/>
  <path d="M0 120Q720 40 1440 120V200H0V120Z" fill="currentColor" opacity="0.5"/>
  <path d="M0 160Q720 80 1440 160V200H0V160Z" fill="currentColor"/>
</svg>`,mesh:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0L100 50L200 0L150 100L200 200L100 150L0 200L50 100L0 0Z" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="100" cy="100" r="30" fill="currentColor" opacity="0.3"/>
</svg>`,gradient:`<svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:currentColor;stop-opacity:0"/>
      <stop offset="50%" style="stop-color:currentColor;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:currentColor;stop-opacity:0"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="120" fill="url(#grad)"/>
</svg>`,noise:`<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#noise)" opacity="0.5"/>
</svg>`,circuit:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 100H60M80 100H120M140 100H200" stroke="currentColor" stroke-width="2"/>
  <path d="M100 0V60M100 80V120M100 140V200" stroke="currentColor" stroke-width="2"/>
  <circle cx="70" cy="100" r="10" fill="currentColor"/>
  <circle cx="130" cy="100" r="10" fill="currentColor"/>
  <circle cx="100" cy="70" r="10" fill="currentColor"/>
  <circle cx="100" cy="130" r="10" fill="currentColor"/>
  <rect x="90" y="90" width="20" height="20" fill="currentColor"/>
</svg>`,dna:`<svg viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 0Q80 50 20 100Q80 150 20 200" stroke="currentColor" stroke-width="3" fill="none"/>
  <path d="M80 0Q20 50 80 100Q20 150 80 200" stroke="currentColor" stroke-width="3" fill="none"/>
  <line x1="30" y1="25" x2="70" y2="25" stroke="currentColor" stroke-width="2"/>
  <line x1="25" y1="50" x2="75" y2="50" stroke="currentColor" stroke-width="2"/>
  <line x1="30" y1="75" x2="70" y2="75" stroke="currentColor" stroke-width="2"/>
  <line x1="30" y1="125" x2="70" y2="125" stroke="currentColor" stroke-width="2"/>
  <line x1="25" y1="150" x2="75" y2="150" stroke="currentColor" stroke-width="2"/>
  <line x1="30" y1="175" x2="70" y2="175" stroke="currentColor" stroke-width="2"/>
</svg>`,infinity:`<svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 50C50 25 25 25 25 50C25 75 50 75 50 50C50 25 75 25 100 50C125 75 150 75 150 50C150 25 125 25 100 50C75 75 50 75 50 50Z" stroke="currentColor" stroke-width="8" fill="none"/>
</svg>`,spiral:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M100 100C100 90 90 80 80 80C60 80 50 100 50 120C50 150 80 170 110 170C150 170 180 140 180 100C180 50 130 20 80 20C20 20 -10 80 -10 140" stroke="currentColor" stroke-width="3" fill="none"/>
</svg>`,vortex:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="100" cy="100" r="60" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="100" cy="100" r="40" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="100" cy="100" r="20" stroke="currentColor" stroke-width="2" fill="none"/>
  <path d="M100 20L100 180M20 100L180 100M35 35L165 165M165 35L35 165" stroke="currentColor" stroke-width="1" opacity="0.5"/>
</svg>`,maskCircle:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="circleMask">
      <rect width="200" height="200" fill="white"/>
      <circle cx="100" cy="100" r="60" fill="black"/>
    </mask>
  </defs>
  <rect width="200" height="200" fill="currentColor" mask="url(#circleMask)"/>
</svg>`,maskDiamond:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="diamondMask">
      <rect width="200" height="200" fill="white"/>
      <path d="M100 30L170 100L100 170L30 100Z" fill="black"/>
    </mask>
  </defs>
  <rect width="200" height="200" fill="currentColor" mask="url(#diamondMask)"/>
</svg>`,maskStar:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="starMask">
      <rect width="200" height="200" fill="white"/>
      <path d="M100 20L115 70L170 70L125 100L140 150L100 120L60 150L75 100L30 70L85 70Z" fill="black"/>
    </mask>
  </defs>
  <rect width="200" height="200" fill="currentColor" mask="url(#starMask)"/>
</svg>`,cornerCut:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H160L200 40V200H0V0Z" fill="currentColor"/>
</svg>`,cornerRound:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 0H140Q200 0 200 60V200H0V0Z" fill="currentColor"/>
</svg>`,frameSimple:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="180" height="180" stroke="currentColor" stroke-width="4" fill="none"/>
  <rect x="20" y="20" width="160" height="160" stroke="currentColor" stroke-width="2" fill="none"/>
</svg>`,frameCorner:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 30V0H30" stroke="currentColor" stroke-width="4" fill="none"/>
  <path d="M170 0H200V30" stroke="currentColor" stroke-width="4" fill="none"/>
  <path d="M200 170V200H170" stroke="currentColor" stroke-width="4" fill="none"/>
  <path d="M30 200H0V170" stroke="currentColor" stroke-width="4" fill="none"/>
</svg>`,frameOrnate:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="180" height="180" stroke="currentColor" stroke-width="2" fill="none"/>
  <circle cx="10" cy="10" r="5" fill="currentColor"/>
  <circle cx="190" cy="10" r="5" fill="currentColor"/>
  <circle cx="10" cy="190" r="5" fill="currentColor"/>
  <circle cx="190" cy="190" r="5" fill="currentColor"/>
  <circle cx="100" cy="10" r="3" fill="currentColor"/>
  <circle cx="100" cy="190" r="3" fill="currentColor"/>
  <circle cx="10" cy="100" r="3" fill="currentColor"/>
  <circle cx="190" cy="100" r="3" fill="currentColor"/>
</svg>`,frameArt:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 0H150L200 50V150L150 200H50L0 150V50L50 0Z" stroke="currentColor" stroke-width="3" fill="none"/>
</svg>`,frameWavy:`<svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M0 20Q25 0 50 20T100 20T150 20T200 20V180Q175 200 150 180T100 180T50 180T0 180V20Z" stroke="currentColor" stroke-width="2" fill="none"/>
</svg>`},R0={waves:["wave1","wave2","wave3","waveDouble","waveSoft","waveSharp","waveAsym","waveMultiple","waveThin","waveThick"],triangles:["triangleUp","triangleDown","triangleLeft","triangleRight","angleUp","angleDown","angleAsym","zigzag","zigzagSmall","arrow"],curves:["curveUp","curveDown","curveAsym","arcUp","arcDown","semicircle","scallop","scallopInverse","bump","dip"],geometric:["slantLeft","slantRight","slantDouble","steps","stepsReverse","stepsCenter","hexagon","diamond","parallelogram","trapezoid"],blobs:["blob1","blob2","blob3","blob4","blob5","blobFlat","cloud","cloudWave","splatter","ink"],decorative:["dots","grid","cross","plus","star4","star6","star8","sparkle","burst","ring"],abstract:["layeredWave","layeredCurve","mesh","gradient","noise","circuit","dna","infinity","spiral","vortex"],masks:["maskCircle","maskDiamond","maskStar","cornerCut","cornerRound"],frames:["frameSimple","frameCorner","frameOrnate","frameArt","frameWavy"]},T0={wave1:"موجة 1",wave2:"موجة 2",wave3:"موجة 3",waveDouble:"موجة مزدوجة",waveSoft:"موجة ناعمة",waveSharp:"موجة حادة",waveAsym:"موجة غير متماثلة",waveMultiple:"موجات متعددة",waveThin:"موجة رفيعة",waveThick:"موجة سميكة",triangleUp:"مثلث للأعلى",triangleDown:"مثلث للأسفل",triangleLeft:"مثلث لليسار",triangleRight:"مثلث لليمين",angleUp:"زاوية للأعلى",angleDown:"زاوية للأسفل",angleAsym:"زاوية غير متماثلة",zigzag:"متعرج",zigzagSmall:"متعرج صغير",arrow:"سهم",curveUp:"منحنى للأعلى",curveDown:"منحنى للأسفل",curveAsym:"منحنى غير متماثل",arcUp:"قوس للأعلى",arcDown:"قوس للأسفل",semicircle:"نصف دائرة",scallop:"صدفي",scallopInverse:"صدفي معكوس",bump:"نتوء",dip:"انخفاض",slantLeft:"مائل لليسار",slantRight:"مائل لليمين",slantDouble:"مائل مزدوج",steps:"درجات",stepsReverse:"درجات معكوسة",stepsCenter:"درجات مركزية",hexagon:"سداسي",diamond:"ماسة",parallelogram:"متوازي أضلاع",trapezoid:"شبه منحرف",blob1:"بلوب 1",blob2:"بلوب 2",blob3:"بلوب 3",blob4:"بلوب 4",blob5:"بلوب 5",blobFlat:"بلوب مسطح",cloud:"سحابة",cloudWave:"سحابة متموجة",splatter:"بقعة",ink:"حبر",dots:"نقاط",grid:"شبكة",cross:"صليب",plus:"زائد",star4:"نجمة 4",star6:"نجمة 6",star8:"نجمة 8",sparkle:"تألق",burst:"انفجار",ring:"حلقة",layeredWave:"موجة متعددة الطبقات",layeredCurve:"منحنى متعدد الطبقات",mesh:"شبكة",gradient:"تدرج",noise:"تشويش",circuit:"دائرة كهربائية",dna:"حمض نووي",infinity:"لانهاية",spiral:"حلزوني",vortex:"دوامة",maskCircle:"قناع دائري",maskDiamond:"قناع ماسي",maskStar:"قناع نجمي",cornerCut:"زاوية مقطوعة",cornerRound:"زاوية مستديرة",frameSimple:"إطار بسيط",frameCorner:"إطار زوايا",frameOrnate:"إطار مزخرف",frameArt:"إطار فني",frameWavy:"إطار متموج"},$0={home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
</svg>`,menu:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 6h16M4 12h16M4 18h16"/>
</svg>`,close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 18L18 6M6 6l12 12"/>
</svg>`,search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11" cy="11" r="8"/>
  <path d="M21 21l-4.35-4.35"/>
</svg>`,user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
  <circle cx="12" cy="7" r="4"/>
</svg>`,cart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <circle cx="9" cy="21" r="1"/>
  <circle cx="20" cy="21" r="1"/>
  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
</svg>`,heart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
</svg>`,heartFilled:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
</svg>`,star:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
</svg>`,starFilled:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
</svg>`,settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
</svg>`,bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
  <path d="M13.73 21a2 2 0 01-3.46 0"/>
</svg>`,mail:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
  <polyline points="22,6 12,13 2,6"/>
</svg>`,phone:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
</svg>`,location:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
  <circle cx="12" cy="10" r="3"/>
</svg>`,calendar:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/>
  <line x1="8" y1="2" x2="8" y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
</svg>`,clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10"/>
  <polyline points="12,6 12,12 16,14"/>
</svg>`,check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <polyline points="20,6 9,17 4,12"/>
</svg>`,checkCircle:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
  <polyline points="22,4 12,14.01 9,11.01"/>
</svg>`,arrowRight:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <line x1="5" y1="12" x2="19" y2="12"/>
  <polyline points="12,5 19,12 12,19"/>
</svg>`,arrowLeft:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <line x1="19" y1="12" x2="5" y2="12"/>
  <polyline points="12,19 5,12 12,5"/>
</svg>`,arrowUp:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <line x1="12" y1="19" x2="12" y2="5"/>
  <polyline points="5,12 12,5 19,12"/>
</svg>`,arrowDown:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <line x1="12" y1="5" x2="12" y2="19"/>
  <polyline points="19,12 12,19 5,12"/>
</svg>`,chevronRight:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <polyline points="9,18 15,12 9,6"/>
</svg>`,chevronLeft:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <polyline points="15,18 9,12 15,6"/>
</svg>`,chevronUp:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <polyline points="18,15 12,9 6,15"/>
</svg>`,chevronDown:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <polyline points="6,9 12,15 18,9"/>
</svg>`,plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <line x1="12" y1="5" x2="12" y2="19"/>
  <line x1="5" y1="12" x2="19" y2="12"/>
</svg>`,minus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <line x1="5" y1="12" x2="19" y2="12"/>
</svg>`,trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <polyline points="3,6 5,6 21,6"/>
  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
</svg>`,edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>`,eye:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`,eyeOff:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
  <line x1="1" y1="1" x2="23" y2="23"/>
</svg>`,share:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <circle cx="18" cy="5" r="3"/>
  <circle cx="6" cy="12" r="3"/>
  <circle cx="18" cy="19" r="3"/>
  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
</svg>`,download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
  <polyline points="7,10 12,15 17,10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</svg>`,upload:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
  <polyline points="17,8 12,3 7,8"/>
  <line x1="12" y1="3" x2="12" y2="15"/>
</svg>`,filter:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
</svg>`,grid:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <rect x="3" y="3" width="7" height="7"/>
  <rect x="14" y="3" width="7" height="7"/>
  <rect x="14" y="14" width="7" height="7"/>
  <rect x="3" y="14" width="7" height="7"/>
</svg>`,list:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <line x1="8" y1="6" x2="21" y2="6"/>
  <line x1="8" y1="12" x2="21" y2="12"/>
  <line x1="8" y1="18" x2="21" y2="18"/>
  <line x1="3" y1="6" x2="3.01" y2="6"/>
  <line x1="3" y1="12" x2="3.01" y2="12"/>
  <line x1="3" y1="18" x2="3.01" y2="18"/>
</svg>`,bag:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
  <line x1="3" y1="6" x2="21" y2="6"/>
  <path d="M16 10a4 4 0 01-8 0"/>
</svg>`,tag:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
  <line x1="7" y1="7" x2="7.01" y2="7"/>
</svg>`,creditCard:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
  <line x1="1" y1="10" x2="23" y2="10"/>
</svg>`,truck:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="3" width="15" height="13"/>
  <polygon points="16,8 20,8 23,11 23,16 16,16"/>
  <circle cx="5.5" cy="18.5" r="2.5"/>
  <circle cx="18.5" cy="18.5" r="2.5"/>
</svg>`,package:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
  <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
  <line x1="12" y1="22.08" x2="12" y2="12"/>
</svg>`,gift:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <polyline points="20,12 20,22 4,22 4,12"/>
  <rect x="2" y="7" width="20" height="5"/>
  <line x1="12" y1="22" x2="12" y2="7"/>
  <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
  <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
</svg>`,percent:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <line x1="19" y1="5" x2="5" y2="19"/>
  <circle cx="6.5" cy="6.5" r="2.5"/>
  <circle cx="17.5" cy="17.5" r="2.5"/>
</svg>`,receipt:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/>
  <path d="M8 10h8"/>
  <path d="M8 14h4"/>
</svg>`,wallet:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2v1"/>
  <path d="M20 12h-4a2 2 0 100 4h4"/>
</svg>`,store:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
  <polyline points="9,22 9,12 15,12 15,22"/>
</svg>`,facebook:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
</svg>`,twitter:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
</svg>`,instagram:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
</svg>`,linkedin:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
</svg>`,youtube:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
</svg>`,whatsapp:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
</svg>`,tiktok:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
</svg>`,telegram:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
</svg>`,snapchat:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-.809-.314-1.214-.705-1.199-1.168 0-.36.284-.69.734-.839.15-.061.33-.09.51-.09.119 0 .254.015.404.061.39.12.719.24 1.004.301.165.044.355.074.465.074.148 0 .3-.044.404-.088-.018-.18-.032-.375-.047-.569-.234-1.628-.359-3.654.168-4.847C7.858 1.069 11.216.793 12.206.793z"/>
</svg>`,pinterest:`<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
</svg>`},O0={ui:["home","menu","close","search","user","cart","heart","heartFilled","star","starFilled","settings","bell","mail","phone","location","calendar","clock","check","checkCircle","arrowRight","arrowLeft","arrowUp","arrowDown","chevronRight","chevronLeft","chevronUp","chevronDown","plus","minus","trash","edit","eye","eyeOff","share","download","upload","filter","grid","list"],ecommerce:["bag","tag","creditCard","truck","package","gift","percent","receipt","wallet","store"],social:["facebook","twitter","instagram","linkedin","youtube","whatsapp","tiktok","telegram","snapchat","pinterest"]},U0={stripes:`<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="stripes" patternUnits="userSpaceOnUse" width="40" height="40">
      <path d="M0 40L40 0H20L0 20zM40 40V20L20 40z" fill="currentColor" opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#stripes)"/>
</svg>`,dots:`<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20">
      <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#dots)"/>
</svg>`,grid:`<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" patternUnits="userSpaceOnUse" width="40" height="40">
      <path d="M0 0H40V40" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>
</svg>`,zigzag:`<svg width="40" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="zigzag" patternUnits="userSpaceOnUse" width="40" height="20">
      <path d="M0 10L10 0L20 10L30 0L40 10" fill="none" stroke="currentColor" stroke-opacity="0.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#zigzag)"/>
</svg>`,waves:`<svg width="100" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="waves" patternUnits="userSpaceOnUse" width="100" height="20">
      <path d="M0 10Q25 0 50 10T100 10" fill="none" stroke="currentColor" stroke-opacity="0.2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#waves)"/>
</svg>`,hexagons:`<svg width="56" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="hexagons" patternUnits="userSpaceOnUse" width="56" height="100">
      <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66L28 100" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
      <path d="M28 0L28 34L0 50L0 84L28 100L56 84L56 50L28 34" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#hexagons)"/>
</svg>`,triangles:`<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="triangles" patternUnits="userSpaceOnUse" width="40" height="40">
      <path d="M0 40L20 0L40 40Z" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#triangles)"/>
</svg>`,circles:`<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="circles" patternUnits="userSpaceOnUse" width="40" height="40">
      <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#circles)"/>
</svg>`,crosses:`<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="crosses" patternUnits="userSpaceOnUse" width="20" height="20">
      <path d="M10 5V15M5 10H15" stroke="currentColor" stroke-opacity="0.1" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#crosses)"/>
</svg>`,diagonals:`<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="diagonals" patternUnits="userSpaceOnUse" width="20" height="20">
      <path d="M0 0L20 20M20 0L0 20" stroke="currentColor" stroke-opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#diagonals)"/>
</svg>`},D0={patterns:["stripes","dots","grid","zigzag","waves","hexagons","triangles","circles","crosses","diagonals"]};export{A0 as S,O0 as a,D0 as b,R0 as c,T0 as d,$0 as e,U0 as f,z0 as g};
