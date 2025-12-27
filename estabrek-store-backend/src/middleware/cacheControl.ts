import type { RequestHandler } from "express";

/**
 * CDN-friendly caching for public GET endpoints.
 * - s-maxage caches at CDN/proxy (Cloudflare/Vercel/etc)
 * - stale-while-revalidate keeps responses fast while revalidating
 */
export const cacheControl: RequestHandler = (req, res, next) => {
  if (req.method !== "GET") return next();

  const p = req.path || "";
  const isPublic =
    p.startsWith("/v1/storefront") ||
    p.startsWith("/v1/settings") ||
    p.startsWith("/v1/ugc");

  if (!isPublic) return next();

  // Do not cache if Authorization present
  if (req.headers.authorization) return next();

  // 60s CDN cache, allow stale for 5m
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  next();
};
