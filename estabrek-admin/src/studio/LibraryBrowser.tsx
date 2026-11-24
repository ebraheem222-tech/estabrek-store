/**
 * The owner's theme library, to browse (docs/themes-library-plan.ar.md, phase 2): every whole website and section
 * by kind (a site also by category), found by name, category or tag, each with its picture, ready to put on the
 * page. The editor opens it from the Add panel; the library's page in the admin shows the same (LibraryPage).
 */
import { useMemo, useState } from "react";
import { Modal } from "../components/ui/Modal";
import { LIB_ITEMS, LIB_KINDS, LIB_SITE_CATS, libItemOf, libName, libThumb, type LibItem } from "./library";
import { shopOrigin } from "../features/customers/signInSettings";
import { adminLang } from "../lib/lang";
import { say } from "./say";

const PAGE = 48;

/** A piece's card: its picture (or its colours until it has one), its name and what it is. */
export function LibraryCard({ item, busy, onPick, pickLabel, onPreview }: { item: LibItem; busy: boolean; onPick: (id: string) => void; pickLabel: string; onPreview?: (id: string) => void }) {
  const [noPic, setNoPic] = useState(false);
  const [c0, c1, c2] = item.colors ?? [];
  const swatch = c0 ? `linear-gradient(135deg, ${c0} 0%, ${c0} 45%, ${c1 ?? c0} 75%, ${c2 ?? c1 ?? c0} 100%)` : "linear-gradient(135deg, rgb(var(--accent-600, 79 70 229) / .55), rgba(255,255,255,.06))";
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-white/8 bg-white/2" data-testid="lib-card" data-item={item.id} data-kind={item.kind}>
      <div className="relative aspect-16/10 w-full overflow-hidden" style={{ background: swatch }}>
        {!noPic ? <img src={libThumb(item.id)} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-top" onError={() => setNoPic(true)} /> : (
          <span className="absolute inset-0 grid place-items-center px-3 text-center text-sm font-semibold text-white/85 drop-shadow-sm">{libName(item)}</span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 p-2.5">
        <div className="truncate text-xs font-medium text-white/90" title={libName(item)}>{libName(item)}</div>
        <div className="truncate text-[10px] text-white/45">{item.cat ? (LIB_SITE_CATS[item.cat] ? say(LIB_SITE_CATS[item.cat]) : item.cat) : say(LIB_KINDS.find(([k]) => k === item.kind)?.[1] ?? item.kind)}</div>
        {item.blurb ? <p className="line-clamp-2 text-[10px] leading-4 text-white/40">{item.blurb}</p> : null}
        <div className="mt-auto flex gap-1 pt-1">
          <button type="button" disabled={busy} onClick={() => onPick(item.id)} className="flex-1 rounded-lg bg-accent-500/80 px-2 py-1 text-[11px] font-medium text-white hover:bg-accent-500 disabled:opacity-40" data-testid="lib-pick">
            {pickLabel}
          </button>
          {onPreview ? (
            <button type="button" onClick={() => onPreview(item.id)} className="rounded-lg bg-white/6 px-2 py-1 text-[11px] text-white/75 hover:bg-white/10" data-testid="lib-preview">
              {say("معاينة|Preview|תצוגה")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** What's shown for a kind, a category and a search (exported for the tests and the admin's page). */
export function libFilter(items: readonly LibItem[], kind: string, cat: string, q: string): LibItem[] {
  const find = q.trim().toLowerCase();
  return items.filter((i) => {
    if (find) {
      const hay = [i.name, i.kind, i.cat ?? "", i.blurb ?? "", ...(i.tags ?? []), say(LIB_KINDS.find(([k]) => k === i.kind)?.[1] ?? ""), i.cat && LIB_SITE_CATS[i.cat] ? say(LIB_SITE_CATS[i.cat]) : ""].join(" ").toLowerCase();
      if (!hay.includes(find)) return false;
      return kind === "all" || i.kind === kind;
    }
    if (kind !== "all" && i.kind !== kind) return false;
    return !cat || i.cat === cat;
  });
}

/** The browser itself (in a dialog or on a page). */
export function LibraryShelf({ busy, onPick, pickLabel, onPreview, initialKind = "site" }: { busy: boolean; onPick: (id: string) => void; pickLabel: string; onPreview?: (id: string) => void; initialKind?: string }) {
  const [kind, setKind] = useState(initialKind);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of LIB_ITEMS) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, []);
  const cats = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of LIB_ITEMS) if (i.kind === "site" && i.cat) c[i.cat] = (c[i.cat] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, []);
  const list = useMemo(() => libFilter(LIB_ITEMS, q.trim() ? "all" : kind, cat, q), [kind, cat, q]);
  const sites = LIB_ITEMS.filter((i) => i.kind === "site").length;
  return (
    <div className="flex min-h-0 flex-col gap-3 md:flex-row" data-testid="lib-shelf">
      <nav className="flex shrink-0 gap-1 overflow-x-auto pb-1 md:w-52 md:flex-col md:overflow-visible" aria-label={say("أنواع القطع|Kinds of pieces|סוגי פריטים")}>
        {LIB_KINDS.map(([k, name]) => (
          <button
            key={k}
            type="button"
            aria-pressed={!q.trim() && kind === k}
            onClick={() => { setKind(k); setCat(""); setQ(""); setShown(PAGE); }}
            className={`flex shrink-0 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-start text-xs ${!q.trim() && kind === k ? "bg-accent-500/25 text-white" : "text-white/70 hover:bg-white/6"}`}
            data-testid="lib-kind"
            data-kind={k}
          >
            <span className="truncate">{say(name)}</span>
            <span className="text-[10px] text-white/40">{counts[k] ?? 0}</span>
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
            placeholder={say(`دوّر بين ${sites} موقع و${LIB_ITEMS.length - sites} قسم…|Search ${sites} sites and ${LIB_ITEMS.length - sites} sections…|חיפוש ב-${sites} אתרים ו-${LIB_ITEMS.length - sites} מקטעים…`)}
            aria-label={say("دوّر بالمكتبة|Search the library|חיפוש בספרייה")}
            className="min-w-48 flex-1 rounded-lg border border-white/10 bg-surface-925 px-3 py-2 text-xs text-white"
            data-testid="lib-search"
          />
          <span className="text-[11px] text-white/45" data-testid="lib-count">{say(`${list.length} قطعة|${list.length} pieces|${list.length} פריטים`)}</span>
        </div>
        {!q.trim() && kind === "site" ? (
          <div className="flex flex-wrap gap-1" role="group" aria-label={say("الفئات|Categories|קטגוריות")}>
            <button type="button" aria-pressed={!cat} onClick={() => { setCat(""); setShown(PAGE); }} className={`rounded-full px-2.5 py-1 text-[11px] ${!cat ? "bg-white/15 text-white" : "bg-white/5 text-white/65 hover:bg-white/10"}`}>
              {say("الكل|All|הכול")}
            </button>
            {cats.map(([c, n]) => (
              <button key={c} type="button" aria-pressed={cat === c} onClick={() => { setCat(c); setShown(PAGE); }} className={`rounded-full px-2.5 py-1 text-[11px] ${cat === c ? "bg-white/15 text-white" : "bg-white/5 text-white/65 hover:bg-white/10"}`} data-testid="lib-cat" data-cat={c}>
                {LIB_SITE_CATS[c] ? say(LIB_SITE_CATS[c]) : c} <span className="text-white/35">{n}</span>
              </button>
            ))}
          </div>
        ) : null}
        {list.length ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
            {list.slice(0, shown).map((i) => <LibraryCard key={i.id} item={i} busy={busy} onPick={onPick} pickLabel={pickLabel} onPreview={onPreview} />)}
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-white/45">{say("ما في إشي هيك بالمكتبة.|Nothing like that in the library.|אין דבר כזה בספרייה.")}</p>
        )}
        {list.length > shown ? (
          <div className="flex justify-center">
            <button type="button" onClick={() => setShown((s) => s + PAGE)} className="rounded-lg bg-white/6 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10" data-testid="lib-more">
              {say(`ورجيني كمان (${list.length - shown})|Show more (${list.length - shown})|הצג עוד (${list.length - shown})`)}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A piece live, as the shop draws it (its preview page: the piece alone, at the window's width). */
export function LibraryPreview({ id, busy, pickLabel, onPick, onClose }: { id: string | null; busy: boolean; pickLabel: string; onPick: (id: string) => void; onClose: () => void }) {
  const item = id ? libItemOf(id) : null;
  const [wide, setWide] = useState(true);
  return (
    <Modal open={Boolean(item)} onClose={onClose} title={item ? libName(item) : ""} description={item ? say(LIB_KINDS.find(([k]) => k === item.kind)?.[1] ?? item.kind) : undefined} widthClassName="max-w-7xl">
      {item ? (
        <div className="space-y-3" data-testid="lib-preview-window" data-item={item.id}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1" role="group" aria-label={say("حجم الشاشة|Screen size|גודל מסך")}>
              <button type="button" aria-pressed={wide} onClick={() => setWide(true)} className={`rounded-lg px-2.5 py-1 text-[11px] ${wide ? "bg-white/15 text-white" : "bg-white/5 text-white/65"}`}>{say("كمبيوتر|Computer|מחשב")}</button>
              <button type="button" aria-pressed={!wide} onClick={() => setWide(false)} className={`rounded-lg px-2.5 py-1 text-[11px] ${!wide ? "bg-white/15 text-white" : "bg-white/5 text-white/65"}`}>{say("موبايل|Phone|נייד")}</button>
            </div>
            {item.blurb ? <p className="min-w-0 flex-1 text-[11px] text-white/50">{item.blurb}</p> : <span className="flex-1" />}
            <button type="button" disabled={busy} onClick={() => onPick(item.id)} className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40" data-testid="lib-preview-pick">{pickLabel}</button>
          </div>
          <div className="flex justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <iframe
              key={`${item.id}:${wide}`}
              title={libName(item)}
              src={`${shopOrigin()}/${adminLang()}/lib-preview?item=${encodeURIComponent(item.id)}`}
              className="h-[70vh] bg-white"
              style={{ width: wide ? "100%" : 390 }}
              data-testid="lib-preview-frame"
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

/** The editor's dialog: a piece picked goes on the page where the Add panel adds. */
export function LibraryBrowser({ open, busy, onClose, onPick }: { open: boolean; busy: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const pickLabel = say("حطّه بالصفحة|Add to the page|הוספה לעמוד");
  return (
    <>
      <Modal open={open && !preview} onClose={onClose} title={say("مكتبة الثيمات|The theme library|ספריית העיצובים")} description={say("مواقع كاملة وأقسام، كل كلمة ولون فيها إلك تغيّرها.|Whole websites and sections: every word and colour in them is yours to change.|אתרים שלמים ומקטעים: כל מילה וצבע בהם שלך לשנות.")} widthClassName="max-w-6xl">
        {open ? <LibraryShelf busy={busy} onPick={onPick} pickLabel={pickLabel} onPreview={setPreview} /> : null}
      </Modal>
      <LibraryPreview id={open ? preview : null} busy={busy} pickLabel={pickLabel} onClose={() => setPreview(null)} onPick={(id) => { setPreview(null); onPick(id); }} />
    </>
  );
}
