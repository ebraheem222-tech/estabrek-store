// src/features/catalog/products/ProductEditorPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import { api, getApiErrorMessage } from "../../api/http";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TBody, TH, THead, TR } from "../../components/ui/Table";
import { ConfirmDialog } from "../../components/ConfirmDialog";

import ItemImagesManager, { type LocalImage } from "../../components/catalog/ItemImagesManager";
import { normalizeHex } from "../../lib/colorDetect";
import { useDebounce } from "../../hooks/useDebounce";
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
};

type DBSize = { id: string; name: string };

type DBVariant = {
  id: string;
  sizeId: string;
  sku: string;
  price: string | number; // prisma Decimal غالبًا بيرجع string
  compareAt?: string | number | null;
  stock: number;
  lowStockThreshold?: number;
  weightGrams?: number | null;
  size?: DBSize;
};

type DBItem = {
  id: string;
  colorName: string;
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
    }>;
    variants?: Array<{
      id?: string;
      sizeId: string;
      sku: string;
      price: number;
      compareAt?: number | null;
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
    }))
  );
}

function genLocalId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

type NamedColor = { name: string; sku: string; hex: string };

const NAMED_COLORS: NamedColor[] = [
  { name: "أسود", sku: "BLACK", hex: "#000000" },
  { name: "أبيض", sku: "WHITE", hex: "#ffffff" },
  { name: "رمادي", sku: "GRAY", hex: "#9ca3af" },
  { name: "أحمر", sku: "RED", hex: "#ef4444" },
  { name: "برتقالي", sku: "ORANGE", hex: "#f97316" },
  { name: "أصفر", sku: "YELLOW", hex: "#eab308" },
  { name: "أخضر", sku: "GREEN", hex: "#22c55e" },
  { name: "تركواز", sku: "TEAL", hex: "#06b6d4" },
  { name: "أزرق", sku: "BLUE", hex: "#3b82f6" },
  { name: "نيلي", sku: "INDIGO", hex: "#6366f1" },
  { name: "بنفسجي", sku: "PURPLE", hex: "#8b5cf6" },
  { name: "وردي", sku: "PINK", hex: "#ec4899" },
  { name: "بني", sku: "BROWN", hex: "#92400e" },
];

function hexToRgb(hex: string): [number, number, number] {
  const n = normalizeHex(hex);
  if (!n) return [0, 0, 0];
  const v = n.slice(1);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function colorDistance(a: [number, number, number], b: [number, number, number]) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function guessColorFromHex(hex: string): { name: string; sku: string } | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const rgb = hexToRgb(n);
  let best: NamedColor | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of NAMED_COLORS) {
    const d = colorDistance(rgb, hexToRgb(c.hex));
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best ? { name: best.name, sku: best.sku } : null;
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
  const cleaned = String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned;
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
    stock: number;
    lowStockThreshold: number;
    weightGrams: number | null;
  };

  type LocalItem = {
    id?: string;
    localId: string;
    colorName: string;
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

        const autoSkuCurrent =
          !it.skuBase.trim() ||
          (currentGuess && it.skuBase.trim().toUpperCase() === `${skuPrefix}-${currentGuess.sku}`.toUpperCase()) ||
          (currentHex && it.skuBase.trim().toUpperCase() === `${skuPrefix}-${currentHex.slice(1).toUpperCase()}`.toUpperCase());

        let nextName = it.colorName;
        let nextSkuBase = it.skuBase;

        if (autoNameCurrent) {
          nextName = nextGuess?.name ?? normalized.toUpperCase();
        }

        if (autoSkuCurrent) {
          const segment = nextGuess?.sku ?? normalized.slice(1).toUpperCase();
          if (segment) nextSkuBase = `${skuPrefix}-${segment}`;
        }

        return {
          ...it,
          colorHex: rawHex,
          colorName: nextName,
          skuBase: nextSkuBase,
        };
      })
    );
  };

  const handleColorNameChange = (localId: string, nextName: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.localId !== localId) return it;
        let nextSkuBase = it.skuBase;
        if (!nextSkuBase.trim()) {
          const segment = skuSegmentFromName(nextName);
          if (segment) nextSkuBase = `${skuPrefix}-${segment}`;
        }
        return { ...it, colorName: nextName, skuBase: nextSkuBase };
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
  const [vPrice, setVPrice] = useState("0");
  const [vCompareAt, setVCompareAt] = useState("");
  const [vStock, setVStock] = useState("0");
  const [vThreshold, setVThreshold] = useState("0");
  const [vWeight, setVWeight] = useState("");
  const [varError, setVarError] = useState<string | null>(null);

  const openCreateVariant = (itemLocalId: string) => {
    setVarItemLocalId(itemLocalId);
    setEditingVarId(null);
    setVSizeId("");
    setVSku("");
    setVPrice("0");
    setVCompareAt("");
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
    setVSku(v.sku);
    setVPrice(String(v.price ?? 0));
    setVCompareAt(v.compareAt === null ? "" : String(v.compareAt));
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
    if (!vSku.trim()) return setVarError("SKU مطلوب");
    const priceN = toNumber(vPrice);
    if (priceN <= 0) return setVarError("السعر لازم يكون أكبر من 0");
    const stockN = Math.max(0, parseInt(vStock || "0", 10) || 0);
    const thresholdN = Math.max(0, parseInt(vThreshold || "0", 10) || 0);

    // منع تكرار size لنفس item
    const duplicate = item.variants.some((x) => x.sizeId === vSizeId && (editingVarId ? x.id !== editingVarId : true));
    // ملاحظة: للـvariants اللي بدون id (جدد) بنقارنه بطريقة ثانية:
    const duplicateNew = item.variants.some((x) => x.sizeId === vSizeId && !x.id && !editingVarId);
    if (duplicate || duplicateNew) return setVarError("هذا المقاس موجود مسبقًا لنفس اللون/الـItem. اختار مقاس ثاني.");

    const payload: LocalVariant = {
      id: editingVarId && editingVarId !== "__noid__" ? editingVarId : undefined,
      sizeId: vSizeId,
      sku: vSku.trim(),
      price: priceN,
      compareAt: vCompareAt.trim() ? toNumber(vCompareAt) : null,
      stock: stockN,
      lowStockThreshold: thresholdN,
      weightGrams: vWeight.trim() ? Math.max(0, parseInt(vWeight, 10) || 0) : null,
    };

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
  const [bulkPrice, setBulkPrice] = useState<string>("0");
  const [bulkStock, setBulkStock] = useState<string>("0");
  const [bulkThreshold, setBulkThreshold] = useState<string>("0");
  const [bulkWeight, setBulkWeight] = useState<string>("");
  const [bulkError, setBulkError] = useState<string | null>(null);

  const openBulkAddSizes = (itemLocalId: string) => {
    const it = items.find((x) => x.localId === itemLocalId);
    setBulkItemLocalId(itemLocalId);
    setBulkSelectedSizeIds([]);
    setBulkSkuPrefix(it?.skuBase ?? "");
    // حاول ناخذ سعر من أول Variant موجود كـ default
    const defaultPrice = it?.variants?.[0]?.price ?? 0;
    setBulkPrice(String(defaultPrice || 0));
    setBulkStock("0");
    setBulkThreshold("0");
    setBulkWeight("");
    setBulkError(null);
    setOpenBulkModal(true);
  };

  const toggleBulkSize = (sizeId: string) => {
    setBulkSelectedSizeIds((prev) => (prev.includes(sizeId) ? prev.filter((x) => x !== sizeId) : [...prev, sizeId]));
  };

  const selectAllBulkSizes = (availableIds: string[]) => {
    setBulkSelectedSizeIds(availableIds);
  };

  const clearBulkSizes = () => setBulkSelectedSizeIds([]);

  const makeUniqueSku = (base: string, used: Set<string>) => {
    let candidate = base;
    let i = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${i}`;
      i += 1;
    }
    used.add(candidate);
    return candidate;
  };

  const saveBulkAddSizes = () => {
    setBulkError(null);
    if (!bulkItemLocalId) return;

    const it = items.find((x) => x.localId === bulkItemLocalId);
    if (!it) return;

    const usedSizeIds = new Set((it.variants ?? []).map((v) => v.sizeId));
    const pickIds = (bulkSelectedSizeIds ?? []).filter((id) => !usedSizeIds.has(id));
    if (!pickIds.length) return setBulkError("اختر على الأقل مقاس واحد (غير مستخدم).");

    const priceN = toNumber(bulkPrice);
    if (priceN <= 0) return setBulkError("السعر لازم يكون أكبر من 0");
    const stockN = Math.max(0, parseInt(bulkStock || "0", 10) || 0);
    const thresholdN = Math.max(0, parseInt(bulkThreshold || "0", 10) || 0);
    const weightN = bulkWeight.trim() ? Math.max(0, parseInt(bulkWeight, 10) || 0) : null;

    const usedSkus = new Set((it.variants ?? []).map((v) => v.sku).filter(Boolean));
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
        price: priceN,
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
      const empty = !it.colorName.trim() && !it.skuBase.trim() && (it.images?.length ?? 0) === 0 && (it.variants?.length ?? 0) === 0;
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

    // enforce unique colorName per product (matches Prisma @@unique([productId,colorName]))
    const normalizedName = it.colorName.trim().toLowerCase();
    const duplicate = items.some((x) => x.localId !== it.localId && x.colorName.trim().toLowerCase() === normalizedName);
    if (duplicate) return setItemError("اسم اللون موجود مسبقًا. لازم يكون فريد داخل المنتج.");

    const normHex = normalizeHex(it.colorHex.trim()) ?? "";

    updateItem(it.localId, {
      colorName: it.colorName.trim(),
      colorHex: normHex,
      skuBase: it.skuBase.trim(),
      isActive: !!it.isActive,
    });

    setOpenItemModal(false);
    setEditingItemLocalId(null);
  };

  // === Autosave (keeps manual Save button) ===
  const [autoState, setAutoState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const lastSavedHashRef = useRef<string>("");
  const skipNextAutoRef = useRef(true);
  const autosaveInFlight = useRef(false);

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
        })),
        variants: (it.variants ?? []).map((v) => ({
          id: v.id,
          sizeId: v.sizeId,
          sku: v.sku.trim(),
          price: toNumber(v.price),
          compareAt: v.compareAt === null ? null : toNumber(v.compareAt),
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

  const debouncedDraftBody = useDebounce(draftBody, 1500);

  // baseline after initial fetch/hydration
  useEffect(() => {
    if (!qProduct.data?.id) return;
    skipNextAutoRef.current = true;
    setAutoState("idle");
  }, [qProduct.data?.id]);

  useEffect(() => {
    if (!qProduct.data?.id) return;
    // first time after hydration: set baseline, don't autosave
    if (skipNextAutoRef.current) {
      lastSavedHashRef.current = JSON.stringify(draftBody);
      setLastSavedAt(new Date().toISOString());
      skipNextAutoRef.current = false;
      setAutoState("saved");
    }
  }, [draftBody, qProduct.data?.id]);

  const canAutosave = (b: DeepUpdateBody) => {
    if (!productId) return false;
    if (!b.product?.title) return false;
    if (!b.product?.slug) return false;
    if (!b.product?.categoryId) return false;
    // Avoid autosaving invalid variant setups (user can still save manually and get the error)
    const names = (b.items ?? []).map((x) => x.colorName.trim().toLowerCase()).filter(Boolean);
    if (new Set(names).size !== names.length) return false;
    for (const it of (b.items ?? [])) {
      const seen = new Set<string>();
      for (const v of (it.variants ?? [])) {
        if (!v.sizeId) return false;
        if (seen.has(v.sizeId)) return false;
        seen.add(v.sizeId);
      }
    }
    return true;
  };

  useEffect(() => {
    if (!qProduct.data?.id) return;
    if (autosaveInFlight.current) return;
    const hash = JSON.stringify(debouncedDraftBody);
    if (!hash) return;
    if (hash === lastSavedHashRef.current) return;
    if (!canAutosave(debouncedDraftBody)) return;

    autosaveInFlight.current = true;
    setAutoState("saving");

    mSave.mutate(debouncedDraftBody, {
      onSuccess: () => {
        lastSavedHashRef.current = hash;
        setLastSavedAt(new Date().toISOString());
        setAutoState("saved");
        autosaveInFlight.current = false;
      },
      onError: () => {
        setAutoState("error");
        autosaveInFlight.current = false;
      },
    });
  }, [debouncedDraftBody, qProduct.data?.id]);

  // === Save whole product ===
  const onSaveAll = async () => {
    setPageError(null);
    if (!productId) return;

    if (!title.trim()) return setPageError("عنوان المنتج مطلوب");
    if (!slug.trim()) return setPageError("Slug مطلوب");
    if (!categoryId) return setPageError("اختر تصنيف");

    // extra validation: each item should have unique colorName already handled, but re-check quickly
    const names = items.map((x) => x.colorName.trim().toLowerCase()).filter(Boolean);
    const uniq = new Set(names);
    if (uniq.size !== names.length) return setPageError("في تكرار بأسماء الألوان (items).");

    // validation: variants must not duplicate size per item
    for (const it of items) {
      const seen = new Set<string>();
      for (const v of (it.variants ?? [])) {
        if (!v.sizeId) return setPageError(`في Variant بدون size داخل item: ${it.colorName}`);
        if (seen.has(v.sizeId)) return setPageError(`تكرار size داخل item: ${it.colorName}`);
        seen.add(v.sizeId);
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
    const skuBase = `${defaultSkuBase}-DEFAULT`;
    const sku = `${skuBase}-${sizes.find((s) => s.id === sizeId)?.name?.toUpperCase().replace(/\s+/g, "") || "SIZE"}`;

    // أنشئ Item جديد بشكل فوري عشان تظهر أقسام الصور والسعر
    setItems((prev) => [
      ...prev,
      {
        localId,
        id: undefined,
        colorName: "Default",
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
      setVSku(sku);
      setVPrice("0");
      setVStock("0");
      setVThreshold("0");
      setVCompareAt("");
      setVWeight("");
    }, 0);
  };

  if (qProduct.isLoading) {
    return (
      <div dir="rtl" className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2">
          <Spinner />
          <div className="text-sm opacity-80">جاري تحميل المنتج…</div>
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
            <Button variant="ghost" onClick={() => nav("/catalog/products")}>
              رجوع
            </Button>
            {items.length === 0 ? (
              <Button variant="secondary" onClick={quickCreateFirstItemAndVariant}>
                إعداد سريع (لون + سعر)
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setWizardOpen(true)} disabled={!productId}>
              Batch Upload + Group
            </Button>
            <Button variant="secondary" onClick={openCreateItem}>
              إضافة لون (Item)
            </Button>
            <Button variant="primary" onClick={onSaveAll} isLoading={mSave.isPending}>
              حفظ الكل
            </Button>

            <div className="self-center text-xs opacity-70">
              {autoState === "saving" ? "يتم الحفظ تلقائياً..." : autoState === "error" ? "فشل الحفظ التلقائي" : lastSavedAt ? `آخر حفظ: ${new Date(lastSavedAt).toLocaleTimeString()}` : ""}
            </div>
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
      {/* Items */}
      <div className="space-y-3">
        {items.map((it) => {
          const primary = (it.images ?? []).find((x) => x.isPrimary) ?? (it.images ?? [])[0];
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
                      {it.colorName || "(بدون اسم لون)"}
                      {!it.isActive ? <span className="ms-2 text-xs opacity-60">(غير فعال)</span> : null}
                    </div>
                  </div>
                  <div className="mt-1 text-xs opacity-70">skuBase: {it.skuBase || "—"}</div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      {primary?.url ? (
                        <img src={primary.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] opacity-60">No image</div>
                      )}
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
                      label="اسم اللون (colorName)"
                      value={it.colorName}
                      onChange={(e) => handleColorNameChange(it.localId, e.target.value)}
                    />

                    <Input
                      label="skuBase"
                      value={it.skuBase}
                      onChange={(e) => updateItem(it.localId, { skuBase: e.target.value })}
                      placeholder="مثال: TSHIRT-BLACK"
                    />

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:col-span-2">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-semibold">اختيار اللون</div>
                        <div className="flex items-center gap-2" dir="ltr">
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

                          return (
                            <TR key={v.id ?? `${it.localId}_v_${idx}`}>
                              <td className="px-3 py-2 text-sm">{sizeName}</td>
                              <td className="px-3 py-2 text-sm break-all" dir="ltr">
                                {v.sku}
                              </td>
                              <td className="px-3 py-2 text-sm">{v.price}</td>
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
                            لا يوجد Variants بعد.
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
                onChange={(e) => setVSizeId(e.target.value)}
                options={[
                  ...(editingVarId ? [{ value: vSizeId, label: sizes.find((s) => s.id === vSizeId)?.name ?? "المقاس الحالي" }] : []),
                  ...options,
                ].filter((x) => x.value)}
                placeholder="اختر المقاس"
              />

              <Input label="SKU" value={vSku} onChange={(e) => setVSku(e.target.value)} />

              <Input label="السعر" value={vPrice} onChange={(e) => setVPrice(e.target.value)} />
              <Input label="compareAt (اختياري)" value={vCompareAt} onChange={(e) => setVCompareAt(e.target.value)} />

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
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="SKU Prefix (افتراضي: skuBase)"
                  value={bulkSkuPrefix}
                  onChange={(e) => setBulkSkuPrefix(e.target.value)}
                  placeholder={it.skuBase || "SKU"}
                />
                <Input label="السعر (لكل المقاسات)" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} />
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

              {bulkError ? (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{bulkError}</div>
              ) : null}
            </div>
          );
        })()}
      </Modal>

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
