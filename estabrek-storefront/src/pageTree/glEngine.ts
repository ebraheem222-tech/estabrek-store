/**
 * The engine that draws a WebGL scene the owner built (glScene.ts) on one canvas, in one WebGL context:
 * its background (a colour, a gradient, a glow or one of the library's shaders, drawn at a lower resolution),
 * then each layer of particles. Each particle is worked out here every frame, a 60th of a second at a time:
 * - a form's particles are sprung to their place (morphing from form to form, wandering, waving, breathing, turned by
 *   the camera), pushed by the pointer and a press, and come back;
 * - a flow's particles move by their flow's own rule (rain, a fountain, fireworks, a vortex, orbits…).
 * The graphics card draws them as sprites (soft glow, dot, ring, star, glyph…), additive or plain, with lines between
 * near ones, and trails kept in a texture that fades a little each frame.
 *
 * Plain WebGL 1 and maths (no React, no "@/" imports): the shop's GlSceneView.tsx runs it, the admin draws its
 * thumbnails with it.
 */
import { SHADERS, SHADER_HEAD } from "./shaderGlsl";
import { formPoints, gauss, imagePoints, rng, textPoints, type Rand } from "./glShapes";
import { GL_LINK_MAX, isFlow, type GlFlow, type GlForm, type GlLayer, type GlSpec } from "./glScene";
import { PHYSICS, type FlowCtx, type PhysicsFlow } from "./glPhysics";

export type Rgb = [number, number, number];
/** The scene's colours, read where it is drawn: the background's four and each layer's three (null: the default). */
export type GlColours = { bg: Array<Rgb | null>; layers: Array<Array<Rgb | null>> };
export type GlStart = {
  colours: GlColours;
  /** The page's font (a CSS family) for words drawn in particles, and its direction. */
  family: string;
  rtl: boolean;
  /** A phone: half the particles. */
  phone?: boolean;
  /** Keep the picture after it is shown (a still frame, a thumbnail). */
  preserve?: boolean;
  dpr?: number;
};
export type GlSample = { n: number; cx: number; cy: number; inside: number; spread: number };
export type GlRun = {
  /** Moves the scene to `seconds` and draws it. */
  frame(seconds: number): void;
  /** Runs it `seconds` ahead without drawing, then draws (a still frame). */
  warm(seconds: number): void;
  resize(): void;
  /** The pointer over it, 0…1 from its top left (null: away). */
  pointer(x: number | null, y: number | null): void;
  press(x: number, y: number): void;
  drag(dx: number, dy: number): void;
  /** How far it has scrolled through the screen, 0 (coming in from below) … 1 (gone above). */
  scroll(progress: number): void;
  hover(on: boolean): void;
  /** Where each layer's particles are on the screen (tests). */
  sample(): GlSample[];
  /** The share of all particles within `r` (of the box's height) of a point, 0…1 from its top left (tests). */
  near(x: number, y: number, r: number): number;
  /** How far it has run (seconds of its own time), the presses waiting for its next step, and the frames drawn (tests). */
  stats(): { t: number; queued: number; frames: number };
  readonly particles: number;
  dispose(): void;
};

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const LAYER_COLOURS: Rgb[] = [hex("#8b5cf6"), hex("#22d3ee"), hex("#f472b6")];
const mix3 = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
function hsl(h: number, s: number, l: number): Rgb {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ------------------------------------------------------------------ shaders */

const QUAD_VS = "attribute vec2 p; varying vec2 v_uv; void main(){ v_uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }";
const PLAIN_FS = `precision mediump float;
varying vec2 v_uv; uniform vec3 u_a; uniform vec3 u_b; uniform float u_kind; uniform vec2 u_res;
void main(){
  vec3 c = u_a;
  if (u_kind > 0.5 && u_kind < 1.5) c = mix(u_b, u_a, v_uv.y);
  else if (u_kind > 1.5) { vec2 q = (v_uv - 0.5) * vec2(u_res.x / u_res.y, 1.0); c = mix(u_a, u_b, smoothstep(0.0, 0.95, length(q) * 1.25)); }
  gl_FragColor = vec4(c, 1.0);
}`;
const COPY_FS = "precision mediump float; varying vec2 v_uv; uniform sampler2D u_t; void main(){ gl_FragColor = texture2D(u_t, v_uv); }";
const FILL_FS = "precision mediump float; uniform vec4 u_col; void main(){ gl_FragColor = u_col; }";
const SHADER_VS = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";
/** Where a point is drawn: a little perspective from a camera `u_d` away, sized by its nearness. */
const VIEW = `uniform float u_zoom; uniform float u_aspect; uniform float u_d;
vec4 placed(vec3 p, out float k){
  k = u_d / max(u_d - p.z, 0.05);
  if (p.z > u_d - 0.06) return vec4(3.0, 3.0, 3.0, 1.0);
  return vec4(p.x * u_zoom * k / u_aspect, p.y * u_zoom * k, 0.0, 1.0);
}`;
const POINT_VS = `attribute vec3 a_p; attribute float a_s; attribute float a_a; attribute vec4 a_c;
${VIEW}
uniform float u_dpr; uniform float u_max; uniform float u_time; uniform float u_glyphs; uniform float u_rate; uniform float u_halo;
varying vec4 v_c; varying vec2 v_cell;
void main(){
  float k;
  gl_Position = placed(a_p, k);
  gl_PointSize = clamp(a_s * u_dpr * k * (0.65 + 0.35 * u_zoom) * u_halo, 1.5, u_max);
  v_c = vec4(a_c.rgb, a_a);
  float g = mod(floor(a_c.a * 97.0 + u_time * u_rate * step(0.45, fract(a_c.a * 13.0))), max(u_glyphs, 1.0));
  v_cell = vec2(mod(g, 8.0), floor(g / 8.0));
}`;
/** The sprites, by number: soft, dot, ring, square, star, spark, plus, heart, glyph. */
const POINT_FS = `precision mediump float;
varying vec4 v_c; varying vec2 v_cell; uniform float u_sprite; uniform sampler2D u_atlas;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float d = length(q), a = 0.0;
  if (u_sprite < 0.5) { float h = 1.0 - smoothstep(0.0, 0.5, d); a = max(1.0 - smoothstep(0.12, 0.23, d), h * h * 0.6); }
  else if (u_sprite < 1.5) a = 1.0 - smoothstep(0.4, 0.5, d);
  else if (u_sprite < 2.5) a = smoothstep(0.5, 0.43, d) * smoothstep(0.25, 0.32, d);
  else if (u_sprite < 3.5) a = 1.0 - smoothstep(0.4, 0.46, max(abs(q.x), abs(q.y)));
  else if (u_sprite < 4.5) { float s = abs(q.x * q.y); a = clamp(0.006 / (s + 0.002) - 0.35, 0.0, 1.0) * smoothstep(0.5, 0.15, d) + smoothstep(0.16, 0.0, d); }
  else if (u_sprite < 5.5) { float g = 1.0 - smoothstep(0.0, 0.5, d); a = max(1.0 - smoothstep(0.08, 0.16, d), g * g * g * 1.3 + 0.18 * g); }
  else if (u_sprite < 6.5) a = (1.0 - smoothstep(0.07, 0.11, min(abs(q.x), abs(q.y)))) * (1.0 - smoothstep(0.42, 0.48, max(abs(q.x), abs(q.y))));
  else if (u_sprite < 7.5) { vec2 h = vec2(q.x, 0.08 - q.y) * 2.7; float f = pow(h.x * h.x + h.y * h.y - 1.0, 3.0) - h.x * h.x * h.y * h.y * h.y; a = 1.0 - smoothstep(-0.03, 0.03, f); }
  else a = texture2D(u_atlas, (v_cell + gl_PointCoord) / 8.0).r;
  float al = min(1.0, a) * v_c.a;
  if (al < 0.004) discard;
  gl_FragColor = vec4(v_c.rgb * al, al);
}`;
const LINE_VS = `attribute vec3 a_p; attribute float a_a; ${VIEW} varying float v_a; void main(){ float k; gl_Position = placed(a_p, k); v_a = a_a; }`;
const LINE_FS = "precision mediump float; varying float v_a; uniform vec3 u_col; void main(){ gl_FragColor = vec4(u_col * v_a, v_a); }";
/** A streak: a line from where a particle is back along its way, in its own colour, fading to its tail. */
const STREAK_VS = `attribute vec3 a_p; attribute vec4 a_c; ${VIEW} varying vec4 v_c; void main(){ float k; gl_Position = placed(a_p, k); v_c = a_c; }`;
const STREAK_FS = "precision mediump float; varying vec4 v_c; void main(){ gl_FragColor = vec4(v_c.rgb * v_c.a, v_c.a); }";
/** Bloom: the bright parts, blurred (a nine-tap Gaussian in two passes), added back over the picture. */
const BRIGHT_FS = `precision mediump float; varying vec2 v_uv; uniform sampler2D u_t;
void main(){ vec4 c = texture2D(u_t, v_uv); gl_FragColor = c * smoothstep(0.18, 0.75, max(c.r, max(c.g, c.b))); }`;
const BLUR_FS = `precision mediump float; varying vec2 v_uv; uniform sampler2D u_t; uniform vec2 u_dir;
void main(){
  vec4 c = texture2D(u_t, v_uv) * 0.2270270270;
  c += (texture2D(u_t, v_uv + u_dir * 1.3846153846) + texture2D(u_t, v_uv - u_dir * 1.3846153846)) * 0.3162162162;
  c += (texture2D(u_t, v_uv + u_dir * 3.2307692308) + texture2D(u_t, v_uv - u_dir * 3.2307692308)) * 0.0702702703;
  gl_FragColor = c;
}`;
/** The finished picture: the scene, its colours parted towards the edges (chromatic aberration), and its bloom. */
const FINAL_FS = `precision mediump float; varying vec2 v_uv; uniform sampler2D u_s; uniform sampler2D u_b; uniform float u_k; uniform float u_chroma;
void main(){
  vec4 c = texture2D(u_s, v_uv);
  if (u_chroma > 0.0) { vec2 d = (v_uv - 0.5) * u_chroma * 0.016; c.r = texture2D(u_s, v_uv + d).r; c.b = texture2D(u_s, v_uv - d).b; }
  vec4 b = texture2D(u_b, v_uv) * u_k;
  gl_FragColor = vec4(c.rgb + b.rgb, min(1.0, c.a + b.a));
}`;
const SPRITE_NO: Record<GlLayer["sprite"], number> = { soft: 0, dot: 1, ring: 2, square: 3, star: 4, spark: 5, plus: 6, heart: 7, glyph: 8, streak: 1 };

/** Flows whose particles turn with the camera (the others fall, rise or cross the screen as it is). */
const TURNING: ReadonlySet<GlFlow> = new Set(["orbit", "vortex"]);
/** Forms that are flat (a picture's thickness is the layer's depth). */
const FLAT: ReadonlySet<GlForm> = new Set(["text", "image", "spiral", "grid", "star", "heart", "fern", "rose"]);
/** Forms coloured from the middle out, not from the bottom up. */
const ROUND: ReadonlySet<string> = new Set(["galaxy", "rings", "spiral", "vortex", "orbit", "wave", "rose"]);
/** Flows coloured along their particles' order (a family of pendulums, a path round an attractor, a sheet's rows). */
const BY_ORDER: ReadonlySet<string> = new Set(["pendulum", "lorenz", "aizawa", "thomas", "cloth", "pond", "hopf"]);

type Target = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };
type LayerRun = {
  l: GlLayer;
  n: number;
  flow: GlFlow | null;
  /** Each form's places, and whether they are in the unit space (fitted to the box) or already in its units. */
  homes: Array<{ pos: Float32Array; unit: boolean; col?: Float32Array; rad?: Float32Array; tan?: Float32Array }>;
  /** Each particle's own size now (a blob's, a spark's), blended through a morph; null when all are the layer's. */
  own: Float32Array | null;
  rand: Rand;
  seed: Float32Array;
  /** A random direction each (for a morph's flight, a burst, a scatter). */
  jit: Float32Array;
  p: Float32Array;
  v: Float32Array;
  /** A flow's own numbers per particle, and its age. */
  a: Float32Array;
  age: Float32Array;
  out: Float32Array;
  stat: Float32Array;
  dyn: WebGLBuffer;
  st: WebGLBuffer;
  lines: Float32Array | null;
  lineBuf: WebGLBuffer | null;
  lineCount: number;
  atlas: WebGLTexture | null;
  glyphs: number;
  colours: Rgb[];
  /** The morph: from form, to form, how far (0…1). */
  from: number;
  to: number;
  k: number;
  /** A click's morph: when it began. */
  since: number;
  /** Fireworks: each group's middle, start and the round it is in; each particle's round. */
  groups: Float32Array | null;
  round: Float32Array | null;
  /** The size of the box its words or picture were fitted to, and its picture once read. */
  fitAspect: number;
  img?: HTMLImageElement;
  /** What is the same for all its particles in this step: their fit, size, turn and offset. */
  f: { fit: number; k: number; cy: number; sy: number; cp: number; sp: number; ox: number; oy: number; apart: number };
  /** A flow of maths or physics (glPhysics.ts), its memory, and what it was handed this step. */
  phys: PhysicsFlow | null;
  mem: Record<string, unknown>;
  c: FlowCtx | null;
  /** Streaks: where each particle was, and the lines drawn back to it. */
  prev: Float32Array | null;
  streak: Float32Array | null;
  streakBuf: WebGLBuffer | null;
};

export function startGl(canvas: HTMLCanvasElement, spec: GlSpec, o: GlStart): GlRun | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: Boolean(o.preserve), powerPreference: "high-performance" });
  } catch {
    gl = null;
  }
  if (!gl) return null;
  const G = gl;
  const compile = (type: number, src: string) => {
    const s = G.createShader(type)!;
    G.shaderSource(s, src);
    G.compileShader(s);
    return s;
  };
  const program = (vs: string, fs: string) => {
    const p = G.createProgram()!;
    G.attachShader(p, compile(G.VERTEX_SHADER, vs));
    G.attachShader(p, compile(G.FRAGMENT_SHADER, fs));
    G.linkProgram(p);
    return G.getProgramParameter(p, G.LINK_STATUS) ? p : null;
  };
  const pointProg = program(POINT_VS, POINT_FS);
  const lineProg = program(LINE_VS, LINE_FS);
  const plainProg = program(QUAD_VS, PLAIN_FS);
  const copyProg = program(QUAD_VS, COPY_FS);
  const fillProg = program(SHADER_VS, FILL_FS);
  if (!pointProg || !lineProg || !plainProg || !copyProg || !fillProg) return null;
  const streakProg = spec.layers.some((l) => l.sprite === "streak") ? program(STREAK_VS, STREAK_FS) : null;
  const post = spec.bloom > 0 || spec.chroma > 0;
  const finalProg = post ? program(QUAD_VS, FINAL_FS) : null;
  const brightProg = spec.bloom > 0 ? program(QUAD_VS, BRIGHT_FS) : null;
  const blurProg = spec.bloom > 0 ? program(QUAD_VS, BLUR_FS) : null;
  const shaderDef = spec.bg.kind === "shader" ? SHADERS[spec.bg.shader] : undefined;
  const shaderProg = shaderDef ? program(SHADER_VS, SHADER_HEAD + shaderDef.frag) : null;

  const quad = G.createBuffer()!;
  G.bindBuffer(G.ARRAY_BUFFER, quad);
  G.bufferData(G.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), G.STATIC_DRAW);
  const uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  const u = (p: WebGLProgram, name: string) => {
    let m = uniforms.get(p);
    if (!m) uniforms.set(p, (m = new Map()));
    if (!m.has(name)) m.set(name, G.getUniformLocation(p, name));
    return m.get(name)!;
  };
  const drawQuad = (p: WebGLProgram) => {
    G.useProgram(p);
    G.bindBuffer(G.ARRAY_BUFFER, quad);
    const loc = G.getAttribLocation(p, "p");
    G.enableVertexAttribArray(loc);
    G.vertexAttribPointer(loc, 2, G.FLOAT, false, 0, 0);
    G.drawArrays(G.TRIANGLES, 0, 6);
    G.disableVertexAttribArray(loc);
  };
  const target = (w: number, h: number): Target => {
    const tex = G.createTexture()!;
    G.bindTexture(G.TEXTURE_2D, tex);
    G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, w, h, 0, G.RGBA, G.UNSIGNED_BYTE, null);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE);
    const fb = G.createFramebuffer()!;
    G.bindFramebuffer(G.FRAMEBUFFER, fb);
    G.framebufferTexture2D(G.FRAMEBUFFER, G.COLOR_ATTACHMENT0, G.TEXTURE_2D, tex, 0);
    G.clearColor(0, 0, 0, 0);
    G.clear(G.COLOR_BUFFER_BIT);
    G.bindFramebuffer(G.FRAMEBUFFER, null);
    return { fb, tex, w, h };
  };
  const dropTarget = (t: Target | null) => {
    if (!t) return;
    G.deleteFramebuffer(t.fb);
    G.deleteTexture(t.tex);
  };
  const range = G.getParameter(G.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
  const maxPoint = range ? Math.max(8, range[1]) : 64;

  /* ---------------------------------------------------------------- the box */
  let w = 1, h = 1, aspect = 1, dpr = 1, quality = 1;
  let bgTarget: Target | null = null, trailTarget: Target | null = null;
  // The scene drawn off the screen first when it is finished after (bloom, colour fringes), and its blur at a quarter.
  let sceneTarget: Target | null = null, blurA: Target | null = null, blurB: Target | null = null;
  const size = () => {
    dpr = Math.min(2, o.dpr ?? (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)) * quality;
    const cw = canvas.clientWidth || canvas.width || 1, ch = canvas.clientHeight || canvas.height || 1;
    w = Math.max(1, Math.round(cw * dpr));
    h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    aspect = w / h;
    dropTarget(bgTarget);
    dropTarget(trailTarget);
    bgTarget = shaderProg ? target(Math.max(1, Math.round(w * 0.55)), Math.max(1, Math.round(h * 0.55))) : null;
    trailTarget = spec.trails > 0 ? target(w, h) : null;
    for (const t of [sceneTarget, blurA, blurB]) dropTarget(t);
    sceneTarget = finalProg ? target(w, h) : null;
    const bw = Math.max(1, Math.round(w / 4)), bh = Math.max(1, Math.round(h / 4));
    blurA = brightProg && blurProg ? target(bw, bh) : null;
    blurB = brightProg && blurProg ? target(bw, bh) : null;
  };
  size();

  /* ---------------------------------------------------------------- colours */
  const bgCol = (i: number, fallback: Rgb) => o.colours.bg[i] ?? fallback;
  const bgDefaults: Rgb[] = shaderDef
    ? [hex(shaderDef.bg), hex(shaderDef.c1), hex(shaderDef.c2), hex(shaderDef.c3)]
    : spec.bg.kind === "gradient" ? [hex("#0b0b1d"), hex("#25124a"), hex("#000000"), hex("#000000")]
    : spec.bg.kind === "radial" ? [hex("#24145a"), hex("#05050c"), hex("#000000"), hex("#000000")]
    : [hex("#07070d"), hex("#000000"), hex("#000000"), hex("#000000")];
  const bgc = [0, 1, 2, 3].map((i) => bgCol(i, bgDefaults[i]));

  /* ---------------------------------------------------------------- layers */
  const scale = o.phone ? 0.5 : 1;
  const forms = (l: GlLayer) => l.shapes.filter((s): s is GlForm => !isFlow(s));
  /** A layer's words or picture fitted to the box as it is now. */
  /** The way the k-th word or picture of a layer (in its forms' order) becomes dots. */
  const modeOf = (run: LayerRun, form: number) => run.l.pictureModes[run.l.shapes.slice(0, form).filter((s) => s === "text" || s === "image").length] ?? "pixels";
  const fitted = (run: LayerRun, form: GlForm, n: number, index: number): LayerRun["homes"][number] => {
    const maxW = 1.84 * aspect * 0.94, maxH = 1.2, mode = modeOf(run, index);
    if (form === "text") {
      const got = textPoints(run.l.text || " ", n, run.rand, { family: familyOf(run.l.font), weight: run.l.weight, rtl: o.rtl, maxW, maxH, mode });
      if (got) return { pos: relieved(got.pos, got.col, run.l.relief), unit: false, col: got.col, rad: got.rad, tan: got.tan };
    }
    if (form === "image" && run.img) {
      const got = imagePoints(run.img, n, run.rand, maxW, maxH, mode);
      if (got) return { pos: relieved(got.pos, got.col, run.l.relief), unit: false, col: got.col, rad: got.rad, tan: got.tan };
    } else if (form === "image" && run.l.image) loadImage(run, maxW, maxH);
    // Until the picture is read (or without words): a soft cloud the form gathers out of.
    return { pos: formPoints("cloud", n, run.rand), unit: true };
  };
  const familyOf = (f: GlLayer["font"]) => (f === "sans" ? "system-ui, sans-serif" : f === "serif" ? "Georgia, serif" : f === "mono" ? "ui-monospace, monospace" : f === "display" ? "Impact, 'Arial Black', sans-serif" : o.family || "sans-serif");
  const images: HTMLImageElement[] = [];
  const loadImage = (run: LayerRun, maxW: number, maxH: number) => {
    if (typeof Image === "undefined" || !run.l.image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    images.push(img);
    img.onload = () => {
      if (dead) return;
      run.img = img;
      let first: Float32Array | undefined;
      run.l.shapes.forEach((s, i) => {
        if (s !== "image") return;
        const got = imagePoints(img, run.n, run.rand, maxW, maxH, modeOf(run, i));
        if (!got) return;
        run.homes[i] = { pos: relieved(got.pos, got.col, run.l.relief), unit: false, col: got.col, rad: got.rad, tan: got.tan };
        first ??= got.col;
      });
      ownSizes(run);
      if (run.l.colouring === "picture" && first) {
        pictureColours(run, first);
        G.bindBuffer(G.ARRAY_BUFFER, run.st);
        G.bufferData(G.ARRAY_BUFFER, run.stat, G.STATIC_DRAW);
      }
      if (stillAt !== null) warm(3);
    };
    img.src = run.l.image;
  };
  const glyphAtlas = (chars: string, family: string) => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const x = c.getContext("2d");
    if (!x) return null;
    const list = Array.from(chars || "01");
    x.fillStyle = "#fff";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = `700 44px ${family}`;
    list.slice(0, 64).forEach((ch, i) => x.fillText(ch, (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 34));
    const tex = G.createTexture()!;
    G.bindTexture(G.TEXTURE_2D, tex);
    G.pixelStorei(G.UNPACK_FLIP_Y_WEBGL, false);
    G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, G.RGBA, G.UNSIGNED_BYTE, c);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE);
    return { tex, n: Math.min(64, list.length) };
  };


  /** A picture in relief: its light parts come forward, its dark ones go back. */
  function relieved(pos: Float32Array, col: Float32Array | undefined, relief: number) {
    if (!col || !relief) return pos;
    const out = new Float32Array(pos);
    for (let i = 0; i < out.length / 3; i++) out[i * 3 + 2] = (0.2126 * col[i * 3] + 0.7152 * col[i * 3 + 1] + 0.0722 * col[i * 3 + 2] - 0.5) * relief * 0.9;
    return out;
  }
  /** Whether any of a layer's forms gives its particles sizes of their own (blobs, sparks). */
  function ownSizes(run: LayerRun) {
    run.own = run.homes.some((h) => h.rad?.some((r) => r > 0)) ? new Float32Array(run.n) : null;
  }
  /** The particles in a picture's own colours (or the words' own: an emoji's). */
  function pictureColours(run: LayerRun, col: Float32Array) {
    for (let i = 0; i < run.n; i++) {
      const j = 0.82 + 0.36 * ((run.seed[i] * 7.31) % 1);
      run.stat[i * 4] = Math.min(1, col[i * 3] * j);
      run.stat[i * 4 + 1] = Math.min(1, col[i * 3 + 1] * j);
      run.stat[i * 4 + 2] = Math.min(1, col[i * 3 + 2] * j);
    }
  }
  /** Each particle's colour (and its seed, for the twinkle and the glyph it shows). */
  function colour(run: LayerRun) {
    const { l, n, seed } = run;
    const [c1, c2, c3] = run.colours;
    const home = run.homes[0]?.pos;
    const first = run.flow ?? (l.shapes[0] as string);
    let maxX = 1e-6;
    if (home && (first === "text" || first === "image")) for (let i = 0; i < n; i++) maxX = Math.max(maxX, Math.abs(home[i * 3]));
    const groups = run.flow === "fireworks" ? Math.max(3, Math.min(10, Math.round(n / 250))) : 0;
    for (let i = 0; i < n; i++) {
      const s = seed[i];
      let f = s;
      if (groups) f = (i % groups) / groups;
      else if (BY_ORDER.has(first)) f = i / n;
      else if (home) {
        const x = home[i * 3], y = home[i * 3 + 1], z = home[i * 3 + 2];
        f = first === "text" || first === "image" ? x / (2 * maxX) + 0.5 : ROUND.has(first) ? Math.min(1, Math.hypot(x, z) / 1.05) : (y + 1) / 2;
      } else if (ROUND.has(first)) f = s;
      f = Math.min(1, Math.max(0, f));
      let c: Rgb;
      switch (l.colouring) {
        case "one": c = c1; break;
        case "three": c = f < 0.5 ? mix3(c1, c2, f * 2) : mix3(c2, c3, (f - 0.5) * 2); break;
        case "rainbow": c = hsl((f * 0.85 + s * 0.15) % 1, 0.85, 0.62); break;
        case "random": c = [c1, c2, c3][Math.min(2, Math.floor((groups ? (i % groups) / groups : s) * 3))]; break;
        default: c = mix3(c1, c2, f);
      }
      const j = 0.82 + 0.36 * ((s * 7.31) % 1);
      run.stat[i * 4] = Math.min(1, c[0] * j);
      run.stat[i * 4 + 1] = Math.min(1, c[1] * j);
      run.stat[i * 4 + 2] = Math.min(1, c[2] * j);
      run.stat[i * 4 + 3] = s;
    }
  }

  /* ---------------------------------------------------------------- state */
  let t = 0, last = -1, dead = false, frames = 0;
  let stillAt: number | null = null;
  const ptr = { on: false, x: 0, y: 0, tx: 0, ty: 0 };
  let hovering = false, scrolled = 0.5, yawDrag = 0, pitchDrag = 0;
  const presses: Array<{ x: number; y: number }> = [];
  let shock: { x: number; y: number; t: number } | null = null;
  /** How firmly forms hold their places (0 just after a burst or a shock wave, back to 1 over two seconds). */
  let calm = 1;
  const camD = () => 28 + (2.6 - 28) * spec.camera.depth;
  const zoomNow = () => spec.camera.zoom * (spec.scroll === "zoom" ? 0.72 + scrolled * 0.66 : 1);
  const yawNow = () => spec.camera.spin * t * 0.35 + yawDrag + (spec.scroll === "spin" ? (scrolled - 0.5) * Math.PI * 1.3 : 0);
  const pitchNow = () => (spec.camera.tilt * Math.PI) / 180 + pitchDrag;
  /** The pointer, in the scene's units at its middle depth. */
  const world = (x01: number, y01: number) => {
    const z = zoomNow();
    return { x: ((x01 * 2 - 1) * aspect) / z, y: (1 - y01 * 2) / z };
  };

  /** What a layer's particles share in this step. */
  const frameOf = (run: LayerRun) => {
    const { l, f } = run;
    f.fit = Math.min(1, aspect) * 0.92;
    f.k = l.scale * (1 + Math.sin(t * 2 * Math.max(0.2, l.speed)) * l.pulse * 0.08);
    const yaw = yawNow() + l.spin * t * 0.5, pitch = pitchNow() + (run.flow ? 0.35 : 0);
    f.cy = Math.cos(yaw); f.sy = Math.sin(yaw); f.cp = Math.cos(pitch); f.sp = Math.sin(pitch);
    f.ox = l.x * aspect;
    f.oy = l.y + (spec.scroll === "rise" ? (0.5 - scrolled) * 0.9 : 0);
    f.apart = spec.scroll === "scatter" ? smooth(0.1, 1, Math.abs(scrolled - 0.5) * 2) * 1.7 : 0;
  };
  /** A form's place for particle i, turned and moved as the layer is now (frameOf first). */
  const place = (run: LayerRun, i: number, out: Float32Array) => {
    const { l, f: F } = run;
    const fit = F.fit;
    const morphK = run.homes.length > 1 ? ease(Math.min(1, Math.max(0, run.k * 1.6 - run.seed[i] * 0.6))) : 0;
    const A = run.homes[run.from] ?? run.homes[0], B = run.homes[run.to] ?? A;
    const fa = A.unit ? fit : 1, fb = B.unit ? fit : 1;
    let x = A.pos[i * 3] * fa + (B.pos[i * 3] * fb - A.pos[i * 3] * fa) * morphK;
    let y = A.pos[i * 3 + 1] * fa + (B.pos[i * 3 + 1] * fb - A.pos[i * 3 + 1] * fa) * morphK;
    let z = A.pos[i * 3 + 2] * fa + (B.pos[i * 3 + 2] * fb - A.pos[i * 3 + 2] * fa) * morphK;
    if (run.own) {
      // A blob's or a spark's own size, as a radius in the scene's units, blended through the morph.
      const ra = A.rad ? A.rad[i] : 0, rb = B.rad ? B.rad[i] : 0;
      run.own[i] = ra + (rb - ra) * morphK;
    }
    if (l.strokes && A.tan) {
      // Along the picture's line through it, to and fro, like a brush.
      const s = Math.sin(t * 1.4 * Math.max(0.2, l.speed) + run.seed[i] * 6.283) * l.strokes * 0.06;
      x += A.tan[i * 2] * s;
      y += A.tan[i * 2 + 1] * s;
    }
    const flatNow = FLAT.has(l.shapes[morphK < 0.5 ? run.from : run.to] as GlForm);
    if (flatNow) z += (run.seed[i] - 0.5) * l.depth * 0.25;
    const sp = l.speed, s = run.seed[i];
    if (l.wave) y += (Math.sin(x * 3.2 + t * 1.6 * sp) * 0.5 + Math.sin(z * 2.6 + t * 1.25 * sp) * 0.5) * l.wave * 0.22;
    const k = F.k;
    x *= k; y *= k; z *= k;
    if (l.wander) {
      const a = l.wander * 0.07;
      x += Math.sin(t * 0.9 * sp + s * 31) * a;
      y += Math.sin(t * 0.7 * sp + s * 17) * a;
      z += Math.sin(t * 0.8 * sp + s * 23) * a;
    }
    // A morph's flight: away from the form and back into the next one.
    if (morphK > 0 && morphK < 1) {
      const fly = Math.sin(Math.PI * morphK) * 0.32 * k;
      x += run.jit[i * 3] * fly; y += run.jit[i * 3 + 1] * fly; z += run.jit[i * 3 + 2] * fly;
    }
    if (F.apart) {
      x += run.jit[i * 3] * F.apart; y += run.jit[i * 3 + 1] * F.apart; z += run.jit[i * 3 + 2] * F.apart;
    }
    const x1 = x * F.cy + z * F.sy, z1 = -x * F.sy + z * F.cy;
    out[0] = x1 + F.ox;
    out[1] = y * F.cp - z1 * F.sp + F.oy;
    out[2] = y * F.sp + z1 * F.cp;
  };
  const tmp = new Float32Array(3);
  function placeAll(run: LayerRun) {
    frameOf(run);
    for (let i = 0; i < run.n; i++) {
      place(run, i, tmp);
      run.p[i * 3] = tmp[0];
      run.p[i * 3 + 1] = tmp[1];
      run.p[i * 3 + 2] = tmp[2];
    }
  }

  /* ---------------------------------------------------------------- flows */
  /** What a flow of maths or physics is handed for a step. */
  const ctxOf = (run: LayerRun, press: { x: number; y: number } | null): FlowCtx => {
    const c: FlowCtx = {
      n: run.n, p: run.p, v: run.v, a: run.a, age: run.age, seed: run.seed, rand: run.rand, t, sp: run.l.speed, aspect,
      S: run.l.scale * Math.min(1, aspect) * 0.95, cx: run.l.x * aspect, cy: run.l.y, depth: run.l.depth,
      ptr: { on: ptr.on && spec.pointer.mode !== "none", x: ptr.x, y: ptr.y }, press, mem: run.mem,
    };
    run.c = c;
    return c;
  };
  function respawn(run: LayerRun, i: number, first: boolean) {
    const { l, p, v, a, rand } = run;
    const A = aspect * l.scale, cx = l.x * aspect, cy = l.y, dz = l.depth;
    const j = i * 3;
    switch (run.flow) {
      case "rain":
      case "snow":
        p[j] = cx + (rand() * 2 - 1) * A * 1.05;
        p[j + 1] = first ? rand() * 2.4 - 1.2 : 1.18;
        p[j + 2] = (rand() * 2 - 1) * dz * 0.8;
        v[j + 1] = -(run.flow === "rain" ? 0.012 + rand() * 0.02 : 0.0018 + rand() * 0.0042);
        break;
      case "rise":
        p[j] = cx + (rand() * 2 - 1) * A * 1.05;
        p[j + 1] = first ? rand() * 2.4 - 1.2 : -1.18;
        p[j + 2] = (rand() * 2 - 1) * dz * 0.8;
        v[j + 1] = 0.0018 + rand() * 0.0055;
        break;
      case "warp":
        // A star somewhere across the view, far away (1) on its way to the camera (0).
        a[j] = (rand() * 2 - 1) * Math.max(1, aspect);
        a[j + 1] = rand() * 2 - 1;
        a[j + 2] = first ? 0.03 + rand() * 0.97 : 1;
        break;
      case "fountain":
        p[j] = cx + gauss(rand) * 0.01;
        p[j + 1] = cy - 0.92 * l.scale;
        p[j + 2] = gauss(rand) * 0.01;
        v[j] = gauss(rand) * 0.0055 * l.scale;
        v[j + 1] = (0.026 + rand() * 0.012) * Math.sqrt(l.scale);
        v[j + 2] = gauss(rand) * 0.0055 * dz;
        // The first ones leave one after another, not all at once.
        run.age[i] = first ? -Math.floor(run.seed[i] * 150) : 0;
        break;
      case "vortex":
        a[j] = first ? 0.05 + Math.pow(rand(), 0.7) * 1.1 : 0.9 + rand() * 0.25;
        a[j + 1] = rand() * Math.PI * 2;
        a[j + 2] = gauss(rand) * 0.03;
        break;
      case "flow":
        p[j] = cx + (rand() * 2 - 1) * A;
        p[j + 1] = cy + (rand() * 2 - 1) * l.scale;
        p[j + 2] = (rand() * 2 - 1) * dz * 0.6;
        run.age[i] = first ? Math.floor(rand() * 120) : 0;
        break;
      case "orbit": {
        const r = 0.22 + Math.pow(rand(), 0.8) * 0.85;
        a[j] = r;
        a[j + 1] = rand() * Math.PI * 2;
        a[j + 2] = (rand() - 0.5) * 0.9;
        v[j] = rand() * Math.PI * 2;
        break;
      }
      case "fireflies":
        p[j] = cx + (rand() * 2 - 1) * A * 0.95;
        p[j + 1] = cy + (rand() * 2 - 1) * 0.92 * l.scale;
        p[j + 2] = (rand() * 2 - 1) * dz;
        v[j] = (rand() - 0.5) * 0.004;
        v[j + 1] = (rand() - 0.5) * 0.004;
        break;
      default:
    }
  }
  function startFlow(run: LayerRun) {
    if (!run.flow) return;
    if (run.phys) {
      run.phys.start(ctxOf(run, null));
      return;
    }
    if (run.flow === "fireworks") {
      const g = Math.max(3, Math.min(10, Math.round(run.n / 250)));
      run.groups = new Float32Array(g * 4);
      run.round = new Float32Array(run.n).fill(-1);
      for (let k = 0; k < g; k++) burstGroup(run, k, -k * (2.4 / g) - 0.01);
      return;
    }
    for (let i = 0; i < run.n; i++) respawn(run, i, true);
  }
  const FIREWORK_LIFE = 2.6;
  function burstGroup(run: LayerRun, k: number, at: number) {
    const g = run.groups!, A = aspect * run.l.scale;
    g[k * 4] = run.l.x * aspect + (run.rand() * 2 - 1) * A * 0.7;
    g[k * 4 + 1] = run.l.y + (run.rand() * 0.8 - 0.15) * run.l.scale;
    g[k * 4 + 2] = at;
    g[k * 4 + 3] += 1;
  }

  /** One 60th of a second of a flow. */
  function stepFlow(run: LayerRun) {
    const { l, n, p, v, a, seed } = run;
    const sp = l.speed, A = aspect * l.scale, cx = l.x * aspect, cy = l.y;
    if (run.flow === "fireworks") {
      const g = run.groups!, groups = g.length / 4, life = FIREWORK_LIFE / Math.max(0.3, sp);
      for (let k = 0; k < groups; k++) if (t - g[k * 4 + 2] > life) burstGroup(run, k, t);
      for (let i = 0; i < n; i++) {
        const k = i % groups, j = i * 3;
        if (run.round![i] !== g[k * 4 + 3]) {
          run.round![i] = g[k * 4 + 3];
          p[j] = g[k * 4]; p[j + 1] = g[k * 4 + 1]; p[j + 2] = 0;
          const s = (0.35 + 0.65 * Math.sqrt(seed[(i * 7) % n])) * 0.03 * Math.max(0.4, sp) * l.scale;
          v[j] = run.jit[j] * s; v[j + 1] = run.jit[j + 1] * s; v[j + 2] = run.jit[j + 2] * s * l.depth;
        }
        v[j] *= 0.968; v[j + 1] = v[j + 1] * 0.968 - 0.00026 * sp; v[j + 2] *= 0.968;
        p[j] += v[j]; p[j + 1] += v[j + 1]; p[j + 2] += v[j + 2];
      }
      return;
    }
    for (let i = 0; i < n; i++) {
      const j = i * 3, s = seed[i];
      switch (run.flow) {
        case "rain":
        case "snow":
        case "rise": {
          p[j + 1] += v[j + 1] * sp;
          if (run.flow !== "rain") p[j] += Math.sin(t * 1.1 + s * 40) * 0.0016 * sp;
          if (p[j + 1] < -1.2 || p[j + 1] > 1.2) respawn(run, i, false);
          break;
        }
        case "warp": {
          a[j + 2] -= (0.0045 + s * 0.002) * sp;
          const z = Math.max(0.02, a[j + 2]);
          p[j] = cx + (a[j] * 0.22 * l.scale) / z;
          p[j + 1] = cy + (a[j + 1] * 0.22 * l.scale) / z;
          p[j + 2] = 0;
          if (a[j + 2] <= 0.02 || Math.abs(p[j] - cx) > aspect * 1.3 || Math.abs(p[j + 1] - cy) > 1.3) respawn(run, i, false);
          break;
        }
        case "fountain": {
          run.age[i] += 1;
          if (run.age[i] < 0) break;
          v[j + 1] -= 0.00052 * sp * sp * l.scale;
          p[j] += v[j] * sp; p[j + 1] += v[j + 1] * sp; p[j + 2] += v[j + 2] * sp;
          if (p[j + 1] < cy - 1.05 * l.scale && v[j + 1] < 0) respawn(run, i, false);
          break;
        }
        case "vortex": {
          const r = a[j];
          a[j + 1] += (0.012 / (r + 0.12)) * sp;
          a[j] -= 0.0016 * sp * (0.4 + r);
          if (a[j] < 0.04) respawn(run, i, false);
          break;
        }
        case "flow": {
          const x = p[j], y = p[j + 1];
          const th = (Math.sin(x * 1.6 + t * 0.15) + Math.cos(y * 1.9 - t * 0.12) + Math.sin((x - y) * 0.9 + t * 0.1)) * 1.4;
          p[j] += Math.cos(th) * 0.0035 * sp;
          p[j + 1] += Math.sin(th) * 0.0035 * sp;
          run.age[i] += 1;
          if (Math.abs(p[j] - cx) > A * 1.02 || Math.abs(p[j + 1] - cy) > l.scale * 1.02) respawn(run, i, false);
          break;
        }
        case "orbit":
          v[j] += (0.0065 * sp) / Math.pow(a[j], 1.5) * 0.35;
          break;
        case "fireflies": {
          v[j] += (run.rand() - 0.5) * 0.00045 * sp;
          v[j + 1] += (run.rand() - 0.5) * 0.00045 * sp;
          v[j] *= 0.985; v[j + 1] *= 0.985;
          if (Math.abs(p[j] - cx) > A) v[j] -= Math.sign(p[j] - cx) * 0.0003;
          if (Math.abs(p[j + 1] - cy) > 0.95 * l.scale) v[j + 1] -= Math.sign(p[j + 1] - cy) * 0.0003;
          p[j] += v[j] * sp; p[j + 1] += v[j + 1] * sp;
          break;
        }
        default:
      }
    }
  }
  /** A turning flow's place (orbits, the vortex), from its own numbers, turned by the camera. */
  function turned(run: LayerRun, i: number, out: Float32Array) {
    const { l, a, v } = run, j = i * 3;
    let x: number, y: number, z: number;
    if (run.phys?.place && run.c) {
      run.phys.place(run.c, i, out);
      x = out[0]; y = out[1]; z = out[2];
    } else if (run.flow === "orbit") {
      const r = a[j] * l.scale * Math.min(1, aspect) * 0.95, ang = v[j];
      x = Math.cos(ang) * r; y = 0; z = Math.sin(ang) * r;
      const inc = a[j + 2], node = a[j + 1];
      const y1 = -z * Math.sin(inc), z1 = z * Math.cos(inc);
      x = x * Math.cos(node) + z1 * Math.sin(node);
      z = -x * Math.sin(node) + z1 * Math.cos(node);
      y = y1;
    } else {
      const r = a[j] * l.scale * Math.min(1, aspect) * 0.95;
      x = Math.cos(a[j + 1]) * r; z = Math.sin(a[j + 1]) * r; y = (a[j] - 0.45) * 0.55 * l.scale + a[j + 2];
    }
    const F = run.f;
    const x1 = x * F.cy + z * F.sy, z1 = -x * F.sy + z * F.cy;
    out[0] = x1 + F.ox;
    out[1] = y * F.cp - z1 * F.sp + F.oy;
    out[2] = y * F.sp + z1 * F.cp;
  }

  /* ---------------------------------------------------------------- morph */
  function morphStep(run: LayerRun) {
    const n = run.homes.length;
    if (n < 2) return;
    const { by, hold, time } = spec.morph;
    if (by === "auto") {
      const cycle = hold + time, phase = t % (cycle * n), idx = Math.floor(phase / cycle), local = phase - idx * cycle;
      run.from = idx;
      run.to = (idx + 1) % n;
      run.k = local < hold ? 0 : (local - hold) / time;
    } else if (by === "scroll") {
      const f = Math.min(n - 1, Math.max(0, scrolled * 1.25 - 0.12) * (n - 1));
      run.from = Math.min(n - 1, Math.floor(f));
      run.to = Math.min(n - 1, run.from + 1);
      run.k = smooth(0.15, 0.85, f - run.from);
    } else if (by === "hover") {
      const want = hovering ? 1 : 0;
      run.from = 0;
      run.to = 1;
      run.k = Math.min(1, Math.max(0, run.k + (want ? 1 : -1) / (60 * time)));
    } else if (run.since >= 0) {
      run.k = Math.min(1, (t - run.since) / time);
      if (run.k >= 1) {
        run.from = run.to;
        run.k = 0;
        run.since = -1;
      }
    }
  }
  const nextForm = () => {
    for (const run of runs) {
      if (run.homes.length < 2 || spec.morph.by !== "click") continue;
      if (run.since >= 0) run.from = run.to;
      run.to = (run.from + 1) % run.homes.length;
      run.since = t;
      run.k = 0;
    }
  };

  /* ---------------------------------------------------------------- one step */
  function step() {
    t += 1 / 60;
    ptr.x += (ptr.tx - ptr.x) * 0.3;
    ptr.y += (ptr.ty - ptr.y) * 0.3;
    const d = camD(), zoom = zoomNow();
    const R = (spec.pointer.radius * 2) / zoom, str = spec.pointer.strength;
    const press = presses.shift();
    if (press && spec.click === "next") nextForm();
    if (press && spec.click === "shock") shock = { ...world(press.x, press.y), t };
    if (press && (spec.click === "burst" || spec.click === "shock")) calm = 0;
    calm = Math.min(1, calm + 1 / 120);
    // Let go after a burst, the particles drift out and are gathered back slowly, not snapped.
    const hold = 0.03 + 0.97 * calm * calm * calm;
    const pw = press ? world(press.x, press.y) : null;
    const shockR = shock ? (t - shock.t) * 2.4 : 0;
    if (shock && shockR > 5) shock = null;
    for (const run of runs) {
      // Where each was before this step (a streak is drawn back to it, so a still frame has them too).
      if (run.streak) (run.prev ??= new Float32Array(run.p.length)).set(run.p);
      morphStep(run);
      frameOf(run);
      if (run.phys) run.phys.step(ctxOf(run, pw));
      else if (run.flow) stepFlow(run);
      const { n, p, v } = run;
      const form = !run.flow;
      const turning = !form && (TURNING.has(run.flow!) || Boolean(run.phys?.turning));
      const hands = run.phys ? run.phys.hands : "push";
      const stiff = (0.05 + 0.03 * Math.min(2, run.l.speed)) * hold;
      for (let i = 0; i < n; i++) {
        const j = i * 3;
        if (form || turning) {
          if (form) place(run, i, tmp);
          else turned(run, i, tmp);
          if (form) {
            v[j] = (v[j] + (tmp[0] - p[j]) * stiff) * 0.86;
            v[j + 1] = (v[j + 1] + (tmp[1] - p[j + 1]) * stiff) * 0.86;
            v[j + 2] = (v[j + 2] + (tmp[2] - p[j + 2]) * stiff) * 0.86;
          } else {
            p[j] = tmp[0]; p[j + 1] = tmp[1]; p[j + 2] = tmp[2];
          }
        }
        // On the screen, at its depth: what the pointer and a press reach.
        const k = d / Math.max(0.05, d - p[j + 2]);
        const sx = p[j] * k, sy = p[j + 1] * k;
        let fx = 0, fy = 0, fz = 0;
        if (ptr.on && spec.pointer.mode === "gravity" && str > 0 && !turning && hands !== "none") {
          // A small sun under the pointer: pulled in by the inverse square, and swung round it.
          const dx = ptr.x - sx, dy = ptr.y - sy, d2 = dx * dx + dy * dy + 0.006, dd = Math.sqrt(d2), g = Math.min(0.05, (str * 0.0012) / d2);
          fx += (dx / dd) * g - (dy / dd) * g * 0.55;
          fy += (dy / dd) * g + (dx / dd) * g * 0.55;
        } else if (ptr.on && spec.pointer.mode !== "none" && str > 0 && !turning && hands !== "none") {
          const dx = sx - ptr.x, dy = sy - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < R * R && d2 > 1e-8) {
            const dd = Math.sqrt(d2), f = (1 - dd / R) * (1 - dd / R) * str * 0.045;
            const ux = dx / dd, uy = dy / dd;
            if (spec.pointer.mode === "repel") { fx += ux * f; fy += uy * f; }
            else if (spec.pointer.mode === "attract") { fx -= ux * f * 0.6; fy -= uy * f * 0.6; }
            else if (spec.pointer.mode === "swirl") { fx += -uy * f; fy += ux * f; }
            else { fz += f * 1.6; fx += ux * f * 0.25; fy += uy * f * 0.25; }
          }
        }
        if (pw && spec.click === "burst" && hands !== "none") {
          const dx = sx - pw.x, dy = sy - pw.y, dd = Math.max(0.02, Math.hypot(dx, dy)), f = (0.09 * Math.max(0.3, str)) / (0.25 + dd);
          fx += (dx / dd) * f; fy += (dy / dd) * f; fz += run.jit[j + 2] * f * 0.8;
        }
        if (shock && hands !== "none") {
          const dx = sx - shock.x, dy = sy - shock.y, dd = Math.max(0.02, Math.hypot(dx, dy)), off = Math.abs(dd - shockR);
          if (off < 0.18) { const f = (1 - off / 0.18) * 0.03 * Math.max(0.3, str); fx += (dx / dd) * f; fy += (dy / dd) * f; fz += f * 0.6; }
        }
        if (form) {
          v[j] += fx; v[j + 1] += fy; v[j + 2] += fz;
          p[j] += v[j]; p[j + 1] += v[j + 1]; p[j + 2] += v[j + 2];
        } else if (!turning && (fx || fy || fz)) {
          if (hands === "speed") {
            // A flock or a body in orbit: the push goes into its speed.
            v[j] += fx * 0.35; v[j + 1] += fy * 0.35;
          } else {
            // A flow is pushed aside where it is.
            p[j] += fx * 6; p[j + 1] += fy * 6; p[j + 2] += fz * 3;
            if (run.flow === "fireworks" || run.flow === "fireflies" || run.flow === "fountain") { v[j] += fx * 0.4; v[j + 1] += fy * 0.4; }
          }
        }
      }
    }
  }

  /* ---------------------------------------------------------------- drawing */
  function fill(run: LayerRun) {
    const { l, n, p, out, seed } = run;
    const tw = l.twinkle;
    const focus = spec.camera.focus * 0.9 * Math.max(0.3, l.scale), blur = spec.camera.blur;
    for (let i = 0; i < n; i++) {
      const j = i * 3, s = seed[i], o5 = i * 5;
      let size = l.size * (1 - l.vary + l.vary * 2 * ((s * 3.7) % 1));
      let alpha = l.opacity;
      if (tw) alpha *= 1 - tw * 0.85 * (0.5 + 0.5 * Math.sin(t * 3 * Math.max(0.3, l.speed) + s * 60));
      if (!run.flow && !FLAT.has(run.l.shapes[0] as GlForm)) alpha *= 0.3 + 0.7 * smooth(-0.95, 0.75, p[j + 2] / Math.max(0.3, l.scale * run.f.fit));
      switch (run.flow) {
        case "rise": alpha *= smooth(-1.2, -0.85, p[j + 1]) * (1 - smooth(0.55, 1.15, p[j + 1])); break;
        case "warp": { const g = 1 - run.a[j + 2]; alpha *= smooth(0, 0.3, g); size *= 0.35 + g * g * 2.6; break; }
        case "fountain": alpha *= run.age[i] < 0 ? 0 : 1 - smooth(-0.6, -1.05, p[j + 1] - l.y); break;
        case "fireworks": {
          const g = run.groups!, k = i % (g.length / 4), age = (t - g[k * 4 + 2]) / (FIREWORK_LIFE / Math.max(0.3, l.speed));
          alpha *= age < 0 ? 0 : Math.pow(Math.max(0, 1 - age), 1.3) * (0.75 + 0.25 * Math.sin(t * 30 + s * 90));
          break;
        }
        case "flow": alpha *= smooth(0, 40, run.age[i]); break;
        case "vortex": alpha *= smooth(0.04, 0.25, run.a[j]); break;
        case "fireflies": alpha *= 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.2 * l.speed + s * 70)); break;
        default:
      }
      if (run.own && run.own[i] > 0) {
        // A size of its own: its radius in the scene's units, in the screen's pixels (never smaller than the layer's).
        size = Math.max(size, run.own[i] * (canvas.clientHeight || canvas.height / dpr || 1) * zoomNow());
      }
      if (run.phys?.look && run.c) {
        const [sm, am] = run.phys.look(run.c, i);
        size *= sm;
        alpha *= am;
      }
      if (blur) {
        // Depth of field: away from the plane in focus, bigger and fainter (a lens's soft circles).
        const off = Math.abs(p[j + 2] - focus);
        size *= 1 + blur * off * 2.6;
        alpha /= 1 + blur * off * 3.2;
      }
      out[o5] = p[j];
      out[o5 + 1] = p[j + 1];
      out[o5 + 2] = p[j + 2];
      out[o5 + 3] = size;
      out[o5 + 4] = alpha;
    }
    if (run.streak) {
      // Each particle a line back along the way it came (its last few steps), bright at its head.
      const prev = run.prev ?? p, sk = run.streak, st = run.stat;
      for (let i = 0; i < n; i++) {
        const j = i * 3, q = i * 14, al = out[i * 5 + 4];
        const tx = p[j] + (prev[j] - p[j]) * 4, ty = p[j + 1] + (prev[j + 1] - p[j + 1]) * 4, tz = p[j + 2] + (prev[j + 2] - p[j + 2]) * 4;
        // A jump (a particle that started again elsewhere) leaves no line across the box.
        const far = Math.abs(tx - p[j]) + Math.abs(ty - p[j + 1]) > 0.8;
        sk[q] = p[j]; sk[q + 1] = p[j + 1]; sk[q + 2] = p[j + 2];
        sk[q + 3] = st[i * 4]; sk[q + 4] = st[i * 4 + 1]; sk[q + 5] = st[i * 4 + 2]; sk[q + 6] = far ? 0 : al;
        sk[q + 7] = far ? p[j] : tx; sk[q + 8] = far ? p[j + 1] : ty; sk[q + 9] = far ? p[j + 2] : tz;
        sk[q + 10] = st[i * 4]; sk[q + 11] = st[i * 4 + 1]; sk[q + 12] = st[i * 4 + 2]; sk[q + 13] = 0;
      }
    }
    if (run.lines && run.lineBuf) {
      const m = Math.min(n, GL_LINK_MAX), L = 0.26 * l.scale, L2 = L * L, lines = run.lines, cap = lines.length / 8;
      let c = 0;
      for (let a = 0; a < m && c < cap; a++) {
        const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2];
        for (let b = a + 1; b < m && c < cap; b++) {
          const dx = p[b * 3] - ax, dy = p[b * 3 + 1] - ay, dz = p[b * 3 + 2] - az, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > L2) continue;
          const al = (1 - Math.sqrt(d2) / L) * l.links * l.opacity * 0.55, q = c * 8;
          lines[q] = ax; lines[q + 1] = ay; lines[q + 2] = az; lines[q + 3] = al;
          lines[q + 4] = p[b * 3]; lines[q + 5] = p[b * 3 + 1]; lines[q + 6] = p[b * 3 + 2]; lines[q + 7] = al;
          c++;
        }
      }
      run.lineCount = c;
    }
  }
  const setView = (p: WebGLProgram) => {
    G.uniform1f(u(p, "u_zoom"), zoomNow());
    G.uniform1f(u(p, "u_aspect"), aspect);
    G.uniform1f(u(p, "u_d"), camD());
  };
  const attrib = (p: WebGLProgram, name: string, buf: WebGLBuffer, n: number, stride: number, offset: number) => {
    const loc = G.getAttribLocation(p, name);
    if (loc < 0) return -1;
    G.bindBuffer(G.ARRAY_BUFFER, buf);
    G.enableVertexAttribArray(loc);
    G.vertexAttribPointer(loc, n, G.FLOAT, false, stride, offset);
    return loc;
  };
  function drawLayers() {
    for (const run of runs) {
      G.blendFunc(G.ONE, run.l.glow ? G.ONE : G.ONE_MINUS_SRC_ALPHA);
      if (run.lineBuf && run.lineCount) {
        G.useProgram(lineProg!);
        setView(lineProg!);
        const c = run.colours[0];
        G.uniform3f(u(lineProg!, "u_col"), c[0], c[1], c[2]);
        G.bindBuffer(G.ARRAY_BUFFER, run.lineBuf);
        G.bufferData(G.ARRAY_BUFFER, run.lines!.subarray(0, run.lineCount * 8), G.DYNAMIC_DRAW);
        const a = attrib(lineProg!, "a_p", run.lineBuf, 3, 16, 0), b = attrib(lineProg!, "a_a", run.lineBuf, 1, 16, 12);
        G.drawArrays(G.LINES, 0, run.lineCount * 2);
        if (a >= 0) G.disableVertexAttribArray(a);
        if (b >= 0) G.disableVertexAttribArray(b);
      }
      if (run.streak && run.streakBuf && streakProg) {
        G.useProgram(streakProg);
        setView(streakProg);
        G.bindBuffer(G.ARRAY_BUFFER, run.streakBuf);
        G.bufferData(G.ARRAY_BUFFER, run.streak, G.DYNAMIC_DRAW);
        const a = attrib(streakProg, "a_p", run.streakBuf, 3, 28, 0), b = attrib(streakProg, "a_c", run.streakBuf, 4, 28, 12);
        G.drawArrays(G.LINES, 0, run.n * 2);
        if (a >= 0) G.disableVertexAttribArray(a);
        if (b >= 0) G.disableVertexAttribArray(b);
        continue;
      }
      const P = pointProg!;
      G.useProgram(P);
      setView(P);
      G.uniform1f(u(P, "u_dpr"), dpr);
      G.uniform1f(u(P, "u_max"), maxPoint);
      G.uniform1f(u(P, "u_time"), t);
      G.uniform1f(u(P, "u_glyphs"), run.glyphs);
      G.uniform1f(u(P, "u_rate"), 3 * Math.max(0.2, run.l.speed));
      G.uniform1f(u(P, "u_halo"), !run.atlas && (run.l.sprite === "soft" || run.l.sprite === "spark") ? 2.3 : 1);
      G.uniform1f(u(P, "u_sprite"), run.atlas ? 8 : SPRITE_NO[run.l.sprite] === 8 ? 0 : SPRITE_NO[run.l.sprite]);
      // Its glyphs, or no texture at all: the trails' own texture left bound while drawing into it is refused.
      G.activeTexture(G.TEXTURE0);
      G.bindTexture(G.TEXTURE_2D, run.atlas);
      G.uniform1i(u(P, "u_atlas"), 0);
      G.bindBuffer(G.ARRAY_BUFFER, run.dyn);
      G.bufferData(G.ARRAY_BUFFER, run.out, G.DYNAMIC_DRAW);
      const locs = [attrib(P, "a_p", run.dyn, 3, 20, 0), attrib(P, "a_s", run.dyn, 1, 20, 12), attrib(P, "a_a", run.dyn, 1, 20, 16), attrib(P, "a_c", run.st, 4, 16, 0)];
      G.drawArrays(G.POINTS, 0, run.n);
      for (const l of locs) if (l >= 0) G.disableVertexAttribArray(l);
    }
  }
  function draw() {
    frames++;
    if (G.isContextLost()) return;
    for (const run of runs) fill(run);
    const outFb = sceneTarget?.fb ?? null;
    G.bindFramebuffer(G.FRAMEBUFFER, outFb);
    G.viewport(0, 0, w, h);
    G.disable(G.BLEND);
    if (spec.bg.kind === "none") {
      G.clearColor(0, 0, 0, 0);
      G.clear(G.COLOR_BUFFER_BIT);
    } else if (shaderProg && bgTarget) {
      G.bindFramebuffer(G.FRAMEBUFFER, bgTarget.fb);
      G.viewport(0, 0, bgTarget.w, bgTarget.h);
      G.useProgram(shaderProg);
      G.uniform1f(u(shaderProg, "u_time"), t * spec.bg.speed + 6);
      G.uniform2f(u(shaderProg, "u_res"), bgTarget.w, bgTarget.h);
      G.uniform2f(u(shaderProg, "u_mouse"), ptr.on ? (ptr.x * zoomNow()) / aspect * 0.5 + 0.5 : 0.5, ptr.on ? ptr.y * zoomNow() * 0.5 + 0.5 : 0.5);
      G.uniform3fv(u(shaderProg, "u_bg"), bgc[0]);
      G.uniform3fv(u(shaderProg, "u_c1"), bgc[1]);
      G.uniform3fv(u(shaderProg, "u_c2"), bgc[2]);
      G.uniform3fv(u(shaderProg, "u_c3"), bgc[3]);
      G.uniform1f(u(shaderProg, "u_rainbow"), (spec.bg.rainbow ?? Boolean(shaderDef?.rainbow)) ? 1 : 0);
      drawQuad(shaderProg);
      G.bindFramebuffer(G.FRAMEBUFFER, outFb);
      G.viewport(0, 0, w, h);
      G.useProgram(copyProg!);
      G.activeTexture(G.TEXTURE0);
      G.bindTexture(G.TEXTURE_2D, bgTarget.tex);
      G.uniform1i(u(copyProg!, "u_t"), 0);
      drawQuad(copyProg!);
    } else {
      G.useProgram(plainProg!);
      G.uniform3fv(u(plainProg!, "u_a"), bgc[0]);
      G.uniform3fv(u(plainProg!, "u_b"), bgc[1]);
      G.uniform1f(u(plainProg!, "u_kind"), spec.bg.kind === "gradient" ? 1 : spec.bg.kind === "radial" ? 2 : 0);
      G.uniform2f(u(plainProg!, "u_res"), w, h);
      drawQuad(plainProg!);
    }
    G.enable(G.BLEND);
    if (trailTarget) {
      // The trails: what was drawn before fades a little, then the particles are drawn over it.
      G.bindFramebuffer(G.FRAMEBUFFER, trailTarget.fb);
      G.viewport(0, 0, trailTarget.w, trailTarget.h);
      G.useProgram(fillProg!);
      G.blendFunc(G.ZERO, G.SRC_ALPHA);
      G.uniform4f(u(fillProg!, "u_col"), 0, 0, 0, spec.trails);
      drawQuad(fillProg!);
      // Eight bits never fade to nothing by multiplying: a little is taken off too.
      G.blendEquation(G.FUNC_REVERSE_SUBTRACT);
      G.blendFunc(G.ONE, G.ONE);
      const off = 2 / 255;
      G.uniform4f(u(fillProg!, "u_col"), off, off, off, off);
      drawQuad(fillProg!);
      G.blendEquation(G.FUNC_ADD);
      drawLayers();
      G.bindFramebuffer(G.FRAMEBUFFER, outFb);
      G.viewport(0, 0, w, h);
      G.blendFunc(G.ONE, G.ONE_MINUS_SRC_ALPHA);
      G.useProgram(copyProg!);
      G.activeTexture(G.TEXTURE0);
      G.bindTexture(G.TEXTURE_2D, trailTarget.tex);
      G.uniform1i(u(copyProg!, "u_t"), 0);
      drawQuad(copyProg!);
    } else drawLayers();
    if (sceneTarget && finalProg) finish(sceneTarget);
  }
  /** Bloom and colour fringes over the scene drawn off the screen, onto the screen. */
  function finish(scene: Target) {
    G.disable(G.BLEND);
    const tex = (unit: number, t: WebGLTexture | null) => {
      G.activeTexture(G.TEXTURE0 + unit);
      G.bindTexture(G.TEXTURE_2D, t);
    };
    if (blurA && blurB && brightProg && blurProg) {
      G.bindFramebuffer(G.FRAMEBUFFER, blurA.fb);
      G.viewport(0, 0, blurA.w, blurA.h);
      tex(0, scene.tex);
      G.useProgram(brightProg);
      G.uniform1i(u(brightProg, "u_t"), 0);
      drawQuad(brightProg);
      for (let pass = 0; pass < 2; pass++) {
        for (const [from, to, dx, dy] of [[blurA, blurB, 1, 0], [blurB, blurA, 0, 1]] as const) {
          G.bindFramebuffer(G.FRAMEBUFFER, to.fb);
          tex(0, from.tex);
          G.useProgram(blurProg);
          G.uniform1i(u(blurProg, "u_t"), 0);
          G.uniform2f(u(blurProg, "u_dir"), (dx * (1 + pass)) / from.w, (dy * (1 + pass)) / from.h);
          drawQuad(blurProg);
        }
      }
    }
    G.bindFramebuffer(G.FRAMEBUFFER, null);
    G.viewport(0, 0, w, h);
    tex(0, scene.tex);
    tex(1, (blurA ?? scene).tex);
    G.useProgram(finalProg!);
    G.uniform1i(u(finalProg!, "u_s"), 0);
    G.uniform1i(u(finalProg!, "u_b"), 1);
    G.uniform1f(u(finalProg!, "u_k"), blurA ? spec.bloom * 1.6 : 0);
    G.uniform1f(u(finalProg!, "u_chroma"), spec.chroma);
    drawQuad(finalProg!);
    // Nothing left bound that the next frame draws into.
    tex(1, null);
    G.activeTexture(G.TEXTURE0);
    G.enable(G.BLEND);
  }
  function warm(seconds: number) {
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) step();
    stillAt = t;
    draw();
  }
  /** Words and pictures fitted again when the box changes its shape. */
  const refit = () => {
    for (const run of runs) {
      if (run.flow || Math.abs(run.fitAspect - aspect) / aspect < 0.03) continue;
      run.fitAspect = aspect;
      forms(run.l).forEach((f, i) => {
        if (f === "text" || f === "image") run.homes[i] = fitted(run, f, run.n, i);
      });
      ownSizes(run);
    }
  };

  const runs: LayerRun[] = spec.layers.map((l, li) => {
    const flow = isFlow(l.shapes[0]) ? (l.shapes[0] as GlFlow) : null;
    const phys = flow ? PHYSICS[flow] ?? null : null;
    const n = Math.min(phys?.cap ?? Infinity, Math.max(50, Math.round(l.count * scale)));
    const rand = rng(0x9e3779b1 ^ (li * 7919 + n));
    const seed = new Float32Array(n), jit = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      seed[i] = rand();
      const th = Math.acos(2 * rand() - 1), ph = Math.PI * 2 * rand();
      jit[i * 3] = Math.sin(th) * Math.cos(ph);
      jit[i * 3 + 1] = Math.cos(th);
      jit[i * 3 + 2] = Math.sin(th) * Math.sin(ph);
    }
    const colours = [0, 1, 2].map((k) => o.colours.layers[li]?.[k] ?? LAYER_COLOURS[k]);
    const run: LayerRun = {
      l, n, flow, homes: [], rand, seed, jit,
      p: new Float32Array(n * 3), v: new Float32Array(n * 3), a: new Float32Array(n * 3), age: new Float32Array(n),
      out: new Float32Array(n * 5), stat: new Float32Array(n * 4), dyn: G.createBuffer()!, st: G.createBuffer()!,
      lines: null, lineBuf: null, lineCount: 0, atlas: null, glyphs: 0, colours,
      from: 0, to: 0, k: 0, since: -1, groups: null, round: null, fitAspect: aspect,
      f: { fit: 1, k: 1, cy: 1, sy: 0, cp: 1, sp: 0, ox: 0, oy: 0, apart: 0 },
      phys, mem: {}, c: null, own: null,
      prev: null, streak: l.sprite === "streak" ? new Float32Array(n * 14) : null, streakBuf: l.sprite === "streak" ? G.createBuffer() : null,
    };
    if (!flow) forms(l).forEach((f, i) => run.homes.push(f === "text" || f === "image" ? fitted(run, f, n, i) : { pos: formPoints(f, n, rand), unit: true }));
    ownSizes(run);
    if (l.links > 0) {
      const m = Math.min(n, GL_LINK_MAX);
      run.lines = new Float32Array(Math.min(6000, (m * (m - 1)) / 2) * 8);
      run.lineBuf = G.createBuffer();
    }
    if (l.sprite === "glyph") {
      const at = glyphAtlas(l.glyphs || "0123456789ABCDEF", familyOf(l.font === "page" ? "mono" : l.font));
      if (at) { run.atlas = at.tex; run.glyphs = at.n; }
    }
    colour(run);
    if (l.colouring === "picture") {
      const pic = run.homes.find((h) => h.col);
      if (pic?.col) pictureColours(run, pic.col);
    }
    frameOf(run);
    startFlow(run);
    // A form gathers into its first place from all round.
    if (!flow) {
      placeAll(run);
      for (let i = 0; i < n * 3; i++) run.p[i] += jit[i] * 1.3;
    }
    G.bindBuffer(G.ARRAY_BUFFER, run.st);
    G.bufferData(G.ARRAY_BUFFER, run.stat, G.STATIC_DRAW);
    G.bindBuffer(G.ARRAY_BUFFER, run.dyn);
    G.bufferData(G.ARRAY_BUFFER, run.out, G.DYNAMIC_DRAW);
    return run;
  });
  const total = runs.reduce((s, r) => s + r.n, 0);

  return {
    frame(seconds: number) {
      if (dead) return;
      if (last < 0) last = seconds;
      const steps = Math.min(3, Math.max(0, Math.round((seconds - last) * 60)));
      last += steps / 60;
      if (seconds - last > 0.25) last = seconds;
      for (let i = 0; i < steps; i++) step();
      draw();
    },
    warm,
    resize() {
      size();
      refit();
      if (stillAt !== null) draw();
    },
    pointer(x, y) {
      if (x === null || y === null) { ptr.on = false; return; }
      const p = world(x, y);
      if (!ptr.on) { ptr.x = p.x; ptr.y = p.y; }
      ptr.on = true;
      ptr.tx = p.x;
      ptr.ty = p.y;
    },
    press(x, y) {
      presses.push({ x, y });
      if (presses.length > 4) presses.shift();
    },
    drag(dx, dy) {
      yawDrag += (dx / Math.max(1, canvas.clientWidth)) * Math.PI * 1.4;
      pitchDrag = Math.max(-1.3, Math.min(1.3, pitchDrag + (dy / Math.max(1, canvas.clientHeight)) * Math.PI));
    },
    scroll(progress) {
      scrolled = Math.min(1, Math.max(0, progress));
    },
    hover(on) {
      hovering = on;
    },
    sample() {
      const d = camD(), z = zoomNow();
      return runs.map((run) => {
        let sx = 0, sy = 0, inside = 0;
        const pts: Array<[number, number]> = [];
        for (let i = 0; i < run.n; i++) {
          const k = d / Math.max(0.05, d - run.p[i * 3 + 2]);
          const x = ((run.p[i * 3] * z * k) / aspect) * 0.5 + 0.5, y = 0.5 - run.p[i * 3 + 1] * z * k * 0.5;
          pts.push([x, y]);
          sx += x; sy += y;
          if (x >= 0 && x <= 1 && y >= 0 && y <= 1) inside++;
        }
        const cx = sx / run.n, cy = sy / run.n;
        const spread = Math.sqrt(pts.reduce((s, [x, y]) => s + (x - cx) ** 2 + (y - cy) ** 2, 0) / run.n);
        return { n: run.n, cx, cy, inside: inside / run.n, spread };
      });
    },
    stats() {
      return { t, queued: presses.length, frames };
    },
    near(x, y, r) {
      const d = camD(), z = zoomNow();
      let inside = 0;
      for (const run of runs) {
        for (let i = 0; i < run.n; i++) {
          const k = d / Math.max(0.05, d - run.p[i * 3 + 2]);
          const sx = ((run.p[i * 3] * z * k) / aspect) * 0.5 + 0.5, sy = 0.5 - run.p[i * 3 + 1] * z * k * 0.5;
          if (Math.hypot((sx - x) * aspect, sy - y) < r) inside++;
        }
      }
      return inside / Math.max(1, total);
    },
    get particles() {
      return total;
    },
    dispose() {
      dead = true;
      for (const img of images) img.onload = null;
      dropTarget(bgTarget);
      dropTarget(trailTarget);
      G.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
