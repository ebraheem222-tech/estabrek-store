// src/features/pages/PageEditorPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePageDetails, usePagesActions } from "../../hooks/usePages";
import { useSettings } from "../../hooks/useSettings";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { aiImproveSeo, aiSuggestSections, aiTranslatePage, moveSection as moveSectionApi, type PageSection, type PageSectionType, type PageStatus } from "../../api/pages.api";
import { SectionEditor, defaultDataForType, templatesForType } from "./SectionEditor";
import { ComponentsEditor, createDefaultComponent } from "./ComponentsEditor";
import { ThemePreview } from "../../components/ThemePreview";
import { toast } from "../../lib/toast";
import type { CmsComponentKind } from "../../cms/types";

const LazySectionStylingPanel = React.lazy(() =>
  import("./SectionStylingPanel").then((m) => ({ default: m.SectionStylingPanel }))
);
const LazySectionPreview = React.lazy(() =>
  import("./SectionPreview").then((m) => ({ default: m.SectionPreview }))
);

const STATUSES: Array<{ value: PageStatus; label: string }> = [
  { value: "DRAFT", label: "مسودة" },
  { value: "PUBLISHED", label: "منشور" },
  { value: "ARCHIVED", label: "مؤرشف" },
];

const SECTION_TYPES: Array<{ value: PageSectionType; label: string }> = [
  { value: "HERO", label: "HERO" },
  { value: "RICH_TEXT", label: "RICH_TEXT" },
  { value: "CUSTOM_HTML", label: "CUSTOM_HTML" },
  { value: "GRID", label: "GRID" },
  { value: "FEATURES", label: "FEATURES (مزايا)" },
  { value: "STATS", label: "STATS (أرقام)" },
  { value: "TEAM", label: "TEAM (الفريق)" },
  { value: "PRICING", label: "PRICING (الأسعار)" },
  { value: "CONTACT", label: "CONTACT (تواصل)" },
  { value: "BANNER", label: "BANNER" },
  { value: "FEATURED_CATEGORIES", label: "التصنيفات المميزة (عناوين)" },
  { value: "COLLECTIONS_GRID", label: "شبكة المجموعات (Grid)" },
  { value: "NEW_ARRIVALS_SLIDER", label: "وصل حديثًا (سلايدر منتجات)" },
  { value: "BEST_SELLERS_SLIDER", label: "الأكثر مبيعًا (سلايدر منتجات)" },
  { value: "BRANDS_SLIDER", label: "Brands (سلايدر شعارات)" },
  { value: "FEATURED_PRODUCTS", label: "FEATURED_PRODUCTS" },
  { value: "NEWSLETTER", label: "NEWSLETTER" },
  { value: "IMAGE_GALLERY", label: "IMAGE_GALLERY" },
  { value: "FAQ", label: "FAQ" },
  { value: "TESTIMONIALS", label: "TESTIMONIALS" },
  { value: "CTA", label: "CTA" },
  { value: "CARDS", label: "CARDS (Flex Cards)" },
  { value: "VIDEO", label: "VIDEO" },
];

const COMPONENT_KIND_OPTIONS: Array<{ value: CmsComponentKind; label: string }> = [
  { value: "text", label: "Text" },
  { value: "button", label: "Button" },
  { value: "card", label: "Card" },
  { value: "container", label: "Container" },
  { value: "stack", label: "Stack" },
  { value: "row", label: "Row" },
  { value: "grid", label: "Grid" },
  { value: "columns", label: "Columns" },
  { value: "checkbox", label: "Checkbox" },
  { value: "input", label: "Input" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
  { value: "badge", label: "Badge" },
  { value: "list", label: "List" },
  { value: "image", label: "Image" },
  { value: "icon", label: "Icon" },
  { value: "svg", label: "SVG Shape" },
  { value: "divider", label: "Divider" },
  { value: "spacer", label: "Spacer" },
  { value: "nav_menu", label: "Navigation Menu" },
  { value: "data", label: "Data" },
  { value: "productGrid", label: "E-commerce: Product Grid" },
  { value: "productSlider", label: "E-commerce: Product Slider" },
  { value: "categoryTiles", label: "E-commerce: Category Tiles" },
  { value: "filtersBar", label: "E-commerce: Filters Bar" },
];



function SortableSectionCard({
  section,
  onEdit,
  onDelete,
  onToggleVisible,
  previewData,
  theme,
}: {
  section: PageSection;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
  previewData?: any;
  theme?: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sectionTypeLabel = section.data?.__mode === "components" ? "COMPONENTS" : section.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "group relative rounded-xl p-5 transition-all duration-300 ease-smooth",
        "bg-gradient-to-br from-white/[0.03] via-white/[0.015] to-transparent",
        "border border-white/[0.06] hover:border-white/[0.1]",
        isDragging 
          ? "ring-2 ring-accent-500/40 border-accent-500/30 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.4),0_0_30px_-10px_rgba(139,92,246,0.2)]" 
          : "hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]",
      ].join(" ")}
    >
      {/* Top highlight line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Drag Handle */}
          <button
            type="button"
            className="mt-1 flex-shrink-0 w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.04] cursor-grab active:cursor-grabbing transition-all"
            title="اسحب للترتيب"
            {...attributes}
            {...listeners}
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.5" />
              <circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="11" cy="13" r="1.5" />
            </svg>
          </button>
          
          <div className="flex-1 min-w-0">
            {/* Section Header */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type icon badge */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-accent-500/10 border border-accent-500/20">
                <svg className="w-3.5 h-3.5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <span className="text-xs font-medium text-accent-300">{sectionTypeLabel}</span>
              </div>
              
              {/* Order badge */}
              <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/60 font-mono">
                #{section.order ?? 0}
              </span>
              
              {/* Visibility badge */}
              {section.isVisible ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  ظاهر
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  مخفي
                </span>
              )}
            </div>
            
            {/* Preview */}
            <div className="mt-3">
              <div className="rounded-xl overflow-hidden bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px]">
                <ThemePreview theme={theme} className="rounded-xl p-2">
                  <React.Suspense fallback={<div className="p-6 text-xs text-white/40 text-center">جاري التحميل...</div>}>
                    <LazySectionPreview type={section.type} data={previewData ?? section.data} />
                  </React.Suspense>
                </ThemePreview>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={onToggleVisible}
            title={section.isVisible ? "إخفاء" : "إظهار"}
            className="text-white/50 hover:text-white"
          >
            {section.isVisible ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={onEdit}
            title="تعديل"
            className="text-white/50 hover:text-accent-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={onDelete}
            title="حذف"
            className="text-white/50 hover:text-red-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

type PageFieldErrors = {
  name?: string;
  slug?: string;
};

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 7,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm opacity-80">{label}</div>
      <textarea
        dir={dir}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/20"
      />
    </label>
  );
}



type SectionFieldErrors = {
  data?: string;
  fields?: Record<string, string | undefined>;
};

function normalizeSlug(v: string) {
  const t = (v ?? "").trim();
  if (!t) return "";
  return t.startsWith("/") ? t : `/${t}`;
}

export default function PageEditorPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();

  const q = usePageDetails(id ?? null);
  const qSettings = useSettings();
  const actions = usePagesActions();

  const page: any = q.data;
  const theme = (qSettings.data as any)?.header?.theme ?? null;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("/");
  const [status, setStatus] = useState<PageStatus>("DRAFT");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [headScripts, setHeadScripts] = useState("");
  const [bodyScripts, setBodyScripts] = useState("");
  const [pageErrors, setPageErrors] = useState<PageFieldErrors>({});

  // Phase 2: AI helper
  const [aiLocale, setAiLocale] = useState<"ar" | "he" | "en">("ar");
  const [aiBusy, setAiBusy] = useState<null | "sections" | "seo" | "translate-he" | "translate-en">(null);
  const [contentLocale, setContentLocale] = useState<"ar" | "he" | "en">("ar");

  const normalizeScripts = (v: any) => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };

  const i18nMeta = useMemo(() => {
    try {
      const meta = headScripts.trim() ? JSON.parse(headScripts) : {};
      return meta?.__i18n ?? null;
    } catch {
      return null;
    }
  }, [headScripts]);

  const translatedSections = useMemo(() => {
    if (!i18nMeta || contentLocale === "ar") return null;
    const arr = (i18nMeta?.sections as any)?.[contentLocale];
    return Array.isArray(arr) ? arr : null;
  }, [i18nMeta, contentLocale]);

  const getTranslatedSectionData = (section: PageSection, index: number) => {
    if (!translatedSections || contentLocale === "ar") return section.data;
    const translated = translatedSections[index];
    if (!translated || (translated.type && translated.type !== section.type)) return section.data;
    const base = section.data ?? {};
    const tData = translated.data ?? {};
    const merged: any = { ...base, ...tData };
    if (base.ui && !tData.ui) merged.ui = base.ui;
    if (base.components && !Array.isArray(tData.components)) merged.components = base.components;
    return merged;
  };

  useEffect(() => {
    if (!page) return;
    setName(page.name ?? "");
    setSlug(page.slug ?? "/");
    setStatus(page.status ?? "DRAFT");
    setCanonicalUrl(page.canonicalUrl ?? "");
    setCustomCss(page.customCss ?? "");
    setHeadScripts(normalizeScripts(page.headScripts));
    setBodyScripts(normalizeScripts(page.bodyScripts));
    setPageErrors({});
  }, [page]);

  const isDirty = useMemo(() => {
    if (!page) return false;
    const normalized = normalizeSlug(slug);
    return (
      (name ?? "").trim() !== String(page.name ?? "") ||
      normalized !== String(page.slug ?? "") ||
      status !== (page.status ?? "DRAFT") ||
      (canonicalUrl ?? "") !== String(page.canonicalUrl ?? "") ||
      (customCss ?? "") !== String(page.customCss ?? "") ||
      (headScripts ?? "") !== normalizeScripts(page.headScripts) ||
      (bodyScripts ?? "") !== normalizeScripts(page.bodyScripts)
    );
  }, [page, name, slug, status, canonicalUrl, customCss, headScripts, bodyScripts]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const sections = useMemo(() => {
    const raw: any[] = Array.isArray((page as any)?.sections) ? ((page as any).sections as any[]) : [];
    const filtered = raw.filter(
      (s): s is PageSection =>
        !!s && (typeof (s as any).id === "string" || typeof (s as any).id === "number")
    );

    // Avoid dnd-kit crashes on duplicated / missing ids
    const seen = new Set<string | number>();
    const unique = filtered.filter((s) => {
      if (seen.has(s.id)) {
        console.warn("Duplicate section id detected; skipping", s);
        return false;
      }
      seen.add(s.id);
      return true;
    });

    unique.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    if (unique.length !== raw.length) {
      console.warn(
        "CMS: sections normalized (some invalid sections skipped). Raw:",
        raw,
        "Safe:",
        unique
      );
    }
    return unique;
  }, [page]);

  const [localSections, setLocalSections] = useState<PageSection[]>([]);
  useEffect(() => {
    setLocalSections(sections as any);
  }, [sections]);

  const qc = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persistOrder = async (next: PageSection[]) => {
    if (!id) return;
    try {
      await Promise.all(
        next.map((s, idx) =>
          moveSectionApi(s.id, { order: idx })
        )
      );
      await qc.invalidateQueries({ queryKey: ["pages", id] });
    } catch (e: any) {
      toast.error("فشل حفظ ترتيب الـ Sections");
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = localSections.findIndex((s) => s.id === active.id);
    const newIndex = localSections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(localSections, oldIndex, newIndex);
    const normalized = moved.map((s, idx) => ({ ...s, order: idx }));
    setLocalSections(normalized);
    void persistOrder(normalized);
  };

  // create/edit section modal
  const [openSection, setOpenSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionType, setSectionType] = useState<PageSectionType>("RICH_TEXT");
  const [sectionVisible, setSectionVisible] = useState(true);
  const [sectionDataObj, setSectionDataObj] = useState<any>({});
  const [sectionTemplateId, setSectionTemplateId] = useState<string>("__blank__");
  const [advancedJson, setAdvancedJson] = useState(false);
  const [sectionDataRaw, setSectionDataRaw] = useState<string>("{}");
  const [sectionErrors, setSectionErrors] = useState<SectionFieldErrors>({});
  const [componentsOnlyMode, setComponentsOnlyMode] = useState(false);
  const [componentsSectionKind, setComponentsSectionKind] = useState<CmsComponentKind>("text");

  const previewState = useMemo(() => {
    if (!advancedJson) return { data: sectionDataObj ?? {}, error: null as string | null };
    try {
      const parsed = sectionDataRaw?.trim() ? JSON.parse(sectionDataRaw) : {};
      return { data: parsed ?? {}, error: null as string | null };
    } catch {
      return { data: null as any, error: "JSON غير صالح للمعاينة" };
    }
  }, [advancedJson, sectionDataObj, sectionDataRaw]);

  const modalPreviewData = useMemo(() => {
    if (!translatedSections || contentLocale === "ar") return previewState.data;
    if (!editingSectionId) return previewState.data;
    const idx = localSections.findIndex((s) => s.id === editingSectionId);
    if (idx < 0) return previewState.data;
    const section = { ...localSections[idx], type: sectionType, data: previewState.data } as PageSection;
    return getTranslatedSectionData(section, idx);
  }, [translatedSections, contentLocale, previewState.data, editingSectionId, localSections, sectionType]);

  const [confirmDeleteSectionId, setConfirmDeleteSectionId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewBump, setPreviewBump] = useState(0);
  const previewUrl = useMemo(() => {
    const pageId = page?.id ?? id ?? "";
    if (!pageId) return "";
    const cache = previewBump ? `?b=${previewBump}` : "";
    return `/admin/pages/${pageId}/preview${cache}`;
  }, [page?.id, id, previewBump]);

  const openCreateSection = () => {
    setEditingSectionId(null);
    setComponentsOnlyMode(false);
    setSectionType("RICH_TEXT");
    setSectionVisible(true);
    const d = defaultDataForType("RICH_TEXT");
    setSectionDataObj(d);
    setSectionDataRaw(JSON.stringify(d ?? {}, null, 2));
    setSectionTemplateId("__blank__");
    setAdvancedJson(false);
    setSectionErrors({});
    setOpenSection(true);
  };

  const openCreateComponentsSection = (initialKind?: CmsComponentKind) => {
    setEditingSectionId(null);
    setComponentsOnlyMode(true);
    setSectionType("RICH_TEXT");
    setSectionVisible(true);
    const kind = initialKind ?? componentsSectionKind;
    const base = createDefaultComponent(kind);
    const first =
      kind === "text"
        ? { ...base, props: { ...(base.props ?? {}), text: "مكوّن جديد" } }
        : base;
    const d = {
      ...defaultDataForType("RICH_TEXT"),
      html: "",
      __mode: "components",
      components: [first],
    };
    setSectionDataObj(d);
    setSectionDataRaw(JSON.stringify(d ?? {}, null, 2));
    setSectionTemplateId("components_only");
    setAdvancedJson(false);
    setSectionErrors({});
    setOpenSection(true);
  };

  const openEditSection = (s: any) => {
    setEditingSectionId(s.id);
    setSectionType(s.type);
    setSectionVisible(Boolean(s.isVisible ?? true));
    const d = s.data ?? {};
    setComponentsOnlyMode(d?.__mode === "components");
    setSectionDataObj(d);
    setSectionDataRaw(JSON.stringify(d ?? {}, null, 2));
    setSectionTemplateId("__custom__");
    setAdvancedJson(false);
    setSectionErrors({});
    setOpenSection(true);
  };

  const templates = useMemo(() => templatesForType(sectionType), [sectionType]);

  const applyTemplate = (templateId: string) => {
    if (templateId === "__blank__") {
      const d = defaultDataForType(sectionType);
      setSectionDataObj(d);
      setSectionDataRaw(JSON.stringify(d ?? {}, null, 2));
      setSectionErrors({});
      return;
    }
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setSectionDataObj(t.data ?? {});
    setSectionDataRaw(JSON.stringify(t.data ?? {}, null, 2));
    setSectionErrors({});
  };

  const preview = useMemo(() => {
    if (!advancedJson) return { data: sectionDataObj ?? {}, error: null as string | null };
    try {
      const parsed = sectionDataRaw?.trim() ? JSON.parse(sectionDataRaw) : {};
      return { data: parsed ?? {}, error: null as string | null };
    } catch {
      return { data: null as any, error: "JSON غير صالح للمعاينة" };
    }
  }, [advancedJson, sectionDataObj, sectionDataRaw]);

  const validateSection = (type: PageSectionType, data: any) => {
    const fields: Record<string, string | undefined> = {};

    if (type === "HERO") {
      if (!String(data?.title ?? "").trim()) fields.title = "العنوان مطلوب";
      const ov = data?.overlay;
      if (ov !== undefined && ov !== null) {
        const n = Number(ov);
        if (!Number.isFinite(n) || n < 0 || n > 1) fields.overlay = "Overlay لازم يكون بين 0 و 1";
      }
    }

    if (type === "RICH_TEXT") {
      const hasComponents = Array.isArray(data?.components) && data.components.length > 0;
      if (!String(data?.html ?? "").trim() && !hasComponents) fields.html = "المحتوى مطلوب";
    }

    if (type === "FAQ") {
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) fields.items = "لازم تضيف سؤال واحد على الأقل";
    }

    if (type === "GRID") {
      const mode = data?.mode ?? "grid";
      if (mode !== "container") {
        const cols = data?.columns;
        if (cols !== undefined && cols !== null) {
          const n = Number(cols);
          if (!Number.isFinite(n) || n < 2 || n > 4) fields.columns = "الأعمدة لازم تكون بين 2 و 4";
        }
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!items.length) fields.items = "لازم تضيف عنصر واحد على الأقل";
      } else {
        const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
        if (!blocks.length) fields.items = "لازم تضيف Section واحد على الأقل داخل الـContainer";
      }
    }

    if (type === "FEATURES") {
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) fields.items = "لازم تضيف ميزة واحدة على الأقل";
    }

    if (type === "STATS") {
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) fields.items = "لازم تضيف رقم واحد على الأقل";
    }

    if (type === "TEAM") {
      const members = Array.isArray(data?.members) ? data.members : [];
      if (!members.length) fields.items = "لازم تضيف عضو واحد على الأقل";
    }

    if (type === "PRICING") {
      const plans = Array.isArray(data?.plans) ? data.plans : [];
      if (!plans.length) fields.items = "لازم تضيف خطة واحدة على الأقل";
    }

    if (type === "CONTACT") {
      const items = Array.isArray(data?.items) ? data.items : [];
      const form = data?.form;
      const fieldsList = Array.isArray(form?.fields) ? form.fields : [];
      const hasForm =
        !!form &&
        (fieldsList.length > 0 ||
          String(form?.title ?? "").trim() ||
          String(form?.subtitle ?? "").trim() ||
          String(form?.submitLabel ?? "").trim() ||
          String(form?.action ?? "").trim());
      const hasComponents = Array.isArray(data?.components) && data.components.length > 0;
      if (!items.length && !hasForm && !String(data?.mapEmbedUrl ?? "").trim() && !hasComponents) {
        fields.items = "لازم تضيف وسيلة تواصل أو نموذج أو خريطة";
      }
    }

    if (type === "FEATURED_CATEGORIES") {
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) fields.items = "لازم تحدد تصنيف واحد على الأقل";
    }

    if (type === "COLLECTIONS_GRID") {
      const cols = data?.columns;
      if (cols !== undefined && cols !== null) {
        const n = Number(cols);
        if (!Number.isFinite(n) || n < 2 || n > 6) fields.columns = "الأعمدة لازم تكون بين 2 و 6";
      }
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) fields.items = "لازم تضيف مجموعة واحدة على الأقل";
    }

    if (type === "CUSTOM_HTML") {
      const hasComponents = Array.isArray(data?.components) && data.components.length > 0;
      if (!String(data?.html ?? "").trim() && !hasComponents) fields.html = "HTML مطلوب";
    }

    if (type === "BANNER") {
      if (!String(data?.text ?? "").trim()) fields.text = "النص مطلوب";
    }

    if (type === "CTA") {
      if (!String(data?.title ?? "").trim()) fields.title = "العنوان مطلوب";
      const btn = data?.primaryButton;
      if (btn && (String(btn?.label ?? "").trim() || String(btn?.href ?? "").trim())) {
        if (!String(btn?.label ?? "").trim()) fields.primaryButton = "زر CTA: label مطلوب";
        if (!String(btn?.href ?? "").trim()) fields.primaryButton = "زر CTA: href مطلوب";
      }
    }

    if (type === "TESTIMONIALS") {
      const items = Array.isArray(data?.items) ? data.items : [];
      if (!items.length) fields.items = "لازم تضيف testimonial واحد على الأقل";
    }

    if (type === "FEATURED_PRODUCTS") {
      const ids = Array.isArray(data?.productIds) ? data.productIds : [];
      if (!ids.length) fields.productIds = "لازم تحدد منتج واحد على الأقل";
    }

    if (type === "VIDEO") {
      if (!String(data?.url ?? "").trim()) fields.url = "رابط الفيديو مطلوب";
    }

    if (type === "IMAGE_GALLERY") {
      const cols = data?.columns;
      if (cols !== undefined && cols !== null) {
        const n = Number(cols);
        if (!Number.isFinite(n) || n < 2 || n > 6) fields.columns = "الأعمدة لازم تكون بين 2 و 6";
      }
      const images = Array.isArray(data?.images) ? data.images : [];
      if (!images.length) fields.images = "لازم تضيف صورة واحدة على الأقل";
    }

    const has = Object.values(fields).some(Boolean);
    return { ok: !has, fields };
  };

  const savePage = async () => {
    if (!id) return;

    const normalized = normalizeSlug(slug);
    const nextErrors: PageFieldErrors = {};
    if (!name.trim()) nextErrors.name = "اسم الصفحة مطلوب";
    if (!normalized) nextErrors.slug = "slug مطلوب";

    if (Object.keys(nextErrors).length) {
      setPageErrors(nextErrors);
      return;
    }

    setPageErrors({});

    const canonical = canonicalUrl.trim();
    const css = customCss.trim();
    const head = headScripts.trim();
    const body = bodyScripts.trim();

    try {
      await actions.updatePage.mutateAsync({
        id,
        body: {
          name: name.trim(),
          slug: normalized,
          status,
          // Backend expects strings (not null); send empty string when unset.
          canonicalUrl: canonical,
          customCss: css,
          headScripts: head,
          bodyScripts: body,
        },
      });
    } catch {
      // toast handled inside hook
    }
  };

  const setPageStatus = async (nextStatus: PageStatus) => {
    if (!id) return;
    try {
      await actions.updatePage.mutateAsync({ id, body: { status: nextStatus } });
    } catch {
      // toast handled inside hook
    }
  };

  const publishNow = async () => {
    if (!id) return;
    try {
      await actions.updatePage.mutateAsync({ id, body: { status: "PUBLISHED" } });
      setStatus("PUBLISHED");
    } catch {
      // toast handled in hook
    }
  };

  const unpublishNow = async () => {
    if (!id) return;
    try {
      await actions.updatePage.mutateAsync({ id, body: { status: "DRAFT" } });
      setStatus("DRAFT");
    } catch {
      // toast handled in hook
    }
  };

  // -----------------------------
  // Phase 2: AI helper actions
  // -----------------------------
  const runAiSuggestSections = async () => {
    if (!page || !id) return;
    try {
      setAiBusy("sections");
      const res = await aiSuggestSections({
        pageName: String(name ?? page.name ?? "").trim() || "Page",
        pageSlug: normalizeSlug(slug),
        locale: aiLocale,
        brandName: "Estabrek",
        storeCategory: "ملابس / شالات / البسة شرعية",
      });

      // Append suggested sections to the end (keep existing)
      const startOrder = (page.sections?.length ? Math.max(...page.sections.map((s: any) => Number(s.order ?? 0))) : 0) + 1;
      let order = startOrder;
      for (const sec of res.sections ?? []) {
        await actions.createSection.mutateAsync({
          pageId: id,
          body: { type: sec.type as any, data: sec.data ?? {}, order: order++, isVisible: sec.isVisible ?? true },
        });
      }
      toast.success(`تم إضافة ${res.sections?.length ?? 0} Sections (AI: ${res.source})`);
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "فشل تشغيل AI");
    } finally {
      setAiBusy(null);
    }
  };

  const runAiImproveSeo = async () => {
    if (!page || !id) return;
    try {
      setAiBusy("seo");
      const res = await aiImproveSeo({
        pageName: String(name ?? page.name ?? "").trim() || "Page",
        pageSlug: normalizeSlug(slug),
        locale: aiLocale,
        currentTitle: "",
        currentDescription: "",
        brandName: "Estabrek",
        storeCategory: "ملابس / شالات / البسة شرعية",
      });
      await actions.updatePage.mutateAsync({ id, body: { seoTitle: res.seoTitle, seoDescription: res.seoDescription } as any });
      toast.success(`تم تحديث SEO (AI: ${res.source})`);
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "فشل تحسين SEO");
    } finally {
      setAiBusy(null);
    }
  };

  const runAiTranslate = async (to: "he" | "en") => {
    if (!page || !id) return;
    try {
      setAiBusy(to === "he" ? "translate-he" : "translate-en");
      const res = await aiTranslatePage({
        from: "ar",
        to,
        fields: { name, seoTitle: (page as any).seoTitle ?? "", seoDescription: (page as any).seoDescription ?? "" },
        sections: (page.sections ?? []).map((s: any) => ({ type: s.type, data: s.data })),
      });
      // We keep translations as JSON inside headScripts for now (safe place without DB changes)
      const meta = (() => {
        try {
          return headScripts.trim() ? JSON.parse(headScripts) : {};
        } catch {
          return {};
        }
      })();
      meta.__i18n = meta.__i18n ?? { he: {}, en: {}, sections: {} };
      meta.__i18n[to] = res.fields;
      meta.__i18n.sections[to] = res.sections;
      setHeadScripts(JSON.stringify(meta, null, 2));
      toast.success(`تم توليد ترجمة ${to === "he" ? "عبرية" : "إنجليزية"} (AI: ${res.source})`);
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "فشل الترجمة");
    } finally {
      setAiBusy(null);
    }
  };

  const saveSection = async () => {
    if (!id) return;

    setSectionErrors({});

    // If advanced JSON is open, try to parse and sync it into object.
    let dataJson: any = sectionDataObj ?? {};
    if (advancedJson) {
      try {
        dataJson = sectionDataRaw?.trim() ? JSON.parse(sectionDataRaw) : {};
      } catch {
        setSectionErrors({ data: "Section data: JSON غير صالح" });
        return;
      }
    }

    const v = validateSection(sectionType, dataJson);
    if (!v.ok) {
      setSectionErrors({ fields: v.fields });
      return;
    }

    try {
      if (editingSectionId) {
        const current = sections.find((x: any) => x.id === editingSectionId);
        await actions.updateSection.mutateAsync({
          pageId: id,
          sectionId: editingSectionId,
          body: {
            type: sectionType,
            data: dataJson,
            isVisible: sectionVisible,
            order: current?.order ?? 0,
          },
        });
      } else {
        const nextOrder = sections.length ? (sections[sections.length - 1].order ?? sections.length - 1) + 1 : 0;
        await actions.createSection.mutateAsync({
          pageId: id,
          body: { type: sectionType, data: dataJson, isVisible: sectionVisible, order: nextOrder },
        });
      }
      setOpenSection(false);
    } catch {
      // toast handled inside hook
    }
  };

  const moveSection = async (sectionId: string, direction: "UP" | "DOWN") => {
    if (!id) return;
    const idx = sections.findIndex((x: any) => x.id === sectionId);
    const swapWith = direction === "UP" ? idx - 1 : idx + 1;
    if (idx < 0 || swapWith < 0 || swapWith >= sections.length) return;

    const cur = sections[idx];
    const other = sections[swapWith];

    const curOrder = cur.order ?? idx;
    const otherOrder = other.order ?? swapWith;

    try {
      await actions.moveSection.mutateAsync({ pageId: id, sectionId: cur.id, order: otherOrder });
      await actions.moveSection.mutateAsync({ pageId: id, sectionId: other.id, order: curOrder });
    } catch {
      // toast handled inside hook
    }
  };

  const deleteSection = async () => {
    if (!id || !confirmDeleteSectionId) return;
    await actions.deleteSection.mutateAsync({ pageId: id, sectionId: confirmDeleteSectionId });
    setConfirmDeleteSectionId(null);
  };

  if (q.isLoading) {
    return (
      <div dir="rtl" className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2">
          <Spinner />
          <div className="text-sm opacity-80">جاري التحميل…</div>
        </div>
      </div>
    );
  }

  if (q.isError || !page) {
    return (
      <div dir="rtl" className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
        فشل تحميل الصفحة.
        <div className="mt-4">
          <Button variant="ghost" onClick={() => nav("/admin/pages")}>رجوع</Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold flex items-center gap-2">
              تحرير الصفحة
              {isDirty ? <span className="rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] text-amber-100">غير محفوظ</span> : null}
            </div>
            <div className="mt-1 text-xs opacity-70">
              ID: <span className="opacity-100">{page.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => nav("/admin/pages")}>رجوع</Button>
            <Button variant="ghost" onClick={() => nav(`/admin/pages/${page.id}/preview`)}>Preview</Button>
            <Button variant={showPreview ? "ghost" : "secondary"} onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "إخفاء المعاينة المباشرة" : "معاينة مباشرة"}
            </Button>
            <Button variant="secondary" onClick={openCreateSection}>إضافة Section</Button>
            <select
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm sm:w-auto"
              value={componentsSectionKind}
              onChange={(e) => setComponentsSectionKind(e.target.value as CmsComponentKind)}
              title="نوع Component لقسم Components"
            >
              {COMPONENT_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={openCreateComponentsSection}>إضافة Components</Button>

            <select
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm sm:w-auto"
              value={aiLocale}
              onChange={(e) => setAiLocale(e.target.value as any)}
              title="لغة AI (للمحتوى والـ SEO)"
            >
              <option value="ar">عربي (AR)</option>
              <option value="he">عبري (HE)</option>
              <option value="en">English (EN)</option>
            </select>

            <select
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm sm:w-auto"
              value={contentLocale}
              onChange={(e) => setContentLocale(e.target.value as any)}
              title="لغة المعاينة للمحتوى"
            >
              <option value="ar">العربية (AR)</option>
              <option value="he">עברית (HE)</option>
              <option value="en">English (EN)</option>
            </select>

            <Button
              variant="ghost"
              onClick={runAiSuggestSections}
              disabled={!!aiBusy}
            >
              ✨ AI أقسام
            </Button>
            <Button
              variant="ghost"
              onClick={runAiImproveSeo}
              disabled={!!aiBusy}
            >
              ✨ AI SEO
            </Button>
            <Button
              variant="ghost"
              onClick={() => runAiTranslate("he")}
              disabled={!!aiBusy}
            >
              ✨ ترجمة HE
            </Button>
            <Button
              variant="ghost"
              onClick={() => runAiTranslate("en")}
              disabled={!!aiBusy}
            >
              ✨ ترجمة EN
            </Button>
            {page.status !== "PUBLISHED" ? (
              <Button variant="secondary" onClick={() => setPageStatus("PUBLISHED")}>نشر</Button>
            ) : (
              <Button variant="ghost" onClick={() => setPageStatus("DRAFT")}>إلغاء النشر</Button>
            )}
            <Button variant="primary" onClick={savePage} isLoading={actions.updatePage.isPending}>حفظ الصفحة</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="اسم الصفحة"
            value={name}
            error={pageErrors.name}
            onChange={(e) => {
              setName(e.target.value);
              setPageErrors((p) => ({ ...p, name: undefined }));
            }}
          />
          <Input
            label="Slug"
            value={slug}
            error={pageErrors.slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setPageErrors((p) => ({ ...p, slug: undefined }));
            }}
            placeholder="/about"
          />
          <Select
            label="الحالة"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            options={STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 text-lg font-semibold">SEO + كود مخصص</div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Canonical URL (اختياري)"
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            placeholder="https://example.com/about"
            dir="ltr"
          />
          <div className="text-xs opacity-70 leading-6">
            استخدمها إذا بدك تثبّت الرابط الرسمي للصفحة (SEO) وخاصة إذا عندك نفس المحتوى بأكتر من URL.
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <TextArea
              label="Custom CSS (فقط لهذه الصفحة)"
              value={customCss}
              onChange={setCustomCss}
              placeholder="/* example */\n.hero { border-radius: 24px; }"
              rows={10}
              dir="ltr"
            />
            <div className="mt-2 text-[11px] opacity-60">الـ CSS ينحفظ بالـ DB. الـ Preview بالأدمن بيطبّقه داخل المعاينة فقط.</div>
          </div>
          <div className="lg:col-span-1">
            <TextArea
              label="Head scripts (HTML)"
              value={headScripts}
              onChange={setHeadScripts}
              placeholder={`<!-- example -->\n<script async src=\"https://...\"></script>`}
              rows={10}
              dir="ltr"
            />
            <div className="mt-2 text-[11px] opacity-60">ملاحظة: الأدمن ما بيشغّل السكربتات. بس بنحفظهم ليشتغلوا بالـ storefront.</div>
          </div>
          <div className="lg:col-span-1">
            <TextArea
              label="Body scripts (HTML)"
              value={bodyScripts}
              onChange={setBodyScripts}
              placeholder={`<!-- example -->\n<script>console.log('hello');</script>`}
              rows={10}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Sections</div>
          <div className="text-xs opacity-70">{sections.length} sections</div>
        </div>

        <div className="space-y-3">
          {localSections.length ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={localSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {localSections.map((s, idx) => (
                    <SortableSectionCard
                      key={s.id}
                      section={s}
                      previewData={getTranslatedSectionData(s, idx)}
                      theme={theme}
                      onEdit={() => openEditSection(s)}
                      onDelete={() => setConfirmDeleteSectionId(s.id)}
                      onToggleVisible={() => {
                        if (!id) return;
                        actions.updateSection.mutateAsync({ pageId: id, sectionId: s.id, body: { isVisible: !s.isVisible } }).catch(() => {});
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-sm opacity-70">لا يوجد Sections.</div>
          )}
        </div>
      </div>

      {/* Section modal */}
      <Modal
        open={openSection}
        title={
          componentsOnlyMode
            ? (editingSectionId ? "تعديل Components" : "إضافة Components")
            : (editingSectionId ? "تعديل Section" : "إضافة Section")
        }
        onCancel={() => setOpenSection(false)}
        widthClassName="w-[94vw] max-w-[1900px] max-h-[95vh]"
        footer={
          <div className="flex gap-2">
            <Button variant="primary" onClick={saveSection} isLoading={actions.createSection.isPending || actions.updateSection.isPending}>
              حفظ
            </Button>
          </div>
        }
      >
        <div dir="rtl" className="space-y-4">
          {!componentsOnlyMode ? (
            <>
              <Select
                label="Type"
                value={sectionType}
                onChange={(e) => {
                  const t = e.target.value as any;
                  setComponentsOnlyMode(false);
                  setSectionType(t);
                  const d = defaultDataForType(t);
                  setSectionDataObj(d);
                  setSectionDataRaw(JSON.stringify(d ?? {}, null, 2));
                  setSectionTemplateId("__blank__");
                  setSectionErrors({});
                }}
                options={SECTION_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />

              {templates.length ? (
                <div className="grid gap-3 sm:grid-cols-3 items-end">
                  <Select
                    label="Template"
                    value={sectionTemplateId}
                    onChange={(e) => setSectionTemplateId(e.target.value)}
                    options={[
                      { value: "__blank__", label: "فارغ" },
                      ...(editingSectionId ? [{ value: "__custom__", label: "المحتوى الحالي" }] : []),
                      ...templates.map((t) => ({ value: t.id, label: t.label })),
                    ]}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      applyTemplate(sectionTemplateId);
                      setAdvancedJson(false);
                    }}
                  >
                    تطبيق Template
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSectionTemplateId("__blank__");
                      applyTemplate("__blank__");
                      setAdvancedJson(false);
                    }}
                  >
                    تفريغ
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="flex items-center gap-2">
            <input type="checkbox" checked={sectionVisible} onChange={(e) => setSectionVisible(e.target.checked)} />
            <span className="text-sm">Visible</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="text-sm opacity-80">Editor Mode</div>
            <div className="flex items-center gap-2">
              <span className={"text-xs " + (!advancedJson ? "opacity-100" : "opacity-60")}>Form</span>
              <button
                type="button"
                className={
                  "relative h-6 w-11 rounded-full border transition-all " +
                  (advancedJson ? "bg-white/20 border-white/20" : "bg-white/10 border-white/10")
                }
                onClick={() => {
                  const next = !advancedJson;
                  setAdvancedJson(next);
                  // keep raw in sync
                  const raw = JSON.stringify(sectionDataObj ?? {}, null, 2);
                  setSectionDataRaw(raw);
                  setSectionErrors({});
                }}
              >
                <span
                  className={
                    "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white transition-all " +
                    (advancedJson ? "left-1" : "right-1")
                  }
                />
              </button>
              <span className={"text-xs " + (advancedJson ? "opacity-100" : "opacity-60")}>Advanced JSON</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="min-w-0">
              {!advancedJson ? (
                <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                  {!componentsOnlyMode ? (
                    <SectionEditor
                      type={sectionType}
                      value={sectionDataObj}
                      errors={sectionErrors.fields}
                      onChange={(v) => {
                        setSectionDataObj(v);
                        setSectionDataRaw(JSON.stringify(v ?? {}, null, 2));
                        setSectionErrors({});
                        setSectionTemplateId("__custom__");
                      }}
                    />
                  ) : (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <div className="text-sm font-semibold mb-3">تنسيق القسم المتقدم</div>
                      <React.Suspense fallback={<div className="text-sm text-white/60">Loading styling…</div>}>
                        <LazySectionStylingPanel
                          tokens={sectionDataObj?.twTokens ?? {}}
                          onChange={(next) => {
                            const v = { ...(sectionDataObj ?? {}), twTokens: next };
                            setSectionDataObj(v);
                            setSectionDataRaw(JSON.stringify(v ?? {}, null, 2));
                            setSectionErrors({});
                            setSectionTemplateId("__custom__");
                          }}
                        />
                      </React.Suspense>
                    </div>
                  )}

                  <div className="mt-4">
                    <ComponentsEditor
                      value={sectionDataObj}
                      onChange={(v) => {
                        setSectionDataObj(v);
                        setSectionDataRaw(JSON.stringify(v ?? {}, null, 2));
                        setSectionErrors({});
                        setSectionTemplateId("__custom__");
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-medium">data (JSON)</label>
                  <textarea
                    className={
                      "min-h-[220px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
                      (sectionErrors.data ? "border-red-400/40 focus:border-red-300/50" : "border-white/10 focus:border-white/20")
                    }
                    value={sectionDataRaw}
                    onChange={(e) => {
                      setSectionDataRaw(e.target.value);
                      setSectionErrors((p) => ({ ...p, data: undefined }));
                      setSectionTemplateId("__custom__");
                    }}
                    dir="ltr"
                  />
                  {sectionErrors.data ? <div className="mt-2 text-xs text-red-200">{sectionErrors.data}</div> : null}
                </div>
              )}
            </div>

            <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 md:sticky md:top-6 md:self-start md:max-h-[calc(100vh-220px)] md:overflow-auto">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">Preview</div>
                <div className="text-xs opacity-60">{componentsOnlyMode ? "COMPONENTS" : sectionType}</div>
              </div>
              {previewState.error ? (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-100">
                  {previewState.error}
                </div>
              ) : (
                <div className="space-y-3">
                  <ThemePreview theme={theme} className="rounded-2xl p-2">
                    <React.Suspense fallback={<div className="p-6 text-xs text-white/50">Loading preview…</div>}>
                      <LazySectionPreview type={sectionType} data={modalPreviewData} />
                    </React.Suspense>
                  </ThemePreview>

                  {Array.isArray((modalPreviewData as any)?.components) && (modalPreviewData as any).components.length ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <div className="mb-2 text-sm font-semibold">Components preview (editor-only)</div>
                      <div className="space-y-2">
                        {(modalPreviewData as any).components.slice(0, 10).map((c: any, i: number) => (
                          <div key={c?.id ?? i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                            <div className="text-[11px] opacity-70">{i + 1}. {c?.kind}{c?.name ? ` · ${c.name}` : ""}</div>
                            {c?.kind === "text" ? <div className="mt-1 text-sm">{c?.props?.text ?? ""}</div> : null}
                            {c?.kind === "button" ? (
                              <div className="mt-1 inline-flex items-center rounded-xl border border-white/15 px-3 py-1 text-xs">
                                {c?.props?.label ?? "Button"} <span className="ms-2 opacity-60">{c?.props?.href ?? ""}</span>
                              </div>
                            ) : null}
                            {c?.tw?.className ? <div className="mt-1 text-[11px] opacity-60">TW: {c.tw.className}</div> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteSectionId}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا الـSection؟"
        confirmText="حذف"
        cancelText="إلغاء"
        onConfirm={deleteSection}
        onCancel={() => setConfirmDeleteSectionId(null)}
      />
      {showPreview && previewUrl ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="text-sm font-semibold">Live Preview</div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setPreviewBump((x) => x + 1)}>تحديث</Button>
              <a className="text-xs opacity-80 hover:opacity-100 underline" href={previewUrl} target="_blank" rel="noreferrer">فتح في تبويب</a>
            </div>
          </div>
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <iframe title="preview" src={previewUrl} className="h-[70vh] w-full" />
          </div>
        </div>
      ) : null}

    </div>
  );
}









