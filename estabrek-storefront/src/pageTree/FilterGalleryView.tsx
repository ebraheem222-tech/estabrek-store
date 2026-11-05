"use client";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { filterGalleryItems, type GallerySpec } from "./gallery";
import styles from "./FilterGalleryView.module.css";

export type GalleryWords = { gallery: string; all: string; search: string; empty: string; open: string; preview: string; close: string; previous: string; next: string; view: string; results: string };
export type GalleryPanel = { title: string; text: string; category: string; image: string; href?: string; cta: string };
type Props = Omit<GallerySpec, "items" | "label"> & { items: GalleryPanel[]; label: string; lang: string; words: GalleryWords; className: string; mark: Record<string, string> };

export function FilterGalleryView({ items, label, lang, words, layout, columns, gap, hoverEffect, lightbox, searchable, activation, className, mark, presentation = "cards", initial = 0, filters = true, showCount = true }: Props) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initial);
  const [opened, setOpened] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const closeButton = useRef<HTMLButtonElement>(null);
  const base = useId().replace(/[^\w-]/g, "");
  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean)));
  const visible = filterGalleryItems(items.map((item, index) => ({ ...item, index })), categories.includes(category) ? category : "", query, lang);
  const active = selected === -1 ? undefined : visible.find((item) => item.index === selected) ?? visible[0];
  const enlarged = visible.find((item) => item.index === opened);
  const isOpen = Boolean(enlarged);

  useEffect(() => {
    const modal = dialog.current;
    if (!modal || !isOpen) return;
    modal.showModal();
    closeButton.current?.focus();
    return () => {
      modal.close();
      // A removed item should not send focus into a disconnected preview node.
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const open = (index: number, from: HTMLElement) => { opener.current = from; setOpened(index); };
  const close = () => setOpened(null);
  const navigate = (by: number) => {
    const position = visible.findIndex((item) => item.index === opened);
    setOpened(visible[(position + by + visible.length) % visible.length].index);
  };
  const modalKeys = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === "Tab") {
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]")).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focused = document.activeElement;
      if (event.shiftKey && (focused === first || !focusable.includes(focused as HTMLElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (focused === last || !focusable.includes(focused as HTMLElement))) {
        event.preventDefault();
        first?.focus();
      }
      return;
    }
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    if (event.key === (rtl ? "ArrowLeft" : "ArrowRight")) { event.preventDefault(); navigate(1); }
    else if (event.key === (rtl ? "ArrowRight" : "ArrowLeft")) { event.preventDefault(); navigate(-1); }
    else if (event.key === "Home") { event.preventDefault(); setOpened(visible[0].index); }
    else if (event.key === "End") { event.preventDefault(); setOpened(visible[visible.length - 1].index); }
  };
  const selectionKeys = (event: KeyboardEvent<HTMLButtonElement>, position: number) => {
    let target: number;
    if (event.key === "ArrowDown") target = (position + 1) % visible.length;
    else if (event.key === "ArrowUp") target = (position + visible.length - 1) % visible.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = visible.length - 1;
    else return;
    event.preventDefault();
    setSelected(visible[target].index);
    buttons.current[target]?.focus();
  };
  const media = (item: GalleryPanel & { index: number }, preview = false) => {
    const picture = <img src={item.image} alt={item.title} loading="lazy" decoding="async" draggable={false} />;
    return <div className={preview ? "pt-fg-preview" : "pt-fg-media"}>
      {lightbox ? <button type="button" className="pt-fg-open" aria-label={`${words.open} ${item.title}`} onClick={(event) => open(item.index, event.currentTarget)}>{picture}<span className="pt-fg-enlarge" aria-hidden="true">↗</span></button> : picture}
    </div>;
  };

  return <div ref={root} className={`${className} ${styles.gallery} pt-filter-gallery`} {...mark} data-layout={layout} data-presentation={presentation} data-hover-effect={hoverEffect} style={{ "--fg-columns": columns, "--fg-gap": `${gap}px` } as CSSProperties} role="group" aria-label={label}>
    <div className="pt-fg-tools">
      {filters && categories.length ? <div className="pt-fg-filters" role="group" aria-label={label}>
        {["", ...categories].map((value) => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{value || words.all}</button>)}
      </div> : null}
      {searchable ? <label className="pt-fg-search"><span>{words.search}</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label> : null}
    </div>
    {showCount ? <div className="pt-fg-count" role="status" aria-live="polite">{visible.length} {words.results}</div> : null}
    {!visible.length ? <p className="pt-fg-empty">{words.empty}</p> : <div className="pt-fg-body">
      <div className="pt-fg-list">
        {visible.map((item, position) => <article key={item.index} className="pt-fg-item" data-selected={item.index === active?.index ? "true" : "false"} onFocus={() => setSelected(item.index)} onPointerEnter={(event) => {
          if (layout !== "split" || activation !== "hover" || event.pointerType !== "mouse" || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
          if (root.current?.contains(document.activeElement) && document.activeElement?.closest(".pt-fg-item, .pt-fg-preview")) return;
          setSelected(item.index);
        }}>
          {layout !== "split" ? media(item) : null}
          <div className="pt-fg-copy">
            {item.category ? <span className="pt-fg-category">{item.category}</span> : null}
            {layout === "split" ? <button type="button" ref={(element) => { buttons.current[position] = element; }} className="pt-fg-select" aria-label={`${words.preview} ${item.title}`} aria-pressed={item.index === active?.index} aria-controls={`${base}-preview`} onClick={() => setSelected(item.index)} onKeyDown={(event) => selectionKeys(event, position)}>{item.title}<span aria-hidden="true"> ↗</span></button> : <h3>{item.title}</h3>}
            {item.text ? <p>{item.text}</p> : null}
            {item.href ? <a className="pt-fg-link" href={item.href}>{item.cta}</a> : null}
          </div>
        </article>)}
      </div>
      {layout === "split" ? <div id={`${base}-preview`} className="pt-fg-preview-wrap" aria-live="polite">{active ? media(active, true) : null}</div> : null}
    </div>}
    <dialog ref={dialog} className="pt-fg-lightbox" aria-modal="true" aria-labelledby={`${base}-title`} onCancel={(event) => { event.preventDefault(); close(); }} onKeyDown={modalKeys} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); } }}>
      {enlarged ? <>
        <button type="button" ref={closeButton} className="pt-fg-close" aria-label={words.close} onClick={close}>×</button>
        <img src={enlarged.image} alt={enlarged.title} />
        <div className="pt-fg-lightbox-copy"><h2 id={`${base}-title`}>{enlarged.title}</h2>{enlarged.text ? <p>{enlarged.text}</p> : null}{enlarged.href ? <a href={enlarged.href}>{enlarged.cta}</a> : null}</div>
        <div className="pt-fg-lightbox-nav"><button type="button" aria-label={words.previous} disabled={visible.length < 2} onClick={() => navigate(-1)}>‹</button><span role="status" aria-live="polite">{visible.findIndex((item) => item.index === opened) + 1} / {visible.length}</span><button type="button" aria-label={words.next} disabled={visible.length < 2} onClick={() => navigate(1)}>›</button></div>
      </> : null}
    </dialog>
  </div>;
}
