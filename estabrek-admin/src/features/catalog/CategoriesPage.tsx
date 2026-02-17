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
import { MediaUrlInput } from "../../components/media/MediaUrlInput";

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
  const [iconUrl, setIconUrl] = useState("");

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setParentId("");
    setIconUrl("");
    setErrors({});
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const c = byId.get(id);
    setEditingId(id);
    setName(c?.name ?? "");
    setSlug(c?.slug ?? "");
    setParentId(c?.parentId ?? "");
    setIconUrl(c?.iconUrl ?? "");
    setErrors({});
    setOpen(true);
  };

  const onSave = async () => {
    const body = {
      name: name.trim(),
      slug: slug.trim(),
      parentId: parentId ? parentId : null,
      iconUrl: iconUrl.trim() ? iconUrl.trim() : null,
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

  const childrenByParent = useMemo(() => {
    const m = new Map<string | null, any[]>();
    categories.forEach((c) => {
      const key = c.parentId ?? null;
      const arr = m.get(key) ?? [];
      arr.push(c);
      m.set(key, arr);
    });
    return m;
  }, [categories]);

  const treeList = useMemo(() => {
    const out: Array<{ cat: any; depth: number }> = [];
    const walk = (parent: string | null, depth: number) => {
      const list = (childrenByParent.get(parent) ?? []).slice();
      list.sort((a, b) => a.name.localeCompare(b.name));
      for (const c of list) {
        out.push({ cat: c, depth });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [childrenByParent]);

  const descendantsOf = useMemo(() => {
    const collect = (rootId: string) => {
      const out = new Set<string>();
      const stack = [rootId];
      while (stack.length) {
        const id = stack.pop()!;
        const kids = childrenByParent.get(id) ?? [];
        for (const k of kids) {
          if (out.has(k.id)) continue;
          out.add(k.id);
          stack.push(k.id);
        }
      }
      return out;
    };
    return collect;
  }, [childrenByParent]);

  const blockedIds = useMemo(() => {
    if (!editingId) return new Set<string>();
    const d = descendantsOf(editingId);
    d.add(editingId);
    return d;
  }, [descendantsOf, editingId]);

  const parentOptions = useMemo(
    () =>
      treeList
        .filter(({ cat }) => !blockedIds.has(cat.id))
        .map(({ cat, depth }) => ({
          value: cat.id,
          label: `${"—".repeat(depth)} ${cat.name}`,
        })),
    [blockedIds, treeList]
  );

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
              {treeList.map(({ cat: c, depth }) => (
                <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold" style={{ paddingRight: depth * 12 }}>
                        {c.iconUrl ? (
                          <img src={c.iconUrl} alt="" className="h-6 w-6 rounded-lg border border-white/10 object-cover" />
                        ) : null}
                        <span>{c.name}</span>
                      </div>
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
                    <TH>الأيقونة</TH>
                    <TH className="w-40">الإجراءات</TH>
                  </TR>
                </THead>
                <TBody>
                  {treeList.map(({ cat: c, depth }) => (
                    <TR key={c.id}>
                      <TD className="font-medium">
                        <div className="flex items-center gap-2" style={{ paddingRight: depth * 12 }}>
                          {c.iconUrl ? (
                            <img src={c.iconUrl} alt="" className="h-7 w-7 rounded-lg border border-white/10 object-cover" />
                          ) : null}
                          <span>{c.name}</span>
                        </div>
                      </TD>
                      <TD dir="ltr" className="text-left opacity-80">
                        {c.slug}
                      </TD>
                      <TD className="opacity-80">{c.parentId ? byId.get(c.parentId)?.name ?? "-" : "-"}</TD>
                      <TD className="opacity-80">
                        {c.iconUrl ? (
                          <span className="inline-flex items-center gap-2">
                            <img src={c.iconUrl} alt="" className="h-7 w-7 rounded-lg border border-white/10 object-cover" />
                            <span className="text-xs">تم</span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </TD>
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
            options={parentOptions}
          />

          <MediaUrlInput
            label="أيقونة التصنيف (اختياري)"
            value={iconUrl}
            onChange={setIconUrl}
            placeholder="https://... أو /uploads/..."
            showPreview
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


