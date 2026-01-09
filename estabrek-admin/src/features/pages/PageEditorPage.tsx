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
import {
  aiImproveSeo,
  aiSuggestSections,
  aiTranslatePage,
  createSection as createSectionApi,
  deleteSection as deleteSectionApi,
  moveSection as moveSectionApi,
  updateSection as updateSectionApi,
  type PageSection,
  type PageSectionType,
  type PageStatus,
} from "../../api/pages.api";
import { SectionEditor, defaultDataForType, templatesForType } from "./SectionEditor";
import { ComponentsEditor, createDefaultComponent } from "./ComponentsEditor";
import { PageRenderer } from "./PageRenderer";
import { ResponsiveTokensPanel } from "./ResponsiveTokensPanel";
import { ThemePreview } from "../../components/ThemePreview";
import { toast } from "../../lib/toast";
import { scopeCss } from "../../lib/scopeCss";
import { PAGE_TEMPLATES } from "./pageTemplates";
import type { CmsComponentKind } from "../../cms/types";

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
  index = 0,
  onSelect,
  isSelected,
}: {
  section: PageSection;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
  previewData?: any;
  theme?: any;
  index?: number;
  onSelect?: () => void;
  isSelected?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const cardRef = React.useRef<HTMLDivElement>(null);
  
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 3D tilt effect on mouse move
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!cardRef.current || isDragging) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 30;
    const rotateY = (centerX - x) / 30;
    const spotlightX = (x / rect.width) * 100;
    const spotlightY = (y / rect.height) * 100;
    
    cardRef.current.style.setProperty('--rotate-x', `${rotateX}deg`);
    cardRef.current.style.setProperty('--rotate-y', `${rotateY}deg`);
    cardRef.current.style.setProperty('--spotlight-x', `${spotlightX}%`);
    cardRef.current.style.setProperty('--spotlight-y', `${spotlightY}%`);
  }, [isDragging]);

  const handleMouseLeave = React.useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--rotate-x', '0deg');
    cardRef.current.style.setProperty('--rotate-y', '0deg');
  }, []);

  // Section type icon mapping
  const sectionTypeIcon = React.useMemo(() => {
    const type = section.data?.__mode === "components" ? "COMPONENTS" : section.type;
    switch(type) {
      case 'HERO': return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
      case 'RICH_TEXT': return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      );
      case 'GRID': return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
      case 'FEATURES': return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      );
      case 'COMPONENTS': return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    }
  }, [section.type, section.data]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`section-card-${section.id}`}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          if (isDragging) return;
          onSelect?.();
        }}
        className={[
          "section-card-3d p-5 opacity-0 animate-fade-in-up",
          isSelected ? "ring-2 ring-accent-500/50 border-accent-500/40 shadow-glow" : "",
          isDragging ? "ring-2 ring-accent-500/50 border-accent-500/30 shadow-2xl shadow-accent-500/20" : "",
        ].join(" ")}
        style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Drag Handle */}
            <button
              type="button"
              className="mt-1 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] text-white/50 hover:text-white hover:border-white/[0.15] hover:from-white/[0.08] hover:to-white/[0.04] transition-all cursor-grab active:cursor-grabbing"
              title="اسحب للترتيب"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              </svg>
            </button>
            
            {/* Section Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {/* Section Type Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-500/10 border border-accent-500/20 text-accent-400">
                  {sectionTypeIcon}
                  <span className="text-xs font-medium">
                    {section.data?.__mode === "components" ? "COMPONENTS" : section.type}
                  </span>
                </div>
                
                {/* Order Badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/60">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  {section.order ?? 0}
                </span>
                
                {/* Visibility Badge */}
                {section.isVisible ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    ظاهر
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    مخفي
                  </span>
                )}
              </div>
              
              {/* Preview Container */}
              <div className="mt-4 rounded-xl overflow-hidden border border-white/[0.06] bg-black/20">
                <ThemePreview theme={theme} className="rounded-xl">
                  <React.Suspense 
                    fallback={
                      <div className="p-8 text-center">
                        <div className="inline-flex items-center gap-2 text-xs text-white/40">
                          <Spinner className="w-4 h-4" />
                          جاري تحميل المعاينة...
                        </div>
                      </div>
                    }
                  >
                    <LazySectionPreview type={section.type} data={previewData ?? section.data} />
                  </React.Suspense>
                </ThemePreview>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button 
              variant={section.isVisible ? "ghost" : "secondary"} 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onToggleVisible(); }}
              className="btn-shine"
              title={section.isVisible ? "إخفاء القسم" : "إظهار القسم"}
            >
              {section.isVisible ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="btn-shine">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
            <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type PageFieldErrors = {
  name?: string;
  slug?: string;
};

type InlineEditPayload = {
  sectionId: string;
  path: Array<string | number>;
  value: string;
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

function setDeepValue(target: any, path: Array<string | number>, value: any): any {
  if (!path.length) return value;
  const [head, ...rest] = path;
  const forceArray = typeof head === "number";
  const isArray = Array.isArray(target) || forceArray;
  const clone = isArray
    ? [...(Array.isArray(target) ? target : [])]
    : { ...(target && typeof target === "object" ? target : {}) };
  const current = isArray ? (clone as any)[head] : (clone as any)[head];
  const nextValue = rest.length ? setDeepValue(current, rest, value) : value;
  (clone as any)[head] = nextValue;
  return clone;
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
  const [inlineEditing, setInlineEditing] = useState(true);
  const [canvasView, setCanvasView] = useState<"live" | "preview">("live");
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [templateId, setTemplateId] = useState<(typeof PAGE_TEMPLATES)[number]["id"]>("landing");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [confirmTemplateReplace, setConfirmTemplateReplace] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showAdvancedStyling, setShowAdvancedStyling] = useState(false);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [showInlineStyling, setShowInlineStyling] = useState(true);

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

  const inlineEditingAvailable = contentLocale === "ar";
  useEffect(() => {
    if (!inlineEditingAvailable) {
      setInlineEditing(false);
    }
  }, [inlineEditingAvailable]);

  const previewWidthClass = useMemo(() => {
    if (previewMode === "mobile") return "max-w-[360px]";
    if (previewMode === "tablet") return "max-w-[440px]";
    return "max-w-none";
  }, [previewMode]);

  const canvasDir = contentLocale === "en" ? "ltr" : "rtl";

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

  const selectedTemplate = useMemo(
    () => PAGE_TEMPLATES.find((tpl) => tpl.id === templateId) ?? PAGE_TEMPLATES[0],
    [templateId]
  );

  const canvasSections = useMemo(() => {
    if (!translatedSections || contentLocale === "ar") return localSections;
    return localSections.map((sec, idx) => {
      const data = getTranslatedSectionData(sec, idx);
      return data === sec.data ? sec : { ...sec, data };
    });
  }, [localSections, translatedSections, contentLocale]);

  const selectedSection = useMemo(() => {
    if (!selectedSectionId) return null;
    return localSections.find((s) => String(s.id) === String(selectedSectionId)) ?? null;
  }, [localSections, selectedSectionId]);

  useEffect(() => {
    if (selectedSectionId) {
      setShowInlineStyling(true);
    } else {
      setShowInlineStyling(false);
      setShowAdvancedStyling(false);
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (selectedSectionId && !selectedSection) {
      setSelectedSectionId(null);
      setShowAdvancedStyling(false);
    }
  }, [selectedSectionId, selectedSection]);

  useEffect(() => {
    if (!selectedSectionId) return;
    const el = document.getElementById(`section-card-${selectedSectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedSectionId]);

  const selectedSectionIndex = useMemo(() => {
    if (!selectedSectionId) return -1;
    return localSections.findIndex((s) => String(s.id) === String(selectedSectionId));
  }, [localSections, selectedSectionId]);

  const selectedSectionPreviewData = useMemo(() => {
    if (!selectedSection) return null;
    if (selectedSectionIndex < 0) return selectedSection.data ?? null;
    return getTranslatedSectionData(selectedSection, selectedSectionIndex);
  }, [selectedSection, selectedSectionIndex, translatedSections, contentLocale]);

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

  useEffect(() => {
    if (openSection) {
      setShowAdvancedStyling(false);
    }
  }, [openSection]);

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
    setSelectedSectionId(String(s.id));
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

  const applyPageTemplate = async (mode: "append" | "replace") => {
    if (!id) return;
    const template = selectedTemplate;
    if (!template) return;
    setTemplateBusy(true);
    try {
      if (mode === "replace" && localSections.length) {
        await Promise.all(localSections.map((s) => deleteSectionApi(s.id)));
      }

      const sectionsToCreate = template.sections ?? [];
      if (!sectionsToCreate.length) {
        if (mode === "append") {
          toast.info("القالب لا يحتوي على أقسام.");
        } else {
          toast.success("تم تطبيق القالب.");
        }
        await qc.invalidateQueries({ queryKey: ["pages", id] });
        return;
      }

      const offset =
        mode === "append"
          ? localSections.reduce((max, s) => Math.max(max, s.order ?? 0), -1) + 1
          : 0;
      for (const [idx, s] of sectionsToCreate.entries()) {
        await createSectionApi(id, {
          type: s.type,
          data: s.data ?? {},
          isVisible: s.isVisible ?? true,
          order: offset + idx,
        });
      }
      await qc.invalidateQueries({ queryKey: ["pages", id] });
      toast.success("تم تطبيق القالب.");
    } catch {
      toast.error("تعذر تطبيق القالب.");
    } finally {
      setTemplateBusy(false);
      setConfirmTemplateReplace(false);
    }
  };

  const persistSectionData = async (sectionId: string, nextData: any, errorMessage?: string) => {
    setLocalSections((prev) =>
      prev.map((s) => (String(s.id) === String(sectionId) ? { ...s, data: nextData } : s))
    );
    if (id) {
      qc.setQueryData(["pages", id], (prev: any) => {
        if (!prev || !Array.isArray(prev.sections)) return prev;
        const nextSections = prev.sections.map((s: any) =>
          String(s.id) === String(sectionId) ? { ...s, data: nextData } : s
        );
        return { ...prev, sections: nextSections };
      });
    }

    if (editingSectionId && String(editingSectionId) === String(sectionId)) {
      setSectionDataObj(nextData);
      setSectionDataRaw(JSON.stringify(nextData ?? {}, null, 2));
    }

    try {
      await updateSectionApi(sectionId, { data: nextData });
    } catch {
      if (errorMessage) toast.error(errorMessage);
    }
  };

  const handleInlineEdit = async ({ sectionId, path, value }: InlineEditPayload) => {
    if (!id || !inlineEditingAvailable) return;
    const idx = localSections.findIndex((s) => String(s.id) === String(sectionId));
    if (idx < 0) return;
    const section = localSections[idx];
    const nextData = setDeepValue(section.data ?? {}, path, value);
    await persistSectionData(section.id, nextData, "???? ??? ???????.");
  };

  const handleSelectSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setShowInlineStyling(true);
  };

  const handleSelectedTokensChange = (nextTokens: any) => {
    if (!selectedSection) return;
    const nextData = { ...(selectedSection.data ?? {}), twTokens: nextTokens };
    void persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
  };

  const persistSectionVisibility = async (sectionId: string, isVisible: boolean) => {
    setLocalSections((prev) =>
      prev.map((s) => (String(s.id) === String(sectionId) ? { ...s, isVisible } : s))
    );
    if (id) {
      qc.setQueryData(["pages", id], (prev: any) => {
        if (!prev || !Array.isArray(prev.sections)) return prev;
        const nextSections = prev.sections.map((s: any) =>
          String(s.id) === String(sectionId) ? { ...s, isVisible } : s
        );
        return { ...prev, sections: nextSections };
      });
    }
    try {
      await updateSectionApi(sectionId, { isVisible });
    } catch {
      toast.error("???? ????? ??? ??????");
    }
  };

  const toggleSelectedVisibility = async () => {
    if (!selectedSection) return;
    setSelectionBusy(true);
    try {
      await persistSectionVisibility(selectedSection.id, !selectedSection.isVisible);
    } finally {
      setSelectionBusy(false);
    }
  };

  const duplicateSelectedSection = async () => {
    if (!id || !selectedSection) return;
    setSelectionBusy(true);
    try {
      const nextOrder = localSections.reduce((max, s) => Math.max(max, s.order ?? 0), -1) + 1;
      const created = await createSectionApi(id, {
        type: selectedSection.type,
        data: selectedSection.data ?? {},
        isVisible: selectedSection.isVisible ?? true,
        order: nextOrder,
      });
      await qc.invalidateQueries({ queryKey: ["pages", id] });
      setSelectedSectionId(String(created.id));
      setShowInlineStyling(true);
    } catch {
      toast.error("???? ??? ?????? ?????.");
    } finally {
      setSelectionBusy(false);
    }
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
      <div dir="rtl" className="relative rounded-2xl border border-white/[0.06] glass-premium p-12 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-gradient-to-b from-accent-500/10 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Spinner className="w-12 h-12" />
            {/* Orbiting elements */}
            <div className="absolute inset-[-25px] animate-orbit" style={{ animationDuration: '3s' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-accent-500/50 shadow-lg shadow-accent-500/30" />
            </div>
            <div className="absolute inset-[-40px] animate-orbit" style={{ animationDuration: '5s', animationDirection: 'reverse' }}>
              <div className="w-2 h-2 rounded-full bg-accent-400/30" />
            </div>
          </div>
          <p className="text-sm text-white/60">جاري تحميل الصفحة...</p>
        </div>
      </div>
    );
  }

  if (q.isError || !page) {
    return (
      <div dir="rtl" className="relative rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-500/5 p-8 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
        
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-300">فشل تحميل الصفحة</h3>
            <p className="mt-1 text-sm text-red-400/70">حدث خطأ أثناء تحميل بيانات الصفحة</p>
          </div>
          <Button variant="ghost" onClick={() => nav("/admin/pages")} className="mt-2 btn-shine">
            <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            العودة للصفحات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-5 perspective-container">
      {/* Enhanced Header Card */}
      <div className="relative rounded-2xl border border-white/[0.06] glass-premium p-6 overflow-hidden">
        {/* 3D Background decorations */}
        <div className="absolute top-[-30px] right-[-30px] w-20 h-20 opacity-20 pointer-events-none">
          <div className="floating-cube" />
        </div>
        <div className="absolute bottom-[-20px] left-[20%] w-16 h-16 opacity-15 pointer-events-none">
          <div className="floating-sphere" />
        </div>
        
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[120px] bg-gradient-to-b from-accent-500/10 to-transparent blur-3xl pointer-events-none" />
        
        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-500/30 to-transparent" />
        
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 border border-accent-500/25 flex items-center justify-center shadow-lg shadow-accent-500/10">
              <svg className="w-7 h-7 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gradient-premium">تحرير الصفحة</h1>
                {isDirty ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25 text-xs text-amber-400 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    غير محفوظ
                  </span>
                ) : null}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                  page.status === 'PUBLISHED' 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-white/5 border border-white/10 text-white/60'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${page.status === 'PUBLISHED' ? 'bg-emerald-400' : 'bg-white/40'}`} />
                  {page.status === 'PUBLISHED' ? 'منشور' : 'مسودة'}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-3 text-sm text-white/50">
                <span>ID: <span className="font-mono text-white/70">{page.id}</span></span>
                <span>•</span>
                <span>{sections.length} قسم</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => nav("/admin/pages")} className="btn-shine">
              <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              رجوع
            </Button>
            <Button variant="ghost" onClick={() => nav(`/admin/pages/${page.id}/preview`)}>
              <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              معاينة
            </Button>
            
            <Button variant="accent" onClick={openCreateSection} className="btn-shine">
              <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              إضافة Section
            </Button>
            <select
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm sm:w-auto hover:bg-white/[0.06] transition-colors"
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
            <Button variant="secondary" onClick={openCreateComponentsSection}>
              <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
              </svg>
              إضافة Components
            </Button>

            <select
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm sm:w-auto hover:bg-white/[0.06] transition-colors"
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_480px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-semibold">Templates</div>
              <div className="text-xs opacity-70">{selectedTemplate?.label}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <Select
                label="Page template"
                value={templateId}
                onValueChange={(value) => setTemplateId(value as any)}
                options={PAGE_TEMPLATES.map((tpl) => ({ value: tpl.id, label: tpl.label }))}
              />
              <Button
                variant="secondary"
                onClick={() => applyPageTemplate("append")}
                isLoading={templateBusy}
              >
                Append
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmTemplateReplace(true)}
                disabled={templateBusy}
              >
                Replace
              </Button>
            </div>

            <div className="mt-2 text-xs opacity-60">
              {selectedTemplate?.description ?? ""}
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
                          index={idx}
                          isSelected={String(selectedSectionId ?? "") === String(s.id)}
                          previewData={getTranslatedSectionData(s, idx)}
                          theme={theme}
                          onSelect={() => handleSelectSection(String(s.id))}
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
                <div className="text-sm opacity-70">No sections yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Canvas</div>
            <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
              <Button
                type="button"
                size="xs"
                variant={canvasView === "live" ? "secondary" : "ghost"}
                onClick={() => setCanvasView("live")}
              >
                Live
              </Button>
              <Button
                type="button"
                size="xs"
                variant={canvasView === "preview" ? "secondary" : "ghost"}
                onClick={() => setCanvasView("preview")}
              >
                Preview
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
              <Button
                type="button"
                size="xs"
                variant={previewMode === "desktop" ? "secondary" : "ghost"}
                onClick={() => setPreviewMode("desktop")}
              >
                Desktop
              </Button>
              <Button
                type="button"
                size="xs"
                variant={previewMode === "tablet" ? "secondary" : "ghost"}
                onClick={() => setPreviewMode("tablet")}
              >
                Tablet
              </Button>
              <Button
                type="button"
                size="xs"
                variant={previewMode === "mobile" ? "secondary" : "ghost"}
                onClick={() => setPreviewMode("mobile")}
              >
                Mobile
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" size="xs" variant="ghost" onClick={() => setPreviewBump((x) => x + 1)}>
                Refresh
              </Button>
              {previewUrl ? (
                <a className="text-xs opacity-80 hover:opacity-100 underline" href={previewUrl} target="_blank" rel="noreferrer">
                  Open in tab
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-2">
            <div className="text-xs opacity-70">
              Inline edit{inlineEditingAvailable ? "" : " (AR only)"}
            </div>
            <button
              type="button"
              className={
                "relative h-6 w-11 rounded-full border transition-all " +
                (inlineEditing ? "bg-white/20 border-white/20" : "bg-white/10 border-white/10") +
                (inlineEditingAvailable ? "" : " opacity-50 cursor-not-allowed")
              }
              onClick={() => {
                if (!inlineEditingAvailable) return;
                setInlineEditing((v) => !v);
              }}
            >
              <span
                className={
                  "absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white transition-all " +
                  (inlineEditing ? "left-1" : "right-1")
                }
              />
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">
            {canvasView === "preview" ? (
              previewUrl ? (
                <div className={`mx-auto w-full ${previewWidthClass}`}>
                  <iframe key={`preview-${previewBump}`} title="preview" src={previewUrl} className="h-[70vh] w-full" />
                </div>
              ) : (
                <div className="p-6 text-sm text-white/60">Preview unavailable.</div>
              )
            ) : (
              <div className="max-h-[70vh] overflow-auto">
                <ThemePreview key={`live-${previewBump}`} theme={theme} className="min-h-[60vh] p-4">
                  {customCss && customCss.trim() ? <style>{scopeCss(customCss, "#cms-preview-root")}</style> : null}
                  <div id="cms-preview-root" className={`mx-auto w-full ${previewWidthClass}`} dir={canvasDir}>
                    {canvasSections.length ? (
                      <PageRenderer
                        sections={canvasSections}
                        inlineEditing={inlineEditing && inlineEditingAvailable}
                        onInlineEdit={handleInlineEdit}
                        selectedSectionId={selectedSectionId}
                        onSectionSelect={handleSelectSection}
                      />
                    ) : (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 text-sm text-white/60">
                        No sections to preview.
                      </div>
                    )}
                  </div>
                </ThemePreview>
              </div>
            )}
          </div>

          {selectedSection ? (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">Selected section</div>
                  <div className="text-xs text-white/60">
                    {selectedSection.type} | Order {selectedSection.order ?? 0} | ID {selectedSection.id}
                  </div>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setSelectedSectionId(null);
                    setShowInlineStyling(false);
                  }}
                >
                  Clear
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => openEditSection(selectedSection)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => setShowAdvancedStyling(true)}
                >
                  Open styling window
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={duplicateSelectedSection}
                  isLoading={selectionBusy}
                >
                  Duplicate
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant={selectedSection.isVisible ? "ghost" : "secondary"}
                  onClick={toggleSelectedVisibility}
                  disabled={selectionBusy}
                >
                  {selectedSection.isVisible ? "Hide" : "Show"}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="danger"
                  onClick={() => setConfirmDeleteSectionId(selectedSection.id)}
                >
                  Delete
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/20 p-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-xs font-semibold"
                  onClick={() => setShowInlineStyling((v) => !v)}
                >
                  <span>Advanced styling</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showInlineStyling ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
                  </svg>
                </button>
                {showInlineStyling ? (
                  <div className="mt-3 max-h-[40vh] overflow-auto">
                    <ResponsiveTokensPanel
                      tokens={selectedSection.data?.twTokens ?? {}}
                      onChange={handleSelectedTokensChange}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs text-white/60">
              Select a section in the canvas to edit styling and actions.
            </div>
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
        <div dir="rtl" className="space-y-4 overflow-x-auto">
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
                        <ResponsiveTokensPanel
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

      <Modal
        open={showAdvancedStyling && !!selectedSection}
        title="تنسيق متقدم"
        description={selectedSection ? `Section: ${selectedSection.type}` : undefined}
        onCancel={() => setShowAdvancedStyling(false)}
        widthClassName="max-w-6xl"
      >
        {selectedSection ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                <div>
                  ID: <span className="text-white/90">{selectedSection.id}</span>
                </div>
                <div>Order: {selectedSection.order ?? 0}</div>
                <div className="text-white/80">{selectedSection.type}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowAdvancedStyling(false);
                    openEditSection(selectedSection);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={duplicateSelectedSection}
                  isLoading={selectionBusy}
                >
                  Duplicate
                </Button>
                <Button
                  variant={selectedSection.isVisible ? "ghost" : "secondary"}
                  size="sm"
                  onClick={toggleSelectedVisibility}
                  disabled={selectionBusy}
                >
                  {selectedSection.isVisible ? "Hide" : "Show"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDeleteSectionId(selectedSection.id)}
                  disabled={selectionBusy}
                >
                  Delete
                </Button>
              </div>

              <ResponsiveTokensPanel
                tokens={selectedSection.data?.twTokens ?? {}}
                onChange={handleSelectedTokensChange}
              />
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 lg:sticky lg:top-4 lg:self-start lg:max-h-[70vh] lg:overflow-auto">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">Preview</div>
                <div className="text-xs opacity-60">{selectedSection.type}</div>
              </div>
              <ThemePreview theme={theme} className="rounded-2xl p-2">
                <React.Suspense fallback={<div className="p-6 text-xs text-white/50">Loading preview.</div>}>
                  <LazySectionPreview
                    type={selectedSection.type}
                    data={selectedSectionPreviewData ?? selectedSection.data}
                  />
                </React.Suspense>
              </ThemePreview>
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/60">No section selected.</div>
        )}
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
      <ConfirmDialog
        open={confirmTemplateReplace}
        title="Replace template?"
        message="This will remove all current sections and apply the selected template."
        confirmText="Replace"
        cancelText="Cancel"
        variant="warning"
        isLoading={templateBusy}
        onConfirm={() => applyPageTemplate("replace")}
        onCancel={() => setConfirmTemplateReplace(false)}
      />

    </div>
  );
}









