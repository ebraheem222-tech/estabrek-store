"use client";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { createFabricTexture } from "./fabricTexture";
import { createHijabGeometry, createDisplayHead } from "./HijabGeometry";
import { ScenePacer } from "./ScenePacer";
import { warmScene } from "./warmScene";
import { sceneDpr } from "@/lib/motionBudget";

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
  // Fine chiffon weave with uneven threads (see fabricTexture.ts).
  const weave = useMemo(() => {
    const t = createFabricTexture({ threads: 48 });
    t.repeat(12, 16);
    return t;
  }, []);
  const fabric = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: props.color,
        side: THREE.DoubleSide,
        roughness: 0.85, // × the roughness map (~0.8): about 0.7 on average, varying thread by thread
        metalness: 0,
        sheen: 0.7,
        sheenColor: new THREE.Color("#f9dce7"),
        sheenRoughness: 0.7,
        bumpMap: weave.bump,
        bumpScale: 0.022,
        roughnessMap: weave.rough,
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
  // The rotate buttons and the pointer, eased here. The scroll part arrives already
  // smoothed (DesignStudy's scroll motion): easing it again only made it trail behind.
  const turn = useRef(0);
  useFrame(({ clock, pointer }, delta) => {
    if (!group.current) return;
    const p = props.progress.current;
    // Elapsed-time easing: the same speed at 30, 60 or 120 frames a second.
    const blend = props.reducedMotion ? 1 : 1 - Math.exp(-delta * 7);
    turn.current = THREE.MathUtils.lerp(
      turn.current,
      (props.rotation * Math.PI) / 4 + (props.reducedMotion ? 0 : pointer.x * 0.09),
      blend,
    );
    group.current.rotation.y = -0.22 + p * Math.PI * 2 + turn.current;
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      props.reducedMotion ? 0 : pointer.y * 0.025,
      blend,
    );
    group.current.scale.setScalar(
      props.reducedMotion
        ? 1
        : THREE.MathUtils.lerp(1.02, 1.14, Math.sin(p * Math.PI)),
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
  onWarm,
}: Pick<SceneProps, "onReady" | "onFailure"> & { onWarm: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const advance = useThree((s) => s.advance);
  const ready = useRef(onReady);
  const failure = useRef(onFailure);
  const warm = useRef(onWarm);
  ready.current = onReady;
  failure.current = onFailure;
  warm.current = onWarm;
  useEffect(() => {
    let alive = true;
    // Build every shader first (in the background where the driver can), then draw
    // one real frame; until then the fallback drawing stays on screen.
    warmScene(gl, scene, camera).then(() => {
      if (!alive) return;
      advance(performance.now());
      warm.current();
      ready.current();
    });
    const lost = () => failure.current();
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      alive = false;
      gl.domElement.removeEventListener("webglcontextlost", lost);
    };
  }, [gl, scene, camera, advance]);
  return null;
}

export default function ScarfScene(props: SceneProps) {
  // Nothing is drawn until every shader is built: drawn before, the first frame built
  // them all at once and the page stopped for a moment (see SeasonsScene).
  const [warm, setWarm] = useState(false);
  return (
    <Canvas
      camera={{ position: [0, 0.05, 6.7], fov: 38 }}
      dpr={sceneDpr()}
      /* Drawn by ScenePacer, like the other 3D scenes: it used to draw on every
         screen frame (120 a second on many phones) outside the frame budget. */
      frameloop={warm ? "demand" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      /* Measured on resize only. With scroll tracking (the default) every scroll anywhere on
         the page re-measured each 3D canvas, re-rendered it through React and asked it for a
         new frame, also far off screen. Pointers are read relative to the canvas anyway. */
      resize={{ scroll: false }}
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
      <ScenePacer active={props.active && !props.reducedMotion} />
      <SceneLifecycle onReady={props.onReady} onFailure={props.onFailure} onWarm={() => setWarm(true)} />
    </Canvas>
  );
}
