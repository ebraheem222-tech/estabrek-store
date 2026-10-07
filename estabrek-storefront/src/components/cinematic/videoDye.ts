/**
 * Dyes the campaign clip in the shopper's colour, live, in WebGL.
 *
 * Before, two CSS blend layers (mix-blend-mode: color + multiply) sat over the
 * video. A blend over a playing or scrubbed video makes the graphics card draw the
 * whole frame again into a separate surface and blend it, on every frame, and the
 * browser can no longer hand the video straight to the screen: with any colour
 * picked the clip stuttered, with none it was smooth. Here each new frame is drawn
 * once into a canvas with the colour already in it (same "color" blend and depth as
 * the opening film, filmCutout.ts). With no colour picked nothing runs at all and
 * the plain video shows.
 */

const VERT = `
attribute vec2 p;
uniform vec4 crop;   // x, y, width, height of the shown part of the frame (0..1)
varying vec2 uv;
void main() {
  vec2 t = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  uv = crop.xy + t * crop.zw;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D frame;
uniform vec3 tint;
uniform float amount;
varying vec2 uv;
float lum(vec3 c) { return dot(c, vec3(0.3, 0.59, 0.11)); }
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
  // Deep colours also darken the fabric towards their own depth (navy was pale lavender).
  float depth = clamp(lum(tint) / 0.5, 0.32, 1.0);
  gl_FragColor = vec4(mix(c, setLum(tint, lum(c) * depth), amount), 1.0);
}`;

export type VideoDye = {
  /** Dye in a colour (glides there), or back to the clip's own colours with null. */
  setTint: (hex: string | null) => void;
  stop: () => void;
};

type VideoWithFrames = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

/**
 * Draw `video` dyed into `canvas` (laid over the video, same box). `onShown` reports
 * whether the canvas has a dyed frame worth showing. Returns null without WebGL.
 */
export function startVideoDye(video: HTMLVideoElement, canvas: HTMLCanvasElement, onShown: (on: boolean) => void): VideoDye | null {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const program = gl.createProgram()!;
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const uTint = gl.getUniformLocation(program, "tint");
  const uAmount = gl.getUniformLocation(program, "amount");
  const uCrop = gl.getUniformLocation(program, "crop");
  const tint = { now: [1, 1, 1] as number[], to: [1, 1, 1] as number[], amount: 0, amountTo: 0 };

  const v = video as VideoWithFrames;
  let alive = true;
  let hasFrame = false;
  let shown = false;
  let vfc = 0;
  let raf = 0;
  let tintFrame = 0;
  // The part of the frame the video shows (object-fit: cover, centred) in a box of this size.
  let box = { w: 0, h: 0 };
  const fit = () => {
    const w = v.clientWidth, h = v.clientHeight;
    if (!w || !h || !v.videoWidth) return;
    box = { w, h };
    const boxAspect = w / h, frameAspect = v.videoWidth / v.videoHeight;
    let cw = 1, ch = 1;
    if (frameAspect > boxAspect) cw = boxAspect / frameAspect; else ch = frameAspect / boxAspect;
    gl.uniform4f(uCrop, (1 - cw) / 2, (1 - ch) / 2, cw, ch);
    // Enough pixels for the box on this screen, never more than the frame itself has.
    const scale = Math.min(Math.min(2, window.devicePixelRatio || 1), (v.videoWidth * cw) / w);
    const cwPx = Math.max(1, Math.round(w * scale)), chPx = Math.max(1, Math.round(h * scale));
    if (canvas.width !== cwPx || canvas.height !== chPx) {
      canvas.width = cwPx;
      canvas.height = chPx;
      gl.viewport(0, 0, cwPx, chPx);
    }
  };
  const paint = () => {
    gl.uniform3f(uTint, tint.now[0], tint.now[1], tint.now[2]);
    gl.uniform1f(uAmount, tint.amount);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const dyed = () => tint.amountTo > 0 || tint.amount > 0.002;
  const show = (on: boolean) => { if (on !== shown) { shown = on; onShown(on); } };
  /** A new frame of the clip (only while a colour is on). */
  const draw = () => {
    if (!alive || !dyed() || v.readyState < 2 || !v.videoWidth) return;
    if (v.clientWidth !== box.w || v.clientHeight !== box.h || !canvas.width) fit();
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v);
    } catch {
      return;
    }
    hasFrame = true;
    // Same zoom as the clip (the scroll scene scales the video).
    if (canvas.style.transform !== v.style.transform) canvas.style.transform = v.style.transform;
    paint();
    show(true);
  };
  // While the clip plays by itself, follow its frames; scrolled, each seek redraws.
  const follow = () => {
    if (!alive || v.paused || !dyed()) return;
    draw();
    if (v.requestVideoFrameCallback) vfc = v.requestVideoFrameCallback(follow);
    else raf = requestAnimationFrame(follow);
  };
  const onPlay = () => follow();
  const events: [string, () => void][] = [["seeked", draw], ["loadeddata", draw], ["play", onPlay]];
  events.forEach(([e, f]) => v.addEventListener(e, f));
  const resized = new ResizeObserver(() => { box = { w: 0, h: 0 }; if (hasFrame && dyed()) draw(); });
  resized.observe(v);
  const lost = (e: Event) => { e.preventDefault(); show(false); };
  canvas.addEventListener("webglcontextlost", lost);

  let last = 0;
  const glide = (t: number) => {
    const dt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 60;
    last = t;
    const k = 1 - Math.exp(-dt / 0.25);
    let moving = Math.abs(tint.amountTo - tint.amount) > 0.002;
    tint.amount += (tint.amountTo - tint.amount) * k;
    for (let i = 0; i < 3; i++) {
      const d = tint.to[i] - tint.now[i];
      if (Math.abs(d) > 0.002) moving = true;
      tint.now[i] += d * k;
    }
    if (!moving && tint.amountTo === 0) tint.amount = 0;
    if (hasFrame && alive) paint();
    tintFrame = moving && alive ? requestAnimationFrame(glide) : 0;
    if (!tintFrame) {
      last = 0;
      // Back to its own colours: the plain video shows again and nothing is drawn.
      if (!dyed()) { show(false); hasFrame = false; }
    }
  };
  const setTint = (hex: string | null) => {
    if (hex && /^#[0-9a-f]{6}$/i.test(hex)) {
      const rgb = toRgb(hex);
      if (tint.amount < 0.01) tint.now = [...rgb];
      tint.to = rgb;
      tint.amountTo = 0.85;
      draw();
      if (!v.paused) follow();
    } else tint.amountTo = 0;
    if (!tintFrame) tintFrame = requestAnimationFrame(glide);
  };
  const stop = () => {
    alive = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(tintFrame);
    if (vfc && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(vfc);
    events.forEach(([e, f]) => v.removeEventListener(e, f));
    resized.disconnect();
    canvas.removeEventListener("webglcontextlost", lost);
    show(false);
  };
  return { setTint, stop };
}
