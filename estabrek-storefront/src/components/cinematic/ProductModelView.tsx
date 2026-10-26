"use client";
/**
 * A product's 3D model (the GLB built from its scan) to turn and zoom with the hand: the
 * store stage's loader (storeThemes/three/GlbModel.tsx: fitted, Draco), soft light, and it
 * turns slowly by itself until it's touched (never with reduced motion). Loaded only when
 * the shopper opens the 3D tab.
 */
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { useState } from "react";
import { GlbModel } from "@/storeThemes/three/GlbModel";

export function ProductModelView({ url }: { url: string }) {
  const [still] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [touched, setTouched] = useState(false);
  return (
    <Canvas camera={{ position: [0, 1.2, 4.2], fov: 35 }} dpr={[1, 2]} onPointerDown={() => setTouched(true)}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 4]} intensity={1.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} />
      <GlbModel url={url} fallback={null} />
      <ContactShadows position={[0, -1.25, 0]} opacity={0.35} blur={2.4} scale={6} />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={7} autoRotate={!still && !touched} autoRotateSpeed={1.2} />
    </Canvas>
  );
}
