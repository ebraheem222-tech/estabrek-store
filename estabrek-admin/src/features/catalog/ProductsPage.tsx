// src/features/catalog/ProductsPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCatalogActions, useCategories, useProducts } from "../../hooks/useCatalog";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Skeleton, Spinner } from "../../components/ui/Spinner";
import { AsyncImage } from "../../components/ui/AsyncImage";
import type { ProductImportRow } from "../../api/catalog.api";
import { toast } from "@/lib/toast";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  // Basic CSV parser supporting quoted values
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  };

  const headers = split(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = split(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = cols[idx] ?? ""));
    rows.push(row);
  }
  return rows;
}

function normalizeRecordKeys(row: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const k of Object.keys(row)) {
    out[String(k).trim().toLowerCase()] = String(row[k] ?? "").trim();
  }
  return out;
}

function parseBool(v: string | undefined): boolean | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (s === "" ) return undefined;
  if (["1", "true", "yes", "y", "on", "active", "enabled"].includes(s)) return true;
  if (["0", "false", "no", "n", "off", "inactive", "disabled", "draft"].includes(s)) return false;
  return undefined;
}

function parseNum(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseImages(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  // allow comma/semicolon/pipe separated URLs
  const parts = v
    .split(/[,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function mapCsvRowToImportRow(row: Record<string, string>): ProductImportRow {
  const r = normalizeRecordKeys(row);
  const title = r.title || r.name || r.product || "";
  const slug = (r.slug || "")?.trim() || (title ? slugify(title) : "");

  return {
    title,
    slug,
    description: r.description || r.desc || r.details || undefined,
    isActive: parseBool(r.isactive ?? r.active ?? r.status),
    categoryId: r.categoryid || undefined,
    categorySlug: r.categoryslug || undefined,
    categoryName: r.categoryname || undefined,
    // optional default item/variant hints (backend safely ignores if not used)
    colorName: r.colorname || r.color || undefined,
    boxLabel: r.boxlabel || r.box_label || r.box || r.pack || undefined,
    colorHex: r.colorhex || r.hex || undefined,
    skuBase: r.skubase || r.sku || undefined,
    sizeName: r.sizename || r.size || undefined,
    price: parseNum(r.price),
    stock: parseNum(r.stock),
    images: parseImages(r.images),
  };
}

function validateImportRows(rows: ProductImportRow[], opts: { defaultCategoryId?: string; createMissingCategories?: boolean }) {
  const issues: Record<number, string[]> = {};
  rows.forEach((r, idx) => {
    const errs: string[] = [];
    if (!r.title?.trim()) errs.push("العنوان (title) مطلوب");
    if (r.slug && !/^[a-z0-9-]+$/.test(r.slug)) errs.push("slug غير صالح (استخدم أحرف/أرقام و - فقط)");
    const hasCategory = Boolean(r.categoryId || r.categorySlug || r.categoryName || opts.defaultCategoryId);
    if (!hasCategory) errs.push("لا يوجد تصنيف (category) — اختر default category أو ضع categoryId/categorySlug/categoryName");
    if (errs.length) issues[idx] = errs;
  });
  return issues;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function productThumbUrl(product: any): string | undefined {
  const fromKnown = [
    product?.thumbnailUrl,
    product?.imageUrl,
    product?.coverUrl,
    product?.image,
    product?.thumb,
  ].find((value) => typeof value === "string" && value.trim());
  return fromKnown ? String(fromKnown) : undefined;
}

function productDiscountPercent(product: any): number | undefined {
  const explicit = toFiniteNumber(product?.discountPercent ?? product?.discount_percentage ?? product?.discount);
  if (explicit && explicit > 0) return Math.round(explicit);

  const base = toFiniteNumber(product?.price ?? product?.basePrice ?? product?.minPrice);
  const sale = toFiniteNumber(product?.salePrice ?? product?.discountPrice ?? product?.minSalePrice);
  if (!base || !sale || base <= 0 || sale <= 0 || sale >= base) return undefined;
  return Math.max(1, Math.round(((base - sale) / base) * 100));
}

export default function ProductsPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"all" | "active" | "draft">("all");
  const q = useProducts(status);
  const qCats = useCategories();
  const actions = useCatalogActions();

  const products = q.data ?? [];
  const categories = qCats.data ?? [];

  const byId = useMemo(() => {
    const m = new Map<string, any>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const hasSelection = selectedIds.length > 0;

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importRows, setImportRows] = useState<ProductImportRow[]>([]);
  const [importRowIssues, setImportRowIssues] = useState<Record<number, string[]>>({});
  const [importReport, setImportReport] = useState<null | { ok: boolean; summary: any; results: any[] }>(null);
  const [importMode, setImportMode] = useState<"create" | "upsertBySlug">("create");
  const [importCreateMissingCats, setImportCreateMissingCats] = useState(true);
  const [importDefaultCategoryId, setImportDefaultCategoryId] = useState<string>("");
  const [importErr, setImportErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [description, setDescription] = useState<string>("");

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string; slug?: string; categoryId?: string }>({});

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setCategoryId(categories[0]?.id ?? "");
    setIsActive(false);
    setDescription("");
    setErrors({});
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setTitle(p.title ?? "");
    setSlug(p.slug ?? "");
    setCategoryId(p.categoryId ?? "");
    setIsActive(Boolean(p.isActive ?? true));
    setDescription(p.description ?? "");
    setErrors({});
    setOpen(true);
  };

  const onSave = async () => {
    const body = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() ? description.trim() : null,
      isActive,
      categoryId,
    };

    const nextErrors: { title?: string; slug?: string; categoryId?: string } = {};
    if (!body.title) nextErrors.title = "العنوان مطلوب";
    if (!body.slug) nextErrors.slug = "الـ slug مطلوب (بالإنجليزي)";
    if (!body.categoryId) nextErrors.categoryId = "اختر تصنيف";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    try {
      if (editingId) {
        await actions.updateProduct.mutateAsync({ id: editingId, body });
      } else {
        const created = await actions.createProduct.mutateAsync(body);
        // New product will already have a default Item + Variant (backend)
        // Editor route is nested under /admin
        nav(`/admin/catalog/products/${created.id}`);
      }
      setOpen(false);
    } catch {
      // toast handled inside hook
    }
  };

  const onDelete = async () => {
    if (!confirmId) return;
    try {
      await actions.deleteProduct.mutateAsync(confirmId);
    } finally {
      setConfirmId(null);
    }
  };

  const runBulk = async (payload: { action: "setActive" | "delete"; isActive?: boolean }) => {
    if (selectedIds.length === 0) return;
    try {
      await actions.bulkProducts.mutateAsync({ ids: selectedIds, ...payload });
      setSelected({});
    } catch {
      // toast handled inside hook
    }
  };

  const onPickCsvFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const raw = parseCsv(text);
      const mapped: ProductImportRow[] = raw.map((r) => {
        const titleVal = (r.title ?? r.Title ?? r.name ?? r.Name ?? "").toString().trim();
        const slugVal = (r.slug ?? r.Slug ?? "").toString().trim();
        const categoryIdVal = (r.categoryId ?? r.CategoryId ?? "").toString().trim();
        const categoryNameVal = (r.category ?? r.Category ?? r.categoryName ?? r.CategoryName ?? "").toString().trim();
        const isActiveRaw = (r.isActive ?? r.active ?? r.Active ?? "").toString().trim();
        const isActiveVal = isActiveRaw === "" ? undefined : ["1", "true", "yes", "y", "فعال", "مفعل"].includes(isActiveRaw.toLowerCase());
        const descriptionVal = (r.description ?? r.Description ?? "").toString();
        const slugFinal = slugVal || (titleVal ? slugify(titleVal) : "");
        return {
          title: titleVal,
          slug: slugFinal,
          description: descriptionVal || undefined,
          isActive: isActiveVal,
          categoryId: categoryIdVal || undefined,
          categoryName: categoryNameVal || undefined,
        };
      });

      // client-side validation for preview
      const issues: Record<number, string[]> = {};
      const seen = new Set<string>();
      mapped.forEach((row, idx) => {
        const errs: string[] = [];
        if (!row.title?.trim()) errs.push("العنوان مطلوب");
        if (!row.slug?.trim()) errs.push("الـslug مطلوب أو اكتب title ليتولد");
        if (row.slug) {
          const key = row.slug.trim().toLowerCase();
          if (seen.has(key)) errs.push("slug مكرر داخل الملف");
          seen.add(key);
        }
        if (!row.categoryId && !row.categoryName && !importDefaultCategoryId) {
          errs.push("اختر default category أو ضع categoryId/categoryName");
        }
        if (errs.length) issues[idx] = errs;
      });

      setImportRows(mapped);
      setImportRowIssues(issues);
      setImportErr(null);
    } catch (e) {
      setImportErr((e as any)?.message ?? "فشل قراءة الملف");
    }
  };

  
const doImport = async () => {
  if (!importRows.length) return;
  setImporting(true);
  setImportReport(null);
  try {
    // let backend validate rows too, but we block obvious issues for better UX
    if (Object.keys(importRowIssues).length) {
      toast.error("في صفوف فيها أخطاء. صلحها قبل الاستيراد.");
      return;
    }

    const res = await actions.importProducts.mutateAsync({
      rows: importRows,
      mode: importMode,
      createMissingCategories: importCreateMissingCats,
      defaultCategoryId: importDefaultCategoryId || undefined,
    });

    setImportReport(res as any);
  } catch {
    // toast handled inside hook
  } finally {
    setImporting(false);
  }
};

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">المنتجات</div>
            <div className="mt-1 text-xs opacity-70">Products</div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Select
              value={status}
              className="w-full sm:w-40"
              onChange={(e) => {
                setStatus(e.target.value as any);
                setSelected({});
              }}
              options={[
                { value: "all", label: "الكل" },
                { value: "active", label: "مفعل" },
                { value: "draft", label: "مسودة" },
              ]}
            />

            <Button variant="secondary" onClick={() => { setImportDefaultCategoryId(categoryId); setImportOpen(true); }} className="w-full sm:w-auto">
              استيراد CSV
            </Button>

            <Button variant="primary" onClick={openCreate} className="w-full sm:w-auto">
              إضافة منتج
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {q.isLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Spinner />
              <div className="text-sm opacity-80">جاري التحميل…</div>
            </div>
            <div className="space-y-3 sm:hidden">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-14 w-14 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Skeleton className="h-8 rounded-lg" />
                    <Skeleton className="h-8 rounded-lg" />
                    <Skeleton className="h-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-10" />
                    <TH>المنتج</TH>
                    <TH>Slug</TH>
                    <TH>التصنيف</TH>
                    <TH>الحالة</TH>
                    <TH className="w-72">الإجراءات</TH>
                  </TR>
                </THead>
                <TBody>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <TR key={idx}>
                      <TD><Skeleton className="h-4 w-4 rounded" /></TD>
                      <TD><Skeleton className="h-4 w-40" /></TD>
                      <TD><Skeleton className="h-4 w-48" /></TD>
                      <TD><Skeleton className="h-4 w-28" /></TD>
                      <TD><Skeleton className="h-6 w-16 rounded-full" /></TD>
                      <TD><Skeleton className="h-8 w-full rounded-lg" /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">فشل تحميل المنتجات.</div>
        ) : (
          <>
            {hasSelection && (
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm opacity-80">محدد: {selectedIds.length}</div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <Button variant="secondary" onClick={() => runBulk({ action: "setActive", isActive: true })} isLoading={actions.bulkProducts.isPending}>
                    تفعيل
                  </Button>
                  <Button variant="secondary" onClick={() => runBulk({ action: "setActive", isActive: false })} isLoading={actions.bulkProducts.isPending}>
                    تحويل لمسودة
                  </Button>
                  <Button variant="danger" onClick={() => {
                    if (!confirm("حذف كل المنتجات المحددة؟")) return;
                    runBulk({ action: "delete" });
                  }} isLoading={actions.bulkProducts.isPending}>
                    حذف
                  </Button>
                </div>
              </div>
            )}

                        <>
              <div className="space-y-3 sm:hidden">
                {products.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={products.length > 0 && products.every((p: any) => selected[p.id])}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const next: Record<string, boolean> = {};
                          products.forEach((p: any) => (next[p.id] = checked));
                          setSelected(next);
                        }}
                      />
                      <span>تحديد الكل</span>
                    </label>
                    <span className="text-xs opacity-70">{products.length}</span>
                  </div>
                )}

                {products.map((p: any) => (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-visible">
                          <div className="h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                            <AsyncImage
                              src={productThumbUrl(p)}
                              alt={p.title ?? ""}
                              wrapperClassName="h-full w-full"
                              className="h-full w-full object-cover"
                              fallback={<span className="text-[9px] opacity-60">IMG</span>}
                            />
                          </div>
                          {productDiscountPercent(p) ? (
                            <span
                              className="discount-shape-badge pointer-events-none absolute -right-2 -top-2 inline-flex border border-rose-200/40 bg-rose-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg"
                              title="منتج بخصم"
                            >
                              -{productDiscountPercent(p)}%
                            </span>
                          ) : null}
                        </div>
                        <div className="min-w-0">
                        <div className="text-sm font-semibold">{p.title}</div>
                        <div dir="ltr" className="mt-1 text-xs opacity-70">{p.slug}</div>
                        <div className="mt-1 text-xs opacity-70">{p.category?.name ?? byId.get(p.categoryId)?.name ?? "-"}</div>
                      </div>
                      </div>
                      <input
                        type="checkbox"
                        aria-label="Select"
                        checked={Boolean(selected[p.id])}
                        onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
                      />
                    </div>
                    <div className="mt-2">
                      {p.isActive ? (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-100">نشط</span>
                      ) : (
                        <span className="rounded-full border border-yellow-400/30 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-100">مسودة</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(p)}>
                        تعديل
                      </Button>
                      <Button size="sm" variant="primary" className="flex-1" onClick={() => nav(`/admin/catalog/products/${p.id}`)}>
                        تحرير
                      </Button>
                      <Button size="sm" variant="danger" className="flex-1" onClick={() => setConfirmId(p.id)}>
                        حذف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block">
                <Table>
                  <THead>
                    <TR>
                      <TH className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          checked={products.length > 0 && products.every((p: any) => selected[p.id])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const next: Record<string, boolean> = {};
                            products.forEach((p: any) => (next[p.id] = checked));
                            setSelected(next);
                          }}
                        />
                      </TH>
                      <TH>المنتج</TH>
                      <TH>Slug</TH>
                      <TH>التصنيف</TH>
                      <TH>الحالة</TH>
                      <TH className="w-72">الإجراءات</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {products.map((p: any) => (
                      <TR key={p.id}>
                        <TD>
                          <input
                            type="checkbox"
                            aria-label="Select"
                            checked={Boolean(selected[p.id])}
                            onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
                          />
                        </TD>
                        <TD className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-visible">
                              <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                                <AsyncImage
                                  src={productThumbUrl(p)}
                                  alt={p.title ?? ""}
                                  wrapperClassName="h-full w-full"
                                  className="h-full w-full object-cover"
                                  fallback={<span className="text-[9px] opacity-60">IMG</span>}
                                />
                              </div>
                              {productDiscountPercent(p) ? (
                                <span
                                  className="discount-shape-badge pointer-events-none absolute -right-2 -top-2 inline-flex border border-rose-200/40 bg-rose-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg"
                                  title="منتج بخصم"
                                >
                                  -{productDiscountPercent(p)}%
                                </span>
                              ) : null}
                            </div>
                            <span className="truncate">{p.title}</span>
                          </div>
                        </TD>
                        <TD dir="ltr" className="text-left opacity-80">
                          {p.slug}
                        </TD>
                        <TD className="opacity-80">{p.category?.name ?? byId.get(p.categoryId)?.name ?? "-"}</TD>
                        <TD>
                          {p.isActive ? (
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-100">نشط</span>
                          ) : (
                            <span className="rounded-full border border-yellow-400/30 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-100">مسودة</span>
                          )}
                        </TD>
                        <TD>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" onClick={() => openEdit(p)}>
                              تعديل
                            </Button>
                            <Button variant="primary" onClick={() => nav(`/admin/catalog/products/${p.id}`)}>
                              تحرير المنتج
                            </Button>
                            <Button variant="danger" onClick={() => setConfirmId(p.id)}>
                              حذف
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </>
          </>
        )}
      </div>

      <Modal
        open={open}
        title={editingId ? "تعديل منتج" : "إضافة منتج"}
        onClose={() => setOpen(false)}
        widthClassName="max-w-2xl"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={onSave} isLoading={actions.createProduct.isPending || actions.updateProduct.isPending}>
              حفظ
            </Button>
          </div>
        }
      >
        <div dir="rtl" className="space-y-4">
          <Input
            label="العنوان"
            value={title}
            error={errors.title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((p) => ({ ...p, title: undefined }));
              if (!editingId && !slug) setSlug(slugify(e.target.value));
            }}
          />

          <Input
            label="Slug (إنجليزي)"
            value={slug}
            error={errors.slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setErrors((p) => ({ ...p, slug: undefined }));
            }}
            placeholder="winter-jacket"
          />

          <Select
            label="التصنيف"
            value={categoryId}
            error={errors.categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setErrors((p) => ({ ...p, categoryId: undefined }));
            }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div>
            <label className="mb-2 block text-sm font-medium">الوصف (اختياري)</label>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-sm">مفعل</span>
          </div>
        </div>
      </Modal>

      <Modal
        open={importOpen}
        title="استيراد منتجات من CSV"
        onClose={() => {
          setImportOpen(false);
          setImportErr(null);
        }}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={doImport} disabled={!importRows.length || Object.keys(importRowIssues).length > 0} isLoading={actions.importProducts.isPending}>
              استيراد
            </Button>
          </div>
        }
      >
        <div dir="rtl" className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm opacity-90">
            <div className="font-semibold">الأعمدة المدعومة</div>
            <div className="mt-1 opacity-80">
              title, slug, categoryId أو categorySlug, description, isActive (true/false), price, stock, skuBase, colorName, boxLabel, colorHex, size, images (comma separated)
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onPickCsvFile(e.target.files?.[0] ?? null)}
            />
            <Select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as any)}
              options={[
                { value: "create", label: "إنشاء فقط (Create-only)" },
                { value: "upsertBySlug", label: "تحديث حسب slug (Upsert)" },
              ]}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={importCreateMissingCats} onChange={(e) => setImportCreateMissingCats(e.target.checked)} />
              إنشاء تصنيفات غير موجودة
            </label>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm opacity-80">عدد الصفوف: {importRows.length}</div>
            {importRows.length > 0 ? (
              <div className="mt-3 overflow-auto">
                <table className="min-w-[700px] text-sm">
  <thead className="sticky top-0 bg-zinc-950/80 backdrop-blur">
    <tr className="text-zinc-400">
      <th className="px-3 py-2 text-right">#</th>
      <th className="px-3 py-2 text-right">العنوان</th>
      <th className="px-3 py-2 text-right">slug</th>
      <th className="px-3 py-2 text-right">التصنيف</th>
      <th className="px-3 py-2 text-right">السعر</th>
      <th className="px-3 py-2 text-right">المخزون</th>
      <th className="px-3 py-2 text-right">الحالة</th>
      <th className="px-3 py-2 text-right">ملاحظات</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-white/5">
    {importRows.slice(0, 12).map((r, idx) => {
      const issues = importRowIssues[idx];
      const cat = r.categoryId || r.categorySlug || r.categoryName || (importDefaultCategoryId ? "(importDefaultCategoryId)" : "");
      const status =
        typeof r.isActive === "boolean" ? (r.isActive ? "Active" : "Draft") : "(غير محدد)";
      return (
        <tr key={idx} className={issues ? "bg-red-500/5" : undefined}>
          <td className="px-3 py-2 text-zinc-500">{idx + 1}</td>
          <td className="px-3 py-2">{r.title}</td>
          <td className="px-3 py-2 font-mono text-xs">{r.slug || "—"}</td>
          <td className="px-3 py-2">{cat || "—"}</td>
          <td className="px-3 py-2">{typeof r.price === "number" ? r.price : "—"}</td>
          <td className="px-3 py-2">{typeof r.stock === "number" ? r.stock : "—"}</td>
          <td className="px-3 py-2">{status}</td>
          <td className="px-3 py-2 text-xs text-zinc-400">
            {issues ? issues.join(" · ") : "OK"}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
              </div>
            ) : null}
          </div>

          {importErr ? <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-100">{importErr}</div> : null}

          {Object.keys(importRowIssues).length ? (
            <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-sm text-amber-100">
              في {Object.keys(importRowIssues).length} صف/صفوف فيها أخطاء. صحح CSV أو استخدم defaultCategoryId قبل الاستيراد.
            </div>
          ) : null}
          
          {importReport ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-semibold">تقرير الاستيراد</div>
                <Button variant="ghost" onClick={() => setImportReport(null)}>إخفاء</Button>
              </div>
          
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-200">
                <div>الإجمالي: <span className="font-semibold">{importReport.summary?.total}</span></div>
                <div>المود: <span className="font-mono text-xs">{importReport.summary?.mode}</span></div>
                <div>تم إنشاء: <span className="font-semibold">{importReport.summary?.created}</span></div>
                <div>تم تحديث: <span className="font-semibold">{importReport.summary?.updated}</span></div>
                <div>فشل: <span className="font-semibold">{importReport.summary?.failed}</span></div>
              </div>
          
              {importReport.summary?.failed ? (
                <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-white/10">
                  <table className="min-w-[700px] text-sm">
                    <thead className="sticky top-0 bg-zinc-950/80 backdrop-blur">
                      <tr className="text-zinc-400">
                        <th className="px-3 py-2 text-right">#</th>
                        <th className="px-3 py-2 text-right">slug</th>
                        <th className="px-3 py-2 text-right">العنوان</th>
                        <th className="px-3 py-2 text-right">السبب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {importReport.results
                        .filter((r) => r.action === "failed")
                        .slice(0, 50)
                        .map((r) => (
                          <tr key={r.index} className="bg-red-500/5">
                            <td className="px-3 py-2 text-zinc-500">{r.index + 1}</td>
                            <td className="px-3 py-2 font-mono text-xs">{r.slug || "—"}</td>
                            <td className="px-3 py-2">{r.title || "—"}</td>
                            <td className="px-3 py-2 text-xs text-red-100">{r.message || "Unknown error"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-3 text-sm text-emerald-200">كل الصفوف نجحت ✅</div>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا المنتج؟"
        variant="danger"
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}


