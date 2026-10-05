"use client";
import { ScenePacer } from "./ScenePacer";
import { sceneDpr } from "@/lib/motionBudget";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { warmScene } from "./warmScene";
import type { StoryKey } from "@/lib/collectionStories";
import type { PalmRef } from "./mascot/RoseMascot";

export type CollectionModelsProps = {
  keys: StoryKey[];
  /** Visibility of each chapter (0–1), written by the scroll timeline every frame. */
  weights: MutableRefObject<number[]>;
  active: boolean;
  compact: boolean;
  rtl: boolean;
  onReady: () => void;
  onFailure: () => void;
  /** When Rose (the 2D guide) holds the models, each one sits on her open palm. */
  palm?: PalmRef;
};

const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
const easeOut = (t: number) => 1 - (1 - t) ** 3;

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Grid surface helper: fn(u, v) → point, u around, v down. */
function surface(fn: (u: number, v: number, out: THREE.Vector3) => void, nu = 96, nv = 64) {
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      fn(i / nu, j / nv, p);
      positions.push(p.x, p.y, p.z);
      uvs.push(i / nu, 1 - j / nv);
    }
  }
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + nu + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

type ModelProps = { weight: () => number; rtl: boolean; compact: boolean; palm?: PalmRef };

/** Shared choreography: each model rises, unfolds and turns in as its chapter arrives. */
function useStage(weight: () => number, rtl: boolean, compact: boolean, baseScale: number, lift = 0, hold?: { palm?: PalmRef; base: number }) {
  const group = useRef<THREE.Group>(null);
  const viewport = useThree((s) => s.viewport);
  const gl = useThree((s) => s.gl);
  useFrame(({ clock, pointer }) => {
    const g = group.current;
    if (!g) return;
    const w = weight();
    g.visible = w > 0.01;
    if (!g.visible) return;
    const e = easeOut(w);
    const palm = hold?.palm?.current;
    if (palm) {
      // Smaller, floating just above Rose's palm (screen px → world units on the z = 0 plane).
      const rect = gl.domElement.getBoundingClientRect();
      const px = ((palm.x - rect.left) / rect.width - 0.5) * viewport.width;
      const py = -((palm.y - rect.top) / rect.height - 0.5) * viewport.height;
      // Phones: a little smaller and closer over her hand, so the piece stays in her
      // free corner instead of drifting behind the title.
      const s = baseScale * (viewport.height / (compact ? 12 : 7)) * (0.55 + 0.45 * e);
      g.position.set(px + palm.dir * s * (compact ? 0.25 : 0.85), py - hold!.base * s + 0.12 + Math.sin(clock.elapsedTime * 1.6) * 0.04 - (1 - e) * 0.6, 0);
      g.scale.setScalar(s);
      g.rotation.y = clock.elapsedTime * 0.45 + (1 - e) * 2.2;
      g.rotation.x = 0;
      return;
    }
    const side = rtl ? -1 : 1;
    const x = compact ? 0 : side * viewport.width * 0.26;
    // On phones the model floats in the free band above the copy.
    const y = (compact ? viewport.height * 0.22 : -0.1) + lift * (compact ? 0.5 : 1);
    const s = baseScale * (compact ? Math.min(0.66, viewport.width / 6.6) : Math.min(1.1, viewport.height / 5.8)) * (0.55 + 0.45 * e);
    g.position.set(x, y - (1 - e) * 1.4 + Math.sin(clock.elapsedTime * 0.8) * 0.05, 0);
    g.scale.setScalar(s);
    g.rotation.y = clock.elapsedTime * 0.35 + (1 - e) * 2.2 + pointer.x * 0.15;
    g.rotation.x = pointer.y * 0.05;
  });
  return group;
}

/* ------------------------------ Accessories ------------------------------ */
/* A smart tasbih ring with a glowing counter, an orbit of pearls and a shawl pin. */

function Accessories({ weight, rtl, compact, palm }: ModelProps) {
  const group = useStage(weight, rtl, compact, 1.05, 0.15, { palm, base: -0.95 });
  const orbit = useRef<THREE.Group>(null);
  const sparkle = useRef<THREE.Points>(null);
  const gold = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#e9c27a", metalness: 1, roughness: 0.24, clearcoat: 0.6, clearcoatRoughness: 0.15 }), []);
  const roseGold = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#e7b3a0", metalness: 1, roughness: 0.28 }), []);
  const pearl = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#fbf4ec", roughness: 0.22, metalness: 0, sheen: 1, sheenColor: new THREE.Color("#ffd9e6"), iridescence: 0.8, iridescenceIOR: 1.6, clearcoat: 1 }), []);
  const screen = useMemo(() => {
    const map = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = "#14101a";
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = "rgba(255,170,200,.55)";
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(128, 128, 104, -Math.PI / 2, Math.PI * 1.15); ctx.stroke();
      ctx.fillStyle = "#ffd3e2";
      ctx.font = "bold 92px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("33", 128, 134);
    });
    return new THREE.MeshStandardMaterial({ color: "#111", emissive: "#ffffff", emissiveMap: map, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.2 });
  }, []);
  const glints = useMemo(() => {
    const n = 140, positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 1.6 + rand(i) * 2.2, a = rand(i + 7) * Math.PI * 2, y = (rand(i + 13) - 0.5) * 3.2;
      positions.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  const glintMaterial = useMemo(() => new THREE.PointsMaterial({
    size: 0.09, color: "#ffe2a6", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    map: canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,240,200,.8)"); g.addColorStop(1, "rgba(255,220,150,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    }),
  }), []);
  useEffect(() => () => {
    [gold, roseGold, pearl].forEach((m) => m.dispose());
    screen.emissiveMap?.dispose(); screen.dispose();
    glints.dispose(); glintMaterial.map?.dispose(); glintMaterial.dispose();
  }, [gold, roseGold, pearl, screen, glints, glintMaterial]);
  useFrame(({ clock }) => {
    const w = weight(), t = clock.elapsedTime;
    if (orbit.current) orbit.current.rotation.y = -t * 0.5;
    glintMaterial.opacity = w * (0.55 + Math.sin(t * 3) * 0.25);
    if (sparkle.current) sparkle.current.rotation.y = t * 0.08;
    screen.emissiveIntensity = 0.75 + Math.sin(t * 2.2) * 0.2;
  });
  return (
    <group ref={group}>
      {/* The ring stands on its edge, tilted towards the shopper. */}
      <group rotation={[0.78, 0, 0.12]}>
        <mesh material={gold}><torusGeometry args={[1, 0.17, 48, 180]} /></mesh>
        <mesh material={roseGold} position={[0, 1.18, 0]}><cylinderGeometry args={[0.42, 0.46, 0.24, 64]} /></mesh>
        <mesh material={screen} position={[0, 1.31, 0]}><cylinderGeometry args={[0.34, 0.34, 0.03, 64]} /></mesh>
        <mesh material={gold} position={[0.47, 1.18, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.1, 24]} /></mesh>
      </group>
      {/* Tasbih pearls in orbit */}
      <group ref={orbit} rotation={[0.35, 0, -0.18]}>
        {Array.from({ length: 11 }, (_, i) => {
          const a = (i / 11) * Math.PI * 2;
          return (
            <mesh key={i} material={pearl} position={[Math.cos(a) * 1.95, Math.sin(a * 2) * 0.12, Math.sin(a) * 1.95]}>
              <sphereGeometry args={[0.12 + (i % 3) * 0.025, 32, 32]} />
            </mesh>
          );
        })}
      </group>
      {/* Shawl pin with a pearl head */}
      <group position={[-1.05, -1.25, 0.4]} rotation={[0.2, 0.3, -0.85]}>
        <mesh material={gold}><cylinderGeometry args={[0.022, 0.012, 1.7, 16]} /></mesh>
        <mesh material={pearl} position={[0, 0.9, 0]}><sphereGeometry args={[0.16, 32, 32]} /></mesh>
        <mesh material={roseGold} position={[0, 0.72, 0]}><octahedronGeometry args={[0.1, 0]} /></mesh>
      </group>
      <points ref={sparkle} geometry={glints} material={glintMaterial} />
    </group>
  );
}

/* --------------------------------- Kids --------------------------------- */
/* A little floral dress with puff sleeves and a waist bow, on a child-size form. */

function dressGeometry() {
  return surface((u, v, out) => {
    const a = u * Math.PI * 2;
    const skirt = THREE.MathUtils.smoothstep(v, 0.36, 1);
    let r: number;
    if (v < 0.1) r = THREE.MathUtils.lerp(0.2, 0.44, v / 0.1);
    else if (v < 0.38) r = THREE.MathUtils.lerp(0.44, 0.34, (v - 0.1) / 0.28);
    else r = THREE.MathUtils.lerp(0.34, 1.08, Math.pow((v - 0.38) / 0.62, 0.85));
    r *= 1 + 0.075 * Math.sin(a * 14) * skirt;                 // soft pleats
    const y = THREE.MathUtils.lerp(1.15, -1.55, v) + 0.045 * Math.sin(a * 14) * skirt * skirt; // wavy hem
    out.set(Math.cos(a) * r, y, Math.sin(a) * r * (v < 0.38 ? 0.78 : 0.92));
  }, 128, 72);
}

function Kids({ weight, rtl, compact, palm }: ModelProps) {
  const group = useStage(weight, rtl, compact, 1, 0.1, { palm, base: -1.6 });
  const bubbles = useRef<THREE.InstancedMesh>(null);
  const dress = useMemo(dressGeometry, []);
  const floral = useMemo(() => canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#ec8ea3";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 46; i++) {
      const x = rand(i) * 256, y = rand(i + 50) * 256, s = 5 + rand(i + 99) * 6;
      ctx.fillStyle = i % 3 ? "#fff6f2" : "#ffd6a5";
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#f7c34f";
      ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }), []);
  useEffect(() => { floral.repeat.set(3, 2); }, [floral]);
  const fabric = useMemo(() => new THREE.MeshPhysicalMaterial({ map: floral, side: THREE.DoubleSide, roughness: 0.75, sheen: 0.6, sheenColor: new THREE.Color("#fff0f4") }), [floral]);
  const satin = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#fffaf3", roughness: 0.32, sheen: 1, sheenColor: new THREE.Color("#ffe4ec"), clearcoat: 0.4 }), []);
  const form = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f3e6dc", roughness: 0.7 }), []);
  const bubble = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0, transparent: true, opacity: 0.28, iridescence: 1, iridescenceIOR: 1.3, clearcoat: 1, depthWrite: false }), []);
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 24, 24), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => () => { dress.dispose(); floral.dispose(); [fabric, satin, form, bubble].forEach((m) => m.dispose()); sphere.dispose(); }, [dress, floral, fabric, satin, form, bubble, sphere]);
  useFrame(({ clock }) => {
    const m = bubbles.current;
    if (!m) return;
    const t = clock.elapsedTime, w = weight();
    bubble.opacity = 0.28 * w;
    for (let i = 0; i < 26; i++) {
      const speed = 0.25 + rand(i) * 0.3;
      const y = ((t * speed + rand(i + 3) * 6) % 6) - 2.6;
      dummy.position.set((rand(i + 9) - 0.5) * 4.2 + Math.sin(t + i) * 0.15, y, (rand(i + 21) - 0.5) * 2.4);
      dummy.scale.setScalar(0.06 + rand(i + 33) * 0.14);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  const waistY = 1.15 - 0.38 * 2.7;
  return (
    <group ref={group}>
      <mesh material={form} position={[0, 1.28, 0]}><cylinderGeometry args={[0.13, 0.16, 0.28, 32]} /></mesh>
      <mesh material={form} position={[0, 1.5, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.16, 32, 16]} /></mesh>
      <mesh geometry={dress} material={fabric} />
      <mesh material={satin} position={[0, 1.13, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]}><torusGeometry args={[0.215, 0.04, 16, 64]} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={fabric} position={[s * 0.44, 0.98, 0]} scale={[0.95, 0.8, 0.85]}><sphereGeometry args={[0.2, 32, 24]} /></mesh>
      ))}
      <mesh material={satin} position={[0, waistY, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.78, 1]}><torusGeometry args={[0.35, 0.05, 16, 80]} /></mesh>
      {/* Front bow */}
      <group position={[0, waistY, 0.29]}>
        {[-1, 1].map((s) => (
          <mesh key={s} material={satin} position={[s * 0.13, 0.01, 0]} rotation={[0, 0, s * 0.45]} scale={[0.17, 0.1, 0.05]}><sphereGeometry args={[1, 24, 16]} /></mesh>
        ))}
        <mesh material={satin}><sphereGeometry args={[0.055, 16, 16]} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={`tail${s}`} material={satin} position={[s * 0.07, -0.2, 0]} rotation={[0, 0, s * 0.25]}><boxGeometry args={[0.07, 0.36, 0.015]} /></mesh>
        ))}
      </group>
      <mesh material={form} position={[0, -1.78, 0]}><cylinderGeometry args={[0.035, 0.035, 0.5, 16]} /></mesh>
      <mesh material={form} position={[0, -2.04, 0]}><cylinderGeometry args={[0.62, 0.66, 0.08, 64]} /></mesh>
      <instancedMesh ref={bubbles} args={[sphere, bubble, 26]} />
    </group>
  );
}

/* -------------------------------- Incense -------------------------------- */
/* A turned-wood mabkhara with gold inlay, glowing bakhoor and rising smoke. */

const SMOKE_VERTEX = `
attribute float aAge;
attribute float aSeed;
uniform float uSize;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (1.0 + aAge * 3.0) * (300.0 / -mv.z);
  vAlpha = (1.0 - aAge) * smoothstep(0.0, 0.12, aAge) * (0.6 + aSeed * 0.4);
}`;
const SMOKE_FRAGMENT = `
uniform float uOpacity;
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = vAlpha * uOpacity * (1.0 - smoothstep(0.1, 0.5, d));
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

function Incense({ weight, rtl, compact, palm }: ModelProps) {
  const group = useStage(weight, rtl, compact, 0.95, -0.05, { palm, base: -1.75 });
  const glow = useRef<THREE.PointLight>(null);
  const glowAt = useMemo(() => new THREE.Vector3(), []);
  const body = useMemo(() => {
    const pts = [
      [0, -1.9], [1.0, -1.9], [1.03, -1.78], [0.9, -1.68], [0.68, -1.55], [0.46, -1.25], [0.37, -0.85], [0.4, -0.55],
      [0.58, -0.38], [0.92, -0.16], [1.13, 0.14], [1.19, 0.42], [1.14, 0.56], [1.05, 0.62], [0.98, 0.56], [0.94, 0.3], [0.68, 0.1], [0, 0.04],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 96);
  }, []);
  const wood = useMemo(() => {
    const map = canvasTexture(64, 512, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#6b3f26"); g.addColorStop(1, "#8a5534");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 512);
      for (let y = 0; y < 512; y += 3) {
        const shade = 0.08 + rand(y) * 0.18;
        ctx.fillStyle = `rgba(${rand(y + 1) > 0.5 ? "40,20,10" : "190,130,80"},${shade})`;
        ctx.fillRect(0, y + Math.sin(y * 0.07) * 2, 64, 1 + rand(y + 2) * 2);
      }
    });
    return new THREE.MeshPhysicalMaterial({ map, roughness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.35, side: THREE.DoubleSide });
  }, []);
  const gold = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#d9b26a", metalness: 1, roughness: 0.25 }), []);
  const carving = useMemo(() => {
    // An arabesque band pressed into the gold inlay.
    const bump = canvasTexture(512, 64, (ctx) => {
      ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, 512, 64);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
      for (let x = 0; x < 512; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, 32); ctx.bezierCurveTo(x + 16, 4, x + 48, 4, x + 64, 32); ctx.bezierCurveTo(x + 48, 60, x + 16, 60, x, 32); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + 32, 32, 7, 0, Math.PI * 2); ctx.stroke();
      }
    }, false);
    bump.repeat.set(4, 1);
    return new THREE.MeshPhysicalMaterial({ color: "#d9b26a", metalness: 1, roughness: 0.3, bumpMap: bump, bumpScale: 0.03, side: THREE.DoubleSide });
  }, []);
  const coal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a1712", emissive: "#ff6a2a", emissiveIntensity: 0.9, roughness: 0.9 }), []);
  const smoke = useMemo(() => {
    const n = 220, positions = new Float32Array(n * 3), age = new Float32Array(n), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { seed[i] = rand(i * 3); age[i] = rand(i * 5); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aAge", new THREE.BufferAttribute(age, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: SMOKE_VERTEX, fragmentShader: SMOKE_FRAGMENT, transparent: true, depthWrite: false,
      uniforms: { uSize: { value: 0.32 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color("#f1e6dd") } },
    });
    return { g, m, n };
  }, []);
  useEffect(() => () => {
    body.dispose(); wood.map?.dispose(); wood.dispose(); gold.dispose(); carving.bumpMap?.dispose(); carving.dispose(); coal.dispose();
    smoke.g.dispose(); smoke.m.dispose();
  }, [body, wood, gold, carving, coal, smoke]);
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime, w = weight();
    const flicker = 0.8 + Math.sin(t * 7) * 0.1 + Math.sin(t * 13.3) * 0.08;
    coal.emissiveIntensity = flicker;
    if (glow.current) {
      glow.current.intensity = 1.6 * flicker * w;
      // The light follows the burner but lives outside its group: a light that
      // disappears with a hidden group changes the light count, and three.js
      // then rebuilds every shader in the scene at each chapter change.
      if (group.current && w > 0.01) {
        group.current.updateMatrixWorld();
        glow.current.position.copy(group.current.localToWorld(glowAt.set(0, 0.5, 0)));
      }
    }
    smoke.m.uniforms.uOpacity.value = 0.55 * w;
    if (w <= 0.01) return;
    const pos = smoke.g.attributes.position.array as Float32Array;
    const age = smoke.g.attributes.aAge.array as Float32Array;
    const seed = smoke.g.attributes.aSeed.array as Float32Array;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < smoke.n; i++) {
      age[i] += dt / (3.2 + seed[i] * 1.6);
      if (age[i] > 1) age[i] -= 1;
      const a = age[i], s = seed[i] * 6.28;
      // Thin column that curls and spreads as it rises.
      pos[i * 3] = Math.sin(a * 5 + s + t * 0.6) * (0.06 + a * 0.55);
      pos[i * 3 + 1] = 0.3 + a * 3.4;
      pos[i * 3 + 2] = Math.cos(a * 4 + s) * (0.05 + a * 0.35);
    }
    smoke.g.attributes.position.needsUpdate = true;
    smoke.g.attributes.aAge.needsUpdate = true;
  });
  return (
    <>
    <pointLight ref={glow} position={[0, -50, 0]} intensity={0} color="#ff8a3c" distance={4} decay={2} />
    <group ref={group}>
      <mesh geometry={body} material={wood} />
      <mesh material={carving} position={[0, 0.3, 0]}><cylinderGeometry args={[1.2, 1.17, 0.22, 96, 1, true]} /></mesh>
      <mesh material={gold} position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.02, 0.035, 16, 96]} /></mesh>
      <mesh material={gold} position={[0, -1.68, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.9, 0.03, 16, 96]} /></mesh>
      <mesh material={gold} position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.39, 0.03, 16, 64]} /></mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} material={coal} position={[Math.cos(i * 1.1) * 0.35 * rand(i + 1), 0.18 + rand(i + 4) * 0.08, Math.sin(i * 1.1) * 0.35 * rand(i + 2)]} rotation={[rand(i) * 3, rand(i + 5) * 3, 0]}>
          <dodecahedronGeometry args={[0.12 + rand(i + 8) * 0.07, 0]} />
        </mesh>
      ))}
      <points geometry={smoke.g} material={smoke.m} />
    </group>
    </>
  );
}

function Lifecycle({ onReady, onFailure }: Pick<CollectionModelsProps, "onReady" | "onFailure">) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const ready = useRef(onReady), failure = useRef(onFailure);
  ready.current = onReady; failure.current = onFailure;
  useEffect(() => {
    let alive = true;
    // Build every shader now (hidden parts included), then show the scene.
    warmScene(gl, scene, camera).then(() => { if (alive) ready.current(); });
    const lost = () => failure.current();
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => { alive = false; gl.domElement.removeEventListener("webglcontextlost", lost); };
  }, [gl, scene, camera]);
  return null;
}

export default function CollectionModelsScene(props: CollectionModelsProps) {
  const at = (key: StoryKey) => () => {
    const i = props.keys.indexOf(key);
    return i < 0 ? 0 : props.weights.current[i] ?? 0;
  };
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 40 }}
      dpr={sceneDpr()}
      /* Drawn by ScenePacer: 60 frames a second at most (30 in the light mode). */
      frameloop="demand"
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff3e6" />
      <directionalLight position={[-4, 1, -2]} intensity={1.1} color="#f3d6ee" />
      <Environment resolution={128}>
        {/* A light studio so gold and wood read warm instead of dark. */}
        <color attach="background" args={["#efe2cf"]} />
        <Lightformer form="rect" intensity={3} position={[3, 4, 3]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-4, 2, 1]} scale={[3, 4, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffe2c2" position={[0, -3, 4]} scale={3} />
      </Environment>
      {props.keys.includes("accessories") && <Accessories weight={at("accessories")} rtl={props.rtl} compact={props.compact} palm={props.palm} />}
      {props.keys.includes("kids") && <Kids weight={at("kids")} rtl={props.rtl} compact={props.compact} palm={props.palm} />}
      {props.keys.includes("incense") && <Incense weight={at("incense")} rtl={props.rtl} compact={props.compact} palm={props.palm} />}
      <ScenePacer active={props.active} />
      <Lifecycle onReady={props.onReady} onFailure={props.onFailure} />
    </Canvas>
  );
}
