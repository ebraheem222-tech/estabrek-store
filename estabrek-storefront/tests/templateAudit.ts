/**
 * What tests/template-audit.spec.ts checks on a store drawn from a template (its header, home page and footer as the
 * store's own design): the layout each tree asks for, words that read on what's behind them, pictures that load,
 * nothing wider than the screen, and a header that's there and whose parts don't sit on each other.
 */
import type { TreeNode } from "../src/pageTree/tree";

export type Layout = { id: string; type: "stack" | "columns" | "grid"; dir: { wide: string; phone: string }; across: { wide: boolean; phone: boolean } };
export type Fault = { kind: "row" | "across" | "contrast" | "image" | "overflow" | "header-empty" | "header-tall" | "header-overlap" | "error"; where: string; detail: string };

type Style = { direction?: string; columns?: number; widths?: unknown; wrap?: boolean };
const screens = (n: TreeNode) => {
  const s = (n.style ?? {}) as { base?: Style; tablet?: Style; mobile?: Style };
  return { base: s.base ?? {}, tablet: s.tablet ?? {}, mobile: s.mobile ?? {} };
};

/** Every stack, columns and grid of a tree with what it should draw as on a wide screen and on a phone. */
export function layoutsOf(root: TreeNode, out: Layout[] = []): Layout[] {
  const { base, tablet, mobile } = screens(root);
  const kids = root.children?.length ?? 0;
  if (root.type === "stack") {
    const wide = base.direction ?? "column";
    out.push({ id: root.id, type: "stack", dir: { wide, phone: mobile.direction ?? tablet.direction ?? wide }, across: { wide: wide === "row" && kids > 1, phone: false } });
  } else if (root.type === "columns" && kids > 1) {
    // pageTree/css.ts screenFallbacks: one column on a phone unless the columns say to keep them.
    const keep = (root.props as { phone?: string } | undefined)?.phone === "keep" || Boolean(mobile.widths);
    out.push({ id: root.id, type: "columns", dir: { wide: "", phone: "" }, across: { wide: true, phone: keep } });
  } else if (root.type === "grid" && kids > 1 && typeof base.columns === "number" && base.columns > 1) {
    out.push({ id: root.id, type: "grid", dir: { wide: "", phone: "" }, across: { wide: true, phone: typeof mobile.columns === "number" && mobile.columns > 1 } });
  }
  for (const child of root.children ?? []) layoutsOf(child, out);
  return out;
}

/** The checks, run in the page (no closures: Playwright sends the function's source). */
export async function auditPage(input: { layouts: Layout[]; wide: boolean }): Promise<Fault[]> {
  const faults: Fault[] = [];
  const vw = document.documentElement.clientWidth;
  const where = (el: Element | null): string => {
    const node = el?.closest("[data-tree-node]");
    const region = el?.closest("[data-store-design-region]")?.getAttribute("data-store-design-region") ?? "page";
    return `${region}:${node?.getAttribute("data-tree-node") ?? el?.tagName.toLowerCase() ?? "?"}`;
  };
  const shown = (el: Element) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none";
  };
  const words = (el: Element) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim();

  // 1. Layout: rows stay rows, and what should stand side by side does.
  for (const l of input.layouts) {
    const el = document.querySelector(`[data-tree-node="${l.id}"]`);
    if (!el || !shown(el)) continue;
    const cs = getComputedStyle(el);
    if (l.type === "stack") {
      const want = input.wide ? l.dir.wide : l.dir.phone;
      if (cs.display.includes("flex") && !cs.flexDirection.startsWith(want)) faults.push({ kind: "row", where: where(el), detail: `drawn as ${cs.flexDirection}, should be ${want}` });
    }
    const across = input.wide ? l.across.wide : l.across.phone;
    if (!across) continue;
    const kids = Array.from(el.children).filter((k) => shown(k) && !["absolute", "fixed"].includes(getComputedStyle(k).position));
    if (kids.length < 2) continue;
    const boxes = kids.map((k) => k.getBoundingClientRect());
    const side = boxes.some((a, i) => boxes.some((b, j) => j > i && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > Math.min(a.height, b.height) * 0.3));
    if (!side) faults.push({ kind: "across", where: where(el), detail: `${l.type} of ${kids.length} drawn one under the other` });
  }

  // 2. Nothing wider than the screen (unless a box inside the screen cuts or scrolls it).
  const wideOnes: Element[] = [];
  for (const el of Array.from(document.querySelectorAll("body *"))) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || (r.right <= vw + 2 && r.left >= -2)) continue;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" || cs.visibility === "hidden" || cs.display === "none") continue;
    let held = false;
    for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const ac = getComputedStyle(a);
      if (["hidden", "clip", "auto", "scroll"].includes(ac.overflowX)) {
        const ar = a.getBoundingClientRect();
        if (ar.left >= -2 && ar.right <= vw + 2) { held = true; break; }
      }
      if (ac.position === "fixed") { held = true; break; }
    }
    if (held || wideOnes.some((w) => w.contains(el))) continue;
    // The site's own parts (its bag drawer, menus off the screen) are not the template's.
    if (!el.closest("[data-store-design-region],[data-page-tree-root],[data-cms-sections]")) continue;
    wideOnes.push(el);
  }
  for (const el of wideOnes.slice(0, 8)) {
    const r = el.getBoundingClientRect();
    faults.push({ kind: "overflow", where: where(el), detail: `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").split(" ").slice(0, 2).join(".")} from ${Math.round(r.left)} to ${Math.round(r.right)} of ${vw}` });
  }
  if (document.documentElement.scrollWidth > vw + 1) faults.push({ kind: "overflow", where: "page", detail: `the page scrolls sideways: ${document.documentElement.scrollWidth} of ${vw}` });

  // 3. The header: there, and its parts apart.
  const header = document.querySelector('[data-store-design-region="header"]');
  if (!header) faults.push({ kind: "header-empty", where: "header", detail: "no header region" });
  else {
    const r = header.getBoundingClientRect();
    const seen = Array.from(header.querySelectorAll("*")).filter(shown);
    const hasWords = seen.some((el) => words(el).length > 0);
    const hasPicture = seen.some((el) => ["IMG", "SVG", "svg", "VIDEO", "CANVAS"].includes(el.tagName));
    if (r.height < 24 || (!hasWords && !hasPicture)) faults.push({ kind: "header-empty", where: "header", detail: `${Math.round(r.height)} px tall, ${hasWords ? "" : "no words"}${hasPicture ? "" : " no picture"}` });
    // A bar that broke into lines (its parts wrapped under each other) takes the first screen.
    // (A phone's header may hold a search box on a line of its own under the bar.)
    const tall = input.wide ? 190 : header.querySelector(".pt-search") ? 170 : 140;
    // The designed header itself: the store's bar over it (sign-in, the cart; StoreBar.tsx) is the store's, not the template's.
    const bar = header.querySelector('[data-testid="store-bar"]');
    const own = r.height - (bar ? bar.getBoundingClientRect().height : 0);
    if (own > tall) faults.push({ kind: "header-tall", where: "header", detail: `${Math.round(own)} px tall (more than ${tall})` });
    const atoms = Array.from(header.querySelectorAll("[data-tree-node]")).filter((el) => shown(el) && !el.querySelector("[data-tree-node]") && getComputedStyle(el).position !== "absolute");
    for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
      const a = atoms[i].getBoundingClientRect();
      const b = atoms[j].getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 4 && h > 4 && w * h > 0.15 * Math.min(a.width * a.height, b.width * b.height)) faults.push({ kind: "header-overlap", where: where(atoms[i]), detail: `sits on ${where(atoms[j])} (${Math.round(w)}×${Math.round(h)} px)` });
    }
  }

  // 4. Words that read on what is behind them (contrast of 3 or more), read screen by screen while scrolling.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const rgba = (c: string): [number, number, number, number] | null => {
    if (!c || c === "transparent") return [0, 0, 0, 0];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const over = (top: number[], under: number[]) => {
    const a = top[3];
    return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
  };
  const lum = (c: number[]) => {
    const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a: number[], b: number[]) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const gradientColour = (img: string): number[] | null => {
    const found = img.match(/(rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-f]{3,8}\b|oklch\([^)]*\)|oklab\([^)]*\))/gi);
    if (!found?.length) return null;
    const all = found.map(rgba).filter(Boolean) as number[][];
    const n = all.length;
    // Each stop by how much of it shows (a see-through stop is black at nothing, not black).
    const weight = all.reduce((s, c) => s + c[3], 0);
    if (!weight) return [0, 0, 0, 0];
    return [0, 1, 2].map((i) => all.reduce((s, c) => s + c[i] * c[3], 0) / weight).concat(weight / n);
  };
  /** What's painted behind a point under an element: a colour, or null when a picture (or a video) is behind it. */
  const behind = (el: Element, x: number, y: number): number[] | null | "covered" => {
    const stack = document.elementsFromPoint(x, y);
    const at = stack.findIndex((s) => s === el || el.contains(s));
    if (at < 0) return "covered";
    if (stack.slice(0, at).some((s) => !s.contains(el))) return "covered";
    const layers: number[][] = [];
    for (const s of stack.slice(at)) {
      if (s !== el && el.contains(s)) continue;
      if (["IMG", "VIDEO", "CANVAS", "IFRAME", "PICTURE"].includes(s.tagName) || (s.tagName.toLowerCase() === "svg" && s !== el && !s.contains(el))) return null;
      const cs = getComputedStyle(s);
      const pseudo = ["::after", "::before"].map((p) => getComputedStyle(s, p)).filter((p) => p.content !== "none" && ["absolute", "fixed"].includes(p.position));
      for (const p of pseudo) {
        if (p.backgroundImage.includes("url(")) return null;
        const g = p.backgroundImage !== "none" ? gradientColour(p.backgroundImage) : null;
        const o = Number(p.opacity);
        if (g) layers.push([g[0], g[1], g[2], g[3] * o]);
        const c = rgba(p.backgroundColor);
        if (c && c[3] > 0) layers.push([c[0], c[1], c[2], c[3] * o]);
      }
      if (cs.backgroundImage.includes("url(")) return null;
      if (cs.backgroundImage !== "none") {
        const g = gradientColour(cs.backgroundImage);
        if (g) layers.push(g);
      }
      const c = rgba(cs.backgroundColor);
      if (c && c[3] > 0) layers.push(c);
      if (layers.length && layers[layers.length - 1][3] > 0.98) break;
    }
    let out = [255, 255, 255, 1];
    for (const l of layers.reverse()) out = over(l, out);
    return out;
  };
  const texts = Array.from(document.querySelectorAll("[data-store-design-region] *, [data-page-tree-root] *, [data-cms-sections] *")).filter((el) => words(el).length > 1 && !["SCRIPT", "STYLE", "NOSCRIPT", "OPTION"].includes(el.tagName));
  const done = new Set<Element>();
  const pinned = document.createElement("style");
  pinned.textContent = "*,*::before,*::after{pointer-events:auto!important}";
  document.head.appendChild(pinned);
  const height = document.documentElement.scrollHeight;
  const step = Math.max(200, Math.round(innerHeight * 0.7));
  for (let y = 0; y <= height; y += step) {
    scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 60));
    for (const el of texts) {
      if (done.has(el) || !shown(el)) continue;
      const r = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      const line = Array.from(range.getClientRects()).find((b) => b.width > 2 && b.height > 2) ?? r;
      const x = Math.min(Math.max(line.left + Math.min(line.width / 2, 24), 1), vw - 1);
      const cy = line.top + line.height / 2;
      if (cy < 0 || cy > innerHeight) continue;
      const cs = getComputedStyle(el);
      if (cs.webkitTextFillColor === "rgba(0, 0, 0, 0)" || cs.color === "rgba(0, 0, 0, 0)" || /text/.test(cs.backgroundClip + (cs as CSSStyleDeclaration & { webkitBackgroundClip?: string }).webkitBackgroundClip)) { done.add(el); continue; }
      let opacity = 1;
      for (let a: Element | null = el; a; a = a.parentElement) opacity *= Number(getComputedStyle(a).opacity);
      const fg = rgba(cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color);
      if (!fg) continue;
      // Ghost words and big faded numbers are drawn to be faint (faded, or in a see-through colour).
      const faint = opacity * fg[3];
      if (faint < 0.35 || (faint < 0.5 && parseFloat(cs.fontSize) >= 28)) { done.add(el); continue; }
      const bg = behind(el, x, cy);
      if (bg === "covered") continue;
      done.add(el);
      if (!bg) continue;
      const ink = over([fg[0], fg[1], fg[2], fg[3] * opacity], bg);
      const c = ratio(ink, bg);
      if (c < 3) faults.push({ kind: "contrast", where: where(el), detail: `${c.toFixed(2)}: "${words(el).slice(0, 40)}" ${cs.color} on rgb(${bg.slice(0, 3).map(Math.round).join(",")})` });
    }
  }
  pinned.remove();
  scrollTo(0, 0);
  return faults;
}
