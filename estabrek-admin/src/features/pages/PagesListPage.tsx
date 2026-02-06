// src/features/pages/PagesListPage.tsx
import React, { useMemo, useState } from "react";
import { usePages, usePagesActions } from "../../hooks/usePages";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Spinner } from "../../components/ui/Spinner";
import { PAGE_TEMPLATES } from "./pageTemplates";

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

export default function PagesListPage() {
  const q = usePages();
  const actions = usePagesActions();

  const pages = q.data ?? [];

  const byId = useMemo(() => {
    const m = new Map<string, any>();
    pages.forEach((p) => m.set(p.id, p));
    return m;
  }, [pages]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<"blank" | "landing" | "about" | "shop">("blank");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setErrors({});
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const p = byId.get(id);
    setEditingId(id);
    setName(p?.name ?? "");
    setSlug(p?.slug ?? "");
    setErrors({});
    setOpen(true);
  };

  
  async function applyPageTemplate(pageId: string, tplId: "blank" | "landing" | "about" | "shop") {
    const tpl = PAGE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl || !tpl.sections.length) return;
    // create sections in order
    for (const s of tpl.sections) {
      await actions.createSection.mutateAsync({
        pageId,
        body: { type: s.type, data: s.data ?? {}, isVisible: s.isVisible ?? true },
      });
    }
  }

const onSave = async () => {
    const body = { name: name.trim(), slug: slug.trim() };

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
        await actions.updatePage.mutateAsync({ id: editingId, body });
      } else {
        const created = await actions.createPage.mutateAsync(body);
        if (templateId && templateId !== "blank") {
          await applyPageTemplate(created.id, templateId);
        }
      }
      setOpen(false);
    } catch {
      // toast handled inside hook
    }
  };

  const onDelete = async () => {
    if (!confirmId) return;
    try {
      await actions.deletePage.mutateAsync(confirmId);
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">الصفحات</div>
            <div className="mt-1 text-xs opacity-70">CMS Pages</div>
          </div>
          <Button variant="primary" onClick={openCreate} className="w-full sm:w-auto">
            إضافة صفحة
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
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">فشل تحميل الصفحات.</div>
        ) : (
                    <>
            <div className="space-y-3 sm:hidden">
              {pages.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div dir="ltr" className="mt-1 text-xs opacity-70">{p.slug}</div>
                    </div>
                    <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px]">{p.status}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(p.id)}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="primary" className="flex-1" onClick={() => (window.location.href = `/admin/pages/${p.id}`)}>
                      تحرير
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => (window.location.href = `/admin/pages/${p.id}/preview`)}>
                      Preview
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
                    <TH>الاسم</TH>
                    <TH>Slug</TH>
                    <TH>Status</TH>
                    <TH className="w-40">الإجراءات</TH>
                  </TR>
                </THead>
                <TBody>
                  {pages.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-medium">{p.name}</TD>
                      <TD dir="ltr" className="text-left opacity-80">
                        {p.slug}
                      </TD>
                      <TD>
                        <span className="rounded-lg bg-white/10 px-2 py-1 text-[11px]">{p.status}</span>
                      </TD>
                      <TD>
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => openEdit(p.id)}>
                            تعديل
                          </Button>
                          <Button variant="primary" onClick={() => (window.location.href = `/admin/pages/${p.id}`)}>
                            تحرير الصفحة
                          </Button>
                          <Button variant="ghost" onClick={() => (window.location.href = `/admin/pages/${p.id}/preview`)}>
                            Preview
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
        )}
      </div>

      <Modal
        open={open}
        title={editingId ? "تعديل صفحة" : "إضافة صفحة"}
        onCancel={() => setOpen(false)}
        widthClassName="max-w-lg"
        footer={
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={onSave}
              isLoading={actions.createPage.isPending || actions.updatePage.isPending}
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
              setErrors((p) => ({ ...p, name: undefined }));
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
            placeholder="home"
          />

          {!editingId && (
            <Select
              label="Template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value as any)}
              options={PAGE_TEMPLATES.map((t) => ({
                value: t.id,
                label: `${t.label} — ${t.description}`,
              }))}
            />
          )}

        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="تأكيد الحذف"
        message="هل أنت متأكد؟"
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}


