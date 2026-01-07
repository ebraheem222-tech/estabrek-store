import React, { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { cn } from "../../components/ui/cn";
import { tokensToClassName, tokensToInlineStyle } from "../../cms/style/tokensToTw";
import { SectionDecorations } from "../../cms/decorations/DecorationLayer";
import {
  BG_PRESETS,
  HOVER_PRESETS,
  ANIM_PRESETS,
  DELAY_PRESETS,
  DURATION_PRESETS,
  DISPLAY_PRESETS,
  POSITION_PRESETS,
  FLEX_DIR_PRESETS,
  FLEX_WRAP_PRESETS,
  JUSTIFY_PRESETS,
  ITEMS_PRESETS,
  GRID_COLS_PRESETS,
  GRID_ROWS_PRESETS,
  JUSTIFY_ITEMS_PRESETS,
  PLACE_ITEMS_PRESETS,
  RADIUS_PRESETS,
  SHADOW_PRESETS,
  PADDING_PRESETS,
  GAP_PRESETS,
  TEXT_SIZE_PRESETS,
  TEXT_ALIGN_PRESETS,
  FONT_WEIGHT_PRESETS,
  TEXT_COLOR_PRESETS,
  MAX_W_PRESETS,
  DECOR_SHAPE_PRESETS,
  SHAPE_LABELS,
  DECOR_PLACEMENT_PRESETS,
  DECOR_SIZE_PRESETS,
  DECOR_COLOR_PRESETS,
  DECOR_FILL_PRESETS,
  DECOR_BLUR_PRESETS,
  type TwTokens,
} from "../../cms/style/tokens";
import { SHAPES } from "../../cms/shapes/shapeRegistry";
import type { CmsComponent, CmsComponentKind, CmsSectionData } from "../../cms/types";

const LazySectionStylingPanel = React.lazy(() =>
  import("./SectionStylingPanel").then((m) => ({ default: m.SectionStylingPanel }))
);

type ChildCapableKind = "container" | "stack" | "row" | "grid" | "columns";

function isChildCapable(kind: CmsComponentKind): kind is ChildCapableKind {
  return kind === "container" || kind === "stack" || kind === "row" || kind === "grid" || kind === "columns";
}

function getChildren(c: CmsComponent): CmsComponent[] {
  const fromProps = (c.props as any)?.children;
  if (Array.isArray(fromProps)) return fromProps as CmsComponent[];
  const fromRoot = (c as any)?.children;
  return Array.isArray(fromRoot) ? (fromRoot as CmsComponent[]) : [];
}

function makeId(prefix = "cmp"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getComponents(data: CmsSectionData): CmsComponent[] {
  const arr = (data as any)?.components;
  return Array.isArray(arr) ? (arr as CmsComponent[]) : [];
}

function setComponents(data: CmsSectionData, components: CmsComponent[]): CmsSectionData {
  return { ...(data as any), components };
}

function defaultTokensBase(): TwTokens {
  return {
    layout: { display: "block", position: "static", zIndex: "auto" },
    spacing: { padding: "none", gap: "none" },
    typography: { size: "base", align: "left", weight: "normal", color: "default" },
    style: { bg: "none", radius: "none", shadow: "none" },
    state: { hover: "none" },
    motion: { anim: "none", delay: 0, duration: 300 },
    size: { maxW: "none" },
    decor: { before: { shape: "none" }, after: { shape: "none" } },
  };
}

function defaultButtonTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: {
      display: "inline-flex",
      position: "static",
      zIndex: "auto",
      flex: { dir: "row", wrap: "nowrap", justify: "center", items: "center" },
    },
    spacing: { padding: "sm", gap: "xs" },
    typography: { size: "sm", align: "left", weight: "medium", color: "default" },
    style: { bg: "solid-primary", radius: "xl", shadow: "none" },
    state: { hover: "lift" },
  };
}

function defaultLayoutTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: { display: "block", position: "relative", zIndex: "auto" },
    spacing: { padding: "md", gap: "md" },
    style: { bg: "none", radius: "2xl", shadow: "none" },
    size: { maxW: "xl" },
  };
}

function defaultCardTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: { display: "block", position: "relative", zIndex: "auto" },
    spacing: { padding: "md", gap: "sm" },
    style: { bg: "solid-surface", radius: "2xl", shadow: "md" },
  };
}

function defaultBadgeTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: {
      display: "inline-flex",
      position: "static",
      zIndex: "auto",
      flex: { dir: "row", wrap: "nowrap", justify: "center", items: "center" },
    },
    spacing: { padding: "xs", gap: "none" },
    typography: { size: "sm", align: "left", weight: "medium", color: "default" },
    style: { bg: "solid-muted", radius: "full", shadow: "none" },
  };
}

function defaultFieldTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: {
      display: "flex",
      position: "relative",
      zIndex: "auto",
      flex: { dir: "col", items: "start" },
    },
    spacing: { padding: "sm", gap: "xs" },
    typography: { size: "sm", align: "left", weight: "normal", color: "default" },
    style: {
      bg: "solid-surface",
      radius: "xl",
      shadow: "none",
      borderWidth: "1",
      borderStyle: "solid",
      borderColor: "muted",
    },
  };
}

function defaultCheckboxTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: {
      display: "inline-flex",
      position: "relative",
      zIndex: "auto",
      flex: { dir: "row", items: "center" },
    },
    spacing: { padding: "none", gap: "xs" },
    typography: { size: "sm", align: "left", weight: "normal", color: "default" },
  };
}

function defaultContainerTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: { display: "block", position: "relative", zIndex: "auto" },
    spacing: { padding: "md", gap: "md" },
    size: { maxW: "xl" },
  };
}

function defaultStackTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: { display: "flex", position: "relative", zIndex: "auto", flex: { dir: "col" } },
    spacing: { padding: "none", gap: "md" },
  };
}

function defaultRowTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: { display: "flex", position: "relative", zIndex: "auto", flex: { dir: "row", wrap: "wrap" } },
    spacing: { padding: "none", gap: "md" },
  };
}

function defaultGridTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    layout: { display: "grid", position: "relative", zIndex: "auto" },
    spacing: { padding: "none", gap: "md" },
  };
}

function defaultSvgTokens(): TwTokens {
  return {
    ...defaultTokensBase(),
    size: { width: "full", height: "160" },
    effects: { opacity: "30" },
  };
}

function defaultComponent(kind: CmsComponentKind): CmsComponent {
  switch (kind) {
    case "text":
      return { id: makeId("text"), kind: "text", name: "Text", props: { as: "p", text: "Text..." }, twTokens: defaultTokensBase() };
    case "badge":
      return { id: makeId("badge"), kind: "badge", name: "Badge", props: { text: "Badge" }, twTokens: defaultBadgeTokens() };
    case "card":
      return {
        id: makeId("card"),
        kind: "card",
        name: "Card",
        props: { title: "Card title", text: "Card text", buttonLabel: "Learn more", buttonHref: "/shop", buttonVariant: "secondary" },
        twTokens: defaultCardTokens(),
      };
    case "list":
      return { id: makeId("list"), kind: "list", name: "List", props: { ordered: false, items: ["Item 1", "Item 2", "Item 3"] }, twTokens: defaultTokensBase() };
    case "button":
      return { id: makeId("btn"), kind: "button", name: "Button", props: { label: "Button", href: "/shop", variant: "primary" }, twTokens: defaultButtonTokens() };
    case "input":
      return {
        id: makeId("input"),
        kind: "input",
        name: "Input",
        props: { label: "Label", name: "", placeholder: "اكتب هنا", type: "text", required: false },
        twTokens: defaultFieldTokens(),
      };
    case "textarea":
      return {
        id: makeId("textarea"),
        kind: "textarea",
        name: "Textarea",
        props: { label: "Label", name: "", placeholder: "اكتب هنا", rows: 4, required: false },
        twTokens: defaultFieldTokens(),
      };
    case "select":
      return {
        id: makeId("select"),
        kind: "select",
        name: "Select",
        props: { label: "Select", name: "", placeholder: "اختر", options: ["Option 1", "Option 2"], required: false },
        twTokens: defaultFieldTokens(),
      };
    case "checkbox":
      return {
        id: makeId("check"),
        kind: "checkbox",
        name: "Checkbox",
        props: { label: "Checkbox", name: "", checked: false, required: false },
        twTokens: defaultCheckboxTokens(),
      };
    case "image":
      return { id: makeId("img"), kind: "image", name: "Image", props: { src: "", alt: "" }, twTokens: defaultTokensBase() };
    case "icon":
      return { id: makeId("ico"), kind: "icon", name: "Icon", props: { d: "", viewBox: "0 0 24 24" }, twTokens: defaultTokensBase() };
    case "svg": {
      const preset = (SHAPES as any).wave;
      return {
        id: makeId("svg"),
        kind: "svg",
        name: "SVG Shape",
        props: { shape: "wave", d: preset?.d ?? "", viewBox: preset?.viewBox ?? "0 0 100 100", mode: "fill", strokeWidth: 2, preserveAspectRatio: "none" },
        twTokens: defaultSvgTokens(),
      };
    }
    case "divider":
      return { id: makeId("div"), kind: "divider", name: "Divider", props: {}, twTokens: defaultTokensBase() };
    case "spacer":
      return { id: makeId("sp"), kind: "spacer", name: "Spacer", props: { h: "md" }, twTokens: defaultTokensBase() };
    case "container":
      return { id: makeId("ctr"), kind: "container", name: "Container", props: { children: [] }, twTokens: defaultContainerTokens() };
    case "stack":
      return { id: makeId("stk"), kind: "stack", name: "Stack", props: { children: [] }, twTokens: defaultStackTokens() };
    case "row":
      return { id: makeId("row"), kind: "row", name: "Row", props: { children: [] }, twTokens: defaultRowTokens() };
    case "grid":
      return { id: makeId("grid"), kind: "grid", name: "Grid", props: { cols: 2, children: [] }, twTokens: defaultGridTokens() };
    case "nav_menu":
      return {
        id: makeId("nav"),
        kind: "nav_menu",
        name: "Navigation",
        props: {
          mode: "dropdown",
          showIcons: true,
          gradient: "none",
          items: [
            {
              id: makeId("mi"),
              label: "Shop",
              href: "/shop",
              icon: "shop",
              children: [
                { id: makeId("mi"), label: "New Arrivals", href: "/shop?sort=new", icon: "sparkle" },
                { id: makeId("mi"), label: "Best Sellers", href: "/shop?sort=popular", icon: "star" },
              ],
            },
            { id: makeId("mi"), label: "Contact", href: "/contact", icon: "phone" },
          ],
        },
        twTokens: defaultContainerTokens(),
      };
    case "columns":
      return { id: makeId("cols"), kind: "columns", name: "Columns", props: { cols: 2, children: [] }, twTokens: defaultGridTokens() };

    case "productGrid": {
      return {
        id: makeId("pg"),
        kind: "productGrid",
        name: "Product Grid",
        props: { title: "", source: "manual", productIds: [], categoryId: "", limit: 12, cols: 4 },
        twTokens: defaultContainerTokens(),
      };
    }
    case "productSlider": {
      return {
        id: makeId("ps"),
        kind: "productSlider",
        name: "Product Slider",
        props: { title: "", source: "manual", productIds: [], categoryId: "", limit: 12 },
        twTokens: defaultContainerTokens(),
      };
    }
    case "categoryTiles": {
      return {
        id: makeId("cat"),
        kind: "categoryTiles",
        name: "Category Tiles",
        props: { title: "", cols: 3, items: [{ title: "Category", href: "/c/slug", imageUrl: "" }] },
        twTokens: defaultContainerTokens(),
      };
    }
    case "filtersBar": {
      return { id: makeId("filters"), kind: "filtersBar", name: "Filters Bar", props: {}, twTokens: defaultContainerTokens() };
    }
    case "data":
      return { id: makeId("data"), kind: "data", name: "Data", props: {}, twTokens: defaultTokensBase() };
    default:
      return { id: makeId("cmp"), kind: "text", name: "Text", props: { as: "p", text: "Text..." }, twTokens: defaultTokensBase() };
  }
}

export function createDefaultComponent(kind: CmsComponentKind): CmsComponent {
  return defaultComponent(kind);
}

function baseButtonClasses(variant?: string): string {
  const v = variant ?? "primary";
  switch (v) {
    case "secondary":
      return "border border-black/10 bg-white text-black hover:bg-black/5 dark:border-white/15 dark:bg-white/10 dark:text-white";
    case "ghost":
      return "border border-transparent hover:bg-black/5 dark:hover:bg-white/10 dark:text-white";
    default:
      return "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black";
  }
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v?: string) => void;
}) {
  const safeValue = typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/80">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1"
        />
        <Button size="sm" variant="ghost" onClick={() => onChange(undefined)} disabled={!value}>
          Clear
        </Button>
      </div>
    </div>
  );
}

function spacerClass(h?: string): string {
  switch (h) {
    case "xs": return "h-2";
    case "sm": return "h-4";
    case "md": return "h-8";
    case "lg": return "h-12";
    case "xl": return "h-20";
    default: return "h-8";
  }
}

function hasTypographyOverrides(typography?: TwTokens["typography"] & { colorCustom?: string }) {
  if (!typography) return false;
  if (typography.family) return true;
  if (typography.size && typography.size !== "base") return true;
  if (typography.align && typography.align !== "left") return true;
  if (typography.weight && typography.weight !== "normal") return true;
  if (typography.color && typography.color !== "default") return true;
  if (typography.lineHeight) return true;
  if (typography.letterSpacing) return true;
  if (typography.decoration) return true;
  if (typography.transform) return true;
  if (typography.truncate) return true;
  if (typography.lineClamp) return true;
  if ((typography as any).colorCustom) return true;
  return false;
}

function previewDecorationsFromTokens(tokens?: any) {
  const decor = tokens?.decor;
  if (!decor) return null;
  const before = decor.before;
  const after = decor.after;
  const hasBefore = !!before?.shape && before.shape !== "none";
  const hasAfter = !!after?.shape && after.shape !== "none";
  if (!hasBefore && !hasAfter) return null;
  return { before: hasBefore ? before : undefined, after: hasAfter ? after : undefined };
}

function ChildrenEditor({ components, onChange, max }: { components: CmsComponent[]; onChange: (next: CmsComponent[]) => void; max: number }) {
  // Reuse the main editor logic by wrapping children inside a pseudo section data object.
  return (
    <ComponentsEditor
      value={{ components }}
      onChange={(v) => {
        const next = (v && typeof v === "object" && Array.isArray((v as any).components)) ? (v as any).components as CmsComponent[] : [];
        onChange(next);
      }}
      max={max}
    />
  );
}

export function ComponentsEditor({
  value,
  onChange,
  max = 10,
}: {
  value: any;
  onChange: (v: any) => void;
  max?: number;
}) {
  const data: CmsSectionData = value && typeof value === "object" ? (value as any) : ({} as any);
  const components = useMemo(() => getComponents(data), [data]);

  const [kindToAdd, setKindToAdd] = useState<CmsComponentKind>("text");
  const [showAdvancedStyle, setShowAdvancedStyle] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(components[0]?.id ?? null);

  const selected = components.find((c) => c.id === selectedId) ?? null;
  const previewTokens = (selected as any)?.twTokens ?? (selected as any)?.tw;
  const previewStyle = tokensToInlineStyle(previewTokens);
  const previewLegacyClassName = typeof (selected as any)?.tw?.className === "string" ? (selected as any).tw.className : "";
  const previewTextScopeClass = hasTypographyOverrides(previewTokens?.typography) ? "cms-section-text" : "";
  const previewClassName = cn(tokensToClassName(previewTokens), previewLegacyClassName, previewTextScopeClass);
  const previewDecorations = previewDecorationsFromTokens(previewTokens);
  const selectedSource = (selected as any)?.props?.source ?? "manual";
  const positionValue = selected?.twTokens?.layout?.position ?? "static";
  const showOffsets = positionValue !== "static";
  const zIndexOptions = ["auto", "0", "10", "20", "30", "40", "50"].map((v) => ({ value: v, label: v }));

  function updateComponents(next: CmsComponent[]) {
    onChange(setComponents(data, next));
    if (next.length && !next.find((c) => c.id === selectedId)) setSelectedId(next[0].id);
    if (!next.length) setSelectedId(null);
  }

  function addComponent() {
    if (components.length >= max) return;
    const c = defaultComponent(kindToAdd);
    updateComponents([...components, c]);
    setSelectedId(c.id);
  }

  function removeSelected() {
    if (!selected) return;
    updateComponents(components.filter((c) => c.id !== selected.id));
  }

  function moveSelected(dir: -1 | 1) {
    if (!selected) return;
    const idx = components.findIndex((c) => c.id === selected.id);
    const ni = idx + dir;
    if (ni < 0 || ni >= components.length) return;
    const copy = [...components];
    const [item] = copy.splice(idx, 1);
    copy.splice(ni, 0, item);
    updateComponents(copy);
  }

  function patchSelected(patch: Partial<CmsComponent>) {
    if (!selected) return;
    updateComponents(components.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)));
  }

  const canAdd = components.length < max;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Add component"
          value={kindToAdd}
          options={[
            { value: "text", label: "Text" },
            { value: "button", label: "Button" },
            { value: "input", label: "Input" },
            { value: "textarea", label: "Textarea" },
            { value: "select", label: "Select" },
            { value: "checkbox", label: "Checkbox" },
            { value: "badge", label: "Badge" },
            { value: "card", label: "Card" },
            { value: "list", label: "List" },
            { value: "image", label: "Image" },
            { value: "icon", label: "Icon" },
            { value: "svg", label: "SVG Shape" },
            { value: "divider", label: "Divider" },
            { value: "spacer", label: "Spacer" },
            { value: "container", label: "Container" },
            { value: "stack", label: "Stack" },
            { value: "row", label: "Row" },
            { value: "grid", label: "Grid" },
            { value: "columns", label: "Columns" },
            { value: "nav_menu", label: "Navigation Menu" },
            { value: "productGrid", label: "E-commerce: Product Grid" },
            { value: "productSlider", label: "E-commerce: Product Slider" },
            { value: "categoryTiles", label: "E-commerce: Category Tiles" },
            { value: "filtersBar", label: "E-commerce: Filters Bar" },
          ]}
          onValueChange={(v) => setKindToAdd(v as CmsComponentKind)}
        />
        <Button onClick={addComponent} disabled={!canAdd}>
          Add
        </Button>
        <div className="text-xs text-white/60">
          {components.length}/{max}
        </div>
      </div>

      {!!components.length && (
        <div className="grid gap-6 lg:grid-cols-[320px,1fr] xl:grid-cols-[380px,1fr] items-start">
          {/* List */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 min-w-0">
            <div className="text-sm font-semibold mb-2">Components</div>
            <div className="space-y-1">
              {components.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn(
                    "w-full text-left rounded-xl px-2 py-2 text-sm border border-transparent hover:border-white/15 hover:bg-white/[0.03]",
                    selectedId === c.id && "border-white/15 bg-white/[0.04]"
                  )}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate">{c.name ?? c.kind}</div>
                    <div className="text-xs text-white/50">{c.kind}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => moveSelected(-1)} disabled={!selected}>
                ↑
              </Button>
              <Button size="sm" variant="ghost" onClick={() => moveSelected(1)} disabled={!selected}>
                ↓
              </Button>
              <Button size="sm" variant="danger" onClick={removeSelected} disabled={!selected}>
                Delete
              </Button>
            </div>
          </div>

          {/* Editor + preview */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 max-h-[75vh] overflow-y-auto overflow-x-auto min-w-0">
            {!selected ? (
              <div className="text-white/60 text-sm">Select a component to edit.</div>
            ) : (
              <div className="space-y-4 min-w-0">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    label="Name"
                    value={selected.name ?? ""}
                    onValueChange={(v) => patchSelected({ name: v })}
                  />
                  <Input label="Kind" value={selected.kind} onChange={() => {}} disabled />
                </div>

                {/* Props */}
                <div className="rounded-xl border border-white/10 bg-white/[0.015] p-3">
                  <div className="text-xs font-semibold text-white/70 mb-2">Content</div>

                  {selected.kind === "text" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Select
                        label="As"
                        value={selected.props?.as ?? "p"}
                        options={[
                          { value: "p", label: "p" },
                          { value: "h1", label: "h1" },
                          { value: "h2", label: "h2" },
                          { value: "h3", label: "h3" },
                          { value: "span", label: "span" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), as: v } })}
                      />
                      <Input
                        label="Text"
                        value={selected.props?.text ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), text: v } })}
                      />
                    </div>
                  )}


                  {selected.kind === "nav_menu" && (() => {
                    const props = selected.props ?? {};
                    const items = Array.isArray(props.items) ? props.items : [];
                    function patchItems(next: any[]) {
                      patchSelected({ props: { ...props, items: next } });
                    }
                    function addTop() {
                      patchItems([...items, { id: makeId("mi"), label: "Item", href: "/", icon: "home", children: [] }]);
                    }
                    function removeTop(id: string) {
                      patchItems(items.filter((x: any) => x.id !== id));
                    }
                    function addChild(parentId: string) {
                      patchItems(items.map((x: any) => x.id === parentId ? { ...x, children: [...(x.children ?? []), { id: makeId("mi"), label: "Child", href: "/", icon: "chev" }] } : x));
                    }
                    function patchTop(id: string, patch: any) {
                      patchItems(items.map((x: any) => x.id === id ? { ...x, ...patch } : x));
                    }
                    function patchChild(parentId: string, childId: string, patch: any) {
                      patchItems(items.map((x: any) => {
                        if (x.id !== parentId) return x;
                        const ch = Array.isArray(x.children) ? x.children : [];
                        return { ...x, children: ch.map((c: any) => c.id === childId ? { ...c, ...patch } : c) };
                      }));
                    }
                    function removeChild(parentId: string, childId: string) {
                      patchItems(items.map((x: any) => {
                        if (x.id !== parentId) return x;
                        const ch = Array.isArray(x.children) ? x.children : [];
                        return { ...x, children: ch.filter((c: any) => c.id !== childId) };
                      }));
                    }
                    return (
                      <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          <Select
                            label="Mode"
                            value={props.mode ?? "dropdown"}
                            options={[
                              { value: "dropdown", label: "dropdown" },
                              { value: "mega", label: "mega" },
                            ]}
                            onValueChange={(v: any) => patchSelected({ props: { ...props, mode: v } })}
                          />
                          <Select
                            label="Gradient"
                            value={props.gradient ?? "none"}
                            options={[
                              { value: "none", label: "none" },
                              { value: "sunset", label: "sunset" },
                              { value: "ocean", label: "ocean" },
                              { value: "neon", label: "neon" },
                            ]}
                            onValueChange={(v: any) => patchSelected({ props: { ...props, gradient: v } })}
                          />
                          <Select
                            label="Show icons"
                            value={(props.showIcons ?? true) ? "yes" : "no"}
                            options={[
                              { value: "yes", label: "yes" },
                              { value: "no", label: "no" },
                            ]}
                            onValueChange={(v: any) => patchSelected({ props: { ...props, showIcons: v === "yes" } })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">Menu Items</div>
                          <Button onClick={addTop} disabled={items.length >= 12}>Add item</Button>
                        </div>

                        <div className="space-y-2">
                          {items.map((it: any) => (
                            <div key={it.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">{it.label ?? "Item"}</div>
                                <Button variant="ghost" onClick={() => removeTop(it.id)}>Remove</Button>
                              </div>
                              <div className="grid gap-3 md:grid-cols-3">
                                <Input label="Label" value={it.label ?? ""} onValueChange={(v) => patchTop(it.id, { label: v })} />
                                <Input label="Href" value={it.href ?? ""} onValueChange={(v) => patchTop(it.id, { href: v })} />
                                <Select
                                  label="Icon"
                                  value={it.icon ?? "none"}
                                  options={[
                                    { value: "none", label: "none" },
                                    { value: "home", label: "home" },
                                    { value: "shop", label: "shop" },
                                    { value: "star", label: "star" },
                                    { value: "sparkle", label: "sparkle" },
                                    { value: "phone", label: "phone" },
                                    { value: "chev", label: "chevron" },
                                  ]}
                                  onValueChange={(v: any) => patchTop(it.id, { icon: v })}
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="text-xs text-white/60">Children</div>
                                <Button variant="secondary" onClick={() => addChild(it.id)} disabled={((it.children ?? []).length) >= 12}>Add child</Button>
                              </div>

                              {!!(it.children ?? []).length && (
                                <div className="space-y-2">
                                  {(it.children ?? []).map((ch: any) => (
                                    <div key={ch.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-2">
                                      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_auto] items-end">
                                        <Input label="Label" value={ch.label ?? ""} onValueChange={(v) => patchChild(it.id, ch.id, { label: v })} />
                                        <Input label="Href" value={ch.href ?? ""} onValueChange={(v) => patchChild(it.id, ch.id, { href: v })} />
                                        <Select
                                          label="Icon"
                                          value={ch.icon ?? "none"}
                                          options={[
                                            { value: "none", label: "none" },
                                            { value: "chev", label: "chevron" },
                                            { value: "star", label: "star" },
                                            { value: "sparkle", label: "sparkle" },
                                          ]}
                                          onValueChange={(v: any) => patchChild(it.id, ch.id, { icon: v })}
                                        />
                                        <Button variant="ghost" onClick={() => removeChild(it.id, ch.id)}>Remove</Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {selected.kind === "button" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="Label"
                        value={selected.props?.label ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), label: v } })}
                      />
                      <Input
                        label="Href"
                        value={selected.props?.href ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), href: v } })}
                      />
                      <Select
                        label="Variant"
                        value={selected.props?.variant ?? "primary"}
                        options={[
                          { value: "primary", label: "primary" },
                          { value: "secondary", label: "secondary" },
                          { value: "ghost", label: "ghost" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), variant: v } })}
                      />
                    </div>
                  )}

                  {selected.kind === "input" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="Label"
                        value={selected.props?.label ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), label: v } })}
                      />
                      <Input
                        label="Name"
                        value={selected.props?.name ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), name: v } })}
                        dir="ltr"
                      />
                      <Input
                        label="Placeholder"
                        value={selected.props?.placeholder ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), placeholder: v } })}
                      />
                      <Select
                        label="Type"
                        value={selected.props?.type ?? "text"}
                        options={[
                          { value: "text", label: "text" },
                          { value: "email", label: "email" },
                          { value: "number", label: "number" },
                          { value: "password", label: "password" },
                          { value: "tel", label: "tel" },
                          { value: "url", label: "url" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), type: v } })}
                      />
                      <Select
                        label="Required"
                        value={String(!!selected.props?.required)}
                        options={[
                          { value: "false", label: "No" },
                          { value: "true", label: "Yes" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), required: v === "true" } })}
                      />
                    </div>
                  )}

                  {selected.kind === "textarea" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="Label"
                        value={selected.props?.label ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), label: v } })}
                      />
                      <Input
                        label="Name"
                        value={selected.props?.name ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), name: v } })}
                        dir="ltr"
                      />
                      <Input
                        label="Placeholder"
                        value={selected.props?.placeholder ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), placeholder: v } })}
                      />
                      <Input
                        label="Rows"
                        type="number"
                        value={String(selected.props?.rows ?? 4)}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), rows: Math.max(2, Number(v) || 4) } })}
                      />
                      <Select
                        label="Required"
                        value={String(!!selected.props?.required)}
                        options={[
                          { value: "false", label: "No" },
                          { value: "true", label: "Yes" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), required: v === "true" } })}
                      />
                    </div>
                  )}

                  {selected.kind === "select" && (() => {
                    const rawOptions = Array.isArray(selected.props?.options) ? selected.props.options : [];
                    const optionsText = rawOptions
                      .map((opt: any) => (typeof opt === "string" ? opt : opt?.label ?? opt?.value ?? ""))
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          label="Label"
                          value={selected.props?.label ?? ""}
                          onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), label: v } })}
                        />
                        <Input
                          label="Name"
                          value={selected.props?.name ?? ""}
                          onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), name: v } })}
                          dir="ltr"
                        />
                        <Input
                          label="Placeholder"
                          value={selected.props?.placeholder ?? ""}
                          onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), placeholder: v } })}
                        />
                        <Select
                          label="Required"
                          value={String(!!selected.props?.required)}
                          options={[
                            { value: "false", label: "No" },
                            { value: "true", label: "Yes" },
                          ]}
                          onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), required: v === "true" } })}
                        />
                        <Input
                          label="Options (comma separated)"
                          value={optionsText}
                          onValueChange={(v) =>
                            patchSelected({
                              props: {
                                ...(selected.props ?? {}),
                                options: v
                                  .split(",")
                                  .map((x: string) => x.trim())
                                  .filter(Boolean),
                              },
                            })
                          }
                        />
                      </div>
                    );
                  })()}

                  {selected.kind === "checkbox" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="Label"
                        value={selected.props?.label ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), label: v } })}
                      />
                      <Input
                        label="Name"
                        value={selected.props?.name ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), name: v } })}
                        dir="ltr"
                      />
                      <Select
                        label="Checked"
                        value={String(!!selected.props?.checked)}
                        options={[
                          { value: "false", label: "No" },
                          { value: "true", label: "Yes" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), checked: v === "true" } })}
                      />
                      <Select
                        label="Required"
                        value={String(!!selected.props?.required)}
                        options={[
                          { value: "false", label: "No" },
                          { value: "true", label: "Yes" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), required: v === "true" } })}
                      />
                    </div>
                  )}

                  {selected.kind === "badge" && (
                    <Input
                      label="Text"
                      value={selected.props?.text ?? ""}
                      onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), text: v } })}
                    />
                  )}

                  {selected.kind === "card" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="Title"
                        value={selected.props?.title ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), title: v } })}
                      />
                      <Input
                        label="Text"
                        value={selected.props?.text ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), text: v } })}
                      />
                      <Input
                        label="Button label"
                        value={selected.props?.buttonLabel ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), buttonLabel: v } })}
                      />
                      <Input
                        label="Button href"
                        value={selected.props?.buttonHref ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), buttonHref: v } })}
                      />
                      <Select
                        label="Button variant"
                        value={selected.props?.buttonVariant ?? "secondary"}
                        options={[
                          { value: "primary", label: "primary" },
                          { value: "secondary", label: "secondary" },
                          { value: "ghost", label: "ghost" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), buttonVariant: v } })}
                      />
                    </div>
                  )}

                  {selected.kind === "list" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Select
                        label="Ordered"
                        value={String(!!selected.props?.ordered)}
                        options={[
                          { value: "false", label: "No" },
                          { value: "true", label: "Yes" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), ordered: v === "true" } })}
                      />
                      <Input
                        label="Items (comma separated)"
                        value={Array.isArray(selected.props?.items) ? selected.props.items.join(", ") : ""}
                        onValueChange={(v) =>
                          patchSelected({
                            props: { ...(selected.props ?? {}), items: v.split(",").map((x: string) => x.trim()).filter(Boolean) },
                          })
                        }
                      />
                    </div>
                  )}

                  {selected.kind === "image" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="Image URL"
                        value={selected.props?.src ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), src: v } })}
                      />
                      <Input
                        label="Alt"
                        value={selected.props?.alt ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), alt: v } })}
                      />
                    </div>
                  )}

                  {(selected.kind === "productGrid" || selected.kind === "productSlider") && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="Title"
                        value={selected.props?.title ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), title: v } })}
                      />
                      <Select
                        label="Source"
                        value={selectedSource}
                        options={[
                          { value: "manual", label: "manual" },
                          { value: "category", label: "category" },
                          { value: "all", label: "all" },
                          { value: "bestSellers", label: "bestSellers" },
                          { value: "newArrivals", label: "newArrivals" },
                        ]}
                        onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), source: v } })}
                      />

                      {selectedSource === "category" && (
                        <Input
                          label="Category ID (optional)"
                          value={selected.props?.categoryId ?? ""}
                          onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), categoryId: v } })}
                        />
                      )}

                      <Input
                        label="Limit"
                        type="number"
                        value={String(selected.props?.limit ?? 12)}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), limit: Number(v) || 12 } })}
                      />

                      {selected.kind === "productGrid" ? (
                        <Select
                          label="Columns"
                          value={String(selected.props?.cols ?? 4)}
                          options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
                          onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), cols: Number(v) } })}
                        />
                      ) : null}

                      {selectedSource === "manual" ? (
                        <Input
                          label="Product IDs (comma separated)"
                          value={Array.isArray(selected.props?.productIds) ? selected.props.productIds.join(", ") : ""}
                          onValueChange={(v) =>
                            patchSelected({
                              props: {
                                ...(selected.props ?? {}),
                                productIds: v
                                  .split(",")
                                  .map((x: string) => x.trim())
                                  .filter(Boolean),
                              },
                            })
                          }
                        />
                      ) : selectedSource === "category" || selectedSource === "all" ? (
                        <div className="text-sm text-white/60 md:col-span-2">
                          This component will be populated from the Storefront using URL filters (Search/Sort/Price/Colors/Sizes).
                        </div>
                      ) : (
                        <div className="text-sm text-white/60 md:col-span-2">
                          This component auto-loads products from the Storefront ({selectedSource === "bestSellers" ? "best sellers" : "new arrivals"}).
                        </div>
                      )}
                    </div>
                  )}

                  {selected.kind === "categoryTiles" && (() => {
                    const props = selected.props ?? {};
                    const items = Array.isArray(props.items) ? props.items : [];
                    const colsValue = String(props.cols ?? 3);
                    const updateItems = (next: any[]) => patchSelected({ props: { ...props, items: next } });
                    const updateItem = (index: number, patch: any) => {
                      updateItems(items.map((it: any, i: number) => (i === index ? { ...it, ...patch } : it)));
                    };
                    const removeItem = (index: number) => {
                      updateItems(items.filter((_: any, i: number) => i !== index));
                    };
                    const addItem = () => {
                      updateItems([
                        ...items,
                        { id: makeId("cat"), title: "Category", href: "/c/slug", imageUrl: "" },
                      ]);
                    };

                    return (
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            label="Title"
                            value={props.title ?? ""}
                            onValueChange={(v) => patchSelected({ props: { ...props, title: v } })}
                          />
                          <Select
                            label="Columns"
                            value={colsValue}
                            options={[2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
                            onValueChange={(v: any) => patchSelected({ props: { ...props, cols: Number(v) } })}
                          />
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.015] p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-xs font-semibold text-white/70">Items</div>
                            <Button size="sm" variant="ghost" onClick={addItem}>
                              Add item
                            </Button>
                          </div>
                          {items.length ? (
                            <div className="space-y-3">
                              {items.map((item: any, idx: number) => (
                                <div key={item.id ?? idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-white/60">Item {idx + 1}</div>
                                    <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>
                                      Remove
                                    </Button>
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-3">
                                    <Input
                                      label="Title"
                                      value={item.title ?? ""}
                                      onValueChange={(v) => updateItem(idx, { title: v })}
                                    />
                                    <Input
                                      label="Href"
                                      value={item.href ?? ""}
                                      onValueChange={(v) => updateItem(idx, { href: v })}
                                    />
                                    <Input
                                      label="Image URL"
                                      value={item.imageUrl ?? ""}
                                      onValueChange={(v) => updateItem(idx, { imageUrl: v })}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-white/60">No categories yet.</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {selected.kind === "filtersBar" && (
                    <div className="text-sm text-white/60">
                      Filters Bar is a live UI (same as /shop) that updates URL search params.
                      Place it near a Product Grid/Slider with source <b>category</b> or <b>all</b>.
                    </div>
                  )}

                  {selected.kind === "icon" && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        label="SVG path (d)"
                        value={selected.props?.d ?? ""}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), d: v } })}
                        dir="ltr"
                      />
                      <Input
                        label="viewBox"
                        value={selected.props?.viewBox ?? "0 0 24 24"}
                        onValueChange={(v) => patchSelected({ props: { ...(selected.props ?? {}), viewBox: v } })}
                        dir="ltr"
                      />
                    </div>
                  )}

                  {selected.kind === "svg" && (() => {
                    const props = selected.props ?? {};
                    const shapeValue = typeof props.shape === "string" ? props.shape : "custom";
                    const shapeOptions = [
                      { value: "custom", label: "Custom" },
                      ...DECOR_SHAPE_PRESETS.filter((s) => s !== "none").map((s) => ({
                        value: s,
                        label: SHAPE_LABELS[s as any]?.en ?? s,
                      })),
                    ];
                    const modeValue = props.mode === "stroke" ? "stroke" : "fill";
                    const preserve = typeof props.preserveAspectRatio === "string" ? props.preserveAspectRatio : "none";
                    const preserveOptions = [
                      { value: "none", label: "none (stretch)" },
                      { value: "xMidYMid meet", label: "xMidYMid meet" },
                      { value: "xMidYMid slice", label: "xMidYMid slice" },
                    ];

                    return (
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Select
                            label="Shape"
                            value={shapeValue}
                            options={shapeOptions}
                            onValueChange={(v: any) => {
                              if (v === "custom") {
                                patchSelected({ props: { ...props, shape: "custom" } });
                                return;
                              }
                              const preset = (SHAPES as any)[v];
                              const nextMode = v === "lines-horizontal" || v === "lines-diagonal" ? "stroke" : "fill";
                              patchSelected({
                                props: {
                                  ...props,
                                  shape: v,
                                  mode: nextMode,
                                  d: preset?.d ?? props.d ?? "",
                                  viewBox: preset?.viewBox ?? props.viewBox ?? "0 0 100 100",
                                },
                              });
                            }}
                          />
                          <Select
                            label="Mode"
                            value={modeValue}
                            options={[
                              { value: "fill", label: "fill" },
                              { value: "stroke", label: "stroke" },
                            ]}
                            onValueChange={(v: any) => patchSelected({ props: { ...props, mode: v } })}
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            label="viewBox"
                            value={props.viewBox ?? "0 0 100 100"}
                            onValueChange={(v) => patchSelected({ props: { ...props, viewBox: v } })}
                            dir="ltr"
                          />
                          <Select
                            label="preserveAspectRatio"
                            value={preserve}
                            options={preserveOptions}
                            onValueChange={(v: any) => patchSelected({ props: { ...props, preserveAspectRatio: v } })}
                          />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            label="Stroke width"
                            value={String(props.strokeWidth ?? 2)}
                            onValueChange={(v) => patchSelected({ props: { ...props, strokeWidth: v } })}
                            dir="ltr"
                          />
                        </div>

                        <Input
                          label="SVG path (d)"
                          value={props.d ?? ""}
                          onValueChange={(v) => patchSelected({ props: { ...props, d: v } })}
                          dir="ltr"
                        />
                      </div>
                    );
                  })()}

                  {selected.kind === "spacer" && (
                    <Select
                      label="Height"
                      value={selected.props?.h ?? "md"}
                      options={[
                        { value: "xs", label: "xs" },
                        { value: "sm", label: "sm" },
                        { value: "md", label: "md" },
                        { value: "lg", label: "lg" },
                        { value: "xl", label: "xl" },
                      ]}
                      onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), h: v } })}
                    />
                  )}

                  {selected.kind === "divider" && <div className="text-sm text-white/60">No settings.</div>}

                  {isChildCapable(selected.kind) && (
                    <div className="space-y-2">
                      {selected.kind === "grid" || selected.kind === "columns" ? (
                        <Select
                          label="Columns"
                          value={String(selected.props?.cols ?? 2)}
                          options={[2,3,4,5,6].map((n) => ({ value: String(n), label: String(n) }))}
                          onValueChange={(v: any) => patchSelected({ props: { ...(selected.props ?? {}), cols: Number(v) } })}
                        />
                      ) : null}
                      <div className="text-sm text-white/60">
                        Children: {getChildren(selected).length}/10
                      </div>
                    </div>
                  )}
                </div>

                {/* Children editor for layout components */}
                {selected && isChildCapable(selected.kind) && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.015] p-3">
                    <div className="text-xs font-semibold text-white/70 mb-2">Children</div>
                    <ChildrenEditor
                      components={getChildren(selected)}
                      onChange={(next) => patchSelected({ props: { ...(selected.props ?? {}), children: next } })}
                      max={10}
                    />
                  </div>
                )}

                {/* Tokens */}
                {false && (
                <div className="rounded-xl border border-white/10 bg-white/[0.015] p-3">
                  <div className="text-xs font-semibold text-white/70 mb-3">Design (Tailwind presets)</div>

                  <div className="overflow-x-auto pb-2 -mx-1 px-1">
                    <div
                      className="grid gap-5 min-w-0"
                      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
                    >
                    <Select
                      label="Display"
                      value={selected.twTokens?.layout?.display ?? "block"}
                      options={DISPLAY_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            layout: { ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}), display: v },
                          },
                        })
                      }
                    />

                    {(selected.twTokens?.layout?.display === "flex" || selected.twTokens?.layout?.display === "inline-flex") && (
                      <>
                        <Select
                          label="Flex dir"
                          value={selected.twTokens?.layout?.flex?.dir ?? "row"}
                          options={FLEX_DIR_PRESETS.map((x) => ({ value: x, label: x }))}
                          onValueChange={(v: any) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: {
                                  ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}),
                                  flex: { ...(((selected.twTokens ?? defaultTokensBase()).layout?.flex ?? {})), dir: v },
                                },
                              },
                            })
                          }
                        />
                        <Select
                          label="Flex wrap"
                          value={selected.twTokens?.layout?.flex?.wrap ?? "nowrap"}
                          options={FLEX_WRAP_PRESETS.map((x) => ({ value: x, label: x }))}
                          onValueChange={(v: any) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: {
                                  ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}),
                                  flex: { ...(((selected.twTokens ?? defaultTokensBase()).layout?.flex ?? {})), wrap: v },
                                },
                              },
                            })
                          }
                        />
                        <Select
                          label="Justify"
                          value={selected.twTokens?.layout?.flex?.justify ?? "start"}
                          options={JUSTIFY_PRESETS.map((x) => ({ value: x, label: x }))}
                          onValueChange={(v: any) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: {
                                  ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}),
                                  flex: { ...(((selected.twTokens ?? defaultTokensBase()).layout?.flex ?? {})), justify: v },
                                },
                              },
                            })
                          }
                        />
                        <Select
                          label="Items"
                          value={selected.twTokens?.layout?.flex?.items ?? "center"}
                          options={ITEMS_PRESETS.map((x) => ({ value: x, label: x }))}
                          onValueChange={(v: any) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: {
                                  ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}),
                                  flex: { ...(((selected.twTokens ?? defaultTokensBase()).layout?.flex ?? {})), items: v },
                                },
                              },
                            })
                          }
                        />
                      </>
                    )}

                    {selected.twTokens?.layout?.display === "grid" && (
                      <>
                        <Select
                          label="Grid cols"
                          value={String(selected.twTokens?.layout?.grid?.cols ?? 2)}
                          options={GRID_COLS_PRESETS.map((n) => ({ value: String(n), label: String(n) }))}
                          onValueChange={(v: any) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: {
                                  ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}),
                                  grid: { ...(((selected.twTokens ?? defaultTokensBase()).layout?.grid ?? {})), cols: Number(v) as any },
                                },
                              },
                            })
                          }
                        />
                        <Select
                          label="Grid rows"
                          value={String(selected.twTokens?.layout?.grid?.rows ?? "auto")}
                          options={GRID_ROWS_PRESETS.map((x: any) => ({ value: String(x), label: String(x) }))}
                          onValueChange={(v: any) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: {
                                  ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}),
                                  grid: { ...(((selected.twTokens ?? defaultTokensBase()).layout?.grid ?? {})), rows: (v === "auto" ? "auto" : Number(v)) as any },
                                },
                              },
                            })
                          }
                        />
                        <Select
                          label="Justify items"
                          value={selected.twTokens?.layout?.grid?.justifyItems ?? "stretch"}
                          options={JUSTIFY_ITEMS_PRESETS.map((x) => ({ value: x, label: x }))}
                          onValueChange={(v: any) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: {
                                  ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}),
                                  grid: { ...(((selected.twTokens ?? defaultTokensBase()).layout?.grid ?? {})), justifyItems: v },
                                },
                              },
                            })
                          }
                        />
                        <Select
                          label="Place items"
                          value={selected.twTokens?.layout?.grid?.placeItems ?? "stretch"}
                          options={PLACE_ITEMS_PRESETS.map((x) => ({ value: x, label: x }))}
                          onValueChange={(v: any) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: {
                                  ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}),
                                  grid: { ...(((selected.twTokens ?? defaultTokensBase()).layout?.grid ?? {})), placeItems: v },
                                },
                              },
                            })
                          }
                        />
                      </>
                    )}
                    <Select
                      label="Position"
                      value={selected.twTokens?.layout?.position ?? "static"}
                      options={POSITION_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            layout: { ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}), position: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Z-Index"
                      value={selected.twTokens?.layout?.zIndex ?? "auto"}
                      options={zIndexOptions}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            layout: { ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}), zIndex: v },
                          },
                        })
                      }
                    />
                    {showOffsets ? (
                      <>
                        <Input
                          label="Top"
                          value={selected.twTokens?.layout?.top ?? ""}
                          onChange={(v) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: { ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}), top: v ? v : undefined },
                              },
                            })
                          }
                          dir="ltr"
                          placeholder="auto / 0 / 12px"
                        />
                        <Input
                          label="Right"
                          value={selected.twTokens?.layout?.right ?? ""}
                          onChange={(v) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: { ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}), right: v ? v : undefined },
                              },
                            })
                          }
                          dir="ltr"
                          placeholder="auto / 0 / 12px"
                        />
                        <Input
                          label="Bottom"
                          value={selected.twTokens?.layout?.bottom ?? ""}
                          onChange={(v) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: { ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}), bottom: v ? v : undefined },
                              },
                            })
                          }
                          dir="ltr"
                          placeholder="auto / 0 / 12px"
                        />
                        <Input
                          label="Left"
                          value={selected.twTokens?.layout?.left ?? ""}
                          onChange={(v) =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                layout: { ...((selected.twTokens ?? defaultTokensBase()).layout ?? {}), left: v ? v : undefined },
                              },
                            })
                          }
                          dir="ltr"
                          placeholder="auto / 0 / 12px"
                        />
                      </>
                    ) : null}
                    <Select
                      label="Padding"
                      value={selected.twTokens?.spacing?.padding ?? "none"}
                      options={PADDING_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            spacing: { ...((selected.twTokens ?? defaultTokensBase()).spacing ?? {}), padding: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Gap"
                      value={selected.twTokens?.spacing?.gap ?? "none"}
                      options={GAP_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            spacing: { ...((selected.twTokens ?? defaultTokensBase()).spacing ?? {}), gap: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="BG preset"
                      value={selected.twTokens?.style?.bg ?? "none"}
                      options={BG_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            style: { ...((selected.twTokens ?? defaultTokensBase()).style ?? {}), bg: v },
                          },
                        })
                      }
                    />
                    <ColorField
                      label="BG color"
                      value={selected.twTokens?.style?.bgColor}
                      onChange={(v) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            style: {
                              ...((selected.twTokens ?? defaultTokensBase()).style ?? {}),
                              bgColor: v,
                            },
                          },
                        })
                      }
                    />
                    <Select
                      label="Radius"
                      value={selected.twTokens?.style?.radius ?? "none"}
                      options={RADIUS_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            style: { ...((selected.twTokens ?? defaultTokensBase()).style ?? {}), radius: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Shadow"
                      value={selected.twTokens?.style?.shadow ?? "none"}
                      options={SHADOW_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            style: { ...((selected.twTokens ?? defaultTokensBase()).style ?? {}), shadow: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Text size"
                      value={selected.twTokens?.typography?.size ?? "base"}
                      options={TEXT_SIZE_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            typography: { ...((selected.twTokens ?? defaultTokensBase()).typography ?? {}), size: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Align"
                      value={selected.twTokens?.typography?.align ?? "left"}
                      options={TEXT_ALIGN_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            typography: { ...((selected.twTokens ?? defaultTokensBase()).typography ?? {}), align: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Weight"
                      value={selected.twTokens?.typography?.weight ?? "normal"}
                      options={FONT_WEIGHT_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            typography: { ...((selected.twTokens ?? defaultTokensBase()).typography ?? {}), weight: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Text color"
                      value={selected.twTokens?.typography?.color ?? "default"}
                      options={TEXT_COLOR_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            typography: { ...((selected.twTokens ?? defaultTokensBase()).typography ?? {}), color: v },
                          },
                        })
                      }
                    />
                    <ColorField
                      label="Text color"
                      value={selected.twTokens?.typography?.colorCustom}
                      onChange={(v) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            typography: {
                              ...((selected.twTokens ?? defaultTokensBase()).typography ?? {}),
                              colorCustom: v,
                            },
                          },
                        })
                      }
                    />
                    <Select
                      label="Max width"
                      value={selected.twTokens?.size?.maxW ?? "none"}
                      options={MAX_W_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            size: { ...((selected.twTokens ?? defaultTokensBase()).size ?? {}), maxW: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Hover"
                      value={selected.twTokens?.state?.hover ?? "none"}
                      options={HOVER_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            state: { ...((selected.twTokens ?? defaultTokensBase()).state ?? {}), hover: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Anim"
                      value={selected.twTokens?.motion?.anim ?? "none"}
                      options={ANIM_PRESETS.map((x) => ({ value: x, label: x }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            motion: { ...((selected.twTokens ?? defaultTokensBase()).motion ?? {}), anim: v },
                          },
                        })
                      }
                    />
                    <Select
                      label="Delay"
                      value={selected.twTokens?.motion?.delay ?? 0}
                      options={DELAY_PRESETS.map((x) => ({ value: x as any, label: String(x) }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            motion: { ...((selected.twTokens ?? defaultTokensBase()).motion ?? {}), delay: Number(v) },
                          },
                        })
                      }
                    />
                    <Select
                      label="Duration"
                      value={selected.twTokens?.motion?.duration ?? 300}
                      options={DURATION_PRESETS.map((x) => ({ value: x as any, label: String(x) }))}
                      onValueChange={(v: any) =>
                        patchSelected({
                          twTokens: {
                            ...(selected.twTokens ?? defaultTokensBase()),
                            motion: { ...((selected.twTokens ?? defaultTokensBase()).motion ?? {}), duration: Number(v) },
                          },
                        })
                      }
                    />

                  <div className="md:col-span-3">
                    <div className="mt-2 mb-2 text-xs font-semibold text-white/60">Decor (before/after)</div>
                    <div className="overflow-x-auto pb-2 -mx-1 px-1">
                      <div
                        className="grid gap-5 min-w-0"
                        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
                      >
                      <Select
                        label="Before shape"
                        value={selected.twTokens?.decor?.before?.shape ?? "none"}
                        options={DECOR_SHAPE_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                before: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before ?? {}), shape: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="Before place"
                        value={selected.twTokens?.decor?.before?.placement ?? "bottom"}
                        options={DECOR_PLACEMENT_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                before: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before ?? {}), placement: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="Before color"
                        value={selected.twTokens?.decor?.before?.color ?? "muted"}
                        options={DECOR_COLOR_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                before: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before ?? {}), color: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="Before size"
                        value={selected.twTokens?.decor?.before?.size ?? "md"}
                        options={DECOR_SIZE_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                before: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before ?? {}), size: v },
                              },
                            },
                          })
                        }
                      />

                      <Select
                        label="Before fill"
                        value={selected.twTokens?.decor?.before?.fill ?? "solid"}
                        options={DECOR_FILL_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                before: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before ?? {}), fill: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="Before opacity"
                        value={selected.twTokens?.decor?.before?.opacity ?? "20"}
                        options={["10","20","30","40","50"].map((x) => ({ value: x as any, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                before: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before ?? {}), opacity: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="Before blur"
                        value={selected.twTokens?.decor?.before?.blur ?? "0"}
                        options={DECOR_BLUR_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                before: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before ?? {}), blur: v },
                              },
                            },
                          })
                        }
                      />
                      <div className="flex items-end gap-2">
                        <label className="text-xs text-white/60">Before flip</label>
                        <Button
                          size="sm"
                          variant={(selected.twTokens?.decor?.before?.flipX ? "secondary" : "ghost") as any}
                          onClick={() =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                decor: {
                                  ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                  before: {
                                    ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before ?? {}),
                                    flipX: !(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before as any)?.flipX,
                                  },
                                },
                              },
                            })
                          }
                        >X</Button>
                        <Button
                          size="sm"
                          variant={(selected.twTokens?.decor?.before?.flipY ? "secondary" : "ghost") as any}
                          onClick={() =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                decor: {
                                  ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                  before: {
                                    ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before ?? {}),
                                    flipY: !(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).before as any)?.flipY,
                                  },
                                },
                              },
                            })
                          }
                        >Y</Button>
                      </div>

                      <Select
                        label="After shape"
                        value={selected.twTokens?.decor?.after?.shape ?? "none"}
                        options={DECOR_SHAPE_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                after: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after ?? {}), shape: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="After place"
                        value={selected.twTokens?.decor?.after?.placement ?? "bottom"}
                        options={DECOR_PLACEMENT_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                after: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after ?? {}), placement: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="After color"
                        value={selected.twTokens?.decor?.after?.color ?? "muted"}
                        options={DECOR_COLOR_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                after: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after ?? {}), color: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="After size"
                        value={selected.twTokens?.decor?.after?.size ?? "md"}
                        options={DECOR_SIZE_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                after: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after ?? {}), size: v },
                              },
                            },
                          })
                        }
                      />

                      <Select
                        label="After fill"
                        value={selected.twTokens?.decor?.after?.fill ?? "solid"}
                        options={DECOR_FILL_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                after: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after ?? {}), fill: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="After opacity"
                        value={selected.twTokens?.decor?.after?.opacity ?? "20"}
                        options={["10","20","30","40","50"].map((x) => ({ value: x as any, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                after: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after ?? {}), opacity: v },
                              },
                            },
                          })
                        }
                      />
                      <Select
                        label="After blur"
                        value={selected.twTokens?.decor?.after?.blur ?? "0"}
                        options={DECOR_BLUR_PRESETS.map((x) => ({ value: x, label: x }))}
                        onValueChange={(v: any) =>
                          patchSelected({
                            twTokens: {
                              ...(selected.twTokens ?? defaultTokensBase()),
                              decor: {
                                ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                after: { ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after ?? {}), blur: v },
                              },
                            },
                          })
                        }
                      />
                      <div className="flex items-end gap-2">
                        <label className="text-xs text-white/60">After flip</label>
                        <Button
                          size="sm"
                          variant={(selected.twTokens?.decor?.after?.flipX ? "secondary" : "ghost") as any}
                          onClick={() =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                decor: {
                                  ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                  after: {
                                    ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after ?? {}),
                                    flipX: !(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after as any)?.flipX,
                                  },
                                },
                              },
                            })
                          }
                        >X</Button>
                        <Button
                          size="sm"
                          variant={(selected.twTokens?.decor?.after?.flipY ? "secondary" : "ghost") as any}
                          onClick={() =>
                            patchSelected({
                              twTokens: {
                                ...(selected.twTokens ?? defaultTokensBase()),
                                decor: {
                                  ...((selected.twTokens ?? defaultTokensBase()).decor ?? {}),
                                  after: {
                                    ...(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after ?? {}),
                                    flipY: !(((selected.twTokens ?? defaultTokensBase()).decor ?? {}).after as any)?.flipY,
                                  },
                                },
                              },
                            })
                          }
                        >Y</Button>
                      </div>
                    </div>
                  </div>

                  </div>
                    </div>
                  </div>
                </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-white/70">تنسيق القسم المتقدم</div>
                  <Button size="sm" variant="ghost" onClick={() => setShowAdvancedStyle((v) => !v)}>
                    {showAdvancedStyle ? "إخفاء" : "إظهار"}
                  </Button>
                </div>
                {showAdvancedStyle ? (
                  <React.Suspense fallback={<div className="mt-2 text-sm text-white/60">Loading styling…</div>}>
                    <LazySectionStylingPanel
                      className="mt-2"
                      tokens={(selected.twTokens ?? defaultTokensBase()) as any}
                      onChange={(next) => patchSelected({ twTokens: next })}
                    />
                  </React.Suspense>
                ) : null}

                {/* Preview */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs font-semibold text-white/70 mb-2">Preview</div>
                  <div className="space-y-3">
                    <div className={cn(previewDecorations ? "relative" : undefined)}>
                      {previewDecorations ? <SectionDecorations decorations={previewDecorations} className="z-0" /> : null}
                      <div className={cn(previewDecorations ? "relative z-10" : undefined)}>
                      {selected && isChildCapable(selected.kind) && (() => {
                        const children = getChildren(selected);

                        const layoutClass = (() => {
                          switch (selected.kind) {
                            case "stack": return "flex flex-col";
                            case "row": return "flex flex-row flex-wrap";
                            case "grid": {
                              const cols = Math.min(6, Math.max(2, Number(selected.props?.cols ?? 2)));
                              const map: Record<number, string> = {
                                2: "grid grid-cols-1 md:grid-cols-2",
                                3: "grid grid-cols-1 md:grid-cols-3",
                                4: "grid grid-cols-1 md:grid-cols-4",
                                5: "grid grid-cols-1 md:grid-cols-5",
                                6: "grid grid-cols-1 md:grid-cols-6",
                              };
                              return map[cols] ?? "grid grid-cols-1 md:grid-cols-2";
                            }
                            case "columns": {
                              const cols = Math.min(4, Math.max(2, Number(selected.props?.cols ?? 2)));
                              const map: Record<number, string> = {
                                2: "grid grid-cols-1 md:grid-cols-2",
                                3: "grid grid-cols-1 md:grid-cols-3",
                                4: "grid grid-cols-1 md:grid-cols-4",
                              };
                              return map[cols] ?? "grid grid-cols-1 md:grid-cols-2";
                            }
                            default: return "";
                          }
                        })();

                        const wrapCls = cn("rounded-xl border border-white/10", previewClassName);

                        return (
                          <div className={wrapCls} style={previewStyle}>
                            <div className={cn(layoutClass, "gap-3")}>
                              {children.length ? children.map((c) => (
                                <div key={c.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-sm">
                                  {c.name ?? c.kind}
                                </div>
                              )) : (
                                <div className="text-sm text-white/60">No children yet.</div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {selected.kind === "text" && (() => {
                        const As = (selected.props?.as ?? "p") as any;
                        return <As className={previewClassName} style={previewStyle}>{selected.props?.text ?? ""}</As>;
                      })()}
                      {selected.kind === "badge" && (
                        <span className={cn("border border-black/10 dark:border-white/15", previewClassName)} style={previewStyle}>
                          {selected.props?.text ?? "Badge"}
                        </span>
                      )}
                      {selected.kind === "button" && (
                        <a href={selected.props?.href ?? "#"} className={cn(baseButtonClasses(selected.props?.variant), previewClassName)} style={previewStyle}>
                          {selected.props?.label ?? "Button"}
                        </a>
                      )}
                      {selected.kind === "input" && (
                        <div className={cn("space-y-2", previewClassName)} style={previewStyle}>
                          {selected.props?.label ? (
                            <label className="text-xs opacity-70">{selected.props?.label}</label>
                          ) : null}
                          <input
                            type={selected.props?.type ?? "text"}
                            name={selected.props?.name ?? undefined}
                            placeholder={selected.props?.placeholder ?? ""}
                            required={!!selected.props?.required}
                            className="w-full bg-transparent border-0 p-0 text-sm outline-none focus:ring-2 focus:ring-white/10"
                          />
                        </div>
                      )}
                      {selected.kind === "textarea" && (
                        <div className={cn("space-y-2", previewClassName)} style={previewStyle}>
                          {selected.props?.label ? (
                            <label className="text-xs opacity-70">{selected.props?.label}</label>
                          ) : null}
                          <textarea
                            rows={Number(selected.props?.rows ?? 4)}
                            name={selected.props?.name ?? undefined}
                            placeholder={selected.props?.placeholder ?? ""}
                            required={!!selected.props?.required}
                            className="w-full bg-transparent border-0 p-0 text-sm outline-none focus:ring-2 focus:ring-white/10"
                          />
                        </div>
                      )}
                      {selected.kind === "select" && (() => {
                        const rawOptions = Array.isArray(selected.props?.options) ? selected.props.options : [];
                        const options = rawOptions
                          .map((opt: any) => (typeof opt === "string" ? { label: opt, value: opt } : { label: opt?.label ?? opt?.value ?? "", value: opt?.value ?? opt?.label ?? "" }))
                          .filter((opt: any) => opt.label);
                        return (
                          <div className={cn("space-y-2", previewClassName)} style={previewStyle}>
                            {selected.props?.label ? (
                              <label className="text-xs opacity-70">{selected.props?.label}</label>
                            ) : null}
                            <select
                              name={selected.props?.name ?? undefined}
                              required={!!selected.props?.required}
                              className="w-full bg-transparent border-0 p-0 text-sm outline-none focus:ring-2 focus:ring-white/10"
                            >
                              {selected.props?.placeholder ? (
                                <option value="">{selected.props?.placeholder}</option>
                              ) : null}
                              {options.map((opt: any, idx: number) => (
                                <option key={`${opt.value}-${idx}`} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}
                      {selected.kind === "checkbox" && (
                        <label className={cn("inline-flex items-center gap-2", previewClassName)} style={previewStyle}>
                          <input
                            type="checkbox"
                            name={selected.props?.name ?? undefined}
                            defaultChecked={!!selected.props?.checked}
                            required={!!selected.props?.required}
                            className="h-4 w-4 rounded border border-white/20 bg-transparent"
                          />
                          <span className="text-sm">{selected.props?.label ?? "Checkbox"}</span>
                        </label>
                      )}
                      {selected.kind === "card" && (
                        <div className={cn("border border-black/10 dark:border-white/15", previewClassName)} style={previewStyle}>
                          <div className="space-y-2">
                            <div className="font-semibold">{selected.props?.title ?? "Card title"}</div>
                            <div className="opacity-80">{selected.props?.text ?? ""}</div>
                            {selected.props?.buttonLabel ? (
                              <a href={selected.props?.buttonHref ?? "#"} className={cn(baseButtonClasses(selected.props?.buttonVariant), "mt-2 inline-flex")}>
                                {selected.props?.buttonLabel}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      )}
                      {selected.kind === "list" && (
                        (selected.props?.ordered ? (
                          <ol className={cn("list-decimal ps-6", previewClassName)} style={previewStyle}>
                            {(selected.props?.items ?? []).map((it: string, i: number) => <li key={i}>{it}</li>)}
                          </ol>
                        ) : (
                          <ul className={cn("list-disc ps-6", previewClassName)} style={previewStyle}>
                            {(selected.props?.items ?? []).map((it: string, i: number) => <li key={i}>{it}</li>)}
                          </ul>
                        ))
                      )}
                      {selected.kind === "image" && selected.props?.src && (
                        <img src={selected.props?.src} alt={selected.props?.alt ?? ""} className={cn("max-w-full", previewClassName)} style={previewStyle} />
                      )}
                      {selected.kind === "icon" && selected.props?.d && (
                        <svg viewBox={selected.props?.viewBox ?? "0 0 24 24"} className={cn("h-6 w-6", previewClassName)} style={previewStyle} fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={selected.props?.d} />
                        </svg>
                      )}
                      {selected.kind === "svg" && (() => {
                        const props = selected.props ?? {};
                        const shapeKey = typeof props.shape === "string" ? props.shape : "";
                        const preset = shapeKey && shapeKey !== "custom" ? (SHAPES as any)[shapeKey] : undefined;
                        const viewBox = typeof props.viewBox === "string" ? props.viewBox : preset?.viewBox ?? "0 0 100 100";
                        const d = typeof props.d === "string" ? props.d : preset?.d ?? "";
                        const paths = Array.isArray(props.paths) ? props.paths : preset?.paths;
                        const preserveAspectRatio = typeof props.preserveAspectRatio === "string" ? props.preserveAspectRatio : "none";
                        const mode = props.mode === "fill" || props.mode === "stroke"
                          ? props.mode
                          : (shapeKey === "lines-horizontal" || shapeKey === "lines-diagonal" ? "stroke" : "fill");
                        const strokeWidth = Number.isFinite(Number(props.strokeWidth)) ? Number(props.strokeWidth) : 2;
                        const hasPath = (typeof d === "string" && d.trim()) || (Array.isArray(paths) && paths.length);
                        if (!hasPath) return null;
                        return (
                          <svg
                            viewBox={viewBox}
                            preserveAspectRatio={preserveAspectRatio}
                            className={cn("pointer-events-none block", previewClassName)}
                            style={previewStyle}
                            aria-hidden="true"
                          >
                            {Array.isArray(paths) && paths.length
                              ? paths.map((p, idx) => (
                                <path
                                  key={`${shapeKey || "custom"}-${idx}`}
                                  d={p}
                                  fill={mode === "stroke" ? "none" : "currentColor"}
                                  stroke={mode === "stroke" ? "currentColor" : undefined}
                                  strokeWidth={mode === "stroke" ? strokeWidth : undefined}
                                  strokeLinecap={mode === "stroke" ? "round" : undefined}
                                  strokeLinejoin={mode === "stroke" ? "round" : undefined}
                                />
                              ))
                              : (
                                <path
                                  d={d}
                                  fill={mode === "stroke" ? "none" : "currentColor"}
                                  stroke={mode === "stroke" ? "currentColor" : undefined}
                                  strokeWidth={mode === "stroke" ? strokeWidth : undefined}
                                  strokeLinecap={mode === "stroke" ? "round" : undefined}
                                  strokeLinejoin={mode === "stroke" ? "round" : undefined}
                                />
                              )}
                          </svg>
                        );
                      })()}
                      {selected.kind === "divider" && <hr className="border-white/15" style={previewStyle} />}
                      {selected.kind === "spacer" && <div className={spacerClass(selected.props?.h)} style={previewStyle} />}

                      {selected && isChildCapable(selected.kind) && (
                        <div className={cn("rounded-2xl border border-white/10", previewClassName)} style={previewStyle}>
                          <div className="text-xs text-white/60 mb-2">{selected.kind} ({getChildren(selected).length} children)</div>
                          <div className={cn(selected.kind === "stack" ? "flex flex-col" : selected.kind === "row" ? "flex flex-row flex-wrap" : selected.kind === "grid" || selected.kind === "columns" ? "grid" : "block", "gap-3")}>
                            {getChildren(selected).slice(0, 4).map((ch) => (
                              <div key={ch.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-2 text-xs text-white/70">
                                {ch.name ?? ch.kind}
                              </div>
                            ))}
                            {getChildren(selected).length > 4 ? <div className="text-xs text-white/50">…</div> : null}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!components.length && <div className="text-sm text-white/60">No components yet.</div>}
    </div>
  );
}

