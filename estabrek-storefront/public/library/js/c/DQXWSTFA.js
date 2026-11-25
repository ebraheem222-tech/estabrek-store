import{Hh as z,a as L,b as D,c as k}from"./QLRGKSQP.js";var l=L(D(),1),r=L(k(),1),S=L(z(),1),q=`
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
`,W=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
`;function X({frag:v,className:g="absolute inset-0 size-full",fallback:E="bg-linear-to-br from-indigo-950 via-fuchsia-950 to-black",scale:a=.75}){let n=(0,l.useLx)(),u=(0,r.useRef)(null),[x,b]=(0,r.useState)(!0);return(0,r.useEffect)(()=>{let o=u.current;if(!o)return;let f=o.parentElement,m=.5,p=.5,R=.5,h=.5,w=t=>{let e=o.getBoundingClientRect();R=(t.clientX-e.left)/e.width,h=1-(t.clientY-e.top)/e.height};f.addEventListener("pointermove",w);let s=performance.now(),M=()=>{let t=document.createElement("canvas");t.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block",o.appendChild(t);let e=t.getContext("webgl",{antialias:!1,alpha:!1,powerPreference:"high-performance"}),I=()=>(t.remove(),b(!1),null);if(!e)return I();let y=(d,U)=>{let A=e.createShader(d);return e.shaderSource(A,(0,l.glsl)(e,n,U)),e.compileShader(A),e.getShaderParameter(A,e.COMPILE_STATUS)||console.warn(e.getShaderInfoLog(A)),A},i=e.createProgram();if(e.attachShader(i,y(e.VERTEX_SHADER,"attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }")),e.attachShader(i,y(e.FRAGMENT_SHADER,W+v)),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))return I();e.useProgram(i),e.bindBuffer(e.ARRAY_BUFFER,e.createBuffer()),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);let P=e.getAttribLocation(i,"p");e.enableVertexAttribArray(P),e.vertexAttribPointer(P,2,e.FLOAT,!1,0,0);let B=e.getUniformLocation(i,"u_time"),H=e.getUniformLocation(i,"u_res"),G=e.getUniformLocation(i,"u_mouse"),C=()=>{let d=Math.min(1.5,window.devicePixelRatio||1)*a;t.width=Math.max(1,Math.round(t.clientWidth*d)),t.height=Math.max(1,Math.round(t.clientHeight*d)),e.viewport(0,0,t.width,t.height)};C();let N=new ResizeObserver(C);N.observe(t);let _,O=()=>{m+=(R-m)*.06,p+=(h-p)*.06,e.uniform1f(B,(performance.now()-s)/1e3),e.uniform2f(H,t.width,t.height),e.uniform2f(G,m,p),e.drawArrays(e.TRIANGLES,0,6),_=requestAnimationFrame(O)},$=d=>{d.preventDefault(),cancelAnimationFrame(_)};return t.addEventListener("webglcontextlost",$),O(),()=>{cancelAnimationFrame(_),N.disconnect(),t.removeEventListener("webglcontextlost",$),e.getExtension("WEBGL_lose_context")?.loseContext(),t.remove()}},c=null,T=o.getBoundingClientRect();T.bottom>-200&&T.top<window.innerHeight+200&&(c=M());let F=new IntersectionObserver(([t])=>{t.isIntersecting&&!c?c=M():!t.isIntersecting&&c&&(c(),c=null)},{rootMargin:"200px"});return F.observe(o),()=>{F.disconnect(),f.removeEventListener("pointermove",w),c?.(),c=null}},[v,a]),x?(0,S.jsx)("div",{ref:u,className:g}):(0,S.jsx)("div",{className:`${(0,l.spell)(n,g,"tpl")} ${(0,l.spell)(n,E,"tpl")}`})}function V(v){let g=(0,r.useRef)(null),E=(0,r.useRef)(v);E.current=v;let a=(0,r.useRef)({});return(0,r.useEffect)(()=>{let n=g.current,u=n?.getContext("2d");if(!u)return;let x=0,b=0,o,f=!0,m=()=>{let s=Math.min(2,window.devicePixelRatio||1);x=n.clientWidth,b=n.clientHeight,n.width=Math.max(1,Math.round(x*s)),n.height=Math.max(1,Math.round(b*s)),u.setTransform(s,0,0,s,0,0),a.current.resized=!0};m();let p=new ResizeObserver(m);p.observe(n);let R=performance.now(),h=()=>{cancelAnimationFrame(o),f&&(E.current(u,(performance.now()-R)/1e3,x,b,a.current),a.current.resized=!1,o=requestAnimationFrame(h))},w=new IntersectionObserver(([s])=>{f=s.isIntersecting,f&&h()},{rootMargin:"120px"});return w.observe(n),h(),()=>{cancelAnimationFrame(o),w.disconnect(),p.disconnect()}},[]),[g,a]}export{q as a,X as b,V as c};
