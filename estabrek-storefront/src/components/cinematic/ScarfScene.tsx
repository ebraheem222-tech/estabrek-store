"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { createHijabGeometry, createDisplayHead } from "./HijabGeometry";

type SceneProps = {
  color: string;
  progress: MutableRefObject<number>;
  rotation: number;
  active: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  onFailure: () => void;
};

function DrapedHijab(props: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const geometries = useMemo(() => createHijabGeometry(), []);
  const head = useMemo(() => createDisplayHead(), []);
  const targetColor = useMemo(
    () => new THREE.Color(props.color),
    [props.color],
  );
  const fabricTime = useRef<THREE.IUniform | null>(null);
  const weave = useMemo(() => {
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const value = 128 + (x % 4 === 0 ? 19 : -4) + (y % 4 === 0 ? 15 : -3);
        data[i] = data[i + 1] = data[i + 2] = value;
        data[i + 3] = 255;
      }
    }
    const texture = new THREE.DataTexture(data, size, size);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 28);
    texture.needsUpdate = true;
    return texture;
  }, []);
  const fabric = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: props.color,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0,
        sheen: 0.55,
        sheenColor: new THREE.Color("#f9dce7"),
        sheenRoughness: 0.85,
        bumpMap: weave,
        bumpScale: 0.006,
        // A single material is shared by all cloth layers; colour changes in useFrame.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }),
    [weave],
  );
  useEffect(() => {
    fabric.onBeforeCompile = (shader) => {
      shader.uniforms.roseTime = { value: 0 };
      fabricTime.current = shader.uniforms.roseTime;
      shader.vertexShader = "uniform float roseTime;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nfloat drapeWeight = 1.0 - smoothstep(-0.9, 1.0, position.y);\ntransformed.z += sin(position.y * 4.0 + position.x * 3.0 + roseTime * 0.7) * 0.009 * drapeWeight;");
    };
    fabric.customProgramCacheKey = () => "estabrek-drape-1";
    fabric.needsUpdate = true;
  }, [fabric]);
  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
      head.dispose();
      fabric.dispose();
      weave.dispose();
    },
    [geometries, head, fabric, weave],
  );
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [
    props.color,
    props.rotation,
    props.active,
    props.reducedMotion,
    invalidate,
  ]);
  useFrame(({ clock, pointer }, delta) => {
    if (!group.current) return;
    const p = props.progress.current;
    const blend = props.reducedMotion ? 1 : 1 - Math.exp(-delta * 7);
    const angle =
      -0.22 +
      p * Math.PI * 2 +
      (props.rotation * Math.PI) / 4 +
      (props.reducedMotion ? 0 : pointer.x * 0.09);
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      angle,
      blend,
    );
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      props.reducedMotion ? 0 : pointer.y * 0.025,
      blend,
    );
    const scale = props.reducedMotion
      ? 1
      : THREE.MathUtils.lerp(
          1.02,
          1.14,
          Math.sin(p * Math.PI),
        );
    group.current.scale.setScalar(
      THREE.MathUtils.lerp(group.current.scale.x, scale, blend),
    );
    group.current.position.y = props.reducedMotion
      ? 0
      : Math.sin(clock.elapsedTime * 0.65) * 0.013;
    if (fabricTime.current) fabricTime.current.value = props.reducedMotion ? 0 : clock.elapsedTime;
    fabric.color.lerp(targetColor, blend);
  });
  return (
    <group ref={group}>
      <mesh geometry={head} position={[0, 0.87, 0.055]}>
        <meshStandardMaterial color="#f5eae0" roughness={0.73} />
      </mesh>
      <mesh scale={[0.78, 1, 0.45]}>
        <latheGeometry
          args={[
            [
              new THREE.Vector2(0, -1.62),
              new THREE.Vector2(0.65, -1.62),
              new THREE.Vector2(0.83, -1.2),
              new THREE.Vector2(1.04, -0.6),
              new THREE.Vector2(1.01, -0.39),
              new THREE.Vector2(0.61, -0.1),
              new THREE.Vector2(0.24, 0.04),
              new THREE.Vector2(0.21, 0.44),
              new THREE.Vector2(0, 0.44),
            ],
            64,
          ]}
        />
        <meshStandardMaterial color="#efe1d7" roughness={0.75} />
      </mesh>
      {Object.entries(geometries).map(([name, geometry]) => (
        <mesh key={name} geometry={geometry} material={fabric} castShadow />
      ))}
      <mesh position={[0, -1.77, 0]}>
        <cylinderGeometry args={[0.32, 0.4, 0.3, 48]} />
        <meshStandardMaterial color="#ddadbd" roughness={0.6} />
      </mesh>
    </group>
  );
}

function SceneLifecycle({
  onReady,
  onFailure,
}: Pick<SceneProps, "onReady" | "onFailure">) {
  const gl = useThree((s) => s.gl);
  const ready = useRef(onReady);
  const failure = useRef(onFailure);
  ready.current = onReady;
  failure.current = onFailure;
  useEffect(() => {
    ready.current();
    const lost = () => failure.current();
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl]);
  return null;
}

export default function ScarfScene(props: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.05, 6.7], fov: 38 }}
      dpr={[1, 1.5]}
      frameloop={props.active && !props.reducedMotion ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[0, 2, 5]} intensity={0.65} color="#fff4e9" />
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff6f8" />
      <directionalLight
        position={[-3, 1, -2]}
        intensity={1.4}
        color="#edc6ee"
      />
      <Environment resolution={64}>
        <Lightformer
          form="rect"
          intensity={2}
          position={[3, 4, 3]}
          scale={[3, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.3}
          position={[-4, 2, 1]}
          scale={[3, 4, 1]}
        />
      </Environment>
      <DrapedHijab {...props} />
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[1.38, 1.44, 0.17, 64]} />
        <meshStandardMaterial color="#efc9d5" roughness={0.85} />
      </mesh>
      <mesh position={[0, -2.14, 0]}>
        <cylinderGeometry args={[1.44, 1.48, 0.1, 64]} />
        <meshStandardMaterial color="#ddb1c1" roughness={0.8} />
      </mesh>
      <ContactShadows
        position={[0, -1.9, 0]}
        opacity={0.28}
        scale={7}
        blur={2.5}
        far={4}
        resolution={128}
        frames={1}
        color="#a75676"
      />
      <SceneLifecycle onReady={props.onReady} onFailure={props.onFailure} />
    </Canvas>
  );
}
