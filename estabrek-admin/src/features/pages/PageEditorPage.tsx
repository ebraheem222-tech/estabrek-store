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
  listPageRevisions,
  moveSection as moveSectionApi,
  restorePageRevision,
  updateSection as updateSectionApi,
  type PageRevision,
  type PageSection,
  type PageSectionType,
  type PageStatus,
} from "../../api/pages.api";
import { SectionEditor, defaultDataForType, templatesForType } from "./SectionEditor";
import { ComponentsEditor, createDefaultComponent } from "./ComponentsEditor";
import { PageRenderer, type SelectedElement } from "./PageRenderer";
import { ResponsiveTokensPanel } from "./ResponsiveTokensPanel";
import { ThemePreview } from "../../components/ThemePreview";
import { toast } from "../../lib/toast";
import { PAGE_TEMPLATES } from "./pageTemplates";
import type { CmsComponentKind } from "../../cms/types";
import type { TwTokens } from "../../cms/style/tokens";

type ScopeCssFn = (css: string, scopeSelector: string) => string;

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
  isMultiSelected,
}: {
  section: PageSection;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
  previewData?: any;
  theme?: any;
  index?: number;
  onSelect?: (event: React.MouseEvent) => void;
  isSelected?: boolean;
  isMultiSelected?: boolean;
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
        onClick={(event) => {
          if (isDragging) return;
          onSelect?.(event);
        }}
        className={[
          "section-card-3d p-5 opacity-0 animate-fade-in-up",
          isSelected ? "ring-2 ring-accent-500/50 border-accent-500/40 shadow-glow" : "",
          isMultiSelected ? "ring-1 ring-white/30 border-white/20" : "",
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
  publishAt?: string;
  unpublishAt?: string;
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

type LibraryItem = {
  id: string;
  label: string;
  type: PageSectionType;
  data: any;
  source?: "built-in" | "saved";
  tags?: string[];
  category?: string;
  createdAt?: number;
};

type SavedSectionTemplate = {
  id: string;
  label: string;
  type: PageSectionType;
  data: any;
  tags: string[];
  category?: string;
  createdAt: number;
};

type LibraryCategory = "all" | "hero" | "content" | "commerce" | "media" | "layout" | "saved";

type ClipboardSection = {
  type: PageSectionType;
  data: any;
  isVisible: boolean;
};

type ClipboardElement = {
  kind: string;
  item: any;
};

const SECTION_TYPE_CATEGORY: Record<PageSectionType, LibraryCategory> = {
  HERO: "hero",
  RICH_TEXT: "content",
  CUSTOM_HTML: "content",
  GRID: "layout",
  FEATURES: "content",
  STATS: "content",
  TEAM: "content",
  PRICING: "commerce",
  CONTACT: "content",
  BANNER: "content",
  FEATURED_CATEGORIES: "commerce",
  COLLECTIONS_GRID: "commerce",
  NEW_ARRIVALS_SLIDER: "commerce",
  BEST_SELLERS_SLIDER: "commerce",
  BRANDS_SLIDER: "commerce",
  FEATURED_PRODUCTS: "commerce",
  NEWSLETTER: "content",
  IMAGE_GALLERY: "media",
  FAQ: "content",
  TESTIMONIALS: "content",
  CTA: "content",
  CARDS: "content",
  VIDEO: "media",
};

const LIBRARY_CATEGORIES: Array<{ id: LibraryCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "hero", label: "Hero" },
  { id: "content", label: "Content" },
  { id: "commerce", label: "Commerce" },
  { id: "media", label: "Media" },
  { id: "layout", label: "Layout" },
  { id: "saved", label: "Saved" },
];

function normalizeSlug(v: string) {
  const t = (v ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\s+/g, "-")
    .replace(/\/{2,}/g, "/");
  if (!t) return "";
  const next = t.startsWith("/") ? t : `/${t}`;
  return next.length > 1 && next.endsWith("/") ? next.slice(0, -1) : next;
}

function isValidSlug(v: string) {
  if (!v) return false;
  if (!v.startsWith("/")) return false;
  if (/\s/.test(v)) return false;
  if (v.includes("//")) return false;
  return true;
}

function toDateTimeLocal(iso?: string | null) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const min = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function fromDateTimeLocal(value: string): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
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

function getDeepValue(target: any, path: Array<string | number>): any {
  return path.reduce((acc, key) => (acc == null ? undefined : (acc as any)[key]), target);
}

function guessTokensPath(valuePath: Array<string | number>, data: any, kind?: string): Array<string | number> | null {
  if (!valuePath.length || !data) return null;
  if (kind === "card") {
    const path = [...valuePath, "twTokens"];
    if (getDeepValue(data, path) !== undefined) return path;
  }
  if (kind === "image") {
    const path = [...valuePath.slice(0, -1), "imageTokens"];
    if (getDeepValue(data, path) !== undefined) return path;
  }
  const last = valuePath[valuePath.length - 1];
  const parent = valuePath[valuePath.length - 2];
  const candidates: Array<Array<string | number>> = [];
  if (last === "label" && (parent === "primaryButton" || parent === "secondaryButton")) {
    candidates.push([...valuePath.slice(0, -2), `${parent}Tokens`]);
  }
  if (typeof last === "string") {
    if (last === "buttonLabel") candidates.push([...valuePath.slice(0, -1), "buttonTokens"]);
    if (last === "ctaLabel") candidates.push([...valuePath.slice(0, -1), "ctaTokens"]);
    if (last === "linkLabel") candidates.push([...valuePath.slice(0, -1), "linkTokens"]);
    if (last === "price" || last === "priceText") candidates.push([...valuePath.slice(0, -1), "priceTokens"]);
    candidates.push([...valuePath.slice(0, -1), `${last}Tokens`]);
  }
  for (const path of candidates) {
    if (getDeepValue(data, path) !== undefined) return path;
  }
  return null;
}

type QuickEditField = {
  key: string;
  label: string;
  path: Array<string | number>;
  value: string;
  type?: "text" | "url";
};

type QuickFieldPreset = {
  label: string;
  value: string;
};

type QuickFieldMeta = {
  error?: string;
  hint?: string;
  presets?: QuickFieldPreset[];
};

type HistoryEntry = {
  sectionId: string;
  prevData: any;
  nextData: any;
  ts: number;
};

type ElementArrayInfo = {
  arrayPath: Array<string | number>;
  indexPathIndex: number;
  index: number;
  itemPath: Array<string | number>;
  item: any;
  array: any[];
};

function toQuickValue(value: any) {
  if (value == null) return "";
  return typeof value === "string" ? value : String(value);
}

const TARGET_PRESETS: QuickFieldPreset[] = [
  { label: "Same tab", value: "_self" },
  { label: "New tab", value: "_blank" },
  { label: "Parent", value: "_parent" },
  { label: "Top", value: "_top" },
];

const ASPECT_PRESETS: QuickFieldPreset[] = [
  { label: "16:9", value: "16/9" },
  { label: "4:3", value: "4/3" },
  { label: "1:1", value: "1/1" },
  { label: "9:16", value: "9/16" },
];

const BADGE_PRESETS: QuickFieldPreset[] = [
  { label: "New", value: "New" },
  { label: "Hot", value: "Hot" },
  { label: "Sale", value: "Sale" },
  { label: "Best", value: "Best" },
  { label: "Limited", value: "Limited" },
];

function isValidUrl(value: string) {
  const v = value.trim();
  if (!v) return true;
  if (v.startsWith("/") || v.startsWith("#")) return true;
  if (v.startsWith("mailto:") || v.startsWith("tel:") || v.startsWith("data:")) return true;
  try {
    // Allow http(s) and custom schemes.
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

function buildQuickFieldMeta(field: QuickEditField): QuickFieldMeta {
  const meta: QuickFieldMeta = {};
  const label = field.label.toLowerCase();
  const value = field.value.trim();

  if (field.type === "url") {
    meta.hint = "Use https://, /path, #anchor, mailto:, or tel:";
    if (value && !isValidUrl(value)) {
      meta.error = "Invalid URL";
    }
  }

  if (label.includes("target")) {
    meta.presets = TARGET_PRESETS;
    if (value && !TARGET_PRESETS.some((preset) => preset.value === value)) {
      meta.error = "Use _self, _blank, _parent, or _top";
    }
  }

  if (label.includes("aspect")) {
    meta.presets = ASPECT_PRESETS;
    if (value && !ASPECT_PRESETS.some((preset) => preset.value === value)) {
      meta.error = "Use 16/9, 4/3, 1/1, or 9/16";
    }
  }

  if (label.includes("badge")) {
    meta.presets = BADGE_PRESETS;
  }

  if (label.includes("price") && !meta.hint) {
    meta.hint = "Example: 99 or 99 SAR";
  }

  if (label.includes("icon") && !meta.hint) {
    meta.hint = "Icon name or URL";
  }

  return meta;
}

function mergeTokens(base: any, patch: any): any {
  if (!patch || typeof patch !== "object") return base;
  if (!base || typeof base !== "object") return cloneData(patch);
  if (Array.isArray(patch)) return patch.slice();
  const next: any = { ...base };
  for (const key of Object.keys(patch)) {
    const value = patch[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      next[key] = mergeTokens(base[key], value);
    } else {
      next[key] = value;
    }
  }
  return next;
}

const ELEMENT_STYLE_PRESETS: Record<string, Array<{ label: string; tokens: Partial<TwTokens> }>> = {
  text: [
    { label: "Headline", tokens: { typography: { size: "2xl", weight: "bold", color: "default" } } },
    { label: "Muted", tokens: { typography: { color: "muted" } } },
    { label: "Accent", tokens: { typography: { color: "accent", weight: "semibold" } } },
  ],
  button: [
    {
      label: "Primary",
      tokens: {
        style: { bg: "solid-accent", radius: "full", shadow: "md" },
        typography: { color: "onPrimary", weight: "semibold" },
        spacing: { paddingX: "lg", paddingY: "sm" },
      },
    },
    {
      label: "Outline",
      tokens: {
        style: { bg: "none", borderWidth: "2", borderColor: "accent", radius: "xl" },
        typography: { color: "accent", weight: "semibold" },
        spacing: { paddingX: "lg", paddingY: "sm" },
      },
    },
    {
      label: "Ghost",
      tokens: {
        style: { bg: "none", borderWidth: "1", borderColor: "subtle", radius: "lg" },
        typography: { color: "default", weight: "medium" },
        spacing: { paddingX: "lg", paddingY: "sm" },
      },
    },
  ],
  image: [
    { label: "Rounded", tokens: { style: { radius: "2xl", shadow: "lg" } } },
    { label: "Soft", tokens: { style: { radius: "3xl", shadow: "sm" }, effects: { opacity: "95" } } },
  ],
  card: [
    {
      label: "Surface",
      tokens: {
        style: { bg: "solid-surface", radius: "2xl", shadow: "md", borderWidth: "1", borderColor: "subtle" },
        spacing: { padding: "lg" },
      },
    },
    {
      label: "Glass",
      tokens: {
        style: { bg: "glass-md", radius: "2xl", shadow: "lg" },
        spacing: { padding: "lg" },
        effects: { backdropBlur: "md" },
      },
    },
  ],
  badge: [
    {
      label: "Pill",
      tokens: {
        style: { bg: "solid-muted", radius: "full" },
        typography: { size: "xs", weight: "semibold" },
        spacing: { paddingX: "sm", paddingY: "xs" },
      },
    },
  ],
};

type DiffSummary = {
  paths: string[];
  total: number;
};

function diffSummary(prev: any, next: any, maxPaths = 4): DiffSummary {
  const summary: DiffSummary = { paths: [], total: 0 };
  const visited = new Set<any>();

  const walk = (a: any, b: any, path: string) => {
    if (Object.is(a, b)) return;
    const aObj = a && typeof a === "object";
    const bObj = b && typeof b === "object";

    if (!aObj || !bObj) {
      summary.total += 1;
      if (summary.paths.length < maxPaths) summary.paths.push(path || "value");
      return;
    }

    if (visited.has(a) || visited.has(b)) return;
    visited.add(a);
    visited.add(b);

    const aArray = Array.isArray(a);
    const bArray = Array.isArray(b);
    if (aArray || bArray) {
      const maxLen = Math.max(a?.length ?? 0, b?.length ?? 0);
      for (let i = 0; i < maxLen; i += 1) {
        walk(a?.[i], b?.[i], path ? `${path}[${i}]` : `[${i}]`);
        if (summary.total > 200 && summary.paths.length >= maxPaths) return;
      }
      return;
    }

    const keys = new Set<string>([
      ...Object.keys(a ?? {}),
      ...Object.keys(b ?? {}),
    ]);
    if (!keys.size) {
      summary.total += 1;
      if (summary.paths.length < maxPaths) summary.paths.push(path || "value");
      return;
    }
    for (const key of keys) {
      walk(a?.[key], b?.[key], path ? `${path}.${key}` : key);
      if (summary.total > 200 && summary.paths.length >= maxPaths) return;
    }
  };

  walk(prev, next, "");
  return summary;
}

function resolveSiblingPath(
  basePath: Array<string | number>,
  data: any,
  keys: string[]
): Array<string | number> | null {
  if (!basePath.length) return null;
  const parent = basePath.slice(0, -1);
  let fallback: Array<string | number> | null = null;
  for (const key of keys) {
    const path = [...parent, key];
    if (!fallback) fallback = path;
    if (getDeepValue(data, path) !== undefined) return path;
  }
  return fallback;
}

function resolveChildPath(
  basePath: Array<string | number>,
  data: any,
  keys: string[]
): Array<string | number> | null {
  if (!basePath.length) return null;
  let fallback: Array<string | number> | null = null;
  for (const key of keys) {
    const path = [...basePath, key];
    if (!fallback) fallback = path;
    if (getDeepValue(data, path) !== undefined) return path;
  }
  return fallback;
}

function addQuickField(fields: QuickEditField[], seen: Set<string>, label: string, path: Array<string | number> | null, value: any, type?: "text" | "url") {
  if (!path || !path.length) return;
  const key = JSON.stringify(path);
  if (seen.has(key)) return;
  seen.add(key);
  fields.push({ key, label, path, value: toQuickValue(value), type });
}

function buildElementQuickFields(selected: SelectedElement | null, data: any): QuickEditField[] {
  if (!selected || !data) return [];
  const fields: QuickEditField[] = [];
  const seen = new Set<string>();
  const valuePath = selected.valuePath ?? [];
  const kind = selected.kind;
  const last = valuePath[valuePath.length - 1];

  const add = (label: string, path: Array<string | number> | null, type?: "text" | "url") =>
    addQuickField(fields, seen, label, path, path ? getDeepValue(data, path) : undefined, type);

  if (!valuePath.length && kind !== "cta" && kind !== "map" && kind !== "video") return [];

  if (kind === "cta") {
    add("Title", ["title"]);
    add("Subtitle", ["subtitle"]);
    add("Button label", ["buttonLabel"]);
    add("Button URL", ["buttonHref"], "url");
    add("Image URL", ["imageUrl"], "url");
    return fields;
  }

  if (kind === "map") {
    add("Map URL", ["mapEmbedUrl"], "url");
    return fields;
  }

  if (kind === "video") {
    add("Video URL", ["url"], "url");
    add("Poster URL", ["posterUrl"], "url");
    add("Aspect", ["aspect"]);
    return fields;
  }

  if (kind === "text") {
    const label = typeof last === "string" && last.toLowerCase().includes("price") ? "Price" : "Text";
    add(label, valuePath);
    const linkPath = resolveSiblingPath(valuePath, data, ["href", "linkHref", "url", "ctaHref", "buttonHref"]);
    if (linkPath) add("Link URL", linkPath, "url");
  }

  if (kind === "button") {
    add("Label", valuePath);
    const linkPath = resolveSiblingPath(valuePath, data, ["href", "linkHref", "url", "ctaHref", "buttonHref"]);
    if (linkPath) add("Link URL", linkPath, "url");
    const targetPath = resolveSiblingPath(valuePath, data, ["target", "linkTarget", "buttonTarget", "ctaTarget"]);
    if (targetPath) add("Link target", targetPath);
    const iconPath = resolveSiblingPath(valuePath, data, ["icon", "iconName", "iconUrl", "iconLeft", "iconRight"]);
    if (iconPath) {
      const last = iconPath[iconPath.length - 1];
      const isUrl = typeof last === "string" && last.toLowerCase().includes("url");
      add("Icon", iconPath, isUrl ? "url" : undefined);
    }
  }

  if (kind === "field" || kind === "input" || kind === "textarea" || kind === "select") {
    add("Label", [...valuePath, "label"]);
    add("Placeholder", [...valuePath, "placeholder"]);
    add("Name", [...valuePath, "name"]);
    add("Type", [...valuePath, "type"]);
    add("Rows", [...valuePath, "rows"]);
  }

  if (kind === "image") {
    add("Image URL", valuePath, "url");
    const altPath = resolveSiblingPath(valuePath, data, ["alt", "altText", "imageAlt", "caption"]);
    if (altPath) add("Alt text", altPath);
  }

  if (kind === "link") {
    if (valuePath.length) add("Link URL", valuePath, "url");
    const targetPath = resolveSiblingPath(valuePath, data, ["target", "linkTarget", "buttonTarget", "ctaTarget"]);
    if (targetPath) add("Link target", targetPath);
  }

  if (kind === "icon") {
    const isUrl = typeof last === "string" && last.toLowerCase().includes("url");
    add("Icon", valuePath, isUrl ? "url" : undefined);
  }

  if (kind === "badge") {
    add("Badge", valuePath);
  }

  if (kind === "card") {
    const card = getDeepValue(data, valuePath);
    if (card && typeof card === "object") {
      const basePath =
        card && typeof (card as any).props === "object"
          ? [...valuePath, "props"]
          : valuePath;
      add("Title", [...basePath, "title"]);
      add("Text", [...basePath, "text"]);
      add("Subtitle", [...basePath, "subtitle"]);
      add("Badge", [...basePath, "badge"]);
      add("Price", [...basePath, "price"]);
      add("Price text", [...basePath, "priceText"]);
      add("Button label", [...basePath, "buttonLabel"]);
      add("CTA label", [...basePath, "ctaLabel"]);
      const linkPath = resolveChildPath(basePath, data, ["buttonHref", "href", "linkHref", "ctaHref"]);
      if (linkPath) add("Link URL", linkPath, "url");
      const targetPath = resolveChildPath(basePath, data, ["buttonTarget", "ctaTarget", "target", "linkTarget"]);
      if (targetPath) add("Link target", targetPath);
      const iconPath = resolveChildPath(basePath, data, ["icon", "iconUrl", "iconName"]);
      if (iconPath) {
        const last = iconPath[iconPath.length - 1];
        const isUrl = typeof last === "string" && last.toLowerCase().includes("url");
        add("Icon", iconPath, isUrl ? "url" : undefined);
      }
      const imagePath = resolveChildPath(basePath, data, ["imageUrl", "image"]);
      if (imagePath) add("Image URL", imagePath, "url");
      const altPath = imagePath
        ? resolveSiblingPath(imagePath, data, ["alt", "altText", "imageAlt", "caption"])
        : resolveChildPath(basePath, data, ["alt", "altText", "imageAlt"]);
      if (altPath) add("Alt text", altPath);
    }
  }

  return fields;
}

function cloneData<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function cloneWithFreshKeys<T>(value: T): T {
  const clone = cloneData(value);
  const stamp = `${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node.__key === "string") {
      node.__key = `dup_${stamp}`;
    }
    if (typeof node.id === "string") {
      node.id = `${node.id}_dup_${stamp}`;
    }
    Object.values(node).forEach(walk);
  };
  walk(clone);
  return clone;
}

function resolveElementArrayInfo(valuePath: Array<string | number> | undefined, data: any): ElementArrayInfo | null {
  if (!valuePath || !valuePath.length || !data) return null;
  for (let i = valuePath.length - 1; i >= 0; i -= 1) {
    if (typeof valuePath[i] !== "number") continue;
    const index = valuePath[i] as number;
    const arrayPath = valuePath.slice(0, i);
    const arrayValue = getDeepValue(data, arrayPath);
    if (!Array.isArray(arrayValue)) continue;
    return {
      arrayPath,
      indexPathIndex: i,
      index,
      itemPath: valuePath.slice(0, i + 1),
      item: arrayValue[index],
      array: arrayValue,
    };
  }
  return null;
}

function updatePathIndex(
  path: Array<string | number> | undefined,
  indexPathIndex: number,
  nextIndex: number
): Array<string | number> | undefined {
  if (!path || path.length <= indexPathIndex) return path;
  if (typeof path[indexPathIndex] !== "number") return path;
  const next = path.slice();
  next[indexPathIndex] = nextIndex;
  return next;
}

function elementKeyForSelection(kind: string, valuePath?: Array<string | number>, tokensPath?: Array<string | number>) {
  return `${kind}:${JSON.stringify(valuePath ?? [])}:${JSON.stringify(tokensPath ?? [])}`;
}

function isEditableTarget(target: EventTarget | null) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
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
  const [publishAtLocal, setPublishAtLocal] = useState("");
  const [unpublishAtLocal, setUnpublishAtLocal] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [scopeCssFn, setScopeCssFn] = useState<ScopeCssFn | null>(null);
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
  const [canvasFullScreen, setCanvasFullScreen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [leftPanelFullScreen, setLeftPanelFullScreen] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(360);
  const leftPanelResizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);
  const [leftPanelResizing, setLeftPanelResizing] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const rightPanelResizeRef = React.useRef<{ startX: number; startWidth: number } | null>(null);
  const [rightPanelResizing, setRightPanelResizing] = useState(false);
  const [canvasWidthMode, setCanvasWidthMode] = useState<"fit" | "custom">("custom");
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [templateId, setTemplateId] = useState<(typeof PAGE_TEMPLATES)[number]["id"]>("landing");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [confirmTemplateReplace, setConfirmTemplateReplace] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [multiSelectedSectionIds, setMultiSelectedSectionIds] = useState<string[]>([]);
  const [lastSelectedSectionIndex, setLastSelectedSectionIndex] = useState<number | null>(null);
  const [showAdvancedStyling, setShowAdvancedStyling] = useState(false);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [showInlineStyling, setShowInlineStyling] = useState(true);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"content" | "style" | "history">("content");
  const [showSectionLibrary, setShowSectionLibrary] = useState(false);
  const [sectionLibraryType, setSectionLibraryType] = useState<PageSectionType>("HERO");
  const [sectionInsertIndex, setSectionInsertIndex] = useState<number | null>(null);
  const [libraryDragItem, setLibraryDragItem] = useState<LibraryItem | null>(null);
  const [libraryDragOverIndex, setLibraryDragOverIndex] = useState<number | null>(null);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState<LibraryCategory>("all");
  const [savedTemplates, setSavedTemplates] = useState<SavedSectionTemplate[]>([]);
  const [savedTagFilter, setSavedTagFilter] = useState<string | null>(null);
  const [savedCategoryFilter, setSavedCategoryFilter] = useState<string | null>(null);
  const [librarySort, setLibrarySort] = useState<"newest" | "oldest" | "name-asc" | "name-desc">("newest");
  const canvasScrollRef = React.useRef<HTMLDivElement>(null);
  const importTemplatesInputRef = React.useRef<HTMLInputElement>(null);
  const [canvasActionBar, setCanvasActionBar] = useState<{ top: number; left: number; width: number } | null>(null);
  const [canvasGuides, setCanvasGuides] = useState<{ x: number; y: number; snapX: boolean; snapY: boolean } | null>(null);
  const [elementModalOpen, setElementModalOpen] = useState(false);
  const [elementModalFields, setElementModalFields] = useState<QuickEditField[]>([]);
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisionsBusy, setRevisionsBusy] = useState(false);
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [restoringRevisionId, setRestoringRevisionId] = useState<string | null>(null);
  const autosaveTimersRef = React.useRef<Map<string, number>>(new Map());
  const autosaveSavedTimerRef = React.useRef<number | null>(null);
  const historyRef = React.useRef<HistoryEntry[]>([]);
  const historyIndexRef = React.useRef(-1);
  const lastHistoryAtRef = React.useRef(0);
  const suppressHistoryRef = React.useRef(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  const hasCustomPreviewCss = customCss.trim().length > 0;

  useEffect(() => {
    if (!hasCustomPreviewCss || scopeCssFn) return;
    let cancelled = false;
    import("../../lib/scopeCss")
      .then((mod) => {
        if (cancelled) return;
        setScopeCssFn(() => mod.scopeCss);
      })
      .catch(() => {
        // Keep editor usable even if CSS scoper chunk fails to load.
      });
    return () => {
      cancelled = true;
    };
  }, [hasCustomPreviewCss, scopeCssFn]);

  const scopedPreviewCss = useMemo(() => {
    if (!hasCustomPreviewCss || !scopeCssFn) return "";
    return scopeCssFn(customCss, "#cms-preview-root");
  }, [customCss, hasCustomPreviewCss, scopeCssFn]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const clipboardSectionRef = React.useRef<ClipboardSection | null>(null);
  const clipboardElementRef = React.useRef<ClipboardElement | null>(null);
  const savedTemplatesKey = "cms.sectionTemplates.v1";

  const normalizeSavedTemplates = (raw: any): SavedSectionTemplate[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item, idx) => {
        if (!item || typeof item !== "object") return null;
        const label = typeof item.label === "string" ? item.label : `Template ${idx + 1}`;
        const type = item.type as PageSectionType;
        return {
          id: typeof item.id === "string" ? item.id : `tpl_${idx}_${Date.now().toString(36)}`,
          label,
          type: SECTION_TYPES.find((t) => t.value === type)?.value ?? "RICH_TEXT",
          data: item.data ?? {},
          tags: Array.isArray(item.tags) ? item.tags.filter((t: any) => typeof t === "string") : [],
          category: typeof item.category === "string" ? item.category : undefined,
          createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : Date.now(),
        } as SavedSectionTemplate;
      })
      .filter((item): item is SavedSectionTemplate => !!item);
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(savedTemplatesKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const normalized = normalizeSavedTemplates(parsed);
      if (normalized.length) setSavedTemplates(normalized);
    } catch {
      // ignore storage errors
    }
  }, []);

  const persistSavedTemplates = (next: SavedSectionTemplate[]) => {
    const normalized = normalizeSavedTemplates(next);
    setSavedTemplates(normalized);
    try {
      window.localStorage.setItem(savedTemplatesKey, JSON.stringify(normalized));
    } catch {
      // ignore storage errors
    }
  };

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

  const canvasWidthStyle = canvasWidthMode === "fit"
    ? { width: "100%" }
    : { width: "100%", maxWidth: `${canvasWidth}px` };

  const canvasDir = contentLocale === "en" ? "ltr" : "rtl";
  const canvasViewportClass = canvasFullScreen ? "h-[calc(100vh-240px)]" : "max-h-[70vh]";
  const canvasPreviewHeightClass = canvasFullScreen ? "h-[calc(100vh-240px)]" : "h-[70vh]";
  const canvasPanelClass = canvasFullScreen
    ? "fixed inset-0 z-40 flex flex-col border border-white/10 bg-black/90 p-4 relative"
    : "rounded-2xl border border-white/10 bg-white/5 p-4 relative";
  const leftPanelStyle = leftPanelCollapsed ? undefined : { width: `min(100%, ${leftPanelWidth}px)` };
  const rightPanelStyle = canvasFullScreen || leftPanelFullScreen ? undefined : { width: `min(100%, ${rightPanelWidth}px)` };

  useEffect(() => {
    if (!canvasFullScreen && !leftPanelFullScreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCanvasFullScreen(false);
        setLeftPanelFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasFullScreen, leftPanelFullScreen]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!leftPanelResizeRef.current) return;
      const delta = event.clientX - leftPanelResizeRef.current.startX;
      const next = leftPanelResizeRef.current.startWidth + delta;
      const clamped = Math.min(520, Math.max(260, next));
      setLeftPanelWidth(clamped);
    };
    const handleUp = () => {
      if (!leftPanelResizeRef.current) return;
      leftPanelResizeRef.current = null;
      setLeftPanelResizing(false);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!rightPanelResizeRef.current) return;
      const delta = event.clientX - rightPanelResizeRef.current.startX;
      const next = rightPanelResizeRef.current.startWidth - delta;
      const clamped = Math.min(520, Math.max(280, next));
      setRightPanelWidth(clamped);
    };
    const handleUp = () => {
      if (!rightPanelResizeRef.current) return;
      rightPanelResizeRef.current = null;
      setRightPanelResizing(false);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const filteredSectionTypes = useMemo(() => {
    if (libraryCategory === "all" || libraryCategory === "saved") return SECTION_TYPES;
    return SECTION_TYPES.filter((t) => SECTION_TYPE_CATEGORY[t.value] === libraryCategory);
  }, [libraryCategory]);

  useEffect(() => {
    if (libraryCategory === "saved") return;
    if (!filteredSectionTypes.find((t) => t.value === sectionLibraryType)) {
      setSectionLibraryType(filteredSectionTypes[0]?.value ?? "HERO");
    }
  }, [libraryCategory, filteredSectionTypes, sectionLibraryType]);

  const savedLibraryItems = useMemo<LibraryItem[]>(
    () =>
      savedTemplates.map((template) => ({
        id: `saved:${template.id}`,
        label: template.label,
        type: template.type,
        data: template.data,
        source: "saved",
        tags: template.tags,
        category: template.category,
        createdAt: template.createdAt,
      })),
    [savedTemplates]
  );

  const sectionLibraryItems = useMemo<LibraryItem[]>(() => {
    const base = defaultDataForType(sectionLibraryType);
    const templates = templatesForType(sectionLibraryType);
    const savedForType = savedTemplates.filter((item) => item.type === sectionLibraryType);
    const list: LibraryItem[] = [
      { id: `blank:${sectionLibraryType}`, label: "Blank", type: sectionLibraryType, data: base ?? {}, source: "built-in" },
      ...savedForType.map((item) => ({
        id: `saved:${item.id}`,
        label: item.label,
        type: item.type,
        data: item.data,
        source: "saved",
        tags: item.tags,
        category: item.category,
        createdAt: item.createdAt,
      })),
      ...templates.map((t) => ({
        id: `${sectionLibraryType}:${t.id}`,
        label: t.label,
        type: sectionLibraryType,
        data: t.data ?? {},
        source: "built-in",
      })),
    ];
    return list;
  }, [sectionLibraryType, savedTemplates]);

  const savedTags = useMemo(() => {
    const tags = new Set<string>();
    savedTemplates.forEach((tpl) => {
      (tpl.tags ?? []).forEach((tag) => {
        if (tag) tags.add(tag);
      });
    });
    return Array.from(tags).sort();
  }, [savedTemplates]);

  const savedCategories = useMemo(() => {
    const categories = new Set<string>();
    savedTemplates.forEach((tpl) => {
      if (tpl.category) categories.add(tpl.category);
    });
    return Array.from(categories).sort();
  }, [savedTemplates]);

  const libraryItems = useMemo(() => {
    let sourceItems = libraryCategory === "saved" ? savedLibraryItems : sectionLibraryItems;
    if (libraryCategory === "saved") {
      if (savedTagFilter) {
        sourceItems = sourceItems.filter((item) => item.tags?.includes(savedTagFilter));
      }
      if (savedCategoryFilter) {
        sourceItems = sourceItems.filter((item) => item.category === savedCategoryFilter);
      }
      sourceItems = sourceItems.slice().sort((a, b) => {
        if (librarySort === "name-asc") return a.label.localeCompare(b.label);
        if (librarySort === "name-desc") return b.label.localeCompare(a.label);
        if (librarySort === "oldest") return (a.createdAt ?? 0) - (b.createdAt ?? 0);
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
    }
    const q = librarySearch.trim().toLowerCase();
    if (!q) return sourceItems;
    return sourceItems.filter((item) => {
      const label = item.label.toLowerCase();
      const type = String(item.type).toLowerCase();
      const tags = (item.tags ?? []).join(" ").toLowerCase();
      const category = (item.category ?? "").toLowerCase();
      return label.includes(q) || type.includes(q) || tags.includes(q) || category.includes(q);
    });
  }, [
    libraryCategory,
    librarySearch,
    savedLibraryItems,
    sectionLibraryItems,
    savedTagFilter,
    savedCategoryFilter,
    librarySort,
  ]);

  const showInsertPoints = showSectionLibrary || !!libraryDragItem;
  const showLeftPanel = leftPanelFullScreen || (!canvasFullScreen && !leftPanelCollapsed);
  const canvasDropActive = libraryDragOverIndex === 0;

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
    setPublishAtLocal(toDateTimeLocal((page as any).publishAt ?? null));
    setUnpublishAtLocal(toDateTimeLocal((page as any).unpublishAt ?? null));
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
      (fromDateTimeLocal(publishAtLocal) ?? "") !== String((page as any).publishAt ?? "") ||
      (fromDateTimeLocal(unpublishAtLocal) ?? "") !== String((page as any).unpublishAt ?? "") ||
      (canonicalUrl ?? "") !== String(page.canonicalUrl ?? "") ||
      (customCss ?? "") !== String(page.customCss ?? "") ||
      (headScripts ?? "") !== normalizeScripts(page.headScripts) ||
      (bodyScripts ?? "") !== normalizeScripts(page.bodyScripts)
    );
  }, [page, name, slug, status, publishAtLocal, unpublishAtLocal, canonicalUrl, customCss, headScripts, bodyScripts]);

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

  useEffect(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    setHistoryVersion((v) => v + 1);
  }, [page?.id, localSections.length]);

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

  const multiSelectedSections = useMemo(() => {
    if (!multiSelectedSectionIds.length) return [];
    const idSet = new Set(multiSelectedSectionIds.map(String));
    return localSections.filter((s) => idSet.has(String(s.id)));
  }, [localSections, multiSelectedSectionIds]);

  const multiSelectionActive = multiSelectedSections.length > 1;

  useEffect(() => {
    if (selectedSectionId) {
      setShowInlineStyling(true);
    } else {
      setShowInlineStyling(false);
      setShowAdvancedStyling(false);
      setSelectedElement(null);
    }
  }, [selectedSectionId]);

  useEffect(() => {
    if (!selectedSectionId) {
      setMultiSelectedSectionIds([]);
      setLastSelectedSectionIndex(null);
      return;
    }
    const stringId = String(selectedSectionId);
    setMultiSelectedSectionIds((prev) => (prev.includes(stringId) ? prev : [stringId]));
  }, [selectedSectionId]);

  useEffect(() => {
    if (!selectedSectionId || !selectedElement) return;
    if (String(selectedElement.sectionId) !== String(selectedSectionId)) {
      setSelectedElement(null);
    }
  }, [selectedElement, selectedSectionId]);

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

  useEffect(() => {
    if (sectionInsertIndex == null) return;
    if (sectionInsertIndex < 0 || sectionInsertIndex > localSections.length) {
      setSectionInsertIndex(null);
    }
  }, [sectionInsertIndex, localSections.length]);

  const selectedSectionIndex = useMemo(() => {
    if (!selectedSectionId) return -1;
    return localSections.findIndex((s) => String(s.id) === String(selectedSectionId));
  }, [localSections, selectedSectionId]);

  const selectedSectionPreviewData = useMemo(() => {
    if (!selectedSection) return null;
    if (selectedSectionIndex < 0) return selectedSection.data ?? null;
    return getTranslatedSectionData(selectedSection, selectedSectionIndex);
  }, [selectedSection, selectedSectionIndex, translatedSections, contentLocale]);

  const resolvedElementTokensPath = useMemo(() => {
    if (!selectedElement || !selectedSection) return null;
    if (selectedElement.tokensPath?.length) return selectedElement.tokensPath;
    if (!selectedElement.valuePath?.length) return null;
    return guessTokensPath(selectedElement.valuePath, selectedSection.data, selectedElement.kind);
  }, [selectedElement, selectedSection]);

  const selectedElementTokens = useMemo(() => {
    if (!resolvedElementTokensPath || !selectedSection) return null;
    return getDeepValue(selectedSection.data ?? {}, resolvedElementTokensPath) ?? {};
  }, [resolvedElementTokensPath, selectedSection]);

  const elementQuickFields = useMemo(
    () => buildElementQuickFields(selectedElement, selectedSection?.data ?? null),
    [selectedElement, selectedSection]
  );

  const elementStylePresets = useMemo(
    () => (selectedElement ? ELEMENT_STYLE_PRESETS[selectedElement.kind] ?? [] : []),
    [selectedElement]
  );

  const elementArrayInfo = useMemo(
    () => resolveElementArrayInfo(selectedElement?.valuePath, selectedSection?.data ?? null),
    [selectedElement, selectedSection]
  );

  const elementIsVisible = useMemo(() => {
    const item = elementArrayInfo?.item;
    if (!item || typeof item !== "object") return true;
    if ("hidden" in item) return item.hidden !== true;
    if ("isVisible" in item) return item.isVisible !== false;
    return true;
  }, [elementArrayInfo]);

  const elementCanDuplicate = !!elementArrayInfo;
  const elementCanDelete = !!elementArrayInfo && Array.isArray(elementArrayInfo.array) && elementArrayInfo.array.length > 0;
  const elementCanToggleVisibility = !!elementArrayInfo && elementArrayInfo.item && typeof elementArrayInfo.item === "object";

  useEffect(() => {
    if (!selectedElement) {
      setElementModalOpen(false);
    }
  }, [selectedElement]);


  const qc = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const startLeftResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    leftPanelResizeRef.current = { startX: event.clientX, startWidth: leftPanelWidth };
    setLeftPanelResizing(true);
    event.preventDefault();
  };

  const startRightResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    rightPanelResizeRef.current = { startX: event.clientX, startWidth: rightPanelWidth };
    setRightPanelResizing(true);
    event.preventDefault();
  };

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

  const renderInsertZone = (index: number, isEmpty = false) => {
    if (!showInsertPoints) return null;
    const isActive = libraryDragOverIndex === index || sectionInsertIndex === index;
    const label = libraryDragItem
      ? "Drop to insert here"
      : isEmpty
        ? "Insert your first section"
        : "Insert section here";
    return (
      <div
        key={`insert-${index}`}
        className={[
          "rounded-xl border border-dashed px-3 py-2 text-xs transition",
          isActive ? "border-accent-500/60 bg-accent-500/10 text-accent-200" : "border-white/10 text-white/50 hover:text-white/70",
        ].join(" ")}
        onClick={() => {
          setSectionInsertIndex(index);
          setShowSectionLibrary(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setLibraryDragOverIndex(index);
        }}
        onDragLeave={() => {
          if (libraryDragOverIndex === index) setLibraryDragOverIndex(null);
        }}
        onDrop={handleInsertDrop(index)}
      >
        <div className="flex items-center justify-between gap-2">
          <span>{label}</span>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              setSectionInsertIndex(index);
              setShowSectionLibrary(true);
            }}
          >
            Insert
          </Button>
        </div>
      </div>
    );
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

  useEffect(() => {
    if (!selectedSectionId || canvasView !== "live") return;
    const container = canvasScrollRef.current;
    if (!container) return;
    const node = container.querySelector(`[data-section-id="${selectedSectionId}"]`) as HTMLElement | null;
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedSectionId, canvasView, previewMode, previewBump, canvasFullScreen, inlineEditing, contentLocale]);

  useEffect(() => {
    return () => {
      autosaveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      autosaveTimersRef.current.clear();
      if (autosaveSavedTimerRef.current) {
        window.clearTimeout(autosaveSavedTimerRef.current);
        autosaveSavedTimerRef.current = null;
      }
    };
  }, []);

  const queueSectionSave = (sectionId: string, nextData: any) => {
    if (!id) return;
    const timers = autosaveTimersRef.current;
    const existing = timers.get(sectionId);
    if (existing) window.clearTimeout(existing);

    setAutosaveState("saving");
    const timer = window.setTimeout(async () => {
      timers.delete(sectionId);
      try {
        await updateSectionApi(sectionId, { data: nextData });
      } catch {
        toast.error("???? ??? ???????.");
      }
      if (timers.size === 0) {
        setAutosaveState("saved");
        if (autosaveSavedTimerRef.current) {
          window.clearTimeout(autosaveSavedTimerRef.current);
        }
        autosaveSavedTimerRef.current = window.setTimeout(() => {
          setAutosaveState("idle");
        }, 1200);
      }
    }, 650);

    timers.set(sectionId, timer);
  };

  const recordHistory = (entry: HistoryEntry) => {
    if (suppressHistoryRef.current) return;
    const now = Date.now();
    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    const last = history[history.length - 1];
    if (last && last.sectionId === entry.sectionId && now - last.ts < 1200) {
      history[history.length - 1] = { ...last, nextData: entry.nextData, ts: now };
      historyRef.current = history;
      historyIndexRef.current = history.length - 1;
      lastHistoryAtRef.current = now;
      setHistoryVersion((v) => v + 1);
      return;
    }
    history.push(entry);
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
    lastHistoryAtRef.current = now;
    setHistoryVersion((v) => v + 1);
  };

  useEffect(() => {
    if (canvasView !== "live" || !selectedElement) {
      setCanvasActionBar(null);
      setCanvasGuides(null);
      return;
    }
    const container = canvasScrollRef.current;
    if (!container) {
      setCanvasActionBar(null);
      setCanvasGuides(null);
      return;
    }

    let raf: number | null = null;
    const update = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const selectedNode = container.querySelector("[data-cms-selected=\"true\"]") as HTMLElement | null;
        if (!selectedNode) {
          setCanvasActionBar(null);
          setCanvasGuides(null);
          return;
        }
        const containerRect = container.getBoundingClientRect();
        const rect = selectedNode.getBoundingClientRect();
        const top = rect.bottom - containerRect.top + container.scrollTop + 6;
        const left = rect.left - containerRect.left + container.scrollLeft;
        const width = Math.min(rect.width, container.clientWidth - 16);
        if (!Number.isFinite(top) || !Number.isFinite(left) || !Number.isFinite(width)) {
          setCanvasActionBar(null);
          setCanvasGuides(null);
          return;
        }
        setCanvasActionBar({ top, left, width });
        const centerX = rect.left - containerRect.left + container.scrollLeft + rect.width / 2;
        const centerY = rect.top - containerRect.top + container.scrollTop + rect.height / 2;
        const snapX = Math.abs(centerX - (container.scrollLeft + container.clientWidth / 2)) < 6;
        const snapY = Math.abs(centerY - (container.scrollTop + container.clientHeight / 2)) < 6;
        setCanvasGuides({ x: centerX, y: centerY, snapX, snapY });
      });
    };

    update();
    container.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    const selectedNode = container.querySelector("[data-cms-selected=\"true\"]") as HTMLElement | null;
    if (observer && selectedNode) {
      observer.observe(selectedNode);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, [canvasView, selectedElement, previewMode, previewBump, inlineEditing, contentLocale, canvasFullScreen]);

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

  const persistSectionData = async (
    sectionId: string,
    nextData: any,
    errorMessage?: string,
    options?: { skipHistory?: boolean; immediate?: boolean }
  ) => {
    const prevSection = localSections.find((s) => String(s.id) === String(sectionId));
    const prevData = prevSection?.data ?? {};
    if (!options?.skipHistory && !suppressHistoryRef.current) {
      recordHistory({
        sectionId: String(sectionId),
        prevData: cloneData(prevData),
        nextData: cloneData(nextData),
        ts: Date.now(),
      });
    }

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

    if (options?.immediate) {
      try {
        await updateSectionApi(sectionId, { data: nextData });
      } catch {
        if (errorMessage) toast.error(errorMessage);
      }
      return;
    }

    queueSectionSave(sectionId, nextData);
  };

  const applyHistoryEntry = async (entry: HistoryEntry, mode: "undo" | "redo") => {
    if (!entry) return;
    suppressHistoryRef.current = true;
    try {
      await persistSectionData(
        entry.sectionId,
        mode === "undo" ? entry.prevData : entry.nextData,
        "???? ??? ???????.",
        { skipHistory: true, immediate: true }
      );
    } finally {
      suppressHistoryRef.current = false;
    }
  };

  const undoLast = async () => {
    const idx = historyIndexRef.current;
    if (idx < 0) return;
    const entry = historyRef.current[idx];
    historyIndexRef.current = idx - 1;
    setHistoryVersion((v) => v + 1);
    await applyHistoryEntry(entry, "undo");
  };

  const redoLast = async () => {
    const idx = historyIndexRef.current + 1;
    if (idx >= historyRef.current.length) return;
    const entry = historyRef.current[idx];
    historyIndexRef.current = idx;
    setHistoryVersion((v) => v + 1);
    await applyHistoryEntry(entry, "redo");
  };

  const handleInlineEdit = React.useCallback(
    async ({ sectionId, path, value }: InlineEditPayload) => {
      if (!id || !inlineEditingAvailable) return;
      const idx = localSections.findIndex((s) => String(s.id) === String(sectionId));
      if (idx < 0) return;
      const section = localSections[idx];
      const nextData = setDeepValue(section.data ?? {}, path, value);
      await persistSectionData(section.id, nextData, "???? ??? ???????.");
    },
    [id, inlineEditingAvailable, localSections, persistSectionData]
  );

  const handleSelectSection = React.useCallback((sectionId: string) => {
    const stringId = String(sectionId);
    setSelectedSectionId(stringId);
    setSelectedElement(null);
    setShowInlineStyling(true);
    setMultiSelectedSectionIds([stringId]);
    const idx = localSections.findIndex((s) => String(s.id) === stringId);
    setLastSelectedSectionIndex(idx >= 0 ? idx : null);
  }, [localSections]);

  const handleSelectSectionFromList = React.useCallback(
    (sectionId: string, event: React.MouseEvent) => {
      const stringId = String(sectionId);
      const idx = localSections.findIndex((s) => String(s.id) === stringId);
      const isMeta = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      setSelectedElement(null);
      setShowInlineStyling(true);

      if (isShift && lastSelectedSectionIndex != null && idx >= 0) {
        const start = Math.min(lastSelectedSectionIndex, idx);
        const end = Math.max(lastSelectedSectionIndex, idx);
        const rangeIds = localSections.slice(start, end + 1).map((s) => String(s.id));
        const nextIds = isMeta
          ? Array.from(new Set([...multiSelectedSectionIds, ...rangeIds]))
          : rangeIds;
        setMultiSelectedSectionIds(nextIds);
        setSelectedSectionId(stringId);
        setLastSelectedSectionIndex(idx);
        return;
      }

      if (isMeta) {
        let nextIds: string[];
        if (multiSelectedSectionIds.includes(stringId)) {
          nextIds = multiSelectedSectionIds.filter((id) => id !== stringId);
        } else {
          nextIds = [...multiSelectedSectionIds, stringId];
        }
        setMultiSelectedSectionIds(nextIds);
        setSelectedSectionId(nextIds.length ? stringId : null);
        setLastSelectedSectionIndex(idx >= 0 ? idx : null);
        return;
      }

      setSelectedSectionId(stringId);
      setMultiSelectedSectionIds([stringId]);
      setLastSelectedSectionIndex(idx >= 0 ? idx : null);
    },
    [lastSelectedSectionIndex, localSections, multiSelectedSectionIds]
  );

  const handleSelectElement = React.useCallback((element: SelectedElement) => {
    const stringId = String(element.sectionId);
    setSelectedElement(element);
    setSelectedSectionId(stringId);
    setShowInlineStyling(true);
    setMultiSelectedSectionIds([stringId]);
    const idx = localSections.findIndex((s) => String(s.id) === stringId);
    setLastSelectedSectionIndex(idx >= 0 ? idx : null);
  }, [localSections]);

  const handleSelectedTokensChange = (nextTokens: any) => {
    if (!selectedSection) return;
    const nextData = { ...(selectedSection.data ?? {}), twTokens: nextTokens };
    void persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
  };

  const handleSelectedElementTokensChange = (nextTokens: any) => {
    if (!selectedSection || !resolvedElementTokensPath) return;
    const nextData = setDeepValue(selectedSection.data ?? {}, resolvedElementTokensPath, nextTokens);
    void persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
  };

  const applyElementStylePreset = (presetTokens: Partial<TwTokens>) => {
    if (!selectedSection || !resolvedElementTokensPath) return;
    const merged = mergeTokens(selectedElementTokens ?? {}, presetTokens);
    const nextData = setDeepValue(selectedSection.data ?? {}, resolvedElementTokensPath, merged);
    void persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
  };

  const handleQuickFieldChange = (path: Array<string | number>, value: string) => {
    if (!selectedSection) return;
    const nextData = setDeepValue(selectedSection.data ?? {}, path, value);
    void persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
  };

  const copySelection = () => {
    if (selectedElement && elementArrayInfo) {
      clipboardElementRef.current = {
        kind: selectedElement.kind,
        item: cloneWithFreshKeys(elementArrayInfo.item),
      };
      clipboardSectionRef.current = null;
      toast.success("Element copied.");
      return;
    }
    if (selectedSection) {
      clipboardSectionRef.current = {
        type: selectedSection.type,
        data: cloneData(selectedSection.data ?? {}),
        isVisible: selectedSection.isVisible ?? true,
      };
      clipboardElementRef.current = null;
      toast.success("Section copied.");
      return;
    }
    toast.error("Select a section or list item to copy.");
  };

  const pasteSelection = async () => {
    if (selectedElement && elementArrayInfo && selectedSection && clipboardElementRef.current) {
      const { arrayPath, index, indexPathIndex, array } = elementArrayInfo;
      if (!Array.isArray(array)) return;
      const nextItem = cloneWithFreshKeys(clipboardElementRef.current.item);
      const nextArray = array.slice();
      nextArray.splice(index + 1, 0, nextItem);
      const nextData = setDeepValue(selectedSection.data ?? {}, arrayPath, nextArray);
      await persistSectionData(selectedSection.id, nextData, "Element pasted.");
      const nextValuePath = updatePathIndex(selectedElement.valuePath, indexPathIndex, index + 1);
      const nextTokensPath = updatePathIndex(selectedElement.tokensPath, indexPathIndex, index + 1);
      setSelectedElement({
        ...selectedElement,
        valuePath: nextValuePath,
        tokensPath: nextTokensPath,
        key: elementKeyForSelection(selectedElement.kind, nextValuePath, nextTokensPath),
      });
      return;
    }
    if (clipboardSectionRef.current && id) {
      const insertAt = selectedSectionIndex >= 0 ? selectedSectionIndex + 1 : localSections.length;
      const order = calculateInsertOrder(insertAt);
      try {
        const created = await createSectionApi(id, {
          type: clipboardSectionRef.current.type,
          data: cloneData(clipboardSectionRef.current.data ?? {}),
          isVisible: clipboardSectionRef.current.isVisible ?? true,
          order,
        });
        await qc.invalidateQueries({ queryKey: ["pages", id] });
        setSelectedSectionId(String(created.id));
        setMultiSelectedSectionIds([String(created.id)]);
        setShowInlineStyling(true);
      } catch {
        toast.error("Failed to paste section.");
      }
      return;
    }
    toast.error("Nothing to paste.");
  };

  const duplicateSelection = async () => {
    if (selectedElement && elementArrayInfo) {
      await handleDuplicateElement();
      return;
    }
    await duplicateSelectedSection();
  };

  const openElementModal = () => {
    if (!elementQuickFields.length) return;
    setElementModalFields(elementQuickFields.map((f) => ({ ...f })));
    setElementModalOpen(true);
  };

  const saveElementModal = async () => {
    if (!selectedSection) return;
    let nextData = selectedSection.data ?? {};
    for (const field of elementModalFields) {
      nextData = setDeepValue(nextData, field.path, field.value);
    }
    await persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
    setElementModalOpen(false);
  };

  const handleDuplicateElement = async () => {
    if (!selectedSection || !elementArrayInfo) return;
    const { arrayPath, index, indexPathIndex, array, item } = elementArrayInfo;
    if (!Array.isArray(array)) return;
    const nextItem = cloneWithFreshKeys(item);
    const nextArray = array.slice();
    nextArray.splice(index + 1, 0, nextItem);
    const nextData = setDeepValue(selectedSection.data ?? {}, arrayPath, nextArray);
    await persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
    if (selectedElement) {
      const nextValuePath = updatePathIndex(selectedElement.valuePath, indexPathIndex, index + 1);
      const nextTokensPath = updatePathIndex(selectedElement.tokensPath, indexPathIndex, index + 1);
      setSelectedElement({
        ...selectedElement,
        valuePath: nextValuePath,
        tokensPath: nextTokensPath,
        key: elementKeyForSelection(selectedElement.kind, nextValuePath, nextTokensPath),
      });
    }
  };

  const handleDeleteElement = async () => {
    if (!selectedSection || !elementArrayInfo) return;
    const { arrayPath, index, indexPathIndex, array } = elementArrayInfo;
    if (!Array.isArray(array) || array.length === 0) return;
    const nextArray = array.filter((_, idx) => idx !== index);
    const nextData = setDeepValue(selectedSection.data ?? {}, arrayPath, nextArray);
    await persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
    if (!nextArray.length) {
      setSelectedElement(null);
      return;
    }
    const nextIndex = Math.min(index, nextArray.length - 1);
    if (selectedElement) {
      const nextValuePath = updatePathIndex(selectedElement.valuePath, indexPathIndex, nextIndex);
      const nextTokensPath = updatePathIndex(selectedElement.tokensPath, indexPathIndex, nextIndex);
      setSelectedElement({
        ...selectedElement,
        valuePath: nextValuePath,
        tokensPath: nextTokensPath,
        key: elementKeyForSelection(selectedElement.kind, nextValuePath, nextTokensPath),
      });
    }
  };

  const handleToggleElementVisibility = async () => {
    if (!selectedSection || !elementArrayInfo) return;
    const { itemPath, item } = elementArrayInfo;
    if (!item || typeof item !== "object") return;
    const nextItem = { ...item } as any;
    if ("hidden" in nextItem) {
      nextItem.hidden = !elementIsVisible;
    } else {
      nextItem.isVisible = !elementIsVisible;
    }
    const nextData = setDeepValue(selectedSection.data ?? {}, itemPath, nextItem);
    await persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
  };

  const moveSelectedElement = async (direction: "UP" | "DOWN") => {
    if (!selectedSection || !elementArrayInfo) return;
    const { arrayPath, index, indexPathIndex, array } = elementArrayInfo;
    if (!Array.isArray(array)) return;
    const nextIndex = direction === "UP" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= array.length) return;
    const nextArray = arrayMove(array, index, nextIndex);
    const nextData = setDeepValue(selectedSection.data ?? {}, arrayPath, nextArray);
    await persistSectionData(selectedSection.id, nextData, "???? ??? ???????.");
    if (selectedElement) {
      const nextValuePath = updatePathIndex(selectedElement.valuePath, indexPathIndex, nextIndex);
      const nextTokensPath = updatePathIndex(selectedElement.tokensPath, indexPathIndex, nextIndex);
      setSelectedElement({
        ...selectedElement,
        valuePath: nextValuePath,
        tokensPath: nextTokensPath,
        key: elementKeyForSelection(selectedElement.kind, nextValuePath, nextTokensPath),
      });
    }
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

  const calculateInsertOrder = (index: number) => {
    const before = localSections[index - 1];
    const after = localSections[index];
    if (before && after) {
      const prevOrder = Number(before.order ?? index - 1);
      const nextOrder = Number(after.order ?? index);
      return (prevOrder + nextOrder) / 2;
    }
    if (before) return Number(before.order ?? index - 1) + 1;
    if (after) return Number(after.order ?? 0) - 1;
    return 0;
  };

  const insertSectionFromLibrary = async (item: LibraryItem, index: number | null) => {
    if (!id) return;
    const insertAt = index == null ? localSections.length : Math.min(Math.max(index, 0), localSections.length);
    const order = calculateInsertOrder(insertAt);
    setLibraryBusy(true);
    try {
      const created = await actions.createSection.mutateAsync({
        pageId: id,
        body: { type: item.type, data: item.data ?? {}, isVisible: true, order },
      });
      setSelectedSectionId(String(created.id));
      setSelectedElement(null);
      setShowInlineStyling(true);
      setSectionInsertIndex(null);
    } catch {
      // toast handled in mutation
    } finally {
      setLibraryBusy(false);
      setLibraryDragItem(null);
      setLibraryDragOverIndex(null);
    }
  };

  const duplicateSectionsBulk = async () => {
    if (!id || !multiSelectedSections.length) return;
    setSelectionBusy(true);
    try {
      const sorted = multiSelectedSections
        .slice()
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
      let nextOrder = localSections.reduce((max, s) => Math.max(max, s.order ?? 0), -1) + 1;
      let lastCreatedId: string | null = null;
      for (const section of sorted) {
        const created = await createSectionApi(id, {
          type: section.type,
          data: cloneData(section.data ?? {}),
          isVisible: section.isVisible ?? true,
          order: nextOrder,
        });
        lastCreatedId = String(created.id);
        nextOrder += 1;
      }
      await qc.invalidateQueries({ queryKey: ["pages", id] });
      if (lastCreatedId) {
        setSelectedSectionId(lastCreatedId);
        setMultiSelectedSectionIds([lastCreatedId]);
      }
    } catch {
      toast.error("Failed to duplicate sections.");
    } finally {
      setSelectionBusy(false);
    }
  };

  const setVisibilityBulk = async (visible: boolean) => {
    if (!multiSelectedSections.length) return;
    setSelectionBusy(true);
    try {
      await Promise.all(multiSelectedSections.map((section) => persistSectionVisibility(section.id, visible)));
    } finally {
      setSelectionBusy(false);
    }
  };

  const deleteSectionsBulk = async () => {
    if (!id || !multiSelectedSections.length) return;
    setSelectionBusy(true);
    try {
      await Promise.all(multiSelectedSections.map((section) => deleteSectionApi(section.id)));
      await qc.invalidateQueries({ queryKey: ["pages", id] });
      setSelectedSectionId(null);
      setMultiSelectedSectionIds([]);
    } catch {
      toast.error("Failed to delete sections.");
    } finally {
      setSelectionBusy(false);
    }
  };

  const saveSectionAsTemplate = () => {
    if (!selectedSection) return;
    const defaultName = `${selectedSection.type} template`;
    const label = window.prompt("Template name", defaultName);
    if (!label) return;
    const cleaned = label.trim();
    if (!cleaned) return;
    const nextTemplate: SavedSectionTemplate = {
      id: `tpl_${Date.now().toString(36)}`,
      label: cleaned,
      type: selectedSection.type,
      data: cloneData(selectedSection.data ?? {}),
      tags: [],
      category: String(selectedSection.type),
      createdAt: Date.now(),
    };
    persistSavedTemplates([nextTemplate, ...savedTemplates]);
    setLibraryCategory("saved");
    setShowSectionLibrary(true);
  };

  const updateSavedTemplate = (templateId: string, updater: (tpl: SavedSectionTemplate) => SavedSectionTemplate) => {
    const next = savedTemplates.map((tpl) => (tpl.id === templateId ? updater(tpl) : tpl));
    persistSavedTemplates(next);
  };

  const renameTemplate = (templateId: string) => {
    const tpl = savedTemplates.find((item) => item.id === templateId);
    if (!tpl) return;
    const nextLabel = window.prompt("Template name", tpl.label);
    if (!nextLabel) return;
    const cleaned = nextLabel.trim();
    if (!cleaned) return;
    updateSavedTemplate(templateId, (item) => ({ ...item, label: cleaned }));
  };

  const editTemplateTags = (templateId: string) => {
    const tpl = savedTemplates.find((item) => item.id === templateId);
    if (!tpl) return;
    const next = window.prompt("Tags (comma separated)", (tpl.tags ?? []).join(", "));
    if (next == null) return;
    const tags = next
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    updateSavedTemplate(templateId, (item) => ({ ...item, tags }));
  };

  const editTemplateCategory = (templateId: string) => {
    const tpl = savedTemplates.find((item) => item.id === templateId);
    if (!tpl) return;
    const next = window.prompt("Category", tpl.category ?? "");
    if (next == null) return;
    const cleaned = next.trim();
    updateSavedTemplate(templateId, (item) => ({ ...item, category: cleaned || undefined }));
  };

  const deleteTemplate = (templateId: string) => {
    const tpl = savedTemplates.find((item) => item.id === templateId);
    if (!tpl) return;
    const ok = window.confirm(`Delete template "${tpl.label}"?`);
    if (!ok) return;
    persistSavedTemplates(savedTemplates.filter((item) => item.id !== templateId));
  };

  const exportTemplates = () => {
    if (!savedTemplates.length) {
      toast.error("No saved templates.");
      return;
    }
    const payload = JSON.stringify(savedTemplates, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "section-templates.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTemplatesFromText = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      const normalized = normalizeSavedTemplates(parsed);
      if (!normalized.length) {
        toast.error("No templates found.");
        return;
      }
      const existingIds = new Set(savedTemplates.map((tpl) => tpl.id));
      const merged = normalized.filter((tpl) => !existingIds.has(tpl.id));
      persistSavedTemplates([...merged, ...savedTemplates]);
      toast.success("Templates imported.");
    } catch {
      toast.error("Invalid JSON file.");
    }
  };

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (text) importTemplatesFromText(text);
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleLibraryDragStart = (item: LibraryItem) => (event: React.DragEvent<HTMLDivElement>) => {
    setLibraryDragItem(item);
    setLibraryDragOverIndex(null);
    event.dataTransfer.effectAllowed = "copy";
    try {
      event.dataTransfer.setData("application/x-page-section", JSON.stringify(item));
    } catch {
      // ignore
    }
  };

  const handleLibraryDragEnd = () => {
    setLibraryDragItem(null);
    setLibraryDragOverIndex(null);
  };

  const handleInsertDrop = (index: number) => async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    let payload: LibraryItem | null = null;
    try {
      const raw = event.dataTransfer.getData("application/x-page-section");
      if (raw) payload = JSON.parse(raw) as LibraryItem;
    } catch {
      payload = null;
    }
    const item = payload ?? libraryDragItem;
    if (!item) return;
    await insertSectionFromLibrary(item, index);
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
    const publishAtIso = fromDateTimeLocal(publishAtLocal);
    const unpublishAtIso = fromDateTimeLocal(unpublishAtLocal);
    const nextErrors: PageFieldErrors = {};
    if (!name.trim()) nextErrors.name = "اسم الصفحة مطلوب";
    if (!normalized) nextErrors.slug = "slug مطلوب";
    if (normalized && !isValidSlug(normalized)) nextErrors.slug = "Slug غير صالح. لازم يبدأ بـ / وبدون مسافات";
    if (publishAtIso && unpublishAtIso && new Date(unpublishAtIso) <= new Date(publishAtIso)) {
      nextErrors.unpublishAt = "وقت إلغاء النشر لازم يكون بعد وقت النشر";
    }

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
          publishAt: publishAtIso,
          unpublishAt: unpublishAtIso,
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
      await actions.updatePage.mutateAsync({ id, body: { status: "PUBLISHED", publishAt: null } });
      setStatus("PUBLISHED");
      setPublishAtLocal("");
    } catch {
      // toast handled in hook
    }
  };

  const unpublishNow = async () => {
    if (!id) return;
    try {
      await actions.updatePage.mutateAsync({ id, body: { status: "DRAFT", publishAt: null, unpublishAt: null } });
      setStatus("DRAFT");
      setPublishAtLocal("");
      setUnpublishAtLocal("");
    } catch {
      // toast handled in hook
    }
  };

  const loadRevisions = async () => {
    if (!id) return;
    try {
      setRevisionsBusy(true);
      const items = await listPageRevisions(id, 30);
      setRevisions(items);
    } catch {
      toast.error("فشل تحميل الإصدارات");
    } finally {
      setRevisionsBusy(false);
    }
  };

  const openRevisionsModal = async () => {
    setRevisionsOpen(true);
    await loadRevisions();
  };

  const handleRestoreRevision = async (revision: PageRevision) => {
    if (!id) return;
    const ok = window.confirm(`استعادة نسخة بتاريخ ${new Date(revision.createdAt).toLocaleString()} ؟`);
    if (!ok) return;
    try {
      setRestoringRevisionId(revision.id);
      await restorePageRevision(id, revision.id, "Restore from admin");
      await qc.invalidateQueries({ queryKey: ["pages", id] });
      await loadRevisions();
      toast.success("تمت الاستعادة");
    } catch {
      toast.error("فشل استعادة النسخة");
    } finally {
      setRestoringRevisionId(null);
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

  const canMoveUp = selectedSectionIndex > 0;
  const canMoveDown = selectedSectionIndex >= 0 && selectedSectionIndex < localSections.length - 1;
  const canUndo = historyIndexRef.current >= 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const historyItems = useMemo(() => {
    return historyRef.current.map((entry, idx) => {
      const summary = diffSummary(entry.prevData, entry.nextData);
      const section = localSections.find((s) => String(s.id) === String(entry.sectionId));
      return {
        entry,
        idx,
        summary,
        sectionLabel: section?.type ?? "Section",
      };
    });
  }, [historyVersion, localSections]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;

      const isMod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isMod && !event.altKey) {
        if (key === "c") {
          event.preventDefault();
          copySelection();
          return;
        }
        if (key === "v") {
          event.preventDefault();
          void pasteSelection();
          return;
        }
        if (key === "d") {
          event.preventDefault();
          void duplicateSelection();
          return;
        }
      }

      if (event.altKey && selectedElement && elementArrayInfo) {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          void moveSelectedElement("UP");
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          void moveSelectedElement("DOWN");
        }
        return;
      }

      if (event.shiftKey && selectedSection) {
        if (event.key === "ArrowUp" && canMoveUp) {
          event.preventDefault();
          void moveSection(selectedSection.id, "UP");
        }
        if (event.key === "ArrowDown" && canMoveDown) {
          event.preventDefault();
          void moveSection(selectedSection.id, "DOWN");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedElement,
    elementArrayInfo,
    selectedSection,
    canMoveUp,
    canMoveDown,
    moveSelectedElement,
    moveSection,
    copySelection,
    pasteSelection,
    duplicateSelection,
  ]);

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
            <Button
              variant="ghost"
              size="sm"
              disabled={!canUndo}
              onClick={undoLast}
              title="Undo"
            >
              Undo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canRedo}
              onClick={redoLast}
              title="Redo"
            >
              Redo
            </Button>
            {autosaveState !== "idle" ? (
              <div
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs",
                  autosaveState === "saving"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                ].join(" ")}
              >
                {autosaveState === "saving" ? "Autosaving..." : "Saved"}
              </div>
            ) : null}
            <Button variant="ghost" size="sm" onClick={openRevisionsModal}>
              الإصدارات
            </Button>
            {page.status !== "PUBLISHED" ? (
              <Button variant="secondary" onClick={() => setPageStatus("PUBLISHED")}>نشر</Button>
            ) : (
              <Button variant="ghost" onClick={() => setPageStatus("DRAFT")}>إلغاء النشر</Button>
            )}
            <Button variant="primary" onClick={savePage} isLoading={actions.updatePage.isPending}>حفظ الصفحة</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <Input
            label="وقت النشر (اختياري)"
            type="datetime-local"
            value={publishAtLocal}
            error={pageErrors.publishAt}
            onValueChange={(value) => {
              setPublishAtLocal(value);
              setPageErrors((p) => ({ ...p, publishAt: undefined, unpublishAt: undefined }));
            }}
          />
          <Input
            label="وقت إلغاء النشر (اختياري)"
            type="datetime-local"
            value={unpublishAtLocal}
            error={pageErrors.unpublishAt}
            onValueChange={(value) => {
              setUnpublishAtLocal(value);
              setPageErrors((p) => ({ ...p, unpublishAt: undefined }));
            }}
          />
        </div>
        <div className="mt-2 text-xs opacity-70">
          إذا الحالة `PUBLISHED`، سيتم إظهار الصفحة فقط داخل نافذة الوقت بين النشر وإلغاء النشر.
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {showLeftPanel ? (
          <div
            className={
              leftPanelFullScreen
                ? "fixed inset-0 z-50 flex flex-col gap-4 overflow-auto bg-black/90 p-6"
                : "flex w-full flex-col gap-4 lg:shrink-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-auto"
            }
            style={leftPanelFullScreen ? undefined : leftPanelStyle}
          >
            {leftPanelFullScreen ? (
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold">Sections</div>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => setLeftPanelFullScreen(false)}
                >
                  Exit full screen
                </Button>
              </div>
            ) : null}
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
              <div className="flex items-center gap-2">
                <div className="text-xs opacity-70">{sections.length} sections</div>
                <Button
                  type="button"
                  size="xs"
                  variant={leftPanelFullScreen ? "secondary" : "ghost"}
                  onClick={() => {
                    setLeftPanelFullScreen((v) => !v);
                    setCanvasFullScreen(false);
                  }}
                >
                  {leftPanelFullScreen ? "Exit full" : "Full screen"}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant={showSectionLibrary ? "secondary" : "ghost"}
                  onClick={() => setShowSectionLibrary((v) => !v)}
                >
                  {showSectionLibrary ? "Hide library" : "Library"}
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => setLeftPanelCollapsed(true)}
                >
                  Collapse
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {multiSelectionActive ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-2 text-[11px]">
                  <span className="text-white/70">{multiSelectedSections.length} selected</span>
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    disabled={selectionBusy}
                    onClick={duplicateSectionsBulk}
                  >
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    disabled={selectionBusy}
                    onClick={() => setVisibilityBulk(true)}
                  >
                    Show
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    disabled={selectionBusy}
                    onClick={() => setVisibilityBulk(false)}
                  >
                    Hide
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="danger"
                    disabled={selectionBusy}
                    onClick={() => setConfirmBulkDelete(true)}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      if (selectedSectionId) {
                        setMultiSelectedSectionIds([String(selectedSectionId)]);
                        return;
                      }
                      setMultiSelectedSectionIds([]);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}
              {localSections.length ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={localSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {showInsertPoints ? renderInsertZone(0, localSections.length === 0) : null}
                      {localSections.map((s, idx) => (
                        <React.Fragment key={s.id}>
                          <SortableSectionCard
                            section={s}
                            index={idx}
                            isSelected={String(selectedSectionId ?? "") === String(s.id)}
                            isMultiSelected={
                              multiSelectedSectionIds.includes(String(s.id)) &&
                              String(selectedSectionId ?? "") !== String(s.id)
                            }
                            previewData={getTranslatedSectionData(s, idx)}
                            theme={theme}
                            onSelect={(event) => handleSelectSectionFromList(String(s.id), event)}
                            onEdit={() => openEditSection(s)}
                            onDelete={() => setConfirmDeleteSectionId(s.id)}
                            onToggleVisible={() => {
                              if (!id) return;
                              actions.updateSection.mutateAsync({ pageId: id, sectionId: s.id, body: { isVisible: !s.isVisible } }).catch(() => {});
                            }}
                          />
                          {showInsertPoints ? renderInsertZone(idx + 1) : null}
                        </React.Fragment>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                showInsertPoints ? renderInsertZone(0, true) : <div className="text-sm opacity-70">No sections yet.</div>
              )}
            </div>
          </div>

          {showSectionLibrary ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-lg font-semibold">Section library</div>
                <div className="text-xs opacity-70">
                  {libraryCategory === "saved" ? "Saved" : sectionLibraryType}
                </div>
              </div>
              {libraryCategory === "saved" ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Button type="button" size="xs" variant="ghost" onClick={exportTemplates}>
                    Export
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => importTemplatesInputRef.current?.click()}
                  >
                    Import
                  </Button>
                  <input
                    ref={importTemplatesInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={handleImportTemplates}
                  />
                </div>
              ) : null}

              <div className="space-y-3">
                <Input
                  label="Search"
                  value={librarySearch}
                  onValueChange={setLibrarySearch}
                  placeholder="Search templates"
                />

                <div className="flex flex-wrap gap-2">
                  {LIBRARY_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={[
                        "rounded-xl border px-3 py-1 text-[11px] transition",
                        libraryCategory === category.id
                          ? "border-accent-500/50 bg-accent-500/15 text-accent-200"
                          : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white/80",
                      ].join(" ")}
                      onClick={() => setLibraryCategory(category.id)}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>

                {libraryCategory === "saved" ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-white/60">
                        Sort
                        <select
                          className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs"
                          value={librarySort}
                          onChange={(event) => setLibrarySort(event.target.value as any)}
                        >
                          <option value="newest">Newest</option>
                          <option value="oldest">Oldest</option>
                          <option value="name-asc">Name A-Z</option>
                          <option value="name-desc">Name Z-A</option>
                        </select>
                      </label>
                      <label className="text-xs text-white/60">
                        Category
                        <select
                          className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs"
                          value={savedCategoryFilter ?? ""}
                          onChange={(event) => setSavedCategoryFilter(event.target.value || null)}
                        >
                          <option value="">All</option>
                          {savedCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {savedTags.length ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={[
                            "rounded-lg border px-2 py-1 text-[10px]",
                            !savedTagFilter
                              ? "border-accent-500/40 bg-accent-500/10 text-accent-200"
                              : "border-white/10 bg-white/[0.02] text-white/60 hover:text-white/80",
                          ].join(" ")}
                          onClick={() => setSavedTagFilter(null)}
                        >
                          All tags
                        </button>
                        {savedTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className={[
                              "rounded-lg border px-2 py-1 text-[10px]",
                              savedTagFilter === tag
                                ? "border-accent-500/40 bg-accent-500/10 text-accent-200"
                                : "border-white/10 bg-white/[0.02] text-white/60 hover:text-white/80",
                            ].join(" ")}
                            onClick={() => setSavedTagFilter(tag)}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  {libraryCategory === "saved" ? (
                    <div className="text-xs text-white/60">
                      {savedTemplates.length ? `${savedTemplates.length} saved templates` : "No saved templates yet."}
                    </div>
                  ) : (
                    <Select
                      label="Type"
                      value={sectionLibraryType}
                      onChange={(e) => setSectionLibraryType(e.target.value as PageSectionType)}
                      options={filteredSectionTypes.map((t) => ({ value: t.value, label: t.label }))}
                    />
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setSectionInsertIndex(localSections.length)}
                  >
                    Insert at end
                  </Button>
                </div>
              </div>

              <div className="mt-2 text-xs text-white/60">
                Insert position:{" "}
                <span className="text-white/80">
                  {sectionInsertIndex == null ? "End" : `#${sectionInsertIndex + 1}`}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {libraryItems.map((item) => {
                  const isSaved = item.source === "saved";
                  const templateId = item.id.startsWith("saved:") ? item.id.slice(6) : item.id;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 hover:border-accent-500/40 transition"
                      draggable
                      onDragStart={handleLibraryDragStart(item)}
                      onDragEnd={handleLibraryDragEnd}
                    >
                      <div className="h-28 overflow-hidden rounded-lg border border-white/[0.08] bg-black/30">
                        <ThemePreview theme={theme} className="h-full p-2">
                          <React.Suspense fallback={<div className="p-4 text-[11px] text-white/50">Loading...</div>}>
                            <div className="scale-[0.6] origin-top-right">
                              <LazySectionPreview type={item.type} data={item.data} />
                            </div>
                          </React.Suspense>
                        </ThemePreview>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-medium">{item.label}</div>
                        {isSaved ? (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                            Saved
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          size="xs"
                          variant="secondary"
                          disabled={libraryBusy}
                          onClick={() => insertSectionFromLibrary(item, sectionInsertIndex)}
                        >
                          Insert
                        </Button>
                      </div>
                      <div className="mt-1 text-[10px] text-white/50">Drag to insert between sections.</div>
                      {isSaved ? (
                        <>
                          {item.tags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <span
                                  key={`${item.id}-${tag}`}
                                  className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/60"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {item.category ? (
                            <div className="mt-2 text-[10px] text-white/50">Category: {item.category}</div>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Button type="button" size="xs" variant="ghost" onClick={() => renameTemplate(templateId)}>
                              Rename
                            </Button>
                            <Button type="button" size="xs" variant="ghost" onClick={() => editTemplateTags(templateId)}>
                              Tags
                            </Button>
                            <Button type="button" size="xs" variant="ghost" onClick={() => editTemplateCategory(templateId)}>
                              Category
                            </Button>
                            <Button type="button" size="xs" variant="danger" onClick={() => deleteTemplate(templateId)}>
                              Delete
                            </Button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
                {!libraryItems.length ? (
                  <div className="text-xs text-white/60">No templates match this filter.</div>
                ) : null}
              </div>
            </div>
          ) : null}
          </div>
        ) : null}

        {showLeftPanel && !leftPanelFullScreen ? (
          <div
            className={
              "hidden lg:block w-1 shrink-0 cursor-col-resize rounded-full " +
              (leftPanelResizing ? "bg-accent-500/40" : "bg-white/10")
            }
            onPointerDown={startLeftResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sections panel"
          />
        ) : null}

        {!leftPanelFullScreen ? (
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className={canvasPanelClass}>
          {canvasFullScreen ? (
            <Button
              type="button"
              size="xs"
              variant="secondary"
              className="absolute right-4 top-4 z-20"
              onClick={() => setCanvasFullScreen(false)}
            >
              Exit full screen
            </Button>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Canvas</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant={leftPanelCollapsed ? "secondary" : "ghost"}
                onClick={() => {
                  setLeftPanelCollapsed((v) => !v);
                  setLeftPanelFullScreen(false);
                }}
              >
                {leftPanelCollapsed ? "Show list" : "Hide list"}
              </Button>
              <Button
                type="button"
                size="xs"
                variant={leftPanelFullScreen ? "secondary" : "ghost"}
                onClick={() => {
                  setLeftPanelFullScreen((v) => !v);
                  setCanvasFullScreen(false);
                }}
              >
                {leftPanelFullScreen ? "Exit list" : "List full"}
              </Button>
              <Button
                type="button"
                size="xs"
                variant={canvasFullScreen ? "secondary" : "ghost"}
                onClick={() => {
                  setCanvasFullScreen((v) => !v);
                  setLeftPanelFullScreen(false);
                }}
              >
                {canvasFullScreen ? "Exit full screen" : "Canvas full"}
              </Button>
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

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-white/60">Canvas width</span>
              <button
                type="button"
                className={
                  "rounded-lg border px-2 py-1 text-[11px] " +
                  (canvasWidthMode === "fit"
                    ? "border-accent-500/40 bg-accent-500/10 text-accent-200"
                    : "border-white/10 bg-white/[0.02] text-white/60 hover:text-white/80")
                }
                onClick={() => setCanvasWidthMode((v) => (v === "fit" ? "custom" : "fit"))}
              >
                {canvasWidthMode === "fit" ? "Fit on" : "Fit off"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={320}
                max={1600}
                step={10}
                value={canvasWidth}
                onChange={(event) => {
                  setCanvasWidthMode("custom");
                  setCanvasWidth(Number(event.target.value));
                }}
                className="w-40"
              />
              <span className="text-[11px] text-white/60">
                {canvasWidthMode === "fit" ? "Fit" : `${canvasWidth}px`}
              </span>
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
                <div className={`mx-auto w-full ${previewWidthClass}`} style={canvasWidthStyle}>
                  <iframe
                    key={`preview-${previewBump}`}
                    title="preview"
                    src={previewUrl}
                    className={`${canvasPreviewHeightClass} w-full`}
                  />
                </div>
              ) : (
                <div className="p-6 text-sm text-white/60">Preview unavailable.</div>
              )
            ) : (
              <div ref={canvasScrollRef} className={`relative ${canvasViewportClass} overflow-auto`}>
                <ThemePreview key={`live-${previewBump}`} theme={theme} className="min-h-[60vh] p-4">
                  {scopedPreviewCss ? <style>{scopedPreviewCss}</style> : null}
                  <div
                    id="cms-preview-root"
                    className={`mx-auto w-full ${previewWidthClass}`}
                    style={canvasWidthStyle}
                    dir={canvasDir}
                  >
                    {canvasSections.length ? (
                      <PageRenderer
                        sections={canvasSections}
                        inlineEditing={inlineEditing && inlineEditingAvailable}
                        onInlineEdit={handleInlineEdit}
                        selectedSectionId={selectedSectionId}
                        onSectionSelect={handleSelectSection}
                        selectedElement={selectedElement}
                        onElementSelect={handleSelectElement}
                      />
                    ) : (
                      <div
                        className={[
                          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-sm text-white/60 transition",
                          canvasDropActive
                            ? "border-accent-500/50 bg-accent-500/10 text-accent-100"
                            : "border-white/[0.12] bg-white/[0.02] hover:border-accent-500/40",
                        ].join(" ")}
                        onClick={() => {
                          setSectionInsertIndex(0);
                          setShowSectionLibrary(true);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setLibraryDragOverIndex(0);
                        }}
                        onDragLeave={() => {
                          if (libraryDragOverIndex === 0) setLibraryDragOverIndex(null);
                        }}
                        onDrop={handleInsertDrop(0)}
                      >
                        <div className="text-sm font-semibold">Drop a section here</div>
                        <div className="text-xs opacity-80">or click to open the library</div>
                        <Button
                          type="button"
                          size="xs"
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSectionInsertIndex(0);
                            setShowSectionLibrary(true);
                          }}
                        >
                          Open library
                        </Button>
                      </div>
                    )}
                  </div>
                </ThemePreview>
                {canvasGuides ? (
                  <div className="pointer-events-none absolute inset-0">
                    <div
                      className={[
                        "absolute left-0 right-0 h-px",
                        canvasGuides.snapY ? "bg-accent-500/60" : "bg-white/20",
                      ].join(" ")}
                      style={{ top: canvasGuides.y }}
                    />
                    <div
                      className={[
                        "absolute top-0 bottom-0 w-px",
                        canvasGuides.snapX ? "bg-accent-500/60" : "bg-white/20",
                      ].join(" ")}
                      style={{ left: canvasGuides.x }}
                    />
                  </div>
                ) : null}
                {canvasActionBar && selectedSection ? (
                  <div className="pointer-events-none absolute inset-0">
                    <div
                      className="pointer-events-auto absolute z-20 flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-black/80 p-2 text-[11px] shadow-lg shadow-black/40"
                      style={{
                        top: canvasActionBar.top,
                        left: canvasActionBar.left,
                        width: canvasActionBar.width,
                        maxWidth: "calc(100% - 16px)",
                      }}
                    >
                      {selectedElement ? (
                        <>
                          <Button
                            type="button"
                            size="xs"
                            variant="secondary"
                            onClick={openElementModal}
                            disabled={!elementQuickFields.length}
                          >
                            Edit element
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="secondary"
                            onClick={handleDuplicateElement}
                            disabled={!elementCanDuplicate}
                          >
                            Dup element
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant={elementIsVisible ? "ghost" : "secondary"}
                            onClick={handleToggleElementVisibility}
                            disabled={!elementCanToggleVisibility}
                          >
                            {elementIsVisible ? "Hide element" : "Show element"}
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="danger"
                            onClick={handleDeleteElement}
                            disabled={!elementCanDelete}
                          >
                            Delete element
                          </Button>
                          <span className="mx-1 h-4 w-px bg-white/10" />
                        </>
                      ) : null}
                      <Button type="button" size="xs" variant="secondary" onClick={() => openEditSection(selectedSection)}>
                        Edit
                      </Button>
                      <Button type="button" size="xs" variant="secondary" onClick={duplicateSelectedSection} isLoading={selectionBusy}>
                        Duplicate
                      </Button>
                      <Button type="button" size="xs" variant={selectedSection.isVisible ? "ghost" : "secondary"} onClick={toggleSelectedVisibility} disabled={selectionBusy}>
                        {selectedSection.isVisible ? "Hide" : "Show"}
                      </Button>
                      <Button type="button" size="xs" variant="ghost" disabled={!canMoveUp} onClick={() => moveSection(selectedSection.id, "UP")}>
                        Move up
                      </Button>
                      <Button type="button" size="xs" variant="ghost" disabled={!canMoveDown} onClick={() => moveSection(selectedSection.id, "DOWN")}>
                        Move down
                      </Button>
                      <Button type="button" size="xs" variant="danger" onClick={() => setConfirmDeleteSectionId(selectedSection.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
        </div>
        ) : null}

        {!canvasFullScreen && !leftPanelFullScreen ? (
          <div
            className={
              "hidden lg:block w-1 shrink-0 cursor-col-resize rounded-full " +
              (rightPanelResizing ? "bg-accent-500/40" : "bg-white/10")
            }
            onPointerDown={startRightResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize inspector panel"
          />
        ) : null}

        {!canvasFullScreen && !leftPanelFullScreen ? (
        <div
          className="w-full lg:shrink-0 lg:self-start lg:sticky lg:top-4"
          style={rightPanelStyle}
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {selectedSection ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
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
                        setSelectedElement(null);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="mt-3 inline-flex w-full flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-black/30 p-1">
                    <Button
                      type="button"
                      size="xs"
                      variant={inspectorTab === "content" ? "secondary" : "ghost"}
                      onClick={() => setInspectorTab("content")}
                    >
                      Content
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant={inspectorTab === "style" ? "secondary" : "ghost"}
                      onClick={() => setInspectorTab("style")}
                    >
                      Style
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant={inspectorTab === "history" ? "secondary" : "ghost"}
                      onClick={() => setInspectorTab("history")}
                    >
                      History
                    </Button>
                  </div>
                </div>

                {inspectorTab === "content" ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                      <div className="text-xs font-semibold">Section actions</div>
                      <div className="mt-2 flex flex-wrap gap-2">
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
                          variant="secondary"
                          onClick={saveSectionAsTemplate}
                        >
                          Save as template
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
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                      <div className="text-xs font-semibold">Element</div>
                      {selectedElement ? (
                        <div className="mt-2 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold">
                              Element: <span className="text-white/70">{selectedElement.kind}</span>
                            </div>
                            <Button
                              type="button"
                              size="xs"
                              variant="ghost"
                              onClick={() => setSelectedElement(null)}
                            >
                              Clear element
                            </Button>
                          </div>
                          {selectedElement.label ? (
                            <div className="text-[11px] text-white/60">{selectedElement.label}</div>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="xs"
                              variant="secondary"
                              onClick={openElementModal}
                              disabled={!elementQuickFields.length}
                            >
                              Edit element
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="secondary"
                              onClick={handleDuplicateElement}
                              disabled={!elementCanDuplicate}
                            >
                              Duplicate
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant={elementIsVisible ? "ghost" : "secondary"}
                              onClick={handleToggleElementVisibility}
                              disabled={!elementCanToggleVisibility}
                            >
                              {elementIsVisible ? "Hide" : "Show"}
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="danger"
                              onClick={handleDeleteElement}
                              disabled={!elementCanDelete}
                            >
                              Delete
                            </Button>
                          </div>
                          {!elementArrayInfo ? (
                            <div className="text-[11px] text-white/50">
                              Duplicate/Delete apply to list items only.
                            </div>
                          ) : null}
                          {elementQuickFields.length ? (
                            <div className="space-y-2">
                              <div className="text-xs font-semibold">Quick edits</div>
                              <div className="grid gap-3">
                                {elementQuickFields.map((field) => {
                                  const meta = buildQuickFieldMeta(field);
                                  return (
                                    <div key={field.key} className="space-y-2">
                                      <Input
                                        label={field.label}
                                        value={field.value}
                                        type={field.type === "url" ? "url" : "text"}
                                        error={meta.error}
                                        hint={meta.hint}
                                        onValueChange={(value) => handleQuickFieldChange(field.path, value)}
                                      />
                                      {meta.presets?.length ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {meta.presets.map((preset) => (
                                            <button
                                              key={`${field.key}-${preset.value}`}
                                              type="button"
                                              className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 transition hover:border-accent-500/40 hover:text-white"
                                              onClick={() => handleQuickFieldChange(field.path, preset.value)}
                                            >
                                              {preset.label}
                                            </button>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-white/60">
                          Click a text, button, image, or card to edit element content.
                        </div>
                      )}
                    </div>
                  </div>
                ) : inspectorTab === "style" ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                      <div className="text-xs font-semibold">Element styles</div>
                      {selectedElement ? (
                        <div className="mt-2 space-y-3">
                          {selectedElement.label ? (
                            <div className="text-[11px] text-white/60">{selectedElement.label}</div>
                          ) : null}
                          {elementStylePresets.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {elementStylePresets.map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 transition hover:border-accent-500/40 hover:text-white"
                                  onClick={() => applyElementStylePreset(preset.tokens)}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                          {resolvedElementTokensPath ? (
                            <div className="max-h-[36vh] overflow-auto">
                              <ResponsiveTokensPanel
                                tokens={selectedElementTokens ?? {}}
                                onChange={handleSelectedElementTokensChange}
                              />
                            </div>
                          ) : (
                            <div className="text-xs text-white/60">
                              Element styling inherits section styles. Use section styles to adjust tokens.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-white/60">Select an element to style.</div>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-xs font-semibold"
                        onClick={() => setShowInlineStyling((v) => !v)}
                      >
                        <span>Section styles</span>
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
                      ) : (
                        <div className="mt-2 text-xs text-white/60">Enable to edit section spacing and colors.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold">History</div>
                      <div className="text-[10px] text-white/50">{historyItems.length} changes</div>
                    </div>
                    {historyItems.length ? (
                      <div className="mt-3 max-h-[32vh] space-y-2 overflow-auto">
                        {historyItems
                          .slice()
                          .reverse()
                          .map((item) => {
                            const isActive = item.idx === historyIndexRef.current;
                            const isFuture = item.idx > historyIndexRef.current;
                            const timeLabel = new Date(item.entry.ts).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            return (
                              <div
                                key={`${item.entry.sectionId}-${item.idx}`}
                                className={[
                                  "rounded-lg border px-2.5 py-2 text-[11px]",
                                  isActive
                                    ? "border-accent-500/50 bg-accent-500/10 text-accent-100"
                                    : isFuture
                                      ? "border-white/5 bg-white/[0.02] text-white/35"
                                      : "border-white/10 bg-white/[0.03] text-white/70",
                                ].join(" ")}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold">{item.sectionLabel}</span>
                                  <span className="text-[10px] opacity-60">{timeLabel}</span>
                                </div>
                                {item.summary.paths.length ? (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {item.summary.paths.map((path) => (
                                      <span
                                        key={path}
                                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px]"
                                      >
                                        {path}
                                      </span>
                                    ))}
                                    {item.summary.total > item.summary.paths.length ? (
                                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] opacity-70">
                                        +{item.summary.total - item.summary.paths.length} more
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div className="mt-1 text-[10px] opacity-60">Mixed changes</div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-white/60">No changes yet.</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-xs text-white/60">
                Select a section in the canvas to edit styling and actions.
              </div>
            )}
          </div>
        </div>
      ) : null}

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

            <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sticky top-4 self-start max-h-[calc(100vh-200px)] overflow-auto">
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
        open={elementModalOpen && !!selectedElement}
        title="Edit element"
        description={selectedElement ? `${selectedElement.kind}${selectedElement.label ? ` - ${selectedElement.label}` : ""}` : undefined}
        onCancel={() => setElementModalOpen(false)}
        widthClassName="max-w-2xl"
        footer={
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={saveElementModal}
              disabled={!elementModalFields.length}
            >
              Save
            </Button>
          </div>
        }
      >
        {elementModalFields.length ? (
          <div className="grid gap-3">
            {elementModalFields.map((field) => {
              const meta = buildQuickFieldMeta(field);
              return (
                <div key={field.key} className="space-y-2">
                  <Input
                    label={field.label}
                    value={field.value}
                    type={field.type === "url" ? "url" : "text"}
                    error={meta.error}
                    hint={meta.hint}
                    onValueChange={(value) => {
                      setElementModalFields((prev) =>
                        prev.map((item) => (item.key === field.key ? { ...item, value } : item))
                      );
                    }}
                  />
                  {meta.presets?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {meta.presets.map((preset) => (
                        <button
                          key={`${field.key}-${preset.value}`}
                          type="button"
                          className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 transition hover:border-accent-500/40 hover:text-white"
                          onClick={() => {
                            setElementModalFields((prev) =>
                              prev.map((item) =>
                                item.key === field.key ? { ...item, value: preset.value } : item
                              )
                            );
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-white/60">No editable fields.</div>
        )}
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

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 sticky top-4 self-start max-h-[70vh] overflow-auto">
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

      <Modal
        open={revisionsOpen}
        title="إصدارات الصفحة"
        description="استرجاع نسخة سابقة كاملة (البيانات + الأقسام)."
        onCancel={() => setRevisionsOpen(false)}
        widthClassName="max-w-3xl"
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={loadRevisions} disabled={revisionsBusy}>
              تحديث
            </Button>
            <Button variant="secondary" onClick={() => setRevisionsOpen(false)}>
              إغلاق
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {revisionsBusy ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
              <Spinner />
              جاري تحميل الإصدارات...
            </div>
          ) : revisions.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              لا توجد إصدارات محفوظة بعد.
            </div>
          ) : (
            revisions.map((rev) => (
              <div key={rev.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold text-white">
                      {new Date(rev.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-white/60">
                      {rev.reason || "Update"} • {rev.status} • {rev.slug}
                    </div>
                    {rev.createdBy ? (
                      <div className="text-xs text-white/50">by {rev.createdBy}</div>
                    ) : null}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={restoringRevisionId === rev.id}
                    disabled={!!restoringRevisionId}
                    onClick={() => handleRestoreRevision(rev)}
                  >
                    استعادة
                  </Button>
                </div>
              </div>
            ))
          )}
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
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete sections"
        message={`Delete ${multiSelectedSections.length} selected sections?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          setConfirmBulkDelete(false);
          void deleteSectionsBulk();
        }}
        onCancel={() => setConfirmBulkDelete(false)}
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












