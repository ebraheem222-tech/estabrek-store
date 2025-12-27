/**
 * Storefront helpers.
 * We intentionally avoid external HTML sanitizers on the backend to keep the container lean.
 * Admin is trusted; storefront frontend should also sanitize before rendering if needed.
 */

export function stripScripts(html: string): string {
  if (!html) return "";
  // Remove <script> blocks (basic protection)
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}
