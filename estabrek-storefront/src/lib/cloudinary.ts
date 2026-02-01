export type CloudinaryTransform = {
  w?: number;
  h?: number;
  /** Cloudinary crop mode, e.g. "fill", "fit", "pad" */
  c?: string;
  /** Gravity, e.g. "auto", "face", "center" */
  g?: string;
  /** Device pixel ratio hint: 1 or 2 (we usually let Cloudinary/Next handle this) */
  dpr?: number;
};

export function isCloudinaryUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("res.cloudinary.com") || url.includes("/upload/");
  } catch {
    return url.includes("res.cloudinary.com") || url.includes("/upload/");
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function getPublicOrigin(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "").replace(/\/v1$/, "");
  }
}

function normalizePublicUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("data:")) return url;
  const origin = getPublicOrigin();
  if (origin && url.startsWith("/")) return `${origin}${url}`;
  if (!origin) return url;
  try {
    const u = new URL(url);
    if (LOCAL_HOSTS.has(u.hostname)) {
      return `${origin}${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    // keep original
  }
  return url;
}

/**
 * Injects Cloudinary transformations into an existing Cloudinary URL.
 * If the URL is not Cloudinary, returns it unchanged.
 *
 * We always add `f_auto,q_auto` to get modern formats (AVIF/WebP) + sensible quality.
 */
export function cldUrl(url: string, t: CloudinaryTransform = {}): string {
  if (!url) return url;
  const normalized = normalizePublicUrl(url);
  if (!isCloudinaryUrl(normalized)) return normalized;

  // If caller already provided a fully transformed url, do not double-inject.
  // We detect this by checking for "/upload/<something>/" where <something> contains "f_" or "q_".
  const alreadyTransformed = /\/upload\/[^/]*(f_|q_)/.test(normalized);
  if (alreadyTransformed) return normalized;

  const parts: string[] = ["f_auto", "q_auto:eco", "fl_progressive", "dpr_auto"];

  if (typeof t.w === "number") parts.push(`w_${Math.round(t.w)}`);
  if (typeof t.h === "number") parts.push(`h_${Math.round(t.h)}`);
  if (t.c) parts.push(`c_${t.c}`);
  if (t.g) parts.push(`g_${t.g}`);
  if (typeof t.dpr === "number") parts.push(`dpr_${t.dpr}`);

  const insert = parts.join(",");

  // Insert right after "/upload/"
  return normalized.replace("/upload/", `/upload/${insert}/`);
}
