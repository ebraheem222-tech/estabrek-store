"use client";
/**
 * A store's own 3D file (binary glTF) on the stage, in place of a code-built model: fitted
 * into the same 2.4-unit box and centred, its own materials kept, and one of its animations
 * playing when the store picked one ("*" = the first). Draco-compressed files decode with
 * the copy in public/draco, meshopt ones in the page. While it loads, and if it can't be
 * read, the code model stands in; either way the editor hears what the file holds (onInfo).
 */
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAnimations, useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

/** What a file turned out to hold: its animations, or why it couldn't be shown. */
export type GlbInfo = { url: string; clips: string[]; error?: string };
type Props = { url: string; clip?: string; fallback: ReactNode; onInfo?: (info: GlbInfo) => void };

const DRACO = "/draco/";

function Fitted({ url, clip, onInfo }: Omit<Props, "fallback">) {
  const gltf = useGLTF(url, DRACO);
  // Its own copy: the same file can stand twice, and skinned models need their bones copied.
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene) as THREE.Object3D, [gltf.scene]);
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const big = Math.max(size.x, size.y, size.z);
    return { scale: big > 0 && Number.isFinite(big) ? 2.4 / big : 1, centre: box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3()) };
  }, [scene]);
  const root = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(gltf.animations, root);
  const clipsKey = names.join("\n");
  useEffect(() => {
    onInfo?.({ url, clips: names });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, clipsKey]);
  useEffect(() => {
    const name = clip === "*" ? names[0] : clip;
    const action = name ? actions[name] : null;
    action?.reset().fadeIn(0.3).play();
    return () => {
      action?.fadeOut(0.3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip, actions, clipsKey]);
  return (
    <group scale={fit.scale}>
      <group ref={root} position={[-fit.centre.x, -fit.centre.y, -fit.centre.z]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

/** Shows the code model instead when the file fails, until another file is given. */
class Guard extends Component<{ url: string; fallback: ReactNode; onError: (e: Error) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: Error) {
    this.props.onError(e);
  }
  componentDidUpdate(prev: { url: string }) {
    if (prev.url !== this.props.url && this.state.failed) this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GlbModel({ url, clip, fallback, onInfo }: Props) {
  return (
    <Guard
      url={url}
      fallback={fallback}
      onError={(e) => {
        // Forget the failure, so the same address can be tried again later.
        useGLTF.clear(url);
        onInfo?.({ url, clips: [], error: String(e?.message || e).slice(0, 200) });
      }}
    >
      <Suspense fallback={fallback}>
        <Fitted url={url} clip={clip} onInfo={onInfo} />
      </Suspense>
    </Guard>
  );
}
