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

function isCloudinaryUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("res.cloudinary.com") || url.includes("/upload/");
  } catch {
    return url.includes("res.cloudinary.com") || url.includes("/upload/");
  }
}

/**
 * Injects Cloudinary transformations into an existing Cloudinary URL.
 * If the URL is not Cloudinary, returns it unchanged.
 *
 * We always add `f_auto,q_auto` to get modern formats (AVIF/WebP) + sensible quality.
 */
export function cldUrl(url: string, t: CloudinaryTransform = {}): string {
  if (!url) return url;
  if (!isCloudinaryUrl(url)) return url;

  // If caller already provided a fully transformed url, do not double-inject.
  // We detect this by checking for "/upload/<something>/" where <something> contains "f_" or "q_".
  const alreadyTransformed = /\/upload\/[^/]*(f_|q_)/.test(url);
  if (alreadyTransformed) return url;

  const parts: string[] = ["f_auto", "q_auto"];

  if (typeof t.w === "number") parts.push(`w_${Math.round(t.w)}`);
  if (typeof t.h === "number") parts.push(`h_${Math.round(t.h)}`);
  if (t.c) parts.push(`c_${t.c}`);
  if (t.g) parts.push(`g_${t.g}`);
  if (typeof t.dpr === "number") parts.push(`dpr_${t.dpr}`);

  const insert = parts.join(",");

  // Insert right after "/upload/"
  return url.replace("/upload/", `/upload/${insert}/`);
}
