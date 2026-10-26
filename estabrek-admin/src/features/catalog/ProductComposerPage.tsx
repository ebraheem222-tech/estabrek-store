// src/features/catalog/ProductComposerPage.tsx
// One screen to add or edit a product: photos → name & category → price → sizes, SKUs &
// quantity → save. Everything is saved in one go (see composer/saveProduct.ts). A new
// product in progress is kept on this device so closing the tab never loses it; an
// existing product (/catalog/products/:id) keeps every saved id, so a save updates it.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { createSize, describeSaveError, getProductFull, type CatalogSize } from "../../api/catalog.api";
import { uploadImages } from "../../api/uploads.api";
import { getApiErrorMessage } from "../../api/http";
import { useCategories, useSizes } from "../../hooks/useCatalog";
import { compressImage } from "../../lib/imageCompress";
import { detectPhotoColor, colorDistance, formatMoney, makeSlug, nearestFashionColor, parsePrice, presetForCategory, sizePresets } from "../../lib/productComposer";
import { toast } from "../../lib/toast";
import { env } from "../../config/env";
import { cn } from "../../components/ui/cn";
import {
  categoryLabel, checklist, clearLocalDraft, draftForEdit, draftFromProduct, draftSignature, effectiveSlug, emptyDraft, deliveryForSave, deliveryProblem, eventForSave, protectionForSave, protectionProblem, hasContent, newKey, readLocalDraft,
  readPrefs, rememberChoices, saveDraftLocally, validateDraft, type ComposerDraft, type ComposerErrors, type ComposerPhoto,
} from "./composer/composerModel";
import { saveComposedProduct, saveEditedProduct, type SaveStep, type TypedValues } from "./composer/saveProduct";
import { TypeFieldsBlock } from "./composer/TypeFieldsBlock";
import { TranslationsBlock } from "./composer/TranslationsBlock";
import { AiWriter } from "./composer/AiWriter";
import { listProductTypes } from "../../api/productTypes.api";
import { missingRequired, tidyAttributes } from "./types/typeText";
import { PhotoColorsSection } from "./composer/PhotoColorsSection";
import { SizesStockSection } from "./composer/SizesStockSection";
import { SpinSection } from "./composer/SpinSection";
import { Chip, Section, Swatch, Toggle } from "./composer/ui";
import { fieldCls } from "./composer/styles";
import { GooglePreview } from "../settings/settingsCentre";
import { currencySign } from "../../lib/money";
import { storeHost, storeNameOf } from "../../lib/storeIdentity";
import { useSettings } from "../../hooks/useSettings";
import { tr } from "@/lib/words";

type Phase =
  | { kind: "editing" }
  | { kind: "saving"; step: "uploads" | SaveStep; publish: boolean }
  | { kind: "saved"; id: string; slug: string; published: boolean; title: string; digital?: boolean };

const SAME_COLOUR = 16; // Lab distance: photos closer than this go into the same colour

export default function ProductComposerPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const { id: editId } = useParams<{ id?: string }>();
  const isEdit = Boolean(editId);
  const fromId = isEdit ? null : params.get("from");
  const categoriesQ = useCategories();
  const sizesQ = useSizes();
  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const sizes = useMemo(() => sizesQ.data ?? [], [sizesQ.data]);
  // Kinds of products and their fields (أنواع المنتجات); a draft without a kind uses the first one.
  const typesQ = useQuery({ queryKey: ["product-types"], queryFn: listProductTypes, staleTime: 60_000 });
  const types = useMemo(() => typesQ.data ?? [], [typesQ.data]);
  const [attrErrors, setAttrErrors] = useState<Record<string, string>>({});

  const [draft, setDraft] = useState<ComposerDraft>(() => emptyDraft({ defaultStock: readPrefs().defaultStock ?? "3" }));
  const [restore, setRestore] = useState<(ComposerDraft & { savedAt: number }) | null>(() => (fromId || isEdit ? null : readLocalDraft()));
  const [errors, setErrors] = useState<ComposerErrors>({});
  const [phase, setPhase] = useState<Phase>({ kind: "editing" });
  const [loadingFrom, setLoadingFrom] = useState(Boolean(fromId || editId));
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Editing: the draft as last loaded/saved, to know about unsaved changes. */
  const [baseline, setBaseline] = useState<string | null>(null);
  const [badSkus, setBadSkus] = useState<string[]>([]);
  const createdId = useRef<string | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const update = useCallback((fn: (d: ComposerDraft) => ComposerDraft) => setDraft((d) => fn(d)), []);

  /* ---------------------------------------------- duplicate an existing product */
  useEffect(() => {
    if (!fromId) return;
    let alive = true;
    getProductFull(fromId)
      .then((p) => { if (alive) { setDraft(draftFromProduct(p, { keepPhotos: true, titleSuffix: tr(" (نسخة)", " (copy)") })); toast.info(tr("انسخ المنتج: بيتعدّل اللي بيختلف وبعدها الحفظ", "Product copied: change what's different, then save")); } })
      .catch((e) => toast.error(tr("تعذّر نسخ المنتج", "Couldn't copy the product"), { description: getApiErrorMessage(e) }))
      .finally(() => alive && setLoadingFrom(false));
    return () => { alive = false; };
  }, [fromId]);

  /* ---------------------------------------------- edit a saved product */
  useEffect(() => {
    if (!editId) return;
    let alive = true;
    setLoadingFrom(true);
    setLoadError(null);
    getProductFull(editId)
      .then((p) => {
        if (!alive) return;
        const d = draftForEdit(p);
        setDraft(d);
        setBaseline(draftSignature(d));
      })
      .catch((e) => alive && setLoadError(getApiErrorMessage(e)))
      .finally(() => alive && setLoadingFrom(false));
    return () => { alive = false; };
  }, [editId]);
  const dirty = isEdit && baseline !== null && draftSignature(draft) !== baseline;

  /* ---------------------------------------------- keep work in progress */
  useEffect(() => {
    if (isEdit || phase.kind !== "editing" || restore || !hasContent(draft)) return;
    const t = window.setTimeout(() => saveDraftLocally(draft), 500);
    return () => window.clearTimeout(t);
  }, [draft, phase.kind, restore, isEdit]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      const busy = Object.values(draftRef.current.photos).some((p) => p.status === "queued" || p.status === "uploading");
      if (phase.kind === "saving" || busy || dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase.kind, dirty]);

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
      toast.success(tr(`أضفنا مقاس ${name}`, "Size {0} added", [name]));
      return created as CatalogSize;
    } catch (e) {
      toast.error(tr("تعذّر إضافة المقاس", "Couldn't add the size"), { description: getApiErrorMessage(e) });
      return null;
    }
  };

  /* ---------------------------------------------- save */
  const save = async (publish: boolean) => {
    if (phase.kind === "saving") return;
    const found = validateDraft(draftRef.current, { publish, sizes });
    setErrors(found);
    const first = (["photos", "title", "category", "price", "compareAt", "sizes", "skus", "colors", "uploads"] as const).find((k) => found[k]);
    if (first) {
      const target = { photos: "photos", uploads: "photos", colors: "photos", title: "details", category: "details", price: "price", compareAt: "price", sizes: "sizes", skus: "sizes" }[first];
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error(found[first]!);
      return;
    }
    // The kind's own fields: required ones must be filled.
    const d0 = draftRef.current;
    const kind = types.find((t) => t.id === d0.typeId) ?? types[0] ?? null;
    const typed: TypedValues | undefined = kind
      ? {
          typeId: kind.id,
          attributes: tidyAttributes(kind.fields, d0.attributes ?? {}),
          ...(kind.fulfillment === "BOOKING" ? { event: eventForSave(d0) } : {}),
          ...((kind.fulfillment ?? "SHIPPING") === "SHIPPING" ? { delivery: deliveryForSave(d0) } : {}),
          ...(kind.fulfillment === "DIGITAL" ? { redeemNote: d0.redeemNote.trim() || null, protection: protectionForSave(d0) } : {}),
        }
      : undefined;
    if (kind?.fulfillment === "DIGITAL" && protectionProblem(d0)) {
      document.getElementById("details")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error(protectionProblem(d0)!);
      return;
    }
    if (kind && (kind.fulfillment ?? "SHIPPING") === "SHIPPING" && deliveryProblem(d0)) {
      document.getElementById("details")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error(deliveryProblem(d0)!);
      return;
    }
    if (typed?.event?.eventStartsAt && typed.event.eventEndsAt && typed.event.eventEndsAt <= typed.event.eventStartsAt) {
      document.getElementById("details")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error(tr("موعد النهاية لازم يكون بعد البداية", "The end has to be after the start"));
      return;
    }
    if (kind) {
      const missing = missingRequired(kind.fields, d0.attributes ?? {});
      if (missing.length) {
        setAttrErrors(Object.fromEntries(missing.map((k) => [k, tr("مطلوب", "Required")])));
        document.getElementById("details")?.scrollIntoView({ behavior: "smooth", block: "start" });
        toast.error(tr(`تفاصيل القطعة الناقصة: ${missing.map((k) => kind.fields.find((f) => f.key === k)?.label ?? k).join("، ")}`, "Fill in the item's details: {0}", [missing.map((k) => kind.fields.find((f) => f.key === k)?.label ?? k).join(", ")]));
        return;
      }
    }
    try {
      setPhase({ kind: "saving", step: "uploads", publish });
      // Wait for photos still uploading.
      for (let i = 0; i < 600; i++) {
        const p = Object.values(draftRef.current.photos);
        if (p.some((x) => x.status === "error")) throw new Error(tr("بعض الصور لم تُرفع. يرجى المحاولة من جديد أو حذفها", "Some photos didn't upload. Try again or remove them"));
        if (p.every((x) => x.status === "done")) break;
        await new Promise((r) => setTimeout(r, 250));
      }
      const d = draftRef.current;
      if (d.edit) {
        setPhase({ kind: "saving", step: "details", publish });
        const { product, kept } = await saveEditedProduct({ draft: d, sizes, publish, typed });
        const next = draftForEdit(product);
        setDraft(next);
        setBaseline(draftSignature(next));
        setBadSkus([]);
        setErrors({});
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["catalog", "products"] }),
          qc.invalidateQueries({ queryKey: ["inventory"] }),
          qc.invalidateQueries({ queryKey: ["admin-product-full", d.edit.productId] }),
        ]);
        setPhase({ kind: "editing" });
        toast.success(publish ? tr("حُفظت التغييرات — المنتج منشور في المتجر", "Changes saved — the product is live in the store") : tr("حُفظت التغييرات (مسودة)", "Changes saved (draft)"));
        if (kept && (kept.variants.length || kept.items.length)) {
          const parts = [
            kept.variants.length ? tr(`مقاسات عليها طلبات بقيت كـ«نفدت»: ${kept.variants.map((v) => v.sku).join("، ")}`, "Sizes with orders were kept as “Sold out”: {0}", [kept.variants.map((v) => v.sku).join(", ")]) : "",
            kept.items.length ? tr(`ألوان عليها طلبات أُخفيت بدل حذفها: ${kept.items.map((i) => i.colorName).join("، ")}`, "Colours with orders were hidden instead of deleted: {0}", [kept.items.map((i) => i.colorName).join(", ")]) : "",
          ].filter(Boolean);
          toast.info(tr("لم نحذف كل شيء", "Not everything was deleted"), { description: parts.join(" · "), durationMs: 10000 });
        }
        return;
      }
      const res = await saveComposedProduct({
        draft: d,
        sizes,
        publish,
        typed,
        existingId: createdId.current,
        onStep: (step) => setPhase({ kind: "saving", step, publish }),
        onCreated: (id) => { createdId.current = id; },
      });
      rememberChoices(d);
      clearLocalDraft();
      createdId.current = null;
      await qc.invalidateQueries({ queryKey: ["catalog", "products"] });
      setPhase({ kind: "saved", id: res.id, slug: res.slug, published: publish, title: d.title.trim(), digital: kind?.fulfillment === "DIGITAL" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setPhase({ kind: "editing" });
      if (isAxiosError(e)) {
        const why = describeSaveError(e);
        if (why.attributeErrors && Object.keys(why.attributeErrors).length) {
          setAttrErrors(why.attributeErrors);
          document.getElementById("details")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (why.skus?.length) {
          setBadSkus(why.skus);
          document.getElementById("sizes")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        toast.error(isEdit ? tr("لم تُحفظ التغييرات", "The changes weren't saved") : tr("لم يُحفظ المنتج", "The product wasn't saved"), { description: why.message || getApiErrorMessage(e), durationMs: 9000 });
        return;
      }
      toast.error(isEdit ? tr("لم تُحفظ التغييرات", "The changes weren't saved") : tr("لم يُحفظ المنتج", "The product wasn't saved"), { description: e instanceof Error ? e.message : undefined, durationMs: 7000 });
    }
  };

  // Ctrl/⌘+S saves a draft, Ctrl/⌘+Enter publishes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || phase.kind !== "editing") return;
      if (e.key.toLowerCase() === "s") { e.preventDefault(); void save(draftRef.current.edit ? draftRef.current.edit.isActive : false); }
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
    <div className="mx-auto max-w-[1280px] pb-40 lg:pb-10" data-testid="product-composer">
      {isEdit ? (
        <EditHeader id={editId!} draft={draft} dirty={dirty} />
      ) : (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link to="/admin/catalog/products" className="text-xs text-white/50 hover:text-white">{tr("→ المنتجات", "← Products")}</Link>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">{fromId ? tr("نسخ منتج", "Copy a product") : tr("منتج جديد", "New product")}</h1>
            <p className="mt-1 text-sm text-white/55">{tr("الصور، الاسم، السعر، المقاسات والـSKU — وحفظ واحد.", "Photos, name, price, sizes and SKUs — one save.")}</p>
          </div>
          <div className="hidden text-xs text-white/40 sm:block">{tr("Ctrl+S مسودة · Ctrl+Enter نشر", "Ctrl+S draft · Ctrl+Enter publish")}</div>
        </div>
      )}

      {restore && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-accent-500/30 bg-accent-500/10 px-4 py-3 text-sm">
          <span className="text-white/85">{tr("في منتج لم يكتمل", "An unfinished product")}{restore.title ? <> «<b>{restore.title}</b>»</> : null} {tr("من", "saved")} {timeAgo(restore.savedAt)}.</span>
          <div className="ms-auto flex gap-2">
            <button type="button" className="h-9 rounded-xl bg-accent-500 px-4 text-white hover:bg-accent-400" onClick={() => { setDraft(restore); setRestore(null); }}>{tr("متابعة", "Continue")}</button>
            <button type="button" className="h-9 rounded-xl px-3 text-white/70 hover:bg-white/[0.06]" onClick={() => { clearLocalDraft(); setRestore(null); }}>{tr("بداية جديدة", "Start fresh")}</button>
          </div>
        </div>
      )}

      {loadError ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-white/70">
          {tr("تعذّر فتح المنتج:", "Couldn't open the product:")} {loadError}
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="h-10 rounded-xl bg-accent-500 px-4 text-white">{tr("إعادة المحاولة", "Try again")}</button>
            <Link to="/admin/catalog/products" className="grid h-10 place-items-center rounded-xl border border-white/[0.12] px-4 text-white/80">{tr("كل المنتجات", "All products")}</Link>
          </div>
        </div>
      ) : loadingFrom ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-white/60">{isEdit ? tr("جارٍ فتح المنتج…", "Opening the product…") : tr("جارٍ نسخ المنتج…", "Copying the product…")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <PhotoColorsSection draft={draft} update={update} onFiles={(f, g) => void onFiles(f, g)} onRetry={retry} error={errors.photos || errors.colors || errors.uploads} />

            <Section id="details" step={2} title={tr("الاسم والقسم", "Name and category")} error={errors.title || errors.category}>
              <AiWriter draft={draft} update={update} type={types.find((t) => t.id === draft.typeId) ?? types[0] ?? null} categoryName={categories.find((c) => c.id === draft.categoryId)?.name ?? ""} />
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/55">{tr("اسم المنتج", "Product name")}</span>
                <input
                  className={cn(fieldCls, "h-12 text-base", errors.title && "border-red-500/50")}
                  value={draft.title}
                  onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, title: v })); if (v.trim()) setErrors((x) => ({ ...x, title: undefined })); }}
                  placeholder={tr("مثلاً: فستان كتان بأكمام واسعة", "e.g. Linen dress with wide sleeves")}
                  aria-label={tr("اسم المنتج", "Product name")}
                  autoFocus={!restore && !fromId}
                />
              </label>
              <div className="mt-4">
                <span className="mb-2 block text-xs text-white/55">{tr("القسم", "Category")}</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr("القسم", "Category")}>
                  {shownCats.map((c) => (
                    <Chip key={c.id} active={c.id === draft.categoryId} onClick={() => pickCategory(c.id)}>{categoryLabel(c, categories)}</Chip>
                  ))}
                  {orderedCats.length > 10 && <Chip onClick={() => setAllCats((v) => !v)}>{allCats ? tr("أقل", "Fewer") : tr(`+${orderedCats.length - 10} أقسام`, "+{0} categories", [orderedCats.length - 10])}</Chip>}
                  {categoriesQ.isLoading && <span className="text-xs text-white/40">{tr("جارٍ التحميل…", "Loading…")}</span>}
                  {!categoriesQ.isLoading && !categories.length && <Link to="/admin/catalog/categories" className="text-sm text-accent-300">{tr("إضافة قسم أولاً", "Add a category first")}</Link>}
                </div>
              </div>
              <Description value={draft.description} onChange={(v) => update((d) => ({ ...d, description: v }))} />
              <TypeFieldsBlock
                types={types}
                active={types.find((t) => t.id === draft.typeId) ?? types[0] ?? null}
                draft={draft}
                update={update}
                errors={attrErrors}
                onFix={(key) => setAttrErrors((x) => { const n = { ...x }; delete n[key]; return n; })}
              />
            </Section>

            <Section id="price" step={3} title={tr("السعر", "Price")} error={errors.price || errors.compareAt}>
              <div className="flex flex-wrap items-end gap-4">
                <label>
                  <span className="mb-1.5 block text-xs text-white/55">{tr("سعر البيع", "Selling price")}</span>
                  <div className="relative">
                    <input
                      className={cn(fieldCls, "h-12 w-40 ps-9 text-lg font-semibold", errors.price && "border-red-500/50")}
                      inputMode="decimal"
                      value={draft.price}
                      onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, price: v })); setErrors((x) => ({ ...x, price: undefined })); }}
                      placeholder="0"
                      aria-label={tr("سعر البيع", "Selling price")}
                    />
                    <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-white/40">{currencySign()}</span>
                  </div>
                </label>
                <div className="pb-2.5"><Toggle checked={draft.onSale} onChange={(v) => update((d) => ({ ...d, onSale: v }))} label={tr("عليها تخفيض", "On sale")} /></div>
                {draft.onSale && (
                  <label>
                    <span className="mb-1.5 block text-xs text-white/55">{tr("السعر قبل الخصم", "Price before the discount")}</span>
                    <div className="relative">
                      <input className={cn(fieldCls, "h-12 w-40 ps-9", errors.compareAt && "border-red-500/50")} inputMode="decimal" value={draft.compareAt} onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, compareAt: v })); setErrors((x) => ({ ...x, compareAt: undefined })); }} placeholder="0" aria-label={tr("السعر قبل الخصم", "Price before the discount")} />
                      <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-white/40">{currencySign()}</span>
                    </div>
                  </label>
                )}
                {discount ? <span className="mb-3 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{tr("خصم", "off")} {discount}%</span> : null}
              </div>
            </Section>

            <SizesStockSection draft={draft} update={update} sizes={sizes} onCreateSize={onCreateSize} error={errors.sizes || errors.skus} badSkus={badSkus} />
            <SpinSection draft={draft} step={5} />

            <Advanced draft={draft} update={update} />
            <SearchEngine draft={draft} update={update} />
            <TranslationsBlock draft={draft} update={update} type={types.find((t) => t.id === draft.typeId) ?? types[0] ?? null} />
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
                <SaveButtons phase={phase} onSave={save} edit={draft.edit} dirty={dirty} />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Phones: the save buttons stay at the bottom, just above the tab bar (4rem tall; under it they were covered). */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-white/[0.08] bg-surface-950/95 p-3 backdrop-blur lg:hidden" data-testid="composer-phone-bar">
        <div className="mx-auto grid max-w-xl grid-cols-[1fr_auto] gap-2"><SaveButtons phase={phase} onSave={save} compact edit={draft.edit} dirty={dirty} /></div>
      </div>

      {phase.kind === "saving" && <SavingOverlay step={phase.step} publish={phase.publish} photos={Object.values(draft.photos)} edit={isEdit} />}
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

function SaveButtons({ phase, onSave, compact, edit, dirty }: { phase: Phase; onSave: (publish: boolean) => void; compact?: boolean; edit?: ComposerDraft["edit"]; dirty?: boolean }) {
  const busy = phase.kind === "saving";
  if (edit) {
    // Saving keeps the product's status; the second button switches it.
    return (
      <>
        <button type="button" disabled={busy} onClick={() => onSave(edit.isActive)} className={cn("h-12 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60", dirty ? "bg-accent-500 shadow-[0_8px_24px_-10px_rgb(var(--sk-accent-500,139_92_246)/0.8)] hover:bg-accent-400" : "bg-accent-500/60 hover:bg-accent-500")}>
          {busy ? tr("جارٍ الحفظ…", "Saving…") : dirty ? tr("حفظ التغييرات", "Save changes") : tr("حفظ", "Save")}
        </button>
        <button type="button" disabled={busy} onClick={() => onSave(!edit.isActive)} className={cn("h-12 rounded-xl border border-white/[0.12] px-4 text-sm text-white/85 hover:bg-white/[0.06] disabled:opacity-60", compact && "px-3")}>
          {edit.isActive ? tr("إخفاء (مسودة)", "Hide (draft)") : tr("حفظ ونشر", "Save and publish")}
        </button>
      </>
    );
  }
  return (
    <>
      <button type="button" disabled={busy} onClick={() => onSave(true)} className="h-12 rounded-xl bg-accent-500 px-5 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgb(var(--sk-accent-500,139_92_246)/0.8)] hover:bg-accent-400 disabled:opacity-60">
        {busy && phase.publish ? tr("جارٍ الحفظ…", "Saving…") : tr("نشر المنتج", "Publish the product")}
      </button>
      <button type="button" disabled={busy} onClick={() => onSave(false)} className={cn("h-12 rounded-xl border border-white/[0.12] px-4 text-sm text-white/85 hover:bg-white/[0.06] disabled:opacity-60", compact && "px-3")}>
        {busy && !phase.publish ? tr("جارٍ الحفظ…", "Saving…") : tr("حفظ كمسودة", "Save as draft")}
      </button>
    </>
  );
}

function Description({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [opened, setOpen] = useState(false);
  const open = opened || Boolean(value);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex h-10 items-center text-sm text-accent-300 hover:text-accent-200 sm:mt-4 sm:h-auto">{tr("+ إضافة وصف (اختياري)", "+ Add a description (optional)")}</button>;
  return (
    <label className="mt-4 block">
      <span className="mb-1.5 block text-xs text-white/55">{tr("الوصف (اختياري)", "Description (optional)")}</span>
      <textarea className={cn(fieldCls, "h-24 resize-y py-2.5 leading-6")} value={value} onChange={(e) => onChange(e.target.value)} placeholder={tr("القماش، القصة، نصيحة للمقاس…", "Fabric, the story, a sizing tip…")} aria-label={tr("الوصف", "Description")} />
    </label>
  );
}

/** How the product shows in Google; empty fields fall back to the title and description. */
function SearchEngine({ draft, update }: { draft: ComposerDraft; update: (fn: (d: ComposerDraft) => ComposerDraft) => void }) {
  const store = storeNameOf(useSettings().data);
  const title = draft.seoTitle.trim() || draft.title.trim();
  const description = (draft.seoDescription.trim() || draft.description.trim()).replace(/\s+/g, " ");
  const filled = Boolean(draft.seoTitle.trim() || draft.seoDescription.trim());
  return (
    <details className="glass group rounded-2xl p-4 sm:p-5" data-testid="product-seo">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-medium text-white/75 sm:min-h-0">
        {tr("محركات البحث (Google)", "Search engines (Google)")}
        <span className="text-xs text-white/40 group-open:hidden">{filled ? tr("عنوان ووصف خاص", "Own title and description") : tr("يُستعمل اسم المنتج ووصفه", "Uses the product's name and description")}</span>
      </summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs text-white/55">
              <span>{tr("العنوان في Google (اختياري)", "Title on Google (optional)")}</span>
              <span className={draft.seoTitle.length > 60 ? "text-amber-200" : ""}>{draft.seoTitle.length} / 60</span>
            </span>
            <input className={cn(fieldCls, "h-11")} maxLength={120} value={draft.seoTitle} onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, seoTitle: v })); }} placeholder={draft.title ? `${draft.title} | ${store}` : tr(`مثال: اسم المنتج | ${store}`, "e.g. Product name | {0}", [store])} aria-label={tr("العنوان في Google", "Title on Google")} />
          </label>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs text-white/55">
              <span>{tr("الوصف في Google (اختياري)", "Description on Google (optional)")}</span>
              <span className={draft.seoDescription.length > 160 ? "text-amber-200" : ""}>{draft.seoDescription.length} / 160</span>
            </span>
            <textarea className={cn(fieldCls, "h-24 resize-y py-2.5 leading-6")} maxLength={320} value={draft.seoDescription} onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, seoDescription: v })); }} placeholder={tr("القماش، الألوان، المقاسات، والتوصيل… بجملتين", "Fabric, colours, sizes and delivery… in two sentences")} aria-label={tr("الوصف في Google", "Description on Google")} />
          </label>
        </div>
        <div className="space-y-2">
          <span className="block text-xs text-white/55">{tr("هكذا تظهر في Google:", "How it shows on Google:")}</span>
          <GooglePreview title={title || tr("اسم المنتج", "Product name")} description={description} url={`${storeHost(env.VITE_STOREFRONT_BASE_URL) || "…"} › p › ${effectiveSlug(draft) || "…"}`} />
        </div>
      </div>
    </details>
  );
}

function Advanced({ draft, update }: { draft: ComposerDraft; update: (fn: (d: ComposerDraft) => ComposerDraft) => void }) {
  const slug = effectiveSlug(draft);
  return (
    <details className="glass group rounded-2xl p-4 sm:p-5">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-medium text-white/75 sm:min-h-0">
        {tr("خيارات متقدمة", "Advanced options")}
        <span className="text-xs text-white/40 group-open:hidden">{tr("رابط المنتج، رموز SKU، تنبيه المخزون", "Product link, SKU codes, stock alert")}</span>
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs text-white/55">{tr("رابط المنتج في المتجر", "Product link in the store")}</span>
          <div className="flex items-center gap-1 text-sm text-white/45" dir="ltr">
            /p/
            <input className={cn(fieldCls, "h-10")} dir="ltr" value={draft.slugTouched ? draft.slug : slug} onChange={(e) => { const v = e.target.value; update((d) => ({ ...d, slug: v, slugTouched: true })); }} onBlur={() => update((d) => ({ ...d, slug: d.slugTouched ? makeSlug(d.slug || d.title) : d.slug }))} aria-label={tr("رابط المنتج", "Product link")} />
          </div>
          <span className="mt-1 block text-[11px] text-white/40">{tr("يُكتب تلقائياً من الاسم. إذا كان مستخدماً نضيف له نهاية قصيرة.", "Written from the name. If it's taken, a short ending is added.")}</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-white/55">{tr("تنبيه عند بقاء", "Alert when")}</span>
          <input className={cn(fieldCls, "h-10 w-24 text-center")} inputMode="numeric" value={draft.lowStock} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ""); update((d) => ({ ...d, lowStock: v })); }} aria-label={tr("حد تنبيه المخزون", "Stock alert level")} />
          <span className="mt-1 block text-[11px] text-white/40">{tr("قطع أو أقل من أي مقاس.", "or fewer are left in any size.")}</span>
        </label>
        <div className="sm:col-span-2 text-[11px] leading-5 text-white/40" dir="ltr">SKU: {slug.toUpperCase().slice(0, 16)}-COLOR-SIZE</div>
      </div>
    </details>
  );
}

function Preview({ draft, categoryName, price, before }: { draft: ComposerDraft; categoryName: string; price: number | null; before: number | null }) {
  const first = draft.groups.find((g) => g.photoKeys.length);
  const photo = first ? draft.photos[first.photoKeys[0]] : undefined;
  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="px-4 pt-3 text-xs text-white/45">{tr("هكذا تظهر في المتجر", "How it shows in the store")}</div>
      <div className="p-4 pt-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#f4ebe3]">
          {photo ? <img src={photo.preview} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-[#9b7b6a]">{tr("الصورة الرئيسية", "Main photo")}</div>}
          {before ? <span className="absolute start-3 top-3 rounded-full bg-[#7d2448] px-2.5 py-1 text-[11px] font-semibold text-white">−{Math.round((1 - (price ?? 0) / before) * 100)}%</span> : <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#7d2448]">{tr("جديد", "New")}</span>}
        </div>
        <div className="mt-3 text-[11px] text-white/45">{categoryName || tr("القسم", "Category")}</div>
        <div className="mt-0.5 line-clamp-2 text-sm font-semibold text-white">{draft.title.trim() || tr("اسم المنتج", "Product name")}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-semibold text-accent-300">{formatMoney(price)}</span>
          {before ? <s className="text-xs text-white/40">{formatMoney(before)}</s> : null}
        </div>
        {draft.groups.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">{draft.groups.map((g) => <Swatch key={g.key} hex={g.hex} size={16} />)}</div>
        )}
      </div>
    </div>
  );
}

function SavingOverlay({ step, publish, photos, edit }: { step: "uploads" | SaveStep; publish: boolean; photos: ComposerPhoto[]; edit?: boolean }) {
  const done = photos.filter((p) => p.status === "done").length;
  const steps: Array<{ key: "uploads" | SaveStep; label: string }> = [
    { key: "uploads", label: photos.length ? tr(`رفع الصور ${done}/${photos.length}`, "Uploading photos {0}/{1}", [done, photos.length]) : tr("تجهيز", "Getting ready") },
    ...(edit ? [] : [{ key: "create" as const, label: tr("إنشاء المنتج", "Creating the product") }]),
    { key: "details", label: edit ? tr("حفظ الألوان والمقاسات والكميات", "Saving colours, sizes and quantities") : publish ? tr("حفظ الألوان والمقاسات ونشره", "Saving colours and sizes, and publishing") : tr("حفظ الألوان والمقاسات", "Saving colours and sizes") },
  ];
  const at = steps.findIndex((s) => s.key === step);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="glass w-full max-w-sm rounded-2xl bg-surface-925 p-6">
        <div className="text-base font-semibold text-white">{tr("جارٍ حفظ المنتج…", "Saving the product…")}</div>
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
    <div className="mx-auto max-w-xl py-10" data-testid="composer-saved">
      <div className="glass rounded-3xl p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-3xl text-emerald-300">✓</div>
        <h1 className="mt-4 text-xl font-semibold text-white">{phase.published ? tr("نُشر المنتج", "Product published") : tr("حُفظ كمسودة", "Saved as a draft")}</h1>
        <p className="mt-1 text-sm text-white/60">«{phase.title}»</p>
        {phase.digital ? (
          <button type="button" onClick={onEdit} data-testid="saved-add-files" className="mt-5 h-12 w-full rounded-xl bg-emerald-500/20 px-4 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30">
            {tr("⬇️ الخطوة الجاية: رفع الملفات أو الأكواد اللي بتوصل للزبون ←", "⬇️ Next: upload the files or codes the customer receives →")}
          </button>
        ) : null}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => onNew("similar")} className="h-12 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-400">{tr("منتج مشابه", "Similar product")}</button>
          <button type="button" onClick={() => onNew("blank")} className="h-12 rounded-xl border border-white/[0.12] px-4 text-sm text-white/85 hover:bg-white/[0.06]">{tr("منتج جديد فارغ", "Blank new product")}</button>
        </div>
        <p className="mt-2 text-[11px] text-white/40">{tr("«منتج مشابه» يحتفظ بالقسم والسعر والمقاسات — بتنضاف الصور والاسم بس.", "“Similar product” keeps the category, price and sizes — only the photos and name are added.")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm">
          <button type="button" onClick={onEdit} className="text-accent-300 hover:text-accent-200">{tr("فتح صفحة التعديل", "Open the edit page")}</button>
          {phase.published && <a href={storeUrl} target="_blank" rel="noreferrer" className="text-accent-300 hover:text-accent-200">{tr("عرض في المتجر ↗", "View in the store ↗")}</a>}
          <button type="button" onClick={onList} className="text-white/60 hover:text-white">{tr("كل المنتجات", "All products")}</button>
        </div>
      </div>
    </div>
  );
}

function EditHeader({ id, draft, dirty }: { id: string; draft: ComposerDraft; dirty: boolean }) {
  const live = draft.edit?.isActive;
  const storeUrl = `${env.VITE_STOREFRONT_BASE_URL.replace(/\/+$/, "")}/p/${encodeURIComponent(effectiveSlug(draft))}`;
  const link = "inline-flex h-9 items-center rounded-xl border border-white/[0.1] px-3 text-sm text-white/75 hover:bg-white/[0.06] hover:text-white";
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3" data-testid="product-edit-header">
      <div className="min-w-0">
        <Link to="/admin/catalog/products" className="text-xs text-white/50 hover:text-white">{tr("→ المنتجات", "← Products")}</Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-white">
          <span className="truncate">{draft.title || tr("تعديل منتج", "Edit product")}</span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", live ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.08] text-white/60")}>{live ? tr("منشور", "Published") : tr("مسودة", "Draft")}</span>
          {dirty ? <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-200" role="status">{tr("تغييرات غير محفوظة", "Unsaved changes")}</span> : null}
        </h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/print/labels?productId=${encodeURIComponent(id)}`} target="_blank" className={link}>{tr("ملصقات باركود", "Barcode labels")}</Link>
        <Link to={`/admin/inventory/adjustments?productId=${encodeURIComponent(id)}`} className={link}>{tr("سجل المخزون", "Stock log")}</Link>
        <Link to={`/admin/catalog/products/new?from=${encodeURIComponent(id)}`} className={link}>{tr("نسخ كمنتج جديد", "Copy as a new product")}</Link>
        <Link to={`/admin/catalog/products/${encodeURIComponent(id)}/advanced`} className={link} title={tr("التخفيض المجدول، الوزن، علبة/تغليف للون…", "Scheduled sale, weight, box/packaging per colour…")}>{tr("المحرر المتقدم", "Advanced editor")}</Link>
        {live ? <a href={storeUrl} target="_blank" rel="noreferrer" className={link}>{tr("عرض في المتجر ↗", "View in the store ↗")}</a> : null}
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
  if (m < 60) return m === 1 ? tr("دقيقة", "1 minute ago") : m === 2 ? tr("دقيقتين", "2 minutes ago") : tr(m <= 10 ? `${m} دقائق` : `${m} دقيقة`, "{0} minutes ago", [m]);
  const h = Math.round(m / 60);
  return h === 1 ? tr("ساعة", "1 hour ago") : h === 2 ? tr("ساعتين", "2 hours ago") : tr(h <= 10 ? `${h} ساعات` : `${h} ساعة`, "{0} hours ago", [h]);
}
