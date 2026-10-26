// What «شيل الخلفية»'s editor and its many-at-once dialog share: the remembered choices,
// the engine to start with, the free engine's plan here, and saving a cut-out as a new picture.
import { useEffect, useState } from "react";
import { uploadImages, type MediaImage } from "../../api/uploads.api";
import { cutoutBlob, isModelSaved, planHere, type Cutout } from "../../lib/bgRemove";
import { chooseEngine, type BrowserPlan, type CloudState, type EngineId } from "../../lib/bgEngine";
import type { Background } from "../../lib/cutout";

/** A picture to cut out: its address, and what the new picture inherits. */
export type CutoutTarget = { url: string; name?: string | null; folder?: string | null };

/* ------------------------------------------------------------------ remembered choices */

type Prefs = { engine: EngineId; background: Background; brush: number; softness: number };
const PREFS_KEY = "bg-remove:prefs";
const DEFAULT_PREFS: Prefs = { engine: "browser", background: "transparent", brush: 40, softness: 0.5 };

export function readCutoutPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<Prefs>;
    return {
      engine: raw.engine === "cloudinary" ? "cloudinary" : "browser",
      background: typeof raw.background === "string" && (raw.background === "transparent" || /^#[0-9a-f]{6}$/i.test(raw.background)) ? raw.background : "transparent",
      brush: Number.isFinite(raw.brush) ? Math.min(160, Math.max(4, Number(raw.brush))) : DEFAULT_PREFS.brush,
      softness: Number.isFinite(raw.softness) ? Math.min(1, Math.max(0, Number(raw.softness))) : DEFAULT_PREFS.softness,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveCutoutPrefs(patch: Partial<Prefs>) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readCutoutPrefs(), ...patch }));
  } catch {
    // private mode
  }
}

/** The engine to start with: the remembered one when it can be used, else the free one. */
export function startEngine(cloud: CloudState | null): EngineId {
  const choice = chooseEngine(readCutoutPrefs().engine, cloud);
  return "engine" in choice ? choice.engine : "browser";
}

/** The free engine's plan here and whether its model is already downloaded. */
export function useFreeEngine(active: boolean) {
  const [plan, setPlan] = useState<BrowserPlan | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => {
    if (!active) return;
    let gone = false;
    void planHere().then(async (p) => {
      const s = await isModelSaved(p.model.id);
      if (gone) return;
      setPlan(p);
      setSaved(s);
    });
    return () => {
      gone = true;
    };
  }, [active]);
  return { plan, saved, markSaved: () => setSaved(true) };
}

/* ------------------------------------------------------------------ saving */

export const CHECKER = "repeating-conic-gradient(#d9d9d9 0 25%, #ffffff 0 50%) 0 0 / 20px 20px";

/** "rose-bag" from ".../products/rose-bag.jpg". */
export function pictureBaseName(t: CutoutTarget): string {
  const fromUrl = (() => {
    try {
      return decodeURIComponent(new URL(t.url, location.href).pathname.split("/").pop() || "");
    } catch {
      return "";
    }
  })();
  const raw = (t.name || fromUrl).replace(/\.[a-z0-9]{2,5}$/i, "");
  const clean = raw.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return clean || "picture";
}

/** Saves the cut-out as a new picture in the media library (tagged "cutout"). */
export async function saveCutout(cut: Pick<Cutout, "width" | "height" | "image" | "mask">, background: Background, target: CutoutTarget): Promise<MediaImage> {
  let blob = await cutoutBlob(cut, { background });
  // A big transparent PNG may pass the store's upload limit: WebP keeps the transparency, smaller.
  if (background === "transparent" && blob.size > 9 * 1024 * 1024) {
    const webp = await cutoutBlob(cut, { background, type: "image/webp", quality: 0.95 });
    if (webp.type === "image/webp" && webp.size < blob.size) blob = webp;
  }
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
  const file = new File([blob], `${pictureBaseName(target)}-cutout.${ext}`, { type: blob.type });
  const res = await uploadImages([file], { folder: target.folder ?? null, tags: ["cutout"], keepAsNew: true });
  const saved = res.files?.[0];
  if (!saved) throw new Error("No file came back");
  return saved;
}
