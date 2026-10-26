"use client";
/**
 * What every code-built model is made of: the theme's materials in the chosen finish, a
 * rounded block, and small helpers. models.tsx (gaming) and productModels.tsx (every other
 * kind of store) draw with these.
 */
import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export type ModelColours = { body: string; trim: string; accent: string; glow: string; metal: string; screen: string };
/** neon (glowing edges), metal (polished), toy (soft plastic), voxel (blocky), matte, glass, gold. */
export type ModelStyle = "neon" | "metal" | "toy" | "voxel" | "matte" | "glass" | "gold";
export type ModelProps = { c: ModelColours; style: ModelStyle };
export type Knobs = Record<string, number>;

const ROUGH: Record<ModelStyle, number> = { neon: 0.35, metal: 0.22, toy: 0.55, voxel: 0.35, matte: 0.85, glass: 0.06, gold: 0.26 };
const METAL: Record<ModelStyle, number> = { neon: 0.15, metal: 0.75, toy: 0.15, voxel: 0.15, matte: 0.02, glass: 0.1, gold: 0.9 };

export function useMaterials({ c, style }: ModelProps) {
  // Not disposed when they change: the stage's warm-up (renderer.compileAsync) may still be
  // waiting on them, and three shares the shader programs anyway.
  return useMemo(() => {
    const flat = style === "voxel";
    const rough = ROUGH[style];
    const metal = METAL[style];
    // Glass: see-through and glossy, without a transmission pass (too heavy for phones).
    const glass = style === "glass" ? { transparent: true, opacity: 0.58, depthWrite: false } : {};
    const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, flatShading: flat, ...glass, ...extra });
    return {
      body: std(c.body),
      trim: std(c.trim),
      accent: std(c.accent, { roughness: Math.min(rough, 0.3) }),
      metal: new THREE.MeshStandardMaterial({ color: c.metal, roughness: 0.18, metalness: 0.95, flatShading: flat }),
      glow: new THREE.MeshStandardMaterial({ color: c.glow, emissive: c.glow, emissiveIntensity: style === "neon" ? 2.4 : 1.2, toneMapped: false }),
      screen: new THREE.MeshStandardMaterial({ color: c.screen, emissive: c.screen, emissiveIntensity: 0.9, roughness: 0.2 }),
      dark: std("#121218", { roughness: 0.6, metalness: 0.2, transparent: false, opacity: 1, depthWrite: true }),
      // Things that keep their own colour whatever the theme: paper, leaves, steam, a cut stone.
      paper: new THREE.MeshStandardMaterial({ color: "#f1e9d8", roughness: 0.9, metalness: 0, flatShading: flat }),
      leaf: new THREE.MeshStandardMaterial({ color: "#4f9d69", roughness: 0.6, metalness: 0, flatShading: flat, side: THREE.DoubleSide }),
      leafDark: new THREE.MeshStandardMaterial({ color: "#2f6e4a", roughness: 0.6, metalness: 0, flatShading: flat, side: THREE.DoubleSide }),
      steam: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, metalness: 0, transparent: true, opacity: 0.45, depthWrite: false }),
      gem: new THREE.MeshStandardMaterial({ color: c.glow, emissive: c.glow, emissiveIntensity: 0.25, roughness: 0.04, metalness: 0.35, flatShading: true }),
    };
  }, [c.body, c.trim, c.accent, c.glow, c.metal, c.screen, style]);
}
export type Mats = ReturnType<typeof useMaterials>;
export type Draw = ModelProps & { m: Mats; k: Knobs };

/** A rounded box, or a plain box in the voxel finish. */
export function Block({ size, radius = 0.08, material, ...rest }: { size: [number, number, number]; radius?: number; material: THREE.Material; position?: [number, number, number]; rotation?: [number, number, number]; style: ModelStyle }) {
  const { style, ...place } = rest;
  if (style === "voxel")
    return (
      <mesh {...place} material={material}>
        <boxGeometry args={size} />
      </mesh>
    );
  return <RoundedBox args={size} radius={Math.min(radius, ...size.map((s) => s / 2 - 0.001))} smoothness={4} material={material} {...place} />;
}

export const seg = (style: ModelStyle, n: number) => (style === "voxel" ? Math.max(4, Math.round(n / 4)) : n);
/** A knob turned all the way down hides its part. */
export const shown = (v: number) => v > 0.04;
