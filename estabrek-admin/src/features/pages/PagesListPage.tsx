// src/features/pages/PagesListPage.tsx
import React, { useMemo, useState, useCallback, useRef } from "react";
import { usePages, usePagesActions } from "../../hooks/usePages";
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

// 3D Floating Elements
const FloatingCube = ({ className = "" }: { className?: string }) => (
  <div className={`absolute pointer-events-none opacity-30 ${className}`}>
    <div className="floating-cube" />
  </div>
);

const FloatingSphere = ({ className = "" }: { className?: string }) => (
  <div className={`absolute pointer-events-none opacity-20 ${className}`}>
    <div className="floating-sphere" />
  </div>
);

const FloatingRing = ({ className = "" }: { className?: string }) => (
  <div className={`absolute pointer-events-none opacity-25 ${className}`}>
    <div className="floating-ring" />
  </div>
);

// 3D Page Card Component
const PageCard = ({ 
  page, 
  index,
  onEdit, 
  onEditPage, 
  onPreview, 
  onDelete 
}: { 
  page: any;
  index: number;
  onEdit: () => void;
  onEditPage: () => void;
  onPreview: () => void;
  onDelete: () => void;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    const spotlightX = (x / rect.width) * 100;
    const spotlightY = (y / rect.height) * 100;
    
    cardRef.current.style.setProperty('--rotate-x', `${rotateX}deg`);
    cardRef.current.style.setProperty('--rotate-y', `${rotateY}deg`);
    cardRef.current.style.setProperty('--spotlight-x', `${spotlightX}%`);
    cardRef.current.style.setProperty('--spotlight-y', `${spotlightY}%`);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--rotate-x', '0deg');
    cardRef.current.style.setProperty('--rotate-y', '0deg');
  }, []);

  return (
    <div
      ref={cardRef}
      className="page-card glass-premium rounded-2xl overflow-hidden opacity-0 animate-fade-in-up"
      style={{ 
        animationDelay: `${index * 80}ms`,
        animationFillMode: 'forwards'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card Header with gradient */}
      <div className="relative px-5 py-4 border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-r from-accent-500/5 via-transparent to-accent-500/5" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{page.name}</h3>
              <p dir="ltr" className="mt-0.5 text-xs text-white/40 font-mono truncate">/{page.slug}</p>
            </div>
          </div>
          <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
            page.status === 'PUBLISHED' 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/10' 
              : 'bg-white/[0.06] text-white/50 border border-white/10'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${page.status === 'PUBLISHED' ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
            {page.status === 'PUBLISHED' ? 'منشور' : 'مسودة'}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>آخر تحديث: {new Date(page.updatedAt || Date.now()).toLocaleDateString('ar-EG')}</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="px-5 py-3 bg-black/20 border-t border-white/[0.04]">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" className="flex-1 btn-shine" onClick={onEdit}>
            <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            تعديل
          </Button>
          <Button size="sm" variant="accent" className="flex-1 btn-shine" onClick={onEditPage}>
            <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
            </svg>
            تحرير
          </Button>
          <Button size="sm" variant="ghost" onClick={onPreview}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = ({ onCreateClick }: { onCreateClick: () => void }) => (
  <div className="relative flex flex-col items-center justify-center py-20 gap-6">
    {/* 3D Background Elements */}
    <FloatingCube className="top-8 left-1/4 transform -translate-x-1/2" />
    <FloatingSphere className="top-12 right-1/4" />
    <FloatingRing className="bottom-8 left-1/3" />
    
    <div className="relative">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] flex items-center justify-center animate-float-sphere">
        <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      </div>
      {/* Orbiting dot */}
      <div className="absolute inset-0 animate-orbit">
        <div className="w-2 h-2 rounded-full bg-accent-500/60" />
      </div>
    </div>
    
    <div className="text-center space-y-2">
      <h3 className="text-lg font-semibold text-white/80">لا توجد صفحات بعد</h3>
      <p className="text-sm text-white/40 max-w-xs">ابدأ بإنشاء صفحتك الأولى لبناء موقعك</p>
    </div>
    
    <Button variant="accent" onClick={onCreateClick} className="btn-shine">
      <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      إنشاء أول صفحة
    </Button>
  </div>
);

// Loading State Component
const LoadingState = () => (
  <div className="relative flex flex-col items-center justify-center py-20 gap-4">
    <div className="relative">
      <Spinner className="w-10 h-10" />
      {/* Orbiting elements */}
      <div className="absolute inset-[-20px] animate-orbit" style={{ animationDuration: '3s' }}>
        <div className="w-2 h-2 rounded-full bg-accent-500/40" />
      </div>
      <div className="absolute inset-[-30px] animate-orbit" style={{ animationDuration: '5s', animationDirection: 'reverse' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-accent-400/30" />
      </div>
    </div>
    <p className="text-sm text-white/50">جاري تحميل الصفحات...</p>
  </div>
);

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

  // Stats
  const publishedCount = pages.filter(p => p.status === 'PUBLISHED').length;
  const draftCount = pages.filter(p => p.status !== 'PUBLISHED').length;

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
    <div dir="rtl" className="space-y-6 perspective-container">
      {/* Header Card with 3D Elements */}
      <div className="relative rounded-2xl border border-white/[0.06] glass-premium p-6 overflow-hidden">
        {/* 3D Background decorations */}
        <FloatingCube className="top-[-20px] right-[-20px] opacity-20" />
        <FloatingSphere className="bottom-[-30px] left-[10%] opacity-15" />
        
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-gradient-to-b from-accent-500/10 to-transparent blur-3xl pointer-events-none" />
        
        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-500/30 to-transparent" />
        
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent-500/25 flex items-center justify-center shadow-lg shadow-accent-500/10 animate-pulse-glow-3d">
              <svg className="w-7 h-7 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient-premium">الصفحات</h1>
              <p className="mt-0.5 text-sm text-white/50">إدارة صفحات الموقع</p>
            </div>
          </div>
          
          {/* Stats Row */}
          {pages.length > 0 && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-white/40">الإجمالي:</span>
                <span className="font-semibold text-white">{pages.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-white/40">منشور:</span>
                <span className="font-semibold text-emerald-400">{publishedCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/40" />
                <span className="text-white/40">مسودة:</span>
                <span className="font-semibold text-white/60">{draftCount}</span>
              </div>
            </div>
          )}
          
          <Button variant="accent" onClick={openCreate} className="w-full sm:w-auto btn-shine">
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            إضافة صفحة
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent overflow-hidden min-h-[300px]">
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm text-red-400">فشل تحميل الصفحات</p>
            <Button variant="ghost" size="sm" onClick={() => q.refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : pages.length === 0 ? (
          <EmptyState onCreateClick={openCreate} />
        ) : (
          /* Page Cards Grid */
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {pages.map((p, index) => (
                <PageCard
                  key={p.id}
                  page={p}
                  index={index}
                  onEdit={() => openEdit(p.id)}
                  onEditPage={() => (window.location.href = `/admin/pages/${p.id}`)}
                  onPreview={() => (window.location.href = `/admin/pages/${p.id}/preview`)}
                  onDelete={() => setConfirmId(p.id)}
                />
              ))}
            </div>
          </div>
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
            className="btn-shine"
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
