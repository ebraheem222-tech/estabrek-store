/**
 * «صورة 3D» (shared/photo3d.ts): a picture lifted by its depth picture, drawn with WebGL on a canvas over the picture
 * in its frame, as a lit mesh (its near things come apart from what is behind them; behind the holes, the picture
 * itself, flat and further back) or a cloud of points. It turns a little with the pointer (and a phone's tilt), with
 * the page's scroll or by itself; a light follows the pointer. Loaded only by pages that have one (TreeMedia), and
 * nothing here runs for whoever asked for less motion: the picture stays as it is (as it does without WebGL, for a
 * picture or a depth picture whose pixels can't be read, or past PHOTO3D_LIVE at once).
 *
 * Product pictures use it too (lib/usePhoto3d.ts): a card's only while the pointer is on it (`hover`: made as the
 * pointer comes, put away once it has left and turned back), and a picture without its depth picture yet gets a
 * quick one from its own light (`map: null`).
 */
import { PHOTO3D_LIVE, depthGrid, lightDepth, photoMesh, type DepthGrid, type Mesh, type Photo3d } from "../../../shared/photo3d";
import { canvasSize, fitUv } from "../../../shared/pictureFx";

type Stop = () => void;
/** What to draw: a picture's settings, its depth picture's address or null for a quick depth from its light. */
export type Photo3dRun = Omit<Photo3d, "map"> & { map: string | null };
export type Photo3dOptions = {
  /** Made while the pointer (a mouse) is on it, put away after it left; else made as it comes near the screen. */
  hover?: boolean;
  /** The picture to lift (else the host's first picture). */
  img?: HTMLImageElement | null;
  /** How many columns the mesh has (fewer for a small card). */
  cols?: number;
};
/** What a test can read of a 3D picture that runs (host.__photo3d). */
export type Photo3dProbe = { triangles: number; cut: number; yaw: number; pitch: number; frames: number; look: string; depth: "map" | "light" };

// The camera stands D away; a point at z = 0 lands where the flat picture is. Near points (z > 0) grow, far ones shrink.
const VIEW = `uniform float u_yaw, u_pitch, u_scale, u_aspect;
const float D = 4.0;
vec3 turned(vec3 p){
  float cy = cos(u_yaw), sy = sin(u_yaw), cp = cos(u_pitch), sp = sin(u_pitch);
  vec3 a = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  return vec3(a.x, a.y * cp - a.z * sp, a.y * sp + a.z * cp) * u_scale;
}
vec4 placed(vec3 q){
  float z = D - q.z;
  return vec4(q.x * D / u_aspect, q.y * D, (z - D) * 0.5 * z, z);
}`;
const MESH_VS = `attribute vec3 a_p; attribute vec2 a_uv; attribute vec3 a_n;
${VIEW}
uniform float u_point;
varying vec2 v_uv; varying vec3 v_n;
void main(){
  vec3 q = turned(a_p);
  gl_Position = placed(q);
  gl_PointSize = u_point * D / max(0.5, D - q.z);
  v_uv = a_uv;
  v_n = turned(a_n) / u_scale;
}`;
const MESH_FS = `precision mediump float;
varying vec2 v_uv; varying vec3 v_n;
uniform sampler2D u_tex, u_depth; uniform vec2 u_light, u_texel; uniform float u_shade, u_dim, u_dot, u_edge;
void main(){
  if (u_dot > 0.5 && length(gl_PointCoord - 0.5) > 0.5) discard;
  vec4 c = texture2D(u_tex, v_uv);
  vec3 l = normalize(vec3(u_light, 0.9));
  float lit = mix(1.0, 0.55 + 0.75 * max(dot(normalize(v_n), l), 0.0), u_shade);
  // Where a near thing meets what is far behind it (the depth picture jumps right here), the surface fades and the
  // flat picture behind shows: read per pixel, so the outline follows the picture's own edge, not the grid.
  float jx = abs(texture2D(u_depth, v_uv + vec2(u_texel.x, 0.0)).r - texture2D(u_depth, v_uv - vec2(u_texel.x, 0.0)).r);
  float jy = abs(texture2D(u_depth, v_uv + vec2(0.0, u_texel.y)).r - texture2D(u_depth, v_uv - vec2(0.0, u_texel.y)).r);
  float keep = 1.0 - smoothstep(u_edge * 0.5, u_edge, max(jx, jy));
  if (keep < 0.01) discard;
  gl_FragColor = vec4(c.rgb * lit * u_dim, c.a) * keep;
}`;

const running = new Set<object>();

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) throw new Error("no shader");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}
const loaded = (src: string) => new Promise<HTMLImageElement>((ok, no) => {
  const i = new Image();
  i.crossOrigin = "anonymous";
  i.decoding = "async";
  i.onload = () => ok(i);
  i.onerror = () => no(new Error("load"));
  i.src = src;
});

/** The depth as a small picture: the depth picture's pixels, or the picture's own light (lightDepth). */
function depthOf(source: HTMLImageElement, quick: boolean) {
  // Small: the depth is shapes, not detail.
  const k = Math.min(1, 256 / Math.max(source.naturalWidth, source.naturalHeight));
  const dw = Math.max(2, Math.round(source.naturalWidth * k)), dh = Math.max(2, Math.round(source.naturalHeight * k));
  const small = document.createElement("canvas");
  small.width = dw;
  small.height = dh;
  const g2 = small.getContext("2d", { willReadFrequently: true });
  if (!g2) throw new Error("2d");
  g2.drawImage(source, 0, 0, dw, dh);
  let px = g2.getImageData(0, 0, dw, dh).data;
  if (quick) {
    px = lightDepth(px, dw, dh) as typeof px;
    g2.putImageData(new ImageData(new Uint8ClampedArray(px), dw, dh), 0, 0);
  }
  return { small, dw, dh, grid: depthGrid(px, dw, dh) };
}

/** Starts a picture's 3D in its frame; `stops` gets what puts everything back. */
export function runPhoto3d(host: HTMLElement, spec: Photo3dRun, stops: Stop[], o: Photo3dOptions = {}) {
  const img = o.img ?? host.querySelector<HTMLImageElement>("img.pt-frame-media") ?? host.querySelector<HTMLImageElement>("img");
  if (!img) return;
  const me = {};
  let gone = false, frame = 0, frames = 0, opening = false, hovered = false, resting = 0, last = 0;
  // The picture and its depth, read once (a card's comes back on its next hover).
  let got: { pic: HTMLImageElement; small: HTMLCanvasElement; dw: number; dh: number; grid: DepthGrid } | null = null;
  let sized: ResizeObserver | null = null;
  let canvas: HTMLCanvasElement | null = null, gl: WebGLRenderingContext | null = null;
  let draw: (() => void) | null = null;
  let mesh: Mesh | null = null;
  // Where it is turned now, where it is going, and the light.
  const at = { yaw: 0, pitch: 0, lx: -0.4, ly: 0.5 }, to = { yaw: 0, pitch: 0, lx: -0.4, ly: 0.5 };
  let tilt0: { b: number; g: number } | null = null;
  let seen = false;
  const born = performance.now();
  const say = (s: string) => host.setAttribute("data-pt-3d-state", s);
  (host as HTMLElement & { __photo3d?: () => Photo3dProbe }).__photo3d = () => ({ triangles: mesh ? mesh.index.length / 3 : 0, cut: mesh?.cut ?? 0, yaw: at.yaw, pitch: at.pitch, frames, look: spec.look, depth: spec.map ? "map" : "light" });

  const close = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    window.clearTimeout(resting);
    sized?.disconnect();
    sized = null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    canvas?.remove();
    canvas = null;
    gl = null;
    draw = null;
    running.delete(me);
  };

  const open = async () => {
    if (opening || canvas) return;
    if (running.size >= PHOTO3D_LIVE) return say(o.hover ? "rest" : "plain");
    running.add(me);
    opening = true;
    try {
      if (!got) {
        const [pic, map] = await Promise.all([loaded(img.currentSrc || img.src), spec.map ? loaded(spec.map) : Promise.resolve(null)]);
        got = { pic, ...depthOf(map ?? pic, !map) };
      }
      if (gone) return;
      const { pic, small, dw, dh, grid } = got;
      const made = document.createElement("canvas");
      made.className = "pt-3d";
      made.setAttribute("aria-hidden", "true");
      const c = made.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, powerPreference: "low-power" });
      if (!c) throw new Error("webgl");
      const prog = c.createProgram()!;
      c.attachShader(prog, compile(c, c.VERTEX_SHADER, MESH_VS));
      c.attachShader(prog, compile(c, c.FRAGMENT_SHADER, MESH_FS));
      c.linkProgram(prog);
      if (!c.getProgramParameter(prog, c.LINK_STATUS)) throw new Error("link");
      c.useProgram(prog);
      // The picture as a texture (a picture from a place that doesn't let it be read throws here).
      const tex = c.createTexture();
      c.bindTexture(c.TEXTURE_2D, tex);
      c.pixelStorei(c.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
      for (const [p, v] of [[c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE], [c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE], [c.TEXTURE_MIN_FILTER, c.LINEAR], [c.TEXTURE_MAG_FILTER, c.LINEAR]]) c.texParameteri(c.TEXTURE_2D, p, v);
      const most = 2048, kk = Math.min(1, most / Math.max(pic.naturalWidth, pic.naturalHeight));
      let texel: TexImageSource = pic;
      if (kk < 1) {
        const t = document.createElement("canvas");
        t.width = Math.round(pic.naturalWidth * kk);
        t.height = Math.round(pic.naturalHeight * kk);
        t.getContext("2d")?.drawImage(pic, 0, 0, t.width, t.height);
        texel = t;
      }
      c.texImage2D(c.TEXTURE_2D, 0, c.RGBA, c.RGBA, c.UNSIGNED_BYTE, texel);
      const u = (n: string) => c.getUniformLocation(prog, n);
      const buf = (data: BufferSource, kind: number = c.ARRAY_BUFFER) => {
        const b = c.createBuffer()!;
        c.bindBuffer(kind, b);
        c.bufferData(kind, data, c.STATIC_DRAW);
        return b;
      };
      const attr = (name: string, b: WebGLBuffer, size: number) => {
        const loc = c.getAttribLocation(prog, name);
        if (loc < 0) return;
        c.bindBuffer(c.ARRAY_BUFFER, b);
        c.enableVertexAttribArray(loc);
        c.vertexAttribPointer(loc, size, c.FLOAT, false, 0, 0);
      };
      // The depth picture too, for the per-pixel edges.
      const depthTex = c.createTexture();
      c.activeTexture(c.TEXTURE1);
      c.bindTexture(c.TEXTURE_2D, depthTex);
      c.pixelStorei(c.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
      for (const [p, v] of [[c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE], [c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE], [c.TEXTURE_MIN_FILTER, c.LINEAR], [c.TEXTURE_MAG_FILTER, c.LINEAR]]) c.texParameteri(c.TEXTURE_2D, p, v);
      c.texImage2D(c.TEXTURE_2D, 0, c.RGBA, c.RGBA, c.UNSIGNED_BYTE, small);
      c.activeTexture(c.TEXTURE0);
      let parts: { pos: WebGLBuffer; uv: WebGLBuffer; n: WebGLBuffer; idx: WebGLBuffer; back: { pos: WebGLBuffer; uv: WebGLBuffer; n: WebGLBuffer } } | null = null;
      let aspect = 1;
      const build = () => {
        const bw = host.clientWidth || 1, bh = host.clientHeight || 1;
        aspect = bw / bh;
        const cs = getComputedStyle(img);
        const spot = cs.objectPosition.split(/\s+/).map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : 0.5));
        const focus = { x: Number.isFinite(spot[0]) ? spot[0] : 0.5, y: Number.isFinite(spot[1]) ? spot[1] : 0.5 };
        const fit = cs.objectFit === "contain" ? "contain" : "cover";
        const box = { w: bw, h: bh }, picSize = { w: pic.naturalWidth, h: pic.naturalHeight };
        mesh = photoMesh(grid, aspect, spec.depth * 0.75, (x, y) => fitUv(x, y, box, picSize, fit, focus), { cols: o.cols ?? (spec.look === "points" ? 150 : 180) });
        // Behind the holes: the picture flat, further back than anything of it.
        const back = -spec.depth * 0.75 * 0.6 - 0.05;
        const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => fitUv(x, y, box, picSize, fit, focus) ?? { u: x, v: y });
        parts = {
          pos: buf(mesh.pos), uv: buf(mesh.uv), n: buf(mesh.normal), idx: buf(mesh.index, c.ELEMENT_ARRAY_BUFFER),
          back: {
            pos: buf(new Float32Array([-aspect, 1, back, aspect, 1, back, -aspect, -1, back, aspect, -1, back])),
            uv: buf(new Float32Array(corners.flatMap((p) => [p.u, p.v]))),
            n: buf(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])),
          },
        };
      };
      const size = () => {
        const s = canvasSize({ w: host.clientWidth, h: host.clientHeight }, window.devicePixelRatio);
        if (made.width !== s.w || made.height !== s.h) { made.width = s.w; made.height = s.h; }
        c.viewport(0, 0, s.w, s.h);
      };
      build();
      size();
      c.enable(c.DEPTH_TEST);
      c.enable(c.BLEND);
      c.blendFunc(c.ONE, c.ONE_MINUS_SRC_ALPHA);
      canvas = made;
      gl = c;
      host.appendChild(made);
      draw = () => {
        if (!parts || !mesh || !gl) return;
        frames++;
        c.clearColor(0, 0, 0, 0);
        c.clear(c.COLOR_BUFFER_BIT | c.DEPTH_BUFFER_BIT);
        c.uniform1f(u("u_yaw"), at.yaw);
        c.uniform1f(u("u_pitch"), at.pitch);
        // A little bigger, so its edges never show as it turns.
        c.uniform1f(u("u_scale"), 1 + spec.turn * 0.09);
        c.uniform1f(u("u_aspect"), aspect);
        c.uniform2f(u("u_light"), at.lx, at.ly);
        c.uniform1f(u("u_shade"), spec.light);
        c.uniform1i(u("u_tex"), 0);
        c.uniform1i(u("u_depth"), 1);
        c.uniform2f(u("u_texel"), 1.5 / dw, 1.5 / dh);
        // The picture behind, flat and a little darker (never faded: u_edge past any jump).
        c.uniform1f(u("u_edge"), 9);
        c.uniform1f(u("u_dim"), 0.82);
        c.uniform1f(u("u_dot"), 0);
        c.uniform1f(u("u_point"), 1);
        attr("a_p", parts.back.pos, 3);
        attr("a_uv", parts.back.uv, 2);
        attr("a_n", parts.back.n, 3);
        c.drawArrays(c.TRIANGLE_STRIP, 0, 4);
        attr("a_p", parts.pos, 3);
        attr("a_uv", parts.uv, 2);
        attr("a_n", parts.n, 3);
        c.uniform1f(u("u_edge"), 0.12);
        c.uniform1f(u("u_dim"), 1);
        if (spec.look === "points") {
          // Dots a little bigger than their cell, round.
          c.uniform1f(u("u_dot"), 1);
          c.uniform1f(u("u_point"), (made.width / mesh.cols) * 0.95);
          c.drawArrays(c.POINTS, 0, (mesh.cols + 1) * (mesh.rows + 1));
        } else {
          c.bindBuffer(c.ELEMENT_ARRAY_BUFFER, parts.idx);
          c.drawElements(c.TRIANGLES, mesh.index.length, c.UNSIGNED_SHORT, 0);
        }
      };
      sized = typeof ResizeObserver === "function" ? new ResizeObserver(() => { if (!gl) return; size(); build(); kick(); }) : null;
      sized?.observe(host);
      // A card's: shown only while the pointer is still on it.
      if (!o.hover || hovered) made.setAttribute("data-on", "");
      say("on");
      kick();
    } catch {
      close();
      say("plain");
    } finally {
      opening = false;
    }
  };

  /** One frame now, and more while it is still moving (or always, turning by itself, while it is in sight). */
  const kick = () => {
    if (!frame && draw) frame = requestAnimationFrame(tick);
  };
  const tick = (now: number) => {
    frame = 0;
    if (!draw) return;
    // Eased by time, not by frames: a slow device (or a computer drawing it without a graphics card) settles as soon.
    const dt = last ? Math.min(250, Math.max(1, now - last)) : 16.7;
    last = now;
    const step = 1 - Math.pow(0.88, dt / 16.7);
    if (spec.move === "auto") {
      const t = (now - born) / 1000;
      to.yaw = Math.sin(t * 0.45) * spec.turn * 0.3;
      to.pitch = Math.cos(t * 0.33) * spec.turn * 0.18;
      to.lx = Math.sin(t * 0.45) * 0.8;
      to.ly = 0.5;
    } else if (spec.move === "scroll") {
      const r = host.getBoundingClientRect(), vh = window.innerHeight || 1;
      const p = Math.max(-1, Math.min(1, ((r.top + r.height / 2) / vh - 0.5) * 2));
      to.yaw = p * spec.turn * 0.12;
      to.pitch = -p * spec.turn * 0.3;
      to.lx = -0.3;
      to.ly = 0.6 - p * 0.4;
    }
    let busy = false;
    for (const key of ["yaw", "pitch", "lx", "ly"] as const) {
      const d = to[key] - at[key];
      at[key] += d * step;
      if (Math.abs(d) > 0.0005) busy = true;
    }
    draw();
    if ((busy || spec.move === "auto") && seen) frame = requestAnimationFrame(tick);
    // At rest: the next move starts its own clock (a pause is no long step).
    else last = 0;
    // A card's, turned back after the pointer left: it fades and is put away (a WebGL canvas less on the page).
    if (!frame && o.hover && !hovered && !busy && canvas && !resting) {
      canvas.removeAttribute("data-on");
      resting = window.setTimeout(() => {
        resting = 0;
        if (hovered || gone) return;
        close();
        say("rest");
      }, 400);
    }
  };

  // The pointer over it (a phone: its tilt), the page's scroll.
  const point = (e: PointerEvent) => {
    if (spec.move !== "pointer") return;
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2, y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    to.yaw = x * spec.turn * 0.35;
    to.pitch = y * spec.turn * 0.25;
    to.lx = x;
    to.ly = -y;
    kick();
  };
  const away = () => {
    if (spec.move !== "pointer") return;
    to.yaw = 0;
    to.pitch = 0;
    to.lx = -0.4;
    to.ly = 0.5;
    kick();
  };
  const tilted = (e: DeviceOrientationEvent) => {
    if (spec.move !== "pointer" || e.beta === null || e.gamma === null) return;
    tilt0 ??= { b: e.beta, g: e.gamma };
    const x = Math.max(-1, Math.min(1, (e.gamma - tilt0.g) / 25)), y = Math.max(-1, Math.min(1, (e.beta - tilt0.b) / 25));
    to.yaw = x * spec.turn * 0.35;
    to.pitch = y * spec.turn * 0.25;
    to.lx = x;
    to.ly = -y;
    kick();
  };
  const scrolled = () => { if (spec.move === "scroll") kick(); };
  // A card's: only a mouse brings it (a finger's touch opens the product).
  const came = (e: PointerEvent) => {
    if (!o.hover || e.pointerType !== "mouse" || gone) return;
    hovered = true;
    seen = true;
    window.clearTimeout(resting);
    resting = 0;
    if (canvas) { canvas.setAttribute("data-on", ""); kick(); }
    else void open();
  };
  const left = () => {
    if (!o.hover) return;
    hovered = false;
    if (!canvas && !opening) return;
    kick();
  };
  host.addEventListener("pointerenter", came);
  host.addEventListener("pointerleave", left);
  host.addEventListener("pointermove", point);
  host.addEventListener("pointerleave", away);
  window.addEventListener("scroll", scrolled, { passive: true });
  // A phone's tilt where it needs no asking (Android); iOS asks, so its pictures follow the finger instead.
  const asks = typeof DeviceOrientationEvent !== "undefined" && typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function";
  // Only where there is no mouse: a computer that has a tilt sensor (or says it has) would fight the pointer, and its
  // readings would leave the picture turned after the pointer has gone.
  const touch = window.matchMedia?.("(hover: none)").matches ?? false;
  if (!asks && touch && "ondeviceorientation" in window) window.addEventListener("deviceorientation", tilted);
  // Made when it first comes near the screen; it rests while out of sight. (A card's waits for the pointer.)
  const sight = o.hover ? null : typeof IntersectionObserver === "function"
    ? new IntersectionObserver(([e]) => {
        seen = e.isIntersecting;
        if (seen && !canvas && !gone) void open();
        if (seen) kick();
      }, { rootMargin: "200px" })
    : null;
  if (sight) sight.observe(host);
  else if (!o.hover) { seen = true; void open(); }
  say("rest");
  stops.push(() => {
    gone = true;
    sight?.disconnect();
    host.removeEventListener("pointermove", point);
    host.removeEventListener("pointerleave", away);
    window.removeEventListener("scroll", scrolled);
    window.removeEventListener("deviceorientation", tilted);
    host.removeEventListener("pointerenter", came);
    host.removeEventListener("pointerleave", left);
    close();
    host.removeAttribute("data-pt-3d-state");
    delete (host as HTMLElement & { __photo3d?: unknown }).__photo3d;
  });
}
