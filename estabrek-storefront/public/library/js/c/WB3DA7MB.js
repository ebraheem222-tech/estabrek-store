import{Hh as N,a as S,c as U}from"./ODXAQTWC.js";var n=S(U(),1),R=S(N(),1),k=`
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
`,D=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
`;function W({frag:d,className:p="absolute inset-0 size-full",fallback:w="bg-linear-to-br from-indigo-950 via-fuchsia-950 to-black",scale:a=.75}){let r=(0,n.useRef)(null),[v,g]=(0,n.useState)(!0);return(0,n.useEffect)(()=>{let o=r.current;if(!o)return;let u=o.parentElement,l=.5,f=.5,x=.5,A=.5,m=t=>{let e=o.getBoundingClientRect();x=(t.clientX-e.left)/e.width,A=1-(t.clientY-e.top)/e.height};u.addEventListener("pointermove",m);let E=performance.now(),i=()=>{let t=document.createElement("canvas");t.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block",o.appendChild(t);let e=t.getContext("webgl",{antialias:!1,alpha:!1,powerPreference:"high-performance"}),T=()=>(t.remove(),g(!1),null);if(!e)return T();let F=(h,G)=>{let b=e.createShader(h);return e.shaderSource(b,G),e.compileShader(b),e.getShaderParameter(b,e.COMPILE_STATUS)||console.warn(e.getShaderInfoLog(b)),b},s=e.createProgram();if(e.attachShader(s,F(e.VERTEX_SHADER,"attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }")),e.attachShader(s,F(e.FRAGMENT_SHADER,D+d)),e.linkProgram(s),!e.getProgramParameter(s,e.LINK_STATUS))return T();e.useProgram(s),e.bindBuffer(e.ARRAY_BUFFER,e.createBuffer()),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);let I=e.getAttribLocation(s,"p");e.enableVertexAttribArray(I),e.vertexAttribPointer(I,2,e.FLOAT,!1,0,0);let z=e.getUniformLocation(s,"u_time"),B=e.getUniformLocation(s,"u_res"),H=e.getUniformLocation(s,"u_mouse"),y=()=>{let h=Math.min(1.5,window.devicePixelRatio||1)*a;t.width=Math.max(1,Math.round(t.clientWidth*h)),t.height=Math.max(1,Math.round(t.clientHeight*h)),e.viewport(0,0,t.width,t.height)};y();let P=new ResizeObserver(y);P.observe(t);let L,C=()=>{l+=(x-l)*.06,f+=(A-f)*.06,e.uniform1f(z,(performance.now()-E)/1e3),e.uniform2f(B,t.width,t.height),e.uniform2f(H,l,f),e.drawArrays(e.TRIANGLES,0,6),L=requestAnimationFrame(C)},O=h=>{h.preventDefault(),cancelAnimationFrame(L)};return t.addEventListener("webglcontextlost",O),C(),()=>{cancelAnimationFrame(L),P.disconnect(),t.removeEventListener("webglcontextlost",O),e.getExtension("WEBGL_lose_context")?.loseContext(),t.remove()}},c=null,_=o.getBoundingClientRect();_.bottom>-200&&_.top<window.innerHeight+200&&(c=i());let M=new IntersectionObserver(([t])=>{t.isIntersecting&&!c?c=i():!t.isIntersecting&&c&&(c(),c=null)},{rootMargin:"200px"});return M.observe(o),()=>{M.disconnect(),u.removeEventListener("pointermove",m),c?.(),c=null}},[d,a]),v?(0,R.jsx)("div",{ref:r,className:p}):(0,R.jsx)("div",{className:`${p} ${w}`})}function Y(d){let p=(0,n.useRef)(null),w=(0,n.useRef)(d);w.current=d;let a=(0,n.useRef)({});return(0,n.useEffect)(()=>{let r=p.current,v=r?.getContext("2d");if(!v)return;let g=0,o=0,u,l=!0,f=()=>{let i=Math.min(2,window.devicePixelRatio||1);g=r.clientWidth,o=r.clientHeight,r.width=Math.max(1,Math.round(g*i)),r.height=Math.max(1,Math.round(o*i)),v.setTransform(i,0,0,i,0,0),a.current.resized=!0};f();let x=new ResizeObserver(f);x.observe(r);let A=performance.now(),m=()=>{cancelAnimationFrame(u),l&&(w.current(v,(performance.now()-A)/1e3,g,o,a.current),a.current.resized=!1,u=requestAnimationFrame(m))},E=new IntersectionObserver(([i])=>{l=i.isIntersecting,l&&m()},{rootMargin:"120px"});return E.observe(r),m(),()=>{cancelAnimationFrame(u),E.disconnect(),x.disconnect()}},[]),[p,a]}export{k as a,W as b,Y as c};
