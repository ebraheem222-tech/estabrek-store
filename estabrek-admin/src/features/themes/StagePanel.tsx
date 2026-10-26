/**
 * A gaming theme's 3D stage, the store's way (header.storeThemeOptions[themeId]): which
 * models stand on it (up to 6, each with its own name and the category it opens) and the
 * games the shopper can pick (up to 12: a name, a colour that repaints the stage, its model,
 * a link and a picture). Until saved, the theme's own models and genres show. It changes
 * the stage's draft (stageDraft.ts); the save is the workspace's (StageWorkspace).
 */
import { useState } from "react";
import type { CatalogCategory } from "../../api/catalog.api";
import { MediaLibraryModal } from "../../components/media/MediaLibraryModal";
import { adminLang } from "../../lib/lang";
import { tr } from "../../lib/words";
import { stageWords, type StageModelInfo, type StoreThemeInfo } from "../../studio/storeThemes";
import { MAX_GAMES, MAX_MODELS, themeDraft, type DraftGame, type DraftModel, type StageDraftApi } from "./stageDraft";

const input = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-30";

function LinkPicker({ value, onChange, categories, label }: { value: string; onChange: (v: string) => void; categories: CatalogCategory[]; label: string }) {
  const known = value === "" || categories.some((c) => `/c/${encodeURIComponent(c.slug)}` === value);
  const [custom, setCustom] = useState(!known);
  return (
    <div className="grid gap-1">
      <select
        className={input}
        aria-label={label}
        value={custom ? "__custom" : value}
        onChange={(e) => {
          if (e.target.value === "__custom") return setCustom(true);
          setCustom(false);
          onChange(e.target.value);
        }}
      >
        <option value="">{tr("تلقائي (حسب الاسم)", "Automatic (by its name)")}</option>
        {categories.map((c) => (
          <option key={c.id} value={`/c/${encodeURIComponent(c.slug)}`}>
            {c.name}
          </option>
        ))}
        <option value="__custom">{tr("رابط آخر…", "Another link…")}</option>
      </select>
      {custom ? <input dir="ltr" className={input} value={value} placeholder="/search?q=fifa" onChange={(e) => onChange(e.target.value)} /> : null}
    </div>
  );
}

export function StagePanel({ theme, models, categories, api }: { theme: StoreThemeInfo; models: StageModelInfo[]; categories: CatalogCategory[]; api: StageDraftApi }) {
  const lang = adminLang();
  const { draft, change } = api;
  const rows = draft.models;
  const games = draft.games;
  const words = stageWords(theme.family);
  const nameOf = (kind: string) => models.find((m) => m.kind === kind)?.label[lang] ?? kind;
  const [picking, setPicking] = useState<number | null>(null);

  const setRow = (i: number, patch: Partial<DraftModel>, key = "") => change((d) => ({ ...d, models: d.models.map((r, j) => (j === i ? { ...r, ...patch } : r)) }), key);
  const setGame = (i: number, patch: Partial<DraftGame>, key = "") => change((d) => ({ ...d, games: d.games.map((g, j) => (j === i ? { ...g, ...patch } : g)) }), key);
  const move = <T,>(list: T[], i: number, d: number) => {
    const next = list.slice();
    const [x] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + d)), 0, x);
    return next;
  };

  return (
    <section className="space-y-4" data-testid="stage-panel">
      <div>
        <h3 className="text-sm font-semibold">{words.title}</h3>
        <p className="mt-1 text-[11px] leading-5 text-white/45">
          {words.help}
        </p>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-white/70">{tr("الموديلات", "Models")} ({rows.length}/{MAX_MODELS})</div>
        {rows.map((r, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-white/[0.03] p-2 md:grid-cols-[150px_1fr_1fr_auto]" data-testid="stage-model-row">
            <select className={input} aria-label={tr("الموديل", "Model")} value={r.kind} onChange={(e) => setRow(i, { kind: e.target.value })}>
              {models.map((m) => (
                <option key={m.kind} value={m.kind}>
                  {m.label[lang] || m.label.en}
                </option>
              ))}
            </select>
            <input className={input} aria-label={tr("الاسم", "Name")} value={r.label} placeholder={nameOf(r.kind)} onChange={(e) => setRow(i, { label: e.target.value }, `label:${i}`)} />
            <LinkPicker label={tr("الرابط", "Link")} value={r.href} onChange={(href) => setRow(i, { href }, `href:${i}`)} categories={categories} />
            <div className="flex gap-1">
              <button type="button" className={btn} disabled={i === 0} onClick={() => change((d) => ({ ...d, models: move(d.models, i, -1) }))} aria-label={tr("لفوق", "Up")}>↑</button>
              <button type="button" className={btn} disabled={i === rows.length - 1} onClick={() => change((d) => ({ ...d, models: move(d.models, i, 1) }))} aria-label={tr("لتحت", "Down")}>↓</button>
              <button type="button" className={`${btn} text-red-300`} disabled={rows.length <= 1} onClick={() => change((d) => ({ ...d, models: d.models.filter((_, j) => j !== i) }))} aria-label={tr("حذف", "Delete")}>×</button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className={btn}
          disabled={rows.length >= MAX_MODELS}
          onClick={() => change((d) => ({ ...d, models: [...d.models, { kind: models.find((m) => !d.models.some((r) => r.kind === m.kind))?.kind ?? "controller", label: "", href: "", look: {} }] }))}
          data-testid="stage-add-model"
        >
          + {tr("موديل", "Model")}
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-white/70">{words.list} ({games.length}/{MAX_GAMES})</div>
        {games.map((g, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-white/[0.03] p-2 md:grid-cols-[1fr_52px_130px_1fr_auto]" data-testid="stage-game-row">
            <input className={input} aria-label={words.name} value={g.name} placeholder={words.example} onChange={(e) => setGame(i, { name: e.target.value }, `game:${i}`)} />
            <input type="color" className="h-8 w-full cursor-pointer rounded-lg border border-white/[0.1] bg-transparent" aria-label={tr("اللون", "Colour")} value={g.color} onChange={(e) => setGame(i, { color: e.target.value }, `gameColour:${i}`)} />
            <select className={input} aria-label={tr("الموديل", "Model")} value={g.model} onChange={(e) => setGame(i, { model: e.target.value })}>
              <option value="">{tr("بدون", "None")}</option>
              {models.map((m) => (
                <option key={m.kind} value={m.kind}>
                  {m.label[lang] || m.label.en}
                </option>
              ))}
            </select>
            <LinkPicker label={tr("الرابط", "Link")} value={g.href} onChange={(href) => setGame(i, { href }, `gameHref:${i}`)} categories={categories} />
            <div className="flex items-center gap-1">
              {g.imageUrl ? <img src={g.imageUrl} alt="" className="h-8 w-8 rounded object-cover" /> : null}
              <button type="button" className={btn} onClick={() => setPicking(i)}>{tr("صورة", "Picture")}</button>
              <button type="button" className={`${btn} text-red-300`} onClick={() => change((d) => ({ ...d, games: d.games.filter((_, j) => j !== i) }))} aria-label={tr("حذف", "Delete")}>×</button>
            </div>
          </div>
        ))}
        <button type="button" className={btn} disabled={games.length >= MAX_GAMES} onClick={() => change((d) => ({ ...d, games: [...d.games, { name: "", color: "#ff2bd6", href: "", imageUrl: "", model: "" }] }))} data-testid="stage-add-game">
          + {words.one}
        </button>
      </div>

      <button type="button" className={btn} onClick={() => change(() => themeDraft(theme, lang))} data-testid="stage-theme-own">
        {tr("رجوع لموديلات الثيم", "Back to the theme's own")}
      </button>
      <MediaLibraryModal open={picking !== null} onClose={() => setPicking(null)} title={words.picture} onSelect={(url) => { if (picking !== null) setGame(picking, { imageUrl: url }); setPicking(null); }} />
    </section>
  );
}
