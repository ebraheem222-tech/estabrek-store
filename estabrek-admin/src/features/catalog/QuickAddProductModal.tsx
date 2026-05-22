import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import ItemImagesManager, { type LocalImage } from "../../components/catalog/ItemImagesManager";
import { createProduct, getProductFull, updateProductFull, type CatalogCategory, type CatalogSize } from "../../api/catalog.api";
import { uploadImages } from "../../api/uploads.api";
import { compressImage } from "../../lib/imageCompress";
import { extractPaletteFromFile, normalizeHex } from "../../lib/colorDetect";
import { getNearestNamedColor, skuSegmentFromColorName } from "../../lib/colorNames";
import { toast } from "../../lib/toast";

type QuickVariant = {
  sizeId: string;
  price: string;
  stock: string;
};

type QuickGroup = {
  localId: string;
  colorName: string;
  boxLabel: string;
  colorHex: string;
  skuBase: string;
  images: LocalImage[];
  selectedSizeIds: string[];
  priceMode: "default" | "manual";
  price: string;
  stock: string;
  priceBySize: Record<string, string>;
  stockBySize: Record<string, string>;
};

type CapturedShot = {
  id: string;
  file: File;
  url: string;
};

type Props = {
  open: boolean;
  categories: CatalogCategory[];
  sizes: CatalogSize[];
  onClose: () => void;
  onCreated: (productId: string) => void;
};

const SIZE_TEMPLATES = [
  {
    id: "clothes",
    label: "Clothes S-XL",
    match: (name: string) => ["xs", "s", "m", "l", "xl", "xxl", "2xl", "3xl"].includes(normalizeSizeName(name)),
  },
  {
    id: "one-size",
    label: "One Size",
    match: (name: string) => {
      const n = normalizeSizeName(name);
      return n.includes("one") || n.includes("os") || n.includes("free") || n.includes("واحد") || n.includes("موحد");
    },
  },
  {
    id: "shoes",
    label: "Shoes 36-42",
    match: (name: string) => {
      const n = Number(String(name).match(/\d+/)?.[0] ?? NaN);
      return Number.isFinite(n) && n >= 36 && n <= 42;
    },
  },
  {
    id: "all",
    label: "All active",
    match: () => true,
  },
];

function normalizeSizeName(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toNumber(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

function skuPrefixFromProduct(title: string, slug: string) {
  const base = (slug || title || "PRODUCT").toUpperCase();
  return (
    base
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "PRODUCT"
  );
}

function skuPart(value: string) {
  const colorPart = skuSegmentFromColorName(value);
  if (colorPart) return colorPart;
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sizeSkuPart(sizeName: string) {
  return (
    String(sizeName || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 18) || "SIZE"
  );
}

function normalizeImages(images: LocalImage[]) {
  const sorted = images.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const next = sorted.map((image, index) => ({ ...image, position: index }));
  if (next.length && !next.some((image) => image.isPrimary)) next[0].isPrimary = true;
  let foundPrimary = false;
  return next.map((image) => {
    if (!image.isPrimary) return image;
    if (!foundPrimary) {
      foundPrimary = true;
      return image;
    }
    return { ...image, isPrimary: false };
  });
}

function makeEmptyGroup(title: string, slug: string, index: number, colorHex = ""): QuickGroup {
  const named = colorHex ? getNearestNamedColor(colorHex) : null;
  const colorName = named?.arabicName ?? "";
  const base = buildSkuBase(title, slug, colorName || `COLOR-${index + 1}`, "", index);
  return {
    localId: genId("qg"),
    colorName,
    boxLabel: "",
    colorHex: normalizeHex(colorHex) ?? "",
    skuBase: base,
    images: [],
    selectedSizeIds: [],
    priceMode: "default",
    price: "0",
    stock: "0",
    priceBySize: {},
    stockBySize: {},
  };
}

function buildSkuBase(title: string, slug: string, colorName: string, boxLabel: string, index: number) {
  const prefix = skuPrefixFromProduct(title, slug);
  const color = skuPart(colorName) || `COLOR-${index + 1}`;
  const box = skuPart(boxLabel);
  return [prefix, color, box].filter(Boolean).join("-");
}

function colorKey(group: QuickGroup) {
  const fromName = skuSegmentFromColorName(group.colorName);
  if (fromName) return fromName;
  const fromHex = normalizeHex(group.colorHex);
  if (fromHex) return getNearestNamedColor(fromHex)?.sku ?? fromHex;
  return "";
}

function fileNameForShot() {
  const now = new Date();
  return `camera-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Date.now()}.jpg`;
}

export default function QuickAddProductModal({ open, categories, sizes, onClose, onCreated }: Props) {
  const activeSizes = useMemo(
    () => sizes.filter((size) => size.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)),
    [sizes]
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [groups, setGroups] = useState<QuickGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [bulkCameraOpen, setBulkCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedShots, setCapturedShots] = useState<CapturedShot[]>([]);
  const [processingShots, setProcessingShots] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraFallbackRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const firstCategory = categories[0]?.id ?? "";
    const firstGroup = makeEmptyGroup(title, slug, 0);
    setTitle("");
    setSlug("");
    setCategoryId(firstCategory);
    setDescription("");
    setPublishNow(false);
    setGroups([firstGroup]);
    setSelectedGroupId(firstGroup.localId);
    setError(null);
    setCapturedShots([]);
    setBulkCameraOpen(false);
  }, [open, categories]);

  useEffect(() => {
    if (!videoRef.current || !cameraStream) return;
    videoRef.current.srcObject = cameraStream;
  }, [cameraStream]);

  useEffect(() => {
    if (!bulkCameraOpen) stopCamera();
  }, [bulkCameraOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
      for (const shot of capturedShots) URL.revokeObjectURL(shot.url);
    };
  }, []);

  const selectedGroup = groups.find((group) => group.localId === selectedGroupId) ?? groups[0] ?? null;

  const updateGroup = (groupId: string, patch: Partial<QuickGroup>) => {
    setGroups((prev) => prev.map((group) => (group.localId === groupId ? { ...group, ...patch } : group)));
  };

  const regenerateSkuBase = (groupId: string, patch: Partial<QuickGroup> = {}) => {
    setGroups((prev) =>
      prev.map((group, index) => {
        if (group.localId !== groupId) return group;
        const next = { ...group, ...patch };
        return { ...next, skuBase: buildSkuBase(title, slug, next.colorName, next.boxLabel, index) };
      })
    );
  };

  const addGroup = (hex = "") => {
    const next = makeEmptyGroup(title, slug, groups.length, hex);
    setGroups((prev) => [...prev, next]);
    setSelectedGroupId(next.localId);
  };

  const removeGroup = (groupId: string) => {
    setGroups((prev) => {
      const next = prev.filter((group) => group.localId !== groupId);
      if (!next.length) {
        const fallback = makeEmptyGroup(title, slug, 0);
        setSelectedGroupId(fallback.localId);
        return [fallback];
      }
      if (selectedGroupId === groupId) setSelectedGroupId(next[0].localId);
      return next;
    });
  };

  const handleDetectedColors = (groupId: string, colors: string[]) => {
    const hex = normalizeHex(colors[0] ?? "");
    if (!hex) return;
    const named = getNearestNamedColor(hex);
    const group = groups.find((item) => item.localId === groupId);
    if (!group) return;

    const nextName = group.colorName.trim() ? group.colorName : named?.arabicName ?? hex.toUpperCase();
    regenerateSkuBase(groupId, {
      colorName: nextName,
      colorHex: hex,
    });
  };

  const applySizeTemplate = (groupId: string, templateId: string) => {
    const template = SIZE_TEMPLATES.find((item) => item.id === templateId);
    const group = groups.find((item) => item.localId === groupId);
    if (!template || !group) return;

    const ids = activeSizes.filter((size) => template.match(size.name)).map((size) => size.id);
    const fallbackIds = ids.length ? ids : activeSizes.map((size) => size.id);
    updateGroup(groupId, {
      selectedSizeIds: fallbackIds,
      priceBySize: Object.fromEntries(fallbackIds.map((id) => [id, group.price])),
      stockBySize: Object.fromEntries(fallbackIds.map((id) => [id, group.stock])),
    });
  };

  const toggleSize = (groupId: string, sizeId: string) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.localId !== groupId) return group;
        const has = group.selectedSizeIds.includes(sizeId);
        const nextIds = has ? group.selectedSizeIds.filter((id) => id !== sizeId) : [...group.selectedSizeIds, sizeId];
        const nextPriceBySize = { ...group.priceBySize };
        const nextStockBySize = { ...group.stockBySize };
        if (has) {
          delete nextPriceBySize[sizeId];
          delete nextStockBySize[sizeId];
        } else {
          nextPriceBySize[sizeId] = nextPriceBySize[sizeId] ?? group.price;
          nextStockBySize[sizeId] = nextStockBySize[sizeId] ?? group.stock;
        }
        return { ...group, selectedSizeIds: nextIds, priceBySize: nextPriceBySize, stockBySize: nextStockBySize };
      })
    );
  };

  const duplicateWarnings = useMemo(() => {
    const seen = new Map<string, QuickGroup[]>();
    for (const group of groups) {
      const key = colorKey(group);
      if (!key) continue;
      seen.set(key, [...(seen.get(key) ?? []), group]);
    }
    const warnings = new Map<string, string>();
    for (const [, duplicates] of seen) {
      if (duplicates.length <= 1) continue;
      for (const group of duplicates) {
        warnings.set(group.localId, "نفس اللون موجود أكثر من مرة. استخدم نفس المجموعة أو أضف اسم علبة للتمييز.");
      }
    }
    return warnings;
  }, [groups]);

  const skuRows = useMemo(() => {
    const used = new Set<string>();
    return groups.flatMap((group) =>
      group.selectedSizeIds.map((sizeId) => {
        const size = activeSizes.find((item) => item.id === sizeId);
        const rawSku = `${group.skuBase || buildSkuBase(title, slug, group.colorName, group.boxLabel, 0)}-${sizeSkuPart(size?.name ?? sizeId)}`;
        let sku = rawSku;
        let suffix = 2;
        while (used.has(sku.toUpperCase())) {
          sku = `${rawSku}-${suffix}`;
          suffix += 1;
        }
        used.add(sku.toUpperCase());
        return {
          group,
          sizeId,
          sizeName: size?.name ?? sizeId,
          sku,
          price: group.priceMode === "manual" ? group.priceBySize[sizeId] ?? group.price : group.price,
          stock: group.stockBySize[sizeId] ?? group.stock,
        };
      })
    );
  }, [activeSizes, groups, slug, title]);

  const completeness = useMemo(() => {
    const missing: string[] = [];
    if (!title.trim()) missing.push("اسم المنتج");
    if (!slug.trim()) missing.push("Slug");
    if (!categoryId) missing.push("التصنيف");
    if (!description.trim()) missing.push("وصف قصير");
    const realGroups = groups.filter((group) => group.colorName.trim() || group.images.length || group.selectedSizeIds.length);
    if (!realGroups.length) missing.push("مجموعة لون واحدة على الأقل");
    for (const group of realGroups) {
      const label = group.colorName || "لون بدون اسم";
      if (!group.colorName.trim()) missing.push(`اسم اللون: ${label}`);
      if (!group.skuBase.trim()) missing.push(`SKU base: ${label}`);
      if (!group.images.length) missing.push(`صور: ${label}`);
      if (!group.selectedSizeIds.length) missing.push(`مقاسات: ${label}`);
      for (const sizeId of group.selectedSizeIds) {
        const price = group.priceMode === "manual" ? group.priceBySize[sizeId] ?? group.price : group.price;
        if (toNumber(price) <= 0) missing.push(`سعر صالح: ${label}`);
      }
    }
    const total = 8;
    const score = Math.max(0, Math.round(((total - Math.min(total, missing.length)) / total) * 100));
    return { score, missing: Array.from(new Set(missing)) };
  }, [categoryId, description, groups, slug, title]);

  const fillFromTitle = (nextTitle: string) => {
    setTitle(nextTitle);
    if (!slug.trim()) setSlug(slugify(nextTitle));
  };

  const syncSkuAfterProductChange = (nextTitle: string, nextSlug: string) => {
    setGroups((prev) =>
      prev.map((group, index) => ({
        ...group,
        skuBase: buildSkuBase(nextTitle, nextSlug, group.colorName, group.boxLabel, index),
      }))
    );
  };

  const startBulkCamera = async () => {
    setBulkCameraOpen(true);
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("الكاميرا المباشرة غير مدعومة. استخدم زر تصوير من الهاتف.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      setCameraStream(stream);
    } catch (e: any) {
      setCameraError(e?.message ?? "تعذر فتح الكاميرا. جرّب من الهاتف أو اسمح بالصلاحية.");
    }
  };

  const stopCamera = () => {
    setCameraStream((stream) => {
      stream?.getTracks().forEach((track) => track.stop());
      return null;
    });
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    const file = new File([blob], fileNameForShot(), { type: "image/jpeg" });
    setCapturedShots((prev) => [...prev, { id: genId("shot"), file, url: URL.createObjectURL(file) }]);
  };

  const addFallbackCameraFiles = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setCapturedShots((prev) => [
      ...prev,
      ...list.map((file) => ({ id: genId("shot"), file, url: URL.createObjectURL(file) })),
    ]);
    if (cameraFallbackRef.current) cameraFallbackRef.current.value = "";
  };

  const removeCapturedShot = (id: string) => {
    setCapturedShots((prev) => {
      const target = prev.find((shot) => shot.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((shot) => shot.id !== id);
    });
  };

  const processBulkShots = async () => {
    if (!capturedShots.length) return;
    setProcessingShots(true);
    try {
      const compressed = await Promise.all(
        capturedShots.map(async (shot) => {
          try {
            return await compressImage(shot.file, { maxW: 1800, maxH: 1800, quality: 0.86, mime: "image/jpeg" });
          } catch {
            return shot.file;
          }
        })
      );
      const palettes = await Promise.all(
        compressed.map(async (file) => {
          try {
            return await extractPaletteFromFile(file, 6, 72);
          } catch {
            return [];
          }
        })
      );
      const uploaded = await uploadImages(compressed);

      setGroups((prev) => {
        const next = prev.slice();
        const ensureGroup = (hex: string, index: number) => {
          const named = getNearestNamedColor(hex);
          const key = named?.sku ?? normalizeHex(hex) ?? `SHOT-${index + 1}`;
          let target = next.find((group) => colorKey(group) === key);
          if (!target) {
            target = makeEmptyGroup(title, slug, next.length, hex);
            target.colorName = named?.arabicName ?? target.colorName;
            target.skuBase = buildSkuBase(title, slug, target.colorName, target.boxLabel, next.length);
            next.push(target);
          }
          return target;
        };

        uploaded.files.forEach((file, index) => {
          const hex = normalizeHex(palettes[index]?.[0] ?? "") ?? "#000000";
          const group = ensureGroup(hex, index);
          const image: LocalImage = {
            localId: genId("bulk_img"),
            url: file.url,
            alt: group.colorName ? `${title} ${group.colorName}`.trim() : title,
            position: group.images.length,
            isPrimary: group.images.length === 0,
            view: group.images.length === 0 ? "Front" : null,
          };
          group.images = normalizeImages([...group.images, image]);
          group.colorHex = group.colorHex || hex;
        });
        return next;
      });

      for (const shot of capturedShots) URL.revokeObjectURL(shot.url);
      setCapturedShots([]);
      setBulkCameraOpen(false);
      toast.success("تمت إضافة الصور وتجميعها حسب اللون");
    } catch (e: any) {
      toast.error(e?.message ?? "فشل معالجة صور الكاميرا");
    } finally {
      setProcessingShots(false);
    }
  };

  const printSkuLabels = () => {
    const rows = skuRows;
    if (!rows.length) return;
    const html = `<!doctype html><html><head><title>SKU Labels</title><style>
      body{font-family:Arial,sans-serif;padding:24px}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:12px}
      .label{border:1px solid #111;padding:12px;border-radius:8px;break-inside:avoid}
      .sku{font-size:18px;font-weight:700;letter-spacing:1px}
      .bar{height:42px;margin-top:8px;background:repeating-linear-gradient(90deg,#000 0 2px,#fff 2px 5px,#000 5px 8px,#fff 8px 12px)}
      .meta{font-size:12px;color:#333;margin-top:6px}
    </style></head><body><div class="grid">${rows
      .map(
        (row) =>
          `<div class="label"><div class="sku">${row.sku}</div><div class="bar"></div><div class="meta">${row.group.colorName || ""} / ${row.sizeName} / ${row.price}</div></div>`
      )
      .join("")}</div><script>window.print()</script></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const copySkuLabels = async () => {
    const text = skuRows.map((row) => `${row.sku}\t${row.group.colorName}\t${row.sizeName}\t${row.price}`).join("\n");
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    toast.success("تم نسخ SKUs");
  };

  const saveQuickProduct = async () => {
    setError(null);
    if (!title.trim()) return setError("اسم المنتج مطلوب");
    if (!slug.trim()) return setError("Slug مطلوب");
    if (!categoryId) return setError("اختر تصنيف");

    const usableGroups = groups.filter((group) => group.colorName.trim() || group.images.length || group.selectedSizeIds.length);
    if (!usableGroups.length) return setError("أضف مجموعة لون واحدة على الأقل");

    const itemKeys = new Set<string>();
    for (const group of usableGroups) {
      const key = `${group.colorName.trim().toLowerCase()}::${group.boxLabel.trim().toLowerCase()}`;
      if (!group.colorName.trim()) return setError("كل مجموعة تحتاج اسم لون");
      if (!group.skuBase.trim()) return setError(`SKU base مطلوب للون ${group.colorName}`);
      if (itemKeys.has(key)) return setError(`لون مكرر بدون تمييز علبة: ${group.colorName}`);
      itemKeys.add(key);
      if (publishNow && !group.images.length) return setError(`أضف صورة للون ${group.colorName} قبل النشر`);
      if (publishNow && !group.selectedSizeIds.length) return setError(`أضف مقاس للون ${group.colorName} قبل النشر`);
    }

    if (publishNow && completeness.missing.some((item) => !["وصف قصير"].includes(item))) {
      return setError("أكمل البيانات الأساسية قبل النشر أو احفظ كمسودة.");
    }

    setSaving(true);
    try {
      const created = await createProduct({
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() ? description.trim() : null,
        isActive: false,
        categoryId,
      });
      const full = await getProductFull(created.id);
      const body = {
        product: {
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() ? description.trim() : null,
          isActive: publishNow,
          categoryId,
        },
        items: usableGroups.map((group, groupIndex) => ({
          colorName: group.colorName.trim(),
          boxLabel: group.boxLabel.trim(),
          colorHex: normalizeHex(group.colorHex) ?? null,
          suggestedColors: group.colorHex ? [group.colorHex] : undefined,
          skuBase: group.skuBase.trim() || buildSkuBase(title, slug, group.colorName, group.boxLabel, groupIndex),
          isActive: true,
          images: normalizeImages(group.images).map((image) => ({
            url: image.url,
            alt: image.alt?.trim() ? image.alt.trim() : null,
            position: image.position ?? 0,
            isPrimary: !!image.isPrimary,
            view: image.view ?? null,
          })),
          variants: group.selectedSizeIds.map((sizeId) => {
            const row = skuRows.find((item) => item.group.localId === group.localId && item.sizeId === sizeId);
            return {
              sizeId,
              sku: row?.sku ?? `${group.skuBase}-${sizeSkuPart(activeSizes.find((size) => size.id === sizeId)?.name ?? sizeId)}`,
              price: toNumber(row?.price),
              compareAt: null,
              stock: Math.max(0, Math.floor(toNumber(row?.stock))),
              lowStockThreshold: 0,
              weightGrams: null,
            };
          }),
        })),
        deleteItemIds: full.items?.map((item) => item.id).filter(Boolean) ?? [],
      };

      await updateProductFull(created.id, body);
      toast.success("تم إنشاء المنتج السريع");
      onCreated(created.id);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "فشل إنشاء المنتج");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quick Add Product"
      description="كل شيء في شاشة واحدة: بيانات المنتج، الألوان، الصور، المقاسات، الأسعار، SKUs، والنشر."
      widthClassName="max-w-7xl"
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="secondary" onClick={() => setPublishNow(false)} disabled={saving}>
            حفظ كمسودة
          </Button>
          <Button variant="primary" onClick={saveQuickProduct} isLoading={saving}>
            {publishNow ? "إنشاء ونشر" : "إنشاء المنتج"}
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="اسم المنتج"
                value={title}
                onChange={(e) => {
                  const value = (e.target?.value ?? e) as string;
                  fillFromTitle(value);
                  syncSkuAfterProductChange(value, slug || slugify(value));
                }}
              />
              <Input
                label="Slug"
                value={slug}
                onChange={(e) => {
                  const value = slugify((e.target?.value ?? e) as string);
                  setSlug(value);
                  syncSkuAfterProductChange(title, value);
                }}
              />
              <Select
                label="التصنيف"
                value={categoryId}
                onChange={(e) => setCategoryId((e.target?.value ?? e) as string)}
                options={categories.map((category) => ({ value: category.id, label: category.name }))}
                placeholder="اختر تصنيف"
              />
              <label className="flex items-center gap-2 pt-8 text-sm">
                <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
                نشر بعد الحفظ
              </label>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">وصف سريع</label>
                <textarea
                  className="min-h-[84px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Product completeness</div>
                <div className="text-xs opacity-70">{completeness.score}% ready</div>
              </div>
              <Button variant="secondary" onClick={startBulkCamera}>
                Bulk camera
              </Button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-emerald-400" style={{ width: `${completeness.score}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {completeness.missing.slice(0, 7).map((item) => (
                <span key={item} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
                  {item}
                </span>
              ))}
              {!completeness.missing.length ? <span className="text-sm text-emerald-200">جاهز للنشر</span> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Color groups</div>
              <Button size="sm" variant="primary" onClick={() => addGroup()}>
                إضافة لون
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {groups.map((group) => {
                const warning = duplicateWarnings.get(group.localId);
                const active = selectedGroup?.localId === group.localId;
                return (
                  <button
                    key={group.localId}
                    type="button"
                    onClick={() => setSelectedGroupId(group.localId)}
                    className={`w-full rounded-xl border p-3 text-start transition ${
                      active ? "border-accent-400/50 bg-accent-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: normalizeHex(group.colorHex) ?? "transparent" }} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{group.colorName || "لون جديد"}</span>
                    </div>
                    <div className="mt-1 text-xs opacity-70">{group.images.length} صور / {group.selectedSizeIds.length} مقاسات</div>
                    {warning ? <div className="mt-2 text-xs text-amber-200">{warning}</div> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedGroup ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Input
                    label="اسم اللون"
                    value={selectedGroup.colorName}
                    onChange={(e) => regenerateSkuBase(selectedGroup.localId, { colorName: (e.target?.value ?? e) as string })}
                  />
                  <Input
                    label="تمييز العلبة"
                    value={selectedGroup.boxLabel}
                    onChange={(e) => regenerateSkuBase(selectedGroup.localId, { boxLabel: (e.target?.value ?? e) as string })}
                    placeholder="اختياري"
                  />
                  <Input
                    label="SKU base"
                    value={selectedGroup.skuBase}
                    onChange={(e) => updateGroup(selectedGroup.localId, { skuBase: (e.target?.value ?? e) as string })}
                    dir="ltr"
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">Color</label>
                    <input
                      type="color"
                      value={normalizeHex(selectedGroup.colorHex) ?? "#000000"}
                      onChange={(e) => handleDetectedColors(selectedGroup.localId, [e.target.value])}
                      className="h-11 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5"
                    />
                  </div>
                </div>
                {duplicateWarnings.get(selectedGroup.localId) ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                    <span>{duplicateWarnings.get(selectedGroup.localId)}</span>
                    <Button size="sm" variant="secondary" onClick={() => regenerateSkuBase(selectedGroup.localId, { boxLabel: selectedGroup.boxLabel || `Group ${groups.findIndex((g) => g.localId === selectedGroup.localId) + 1}` })}>
                      إضافة تمييز تلقائي
                    </Button>
                  </div>
                ) : null}
                <div className="mt-3 flex justify-end">
                  <Button variant="danger" onClick={() => removeGroup(selectedGroup.localId)}>
                    حذف المجموعة
                  </Button>
                </div>
              </div>

              <ItemImagesManager
                images={selectedGroup.images}
                onChange={(next) => updateGroup(selectedGroup.localId, { images: next })}
                onPickColor={(hex) => handleDetectedColors(selectedGroup.localId, [hex])}
                onDetectedColors={(colors) => handleDetectedColors(selectedGroup.localId, colors)}
              />
            </div>
          ) : null}

          {selectedGroup ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Sizes and prices</div>
                  <div className="text-xs opacity-70">Templates + manual overrides</div>
                </div>
                <Select
                  className="h-9"
                  value=""
                  onChange={(e) => applySizeTemplate(selectedGroup.localId, (e.target?.value ?? e) as string)}
                  options={SIZE_TEMPLATES.map((template) => ({ value: template.id, label: template.label }))}
                  placeholder="Template"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Input label="Default price" value={selectedGroup.price} onChange={(e) => updateGroup(selectedGroup.localId, { price: (e.target?.value ?? e) as string })} />
                <Input label="Default stock" value={selectedGroup.stock} onChange={(e) => updateGroup(selectedGroup.localId, { stock: (e.target?.value ?? e) as string })} />
              </div>

              <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 ${selectedGroup.priceMode === "default" ? "bg-white/15" : "opacity-70 hover:bg-white/5"}`}
                  onClick={() => updateGroup(selectedGroup.localId, { priceMode: "default" })}
                >
                  سعر واحد
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 ${selectedGroup.priceMode === "manual" ? "bg-white/15" : "opacity-70 hover:bg-white/5"}`}
                  onClick={() => updateGroup(selectedGroup.localId, { priceMode: "manual" })}
                >
                  سعر لكل مقاس
                </button>
              </div>

              <div className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-white/10">
                {activeSizes.length ? (
                  activeSizes.map((size) => {
                    const checked = selectedGroup.selectedSizeIds.includes(size.id);
                    return (
                      <div key={size.id} className="border-b border-white/10 p-3 last:border-b-0">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input type="checkbox" checked={checked} onChange={() => toggleSize(selectedGroup.localId, size.id)} />
                          <span className="font-medium">{size.name}</span>
                        </label>
                        {checked ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Input
                              label="Price"
                              value={selectedGroup.priceMode === "manual" ? selectedGroup.priceBySize[size.id] ?? selectedGroup.price : selectedGroup.price}
                              disabled={selectedGroup.priceMode !== "manual"}
                              onChange={(e) =>
                                updateGroup(selectedGroup.localId, {
                                  priceBySize: { ...selectedGroup.priceBySize, [size.id]: (e.target?.value ?? e) as string },
                                })
                              }
                            />
                            <Input
                              label="Stock"
                              value={selectedGroup.stockBySize[size.id] ?? selectedGroup.stock}
                              onChange={(e) =>
                                updateGroup(selectedGroup.localId, {
                                  stockBySize: { ...selectedGroup.stockBySize, [size.id]: (e.target?.value ?? e) as string },
                                })
                              }
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-sm opacity-70">لا يوجد مقاسات فعالة.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">SKU label preview</div>
              <div className="text-xs opacity-70">{skuRows.length} labels</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={copySkuLabels} disabled={!skuRows.length}>
                نسخ SKUs
              </Button>
              <Button variant="secondary" onClick={printSkuLabels} disabled={!skuRows.length}>
                طباعة Labels
              </Button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {skuRows.slice(0, 12).map((row) => (
              <div key={`${row.group.localId}-${row.sizeId}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="font-mono text-sm font-semibold" dir="ltr">{row.sku}</div>
                <div className="mt-2 h-8 rounded bg-[repeating-linear-gradient(90deg,#fff_0_2px,transparent_2px_5px,#fff_5px_8px,transparent_8px_12px)] opacity-80" />
                <div className="mt-2 text-xs opacity-70">{row.group.colorName} / {row.sizeName} / {row.price}</div>
              </div>
            ))}
            {!skuRows.length ? <div className="text-sm opacity-70">اختر مقاسات لعرض SKUs.</div> : null}
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

        <Modal
          open={bulkCameraOpen}
          onClose={() => setBulkCameraOpen(false)}
          title="Bulk camera mode"
          widthClassName="max-w-5xl"
          footer={
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setBulkCameraOpen(false)} disabled={processingShots}>
                إغلاق
              </Button>
              <Button variant="secondary" onClick={captureFrame} disabled={!cameraStream || processingShots}>
                التقاط
              </Button>
              <Button variant="primary" onClick={processBulkShots} disabled={!capturedShots.length} isLoading={processingShots}>
                إضافة وتجميع الصور
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              {cameraStream ? (
                <video ref={videoRef} autoPlay playsInline muted className="max-h-[56vh] w-full rounded-xl object-contain" />
              ) : (
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
                  <div className="text-sm opacity-70">{cameraError ?? "اضغط على الزر لفتح الكاميرا أو استخدم التقاط الهاتف."}</div>
                  <Button variant="secondary" onClick={startBulkCamera}>
                    فتح الكاميرا
                  </Button>
                  <label className="inline-flex cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                    <input ref={cameraFallbackRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addFallbackCameraFiles(e.target.files)} />
                    تصوير من الهاتف
                  </label>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-semibold">Review shots ({capturedShots.length})</div>
              <div className="mt-3 grid max-h-[56vh] grid-cols-2 gap-2 overflow-auto">
                {capturedShots.map((shot) => (
                  <div key={shot.id} className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <img src={shot.url} alt="" className="h-28 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeCapturedShot(shot.id)}
                      className="absolute right-1 top-1 rounded-lg bg-black/70 px-2 py-1 text-xs text-white"
                    >
                      حذف
                    </button>
                  </div>
                ))}
                {!capturedShots.length ? <div className="col-span-2 text-sm opacity-70">لا توجد صور بعد.</div> : null}
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </Modal>
  );
}
