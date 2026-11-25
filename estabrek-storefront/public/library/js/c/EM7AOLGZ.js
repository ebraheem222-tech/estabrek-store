import{Hh as B,a as L,b as D,c as k}from"./QLRGKSQP.js";var A=L(D(),1),n=L(k(),1),S=L(B(),1),Y=`
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
`;function q({frag:d,className:v="absolute inset-0 size-full",fallback:E="bg-linear-to-br from-indigo-950 via-fuchsia-950 to-black",scale:a=.75}){let r=(0,A.useLx)(),l=(0,n.useRef)(null),[g,x]=(0,n.useState)(!0);return(0,n.useEffect)(()=>{let o=l.current;if(!o)return;let u=o.parentElement,f=.5,m=.5,R=.5,p=.5,b=t=>{let e=o.getBoundingClientRect();R=(t.clientX-e.left)/e.width,p=1-(t.clientY-e.top)/e.height};u.addEventListener("pointermove",b);let s=performance.now(),M=()=>{let t=document.createElement("canvas");t.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block",o.appendChild(t);let e=t.getContext("webgl",{antialias:!1,alpha:!1,powerPreference:"high-performance"}),I=()=>(t.remove(),x(!1),null);if(!e)return I();let y=(h,U)=>{let w=e.createShader(h);return e.shaderSource(w,U),e.compileShader(w),e.getShaderParameter(w,e.COMPILE_STATUS)||console.warn(e.getShaderInfoLog(w)),w},i=e.createProgram();if(e.attachShader(i,y(e.VERTEX_SHADER,"attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }")),e.attachShader(i,y(e.FRAGMENT_SHADER,W+d)),e.linkProgram(i),!e.getProgramParameter(i,e.LINK_STATUS))return I();e.useProgram(i),e.bindBuffer(e.ARRAY_BUFFER,e.createBuffer()),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);let P=e.getAttribLocation(i,"p");e.enableVertexAttribArray(P),e.vertexAttribPointer(P,2,e.FLOAT,!1,0,0);let H=e.getUniformLocation(i,"u_time"),$=e.getUniformLocation(i,"u_res"),G=e.getUniformLocation(i,"u_mouse"),C=()=>{let h=Math.min(1.5,window.devicePixelRatio||1)*a;t.width=Math.max(1,Math.round(t.clientWidth*h)),t.height=Math.max(1,Math.round(t.clientHeight*h)),e.viewport(0,0,t.width,t.height)};C();let O=new ResizeObserver(C);O.observe(t);let _,N=()=>{f+=(R-f)*.06,m+=(p-m)*.06,e.uniform1f(H,(performance.now()-s)/1e3),e.uniform2f($,t.width,t.height),e.uniform2f(G,f,m),e.drawArrays(e.TRIANGLES,0,6),_=requestAnimationFrame(N)},z=h=>{h.preventDefault(),cancelAnimationFrame(_)};return t.addEventListener("webglcontextlost",z),N(),()=>{cancelAnimationFrame(_),O.disconnect(),t.removeEventListener("webglcontextlost",z),e.getExtension("WEBGL_lose_context")?.loseContext(),t.remove()}},c=null,T=o.getBoundingClientRect();T.bottom>-200&&T.top<window.innerHeight+200&&(c=M());let F=new IntersectionObserver(([t])=>{t.isIntersecting&&!c?c=M():!t.isIntersecting&&c&&(c(),c=null)},{rootMargin:"200px"});return F.observe(o),()=>{F.disconnect(),u.removeEventListener("pointermove",b),c?.(),c=null}},[d,a]),g?(0,S.jsx)("div",{ref:l,className:v}):(0,S.jsx)("div",{className:`${(0,A.spell)(r,v,"tpl")} ${(0,A.spell)(r,E,"tpl")}`})}function X(d){let v=(0,n.useRef)(null),E=(0,n.useRef)(d);E.current=d;let a=(0,n.useRef)({});return(0,n.useEffect)(()=>{let r=v.current,l=r?.getContext("2d");if(!l)return;let g=0,x=0,o,u=!0,f=()=>{let s=Math.min(2,window.devicePixelRatio||1);g=r.clientWidth,x=r.clientHeight,r.width=Math.max(1,Math.round(g*s)),r.height=Math.max(1,Math.round(x*s)),l.setTransform(s,0,0,s,0,0),a.current.resized=!0};f();let m=new ResizeObserver(f);m.observe(r);let R=performance.now(),p=()=>{cancelAnimationFrame(o),u&&(E.current(l,(performance.now()-R)/1e3,g,x,a.current),a.current.resized=!1,o=requestAnimationFrame(p))},b=new IntersectionObserver(([s])=>{u=s.isIntersecting,u&&p()},{rootMargin:"120px"});return b.observe(r),p(),()=>{cancelAnimationFrame(o),b.disconnect(),m.disconnect()}},[]),[v,a]}export{Y as a,q as b,X as c};
