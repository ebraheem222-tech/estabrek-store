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
import { TranslationsPanel } from "../../components/TranslationsPanel";
import { useSettings } from "../../hooks/useSettings";
import { tidyTranslations, translationLangs, translationsOf, type Translations } from "../../lib/translations";

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
  // The name in the shop's other languages (الإعدادات → لغات المتجر).
  const [translations, setTranslations] = useState<Translations>({});
  const { main, others } = translationLangs(useSettings().data?.header);

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setParentId("");
    setIconUrl("");
    setTranslations({});
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
    setTranslations(translationsOf(c?.translations));
    setErrors({});
    setOpen(true);
  };

  const onSave = async () => {
    const body = {
      name: name.trim(),
      slug: slug.trim(),
      parentId: parentId ? parentId : null,
      iconUrl: iconUrl.trim() ? iconUrl.trim() : null,
      ...(others.length ? { translations: tidyTranslations(translations) } : {}),
    };

    const nextErrors: FieldErrors = {};
    if (!body.name) nextErrors.name = tr("الاسم مطلوب", "The name is required");
    if (!body.slug) nextErrors.slug = tr("الـ slug مطلوب (بالإنجليزي)", "The slug is required (in English)");

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
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">{tr("التصنيفات", "Categories")}</div>
            <div className="mt-1 text-xs opacity-70">Categories</div>
          </div>
          <Button variant="primary" onClick={openCreate} className="w-full sm:w-auto">
            {tr("إضافة تصنيف", "Add category")}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {q.isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">{tr("جاري التحميل…", "Loading…")}</div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">{tr("فشل تحميل التصنيفات.", "The categories couldn't load.")}</div>
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
                      {tr("تعديل", "Edit")}
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => setConfirmId(c.id)}>
                      {tr("حذف", "Delete")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <Table>
                <THead>
                  <TR>
                    <TH>{tr("الاسم", "Name")}</TH>
                    <TH>Slug</TH>
                    <TH>{tr("الأب", "Parent")}</TH>
                    <TH>{tr("الأيقونة", "Icon")}</TH>
                    <TH className="w-40">{tr("الإجراءات", "Actions")}</TH>
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
                            <span className="text-xs">{tr("تم", "Done")}</span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </TD>
                      <TD>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => openEdit(c.id)}>
                            {tr("تعديل", "Edit")}
                          </Button>
                          <Button variant="danger" onClick={() => setConfirmId(c.id)}>
                            {tr("حذف", "Delete")}
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
        title={editingId ? tr("تعديل تصنيف", "Edit category") : tr("إضافة تصنيف", "Add category")}
        onCancel={() => setOpen(false)}
        widthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={onSave}
              isLoading={actions.createCategory.isPending || actions.updateCategory.isPending}
            >
              {tr("حفظ", "Save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={tr("الاسم", "Name")}
            value={name}
            error={errors.name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
              if (!editingId && !slug) setSlug(slugify(e.target.value));
            }}
          />

          <Input
            label={tr("Slug (إنجليزي)", "Slug (English)")}
            value={slug}
            error={errors.slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setErrors((prev) => ({ ...prev, slug: undefined }));
            }}
            placeholder="mens-shoes"
          />

          <Select
            label={tr("الأب (اختياري)", "Parent (optional)")}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            placeholder={tr("بدون", "None")}
            options={parentOptions}
          />

          <MediaUrlInput
            label={tr("أيقونة التصنيف (اختياري)", "Category icon (optional)")}
            value={iconUrl}
            onChange={setIconUrl}
            placeholder={tr("https://... أو /uploads/...", "https://... or /uploads/...")}
            showPreview
          />

          <TranslationsPanel
            langs={others}
            main={main}
            rows={[{ path: ["name"], label: tr("اسم القسم", "Category name"), base: name, max: 120 }]}
            value={translations}
            onChange={setTranslations}
            context={tr("اسم قسم بالمتجر (قصير)", "A store category name (short)")}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title={tr("تأكيد الحذف", "Confirm delete")}
        message={tr("الحذف أكيد؟ ممكن ما يزبط إذا القسم مرتبط بمنتجات.", "Delete for sure? It may fail if the category has products.")}
        confirmText={tr("حذف", "Delete")}
        cancelText={tr("إلغاء", "Cancel")}
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}



import { tr } from "@/lib/words";