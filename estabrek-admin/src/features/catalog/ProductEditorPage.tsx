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
  const base = (slug || title || "PRODUCT").toUpperCase();
  const cleaned = base
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "PRODUCT";
}

function skuSegmentFromName(name: string) {
  const knownColorSegment = skuSegmentFromColorName(name);
  if (knownColorSegment) return knownColorSegment;

  const cleaned = String(name || "")
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
  const cleaned = String(value || "")
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
  const label = discount.state === "active" ? `-${discount.percent}%` : "خصم قريب";
  return (
    <span
      className={[
        "discount-shape-badge inline-flex items-center border font-semibold shadow-lg backdrop-blur-sm",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        tone,
      ].join(" ")}
      title={discount.state === "active" ? `خصم ${discount.percent}%` : "يوجد خصم مجدول"}
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
      String(sizeName)
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
      setItemError("القطّارة غير مدعومة على هذا المتصفح.");
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

    if (!vSizeId) return setVarError("اختر المقاس");
    let nextSku = vSku.trim();
    if (!nextSku && !editingVarId) {
      nextSku = buildVariantSku(item, vSizeId);
      if (nextSku) {
        vSkuAutoRef.current = nextSku;
        setVSku(nextSku);
      }
    }
    if (!nextSku) return setVarError("SKU مطلوب");
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
    if (duplicateSku) return setVarError("SKU مكرر. لازم يكون فريد لكل المقاسات/الألوان.");
    const priceN = toNumber(vPrice);
    if (priceN <= 0) return setVarError("السعر لازم يكون أكبر من 0");
    const stockN = Math.max(0, parseInt(vStock || "0", 10) || 0);
    const thresholdN = Math.max(0, parseInt(vThreshold || "0", 10) || 0);
    const originalRaw = vOriginalPrice.trim();
    const saleRaw = vSalePrice.trim();
    const originalN = originalRaw ? toNumber(originalRaw) : editingVarId ? null : undefined;
    const salePriceN = saleRaw ? toNumber(saleRaw) : null;
    if (saleRaw && salePriceN != null && salePriceN <= 0) return setVarError("سعر التخفيض لازم يكون أكبر من 0");
    const saleStartIso = vSaleStartsAt.trim() ? fromDateTimeInput(vSaleStartsAt) : null;
    const saleEndIso = vSaleEndsAt.trim() ? fromDateTimeInput(vSaleEndsAt) : null;
    if (vSaleStartsAt.trim() && !saleStartIso) return setVarError("تاريخ بداية الخصم غير صالح");
    if (vSaleEndsAt.trim() && !saleEndIso) return setVarError("تاريخ نهاية الخصم غير صالح");
    if (saleStartIso && saleEndIso && new Date(saleStartIso) > new Date(saleEndIso)) {
      return setVarError("تاريخ نهاية الخصم لازم يكون بعد البداية");
    }

    // منع تكرار size لنفس item
    const duplicate = item.variants.some((x) => x.sizeId === vSizeId && (editingVarId ? x.id !== editingVarId : true));
    // ملاحظة: للـvariants اللي بدون id (جدد) بنقارنه بطريقة ثانية:
    const duplicateNew = item.variants.some((x) => x.sizeId === vSizeId && !x.id && !editingVarId);
    if (duplicate || duplicateNew) return setVarError("هذا المقاس موجود مسبقًا لنفس اللون/الـItem. اختار مقاس ثاني.");

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
  const [bulkStock, setBulkStock] = useState<string>("0");
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
    setBulkStock(suggested.stock);
    setBulkThreshold(suggested.threshold);
    setBulkWeight(suggested.weight);
    setBulkSuggestionNote(
      opts?.preselectAll
        ? `تم تحديد ${suggested.availableIds.length} مقاس متاح واستخدام أقرب سعر/مخزون كاقتراح.`
        : ""
    );
    setBulkError(null);
    setOpenBulkModal(true);
  };

  const openSuggestedBulkAddSizes = (itemLocalId: string) => {
    const suggested = getSuggestedBulkDefaults(itemLocalId);
    if (!suggested.availableIds.length) {
      setItemError("لا يوجد مقاسات متاحة لهذا اللون. كل المقاسات الفعالة موجودة بالفعل.");
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
        return prev.filter((x) => x !== sizeId);
      }

      setBulkPriceBySize((prices) => ({ ...prices, [sizeId]: prices[sizeId] ?? bulkPrice }));
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
  };

  const clearBulkSizes = () => {
    setBulkSelectedSizeIds([]);
    setBulkPriceBySize({});
  };

  const updateBulkPriceForSize = (sizeId: string, value: string) => {
    setBulkPriceBySize((prev) => ({ ...prev, [sizeId]: value }));
  };

  const fillSelectedBulkPrices = () => {
    setBulkPriceBySize((prev) => {
      const next = { ...prev };
      for (const id of bulkSelectedSizeIds) next[id] = bulkPrice;
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
    if (!pickIds.length) return setBulkError("اختر على الأقل مقاس واحد (غير مستخدم).");

    const defaultPriceN = toNumber(bulkPrice);
    if (bulkPriceMode === "default" && defaultPriceN <= 0) return setBulkError("السعر لازم يكون أكبر من 0");
    const priceBySize = new Map<string, number>();
    if (bulkPriceMode === "manual") {
      for (const sizeId of pickIds) {
        const price = toNumber(bulkPriceBySize[sizeId]);
        if (price <= 0) {
          const label = sizes.find((s) => s.id === sizeId)?.name ?? sizeId;
          return setBulkError(`حدد سعر صالح للمقاس: ${label}`);
        }
        priceBySize.set(sizeId, price);
      }
    }
    const stockN = Math.max(0, parseInt(bulkStock || "0", 10) || 0);
    const thresholdN = Math.max(0, parseInt(bulkThreshold || "0", 10) || 0);
    const weightN = bulkWeight.trim() ? Math.max(0, parseInt(bulkWeight, 10) || 0) : null;

    const usedSkus = new Set((it.variants ?? []).map((v) => v.sku).filter(Boolean).map((sku) => String(sku).toUpperCase()));
    const prefix = (bulkSkuPrefix || it.skuBase || "").trim() || "SKU";

    const newVars: LocalVariant[] = pickIds.map((sizeId) => {
      const sizeName = sizes.find((s) => s.id === sizeId)?.name ?? "SIZE";
      const suffix = String(sizeName)
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
        stock: stockN,
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

    if (!it.colorName.trim()) return setItemError("اسم اللون مطلوب");
      if (!it.skuBase.trim()) return setItemError("skuBase مطلوب");

      const normalizedName = normalizeColorNameInput(it.colorName);
      const normalizedBox = normalizeBoxLabelInput(it.boxLabel);
      const sameColor = items.some((x) => x.localId !== it.localId && normalizeColorNameInput(x.colorName) === normalizedName);
      if (sameColor && !normalizedBox) {
        return setItemError("نفس اللون موجود مسبقًا. أضف اسم/تمييز للعلبة لتمييزه.");
      }

      // enforce unique colorName + boxLabel per product
      const key = itemKeyFromParts(it.colorName, it.boxLabel);
      const duplicate = items.some((x) => x.localId !== it.localId && itemKeyFromParts(x.colorName, x.boxLabel) === key);
      if (duplicate) return setItemError("هذا اللون مع نفس اسم العلبة موجود مسبقًا.");

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

    if (!title.trim()) return setPageError("عنوان المنتج مطلوب");
    if (!slug.trim()) return setPageError("Slug مطلوب");
    if (!categoryId) return setPageError("اختر تصنيف");
    if (categories.length && !categories.some((c) => c.id === categoryId)) {
      return setPageError("التصنيف غير موجود أو تم حذفه. اختر تصنيفًا صالحًا.");
    }

    // extra validation: each item should have unique colorName + boxLabel
    const keys = items
      .map((x) => itemKeyFromParts(x.colorName, x.boxLabel))
      .filter((k) => k.replace("::", "").trim());
    const uniq = new Set(keys);
    if (uniq.size !== keys.length) return setPageError("في تكرار بالألوان مع نفس اسم العلبة (items).");

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
        return setPageError(`لون مكرر بدون اسم علبة: ${it.colorName}. أضف تمييز للعلبة.`);
      }
    }

    // validation: variants must not duplicate size per item
    for (const it of items) {
      const seen = new Set<string>();
      for (const v of (it.variants ?? [])) {
        if (!v.sizeId) return setPageError(`في Variant بدون size داخل item: ${it.colorName}`);
        if (seen.has(v.sizeId)) return setPageError(`تكرار size داخل item: ${it.colorName}`);
        seen.add(v.sizeId);
      }
    }

    // validation: SKU must be unique across all variants
    const skuSeen = new Set<string>();
    for (const it of items) {
      for (const v of (it.variants ?? [])) {
        const sku = (v.sku ?? "").trim();
        if (!sku) return setPageError(`في Variant بدون SKU داخل item: ${it.colorName}`);
        const key = sku.toUpperCase();
        if (skuSeen.has(key)) return setPageError(`SKU مكرر: ${sku}`);
        skuSeen.add(key);
      }
    }

    if (qSizes.data?.length) {
      const validSizeIds = new Set(qSizes.data.map((s) => s.id));
      for (const it of items) {
        for (const v of (it.variants ?? [])) {
          if (!validSizeIds.has(v.sizeId)) {
            return setPageError(`المقاس غير موجود أو تم حذفه. رجاءً عدّل المقاسات في اللون: ${it.colorName || "بدون اسم"}`);
          }
        }
      }
    }

    if (isActive) {
      const activeItems = items.filter((it) => it.isActive);
      if (activeItems.length === 0) {
        return setPageError("لا يوجد أي لون (Item) فعّال للمنتج.");
      }
      for (const it of activeItems) {
        const label = it.colorName?.trim() || "بدون اسم";
        if (!(it.images ?? []).length) {
          return setPageError(`اللون "${label}" بدون صور. أضف صورة واحدة على الأقل قبل النشر.`);
        }
        if (!(it.variants ?? []).length) {
          return setPageError(`اللون "${label}" بدون مقاسات (Variants). أضف مقاس واحد على الأقل قبل النشر.`);
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
    const base = (slug || title || "PRODUCT").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
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
      setPageError("لا يوجد مقاسات فعّالة. أولاً أضف مقاس من صفحة المقاسات (مثلاً: One Size) ثم ارجع هون.");
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
      <div dir="rtl" className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">جاري تحميل المنتج…</div>
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
      <div dir="rtl" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
        فشل تحميل المنتج.
        <div className="mt-4">
          <Button variant="ghost" onClick={() => nav("/admin/catalog/products")}>
            رجوع
          </Button>
        </div>
      </div>
    );
  }

  const p = qProduct.data;

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold">تحرير المنتج</div>
            <div className="mt-1 text-xs opacity-70 break-all">ID: {p.id}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => nav("/admin/catalog/products")}>
              رجوع
            </Button>
            {items.length === 0 ? (
              <Button variant="secondary" onClick={quickCreateFirstItemAndVariant}>
                إعداد سريع (لون + سعر)
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setWizardOpen(true)} disabled={!productId}>
              رفع وتجميع الصور
            </Button>
            <Button variant="secondary" onClick={openCreateItem}>
              إضافة مجموعة لون
            </Button>
            <Button variant="primary" onClick={onSaveAll} isLoading={mSave.isPending}>
              حفظ الكل
            </Button>

            </div>
          </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Input label="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />

          <Select
            label="التصنيف"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div className="flex items-center gap-2 pt-7">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-sm">فعال</span>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-medium">الوصف (اختياري)</label>
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
          <div className="text-sm font-semibold">ليش اختفت الصور/السعر/المخزون؟</div>
          <div className="mt-1 text-xs opacity-80 leading-6">
            بهالنسخة، <span className="font-semibold">الصور</span> على مستوى <span className="font-semibold">اللون (Item)</span>، و<span className="font-semibold">السعر/المخزون</span>
            على مستوى <span className="font-semibold">Variant</span>. إذا المنتج ما فيه Items بعد، رح تشوف بس بيانات المنتج.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={quickCreateFirstItemAndVariant}>
              إنشاء لون افتراضي + فتح السعر
            </Button>
            <Button variant="secondary" onClick={openCreateItem}>
              إنشاء لون يدوي
            </Button>
            <Button
              variant="ghost"
              onClick={() => nav("/admin/catalog/sizes")}
              title="إذا ما عندك مقاسات، لازم تضيف واحد (مثل One Size)"
            >
              افتح صفحة المقاسات
            </Button>
          </div>
        </div>
      ) : null}

      {items.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">مجموعات الألوان</div>
              <div className="mt-1 text-xs opacity-70">اختر مجموعة لفتح الصور والمقاسات الخاصة بها.</div>
            </div>
            <Button variant="primary" onClick={openCreateItem}>
              إضافة مجموعة لون
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
                      {it.colorName || "لون جديد"}
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
                        const name = it.colorName || "(بدون اسم لون)";
                        const box = (it.boxLabel ?? "").trim();
                        return box ? `${name} — ${box}` : name;
                      })()}
                      {!it.isActive ? <span className="ms-2 text-xs opacity-60">(غير فعال)</span> : null}
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
                        <div className="pointer-events-none absolute -right-2 -top-2 z-10">
                          <DiscountShapeBadge discount={itemDiscount} compact />
                        </div>
                      ) : null}
                    </div>

                    <div className="text-xs opacity-80">
                      <div>صور: {(it.images ?? []).length}</div>
                      <div>Variants: {(it.variants ?? []).length}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEditItem(it)}>
                    إدارة اللون (Modal)
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmDeleteItemLocalId(it.localId)}>
                    حذف Item
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
        title="إدارة لون المنتج (Item)"
        onCancel={cancelItemModal}
        widthClassName="max-w-6xl"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={cancelItemModal}>
              إغلاق
            </Button>
            <Button variant="primary" onClick={saveItemModal}>
              حفظ
            </Button>
          </div>
        }
      >
        {(() => {
          const it = items.find((x) => x.localId === editingItemLocalId);
          if (!it) return <div className="text-sm opacity-70">Item غير موجود.</div>;

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
            <div dir="rtl" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="اسم اللون بالعربي"
                      value={it.colorName}
                      onChange={(e) => handleColorNameChange(it.localId, e.target.value)}
                    />

                    <Input
                      label="اسم العلبة (boxLabel) اختياري"
                      value={it.boxLabel}
                      onChange={(e) => handleBoxLabelChange(it.localId, e.target.value)}
                      placeholder="مثال: علبة A"
                    />

                    <Input
                      label="SKU base (English)"
                      value={it.skuBase}
                      onChange={(e) => updateItem(it.localId, { skuBase: e.target.value })}
                      placeholder="مثال: TSHIRT-BLACK"
                    />

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-semibold">اختيار اللون</div>
                        <div className="flex items-center gap-2" dir="ltr">
                          <Button
                            variant="ghost"
                            onClick={() => pickItemColorWithEyeDropper(it.localId)}
                            disabled={!isEyeDropperSupported()}
                            title={isEyeDropperSupported() ? "قطّارة" : "المتصفح لا يدعم EyeDropper"}
                          >
                            قطّارة
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
                        label="Hex (اختياري)"
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
                          <div className="text-xs opacity-70 mb-2">ألوان مقترحة من الصورة:</div>
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
                              استخدم الأفضل
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
                      <span className="text-sm">فعال</span>
                    </div>

                    {itemError ? (
                      <div className="sm:col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">
                        {itemError}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold">ملخص</div>
                  <div className="mt-2 text-xs opacity-80 space-y-1">
                    <div>صور: {(it.images ?? []).length}</div>
                    <div>Variants: {(it.variants ?? []).length}</div>
                    <div className="opacity-70">ملاحظة: الصور على مستوى اللون (Item) والسعر/المخزون على مستوى Variant.</div>
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
                      <div className="text-xs opacity-70">مقاس + سعر + مخزون</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs opacity-70">{(it.variants ?? []).length} variants</div>
                      <Button variant="success" onClick={() => openSuggestedBulkAddSizes(it.localId)}>
                        اقتراح سريع
                      </Button>
                      <Button variant="secondary" onClick={() => openBulkAddSizes(it.localId)}>
                        إضافة عدة مقاسات
                      </Button>
                      <Button variant="primary" onClick={() => openCreateVariant(it.localId)}>
                        إضافة Variant
                      </Button>
                    </div>
                  </div>

                  <Table>
                    <THead>
                      <TR>
                        <TH>المقاس</TH>
                        <TH>SKU</TH>
                        <TH>السعر</TH>
                        <TH>المخزون</TH>
                        <TH className="w-72">إجراءات</TH>
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
                                    تعديل
                                  </Button>
                                  <Button variant="danger" onClick={() => deleteVariant(it.localId, v)}>
                                    حذف
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
                              <span>لا يوجد Variants بعد.</span>
                              <Button size="sm" variant="success" onClick={() => openSuggestedBulkAddSizes(it.localId)}>
                                إنشاء من المقاسات الفعالة
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
        title={editingVarId ? "تعديل Variant" : "إضافة Variant"}
        onCancel={() => setOpenVarModal(false)}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={saveVariant}>
              حفظ
            </Button>
          </div>
        }
      >
        {(() => {
          const it = items.find((x) => x.localId === varItemLocalId);
          const options = it ? sizeOptionsForItem(it, editingVarId ? vSizeId : undefined) : [];

          return (
            <div dir="rtl" className="grid gap-4 sm:grid-cols-2">
              <Select
                label="المقاس"
                value={vSizeId}
                onChange={(e) => handleVariantSizeChange(e.target.value)}
                options={[
                  ...(editingVarId ? [{ value: vSizeId, label: sizes.find((s) => s.id === vSizeId)?.name ?? "المقاس الحالي" }] : []),
                  ...options,
                ].filter((x) => x.value)}
                placeholder="اختر المقاس"
              />

              <Input label="SKU" value={vSku} onChange={(e) => handleVariantSkuChange(e.target.value)} />

              <Input label="السعر" value={vPrice} onChange={(e) => setVPrice(e.target.value)} />
              <Input label="compareAt (اختياري)" value={vCompareAt} onChange={(e) => setVCompareAt(e.target.value)} />
              <Input
                label="السعر الأصلي (اختياري)"
                value={vOriginalPrice}
                onChange={(e) => setVOriginalPrice(e.target.value)}
                hint="سيعود السعر لهذا الرقم بعد انتهاء التخفيض (إذا مفعّل)"
              />
              <Input
                label="سعر التخفيض (اختياري)"
                value={vSalePrice}
                onChange={(e) => setVSalePrice(e.target.value)}
              />
              <Input
                type="datetime-local"
                label="بداية التخفيض"
                value={vSaleStartsAt}
                onChange={(e) => setVSaleStartsAt(e.target.value)}
              />
              <Input
                type="datetime-local"
                label="نهاية التخفيض"
                value={vSaleEndsAt}
                onChange={(e) => setVSaleEndsAt(e.target.value)}
              />

              <Input label="المخزون" value={vStock} onChange={(e) => setVStock(e.target.value)} />
              <div>
                <Input
                  label="حد التنبيه (اختياري)"
                  value={vThreshold}
                  onChange={(e) => setVThreshold(e.target.value)}
                  hint="0 يعني تعطيل تنبيهات المخزون لهذا الـVariant"
                />
              </div>
              <Input label="weightGrams (اختياري)" value={vWeight} onChange={(e) => setVWeight(e.target.value)} />

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
        title="إضافة عدة مقاسات دفعة واحدة"
        onCancel={() => setOpenBulkModal(false)}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpenBulkModal(false)}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={saveBulkAddSizes}>
              إضافة
            </Button>
          </div>
        }
      >
        {(() => {
          const it = items.find((x) => x.localId === bulkItemLocalId);
          if (!it) return <div className="text-sm opacity-70">Item غير موجود.</div>;

          const used = new Set((it.variants ?? []).map((v) => v.sizeId));
          const list = sizes
            .filter((s) => s.active !== false)
            .map((s) => ({ ...s, disabled: used.has(s.id) }));

          const availableIds = list.filter((x) => !x.disabled).map((x) => x.id);

          return (
            <div dir="rtl" className="space-y-4">
              {bulkSuggestionNote ? (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                  {bulkSuggestionNote}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="SKU Prefix (افتراضي: skuBase)"
                  value={bulkSkuPrefix}
                  onChange={(e) => setBulkSkuPrefix(e.target.value)}
                  placeholder={it.skuBase || "SKU"}
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium">نوع السعر</label>
                  <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 ${bulkPriceMode === "default" ? "bg-white/15" : "opacity-70 hover:bg-white/5"}`}
                      onClick={() => setBulkPriceMode("default")}
                    >
                      سعر لكل المقاسات
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg px-3 py-2 ${bulkPriceMode === "manual" ? "bg-white/15" : "opacity-70 hover:bg-white/5"}`}
                      onClick={() => {
                        setBulkPriceMode("manual");
                        fillSelectedBulkPrices();
                      }}
                    >
                      سعر لكل مقاس
                    </button>
                  </div>
                </div>
                <Input
                  label={bulkPriceMode === "default" ? "السعر الافتراضي" : "سعر التعبئة"}
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                />
                <Input label="المخزون (لكل المقاسات)" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} />
                <Input
                  label="حد التنبيه (اختياري)"
                  value={bulkThreshold}
                  onChange={(e) => setBulkThreshold(e.target.value)}
                  hint="0 يعني تعطيل تنبيهات المخزون"
                />
                <Input
                  label="weightGrams (اختياري)"
                  value={bulkWeight}
                  onChange={(e) => setBulkWeight(e.target.value)}
                  hint="إذا تركته فارغ، ما منبعث وزن."
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">اختر المقاسات</div>
                    <div className="text-xs opacity-70">المقاسات الموجودة مسبقًا لنفس اللون تكون معطّلة.</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => selectAllBulkSizes(availableIds)}>
                      تحديد الكل
                    </Button>
                    <Button variant="ghost" onClick={clearBulkSizes}>
                      مسح
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
                          {s.disabled ? <span className="text-xs opacity-70">موجود</span> : null}
                        </label>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-sm opacity-70">لا يوجد مقاسات.</div>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-xs opacity-70">
                  مختار: {bulkSelectedSizeIds.length} / متاح: {availableIds.length}
                </div>
              </div>

              {bulkPriceMode === "manual" && bulkSelectedSizeIds.length ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">السعر حسب المقاس</div>
                      <div className="text-xs opacity-70">كل مقاس محدد يحصل على سعره الخاص.</div>
                    </div>
                    <Button variant="secondary" onClick={fillSelectedBulkPrices}>
                      تعبئة الكل من السعر الافتراضي
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
        title="تأكيد حذف Item"
        message="حذف الـItem رح يحذف كل الصور والـvariants التابعة إله (من قاعدة البيانات). متأكد؟"
        confirmText="حذف"
        cancelText="إلغاء"
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
