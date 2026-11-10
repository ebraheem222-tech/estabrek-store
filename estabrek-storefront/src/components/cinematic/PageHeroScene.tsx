"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { sceneDpr } from "@/lib/motionBudget";

/** Where the page hero should be: which side, how present (0–1), its turn and the scroll's speed, its colour. */
export type HeroPose = { side: number; weight: number; spin: number; speed: number; tint: string; compact: boolean };

/*
 * The page hero's 3D scene (RosePageHero): a long silk hijab floating in the air, waving and twisting, its
 * folds catching the light. It glides to its side, comes and goes with its weight, turns with the scroll and
 * waves faster when the page moves fast; its colour glides to the colour picked.
 */
function Silk({ pose }: { pose: MutableRefObject<HeroPose> }) {
  const group = useRef<THREE.Group>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(3.4, 0.95, 120, 14), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as ArrayLike<number>), [geo]);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#d99fb6", side: THREE.DoubleSide, roughness: 0.42, metalness: 0,
    sheen: 1, sheenColor: new THREE.Color("#fff3f8"), sheenRoughness: 0.35,
    clearcoat: 0.25, clearcoatRoughness: 0.4, iridescence: 0.18, transparent: true, opacity: 0,
  }), []);
  const target = useMemo(() => new THREE.Color(), []);
  const viewport = useThree((s) => s.viewport);
  const state = useRef({ x: 0, w: 0, phase: 0 });
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame((_, delta) => {
    const p = pose.current, s = state.current, g = group.current;
    if (!g) return;
    const d = Math.min(0.05, delta);
    s.phase += d * (1.1 + Math.min(4, Math.abs(p.speed)) * 0.8);
    s.w += (p.weight - s.w) * Math.min(1, d * 3);
    s.x += (p.side * viewport.width * (p.compact ? 0.46 : 0.34) - s.x) * Math.min(1, d * 1.6);
    g.visible = s.w > 0.01;
    if (!g.visible) return;
    const arr = (geo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const u = base[i] / 1.7, y = base[i + 1];
      const wave = Math.sin(u * 2.6 + s.phase) * 0.32 + Math.sin(u * 5.1 - s.phase * 1.3) * 0.08;
      const twist = Math.sin(u * 1.4 + s.phase * 0.6) * 1.1;
      arr[i + 1] = y * Math.cos(twist) + Math.sin(u * 3 + s.phase * 0.8) * 0.14;
      arr[i + 2] = y * Math.sin(twist) + wave;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    if (p.tint) { target.set(p.tint); mat.color.lerp(target, Math.min(1, d * 2)); }
    mat.opacity = s.w;
    g.scale.setScalar((p.compact ? 0.42 : 0.85) * (0.6 + 0.4 * Math.min(1, s.w * (p.compact ? 2 : 1))));
    g.position.set(s.x, Math.sin(s.phase * 0.4) * 0.15, 0);
    g.rotation.set(0.25 + Math.sin(s.phase * 0.3) * 0.1, p.spin + s.phase * 0.08, -0.35 * p.side);
  });
  return <group ref={group}><mesh geometry={geo} material={mat} /></group>;
}

export default function PageHeroScene({ pose, active }: { pose: MutableRefObject<HeroPose>; active: boolean }) {
  return (
    <Canvas dpr={sceneDpr()} frameloop={active ? "always" : "never"} camera={{ position: [0, 0, 6], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} resize={{ scroll: false }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={2} color="#fff4ea" />
      <directionalLight position={[-4, -1, 2]} intensity={0.8} color="#f3d6ee" />
      <Environment resolution={64}>
        <Lightformer form="rect" intensity={2.4} position={[2, 3, 3]} scale={[4, 4, 1]} />
        <Lightformer form="ring" intensity={1} color="#ffe2ef" position={[-3, -2, 3]} scale={2} />
      </Environment>
      <Silk pose={pose} />
    </Canvas>
  );
}
