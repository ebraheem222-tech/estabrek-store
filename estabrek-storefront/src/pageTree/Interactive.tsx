"use client";
/**
 * The page tree's elements that need the shopper's browser: tabs (the keyboard moves between
 * them), a countdown, a before-and-after picture with its handle, and a popup that shows over
 * the page when its moment comes. Each is drawn on the server first (tabs with the first
 * open, the countdown empty until it knows the time here, the popup closed).
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/* -------------------------------------------------------------------- tabs */

export type TabItem = { label: string; text: string; image?: string | null };
export function TabsView({ items, look }: { items: TabItem[]; look: string }) {
  const [at, setAt] = useState(0);
  const base = useId().replace(/[^\w-]/g, "");
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const go = (i: number) => {
    const n = (i + items.length) % items.length;
    setAt(n);
    tabs.current[n]?.focus();
  };
  const keys = (e: KeyboardEvent) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const next = rtl ? "ArrowLeft" : "ArrowRight";
    const prev = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === next) go(at + 1);
    else if (e.key === prev) go(at - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(items.length - 1);
    else return;
    e.preventDefault();
  };
  return (
    <div className={`pt-tabs pt-tabs-${look}`}>
      <div className="pt-tabs-list" role="tablist" onKeyDown={keys}>
        {items.map((t, i) => (
          <button
            key={i} ref={(el) => void (tabs.current[i] = el)} type="button" role="tab" id={`${base}-t${i}`} aria-selected={at === i} aria-controls={`${base}-p${i}`}
            tabIndex={at === i ? 0 : -1} className="pt-tab" onClick={() => setAt(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {items.map((t, i) => (
        <div key={i} role="tabpanel" id={`${base}-p${i}`} aria-labelledby={`${base}-t${i}`} hidden={at !== i} className="pt-tab-panel" tabIndex={0}>
          {t.image ? <img src={t.image} alt="" loading="lazy" /> : null}
          <div className="pt-tab-text">{t.text}</div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- countdown */

export function CountdownView({ until, done, look, words }: { until: string; done: string; look: string; words: [string, string, string, string] }) {
  const end = Date.parse(until);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [end]);
  if (left === 0) return done ? <div className="pt-count-done">{done}</div> : null;
  const s = left === null ? null : Math.floor(left / 1000);
  const parts = s === null ? [null, null, null, null] : [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <div className={`pt-count pt-count-${look}`} role="timer" aria-live="off">
      {parts.map((v, i) => (
        <div key={i} className="pt-count-part">
          <span className="pt-count-n">{v === null ? "--" : String(v).padStart(2, "0")}</span>
          <span className="pt-count-l">{words[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- before / after */

export function BeforeAfterView({ before, after, beforeLabel, afterLabel, start, handle }: { before: string; after: string; beforeLabel: string; afterLabel: string; start: number; handle: string }) {
  const [at, setAt] = useState(start);
  return (
    <div className="pt-ba" style={{ "--pt-ba": `${at}%` } as Record<string, string>}>
      <img className="pt-ba-after" src={after} alt={afterLabel} loading="lazy" />
      <img className="pt-ba-before" src={before} alt={beforeLabel} loading="lazy" />
      {beforeLabel ? <span className="pt-ba-tag pt-ba-tag-before" aria-hidden="true">{beforeLabel}</span> : null}
      {afterLabel ? <span className="pt-ba-tag pt-ba-tag-after" aria-hidden="true">{afterLabel}</span> : null}
      <span className="pt-ba-line" aria-hidden="true" />
      <input className="pt-ba-range" type="range" min={0} max={100} value={at} onChange={(e) => setAt(Number(e.target.value))} aria-label={handle} />
    </div>
  );
}

/* ------------------------------------------------------------------- popup */

export type PopupSpec = { trigger: string; delay: number; scroll: number; anchor?: string; often: string; size: string; place: string };
/** Whether the popup may show again (the store's choice: always, once a visit, once a day, once ever). */
function mayShow(key: string, often: string): boolean {
  try {
    if (often === "visit") return !sessionStorage.getItem(key);
    if (often === "day") return Date.now() - Number(localStorage.getItem(key) || 0) > 86_400_000;
    if (often === "once") return !localStorage.getItem(key);
  } catch {
    /* no storage: show it */
  }
  return true;
}
function markShown(key: string, often: string) {
  try {
    if (often === "visit") sessionStorage.setItem(key, "1");
    if (often === "day" || often === "once") localStorage.setItem(key, String(Date.now()));
  } catch {
    /* no storage */
  }
}

export function PopupView({ id, spec, label, close, children }: { id: string; spec: PopupSpec; label: string; close: string; children: ReactNode }) {
  const box = useRef<HTMLDialogElement>(null);
  // In the editor's frame the popup stays open in its place on the page, to be edited.
  const [studio, setStudio] = useState(false);
  useEffect(() => {
    if (window.parent !== window && /\/studio-frame/.test(location.pathname)) return void setStudio(true);
    const dialog = box.current;
    if (!dialog) return;
    const key = `pt-popup-${id}`;
    const open = (forced = false) => {
      if (dialog.open || (!forced && !mayShow(key, spec.often))) return;
      markShown(key, spec.often);
      if (spec.place === "center") dialog.showModal();
      else dialog.show();
    };
    const offs: Array<() => void> = [];
    if (spec.trigger === "load") {
      const t = setTimeout(() => open(), spec.delay * 1000);
      offs.push(() => clearTimeout(t));
    } else if (spec.trigger === "scroll") {
      const check = () => {
        const most = document.documentElement.scrollHeight - innerHeight;
        if (most > 0 && (scrollY / most) * 100 >= spec.scroll) {
          open();
          removeEventListener("scroll", check);
        }
      };
      addEventListener("scroll", check, { passive: true });
      offs.push(() => removeEventListener("scroll", check));
    } else if (spec.trigger === "exit") {
      // The mouse leaving at the top of the window (computers only).
      const leave = (e: MouseEvent) => {
        if (!e.relatedTarget && e.clientY <= 0) open();
      };
      document.addEventListener("mouseout", leave);
      offs.push(() => document.removeEventListener("mouseout", leave));
    }
    if (spec.anchor) {
      // A link to "#<anchor>" anywhere on the page opens it, every time.
      const click = (e: MouseEvent) => {
        const a = (e.target as Element | null)?.closest?.(`a[href="#${CSS.escape(spec.anchor!)}"]`);
        if (!a) return;
        e.preventDefault();
        open(true);
      };
      document.addEventListener("click", click);
      offs.push(() => document.removeEventListener("click", click));
    }
    return () => offs.forEach((f) => f());
  }, [id, spec.trigger, spec.delay, spec.scroll, spec.anchor, spec.often, spec.place]);
  if (studio) return <div className="pt-popup-studio">{children}</div>;
  return (
    <dialog ref={box} className={`pt-popup pt-popup-${spec.size} pt-popup-${spec.place}`} aria-label={label || undefined}>
      <form method="dialog">
        <button className="pt-popup-close" aria-label={close}>×</button>
      </form>
      {children}
    </dialog>
  );
}
