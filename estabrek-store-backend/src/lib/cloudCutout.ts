/**
 * «شيل الخلفية» with Cloudinary (admin → الوسائط → إعدادات الرفع, off unless switched
 * on; the free engine runs in the admin's browser). Cloudinary removes the background
 * of a picture already stored there as a derived version (`e_background_removal`), a
 * PNG with transparency; the original stays as it is. Billed by Cloudinary as 75
 * transformations a picture, on top of the normal count. The first request answers
 * 423 while Cloudinary works on it: we ask again for up to 90 seconds.
 *
 * The old "AI Background Removal" add-on (upload option background_removal) is being
 * retired by Cloudinary, so it is not used.
 */
import type { v2 } from "cloudinary";

export const CUTOUT_TRANSFORMATIONS = 75;

/** A transformation segment ("f_auto,q_auto", "w_400", "c_fill,h_300"). */
const TRANSFORMATION = /^[a-z]{1,4}_[^/]+$/;

/**
 * The public id of a picture on this store's Cloudinary, from its address:
 * https://res.cloudinary.com/<cloud>/image/upload/[transformations/][v123/]folder/name.jpg
 * → "folder/name". Anything else (another cloud, a fetched or private picture) → null.
 */
export function publicIdFromUrl(raw: string, cloudName: string | undefined): string | null {
  if (!cloudName) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.hostname !== "res.cloudinary.com") return null;
  const parts = u.pathname.split("/").filter(Boolean).map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });
  if (parts.length < 4 || parts[0] !== cloudName || parts[1] !== "image" || parts[2] !== "upload") return null;
  let rest = parts.slice(3);
  const version = rest.findIndex((p) => /^v\d+$/.test(p));
  if (version >= 0) rest = rest.slice(version + 1);
  else while (rest.length > 1 && TRANSFORMATION.test(rest[0])) rest = rest.slice(1);
  if (!rest.length || rest.some((p) => p === ".." || p === ".")) return null;
  const last = rest[rest.length - 1].replace(/\.[a-z0-9]{2,5}$/i, "");
  const id = [...rest.slice(0, -1), last].join("/");
  return id || null;
}

/** The signed address of the picture without its background (works with strict transformations). */
export function cutoutUrl(cld: typeof v2, publicId: string, fineEdges = false): string {
  return cld.url(publicId, {
    secure: true,
    sign_url: true,
    resource_type: "image",
    type: "upload",
    transformation: [{ effect: fineEdges ? "background_removal:fineedges_y" : "background_removal" }],
    format: "png",
  });
}

export type CutoutFailure =
  | "CLOUD_CUTOUT_NOT_ENABLED"
  | "CLOUD_CUTOUT_QUOTA"
  | "CLOUD_CUTOUT_TIMEOUT"
  | "NOT_FOUND_ON_CLOUDINARY"
  | "CLOUD_CUTOUT_FAILED";

export type CutoutResult = { ok: true; png: Buffer } | { ok: false; status: number; error: CutoutFailure; message: string };

type Deps = {
  fetch: (url: string) => Promise<Response>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  timeoutMs: number;
  everyMs: number;
};

const defaults: Deps = {
  fetch: (url) => fetch(url),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  now: () => Date.now(),
  timeoutMs: 90_000,
  everyMs: 3_000,
};

/** Cloudinary's answer, sorted into what the admin can show. */
export function cutoutFailure(status: number, cldError: string): { status: number; error: CutoutFailure; message: string } {
  const msg = cldError.trim();
  if (status === 404) return { status: 404, error: "NOT_FOUND_ON_CLOUDINARY", message: msg || "The picture is not on Cloudinary" };
  if (/quota|limit|exceed|credits?/i.test(msg)) return { status: 429, error: "CLOUD_CUTOUT_QUOTA", message: msg };
  if (status === 401 || status === 403 || /add-?on|subscri|not (enabled|allowed|permitted|authori[sz]ed)|plan|denied|background.?removal/i.test(msg)) {
    return { status: 409, error: "CLOUD_CUTOUT_NOT_ENABLED", message: msg || `Cloudinary answered ${status}` };
  }
  return { status: 502, error: "CLOUD_CUTOUT_FAILED", message: msg || `Cloudinary answered ${status}` };
}

/** Asks for the cut-out until it is ready (423/420 = still working) or the time is up. */
export async function fetchCutout(url: string, deps: Partial<Deps> = {}): Promise<CutoutResult> {
  const d = { ...defaults, ...deps };
  const start = d.now();
  for (;;) {
    let res: Response;
    try {
      res = await d.fetch(url);
    } catch (e) {
      return { ok: false, status: 502, error: "CLOUD_CUTOUT_FAILED", message: String((e as Error)?.message ?? e) };
    }
    if (res.ok) return { ok: true, png: Buffer.from(await res.arrayBuffer()) };
    if (res.status === 423 || res.status === 420) {
      if (d.now() - start + d.everyMs > d.timeoutMs) {
        return { ok: false, status: 504, error: "CLOUD_CUTOUT_TIMEOUT", message: "Cloudinary is still working on it" };
      }
      await d.sleep(d.everyMs);
      continue;
    }
    return { ok: false, ...cutoutFailure(res.status, res.headers.get("x-cld-error") ?? "") };
  }
}
