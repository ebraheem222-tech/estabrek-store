"use client";

import React, { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";

export type ProductModelCanvasProps = {
  modelUrl: string;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  enableZoom?: boolean;
};

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!group.current) return;
    group.current.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group.current);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxDim) || maxDim <= 0) return;

    const scale = 1.8 / maxDim;
    group.current.scale.setScalar(scale);
    group.current.updateMatrixWorld(true);
    const centeredBox = new THREE.Box3().setFromObject(group.current);
    const center = centeredBox.getCenter(new THREE.Vector3());
    group.current.position.sub(center);
  }, [scene]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

function ModelLoading() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="model-3d-loading">
        <div className="loading-spinner" />
        <span>جارٍ تحميل النموذج... {Math.round(progress)}%</span>
      </div>
    </Html>
  );
}

function normalizeAutoRotateSpeed(speed?: number) {
  if (!speed || !Number.isFinite(speed)) return 1.2;
  const normalized = 120 / speed;
  return Math.min(6, Math.max(0.4, normalized));
}

export default function ProductModelCanvas({
  modelUrl,
  autoRotate,
  autoRotateSpeed,
  enableZoom,
}: ProductModelCanvasProps) {
  const orbitSpeed = useMemo(() => normalizeAutoRotateSpeed(autoRotateSpeed), [autoRotateSpeed]);

  return (
    <Canvas
      key={modelUrl}
      className="model-3d-canvas"
      camera={{ position: [0, 0, 3.2], fov: 35 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={<ModelLoading />}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 2]} intensity={1.05} />
        <directionalLight position={[-3, -2, -4]} intensity={0.35} />
        <Model url={modelUrl} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={enableZoom ?? true}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!!autoRotate}
        autoRotateSpeed={orbitSpeed}
        minDistance={1.6}
        maxDistance={6}
      />
    </Canvas>
  );
}
