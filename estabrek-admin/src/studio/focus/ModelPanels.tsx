/**
 * A 3D model in focus mode (docs/cms-big-engine-plan.ar.md A5):
 *  - ModelPartPanel: one of its parts (picked on the canvas or in the list): colour, roughness, metal, a glow, hidden;
 *  - ModelViewsPanel: a view chosen with an angle around it, a height and a distance (shown live in the page), saved;
 *    the saved views, and when the camera goes from one to the next (a click, by itself, the scroll);
 *  - ModelSpotsPanel: its labelled points (with the pen on, a click on the model adds one where it's clicked), their
 *    words in the page's language and a link.
 * The shop reads the same props (pageTree/model3dLive.ts); the backend checks them.
 */
import { useEffect, useRef, useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../../api/pages.api";
import type { Lang } from "../../lib/lang";
import { Range } from "../LookPanels";
import { say } from "../say";

type Ops = (label: string, ops: PageDraftOp[]) => void;
export type PartLook = { color?: string; rough?: number; metal?: number; glow?: string; hide?: boolean };
export type ModelPartInfo = { key: string; label: string; color: string | null; rough: number | null; metal: number | null; hidden: boolean };
export type View3d = { id: string; az: number; el: number; dist: number };
export type Spot3d = { id: string; at: [number, number, number]; label?: Record<string, string>; href?: string };

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-[11px] hover:bg-white/[0.1] disabled:opacity-40";
const input = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1 text-xs text-white";
const box = "space-y-2 rounded-xl border border-accent-400/30 p-3";
let seq = 0;
const newId = (k: string) => `${k}${Date.now().toString(36)}${(seq++).toString(36)}`;
const propsOf = (node: PageTreeNode) => (node.props ?? {}) as Record<string, unknown>;

export function ModelPartPanel({ node, part, busy, onOps }: { node: PageTreeNode; part: ModelPartInfo; busy: boolean; onOps: Ops }) {
  const props = propsOf(node);
  const looks = (props.parts as Record<string, PartLook> | undefined) ?? {};
  const look = looks[part.key] ?? {};
  const save = (patch: Partial<PartLook>) => {
    if (busy) return;
    const next = { ...look, ...patch };
    for (const k of Object.keys(next) as Array<keyof PartLook>) if (next[k] === undefined) delete next[k];
    const parts = { ...looks };
    if (Object.keys(next).length) parts[part.key] = next;
    else delete parts[part.key];
    onOps(say("جزء المجسّم|A part of the model|חלק במודל"), [{ op: "setProps", nodeId: node.id, props: { ...props, parts: Object.keys(parts).length ? parts : undefined } }]);
  };
  const colour = look.color ?? part.color ?? "#cccccc";
  return (
    <div className={box} data-testid="studio-model-part" data-part={part.key}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-xs font-medium text-white/80">{part.label || part.key}</div>
        <button type="button" className={btn} disabled={busy} onClick={() => save({ hide: look.hide ? undefined : true })} data-testid="studio-model-hide">{look.hide ? say("إظهار|Show|הצגה") : say("إخفاء|Hide|הסתרה")}</button>
      </div>
      <label className="flex items-center justify-between gap-2 text-[11px] text-white/55">
        {say("اللون|Colour|צבע")}
        <input type="color" disabled={busy} defaultValue={colour.length === 7 ? colour : "#cccccc"} key={colour} onBlur={(e) => { if (e.target.value !== colour) save({ color: e.target.value }); }} data-testid="studio-model-colour" />
      </label>
      <Range label={say("خشونة (مطفي ← لامع)|Roughness (shiny ← matte)|חספוס")} min={0} max={1} step={0.05} busy={busy} value={look.rough ?? part.rough ?? 0.5} onSave={(v) => save({ rough: v })} testId="studio-model-rough" />
      <Range label={say("معدن|Metal|מתכת")} min={0} max={1} step={0.05} busy={busy} value={look.metal ?? part.metal ?? 0} onSave={(v) => save({ metal: v })} testId="studio-model-metal" />
      <label className="flex items-center justify-between gap-2 text-[11px] text-white/55">
        {say("توهّج|Glow|זוהר")}
        <span className="flex items-center gap-1">
          <input type="color" disabled={busy} defaultValue={look.glow ?? "#000000"} key={look.glow ?? "none"} onBlur={(e) => { if (e.target.value !== (look.glow ?? "#000000")) save({ glow: e.target.value === "#000000" ? undefined : e.target.value }); }} data-testid="studio-model-glow" />
          {look.glow ? <button type="button" className={btn} disabled={busy} onClick={() => save({ glow: undefined })}>×</button> : null}
        </span>
      </label>
      {Object.keys(look).length ? <button type="button" className={btn} disabled={busy} onClick={() => { const parts = { ...looks }; delete parts[part.key]; onOps(say("جزء المجسّم|A part of the model|חלק במודל"), [{ op: "setProps", nodeId: node.id, props: { ...props, parts: Object.keys(parts).length ? parts : undefined } }]); }} data-testid="studio-model-reset">{say("رجّعه متل ما كان|Back as it was|חזרה למקור")}</button> : null}
    </div>
  );
}

export function ModelViewsPanel({ node, busy, onOps, onPreview }: { node: PageTreeNode; busy: boolean; onOps: Ops; onPreview: (view: Omit<View3d, "id"> | null) => void }) {
  const props = propsOf(node);
  const views = (props.views as View3d[] | undefined) ?? [];
  const [v, setV] = useState({ az: 30, el: 15, dist: Number((props.camera as { distance?: number } | undefined)?.distance ?? 6.2) });
  const shown = useRef(false);
  const show = (next: typeof v) => {
    setV(next);
    shown.current = true;
    onPreview(next);
  };
  // The page's own camera again when the panel closes.
  useEffect(() => () => { if (shown.current) onPreview(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (next: View3d[], viewOn?: string) => onOps(say("مناظر المجسّم|The model's views|מבטי המודל"), [{ op: "setProps", nodeId: node.id, props: { ...props, views: next.length ? next : undefined, ...(viewOn !== undefined ? { viewOn: viewOn === "click" ? undefined : viewOn } : {}) } }]);
  return (
    <div className={box} data-testid="studio-model-views" data-count={views.length}>
      <div className="text-xs font-medium text-white/80">🎥 {say("مناظر الكاميرا|Camera views|מבטי מצלמה")} · {views.length}</div>
      <Range label={say("حوالينه|Around it|סביבו")} unit="°" min={-180} max={180} step={1} busy={busy} value={v.az} onLive={(az) => show({ ...v, az })} onSave={(az) => show({ ...v, az })} testId="studio-model-az" />
      <Range label={say("الارتفاع|Height|גובה")} unit="°" min={-80} max={80} step={1} busy={busy} value={v.el} onLive={(el) => show({ ...v, el })} onSave={(el) => show({ ...v, el })} testId="studio-model-el" />
      <Range label={say("البعد|Distance|מרחק")} min={2} max={20} step={0.1} busy={busy} value={v.dist} onLive={(dist) => show({ ...v, dist })} onSave={(dist) => show({ ...v, dist })} testId="studio-model-dist" />
      <button type="button" className="w-full rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40" disabled={busy || views.length >= 8} onClick={() => save([...views, { id: newId("v"), az: Math.round(v.az), el: Math.round(v.el), dist: Math.round(v.dist * 10) / 10 }])} data-testid="studio-model-save-view">
        + {say("احفظ هالمنظر|Save this view|שמור מבט זה")}
      </button>
      {views.length ? (
        <ul className="space-y-1">
          {views.map((x, i) => (
            <li key={x.id} className="flex items-center gap-1 text-[11px]" data-testid="studio-model-view">
              <button type="button" className={`${btn} flex-1 text-start`} onClick={() => show({ az: x.az, el: x.el, dist: x.dist })}>{i + 1}. {x.az}° · {x.el}° · {x.dist}</button>
              <button type="button" className={btn} disabled={busy} onClick={() => save(views.filter((y) => y.id !== x.id))} aria-label={say("شيل|Remove|הסר")}>×</button>
            </li>
          ))}
        </ul>
      ) : null}
      {views.length > 1 ? (
        <label className="block text-[11px] text-white/55">
          {say("إمتى بتتنقّل الكاميرا|When the camera moves on|מתי המצלמה עוברת")}
          <select className={input} disabled={busy} value={String(props.viewOn ?? "click")} onChange={(e) => save(views, e.target.value)} data-testid="studio-model-viewon">
            <option value="click">{say("بالكبسة على المجسّم|On a click on the model|בלחיצה על המודל")}</option>
            <option value="auto">{say("لحالها كل كم ثانية|By itself every few seconds|לבד כל כמה שניות")}</option>
            <option value="scroll">{say("مع السكرول|With the scroll|עם הגלילה")}</option>
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function ModelSpotsPanel({ node, lang, busy, onOps, pen, onPen }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops; pen: boolean; onPen: (on: boolean) => void }) {
  const props = propsOf(node);
  const spots = (props.spots as Spot3d[] | undefined) ?? [];
  const save = (next: Spot3d[]) => onOps(say("نقاط المجسّم|The model's points|נקודות המודל"), [{ op: "setProps", nodeId: node.id, props: { ...props, spots: next.length ? next : undefined } }]);
  const set = (id: string, patch: Partial<Spot3d>) => save(spots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  return (
    <div className={box} data-testid="studio-model-spots" data-count={spots.length}>
      <div className="text-xs font-medium text-white/80">📍 {say("نقاط عليها كلام|Labelled points|נקודות עם כיתוב")} · {spots.length}</div>
      <label className="flex items-center gap-2 text-[11px] text-white/70">
        <input type="checkbox" checked={pen} onChange={(e) => { onPen(e.target.checked); e.currentTarget.blur(); }} data-testid="studio-model-pen" />
        {say("كبسة على المجسّم بتزيد نقطة هناك|A click on the model adds a point there|לחיצה על המודל מוסיפה נקודה")}
      </label>
      {spots.map((s, i) => (
        <div key={s.id} className="space-y-1 rounded-lg border border-white/[0.08] p-2" data-testid="studio-model-spot">
          <div className="flex items-center justify-between text-[11px] text-white/55">
            <span>{say("نقطة|Point|נקודה")} {i + 1}</span>
            <button type="button" className={btn} disabled={busy} onClick={() => save(spots.filter((x) => x.id !== s.id))} aria-label={say("شيل|Remove|הסר")}>×</button>
          </div>
          <input className={input} dir="auto" maxLength={80} disabled={busy} defaultValue={s.label?.[lang] ?? ""} key={`${s.id}:${lang}`} placeholder={say("كلامها|Its words|המילים")} onBlur={(e) => { if (e.target.value !== (s.label?.[lang] ?? "")) set(s.id, { label: { ...(s.label ?? {}), [lang]: e.target.value } }); }} data-testid="studio-model-spot-label" />
          <input className={input} dir="ltr" disabled={busy} defaultValue={s.href ?? ""} key={`${s.id}:href`} placeholder="/shop" onBlur={(e) => { const href = e.target.value.trim(); if (href !== (s.href ?? "") && (!href || /^(\/(?!\/)|#|https?:\/\/)/.test(href))) set(s.id, { href: href || undefined }); }} data-testid="studio-model-spot-href" />
        </div>
      ))}
    </div>
  );
}
