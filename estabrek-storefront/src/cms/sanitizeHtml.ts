import sanitize from "sanitize-html";

/**
 * Sanitize HTML before rendering with dangerouslySetInnerHTML.
 * IMPORTANT: allow `class` so Tailwind classes from CMS work.
 */
export function sanitizeHtml(html: string): string {
  return sanitize(String(html ?? ""), {
    allowedTags: [
      "p","br","b","strong","i","em","u",
      "h1","h2","h3","h4","h5","h6",
      "ul","ol","li","blockquote",
      "code","pre","span","div",
      "a","img"
    ],
    allowedAttributes: {
      a: ["href","target","rel","title"],
      img: ["src","alt","title","width","height"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          target: attribs.target ?? "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
  });
}
