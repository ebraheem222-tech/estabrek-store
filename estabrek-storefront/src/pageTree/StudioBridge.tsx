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
import { useEffect } from "react";
import { studioLink } from "./studioLink";
import { PREVIEW_VARS, TREE_TRANSFORM } from "./tree";

export const STUDIO_SOURCE = "estabrek-studio";

export type StudioRect = { x: number; y: number; w: number; h: number };
export type StudioItem =
  /** `holder`: for an element placed freely over its container, that container's box. */
  | { kind: "node"; id: string; rect: StudioRect; holder?: StudioRect }
  | { kind: "legacy"; sectionId: string; rect: StudioRect }
  /** A text, picture or video inside an old section that the editor can change ([data-edit], [data-edit-media]). */
  | { kind: "slot"; sectionId: string; path: string; edit: "text" | "lines" | "media"; media?: "image" | "video"; rect: StudioRect }
  /** The rose home's scenes: seasons, collection stories, Instagram ([data-rose-block]). */
  | { kind: "block"; block: string; rect: StudioRect };
export type StudioLayout = {
  source: typeof STUDIO_SOURCE;
  type: "layout";
  pageId: string;
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

/** Where every tree element and old section is, in page coordinates. */
export function measureStudio(): StudioItem[] {
  const items: StudioItem[] = [];
  const seen = new Set<string>();
  document.querySelectorAll<HTMLElement>("[data-tree-node]").forEach((el) => {
    const id = el.dataset.treeNode ?? "";
    if (!id || seen.has(`n:${id}`)) return;
    seen.add(`n:${id}`);
    const holder = el.offsetParent && getComputedStyle(el).position === "absolute" ? rectOf(el.offsetParent) : undefined;
    items.push(holder ? { kind: "node", id, rect: rectOf(el), holder } : { kind: "node", id, rect: rectOf(el) });
  });
  document.querySelectorAll<HTMLElement>("[data-cms-section]").forEach((el) => {
    const sid = el.getAttribute("data-cms-section") ?? "";
    // A tree element's own wrapper, or the inner copy of a section already measured.
    if (!sid || sid.startsWith("tree-") || seen.has(`s:${sid}`)) return;
    seen.add(`s:${sid}`);
    items.push({ kind: "legacy", sectionId: sid, rect: rectOf(el) });
  });
  const sectionOf = (el: Element) => {
    let at: Element | null = el.closest("[data-cms-section]");
    while (at && (at.getAttribute("data-cms-section") ?? "").startsWith("tree-")) at = at.parentElement?.closest("[data-cms-section]") ?? null;
    return at?.getAttribute("data-cms-section") ?? "";
  };
  document.querySelectorAll<HTMLElement>("[data-edit], [data-edit-media]").forEach((el) => {
    const sid = sectionOf(el);
    if (!sid) return;
    const media = el.getAttribute("data-edit-media");
    const path = media ?? el.getAttribute("data-edit") ?? "";
    if (!/^[A-Za-z0-9_.]{1,120}$/.test(path) || seen.has(`f:${sid}:${path}`)) return;
    const rect = rectOf(el);
    if (!(rect.w > 0 && rect.h > 0)) return;
    seen.add(`f:${sid}:${path}`);
    items.push(
      media
        ? { kind: "slot", sectionId: sid, path, edit: "media", media: el.getAttribute("data-edit-media-kind") === "video" ? "video" : "image", rect }
        : { kind: "slot", sectionId: sid, path, edit: el.hasAttribute("data-edit-lines") ? "lines" : "text", rect },
    );
  });
  document.querySelectorAll<HTMLElement>("[data-rose-block]").forEach((el) => {
    const block = el.getAttribute("data-rose-block") ?? "";
    if (!block || seen.has(`b:${block}`)) return;
    seen.add(`b:${block}`);
    items.push({ kind: "block", block, rect: rectOf(el) });
  });
  return items;
}

/** The element of a section's field, for writing in place. */
function fieldElement(sectionId: string, path: string): HTMLElement | null {
  for (const host of document.querySelectorAll<HTMLElement>(`[data-cms-section="${CSS.escape(sectionId)}"]`)) {
    const el = host.querySelector<HTMLElement>(`[data-edit="${CSS.escape(path)}"]`);
    if (el) return el;
  }
  return null;
}

export function StudioBridge({ origins, pageId, lang }: { origins: string[]; pageId: string; lang: string }) {
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
    const soon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(now, 120);
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

    const onMessage = (e: MessageEvent) => {
      if (!origins.includes(e.origin)) return;
      const d = e.data as { source?: string; type?: string; dx?: number; dy?: number; y?: number; nodeId?: string; sectionId?: string; path?: string; value?: string; block?: string } | null;
      if (!d || d.source !== STUDIO_SOURCE) return;
      if (typeof d.type === "string" && (d.type.startsWith("stage") || d.type.startsWith("motion"))) return studioLink.emit(d as Record<string, unknown>);
      // A look tried before it's saved (a slider being dragged): only its own variables, numbers only.
      if (d.type === "previewLook" && d.nodeId) {
        const el = document.querySelector<HTMLElement>(`[data-tree-node="${CSS.escape(d.nodeId)}"]`);
        const vars = (e.data as { vars?: Record<string, unknown> }).vars ?? {};
        if (!el) return;
        el.style.transform = TREE_TRANSFORM;
        for (const [k, v] of Object.entries(vars)) {
          if (k === "opacity" && typeof v === "number" && v >= 0 && v <= 1) el.style.opacity = String(v);
          else if ((PREVIEW_VARS as readonly string[]).includes(k) && typeof v === "string" && /^-?\d{1,4}(\.\d{1,3})?(px|deg)?$/.test(v)) el.style.setProperty(k, v);
        }
        return now();
      }
      if (d.type === "editText" && d.sectionId && d.path) return startEdit(d.sectionId, d.path, typeof d.value === "string" ? d.value : null);
      if (d.type === "stopEdit") return finish(true);
      if (d.type === "scrollBy") window.scrollBy({ left: Number(d.dx) || 0, top: Number(d.dy) || 0, behavior: "instant" as ScrollBehavior });
      else if (d.type === "scrollTo") window.scrollTo({ top: Number(d.y) || 0, behavior: "instant" as ScrollBehavior });
      else if (d.type === "reveal") {
        const el = d.nodeId
          ? document.querySelector(`[data-tree-node="${CSS.escape(d.nodeId)}"]`)
          : d.block
            ? document.querySelector(`[data-rose-block="${CSS.escape(d.block)}"]`)
            : d.sectionId && d.path
              ? fieldElement(d.sectionId, d.path)
              : d.sectionId
                ? document.querySelector(`[data-cms-section="${CSS.escape(d.sectionId)}"]`)
                : null;
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
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
      if (editing || !(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      e.preventDefault();
      send({ type: "key", action: k === "y" || e.shiftKey ? "redo" : "undo" });
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("scroll", now, { passive: true });
    window.addEventListener("resize", now);
    window.addEventListener("load", now);
    document.addEventListener("load", soon, true); // images and videos
    document.addEventListener("click", stopLinks, true);
    document.addEventListener("submit", stopForms, true);
    window.addEventListener("keydown", keys);
    const ro = new ResizeObserver(soon);
    ro.observe(document.body);
    const mo = new MutationObserver(soon);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden"] });
    void document.fonts?.ready.then(now);
    document.fonts?.addEventListener?.("loadingdone", soon);
    // Fonts and pictures can move things without a change the observers see: look again a few times.
    const settle = [300, 1000, 2500, 5000].map((ms) => window.setTimeout(now, ms));
    studioLink.open(send);
    send({ type: "ready", pageId, lang });
    now();
    return () => {
      studioLink.open(null);
      window.removeEventListener("message", onMessage);
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
    };
  }, [origins, pageId, lang]);
  return null;
}
