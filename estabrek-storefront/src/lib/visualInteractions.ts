import { readPolicy, resolveActions, type InteractionEvent, type InteractionPolicy } from "./visualControls";

const EVENT = "cms:visual-interaction";
const origins = new WeakMap<Element, Element>();
function originOf(source: Element): Element {
  for (let el: Element | null = source; el; el = el.parentElement) { const origin = origins.get(el); if (origin) return origin; }
  return source;
}
export function markVisualOrigin(portal: Element | null, origin?: Element | null): void {
  if (!portal) return;
  if (origin) origins.set(portal, originOf(origin)); else origins.delete(portal);
}
type Payload = { source?: Element | null; color?: string | null; auto?: boolean };
/** The source can be the still-mounted card behind a portal. No shopper identity is transmitted. */
export function emitVisualInteraction(type: InteractionEvent, payload: Payload = {}): boolean {
  if (typeof document === "undefined") return false;
  if (payload.source) payload = { ...payload, source: originOf(payload.source) };
  if (payload.source && !payload.source.isConnected) return true;
  const doc = payload.source?.ownerDocument ?? document;
  const event = new CustomEvent(EVENT, { cancelable: true, detail: { type, ...payload } });
  doc.dispatchEvent(event);
  return event.defaultPrevented;
}
export function mountVisualInteractions(doc: Document, global: InteractionPolicy | undefined, palette: (color: string) => Record<string, string>, options: { automaticClicks?: boolean; prepareBaseline?: () => void; stopWriters?: (roots: HTMLElement[]) => void } = {}): () => void {
  const theme = new Map<HTMLElement, Map<string, [string, string]>>();
  const visibility = new Map<HTMLElement, { hidden: boolean; display: string; priority: string }>();
  const animations = new Set<Animation>();
  let previousThemeOwner: string | null | undefined;
  const restoreTheme = () => {
    if (theme.size) options.stopWriters?.([...theme.keys()]);
    for (const [el, props] of theme) for (const [key, [value, priority]] of props) value ? el.style.setProperty(key, value, priority) : el.style.removeProperty(key);
    theme.clear();
    if (previousThemeOwner !== undefined) {
      if (previousThemeOwner === null) doc.documentElement.removeAttribute("data-visual-theme"); else doc.documentElement.setAttribute("data-visual-theme", previousThemeOwner);
      previousThemeOwner = undefined;
    }
  };
  const listener = (raw: Event) => {
    const event = raw as CustomEvent<Payload & { type: InteractionEvent }>;
    const { type, source, color, auto } = event.detail;
    if (source && (!source.isConnected || source.ownerDocument !== doc)) return;
    const policies: (InteractionPolicy | undefined)[] = [];
    let el = !source || source === doc.body || source === doc.documentElement ? doc.querySelector("[data-cms-interaction-page]") : source;
    while (el) {
      const json = el.getAttribute("data-interactions");
      if (json) { try { policies.push(readPolicy(JSON.parse(json))); } catch { /* malformed public data */ } }
      el = el.parentElement;
    }
    const actions = resolveActions(type, [...policies, global]);
    if (actions === undefined) return;
    event.preventDefault();
    if (auto) return;
    const page = source?.closest("[data-cms-interaction-page]") ?? doc.querySelector("[data-cms-interaction-page]");
    const reduced = doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    for (const action of actions) {
      if (action.type === "themeReset") { restoreTheme(); continue; }
      if (action.type === "theme") {
        const seed = action.color === "event" ? color : action.color;
        if (!seed || !/^#[0-9a-f]{6}$/i.test(seed)) continue;
        options.prepareBaseline?.();
        const roots = new Set<HTMLElement>([...doc.querySelectorAll<HTMLElement>(".cinematic-shell, [data-page-store-theme], .atelier-header")]);
        if (!roots.size && page instanceof HTMLElement) roots.add(page);
        if (!roots.size) roots.add(doc.body);
        roots.add(doc.documentElement);
        const vars = palette(seed);
        for (const root of roots) {
          let saved = theme.get(root);
          if (!saved) theme.set(root, saved = new Map());
          for (const [key, value] of Object.entries(vars)) {
            if (!saved.has(key)) saved.set(key, [root.style.getPropertyValue(key), root.style.getPropertyPriority(key)]);
          }
        }
        if (previousThemeOwner === undefined) previousThemeOwner = doc.documentElement.getAttribute("data-visual-theme");
        doc.documentElement.setAttribute("data-visual-theme", "");
        options.stopWriters?.([...roots]);
        for (const root of roots) for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
        continue;
      }
      const target = page?.querySelector<HTMLElement>(`[data-tree-node="${action.target}"]`);
      if (!target) continue;
      if (action.type === "visibility") {
        if (!visibility.has(target)) visibility.set(target, { hidden: target.hidden, display: target.style.getPropertyValue("display"), priority: target.style.getPropertyPriority("display") });
        const hidden = target.hidden || doc.defaultView?.getComputedStyle(target).display === "none";
        const hide = action.value === "hide" || (action.value === "toggle" && !hidden);
        target.hidden = hide;
        const saved = visibility.get(target)!;
        if (hide) target.style.setProperty("display", "none", "important");
        else {
          saved.display ? target.style.setProperty("display", saved.display, saved.priority) : target.style.removeProperty("display");
          if (doc.defaultView?.getComputedStyle(target).display === "none") target.style.setProperty("display", "block", "important");
        }
      } else if (action.type === "scroll") target.scrollIntoView?.({ behavior: reduced ? "instant" : "smooth", block: "center" });
      else if (action.type === "animate" && !reduced && target.animate) {
        const frames = action.preset === "fade" ? { opacity: [0.25, 1] } : action.preset === "shake" ? { translate: ["0px", "-8px", "8px", "-4px", "0px"] } : { scale: ["1", "1.06", "1"] };
        const animation = target.animate(frames, { duration: 450, easing: "ease-out", composite: action.preset === "fade" ? "replace" : "add" });
        animations.add(animation); animation.onfinish = () => animations.delete(animation);
      }
    }
  };
  const click = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest("button, a, [data-tree-node]") : null;
    if (target && !(target instanceof HTMLButtonElement && target.disabled)) emitVisualInteraction("click", { source: target });
  };
  doc.addEventListener(EVENT, listener); if (options.automaticClicks !== false) doc.addEventListener("click", click, true);
  return () => {
    doc.removeEventListener(EVENT, listener); doc.removeEventListener("click", click, true);
    restoreTheme(); for (const [el, saved] of visibility) { el.hidden = saved.hidden; saved.display ? el.style.setProperty("display", saved.display, saved.priority) : el.style.removeProperty("display"); }
    for (const animation of animations) animation.cancel();
  };
}
