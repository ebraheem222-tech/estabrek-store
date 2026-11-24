/**
 * The owner's theme library's WebGL backgrounds (its Premium sections and Diamond sites, docs/themes-library-plan.ar.md
 * phase 3), made the editor's own: each shader's colours are the section's to choose (u_bg, u_c1, u_c2, u_c3, the
 * originals by default), a rainbow one can take the owner's colours instead (u_rainbow 0), and it follows the
 * pointer (u_mouse, 0…1). Plain strings, no imports: the shop draws them (ShaderView.tsx) and the admin's panel
 * makes its pictures from them, by path.
 */

/** What every shader gets: time, size, pointer, the colours; noise; a palette of the colours, or the rainbow. */
export const SHADER_HEAD = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_bg;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform float u_rainbow;
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
vec3 pal(float x){
  x = fract(x) * 3.0;
  if (x < 1.0) return mix(u_c1, u_c2, smoothstep(0.0, 1.0, x));
  if (x < 2.0) return mix(u_c2, u_c3, smoothstep(0.0, 1.0, x - 1.0));
  return mix(u_c3, u_c1, smoothstep(0.0, 1.0, x - 2.0));
}
vec3 hue(float x, vec3 ph){ return mix(pal(x), 0.5 + 0.5 * cos(6.2831 * (x + ph)), u_rainbow); }
`;

export type ShaderDef = {
  /** The original colours: background, then three. */
  bg: string; c1: string; c2: string; c3: string;
  /** Drawn in a rainbow by default (the colours take its place when it's off). */
  rainbow?: boolean;
  frag: string;
};

export const SHADERS: Record<string, ShaderDef> = {
  aurora: { bg: "#05030f", c1: "#6b24f2", c2: "#00d9f2", c3: "#ff5c9e", frag: `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv; p.x *= u_res.x / u_res.y;
  float t = u_time * 0.06;
  vec2 m = (u_mouse - 0.5) * 0.5;
  vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 - t + 4.0));
  vec2 r = vec2(fbm(p * 1.2 + q * 2.0 + m + vec2(1.7, 9.2) + t * 1.5), fbm(p * 1.2 + q * 2.0 - m + vec2(8.3, 2.8) - t));
  float f = fbm(p + r * 1.6);
  vec3 col = u_bg;
  col = mix(col, u_c1, smoothstep(0.2, 0.7, f));
  col = mix(col, u_c2, smoothstep(0.4, 0.9, r.x) * 0.85);
  col = mix(col, u_c3, smoothstep(0.5, 0.95, r.y * f * 1.7) * 0.8);
  col *= 0.45 + 0.85 * uv.y;
  col += 0.12 * mix(u_c1, vec3(1.0), 0.4) * smoothstep(0.35, 0.0, distance(uv, u_mouse));
  gl_FragColor = vec4(col, 1.0);
}` },
  plasma: { bg: "#030008", c1: "#bf40ff", c2: "#3399ff", c3: "#8ce6ff", frag: `
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  uv -= (u_mouse - 0.5) * 0.12;
  float r = length(uv);
  float R = 0.3;
  float t = u_time;
  vec3 col = u_bg;
  float a = atan(uv.y, uv.x);
  float cor = fbm(vec2(a * 2.0 + t * 0.25, r * 7.0 - t * 0.9));
  float halo = exp(-max(r - R, 0.0) * 8.0);
  col += u_c1 * halo * (0.25 + 0.75 * cor) * step(R, r);
  col += u_c2 * exp(-max(r - R, 0.0) * 30.0) * 0.6 * step(R, r);
  if (r < R) {
    float z = sqrt(R * R - r * r) / R;
    vec3 n = normalize(vec3(uv / R, z));
    vec2 q = n.xy * 2.2 + vec2(t * 0.12, 0.0);
    float f = fbm(q * 1.6 + vec2(t * 0.25, -t * 0.2) + fbm(q * 3.0 - t * 0.3));
    float veins = pow(1.0 - abs(f * 2.0 - 1.0), 7.0);
    vec3 base = mix(u_c1 * 0.25, u_c1, f);
    base += u_c3 * veins * 1.4;
    float rim = pow(1.0 - z, 2.0);
    col = base * (0.3 + 0.7 * z) + rim * mix(u_c1, vec3(1.0), 0.5) * 1.2;
  }
  float s = hash(floor(gl_FragCoord.xy * 0.5));
  col += step(0.997, s) * 0.5 * step(R + 0.08, r);
  gl_FragColor = vec4(col, 1.0);
}` },
  ocean: { bg: "#291752", c1: "#ff8552", c2: "#ffc780", c3: "#0a0f2e", frag: `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  float hz = 0.4;
  float t = u_time;
  vec2 sun = vec2(0.5 + (u_mouse.x - 0.5) * 0.35, hz + 0.1 + (u_mouse.y - 0.5) * 0.08);
  vec3 col;
  if (uv.y > hz) {
    float h = (uv.y - hz) / (1.0 - hz);
    col = mix(u_c1, u_bg, pow(h, 0.55));
    float d = length((uv - sun) * vec2(asp, 1.0));
    col += u_c2 * smoothstep(0.075, 0.07, d);
    col += u_c1 * 0.9 * exp(-d * 5.0) * 0.55;
    float c = fbm(vec2(uv.x * asp * 1.6 + t * 0.012, uv.y * 7.0));
    col = mix(col, mix(u_c1, u_c2, 0.3), smoothstep(0.55, 0.85, c) * 0.4 * h);
  } else {
    float dy = hz - uv.y;
    float z = 0.06 / (dy + 0.004);
    vec2 p = vec2((uv.x - 0.5) * asp * z, z);
    float w = fbm(p * vec2(1.4, 3.0) + vec2(0.0, t * 0.5)) + 0.5 * fbm(p * 4.0 - vec2(t * 0.35, 0.0));
    vec3 near = mix(u_c3, u_c1, 0.25);
    col = mix(near, u_c3, smoothstep(0.0, 0.35, dy));
    col = mix(col, u_c1 * 0.9, pow(1.0 - dy / hz, 14.0) * 0.7);
    float rx = abs((uv.x - sun.x) * asp);
    float glint = smoothstep(0.62, 1.05, w) * exp(-rx * (4.0 + dy * 12.0));
    col += u_c2 * glint * 2.0;
    col += u_bg * 0.4 * w;
  }
  gl_FragColor = vec4(col, 1.0);
}` },
  ink: { bg: "#f5ede0", c1: "#0f1442", c2: "#d13829", c3: "#0f1442", frag: `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.y;
  float t = u_time * 0.05;
  vec2 m = u_mouse * vec2(u_res.x / u_res.y, 1.0);
  vec2 q = vec2(fbm(uv * 1.5 + t), fbm(uv * 1.5 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(uv * 1.5 + 4.0 * q + vec2(1.7, 9.2) + t * 1.5), fbm(uv * 1.5 + 4.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(uv * 1.5 + 4.0 * r + (m - uv) * 0.35);
  vec3 col = mix(u_bg, u_c1, smoothstep(0.48, 0.86, f));
  col = mix(col, u_c2, smoothstep(0.62, 0.95, length(q)) * 0.6 * smoothstep(0.35, 0.7, f));
  col = mix(col, u_c3 * 0.6, smoothstep(0.82, 0.95, f) * 0.6);
  gl_FragColor = vec4(col, 1.0);
}` },
  caustic: { bg: "#004d70", c1: "#004d70", c2: "#1fb8cc", c3: "#ccffff", frag: `
float ridge(vec2 p){ return pow(1.0 - abs(noise(p) * 2.0 - 1.0), 9.0); }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.y;
  float t = u_time * 0.45;
  vec2 w = vec2(fbm(uv * 2.0 + t * 0.3), fbm(uv * 2.0 - t * 0.25 + 3.1));
  vec2 p = uv * 5.5 + w * 1.7;
  float c = ridge(p + vec2(t, t * 0.6)) + ridge(p * 1.35 - vec2(t * 0.7, -t * 0.4)) * 0.8 + ridge(p * 0.7 + vec2(-t * 0.3, t * 0.5)) * 0.5;
  vec3 col = mix(u_c1, u_c2, gl_FragCoord.y / u_res.y * 0.6 + 0.2);
  vec2 g = fract(uv * 7.0 + w * 0.12);
  float grout = smoothstep(0.035, 0.0, min(g.x, g.y));
  col = mix(col, col * 0.72, grout * 0.7);
  col += u_c3 * c * 0.5;
  vec2 m = u_mouse * vec2(u_res.x / u_res.y, 1.0);
  float d = length(uv - m);
  col += u_c3 * 0.18 * sin(d * 48.0 - u_time * 5.0) * exp(-d * 5.0);
  gl_FragColor = vec4(col, 1.0);
}` },
  chrome: { bg: "#08090d", c1: "#dbe6f7", c2: "#8c4de6", c3: "#3399ff", frag: `
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.18;
  vec2 m = u_mouse - 0.5;
  vec2 p = uv * 2.2;
  for (int i = 1; i < 7; i++) {
    float fi = float(i);
    p.x += 0.55 / fi * sin(fi * p.y + t + 0.3 * fi) + m.x * 0.12;
    p.y += 0.55 / fi * cos(fi * p.x + t + 0.3 * fi + 1.6) + m.y * 0.12;
  }
  float v = sin(p.x + p.y);
  float b = 0.5 + 0.5 * sin(v * 3.2 + t * 1.5);
  vec3 col = mix(u_bg, u_c1, pow(b, 2.2));
  col += u_c2 * pow(1.0 - b, 5.0) * 0.5;
  col += u_c3 * pow(b, 8.0) * 0.25;
  col += pow(b, 60.0) * 0.9;
  col *= mix(0.35, 1.0, smoothstep(1.3, 0.2, length(uv)));
  gl_FragColor = vec4(col, 1.0);
}` },
  hole: { bg: "#000000", c1: "#ff6b14", c2: "#fff2d1", c3: "#ffbf73", frag: `
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  uv -= (u_mouse - 0.5) * 0.12;
  float r = length(uv);
  float t = u_time;
  vec2 q = vec2(uv.x, uv.y * 3.2);
  float rq = length(q);
  float ang = 2.6 / (rq + 0.2) - t * 0.6;
  float c = cos(ang), s = sin(ang);
  vec2 rp = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  float n = fbm(rp * 4.0 + vec2(0.0, t * 0.1));
  float disk = smoothstep(0.22, 0.3, rq) * smoothstep(1.05, 0.45, rq);
  vec3 hot = mix(u_c1, u_c2, n);
  vec3 col = hot * disk * (0.35 + 1.3 * n);
  float ring = smoothstep(0.018, 0.0, abs(r - 0.205));
  col += u_c3 * ring * 1.6;
  float halo = smoothstep(0.06, 0.0, abs(r - 0.27)) * smoothstep(-0.08, 0.16, uv.y);
  col += mix(u_c1, u_c3, 0.5) * halo * 0.7 * (0.4 + n);
  col *= smoothstep(0.17, 0.2, r);
  vec2 sg = floor(gl_FragCoord.xy / 3.0);
  col += step(0.997, hash(sg)) * 0.8 * smoothstep(0.3, 0.6, r);
  gl_FragColor = vec4(u_bg + col, 1.0);
}` },
  portal: { bg: "#08001f", c1: "#8c40ff", c2: "#1ad9ff", c3: "#ff59b3", frag: `
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  uv -= (u_mouse - 0.5) * 0.12;
  float r = length(uv), a = atan(uv.y, uv.x), t = u_time;
  float sw = a + 2.4 / (r + 0.15) - t * 0.6;
  float n = fbm(vec2(cos(sw), sin(sw)) * 1.6 + vec2(r * 5.0 - t * 0.8, t * 0.1));
  float R = 0.31;
  float ring = exp(-pow((r - R) * 9.0, 2.0));
  vec3 swirl = mix(mix(u_c1, u_c2, n), u_c3, smoothstep(0.55, 0.9, n));
  vec3 col = swirl * ring * (0.5 + 1.4 * n);
  col += swirl * fbm(vec2(cos(sw), sin(sw)) * 0.8 + r * 2.0) * exp(-max(r - R, 0.0) * 3.0) * 0.35 * step(R, r);
  float inner = smoothstep(R, R - 0.04, r);
  vec2 sp = vec2(a * 6.0 / 3.14159265, 0.2 / (r + 0.01) + t * 0.9) * vec2(4.0, 6.0);
  vec2 cell = vec2(mod(floor(sp.x), 48.0), floor(sp.y));
  vec2 f = fract(sp);
  float star = step(0.82, hash(cell)) * smoothstep(0.18, 0.0, length(f - 0.5)) * smoothstep(0.0, 0.12, r);
  vec3 world = mix(u_bg, mix(u_bg, u_c1, 0.4), r / R) + star * vec3(0.8, 0.9, 1.0);
  col = mix(col, world + swirl * 0.15, inner);
  col += vec3(0.9, 0.8, 1.0) * exp(-r * 30.0) * 0.6;
  gl_FragColor = vec4(col + u_bg * (1.0 - inner) * 0.5, 1.0);
}` },
  synth: { bg: "#0f052e", c1: "#ff528c", c2: "#ffe659", c3: "#ff33d9", frag: `
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float hz = -0.08;
  float t = u_time;
  vec3 col;
  if (p.y > hz) {
    float k = smoothstep(hz, 0.6, p.y);
    col = mix(u_c1, u_bg, pow(k, 0.7));
    vec2 sg = floor(p * 90.0);
    col += step(0.996, hash(sg)) * smoothstep(0.15, 0.5, p.y) * (0.5 + 0.5 * sin(t * 3.0 + hash(sg) * 20.0));
    vec2 sp = p - vec2((u_mouse.x - 0.5) * 0.12, 0.17);
    float d = length(sp);
    float sun = smoothstep(0.27, 0.265, d);
    float band = step(0.0, sin(p.y * 70.0 + t * 2.0));
    float cut = mix(band, 1.0, smoothstep(0.06, 0.2, p.y));
    vec3 sc = mix(u_c1, u_c2, smoothstep(-0.05, 0.42, p.y));
    col = mix(col, sc, sun * cut);
    col += u_c1 * 0.35 * exp(-d * 5.0);
    float mh = hz + 0.05 * abs(sin(p.x * 3.1 + 0.6)) + 0.035 * abs(sin(p.x * 7.7 + 2.0)) + 0.012 * sin(p.x * 23.0);
    float mt = step(p.y, mh);
    col = mix(col, u_bg * 0.6, mt);
    col += u_c3 * smoothstep(0.005, 0.0, abs(p.y - mh)) * 0.9;
  } else {
    float depth = hz - p.y;
    float z = 0.35 / depth;
    vec2 g = vec2(p.x * z + (u_mouse.x - 0.5) * 2.0, z + t * 1.6);
    vec2 f = abs(fract(g) - 0.5);
    float dl = 0.5 - max(f.x, f.y);
    float w = clamp(0.015 * z, 0.008, 0.45);
    float line = 1.0 - smoothstep(0.0, w, dl);
    float fade = smoothstep(22.0, 2.0, z);
    col = mix(u_bg * 0.7, u_c3, line * fade);
    col += u_c3 * 0.35 * exp(-depth * 14.0);
  }
  gl_FragColor = vec4(col, 1.0);
}` },
  terrain: { bg: "#38478f", c1: "#ff9e6b", c2: "#ffbf73", c3: "#805247", frag: `
float th(vec2 p){ float v = 0.0, a = 1.0; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(3.1, 1.7); a *= 0.45; } return v; }
float H(vec2 p){ return th(p * 0.35) * 2.4 - 0.6; }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 1.3;
  vec3 ro = vec3(sin(u_time * 0.2) * 2.0, 4.2, t);
  float yaw = (u_mouse.x - 0.5) * 0.9 + sin(u_time * 0.13) * 0.2;
  vec3 fw = normalize(vec3(sin(yaw), -0.24 + (u_mouse.y - 0.5) * 0.25, cos(yaw)));
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(fw + uv.x * rt + uv.y * up);
  float d = 0.0, hit = 0.0;
  vec3 p = ro;
  for (int i = 0; i < 80; i++) {
    p = ro + rd * d;
    float dh = p.y - H(p.xz);
    if (dh < 0.002 * d) { hit = 1.0; break; }
    d += max(dh * 0.45, 0.04 + d * 0.004);
    if (d > 45.0) break;
  }
  vec3 sunDir = normalize(vec3(-0.6, 0.32, 1.0));
  vec3 sky = mix(u_c1, u_bg, clamp(rd.y * 3.0 + 0.25, 0.0, 1.0));
  float sd = max(dot(rd, sunDir), 0.0);
  sky += u_c2 * pow(sd, 40.0) * 0.9 + u_c1 * pow(sd, 6.0) * 0.25;
  vec3 col = sky;
  if (hit > 0.5) {
    float e = 0.04;
    float h0 = H(p.xz);
    vec3 n = normalize(vec3(h0 - H(p.xz + vec2(e, 0.0)), e, h0 - H(p.xz + vec2(0.0, e))));
    float diff = max(dot(n, sunDir), 0.0);
    vec3 rock = mix(u_c3 * 0.4, u_c3, smoothstep(0.0, 2.0, p.y));
    float snow = smoothstep(2.2, 2.6, p.y + n.y * 0.4) * smoothstep(0.55, 0.85, n.y);
    rock = mix(rock, vec3(0.95, 0.93, 1.0), snow);
    col = rock * (0.22 + diff * mix(vec3(1.0), u_c2, 0.4));
    col = mix(col, sky * 0.95, 1.0 - exp(-d * 0.055));
  }
  gl_FragColor = vec4(pow(col, vec3(0.92)), 1.0);
}` },
  rift: { bg: "#04030a", c1: "#421285", c2: "#0a80b3", c3: "#804dff", frag: `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float t = u_time * 0.12;
  float n = fbm(p * 2.2 + vec2(t, -t * 0.6) + fbm(p * 3.0 - t) * 0.9);
  vec3 col = mix(u_bg, u_c1, smoothstep(0.35, 0.95, n));
  col = mix(col, u_c2, smoothstep(0.7, 1.05, n) * 0.55);
  float x = p.x - (u_mouse.x - 0.5) * 0.2 + (fbm(vec2(p.y * 3.0, t * 3.0)) - 0.5) * 0.28;
  float crack = min(0.011 / abs(x), 5.0) * smoothstep(0.75, 0.0, abs(p.y));
  col += u_c3 * crack * 0.5 + mix(u_c2, vec3(1.0), 0.5) * crack * crack * 0.05;
  vec2 g = floor(gl_FragCoord.xy / 3.0);
  col += step(0.997, hash(g)) * (0.5 + 0.5 * sin(u_time * 3.0 + hash(g + 1.0) * 20.0)) * 0.8;
  col *= 1.0 - 0.7 * length(uv - 0.5);
  gl_FragColor = vec4(1.0 - exp(-col * 1.3), 1.0);
}` },
  sun: { bg: "#12031a", c1: "#ffc733", c2: "#f52e61", c3: "#800d42", frag: `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - vec2(0.5 * u_res.x, 0.4 * u_res.y)) / u_res.y;
  p -= (u_mouse - 0.5) * vec2(0.08, 0.04);
  p.x += (noise(vec2(p.y * 14.0, u_time * 1.6)) - 0.5) * 0.012;
  vec3 sky = mix(u_bg, u_c3, smoothstep(0.95, 0.05, uv.y));
  float r = length(p);
  float sun = smoothstep(0.3, 0.296, r);
  vec3 sunCol = mix(u_c1, u_c2, smoothstep(0.28, -0.28, p.y));
  float gap = smoothstep(0.02, -0.3, p.y) * 0.65;
  float cut = step(fract(p.y * 22.0 + u_time * 0.25), gap) * step(p.y, 0.0);
  sun *= 1.0 - cut;
  vec3 col = sky + u_c2 * exp(-r * 3.2) * 0.55;
  col = mix(col, sunCol, sun);
  float m = 0.12 + fbm(vec2(uv.x * 3.0 + 0.3, 0.7)) * 0.2;
  col = mix(col, u_bg * 0.45, smoothstep(m + 0.004, m, uv.y));
  float m2 = 0.04 + fbm(vec2(uv.x * 5.0 + 4.0, 2.0)) * 0.12;
  col = mix(col, u_bg * 0.2, smoothstep(m2 + 0.004, m2, uv.y));
  gl_FragColor = vec4(col, 1.0);
}` },
  mesh: { bg: "#6366f2", c1: "#ff5e94", c2: "#ffc74d", c3: "#26d9d9", frag: `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv; p.x *= u_res.x / u_res.y;
  float t = u_time * 0.15;
  float a = sin(p.x * 2.0 + t * 2.0 + sin(p.y * 3.0 + t)) * 0.5 + 0.5;
  float b = sin(p.y * 2.5 - t * 1.5 + cos(p.x * 2.0 - t)) * 0.5 + 0.5;
  float c = sin((p.x + p.y) * 1.8 + t * 1.2 + (u_mouse.x - 0.5) * 2.0) * 0.5 + 0.5;
  vec3 col = mix(u_bg, u_c1, a);
  col = mix(col, u_c2, b * 0.6);
  col = mix(col, u_c3, c * 0.45);
  gl_FragColor = vec4(col, 1.0);
}` },
  dither: { bg: "#0d0d0f", c1: "#d4ff59", c2: "#d4ff59", c3: "#d4ff59", frag: `
float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }
void main(){
  vec2 px = floor(gl_FragCoord.xy / 3.0);
  float asp = u_res.x / u_res.y;
  vec2 uv = px * 3.0 / u_res.y;
  float t = u_time * 0.15;
  vec2 c = asp > 1.3 ? vec2(asp * 0.7, 0.5) : vec2(asp * 0.62, 0.8);
  vec2 d = (uv - c) / (asp > 1.3 ? 0.34 : 0.24);
  float r2 = dot(d, d);
  float shade;
  if (r2 < 1.0) {
    vec3 n = vec3(d, sqrt(1.0 - r2));
    vec2 lm = (u_mouse * vec2(asp, 1.0) - c) * 2.5;
    vec3 l = normalize(vec3(lm, 1.0));
    shade = pow(max(dot(n, l), 0.0), 1.4) * 0.95 + 0.03;
    shade += 0.07 * sin(n.y * 18.0 + u_time);
  } else {
    float g = fbm(uv * 2.5 + vec2(t * 2.0, -t));
    shade = smoothstep(0.35, 0.85, g) * 0.42 * smoothstep(1.0, 1.6, sqrt(r2));
  }
  float on = step(bayer8(px), shade);
  gl_FragColor = vec4(mix(u_bg, u_c1, on), 1.0);
}` },
  bubbles: { bg: "#080512", c1: "#9e40e0", c2: "#4de6ff", c3: "#ff80cc", rainbow: true, frag: `
vec3 film(float th){ return mix(pal(th * 0.45), 0.5 + 0.5 * cos(6.2831 * (th * vec3(1.0, 0.82, 0.68) + vec3(0.0, 0.25, 0.5))), u_rainbow); }
vec4 bubble(vec2 uv, vec2 c, float R, float seed){
  vec2 d = (uv - c) / R;
  float r = length(d);
  if (r > 1.0) return vec4(0.0);
  float z = sqrt(1.0 - r * r);
  float th = 1.0 + fbm(d * 1.8 + vec2(u_time * 0.12 + seed, seed * 3.0)) * 1.6 + (1.0 - z) * 0.9 + d.y * 0.4;
  float rim = pow(1.0 - z, 2.5);
  float spec = smoothstep(0.16, 0.0, length(d - vec2(-0.38, 0.42))) + smoothstep(0.08, 0.0, length(d - vec2(0.3, -0.45))) * 0.5;
  float edge = smoothstep(1.0, 0.97, r);
  vec3 col = film(th) * (0.5 + rim * 1.2) + spec;
  return vec4(col, clamp((0.08 + rim * 0.9 + spec) * edge, 0.0, 1.0));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float asp = u_res.x / u_res.y;
  vec3 col = mix(u_bg, u_bg * 2.2 + 0.02, gl_FragCoord.y / u_res.y);
  col += u_c1 * 0.4 * exp(-length(uv - vec2(asp * 0.25, 0.0)) * 2.0) * 0.5;
  float t = u_time;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float R = 0.06 + 0.06 * fract(fi * 0.618 + 0.3);
    vec2 c = vec2((fract(fi * 0.381 + 0.1) - 0.5) * asp * 0.95, mod(t * (0.05 + 0.02 * fi) + fi * 0.37, 1.4) - 0.7);
    c.x += sin(t * 0.7 + fi) * 0.04;
    vec4 b = bubble(uv, c, R, fi);
    col = mix(col, b.rgb, b.a);
  }
  vec2 mc = vec2(asp > 1.3 ? asp * 0.22 : 0.0, -0.02) + (u_mouse - 0.5) * 0.06;
  vec4 big = bubble(uv, mc + vec2(0.0, sin(t * 0.8) * 0.015), 0.3, 7.0);
  col = mix(col, big.rgb, big.a);
  gl_FragColor = vec4(col, 1.0);
}` },
  cells: { bg: "#000000", c1: "#4dffb3", c2: "#4d99ff", c3: "#b34dff", rainbow: true, frag: `
vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.y;
  vec2 m = u_mouse * vec2(u_res.x / u_res.y, 1.0);
  vec2 p = uv * 6.0;
  vec2 ip = floor(p), fp = fract(p);
  float d1 = 8.0, d2 = 8.0;
  vec2 cell = vec2(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = 0.5 + 0.5 * sin(u_time * 0.8 + 6.2831 * hash2(ip + g));
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; cell = ip + g; } else if (d < d2) { d2 = d; }
    }
  }
  float edge = sqrt(d2) - sqrt(d1);
  float glow = smoothstep(0.65, 0.0, length(uv - m));
  vec3 base = hue(hash2(cell).x * 0.35, vec3(0.45, 0.6, 0.75));
  vec3 col = u_bg + base * (0.1 + 0.4 * glow) * smoothstep(0.0, 0.3, edge);
  col += u_c1 * smoothstep(0.07, 0.0, edge) * (0.3 + 1.3 * glow);
  col += u_c1 * smoothstep(0.12, 0.0, sqrt(d1)) * 0.6 * glow;
  gl_FragColor = vec4(col, 1.0);
}` },
  kaleido: { bg: "#000000", c1: "#8c40ff", c2: "#1ad9ff", c3: "#ff59b3", rainbow: true, frag: `
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float r = length(uv);
  float a = atan(uv.y, uv.x) + u_time * 0.08 + (u_mouse.x - 0.5) * 2.0;
  float seg = 6.2831 / 8.0;
  a = mod(a, seg);
  a = abs(a - seg * 0.5);
  vec2 p = vec2(cos(a), sin(a)) * r;
  float t = u_time * 0.2;
  vec2 q = p * 3.0 + vec2(t, -t * 0.7);
  float f = fbm(q + fbm(q * 2.0 + t));
  float bands = sin(f * 18.0 + r * 6.0 - u_time) * 0.5 + 0.5;
  vec3 col = hue(f * 1.2 + r * 0.4 - u_time * 0.03, vec3(0.0, 0.15, 0.3));
  col *= 0.3 + 0.8 * bands;
  col *= smoothstep(1.3, 0.15, r);
  gl_FragColor = vec4(u_bg + col, 1.0);
}` },
  mandel: { bg: "#000000", c1: "#ff8c33", c2: "#ffe680", c3: "#3366ff", rainbow: true, frag: `
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  float cyc = mod(u_time * 0.3, 8.0);
  float zoom = exp(-cyc);
  float a = u_time * 0.05;
  uv = mat2(cos(a), -sin(a), sin(a), cos(a)) * uv;
  vec2 c = vec2(-0.743643887, 0.131825904) + uv * zoom * 2.2;
  vec2 z = vec2(0.0);
  float it = 0.0, m2 = 0.0, esc = 0.0;
  for (int i = 0; i < 220; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    m2 = dot(z, z);
    if (m2 > 256.0) { esc = 1.0; break; }
    it += 1.0;
  }
  vec3 col = u_bg;
  if (esc > 0.5) {
    float sm = it - log2(log2(m2)) + 4.0;
    col = hue((3.0 + sm * 0.11 + u_time * 0.15 + u_mouse.x * 4.0) / 6.2831, vec3(0.0, 0.6, 1.0) / 6.2831);
    col *= 0.6 + 0.4 * smoothstep(0.0, 30.0, sm);
  }
  float fade = smoothstep(0.0, 0.35, cyc) * smoothstep(8.0, 7.65, cyc);
  gl_FragColor = vec4(mix(u_bg, col, fade), 1.0);
}` },
  oil: { bg: "#000000", c1: "#ff59b3", c2: "#1ad9ff", c3: "#ffe659", rainbow: true, frag: `
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.y;
  float t = u_time * 0.25;
  vec2 m = u_mouse * vec2(u_res.x / u_res.y, 1.0);
  vec2 p = uv * 2.2;
  p += 0.4 * vec2(sin(p.y * 2.3 + t * 1.3), cos(p.x * 1.7 - t));
  p += 0.25 * vec2(sin(p.y * 4.1 - t * 1.7), cos(p.x * 3.3 + t * 1.1));
  float d = length(uv - m);
  p += (uv - m) * 0.8 * exp(-d * 3.0);
  float f = sin(p.x * 3.0 + p.y * 2.0 + t * 2.0) * 0.5 + 0.5;
  vec3 col = hue(f + p.x * 0.1, vec3(0.0, 0.33, 0.67));
  col = mix(col, vec3(1.0), pow(f, 12.0) * 0.6);
  gl_FragColor = vec4(col, 1.0);
}` },
  raymarch: { bg: "#03030a", c1: "#8ca6ff", c2: "#ff59b3", c3: "#1ad9ff", rainbow: true, frag: `
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
float map(vec3 p){
  float t = u_time * 0.6;
  p.xz *= rot((u_mouse.x - 0.5) * 3.0 + t * 0.2);
  p.yz *= rot((u_mouse.y - 0.5) * 1.5);
  float d = length(p - vec3(sin(t) * 0.9, cos(t * 1.3) * 0.5, 0.0)) - 0.55;
  d = smin(d, length(p - vec3(cos(t * 0.8) * 0.8, sin(t * 1.1) * 0.7, sin(t * 0.7) * 0.6)) - 0.45, 0.5);
  d = smin(d, length(p - vec3(sin(t * 1.7) * 0.6, sin(t * 0.9) * 0.9, cos(t * 1.2) * 0.5)) - 0.4, 0.5);
  d = smin(d, length(p - vec3(cos(t * 1.4) * 1.0, cos(t * 0.6) * 0.3, sin(t * 1.5) * 0.4)) - 0.35, 0.5);
  return d;
}
vec3 normalAt(vec3 p){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  vec3 ro = vec3(0.0, 0.0, 4.3);
  vec3 rd = normalize(vec3(uv, -1.4));
  float d = 0.0, hit = 0.0;
  for (int i = 0; i < 70; i++) {
    float h = map(ro + rd * d);
    if (h < 0.001) { hit = 1.0; break; }
    d += h;
    if (d > 8.0) break;
  }
  vec3 col = mix(u_bg, u_bg * 3.0 + vec3(0.04, 0.01, 0.06), uv.y + 0.5);
  if (hit > 0.5) {
    vec3 p = ro + rd * d;
    vec3 n = normalAt(p);
    vec3 l = normalize(vec3(0.6, 0.8, 0.5));
    float diff = max(dot(n, l), 0.0);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    vec3 base = hue(n.y * 0.35 + n.x * 0.15 + u_time * 0.05, vec3(0.0, 0.33, 0.67));
    float spec = pow(max(dot(reflect(rd, n), l), 0.0), 48.0);
    col = base * (0.2 + 0.8 * diff) + fres * u_c1 + spec;
    col = pow(col, vec3(0.4545));
  }
  gl_FragColor = vec4(col, 1.0);
}` },
  tunnel: { bg: "#000000", c1: "#8c40ff", c2: "#1ad9ff", c3: "#ff59b3", rainbow: true, frag: `
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
  uv -= (u_mouse - 0.5) * 0.35;
  float r = length(uv) + 0.0001;
  float a = atan(uv.y, uv.x);
  float t = u_time;
  float z = 0.32 / r + t * 1.4;
  float ang = a / 3.14159265 * 8.0 + t * 0.1;
  vec2 f = abs(fract(vec2(ang, z)) - 0.5);
  float line = smoothstep(0.38, 0.5, max(f.x, f.y));
  vec3 h = hue(z * 0.04, vec3(0.0, 0.33, 0.67));
  float pulse = smoothstep(0.85, 1.0, fract(z * 0.125));
  vec3 col = h * line * 1.3 + vec3(1.0) * pulse * line * 0.8;
  col += h * 0.06;
  col *= smoothstep(0.0, 0.45, r);
  col += mix(h, vec3(1.0), 0.6) * exp(-r * 9.0) * 0.9;
  gl_FragColor = vec4(u_bg + col, 1.0);
}` },
  // A raymarched diamond (the library's Diamond sites: Templates/src/sites/caratprism.jsx): a round brilliant that bends
  // light back out in colour, turning; the pointer turns the eye around it. u_c1 its colour, u_c2 the light's.
  gem: { bg: "#05060a", c1: "#f4f7ff", c2: "#9fb2ff", c3: "#1e2a44", frag: `
#define PI 3.14159265
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float gemD(vec3 p){
  p.xz *= rot(u_time * 0.35);
  float k = 1.08;
  p /= k;
  float a = atan(p.z, p.x), s8 = PI / 4.0;
  float a1 = (floor(a / s8) + 0.5) * s8, a2 = floor(a / s8 + 0.5) * s8;
  float r1 = dot(p.xz, vec2(cos(a1), sin(a1))), r2 = dot(p.xz, vec2(cos(a2), sin(a2)));
  float d = max(r1, r2) - 1.0;
  d = max(d, p.y - 0.36);
  d = max(d, dot(vec2(r1, p.y), vec2(0.612, 0.791)) - 0.627);
  d = max(d, dot(vec2(r2, p.y), vec2(0.677, 0.736)) - 0.692);
  d = max(d, dot(vec2(r1, p.y), vec2(0.652, -0.758)) - 0.652);
  d = max(d, dot(vec2(r2, p.y), vec2(0.707, -0.707)) - 0.707);
  return d * k;
}
vec3 gemNormal(vec3 p){ vec2 e = vec2(0.0015, 0.0); return normalize(vec3(gemD(p + e.xyy) - gemD(p - e.xyy), gemD(p + e.yxy) - gemD(p - e.yxy), gemD(p + e.yyx) - gemD(p - e.yyx))); }
vec3 env(vec3 d){
  vec3 c = mix(u_bg * 1.4 + 0.02, u_c2 * 0.55, smoothstep(-0.4, 0.8, d.y));
  c += vec3(4.0) * smoothstep(0.94, 0.98, dot(d, normalize(vec3(0.6, 0.75, 0.3))));
  c += vec3(2.6, 2.7, 3.0) * smoothstep(0.9, 0.96, dot(d, normalize(vec3(-0.7, 0.45, 0.55))));
  c += vec3(2.4) * smoothstep(0.97, 1.0, dot(d, normalize(vec3(0.15, 0.25, -1.0))));
  c += vec3(2.0) * smoothstep(0.04, 0.0, abs(d.y - 0.5)) * smoothstep(-0.2, 0.4, d.x);
  c += vec3(1.6) * smoothstep(0.03, 0.0, abs(d.x + 0.35)) * smoothstep(0.0, 0.5, d.y);
  c += vec3(1.6) * pow(max(0.0, sin(atan(d.z, d.x) * 12.0)), 24.0) * smoothstep(0.05, 0.25, d.y) * smoothstep(0.65, 0.35, d.y);
  return c;
}
vec3 shadeGem(vec3 p, vec3 rd, vec3 n){
  float ior = 2.42;
  float fres = 0.17 + 0.83 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
  vec3 col = env(reflect(rd, n)) * fres;
  vec3 rdi = refract(rd, n, 1.0 / ior), pi = p - n * 0.004, thru = vec3(1.0 - fres);
  for (int b = 0; b < 4; b++){
    float t = 0.0;
    for (int i = 0; i < 40; i++){ float h = -gemD(pi + rdi * t); if (h < 0.0015) break; t += max(h, 0.003); }
    vec3 pe = pi + rdi * t, ne = -gemNormal(pe);
    thru *= u_c1;
    vec3 o = refract(rdi, ne, ior);
    if (dot(o, o) > 0.0){
      vec3 oR = refract(rdi, ne, ior * 0.97), oB = refract(rdi, ne, ior * 1.03);
      if (dot(oR, oR) == 0.0) oR = o;
      if (dot(oB, oB) == 0.0) oB = o;
      col += thru * vec3(env(oR).r, env(o).g, env(oB).b) * 0.9;
      thru *= 0.35;
    }
    rdi = reflect(rdi, ne); pi = pe + ne * 0.004;
  }
  return col;
}
void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / u_res.y;
  float yaw = 0.5 + (u_mouse.x - 0.5) * 2.4, pitch = 0.38 + (u_mouse.y - 0.5) * 0.7;
  vec3 ta = vec3(0.0, 0.05, 0.0);
  vec3 ro = ta + 4.4 * vec3(cos(pitch) * sin(yaw), sin(pitch), cos(pitch) * cos(yaw));
  vec3 w = normalize(ta - ro), u = normalize(cross(w, vec3(0.0, 1.0, 0.0))), v = cross(u, w);
  vec3 rd = normalize(uv.x * u + uv.y * v + 2.1 * w);
  float vig = 1.0 - 0.175 * dot(uv, uv);
  vec3 col = mix(u_bg, u_c3 * 0.7, smoothstep(-1.0, 1.2, uv.y)) * vig;
  col += u_c3 * 0.5 * exp(-3.0 * length(uv - vec2(0.0, 0.1)));
  float t = 0.0;
  bool hit = false;
  for (int i = 0; i < 80; i++){ float h = gemD(ro + rd * t); if (h < 0.0008 * t + 0.0004){ hit = true; break; } t += h * 0.95; if (t > 12.0) break; }
  if (hit){ vec3 p = ro + rd * t; col = shadeGem(p, rd, gemNormal(p)); }
  col = col / (1.0 + col * 0.55) * 1.12;
  gl_FragColor = vec4(pow(col, vec3(0.92)), 1.0);
}` },
};

export const SHADER_KINDS = Object.keys(SHADERS);
