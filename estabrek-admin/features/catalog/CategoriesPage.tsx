// src/features/catalog/CategoriesPage.tsx
import React, { useMemo, useState } from "react";
import { useCatalogActions, useCategories } from "../../hooks/useCatalog";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Spinner } from "../../components/ui/Spinner";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

type FieldErrors = {
  name?: string;
  slug?: string;
};

export default function CategoriesPage() {
  const q = useCategories();
  const actions = useCatalogActions();

  const categories = q.data ?? [];

  const byId = useMemo(() => {
    const m = new Map<string, any>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setParentId("");
    setErrors({});
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const c = byId.get(id);
    setEditingId(id);
    setName(c?.name ?? "");
    setSlug(c?.slug ?? "");
    setParentId(c?.parentId ?? "");
    setErrors({});
    setOpen(true);
  };

  const onSave = async () => {
    const body = {
      name: name.trim(),
      slug: slug.trim(),
      parentId: parentId ? parentId : null,
    };

    const nextErrors: FieldErrors = {};
    if (!body.name) nextErrors.name = "الاسم مطلوب";
    if (!body.slug) nextErrors.slug = "الـ slug مطلوب (بالإنجليزي)";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    try {
      if (editingId) {
        await actions.updateCategory.mutateAsync({ id: editingId, body });
      } else {
        await actions.createCategory.mutateAsync(body);
      }
      setOpen(false);
    } catch {
      // toast handled inside hook
    }
  };

  const onDelete = async () => {
    if (!confirmId) return;
    try {
      await actions.deleteCategory.mutateAsync(confirmId);
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">التصنيفات</div>
            <div className="mt-1 text-xs opacity-70">Categories</div>
          </div>
          <Button variant="primary" onClick={openCreate} className="w-full sm:w-auto">
            إضافة تصنيف
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {q.isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">جاري التحميل…</div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">فشل تحميل التصنيفات.</div>
        ) : (
                    <>
            <div className="space-y-3 sm:hidden">
              {categories.map((c) => (
                <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div dir="ltr" className="mt-1 text-xs opacity-70">{c.slug}</div>
                      <div className="mt-1 text-xs opacity-70">
                        {c.parentId ? byId.get(c.parentId)?.name ?? "-" : "-"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(c.id)}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => setConfirmId(c.id)}>
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
                    <TH>الاسم</TH>
                    <TH>Slug</TH>
                    <TH>الأب</TH>
                    <TH className="w-40">الإجراءات</TH>
                  </TR>
                </THead>
                <TBody>
                  {categories.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.name}</TD>
                      <TD dir="ltr" className="text-left opacity-80">
                        {c.slug}
                      </TD>
                      <TD className="opacity-80">{c.parentId ? byId.get(c.parentId)?.name ?? "-" : "-"}</TD>
                      <TD>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => openEdit(c.id)}>
                            تعديل
                          </Button>
                          <Button variant="danger" onClick={() => setConfirmId(c.id)}>
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
        )}
      </div>

      <Modal
        open={open}
        title={editingId ? "تعديل تصنيف" : "إضافة تصنيف"}
        onCancel={() => setOpen(false)}
        widthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={onSave}
              isLoading={actions.createCategory.isPending || actions.updateCategory.isPending}
            >
              حفظ
            </Button>
          </div>
        }
      >
        <div dir="rtl" className="space-y-4">
          <Input
            label="الاسم"
            value={name}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
              if (!editingId && !slug) setSlug(slugify(e.target.value));
            }}
          />

          <Input
            label="Slug (إنجليزي)"
            value={slug}
            error={errors.slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setErrors((prev) => ({ ...prev, slug: undefined }));
            }}
            placeholder="mens-shoes"
          />

          <Select
            label="الأب (اختياري)"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            placeholder="بدون"
            options={categories.map((x) => ({ value: x.id, label: x.name }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="تأكيد الحذف"
        message="هل أنت متأكد؟ قد يفشل الحذف إذا التصنيف مرتبط بمنتجات."
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}


