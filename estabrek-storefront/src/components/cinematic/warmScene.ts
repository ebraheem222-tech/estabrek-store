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
 * The browser still checks each new shader the first time it is drawn, and
 * waits for it then. Draw everything once now with a zero-size scissor: the
 * checks happen here, and nothing appears on the canvas.
 */
function firstUse(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
  });
  const autoClear = gl.autoClear;
  try {
    gl.autoClear = false;
    gl.setScissorTest(true);
    gl.setScissor(0, 0, 0, 0);
    gl.render(scene, camera);
  } catch {
    // Warm-up is only an optimisation.
  } finally {
    gl.setScissorTest(false);
    gl.autoClear = autoClear;
    hidden.forEach((o) => { o.visible = false; });
  }
}
