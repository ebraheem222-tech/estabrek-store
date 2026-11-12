/**
 * An element's own CSS (docs/cms-big-engine-plan.ar.md C): Tailwind classes or plain CSS written in the editor,
 * turned into rules for that element only (`.pt-<id>`, its states with `&:hover`…, its screens with @media) and
 * saved with it (props.code.out). Before the shop puts it in a page (and before the backend keeps it) it is checked
 * here: its braces balance, every rule at the top starts with the element's own class (or is @media, @supports,
 * @container or @keyframes), and nothing reaches outside: no @import, @charset, @namespace or @font-face, no
 * url() but the shop's own files (/…) or data: pictures, no `</` (it can't close the page's style), no
 * expression(), javascript: or behaviours. A copy of the shared file (shared/cssCode.ts): keep the two the same.
 * Plain TypeScript: no DOM, no "@/" imports.
 */

export const CODE_LIMITS = { tw: 800, css: 8000, out: 40000 } as const;
const AT_TOP = ["media", "supports", "container", "keyframes", "-webkit-keyframes"];
const BANNED = /<\/|<!--|-->|@import|@charset|@namespace|@font-face|expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|\\0/i;

/** Its url()s: only the shop's own files or data: pictures. */
function urlsOk(css: string): boolean {
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) {
    const u = m[2].trim();
    if (!(u.startsWith("/") && !u.startsWith("//")) && !/^data:image\/(png|jpe?g|gif|webp|svg\+xml|avif);/i.test(u)) return false;
  }
  return true;
}

/** Comments and strings taken out (so a brace or a word inside them counts for nothing). */
function bare(css: string): string | null {
  let out = "", i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") { const end = css.indexOf("*/", i + 2); if (end < 0) return null; i = end + 2; out += " "; continue; }
    if (c === "\"" || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) { if (css[j] === "\\") j++; if (css[j] === "\n") return null; j++; }
      if (j >= css.length) return null;
      out += "\"\"";
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Whether CSS is safe to put in the page for the element `id`: the reason it isn't, or null when it is.
 */
export function cssProblem(css: string, id: string, limit: number = CODE_LIMITS.out): string | null {
  if (typeof css !== "string") return "not text";
  if (css.length > limit) return "too long";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return "bad id";
  if (BANNED.test(css)) return "not allowed";
  if (!urlsOk(css)) return "url";
  const b = bare(css);
  if (b === null) return "unclosed";
  if (BANNED.test(b)) return "not allowed";
  // Rules at the top: the element's own, or @media and the like (their rules checked the same way inside).
  const own = `.pt-${id}`;
  let depth = 0, start = 0;
  const stack: Array<"at" | "rule" | "frames"> = [];
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if (c === "{") {
      const head = b.slice(start, i).trim();
      const inside = stack[stack.length - 1];
      if (inside !== "rule" && inside !== "frames") {
        // At the top, or straight inside an @media: a rule of its own or another at-rule.
        const at = /^@(-?[a-z-]+)/i.exec(head);
        if (at) {
          if (!AT_TOP.includes(at[1].toLowerCase())) return `@${at[1]}`;
          stack.push(/keyframes$/i.test(at[1]) ? "frames" : "at");
        } else {
          if (!head) return "empty selector";
          for (const sel of head.split(",")) {
            const s = sel.trim();
            if (!(s === own || s.startsWith(`${own}:`) || s.startsWith(`${own}.`) || s.startsWith(`${own}[`) || s.startsWith(`${own} `) || s.startsWith(`${own}>`) || s.startsWith(`${own}::`))) return "outside the element";
          }
          stack.push("rule");
        }
      } else stack.push(inside === "frames" ? "rule" : "rule");
      depth++;
      start = i + 1;
    } else if (c === "}") {
      depth--;
      if (depth < 0) return "unbalanced";
      stack.pop();
      start = i + 1;
    } else if (c === ";" && (stack.length === 0)) {
      // A declaration at the top belongs to nothing.
      if (b.slice(start, i).trim()) return "outside the element";
      start = i + 1;
    }
  }
  if (depth !== 0) return "unbalanced";
  if (b.slice(start).trim()) return "outside the element";
  return null;
}

/** Plain CSS written for the element (its declarations, and `&:hover {…}`, `@media … {…}` inside) as its own rule. */
export function wrapCss(css: string, id: string): string {
  return css.trim() ? `.pt-${id}{${css.trim()}}` : "";
}
