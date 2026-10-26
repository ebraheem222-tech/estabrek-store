/**
 * The addresses of the admin allowed to show the shop inside its new editor
 * (ADMIN_ORIGIN, space or comma separated, e.g. "https://admin.example.com").
 * In development the local admin is allowed too. next.config.mjs repeats this
 * rule for the frame-ancestors header. ADMIN_ORIGIN is read by name so the build
 * can fill it in (next.config.mjs env).
 */
export function studioOrigins(
  env: Record<string, string | undefined> = { ADMIN_ORIGIN: process.env.ADMIN_ORIGIN, NODE_ENV: process.env.NODE_ENV },
): string[] {
  const own = String(env.ADMIN_ORIGIN ?? "")
    .split(/[\s,]+/)
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter((o) => /^https?:\/\/[^\s/]+$/.test(o));
  const dev = env.NODE_ENV === "production" ? [] : ["http://127.0.0.1:5179", "http://localhost:5179", "http://localhost:5173"];
  return [...new Set([...own, ...dev])];
}
