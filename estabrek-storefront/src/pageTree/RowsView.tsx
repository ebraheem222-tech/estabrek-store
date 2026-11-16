"use client";
/**
 * A list read in the visitor's browser (rowsSpec.ts): the page drew its card once, unseen; here the rows are asked
 * of the table's API as whoever is signed in (the shop's hands: components/RecipeHands.tsx), and the card is copied
 * once per row. In each copy the connected elements take the row's values (TreeNodeView marked them:
 * data-pt-row-text / -src / -alt / -href), {{row_…}} in any text shows them too, and the copy's recipes start
 * listening with the row's values at hand (TreeTriggers wireRecipes), so a button in a row acts on that row.
 *
 * The rows are read again after something the shopper did may have changed them (rowsSpec.ts ROWS_EVENT), when
 * they sign in or out, and when they come back to the tab after a while.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { safeHref, safeSrc, type TreeLang } from "./tree";
import { ROWS_EVENT, rowScope, rowWords, rowsQuery, rowsWords, type RowOut, type RowsSpec } from "./rowsSpec";
import { setRowScope } from "./recipeVars";
import { signedIn, wantHands, whenHands, WHO_EVENT } from "./recipeHands";
import { wireRecipes } from "./TreeTriggers";
import css from "./RowsView.module.css";

type State = { is: "loading" | "ready" | "empty" | "signin" | "failed"; more: boolean };
/** How long away from the tab before the rows are read again on coming back. */
const STALE_MS = 30_000;
/** The most pages one list shows (each "more" adds one). */
const MOST_PAGES = 20;

/** Where a row's element goes: the row's own page, or the address one of its fields opens ("#" when there is none). */
function hrefOf(row: RowOut, ref: string, table: string, prefix: string): string {
  if (ref === "$url") return row.status === "PUBLISHED" && row.slug ? `${prefix}/${table}/${encodeURIComponent(row.slug)}` : "#";
  const to = safeHref(row.links[ref]);
  return !to ? "#" : to.startsWith("/") ? `${prefix}${to}` : to;
}

/** One copy of the card, filled from a row. */
function fill(copy: HTMLElement, row: RowOut, table: string, prefix: string) {
  const scope = rowScope(row);
  const each = (attr: string, f: (el: HTMLElement, ref: string) => void) => {
    for (const el of [copy, ...Array.from(copy.querySelectorAll<HTMLElement>(`[${attr}]`))]) {
      const ref = el.getAttribute(attr);
      if (ref) f(el, ref);
    }
  };
  // A row's words keep their own direction inside the page's (an email or a name in Latin letters among Arabic).
  each("data-pt-row-text", (el, ref) => { el.textContent = rowWords(row, ref); el.setAttribute("dir", "auto"); });
  each("data-pt-row-alt", (el, ref) => el.setAttribute("alt", rowWords(row, ref)));
  // A picture or a clip the row has none of keeps the design's own (as a list drawn with the page does).
  each("data-pt-row-src", (el, ref) => {
    const src = safeSrc(row.values[ref]);
    if (src) el.setAttribute("src", src);
  });
  each("data-pt-row-href", (el, ref) => el.setAttribute("href", hrefOf(row, ref, table, prefix)));
  // {{row_…}} in a text: the row's value (or the words after "|"); these are the row's, not the visit's variables.
  each("data-pt-var", (el, name) => {
    if (!name.startsWith("row_")) return;
    const v = scope[name];
    el.textContent = v === undefined ? el.dataset.ptVarDefault ?? "" : String(v);
    el.removeAttribute("data-pt-var");
    el.setAttribute("data-pt-row-var", name);
    el.setAttribute("dir", "auto");
  });
  copy.setAttribute("data-pt-row", row.id);
  setRowScope(copy, scope);
}

export function RowsView({ spec, lang, signin, prefix, children }: { spec: RowsSpec; lang: TreeLang; signin: string; prefix: string; children: ReactNode }) {
  const w = rowsWords(lang);
  const card = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ is: "loading", more: false });
  const [busy, setBusy] = useState(false);
  // How many pages are shown, and the newest reading (an older one that answers late is dropped).
  const pages = useRef(1);
  const turn = useRef(0);
  const stop = useRef<(() => void) | null>(null);
  // The list is on the page (a recipe started in a row goes on while it is, also after the rows are drawn again).
  const mounted = useRef(false);
  const key = JSON.stringify(spec);

  const read = useCallback(async () => {
    const mine = ++turn.current;
    const into = holder.current;
    const base = card.current?.firstElementChild;
    // A card that draws nothing (a picture with no address, say) has nothing to repeat.
    if (!into || !(base instanceof HTMLElement)) return setState({ is: "empty", more: false });
    const clear = () => {
      stop.current?.();
      stop.current = null;
      into.replaceChildren();
    };
    const hands = await whenHands();
    if (mine !== turn.current) return;
    // A shopper's own rows need a shopper: said without asking the server.
    if (spec.feed !== "live" && !signedIn()) {
      clear();
      return setState({ is: "signin", more: false });
    }
    const rows: RowOut[] = [];
    let total = 0;
    for (let page = 1; page <= pages.current; page++) {
      const out = hands ? await hands.rows(spec.table, rowsQuery(spec, lang, page)) : { ok: false as const, status: 0 };
      if (mine !== turn.current) return;
      if (!out.ok) {
        clear();
        // A table that isn't open (or whose feature is switched off) has nothing to show; so the list is empty.
        return setState({ is: out.status === 401 ? "signin" : out.status === 404 ? "empty" : "failed", more: false });
      }
      rows.push(...out.rows);
      total = out.total;
      if (!out.rows.length || rows.length >= total) break;
    }
    // The new rows in one go, their recipes listening; the ones before are let go.
    const copies = rows.map((row) => {
      const copy = base.cloneNode(true) as HTMLElement;
      fill(copy, row, spec.table, prefix);
      return copy;
    });
    stop.current?.();
    into.replaceChildren(...copies);
    stop.current = wireRecipes(into, () => mounted.current);
    setState({ is: rows.length ? "ready" : "empty", more: rows.length < total && pages.current < MOST_PAGES });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lang, prefix]);

  useEffect(() => {
    // Nothing is read in the editor's frame (its preview shows the card as designed, without this part).
    if (window.parent !== window && /\/studio-frame/.test(window.location.pathname)) return;
    wantHands();
    mounted.current = true;
    pages.current = 1;
    let timer = 0;
    let readAt = Date.now();
    let was = signedIn();
    const again = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { readAt = Date.now(); was = signedIn(); void read(); }, 150);
    };
    // Signing in or out changes whose rows these are; the shop saying "who" again without a change doesn't.
    const who = () => {
      if (signedIn() !== was) again();
    };
    const seen = () => {
      if (document.visibilityState === "visible" && Date.now() - readAt > STALE_MS) again();
    };
    setState({ is: "loading", more: false });
    void read();
    window.addEventListener(ROWS_EVENT, again);
    window.addEventListener(WHO_EVENT, who);
    document.addEventListener("visibilitychange", seen);
    return () => {
      mounted.current = false;
      turn.current++;
      window.clearTimeout(timer);
      window.removeEventListener(ROWS_EVENT, again);
      window.removeEventListener(WHO_EVENT, who);
      document.removeEventListener("visibilitychange", seen);
      stop.current?.();
      stop.current = null;
    };
  }, [read]);

  const more = async () => {
    if (busy) return;
    setBusy(true);
    pages.current = Math.min(MOST_PAGES, pages.current + 1);
    await read();
    setBusy(false);
  };

  const note = state.is === "loading" ? w.loading : state.is === "empty" ? spec.empty || w.empty : state.is === "signin" ? spec.signin || w.signin : state.is === "failed" ? w.failed : "";
  return (
    <>
      {/* The card as designed: never seen, copied for each row. */}
      <div ref={card} hidden aria-hidden="true" data-pt-row-card>{children}</div>
      <div ref={holder} className={css.rows} data-pt-rows={spec.table} data-state={state.is} />
      {note ? (
        <p className={css.note} role="status" data-pt-rows-note data-is={state.is}>
          {note}
          {state.is === "signin" ? <> <a href={signin}>{w.signinLink}</a></> : null}
          {state.is === "failed" ? <> <button type="button" className={css.retry} onClick={() => { setState({ is: "loading", more: false }); void read(); }}>{w.retry}</button></> : null}
        </p>
      ) : null}
      {state.more ? <button type="button" className={css.more} onClick={() => void more()} disabled={busy} data-pt-rows-more>{w.more}</button> : null}
    </>
  );
}
