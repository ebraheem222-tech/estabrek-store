import DOMPurify from "dompurify";

/**
 * Sanitize HTML before rendering with dangerouslySetInnerHTML.
 * This is important because CMS content is user-generated.
 */
export function sanitizeHtml(html: string): string {
  const input = String(html ?? "");
  // Configure: allow common tags/attributes, block scripts/events.
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { html: true },
  });
}
