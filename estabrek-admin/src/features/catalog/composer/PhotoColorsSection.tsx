// Step 1: photos first. Photos are grouped into colours automatically; the
// owner fixes a name or moves a photo with one tap (works on phones too).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as AiAPI from "../../../api/ai.api";
import { getApiErrorMessage } from "../../../api/http";
import { toast } from "../../../lib/toast";
import { cn } from "../../../components/ui/cn";
import { useConfirm } from "../../../components/useConfirm";
import { FASHION_COLORS, colorDistance, nearestFashionColor } from "../../../lib/productComposer";
import type { ColorGroup, ComposerDraft, ComposerPhoto } from "./composerModel";
import { newKey } from "./composerModel";
import { Section, Swatch } from "./ui";
import { fieldCls } from "./styles";
import { tr } from "@/lib/words";
import { CutoutEditor } from "../../../components/media/CutoutEditor";
import { CutoutBatch } from "../../../components/media/CutoutBatch";
import { placeCutoutPhoto } from "../../../components/media/cutoutPlace";

type Props = {
  draft: ComposerDraft;
  update: (fn: (d: ComposerDraft) => ComposerDraft) => void;
  onFiles: (files: File[], targetGroup?: string) => void;
  onRetry: (photoKey: string) => void;
  error?: string;
};

export function PhotoColorsSection({ draft, update, onFiles, onRetry, error }: Props) {
  const pick = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  // AI photo studio (admin → الذكاء الاصطناعي): a clean background, added as a new photo.
  const ai = useQuery({ queryKey: ["ai-catalog-status"], queryFn: AiAPI.catalogAiStatus, staleTime: 60_000, retry: false });
  const studio = Boolean(ai.data?.photoStudio);
  const photoCount = Object.keys(draft.photos).length;
  const uploading = Object.values(draft.photos).filter((p) => p.status === "queued" || p.status === "uploading").length;

  const take = (list: FileList | null, group?: string) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files, group);
  };

  const setGroup = (key: string, patch: Partial<ColorGroup>) =>
    update((d) => ({ ...d, groups: d.groups.map((g) => (g.key === key ? { ...g, ...patch } : g)) }));

  // Asked inside the page: some phone browsers block confirm() and answer "no" silently.
  const [confirm, confirmDialog] = useConfirm();
  // The last deleted colour can be brought back for a few seconds.
  const [undo, setUndo] = useState<{ group: ColorGroup; photos: Record<string, ComposerPhoto>; index: number } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 12_000);
    return () => window.clearTimeout(t);
  }, [undo]);

  const removeGroup = async (key: string) => {
    const g = draft.groups.find((x) => x.key === key);
    if (!g) return;
    // A saved colour goes with its sizes and quantities: ask first.
    if (g.itemId) {
      const yes = await confirm({
        title: tr(`حذف اللون «${g.name || tr("بدون اسم", "untitled")}»؟`, "Delete the colour “{0}”?", [g.name || tr("بدون اسم", "untitled")]),
        message: tr("بتنحذف مقاساته وكمياته وصوره لما تنحفظ التغييرات. إذا عليه طلبات، بيتخبّى من المتجر بدل ما ينحذف، عشان الطلبات تضل سليمة.", "Its sizes, quantities and photos go when the changes are saved. If it has orders, it's hidden from the store instead of deleted, so the orders stay intact."),
        confirmText: tr("حذف اللون", "Delete colour"),
      });
      if (!yes) return;
    }
    // Photos still uploading can't come back (their upload is dropped).
    const kept = Object.fromEntries(g.photoKeys.map((k) => [k, draft.photos[k]] as const).filter(([, p]) => p && (p.url || p.status === "error")));
    setUndo({ group: { ...g, photoKeys: g.photoKeys.filter((k) => kept[k]) }, photos: kept, index: draft.groups.findIndex((x) => x.key === key) });
    update((d) => {
      const g = d.groups.find((x) => x.key === key);
      const photos = { ...d.photos };
      g?.photoKeys.forEach((k) => delete photos[k]);
      return { ...d, photos, groups: d.groups.filter((x) => x.key !== key) };
    });
  };

  const restoreGroup = () => {
    if (!undo) return;
    update((d) => {
      if (d.groups.some((g) => g.key === undo.group.key)) return d;
      const groups = [...d.groups];
      groups.splice(Math.min(undo.index, groups.length), 0, undo.group);
      return { ...d, photos: { ...d.photos, ...undo.photos }, groups };
    });
    setUndo(null);
  };

  const addEmptyGroup = () =>
    update((d) => ({ ...d, groups: [...d.groups, { key: newKey("g"), name: d.groups.length ? "" : "لون واحد", hex: null, photoKeys: [] }] }));

  const mergeAll = () =>
    update((d) => {
      if (d.groups.length < 2) return d;
      const [first, ...rest] = d.groups;
      return { ...d, groups: [{ ...first, photoKeys: [...first.photoKeys, ...rest.flatMap((g) => g.photoKeys)] }] };
    });

  // «شيل الخلفية»: the cut-out goes right after its photo in the same colour, or takes its
  // place (the original stays in the media library).
  const [cutoutKey, setCutoutKey] = useState<string | null>(null);
  const [cutoutAll, setCutoutAll] = useState(false);
  const cutoutUrl = (p?: ComposerPhoto) => (p && p.status !== "error" ? p.url ?? p.preview : "");
  const cutoutTarget = useMemo(() => {
    const url = cutoutKey ? cutoutUrl(draft.photos[cutoutKey]) : "";
    return url ? { url, folder: "products" } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutoutKey]);
  const cutoutTargets = useMemo(
    () => (cutoutAll ? draft.groups.flatMap((g) => g.photoKeys).filter((k) => cutoutUrl(draft.photos[k])).map((k) => ({ key: k, url: cutoutUrl(draft.photos[k]), folder: "products" })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cutoutAll],
  );
  const addCutout = (photoKey: string, url: string, replace: boolean) => update((d) => placeCutoutPhoto(d, photoKey, url, replace, newKey("p")));

  return (
    <Section
      id="photos"
      step={1}
      title={tr("الصور والألوان", "Photos and colours")}
      hint={tr("الصور بتنسحب هون أو بتنلصق (Ctrl+V). بتنقسم حسب اللون تلقائياً، وأول صورة بكل لون هي الصورة الرئيسية.", "Drag photos here or paste them (Ctrl+V). They're grouped by colour automatically; the first photo of each colour is its main photo.")}
      error={error}
      aside={uploading ? <span className="rounded-full bg-accent-500/15 px-3 py-1 text-xs text-accent-200">{tr("جارٍ رفع", "Uploading")} {uploading} {tr("صور…", "photos…")}</span> : null}
    >
      <div
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 text-center transition-all",
          photoCount ? "py-5" : "py-10",
          over ? "border-accent-400 bg-accent-500/10" : "border-white/[0.12] bg-white/[0.02]",
        )}
      >
        <div className="text-3xl" aria-hidden>🖼️</div>
        <div className="text-sm text-white/80">{photoCount ? tr("إضافة صور أخرى", "Add more photos") : tr("البداية بصور المنتج", "Start with the product's photos")}</div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => pick.current?.click()} className="h-11 rounded-xl bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-400 sm:h-10">
            {tr("اختيار صور", "Choose photos")}
          </button>
          <button type="button" onClick={() => camera.current?.click()} className="h-11 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 text-sm text-white/85 hover:bg-white/[0.08] sm:h-10">
            {tr("📷 تصوير بالكاميرا", "📷 Take a photo")}
          </button>
        </div>
        <input ref={pick} type="file" accept="image/*" multiple hidden onChange={(e) => { take(e.target.files); e.target.value = ""; }} data-testid="photo-input" />
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
      </div>

      {draft.groups.length > 0 && (
        <div className="mt-4 space-y-3">
          {draft.groups.map((g, gi) => (
            <GroupCard studio={studio} title={draft.title}
              key={g.key}
              group={g}
              index={gi}
              draft={draft}
              onName={(name) => setGroup(g.key, { name, nameTouched: true })}
              onHex={(hex) => setGroup(g.key, { hex })}
              onRemove={() => void removeGroup(g.key)}
              onFiles={(files) => take(files, g.key)}
              update={update}
              onRetry={onRetry}
              onCutout={setCutoutKey}
            />
          ))}
        </div>
      )}
      <CutoutEditor
        open={!!cutoutTarget}
        target={cutoutTarget}
        canReplace
        onClose={() => setCutoutKey(null)}
        onSaved={(picture, how) => cutoutKey && addCutout(cutoutKey, picture.url, how.replace)}
      />
      <CutoutBatch open={cutoutAll} targets={cutoutTargets} canReplace onClose={() => setCutoutAll(false)} onSaved={(key, picture, how) => addCutout(key, picture.url, how.replace)} />

      {undo ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white/80" role="status" data-testid="colour-undo">
          <span className="min-w-0 flex-1">
            {tr("انحذف اللون «", "Colour deleted “")}{undo.group.name || tr("بدون اسم", "untitled")}»{undo.group.photoKeys.length ? tr(` مع ${photosText(undo.group.photoKeys.length)}`, " with {0}", [photosText(undo.group.photoKeys.length)]) : ""}.
          </span>
          <button type="button" onClick={restoreGroup} className="h-10 rounded-xl bg-white/[0.08] px-4 font-medium text-white hover:bg-white/[0.14] sm:h-8">
            {tr("تراجع", "Undo")}
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={addEmptyGroup} className="h-10 rounded-xl px-3 text-accent-300 hover:bg-accent-500/10 sm:h-9">{tr("+ إضافة لون", "+ Add a colour")}</button>
        {draft.groups.length > 1 && !draft.edit && (
          <button type="button" onClick={mergeAll} className="h-10 rounded-xl px-3 text-white/60 hover:bg-white/[0.06] hover:text-white sm:h-9" title={tr("إذا كل الصور لنفس اللون من زوايا مختلفة", "When all the photos are one colour from different angles")}>
            {tr("كل الصور لون واحد", "All photos are one colour")}
          </button>
        )}
        {photoCount > 0 && (
          <button type="button" onClick={() => setCutoutAll(true)} className="h-10 rounded-xl px-3 text-white/70 hover:bg-white/[0.06] hover:text-white sm:h-9" data-testid="photos-cutout-all">
            {tr("✂ شيل الخلفية عن كل الصور", "✂ Remove the background from all photos")}
          </button>
        )}
      </div>
      {confirmDialog}
    </Section>
  );
}

function GroupCard({ group, index, draft, onName, onHex, onRemove, onFiles, update, onRetry, studio, title, onCutout }: {
  studio?: boolean;
  title?: string;
  onCutout?: (photoKey: string) => void;
  group: ColorGroup;
  index: number;
  draft: ComposerDraft;
  onName: (v: string) => void;
  onHex: (v: string) => void;
  onRemove: () => void;
  onFiles: (files: FileList | null) => void;
  update: Props["update"];
  onRetry: (k: string) => void;
}) {
  const add = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => {
    if (!group.hex) return FASHION_COLORS.slice(0, 5);
    return [...FASHION_COLORS].sort((a, b) => colorDistance(group.hex!, a.hex) - colorDistance(group.hex!, b.hex)).slice(0, 5);
  }, [group.hex]);
  const listId = `colors-${group.key}`;

  const movePhoto = (photoKey: string, target: string) =>
    update((d) => {
      let groups = d.groups.map((g) => ({ ...g, photoKeys: g.photoKeys.filter((k) => k !== photoKey) }));
      if (target === "__new") {
        const hex = d.photos[photoKey]?.color ?? null;
        groups = [...groups, { key: newKey("g"), name: hex ? nearestFashionColor(hex).name : "", hex, photoKeys: [photoKey] }];
      } else groups = groups.map((g) => (g.key === target ? { ...g, photoKeys: [...g.photoKeys, photoKey] } : g));
      // An emptied new colour goes away; a saved colour stays (it has sizes and stock).
      return { ...d, groups: groups.filter((g) => g.photoKeys.length || g.itemId || g.key === group.key || g.key === target) };
    });

  const makeMain = (photoKey: string) =>
    update((d) => ({ ...d, groups: d.groups.map((g) => (g.key === group.key ? { ...g, photoKeys: [photoKey, ...g.photoKeys.filter((k) => k !== photoKey)] } : g)) }));

  // The studio's photo goes right after the one it was made from, in the same colour.
  const addStudioPhoto = (afterKey: string, url: string) =>
    update((d) => {
      const key = newKey("p");
      const photos = { ...d.photos, [key]: { key, url, preview: url, status: "done" as const, color: d.photos[afterKey]?.color ?? null } };
      return { ...d, photos, groups: d.groups.map((g) => (g.key === group.key ? { ...g, photoKeys: g.photoKeys.flatMap((k) => (k === afterKey ? [k, key] : [k])) } : g)) };
    });

  const removePhoto = (photoKey: string) =>
    update((d) => {
      const photos = { ...d.photos };
      delete photos[photoKey];
      return { ...d, photos, groups: d.groups.map((g) => ({ ...g, photoKeys: g.photoKeys.filter((k) => k !== photoKey) })) };
    });

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4" data-testid="color-group">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative cursor-pointer" title={tr("تعديل اللون", "Edit colour")}>
          <Swatch hex={group.hex} size={34} />
          <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={group.hex ?? "#cccccc"} onChange={(e) => onHex(e.target.value)} aria-label={tr("لون العينة", "Swatch colour")} />
        </label>
        <input
          className={cn(fieldCls, "h-10 max-w-[220px] flex-1")}
          value={group.name}
          onChange={(e) => onName(e.target.value)}
          placeholder={tr(`اسم اللون ${index + 1}`, "Colour name {0}", [index + 1])}
          list={listId}
          aria-label={tr(`اسم اللون ${index + 1}`, "Colour name {0}", [index + 1])}
        />
        <datalist id={listId}>{FASHION_COLORS.map((c) => <option key={c.code} value={c.name} />)}</datalist>
        <div className="flex flex-wrap gap-1">
          {suggestions.filter((s) => s.name !== group.name).slice(0, 4).map((s) => (
            <button key={s.code} type="button" onClick={() => { onName(s.name); if (!group.hex) onHex(s.hex); }} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.08] px-3 text-xs text-white/70 hover:border-white/20 hover:text-white sm:h-7 sm:px-2.5">
              <Swatch hex={s.hex} size={12} />{s.name}
            </button>
          ))}
        </div>
        <button type="button" onClick={onRemove} className="ms-auto inline-flex h-10 items-center gap-1.5 rounded-xl border border-red-500/25 px-3 text-sm text-red-300 hover:bg-red-500/10 sm:h-8 sm:border-transparent sm:px-2 sm:text-xs" aria-label={tr(`حذف اللون ${group.name || index + 1}`, "Delete colour {0}", [group.name || index + 1])}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
          {tr("حذف اللون", "Delete colour")}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {group.photoKeys.map((k, i) => (
          <PhotoTile key={k} photo={draft.photos[k]} main={i === 0} groups={draft.groups} groupKey={group.key} onMain={() => makeMain(k)} onRemove={() => removePhoto(k)} onMove={(t) => movePhoto(k, t)} onRetry={() => onRetry(k)} studio={studio} title={title} onStudio={(url) => addStudioPhoto(k, url)} onCutout={onCutout ? () => onCutout(k) : undefined} />
        ))}
        <button type="button" onClick={() => add.current?.click()} className="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-white/[0.14] text-xs text-white/50 hover:border-accent-400/60 hover:text-white" aria-label={tr(`إضافة صور للون ${group.name || index + 1}`, "Add photos to colour {0}", [group.name || index + 1])}>
          <span className="text-center leading-6"><span className="block text-xl">+</span>{tr("صور لهذا اللون", "Photos for this colour")}</span>
        </button>
        <input ref={add} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </div>
    </div>
  );
}

/** "صورة", "صورتين", "3 صور", "12 صورة". */
const photosText = (n: number) => (n === 1 ? tr("صورة", "1 photo") : n === 2 ? tr("صورتين", "2 photos") : tr(n <= 10 ? `${n} صور` : `${n} صورة`, "{0} photos", [n]));

// Photo buttons: finger-sized on phones, small on a computer.
const tileBtn = "grid h-9 min-w-9 place-items-center rounded-lg bg-white/15 px-1.5 text-sm text-white hover:bg-white/25 sm:h-6 sm:min-w-6 sm:rounded-md sm:text-[10px]";

function PhotoTile({ photo, main, groups, groupKey, onMain, onRemove, onMove, onRetry, studio, title, onStudio, onCutout }: {
  studio?: boolean;
  title?: string;
  onStudio?: (url: string) => void;
  onCutout?: () => void;
  photo?: ComposerPhoto;
  main: boolean;
  groups: ColorGroup[];
  groupKey: string;
  onMain: () => void;
  onRemove: () => void;
  onMove: (target: string) => void;
  onRetry: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [making, setMaking] = useState(false);
  if (!photo) return null;
  const busy = photo.status === "queued" || photo.status === "uploading";
  const make = async (style: "white" | "studio" | "soft") => {
    if (!photo.url) return;
    setMenu(false);
    setMaking(true);
    try {
      const out = await AiAPI.photoStudio({ imageUrl: photo.url, style, title });
      onStudio?.(out.url);
      toast.success(tr("انضافت صورة جديدة بخلفية نظيفة — الأصلية ضلّت", "A new photo with a clean background was added — the original stays"));
    } catch (e) {
      toast.error(tr("ما زبطت الصورة", "The photo didn't work"), { description: getApiErrorMessage(e) });
    } finally {
      setMaking(false);
    }
  };
  return (
    <div className={cn("group relative aspect-[4/5] overflow-hidden rounded-xl border bg-black/20", main ? "border-accent-400/70" : "border-white/[0.08]")} data-testid="photo-tile">
      <img src={photo.preview} alt="" className="h-full w-full object-cover" draggable={false} />
      {main && <span className="absolute start-1.5 top-1.5 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-semibold text-white">{tr("الرئيسية", "Main")}</span>}
      {busy && (
        <div className="absolute inset-0 grid place-items-center bg-black/35">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label={tr("جارٍ الرفع", "Uploading")} />
        </div>
      )}
      {making && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 p-2 text-center text-[11px] text-white">
          <span><span className="mx-auto mb-1 block h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />{tr("عم نجهّز الخلفية… (لحد دقيقة)", "Preparing the background… (up to a minute)")}</span>
        </div>
      )}
      {menu && (
        <div className="absolute inset-x-1 top-1 z-10 grid gap-1 rounded-lg bg-black/85 p-1.5 text-[11px]" role="menu" aria-label={tr("خلفية جديدة", "New background")}>
          {([["white", tr("خلفية بيضا", "White background")], ["studio", tr("استوديو فاتح", "Light studio")], ["soft", tr("زهري ناعم", "Soft pink")]] as const).map(([k, l]) => (
            <button key={k} type="button" role="menuitem" onClick={() => void make(k)} className="min-h-8 rounded-md bg-white/10 px-2 py-1 text-white hover:bg-white/20">{l}</button>
          ))}
          <button type="button" onClick={() => setMenu(false)} className="min-h-8 rounded-md px-2 py-1 text-white/60 hover:text-white">{tr("إلغاء", "Cancel")}</button>
        </div>
      )}
      {photo.status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-red-950/70 p-2 text-center text-[11px] text-red-100">
          <div>
            {tr("لم تُرفع", "Not uploaded")}
            <button type="button" onClick={onRetry} className="mt-1 block min-h-9 w-full rounded-md bg-white/15 py-1 hover:bg-white/25">{tr("إعادة", "Retry")}</button>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/75 to-transparent p-1.5 pt-8 sm:pt-6">
        {!main && (
          <button type="button" onClick={onMain} className={tileBtn} title={tr("جعلها الصورة الرئيسية", "Make it the main photo")} aria-label={tr("جعلها الصورة الرئيسية", "Make it the main photo")}>★</button>
        )}
        <select
          value={groupKey}
          onChange={(e) => onMove(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border-0 bg-white/15 px-1 text-xs text-white focus:outline-none sm:h-6 sm:rounded-md sm:text-[10px]"
          aria-label={tr("نقل الصورة إلى لون آخر", "Move the photo to another colour")}
        >
          {groups.map((g, i) => <option key={g.key} value={g.key} className="text-black">{g.name || tr(`لون ${i + 1}`, "Colour {0}", [i + 1])}</option>)}
          <option value="__new" className="text-black">{tr("لون جديد…", "New colour…")}</option>
        </select>
        {onCutout && photo.status !== "error" && !making ? (
          <button type="button" onClick={onCutout} className={cn(tileBtn, "hover:bg-accent-500/70")} title={tr("شيل الخلفية", "Remove background")} aria-label={tr("شيل الخلفية", "Remove background")} data-testid="photo-cutout">✂</button>
        ) : null}
        {studio && photo.url && !making ? (
          <button type="button" onClick={() => setMenu((v) => !v)} className={cn(tileBtn, "hover:bg-accent-500/70")} title={tr("خلفية نظيفة بالذكاء الاصطناعي", "Clean background with AI")} aria-label={tr("خلفية نظيفة بالذكاء الاصطناعي", "Clean background with AI")}>✨</button>
        ) : null}
        <button type="button" onClick={onRemove} className={cn(tileBtn, "hover:bg-red-500/70")} aria-label={tr("حذف الصورة", "Delete photo")}>✕</button>
      </div>
    </div>
  );
}
