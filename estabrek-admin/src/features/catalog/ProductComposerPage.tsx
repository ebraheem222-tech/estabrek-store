// src/features/catalog/ProductComposerPage.tsx
// One screen to add a product: photos → name & category → price → sizes & quantity → save.
// Everything is saved in one go (see composer/saveProduct.ts); work in progress is kept
// on this device so closing the tab never loses it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { createSize, getProductFull, type CatalogSize } from "../../api/catalog.api";
import { uploadImages } from "../../api/uploads.api";
import { getApiErrorMessage } from "../../api/http";
import { useCategories, useSizes } from "../../hooks/useCatalog";
import { compressImage } from "../../lib/imageCompress";
import { detectPhotoColor, colorDistance, formatShekel, makeSlug, nearestFashionColor, parsePrice, presetForCategory, sizePresets } from "../../lib/productComposer";
import { toast } from "../../lib/toast";
import { env } from "../../config/env";
import { cn } from "../../components/ui/cn";
import {
  categoryLabel, checklist, clearLocalDraft, draftFromProduct, effectiveSlug, emptyDraft, hasContent, newKey, readLocalDraft,
  readPrefs, rememberChoices, saveDraftLocally, validateDraft, type ComposerDraft, type ComposerErrors, type ComposerPhoto,
} from "./composer/composerModel";
import { saveComposedProduct, type SaveStep } from "./composer/saveProduct";
import { PhotoColorsSection } from "./composer/PhotoColorsSection";
import { SizesStockSection } from "./composer/SizesStockSection";
import { Chip, Section, Swatch, Toggle } from "./composer/ui";
import { fieldCls } from "./composer/styles";

type Phase =
  | { kind: "editing" }
  | { kind: "saving"; step: "uploads" | SaveStep; publish: boolean }
  | { kind: "saved"; id: string; slug: string; published: boolean; title: string };

const SAME_COLOUR = 16; // Lab distance: photos closer than this go into the same colour

export default function ProductComposerPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const fromId = params.get("from");
  const categoriesQ = useCategories();
  const sizesQ = useSizes();
  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const sizes = useMemo(() => sizesQ.data ?? [], [sizesQ.data]);

  const [draft, setDraft] = useState<ComposerDraft>(() => emptyDraft({ defaultStock: readPrefs().defaultStock ?? "3" }));
  const [restore, setRestore] = useState<(ComposerDraft & { savedAt: number }) | null>(() => (fromId ? null : readLocalDraft()));
  const [errors, setErrors] = useState<ComposerErrors>({});
  const [phase, setPhase] = useState<Phase>({ kind: "editing" });
  const [loadingFrom, setLoadingFrom] = useState(Boolean(fromId));
  const createdId = useRef<string | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const update = useCallback((fn: (d: ComposerDraft) => ComposerDraft) => setDraft((d) => fn(d)), []);

  /* ---------------------------------------------- duplicate an existing product */
  useEffect(() => {
    if (!fromId) return;
    let alive = true;
    getProductFull(fromId)
      .then((p) => { if (alive) { setDraft(draftFromProduct(p, { keepPhotos: true, titleSuffix: " (نسخة)" })); toast.info("نسخنا المنتج: عدّلي ما يختلف ثم احفظي"); } })
      .catch((e) => toast.error("تعذّر نسخ المنتج", { description: getApiErrorMessage(e) }))
      .finally(() => alive && setLoadingFrom(false));
    return () => { alive = false; };
  }, [fromId]);

  /* ---------------------------------------------- keep work in progress */
  useEffect(() => {
    if (phase.kind !== "editing" || restore || !hasContent(draft)) return;
    const t = window.setTimeout(() => saveDraftLocally(draft), 500);
    return () => window.clearTimeout(t);
  }, [draft, phase.kind, restore]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      const busy = Object.values(draftRef.current.photos).some((p) => p.status === "queued" || p.status === "uploading");
      if (phase.kind === "saving" || busy) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase.kind]);

  /* ---------------------------------------------- category → remembered sizes */
  const presets = useMemo(() => sizePresets(sizes), [sizes]);
  const pickCategory = (id: string) => {
    update((d) => {
      if (d.sizeIds.length) return { ...d, categoryId: id };
      const remembered = (readPrefs().sizesByCategory[id] ?? []).filter((sid) => sizes.some((s) => s.id === sid));
      const cat = categories.find((c) => c.id === id);
      const parent = cat?.parentId ? categories.find((c) => c.id === cat.parentId) : null;
      const preset = presetForCategory(`${parent?.name ?? ""} ${cat?.name ?? ""}`, presets);
      return { ...d, categoryId: id, sizeIds: remembered.length ? remembered : preset?.sizeIds ?? [] };
    });
    setErrors((e) => ({ ...e, category: undefined }));
  };

  /* ---------------------------------------------- photos: detect colour, group, upload */
  const queue = useRef<string[]>([]);
  const files = useRef(new Map<string, File>());
  const active = useRef(0);

  const pump = useCallback(() => {
    while (active.current < 3 && queue.current.length) {
      const key = queue.current.shift()!;
      const file = files.current.get(key);
      if (!file) continue;
      active.current++;
      setDraft((d) => (d.photos[key] ? { ...d, photos: { ...d.photos, [key]: { ...d.photos[key], status: "uploading", error: undefined } } } : d));
      (async () => {
        try {
          const small = await compressImage(file, { maxW: 1800, maxH: 1800, quality: 0.86 }).catch(() => file);
          const res = await uploadImages([small], { folder: "products" });
          const url = res.files?.[0]?.url;
          if (!url) throw new Error("no url");
          setDraft((d) => (d.photos[key] ? { ...d, photos: { ...d.photos, [key]: { ...d.photos[key], url, status: "done" } } } : d));
          files.current.delete(key);
        } catch (e) {
          setDraft((d) => (d.photos[key] ? { ...d, photos: { ...d.photos, [key]: { ...d.photos[key], status: "error", error: getApiErrorMessage(e) } } } : d));
        } finally {
          active.current--;
          pump();
        }
      })();
    }
  }, []);

  const onFiles = useCallback(async (list: File[], targetGroup?: string) => {
    const added: ComposerPhoto[] = [];
    for (const file of list) {
      const key = newKey("p");
      const color = await detectPhotoColor(file);
      files.current.set(key, file);
      added.push({ key, preview: URL.createObjectURL(file), file, status: "queued", color });
    }
    setDraft((d) => {
      const photos = { ...d.photos };
      let groups = d.groups.map((g) => ({ ...g, photoKeys: [...g.photoKeys] }));
      for (const p of added) {
        photos[p.key] = p;
        let target = targetGroup ? groups.find((g) => g.key === targetGroup) : undefined;
        if (!target) target = groups.find((g) => !g.photoKeys.length && !g.hex);
        if (!target && p.color) {
          let best: { g: (typeof groups)[number]; d: number } | null = null;
          for (const g of groups) {
            if (!g.hex) continue;
            const dist = colorDistance(g.hex, p.color);
            if (dist < SAME_COLOUR && (!best || dist < best.d)) best = { g, d: dist };
          }
          target = best?.g;
        }
        if (!target && !p.color && groups.length) target = groups[groups.length - 1];
        if (!target) {
          target = { key: newKey("g"), name: p.color ? uniqueName(nearestFashionColor(p.color).name, groups.map((g) => g.name)) : groups.length ? "" : "لون واحد", hex: p.color ?? null, photoKeys: [] };
          groups = [...groups, target];
        }
        if (!target.hex && p.color) {
          target.hex = p.color;
          if (!target.nameTouched && !target.name) target.name = uniqueName(nearestFashionColor(p.color).name, groups.filter((g) => g !== target).map((g) => g.name));
        }
        target.photoKeys.push(p.key);
      }
      return { ...d, photos, groups };
    });
    queue.current.push(...added.map((p) => p.key));
    pump();
    setErrors((e) => ({ ...e, photos: undefined, colors: undefined }));
  }, [pump]);

  const retry = useCallback((key: string) => {
    if (!files.current.has(key)) return;
    queue.current.push(key);
    setDraft((d) => ({ ...d, photos: { ...d.photos, [key]: { ...d.photos[key], status: "queued", error: undefined } } }));
    pump();
  }, [pump]);

  // Paste photos straight from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const list = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (!list.length || phase.kind !== "editing") return;
      e.preventDefault();
      void onFiles(list);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles, phase.kind]);

  /* ---------------------------------------------- new sizes */
  const onCreateSize = async (name: string): Promise<CatalogSize | null> => {
    try {
      const created = await createSize({ name, active: true, order: sizes.length });
      await qc.invalidateQueries({ queryKey: ["catalog", "sizes"] });
      toast.success(`أضفنا مقاس ${name}`);
      return created as CatalogSize;
    } catch (e) {
      toast.error("تعذّر إضافة المقاس", { description: getApiErrorMessage(e) });
      return null;
    }
  };

  /* ---------------------------------------------- save */
  const save = async (publish: boolean) => {
    if (phase.kind === "saving") return;
    const found = validateDraft(draftRef.current, { publish });
    setErrors(found);
    const first = (["photos", "title", "category", "price", "compareAt", "sizes", "colors", "uploads"] as const).find((k) => found[k]);
    if (first) {
      const target = { photos: "photos", uploads: "photos", colors: "photos", title: "details", category: "details", price: "price", compareAt: "price", sizes: "sizes" }[first];
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error(found[first]!);
      return;
    }
    try {
      setPhase({ kind: "saving", step: "uploads", publish });
      // Wait for photos still uploading.
      for (let i = 0; i < 600; i++) {
        const p = Object.values(draftRef.current.photos);
        if (p.some((x) => x.status === "error")) throw new Error("بعض الصور لم تُرفع. أعيدي المحاولة أو احذفيها");
        if (p.every((x) => x.status === "done")) break;
        await new Promise((r) => setTimeout(r, 250));
      }
      const d = draftRef.current;
      const res = await saveComposedProduct({
        draft: d,
        sizes,
        publish,
        existingId: createdId.current,
        onStep: (step) => setPhase({ kind: "saving", step, publish }),
        onCreated: (id) => { createdId.current = id; },
      });
      rememberChoices(d);
      clearLocalDraft();
      createdId.current = null;
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
      setPhase({ kind: "saved", id: res.id, slug: res.slug, published: publish, title: d.title.trim() });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setPhase({ kind: "editing" });
      const description = isAxiosError(e) ? getApiErrorMessage(e) : e instanceof Error ? e.message : undefined;
      toast.error("لم يُحفظ المنتج", { description, durationMs: 7000 });
    }
  };

  // Ctrl/⌘+S saves a draft, Ctrl/⌘+Enter publishes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || phase.kind !== "editing") return;
      if (e.key.toLowerCase() === "s") { e.preventDefault(); void save(false); }
      if (e.key === "Enter") { e.preventDefault(); void save(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const startNew = (mode: "blank" | "similar") => {
    const prev = draftRef.current;
    files.current.clear();
    queue.current = [];
    setErrors({});
    setDraft(mode === "similar"
      ? emptyDraft({ categoryId: prev.categoryId, price: prev.price, onSale: prev.onSale, compareAt: prev.compareAt, sizeIds: prev.sizeIds, defaultStock: prev.defaultStock, lowStock: prev.lowStock, priceBySize: prev.priceBySize })
      : emptyDraft({ defaultStock: prev.defaultStock }));
    setPhase({ kind: "editing" });
    if (fromId) nav("/admin/catalog/products/new", { replace: true });
    window.scrollTo({ top: 0 });
  };

  /* ---------------------------------------------- render */
  const cat = categories.find((c) => c.id === draft.categoryId);
  const recent = readPrefs().recentCategories;
  const orderedCats = useMemo(() => {
    const byRecent = (id: string) => { const i = recent.indexOf(id); return i < 0 ? 99 : i; };
    return [...categories].sort((a, b) => byRecent(a.id) - byRecent(b.id) || categoryLabel(a, categories).localeCompare(categoryLabel(b, categories), "ar"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, phase.kind]);
  const [allCats, setAllCats] = useState(false);
  const shownCats = allCats ? orderedCats : orderedCats.slice(0, 10);
  const price = parsePrice(draft.price);
  const before = draft.onSale ? parsePrice(draft.compareAt) : null;
  const discount = price && before && before > price ? Math.round((1 - price / before) * 100) : null;

  if (phase.kind === "saved") {
    return <SavedPanel phase={phase} onNew={startNew} onEdit={() => nav(`/admin/catalog/products/${phase.id}`)} onList={() => nav("/admin/catalog/products")} />;
  }

  return (
    <div dir="rtl" className="mx-auto max-w-[1280px] pb-28 lg:pb-10" data-testid="product-composer">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/admin/catalog/products" className="text-xs text-white/50 hover:text-white">→ المنتجات</Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">{fromId ? "نسخ منتج" : "منتج جديد"}</h1>
          <p className="mt-1 text-sm text-white/55">الصور، الاسم، السعر، المقاسات — وحفظ واحد.</p>
        </div>
        <div className="hidden text-xs text-white/40 sm:block">Ctrl+S مسودة · Ctrl+Enter نشر</div>
      </div>

      {restore && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm">
          <span className="text-white/85">عندكِ منتج لم يكتمل{restore.title ? <> «<b>{restore.title}</b>»</> : null} من {timeAgo(restore.savedAt)}.</span>
          <div className="ms-auto flex gap-2">
            <button type="button" className="h-9 rounded-xl bg-accent-500 px-4 text-white hover:bg-accent-400" onClick={() => { setDraft(restore); setRestore(null); }}>متابعة</button>
            <button type="button" className="h-9 rounded-xl px-3 text-white/70 hover:bg-white/[0.06]" onClick={() => { clearLocalDraft(); setRestore(null); }}>بداية جديدة</button>
          </div>
        </div>
      )}

      {loadingFrom ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-white/60">جارٍ نسخ المنتج…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <PhotoColorsSection draft={draft} update={update} onFiles={(f, g) => void onFiles(f, g)} onRetry={retry} error={errors.photos || errors.colors || errors.uploads} />

            <Section id="details" step={2} title="الاسم والقسم" error={errors.title || errors.category}>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/55">اسم المنتج</span>
                <input
                  className={cn(fieldCls, "h-12 text-base", errors.title && "border-red-500/50")}
                  value={draft.title}
                  onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, title: v })); if (v.trim()) setErrors((x) => ({ ...x, title: undefined })); }}
                  placeholder="مثلاً: فستان كتان بأكمام واسعة"
                  aria-label="اسم المنتج"
                  autoFocus={!restore && !fromId}
                />
              </label>
              <div className="mt-4">
                <span className="mb-2 block text-xs text-white/55">القسم</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="القسم">
                  {shownCats.map((c) => (
                    <Chip key={c.id} active={c.id === draft.categoryId} onClick={() => pickCategory(c.id)}>{categoryLabel(c, categories)}</Chip>
                  ))}
                  {orderedCats.length > 10 && <Chip onClick={() => setAllCats((v) => !v)}>{allCats ? "أقل" : `+${orderedCats.length - 10} أقسام`}</Chip>}
                  {categoriesQ.isLoading && <span className="text-xs text-white/40">جارٍ التحميل…</span>}
                  {!categoriesQ.isLoading && !categories.length && <Link to="/admin/catalog/categories" className="text-sm text-accent-300">أضيفي قسماً أولاً</Link>}
                </div>
              </div>
              <Description value={draft.description} onChange={(v) => update((d) => ({ ...d, description: v }))} />
            </Section>

            <Section id="price" step={3} title="السعر" error={errors.price || errors.compareAt}>
              <div className="flex flex-wrap items-end gap-4">
                <label>
                  <span className="mb-1.5 block text-xs text-white/55">سعر البيع</span>
                  <div className="relative">
                    <input
                      className={cn(fieldCls, "h-12 w-40 ps-9 text-lg font-semibold", errors.price && "border-red-500/50")}
                      inputMode="decimal"
                      value={draft.price}
                      onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, price: v })); setErrors((x) => ({ ...x, price: undefined })); }}
                      placeholder="0"
                      aria-label="سعر البيع"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">₪</span>
                  </div>
                </label>
                <div className="pb-2.5"><Toggle checked={draft.onSale} onChange={(v) => update((d) => ({ ...d, onSale: v }))} label="عليها تخفيض" /></div>
                {draft.onSale && (
                  <label>
                    <span className="mb-1.5 block text-xs text-white/55">السعر قبل الخصم</span>
                    <div className="relative">
                      <input className={cn(fieldCls, "h-12 w-40 ps-9", errors.compareAt && "border-red-500/50")} inputMode="decimal" value={draft.compareAt} onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, compareAt: v })); setErrors((x) => ({ ...x, compareAt: undefined })); }} placeholder="0" aria-label="السعر قبل الخصم" />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40">₪</span>
                    </div>
                  </label>
                )}
                {discount ? <span className="mb-3 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">خصم {discount}%</span> : null}
              </div>
            </Section>

            <SizesStockSection draft={draft} update={update} sizes={sizes} onCreateSize={onCreateSize} error={errors.sizes} />

            <Advanced draft={draft} update={update} />
          </div>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Preview draft={draft} categoryName={cat ? categoryLabel(cat, categories) : ""} price={price} before={before && price && before > price ? before : null} />
            <div className="glass rounded-2xl p-4">
              <ul className="space-y-2 text-sm">
                {checklist(draft).map((c) => (
                  <li key={c.key} className={cn("flex items-center gap-2", c.done ? "text-white/80" : "text-white/45")}>
                    <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[11px]", c.done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.06]")}>{c.done ? "✓" : ""}</span>
                    {c.label}
                  </li>
                ))}
              </ul>
              <div className="mt-4 hidden gap-2 lg:grid">
                <SaveButtons phase={phase} onSave={save} />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Phones: the save buttons stay at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-surface-950/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-[1fr_auto] gap-2"><SaveButtons phase={phase} onSave={save} compact /></div>
      </div>

      {phase.kind === "saving" && <SavingOverlay step={phase.step} publish={phase.publish} photos={Object.values(draft.photos)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

function SaveButtons({ phase, onSave, compact }: { phase: Phase; onSave: (publish: boolean) => void; compact?: boolean }) {
  const busy = phase.kind === "saving";
  return (
    <>
      <button type="button" disabled={busy} onClick={() => onSave(true)} className="h-12 rounded-xl bg-accent-500 px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgb(var(--sk-accent-500,139_92_246)/0.8)] hover:bg-accent-400 disabled:opacity-60">
        {busy && phase.publish ? "جارٍ الحفظ…" : "نشر المنتج"}
      </button>
      <button type="button" disabled={busy} onClick={() => onSave(false)} className={cn("h-12 rounded-xl border border-white/[0.12] px-4 text-sm text-white/85 hover:bg-white/[0.06] disabled:opacity-60", compact && "px-3")}>
        {busy && !phase.publish ? "جارٍ الحفظ…" : "حفظ كمسودة"}
      </button>
    </>
  );
}

function Description({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [opened, setOpen] = useState(false);
  const open = opened || Boolean(value);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-4 text-sm text-accent-300 hover:text-accent-200">+ إضافة وصف (اختياري)</button>;
  return (
    <label className="mt-4 block">
      <span className="mb-1.5 block text-xs text-white/55">الوصف (اختياري)</span>
      <textarea className={cn(fieldCls, "h-24 resize-y py-2.5 leading-6")} value={value} onChange={(e) => onChange(e.target.value)} placeholder="القماش، القصة، نصيحة للمقاس…" aria-label="الوصف" />
    </label>
  );
}

function Advanced({ draft, update }: { draft: ComposerDraft; update: (fn: (d: ComposerDraft) => ComposerDraft) => void }) {
  const slug = effectiveSlug(draft);
  return (
    <details className="glass group rounded-2xl p-4 sm:p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-white/75">
        خيارات متقدمة
        <span className="text-xs text-white/40 group-open:hidden">رابط المنتج، رموز SKU، تنبيه المخزون</span>
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs text-white/55">رابط المنتج في المتجر</span>
          <div className="flex items-center gap-1 text-sm text-white/45" dir="ltr">
            /p/
            <input className={cn(fieldCls, "h-10")} dir="ltr" value={draft.slugTouched ? draft.slug : slug} onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, slug: v, slugTouched: true })); }} onBlur={() => update((d) => ({ ...d, slug: d.slugTouched ? makeSlug(d.slug || d.title) : d.slug }))} aria-label="رابط المنتج" />
          </div>
          <span className="mt-1 block text-[11px] text-white/40">يُكتب تلقائياً من الاسم. إذا كان مستخدماً نضيف له نهاية قصيرة.</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-white/55">تنبيه عند بقاء</span>
          <input className={cn(fieldCls, "h-10 w-24 text-center")} inputMode="numeric" value={draft.lowStock} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ""); update((d) => ({ ...d, lowStock: v })); }} aria-label="حد تنبيه المخزون" />
          <span className="mt-1 block text-[11px] text-white/40">قطع أو أقل من أي مقاس.</span>
        </label>
        <div className="sm:col-span-2 text-[11px] leading-5 text-white/40" dir="ltr">SKU: {slug.toUpperCase().slice(0, 24)}-COLOR-SIZE</div>
      </div>
    </details>
  );
}

function Preview({ draft, categoryName, price, before }: { draft: ComposerDraft; categoryName: string; price: number | null; before: number | null }) {
  const first = draft.groups.find((g) => g.photoKeys.length);
  const photo = first ? draft.photos[first.photoKeys[0]] : undefined;
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="px-4 pt-3 text-xs text-white/45">هكذا تظهر في المتجر</div>
      <div className="p-4 pt-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#f4ebe3]">
          {photo ? <img src={photo.preview} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-[#9b7b6a]">الصورة الرئيسية</div>}
          {before ? <span className="absolute right-3 top-3 rounded-full bg-[#7d2448] px-2.5 py-1 text-[11px] font-semibold text-white">−{Math.round((1 - (price ?? 0) / before) * 100)}%</span> : <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#7d2448]">جديد</span>}
        </div>
        <div className="mt-3 text-[11px] text-white/45">{categoryName || "القسم"}</div>
        <div className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{draft.title.trim() || "اسم المنتج"}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold text-accent-300">{formatShekel(price)}</span>
          {before ? <s className="text-xs text-white/40">{formatShekel(before)}</s> : null}
        </div>
        {draft.groups.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">{draft.groups.map((g) => <Swatch key={g.key} hex={g.hex} size={16} />)}</div>
        )}
      </div>
    </div>
  );
}

function SavingOverlay({ step, publish, photos }: { step: "uploads" | SaveStep; publish: boolean; photos: ComposerPhoto[] }) {
  const done = photos.filter((p) => p.status === "done").length;
  const steps: Array<{ key: "uploads" | SaveStep; label: string }> = [
    { key: "uploads", label: photos.length ? `رفع الصور ${done}/${photos.length}` : "تجهيز" },
    { key: "create", label: "إنشاء المنتج" },
    { key: "details", label: publish ? "حفظ الألوان والمقاسات ونشره" : "حفظ الألوان والمقاسات" },
  ];
  const at = steps.findIndex((s) => s.key === step);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="glass w-full max-w-sm rounded-2xl bg-surface-925 p-6">
        <div className="text-base font-semibold text-white">جارٍ حفظ المنتج…</div>
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={s.key} className={cn("flex items-center gap-3 text-sm", i < at ? "text-emerald-300" : i === at ? "text-white" : "text-white/35")}>
              <span className={cn("grid h-6 w-6 place-items-center rounded-full text-xs", i < at ? "bg-emerald-500/20" : i === at ? "bg-accent-500/25" : "bg-white/[0.06]")}>
                {i < at ? "✓" : i === at ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : i + 1}
              </span>
              {s.label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function SavedPanel({ phase, onNew, onEdit, onList }: { phase: Extract<Phase, { kind: "saved" }>; onNew: (mode: "blank" | "similar") => void; onEdit: () => void; onList: () => void }) {
  const storeUrl = `${env.VITE_STOREFRONT_BASE_URL.replace(/\/+$/, "")}/p/${encodeURIComponent(phase.slug)}`;
  return (
    <div dir="rtl" className="mx-auto max-w-xl py-10" data-testid="composer-saved">
      <div className="glass rounded-3xl p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl text-emerald-300">✓</div>
        <h1 className="mt-4 text-xl font-semibold text-white">{phase.published ? "نُشر المنتج" : "حُفظ كمسودة"}</h1>
        <p className="mt-1 text-sm text-white/60">«{phase.title}»</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => onNew("similar")} className="h-12 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-400">منتج مشابه</button>
          <button type="button" onClick={() => onNew("blank")} className="h-12 rounded-xl border border-white/[0.12] px-4 text-sm text-white/85 hover:bg-white/[0.06]">منتج جديد فارغ</button>
        </div>
        <p className="mt-2 text-[11px] text-white/40">«منتج مشابه» يحتفظ بالقسم والسعر والمقاسات — تضيفين الصور والاسم فقط.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm">
          <button type="button" onClick={onEdit} className="text-accent-300 hover:text-accent-200">فتح صفحة التعديل</button>
          {phase.published && <a href={storeUrl} target="_blank" rel="noreferrer" className="text-accent-300 hover:text-accent-200">عرض في المتجر ↗</a>}
          <button type="button" onClick={onList} className="text-white/60 hover:text-white">كل المنتجات</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ utils */

function uniqueName(name: string, taken: string[]) {
  if (!taken.includes(name)) return name;
  for (let i = 2; i < 20; i++) if (!taken.includes(`${name} ${i}`)) return `${name} ${i}`;
  return name;
}

function timeAgo(ts: number) {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return m === 1 ? "دقيقة" : m === 2 ? "دقيقتين" : m <= 10 ? `${m} دقائق` : `${m} دقيقة`;
  const h = Math.round(m / 60);
  return h === 1 ? "ساعة" : h === 2 ? "ساعتين" : h <= 10 ? `${h} ساعات` : `${h} ساعة`;
}
