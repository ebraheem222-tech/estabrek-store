"use client";
import { ScenePacer } from "./ScenePacer";
import { sceneDpr } from "@/lib/motionBudget";
import { memo, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { warmScene } from "./warmScene";
import { createFabricTexture } from "./fabricTexture";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { createDisplayHead, createHijabGeometry } from "./HijabGeometry";

export type SeasonsSceneProps = {
  /** 0 → winter, 1 → spring; written by the scroll timeline every frame. */
  progress: MutableRefObject<number>;
  active: boolean;
  reducedMotion: boolean;
  showModel: boolean;
  rtl: boolean;
  onReady: () => void;
  onFailure: () => void;
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const seasonMix = (p: number) => smooth(0.38, 0.62, p);

function rand(seed: number) {
  // Deterministic layout so every visit sees the same composition.
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function glowTexture(inner: string, outer: string) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ---------- Winter: rain streaks, soft snow and 3D ice crystals ---------- */

function Rain({ progress }: { progress: MutableRefObject<number> }) {
  const count = 420;
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 6);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = (rand(i) - 0.5) * 18, y = (rand(i + 1) - 0.5) * 11, z = -rand(i + 2) * 6;
      positions.set([x, y, z, x - 0.05, y - 0.42, z], i * 6);
      speeds[i] = 9 + rand(i + 3) * 6;
    }
    return { positions, speeds };
  }, []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color: "#8fa4cf", transparent: true, opacity: 0, depthWrite: false }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame((_, delta) => {
    const amount = 1 - smooth(0.12, 0.32, progress.current);
    material.opacity = amount * 0.55;
    if (amount <= 0.01) return;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      let y = positions[o + 1] - speeds[i] * dt;
      let x = positions[o] - speeds[i] * dt * 0.12;
      if (y < -6) { y = 6; x = (rand(i + y) - 0.5) * 18; }
      positions[o] = x; positions[o + 1] = y;
      positions[o + 3] = x - 0.05; positions[o + 4] = y - 0.42;
    }
    geometry.attributes.position.needsUpdate = true;
  });
  return <lineSegments geometry={geometry} material={material} />;
}

function Snow({ progress }: { progress: MutableRefObject<number> }) {
  const count = 900;
  const { positions, drift } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const drift = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions.set([(rand(i * 3) - 0.5) * 18, (rand(i * 3 + 1) - 0.5) * 11, -rand(i * 3 + 2) * 7 + 1], i * 3);
      drift[i] = rand(i * 7) * Math.PI * 2;
    }
    return { positions, drift };
  }, []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  const material = useMemo(() => new THREE.PointsMaterial({
    size: 0.11, map: glowTexture("rgba(255,255,255,1)", "rgba(255,255,255,0)"),
    transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true,
  }), []);
  useEffect(() => () => { geometry.dispose(); material.map?.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(({ clock }, delta) => {
    const p = progress.current;
    const amount = smooth(0.0, 0.14, p) * (1 - seasonMix(p));
    material.opacity = amount * 0.95;
    if (amount <= 0.01) return;
    const dt = Math.min(delta, 0.05), t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      positions[o] += Math.sin(t * 0.6 + drift[i]) * dt * 0.25;
      positions[o + 1] -= dt * (0.55 + (i % 7) * 0.08);
      if (positions[o + 1] < -6) positions[o + 1] = 6;
    }
    geometry.attributes.position.needsUpdate = true;
  });
  return <points geometry={geometry} material={material} />;
}

function crystalGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
    const angle = (k * Math.PI) / 3;
    const arm = new THREE.BoxGeometry(0.07, 1, 0.035).translate(0, 0.5, 0);
    const left = new THREE.BoxGeometry(0.05, 0.34, 0.03).translate(0, 0.17, 0).rotateZ(0.8).translate(0, 0.58, 0);
    const right = new THREE.BoxGeometry(0.05, 0.34, 0.03).translate(0, 0.17, 0).rotateZ(-0.8).translate(0, 0.58, 0);
    const tipL = new THREE.BoxGeometry(0.04, 0.2, 0.03).translate(0, 0.1, 0).rotateZ(0.8).translate(0, 0.84, 0);
    const tipR = new THREE.BoxGeometry(0.04, 0.2, 0.03).translate(0, 0.1, 0).rotateZ(-0.8).translate(0, 0.84, 0);
    [arm, left, right, tipL, tipR].forEach((g) => parts.push(g.rotateZ(angle)));
  }
  parts.push(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 6).rotateX(Math.PI / 2));
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

function Crystals({ progress }: { progress: MutableRefObject<number> }) {
  const count = 12;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(crystalGeometry, []);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#eef3ff", roughness: 0.12, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08,
    sheen: 0.6, sheenColor: new THREE.Color("#c9d6ff"), transparent: true, opacity: 0, emissive: new THREE.Color("#93a6d8"), emissiveIntensity: 0.18,
  }), []);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: (rand(i * 11) - 0.5) * 15, y: (rand(i * 11 + 1) - 0.5) * 8, z: -1 - rand(i * 11 + 2) * 4,
    s: 0.22 + rand(i * 11 + 3) * 0.35, spin: 0.2 + rand(i * 11 + 4) * 0.5, fall: 0.15 + rand(i * 11 + 5) * 0.2,
  })), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const p = progress.current, t = clock.elapsedTime;
    const amount = smooth(0.04, 0.2, p) * (1 - seasonMix(p));
    material.opacity = amount;
    mesh.current.visible = amount > 0.01;
    if (!mesh.current.visible) return;
    seeds.forEach((s, i) => {
      const y = ((s.y - t * s.fall + 50) % 9) - 4.5;
      dummy.position.set(s.x + Math.sin(t * 0.4 + i) * 0.3, y, s.z);
      dummy.rotation.set(Math.sin(t * s.spin + i) * 0.6, t * s.spin, t * s.spin * 0.4);
      dummy.scale.setScalar(s.s * (0.6 + amount * 0.4));
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geometry, material, count]} />;
}

/* ---------- Spring: rising sun, 3D blossoms and drifting petals ---------- */

function Sun({ progress, rtl }: { progress: MutableRefObject<number>; rtl: boolean }) {
  const group = useRef<THREE.Group>(null);
  const rays = useRef<THREE.Group>(null);
  const viewport = useThree((s) => s.viewport);
  const halo = useMemo(() => new THREE.SpriteMaterial({
    map: glowTexture("rgba(255,214,140,0.95)", "rgba(255,190,120,0)"), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
  }), []);
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffd98a", transparent: true, opacity: 0 }), []);
  const ray = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffc76b", transparent: true, opacity: 0, depthWrite: false }), []);
  useEffect(() => () => { halo.map?.dispose(); halo.dispose(); core.dispose(); ray.dispose(); }, [halo, core, ray]);
  useFrame(({ clock }) => {
    if (!group.current || !rays.current) return;
    const mix = seasonMix(progress.current);
    group.current.visible = mix > 0.01;
    const side = rtl ? -1 : 1;
    group.current.position.set(side * viewport.width * 0.1, THREE.MathUtils.lerp(-5, viewport.height * 0.34, mix), -4);
    core.opacity = mix;
    halo.opacity = mix * 0.9;
    ray.opacity = mix * 0.55;
    rays.current.rotation.z = clock.elapsedTime * 0.12;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.04;
    rays.current.scale.setScalar(pulse);
  });
  return (
    <group ref={group}>
      <sprite material={halo} scale={[5.2, 5.2, 1]} />
      <mesh material={core}><sphereGeometry args={[0.72, 48, 48]} /></mesh>
      <group ref={rays}>
        {Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return (
            <mesh key={i} material={ray} position={[Math.cos(a) * 1.18, Math.sin(a) * 1.18, 0]} rotation={[0, 0, a - Math.PI / 2]}>
              <coneGeometry args={[0.09, i % 2 ? 0.55 : 0.85, 12]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function petalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.22, 0.12, 0.2, 0.46, 0, 0.6);
  shape.bezierCurveTo(-0.2, 0.46, -0.22, 0.12, 0, 0);
  const g = new THREE.ShapeGeometry(shape, 10);
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, 0.35 * x * x + 0.18 * y * y); // cupped like a real petal
  }
  g.computeVertexNormals();
  return g;
}

function blossomGeometry() {
  const base = petalGeometry();
  const petals = Array.from({ length: 5 }, (_, i) => base.clone().rotateX(-0.35).rotateZ((i / 5) * Math.PI * 2));
  const merged = mergeGeometries(petals);
  petals.forEach((g) => g.dispose());
  base.dispose();
  return merged;
}

function Blossoms({ progress }: { progress: MutableRefObject<number> }) {
  const flowers = 9, loose = 140;
  const flowerMesh = useRef<THREE.InstancedMesh>(null);
  const centerMesh = useRef<THREE.InstancedMesh>(null);
  const petalMesh = useRef<THREE.InstancedMesh>(null);
  const blossom = useMemo(blossomGeometry, []);
  const petal = useMemo(petalGeometry, []);
  const center = useMemo(() => new THREE.SphereGeometry(0.11, 16, 16), []);
  const petalMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#ffffff", side: THREE.DoubleSide, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color("#ffd1dc"), transparent: true, opacity: 0,
  }), []);
  const centerMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f7c34f", roughness: 0.6, transparent: true, opacity: 0 }), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const palette = useMemo(() => ["#f7b6c8", "#fbd3dd", "#ffffff", "#f29fb7", "#fde2e8"].map((c) => new THREE.Color(c)), []);
  useEffect(() => {
    for (let i = 0; i < flowers; i++) flowerMesh.current?.setColorAt(i, palette[i % palette.length]);
    for (let i = 0; i < loose; i++) petalMesh.current?.setColorAt(i, palette[(i * 3) % palette.length]);
    if (flowerMesh.current?.instanceColor) flowerMesh.current.instanceColor.needsUpdate = true;
    if (petalMesh.current?.instanceColor) petalMesh.current.instanceColor.needsUpdate = true;
  }, [palette]);
  useEffect(() => () => { blossom.dispose(); petal.dispose(); center.dispose(); petalMaterial.dispose(); centerMaterial.dispose(); }, [blossom, petal, center, petalMaterial, centerMaterial]);
  useFrame(({ clock }) => {
    const p = progress.current, t = clock.elapsedTime;
    const amount = smooth(0.5, 0.72, p);
    petalMaterial.opacity = amount;
    centerMaterial.opacity = amount;
    const visible = amount > 0.01;
    [flowerMesh, centerMesh, petalMesh].forEach((m) => { if (m.current) m.current.visible = visible; });
    if (!visible || !flowerMesh.current || !centerMesh.current || !petalMesh.current) return;
    for (let i = 0; i < flowers; i++) {
      const x = (rand(i * 5) - 0.5) * 15, baseY = (rand(i * 5 + 1) - 0.5) * 7, z = -1.5 - rand(i * 5 + 2) * 3;
      const s = (0.55 + rand(i * 5 + 3) * 0.5) * (0.5 + amount * 0.5);
      dummy.position.set(x, baseY + Math.sin(t * 0.7 + i) * 0.25 - (1 - amount) * 2, z);
      dummy.rotation.set(0.5 + Math.sin(t * 0.5 + i) * 0.3, Math.sin(t * 0.3 + i * 2) * 0.6, t * 0.25 + i);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      flowerMesh.current.setMatrixAt(i, dummy.matrix);
      centerMesh.current.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < loose; i++) {
      const speed = 0.25 + rand(i * 13) * 0.35;
      const y = 5 - ((t * speed + rand(i * 13 + 1) * 10) % 10);
      const x = (rand(i * 13 + 2) - 0.5) * 18 + Math.sin(t * 0.8 + i) * 0.6;
      dummy.position.set(x, y, -rand(i * 13 + 3) * 6 + 1);
      dummy.rotation.set(t * (0.6 + rand(i) * 0.8) + i, t * 0.9 + i, t * 0.4);
      dummy.scale.setScalar(0.32 + rand(i * 13 + 4) * 0.25);
      dummy.updateMatrix();
      petalMesh.current.setMatrixAt(i, dummy.matrix);
    }
    flowerMesh.current.instanceMatrix.needsUpdate = true;
    centerMesh.current.instanceMatrix.needsUpdate = true;
    petalMesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={flowerMesh} args={[blossom, petalMaterial, flowers]} />
      <instancedMesh ref={centerMesh} args={[center, centerMaterial, flowers]} />
      <instancedMesh ref={petalMesh} args={[petal, petalMaterial, loose]} />
    </>
  );
}

/* ---------- The garment: one dress form, re-dressed from winter wool to spring silk ---------- */

/** The dress form's profile, made once: built inline it was a new array on every
 * render, so the geometry was rebuilt (and re-uploaded) each time the season flipped. */
const FORM_PROFILE: [THREE.Vector2[], number] = [[
  new THREE.Vector2(0, -1.62), new THREE.Vector2(0.65, -1.62), new THREE.Vector2(0.83, -1.2),
  new THREE.Vector2(1.04, -0.6), new THREE.Vector2(1.01, -0.39), new THREE.Vector2(0.61, -0.1),
  new THREE.Vector2(0.24, 0.04), new THREE.Vector2(0.21, 0.44), new THREE.Vector2(0, 0.44),
], 64];

const WINTER_FABRIC = new THREE.Color("#5b4a72");
const SPRING_FABRIC = new THREE.Color("#f1b2c4");

function SeasonalDressForm({ progress, rtl }: { progress: MutableRefObject<number>; rtl: boolean }) {
  const group = useRef<THREE.Group>(null);
  const viewport = useThree((s) => s.viewport);
  const geometries = useMemo(() => createHijabGeometry(), []);
  const head = useMemo(() => createDisplayHead(), []);
  // Woven cloth with a knit rib (winter); the rib flattens into a fine weave in spring.
  const knit = useMemo(() => {
    const t = createFabricTexture({ threads: 40, rib: 0.6 });
    t.repeat(6, 8);
    return t;
  }, []);
  const fabric = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: WINTER_FABRIC.clone(), side: THREE.DoubleSide, roughness: 1, sheen: 0.55,
    sheenColor: new THREE.Color("#d9d2f2"), sheenRoughness: 0.7, bumpMap: knit.bump, bumpScale: 0.035, roughnessMap: knit.rough,
  }), [knit]);
  useEffect(() => () => {
    Object.values(geometries).forEach((g) => g.dispose());
    head.dispose(); fabric.dispose(); knit.dispose();
  }, [geometries, head, fabric, knit]);
  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    const p = progress.current, mix = seasonMix(p);
    fabric.color.copy(WINTER_FABRIC).lerp(SPRING_FABRIC, mix);
    // roughnessMap averages ~0.8: 1.0 → about 0.8 (wool), 0.62 → about 0.5 (light spring cloth).
    fabric.roughness = THREE.MathUtils.lerp(1, 0.62, mix);
    fabric.bumpScale = THREE.MathUtils.lerp(0.035, 0.02, mix);
    fabric.sheenColor.set(mix > 0.5 ? "#ffe1ea" : "#d9d2f2");
    const side = rtl ? -1 : 1;
    group.current.position.set(side * viewport.width * 0.27, -0.35 + Math.sin(clock.elapsedTime * 0.7) * 0.03, 0);
    // She faces the shopper, then makes one full turn as the season changes.
    const turn = smooth(0.34, 0.66, p);
    group.current.rotation.y = (rtl ? 0.32 : -0.32) + turn * Math.PI * 2 + Math.sin(clock.elapsedTime * 0.35) * 0.08 + pointer.x * 0.08;
    const s = Math.min(1.1, viewport.height / 5.6);
    group.current.scale.setScalar(s);
  });
  return (
    <group ref={group}>
      <mesh geometry={head} position={[0, 0.87, 0.055]}>
        <meshStandardMaterial color="#f5eae0" roughness={0.73} />
      </mesh>
      <mesh scale={[0.78, 1, 0.45]}>
        <latheGeometry args={FORM_PROFILE} />
        <meshStandardMaterial color="#efe1d7" roughness={0.75} />
      </mesh>
      {Object.entries(geometries).map(([name, geometry]) => (
        <mesh key={name} geometry={geometry} material={fabric} />
      ))}
      <mesh position={[0, -1.77, 0]}>
        <cylinderGeometry args={[0.32, 0.4, 0.3, 48]} />
        <meshStandardMaterial color="#e2cfc4" roughness={0.6} />
      </mesh>
      <mesh position={[0, -2.0, 0]}>
        <cylinderGeometry args={[1.25, 1.32, 0.16, 64]} />
        <meshStandardMaterial color="#f3e6de" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Lifecycle({ onReady, onFailure }: Pick<SeasonsSceneProps, "onReady" | "onFailure">) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const ready = useRef(onReady), failure = useRef(onFailure);
  ready.current = onReady; failure.current = onFailure;
  useEffect(() => {
    let alive = true;
    // Build every shader now (hidden parts included), then show the scene.
    // (The warm-up leaves the canvas empty: ask for a real frame right after.)
    warmScene(gl, scene, camera).then(() => { invalidate(); if (alive) ready.current(); });
    const lost = () => failure.current();
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => { alive = false; gl.domElement.removeEventListener("webglcontextlost", lost); };
  }, [gl, scene, camera, invalidate]);
  return null;
}

function SeasonLights({ progress }: { progress: MutableRefObject<number> }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.AmbientLight>(null);
  const cold = useMemo(() => new THREE.Color("#c8d4ff"), []), warm = useMemo(() => new THREE.Color("#ffd9a8"), []);
  useFrame(() => {
    const mix = seasonMix(progress.current);
    if (key.current) { key.current.color.copy(cold).lerp(warm, mix); key.current.intensity = THREE.MathUtils.lerp(1.6, 2.6, mix); }
    if (fill.current) fill.current.intensity = THREE.MathUtils.lerp(0.7, 1.0, mix);
  });
  return (
    <>
      <ambientLight ref={fill} intensity={0.8} />
      <directionalLight ref={key} position={[3, 5, 4]} intensity={2} />
      <directionalLight position={[-3, 1, -2]} intensity={1.1} color="#f1d3ec" />
    </>
  );
}

function SeasonsScene(props: SeasonsSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 40 }}
      dpr={sceneDpr()}
      /* Drawn by ScenePacer: 60 frames a second at most (30 in the light mode). */
      frameloop="demand"
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <SeasonLights progress={props.progress} />
      <Environment resolution={64}>
        <Lightformer form="rect" intensity={2} position={[3, 4, 3]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-4, 2, 1]} scale={[3, 4, 1]} />
      </Environment>
      <Rain progress={props.progress} />
      <Snow progress={props.progress} />
      <Crystals progress={props.progress} />
      <Sun progress={props.progress} rtl={props.rtl} />
      <Blossoms progress={props.progress} />
      {props.showModel && <SeasonalDressForm progress={props.progress} rtl={props.rtl} />}
      <ScenePacer active={props.active && !props.reducedMotion} />
      <Lifecycle onReady={props.onReady} onFailure={props.onFailure} />
    </Canvas>
  );
}

/**
 * The page re-renders when the season flips (copy, Rose's outfit); the 3D scene
 * doesn't need to (it reads the season from `progress` every frame), so it only
 * re-renders when one of its real settings changes. The callbacks are read
 * through refs inside, so new copies of them don't matter.
 */
export default memo(SeasonsScene, (a, b) =>
  a.progress === b.progress && a.active === b.active && a.reducedMotion === b.reducedMotion && a.showModel === b.showModel && a.rtl === b.rtl,
);
