// src/features/catalog/ProductsPage.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCatalogActions, useCategories, useProducts, useSizes } from "../../hooks/useCatalog";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import type { ProductImportRow } from "../../api/catalog.api";
import { toast } from "@/lib/toast";
import { makeSlug, parsePrice } from "../../lib/productComposer";
import { ProductList } from "./ProductList";
import { tr } from "@/lib/words";

// Arabic titles become latin links too ("فستان الورد" → "fstan-alwrd").
function slugify(input: string) {
  return input.trim() ? makeSlug(input) : "";
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
  if (["1", "true", "yes", "y", "on", "active", "enabled", "نعم", "فعال", "مفعل", "منشور"].includes(s)) return true;
  if (["0", "false", "no", "n", "off", "inactive", "disabled", "draft", "لا", "مسودة", "غير مفعل"].includes(s)) return false;
  return undefined;
}

function parseNum(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = parsePrice(s);
  return n == null ? undefined : n;
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
  const title = r.title || r.name || r.product || r["الاسم"] || r["اسم المنتج"] || "";
  const slug = (r.slug || "")?.trim() || (title ? slugify(title) : "");

  return {
    title,
    slug,
    description: r.description || r.desc || r.details || r["الوصف"] || undefined,
    isActive: parseBool(r.isactive ?? r.active ?? r.status),
    categoryId: r.categoryid || undefined,
    categorySlug: r.categoryslug || undefined,
    categoryName: r.categoryname || r.category || r["القسم"] || r["التصنيف"] || undefined,
    // optional default item/variant hints (backend safely ignores if not used)
    colorName: r.colorname || r.color || r["اللون"] || undefined,
    boxLabel: r.boxlabel || r.box_label || r.box || r.pack || undefined,
    colorHex: r.colorhex || r.hex || undefined,
    skuBase: r.skubase || r.sku || undefined,
    sizeName: r.sizename || r.size || r["المقاس"] || undefined,
    price: parseNum(r.price ?? r["السعر"]),
    stock: parseNum(r.stock ?? r["الكمية"]),
    images: parseImages(r.images ?? r["الصور"]),
  };
}

function validateImportRows(rows: ProductImportRow[], opts: { defaultCategoryId?: string; createMissingCategories?: boolean }) {
  const issues: Record<number, string[]> = {};
  rows.forEach((r, idx) => {
    const errs: string[] = [];
    if (!r.title?.trim()) errs.push(tr("العنوان (title) مطلوب", "The title is required"));
    if (r.slug && !/^[a-z0-9-]+$/.test(r.slug)) errs.push(tr("slug غير صالح (أحرف/أرقام و - فقط)", "The slug isn't valid (letters, digits and - only)"));
    const hasCategory = Boolean(r.categoryId || r.categorySlug || r.categoryName || opts.defaultCategoryId);
    if (!hasCategory) errs.push(tr("لا يوجد قسم (category) — يرجى اختيار default category أو تعبئة categoryId/categorySlug/categoryName", "No category — choose a default category or fill categoryId/categorySlug/categoryName"));
    if (errs.length) issues[idx] = errs;
  });
  return issues;
}


export default function ProductsPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"all" | "active" | "draft">("all");
  const q = useProducts(status);
  const qCats = useCategories();
  const qSizes = useSizes();
  const actions = useCatalogActions();

  const products = q.data ?? [];
  const categories = qCats.data ?? [];
  const sizes = qSizes.data ?? [];

  const byId = useMemo(() => {
    const m = new Map<string, any>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
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
    if (!body.title) nextErrors.title = tr("العنوان مطلوب", "The title is required");
    if (!body.slug) nextErrors.slug = tr("الـ slug مطلوب (بالإنجليزي)", "The slug is required (in English)");
    if (!body.categoryId) nextErrors.categoryId = tr("يرجى اختيار قسم", "Choose a category");

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
      // Full mapping: price, stock, colour, size and images too (the help text promises them).
      const mapped: ProductImportRow[] = raw.map((r) => mapCsvRowToImportRow(r as Record<string, string>));

      // client-side validation for preview
      const issues: Record<number, string[]> = {};
      const seen = new Set<string>();
      mapped.forEach((row, idx) => {
        const errs: string[] = [];
        if (!row.title?.trim()) errs.push(tr("العنوان مطلوب", "The title is required"));
        if (!row.slug?.trim()) errs.push(tr("الـslug مطلوب، أو بيتولّد من title", "The slug is required, or write a title to make one"));
        if (row.slug) {
          const key = row.slug.trim().toLowerCase();
          if (seen.has(key)) errs.push(tr("slug مكرر داخل الملف", "The slug repeats inside the file"));
          seen.add(key);
        }
        if (!row.categoryId && !row.categoryName && !importDefaultCategoryId) {
          errs.push(tr("يرجى اختيار default category أو تعبئة categoryId/categoryName", "Choose a default category or fill categoryId/categoryName"));
        }
        if (errs.length) issues[idx] = errs;
      });

      setImportRows(mapped);
      setImportRowIssues(issues);
      setImportErr(null);
    } catch (e) {
      setImportErr((e as any)?.message ?? tr("فشل قراءة الملف", "The file couldn't be read"));
    }
  };

  
const doImport = async () => {
  if (!importRows.length) return;
  setImporting(true);
  setImportReport(null);
  try {
    // let backend validate rows too, but we block obvious issues for better UX
    if (Object.keys(importRowIssues).length) {
      toast.error(tr("في صفوف فيها أخطاء. لازم تتصلّح قبل الاستيراد.", "Some rows have errors. Fix them before importing."));
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
    <div className="space-y-4">
      <ProductList
        products={products}
        categories={categories}
        loading={q.isLoading}
        failed={q.isError}
        status={status}
        onStatus={(s) => { setStatus(s); setSelected({}); }}
        selected={selected}
        setSelected={setSelected}
        onQuickEdit={openEdit}
        onDelete={(id) => setConfirmId(id)}
        onImport={() => { setImportDefaultCategoryId(categoryId); setImportOpen(true); }}
        bulkBar={hasSelection ? (
          <div className="glass flex flex-col gap-2 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-white/80">{tr("محدد:", "Selected:")} {selectedIds.length}</div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <Button variant="secondary" onClick={() => runBulk({ action: "setActive", isActive: true })} isLoading={actions.bulkProducts.isPending}>{tr("نشر", "Publish")}</Button>
              <Button variant="secondary" onClick={() => runBulk({ action: "setActive", isActive: false })} isLoading={actions.bulkProducts.isPending}>{tr("تحويل لمسودة", "Make draft")}</Button>
              <Button variant="secondary" onClick={() => window.open(`/print/labels?productIds=${selectedIds.join(",")}`, "_blank")}>{tr("ملصقات باركود", "Barcode labels")}</Button>
              <Button variant="danger" onClick={() => { if (!confirm(tr("حذف كل المنتجات المحددة؟", "Delete all the selected products?"))) return; runBulk({ action: "delete" }); }} isLoading={actions.bulkProducts.isPending}>{tr("حذف", "Delete")}</Button>
            </div>
          </div>
        ) : null}
      />

      <Modal
        open={open}
        title={editingId ? tr("تعديل منتج", "Edit product") : tr("إضافة منتج", "Add product")}
        onClose={() => setOpen(false)}
        widthClassName="max-w-2xl"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={onSave} isLoading={actions.createProduct.isPending || actions.updateProduct.isPending}>
              {tr("حفظ", "Save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={tr("العنوان", "Title")}
            value={title}
            error={errors.title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((p) => ({ ...p, title: undefined }));
              if (!editingId && !slug) setSlug(slugify(e.target.value));
            }}
          />

          <Input
            label={tr("Slug (إنجليزي)", "Slug (English)")}
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
            <label className="mb-2 block text-sm font-medium">{tr("الوصف (اختياري)", "Description (optional)")}</label>
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
        title={tr("استيراد منتجات من CSV", "Import products from CSV")}
        onClose={() => {
          setImportOpen(false);
          setImportErr(null);
        }}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={doImport} disabled={!importRows.length || Object.keys(importRowIssues).length > 0} isLoading={actions.importProducts.isPending}>
              {tr("استيراد", "Import")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm opacity-90">
            <div className="font-semibold">{tr("الأعمدة المدعومة", "Supported columns")}</div>
            <div className="mt-1 opacity-80">
              {tr("title (أو «الاسم»)، category (أو «القسم»)، price («السعر»)، stock («الكمية»)، color («اللون»)، size («المقاس»)، images («الصور» مفصولة بفاصلة)، description («الوصف»)، isActive (نعم/لا)، slug، skuBase، colorHex. صف لكل لون ومقاس، بنفس الاسم.", "title, category, price, stock, color, size, images (separated by commas), description, isActive (yes/no), slug, skuBase, colorHex. One row per colour and size, with the same title.")}
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
                { value: "create", label: tr("إنشاء فقط (Create-only)", "Create only") },
                { value: "upsertBySlug", label: tr("تحديث حسب slug (Upsert)", "Update by slug (upsert)") },
              ]}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={importCreateMissingCats} onChange={(e) => setImportCreateMissingCats(e.target.checked)} />
              {tr("إنشاء تصنيفات غير موجودة", "Create missing categories")}
            </label>
            <Select
              value={importDefaultCategoryId}
              onValueChange={(v: string) => setImportDefaultCategoryId(v)}
              options={[{ value: "", label: tr("القسم الافتراضي: بدون", "Default category: none") }, ...categories.map((c) => ({ value: c.id, label: tr(`القسم الافتراضي: ${c.name}`, "Default category: {0}", [c.name]) }))]}
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm opacity-80">{tr("عدد الصفوف:", "Rows:")} {importRows.length}</div>
            {importRows.length > 0 ? (
              <div className="mt-3 overflow-auto">
                <table className="min-w-[700px] text-sm">
  <thead className="sticky top-0 bg-zinc-950/80 backdrop-blur">
    <tr className="text-zinc-400">
      <th className="px-3 py-2 text-start">#</th>
      <th className="px-3 py-2 text-start">{tr("العنوان", "Title")}</th>
      <th className="px-3 py-2 text-start">slug</th>
      <th className="px-3 py-2 text-start">التصنيف</th>
      <th className="px-3 py-2 text-start">{tr("السعر", "Price")}</th>
      <th className="px-3 py-2 text-start">{tr("المخزون", "Stock")}</th>
      <th className="px-3 py-2 text-start">{tr("الحالة", "Status")}</th>
      <th className="px-3 py-2 text-start">{tr("ملاحظات", "Notes")}</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-white/5">
    {importRows.slice(0, 12).map((r, idx) => {
      const issues = importRowIssues[idx];
      const cat = r.categoryId || r.categorySlug || r.categoryName || (importDefaultCategoryId ? "(importDefaultCategoryId)" : "");
      const status =
        typeof r.isActive === "boolean" ? (r.isActive ? "Active" : "Draft") : tr("(غير محدد)", "(not set)");
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
              {tr("في", "There are")} {Object.keys(importRowIssues).length} {tr("صف/صفوف فيها أخطاء. لازم يتصحّح الـ CSV أو ينحط defaultCategoryId قبل الاستيراد.", "rows with errors. Fix the CSV or use defaultCategoryId before importing.")}
            </div>
          ) : null}
          
          {importReport ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-semibold">{tr("تقرير الاستيراد", "Import report")}</div>
                <Button variant="ghost" onClick={() => setImportReport(null)}>{tr("إخفاء", "Hide")}</Button>
              </div>
          
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-200">
                <div>{tr("الإجمالي:", "Total:")} <span className="font-semibold">{importReport.summary?.total}</span></div>
                <div>{tr("المود:", "Mode:")} <span className="font-mono text-xs">{importReport.summary?.mode}</span></div>
                <div>{tr("تم إنشاء:", "Created:")} <span className="font-semibold">{importReport.summary?.created}</span></div>
                <div>{tr("تم تحديث:", "Updated:")} <span className="font-semibold">{importReport.summary?.updated}</span></div>
                <div>{tr("فشل:", "Failed:")} <span className="font-semibold">{importReport.summary?.failed}</span></div>
              </div>
          
              {importReport.summary?.failed ? (
                <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-white/10">
                  <table className="min-w-[700px] text-sm">
                    <thead className="sticky top-0 bg-zinc-950/80 backdrop-blur">
                      <tr className="text-zinc-400">
                        <th className="px-3 py-2 text-start">#</th>
                        <th className="px-3 py-2 text-start">slug</th>
                        <th className="px-3 py-2 text-start">{tr("العنوان", "Title")}</th>
                        <th className="px-3 py-2 text-start">{tr("السبب", "Reason")}</th>
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
                <div className="mt-3 text-sm text-emerald-200">{tr("كل الصفوف نجحت ✅", "Every row worked ✅")}</div>
              )}
            </div>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title={tr("تأكيد الحذف", "Confirm delete")}
        message={tr("حذف هالمنتج أكيد؟", "Delete this product for sure?")}
        variant="danger"
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}


