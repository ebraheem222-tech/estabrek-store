/**
 * «شوفها على حيطك» through the camera (shared/wallArt.ts): the piece at its real size, its picture in its frame, on
 * the shopper's own wall.
 *  - Android (Chrome): WebXR. The camera looks for a wall (a hit test that only a surface standing up passes); a
 *    rectangle the piece's size shows where it would hang, a tap hangs it there (another tap moves it), and «حطها
 *    قدامي» hangs it 1.5 m ahead when the wall is too plain for the camera to find.
 *  - iPhone / iPad (Safari): AR Quick Look. The piece is written as a USDZ file here, in the browser, anchored to a
 *    wall, and opened by the phone's own viewer.
 * Loaded only when the shopper asks (three.js is big): the product page itself never loads it.
 */
import * as THREE from "three";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import { FRAME_LOOK, wallPose, type WallArt } from "../../../shared/wallArt";

const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => {
  const i = new Image();
  i.crossOrigin = "anonymous";
  i.onload = () => ok(i);
  i.onerror = () => no(new Error("IMAGE_LOAD"));
  i.src = src;
});

/** The picture cut to the piece's own shape (as it is printed: the middle kept), at most 2048 px. */
async function printed(src: string, art: { w: number; h: number }) {
  const img = await load(src);
  const long = 2048, aspect = art.w / art.h;
  const c = document.createElement("canvas");
  c.width = Math.round(aspect >= 1 ? long : long * aspect);
  c.height = Math.round(aspect >= 1 ? long / aspect : long);
  const g = c.getContext("2d");
  if (!g) throw new Error("2d");
  const k = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
  const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
  g.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
  return c;
}

/** The piece as a 3D thing, in metres: its frame (or a canvas print's edge) as deep as a frame is, the picture on its
 *  face, its back at z = 0 and its face toward +z (as a wall anchor wants it). */
export async function buildPiece(src: string, art: WallArt) {
  const W = art.w / 100, H = art.h / 100, look = FRAME_LOOK[art.frame], f = look.cm / 100, D = art.frame === "none" ? 0.03 : 0.025;
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(W + f * 2, H + f * 2, D), new THREE.MeshStandardMaterial({ color: new THREE.Color(look.color), roughness: art.frame === "gold" ? 0.35 : 0.8, metalness: art.frame === "gold" ? 0.6 : 0 }));
  body.position.z = D / 2;
  group.add(body);
  const texture = new THREE.CanvasTexture(await printed(src, art));
  texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0 }));
  face.position.z = D + 0.001;
  group.add(face);
  group.name = "piece";
  return group;
}

/** The piece as a USDZ file anchored to a wall (AR Quick Look). */
export async function pieceUsdz(src: string, art: WallArt) {
  const scene = new THREE.Scene();
  scene.add(await buildPiece(src, art));
  const exporter = new USDZExporter();
  return exporter.parseAsync(scene, { ar: { anchoring: { type: "plane" }, planeAnchoring: { alignment: "vertical" } }, quickLookCompatible: true } as never) as Promise<Uint8Array>;
}

/** Opens the piece on the iPhone's own AR viewer (it hangs on a wall it finds, at its real size: no pinching it). */
export async function openQuickLook(src: string, art: WallArt) {
  const data = await pieceUsdz(src, art);
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: "model/vnd.usdz+zip" }));
  const a = document.createElement("a");
  a.rel = "ar";
  a.href = `${url}#allowsContentScaling=0`;
  // Quick Look opens only from a link that holds a picture.
  a.appendChild(document.createElement("img"));
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export type WallArState = "starting" | "looking" | "found" | "placed" | "ended" | "failed";
type XRish = { requestSession: (mode: string, init: unknown) => Promise<XRSession> };

/**
 * Starts the camera with the piece (Android, WebXR). `overlay` is the page's own layer shown over the camera (its
 * words and buttons). Returns what ends it and hangs it ahead; `onState` hears how it goes.
 */
export async function startWallAr(o: { src: string; art: WallArt; overlay: HTMLElement; onState: (s: WallArState) => void }) {
  const xr = (navigator as unknown as { xr?: XRish }).xr;
  if (!xr) throw new Error("NO_XR");
  o.onState("starting");
  const piece = await buildPiece(o.src, o.art);
  const session = await xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"], optionalFeatures: ["dom-overlay"], domOverlay: { root: o.overlay } });
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");
  renderer.domElement.style.display = "none";
  document.body.appendChild(renderer.domElement);
  await renderer.xr.setSession(session);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(0.5, 1, 1);
  scene.add(sun);
  piece.visible = false;
  scene.add(piece);
  // Where it would hang: an outline its own size.
  const W = (o.art.w + FRAME_LOOK[o.art.frame].cm * 2) / 100, H = (o.art.h + FRAME_LOOK[o.art.frame].cm * 2) / 100;
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-W / 2, -H / 2, 0.002), new THREE.Vector3(W / 2, -H / 2, 0.002), new THREE.Vector3(W / 2, H / 2, 0.002), new THREE.Vector3(-W / 2, H / 2, 0.002)]),
    new THREE.LineBasicMaterial({ color: 0xffffff }),
  );
  outline.matrixAutoUpdate = false;
  outline.visible = false;
  scene.add(outline);

  const viewer = await session.requestReferenceSpace("viewer");
  const hits = await session.requestHitTestSource?.({ space: viewer });
  const m = new THREE.Matrix4();
  let state: WallArState = "looking";
  const tell = (s: WallArState) => { if (s !== state) { state = s; o.onState(s); } };
  o.onState("looking");

  renderer.setAnimationLoop((_t: number, frame?: XRFrame) => {
    const ref = renderer.xr.getReferenceSpace();
    let found = false;
    if (frame && hits && ref) {
      for (const hit of frame.getHitTestResults(hits)) {
        const pose = hit.getPose(ref);
        const wall = pose ? wallPose(pose.transform.matrix) : null;
        if (!wall) continue;
        const b = wall.basis;
        m.makeBasis(new THREE.Vector3(b[0], b[1], b[2]), new THREE.Vector3(b[3], b[4], b[5]), new THREE.Vector3(b[6], b[7], b[8])).setPosition(wall.position[0], wall.position[1], wall.position[2]);
        outline.matrix.copy(m);
        found = true;
        break;
      }
    }
    outline.visible = found;
    if (state !== "placed") tell(found ? "found" : "looking");
    renderer.render(scene, camera);
  });

  const hang = (matrix: THREE.Matrix4) => {
    matrix.decompose(piece.position, piece.quaternion, new THREE.Vector3());
    piece.visible = true;
    tell("placed");
  };
  // A tap hangs it where the outline is.
  session.addEventListener("select", () => { if (outline.visible) hang(outline.matrix.clone()); });

  let ended = false;
  session.addEventListener("end", () => {
    if (ended) return;
    ended = true;
    renderer.setAnimationLoop(null);
    hits?.cancel();
    renderer.dispose();
    renderer.domElement.remove();
    o.onState("ended");
  });

  return {
    end: () => { if (!ended) void session.end().catch(() => undefined); },
    /** 1.5 m ahead, upright, facing the phone. */
    ahead: () => {
      const cam = renderer.xr.getCamera();
      const at = new THREE.Vector3(), q = new THREE.Quaternion();
      cam.matrixWorld.decompose(at, q, new THREE.Vector3());
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      forward.y = 0;
      if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
      forward.normalize();
      const spot = at.clone().addScaledVector(forward, 1.5);
      const face = forward.clone().negate();
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), face).normalize();
      hang(new THREE.Matrix4().makeBasis(right, new THREE.Vector3(0, 1, 0), face).setPosition(spot));
    },
  };
}
