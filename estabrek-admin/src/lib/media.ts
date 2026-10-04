import { env } from "@/config/env";

/** Returns API origin (protocol + host) derived from VITE_API_BASE_URL (e.g. http://localhost:4000). */
export function getApiOrigin(): string {
  try {
    const u = new URL(env.VITE_API_BASE_URL);
    return u.origin;
  } catch {
    // Fallback: try common local dev origin
    return "http://localhost:4000";
  }
}

/** Resolve a media URL (e.g. /uploads/...) to an absolute URL on the API origin. */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const origin = getApiOrigin();
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${origin}${url}`;
  return `${origin}/${url}`;
}
