import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { cn } from "../../components/ui/cn";
import { toast } from "../../lib/toast";
import {
  batchUploadProductImages,
  listPendingProductImages,
  autoGroupProductImages,
  commitProductImageGroups,
  type WizardAsset,
  type AutoGroup,
} from "../../api/productImagesWizard.api";
import { listSizes } from "../../api/catalog.api";

type Props = {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onCommitted?: () => void;
};

type GroupVariantsDraft = {
  sizeIds: string[];
  price: string;
  compareAt: string;
  /** bulk default stock (used to prefill per-size inputs) */
  stock: string;
  /** per-size stock overrides (strings for inputs) */
  stockBySize: Record<string, string>;
  lowStockThreshold: string;
  weightGrams: string;
};

type GroupState = {
  id: string;
  colorName: string;
  colorHex: string;
  assets: WizardAssetState[];
  variants: GroupVariantsDraft;
};

type WizardAssetState = WizardAsset & {
  view?: string | null; // Front/Back/Side/Detail
  alt?: string | null;
};

function normalizeHex(h: string) {
  const x = (h || "").trim();
  if (!x) return "#000000";
  if (x.startsWith("#")) return x.toUpperCase();
  return ("#" + x).toUpperCase();
}

function newId() {
  return "g_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function defaultVariantsDraft(): GroupVariantsDraft {
  return {
    sizeIds: [],
    price: "0",
    compareAt: "",
    stock: "0",
    stockBySize: {},
    lowStockThreshold: "0",
    weightGrams: "",
  };
}

export default function ProductImagesWizardModal({ open, productId, onClose, onCommitted }: Props) {
  const [unassigned, setUnassigned] = useState<WizardAssetState[]>([]);
  const [groups, setGroups] = useState<GroupState[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const dragRef = useRef<{ asset: WizardAssetState; fromGroupId: string | null } | null>(null);

  const enabled = open && !!productId;

  const qPending = useQuery({
    queryKey: ["product-pending-images", productId],
    queryFn: () => listPendingProductImages(productId!),
    enabled,
  });

  const qSizes = useQuery({
    queryKey: ["catalog-sizes"],
    queryFn: () => listSizes(),
    enabled: open,
  });

  const sizes = useMemo(() => {
    const s = (qSizes.data ?? []).filter((x) => x.active !== false);
    return [...s].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  }, [qSizes.data]);


  useEffect(() => {
    if (!open) return;
    const items = (qPending.data?.items ?? []).map((x) => ({ ...x, view: null, alt: null }));
    setUnassigned(items);
    setGroups([]);
  }, [open, qPending.data?.items]);

  const mUpload = useMutation({
    mutationFn: async (files: File[]) => batchUploadProductImages(productId!, files),
    onSuccess: (data) => {
      toast.success(`تم رفع ${data.files.length} صورة`);
      setUnassigned((prev) => [...data.files.map((x) => ({ ...x, view: null, alt: null })), ...prev]);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "فشل رفع الصور"),
  });

  const mAutoGroup = useMutation({
    mutationFn: async () => autoGroupProductImages(productId!, unassigned.map((a) => a.id)),
    onSuccess: (data) => {
      const next: GroupState[] = data.groups.map((g) => ({
        id: g.groupId || newId(),
        colorName: g.colorName || "Color",
        colorHex: normalizeHex(g.colorHex || "#000000"),
        assets: (g.assets || []).map((x) => ({ ...x, view: null, alt: null })),
        variants: defaultVariantsDraft(),
      }));
      setGroups(next);
      setUnassigned([]); // all assigned by suggestion
      toast.success(`تم عمل ${next.length} مجموعات`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "فشل التجميع"),
  });

  const mCommit = useMutation({
    mutationFn: async () => {
      // local validation for variants
      for (const g of groups) {
        if (g.variants.sizeIds.length) {
          const price = Number(g.variants.price);
          if (!Number.isFinite(price) || price <= 0) {
            throw new Error(`حدد سعر للقياسات داخل اللون: ${g.colorName}`);
          }
        }
      }

      const payload = {
        groups: groups
          .map((g) => {
            const sizeIds = g.variants.sizeIds || [];
            const variants =
              sizeIds.length > 0
                ? {
                    sizeIds,
                    price: Number(g.variants.price || 0),
                    compareAt: g.variants.compareAt ? Number(g.variants.compareAt) : null,
                    // backward compatible: still send bulk stock, but also send per-size
                    stock: Number(g.variants.stock || 0),
                    stockBySize: Object.fromEntries(
                      sizeIds.map((id) => [id, Number((g.variants.stockBySize?.[id] ?? "0") || 0)])
                    ),
                    lowStockThreshold: Number(g.variants.lowStockThreshold || 0),
                    weightGrams: g.variants.weightGrams ? Number(g.variants.weightGrams) : null,
                  }
                : null;

            return {
              colorName: g.colorName.trim(),
              colorHex: g.colorHex || null,
              assets: g.assets.map((a) => ({ assetId: a.id, view: a.view ?? null, alt: a.alt ?? null })),
              variants,
            };
          })
          .filter((g) => g.colorName && g.assets.length),
      };
      return commitProductImageGroups(productId!, payload);
    },
    onSuccess: () => {
      toast.success("تم إنشاء الألوان/الصور من الرفع");
      onCommitted?.();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e?.message ?? "فشل حفظ المجموعات"),
  });

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    mUpload.mutate(files);
    e.target.value = "";
  }

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { id: newId(), colorName: `Color ${prev.length + 1}`, colorHex: "#111111", assets: [], variants: defaultVariantsDraft() },
    ]);
  }

  function removeGroup(id: string) {
    setGroups((prev) => {
      const g = prev.find((x) => x.id === id);
      if (g?.assets?.length) setUnassigned((u) => [...g.assets, ...u]);
      return prev.filter((x) => x.id !== id);
    });
  }
  function updateGroupVariants(groupId: string, patch: Partial<GroupVariantsDraft>) {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, variants: { ...g.variants, ...patch } } : g))
    );
  }

  function toggleGroupSize(groupId: string, sizeId: string) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const has = g.variants.sizeIds.includes(sizeId);
        const nextIds = has ? g.variants.sizeIds.filter((x) => x !== sizeId) : [...g.variants.sizeIds, sizeId];
        const nextStockBySize = { ...(g.variants.stockBySize || {}) };

        if (has) {
          delete nextStockBySize[sizeId];
        } else {
          // prefill with current bulk stock
          nextStockBySize[sizeId] = nextStockBySize[sizeId] ?? String(g.variants.stock ?? "0");
        }

        return { ...g, variants: { ...g.variants, sizeIds: nextIds, stockBySize: nextStockBySize } };
      })
    );
  }

  function selectAllSizes(groupId: string) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextIds = sizes.map((s) => s.id);
        const nextStockBySize: Record<string, string> = { ...(g.variants.stockBySize || {}) };
        for (const id of nextIds) {
          nextStockBySize[id] = nextStockBySize[id] ?? String(g.variants.stock ?? "0");
        }
        return { ...g, variants: { ...g.variants, sizeIds: nextIds, stockBySize: nextStockBySize } };
      })
    );
  }

  function clearSizes(groupId: string) {
    updateGroupVariants(groupId, { sizeIds: [], stockBySize: {} });
  }

  function updateGroupStockForSize(groupId: string, sizeId: string, value: string) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          variants: {
            ...g.variants,
            stockBySize: { ...(g.variants.stockBySize || {}), [sizeId]: value },
          },
        };
      })
    );
  }

  function fillAllSelectedStocks(groupId: string) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const next: Record<string, string> = { ...(g.variants.stockBySize || {}) };
        for (const id of g.variants.sizeIds) {
          next[id] = String(g.variants.stock ?? "0");
        }
        return { ...g, variants: { ...g.variants, stockBySize: next } };
      })
    );
  }


  function takeAsset(assetId: string) {
    // returns [asset, fromGroupId] and removes it from state
    let moved: WizardAssetState | null = null;
    let fromGroupId: string | null = null;

    setUnassigned((u) => {
      const idx = u.findIndex((x) => x.id === assetId);
      if (idx >= 0) {
        moved = u[idx];
        fromGroupId = null;
        const copy = [...u];
        copy.splice(idx, 1);
        return copy;
      }
      return u;
    });

    setGroups((gs) => {
      return gs.map((g) => {
        const idx = g.assets.findIndex((x) => x.id === assetId);
        if (idx >= 0) {
          moved = g.assets[idx];
          fromGroupId = g.id;
          const copy = [...g.assets];
          copy.splice(idx, 1);
          return { ...g, assets: copy };
        }
        return g;
      });
    });

    return { moved, fromGroupId };
  }

  function insertToGroup(groupId: string | null, asset: WizardAssetState, index?: number) {
    if (!groupId) {
      setUnassigned((u) => [asset, ...u]);
      return;
    }
    setGroups((gs) =>
      gs.map((g) => {
        if (g.id !== groupId) return g;
        const arr = [...g.assets];
        // If this is the first image in the color group, default to "Front" view.
        const a = arr.length === 0 && !asset.view ? { ...asset, view: "Front" } : asset;
        const i = typeof index === "number" ? Math.max(0, Math.min(index, arr.length)) : 0;
        arr.splice(i, 0, a);
        return { ...g, assets: arr };
      })
    );
  }

  function moveAsset(assetId: string, toGroupId: string | null, toIndex?: number) {
    // Note: we rely on the synchronous dragRef (or caller-provided info) to avoid double-removes.
    const { moved } = takeAsset(assetId);
    if (!moved) return;
    insertToGroup(toGroupId, moved, toIndex);
  }

  function reorderWithinGroup(groupId: string, assetId: string, toIndex: number) {
    setGroups((gs) =>
      gs.map((g) => {
        if (g.id !== groupId) return g;
        const fromIndex = g.assets.findIndex((x) => x.id === assetId);
        if (fromIndex < 0) return g;
        const arr = [...g.assets];
        const [item] = arr.splice(fromIndex, 1);
        const idx = Math.max(0, Math.min(toIndex, arr.length));
        arr.splice(idx, 0, item);
        return { ...g, assets: arr };
      })
    );
  }

  function onDragStart(e: React.DragEvent, assetId: string, fromGroupId: string | null) {
    const asset = fromGroupId
      ? groups.find((g) => g.id === fromGroupId)?.assets.find((x) => x.id === assetId)
      : unassigned.find((x) => x.id === assetId);
    if (!asset) return;
    dragRef.current = { asset, fromGroupId };
    e.dataTransfer.setData("application/json", JSON.stringify({ assetId, fromGroupId }));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDropToGroup(e: React.DragEvent, groupId: string | null, index?: number) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json") || "";
    let payload: any = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }
    const id = payload?.assetId || e.dataTransfer.getData("text/plain");
    const fromGroupId = payload?.fromGroupId ?? dragRef.current?.fromGroupId ?? null;
    if (!id) return;

    // reorder if same group
    if (groupId && fromGroupId === groupId && typeof index === "number") {
      reorderWithinGroup(groupId, id, index);
      return;
    }

    moveAsset(id, groupId, index);
  }

  function setAssetMeta(groupId: string, assetId: string, patch: Partial<Pick<WizardAssetState, "view" | "alt">>) {
    setGroups((gs) =>
      gs.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          assets: g.assets.map((a) => (a.id === assetId ? { ...a, ...patch } : a)),
        };
      })
    );
  }

  const busy = mUpload.isPending || mAutoGroup.isPending || mCommit.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Batch Upload + Auto Group"
      widthClassName="max-w-6xl"
      description="ارفع صور كثيرة مرة وحدة، نخزّن الألوان (dominant/palette) ونقترح grouping حسب اللون. تقدر تعدّل بالسحب والإفلات."
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            إغلاق
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={busy || !productId}
          >
            رفع صور
          </Button>
          <Button variant="secondary" onClick={() => mAutoGroup.mutate()} disabled={busy || !unassigned.length}>
            Auto group
          </Button>
          <Button variant="secondary" onClick={addGroup} disabled={busy}>
            + Group
          </Button>
          <Button variant="primary" onClick={() => mCommit.mutate()} disabled={busy || !groups.some((g) => g.assets.length)}>
            Create Items
          </Button>
        </div>
      }
    >
      <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={onPickFiles} />

      {qPending.isLoading ? (
        <div className="p-6">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4">
          {qPending.isError ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              فشل تحميل صور pending
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-4">
            {/* Unassigned */}
            <Column
              title={`Unassigned (${unassigned.length})`}
              onDrop={(e) => onDropToGroup(e, null)}
              items={unassigned}
              onDragStart={(e, assetId) => onDragStart(e, assetId, null)}
            />

            {/* Groups */}
            <div className="lg:col-span-3 grid gap-3 lg:grid-cols-3">
              {groups.map((g) => (
                <div key={g.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={normalizeHex(g.colorHex)}
                      onChange={(e) => {
                        const v = normalizeHex(e.target.value);
                        setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, colorHex: v } : x)));
                      }}
                      className="h-8 w-10 rounded-lg border border-white/10 bg-transparent"
                      title="Group color"
                    />
                    <Input
                      label="Color name"
                      value={g.colorName}
                      onChange={(e) => setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, colorName: e.target.value } : x)))}
                    />
                    <Button variant="ghost" onClick={() => removeGroup(g.id)} disabled={busy} title="Remove group">
                      ✕
                    </Button>
                  </div>

                  <div
                    className="mt-3 min-h-[120px] rounded-xl border border-dashed border-white/15 p-2"
                    onDragOver={(e) => e.preventDefault()}
                    // Drop on the group "canvas" appends at end (keeps Primary = first).
                    onDrop={(e) => onDropToGroup(e, g.id, g.assets.length)}
                  >
                    {g.assets.length === 0 ? (
                      <div className="text-xs opacity-70">اسحب الصور هون</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {g.assets.map((a, idx) => (
                          <AssetThumb
                            key={a.id}
                            a={a}
                            groupId={g.id}
                            index={idx}
                            isPrimary={idx === 0}
                            onDragStart={(e, assetId) => onDragStart(e, assetId, g.id)}
                            onDrop={onDropToGroup}
                            onChangeView={(next) => setAssetMeta(g.id, a.id, { view: next })}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                                    <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                    <summary className="cursor-pointer select-none text-xs font-semibold">
                      Variants (Bulk sizes) {g.variants.sizeIds.length ? `(${g.variants.sizeIds.length})` : ""}
                      <span className="ml-2 font-normal opacity-70">(قبل Create Items)</span>
                    </summary>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button variant="secondary" onClick={() => selectAllSizes(g.id)} disabled={busy || sizes.length === 0}>
                        Select all
                      </Button>
                      <Button variant="ghost" onClick={() => clearSizes(g.id)} disabled={busy || g.variants.sizeIds.length === 0}>
                        Clear
                      </Button>
                      {qSizes.isLoading ? <span className="text-xs opacity-70">Loading sizes...</span> : null}
                      {qSizes.isError ? <span className="text-xs text-red-300">Failed to load sizes</span> : null}
                    </div>

                    <div className="mt-2 grid max-h-28 grid-cols-2 gap-2 overflow-auto rounded-lg border border-white/10 p-2">
                      {sizes.length === 0 ? (
                        <div className="col-span-2 text-xs opacity-70">لا يوجد sizes (روح على المقاسات واضف)</div>
                      ) : (
                        sizes.map((s) => (
                          <label key={s.id} className="flex cursor-pointer items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={g.variants.sizeIds.includes(s.id)}
                              onChange={() => toggleGroupSize(g.id, s.id)}
                              disabled={busy}
                            />
                            <span>{s.name}</span>
                          </label>
                        ))
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Input
                        label="Price"
                        value={g.variants.price}
                        onChange={(e) => updateGroupVariants(g.id, { price: e.target.value })}
                        placeholder="0"
                      />
                      <Input
                        label="Compare at (optional)"
                        value={g.variants.compareAt}
                        onChange={(e) => updateGroupVariants(g.id, { compareAt: e.target.value })}
                        placeholder=""
                      />
                      <Input
                        label="Default stock (prefill)"
                        value={g.variants.stock}
                        onChange={(e) => updateGroupVariants(g.id, { stock: e.target.value })}
                        placeholder="0"
                      />
                      <Input
                        label="Low stock"
                        value={g.variants.lowStockThreshold}
                        onChange={(e) => updateGroupVariants(g.id, { lowStockThreshold: e.target.value })}
                        placeholder="0"
                      />
                      <Input
                        label="Weight (g)"
                        value={g.variants.weightGrams}
                        onChange={(e) => updateGroupVariants(g.id, { weightGrams: e.target.value })}
                        placeholder=""
                      />
                    </div>

                    {g.variants.sizeIds.length ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold">Stock per size</div>
                          <Button
                            variant="secondary"
                            onClick={() => fillAllSelectedStocks(g.id)}
                            disabled={busy}
                          >
                            Fill all from default
                          </Button>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {g.variants.sizeIds
                            .map((id) => sizes.find((s) => s.id === id))
                            .filter(Boolean)
                            .map((s: any) => (
                              <Input
                                key={s.id}
                                label={s.name}
                                value={g.variants.stockBySize?.[s.id] ?? "0"}
                                onChange={(e) => updateGroupStockForSize(g.id, s.id, e.target.value)}
                                placeholder="0"
                              />
                            ))}
                        </div>
                        <div className="mt-2 text-[11px] opacity-70">
                          إذا تركت size بدون قيمة، سيتم اعتباره 0. يمكنك استخدام زر “Fill all” لتعبئة الكل.
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-2 text-[11px] opacity-70">
                      سيتم إنشاء Variant لكل size محدد داخل هذا اللون وقت Create Items.
                    </div>
                  </details>

<div className="mt-2 text-xs opacity-70">({g.assets.length})</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs opacity-70">
            ملاحظة: لما تعمل Create Items، بننشئ Item لكل group (colorName) وبنربط الصور كـ ProductItemImage.
          </div>
        </div>
      )}
    </Modal>
  );
}

function Column({
  title,
  items,
  onDrop,
  onDragStart,
}: {
  title: string;
  items: WizardAssetState[];
  onDrop: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent, assetId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div
        className="min-h-[180px] rounded-xl border border-dashed border-white/15 p-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {items.length === 0 ? (
          <div className="text-xs opacity-70">لا يوجد</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((a) => (
              <AssetThumb key={a.id} a={a} onDragStart={onDragStart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetThumb({
  a,
  groupId,
  index,
  isPrimary,
  onDragStart,
  onDrop,
  onChangeView,
}: {
  a: WizardAssetState;
  groupId?: string | null;
  index?: number;
  isPrimary?: boolean;
  onDragStart: (e: React.DragEvent, assetId: string) => void;
  onDrop?: (e: React.DragEvent, groupId: string | null, index?: number) => void;
  onChangeView?: (next: string | null) => void;
}) {
  const dc = a.dominantColorHex || null;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, a.id)}
      onDragOver={(e) => {
        if (!onDrop) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (!onDrop) return;
        onDrop(e, groupId ?? null, index);
      }}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/20"
      title={a.displayName || a.filename}
    >
      <img src={a.url} alt={a.displayName || ""} className="h-20 w-full object-cover" />
      {isPrimary ? (
        <div className="absolute top-1 left-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] text-emerald-100">
          Primary
        </div>
      ) : null}
      {dc ? (
        <div className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          <span className="inline-block h-2 w-2 rounded-sm align-middle mr-1" style={{ background: dc }} />
          {dc}
        </div>
      ) : null}
      {groupId ? (
        <div className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1 py-0.5">
          <select
            value={a.view ?? ""}
            onChange={(e) => onChangeView?.(e.target.value ? e.target.value : null)}
            className="bg-transparent text-white text-[10px] outline-none"
            title="View"
          >
            <option value="">View</option>
            <option value="360">360°</option>
            <option value="3d">3D</option>
            <option value="Front">Front</option>
            <option value="Back">Back</option>
            <option value="Side">Side</option>
            <option value="Detail">Detail</option>
          </select>
        </div>
      ) : null}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-black/20" />
    </div>
  );
}
