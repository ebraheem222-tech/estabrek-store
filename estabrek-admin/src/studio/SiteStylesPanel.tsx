/**
 * The page editor's shared styles tab: H1–H6 and the body text, the three button kinds,
 * and named styles of each kind; the unpublished changes bar (publish to every page,
 * drop them, undo); and, beside an element, which shared style it takes (siteStyles.ts).
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../api/http";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { dropSiteStylesDraft, getSiteStyles, publishSiteStyles, saveSiteStylesDraft, type SiteStyle, type SiteStyleKind, type SiteStylesState } from "../api/siteStyles.api";
import { toast } from "../lib/toast";
import { tr } from "../lib/words";
import { AUTO, KIND_LABEL, autoFor, isAuto, kindFor, listOf, newStyleId, styleLabel, styleOf } from "./siteStyles";

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const control = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";

/** The shared styles as the editor changes them: the draft (or the published ones), with undo for this visit. */
export function useSiteStyles(onSaved: () => void | Promise<void>) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["site-styles"], queryFn: getSiteStyles, staleTime: 30_000 });
  const [past, setPast] = useState<SiteStyle[][]>([]);
  const [busy, setBusy] = useState(false);
  const styles = q.data?.draft ?? q.data?.styles ?? [];
  const run = async (fn: () => Promise<SiteStylesState>, failed: string) => {
    setBusy(true);
    try {
      qc.setQueryData(["site-styles"], await fn());
      await onSaved();
      return true;
    } catch (e) {
      toast.error(failed, { description: getApiErrorMessage(e) });
      return false;
    } finally {
      setBusy(false);
    }
  };
  return {
    loaded: q.isSuccess,
    failed: q.isError,
    styles,
    hasDraft: Boolean(q.data?.draft),
    busy,
    canUndo: past.length > 0,
    save: async (next: SiteStyle[]) => {
      const before = styles;
      if (await run(() => saveSiteStylesDraft(next), tr("ما انحفظ الستايل", "The style wasn't saved"))) setPast((p) => [...p.slice(-49), before]);
    },
    undo: async () => {
      const prev = past.at(-1);
      if (prev && (await run(() => saveSiteStylesDraft(prev), tr("ما انحفظ الستايل", "The style wasn't saved")))) setPast((p) => p.slice(0, -1));
    },
    publish: async () => {
      if (await run(publishSiteStyles, tr("ما انتشرت الستايلات", "The styles weren't published"))) {
        setPast([]);
        toast.success(tr("انتشرت الستايلات على كل الصفحات", "The styles are live on every page"));
      }
    },
    discard: async () => {
      if (await run(dropSiteStylesDraft, tr("ما انلغت التغييرات", "The changes weren't dropped"))) setPast([]);
    },
  };
}
export type SiteStylesHandle = ReturnType<typeof useSiteStyles>;

/** The styles tab: the changes bar, then each kind's styles; a click opens one in the panel beside the page. */
export function SiteStylesList({ ss, selected, canPublish, onPick }: { ss: SiteStylesHandle; selected: string | null; canPublish: boolean; onPick: (id: string) => void }) {
  const [adding, setAdding] = useState<SiteStyleKind | null>(null);
  const [name, setName] = useState("");
  const create = async (kind: SiteStyleKind) => {
    const n = name.trim();
    if (!n) return;
    const id = newStyleId(n, ss.styles);
    await ss.save([...ss.styles, { id, kind, name: n.slice(0, 40), style: {} }]);
    setAdding(null);
    setName("");
    onPick(id);
  };
  if (ss.failed) return <p className="px-2 text-xs text-red-300">{tr("ما قدرنا نجيب الستايلات.", "Couldn't load the styles.")}</p>;
  if (!ss.loaded) return <p className="px-2 text-xs text-white/40">{tr("عم نجيب الستايلات…", "Loading the styles…")}</p>;
  return (
    <div className="space-y-3" data-testid="studio-site-styles">
      <p className="px-1 text-[11px] leading-5 text-white/45">{tr("غيّر ستايل مرة، بيتغيّر بكل الصفحات. شكل العنصر الخاص بيضل أقوى منه.", "Change a style once and every page changes. An element's own look still wins over it.")}</p>
      {ss.hasDraft || ss.canUndo ? (
        <div className="space-y-2 rounded-xl border border-amber-300/30 bg-amber-300/[0.06] p-2" data-testid="studio-site-draft">
          {ss.hasDraft ? <p className="text-[11px] leading-5 text-amber-100/90">{tr("في تغييرات على الستايلات بتبيّن هون بس. انشرها لتوصل لكل الصفحات.", "There are style changes shown only here. Publish them to reach every page.")}</p> : null}
          <div className="flex flex-wrap gap-1">
            {ss.hasDraft ? (
              <button type="button" className="rounded-lg bg-accent-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-40" disabled={ss.busy || !canPublish} title={canPublish ? undefined : tr("النشر بدّه صلاحية نشر الصفحات", "Publishing needs the right to publish pages")} onClick={() => void ss.publish()} data-testid="studio-site-publish">
                {tr("انشر الستايلات", "Publish the styles")}
              </button>
            ) : null}
            {ss.canUndo ? <button type="button" className={btn} disabled={ss.busy} onClick={() => void ss.undo()} data-testid="studio-site-undo">{tr("تراجع", "Undo")}</button> : null}
            {ss.hasDraft ? <button type="button" className={`${btn} text-red-300`} disabled={ss.busy} onClick={() => void ss.discard()} data-testid="studio-site-discard">{tr("الغي التغييرات", "Drop the changes")}</button> : null}
          </div>
        </div>
      ) : null}
      {(Object.keys(AUTO) as SiteStyleKind[]).map((kind) => (
        <section key={kind} className="space-y-1" data-kind={kind}>
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-medium text-white/60">{KIND_LABEL[kind]()}</h3>
            <button type="button" className="text-[11px] text-accent-300 hover:underline disabled:opacity-40" disabled={ss.busy} onClick={() => setAdding(adding === kind ? null : kind)} data-testid={`studio-site-new-${kind}`}>
              + {tr("ستايل جديد", "New style")}
            </button>
          </div>
          {adding === kind ? (
            <form className="flex gap-1 px-1" onSubmit={(e) => { e.preventDefault(); void create(kind); }}>
              <input autoFocus className={control} placeholder={tr("اسمه (مثلاً: بطاقة)", "Its name (e.g. Card)")} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} data-testid="studio-site-new-name" />
              <button type="submit" className={btn} disabled={ss.busy || !name.trim()}>{tr("زيد", "Add")}</button>
            </form>
          ) : null}
          {listOf(ss.styles, kind).map((s) => {
            const saved = ss.styles.some((x) => x.id === s.id);
            return (
              <button key={s.id} type="button" onClick={() => onPick(s.id)} className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-start text-xs ${selected === s.id ? "bg-accent-500/25 text-white" : "text-white/75 hover:bg-white/[0.04]"}`} data-testid="studio-site-style" data-style={s.id}>
                <span className="truncate">{styleLabel(s)}</span>
                {saved ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-300" title={tr("فيه ستايل", "Has a style")} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/** The top of a style's panel: its name (a named one's can change), and remove or back to plain. */
export function SiteStyleHead({ s, ss, onGone }: { s: SiteStyle; ss: SiteStylesHandle; onGone: () => void }) {
  const [name, setName] = useState(s.name ?? "");
  const [was, setWas] = useState(s.name ?? "");
  if (was !== (s.name ?? "")) {
    setWas(s.name ?? "");
    setName(s.name ?? "");
  }
  const saved = ss.styles.some((x) => x.id === s.id);
  return (
    <div className="space-y-2" data-testid="studio-site-head" data-style={s.id}>
      <div className="text-[11px] text-white/45">{KIND_LABEL[s.kind]()}</div>
      {isAuto(s) ? (
        <div className="text-base font-semibold">{styleLabel(s)}</div>
      ) : (
        <input className={control} value={name} maxLength={40} disabled={ss.busy} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== s.name && void ss.save(ss.styles.map((x) => (x.id === s.id ? { ...x, name: name.trim() } : x)))} aria-label={tr("اسم الستايل", "The style's name")} data-testid="studio-site-name" />
      )}
      <p className="text-[11px] leading-5 text-white/40">
        {isAuto(s)
          ? s.kind === "button"
            ? tr("كل زر من هالنوع بالصفحات بياخده لحاله.", "Every button of this kind on the pages takes it by itself.")
            : s.id === "body"
              ? tr("كل نص عادي بالصفحات بياخده لحاله.", "All body text on the pages takes it by itself.")
              : tr("كل عنوان من هالمستوى بالصفحات بياخده لحاله.", "Every heading of this level on the pages takes it by itself.")
          : tr("بياخده العنصر اللي بتختاره له (من لوحة العنصر).", "An element takes it when it's chosen for it (in the element's panel).")}
      </p>
      {saved ? (
        <button type="button" className={`${btn} text-red-300`} disabled={ss.busy} onClick={() => { void ss.save(ss.styles.filter((x) => x.id !== s.id)); if (!isAuto(s)) onGone(); }} data-testid="studio-site-remove">
          {isAuto(s) ? tr("رجوع لشكل التصميم", "Back to the design's look") : tr("احذف الستايل", "Delete the style")}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Beside an element: the shared style it takes by itself (heading level, body text, button
 * kind), the named style it takes, and turning its own look into a new named style.
 */
export function StylePickPanel({ node, ss, busy, onOps, onEdit }: {
  node: PageTreeNode; ss: SiteStylesHandle; busy: boolean;
  onOps: (label: string, ops: PageDraftOp[]) => void;
  /** Opens a style in the styles tab. */
  onEdit: (id: string) => void;
}) {
  const kind = kindFor(node.type);
  const named = ss.styles.filter((s) => s.kind === kind && !isAuto(s));
  const current = typeof node.props?.styleId === "string" ? (node.props.styleId as string) : "";
  const auto = autoFor(node);
  const hasOwn = Boolean(node.style && Object.keys(node.style).length);
  const setRef = (id: string) => onOps(tr("الستايل المشترك", "Shared style"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, styleId: id || undefined } }]);
  // Its own look becomes a named style it takes; its own look is then cleared, so the style is what shows.
  const makeStyle = async () => {
    const label = tr("ستايل جديد", "New style");
    const id = newStyleId("", ss.styles);
    await ss.save([...ss.styles, { id, kind, name: `${label} ${named.length + 1}`, style: (node.style ?? {}) as SiteStyle["style"] }]);
    onOps(tr("ستايل من العنصر", "Style from the element"), [
      { op: "setProps", nodeId: node.id, props: { ...node.props, styleId: id } },
      ...(["base", "tablet", "mobile"] as const).map((screen): PageDraftOp => ({ op: "setStyle", nodeId: node.id, screen, style: null })),
    ]);
    onEdit(id);
  };
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] p-3" data-testid="studio-style-pick">
      <div className="text-xs font-medium text-white/70">{tr("ستايل مشترك", "Shared style")}</div>
      {auto ? (
        <p className="text-[11px] leading-5 text-white/45">
          {tr("بياخد لحاله:", "Takes by itself:")}{" "}
          <button type="button" className="text-accent-300 hover:underline" onClick={() => onEdit(auto)} data-testid="studio-style-auto">{styleLabel(styleOf(ss.styles, auto) ?? { id: auto, kind })}</button>
        </p>
      ) : null}
      <label className="block text-[11px] text-white/55">
        {tr("ستايل باسم", "A named style")}
        <select className={`${control} mt-1`} disabled={busy || ss.busy} value={current} onChange={(e) => setRef(e.target.value)} data-testid="studio-style-ref">
          <option value="">{tr("بلا", "None")}</option>
          {named.map((s) => <option key={s.id} value={s.id}>{styleLabel(s)}</option>)}
          {current && !named.some((s) => s.id === current) ? <option value={current}>{current}</option> : null}
        </select>
      </label>
      <div className="flex flex-wrap gap-1">
        {current ? <button type="button" className={btn} onClick={() => onEdit(current)}>{tr("عدّل الستايل", "Edit the style")}</button> : null}
        {hasOwn ? <button type="button" className={btn} disabled={busy || ss.busy} onClick={() => void makeStyle()} data-testid="studio-style-make">{tr("خلّي شكله ستايل مشترك", "Make its look a shared style")}</button> : null}
      </div>
    </div>
  );
}
