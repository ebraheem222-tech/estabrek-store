/**
 * A picture's live effect (shared/pictureFx.ts), drawn with WebGL on a canvas laid over the picture in its frame.
 * Loaded only by pages that have one (TreeMedia), and nothing here runs for whoever asked for less motion.
 *
 * The canvas is made the first time it is needed (the pointer comes on the picture, or the picture scrolls into
 * view for a reveal) and given back a few seconds after the picture goes still: at rest the page shows the picture
 * itself. A picture whose pixels can't be read (another site that doesn't allow it), a browser without WebGL, or
 * more pictures at once than a browser has room for (PICTURE_FX_LIVE): the picture just stays as it is.
 */
import { PICTURE_FX, PICTURE_FX_LIVE, PICTURE_FX_STRENGTH, canvasSize, pictureFxOnPointer, type PictureFx } from "../../../shared/pictureFx";

type Stop = () => void;

const VERTEX = "attribute vec2 a;varying vec2 p;void main(){p=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}";
// p: the box, 0–1 across and down. uvOf: object-fit and object-position (shared/pictureFx.ts fitUv, the same sum).
// (The finest numbers a card has. The clouds' hash is made of small products only: with a sine of a big number a
// corner shared by two cells came out differently from each, and the reveal showed straight lines.)
const FRAGMENT = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 p;
uniform sampler2D tex;
uniform vec2 box,pic,focus,at;
uniform float cover,kind,amount,power,time,shown;
vec2 uvOf(vec2 q){
  float rb=box.x/box.y,ri=pic.x/pic.y;
  if(cover>.5){vec2 s=vec2(min(1.,rb/ri),min(1.,ri/rb));return (vec2(1.)-s)*focus+q*s;}
  vec2 s=vec2(min(1.,ri/rb),min(1.,rb/ri));return (q-(vec2(1.)-s)*focus)/s;
}
vec4 pick(vec2 q){vec2 uv=uvOf(q);float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);return texture2D(tex,clamp(uv,0.,1.))*inside;}
vec4 edge(vec2 q){return texture2D(tex,clamp(uvOf(q),0.,1.));}
float hash(vec2 q){vec3 v=fract(vec3(q.xyx)*.1031);v+=dot(v,v.yzx+33.33);return fract((v.x+v.y)*v.z);}
float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
void main(){
  float aspect=box.x/box.y;
  vec2 away=(p-at)*vec2(aspect,1.);
  float far=length(away);
  if(kind<.5){
    // Rings going out from the pointer, fading with distance; their crests catch a little light.
    float ring=sin(42.*far-time*7.)*exp(-4.*far)*amount*power;
    vec2 dir=far>.0001?normalize(p-at):vec2(0.);
    vec4 c=pick(p+dir*ring*.06);
    gl_FragColor=vec4(c.rgb+c.a*ring*.09,c.a);
  }else if(kind<1.5){
    float k=amount*power*.03;
    vec2 flow=vec2(sin(p.y*11.+time*1.7)+.5*sin(p.y*23.-time*1.1),cos(p.x*13.+time*1.3)+.5*cos(p.x*19.+time*.7));
    gl_FragColor=pick(p+flow*k);
  }else if(kind<2.5){
    // Red and blue slide apart, more the further from the pointer; past the picture's edge they keep its last colour.
    vec2 off=(p-at)*amount*power*.035;
    vec4 g=pick(p);
    gl_FragColor=vec4(edge(p+off).r*g.a,g.g,edge(p-off).b*g.a,g.a);
  }else{
    // Soft clouds decide which parts come first, a little from the bottom up; the picture settles as it comes.
    vec2 q=p*vec2(aspect,1.);
    float cloud=.55*noise(q*3.)+.3*noise(q*7.+11.)+.15*noise(q*17.+5.);
    float order=mix(cloud,1.-p.y,.3);
    float seen=smoothstep(order-.24,order+.24,shown*1.5-.25);
    vec2 drift=(vec2(noise(q*2.5+3.),noise(q*2.5+9.))-.5)*(1.-shown)*power*.07;
    gl_FragColor=pick(p+drift)*seen;
  }
}`;

/** The pictures drawing now (each holds a WebGL canvas). */
const drawing = new Set<object>();
const HOLD_MS = 4000;
const REVEAL_S = 1.4;
const TEXTURE_MOST = 2048;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("no shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "shader");
  return shader;
}

/** Starts a picture's effect in its frame; `stops` gets what puts everything back. */
export function runPictureFx(host: HTMLElement, spec: PictureFx, stops: Stop[]) {
  const img = host.querySelector<HTMLImageElement>("img.pt-frame-media") ?? host.querySelector<HTMLImageElement>("img");
  if (!img) return;
  const kind = PICTURE_FX.indexOf(spec.kind);
  const power = spec.strength ?? PICTURE_FX_STRENGTH.normal;
  const onPointer = pictureFxOnPointer(spec.kind);
  const me = {};
  let canvas: HTMLCanvasElement | null = null;
  let gl: WebGLRenderingContext | null = null;
  let where: Record<string, WebGLUniformLocation | null> = {};
  let pic = { w: 1, h: 1 };
  let frame = 0, last = 0, hold = 0;
  let amount = 0, want = 0, shown = 1;
  let at = { x: 0.5, y: 0.5 };
  let sweep: number | null = null;
  // A point of the picture (fractions of its box) whose colour is asked for: read from the next drawing.
  let probe: { x: number; y: number } | null = null;
  let opening: Promise<boolean> | null = null;
  let cannot = false, gone = false;

  const say = (state: string) => host.setAttribute("data-pt-glfx-state", state);
  const size = () => {
    if (!canvas || !gl) return;
    const s = canvasSize({ w: host.clientWidth, h: host.clientHeight }, window.devicePixelRatio);
    if (canvas.width !== s.w || canvas.height !== s.h) { canvas.width = s.w; canvas.height = s.h; }
    gl.viewport(0, 0, s.w, s.h);
  };
  const close = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    window.clearTimeout(hold);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    canvas?.remove();
    canvas = null;
    gl = null;
    drawing.delete(me);
    host.removeAttribute("data-pt-glfx-wait");
  };

  /** The canvas, its program and the picture as a texture; false when it can't be had (now, or ever). */
  const open = (): Promise<boolean> => {
    if (gl) return Promise.resolve(true);
    if (cannot || gone) return Promise.resolve(false);
    if (opening) return opening;
    if (drawing.size >= PICTURE_FX_LIVE) return Promise.resolve(false);
    drawing.add(me);
    opening = (async () => {
      try {
        const source = new Image();
        source.crossOrigin = "anonymous";
        source.src = img.currentSrc || img.src;
        await source.decode();
        if (gone) throw new Error("gone");
        const nw = source.naturalWidth || img.clientWidth, nh = source.naturalHeight || img.clientHeight;
        if (!nw || !nh || !host.clientWidth || !host.clientHeight) throw new Error("no size");
        const made = document.createElement("canvas");
        made.className = "pt-glfx";
        made.setAttribute("aria-hidden", "true");
        const context = made.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
        if (!context) throw new Error("no webgl");
        const program = context.createProgram();
        if (!program) throw new Error("no program");
        context.attachShader(program, compile(context, context.VERTEX_SHADER, VERTEX));
        context.attachShader(program, compile(context, context.FRAGMENT_SHADER, FRAGMENT));
        context.linkProgram(program);
        if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error("link");
        context.useProgram(program);
        const quad = context.createBuffer();
        context.bindBuffer(context.ARRAY_BUFFER, quad);
        context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), context.STATIC_DRAW);
        const a = context.getAttribLocation(program, "a");
        context.enableVertexAttribArray(a);
        context.vertexAttribPointer(a, 2, context.FLOAT, false, 0, 0);
        // The picture as a texture, no bigger than a graphics card is sure to take.
        let texel: TexImageSource = source;
        const k = Math.min(1, TEXTURE_MOST / Math.max(nw, nh));
        if (k < 1 || !source.naturalWidth) {
          const small = document.createElement("canvas");
          small.width = Math.max(1, Math.round(nw * k));
          small.height = Math.max(1, Math.round(nh * k));
          small.getContext("2d")?.drawImage(source, 0, 0, small.width, small.height);
          texel = small;
        }
        const texture = context.createTexture();
        context.bindTexture(context.TEXTURE_2D, texture);
        context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
        for (const [name, value] of [[context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE], [context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE], [context.TEXTURE_MIN_FILTER, context.LINEAR], [context.TEXTURE_MAG_FILTER, context.LINEAR]]) context.texParameteri(context.TEXTURE_2D, name, value);
        // A picture from a place that doesn't let its pixels be read throws here.
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, texel);
        context.enable(context.BLEND);
        context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA);
        where = Object.fromEntries(["tex", "box", "pic", "focus", "at", "cover", "kind", "amount", "power", "time", "shown"].map((n) => [n, context.getUniformLocation(program, n)]));
        pic = { w: nw, h: nh };
        canvas = made;
        gl = context;
        host.appendChild(made);
        size();
        say("ready");
        return true;
      } catch {
        cannot = true;
        close();
        say("plain");
        return false;
      } finally {
        opening = null;
      }
    })();
    return opening;
  };

  const rest = () => {
    canvas?.removeAttribute("data-on");
    host.removeAttribute("data-pt-glfx-wait");
    say("rest");
    window.clearTimeout(hold);
    // Given back once the picture has been still a while (at once after a reveal: it plays one time).
    hold = window.setTimeout(close, onPointer ? HOLD_MS : 400);
  };
  const draw = (now: number) => {
    frame = 0;
    if (!gl || !canvas) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (sweep !== null) {
      // The editor's "try": the pointer crosses the picture by itself.
      sweep = Math.min(1, sweep + dt / 1.8);
      at = { x: 0.12 + 0.76 * sweep, y: 0.5 + 0.18 * Math.sin(sweep * Math.PI * 2) };
      want = sweep < 1 ? 1 : 0;
      if (sweep >= 1) sweep = null;
    }
    if (onPointer) amount += (want - amount) * (1 - Math.exp(-dt * 7));
    else shown = Math.min(1, shown + dt / REVEAL_S);
    const cs = getComputedStyle(img);
    const spot = cs.objectPosition.split(/\s+/).map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : 0.5));
    gl.uniform1i(where.tex, 0);
    gl.uniform2f(where.box, host.clientWidth || 1, host.clientHeight || 1);
    gl.uniform2f(where.pic, pic.w, pic.h);
    gl.uniform2f(where.focus, Number.isFinite(spot[0]) ? spot[0] : 0.5, Number.isFinite(spot[1]) ? spot[1] : 0.5);
    gl.uniform2f(where.at, at.x, at.y);
    gl.uniform1f(where.cover, cs.objectFit === "contain" ? 0 : 1);
    gl.uniform1f(where.kind, kind);
    gl.uniform1f(where.amount, amount);
    gl.uniform1f(where.power, power);
    gl.uniform1f(where.time, now / 1000);
    gl.uniform1f(where.shown, shown);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (probe) {
      // What was just drawn at that point (for tests and for telling a blank canvas from a drawn one).
      const px = new Uint8Array(4);
      gl.readPixels(Math.min(canvas.width - 1, Math.max(0, Math.floor(probe.x * canvas.width))), Math.min(canvas.height - 1, Math.max(0, Math.floor((1 - probe.y) * canvas.height))), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      host.setAttribute("data-pt-glfx-probe", Array.from(px).join(","));
      probe = null;
    }
    const busy = onPointer ? want > 0 || amount > 0.004 : shown < 1;
    if (busy) frame = requestAnimationFrame(draw);
    else rest();
  };
  const go = (before?: () => void) => {
    void open().then((ok) => {
      if (!ok || !canvas || gone) return void host.removeAttribute("data-pt-glfx-wait");
      before?.();
      window.clearTimeout(hold);
      canvas.setAttribute("data-on", "");
      say("on");
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(draw); }
    });
  };

  const point = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) at = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const on = (e: PointerEvent) => { point(e); sweep = null; want = 1; go(); };
  const off = () => { want = 0; };
  /** The editor's "try" (StudioBridge): the effect plays by itself once. */
  const play = () => {
    if (onPointer) go(() => { sweep = 0; want = 1; });
    else go(() => { shown = 0; host.setAttribute("data-pt-glfx-wait", ""); });
  };
  const ask = (e: Event) => {
    const d = (e as CustomEvent<{ x?: number; y?: number } | undefined>).detail;
    probe = { x: typeof d?.x === "number" ? d.x : 0.5, y: typeof d?.y === "number" ? d.y : 0.5 };
  };
  host.addEventListener("pt:glfx-probe", ask);
  const sized = typeof ResizeObserver === "function" ? new ResizeObserver(size) : null;
  sized?.observe(host);
  host.addEventListener("pt:glfx-play", play);
  let sight: IntersectionObserver | null = null;
  if (onPointer) {
    host.addEventListener("pointerenter", on);
    host.addEventListener("pointermove", on);
    host.addEventListener("pointerdown", on);
    host.addEventListener("pointerleave", off);
    host.addEventListener("pointercancel", off);
  } else {
    // A reveal is for a picture that scrolls into view: one that is on the screen as the page opens stays as it is
    // (hiding it to bring it back would only blink). The picture waits unseen until its moment.
    const r = host.getBoundingClientRect();
    const seenNow = r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    if (!seenNow && typeof IntersectionObserver === "function") {
      host.setAttribute("data-pt-glfx-wait", "");
      sight = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        sight?.disconnect();
        sight = null;
        go(() => { shown = 0; });
      }, { threshold: 0.2 });
      sight.observe(host);
    }
  }
  say("rest");
  stops.push(() => {
    gone = true;
    sized?.disconnect();
    sight?.disconnect();
    host.removeEventListener("pt:glfx-play", play);
    host.removeEventListener("pt:glfx-probe", ask);
    host.removeAttribute("data-pt-glfx-probe");
    host.removeEventListener("pointerenter", on);
    host.removeEventListener("pointermove", on);
    host.removeEventListener("pointerdown", on);
    host.removeEventListener("pointerleave", off);
    host.removeEventListener("pointercancel", off);
    close();
    host.removeAttribute("data-pt-glfx-state");
  });
}
