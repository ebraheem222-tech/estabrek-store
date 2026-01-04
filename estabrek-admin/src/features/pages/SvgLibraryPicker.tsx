import React, { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import {
  SVG_LIBRARY_SHAPES,
  SVG_LIBRARY_SHAPE_CATEGORIES,
  SVG_LIBRARY_SHAPE_LABELS_AR,
  SVG_LIBRARY_ICONS,
  SVG_LIBRARY_ICON_CATEGORIES,
  SVG_LIBRARY_PATTERNS,
  SVG_LIBRARY_PATTERN_CATEGORIES,
  type SvgLibraryGroup,
} from "../../cms/decorations/svgLibrary";

type Option = { value: string; label: string };

const GROUP_OPTIONS: Option[] = [
  { value: "shapes", label: "أشكال" },
  { value: "icons", label: "أيقونات" },
  { value: "patterns", label: "أنماط" },
];

const CATEGORY_LABELS_AR: Record<string, string> = {
  waves: "موجات",
  triangles: "مثلثات وزوايا",
  curves: "منحنيات وأقواس",
  geometric: "أشكال هندسية",
  blobs: "أشكال عضوية",
  decorative: "زخارف",
  abstract: "تجريدي",
  masks: "أقنعة",
  frames: "إطارات",

  ui: "واجهة",
  ecommerce: "متجر",
  social: "اجتماعي",

  patterns: "أنماط",
};

function getCategoryMap(group: SvgLibraryGroup): Record<string, readonly string[]> {
  if (group === "icons") return SVG_LIBRARY_ICON_CATEGORIES as unknown as Record<string, readonly string[]>;
  if (group === "patterns") return SVG_LIBRARY_PATTERN_CATEGORIES as unknown as Record<string, readonly string[]>;
  return SVG_LIBRARY_SHAPE_CATEGORIES as unknown as Record<string, readonly string[]>;
}

function getSvgMarkup(group: SvgLibraryGroup, name: string): string {
  if (group === "icons") return (SVG_LIBRARY_ICONS as Record<string, string>)[name] || "";
  if (group === "patterns") return (SVG_LIBRARY_PATTERNS as Record<string, string>)[name] || "";
  return (SVG_LIBRARY_SHAPES as Record<string, string>)[name] || "";
}

function getItemLabel(group: SvgLibraryGroup, name: string): string {
  if (group === "shapes") return SVG_LIBRARY_SHAPE_LABELS_AR[name as keyof typeof SVG_LIBRARY_SHAPE_LABELS_AR] || name;
  return name;
}

function firstKey(obj: Record<string, readonly string[]>): string {
  const keys = Object.keys(obj);
  return keys.length ? keys[0] : "";
}

function firstItem(obj: Record<string, readonly string[]>, category: string): string {
  const list = obj[category] || [];
  return list.length ? list[0] : "";
}

export function SvgLibraryPicker({
  onInsert,
}: {
  onInsert: (svgMarkup: string) => void;
}) {
  const [group, setGroup] = useState<SvgLibraryGroup>("shapes");
  const categoryMap = useMemo(() => getCategoryMap(group), [group]);
  const [category, setCategory] = useState<string>(() => firstKey(getCategoryMap("shapes")) || "waves");
  const [name, setName] = useState<string>(() => firstItem(getCategoryMap("shapes"), category) || "wave1");

  const categoryOptions: Option[] = useMemo(
    () =>
      Object.keys(categoryMap).map((c) => ({
        value: c,
        label: CATEGORY_LABELS_AR[c] || c,
      })),
    [categoryMap],
  );

  const itemOptions: Option[] = useMemo(() => {
    const items = categoryMap[category] || [];
    return items.map((n) => ({ value: n, label: getItemLabel(group, n) }));
  }, [categoryMap, category, group]);

  const selectedSvg = useMemo(() => getSvgMarkup(group, name), [group, name]);

  const handleGroupChange = (v: string) => {
    const nextGroup = (v as SvgLibraryGroup) || "shapes";
    const nextCategories = getCategoryMap(nextGroup);
    const nextCategory = firstKey(nextCategories) || "";
    const nextName = nextCategory ? firstItem(nextCategories, nextCategory) : "";
    setGroup(nextGroup);
    setCategory(nextCategory);
    setName(nextName);
  };

  const handleCategoryChange = (v: string) => {
    const nextCategory = v || "";
    const nextName = nextCategory ? firstItem(categoryMap, nextCategory) : "";
    setCategory(nextCategory);
    setName(nextName);
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2 md:grid-cols-3">
        <Select value={group} onChange={handleGroupChange} options={GROUP_OPTIONS} />
        <Select value={category} onChange={handleCategoryChange} options={categoryOptions} />
        <Select value={name} onChange={(v) => setName(v)} options={itemOptions} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div
          className="flex-1 min-h-[56px] rounded-xl border border-white/[0.08] bg-white/[0.02] p-2 overflow-hidden"
          style={{ color: "#8ED3CB" }}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: selectedSvg }}
        />
        <Button
          size="sm"
          onClick={() => {
            const svg = selectedSvg.trim();
            if (svg) onInsert(svg);
          }}
        >
          إضافة
        </Button>
      </div>
    </div>
  );
}

