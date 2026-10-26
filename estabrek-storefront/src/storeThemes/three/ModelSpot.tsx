"use client";
/**
 * One of the theme's 3D models turning slowly beside an inner page's heading (the shop,
 * a category, the about page): the store's kind of product in the theme's colours and
 * finish. Light on purpose: one model, a few lights, drawn only while on screen and still
 * for shoppers who ask for less motion. Loaded on its own (ThemeIntro), never on the server.
 */
import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { Palette } from "../colour";
import { GameModel, type ModelKind } from "./models";
import type { ModelStyle } from "./parts";
import { modelColours } from "./colours";

function Turning({ kind, palette, finish, still }: { kind: ModelKind; palette: Palette; finish: ModelStyle; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g || still) return;
    const t = clock.getElapsedTime();
    g.rotation.y = t * 0.45;
    g.position.y = Math.sin(t * 1.2) * 0.12;
  });
  return (
    <group ref={group} rotation={[0, 0.6, 0]}>
      <GameModel kind={kind} c={modelColours(palette, finish)} style={finish} />
    </group>
  );
}

export default function ModelSpot({ kind, palette, finish, onReady }: { kind: ModelKind; palette: Palette; finish: ModelStyle; onReady?: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={box} className="th-model-spot" aria-hidden>
      <Canvas
        dpr={[1, 1.6]}
        frameloop={seen && !still ? "always" : "demand"}
        camera={{ position: [0, 0.4, 6.2], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        onCreated={() => onReady?.()}
      >
        <hemisphereLight args={["#ffffff", palette.bg, 0.9]} />
        <directionalLight position={[4, 6, 5]} intensity={1.8} />
        <pointLight position={[-4, 1, 3]} intensity={18} color={palette.accent} />
        <pointLight position={[3, -2, -3]} intensity={10} color={palette.strong} />
        <Turning kind={kind} palette={palette} finish={finish} still={still} />
      </Canvas>
    </div>
  );
}
