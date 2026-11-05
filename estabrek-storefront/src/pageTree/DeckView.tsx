"use client";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { TreeLang } from "./tree";
import styles from "./DeckView.module.css";

export type DeckSettings = { presentation: "deck" | "tabs" | "vertical-tabs"; transition: "slide" | "fade" | "wipe"; duration: number; initial: number; arrows: boolean; dots: boolean; menu: boolean };
export type DeckPanelContent = { id: string; label: string; content: ReactNode };
const WORDS = {
  ar: { previous: "اللوحة السابقة", next: "اللوحة التالية", contents: "المحتويات", panels: "لوحات العرض", panel: "لوحة" },
  en: { previous: "Previous panel", next: "Next panel", contents: "Contents", panels: "Presentation panels", panel: "Panel" },
  he: { previous: "הלוח הקודם", next: "הלוח הבא", contents: "תוכן עניינים", panels: "לוחות התצוגה", panel: "לוח" },
};

export function DeckView({ panels, settings, lang }: { panels: DeckPanelContent[]; settings: DeckSettings; lang: TreeLang }) {
  const [selected, setSelected] = useState(Math.max(0, Math.min(panels.length - 1, settings.initial)));
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState(false);
  const [compact, setCompact] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const menuButton = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const base = useId().replace(/[^\w-]/g, "");
  const active = Math.max(0, Math.min(panels.length - 1, selected));
  const words = WORDS[lang];
  const isDeck = settings.presentation === "deck";
  useEffect(() => {
    setReady(true);
    const media = window.matchMedia("(max-width:639.98px)");
    const resize = () => setCompact(media.matches);
    resize(); media.addEventListener("change", resize);
    const reveal = (event: Event) => {
      const id = (event as CustomEvent<{ nodeId?: string }>).detail?.nodeId;
      if (!id || !root.current) return;
      const target = root.current.querySelector(`[data-tree-node="${CSS.escape(id)}"]`);
      const ownPanel = Array.from(root.current.querySelectorAll<HTMLElement>("[data-deck-panel]")).find(panel => panel.parentElement?.parentElement === root.current && panel.contains(target));
      const index = Number(ownPanel?.dataset.deckPanel);
      if (target && Number.isInteger(index) && index >= 0 && index < panels.length) flushSync(() => setSelected(index));
    };
    window.addEventListener("pt:reveal", reveal);
    return () => { window.removeEventListener("pt:reveal", reveal); media.removeEventListener("change", resize); };
  }, [panels.length]);
  const go = (index: number, focus = false) => {
    const at = Math.max(0, Math.min(panels.length - 1, index));
    setSelected(at); setMenu(false);
    if (focus) requestAnimationFrame(() => isDeck ? root.current?.focus({ preventScroll: true }) : buttons.current[at]?.focus());
  };
  const key = (event: KeyboardEvent<HTMLElement>, tabNavigation = false) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Escape" && menu) { event.preventDefault(); setMenu(false); menuButton.current?.focus(); return; }
    if (!tabNavigation && (!isDeck || (event.target as HTMLElement).closest("input,textarea,select,[contenteditable=true]"))) return;
    const vertical = settings.presentation === "vertical-tabs" && !window.matchMedia("(max-width:639.98px)").matches;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    const previous = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    let at: number;
    if (event.key === next || isDeck && event.key === "PageDown") at = active + 1;
    else if (event.key === previous || isDeck && event.key === "PageUp") at = active - 1;
    else if (event.key === "Home") at = 0;
    else if (event.key === "End") at = panels.length - 1;
    else return;
    event.preventDefault();
    if (tabNavigation) at = (at + panels.length) % panels.length;
    go(at, true);
  };
  const begin = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDeck || event.button !== 0 || (event.target as HTMLElement).closest("button,a,input,textarea,select,video,.pt-slider,.pt-filter-gallery,[data-instrument],[contenteditable=true]")) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { start.moved = true; event.preventDefault(); try { event.currentTarget.setPointerCapture(event.pointerId); } catch {} }
  };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current; gesture.current = null;
    if (!start || start.id !== event.pointerId || !start.moved) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 45) go(active + (dx * (getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1) < 0 ? 1 : -1), true);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
  };
  if (!panels.length) return null;
  return <div ref={root} className={styles.deck} data-presentation={settings.presentation} data-transition={settings.transition} data-deck-ready={ready ? "true" : undefined} data-deck-at={active} tabIndex={isDeck ? 0 : -1} aria-label={words.panels} onKeyDown={event => key(event)} style={{ "--deck-duration": `${settings.duration}s` } as CSSProperties}>
    {!isDeck ? <div className={styles.tabs} role="tablist" aria-label={words.panels} aria-orientation={settings.presentation === "vertical-tabs" && !compact ? "vertical" : "horizontal"}>
      {panels.map((panel, index) => <button key={panel.id} ref={button => { buttons.current[index] = button; }} id={`${base}-tab-${index}`} type="button" role="tab" tabIndex={active === index ? 0 : -1} aria-selected={active === index} aria-controls={`${base}-panel-${index}`} onClick={() => go(index)} onKeyDown={event => key(event, true)}>{panel.label}</button>)}
    </div> : null}
    <div className={styles.viewport} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { gesture.current = null; }}>
      {panels.map((panel, index) => <div key={panel.id} id={`${base}-panel-${index}`} data-deck-panel={index} className={styles.panel} hidden={active !== index} role={isDeck ? "group" : "tabpanel"} aria-label={isDeck ? panel.label : undefined} aria-labelledby={!isDeck ? `${base}-tab-${index}` : undefined} tabIndex={0}>
        {panel.content}
      </div>)}
    </div>
    {isDeck ? <div className={styles.toolbar}>
      <span className={styles.caption}>{panels[active]?.label}</span>
      {settings.menu ? <div className={styles.contents}><button ref={menuButton} type="button" aria-expanded={menu} aria-label={words.contents} onClick={() => setMenu(!menu)}>{words.contents} ☰</button>{menu ? <nav aria-label={words.contents}>{panels.map((panel, index) => <button key={panel.id} type="button" aria-current={active === index ? "page" : undefined} onClick={() => go(index, true)}>{String(index + 1).padStart(2, "0")} · {panel.label}</button>)}</nav> : null}</div> : null}
      {settings.dots ? <div className={styles.dots}>{panels.map((panel, index) => <button key={panel.id} type="button" aria-label={`${words.panel} ${index + 1}: ${panel.label}`} aria-current={active === index ? "true" : undefined} onClick={() => go(index)} />)}</div> : null}
      <span className={styles.counter} aria-live="polite">{String(active + 1).padStart(2, "0")} / {String(panels.length).padStart(2, "0")}</span>
      {settings.arrows ? <><button type="button" disabled={active === 0} aria-label={words.previous} onClick={() => go(active - 1)}>‹</button><button type="button" disabled={active === panels.length - 1} aria-label={words.next} onClick={() => go(active + 1)}>›</button></> : null}
    </div> : null}
  </div>;
}
