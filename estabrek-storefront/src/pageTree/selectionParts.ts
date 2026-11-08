/** Safe persisted targets and DOM discovery for objects inside functional widgets. */
export const DOM_PART_SOURCE = "~[a-z][a-z0-9-]{0,15}\\.[1-9][0-9]{0,2}(?:\\.[a-z][a-z0-9-]{0,15}\\.[1-9][0-9]{0,2}){0,15}";
export const PART_TARGET_SOURCE = `(?:@[a-z0-9-]{1,40}|${DOM_PART_SOURCE})`;
export const LOOK_TARGET_PATTERN = new RegExp(`^(?!n:[^/]+(?:$|/(?![@~])))(s|b|n):([A-Za-z0-9_-]{1,80})(?:/(${PART_TARGET_SOURCE}|[A-Za-z0-9_.]{1,120}))?$`);
const pathPattern = new RegExp(`^${DOM_PART_SOURCE}$`);
export type PartKind = "text" | "button" | "image" | "video" | "box";
export type PartOwner = { key: string; el: Element; atomic?: boolean; retained?: ReadonlySet<string>; semanticOnly?: boolean };
export type SelectionPart = { el: Element; owner: string; key: string; target: string; kind: PartKind; label?: string; name?: string; within?: string; count: number };
export const partId = (owner: string, key: string) => `detail:${owner}:${key}`;
export function domPartSelector(path: string): string | null {
  if (!pathPattern.test(path)) return null;
  const pieces = path.slice(1).split(".");
  const selectors: string[] = [];
  for (let i = 0; i < pieces.length; i += 2) selectors.push(`${pieces[i]}:nth-of-type(${pieces[i + 1]})`);
  return `:scope > ${selectors.join(" > ")}`;
}
export function domPartPath(el: Element, owner: Element): string | null {
  const path: string[] = [];
  let at: Element | null = el;
  while (at && at !== owner && path.length < 16) {
    const tag = at.localName.toLowerCase();
    if (!/^[a-z][a-z0-9-]{0,15}$/.test(tag)) return null;
    let position = 1;
    for (let sibling = at.previousElementSibling; sibling; sibling = sibling.previousElementSibling) if (sibling.localName.toLowerCase() === tag) position++;
    if (position > 999) return null;
    path.unshift(`${tag}.${position}`); at = at.parentElement;
  }
  return at === owner && path.length ? `~${path.join(".")}` : null;
}
export function targetSelector(target: string): string | null {
  const m = LOOK_TARGET_PATTERN.exec(target);
  if (!m) return null;
  const owner = m[1] === "n" ? `[data-tree-node="${m[2]}"][data-tree-node]` : m[1] === "s" ? `[data-cms-section="${m[2]}"][data-cms-section]` : `[data-rose-block="${m[2]}"][data-rose-block]`;
  const part = m[3];
  const boundary = m[1] === "n" ? `:not(:where([data-tree-node="${m[2]}"] [data-tree-node] *))` : "";
  if (!part) return owner;
  if (part.startsWith("~")) return `${owner} ${domPartSelector(part)!.replace(/^:scope /, "")}${boundary}`;
  if (part.startsWith("@")) return m[1] === "n" ? `${owner} :is([data-cms-part="${part.slice(1)}"],[data-part="${part.slice(1)}"])${boundary}` : `${owner} [data-part="${part.slice(1)}"][data-part]`;
  if (m[1] === "n") return null;
  return [part, `${part}.ar`, `${part}.en`, `${part}.he`].flatMap(p => [`${owner} [data-edit-box="${p}"][data-edit-box]`, `${owner} [data-edit="${p}"][data-edit]:not([data-edit-boxed])`]).concat(`${owner} [data-edit-media="${part}"][data-edit-media]`).join(",");
}
const CANDIDATES = "div,section,article,aside,header,footer,nav,main,form,fieldset,legend,label,input,textarea,select,span,strong,em,small,details,summary,table,thead,tbody,tr,th,td,ul,ol,li,figure,figcaption,blockquote,img,video,svg,canvas,picture,iframe,a,button,h1,h2,h3,h4,h5,h6,p,[data-cms-part],[data-part]";
export const SELECTION_HELPERS = "input[type=hidden],.pt-fx,.pt-spot,.pt-particles,[data-pt-particles],.pt-edge,.pt-split-piece,.pt-mask-split-mask-piece-mask,.th-word,.th-char,.th-line,.th-mask-line-mask";
const semantic = (el: Element) => {
  const name = el.getAttribute("data-cms-part") ?? el.getAttribute("data-part");
  return name && /^[a-z0-9-]{1,40}$/.test(name) ? name : undefined;
};
const kindOf = (el: Element, name?: string): PartKind => {
  if (name && /(?:image|picture|photo|avatar|tile)$/.test(name)) return "image";
  if (name && /(?:name|title|price|category|text|caption)$/.test(name)) return "text";
  if (name && /(?:add|button|swatch)$/.test(name)) return "button";
  if (/^(img|picture)$/.test(el.localName)) return "image";
  if (el.localName === "video") return "video";
  if (/^(button|summary|input|select|textarea)$/.test(el.localName) || el.getAttribute("role") === "button") return "button";
  if (/^(h[1-6]|p|span|strong|em|small|label|legend|figcaption|blockquote|th|td)$/.test(el.localName)) return "text";
  if (el.localName === "a" && !el.querySelector("img,svg,video,canvas")) return "button";
  if (!el.children.length && el.textContent?.trim()) return "text";
  return "box";
};
/** Bounds count and depth; owner boundaries prevent the same element being assigned to two widgets. */
export function collectSelectionParts(owners: PartOwner[], seeds = new Map<Element, string>(), visible?: (el: Element, owner: Element) => boolean, limit = 1600): SelectionPart[] {
  const ownerAt = new Map(owners.map(owner => [owner.el, owner]));
  const ownerByKey = new Map(owners.map(owner => [owner.key, owner]));
  const keys = new Map(seeds), out: SelectionPart[] = [];
  const belongs = (el: Element, owner: PartOwner) => {
    for (let at: Element | null = el.parentElement; at; at = at.parentElement) if (ownerAt.has(at)) return at === owner.el;
    return false;
  };
  for (const owner of owners) {
    if (owner.atomic) continue;
    for (const el of owner.el.querySelectorAll(CANDIDATES)) {
      if (out.length >= limit) break;
      if (ownerAt.has(el) || keys.has(el) || !belongs(el, owner) || el.closest(SELECTION_HELPERS) || el.closest("svg") && el.localName !== "svg") continue;
      const key = domPartPath(el, owner.el); if (!key) continue;
      const name = semantic(el);
      if (owner.semanticOnly && !name) continue;
      const target = name ? `@${name}` : key;
      if (!owner.retained?.has(target) && (el.closest("[hidden],[inert]") || visible && !visible(el, owner.el))) continue;
      const text = el.getAttribute("aria-label") ?? el.getAttribute("alt") ?? el.getAttribute("title") ?? [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(" ");
      const label = text.replace(/\s+/g, " ").trim().slice(0, 60);
      keys.set(el, `d:${key}`);
      out.push({ el, owner: owner.key, key, target, kind: kindOf(el, name), ...(label ? { label } : {}), ...(name ? { name } : {}), count: 1 });
    }
  }
  const counts = new Map<string, number>();
  for (const part of out) counts.set(`${part.owner}/${part.target}`, (counts.get(`${part.owner}/${part.target}`) ?? 0) + 1);
  for (const part of out) {
    part.count = counts.get(`${part.owner}/${part.target}`)!;
    const owner = ownerByKey.get(part.owner)!;
    for (let at = part.el.parentElement; at && at !== owner.el; at = at.parentElement) { const within = keys.get(at); if (within) { part.within = within; break; } }
  }
  return out;
}
