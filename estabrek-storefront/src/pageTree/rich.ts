/**
 * Words with a little formatting, for a heading, text or button whose props.rich is on:
 * [b]bold[/b], [i]italic[/i], [u]underlined[/u], [mark]highlighted[/mark],
 * [color=accent]coloured[/color] (a theme colour or #hex) and [link=/shop]a link[/link].
 * Kept as words (never HTML), read here into elements; a tag that doesn't close or isn't
 * known stays as it was written. The editor's frame writes it back from what was typed
 * (htmlToRich). No "@/" imports, so the tests can load this file directly.
 */
import { createElement, type ReactNode } from "react";
import { color as cssColor } from "./css";

type Tag = "b" | "i" | "u" | "mark" | "color" | "link";
type Part = { tag: Tag; arg?: string; kids: Array<Part | string> };
const OPEN = /\[(b|i|u|mark)\]|\[(color|link)=([^\]\s]{1,500})\]|\[\/(b|i|u|mark|color|link)\]/g;

/** The words as a tree of formatted parts; anything that doesn't pair up stays as written. */
export function parseRich(text: string): Array<Part | string> {
  const root: Part = { tag: "b", kids: [] };
  const stack: Array<{ part: Part; raw: string }> = [{ part: root, raw: "" }];
  let at = 0;
  const push = (s: string) => {
    if (!s) return;
    const kids = stack[stack.length - 1].part.kids;
    if (typeof kids[kids.length - 1] === "string") kids[kids.length - 1] += s;
    else kids.push(s);
  };
  for (const m of text.matchAll(OPEN)) {
    push(text.slice(at, m.index));
    at = m.index! + m[0].length;
    const close = m[4] as Tag | undefined;
    if (close) {
      const top = stack[stack.length - 1];
      if (stack.length > 1 && top.part.tag === close) {
        stack.pop();
        stack[stack.length - 1].part.kids.push(top.part);
      } else push(m[0]);
      continue;
    }
    if (stack.length > 8) {
      push(m[0]);
      continue;
    }
    stack.push({ part: { tag: (m[1] ?? m[2]) as Tag, arg: m[3], kids: [] }, raw: m[0] });
  }
  push(text.slice(at));
  // Tags left open: written back as words.
  while (stack.length > 1) {
    const top = stack.pop()!;
    const kids = stack[stack.length - 1].part.kids;
    kids.push(top.raw, ...top.part.kids);
  }
  return root.kids;
}

/**
 * Formatted words as elements; `link` checks an address and gives it the page's language
 * (null = not a safe one). Built with createElement (not JSX) so the Playwright tests,
 * which rewrite JSX in the files they load, can render it too.
 */
export function richNodes(text: string, link: (href: string) => string | null, leaf?: (words: string) => ReactNode): ReactNode[] {
  const draw = (k: Part | string, i: number): ReactNode => {
    if (typeof k === "string") return leaf ? leaf(k) : k;
    const kids = k.kids.map(draw);
    switch (k.tag) {
      case "b":
        return createElement("strong", { key: i }, ...kids);
      case "i":
        return createElement("em", { key: i }, ...kids);
      case "u":
        return createElement("u", { key: i }, ...kids);
      case "mark":
        return createElement("mark", { key: i, className: "pt-mark" }, ...kids);
      case "color": {
        const c = cssColor(k.arg);
        return createElement("span", { key: i, ...(c ? { style: { color: c } } : {}) }, ...kids);
      }
      case "link": {
        const to = k.arg ? link(k.arg) : null;
        return to ? createElement("a", { key: i, className: "pt-inline-link", href: to }, ...kids) : createElement("span", { key: i }, ...kids);
      }
    }
  };
  return parseRich(text).map(draw);
}

/** Whether words carry any formatting at all. */
export const hasRich = (text: string) => parseRich(text).some((k) => typeof k !== "string");

/** The theme colours the editor's colour button marks with (a colour no one picks), and their names. */
export const MARK_COLOURS: Record<string, string> = { "#a10001": "accent", "#a10002": "text", "#a10003": "muted" };
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const toHex = (c: string): string | null => {
  const s = c.trim().toLowerCase();
  if (HEX.test(s)) return s;
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s);
  return m ? `#${[m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}` : null;
};
const colourName = (c: string | null) => (c ? MARK_COLOURS[c] ?? c : null);

/**
 * What was typed in the editor's frame (bold, italic, underline, highlight, colour and
 * links as the browser writes them) back into formatted words. Lines become new lines.
 */
export function htmlToRich(root: Node): string {
  const out: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === 3) return void out.push((n.textContent ?? "").replace(/ /g, " "));
    if (n.nodeType !== 1) return;
    const el = n as HTMLElement;
    const name = el.tagName;
    if (name === "BR") return void out.push("\n");
    if (el.getAttribute("aria-hidden") === "true") return;
    const wraps: Array<[string, string]> = [];
    if (name === "B" || name === "STRONG" || /^(bold|[6-9]00)$/.test(el.style.fontWeight)) wraps.push(["[b]", "[/b]"]);
    if (name === "I" || name === "EM" || el.style.fontStyle === "italic") wraps.push(["[i]", "[/i]"]);
    if (name === "U" || el.style.textDecorationLine === "underline") wraps.push(["[u]", "[/u]"]);
    if (name === "MARK" || (el.style.backgroundColor && el.style.backgroundColor !== "transparent")) wraps.push(["[mark]", "[/mark]"]);
    const c = colourName(toHex(name === "FONT" ? el.getAttribute("color") ?? "" : el.style.color ?? ""));
    if (c && (cssColor(c) !== undefined)) wraps.push([`[color=${c}]`, "[/color]"]);
    const href = name === "A" ? el.getAttribute("href") : null;
    if (href && /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(href) && !/[\s\]]/.test(href)) wraps.push([`[link=${href}]`, "[/link]"]);
    // A new line the browser made as a block (Enter in some browsers): a line of its own.
    const block = name === "DIV" || name === "P";
    if (block && out.length && !out[out.length - 1].endsWith("\n")) out.push("\n");
    wraps.forEach(([o]) => out.push(o));
    el.childNodes.forEach((k) => walk(k));
    [...wraps].reverse().forEach(([, cl]) => out.push(cl));
  };
  root.childNodes.forEach((k) => walk(k));
  // Empty formatting goes; spaces at the end too.
  return out.join("").replace(/\[(b|i|u|mark|color=[^\]]+|link=[^\]]+)\]\[\/(b|i|u|mark|color|link)\]/g, "").replace(/\s+$/, "");
}
