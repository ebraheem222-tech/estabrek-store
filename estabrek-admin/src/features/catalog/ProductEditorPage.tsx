// src/features/catalog/products/ProductEditorPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { api, getApiErrorMessage } from "../../api/http";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Skeleton, Spinner } from "../../components/ui/Spinner";
import { Table, TBody, TH, THead, TR } from "../../components/ui/Table";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AsyncImage } from "../../components/ui/AsyncImage";

import ItemImagesManager, { type LocalImage } from "../../components/catalog/ItemImagesManager";
import { normalizeHex } from "../../lib/colorDetect";
import { isEyeDropperSupported, pickScreenColor } from "../../lib/eyeDropper";
import { getNearestNamedColor, skuSegmentFromColorName } from "../../lib/colorNames";
import ProductImagesWizardModal from "./ProductImagesWizardModal";
import { transliterate } from "../../lib/productComposer";
import { tr } from "@/lib/words";

// === Backend endpoints (حسب مشروعك) ===
// ملاحظة: اذا عندك base مختلف (/admin بدل /v1/admin) عدّل هون
const EP = {
  productFull: (id: string) => `/admin/catalog/products/${id}/full`,
  productFullPut: (id: string) => `/admin/catalog/products/${id}/full`,
  categories: `/admin/catalog/categories`,
  sizes: `/admin/catalog/sizes`,
};

type Category = { id: string; name: string; slug: string; parentId?: string | null };
type Size = { id: string; name: string; order: number; active: boolean };

type DBImage = {
  id: string;
  url: string;
  alt?: string | null;
  position: number;
  isPrimary: boolean;
  view?: string | null;
};

type DBSize = { id: string; name: string };

type DBVariant = {
  id: string;
  sizeId: string;
  sku: string;
  price: string | number; // prisma Decimal غالبًا بيرجع string
  compareAt?: string | number | null;
  originalPrice?: string | number | null;
  salePrice?: string | number | null;
  saleStartsAt?: string | Date | null;
  saleEndsAt?: string | Date | null;
  stock: number;
  lowStockThreshold?: number;
  weightGrams?: number | null;
  size?: DBSize;
};

type DBItem = {
  id: string;
  colorName: string;
  boxLabel?: string | null;
  colorHex?: string | null;
  suggestedColors?: string[];
  skuBase: string;
  isActive: boolean;
  images: DBImage[];
  variants: DBVariant[];
};

type DBProductFull = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  categoryId: string;
  category?: Category;
  items: DBItem[];
};

type DeepUpdateBody = {
  product?: {
    title?: string;
    slug?: string;
    description?: string | null;
    isActive?: boolean;
    categoryId?: string;
  };
  items?: Array<{
    id?: string;
    colorName: string;
    boxLabel?: string;
    colorHex?: string | null;
    suggestedColors?: string[];
    skuBase: string;
    isActive?: boolean;
    images?: Array<{
      id?: string;
      url: string;
      alt?: string | null;
      position?: number;
      isPrimary?: boolean;
      view?: string | null;
    }>;
    variants?: Array<{
      id?: string;
      sizeId: string;
      sku: string;
      price: number;
      compareAt?: number | null;
      originalPrice?: number | null;
      salePrice?: number | null;
      saleStartsAt?: string | null;
      saleEndsAt?: string | null;
      stock: number;
      lowStockThreshold?: number;
      weightGrams?: number | null;
    }>;
  }>;
  deleteItemIds?: string[];
  deleteImageIds?: string[];
  deleteVariantIds?: string[];
};

function toNumber(x: any): number {
  if (x === null || x === undefined || x === "") return 0;
  const n = typeof x === "number" ? x : parseFloat(String(x));
  return Number.isFinite(n) ? n : 0;
}

function toDateTimeInput(value: any): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeInput(value: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeImages(images: LocalImage[]): LocalImage[] {
  const sorted = images.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const norm = sorted.map((im, idx) => ({ ...im, position: idx }));
  // لازم واحد primary
  if (norm.length && !norm.some((x) => x.isPrimary)) norm[0].isPrimary = true;
  // إذا أكثر من واحد primary → خلّي أول واحد فقط
  let found = false;
  for (const im of norm) {
    if (im.isPrimary && !found) found = true;
    else if (im.isPrimary && found) im.isPrimary = false;
  }
  return norm;
}

function makeLocalImages(db: DBImage[]): LocalImage[] {
  return normalizeImages(
    (db ?? []).map((im) => ({
      id: im.id,
      localId: im.id, // key
      url: im.url,
      alt: im.alt ?? null,
      position: im.position ?? 0,
      isPrimary: !!im.isPrimary,
      view: im.view ?? null,
    }))
  );
}

function genLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function guessColorFromHex(hex: string): { name: string; sku: string } | null {
  const best = getNearestNamedColor(hex);
  return best ? { name: best.arabicName, sku: best.sku } : null;
}

function skuPrefixFromTitleSlug(title: string, slug: string) {
  const base = transliterate(slug || title || "PRODUCT").toUpperCase();
  const cleaned = base
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "PRODUCT";
}

function skuSegmentFromName(name: string) {
  const knownColorSegment = skuSegmentFromColorName(name);
  if (knownColorSegment) return knownColorSegment;

  const cleaned = transliterate(String(name || ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned;
}

function skuSegmentFromItem(colorName: string, boxLabel?: string) {
  const colorSegment = skuSegmentFromName(colorName);
  const boxSegment = boxLabel ? skuSegmentFromName(boxLabel) : "";
  return [colorSegment, boxSegment].filter(Boolean).join("-");
}

function buildAutoSkuBase(colorName: string, boxLabel: string, skuPrefix: string) {
  const segment = skuSegmentFromItem(colorName, boxLabel);
  if (!segment) return "";
  const prefix = (skuPrefix || "SKU").trim();
  return `${prefix}-${segment}`;
}

function normalizeSkuBaseInput(value: string) {
  const cleaned = transliterate(String(value || ""))
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned;
}

function ensureUniqueSkuBase(base: string, items: Array<{ localId: string; skuBase: string }>, excludeLocalId?: string) {
  const normalized = normalizeSkuBaseInput(base);
  if (!normalized) return normalized;
  const used = new Set(
    items
      .filter((it) => it.localId !== excludeLocalId)
      .map((it) => normalizeSkuBaseInput(it.skuBase))
      .filter(Boolean)
  );
  if (!used.has(normalized)) return normalized;

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < letters.length; i += 1) {
    const candidate = `${normalized}-${letters[i]}`;
    if (!used.has(candidate)) return candidate;
  }

  let n = 2;
  while (used.has(`${normalized}-${n}`)) n += 1;
  return `${normalized}-${n}`;
}

function normalizeColorNameInput(name: string) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeBoxLabelInput(name: string) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function itemKeyFromParts(colorName: string, boxLabel?: string) {
  return `${normalizeColorNameInput(colorName)}::${normalizeBoxLabelInput(boxLabel ?? "")}`;
}

function ensureUniqueColorName(
  name: string,
  boxLabel: string,
  items: Array<{ localId: string; colorName: string; boxLabel?: string }>,
  excludeLocalId?: string
) {
  const base = String(name || "").trim().replace(/\s+/g, " ");
  if (!base) return base;
  const used = new Set(
    items
      .filter((it) => it.localId !== excludeLocalId)
      .map((it) => itemKeyFromParts(it.colorName, it.boxLabel))
      .filter(Boolean)
  );
  const baseKey = itemKeyFromParts(base, boxLabel);
  if (!used.has(baseKey)) return base;

  let i = 2;
  let candidate = `${base} ${i}`;
  while (used.has(itemKeyFromParts(candidate, boxLabel))) {
    i += 1;
    candidate = `${base} ${i}`;
  }
  return candidate;
}

function makeUniqueSku(base: string, usedUpper: Set<string>) {
  let candidate = base;
  let i = 2;
  while (usedUpper.has(candidate.toUpperCase())) {
    candidate = `${base}-${i}`;
    i += 1;
  }
  usedUpper.add(candidate.toUpperCase());
  return candidate;
}

type DiscountState = "active" | "scheduled";

type DiscountInfo = {
  state: DiscountState;
  basePrice: number;
  salePrice: number;
  percent: number;
};

function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseMaybeDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  const dt = new Date(String(value));
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt;
}

function resolveVariantDiscountInfo(variant: {
  price?: unknown;
  salePrice?: unknown;
  saleStartsAt?: unknown;
  saleEndsAt?: unknown;
}): DiscountInfo | null {
  const basePrice = toFiniteNumber(variant.price);
  const salePrice = toFiniteNumber(variant.salePrice);
  if (!basePrice || !salePrice || basePrice <= 0 || salePrice <= 0 || salePrice >= basePrice) return null;

  const now = new Date();
  const startsAt = parseMaybeDate(variant.saleStartsAt);
  const endsAt = parseMaybeDate(variant.saleEndsAt);
  const isScheduled = !!(startsAt && startsAt.getTime() > now.getTime());
  const isEnded = !!(endsAt && endsAt.getTime() < now.getTime());
  if (isEnded) return null;

  const percent = Math.max(1, Math.round(((basePrice - salePrice) / basePrice) * 100));
  return {
    state: isScheduled ? "scheduled" : "active",
    basePrice,
    salePrice,
    percent,
  };
}

function resolveItemDiscountInfo(item: { variants?: Array<{ price?: unknown; salePrice?: unknown; saleStartsAt?: unknown; saleEndsAt?: unknown }> }) {
  const discounts = (item.variants ?? [])
    .map((variant) => resolveVariantDiscountInfo(variant))
    .filter(Boolean) as DiscountInfo[];
  if (!discounts.length) return null;
  const active = discounts
    .filter((discount) => discount.state === "active")
    .sort((a, b) => b.percent - a.percent);
  if (active.length) return active[0];
  return discounts
    .filter((discount) => discount.state === "scheduled")
    .sort((a, b) => b.percent - a.percent)[0] ?? null;
}

function formatNumericPrice(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function DiscountShapeBadge({ discount, compact = false }: { discount: DiscountInfo; compact?: boolean }) {
  const tone =
    discount.state === "active"
      ? "bg-rose-500/90 text-white border-rose-200/40"
      : "bg-amber-500/90 text-black border-amber-100/70";
  const label = discount.state === "active" ? `-${discount.percent}%` : tr("خصم قريب", "Discount coming");
  return (
    <span
      className={[
        "discount-shape-badge inline-flex items-center border font-semibold shadow-lg backdrop-blur-sm",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        tone,
      ].join(" ")}
      title={discount.state === "active" ? tr(`خصم ${discount.percent}%`, "{0}% off", [discount.percent]) : tr("يوجد خصم مجدول", "A discount is scheduled")}
    >
      {label}
    </span>
  );
}

export default function ProductEditorPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const productId = id ?? null;

  // === queries ===
  const qProduct = useQuery({
    queryKey: ["admin-product-full", productId],
    enabled: !!productId,
    queryFn: async () => {
      const res = await api.get(EP.productFull(productId!));
      return res.data as DBProductFull;
    },
  });

  const qCategories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await api.get(EP.categories);
      return res.data as Category[];
    },
  });

  const qSizes = useQuery({
    queryKey: ["admin-sizes"],
    queryFn: async () => {
      const res = await api.get(EP.sizes);
      return res.data as Size[];
    },
  });

  // === local state ===
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [categoryId, setCategoryId] = useState("");

  type LocalVariant = {
    id?: string;
    sizeId: string;
    sku: string;
    price: number;
    compareAt: number | null;
    originalPrice?: number | null;
    salePrice?: number | null;
    saleStartsAt?: string | null;
    saleEndsAt?: string | null;
    stock: number;
    lowStockThreshold: number;
    weightGrams: number | null;
  };

  type LocalItem = {
    id?: string;
    localId: string;
    colorName: string;
    boxLabel: string;
    colorHex: string;
    // ألوان مقترحة (مش محفوظة بالـDB) - جاية من تحليل صورة
    detectedColors?: string[];
    skuBase: string;
    isActive: boolean;
    images: LocalImage[];
    variants: LocalVariant[];
  };

  const [items, setItems] = useState<LocalItem[]>([]);
  const [deleteItemIds, setDeleteItemIds] = useState<string[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<string[]>([]);
  const [deleteVariantIds, setDeleteVariantIds] = useState<string[]>([]);

  // Batch upload + auto grouping wizard
  const [wizardOpen, setWizardOpen] = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);

  // init from server
  useEffect(() => {
    const p = qProduct.data;
    if (!p) return;

    setTitle(p.title ?? "");
    setSlug(p.slug ?? "");
    setDescription(p.description ?? "");
    setIsActive(!!p.isActive);
    setCategoryId(p.categoryId ?? "");

    setItems(
      (p.items ?? []).map((it) => ({
        id: it.id,
        localId: it.id,
        colorName: it.colorName ?? "",
        boxLabel: it.boxLabel ?? "",
        colorHex: it.colorHex ?? "",
        detectedColors: undefined,
        skuBase: it.skuBase ?? "",
        isActive: !!it.isActive,
        images: makeLocalImages(it.images ?? []),
        variants: (it.variants ?? []).map((v) => ({
          id: v.id,
          sizeId: v.sizeId,
          sku: v.sku,
          price: toNumber(v.price),
          compareAt: v.compareAt === null || v.compareAt === undefined ? null : toNumber(v.compareAt),
          originalPrice: v.originalPrice === null || v.originalPrice === undefined ? undefined : toNumber(v.originalPrice),
          salePrice: v.salePrice === null || v.salePrice === undefined ? null : toNumber(v.salePrice),
          saleStartsAt: v.saleStartsAt ? toDateTimeInput(v.saleStartsAt) : null,
          saleEndsAt: v.saleEndsAt ? toDateTimeInput(v.saleEndsAt) : null,
          stock: v.stock ?? 0,
          lowStockThreshold: v.lowStockThreshold ?? 0,
          weightGrams: v.weightGrams ?? null,
        })),
      }))
    );

    // reset deletes
    setDeleteItemIds([]);
    setDeleteImageIds([]);
    setDeleteVariantIds([]);
  }, [qProduct.data]);

  // === mutations ===
  const mSave = useMutation({
    mutationFn: async (body: DeepUpdateBody) => {
      const res = await api.put(EP.productFullPut(productId!), body);
      return res.data as DBProductFull;
    },
    onSuccess: (next) => {
      // re-init from saved
      setPageError(null);
      qProduct.refetch();
    },
    onError: (e) => setPageError(getApiErrorMessage(e)),
  });

  // === helpers ===
  const categories = qCategories.data ?? [];
  const sizes = (qSizes.data ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const skuPrefix = useMemo(() => skuPrefixFromTitleSlug(title, slug), [title, slug]);

  const addDeleteId = (setter: React.Dispatch<React.SetStateAction<string[]>>, id?: string) => {
    if (!id) return;
    setter((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const updateItem = (localId: string, patch: Partial<LocalItem>) => {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  };

  const getVariantSkuPrefix = (it: LocalItem) => {
    const prefix = (it.skuBase || skuPrefix || "SKU").trim();
    return prefix || "SKU";
  };

  const getVariantSkuSuffix = (sizeId: string) => {
    const sizeName = sizes.find((s) => s.id === sizeId)?.name ?? sizeId;
    const suffix =
      transliterate(String(sizeName))
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 18) || "SIZE";
    return suffix;
  };

  const buildVariantSku = (it: LocalItem, sizeId: string) => {
    const prefix = getVariantSkuPrefix(it);
    if (!sizeId) return prefix;
    const rawSku = `${prefix}-${getVariantSkuSuffix(sizeId)}`;

    const usedUpper = new Set<string>();
    for (const item of items) {
      for (const v of item.variants ?? []) {
        const sku = (v.sku ?? "").trim();
        if (!sku) continue;
        usedUpper.add(sku.toUpperCase());
      }
    }

    return makeUniqueSku(rawSku, usedUpper);
  };

  const applyAutoVariantSku = (itemLocalId: string, sizeId: string, force = false) => {
    const it = items.find((x) => x.localId === itemLocalId);
    if (!it) return;

    const suggested = buildVariantSku(it, sizeId);
    if (!suggested) return;

    const current = vSku.trim();
    const autoKey = vSkuAutoRef.current.trim();
    const canAuto =
      force || !current || !vSkuTouchedRef.current || (autoKey && current.toUpperCase() === autoKey.toUpperCase());

    if (!canAuto) return;
    vSkuAutoRef.current = suggested;
    setVSku(suggested);
  };

  const handleVariantSizeChange = (nextSizeId: string) => {
    setVSizeId(nextSizeId);
    if (editingVarId) return;
    if (!varItemLocalId) return;
    applyAutoVariantSku(varItemLocalId, nextSizeId);
  };

  const handleVariantSkuChange = (nextSku: string) => {
    setVSku(nextSku);
    if (!nextSku.trim()) {
      vSkuTouchedRef.current = false;
      vSkuAutoRef.current = "";
      return;
    }
    vSkuTouchedRef.current = true;
  };

  const applyColorHex = (localId: string, rawHex: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.localId !== localId) return it;

        const normalized = normalizeHex(rawHex);
        if (!normalized) return { ...it, colorHex: rawHex };

        const currentHex = normalizeHex(it.colorHex);
        const currentGuess = currentHex ? guessColorFromHex(currentHex) : null;
        const nextGuess = guessColorFromHex(normalized);

        const autoNameCurrent =
          !it.colorName.trim() ||
          (currentGuess && it.colorName.trim().toLowerCase() === currentGuess.name.trim().toLowerCase()) ||
          (currentHex && normalizeHex(it.colorName) === currentHex);

        const currentAutoBase = buildAutoSkuBase(it.colorName, it.boxLabel, skuPrefix);
        const autoSkuCurrent =
          !it.skuBase.trim() ||
          (currentAutoBase && it.skuBase.trim().toUpperCase() === currentAutoBase.toUpperCase());

        let nextName = it.colorName;
        let nextSkuBase = it.skuBase;

        if (autoNameCurrent) {
          const baseName = nextGuess?.name ?? normalized.toUpperCase();
          nextName = ensureUniqueColorName(baseName, it.boxLabel, prev as any, it.localId);
        }

        if (autoSkuCurrent) {
          const candidate = buildAutoSkuBase(nextName, it.boxLabel, skuPrefix);
          if (candidate) nextSkuBase = ensureUniqueSkuBase(candidate, prev as any, it.localId);
        }

        return {
          ...it,
          colorHex: normalized,
          colorName: nextName,
          skuBase: nextSkuBase,
        };
      })
    );
  };

  const pickItemColorWithEyeDropper = async (localId: string) => {
    setItemError(null);
    if (!isEyeDropperSupported()) {
      setItemError(tr("القطّارة غير مدعومة على هذا المتصفح.", "The colour picker isn't supported on this browser."));
      return;
    }

    const hex = await pickScreenColor();
    if (hex) applyColorHex(localId, hex);
  };

  const handleColorNameChange = (localId: string, nextName: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.localId !== localId) return it;
        let nextSkuBase = it.skuBase;
        const currentAutoBase = buildAutoSkuBase(it.colorName, it.boxLabel, skuPrefix);
        const shouldAuto =
          !nextSkuBase.trim() ||
          (currentAutoBase && nextSkuBase.trim().toUpperCase() === currentAutoBase.toUpperCase());
        if (shouldAuto) {
          const candidate = buildAutoSkuBase(nextName, it.boxLabel, skuPrefix);
          if (candidate) nextSkuBase = ensureUniqueSkuBase(candidate, prev as any, it.localId);
        }
        return { ...it, colorName: nextName, skuBase: nextSkuBase };
      })
    );
  };

  const handleBoxLabelChange = (localId: string, nextLabel: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.localId !== localId) return it;
        let nextSkuBase = it.skuBase;
        const currentAutoBase = buildAutoSkuBase(it.colorName, it.boxLabel, skuPrefix);
        const shouldAuto =
          !nextSkuBase.trim() ||
          (currentAutoBase && nextSkuBase.trim().toUpperCase() === currentAutoBase.toUpperCase());
        if (shouldAuto) {
          const candidate = buildAutoSkuBase(it.colorName, nextLabel, skuPrefix);
          if (candidate) nextSkuBase = ensureUniqueSkuBase(candidate, prev as any, it.localId);
        }
        return { ...it, boxLabel: nextLabel, skuBase: nextSkuBase };
      })
    );
  };

  const removeItem = (localId: string) => {
    setItems((prev) => {
      const target = prev.find((x) => x.localId === localId);
      if (target?.id) addDeleteId(setDeleteItemIds, target.id);
      return prev.filter((x) => x.localId !== localId);
    });
  };

  const onImagesChange = (itemLocalId: string, nextImages: LocalImage[]) => {
    setItems((prev) => {
      const it = prev.find((x) => x.localId === itemLocalId);
      if (!it) return prev;

      const prevIds = new Set((it.images ?? []).map((x) => x.id).filter(Boolean) as string[]);
      const nextIds = new Set((nextImages ?? []).map((x) => x.id).filter(Boolean) as string[]);
      // أي id كان موجود واختفى → deleteImageIds
      for (const pid of prevIds) {
        if (!nextIds.has(pid)) addDeleteId(setDeleteImageIds, pid);
      }

      const normalized = normalizeImages(nextImages);

      return prev.map((x) => (x.localId === itemLocalId ? { ...x, images: normalized } : x));
    });
  };

  // === Variant modal ===
  const [openVarModal, setOpenVarModal] = useState(false);
  const [varItemLocalId, setVarItemLocalId] = useState<string | null>(null);
  const [editingVarId, setEditingVarId] = useState<string | null>(null);

  const [vSizeId, setVSizeId] = useState("");
  const [vSku, setVSku] = useState("");
  const vSkuTouchedRef = useRef(false);
  const vSkuAutoRef = useRef("");
  const [vPrice, setVPrice] = useState("0");
  const [vCompareAt, setVCompareAt] = useState("");
  const [vOriginalPrice, setVOriginalPrice] = useState("");
  const [vSalePrice, setVSalePrice] = useState("");
  const [vSaleStartsAt, setVSaleStartsAt] = useState("");
  const [vSaleEndsAt, setVSaleEndsAt] = useState("");
  const [vStock, setVStock] = useState("0");
  const [vThreshold, setVThreshold] = useState("0");
  const [vWeight, setVWeight] = useState("");
  const [varError, setVarError] = useState<string | null>(null);

  const openCreateVariant = (itemLocalId: string) => {
    const it = items.find((x) => x.localId === itemLocalId);
    const baseSku = (it?.skuBase ?? "").trim();
    setVarItemLocalId(itemLocalId);
    setEditingVarId(null);
    setVSizeId("");
    vSkuTouchedRef.current = false;
    vSkuAutoRef.current = baseSku;
    setVSku(baseSku);
    setVPrice("0");
    setVCompareAt("");
    setVOriginalPrice("");
    setVSalePrice("");
    setVSaleStartsAt("");
    setVSaleEndsAt("");
    setVStock("0");
    setVThreshold("0");
    setVWeight("");
    setVarError(null);
    setOpenVarModal(true);
  };

  const openEditVariant = (itemLocalId: string, v: LocalVariant) => {
    setVarItemLocalId(itemLocalId);
    setEditingVarId(v.id ?? "__noid__");
    setVSizeId(v.sizeId);
    vSkuTouchedRef.current = true;
    vSkuAutoRef.current = v.sku;
    setVSku(v.sku);
    setVPrice(String(v.price ?? 0));
    setVCompareAt(v.compareAt === null ? "" : String(v.compareAt));
    setVOriginalPrice(v.originalPrice === null || v.originalPrice === undefined ? "" : String(v.originalPrice));
    setVSalePrice(v.salePrice === null || v.salePrice === undefined ? "" : String(v.salePrice));
    setVSaleStartsAt(v.saleStartsAt ? String(v.saleStartsAt) : "");
    setVSaleEndsAt(v.saleEndsAt ? String(v.saleEndsAt) : "");
    setVStock(String(v.stock ?? 0));
    setVThreshold(String(v.lowStockThreshold ?? 0));
    setVWeight(v.weightGrams === null ? "" : String(v.weightGrams));
    setVarError(null);
    setOpenVarModal(true);
  };

  const saveVariant = () => {
    setVarError(null);
    if (!varItemLocalId) return;

    const item = items.find((x) => x.localId === varItemLocalId);
    if (!item) return;

    if (!vSizeId) return setVarError(tr("يرجى اختيار المقاس", "Choose the size"));
    let nextSku = vSku.trim();
    if (!nextSku && !editingVarId) {
      nextSku = buildVariantSku(item, vSizeId);
      if (nextSku) {
        vSkuAutoRef.current = nextSku;
        setVSku(nextSku);
      }
    }
    if (!nextSku) return setVarError(tr("SKU مطلوب", "SKU is required"));
    const skuKey = nextSku.toUpperCase();
    const duplicateSku = items.some((it) =>
      (it.variants ?? []).some((v) => {
        const existingSku = (v.sku ?? "").trim().toUpperCase();
        if (!existingSku) return false;
        // ignore the current variant being edited
        if (editingVarId && v.id === editingVarId) return false;
        if (!v.id && editingVarId === "__noid__" && it.localId === varItemLocalId && v.sizeId === vSizeId) {
          return false;
        }
        return existingSku === skuKey;
      })
    );
    if (duplicateSku) return setVarError(tr("SKU مكرر. لازم يكون فريد لكل المقاسات/الألوان.", "The SKU repeats. It has to be unique across sizes/colours."));
    const priceN = toNumber(vPrice);
    if (priceN <= 0) return setVarError(tr("السعر لازم يكون أكبر من 0", "The price has to be more than 0"));
    const stockN = Math.max(0, parseInt(vStock || "0", 10) || 0);
    const thresholdN = Math.max(0, parseInt(vThreshold || "0", 10) || 0);
    const originalRaw = vOriginalPrice.trim();
    const saleRaw = vSalePrice.trim();
    const originalN = originalRaw ? toNumber(originalRaw) : editingVarId ? null : undefined;
    const salePriceN = saleRaw ? toNumber(saleRaw) : null;
    if (saleRaw && salePriceN != null && salePriceN <= 0) return setVarError(tr("سعر التخفيض لازم يكون أكبر من 0", "The sale price has to be more than 0"));
    const saleStartIso = vSaleStartsAt.trim() ? fromDateTimeInput(vSaleStartsAt) : null;
    const saleEndIso = vSaleEndsAt.trim() ? fromDateTimeInput(vSaleEndsAt) : null;
    if (vSaleStartsAt.trim() && !saleStartIso) return setVarError(tr("تاريخ بداية الخصم غير صالح", "The discount start date isn't valid"));
    if (vSaleEndsAt.trim() && !saleEndIso) return setVarError(tr("تاريخ نهاية الخصم غير صالح", "The discount end date isn't valid"));
    if (saleStartIso && saleEndIso && new Date(saleStartIso) > new Date(saleEndIso)) {
      return setVarError(tr("تاريخ نهاية الخصم لازم يكون بعد البداية", "The discount end has to be after the start"));
    }

    // منع تكرار size لنفس item
    const duplicate = item.variants.some((x) => x.sizeId === vSizeId && (editingVarId ? x.id !== editingVarId : true));
    // ملاحظة: للـvariants اللي بدون id (جدد) بنقارنه بطريقة ثانية:
    const duplicateNew = item.variants.some((x) => x.sizeId === vSizeId && !x.id && !editingVarId);
    if (duplicate || duplicateNew) return setVarError(tr("هذا المقاس موجود مسبقًا لنفس اللون/الـItem. يرجى اختيار مقاس ثاني.", "This size already exists for this colour/Item. Choose another size."));

    const payload: LocalVariant = {
      id: editingVarId && editingVarId !== "__noid__" ? editingVarId : undefined,
      sizeId: vSizeId,
      sku: nextSku,
      price: priceN,
      compareAt: vCompareAt.trim() ? toNumber(vCompareAt) : null,
      stock: stockN,
      lowStockThreshold: thresholdN,
      weightGrams: vWeight.trim() ? Math.max(0, parseInt(vWeight, 10) || 0) : null,
    };
    if (originalN !== undefined) payload.originalPrice = originalN;
    payload.salePrice = salePriceN;
    payload.saleStartsAt = saleStartIso;
    payload.saleEndsAt = saleEndIso;

    setItems((prev) =>
      prev.map((it) => {
        if (it.localId !== varItemLocalId) return it;

        if (payload.id) {
          return { ...it, variants: (it.variants ?? []).map((x) => (x.id === payload.id ? payload : x)) };
        }

        // create new variant (بدون id)
        return { ...it, variants: [...(it.variants ?? []), payload] };
      })
    );

    setOpenVarModal(false);
  };

  const deleteVariant = (itemLocalId: string, v: LocalVariant) => {
    if (v.id) addDeleteId(setDeleteVariantIds, v.id);
    setItems((prev) =>
      prev.map((it) => (it.localId === itemLocalId ? { ...it, variants: (it.variants ?? []).filter((x) => x !== v) } : it))
    );
  };

  // === Bulk add sizes (multiple variants at once) ===
  const [openBulkModal, setOpenBulkModal] = useState(false);
  const [bulkItemLocalId, setBulkItemLocalId] = useState<string | null>(null);
  const [bulkSelectedSizeIds, setBulkSelectedSizeIds] = useState<string[]>([]);
  const [bulkSkuPrefix, setBulkSkuPrefix] = useState<string>("");
  const [bulkPriceMode, setBulkPriceMode] = useState<"default" | "manual">("default");
  const [bulkPrice, setBulkPrice] = useState<string>("0");
  const [bulkPriceBySize, setBulkPriceBySize] = useState<Record<string, string>>({});
  const [bulkStockMode, setBulkStockMode] = useState<"default" | "manual">("default");
  const [bulkStock, setBulkStock] = useState<string>("0");
  const [bulkStockBySize, setBulkStockBySize] = useState<Record<string, string>>({});
  const [bulkThreshold, setBulkThreshold] = useState<string>("0");
  const [bulkWeight, setBulkWeight] = useState<string>("");
  const [bulkSuggestionNote, setBulkSuggestionNote] = useState<string>("");
  const [bulkError, setBulkError] = useState<string | null>(null);

  const getSuggestedBulkDefaults = (itemLocalId: string) => {
    const it = items.find((x) => x.localId === itemLocalId);
    const usedSizeIds = new Set((it?.variants ?? []).map((v) => v.sizeId));
    const availableIds = sizes.filter((s) => s.active !== false && !usedSizeIds.has(s.id)).map((s) => s.id);
    const variants = [
      ...(it?.variants ?? []),
      ...items.flatMap((item) => item.variants ?? []),
    ];
    const priced = variants.find((variant) => toNumber(variant.price) > 0);
    const stocked = variants.find((variant) => typeof variant.stock === "number");

    return {
      availableIds,
      price: priced ? String(priced.price ?? 0) : "0",
      stock: stocked ? String(stocked.stock ?? 0) : "0",
      threshold: stocked ? String(stocked.lowStockThreshold ?? 0) : "0",
      weight: stocked?.weightGrams ? String(stocked.weightGrams) : "",
    };
  };

  const openBulkAddSizes = (itemLocalId: string, opts?: { preselectAll?: boolean }) => {
    const it = items.find((x) => x.localId === itemLocalId);
    const suggested = getSuggestedBulkDefaults(itemLocalId);
    setBulkItemLocalId(itemLocalId);
    setBulkSelectedSizeIds(opts?.preselectAll ? suggested.availableIds : []);
    setBulkSkuPrefix(it?.skuBase ?? "");
    setBulkPriceMode("default");
    setBulkPrice(suggested.price);
    setBulkPriceBySize(
      opts?.preselectAll
        ? Object.fromEntries(suggested.availableIds.map((id) => [id, suggested.price]))
        : {}
    );
    setBulkStockMode("default");
    setBulkStock(suggested.stock);
    setBulkStockBySize(
      opts?.preselectAll
        ? Object.fromEntries(suggested.availableIds.map((id) => [id, suggested.stock]))
        : {}
    );
    setBulkThreshold(suggested.threshold);
    setBulkWeight(suggested.weight);
    setBulkSuggestionNote(
      opts?.preselectAll
        ? tr(`تم تحديد ${suggested.availableIds.length} مقاس متاح واستخدام أقرب سعر/مخزون كاقتراح.`, "{0} available sizes selected, using the nearest price/stock as a suggestion.", [suggested.availableIds.length])
        : ""
    );
    setBulkError(null);
    setOpenBulkModal(true);
  };

  const openSuggestedBulkAddSizes = (itemLocalId: string) => {
    const suggested = getSuggestedBulkDefaults(itemLocalId);
    if (!suggested.availableIds.length) {
      setItemError(tr("لا يوجد مقاسات متاحة لهذا اللون. كل المقاسات الفعالة موجودة بالفعل.", "No sizes available for this colour. Every active size is already there."));
      return;
    }
    setItemError(null);
    openBulkAddSizes(itemLocalId, { preselectAll: true });
  };

  const toggleBulkSize = (sizeId: string) => {
    setBulkSelectedSizeIds((prev) => {
      const has = prev.includes(sizeId);
      if (has) {
        setBulkPriceBySize((prices) => {
          const next = { ...prices };
          delete next[sizeId];
          return next;
        });
        setBulkStockBySize((stocks) => {
          const next = { ...stocks };
          delete next[sizeId];
          return next;
        });
        return prev.filter((x) => x !== sizeId);
      }

      setBulkPriceBySize((prices) => ({ ...prices, [sizeId]: prices[sizeId] ?? bulkPrice }));
      setBulkStockBySize((stocks) => ({ ...stocks, [sizeId]: stocks[sizeId] ?? bulkStock }));
      return [...prev, sizeId];
    });
  };

  const selectAllBulkSizes = (availableIds: string[]) => {
    setBulkSelectedSizeIds(availableIds);
    setBulkPriceBySize((prev) => {
      const next = { ...prev };
      for (const id of availableIds) next[id] = next[id] ?? bulkPrice;
      return next;
    });
    setBulkStockBySize((prev) => {
      const next = { ...prev };
      for (const id of availableIds) next[id] = next[id] ?? bulkStock;
      return next;
    });
  };

  const clearBulkSizes = () => {
    setBulkSelectedSizeIds([]);
    setBulkPriceBySize({});
    setBulkStockBySize({});
  };

  const updateBulkPriceForSize = (sizeId: string, value: string) => {
    setBulkPriceBySize((prev) => ({ ...prev, [sizeId]: value }));
  };

  const updateBulkStockForSize = (sizeId: string, value: string) => {
    setBulkStockBySize((prev) => ({ ...prev, [sizeId]: value }));
  };

  const fillSelectedBulkPrices = () => {
    setBulkPriceBySize((prev) => {
      const next = { ...prev };
      for (const id of bulkSelectedSizeIds) next[id] = bulkPrice;
      return next;
    });
  };

  const fillSelectedBulkStocks = () => {
    setBulkStockBySize((prev) => {
      const next = { ...prev };
      for (const id of bulkSelectedSizeIds) next[id] = bulkStock;
      return next;
    });
  };

  const saveBulkAddSizes = () => {
    setBulkError(null);
    if (!bulkItemLocalId) return;

    const it = items.find((x) => x.localId === bulkItemLocalId);
    if (!it) return;

    const usedSizeIds = new Set((it.variants ?? []).map((v) => v.sizeId));
    const pickIds = (bulkSelectedSizeIds ?? []).filter((id) => !usedSizeIds.has(id));
    if (!pickIds.length) return setBulkError(tr("يرجى اختيار مقاس واحد على الأقل (غير مستخدم).", "Choose at least one (unused) size."));

    const defaultPriceN = toNumber(bulkPrice);
    if (bulkPriceMode === "default" && defaultPriceN <= 0) return setBulkError(tr("السعر لازم يكون أكبر من 0", "The price has to be more than 0"));
    const priceBySize = new Map<string, number>();
    if (bulkPriceMode === "manual") {
      for (const sizeId of pickIds) {
        const price = toNumber(bulkPriceBySize[sizeId]);
        if (price <= 0) {
          const label = sizes.find((s) => s.id === sizeId)?.name ?? sizeId;
          return setBulkError(tr(`يرجى تحديد سعر صالح للمقاس: ${label}`, "Set a valid price for the size: {0}", [label]));
        }
        priceBySize.set(sizeId, price);
      }
    }
    const stockN = Math.max(0, parseInt(bulkStock || "0", 10) || 0);
    const stockBySize = new Map<string, number>();
    if (bulkStockMode === "manual") {
      for (const sizeId of pickIds) {
        const raw = bulkStockBySize[sizeId];
        const stock = Math.max(0, parseInt(raw || "0", 10) || 0);
        stockBySize.set(sizeId, stock);
      }
    }
    const thresholdN = Math.max(0, parseInt(bulkThreshold || "0", 10) || 0);
    const weightN = bulkWeight.trim() ? Math.max(0, parseInt(bulkWeight, 10) || 0) : null;

    const usedSkus = new Set((it.variants ?? []).map((v) => v.sku).filter(Boolean).map((sku) => String(sku).toUpperCase()));
    const prefix = (bulkSkuPrefix || it.skuBase || "").trim() || "SKU";

    const newVars: LocalVariant[] = pickIds.map((sizeId) => {
      const sizeName = sizes.find((s) => s.id === sizeId)?.name ?? "SIZE";
      const suffix = transliterate(String(sizeName))
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 18) || "SIZE";
      const rawSku = `${prefix}-${suffix}`;
      const sku = makeUniqueSku(rawSku, usedSkus);

      return {
        sizeId,
        sku,
        price: bulkPriceMode === "manual" ? priceBySize.get(sizeId) ?? defaultPriceN : defaultPriceN,
        compareAt: null,
        stock: bulkStockMode === "manual" ? stockBySize.get(sizeId) ?? stockN : stockN,
        lowStockThreshold: thresholdN,
        weightGrams: weightN,
      };
    });

    setItems((prev) =>
      prev.map((x) => (x.localId === bulkItemLocalId ? { ...x, variants: [...(x.variants ?? []), ...newVars] } : x))
    );

    setOpenBulkModal(false);
  };

  // === Item modal (create/edit) ===
  const [openItemModal, setOpenItemModal] = useState(false);
  const [editingItemLocalId, setEditingItemLocalId] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);

  const openCreateItem = () => {
    // create a draft item immediately so user can upload images/variants inside the modal
    const localId = genLocalId("item");
    setItems((prev) => [
      ...prev,
      {
        localId,
        id: undefined,
        colorName: "",
        boxLabel: "",
        colorHex: "",
        detectedColors: undefined,
        skuBase: "",
        isActive: true,
        images: [],
        variants: [],
      },
    ]);
    setEditingItemLocalId(localId);
    setItemError(null);
    setOpenItemModal(true);
  };

  const openEditItem = (it: LocalItem) => {
    setEditingItemLocalId(it.localId);
    setItemError(null);
    setOpenItemModal(true);
  };

  const cancelItemModal = () => {
    const it = items.find((x) => x.localId === editingItemLocalId);
    setOpenItemModal(false);
    setEditingItemLocalId(null);
    setItemError(null);

    // if this is a brand new empty draft, remove it to avoid clutter
    if (it && !it.id) {
      const empty =
        !it.colorName.trim() &&
        !it.boxLabel.trim() &&
        !it.skuBase.trim() &&
        (it.images?.length ?? 0) === 0 &&
        (it.variants?.length ?? 0) === 0;
      if (empty) {
        setItems((prev) => prev.filter((x) => x.localId !== it.localId));
      }
    }
  };

    const saveItemModal = () => {
      setItemError(null);
      if (!editingItemLocalId) return setOpenItemModal(false);

    const it = items.find((x) => x.localId === editingItemLocalId);
    if (!it) return setOpenItemModal(false);

    if (!it.colorName.trim()) return setItemError(tr("اسم اللون مطلوب", "The colour name is required"));
      if (!it.skuBase.trim()) return setItemError(tr("skuBase مطلوب", "skuBase is required"));

      const normalizedName = normalizeColorNameInput(it.colorName);
      const normalizedBox = normalizeBoxLabelInput(it.boxLabel);
      const sameColor = items.some((x) => x.localId !== it.localId && normalizeColorNameInput(x.colorName) === normalizedName);
      if (sameColor && !normalizedBox) {
        return setItemError(tr("نفس اللون موجود مسبقًا. لازم ينضاف اسم/تمييز للعلبة لتمييزه.", "The same colour already exists. Add a box name/label to tell them apart."));
      }

      // enforce unique colorName + boxLabel per product
      const key = itemKeyFromParts(it.colorName, it.boxLabel);
      const duplicate = items.some((x) => x.localId !== it.localId && itemKeyFromParts(x.colorName, x.boxLabel) === key);
      if (duplicate) return setItemError(tr("هذا اللون مع نفس اسم العلبة موجود مسبقًا.", "This colour with the same box name already exists."));

      const normHex = normalizeHex(it.colorHex.trim()) ?? "";
      const uniqueSkuBase = ensureUniqueSkuBase(it.skuBase.trim(), items as any, it.localId);

      updateItem(it.localId, {
        colorName: it.colorName.trim(),
        boxLabel: it.boxLabel.trim(),
        colorHex: normHex,
        skuBase: uniqueSkuBase || it.skuBase.trim(),
        isActive: !!it.isActive,
      });

      setOpenItemModal(false);
      setEditingItemLocalId(null);
    };

  const draftBody = useMemo<DeepUpdateBody>(() => {
    return {
      product: {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() ? description : null,
        isActive,
        categoryId,
      },
      items: items.map((it) => ({
        id: it.id,
        colorName: it.colorName.trim(),
        boxLabel: it.boxLabel.trim(),
        colorHex: it.colorHex.trim() ? it.colorHex.trim() : null,
        suggestedColors: it.detectedColors && it.detectedColors.length ? it.detectedColors : undefined,
        skuBase: it.skuBase.trim(),
        isActive: it.isActive,
        images: normalizeImages(it.images).map((im) => ({
          id: im.id,
          url: im.url,
          alt: (im.alt ?? "").trim() ? (im.alt ?? "").trim() : null,
          position: im.position ?? 0,
          isPrimary: !!im.isPrimary,
          view: im.view ?? null,
        })),
        variants: (it.variants ?? []).map((v) => ({
          id: v.id,
          sizeId: v.sizeId,
          sku: v.sku.trim(),
          price: toNumber(v.price),
          compareAt: v.compareAt === null ? null : toNumber(v.compareAt),
          originalPrice:
            v.originalPrice === undefined
              ? undefined
              : v.originalPrice === null
              ? null
              : toNumber(v.originalPrice),
          salePrice: v.salePrice === null || v.salePrice === undefined ? null : toNumber(v.salePrice),
          saleStartsAt: v.saleStartsAt ? fromDateTimeInput(v.saleStartsAt) : null,
          saleEndsAt: v.saleEndsAt ? fromDateTimeInput(v.saleEndsAt) : null,
          stock: Math.max(0, v.stock ?? 0),
          lowStockThreshold: Math.max(0, v.lowStockThreshold ?? 0),
          weightGrams: v.weightGrams === null ? null : Math.max(0, v.weightGrams ?? 0),
        })),
      })),
      deleteItemIds: deleteItemIds.length ? deleteItemIds : undefined,
      deleteImageIds: deleteImageIds.length ? deleteImageIds : undefined,
      deleteVariantIds: deleteVariantIds.length ? deleteVariantIds : undefined,
    };
  }, [title, slug, description, isActive, categoryId, items, deleteItemIds, deleteImageIds, deleteVariantIds]);

  // === Save whole product ===
  const onSaveAll = async () => {
    setPageError(null);
    if (!productId) return;

    if (!title.trim()) return setPageError(tr("عنوان المنتج مطلوب", "The product title is required"));
    if (!slug.trim()) return setPageError(tr("Slug مطلوب", "Slug is required"));
    if (!categoryId) return setPageError(tr("يرجى اختيار قسم", "Choose a category"));
    if (categories.length && !categories.some((c) => c.id === categoryId)) {
      return setPageError(tr("القسم غير موجود أو انحذف. يرجى اختيار قسم صالح.", "The category doesn't exist or was deleted. Choose a valid one."));
    }

    // extra validation: each item should have unique colorName + boxLabel
    const keys = items
      .map((x) => itemKeyFromParts(x.colorName, x.boxLabel))
      .filter((k) => k.replace("::", "").trim());
    const uniq = new Set(keys);
    if (uniq.size !== keys.length) return setPageError(tr("في تكرار بالألوان مع نفس اسم العلبة (items).", "Colours repeat with the same box name (items)."));

    // if same color is used multiple times, require boxLabel for distinction
    const byColor = new Map<string, number>();
    for (const it of items) {
      const nameKey = normalizeColorNameInput(it.colorName);
      if (!nameKey) continue;
      byColor.set(nameKey, (byColor.get(nameKey) ?? 0) + 1);
    }
    for (const it of items) {
      const nameKey = normalizeColorNameInput(it.colorName);
      if (!nameKey) continue;
      if ((byColor.get(nameKey) ?? 0) > 1 && !normalizeBoxLabelInput(it.boxLabel)) {
        return setPageError(tr(`لون مكرر بدون اسم علبة: ${it.colorName}. لازم ينضاف تمييز للعلبة.`, "A repeated colour without a box name: {0}. Add a box label.", [it.colorName]));
      }
    }

    // validation: variants must not duplicate size per item
    for (const it of items) {
      const seen = new Set<string>();
      for (const v of (it.variants ?? [])) {
        if (!v.sizeId) return setPageError(tr(`في Variant بدون size داخل item: ${it.colorName}`, "A variant without a size in item: {0}", [it.colorName]));
        if (seen.has(v.sizeId)) return setPageError(tr(`تكرار size داخل item: ${it.colorName}`, "A repeated size in item: {0}", [it.colorName]));
        seen.add(v.sizeId);
      }
    }

    // validation: SKU must be unique across all variants
    const skuSeen = new Set<string>();
    for (const it of items) {
      for (const v of (it.variants ?? [])) {
        const sku = (v.sku ?? "").trim();
        if (!sku) return setPageError(tr(`في Variant بدون SKU داخل item: ${it.colorName}`, "A variant without a SKU in item: {0}", [it.colorName]));
        const key = sku.toUpperCase();
        if (skuSeen.has(key)) return setPageError(tr(`SKU مكرر: ${sku}`, "Repeated SKU: {0}", [sku]));
        skuSeen.add(key);
      }
    }

    if (qSizes.data?.length) {
      const validSizeIds = new Set(qSizes.data.map((s) => s.id));
      for (const it of items) {
        for (const v of (it.variants ?? [])) {
          if (!validSizeIds.has(v.sizeId)) {
            return setPageError(tr(`المقاس غير موجود أو انحذف. يرجى تعديل المقاسات في اللون: ${it.colorName || "بدون اسم"}`, "The size doesn't exist or was deleted. Please fix the sizes in the colour: {0}", [it.colorName || "بدون اسم"]));
          }
        }
      }
    }

    if (isActive) {
      const activeItems = items.filter((it) => it.isActive);
      if (activeItems.length === 0) {
        return setPageError(tr("لا يوجد أي لون (Item) فعّال للمنتج.", "The product has no active colour (Item)."));
      }
      for (const it of activeItems) {
        const label = it.colorName?.trim() || tr("بدون اسم", "untitled");
        if (!(it.images ?? []).length) {
          return setPageError(tr(`اللون "${label}" بدون صور. لازم تنضاف صورة واحدة على الأقل قبل النشر.`, "The colour “{0}” has no photos. Add at least one photo before publishing.", [label]));
        }
        if (!(it.variants ?? []).length) {
          return setPageError(tr(`اللون "${label}" بدون مقاسات (Variants). لازم ينضاف مقاس واحد على الأقل قبل النشر.`, "The colour “{0}” has no sizes (variants). Add at least one size before publishing.", [label]));
        }
      }
    }

    mSave.mutate(draftBody);
  };

  // UI: size options per item (exclude used sizes)
  const sizeOptionsForItem = (it: LocalItem, editingSizeId?: string) => {
    const used = new Set((it.variants ?? []).map((v) => v.sizeId));
    if (editingSizeId) used.delete(editingSizeId);
    return sizes
      .filter((s) => s.active !== false)
      .filter((s) => !used.has(s.id))
      .map((s) => ({ value: s.id, label: s.name }));
  };

  // === confirmations ===
  const [confirmDeleteItemLocalId, setConfirmDeleteItemLocalId] = useState<string | null>(null);

  // === Quick setup (لما المنتج ما فيه Items/Variants بعد) ===
  const defaultSkuBase = useMemo(() => {
    const base = transliterate(slug || title || "PRODUCT").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return base || "PRODUCT";
  }, [slug, title]);

  const getFirstActiveSizeId = () => {
    const active = sizes.filter((s) => s.active !== false);
    return active[0]?.id ?? "";
  };

  const quickCreateFirstItemAndVariant = () => {
    setPageError(null);
    const sizeId = getFirstActiveSizeId();
    if (!sizeId) {
      setPageError(tr("لا يوجد مقاسات فعّالة. أولاً لازم ينضاف مقاس من صفحة المقاسات (مثلاً: One Size) وبعدها الرجوع لهون.", "No active sizes. First add a size on the sizes page (e.g. One Size), then come back here."));
      return;
    }

    const localId = genLocalId("item");
    const skuBase = ensureUniqueSkuBase(`${defaultSkuBase}-DEFAULT`, items as any);

    // أنشئ Item جديد بشكل فوري عشان تظهر أقسام الصور والسعر
    setItems((prev) => [
      ...prev,
      {
        localId,
        id: undefined,
        colorName: "Default",
        boxLabel: "",
        colorHex: "",
        detectedColors: undefined,
        skuBase,
        isActive: true,
        images: [],
        variants: [],
      },
    ]);

    // افتح مودال الـ Variant مباشرة عشان المستخدم يحط السعر والمخزون
    // (نستخدم setTimeout بسيط عشان الـ state يتحدث)
    setTimeout(() => {
      openCreateVariant(localId);
      setVSizeId(sizeId);
      applyAutoVariantSku(localId, sizeId, true);
      setVPrice("0");
      setVStock("0");
      setVThreshold("0");
      setVCompareAt("");
      setVWeight("");
    }, 0);
  };

  if (qProduct.isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">{tr("جاري تحميل المنتج…", "Loading the product…")}</div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-36 lg:col-span-2" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (qProduct.isError || !qProduct.data) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
        {tr("فشل تحميل المنتج.", "The product couldn't load.")}
        <div className="mt-4">
          <Button variant="ghost" onClick={() => nav("/admin/catalog/products")}>
            {tr("رجوع", "Back")}
          </Button>
        </div>
      </div>
    );
  }

  const p = qProduct.data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold">{tr("تحرير المنتج", "Edit product")}</div>
            <div className="mt-1 text-xs opacity-70 break-all">ID: {p.id}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => nav("/admin/catalog/products")}>
              {tr("رجوع", "Back")}
            </Button>
            {items.length === 0 ? (
              <Button variant="secondary" onClick={quickCreateFirstItemAndVariant}>
                {tr("إعداد سريع (لون + سعر)", "Quick setup (colour + price)")}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setWizardOpen(true)} disabled={!productId}>
              {tr("رفع وتجميع الصور", "Upload and group photos")}
            </Button>
            <Button variant="secondary" onClick={openCreateItem}>
              {tr("إضافة مجموعة لون", "Add a colour group")}
            </Button>
            <Button variant="primary" onClick={onSaveAll} isLoading={mSave.isPending}>
              {tr("حفظ الكل", "Save all")}
            </Button>

            </div>
          </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Input label={tr("العنوان", "Title")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />

          <Select
            label={tr("التصنيف", "Category")}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div className="flex items-center gap-2 pt-7">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-sm">{tr("فعال", "Active")}</span>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium">{tr("الوصف (اختياري)", "Description (optional)")}</label>
            <textarea
              className="min-h-[140px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {pageError ? (
            <div className="lg:col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
              {pageError}
            </div>
          ) : null}
        </div>
      </div>

      {/* Empty state: product has no items yet */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">{tr("ليش اختفت الصور/السعر/المخزون؟", "Where did the photos/price/stock go?")}</div>
          <div className="mt-1 text-xs opacity-80 leading-6">
            {tr("بهالنسخة،", "In this version,")} <span className="font-semibold">{tr("الصور", "photos")}</span> {tr("على مستوى", "are per")} <span className="font-semibold">{tr("اللون (Item)", "colour (Item)")}</span>{tr("، و", ", and")}<span className="font-semibold">{tr("السعر/المخزون", "price/stock")}</span>
            {tr("على مستوى", "are per")} <span className="font-semibold">Variant</span>{tr(". إذا المنتج ما فيه Items بعد، بتظهر بس بيانات المنتج.", ". If the product has no items yet, only the product's details show.")}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={quickCreateFirstItemAndVariant}>
              {tr("إنشاء لون افتراضي + فتح السعر", "Create a default colour + open the price")}
            </Button>
            <Button variant="secondary" onClick={openCreateItem}>
              {tr("إنشاء لون يدوي", "Create a colour by hand")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => nav("/admin/catalog/sizes")}
              title={tr("إذا ما في مقاسات، لازم ينضاف واحد (مثل One Size)", "Without sizes you need to add one (like One Size)")}
            >
              {tr("فتح صفحة المقاسات", "Open the sizes page")}
            </Button>
          </div>
        </div>
      ) : null}

      {items.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">{tr("مجموعات الألوان", "Colour groups")}</div>
              <div className="mt-1 text-xs opacity-70">{tr("اختيار مجموعة بيفتح صورها ومقاساتها.", "Choose a group to open its photos and sizes.")}</div>
            </div>
            <Button variant="primary" onClick={openCreateItem}>
              {tr("إضافة مجموعة لون", "Add a colour group")}
            </Button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {items.map((it) => {
              const safeHex = normalizeHex(it.colorHex);
              return (
                <button
                  key={it.localId}
                  type="button"
                  onClick={() => openEditItem(it)}
                  className="flex min-w-[180px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-start transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded-full border border-white/20"
                    style={{ backgroundColor: safeHex ?? "transparent" }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {it.colorName || tr("لون جديد", "New colour")}
                      {it.boxLabel ? ` - ${it.boxLabel}` : ""}
                    </span>
                    <span className="block truncate text-xs opacity-65" dir="ltr">
                      {it.skuBase || "SKU"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Items */}
      <div className="space-y-3">
        {items.map((it) => {
          const primary = (it.images ?? []).find((x) => x.isPrimary) ?? (it.images ?? [])[0];
          const itemDiscount = resolveItemDiscountInfo(it);
          return (
            <div key={it.localId} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    {normalizeHex(it.colorHex) ? (
                      <span
                        title={normalizeHex(it.colorHex) ?? ""}
                        className="h-5 w-5 rounded-full border border-white/20"
                        style={{ backgroundColor: normalizeHex(it.colorHex) ?? "transparent" }}
                      />
                    ) : null}
                    <div className="text-lg font-semibold truncate">
                      {(() => {
                        const name = it.colorName || tr("(بدون اسم لون)", "(no colour name)");
                        const box = (it.boxLabel ?? "").trim();
                        return box ? `${name} — ${box}` : name;
                      })()}
                      {!it.isActive ? <span className="ms-2 text-xs opacity-60">{tr("(غير فعال)", "(inactive)")}</span> : null}
                    </div>
                  </div>
                  <div className="mt-1 text-xs opacity-70">skuBase: {it.skuBase || "—"}</div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative h-12 w-12 overflow-visible">
                      <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                        {primary?.url ? (
                          <AsyncImage
                            src={primary.url}
                            alt=""
                            wrapperClassName="h-full w-full"
                            className="h-full w-full object-cover"
                            fallback={<span className="text-[9px] opacity-60">IMG</span>}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] opacity-60">No image</div>
                        )}
                      </div>
                      {itemDiscount ? (
                        <div className="pointer-events-none absolute -start-2 -top-2 z-10">
                          <DiscountShapeBadge discount={itemDiscount} compact />
                        </div>
                      ) : null}
                    </div>

                    <div className="text-xs opacity-80">
                      <div>{tr("صور:", "Photos:")} {(it.images ?? []).length}</div>
                      <div>Variants: {(it.variants ?? []).length}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEditItem(it)}>
                    {tr("إدارة اللون (Modal)", "Manage colour")}
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmDeleteItemLocalId(it.localId)}>
                    {tr("حذف Item", "Delete item")}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Item Modal */}
      <Modal
        open={openItemModal}
        title={tr("إدارة لون المنتج (Item)", "Manage the product's colour (Item)")}
        onCancel={cancelItemModal}
        widthClassName="max-w-6xl"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={cancelItemModal}>
              {tr("إغلاق", "Close")}
            </Button>
            <Button variant="primary" onClick={saveItemModal}>
              {tr("حفظ", "Save")}
            </Button>
          </div>
        }
      >
        {(() => {
          const it = items.find((x) => x.localId === editingItemLocalId);
          if (!it) return <div className="text-sm opacity-70">{tr("Item غير موجود.", "Item not found.")}</div>;

          const palette = it.detectedColors ?? [];
          const safeHex = normalizeHex(it.colorHex) ?? "#000000";
          const presets = [
            "#000000",
            "#ffffff",
            "#ef4444",
            "#f97316",
            "#eab308",
            "#22c55e",
            "#06b6d4",
            "#3b82f6",
            "#8b5cf6",
            "#ec4899",
          ];

          return (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label={tr("اسم اللون", "Colour name")}
                      value={it.colorName}
                      onChange={(e) => handleColorNameChange(it.localId, e.target.value)}
                    />

                    <Input
                      label={tr("اسم العلبة (boxLabel) اختياري", "Box name (boxLabel), optional")}
                      value={it.boxLabel}
                      onChange={(e) => handleBoxLabelChange(it.localId, e.target.value)}
                      placeholder={tr("مثال: علبة A", "e.g. Box A")}
                    />

                    <Input
                      label="SKU base (English)"
                      value={it.skuBase}
                      onChange={(e) => updateItem(it.localId, { skuBase: e.target.value })}
                      placeholder={tr("مثال: TSHIRT-BLACK", "e.g. TSHIRT-BLACK")}
                    />

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-semibold">{tr("اختيار اللون", "Choose colour")}</div>
                        <div className="flex items-center gap-2" dir="ltr">
                          <Button
                            variant="ghost"
                            onClick={() => pickItemColorWithEyeDropper(it.localId)}
                            disabled={!isEyeDropperSupported()}
                            title={isEyeDropperSupported() ? tr("قطّارة", "Colour picker") : tr("المتصفح لا يدعم EyeDropper", "The browser doesn't support EyeDropper")}
                          >
                            {tr("قطّارة", "Colour picker")}
                          </Button>
                          <input
                            type="color"
                            value={safeHex}
                            onChange={(e) => applyColorHex(it.localId, e.target.value)}
                            className="h-9 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                            title="Color picker"
                          />
                          <div className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: safeHex }} />
                        </div>
                      </div>

                      <Input
                        label={tr("Hex (اختياري)", "Hex (optional)")}
                        value={it.colorHex}
                        onChange={(e) => applyColorHex(it.localId, e.target.value)}
                        placeholder="#000000"
                      />

                      <div className="mt-2 flex flex-wrap gap-2">
                        {presets.map((c) => (
                          <button
                            key={c}
                            type="button"
                            title={c}
                            className="h-6 w-6 rounded-full border border-white/20 hover:scale-105 transition"
                            style={{ backgroundColor: c }}
                            onClick={() => applyColorHex(it.localId, c)}
                          />
                        ))}
                      </div>

                      {palette.length ? (
                        <div className="mt-3">
                          <div className="text-xs opacity-70 mb-2">{tr("ألوان مقترحة من الصورة:", "Colours suggested from the photo:")}</div>
                          <div className="flex flex-wrap gap-2">
                            {palette.map((c) => (
                              <button
                                key={c}
                                type="button"
                                title={c}
                                className="h-7 w-7 rounded-full border border-white/20 hover:scale-105 transition"
                                style={{ backgroundColor: c }}
                                onClick={() => applyColorHex(it.localId, c)}
                              />
                            ))}
                            <Button
                              variant="ghost"
                              onClick={() => {
                                if (palette[0]) applyColorHex(it.localId, palette[0]);
                              }}
                            >
                              {tr("استخدام الأفضل", "Use the best")}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        checked={it.isActive}
                        onChange={(e) => updateItem(it.localId, { isActive: e.target.checked })}
                      />
                      <span className="text-sm">{tr("فعال", "Active")}</span>
                    </div>

                    {itemError ? (
                      <div className="sm:col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                        {itemError}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold">{tr("ملخص", "Summary")}</div>
                  <div className="mt-2 text-xs opacity-80 space-y-1">
                    <div>{tr("صور:", "Photos:")} {(it.images ?? []).length}</div>
                    <div>Variants: {(it.variants ?? []).length}</div>
                    <div className="opacity-70">{tr("ملاحظة: الصور على مستوى اللون (Item) والسعر/المخزون على مستوى Variant.", "Note: photos are per colour (Item) and price/stock per variant.")}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ItemImagesManager
                  images={it.images}
                  onChange={(next) => onImagesChange(it.localId, next)}
                  onPickColor={(hex) => applyColorHex(it.localId, hex)}
                  onDetectedColors={(colors) => {
                    updateItem(it.localId, { detectedColors: colors });
                    if (!normalizeHex(it.colorHex) && colors?.[0]) {
                      applyColorHex(it.localId, colors[0]);
                    }
                  }}
                />

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Variants</div>
                      <div className="text-xs opacity-70">{tr("مقاس + سعر + مخزون", "Size + price + stock")}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs opacity-70">{(it.variants ?? []).length} variants</div>
                      <Button variant="success" onClick={() => openSuggestedBulkAddSizes(it.localId)}>
                        {tr("اقتراح سريع", "Quick suggestion")}
                      </Button>
                      <Button variant="secondary" onClick={() => openBulkAddSizes(it.localId)}>
                        {tr("إضافة عدة مقاسات", "Add several sizes")}
                      </Button>
                      <Button variant="primary" onClick={() => openCreateVariant(it.localId)}>
                        {tr("إضافة Variant", "Add variant")}
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <THead>
                      <TR>
                        <TH>{tr("المقاس", "Size")}</TH>
                        <TH>SKU</TH>
                        <TH>{tr("السعر", "Price")}</TH>
                        <TH>{tr("المخزون", "Stock")}</TH>
                        <TH className="w-72">{tr("إجراءات", "Actions")}</TH>
                      </TR>
                    </THead>

                    <TBody>
                      {(it.variants ?? []).length ? (
                        (it.variants ?? []).map((v, idx) => {
                          const sizeName =
                            sizes.find((s) => s.id === v.sizeId)?.name ??
                            qProduct.data?.items?.find((x) => x.id === it.id)?.variants?.find((vv) => vv.id === v.id)?.size?.name ??
                            v.sizeId;
                          const discount = resolveVariantDiscountInfo(v);
                          const activeDiscount = discount?.state === "active" ? discount : null;
                          const displayPrice = activeDiscount ? activeDiscount.salePrice : toFiniteNumber(v.price) ?? 0;

                          return (
                            <TR key={v.id ?? `${it.localId}_v_${idx}`}>
                              <td className="px-3 py-2 text-sm">{sizeName}</td>
                              <td className="px-3 py-2 text-sm break-all" dir="ltr">
                                {v.sku}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={activeDiscount ? "font-semibold text-rose-200" : undefined}>{formatNumericPrice(displayPrice)}</span>
                                  {activeDiscount ? (
                                    <span className="text-xs opacity-60 line-through">{formatNumericPrice(activeDiscount.basePrice)}</span>
                                  ) : null}
                                  {discount ? <DiscountShapeBadge discount={discount} compact /> : null}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm">{v.stock}</td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <Button variant="secondary" onClick={() => openEditVariant(it.localId, v)}>
                                    {tr("تعديل", "Edit")}
                                  </Button>
                                  <Button variant="danger" onClick={() => deleteVariant(it.localId, v)}>
                                    {tr("حذف", "Delete")}
                                  </Button>
                                </div>
                              </td>
                            </TR>
                          );
                        })
                      ) : (
                        <TR>
                          <td className="px-3 py-3 text-sm opacity-70" colSpan={5}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span>{tr("لا يوجد Variants بعد.", "No variants yet.")}</span>
                              <Button size="sm" variant="success" onClick={() => openSuggestedBulkAddSizes(it.localId)}>
                                {tr("إنشاء من المقاسات الفعالة", "Create from the active sizes")}
                              </Button>
                            </div>
                          </td>
                        </TR>
                      )}
                    </TBody>
                  </Table>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Variant Modal */}
      <Modal
        open={openVarModal}
        title={editingVarId ? tr("تعديل Variant", "Edit variant") : tr("إضافة Variant", "Add variant")}
        onCancel={() => setOpenVarModal(false)}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={saveVariant}>
              {tr("حفظ", "Save")}
            </Button>
          </div>
        }
      >
        {(() => {
          const it = items.find((x) => x.localId === varItemLocalId);
          const options = it ? sizeOptionsForItem(it, editingVarId ? vSizeId : undefined) : [];

          return (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label={tr("المقاس", "Size")}
                value={vSizeId}
                onChange={(e) => handleVariantSizeChange(e.target.value)}
                options={[
                  ...(editingVarId ? [{ value: vSizeId, label: sizes.find((s) => s.id === vSizeId)?.name ?? tr("المقاس الحالي", "Current size") }] : []),
                  ...options,
                ].filter((x) => x.value)}
                placeholder={tr("يرجى اختيار المقاس", "Choose the size")}
              />

              <Input label="SKU" value={vSku} onChange={(e) => handleVariantSkuChange(e.target.value)} />

              <Input label={tr("السعر", "Price")} value={vPrice} onChange={(e) => setVPrice(e.target.value)} />
              <Input label={tr("compareAt (اختياري)", "compareAt (optional)")} value={vCompareAt} onChange={(e) => setVCompareAt(e.target.value)} />
              <Input
                label={tr("السعر الأصلي (اختياري)", "Original price (optional)")}
                value={vOriginalPrice}
                onChange={(e) => setVOriginalPrice(e.target.value)}
                hint={tr("سيعود السعر لهذا الرقم بعد انتهاء التخفيض (إذا مفعّل)", "The price goes back to this after the sale ends (if on)")}
              />
              <Input
                label={tr("سعر التخفيض (اختياري)", "Sale price (optional)")}
                value={vSalePrice}
                onChange={(e) => setVSalePrice(e.target.value)}
              />
              <Input
                type="datetime-local"
                label={tr("بداية التخفيض", "Sale start")}
                value={vSaleStartsAt}
                onChange={(e) => setVSaleStartsAt(e.target.value)}
              />
              <Input
                type="datetime-local"
                label={tr("نهاية التخفيض", "Sale end")}
                value={vSaleEndsAt}
                onChange={(e) => setVSaleEndsAt(e.target.value)}
              />

              <Input label={tr("المخزون", "Stock")} value={vStock} onChange={(e) => setVStock(e.target.value)} />
              <div>
                <Input
                  label={tr("حد التنبيه (اختياري)", "Alert level (optional)")}
                  value={vThreshold}
                  onChange={(e) => setVThreshold(e.target.value)}
                  hint={tr("0 يعني تعطيل تنبيهات المخزون لهذا الـVariant", "0 turns off stock alerts for this variant")}
                />
              </div>
              <Input label={tr("weightGrams (اختياري)", "weightGrams (optional)")} value={vWeight} onChange={(e) => setVWeight(e.target.value)} />

              {varError ? (
                <div className="sm:col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                  {varError}
                </div>
              ) : null}
            </div>
          );
        })()}
      </Modal>

      {/* Bulk add sizes Modal */}
      <Modal
        open={openBulkModal}
        title={tr("إضافة عدة مقاسات دفعة واحدة", "Add several sizes at once")}
        onCancel={() => setOpenBulkModal(false)}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpenBulkModal(false)}>
              {tr("إلغاء", "Cancel")}
            </Button>
            <Button variant="primary" onClick={saveBulkAddSizes}>
              {tr("إضافة", "Add")}
            </Button>
          </div>
        }
      >
        {(() => {
          const it = items.find((x) => x.localId === bulkItemLocalId);
          if (!it) return <div className="text-sm opacity-70">{tr("Item غير موجود.", "Item not found.")}</div>;

          const used = new Set((it.variants ?? []).map((v) => v.sizeId));
          const list = sizes
            .filter((s) => s.active !== false)
            .map((s) => ({ ...s, disabled: used.has(s.id) }));

          const availableIds = list.filter((x) => !x.disabled).map((x) => x.id);

          return (
            <div className="space-y-4">
              {bulkSuggestionNote ? (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  {bulkSuggestionNote}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={tr("SKU Prefix (افتراضي: skuBase)", "SKU prefix (default: skuBase)")}
                  value={bulkSkuPrefix}
                  onChange={(e) => setBulkSkuPrefix(e.target.value)}
                  placeholder={it.skuBase || "SKU"}
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium">{tr("نوع السعر", "Price type")}</label>
                  <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 ${bulkPriceMode === "default" ? "bg-white/15" : "opacity-70 hover:bg-white/5"}`}
                      onClick={() => setBulkPriceMode("default")}
                    >
                      {tr("سعر لكل المقاسات", "One price for all sizes")}
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 ${bulkPriceMode === "manual" ? "bg-white/15" : "opacity-70 hover:bg-white/5"}`}
                      onClick={() => {
                        setBulkPriceMode("manual");
                        fillSelectedBulkPrices();
                      }}
                    >
                      {tr("سعر لكل مقاس", "A price per size")}
                    </button>
                  </div>
                </div>
                <Input
                  label={bulkPriceMode === "default" ? tr("السعر الافتراضي", "Default price") : tr("سعر التعبئة", "Fill price")}
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium">{tr("نوع المخزون", "Stock type")}</label>
                  <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 ${bulkStockMode === "default" ? "bg-white/15" : "opacity-70 hover:bg-white/5"}`}
                      onClick={() => setBulkStockMode("default")}
                    >
                      {tr("مخزون لكل المقاسات", "One stock for all sizes")}
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 ${bulkStockMode === "manual" ? "bg-white/15" : "opacity-70 hover:bg-white/5"}`}
                      onClick={() => {
                        setBulkStockMode("manual");
                        fillSelectedBulkStocks();
                      }}
                    >
                      {tr("مخزون لكل مقاس", "Stock per size")}
                    </button>
                  </div>
                </div>
                <Input
                  label={bulkStockMode === "default" ? tr("المخزون الافتراضي", "Default stock") : tr("مخزون التعبئة", "Fill stock")}
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                />
                <Input
                  label={tr("حد التنبيه (اختياري)", "Alert level (optional)")}
                  value={bulkThreshold}
                  onChange={(e) => setBulkThreshold(e.target.value)}
                  hint={tr("0 يعني تعطيل تنبيهات المخزون", "0 turns off stock alerts")}
                />
                <Input
                  label={tr("weightGrams (اختياري)", "weightGrams (optional)")}
                  value={bulkWeight}
                  onChange={(e) => setBulkWeight(e.target.value)}
                  hint={tr("إذا ضل فارغ، ما منبعث وزن.", "Left empty, no weight is sent.")}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{tr("اختيار المقاسات", "Choose sizes")}</div>
                    <div className="text-xs opacity-70">{tr("المقاسات الموجودة مسبقًا لنفس اللون تكون معطّلة.", "Sizes already in this colour are disabled.")}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => selectAllBulkSizes(availableIds)}>
                      {tr("تحديد الكل", "Select all")}
                    </Button>
                    <Button variant="ghost" onClick={clearBulkSizes}>
                      {tr("مسح", "Clear")}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 max-h-60 overflow-auto rounded-xl border border-white/10">
                  <div className="divide-y divide-white/10">
                    {list.length ? (
                      list.map((s) => (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                            s.disabled ? "opacity-50" : "cursor-pointer hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={s.disabled}
                              checked={bulkSelectedSizeIds.includes(s.id)}
                              onChange={() => toggleBulkSize(s.id)}
                            />
                            <span>{s.name}</span>
                          </div>
                          {s.disabled ? <span className="text-xs opacity-70">{tr("موجود", "exists")}</span> : null}
                        </label>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm opacity-70">{tr("لا يوجد مقاسات.", "No sizes.")}</div>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-xs opacity-70">
                  {tr("مختار:", "Chosen:")} {bulkSelectedSizeIds.length} {tr("/ متاح:", "/ available:")} {availableIds.length}
                </div>
              </div>

              {bulkPriceMode === "manual" && bulkSelectedSizeIds.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{tr("السعر حسب المقاس", "Price by size")}</div>
                      <div className="text-xs opacity-70">{tr("كل مقاس محدد يحصل على سعره الخاص.", "Each chosen size gets its own price.")}</div>
                    </div>
                    <Button variant="secondary" onClick={fillSelectedBulkPrices}>
                      {tr("تعبئة الكل من السعر الافتراضي", "Fill all from the default price")}
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {bulkSelectedSizeIds
                      .map((id) => sizes.find((s) => s.id === id))
                      .filter((s): s is Size => Boolean(s))
                      .map((s) => (
                        <Input
                          key={s.id}
                          label={s.name}
                          value={bulkPriceBySize[s.id] ?? bulkPrice}
                          onChange={(e) => updateBulkPriceForSize(s.id, e.target.value)}
                        />
                      ))}
                  </div>
                </div>
              ) : null}

              {bulkStockMode === "manual" && bulkSelectedSizeIds.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{tr("المخزون حسب المقاس", "Stock by size")}</div>
                      <div className="text-xs opacity-70">{tr("كل مقاس محدد يحصل على مخزونه الخاص.", "Each chosen size gets its own stock.")}</div>
                    </div>
                    <Button variant="secondary" onClick={fillSelectedBulkStocks}>
                      {tr("تعبئة الكل من المخزون الافتراضي", "Fill all from the default stock")}
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {bulkSelectedSizeIds
                      .map((id) => sizes.find((s) => s.id === id))
                      .filter((s): s is Size => Boolean(s))
                      .map((s) => (
                        <Input
                          key={s.id}
                          label={s.name}
                          value={bulkStockBySize[s.id] ?? bulkStock}
                          onChange={(e) => updateBulkStockForSize(s.id, e.target.value)}
                        />
                      ))}
                  </div>
                </div>
              ) : null}

              {bulkError ? (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{bulkError}</div>
              ) : null}
            </div>
          );
        })()}
      </Modal>

      {/* Confirm delete item */}
      <ConfirmDialog
        open={!!confirmDeleteItemLocalId}
        title={tr("تأكيد حذف Item", "Confirm deleting the item")}
        message={tr("حذف الـItem رح يحذف كل الصور والـvariants التابعة إله (من قاعدة البيانات). أكيد؟", "Deleting the item deletes all its photos and variants (from the database). Sure?")}
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        onConfirm={async () => {
          if (!confirmDeleteItemLocalId) return;
          removeItem(confirmDeleteItemLocalId);
          setConfirmDeleteItemLocalId(null);
        }}
        onCancel={() => setConfirmDeleteItemLocalId(null)}
      />
    

<ProductImagesWizardModal
  open={wizardOpen}
  productId={productId ?? null}
  onClose={() => setWizardOpen(false)}
  onCommitted={() => qProduct.refetch()}
/>
</div>
  );
}
