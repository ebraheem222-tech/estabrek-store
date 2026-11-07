"use client";
/**
 * The shop's side of the admin's new editor. Only on the editor's frame
 * (app/[lang]/studio-frame), never on the shop's pages: it measures every element
 * of the page tree ([data-tree-node]) and every old section ([data-cms-section])
 * and tells the editor where they are, each time the page scrolls, resizes or
 * changes; it scrolls when the editor asks, and keeps links from leaving the page.
 * Messages go to, and come from, the admin addresses it is given only. The 3D stage's
 * messages (type "stage…") pass on to the stage through studioLink.
 */
import { useEffect, useRef } from "react";
import { nodeGeometry,type NodeGeometry,type MeasuredPlane } from "./studioGeometry";
import { studioLink } from "./studioLink";
import { PREVIEW_VARS, SITE_STYLE_KINDS, TREE_TRANSFORM, lookSelector, type SiteStyle, type TreeNode } from "./tree";
import { nodeCss, siteTarget } from "./css";
import { geometryPreviewCss, geometryPreviewNodes } from "./geometryPreview";
import { htmlToRich } from "./rich";
import { INTERACTION_EVENTS } from "@/lib/visualControls";
import { emitVisualInteraction } from "@/lib/visualInteractions";

export const STUDIO_SOURCE = "estabrek-studio";

export type StudioRect = { x: number; y: number; w: number; h: number };
/**
 * Inside an old section or a rose scene (its "owner": "s:<section id>" or "b:<scene>"), each
 * measured thing has a key: "f:<path>" for a field, "p:<name>:<n>" for a marked piece, "a:<n>"
 * for anything else seen. `within` is the key of the field or piece around it, if any.
 */
export type StudioItem =
  /**
   * `holder`: for an element placed freely over its container, that container's box. `size`: its
   * own size before it's turned or scaled. `inner`: a native container's padding box, where what it holds
   * (and what's placed freely in it) sits.
   */
  | { kind: "node"; id: string; rect: StudioRect; holder?: StudioRect; size?: { w: number; h: number }; inner?: StudioRect; parentScale?: number | null; innerScale?: number | null; geometry?: NodeGeometry }
  | { kind: "legacy"; sectionId: string; rect: StudioRect }
  /**
   * A text, picture, video or button the editor can change ([data-edit], [data-edit-media]):
   * `sectionId` is the section whose data holds it (a scene's words live in the opening's),
   * `block` the scene it shows in. A button's label ([data-edit-boxed]) is measured as the
   * whole button ([data-edit-box]), with its link's field.
   */
  | { kind: "slot"; owner: string; sectionId: string; block?: string; path: string; edit: "text" | "lines" | "list" | "media"; media?: "image" | "video"; link?: string; within?: string; rect: StudioRect }
  /** A marked piece ([data-part]): a product card, its picture, a scene's mascot…; `n` of `count` in its owner. */
  | { kind: "part"; owner: string; name: string; n: number; count: number; within?: string; rect: StudioRect }
  /** Anything else seen inside an owner: a picture, words, a link, a drawing. */
  | { kind: "auto"; owner: string; n: number; tag: string; label?: string; within?: string; rect: StudioRect }
  /** The rose home's scenes: seasons, collection stories, Instagram, the fabric study ([data-rose-block]). */
  | { kind: "block"; block: string; rect: StudioRect };
export type StudioLayout = {
  source: typeof STUDIO_SOURCE;
  type: "layout";
  pageId: string;
  viewVersion?: string;
  lang: string;
  dir: string;
  viewport: { w: number; h: number };
  scroll: { x: number; y: number };
  doc: { w: number; h: number };
  items: StudioItem[];
};

const rectOf = (el: Element): StudioRect => {
  const r = el.getBoundingClientRect();
  return { x: Math.round((r.left + window.scrollX) * 10) / 10, y: Math.round((r.top + window.scrollY) * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
};

/**
 * CSS absolute placement uses the padding box. Rect/offset ratios account for
 * axis-aligned 2D scaling; rotated or perspective ancestors still expose an AABB.
 */
const paddingRect = (el: Element): StudioRect => {
  const rect = rectOf(el);
  const html = el as HTMLElement;
  const sx = html.offsetWidth > 0 ? rect.w / html.offsetWidth : 1;
  const sy = html.offsetHeight > 0 ? rect.h / html.offsetHeight : 1;
  const round = (value: number) => Math.round(value * 10) / 10;
  return { x: round(rect.x + el.clientLeft * sx), y: round(rect.y + el.clientTop * sy), w: round(el.clientWidth * sx), h: round(el.clientHeight * sy) };
};

const PATH = /^[A-Za-z0-9_.]{1,120}$/;
const PART = /^[a-z0-9-]{1,40}$/;
const OWNERS = "[data-cms-section], [data-rose-block]";
/** What can be picked inside an owner without a mark of its own (the outermost of them). */
const ATOMS = "img, video, svg, canvas, picture, a, button, h1, h2, h3, h4, h5, h6, p, li, blockquote, figure";
const ATOM_HOLDERS = "a, button, li, figure, picture, blockquote, h1, h2, h3, h4, h5, h6, p";
const MARKED = "[data-edit], [data-edit-media], [data-edit-box], [data-part]";
const MAX_AUTOS = 400;

type Owner = { key: string; el: Element; section?: string; block?: string };

/** The old section or rose scene an element shows in (a tree element's own wrapper doesn't count). */
function ownerOf(el: Element): Owner | null {
  for (let at = el.closest(OWNERS); at; at = at.parentElement?.closest(OWNERS) ?? null) {
    const block = at.getAttribute("data-rose-block");
    if (block && PART.test(block)) return { key: `b:${block}`, el: at, block };
    const sid = at.getAttribute("data-cms-section") ?? "";
    if (sid && !sid.startsWith("tree-")) return { key: `s:${sid}`, el: at, section: sid };
  }
  return null;
}

/** Inside a tree element of its own (an object placed over an old section): measured as that element. */
const inTreeNode = (el: Element, owner: Owner) => {
  const tn = el.closest("[data-tree-node]");
  return Boolean(tn && tn !== owner.el && owner.el.contains(tn));
};

/** Where every tree element, old section, rose scene and what's inside them is, in page coordinates. */
export function measureStudio(): StudioItem[] {
  const items: StudioItem[] = [];
  const planes=new Map<Element,MeasuredPlane|null>();
  const seen = new Set<string>();
  // Native transforms use a positive uniform scale. Measure it through the actual
  // DOM ancestry, including wrappers between tree nodes. A rotated/3D ancestor
  // needs an affine/projective holder, so mark it explicitly rather than guessing
  // its scale from an axis-aligned bounding box.
  const scales = new Map<Element, number | null>();
  const axisScale = (el: Element | null): number | null => {
    if (!el) return 1;
    if (scales.has(el)) return scales.get(el)!;
    const parent = axisScale(el.parentElement);
    const transform = getComputedStyle(el).transform;
    let own = 1;
    if (transform && transform !== "none") {
      const match = /^matrix(3d)?\(([^)]+)\)$/.exec(transform);
      const m = match?.[2].split(",").map(Number);
      const zero = (n: number) => Math.abs(n) < 0.00001;
      if (!m || !m.every(Number.isFinite) || (match?.[1] ? m.length !== 16 : m.length !== 6)) own = NaN;
      else if (match?.[1]) {
        // Perspective along Z is inert on an unrotated, flattened XY plane.
        if (![1, 2, 3, 4, 6, 7, 8, 9, 14].every(i => zero(m[i])) || !zero(m[0] - m[5]) || !zero(m[15] - 1)) own = NaN;
        else own = m[0];
      } else if (!zero(m[1]) || !zero(m[2]) || !zero(m[0] - m[3])) own = NaN;
      else own = m[0];
    }
    const total = parent !== null && Number.isFinite(own) && own > 0 ? parent * own : null;
    scales.set(el, total);
    return total;
  };
  // Seen on screen: not see-through, not hidden, not a scene's resting season or chapter.
  const shownCache = new Map<Element, boolean>();
  const shown = (el: Element, upTo: Element): boolean => {
    const known = shownCache.get(el);
    if (known !== undefined) return known;
    let ok = true;
    if (el.hasAttribute("inert")) ok = false;
    else {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05) ok = false;
      else if (el !== upTo && el.parentElement) ok = shown(el.parentElement, upTo);
    }
    shownCache.set(el, ok);
    return ok;
  };
  document.querySelectorAll<HTMLElement>("[data-tree-node]").forEach((el) => {
    const id = el.dataset.treeNode ?? "";
    if (!id || seen.has(`n:${id}`)) return;
    seen.add(`n:${id}`);
    const holder = el.offsetParent && getComputedStyle(el).position === "absolute" ? paddingRect(el.offsetParent) : undefined;
    const inner = el.matches(".pt-section,.pt-stack,.pt-grid,.pt-cell,.pt-popup")
      ? (el.matches(".pt-section") ? el.querySelector(":scope > .pt-inner") ?? el : el)
      : null;
    items.push({ kind: "node", id, rect: rectOf(el), size: { w: el.offsetWidth, h: el.offsetHeight }, parentScale: axisScale(el.parentElement), geometry:nodeGeometry(el,planes), ...(holder ? { holder } : {}), ...(inner ? { inner: paddingRect(inner), innerScale: axisScale(inner) } : {}) });
  });
  const owners: Owner[] = [];
  document.querySelectorAll<HTMLElement>("[data-cms-section]").forEach((el) => {
    const sid = el.getAttribute("data-cms-section") ?? "";
    // A tree element's own wrapper, or the inner copy of a section already measured.
    if (!sid || sid.startsWith("tree-") || seen.has(`s:${sid}`)) return;
    seen.add(`s:${sid}`);
    owners.push({ key: `s:${sid}`, el, section: sid });
    items.push({ kind: "legacy", sectionId: sid, rect: rectOf(el) });
  });
  document.querySelectorAll<HTMLElement>("[data-rose-block]").forEach((el) => {
    const block = el.getAttribute("data-rose-block") ?? "";
    if (!PART.test(block) || seen.has(`b:${block}`)) return;
    seen.add(`b:${block}`);
    owners.push({ key: `b:${block}`, el, block });
    items.push({ kind: "block", block, rect: rectOf(el) });
  });

  // Fields and marked pieces get their keys first, so what sits inside them can name them.
  const keyOf = new Map<Element, string>();
  const partCount = new Map<string, number>();
  const parts: Array<{ el: HTMLElement; owner: Owner; name: string; n: number }> = [];
  document.querySelectorAll<HTMLElement>("[data-part]").forEach((el) => {
    const name = el.getAttribute("data-part") ?? "";
    const owner = ownerOf(el);
    if (!owner || !PART.test(name) || inTreeNode(el, owner)) return;
    const k = `${owner.key}|${name}`;
    const n = partCount.get(k) ?? 0;
    partCount.set(k, n + 1);
    keyOf.set(el, `p:${name}:${n}`);
    parts.push({ el, owner, name, n });
  });
  type Field = { el: HTMLElement; box: HTMLElement; owner: Owner; sectionId: string; path: string; media: string | null };
  const fields: Field[] = [];
  document.querySelectorAll<HTMLElement>("[data-edit], [data-edit-media]").forEach((el) => {
    const owner = ownerOf(el);
    if (!owner || inTreeNode(el, owner)) return;
    const media = el.getAttribute("data-edit-media");
    const path = media ?? el.getAttribute("data-edit") ?? "";
    if (!PATH.test(path)) return;
    // A scene's words live in a section's data (the opening's): [data-edit-section] says which.
    const source = el.closest("[data-edit-section]");
    const sectionId = source && owner.el.contains(source) ? source.getAttribute("data-edit-section") ?? "" : owner.section ?? "";
    if (!sectionId) return;
    // A button's label is the whole button on the page.
    const box = el.hasAttribute("data-edit-boxed") ? el.closest<HTMLElement>(`[data-edit-box="${CSS.escape(path)}"]`) ?? el : el;
    keyOf.set(box, `f:${path}`);
    if (box !== el) keyOf.set(el, `f:${path}`);
    fields.push({ el, box, owner, sectionId, path, media });
  });
  const withinOf = (el: Element, owner: Owner): string | undefined => {
    for (let at = el.parentElement; at && at !== owner.el && owner.el.contains(at); at = at.parentElement) {
      const k = keyOf.get(at);
      if (k) return k;
    }
    return undefined;
  };
  for (const f of fields) {
    if (seen.has(`f:${f.owner.key}:${f.path}`) || !shown(f.box, f.owner.el)) continue;
    const rect = rectOf(f.box);
    if (!(rect.w > 0 && rect.h > 0)) continue;
    seen.add(`f:${f.owner.key}:${f.path}`);
    const base = { kind: "slot" as const, owner: f.owner.key, sectionId: f.sectionId, ...(f.owner.block ? { block: f.owner.block } : {}), path: f.path, rect };
    const within = withinOf(f.box, f.owner);
    const link = f.box.getAttribute("data-edit-link");
    items.push({
      ...base,
      ...(f.media
        ? { edit: "media" as const, media: f.el.getAttribute("data-edit-media-kind") === "video" ? ("video" as const) : ("image" as const) }
        : { edit: f.el.hasAttribute("data-edit-list") ? ("list" as const) : f.el.hasAttribute("data-edit-lines") ? ("lines" as const) : ("text" as const) }),
      ...(link && PATH.test(link) ? { link } : {}),
      ...(within ? { within } : {}),
    });
  }
  for (const p of parts) {
    if (!shown(p.el, p.owner.el)) continue;
    const rect = rectOf(p.el);
    if (!(rect.w > 0 && rect.h > 0)) continue;
    const within = withinOf(p.el, p.owner);
    items.push({ kind: "part", owner: p.owner.key, name: p.name, n: p.n, count: partCount.get(`${p.owner.key}|${p.name}`) ?? 1, ...(within ? { within } : {}), rect });
  }
  // Everything else that shows: the outermost picture, words or link not already marked.
  let autos = 0;
  for (const owner of owners) {
    let n = 0;
    for (const el of owner.el.querySelectorAll<HTMLElement>(ATOMS)) {
      if (autos >= MAX_AUTOS) break;
      if (inTreeNode(el, owner) || ownerOf(el)?.el !== owner.el) continue;
      if (el.closest(MARKED) && owner.el.contains(el.closest(MARKED))) continue;
      const outer = el.parentElement?.closest(ATOM_HOLDERS);
      if (outer && owner.el.contains(outer)) continue;
      if (el.querySelector(MARKED)) continue;
      const i = n++;
      if (!shown(el, owner.el)) continue;
      const rect = rectOf(el);
      if (!(rect.w >= 8 && rect.h >= 8)) continue;
      const tag = el.tagName.toLowerCase();
      const said = tag === "img" ? (el as HTMLImageElement).alt : /^(svg|canvas|video|picture)$/.test(tag) ? "" : el.innerText;
      const label = said.replace(/\s+/g, " ").trim().slice(0, 40);
      const within = withinOf(el, owner);
      autos++;
      items.push({ kind: "auto", owner: owner.key, n: i, tag, ...(label ? { label } : {}), ...(within ? { within } : {}), rect });
    }
  }
  return items;
}

/** The element of a section's field, for writing in place (a scene's words name their section with [data-edit-section]). */
function fieldElement(sectionId: string, path: string): HTMLElement | null {
  const sid = CSS.escape(sectionId);
  for (const host of document.querySelectorAll<HTMLElement>(`[data-cms-section="${sid}"], [data-edit-section="${sid}"]`)) {
    const el = host.querySelector<HTMLElement>(`[data-edit="${CSS.escape(path)}"]`);
    if (el) return el;
  }
  return null;
}

/** An owner's element, or something inside it, for bringing into view. */
function ownedElement(owner: string, path?: string, part?: string, n?: number): Element | null {
  const m = /^(s|b):(.{1,120})$/.exec(owner);
  if (!m) return null;
  const host = document.querySelector(m[1] === "b" ? `[data-rose-block="${CSS.escape(m[2])}"]` : `[data-cms-section="${CSS.escape(m[2])}"]`);
  if (!host) return null;
  if (path && PATH.test(path)) return host.querySelector(`[data-edit-box="${CSS.escape(path)}"], [data-edit="${CSS.escape(path)}"], [data-edit-media="${CSS.escape(path)}"]`);
  if (part && PART.test(part)) return host.querySelectorAll(`[data-part="${CSS.escape(part)}"]`)[Number(n) || 0] ?? null;
  return host;
}

export function StudioBridge({ origins, pageId, lang, onRefresh }: { origins: string[]; pageId: string; lang: string; onRefresh?: (requestId: string, origin: string) => void }) {
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;
  useEffect(() => {
    if (window.parent === window || !origins.length) return;
    const send = (msg: Record<string, unknown>) => {
      for (const o of origins) {
        try {
          window.parent.postMessage({ source: STUDIO_SOURCE, ...msg }, o);
        } catch {
          /* another admin address */
        }
      }
    };
    let frame = 0;
    let timer = 0;
    const measure = () => {
      frame = 0;
      const msg: Omit<StudioLayout, "source"> = {
        type: "layout",
        pageId,
        viewVersion: document.querySelector<HTMLElement>("[data-studio-view-version]")?.dataset.studioViewVersion,
        lang,
        dir: document.documentElement.dir || "rtl",
        viewport: { w: window.innerWidth, h: window.innerHeight },
        scroll: { x: window.scrollX, y: window.scrollY },
        doc: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
        items: measureStudio(),
      };
      send(msg);
    };
    // Scrolling moves everything: measure on the next frame. Other changes settle first.
    const now = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const previewProperties = new Map<HTMLElement, Map<string, { value: string; priority: string }>>();
    const previewProperty = (el: HTMLElement, name: string, value: string) => {
      let properties = previewProperties.get(el);
      if (!properties) { properties = new Map(); previewProperties.set(el, properties); }
      if (!properties.has(name)) properties.set(name, { value: el.style.getPropertyValue(name), priority: el.style.getPropertyPriority(name) });
      el.style.setProperty(name, value);
    };
    const restoreLookPreviews = () => {
      for (const [el, properties] of previewProperties) for (const [name, before] of properties) {
        if (before.value) el.style.setProperty(name, before.value, before.priority);
        else el.style.removeProperty(name);
      }
      previewProperties.clear();
    };
    const restoreStylePreview = () => {
      document.querySelectorAll<HTMLElement>("[data-pt-preview]").forEach(el => {
        el.classList.remove("pt-pv"); el.classList.add(`pt-${el.dataset.ptPreview}`); el.removeAttribute("data-pt-preview");
      });
      document.getElementById("pt-look-preview")?.remove();
    };
    const viewCommitted = () => { restoreLookPreviews(); restoreStylePreview(); studioLink.emit({type:"motionLayout"}); now(); };
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(now, 120);
    };
    // Things that move by themselves (coming in as the page scrolls, a scene's layers) change
    // their style on every frame: measured a few times a second while they move, and once after.
    let moving = 0;
    const settling = () => {
      soon();
      if (!moving) moving = window.setTimeout(() => ((moving = 0), now()), 250);
    };
    // Writing a text in place: the editor sends the current words; Enter (Ctrl+Enter for a
    // text of several lines) or leaving the field keeps them, Esc puts the old ones back.
    let editing: { el: HTMLElement; before: string; style: string | null; sectionId: string; path: string; done: boolean } | null = null;
    const finish = (keep: boolean) => {
      const e = editing;
      if (!e || e.done) return;
      e.done = true;
      editing = null;
      const value = e.el.innerText.replace(/\u00a0/g, " ").replace(/\s+$/, "");
      e.el.removeAttribute("contenteditable");
      if (!keep) {
        e.el.innerHTML = e.before;
        if (e.style === null) e.el.removeAttribute("style");
        else e.el.setAttribute("style", e.style);
      }
      send(keep ? { type: "textEdited", sectionId: e.sectionId, path: e.path, value } : { type: "textCancelled", sectionId: e.sectionId, path: e.path });
      soon();
    };
    // `value` is the field as saved; null = a field still showing the shop's own words (start from what's shown).
    const startEdit = (sectionId: string, path: string, value: string | null) => {
      finish(true);
      const el = fieldElement(sectionId, path);
      if (!el) return send({ type: "textCancelled", sectionId, path });
      editing = { el, before: el.innerHTML, style: el.getAttribute("style"), sectionId, path, done: false };
      const lines = el.hasAttribute("data-edit-lines");
      // A title of several lines draws each line in its own span: one line each.
      const shown = lines && el.children.length > 1 ? Array.from(el.children, (c) => (c as HTMLElement).innerText.trim()).filter(Boolean).join("\n") : el.innerText;
      el.textContent = value ?? shown;
      if (lines) el.style.whiteSpace = "pre-line";
      el.style.outline = "2px solid #a43b64";
      el.style.outlineOffset = "4px";
      el.setAttribute("contenteditable", "plaintext-only");
      if (el.contentEditable !== "plaintext-only") el.setAttribute("contenteditable", "true");
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      el.addEventListener("blur", () => finish(true), { once: true });
      el.addEventListener("keydown", (k: KeyboardEvent) => {
        if (k.key === "Escape") {
          k.preventDefault();
          finish(false);
        } else if (k.key === "Enter" && (!lines || k.ctrlKey || k.metaKey)) {
          k.preventDefault();
          finish(true);
        }
      });
    };

    // Writing a tree element's words in place (a heading, text or button), with a small bar for
    // bold, italic, underline, highlight, the theme's colour, a link, and plain again. What's
    // written goes back as formatted words (pageTree/rich.ts); Esc puts the old ones back.
    let nodeEdit: { el: HTMLElement; before: string; nodeId: string; done: boolean; bar: HTMLElement; asking: boolean } | null = null;
    const finishNode = (keep: boolean) => {
      const e = nodeEdit;
      if (!e || e.done) return;
      e.done = true;
      nodeEdit = null;
      e.bar.remove();
      const value = htmlToRich(e.el);
      e.el.removeAttribute("contenteditable");
      e.el.style.outline = "";
      e.el.style.outlineOffset = "";
      if (!keep) e.el.innerHTML = e.before;
      send(keep ? { type: "nodeEdited", nodeId: e.nodeId, value } : { type: "nodeCancelled", nodeId: e.nodeId });
      soon();
    };
    const BAR_WORDS: Record<string, Record<string, string>> = {
      ar: { bold: "عريض", italic: "مائل", underline: "خط تحته", mark: "تظليل", color: "لون المتجر", link: "رابط", plain: "بدون تنسيق", ask: "الرابط (صفحة بالمتجر مثل /shop، أو https://…)" },
      en: { bold: "Bold", italic: "Italic", underline: "Underline", mark: "Highlight", color: "Store colour", link: "Link", plain: "Plain", ask: "The link (a shop page like /shop, or https://…)" },
      he: { bold: "מודגש", italic: "נטוי", underline: "קו תחתון", mark: "הדגשה", color: "צבע החנות", link: "קישור", plain: "ללא עיצוב", ask: "הקישור (דף בחנות כמו /shop, או https://…)" },
    };
    const startNodeEdit = (nodeId: string, lines: boolean, linkable: boolean) => {
      finish(true);
      finishNode(true);
      const el = document.querySelector<HTMLElement>(`[data-tree-node="${CSS.escape(nodeId)}"]`);
      if (!el) return send({ type: "nodeCancelled", nodeId });
      const w = BAR_WORDS[document.documentElement.lang] ?? BAR_WORDS.ar;
      const bar = document.createElement("div");
      bar.setAttribute("data-studio-bar", "");
      bar.setAttribute("role", "toolbar");
      bar.style.cssText = "position:fixed;z-index:2147483000;display:flex;gap:2px;padding:4px;border-radius:10px;background:#1f1a22;box-shadow:0 8px 24px rgba(0,0,0,.3);direction:ltr";
      const e = { el, before: el.innerHTML, nodeId, done: false, bar, asking: false };
      nodeEdit = e;
      const tool = (key: string, face: string, run: () => void, css = "") => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = face;
        b.title = w[key];
        b.setAttribute("aria-label", w[key]);
        b.setAttribute("data-tool", key);
        b.style.cssText = `min-width:28px;height:28px;border:0;border-radius:7px;background:#2c2530;color:#fff;font:600 13px system-ui;cursor:pointer;${css}`;
        // Pressing doesn't take the focus (or the selection) away from the words.
        b.addEventListener("mousedown", (m) => m.preventDefault());
        b.addEventListener("click", () => {
          run();
          el.focus();
        });
        bar.appendChild(b);
      };
      document.execCommand("styleWithCSS", false, "false");
      tool("bold", "B", () => document.execCommand("bold"));
      tool("italic", "I", () => document.execCommand("italic"), "font-style:italic");
      tool("underline", "U", () => document.execCommand("underline"), "text-decoration:underline");
      tool("mark", "▮", () => document.execCommand("hiliteColor", false, "#fff0a8"), "color:#ffe066");
      tool("color", "A", () => document.execCommand("foreColor", false, "#a10001"), "color:var(--accent,#c86b98)");
      if (linkable) {
        tool("link", "🔗", () => {
          const sel = window.getSelection();
          const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
          e.asking = true;
          const url = window.prompt(w.ask, "/");
          e.asking = false;
          if (range) {
            sel!.removeAllRanges();
            sel!.addRange(range);
          }
          if (url && /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(url.trim())) document.execCommand("createLink", false, url.trim());
        });
      }
      tool("plain", "⌫", () => {
        document.execCommand("removeFormat");
        document.execCommand("unlink");
      });
      document.body.appendChild(bar);
      const place = () => {
        const r = el.getBoundingClientRect();
        bar.style.left = `${Math.max(4, Math.min(window.innerWidth - bar.offsetWidth - 4, r.left))}px`;
        bar.style.top = `${r.top > 48 ? r.top - 42 : r.bottom + 8}px`;
      };
      place();
      el.style.outline = "2px solid #a43b64";
      el.style.outlineOffset = "4px";
      el.setAttribute("contenteditable", "true");
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      window.addEventListener("scroll", place, { passive: true });
      el.addEventListener("blur", () => window.setTimeout(() => !e.asking && !el.contains(document.activeElement) && finishNode(true), 0));
      el.addEventListener("keydown", (k: KeyboardEvent) => {
        if (k.key === "Escape") {
          k.preventDefault();
          finishNode(false);
        } else if (k.key === "Enter" && (!lines || k.ctrlKey || k.metaKey)) {
          k.preventDefault();
          finishNode(true);
        } else if (k.key === "Enter") {
          k.preventDefault();
          document.execCommand("insertLineBreak");
        }
      });
    };

    // A place the editor asked to see (after the frame reloads with a change, or a new element):
    // the page still grows while pictures and scenes load, so it's taken again a few times.
    let held: (() => void) | null = null;
    let holds: number[] = [];
    const hold = (go: () => void) => {
      holds.forEach((t) => window.clearTimeout(t));
      held = go;
      go();
      holds = [150, 400, 900, 1600, 2600].map((ms) => window.setTimeout(() => held?.(), ms));
      holds.push(window.setTimeout(() => (held = null), 2700));
    };
    const letGo = () => {
      held = null;
      holds.forEach((t) => window.clearTimeout(t));
    };
    const onMessage = (e: MessageEvent) => {
      if (!origins.includes(e.origin)) return;
      const d = e.data as { source?: string; type?: string; requestId?: string; dx?: number; dy?: number; y?: number; nodeId?: string; sectionId?: string; path?: string; value?: string; block?: string; owner?: string; part?: string; n?: number } | null;
      if (!d || d.source !== STUDIO_SOURCE) return;
      if (d.type === "refreshView") {
        if (e.source !== window.parent || typeof d.requestId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(d.requestId)) return;
        refresh.current?.(d.requestId, e.origin);
        return;
      }
      if (d.type === "testInteraction" && e.source === window.parent) {
        const data = e.data as { event?: string; nodeId?: string };
        if (INTERACTION_EVENTS.includes(data.event as any)) {
          const source = data.nodeId && /^[A-Za-z0-9_-]{1,40}$/.test(data.nodeId) ? document.querySelector(`[data-tree-node="${data.nodeId}"]`) : document.querySelector("[data-cms-interaction-page]");
          if (source) emitVisualInteraction(data.event as typeof INTERACTION_EVENTS[number], { source, color: "#3366bb" });
        }
        return;
      }
      if (typeof d.type === "string" && (d.type.startsWith("stage") || d.type.startsWith("motion"))) return studioLink.emit(d as Record<string, unknown>);
      // A drag/resize draws only safe geometry over the element's existing rules.
      if (d.type === "previewGeometry") {
        letGo();
        document.getElementById("pt-geometry-preview")?.remove();
        const nodes = geometryPreviewNodes((e.data as { nodes?: unknown }).nodes).filter((node) => document.querySelector(`[data-tree-node="${node.id}"]`));
        const css = geometryPreviewCss(nodes);
        if (css) {
          const style = document.createElement("style");
          style.id = "pt-geometry-preview";
          style.textContent = css;
          document.body.appendChild(style);
        }
        return now();
      }
      // A look tried before it's saved (a slider being dragged): only its own variables, numbers only.
      // A look tried on a part of an old section or scene: every element it names.
      const target = (e.data as { target?: unknown }).target;
      if (d.type === "previewLook" && (d.nodeId || typeof target === "string")) {
        letGo();
        const sel = typeof target === "string" ? lookSelector(target) : null;
        const els = d.nodeId ? [document.querySelector<HTMLElement>(`[data-tree-node="${CSS.escape(d.nodeId)}"]`)] : sel ? Array.from(document.querySelectorAll<HTMLElement>(sel)) : [];
        const vars = (e.data as { vars?: Record<string, unknown> }).vars ?? {};
        for (const el of els) {
          if (!el) continue;
          previewProperty(el, "transform", TREE_TRANSFORM);
          for (const [k, v] of Object.entries(vars)) {
            if (k === "opacity" && typeof v === "number" && v >= 0 && v <= 1) previewProperty(el, k, String(v));
            else if ((PREVIEW_VARS as readonly string[]).includes(k) && typeof v === "string" && /^-?\d{1,4}(\.\d{1,3})?(px|deg)?$/.test(v)) previewProperty(el, k, v);
          }
        }
        return now();
      }
      // A ready look shown on an element before it's picked: its own rules leave it while the look's are drawn (null: as it was).
      if (d.type === "previewStyle") {
        restoreStylePreview();
        const node = (e.data as { node?: unknown }).node as TreeNode | null | undefined;
        const id = node && typeof node === "object" && typeof node.id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(node.id) ? node.id : null;
        const el = id ? document.querySelector<HTMLElement>(`[data-tree-node="${CSS.escape(id)}"]`) : null;
        if (node && el && typeof node.type === "string") {
          const style = document.createElement("style");
          style.id = "pt-look-preview";
          style.textContent = nodeCss({ ...node, props: node.props && typeof node.props === "object" ? node.props : {} }, "pv");
          document.body.appendChild(style);
          el.classList.remove(`pt-${id}`);
          el.classList.add("pt-pv");
          el.dataset.ptPreview = id!;
        }
        return now();
      }
      // A state shown on the element being edited (the editor's mouse never reaches the page): its look for the mouse, focus or a press.
      if (d.type === "previewState") {
        document.querySelectorAll("[data-pt-state]").forEach((el) => el.removeAttribute("data-pt-state"));
        const state = (e.data as { state?: unknown }).state;
        if (state !== "hover" && state !== "focused" && state !== "pressed") return now();
        // A shared style's: every element that takes it.
        const shared = (e.data as { style?: { id?: unknown; kind?: unknown } }).style;
        const styleSel = shared && typeof shared.id === "string" && /^[a-z][a-z0-9-]{0,30}$/.test(shared.id) && (SITE_STYLE_KINDS as readonly unknown[]).includes(shared.kind) ? siteTarget({ id: shared.id, kind: shared.kind as SiteStyle["kind"], style: {} }).sel : null;
        const sel = styleSel ?? (typeof target === "string" ? lookSelector(target) : null);
        const els = d.nodeId ? [document.querySelector<HTMLElement>(`[data-tree-node="${CSS.escape(d.nodeId)}"]`)] : sel ? Array.from(document.querySelectorAll<HTMLElement>(sel)) : [];
        for (const el of els) el?.setAttribute("data-pt-state", state);
        return now();
      }
      if (d.type === "editText" && d.sectionId && d.path) return startEdit(d.sectionId, d.path, typeof d.value === "string" ? d.value : null);
      if (d.type === "editNode" && d.nodeId) return startNodeEdit(d.nodeId, (e.data as { lines?: unknown }).lines === true, (e.data as { linkable?: unknown }).linkable === true);
      if (d.type === "stopEdit") {
        finishNode(true);
        return finish(true);
      }
      if (d.type === "scrollBy") {
        letGo();
        window.scrollBy({ left: Number(d.dx) || 0, top: Number(d.dy) || 0, behavior: "instant" as ScrollBehavior });
      } else if (d.type === "scrollTo") {
        const y = Number(d.y) || 0;
        hold(() => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }));
      } else if (d.type === "reveal") {
        if (d.nodeId) window.dispatchEvent(new CustomEvent("pt:reveal", { detail: { nodeId: d.nodeId } }));
        const el = d.nodeId
          ? document.querySelector(`[data-tree-node="${CSS.escape(d.nodeId)}"]`)
          : typeof d.owner === "string"
            ? ownedElement(d.owner, d.path, d.part, d.n)
          : d.block
            ? document.querySelector(`[data-rose-block="${CSS.escape(d.block)}"]`)
            : d.sectionId && d.path
              ? fieldElement(d.sectionId, d.path)
              : d.sectionId
                ? document.querySelector(`[data-cms-section="${CSS.escape(d.sectionId)}"]`)
                : null;
        if (el) hold(() => el.isConnected && el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }));
      } else if (d.type === "measure") now();
    };
    // The editor only looks: links and forms stay on the page.
    const stopLinks = (e: Event) => {
      const t = e.target as Element | null;
      if (t?.closest?.("a[href], button[type=submit], summary")) e.preventDefault();
    };
    const stopForms = (e: Event) => e.preventDefault();
    // Undo and redo belong to the editor, also while the keyboard is in here.
    const keys = (e: KeyboardEvent) => {
      if (editing || nodeEdit || !(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      e.preventDefault();
      send({ type: "key", action: k === "y" || e.shiftKey ? "redo" : "undo" });
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("studio-view-commit", viewCommitted);
    window.addEventListener("scroll", now, { passive: true });
    window.addEventListener("resize", now);
    window.addEventListener("load", now);
    document.addEventListener("load", soon, true); // images and videos
    document.addEventListener("click", stopLinks, true);
    document.addEventListener("submit", stopForms, true);
    window.addEventListener("keydown", keys);
    const ro = new ResizeObserver(soon);
    ro.observe(document.body);
    const mo = new MutationObserver((list) => (list.some((m) => m.attributeName === "style") ? settling() : soon()));
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden", "style", "inert", "data-state"] });
    void document.fonts?.ready.then(now);
    document.fonts?.addEventListener?.("loadingdone", soon);
    // Fonts and pictures can move things without a change the observers see: look again a few times.
    const settle = [300, 1000, 2500, 5000].map((ms) => window.setTimeout(now, ms));
    studioLink.open(send);
    send({ type: "ready", pageId, lang, liveView: Boolean(refresh.current) });
    now();
    return () => {
      studioLink.open(null);
      document.getElementById("pt-geometry-preview")?.remove();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("studio-view-commit", viewCommitted);
      restoreLookPreviews(); restoreStylePreview();
      window.removeEventListener("keydown", keys);
      window.removeEventListener("scroll", now);
      window.removeEventListener("resize", now);
      window.removeEventListener("load", now);
      document.removeEventListener("load", soon, true);
      document.removeEventListener("click", stopLinks, true);
      document.removeEventListener("submit", stopForms, true);
      ro.disconnect();
      mo.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", soon);
      settle.forEach((t) => window.clearTimeout(t));
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.clearTimeout(moving);
      letGo();
    };
  }, [origins, pageId, lang]);
  return null;
}
