import { isNearWhite } from "@/lib/storefrontPalette";

/**
 * Takes the black background out of the opening film, live.
 *
 * The clip is a scarf filmed on pure black. Every frame is drawn into a small
 * WebGL canvas where the shader turns "how far from black" into transparency
 * (soft at the edges, solid on the fabric) and lifts the colour back so the
 * edges keep no dark halo. The scarf then floats on the page itself, in every
 * browser, from the same video file. Frames are only redrawn when the film
 * moves (a scroll seek, or while it plays), so a still film costs nothing.
 */

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D frame;
uniform vec3 tint;     // the shopper's colour
uniform float amount;  // 0 = the scarf's own pastel, 1 = fully in her colour
varying vec2 uv;
float lum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }
// The "color" blend: the colour's hue and saturation with the fabric's own light and shade.
vec3 clipColor(vec3 c) {
  float l = lum(c);
  float n = min(min(c.r, c.g), c.b);
  float x = max(max(c.r, c.g), c.b);
  if (n < 0.0) c = l + (c - l) * l / (l - n + 1e-4);
  if (x > 1.0) c = l + (c - l) * (1.0 - l) / (x - l + 1e-4);
  return c;
}
vec3 setLum(vec3 c, float l) { return clipColor(c + (l - lum(c))); }
void main() {
  vec3 c = texture2D(frame, uv).rgb;
  float m = max(max(c.r, c.g), c.b);
  float a = smoothstep(0.02, 0.25, m);          // near-black -> clear, fabric -> solid
  vec3 col = clamp(c / max(a, 0.001), 0.0, 1.0); // undo the black that was mixed into soft edges
  col = pow(col, vec3(0.86)) * vec3(1.03, 0.995, 1.0); // a touch brighter and warmer on the light page
  // Dyed in her colour. The "color" blend keeps the fabric's own (light) shade, so a deep
  // pick (wine, navy, black, bottle green) came out as its pastel: wine looked pink.
  // Deep colours also darken the fabric, towards their own depth.
  float depth = clamp(lum(tint) / 0.5, 0.32, 1.0);
  col = mix(col, setLum(tint, lum(col) * depth), amount);
  // Whatever reaches the edge of the frame fades out instead of being cut (was a CSS
  // mask on the canvas: the graphics card had to mask the whole, large, moving film
  // again on every frame of the scroll).
  a *= 1.0 - clamp((length((uv - 0.5) * 2.0) - 0.72) / 0.28, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a);                // premultiplied
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
  return s;
}

type VideoWithFrames = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

export type FilmCutout = {
  stop: () => void;
  /** Dye the scarf in a colour (glides there), or back to its own pastel with null. */
  setTint: (hex: string | null) => void;
  /** The current frame (dyed, without its black) cropped to the scarf, as a plain canvas. */
  snapshot: () => HTMLCanvasElement | null;
};

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

/** Start drawing `video` without its black into `canvas`. Returns null without WebGL. */
export function startFilmCutout(video: HTMLVideoElement, canvas: HTMLCanvasElement, onLost: () => void): FilmCutout | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  let program: WebGLProgram;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.clearColor(0, 0, 0, 0);
  const uTint = gl.getUniformLocation(program, "tint");
  const uAmount = gl.getUniformLocation(program, "amount");
  const tint = { now: [1, 1, 1] as number[], to: [1, 1, 1] as number[], amount: 0, amountTo: 0 };
  gl.uniform3f(uTint, 1, 1, 1);
  gl.uniform1f(uAmount, 0);
  let hasFrame = false;

  const v = video as VideoWithFrames;
  let alive = true;
  let raf = 0;
  let vfc = 0;
  const paint = () => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const draw = () => {
    if (!alive || v.readyState < 2 || !v.videoWidth) return;
    if (canvas.width !== v.videoWidth || canvas.height !== v.videoHeight) {
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v);
    } catch {
      return;
    }
    hasFrame = true;
    paint();
    canvas.dataset.ready = "true";
  };
  // The colour glides (about half a second); the current frame is simply painted again.
  let tintFrame = 0;
  let last = 0;
  const glide = (t: number) => {
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 60;
    last = t;
    const k = 1 - Math.exp(-dt / 0.16);
    let moving = Math.abs(tint.amountTo - tint.amount) > 0.002;
    tint.amount += (tint.amountTo - tint.amount) * k;
    for (let i = 0; i < 3; i++) {
      const d = tint.to[i] - tint.now[i];
      if (Math.abs(d) > 0.002) moving = true;
      tint.now[i] += d * k;
    }
    gl.uniform3f(uTint, tint.now[0], tint.now[1], tint.now[2]);
    gl.uniform1f(uAmount, tint.amount);
    if (hasFrame && alive) paint();
    tintFrame = moving && alive ? requestAnimationFrame(glide) : 0;
    if (!tintFrame) last = 0;
  };
  // While the film plays by itself, follow its frames; when scrolled, each seek redraws.
  const follow = () => {
    if (!alive || v.paused) return;
    draw();
    if (v.requestVideoFrameCallback) vfc = v.requestVideoFrameCallback(follow);
    else raf = requestAnimationFrame(follow);
  };
  const onPlay = () => follow();
  const events: [string, () => void][] = [["seeked", draw], ["loadeddata", draw], ["play", onPlay]];
  events.forEach(([e, f]) => v.addEventListener(e, f));
  const lost = (e: Event) => { e.preventDefault(); onLost(); };
  canvas.addEventListener("webglcontextlost", lost);
  draw();
  if (!v.paused) follow();
  const stop = () => {
    alive = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(tintFrame);
    if (vfc && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(vfc);
    events.forEach(([e, f]) => v.removeEventListener(e, f));
    canvas.removeEventListener("webglcontextlost", lost);
  };
  const setTint = (hex: string | null) => {
    // White/ivory would only turn the scarf grey: it keeps its own colour.
    if (hex && /^#[0-9a-f]{6}$/i.test(hex) && !isNearWhite(hex)) {
      const rgb = toRgb(hex);
      // Start from the colour itself when the scarf was still its own pastel.
      if (tint.amount < 0.01) tint.now = [...rgb];
      tint.to = rgb;
      tint.amountTo = 0.85;
    } else tint.amountTo = 0;
    if (!tintFrame) tintFrame = requestAnimationFrame(glide);
  };
  const snapshot = () => {
    if (!alive) return null;
    draw();
    if (!hasFrame || !canvas.width) return null;
    // The WebGL picture is only readable in the same task it was drawn in.
    paint();
    try {
      // Find the scarf on a small copy, then cut it out of the full frame.
      const probe = document.createElement("canvas");
      probe.width = 128;
      probe.height = 72;
      const pc = probe.getContext("2d", { willReadFrequently: true })!;
      pc.drawImage(canvas, 0, 0, 128, 72);
      const px = pc.getImageData(0, 0, 128, 72).data;
      let x0 = 128, y0 = 72, x1 = -1, y1 = -1;
      for (let y = 0; y < 72; y++) for (let x = 0; x < 128; x++) {
        if (px[(y * 128 + x) * 4 + 3] < 40) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (x1 < 0) return null;
      const sx = canvas.width / 128, sy = canvas.height / 72;
      const left = Math.max(0, (x0 - 2) * sx), top = Math.max(0, (y0 - 2) * sy);
      const w = Math.min(canvas.width, (x1 + 3) * sx) - left, h = Math.min(canvas.height, (y1 + 3) * sy) - top;
      const k = Math.min(1, 480 / Math.max(w, h));
      const out = document.createElement("canvas");
      out.width = Math.round(w * k);
      out.height = Math.round(h * k);
      out.getContext("2d")!.drawImage(canvas, left, top, w, h, 0, 0, out.width, out.height);
      return out;
    } catch {
      return null;
    }
  };
  return { stop, setTint, snapshot };
}
