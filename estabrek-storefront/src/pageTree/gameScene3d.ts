/**
 * The games stage seen in 3D (G4a of docs/game-engine-plan.ar.md): the same game (gameEngine.ts, its rules, physics,
 * tiles and levels), drawn by three.js with a perspective camera, light and shadows. The shop's GameView.tsx uses it
 * for a game whose `view3d.mode` is set; its screens, keys and touch stay GameView's.
 *  - "ground": the world laid on the ground (its x across, its y away from the camera), things standing on it.
 *  - "wall": the world standing up as in 2D, everything given depth, a backdrop behind.
 *  - Each thing's shape: a box, a ball, a cylinder, a cone, its convex shape raised, a card (its picture, emoji or
 *    sprite frame, facing the camera), or a GLB model (loaded once, fitted into its size, its animation playing);
 *    lit materials in its colour, as metal and as rough as it says; tiles as instanced boxes of their height.
 *  - The camera: following (behind a car as it turns), from the top, at an angle, or still over the whole world; the
 *    light of a day, a sunset, a night or a studio, the sun's shadows around what the camera looks at, fog.
 *  - Particles, the sling's dots and joints' lines in 3D; a tap or a pull found on the ground or the wall.
 * three.js is handed in (GameView loads it); GLB models load with three's own loader, only when a thing has one.
 */
import type * as T from "three";
import type { Body, GameState } from "./gameEngine";
import type { GameSpec, GameThing } from "./gameSpec";
import { lookCanvas, sheetFrame } from "./gameDraw";
import { alphaOf, burst, confetti, type Particles } from "./gameParticles";
import { physJoints } from "./gamePhysics";
import { playNote, playSound } from "./gameSound";

type Three = typeof import("three");
export type Scene3D = {
  draw(s: GameState, now: number): void;
  resize(width: number, height: number): void;
  toWorld(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } | null;
  /** How many models have loaded (for the page's tests). */
  models(): number;
  dispose(): void;
};
type Opts = {
  THREE: Three; renderer: T.WebGLRenderer; spec: GameSpec; colours: Record<string, string>;
  css: (value: string) => string; font: string; rtl: boolean; lessMotion: () => boolean; sound: () => boolean; parts: Particles;
};

const LIGHTS = {
  day: { sky: "#bfe3ff", hemi: ["#ffffff", "#8a7a63", 0.9], sun: ["#ffffff", 1.9], dir: [0.5, 1, 0.35] },
  sunset: { sky: "#f4a77a", hemi: ["#ffd2b0", "#4a3550", 0.75], sun: ["#ffb36b", 1.8], dir: [-0.8, 0.5, 0.25] },
  night: { sky: "#0b1026", hemi: ["#5b6c9a", "#0b0d18", 0.5], sun: ["#9db4ff", 0.9], dir: [0.3, 1, -0.4] },
  studio: { sky: "", hemi: ["#ffffff", "#c9c9c9", 1.0], sun: ["#ffffff", 1.3], dir: [0.6, 1, 0.8] },
} as const;

/** A thing's shape in 3D: as it says, or from its look. */
export function shapeOf3d(t: GameThing): "box" | "ball" | "cylinder" | "cone" | "card" | "model" | "poly" {
  if (t.d3.shape === "model") return t.d3.src ? "model" : "box";
  if (t.d3.shape !== "auto") return t.d3.shape;
  if (t.look.poly) return "poly";
  if (t.look.kind === "circle") return "ball";
  if (t.look.kind === "box") return "box";
  return "card";
}
/** Its height (on the ground) or depth (on the wall), in pixels. */
export const heightOf3d = (t: GameThing, w: number, h: number) => t.d3.height || (shapeOf3d(t) === "card" ? Math.max(w, h) : Math.min(w, h));

export function scene3d(o: Opts): Scene3D {
  const { THREE, renderer, spec, colours } = o;
  const ground = spec.view3d.mode === "ground";
  const v = spec.view3d;
  const preset = LIGHTS[v.light];
  const colourOf = (c: string) => new THREE.Color(o.css(colours[c] ?? c));
  const sky = preset.sky || o.css(colours[spec.bg] ?? spec.bg);
  renderer.shadowMap.enabled = v.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(sky);
  const D = spec.h * v.distance;
  if (v.fog) scene.fog = new THREE.Fog(new THREE.Color(sky), D * 1.2, D * 4.5);
  const camera = new THREE.PerspectiveCamera(45, spec.w / spec.h, 5, 60000);
  const hemi = new THREE.HemisphereLight(new THREE.Color(preset.hemi[0]), new THREE.Color(preset.hemi[1]), preset.hemi[2]);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(new THREE.Color(preset.sun[0]), preset.sun[1]);
  sun.castShadow = v.shadows;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  const span = Math.max(spec.w, spec.h) * 0.9;
  Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 6000 });
  scene.add(sun, sun.target);
  const sunDir = new THREE.Vector3(preset.dir[0], preset.dir[1], ground ? preset.dir[2] : 0.9).normalize();
  // A soft room of light all round, for metal and shine to reflect (dimmer at night); it comes a moment later.
  let envTex: T.Texture | null = null;
  void import("three/examples/jsm/environments/RoomEnvironment.js").then(({ RoomEnvironment }) => {
    const pm = new THREE.PMREMGenerator(renderer);
    envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    scene.environment = envTex;
    scene.environmentIntensity = v.light === "night" ? 0.25 : v.light === "studio" ? 0.8 : 0.5;
  }).catch(() => {});

  /* ---- the ground, or the wall's backdrop */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(spec.ww + 6000, spec.wh + 6000), new THREE.MeshStandardMaterial({ color: colourOf(spec.bg), roughness: 0.95 }));
  floor.receiveShadow = true;
  if (ground) { floor.rotation.x = -Math.PI / 2; floor.position.set(spec.ww / 2, 0, spec.wh / 2); }
  else floor.position.set(spec.ww / 2, -spec.wh / 2, -140);
  scene.add(floor);

  const at = (x: number, y: number, up: number) => (ground ? new THREE.Vector3(x, up, y) : new THREE.Vector3(x, -y, up));
  const textures: T.Texture[] = [];
  const texOf = (t: GameThing["look"], w: number, h: number, onLoad: () => void) => {
    const tx = new THREE.CanvasTexture(lookCanvas(t, w, h, o.css(colours[t.color] ?? t.color), o.font, o.rtl, () => { tx.needsUpdate = true; onLoad(); }));
    tx.colorSpace = THREE.SRGBColorSpace;
    textures.push(tx);
    return tx;
  };

  /* ---- tiles: instanced boxes of each kind, made again when a rule takes one away */
  let tilesV = -1;
  const tileMeshes: T.InstancedMesh[] = [];
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const buildTiles = (s: GameState) => {
    for (const m of tileMeshes) { scene.remove(m); (m.material as T.Material).dispose(); m.dispose(); }
    tileMeshes.length = 0;
    const t = spec.tiles;
    if (!t || !s.tiles) return;
    for (const [ch, kind] of Object.entries(t.kinds)) {
      if (kind.thing) continue;
      const cells: Array<[number, number]> = [];
      s.tiles.forEach((row, r) => row.forEach((x, c) => { if (x === ch) cells.push([c, r]); }));
      if (!cells.length) continue;
      const plain = kind.look.kind === "box" || kind.look.kind === "circle";
      // A picture or an emoji on a tile: only its shape shows (not the square round it).
      const material = new THREE.MeshStandardMaterial({ color: plain ? colourOf(kind.look.color) : 0xffffff, roughness: 0.7, ...(plain ? {} : { map: texOf(kind.look, t.size, t.size, () => {}), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }) });
      // A solid tile stands its full height; a platform and a tile to step on are thinner.
      const hgt = kind.height || (kind.solid ? t.size : kind.oneWay ? t.size * 0.25 : t.size * 0.12);
      const im = new THREE.InstancedMesh(cube, material, cells.length);
      const m4 = new THREE.Matrix4();
      cells.forEach(([c, r], i) => {
        const cx = c * t.size + t.size / 2, cy = r * t.size + t.size / 2;
        if (ground) { m4.makeScale(t.size, hgt, t.size); m4.setPosition(cx, hgt / 2, cy); }
        else { m4.makeScale(t.size, t.size, hgt); m4.setPosition(cx, -cy, 0); }
        im.setMatrixAt(i, m4);
      });
      im.castShadow = true;
      im.receiveShadow = true;
      scene.add(im);
      tileMeshes.push(im);
    }
  };

  /* ---- things */
  type Made = { obj: T.Object3D; mat: T.MeshStandardMaterial | null; shape: ReturnType<typeof shapeOf3d>; h3: number; uv?: T.BufferAttribute; mixer?: T.AnimationMixer; clips?: T.AnimationClip[]; playing?: string };
  const made = new Map<number, Made>();
  let loader: Promise<{ load(src: string): Promise<{ scene: T.Group; animations: T.AnimationClip[] }> }> | null = null;
  const modelCache = new Map<string, Promise<{ scene: T.Group; animations: T.AnimationClip[] } | null>>();
  let modelsLoaded = 0;
  const loadModel = (src: string) => {
    let p = modelCache.get(src);
    if (!p) {
      loader ??= import("three/examples/jsm/loaders/GLTFLoader.js").then(({ GLTFLoader }) => {
        const l = new GLTFLoader();
        l.setCrossOrigin("anonymous");
        return { load: (u: string) => l.loadAsync(u) };
      });
      p = loader.then((l) => l.load(src)).then((g) => { modelsLoaded++; return g; }).catch(() => null);
      modelCache.set(src, p);
    }
    return p;
  };
  const fitInto = (obj: T.Object3D, w: number, h3: number, d: number) => {
    const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const want = ground ? new THREE.Vector3(w, h3, d) : new THREE.Vector3(w, d, h3);
    const k = Math.min(want.x / (size.x || 1), want.y / (size.y || 1), want.z / (size.z || 1));
    obj.scale.setScalar(k);
    obj.position.set(-mid.x * k, -mid.y * k, -mid.z * k);
  };
  const makeBody = (b: Body): Made => {
    const t = b.thing, shape = shapeOf3d(t), w = t.w, h = t.h, h3 = heightOf3d(t, w, h);
    const plain = t.look.kind === "box" || t.look.kind === "circle";
    let geo: T.BufferGeometry;
    let uv: T.BufferAttribute | undefined;
    const holder = new THREE.Group();
    if (shape === "card") {
      geo = new THREE.PlaneGeometry(w, h);
      const sprite = t.look.kind === "sprite" && t.look.src;
      let map: T.Texture;
      if (sprite) {
        map = new THREE.TextureLoader().load(t.look.src!);
        map.colorSpace = THREE.SRGBColorSpace;
        map.magFilter = THREE.NearestFilter;
        textures.push(map);
        uv = geo.getAttribute("uv") as T.BufferAttribute;
      } else map = texOf(t.look, w, h, () => {});
      const mat = new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: t.d3.rough, metalness: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ map, alphaTest: 0.35, depthPacking: THREE.RGBADepthPacking });
      holder.add(mesh);
      scene.add(holder);
      return { obj: holder, mat, shape, h3, uv };
    }
    if (shape === "ball") geo = new THREE.SphereGeometry(Math.min(w, h) / 2, 28, 18);
    else if (shape === "cylinder") geo = new THREE.CylinderGeometry(w / 2, w / 2, ground ? h3 : h, 28);
    else if (shape === "cone") geo = new THREE.ConeGeometry(w / 2, ground ? h3 : h, 28);
    else if (shape === "poly" && t.look.poly) {
      const sh = new THREE.Shape(t.look.poly.map(([x, y]) => new THREE.Vector2(x * w, (ground ? y : -y) * h)));
      geo = new THREE.ExtrudeGeometry(sh, { depth: h3, bevelEnabled: false });
      if (ground) geo.rotateX(Math.PI / 2).translate(0, h3 / 2, 0); else geo.translate(0, 0, -h3 / 2);
    } else geo = ground ? new THREE.BoxGeometry(w, h3, h) : new THREE.BoxGeometry(w, h, h3);
    const mat = new THREE.MeshStandardMaterial({ color: plain ? colourOf(t.look.color) : 0xffffff, metalness: t.d3.metal, roughness: t.d3.rough, ...(plain ? {} : { map: texOf(t.look, w, h, () => {}) }) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    holder.add(mesh);
    scene.add(holder);
    const entry: Made = { obj: holder, mat, shape, h3 };
    if (shape === "model" && t.d3.src) {
      // A box in its colour until the model comes, then the model fitted into its size.
      void loadModel(t.d3.src).then((g) => {
        if (!g || !made.has(b.n)) return;
        const copy = g.scene.clone(true);
        copy.traverse((x) => { const m = x as T.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
        fitInto(copy, w, h3, h);
        holder.remove(mesh);
        holder.add(copy);
        if (g.animations.length) { entry.mixer = new THREE.AnimationMixer(copy); entry.clips = g.animations; }
      });
    }
    return entry;
  };

  /* ---- particles, the sling's dots, joints' lines */
  const P = o.parts.max;
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
  pGeo.setAttribute("tint", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
  for (const a of ["size", "alpha", "shape"]) pGeo.setAttribute(a, new THREE.BufferAttribute(new Float32Array(P), 1));
  const pMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float size; attribute float alpha; attribute float shape; attribute vec3 tint; uniform float uScale;
varying float vA; varying float vS; varying vec3 vC;
void main() { vA = alpha; vS = shape; vC = tint; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, size * uScale / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; varying float vS; varying vec3 vC;
void main() { vec2 p = gl_PointCoord - 0.5; float d = length(p), a;
  if (vS < 0.5) a = smoothstep(0.5, 0.12, d); else if (vS < 1.5) a = smoothstep(0.5, 0.42, d) * smoothstep(0.26, 0.36, d) + 0.12 * smoothstep(0.5, 0.0, d); else a = step(abs(p.x), 0.42) * step(abs(p.y), 0.26);
  gl_FragColor = vec4(vC, a * vA);
  #include <colorspace_fragment>
}`,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);
  const tints = new Map<string, T.Color>();
  const tintOf = (c: string) => { let t = tints.get(c); if (!t) { t = new THREE.Color(o.css(c)); tints.set(c, t); } return t; };
  const dotGeo = new THREE.SphereGeometry(4, 10, 8), dotMat = new THREE.MeshBasicMaterial({ color: colourOf("text") });
  const dots = Array.from({ length: 22 }, () => { const m = new THREE.Mesh(dotGeo, dotMat); m.visible = false; scene.add(m); return m; });
  const strings = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: colourOf("text") }));
  strings.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(40 * 6), 3));
  strings.frustumCulled = false;
  scene.add(strings);

  /* ---- the camera: what it looks at, from where */
  const look = new THREE.Vector3(), from = new THREE.Vector3();
  let yaw = 0, first = true, last = 0;
  const glow = colourOf("accent");
  const raycaster = new THREE.Raycaster();
  const plane = ground ? new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) : new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  const draw = (s: GameState, now: number) => {
    const dt = first ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    /* ---- the effects: sounds, notes, bursts, confetti */
    for (const e of s.effects.splice(0)) {
      if (e.kind === "sound") { if (o.sound()) playSound(e.sound, e.x, s.cx, spec.w); }
      else if (e.kind === "note") { if (o.sound()) playNote(e.instrument, e.freq, e.x, s.cx, spec.w); }
      else if (e.kind === "burst") burst(o.parts, e.x, e.y, colours[e.color] ?? e.color, o.lessMotion());
      else if (e.kind === "confetti") confetti(o.parts, s.cx, s.cy, spec.w, o.lessMotion());
    }
    if (s.tilesV !== tilesV) { tilesV = s.tilesV; buildTiles(s); }
    /* ---- things */
    const alive = new Set<number>();
    const tsec = now / 1000;
    for (const b of s.bodies) {
      alive.add(b.n);
      let m = made.get(b.n);
      if (!m) { m = makeBody(b); made.set(b.n, m); }
      const t = b.thing, lift = t.d3.lift;
      const up = m.shape === "card" ? (ground ? t.h / 2 : 0) : m.shape === "ball" ? Math.min(t.w, t.h) / 2 : m.h3 / 2;
      m.obj.position.copy(at(b.x, b.y, ground ? lift + up : lift));
      const lit = Math.max(0, 1 - (s.t - b.flash) / 0.25);
      let k = 1 + 0.15 * lit;
      if (t.fx === "pulse" && !o.lessMotion()) k *= 1 + Math.sin(tsec * 6) * 0.06;
      m.obj.scale.setScalar(k);
      if (m.shape === "card") {
        // A card faces the camera (on the ground, turned about its upright); a runner's faces its way.
        if (ground) m.obj.rotation.set(0, -yaw, 0); else m.obj.rotation.set(0, 0, -b.rot);
        if (t.control === "platform" || t.look.kind === "sprite") m.obj.scale.x *= b.face;
        if (m.uv && t.look.kind === "sprite") {
          const f = sheetFrame(t.look, b.anim, s.t);
          const u0 = f.col / f.cols, u1 = (f.col + 1) / f.cols, top = 1 - f.row / f.rows, bottom = 1 - (f.row + 1) / f.rows;
          if (m.uv.getX(0) !== u0 || m.uv.getY(0) !== top) { m.uv.setXY(0, u0, top); m.uv.setXY(1, u1, top); m.uv.setXY(2, u0, bottom); m.uv.setXY(3, u1, bottom); m.uv.needsUpdate = true; }
        }
      } else if (ground) m.obj.rotation.set(t.fx === "wobble" ? Math.sin(tsec * 6) * 0.12 : 0, -b.rot, 0);
      else m.obj.rotation.set(t.fx === "wobble" ? Math.sin(tsec * 6) * 0.12 : 0, 0, -b.rot);
      if (m.mat) {
        // Its effect as light: a glow, a rainbow, a flash.
        if (t.fx === "glow") { m.mat.emissive.copy(m.mat.map ? glow : m.mat.color); m.mat.emissiveIntensity = 0.35 + Math.sin(tsec * 4) * 0.15; }
        else if (t.fx === "rainbow") { m.mat.emissive.setHSL((tsec * 0.3) % 1, 0.9, 0.5); m.mat.emissiveIntensity = 0.6; }
        else { m.mat.emissive.setRGB(1, 1, 1); m.mat.emissiveIntensity = lit * 0.8; }
      }
      if (m.mixer && m.clips) {
        const want = m.clips.find((c) => c.name.toLowerCase().includes(b.anim))?.name ?? m.clips[0].name;
        if (want !== m.playing) { m.mixer.stopAllAction(); m.mixer.clipAction(m.clips.find((c) => c.name === want)!).play(); m.playing = want; }
        m.mixer.update(dt);
      }
    }
    for (const [n, m] of made) if (!alive.has(n)) {
      scene.remove(m.obj);
      m.obj.traverse((x) => { const mm = x as T.Mesh; if (mm.isMesh && mm.geometry !== cube) { mm.geometry.dispose(); (mm.material as T.Material).dispose?.(); } });
      made.delete(n);
    }
    /* ---- the camera */
    const W = spec.w, H = spec.h, tilt = (v.tilt * Math.PI) / 180;
    const follow = spec.camera.follow;
    const target = s.bodies.find((b) => (follow ? (follow.startsWith("#") ? b.thing.tags.includes(follow.slice(1)) : b.of === follow) : b.thing.control !== "none"));
    const tx = v.camera === "fixed" ? spec.ww / 2 : target?.x ?? s.cx + W / 2, ty = v.camera === "fixed" ? spec.wh / 2 : target?.y ?? s.cy + H / 2;
    const wantYaw = ground && v.camera === "follow" && target?.thing.control === "car" ? target.rot : 0;
    yaw += (wantYaw - yaw) * (first ? 1 : Math.min(1, dt * 3));
    const far = v.camera === "fixed" ? Math.max(spec.ww, spec.wh) * 0.75 * v.distance : D;
    let lookAt: T.Vector3, eye: T.Vector3;
    if (ground) {
      const fx = Math.sin(yaw), fy = -Math.cos(yaw);
      lookAt = new THREE.Vector3(tx + fx * far * 0.15, 0, ty + fy * far * 0.15);
      eye = v.camera === "top"
        ? new THREE.Vector3(tx, far * 1.5, ty + 1)
        : new THREE.Vector3(tx - fx * far * Math.cos(tilt), far * Math.sin(tilt), ty - fy * far * Math.cos(tilt));
    } else {
      const lean = (Math.max(0, Math.min(30, (v.tilt - 10) * 0.4)) * Math.PI) / 180;
      const cy = v.camera === "fixed" ? spec.wh / 2 : s.cy + H / 2, cx = v.camera === "fixed" ? spec.ww / 2 : s.cx + W / 2;
      lookAt = new THREE.Vector3(cx, -cy, 0);
      const dist = (v.camera === "fixed" ? far : H / 2 / Math.tan((22.5 * Math.PI) / 180)) * v.distance;
      eye = new THREE.Vector3(cx, -cy + Math.sin(lean) * dist, Math.cos(lean) * dist);
    }
    const ease = first ? 1 : Math.min(1, dt * 6);
    look.lerp(lookAt, ease);
    from.lerp(eye, ease);
    if (first) { look.copy(lookAt); from.copy(eye); }
    first = false;
    const shake = s.shake > 0 && !o.lessMotion() ? 10 * (s.shake / 0.3) : 0;
    camera.position.set(from.x + (Math.random() - 0.5) * shake, from.y + (Math.random() - 0.5) * shake, from.z);
    camera.lookAt(look);
    sun.target.position.copy(look);
    sun.position.copy(look).addScaledVector(sunDir, 2500);
    /* ---- particles: in the air on the ground (the weather falls from above), on the wall as in 2D */
    const pos = pGeo.getAttribute("position") as T.BufferAttribute, tint = pGeo.getAttribute("tint") as T.BufferAttribute;
    const size = pGeo.getAttribute("size") as T.BufferAttribute, alpha = pGeo.getAttribute("alpha") as T.BufferAttribute, sh = pGeo.getAttribute("shape") as T.BufferAttribute;
    o.parts.list.forEach((q, i) => {
      const age = q.max - q.life;
      let p: T.Vector3;
      let hide = false;
      if (ground) {
        // The weather and confetti fall from above; trails and bursts rise a little where they are; no stars on the ground.
        hide = q.max > 1e6;
        const falling = q.max > 2.5;
        p = falling ? new THREE.Vector3(q.x, 600 * Math.max(0, q.life / q.max), s.cy + ((Math.abs(q.x) * 7.31) % 1) * H) : new THREE.Vector3(q.x, 25 + age * 60, q.y);
      } else p = new THREE.Vector3(q.sway === -1 ? s.cx + q.x : q.x, -(q.sway === -1 ? s.cy + q.y : q.y), 30);
      const c = tintOf(q.color);
      pos.setXYZ(i, p.x, p.y, p.z); tint.setXYZ(i, c.r, c.g, c.b); size.setX(i, hide ? 0 : q.size); alpha.setX(i, alphaOf(q, tsec)); sh.setX(i, q.shape);
    });
    for (const a of [pos, tint, size, alpha, sh]) a.needsUpdate = true;
    pGeo.setDrawRange(0, o.parts.list.length);
    pMat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((22.5 * Math.PI) / 180));
    dots.forEach((m, i) => { const p = s.aim?.pts[i]; m.visible = Boolean(p); if (p) m.position.copy(at(p[0], p[1], 20)); });
    const lines = physJoints(s.phys, s).filter((j) => j.kind === "rope" || j.kind === "spring" || j.kind === "slider").slice(0, 40);
    const lp = strings.geometry.getAttribute("position") as T.BufferAttribute;
    lines.forEach((l, i) => { const a = at(l.from.x, l.from.y, 20), b = at(l.to.x, l.to.y, 20); lp.setXYZ(i * 2, a.x, a.y, a.z); lp.setXYZ(i * 2 + 1, b.x, b.y, b.z); });
    strings.geometry.setDrawRange(0, lines.length * 2);
    lp.needsUpdate = true;
    renderer.render(scene, camera);
  };

  return {
    draw,
    resize(width, height) { camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); },
    toWorld(clientX, clientY, rect) {
      const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!hit) return null;
      return ground ? { x: hit.x, y: hit.z } : { x: hit.x, y: -hit.y };
    },
    models: () => modelsLoaded,
    dispose() {
      for (const m of made.values()) m.obj.traverse((x) => { const mm = x as T.Mesh; if (mm.isMesh) { mm.geometry.dispose(); (mm.material as T.Material).dispose?.(); } });
      for (const m of tileMeshes) { (m.material as T.Material).dispose(); m.dispose(); }
      for (const t of textures) t.dispose();
      cube.dispose(); floor.geometry.dispose(); (floor.material as T.Material).dispose();
      pGeo.dispose(); pMat.dispose(); dotGeo.dispose(); dotMat.dispose(); strings.geometry.dispose(); (strings.material as T.Material).dispose();
      envTex?.dispose();
      renderer.shadowMap.enabled = false;
    },
  };
}
