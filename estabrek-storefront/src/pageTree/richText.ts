/**
 * Formatted words (a table's "richText" field, backend lib/collectionTree.ts): kept as the owner wrote them, with a
 * few marks, and drawn here as real elements, never as HTML (nothing written can become a script or a style):
 *
 *   **bold**  *italic* (or _italic_)  ~~struck~~  `code`  [words](https://… | /a/page | mailto: | tel:)
 *   # or ## a heading, ### a smaller one     - or * a list     1. a numbered list     > a quote     --- a line
 *
 * A blank line starts a new paragraph; a single line break stays one. A link to anywhere else is kept as words.
 * Pure (no React, no "@/" imports): the admin's editor shows its preview with the same reader.
 */

export type RichInline = { t: "text"; v: string } | { t: "b" | "i" | "s" | "code"; kids: RichInline[] } | { t: "a"; href: string; kids: RichInline[] };
export type RichBlock = { t: "p"; lines: RichInline[][] } | { t: "h"; level: 3 | 4; kids: RichInline[] } | { t: "ul"; items: RichInline[][] } | { t: "ol"; items: RichInline[][] } | { t: "quote"; lines: RichInline[][] } | { t: "hr" };

/** Formatted words are this long at most (the field keeps 20,000 letters a language). */
export const RICH_MAX = 20_000;
const DEPTH = 6;

/** A link's address, when it is one a page may open (else null: the words stay, without the link). */
export function richHref(v: string): string | null {
  const s = v.trim();
  if (!s || s.length > 2000 || /[\s<>"'`\\]/.test(s)) return null;
  return /^(\/(?!\/)|#|https?:\/\/[^/]|mailto:|tel:)/i.test(s) ? s : null;
}

const word = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);

/** One line's marks. */
export function richInline(src: string, depth = 0): RichInline[] {
  const out: RichInline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const two = src.slice(i, i + 2);
    if (depth < DEPTH) {
      if (c === "`") {
        const end = src.indexOf("`", i + 1);
        if (end > i + 1) {
          flush();
          out.push({ t: "code", kids: [{ t: "text", v: src.slice(i + 1, end) }] });
          i = end + 1;
          continue;
        }
      }
      if (two === "**" || two === "__" || two === "~~") {
        const end = src.indexOf(two, i + 2);
        if (end > i + 2 && !/\s/.test(src[i + 2]) && !/\s/.test(src[end - 1])) {
          flush();
          out.push({ t: two === "~~" ? "s" : "b", kids: richInline(src.slice(i + 2, end), depth + 1) });
          i = end + 2;
          continue;
        }
      }
      if ((c === "*" || c === "_") && src[i + 1] !== c && !/\s/.test(src[i + 1] ?? " ") && !(c === "_" && word(src[i - 1]))) {
        let end = i + 1;
        for (; end < src.length; end++) if (src[end] === c && src[end + 1] !== c && !/\s/.test(src[end - 1]) && !(c === "_" && word(src[end + 1]))) break;
        if (end < src.length && end > i + 1) {
          flush();
          out.push({ t: "i", kids: richInline(src.slice(i + 1, end), depth + 1) });
          i = end + 1;
          continue;
        }
      }
      if (c === "[") {
        const close = src.indexOf("](", i + 1);
        // The address ends at its own closing bracket (one inside it, "(1)", is kept).
        let end = -1;
        if (close > i) for (let k = close + 2, open = 1; k < src.length; k++) { if (src[k] === "(") open++; else if (src[k] === ")" && --open === 0) { end = k; break; } }
        if (close > i && end > close) {
          const words = src.slice(i + 1, close);
          const href = richHref(src.slice(close + 2, end));
          flush();
          if (href) out.push({ t: "a", href, kids: richInline(words, depth + 1) });
          else out.push(...richInline(words, depth + 1));
          i = end + 1;
          continue;
        }
      }
    }
    text += c;
    i += 1;
  }
  flush();
  return out;
}

const BULLET = /^\s{0,3}[-*•]\s+(.*)$/;
const NUMBERED = /^\s{0,3}\d{1,3}[.)]\s+(.*)$/;
const HEADING = /^\s{0,3}(#{1,3})\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const RULE = /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/;

/** Formatted words as their blocks. */
export function parseRich(src: unknown): RichBlock[] {
  if (typeof src !== "string" || !src.trim()) return [];
  const lines = src.slice(0, RICH_MAX).replace(/\r\n?/g, "\n").split("\n");
  const out: RichBlock[] = [];
  let open: RichBlock | null = null;
  const close = () => {
    if (open) out.push(open);
    open = null;
  };
  for (const line of lines) {
    if (!line.trim()) { close(); continue; }
    if (RULE.test(line)) { close(); out.push({ t: "hr" }); continue; }
    const h = HEADING.exec(line);
    if (h) { close(); out.push({ t: "h", level: h[1].length === 3 ? 4 : 3, kids: richInline(h[2]) }); continue; }
    const b = BULLET.exec(line);
    const n = b ? null : NUMBERED.exec(line);
    if (b || n) {
      const t = b ? "ul" : "ol";
      const item = richInline((b ?? n)![1]);
      const cur = open as RichBlock | null;
      if (cur && cur.t === t) cur.items.push(item);
      else { close(); open = { t, items: [item] }; }
      continue;
    }
    const q = QUOTE.exec(line);
    if (q) {
      const cur = open as RichBlock | null;
      if (cur && cur.t === "quote") cur.lines.push(richInline(q[1]));
      else { close(); open = { t: "quote", lines: [richInline(q[1])] }; }
      continue;
    }
    const cur = open as RichBlock | null;
    if (cur && cur.t === "p") cur.lines.push(richInline(line));
    else { close(); open = { t: "p", lines: [richInline(line)] }; }
  }
  close();
  return out;
}

/** The same as plain words (marks and addresses off). */
export function richPlain(src: unknown): string {
  const words = (xs: RichInline[]): string => xs.map((x) => (x.t === "text" ? x.v : words(x.kids))).join("");
  return parseRich(src)
    .map((b) => (b.t === "p" || b.t === "quote" ? b.lines.map(words).join("\n") : b.t === "h" ? words(b.kids) : b.t === "hr" ? "" : b.items.map(words).join("\n")))
    .filter(Boolean)
    .join("\n");
}

const TAG = { b: "strong", i: "em", s: "s", code: "code" } as const;

/** The blocks as elements in `doc` (a list read in the browser fills a copied card with them). */
export function richDom(doc: Document, blocks: RichBlock[]): DocumentFragment {
  const frag = doc.createDocumentFragment();
  const inline = (into: Node, xs: RichInline[]) => {
    for (const x of xs) {
      if (x.t === "text") into.appendChild(doc.createTextNode(x.v));
      else if (x.t === "a") {
        const a = doc.createElement("a");
        a.setAttribute("href", x.href);
        if (/^https?:/i.test(x.href)) { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); }
        inline(a, x.kids);
        into.appendChild(a);
      } else {
        const el = doc.createElement(TAG[x.t]);
        inline(el, x.kids);
        into.appendChild(el);
      }
    }
  };
  const lines = (into: Node, ls: RichInline[][]) => ls.forEach((l, k) => { if (k) into.appendChild(doc.createElement("br")); inline(into, l); });
  for (const b of blocks) {
    if (b.t === "hr") { frag.appendChild(doc.createElement("hr")); continue; }
    if (b.t === "h") { const h = doc.createElement(`h${b.level}`); inline(h, b.kids); frag.appendChild(h); continue; }
    if (b.t === "ul" || b.t === "ol") {
      const list = doc.createElement(b.t);
      for (const item of b.items) { const li = doc.createElement("li"); inline(li, item); list.appendChild(li); }
      frag.appendChild(list);
      continue;
    }
    const el = doc.createElement(b.t === "quote" ? "blockquote" : "p");
    lines(el, b.lines);
    frag.appendChild(el);
  }
  return frag;
}
