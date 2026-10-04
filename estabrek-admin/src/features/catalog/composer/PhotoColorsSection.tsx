// Step 1: photos first. Photos are grouped into colours automatically; the
// owner fixes a name or moves a photo with one tap (works on phones too).
import React, { useMemo, useRef, useState } from "react";
import { cn } from "../../../components/ui/cn";
import { FASHION_COLORS, colorDistance, nearestFashionColor } from "../../../lib/productComposer";
import type { ColorGroup, ComposerDraft, ComposerPhoto } from "./composerModel";
import { newKey } from "./composerModel";
import { Section, Swatch } from "./ui";
import { fieldCls } from "./styles";

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
  const photoCount = Object.keys(draft.photos).length;
  const uploading = Object.values(draft.photos).filter((p) => p.status === "queued" || p.status === "uploading").length;

  const take = (list: FileList | null, group?: string) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files, group);
  };

  const setGroup = (key: string, patch: Partial<ColorGroup>) =>
    update((d) => ({ ...d, groups: d.groups.map((g) => (g.key === key ? { ...g, ...patch } : g)) }));

  const removeGroup = (key: string) =>
    update((d) => {
      const g = d.groups.find((x) => x.key === key);
      const photos = { ...d.photos };
      g?.photoKeys.forEach((k) => delete photos[k]);
      return { ...d, photos, groups: d.groups.filter((x) => x.key !== key) };
    });

  const addEmptyGroup = () =>
    update((d) => ({ ...d, groups: [...d.groups, { key: newKey("g"), name: d.groups.length ? "" : "لون واحد", hex: null, photoKeys: [] }] }));

  const mergeAll = () =>
    update((d) => {
      if (d.groups.length < 2) return d;
      const [first, ...rest] = d.groups;
      return { ...d, groups: [{ ...first, photoKeys: [...first.photoKeys, ...rest.flatMap((g) => g.photoKeys)] }] };
    });

  return (
    <Section
      id="photos"
      step={1}
      title="الصور والألوان"
      hint="اسحبي الصور هنا أو الصقيها (Ctrl+V). نقسّمها حسب اللون تلقائياً، وأول صورة في كل لون هي الصورة الرئيسية."
      error={error}
      aside={uploading ? <span className="rounded-full bg-accent-500/15 px-3 py-1 text-xs text-accent-200">جارٍ رفع {uploading} صور…</span> : null}
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
        <div className="text-sm text-white/80">{photoCount ? "أضيفي صوراً أخرى" : "ابدئي بصور المنتج"}</div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => pick.current?.click()} className="h-10 rounded-xl bg-accent-500 px-4 text-sm font-medium text-white hover:bg-accent-400">
            اختيار صور
          </button>
          <button type="button" onClick={() => camera.current?.click()} className="h-10 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 text-sm text-white/85 hover:bg-white/[0.08]">
            📷 تصوير بالكاميرا
          </button>
        </div>
        <input ref={pick} type="file" accept="image/*" multiple hidden onChange={(e) => { take(e.target.files); e.target.value = ""; }} data-testid="photo-input" />
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
      </div>

      {draft.groups.length > 0 && (
        <div className="mt-4 space-y-3">
          {draft.groups.map((g, gi) => (
            <GroupCard
              key={g.key}
              group={g}
              index={gi}
              draft={draft}
              onName={(name) => setGroup(g.key, { name, nameTouched: true })}
              onHex={(hex) => setGroup(g.key, { hex })}
              onRemove={() => removeGroup(g.key)}
              onFiles={(files) => take(files, g.key)}
              update={update}
              onRetry={onRetry}
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={addEmptyGroup} className="rounded-lg px-3 py-1.5 text-accent-300 hover:bg-accent-500/10">+ إضافة لون</button>
        {draft.groups.length > 1 && (
          <button type="button" onClick={mergeAll} className="rounded-lg px-3 py-1.5 text-white/60 hover:bg-white/[0.06] hover:text-white" title="إذا كل الصور لنفس اللون من زوايا مختلفة">
            كل الصور لون واحد
          </button>
        )}
      </div>
    </Section>
  );
}

function GroupCard({ group, index, draft, onName, onHex, onRemove, onFiles, update, onRetry }: {
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
      return { ...d, groups: groups.filter((g) => g.photoKeys.length || g.key === group.key || g.key === target) };
    });

  const makeMain = (photoKey: string) =>
    update((d) => ({ ...d, groups: d.groups.map((g) => (g.key === group.key ? { ...g, photoKeys: [photoKey, ...g.photoKeys.filter((k) => k !== photoKey)] } : g)) }));

  const removePhoto = (photoKey: string) =>
    update((d) => {
      const photos = { ...d.photos };
      delete photos[photoKey];
      return { ...d, photos, groups: d.groups.map((g) => ({ ...g, photoKeys: g.photoKeys.filter((k) => k !== photoKey) })) };
    });

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4" data-testid="color-group">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative cursor-pointer" title="تعديل اللون">
          <Swatch hex={group.hex} size={34} />
          <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={group.hex ?? "#cccccc"} onChange={(e) => onHex(e.target.value)} aria-label="لون العينة" />
        </label>
        <input
          className={cn(fieldCls, "h-10 max-w-[220px] flex-1")}
          value={group.name}
          onChange={(e) => onName(e.target.value)}
          placeholder={`اسم اللون ${index + 1}`}
          list={listId}
          aria-label={`اسم اللون ${index + 1}`}
        />
        <datalist id={listId}>{FASHION_COLORS.map((c) => <option key={c.code} value={c.name} />)}</datalist>
        <div className="flex flex-wrap gap-1">
          {suggestions.filter((s) => s.name !== group.name).slice(0, 4).map((s) => (
            <button key={s.code} type="button" onClick={() => { onName(s.name); if (!group.hex) onHex(s.hex); }} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-white/[0.08] px-2.5 text-xs text-white/70 hover:border-white/20 hover:text-white">
              <Swatch hex={s.hex} size={12} />{s.name}
            </button>
          ))}
        </div>
        <button type="button" onClick={onRemove} className="ms-auto rounded-lg px-2 py-1 text-xs text-red-300/80 hover:bg-red-500/10 hover:text-red-300" aria-label={`حذف اللون ${group.name || index + 1}`}>
          حذف اللون
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
        {group.photoKeys.map((k, i) => (
          <PhotoTile key={k} photo={draft.photos[k]} main={i === 0} groups={draft.groups} groupKey={group.key} onMain={() => makeMain(k)} onRemove={() => removePhoto(k)} onMove={(t) => movePhoto(k, t)} onRetry={() => onRetry(k)} />
        ))}
        <button type="button" onClick={() => add.current?.click()} className="grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-white/[0.14] text-xs text-white/50 hover:border-accent-400/60 hover:text-white" aria-label={`إضافة صور للون ${group.name || index + 1}`}>
          <span className="text-center leading-6"><span className="block text-xl">+</span>صور لهذا اللون</span>
        </button>
        <input ref={add} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </div>
    </div>
  );
}

function PhotoTile({ photo, main, groups, groupKey, onMain, onRemove, onMove, onRetry }: {
  photo?: ComposerPhoto;
  main: boolean;
  groups: ColorGroup[];
  groupKey: string;
  onMain: () => void;
  onRemove: () => void;
  onMove: (target: string) => void;
  onRetry: () => void;
}) {
  if (!photo) return null;
  const busy = photo.status === "queued" || photo.status === "uploading";
  return (
    <div className={cn("group relative aspect-[4/5] overflow-hidden rounded-xl border bg-black/20", main ? "border-accent-400/70" : "border-white/[0.08]")} data-testid="photo-tile">
      <img src={photo.preview} alt="" className="h-full w-full object-cover" draggable={false} />
      {main && <span className="absolute right-1.5 top-1.5 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-semibold text-white">الرئيسية</span>}
      {busy && (
        <div className="absolute inset-0 grid place-items-center bg-black/35">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label="جارٍ الرفع" />
        </div>
      )}
      {photo.status === "error" && (
        <div className="absolute inset-0 grid place-items-center bg-red-950/70 p-2 text-center text-[11px] text-red-100">
          <div>
            لم تُرفع
            <button type="button" onClick={onRetry} className="mt-1 block w-full rounded-md bg-white/15 py-1 hover:bg-white/25">إعادة</button>
          </div>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/75 to-transparent p-1.5 pt-6">
        {!main && (
          <button type="button" onClick={onMain} className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] text-white hover:bg-white/25" title="جعلها الصورة الرئيسية">★</button>
        )}
        <select
          value={groupKey}
          onChange={(e) => onMove(e.target.value)}
          className="min-w-0 flex-1 rounded-md border-0 bg-white/15 px-1 py-0.5 text-[10px] text-white focus:outline-none"
          aria-label="نقل الصورة إلى لون آخر"
        >
          {groups.map((g, i) => <option key={g.key} value={g.key} className="text-black">{g.name || `لون ${i + 1}`}</option>)}
          <option value="__new" className="text-black">لون جديد…</option>
        </select>
        <button type="button" onClick={onRemove} className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-500/70" aria-label="حذف الصورة">✕</button>
      </div>
    </div>
  );
}
