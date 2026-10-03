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

  // If caller already provided a transformed url, inject missing auto-orientation only.
  const alreadyTransformed = /\/upload\/[^/]*(f_|q_|w_|h_|c_|g_|dpr_|fl_|a_)/.test(normalized);
  if (alreadyTransformed) {
    const marker = "/upload/";
    const idx = normalized.indexOf(marker);
    if (idx === -1) return normalized;
    const base = normalized.slice(0, idx + marker.length);
    const tail = normalized.slice(idx + marker.length);
    const segments = tail.split("/");
    // Signed URLs cannot be safely modified (signature would be invalid)
    if (segments[0]?.startsWith("s--")) return normalized;

    const transformIdx = segments.findIndex((seg) => /(^|,)(f_|q_|w_|h_|c_|g_|dpr_|fl_|a_|t_)/.test(seg));
    if (transformIdx === -1) {
      segments.unshift("a_auto");
    } else {
      const parts = segments[transformIdx]!.split(",").filter(Boolean);
      const filtered = parts.filter((p) => !p.startsWith("a_"));
      filtered.unshift("a_auto");
      segments[transformIdx] = filtered.join(",");
    }
    return `${base}${segments.join("/")}`;
  }

  const parts: string[] = ["f_auto", "q_auto:good", "fl_progressive", "dpr_auto", "a_auto"];

  if (typeof t.w === "number") parts.push(`w_${Math.round(t.w)}`);
  if (typeof t.h === "number") parts.push(`h_${Math.round(t.h)}`);
  if (t.c) parts.push(`c_${t.c}`);
  if (t.g) parts.push(`g_${t.g}`);
  if (typeof t.dpr === "number") parts.push(`dpr_${t.dpr}`);

  const insert = parts.join(",");

  // Insert right after "/upload/"
  return normalized.replace("/upload/", `/upload/${insert}/`);
}
