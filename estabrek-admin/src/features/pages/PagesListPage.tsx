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
    <div dir="rtl" className="space-y-6">
      {/* Header Card */}
      <div className="relative rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] via-white/[0.015] to-transparent p-6 overflow-hidden">
        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">الصفحات</h1>
              <p className="mt-0.5 text-sm text-white/50">إدارة صفحات الموقع</p>
            </div>
          </div>
          <Button variant="accent" onClick={openCreate} className="w-full sm:w-auto">
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            إضافة صفحة
          </Button>
        </div>
      </div>

      {/* Content Card */}
      <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent overflow-hidden">
        {q.isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Spinner className="w-8 h-8" />
            <p className="text-sm text-white/50">جاري التحميل...</p>
          </div>
        ) : q.isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-red-400">فشل تحميل الصفحات</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div className="text-center">
              <h3 className="text-base font-medium text-white/70">لا توجد صفحات</h3>
              <p className="mt-1 text-sm text-white/40">ابدأ بإنشاء صفحتك الأولى</p>
            </div>
            <Button variant="accent" onClick={openCreate} className="mt-2">
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              إضافة صفحة
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="space-y-3 p-4 sm:hidden stagger-children">
              {pages.map((p, index) => (
                <div 
                  key={p.id} 
                  className="section-card p-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">{p.name}</div>
                      <div dir="ltr" className="mt-1 text-xs text-white/50 font-mono">/{p.slug}</div>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
                      p.status === 'PUBLISHED' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-white/5 text-white/60 border border-white/10'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'PUBLISHED' ? 'bg-emerald-400' : 'bg-white/40'}`}></span>
                      {p.status === 'PUBLISHED' ? 'منشور' : 'مسودة'}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(p.id)}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="accent" className="flex-1" onClick={() => (window.location.href = `/admin/pages/${p.id}`)}>
                      تحرير
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => (window.location.href = `/admin/pages/${p.id}/preview`)}>
                      معاينة
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => setConfirmId(p.id)}>
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block">
              <Table>
                <THead>
                  <TR>
                    <TH>الاسم</TH>
                    <TH>Slug</TH>
                    <TH>الحالة</TH>
                    <TH className="w-60">الإجراءات</TH>
                  </TR>
                </THead>
                <TBody>
                  {pages.map((p) => (
                    <TR key={p.id} className="group transition-colors hover:bg-white/[0.02]">
                      <TD className="font-medium">{p.name}</TD>
                      <TD dir="ltr" className="text-left font-mono text-white/60">
                        /{p.slug}
                      </TD>
                      <TD>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          p.status === 'PUBLISHED' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-white/5 text-white/60 border border-white/10'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'PUBLISHED' ? 'bg-emerald-400' : 'bg-white/40'}`}></span>
                          {p.status === 'PUBLISHED' ? 'منشور' : 'مسودة'}
                        </span>
                      </TD>
                      <TD>
                        <div className="flex gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(p.id)}>
                            تعديل
                          </Button>
                          <Button size="sm" variant="accent" onClick={() => (window.location.href = `/admin/pages/${p.id}`)}>
                            تحرير الصفحة
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => (window.location.href = `/admin/pages/${p.id}/preview`)}>
                            معاينة
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setConfirmId(p.id)}>
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

      {/* Create/Edit Modal */}
      <Modal
        open={open}
        title={editingId ? "تعديل صفحة" : "إضافة صفحة جديدة"}
        description={editingId ? "قم بتعديل معلومات الصفحة" : "أنشئ صفحة جديدة لموقعك"}
        onCancel={() => setOpen(false)}
        widthClassName="max-w-lg"
        footer={
          <Button
            variant="accent"
            onClick={onSave}
            isLoading={actions.createPage.isPending || actions.updatePage.isPending}
          >
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            حفظ
          </Button>
        }
      >
        <div dir="rtl" className="space-y-5">
          <Input
            label="الاسم"
            value={name}
            error={errors.name}
            placeholder="مثال: الصفحة الرئيسية"
            onChange={(e) => {
              setName(e.target.value);
              setErrors((p) => ({ ...p, name: undefined }));
              if (!editingId && !slug) setSlug(slugify(e.target.value));
            }}
          />

          <Input
            label="Slug (بالإنجليزية)"
            value={slug}
            error={errors.slug}
            placeholder="home"
            hint="سيظهر في رابط الصفحة: /pages/home"
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setErrors((p) => ({ ...p, slug: undefined }));
            }}
          />

          {!editingId && (
            <Select
              label="قالب البداية"
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
        message="هل أنت متأكد من حذف هذه الصفحة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={onDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
