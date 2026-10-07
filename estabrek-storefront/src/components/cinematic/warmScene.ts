import type * as THREE from "three";

/**
 * Prepare every material of a scene up front.
 *
 * three.js builds a material's shader the first time the object is drawn.
 * Objects that start hidden (the spring sun and blossoms, the kids dress, the
 * incense burner) were therefore built at the very moment their season or
 * chapter arrived — a freeze of a fraction of a second right in the middle of
 * the transition, longest on Windows. Here the hidden ones are shown for one
 * compile call and hidden again, so the hand-over only draws.
 */
export function warmScene(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
  });
  let job: Promise<unknown>;
  try {
    // compileAsync lets the GPU driver build shaders in the background where it can.
    job = typeof gl.compileAsync === "function" ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera));
  } catch (error) {
    job = Promise.reject(error);
  } finally {
    // The materials were collected synchronously above; the scene can hide them again now.
    hidden.forEach((o) => { o.visible = false; });
  }
  return job.then(() => firstUse(gl, scene, camera), () => undefined);
}

/**
 * Draw everything once, for real, before the scene is shown. Graphics drivers
 * (ANGLE on Windows above all) only finish a shader the first time it actually
 * draws something; a draw clipped to nothing could be skipped, leaving that
 * work for the moment a hidden model first appears — mid-transition. So every
 * object is drawn once in full (also those outside the camera's view, with
 * culling off), then the canvas is cleared: nothing of it is ever seen, and
 * the next frame draws the real scene.
 */
function firstUse(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const hidden: THREE.Object3D[] = [];
  const culled: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
    if (o.frustumCulled) {
      culled.push(o);
      o.frustumCulled = false;
    }
  });
  try {
    gl.render(scene, camera);
    gl.clear();
  } catch {
    // Warm-up is only an optimisation.
  } finally {
    hidden.forEach((o) => { o.visible = false; });
    culled.forEach((o) => { o.frustumCulled = true; });
  }
}
