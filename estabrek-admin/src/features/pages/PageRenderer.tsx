import React from "react";
import { useEffect, useState } from "react";
import type { PageSection, PageSectionType } from "../../api/pages.api";
import { sanitizeHtml } from "../../lib/sanitizeHtml";
import type {
  BannerData,
  CtaData,
  CustomHtmlData,
  FaqData,
  FeaturedCategoriesData,
  FeaturedProductsData,
  CollectionsGridData,
  GridData,
  FeaturesData,
  StatsData,
  TeamData,
  PricingData,
  ContactData,
  HeroData,
  ImageGalleryData,
  NewsletterData,
  ProductsSliderData,
  RichTextData,
  TestimonialsData,
  BrandsSliderData,
  CardsData,
  VideoData,
} from "./SectionEditor";
import { CmsComponentsRenderer } from "./CmsComponentsRenderer";
import { TypewriterText } from "../../components/effects/TypewriterText";
import { SectionDecorations } from "../../cms/decorations/DecorationLayer";
import type { TwTokens } from "../../cms/style/tokens";
import { tokensToClassName, tokensToInlineStyle } from "../../cms/style/tokensToTw";

function safeNum(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cls(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

function isItemVisible(item: any): boolean {
  if (item == null) return false;
  if (typeof item !== "object") return true;
  if ("hidden" in item) return item.hidden !== true;
  if ("isVisible" in item) return item.isVisible !== false;
  return true;
}

const HERO_ANIM_CLASS: Record<string, string> = {
  "fade-up": "anim-fade-up",
  "zoom-in": "anim-zoom-in",
  "slide-up": "anim-slide-up",
  "scale-in": "animate-scale-in",
};

const SPLIT_TEXT_EFFECTS = new Set(["wave", "bounce"]);

function splitTextWithEffect(text: string, effect?: string): { content: React.ReactNode; ariaLabel?: string } {
  if (!text || !effect || !SPLIT_TEXT_EFFECTS.has(effect)) {
    return { content: text };
  }
  const delayStep = effect === "wave" ? 0.06 : 0.04;
  const letters = Array.from(text);
  const content = letters.map((ch, idx) => (
    <span key={`${idx}-${ch}`} aria-hidden="true" style={{ animationDelay: `${idx * delayStep}s` }}>
      {ch === " " ? "\u00a0" : ch}
    </span>
  ));
  return { content, ariaLabel: text };
}

function textEffectClass(tokens?: any) {
  return tokensToClassName({ textEffect: tokens?.textEffect } as any);
}

function cardEffectClass(tokens?: any) {
  return tokensToClassName({ cardTemplate: tokens?.cardTemplate, hoverExtended: tokens?.hoverExtended, state: tokens?.state } as any);
}

function resolveFieldTokens<T>(fieldTokens: T | undefined | null, fallback?: T): T | undefined {
  if (fieldTokens === undefined || fieldTokens === null) return fallback;
  if (!fallback || typeof fieldTokens !== "object" || typeof fallback !== "object") return fieldTokens;
  const baseTypography = (fallback as any).typography;
  if (!baseTypography || typeof baseTypography !== "object") return fieldTokens;
  const fieldTypography = (fieldTokens as any).typography;
  return {
    ...(fieldTokens as any),
    typography: { ...baseTypography, ...(fieldTypography ?? {}) },
  } as T;
}

function stripTextEffectTokens(tokens?: any) {
  if (!tokens || typeof tokens !== "object" || !("textEffect" in tokens)) return tokens;
  return { ...tokens, textEffect: undefined };
}

function hasTypographyOverrides(tokens?: any): boolean {
  const typography = tokens?.typography;
  if (!typography || typeof typography !== "object") return false;
  if (typography.family) return true;
  if (typography.size && typography.size !== "base") return true;
  if (typography.align && typography.align !== "left") return true;
  if (typography.weight && typography.weight !== "normal") return true;
  if (typography.color && typography.color !== "default") return true;
  if (typography.colorCustom) return true;
  if (typography.lineHeight) return true;
  if (typography.letterSpacing) return true;
  if (typography.decoration) return true;
  if (typography.transform) return true;
  if (typography.truncate) return true;
  if (typography.lineClamp) return true;
  return false;
}

function tokensClass(tokens?: any): string {
  return cls(tokensToClassName(stripTextEffectTokens(tokens)), hasTypographyOverrides(tokens) ? "cms-section-text" : undefined);
}

function tokensStyle(tokens?: any): React.CSSProperties | undefined {
  return tokensToInlineStyle(tokens);
}

function textContent(text: string, tokens?: any) {
  const value = typeof text === "string" ? text : String(text ?? "");
  const effect = tokens?.textEffect;
  const typewriter = tokens?.typewriter;
  const typewriterTexts = Array.isArray(typewriter?.texts) && typewriter.texts.length
    ? typewriter.texts
    : value
      ? [value]
      : [];
  const useTypewriter = !!(typewriter?.enabled && typewriterTexts.length);

  if (useTypewriter) {
    const allowEffect = effect && effect !== "none" && !SPLIT_TEXT_EFFECTS.has(effect) && effect !== "typewriter";
    const typewriterClass = allowEffect ? textEffectClass(tokens) : "";
    return {
      useTypewriter: true,
      ariaLabel: undefined as string | undefined,
      className: "",
      content: (
        <TypewriterText
          texts={typewriterTexts}
          typeSpeed={typewriter?.speed}
          deleteSpeed={typewriter?.deleteSpeed}
          pauseTime={typewriter?.pauseTime}
          loop={typewriter?.loop ?? true}
          textClassName={typewriterClass || undefined}
        />
      ),
    };
  }

  const split = splitTextWithEffect(value, effect);
  return { useTypewriter: false, ariaLabel: split.ariaLabel, className: textEffectClass(tokens), content: split.content };
}

type InlineEditPayload = {
  sectionId: string;
  path: Array<string | number>;
  value: string;
};

type InlineEditContextValue = {
  enabled: boolean;
  onCommit?: (payload: InlineEditPayload) => void;
};

type SectionSelectHandler = (sectionId: string) => void;

const InlineEditContext = React.createContext<InlineEditContextValue | null>(null);
const InlineSectionContext = React.createContext<string | null>(null);

type ElementPath = Array<string | number>;

type ElementMeta = {
  kind: string;
  label?: string;
  valuePath?: ElementPath;
  tokensPath?: ElementPath;
};

export type SelectedElement = ElementMeta & {
  sectionId: string;
  key: string;
};

type ElementSelectHandler = (payload: SelectedElement) => void;

type InlineSelectContextValue = {
  selected?: SelectedElement | null;
  onSelect?: ElementSelectHandler;
};

const InlineSelectContext = React.createContext<InlineSelectContextValue | null>(null);

const SELECTED_ELEMENT_CLASS = "ring-2 ring-accent-500/40 ring-offset-2 ring-offset-black/40";
const SELECTED_TEXT_CLASS = "outline outline-1 outline-accent-500/50 outline-offset-2 rounded-sm";

function elementKey(meta: ElementMeta): string {
  return `${meta.kind}:${JSON.stringify(meta.valuePath ?? [])}:${JSON.stringify(meta.tokensPath ?? [])}`;
}

function buildSelectedElement(sectionId: string, meta: ElementMeta): SelectedElement {
  return { ...meta, sectionId, key: elementKey(meta) };
}

function isElementSelected(selected: SelectedElement | null | undefined, sectionId: string, meta: ElementMeta): boolean {
  return !!selected && String(selected.sectionId) === String(sectionId) && selected.key === elementKey(meta);
}

function elementDataAttrs(meta: ElementMeta, sectionId: string, selected: boolean) {
  return {
    "data-cms-element": meta.kind,
    "data-cms-key": elementKey(meta),
    "data-cms-label": meta.label,
    "data-cms-value-path": meta.valuePath ? JSON.stringify(meta.valuePath) : undefined,
    "data-cms-tokens-path": meta.tokensPath ? JSON.stringify(meta.tokensPath) : undefined,
    "data-cms-selected": selected ? "true" : undefined,
  } as const;
}

function parseElementPath(raw?: string): ElementPath | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function resolveElementMeta(target: HTMLElement | null): ElementMeta | null {
  if (!target) return null;
  const node = target.closest("[data-cms-element]") as HTMLElement | null;
  if (!node) return null;
  const kind = node.dataset.cmsElement;
  if (!kind) return null;
  return {
    kind,
    label: node.dataset.cmsLabel,
    valuePath: parseElementPath(node.dataset.cmsValuePath),
    tokensPath: parseElementPath(node.dataset.cmsTokensPath),
  };
}

function elementState(sectionId: string, selectedElement: SelectedElement | null | undefined, meta: ElementMeta) {
  const selected = isElementSelected(selectedElement, sectionId, meta);
  return { selected, attrs: elementDataAttrs(meta, sectionId, selected) };
}

type InlineEditableTextProps = {
  as?: React.ElementType;
  value: string;
  path?: Array<string | number>;
  textData?: { content: React.ReactNode; ariaLabel?: string; className?: string };
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  multiline?: boolean;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  selectKind?: string;
  selectLabel?: string;
  selectTokensPath?: ElementPath;
  selectHighlight?: boolean;
};

function InlineEditableText({
  as: As = "span",
  value,
  path,
  textData,
  className,
  style,
  ariaLabel,
  multiline,
  dir,
  placeholder,
  selectKind,
  selectLabel,
  selectTokensPath,
  selectHighlight = true,
}: InlineEditableTextProps) {
  const inline = React.useContext(InlineEditContext);
  const sectionId = React.useContext(InlineSectionContext);
  const selectContext = React.useContext(InlineSelectContext);
  const canEdit = Boolean(inline?.enabled && inline?.onCommit && sectionId && path?.length);
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const isPlaceholder = canEdit && !draft && !!placeholder;
  const displayValue = canEdit ? (draft || (placeholder ?? "")) : (textData?.content ?? value);
  const canSelect = !!sectionId && !!path?.length;
  const selectionMeta = canSelect
    ? {
        kind: selectKind ?? "text",
        valuePath: path,
        tokensPath: selectTokensPath,
        label: selectLabel ?? ariaLabel ?? placeholder,
      }
    : null;
  const isSelected =
    !!selectionMeta && !!sectionId
      ? isElementSelected(selectContext?.selected, sectionId, selectionMeta)
      : false;
  const selectionAttrs = selectionMeta
    ? elementDataAttrs(selectionMeta, sectionId ?? "", isSelected)
    : undefined;

  return (
    <As
      contentEditable={canEdit}
      suppressContentEditableWarning
      className={cls(
        className,
        canEdit ? "cursor-text rounded-md outline outline-1 outline-transparent focus:outline-white/30 focus:bg-white/[0.04] transition" : undefined,
        isPlaceholder ? "text-white/40 italic" : undefined,
        isSelected && selectHighlight ? SELECTED_TEXT_CLASS : undefined
      )}
      style={style}
      aria-label={ariaLabel ?? textData?.ariaLabel}
      dir={dir}
      {...selectionAttrs}
      onClick={canEdit ? (e: React.MouseEvent) => e.preventDefault() : undefined}
      onFocus={
        canEdit
          ? (e: React.FocusEvent) => {
              setEditing(true);
              if (isPlaceholder) {
                setDraft("");
                (e.currentTarget as HTMLElement).textContent = "";
              }
            }
          : undefined
      }
      onInput={
        canEdit
          ? (e: React.FormEvent) => {
              setDraft((e.currentTarget as HTMLElement).textContent ?? "");
            }
          : undefined
      }
      onKeyDown={
        canEdit
          ? (e: React.KeyboardEvent) => {
              if (!multiline && e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLElement).blur();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setDraft(value);
                (e.currentTarget as HTMLElement).textContent = value;
                (e.currentTarget as HTMLElement).blur();
              }
            }
          : undefined
      }
      onBlur={
        canEdit
          ? (e: React.FocusEvent) => {
              setEditing(false);
              let nextValue = (e.currentTarget as HTMLElement).textContent ?? "";
              if (placeholder && !value && nextValue === placeholder) {
                nextValue = "";
              }
              if (nextValue !== value) {
                inline?.onCommit?.({ sectionId: String(sectionId), path: path ?? [], value: nextValue });
              }
            }
          : undefined
      }
    >
      {displayValue}
    </As>
  );
}

function heroAnimClass(anim?: string, duration?: number, delay?: number) {
  if (!anim || anim === "none") return "";
  const dur = Number.isFinite(duration as number) ? `animation-duration-${duration}` : "";
  const del = Number.isFinite(delay as number) ? `animation-delay-${delay}` : "";
  return cls(HERO_ANIM_CLASS[anim] ?? "", dur, del);
}

function uiSectionClass(data: any) {
  const ui = data?.ui;
  const base = typeof ui?.sectionClass === "string" ? ui.sectionClass : "";
  const tokens = data?.twTokens;
  return cls(base, tokensToClassName(stripTextEffectTokens(tokens)), hasTypographyOverrides(tokens) ? "cms-section-text" : undefined);
}

function uiSectionStyle(data: any) {
  const tokens = data?.twTokens;
  return tokensToInlineStyle(tokens);
}

function uiContainerClass(data: any) {
  const ui = data?.ui;
  return typeof ui?.containerClass === "string" ? ui.containerClass : "";
}

function sectionTextScopeProps(data: any) {
  const tokens = data?.twTokens;
  const typography = tokens?.typography;
  if (!typography) return null;
  return {
    className: cls("cms-section-text", tokensToClassName({ typography } as any)),
    style: tokensToInlineStyle({ typography } as any),
  };
}

function SectionTextScope({ data, children }: { data: any; children: React.ReactNode }) {
  const props = sectionTextScopeProps(data);
  if (!props) return <>{children}</>;
  return (
    <div className={props.className} style={props.style}>
      {children}
    </div>
  );
}

function sectionDecorations(tokens?: TwTokens) {
  const decor = tokens?.decor;
  if (!decor) return null;
  const before = decor.before;
  const after = decor.after;
  const hasBefore = !!before?.shape && before.shape !== "none";
  const hasAfter = !!after?.shape && after.shape !== "none";
  if (!hasBefore && !hasAfter) return null;
  return { before: hasBefore ? before : undefined, after: hasAfter ? after : undefined };
}

const INLINE_DECOR_TAGS = new Set([
  "span",
  "a",
  "button",
  "label",
  "strong",
  "em",
  "small",
  "b",
  "i",
  "u",
  "code",
  "kbd",
  "mark",
  "s",
  "sub",
  "sup",
]);

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function wrapDecorations(node: React.ReactElement, tokens?: TwTokens) {
  const decorations = sectionDecorations(tokens);
  if (!decorations) return node;
  const className = node.props?.className;
  const wantsOverflowHidden = typeof className === "string" && className.includes("overflow-hidden");
  const cleanedClassName =
    wantsOverflowHidden && typeof className === "string"
      ? className.replace(/\boverflow-hidden\b/g, "").trim()
      : className;
  const tagName = typeof node.type === "string" ? node.type : (typeof node.props?.as === "string" ? node.props.as : undefined);
  const isInline = !!tagName && INLINE_DECOR_TAGS.has(tagName);
  const isVoid = !!tagName && VOID_ELEMENTS.has(tagName);
  const mergedClassName = cls(cleanedClassName, "relative", "overflow-visible");
  const innerClassName = cls(
    "relative z-10",
    wantsOverflowHidden ? "overflow-hidden" : undefined,
    isInline ? "inline-block" : "block"
  );
  const innerStyle = wantsOverflowHidden ? { borderRadius: "inherit" } : undefined;
  if (typeof node.type !== "string") {
    const Wrapper = isInline ? "span" : "div";
    return (
      <Wrapper className={cls("relative overflow-visible", isInline ? "inline-block" : "block")}>
        <SectionDecorations decorations={decorations} className="z-0" />
        <span className={innerClassName} style={innerStyle}>
          {node}
        </span>
      </Wrapper>
    );
  }
  if (isVoid) {
    const Wrapper = isInline ? "span" : "div";
    return (
      <Wrapper className={cls("relative overflow-visible", isInline ? "inline-block" : "block")}>
        <SectionDecorations decorations={decorations} className="z-0" />
        <span className={innerClassName} style={innerStyle}>
          {node}
        </span>
      </Wrapper>
    );
  }
  return React.cloneElement(
    node,
    { className: mergedClassName },
    <>
      <SectionDecorations decorations={decorations} className="z-0" />
      <span className={innerClassName} style={innerStyle}>
        {node.props?.children}
      </span>
    </>
  );
}

function sectionComponents(data: any) {
  const list = data?.components;
  return Array.isArray(list) ? list : [];
}

function ComponentsBlock({ data, className }: { data: any; className?: string }) {
  const sectionId = React.useContext(InlineSectionContext);
  const selectContext = React.useContext(InlineSelectContext);
  const components = sectionComponents(data);
  if (!components.length) return null;
  const inheritTokens = data?.twTokens?.typography ? { typography: data.twTokens.typography } : undefined;
  const selection = sectionId ? { sectionId, selectedElement: selectContext?.selected ?? null } : undefined;
  return (
    <div className={cls("mt-6", className)}>
      <SectionTextScope data={data}>
        <CmsComponentsRenderer components={components} inheritTokens={inheritTokens} selection={selection} />
      </SectionTextScope>
    </div>
  );
}

function renderComponentsBlock(data: any, className?: string) {
  return <ComponentsBlock data={data} className={className} />;
}

type SectionLayoutMode = "stack" | "row" | "grid";

type SectionLayoutConfig = {
  mode: SectionLayoutMode;
  group?: string;
  columns: number;
  span: number;
};

type SectionGroup = {
  key: string;
  groupKey?: string;
  mode: SectionLayoutMode;
  columns: number;
  sections: PageSection[];
};

const SECTION_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-4",
  5: "grid-cols-1 md:grid-cols-5",
  6: "grid-cols-1 md:grid-cols-6",
};

const SECTION_COL_SPAN: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeSectionLayout(raw: any): SectionLayoutConfig {
  const layout = raw && typeof raw === "object" ? raw : {};
  const mode = layout.mode === "row" || layout.mode === "grid" ? layout.mode : "stack";
  const group = typeof layout.group === "string" ? layout.group.trim() : "";
  const columns = clampInt(layout.columns, 1, 6, 2);
  const span = clampInt(layout.span, 1, columns, 1);
  return { mode, group: group || undefined, columns, span };
}

function buildSectionGroups(sections: PageSection[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  for (const sec of sections) {
    const layout = normalizeSectionLayout((sec as any)?.data?.layout);
    const groupKey =
      layout.mode !== "stack"
        ? (layout.group ? `${layout.mode}:${layout.group}` : `auto:${layout.mode}:${layout.columns}`)
        : "";
    const last = groups[groups.length - 1];
    if (groupKey && last && last.groupKey === groupKey) {
      last.sections.push(sec);
    } else {
      const key = groupKey ? `${groupKey}:${sec.id}` : `${layout.mode}:${sec.id}`;
      groups.push({ key, groupKey: groupKey || undefined, mode: layout.mode, columns: layout.columns, sections: [sec] });
    }
  }
  return groups;
}

function HeroSection({
  data,
  sectionId,
  selectedElement,
}: {
  data: HeroData;
  sectionId: string;
  selectedElement?: SelectedElement | null;
}) {
  const slides = Array.isArray((data as any).slides) ? ((data as any).slides as any[]) : [];
  const hasSlides = slides.length > 0;
  const [activeSlide, setActiveSlide] = useState(0);
  const autoplayMs = safeNum((data as any).autoplayMs, 0);
  const showDots = (data as any).showDots ?? true;

  useEffect(() => {
    if (!hasSlides) return;
    setActiveSlide((idx) => Math.min(idx, slides.length - 1));
  }, [hasSlides, slides.length]);

  useEffect(() => {
    if (!hasSlides || !autoplayMs || autoplayMs <= 0) return;
    const id = setInterval(() => {
      setActiveSlide((idx) => (idx + 1) % slides.length);
    }, autoplayMs);
    return () => clearInterval(id);
  }, [autoplayMs, hasSlides, slides.length]);

  const s = hasSlides ? slides[activeSlide] ?? slides[0] : data;
  const overlay = Math.min(1, Math.max(0, safeNum((s as any).overlay ?? data.overlay, 0.35)));
  const align = ((s as any).align ?? data.align ?? "center") as any;
  const justify = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";
  const componentsBlock = renderComponentsBlock(data);
  const primaryButton = (s as any).primaryButton;
  const secondaryButton = (s as any).secondaryButton;
  const sectionTokens = (data as any)?.twTokens;
  const slideTokens = resolveFieldTokens((s as any).slideTokens);
  const baseSlideTokens = slideTokens ?? sectionTokens;
  const titleTokens = resolveFieldTokens((s as any).titleTokens, baseSlideTokens);
  const subtitleTokens = resolveFieldTokens((s as any).subtitleTokens, baseSlideTokens);
  const primaryButtonTokens = resolveFieldTokens((s as any).primaryButtonTokens, baseSlideTokens);
  const secondaryButtonTokens = resolveFieldTokens((s as any).secondaryButtonTokens, baseSlideTokens);
  const titleValue = (s as any).title || "";
  const titlePath = hasSlides ? ["slides", activeSlide, "title"] : ["title"];
  const subtitlePath = hasSlides ? ["slides", activeSlide, "subtitle"] : ["subtitle"];
  const primaryLabelPath = hasSlides ? ["slides", activeSlide, "primaryButton", "label"] : ["primaryButton", "label"];
  const secondaryLabelPath = hasSlides ? ["slides", activeSlide, "secondaryButton", "label"] : ["secondaryButton", "label"];
  const titleData = textContent(String(titleValue), titleTokens);
  const subtitleValue = (s as any).subtitle;
  const subtitleData = subtitleValue ? textContent(String(subtitleValue), subtitleTokens) : null;
  const primaryLabelData = primaryButton?.label ? textContent(String(primaryButton.label), primaryButtonTokens) : null;
  const secondaryLabelData = secondaryButton?.label ? textContent(String(secondaryButton.label), secondaryButtonTokens) : null;
  const slideAnim = (data as any).slideAnim ?? "none";
  const slideDuration = safeNum((data as any).slideDuration, 600);
  const contentAnim = (data as any).contentAnim ?? "fade-up";
  const contentDuration = safeNum((data as any).contentDuration, 400);
  const contentDelay = safeNum((data as any).contentDelay, 0);
  const slideAnimClass = heroAnimClass(slideAnim, slideDuration, 0);
  const contentAnimClass = heroAnimClass(contentAnim, contentDuration, contentDelay);
  const slideKey = `${activeSlide}-${slideAnim}-${slideDuration}`;
  const contentKey = `${activeSlide}-${contentAnim}-${contentDuration}-${contentDelay}`;

  const primaryTokensPath = hasSlides ? ["slides", activeSlide, "primaryButtonTokens"] : ["primaryButtonTokens"];
  const secondaryTokensPath = hasSlides ? ["slides", activeSlide, "secondaryButtonTokens"] : ["secondaryButtonTokens"];

  return wrapDecorations(
    <section className={cls("overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03]", uiSectionClass(data))} style={uiSectionStyle(data)}>
      <div
        key={slideKey}
        className={cls("relative min-h-[260px]", uiContainerClass(data), slideAnimClass, tokensClass(slideTokens))}
        style={
          (s as any).backgroundImageUrl
            ? {
                backgroundImage: `url(${(s as any).backgroundImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                ...(tokensStyle(slideTokens) ?? {}),
              }
            : tokensStyle(slideTokens)
        }
      >
        <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlay})` }} />
        <SectionTextScope data={data}>
          <div key={contentKey} className={cls("relative flex h-full min-h-[260px] flex-col justify-center gap-3 p-8", justify, contentAnimClass)}>
            {wrapDecorations(
              <InlineEditableText
                as="h2"
                value={String(titleValue)}
                path={titlePath}
                textData={titleData}
                className={cls("text-2xl font-bold", tokensClass(titleTokens), titleData.className)}
                style={tokensStyle(titleTokens)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Hero title"
              />,
              titleTokens
            )}
            {subtitleData ? wrapDecorations(
              <InlineEditableText
                as="p"
                value={String(subtitleValue ?? "")}
                path={subtitlePath}
                textData={subtitleData}
                className={cls("max-w-[60ch] text-sm opacity-90", tokensClass(subtitleTokens), subtitleData.className)}
                style={tokensStyle(subtitleTokens)}
                ariaLabel={subtitleData.ariaLabel}
                placeholder="Hero subtitle"
                multiline
              />,
              subtitleTokens
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {primaryButton?.label ? (
                primaryButton?.href ? (
                  wrapDecorations(
                    <a
                      href={primaryButton.href}
                      className={cls(
                        "rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95",
                        tokensClass(primaryButtonTokens),
                        elementState(sectionId, selectedElement, {
                          kind: "button",
                          valuePath: primaryLabelPath,
                          tokensPath: primaryTokensPath,
                          label: primaryButton.label,
                        }).selected
                          ? SELECTED_ELEMENT_CLASS
                          : undefined
                      )}
                      style={{ backgroundColor: "var(--accent-2, #ffffff)", ...(tokensStyle(primaryButtonTokens) ?? {}) }}
                      {...elementState(sectionId, selectedElement, {
                        kind: "button",
                        valuePath: primaryLabelPath,
                        tokensPath: primaryTokensPath,
                        label: primaryButton.label,
                      }).attrs}
                    >
                      <InlineEditableText
                        as="span"
                        value={String(primaryButton.label)}
                        path={primaryLabelPath}
                        textData={primaryLabelData ?? undefined}
                        className={primaryLabelData?.className}
                        ariaLabel={primaryLabelData?.ariaLabel}
                        placeholder="Button"
                        selectKind="button"
                        selectTokensPath={primaryTokensPath}
                        selectHighlight={false}
                      />
                    </a>,
                    primaryButtonTokens
                  )
                ) : (
                  wrapDecorations(
                    <InlineEditableText
                      as="span"
                      value={String(primaryButton.label)}
                      path={primaryLabelPath}
                      textData={primaryLabelData ?? undefined}
                      className={cls(
                        "rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] opacity-90",
                        tokensClass(primaryButtonTokens),
                        primaryLabelData?.className
                      )}
                      style={{ backgroundColor: "var(--accent-2, #ffffff)", ...(tokensStyle(primaryButtonTokens) ?? {}) }}
                      ariaLabel={primaryLabelData?.ariaLabel}
                      placeholder="Button"
                      selectKind="button"
                      selectTokensPath={primaryTokensPath}
                    />,
                    primaryButtonTokens
                  )
                )
              ) : null}
              {secondaryButton?.label ? (
                secondaryButton?.href ? (
                  wrapDecorations(
                    <a
                      href={secondaryButton.href}
                      className={cls(
                        "rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold hover:bg-white/[0.08]",
                        tokensClass(secondaryButtonTokens),
                        elementState(sectionId, selectedElement, {
                          kind: "button",
                          valuePath: secondaryLabelPath,
                          tokensPath: secondaryTokensPath,
                          label: secondaryButton.label,
                        }).selected
                          ? SELECTED_ELEMENT_CLASS
                          : undefined
                      )}
                      style={tokensStyle(secondaryButtonTokens)}
                      {...elementState(sectionId, selectedElement, {
                        kind: "button",
                        valuePath: secondaryLabelPath,
                        tokensPath: secondaryTokensPath,
                        label: secondaryButton.label,
                      }).attrs}
                    >
                      <InlineEditableText
                        as="span"
                        value={String(secondaryButton.label)}
                        path={secondaryLabelPath}
                        textData={secondaryLabelData ?? undefined}
                        className={secondaryLabelData?.className}
                        ariaLabel={secondaryLabelData?.ariaLabel}
                        placeholder="Button"
                        selectKind="button"
                        selectTokensPath={secondaryTokensPath}
                        selectHighlight={false}
                      />
                    </a>,
                    secondaryButtonTokens
                  )
                ) : (
                  wrapDecorations(
                    <InlineEditableText
                      as="span"
                      value={String(secondaryButton.label)}
                      path={secondaryLabelPath}
                      textData={secondaryLabelData ?? undefined}
                      className={cls(
                        "rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/90",
                        tokensClass(secondaryButtonTokens),
                        secondaryLabelData?.className
                      )}
                      style={tokensStyle(secondaryButtonTokens)}
                      ariaLabel={secondaryLabelData?.ariaLabel}
                      placeholder="Button"
                      selectKind="button"
                      selectTokensPath={secondaryTokensPath}
                    />,
                    secondaryButtonTokens
                  )
                )
              ) : null}
            </div>
          </div>
        </SectionTextScope>
        {showDots && slides.length > 1 ? (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {slides.map((_: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={cls(
                  "h-2 w-2 rounded-full transition",
                  idx === activeSlide ? "bg-white" : "bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
      {componentsBlock}
    </section>,
    (data as any)?.twTokens
  );
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (u.hostname.includes("youtube")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      // /embed/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("embed");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
  } catch {
    // ignore
  }
  return null;
}

function vimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const id = parts.find((p) => /^\d+$/.test(p));
    return id || null;
  } catch {
    return null;
  }
}

function Section({
  type,
  data,
  sectionId,
  selectedElement,
}: {
  type: PageSectionType;
  data: any;
  sectionId: string;
  selectedElement?: SelectedElement | null;
}) {
  const getElementState = (meta: ElementMeta) => elementState(sectionId, selectedElement, meta);
  if (!data || typeof data !== "object") return null;

  if (type === "HERO") {
    return <HeroSection data={data as HeroData} sectionId={sectionId} selectedElement={selectedElement} />;
  }

  if (type === "RICH_TEXT") {
    const d = data as RichTextData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const htmlEffectClass = textEffectClass(sectionTokens);
    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("mb-3 text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Section title"
              />
            ) : null}
            <div
              className={cls("prose prose-invert max-w-none", htmlEffectClass)}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.html ?? "") }}
            />
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "CUSTOM_HTML") {
    const d = data as CustomHtmlData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const htmlEffectClass = textEffectClass(sectionTokens);
    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-4xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className={cls("prose prose-invert max-w-none", htmlEffectClass)} dangerouslySetInnerHTML={{ __html: sanitizeHtml(d.html ?? "") }} />
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "BANNER") {
    const d = data as BannerData;
    const variant = d.variant ?? "info";
    const color =
      variant === "success"
        ? "border-emerald-500/30 bg-emerald-500/10"
        : variant === "warning"
          ? "border-amber-500/30 bg-amber-500/10"
          : variant === "danger"
            ? "border-red-500/30 bg-red-500/10"
            : "border-sky-500/30 bg-sky-500/10";

    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const textData = textContent(String(d.text ?? ""), sectionTokens);
    const linkValue = d.linkLabel || d.linkHref || "";
    const linkData = d.linkHref ? textContent(String(linkValue), sectionTokens) : null;
    return wrapDecorations(
      <section className={cls("rounded-3xl border p-5", color, uiSectionClass(d))} style={uiSectionStyle(d)}>
        <SectionTextScope data={d}>
          <div className={cls("flex flex-col gap-2 md:flex-row md:items-center md:justify-between", uiContainerClass(d))}>
            <InlineEditableText
              as="div"
              value={String(d.text ?? "")}
              path={["text"]}
              textData={textData}
              className={cls("text-sm opacity-90", textData.className)}
              ariaLabel={textData.ariaLabel}
              placeholder="Banner text"
              multiline
            />
            {d.linkLabel && d.linkHref ? (
              (() => {
                const linkState = getElementState({
                  kind: "button",
                  valuePath: ["linkLabel"],
                  label: d.linkLabel ?? "Link",
                });
                return (
              <a
                {...linkState.attrs}
                className={cls(
                  "text-sm font-semibold underline decoration-white/30 underline-offset-4 hover:decoration-white/60",
                  linkData?.className,
                  linkState.selected ? SELECTED_ELEMENT_CLASS : undefined
                )}
                href={d.linkHref}
              >
                <InlineEditableText
                  as="span"
                  value={String(d.linkLabel ?? "")}
                  path={["linkLabel"]}
                  textData={linkData ?? undefined}
                  className={linkData?.className}
                  ariaLabel={linkData?.ariaLabel}
                  placeholder="Link"
                  selectKind="button"
                  selectHighlight={false}
                />
              </a>
                );
              })()
            ) : null}
          </div>
        </SectionTextScope>
        {componentsBlock}
      </section>
    );
  }

  if (type === "CTA") {
    const d = data as CtaData;
    const align = d.align ?? "center";
    const justify = align === "left" ? "text-left items-start" : align === "right" ? "text-right items-end" : "text-center items-center";
    const imageAlign = align === "left" ? "self-start" : align === "right" ? "self-end" : "self-center";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    const buttonData = d.buttonLabel ? textContent(String(d.buttonLabel), sectionTokens) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <div className={cls("flex flex-col gap-3", justify)}>
              {d.imageUrl ? (
                (() => {
                  const imageState = getElementState({
                    kind: "image",
                    valuePath: ["imageUrl"],
                    label: d.title ?? "CTA image",
                  });
                  return (
                    <img
                      {...imageState.attrs}
                      src={d.imageUrl}
                      alt={d.title ?? "CTA image"}
                      className={cls(
                        "h-40 w-full max-w-xl rounded-2xl border border-white/10 object-cover",
                        imageAlign,
                        imageState.selected ? SELECTED_ELEMENT_CLASS : undefined
                      )}
                    />
                  );
                })()
              ) : null}
              {titleData ? (
                <InlineEditableText
                  as="div"
                  value={String(d.title ?? "")}
                  path={["title"]}
                  textData={titleData}
                  className={cls("text-xl font-semibold", titleData.className)}
                  ariaLabel={titleData.ariaLabel}
                  placeholder="CTA title"
                />
              ) : null}
              {subtitleData ? (
                <InlineEditableText
                  as="div"
                  value={String(d.subtitle ?? "")}
                  path={["subtitle"]}
                  textData={subtitleData}
                  className={cls("text-sm opacity-80", subtitleData.className)}
                  ariaLabel={subtitleData.ariaLabel}
                  placeholder="CTA subtitle"
                  multiline
                />
              ) : null}
              {d.buttonLabel ? (
                d.buttonHref ? (
                  (() => {
                    const buttonState = getElementState({
                      kind: "button",
                      valuePath: ["buttonLabel"],
                      label: d.buttonLabel ?? "Button",
                    });
                    return (
                      <a
                        {...buttonState.attrs}
                        href={d.buttonHref}
                        className={cls(
                          "mt-2 inline-flex w-fit rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95",
                          buttonData?.className,
                          buttonState.selected ? SELECTED_ELEMENT_CLASS : undefined
                        )}
                        style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
                      >
                        <InlineEditableText
                          as="span"
                          value={String(d.buttonLabel ?? "")}
                          path={["buttonLabel"]}
                          textData={buttonData ?? undefined}
                          className={buttonData?.className}
                          ariaLabel={buttonData?.ariaLabel}
                          placeholder="Button"
                          selectKind="button"
                          selectHighlight={false}
                        />
                      </a>
                    );
                  })()
                ) : (
                  <InlineEditableText
                    as="span"
                    value={String(d.buttonLabel ?? "")}
                    path={["buttonLabel"]}
                    textData={buttonData ?? undefined}
                    className={cls(
                      "mt-2 inline-flex w-fit rounded-xl px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast,#0B0B0B)] opacity-90",
                      buttonData?.className
                    )}
                    style={{ backgroundColor: "var(--accent-2, #ffffff)" }}
                    ariaLabel={buttonData?.ariaLabel}
                    placeholder="Button"
                    selectKind="button"
                  />
                )
              ) : null}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "FAQ") {
    const d = data as FaqData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-3xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("mb-3 text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="FAQ title"
              />
            ) : null}
            <div className="space-y-3">
              {(d.items ?? []).map((it, idx) => {
                if (!isItemVisible(it)) return null;
                const itemTokens = resolveFieldTokens((it as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const questionTokens = resolveFieldTokens((it as any).questionTokens, baseItemTokens);
                const answerTokens = resolveFieldTokens((it as any).answerTokens, baseItemTokens);
                const cardState = getElementState({
                  kind: "card",
                  valuePath: ["items", idx],
                  tokensPath: ["items", idx, "twTokens"],
                  label: it.question ?? `FAQ ${idx + 1}`,
                });
                const node = (
                  <div
                    key={idx}
                    {...cardState.attrs}
                    className={cls(
                      "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                      tokensClass(itemTokens),
                      cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                    )}
                    style={tokensStyle(itemTokens)}
                  >
                    {(() => {
                      const questionData = textContent(String(it.question ?? ""), questionTokens);
                      return wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(it.question ?? "")}
                          path={["items", idx, "question"]}
                          textData={questionData}
                          className={cls("text-sm font-semibold", tokensClass(questionTokens), questionData.className)}
                          style={tokensStyle(questionTokens)}
                          ariaLabel={questionData.ariaLabel}
                          placeholder="Question"
                          multiline
                        />,
                        questionTokens
                      );
                    })()}
                    {it.answer ? (() => {
                      const answerData = textContent(String(it.answer ?? ""), answerTokens);
                      return wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(it.answer ?? "")}
                          path={["items", idx, "answer"]}
                          textData={answerData}
                          className={cls("mt-1 text-sm opacity-80", tokensClass(answerTokens), answerData.className)}
                          style={tokensStyle(answerTokens)}
                          ariaLabel={answerData.ariaLabel}
                          placeholder="Answer"
                          multiline
                        />,
                        answerTokens
                      );
                    })() : null}
                  </div>
                );
                return wrapDecorations(node, itemTokens);
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>
    );
  }

  if (type === "GRID") {
    const d = data as GridData;
    if (d?.mode === "container") {
      const blocks = Array.isArray(d.blocks) ? d.blocks : [];
      const componentsBlock = renderComponentsBlock(d);
      const sectionTokens = (d as any)?.twTokens;
      const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
      return wrapDecorations(
        <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
          <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
            <SectionTextScope data={d}>
              {titleData ? (
                <InlineEditableText
                  as="h3"
                  value={String(d.title ?? "")}
                  path={["title"]}
                  textData={titleData}
                  className={cls("mb-4 text-lg font-semibold", titleData.className)}
                  ariaLabel={titleData.ariaLabel}
                  placeholder="Grid title"
                />
              ) : null}
              <div className="space-y-5">
                {blocks
                  .filter((b: any) => b && b.type && b.isVisible !== false)
                  .map((b: any, i: number) => (
                    <Section key={b.id ?? `${type}-block-${i}`} type={b.type as PageSectionType} data={b.data} />
                  ))}
              </div>
            </SectionTextScope>
            {componentsBlock}
          </div>
        </section>,
        sectionTokens
      );
    }
    const columns = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("mb-4 text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Grid title"
              />
            ) : null}
            <div className={cls("grid gap-4", columns === 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>
              {(d.items ?? []).map((it, idx) => {
                if (!isItemVisible(it)) return null;
                const itemTokens = resolveFieldTokens((it as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const titleTokens = resolveFieldTokens((it as any).titleTokens, baseItemTokens);
                const textTokens = resolveFieldTokens((it as any).textTokens, baseItemTokens);
                const imageTokens = resolveFieldTokens((it as any).imageTokens);
                const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                const cardState = getElementState({
                  kind: "card",
                  valuePath: ["items", idx],
                  tokensPath: ["items", idx, "twTokens"],
                  label: it.title ?? `Item ${idx + 1}`,
                });
                return wrapDecorations(
                  <div
                    key={idx}
                    {...cardState.attrs}
                    className={cls(
                      "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                      tokensClass(itemTokens),
                      cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                    )}
                    style={tokensStyle(itemTokens)}
                  >
                    {it.imageUrl ? wrapDecorations(
                      (() => {
                        const imageState = getElementState({
                          kind: "image",
                          valuePath: ["items", idx, "imageUrl"],
                          tokensPath: ["items", idx, "imageTokens"],
                          label: it.title ?? "Grid image",
                        });
                        return (
                          <img
                            {...imageState.attrs}
                            src={it.imageUrl}
                            alt={it.title}
                            className={cls(
                              "mb-3 h-28 w-full rounded-xl object-cover",
                              tokensClass(imageTokens),
                              imageState.selected ? SELECTED_ELEMENT_CLASS : undefined
                            )}
                            style={tokensStyle(imageTokens)}
                          />
                        );
                      })(),
                      imageTokens
                    ) : null}
                    {(() => {
                      const itemTitleData = textContent(String(it.title ?? ""), titleTokens);
                      return wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(it.title ?? "")}
                          path={["items", idx, "title"]}
                          textData={itemTitleData}
                          className={cls("text-sm font-semibold", tokensClass(titleTokens), itemTitleData.className)}
                          style={tokensStyle(titleTokens)}
                          ariaLabel={itemTitleData.ariaLabel}
                          placeholder="Item title"
                        />,
                        titleTokens
                      );
                    })()}
                    {it.text ? (() => {
                      const itemTextData = textContent(String(it.text), textTokens);
                      return wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(it.text ?? "")}
                          path={["items", idx, "text"]}
                          textData={itemTextData}
                          className={cls("mt-1 text-sm opacity-80", tokensClass(textTokens), itemTextData.className)}
                          style={tokensStyle(textTokens)}
                          ariaLabel={itemTextData.ariaLabel}
                          placeholder="Item text"
                          multiline
                        />,
                        textTokens
                      );
                    })() : null}
                    {it.href ? (() => {
                      const linkData = textContent(String(it.href), linkTokens);
                      return wrapDecorations(
                        <div
                          className={cls("mt-2 text-xs opacity-60", tokensClass(linkTokens), linkData.className)}
                          style={tokensStyle(linkTokens)}
                          aria-label={linkData.ariaLabel}
                        >
                          {linkData.content}
                        </div>,
                        linkTokens
                      );
                    })() : null}
                  </div>,
                  itemTokens
                );
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "FEATURES") {
    const d = data as FeaturesData;
    const items = Array.isArray(d.items) ? d.items : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols <= 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-4" : cols === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Features title"
              />
            ) : null}
            {subtitleData ? (
              <InlineEditableText
                as="div"
                value={String(d.subtitle ?? "")}
                path={["subtitle"]}
                textData={subtitleData}
                className={cls("mt-1 text-sm opacity-80", subtitleData.className)}
                ariaLabel={subtitleData.ariaLabel}
                placeholder="Features subtitle"
                multiline
              />
            ) : null}
            <div className={cls("mt-4 grid gap-4", gridCols)}>
              {items.length ? (
                items.map((it, idx) => {
                  if (!isItemVisible(it)) return null;
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const titleTokens = resolveFieldTokens((it as any).titleTokens, baseItemTokens);
                  const textTokens = resolveFieldTokens((it as any).textTokens, baseItemTokens);
                  const iconTokens = resolveFieldTokens((it as any).iconTokens, baseItemTokens);
                  const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                  const cardState = getElementState({
                    kind: "card",
                    valuePath: ["items", idx],
                    tokensPath: ["items", idx, "twTokens"],
                    label: it.title ?? `Feature ${idx + 1}`,
                  });
                  const wrapperClass = cls(
                    "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                    tokensClass(itemTokens),
                    it.href ? tokensClass(linkTokens) : undefined,
                    cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                  );
                  const wrapperStyle = { ...(tokensStyle(itemTokens) ?? {}), ...(it.href ? (tokensStyle(linkTokens) ?? {}) : {}) };
                  const content = (
                    <>
                      <div className="flex items-center gap-2">
                        {it.iconUrl ? (
                          wrapDecorations(
                            (() => {
                              const iconState = getElementState({
                                kind: "image",
                                valuePath: ["items", idx, "iconUrl"],
                                tokensPath: ["items", idx, "iconTokens"],
                                label: it.title ?? "Feature icon",
                              });
                              return (
                                <img
                                  {...iconState.attrs}
                                  src={it.iconUrl}
                                  alt=""
                                  className={cls(
                                    "h-8 w-8 rounded-lg",
                                    tokensClass(iconTokens),
                                    iconState.selected ? SELECTED_ELEMENT_CLASS : undefined
                                  )}
                                  style={tokensStyle(iconTokens)}
                                />
                              );
                            })(),
                            iconTokens
                          )
                        ) : it.icon ? (
                          wrapDecorations(
                            <span className={cls("text-lg", tokensClass(iconTokens))} style={tokensStyle(iconTokens)}>{it.icon}</span>,
                            iconTokens
                          )
                        ) : null}
                        {(() => {
                          const titleData = textContent(String(it.title ?? ""), titleTokens);
                          return wrapDecorations(
                            <InlineEditableText
                              as="div"
                              value={String(it.title ?? "")}
                              path={["items", idx, "title"]}
                              textData={titleData}
                              className={cls("text-sm font-semibold", tokensClass(titleTokens), titleData.className)}
                              style={tokensStyle(titleTokens)}
                              ariaLabel={titleData.ariaLabel}
                              placeholder="Feature title"
                            />,
                            titleTokens
                          );
                        })()}
                      </div>
                      {it.text ? (() => {
                        const textData = textContent(String(it.text), textTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(it.text ?? "")}
                            path={["items", idx, "text"]}
                            textData={textData}
                            className={cls("mt-2 text-sm opacity-80", tokensClass(textTokens), textData.className)}
                            style={tokensStyle(textTokens)}
                            ariaLabel={textData.ariaLabel}
                            placeholder="Feature text"
                            multiline
                          />,
                          textTokens
                        );
                      })() : null}
                    </>
                  );
                  const node = it.href ? (
                    <a key={idx} href={it.href} className={wrapperClass} style={wrapperStyle} {...cardState.attrs}>
                      {content}
                    </a>
                  ) : (
                    <div key={idx} className={wrapperClass} style={wrapperStyle} {...cardState.attrs}>
                      {content}
                    </div>
                  );
                  return wrapDecorations(node, itemTokens);
                })
              ) : (
                <div className="text-sm opacity-70">(لا يوجد عناصر)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "STATS") {
    const d = data as StatsData;
    const items = Array.isArray(d.items) ? d.items : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols <= 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-4" : cols === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Stats title"
              />
            ) : null}
            {subtitleData ? (
              <InlineEditableText
                as="div"
                value={String(d.subtitle ?? "")}
                path={["subtitle"]}
                textData={subtitleData}
                className={cls("mt-1 text-sm opacity-80", subtitleData.className)}
                ariaLabel={subtitleData.ariaLabel}
                placeholder="Stats subtitle"
                multiline
              />
            ) : null}
            <div className={cls("mt-4 grid gap-4", gridCols)}>
              {items.length ? (
                items.map((it, idx) => {
                  if (!isItemVisible(it)) return null;
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const valueTokens = resolveFieldTokens((it as any).valueTokens, baseItemTokens);
                  const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                  const subtextTokens = resolveFieldTokens((it as any).subtextTokens, baseItemTokens);
                  const iconTokens = resolveFieldTokens((it as any).iconTokens, baseItemTokens);
                  const cardState = getElementState({
                    kind: "card",
                    valuePath: ["items", idx],
                    tokensPath: ["items", idx, "twTokens"],
                    label: it.label ?? `Stat ${idx + 1}`,
                  });
                  return wrapDecorations(
                    <div
                      key={idx}
                      {...cardState.attrs}
                      className={cls(
                        "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-center",
                        tokensClass(itemTokens),
                        cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                      )}
                      style={tokensStyle(itemTokens)}
                    >
                      {it.icon ? wrapDecorations(
                        <div className={cls("text-lg", tokensClass(iconTokens))} style={tokensStyle(iconTokens)}>
                          {it.icon}
                        </div>,
                        iconTokens
                      ) : null}
                      {(() => {
                        const valueData = textContent(String(it.value ?? ""), valueTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(it.value ?? "")}
                            path={["items", idx, "value"]}
                            textData={valueData}
                            className={cls("text-2xl font-semibold", tokensClass(valueTokens), valueData.className)}
                            style={tokensStyle(valueTokens)}
                            ariaLabel={valueData.ariaLabel}
                            placeholder="Value"
                          />,
                          valueTokens
                        );
                      })()}
                      {it.label ? (() => {
                        const labelData = textContent(String(it.label), labelTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(it.label ?? "")}
                            path={["items", idx, "label"]}
                            textData={labelData}
                            className={cls("text-sm opacity-80", tokensClass(labelTokens), labelData.className)}
                            style={tokensStyle(labelTokens)}
                            ariaLabel={labelData.ariaLabel}
                            placeholder="Label"
                          />,
                          labelTokens
                        );
                      })() : null}
                      {it.subtext ? (() => {
                        const subtextData = textContent(String(it.subtext), subtextTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(it.subtext ?? "")}
                            path={["items", idx, "subtext"]}
                            textData={subtextData}
                            className={cls("mt-1 text-xs opacity-60", tokensClass(subtextTokens), subtextData.className)}
                            style={tokensStyle(subtextTokens)}
                            ariaLabel={subtextData.ariaLabel}
                            placeholder="Subtext"
                            multiline
                          />,
                          subtextTokens
                        );
                      })() : null}
                    </div>,
                    itemTokens
                  );
                })
              ) : (
                <div className="text-sm opacity-70">(لا يوجد عناصر)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "TEAM") {
    const d = data as TeamData;
    const members = Array.isArray(d.members) ? d.members : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const gridCols =
      cols <= 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-4" : cols === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Team title"
              />
            ) : null}
            {subtitleData ? (
              <InlineEditableText
                as="div"
                value={String(d.subtitle ?? "")}
                path={["subtitle"]}
                textData={subtitleData}
                className={cls("mt-1 text-sm opacity-80", subtitleData.className)}
                ariaLabel={subtitleData.ariaLabel}
                placeholder="Team subtitle"
                multiline
              />
            ) : null}
            <div className={cls("mt-4 grid gap-4", gridCols)}>
              {members.length ? (
                members.map((m, idx) => {
                  if (!isItemVisible(m)) return null;
                  const itemTokens = resolveFieldTokens((m as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const nameTokens = resolveFieldTokens((m as any).nameTokens, baseItemTokens);
                  const roleTokens = resolveFieldTokens((m as any).roleTokens, baseItemTokens);
                  const bioTokens = resolveFieldTokens((m as any).bioTokens, baseItemTokens);
                  const avatarTokens = resolveFieldTokens((m as any).avatarTokens);
                  const socialTokens = resolveFieldTokens((m as any).socialTokens, baseItemTokens);
                  const nameData = textContent(String(m.name || "Member"), nameTokens);
                  const roleData = m.role ? textContent(String(m.role), roleTokens) : null;
                  const bioData = m.bio ? textContent(String(m.bio), bioTokens) : null;
                  const socials = Array.isArray(m.socials) ? m.socials : [];
                  const cardState = getElementState({
                    kind: "card",
                    valuePath: ["members", idx],
                    tokensPath: ["members", idx, "twTokens"],
                    label: m.name ?? `Member ${idx + 1}`,
                  });
                  return wrapDecorations(
                    <div
                      key={idx}
                      {...cardState.attrs}
                      className={cls(
                        "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                        tokensClass(itemTokens),
                        cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                      )}
                      style={tokensStyle(itemTokens)}
                    >
                      {m.avatarUrl ? wrapDecorations(
                        (() => {
                          const avatarState = getElementState({
                            kind: "image",
                            valuePath: ["members", idx, "avatarUrl"],
                            tokensPath: ["members", idx, "avatarTokens"],
                            label: m.name ?? "Avatar",
                          });
                          return (
                            <img
                              {...avatarState.attrs}
                              src={m.avatarUrl}
                              alt=""
                              className={cls(
                                "mb-3 h-12 w-12 rounded-full object-cover",
                                tokensClass(avatarTokens),
                                avatarState.selected ? SELECTED_ELEMENT_CLASS : undefined
                              )}
                              style={tokensStyle(avatarTokens)}
                            />
                          );
                        })(),
                        avatarTokens
                      ) : null}
                      {wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(m.name ?? "")}
                          path={["members", idx, "name"]}
                          textData={nameData}
                          className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)}
                          style={tokensStyle(nameTokens)}
                          ariaLabel={nameData.ariaLabel}
                          placeholder="Name"
                        />,
                        nameTokens
                      )}
                      {roleData ? wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(m.role ?? "")}
                          path={["members", idx, "role"]}
                          textData={roleData}
                          className={cls("text-xs opacity-70", tokensClass(roleTokens), roleData.className)}
                          style={tokensStyle(roleTokens)}
                          ariaLabel={roleData.ariaLabel}
                          placeholder="Role"
                        />,
                        roleTokens
                      ) : null}
                      {bioData ? wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(m.bio ?? "")}
                          path={["members", idx, "bio"]}
                          textData={bioData}
                          className={cls("mt-2 text-sm opacity-80", tokensClass(bioTokens), bioData.className)}
                          style={tokensStyle(bioTokens)}
                          ariaLabel={bioData.ariaLabel}
                          placeholder="Bio"
                          multiline
                        />,
                        bioTokens
                      ) : null}
                      {socials.length ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs opacity-70">
                          {socials.map((s, sIdx) => {
                            const label = s.label || s.href || "";
                            if (!label) return null;
                            const socialData = textContent(String(label), socialTokens);
                            return wrapDecorations(
                              <InlineEditableText
                                as="span"
                                value={String(label)}
                                path={["members", idx, "socials", sIdx, "label"]}
                                textData={socialData}
                                className={cls(tokensClass(socialTokens), socialData.className)}
                                style={tokensStyle(socialTokens)}
                                ariaLabel={socialData.ariaLabel}
                                placeholder="Social"
                              />,
                              socialTokens
                            );
                          })}
                        </div>
                      ) : null}
                    </div>,
                    itemTokens
                  );
                })
              ) : (
                <div className="text-sm opacity-70">(لا يوجد أعضاء)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "PRICING") {
    const d = data as PricingData;
    const plans = Array.isArray(d.plans) ? d.plans : [];
    const cols = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const gridCols = cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Pricing title"
              />
            ) : null}
            {subtitleData ? (
              <InlineEditableText
                as="div"
                value={String(d.subtitle ?? "")}
                path={["subtitle"]}
                textData={subtitleData}
                className={cls("mt-1 text-sm opacity-80", subtitleData.className)}
                ariaLabel={subtitleData.ariaLabel}
                placeholder="Pricing subtitle"
                multiline
              />
            ) : null}
            <div className={cls("mt-4 grid gap-4", gridCols)}>
              {plans.length ? (
                plans.map((p, idx) => {
                  if (!isItemVisible(p)) return null;
                  const planTokens = resolveFieldTokens((p as any).twTokens);
                  const basePlanTokens = planTokens ?? sectionTokens;
                  const nameTokens = resolveFieldTokens((p as any).nameTokens, basePlanTokens);
                  const priceTokens = resolveFieldTokens((p as any).priceTokens, basePlanTokens);
                  const periodTokens = resolveFieldTokens((p as any).periodTokens, priceTokens ?? basePlanTokens);
                  const descriptionTokens = resolveFieldTokens((p as any).descriptionTokens, basePlanTokens);
                  const badgeTokens = resolveFieldTokens((p as any).badgeTokens, basePlanTokens);
                  const featureTokens = resolveFieldTokens((p as any).featureTokens, basePlanTokens);
                  const ctaTokens = resolveFieldTokens((p as any).ctaTokens, basePlanTokens);
                  const nameData = textContent(String(p.name || "Plan"), nameTokens);
                  const priceData = p.price ? textContent(String(p.price), priceTokens) : null;
                  const periodData = p.period ? textContent(String(p.period), periodTokens) : null;
                  const descriptionData = p.description ? textContent(String(p.description), descriptionTokens) : null;
                  const badgeData = p.badge ? textContent(String(p.badge), badgeTokens) : null;
                  const ctaData = p.ctaLabel ? textContent(String(p.ctaLabel), ctaTokens) : null;
                  const cardState = getElementState({
                    kind: "card",
                    valuePath: ["plans", idx],
                    tokensPath: ["plans", idx, "twTokens"],
                    label: p.name ?? `Plan ${idx + 1}`,
                  });
                  return wrapDecorations(
                    <div
                      key={idx}
                      className={cls(
                        "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                        tokensClass(planTokens),
                        p.highlight ? "ring-1 ring-accent-500/40" : undefined,
                        cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                      )}
                      {...cardState.attrs}
                      style={tokensStyle(planTokens)}
                    >
                      {badgeData ? wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(p.badge ?? "")}
                          path={["plans", idx, "badge"]}
                          textData={badgeData}
                          className={cls("text-[11px] opacity-70", tokensClass(badgeTokens), badgeData.className)}
                          style={tokensStyle(badgeTokens)}
                          ariaLabel={badgeData.ariaLabel}
                          placeholder="Badge"
                        />,
                        badgeTokens
                      ) : null}
                      {wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(p.name ?? "")}
                          path={["plans", idx, "name"]}
                          textData={nameData}
                          className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)}
                          style={tokensStyle(nameTokens)}
                          ariaLabel={nameData.ariaLabel}
                          placeholder="Plan name"
                        />,
                        nameTokens
                      )}
                      {priceData ? wrapDecorations(
                        <div className={cls("mt-2 text-2xl", tokensClass(priceTokens))} style={tokensStyle(priceTokens)}>
                          <InlineEditableText
                            as="span"
                            value={String(p.price ?? "")}
                            path={["plans", idx, "price"]}
                            textData={priceData}
                            className={priceData.className}
                            ariaLabel={priceData.ariaLabel}
                            placeholder="Price"
                          />
                          {periodData ? wrapDecorations(
                            <InlineEditableText
                              as="span"
                              value={String(p.period ?? "")}
                              path={["plans", idx, "period"]}
                              textData={periodData}
                              className={cls("text-xs opacity-60", tokensClass(periodTokens), periodData.className)}
                              style={tokensStyle(periodTokens)}
                              ariaLabel={periodData.ariaLabel}
                              placeholder="Period"
                            />,
                            periodTokens
                          ) : null}
                        </div>,
                        priceTokens
                      ) : null}
                      {descriptionData ? wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(p.description ?? "")}
                          path={["plans", idx, "description"]}
                          textData={descriptionData}
                          className={cls("mt-2 text-sm opacity-80", tokensClass(descriptionTokens), descriptionData.className)}
                          style={tokensStyle(descriptionTokens)}
                          ariaLabel={descriptionData.ariaLabel}
                          placeholder="Description"
                          multiline
                        />,
                        descriptionTokens
                      ) : null}
                      {Array.isArray(p.features) && p.features.length ? (
                        <ul className={cls("mt-3 list-disc ps-5 text-sm opacity-80", tokensClass(featureTokens))} style={tokensStyle(featureTokens)}>
                          {p.features.map((f, fIdx) => {
                            const featureData = textContent(String(f), featureTokens);
                            return wrapDecorations(
                              <InlineEditableText
                                as="li"
                                value={String(f ?? "")}
                                path={["plans", idx, "features", fIdx]}
                                textData={featureData}
                                className={featureData.className}
                                ariaLabel={featureData.ariaLabel}
                                placeholder="Feature"
                              />,
                              featureTokens
                            );
                          })}
                        </ul>
                      ) : null}
                      {ctaData ? (
                        p.ctaHref ? (
                          wrapDecorations(
                            <a
                              href={p.ctaHref}
                              {...getElementState({
                                kind: "button",
                                valuePath: ["plans", idx, "ctaLabel"],
                                tokensPath: ["plans", idx, "ctaTokens"],
                                label: p.ctaLabel ?? "CTA",
                              }).attrs}
                              className={cls(
                                "mt-4 inline-flex items-center rounded-xl border border-white/10 px-3 py-2 text-sm",
                                tokensClass(ctaTokens),
                                getElementState({
                                  kind: "button",
                                  valuePath: ["plans", idx, "ctaLabel"],
                                  tokensPath: ["plans", idx, "ctaTokens"],
                                  label: p.ctaLabel ?? "CTA",
                                }).selected
                                  ? SELECTED_ELEMENT_CLASS
                                  : undefined
                              )}
                              style={tokensStyle(ctaTokens)}
                            >
                              <InlineEditableText
                                as="span"
                                value={String(p.ctaLabel ?? "")}
                                path={["plans", idx, "ctaLabel"]}
                                textData={ctaData}
                                className={ctaData.className}
                                ariaLabel={ctaData.ariaLabel}
                                placeholder="CTA"
                                selectKind="button"
                                selectTokensPath={["plans", idx, "ctaTokens"]}
                                selectHighlight={false}
                              />
                            </a>,
                            ctaTokens
                          )
                        ) : (
                          wrapDecorations(
                            <InlineEditableText
                              as="span"
                              value={String(p.ctaLabel ?? "")}
                              path={["plans", idx, "ctaLabel"]}
                              textData={ctaData}
                              className={cls("mt-4 inline-flex items-center rounded-xl border border-white/10 px-3 py-2 text-sm", tokensClass(ctaTokens), ctaData.className)}
                              style={tokensStyle(ctaTokens)}
                              ariaLabel={ctaData.ariaLabel}
                              placeholder="CTA"
                              selectKind="button"
                              selectTokensPath={["plans", idx, "ctaTokens"]}
                            />,
                            ctaTokens
                          )
                        )
                      ) : null}
                    </div>,
                    planTokens
                  );
                })
              ) : (
                <div className="text-sm opacity-70">(لا يوجد خطط)</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "CONTACT") {
    const d = data as ContactData;
    const items = Array.isArray(d.items) ? d.items : [];
    const form = d.form ?? {};
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Contact title"
              />
            ) : null}
            {subtitleData ? (
              <InlineEditableText
                as="div"
                value={String(d.subtitle ?? "")}
                path={["subtitle"]}
                textData={subtitleData}
                className={cls("mt-1 text-sm opacity-80", subtitleData.className)}
                ariaLabel={subtitleData.ariaLabel}
                placeholder="Contact subtitle"
                multiline
              />
            ) : null}
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                {items.length ? (
                  items.map((it, idx) => {
                    if (!isItemVisible(it)) return null;
                    const itemTokens = resolveFieldTokens((it as any).twTokens);
                    const baseItemTokens = itemTokens ?? sectionTokens;
                    const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                    const valueTokens = resolveFieldTokens((it as any).valueTokens, baseItemTokens);
                    const iconTokens = resolveFieldTokens((it as any).iconTokens, baseItemTokens);
                    const labelData = textContent(String(it.label || "Contact"), labelTokens);
                    const valueData = it.value ? textContent(String(it.value), valueTokens) : null;
                    const cardState = getElementState({
                      kind: "card",
                      valuePath: ["items", idx],
                      tokensPath: ["items", idx, "twTokens"],
                      label: it.label ?? `Contact ${idx + 1}`,
                    });
                    return wrapDecorations(
                      <div
                        key={idx}
                        {...cardState.attrs}
                        className={cls(
                          "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                          tokensClass(itemTokens),
                          cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                        )}
                        style={tokensStyle(itemTokens)}
                      >
                        <div className="flex items-center gap-2">
                          {it.icon ? wrapDecorations(
                            <span className={cls(tokensClass(iconTokens))} style={tokensStyle(iconTokens)}>
                              {it.icon}
                            </span>,
                            iconTokens
                          ) : null}
                          {wrapDecorations(
                            <InlineEditableText
                              as="div"
                              value={String(it.label ?? "")}
                              path={["items", idx, "label"]}
                              textData={labelData}
                              className={cls("text-sm font-semibold", tokensClass(labelTokens), labelData.className)}
                              style={tokensStyle(labelTokens)}
                              ariaLabel={labelData.ariaLabel}
                              placeholder="Label"
                            />,
                            labelTokens
                          )}
                        </div>
                        {valueData ? (
                          it.href ? (
                            wrapDecorations(
                              <a
                                href={it.href}
                                className={cls("text-sm opacity-80 underline", tokensClass(valueTokens))}
                                style={tokensStyle(valueTokens)}
                              >
                                <InlineEditableText
                                  as="span"
                                  value={String(it.value ?? "")}
                                  path={["items", idx, "value"]}
                                  textData={valueData}
                                  className={valueData.className}
                                  ariaLabel={valueData.ariaLabel}
                                  placeholder="Value"
                                />
                              </a>,
                              valueTokens
                            )
                          ) : (
                            wrapDecorations(
                              <InlineEditableText
                                as="div"
                                value={String(it.value ?? "")}
                                path={["items", idx, "value"]}
                                textData={valueData}
                                className={cls("text-sm opacity-80", tokensClass(valueTokens), valueData.className)}
                                style={tokensStyle(valueTokens)}
                                ariaLabel={valueData.ariaLabel}
                                placeholder="Value"
                                multiline
                              />,
                              valueTokens
                            )
                          )
                        ) : null}
                      </div>,
                      itemTokens
                    );
                  })
                ) : (
                  <div className="text-sm opacity-70">(لا توجد بيانات تواصل)</div>
                )}
              </div>
              <div className="space-y-4">
                {d.mapEmbedUrl ? (() => {
                  const mapTokens = resolveFieldTokens((d as any).mapTokens, sectionTokens);
                  const node = (
                    <div
                      className={cls("h-48 w-full overflow-hidden rounded-2xl border border-white/[0.08]", tokensClass(mapTokens))}
                      style={tokensStyle(mapTokens)}
                    >
                      <iframe
                        title="map"
                        src={d.mapEmbedUrl}
                        className="h-full w-full"
                        loading="lazy"
                      />
                    </div>
                  );
                  return wrapDecorations(node, mapTokens);
                })() : null}
                {fields.length ? (() => {
                  const formTokens = resolveFieldTokens((form as any).twTokens, sectionTokens);
                  const formTitleTokens = resolveFieldTokens((form as any).titleTokens, formTokens ?? sectionTokens);
                  const formSubtitleTokens = resolveFieldTokens((form as any).subtitleTokens, formTokens ?? sectionTokens);
                  const formFieldTokens = resolveFieldTokens((form as any).fieldTokens, formTokens ?? sectionTokens);
                  const formLabelTokens = resolveFieldTokens((form as any).labelTokens, formFieldTokens ?? formTokens ?? sectionTokens);
                  const formInputTokens = resolveFieldTokens((form as any).inputTokens, formFieldTokens ?? formTokens ?? sectionTokens);
                  const submitTokens = resolveFieldTokens((form as any).submitTokens, formTokens ?? sectionTokens);
                  return wrapDecorations(
                    <form
                      action={form.action || undefined}
                      method={form.method || undefined}
                      className={cls("space-y-3", tokensClass(formTokens))}
                      style={tokensStyle(formTokens)}
                    >
                      {form.title ? (() => {
                        const formTitleData = textContent(String(form.title), formTitleTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(form.title ?? "")}
                            path={["form", "title"]}
                            textData={formTitleData}
                            className={cls("text-sm font-semibold", tokensClass(formTitleTokens), formTitleData.className)}
                            style={tokensStyle(formTitleTokens)}
                            ariaLabel={formTitleData.ariaLabel}
                            placeholder="Form title"
                          />,
                          formTitleTokens
                        );
                      })() : null}
                      {form.subtitle ? (() => {
                        const formSubtitleData = textContent(String(form.subtitle), formSubtitleTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(form.subtitle ?? "")}
                            path={["form", "subtitle"]}
                            textData={formSubtitleData}
                            className={cls("text-xs opacity-70", tokensClass(formSubtitleTokens), formSubtitleData.className)}
                            style={tokensStyle(formSubtitleTokens)}
                            ariaLabel={formSubtitleData.ariaLabel}
                            placeholder="Form subtitle"
                            multiline
                          />,
                          formSubtitleTokens
                        );
                      })() : null}
                      {fields.map((f, idx) => {
                        if (!isItemVisible(f)) return null;
                        const fieldTokens = resolveFieldTokens((f as any).twTokens, formFieldTokens ?? formTokens ?? sectionTokens);
                        const labelTokens = resolveFieldTokens((f as any).labelTokens, formLabelTokens ?? fieldTokens ?? formTokens ?? sectionTokens);
                        const inputTokens = resolveFieldTokens((f as any).inputTokens, formInputTokens ?? fieldTokens ?? formTokens ?? sectionTokens);
                        return wrapDecorations(
                          <div key={idx} className={cls(tokensClass(fieldTokens))} style={tokensStyle(fieldTokens)}>
                            {f.label ? (() => {
                              const labelData = textContent(String(f.label), labelTokens);
                              return wrapDecorations(
                                <InlineEditableText
                                  as="label"
                                  value={String(f.label ?? "")}
                                  path={["form", "fields", idx, "label"]}
                                  textData={labelData}
                                  className={cls("block text-xs opacity-70", tokensClass(labelTokens), labelData.className)}
                                  style={tokensStyle(labelTokens)}
                                  ariaLabel={labelData.ariaLabel}
                                  placeholder="Field label"
                                />,
                                labelTokens
                              );
                            })() : null}
                            {f.type === "textarea" ? (
                              wrapDecorations(
                                <textarea
                                  className={cls("mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2 text-sm", tokensClass(inputTokens))}
                                  style={tokensStyle(inputTokens)}
                                  placeholder={f.placeholder}
                                  name={f.name}
                                  required={!!f.required}
                                  rows={4}
                                />,
                                inputTokens
                              )
                            ) : (
                              wrapDecorations(
                                <input
                                  className={cls("mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] p-2 text-sm", tokensClass(inputTokens))}
                                  style={tokensStyle(inputTokens)}
                                  placeholder={f.placeholder}
                                  name={f.name}
                                  required={!!f.required}
                                  type={f.type ?? "text"}
                                />,
                                inputTokens
                              )
                            )}
                          </div>,
                          fieldTokens
                        );
                      })}
                      {form.submitLabel ? (() => {
                        const submitData = textContent(String(form.submitLabel), submitTokens);
                        const submitState = getElementState({
                          kind: "button",
                          valuePath: ["form", "submitLabel"],
                          tokensPath: ["form", "submitTokens"],
                          label: form.submitLabel ?? "Submit",
                        });
                        return wrapDecorations(
                          <button
                            type="submit"
                            {...submitState.attrs}
                            className={cls(
                              "inline-flex items-center rounded-xl bg-white/10 px-4 py-2 text-sm",
                              tokensClass(submitTokens),
                              submitState.selected ? SELECTED_ELEMENT_CLASS : undefined
                            )}
                            style={tokensStyle(submitTokens)}
                          >
                            <InlineEditableText
                              as="span"
                              value={String(form.submitLabel ?? "")}
                              path={["form", "submitLabel"]}
                              textData={submitData}
                              className={submitData.className}
                              ariaLabel={submitData.ariaLabel}
                              placeholder="Submit"
                              selectKind="button"
                              selectTokensPath={["form", "submitTokens"]}
                              selectHighlight={false}
                            />
                          </button>,
                          submitTokens
                        );
                      })() : null}
                    </form>,
                    formTokens
                  );
                })() : null}
              </div>
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "FEATURED_CATEGORIES") {
    const d = data as FeaturedCategoriesData;
    const items = Array.isArray(d.items) ? d.items : [];
    const showArrows = !!d.showArrows;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {(d.title || d.subtitle || showArrows) ? (
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  {titleData ? (
                    <InlineEditableText
                      as="h3"
                      value={String(d.title ?? "")}
                      path={["title"]}
                      textData={titleData}
                      className={cls("text-lg font-semibold", titleData.className)}
                      ariaLabel={titleData.ariaLabel}
                      placeholder="Categories title"
                    />
                  ) : null}
                  {subtitleData ? (
                    <InlineEditableText
                      as="div"
                      value={String(d.subtitle ?? "")}
                      path={["subtitle"]}
                      textData={subtitleData}
                      className={cls("mt-1 text-sm opacity-80", subtitleData.className)}
                      ariaLabel={subtitleData.ariaLabel}
                      placeholder="Categories subtitle"
                      multiline
                    />
                  ) : null}
                </div>
                {showArrows ? (
                  <div className="flex items-center gap-2">
                    <button type="button" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-sm text-white/70">‹</button>
                    <button type="button" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 text-sm text-white/70">›</button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              {items.length ? (
                items.slice(0, 6).map((it, idx) => {
                  if (!isItemVisible(it)) return null;
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                  const imageTokens = resolveFieldTokens((it as any).imageTokens);
                  const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                  const cardState = getElementState({
                    kind: "card",
                    valuePath: ["items", idx],
                    tokensPath: ["items", idx, "twTokens"],
                    label: it.label ?? `Category ${idx + 1}`,
                  });
                  const node = (
                    <div
                      key={idx}
                      {...cardState.attrs}
                      className={cls(
                        "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                        tokensClass(itemTokens),
                        cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                      )}
                      style={tokensStyle(itemTokens)}
                    >
                      {it.imageUrl ? (
                        wrapDecorations(
                          (() => {
                            const imageState = getElementState({
                              kind: "image",
                              valuePath: ["items", idx, "imageUrl"],
                              tokensPath: ["items", idx, "imageTokens"],
                              label: it.label ?? "Category image",
                            });
                            return (
                              <img
                                {...imageState.attrs}
                                src={it.imageUrl}
                                alt=""
                                className={cls(
                                  "mb-3 h-32 w-full rounded-xl object-cover",
                                  tokensClass(imageTokens),
                                  imageState.selected ? SELECTED_ELEMENT_CLASS : undefined
                                )}
                                style={tokensStyle(imageTokens)}
                              />
                            );
                          })(),
                          imageTokens
                        )
                      ) : null}
                      {(() => {
                        const labelData = textContent(String(it.label ?? "Category"), labelTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(it.label ?? "")}
                            path={["items", idx, "label"]}
                            textData={labelData}
                            className={cls("text-sm font-semibold", tokensClass(labelTokens), labelData.className)}
                            style={tokensStyle(labelTokens)}
                            ariaLabel={labelData.ariaLabel}
                            placeholder="Category"
                          />,
                          labelTokens
                        );
                      })()}
                      {it.href ? (() => {
                        const hrefData = textContent(String(it.href), linkTokens);
                        return wrapDecorations(
                          <div
                            className={cls("mt-1 text-xs opacity-70", tokensClass(linkTokens), hrefData.className)}
                            style={tokensStyle(linkTokens)}
                            aria-label={hrefData.ariaLabel}
                          >
                            {hrefData.content}
                          </div>,
                          linkTokens
                        );
                      })() : null}
                    </div>
                  );
                  return wrapDecorations(node, itemTokens);
                })
              ) : (
                <div className="text-sm opacity-70">No items yet.</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "COLLECTIONS_GRID") {
    const d = data as CollectionsGridData;
    const items = Array.isArray(d.items) ? d.items : [];
    const cols = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const clsCols =
      cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-4" : cols === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("mb-2 text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Collections title"
              />
            ) : null}
            {subtitleData ? (
              <InlineEditableText
                as="div"
                value={String(d.subtitle ?? "")}
                path={["subtitle"]}
                textData={subtitleData}
                className={cls("mb-4 text-sm opacity-80", subtitleData.className)}
                ariaLabel={subtitleData.ariaLabel}
                placeholder="Collections subtitle"
                multiline
              />
            ) : null}
            <div className={cls("grid gap-4", clsCols)}>
              {items.length ? (
                items.slice(0, 8).map((it, idx) => {
                  if (!isItemVisible(it)) return null;
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const labelTokens = resolveFieldTokens((it as any).labelTokens, baseItemTokens);
                  const imageTokens = resolveFieldTokens((it as any).imageTokens);
                  const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                  const cardState = getElementState({
                    kind: "card",
                    valuePath: ["items", idx],
                    tokensPath: ["items", idx, "twTokens"],
                    label: it.label ?? `Collection ${idx + 1}`,
                  });
                  const node = (
                    <div
                      key={idx}
                      {...cardState.attrs}
                      className={cls(
                        "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                        tokensClass(itemTokens),
                        cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                      )}
                      style={tokensStyle(itemTokens)}
                    >
                      {it.imageUrl ? wrapDecorations(
                        (() => {
                          const imageState = getElementState({
                            kind: "image",
                            valuePath: ["items", idx, "imageUrl"],
                            tokensPath: ["items", idx, "imageTokens"],
                            label: it.label ?? "Collection image",
                          });
                          return (
                            <img
                              {...imageState.attrs}
                              src={it.imageUrl}
                              alt=""
                              className={cls(
                                "mb-3 h-32 w-full rounded-xl object-cover",
                                tokensClass(imageTokens),
                                imageState.selected ? SELECTED_ELEMENT_CLASS : undefined
                              )}
                              style={tokensStyle(imageTokens)}
                            />
                          );
                        })(),
                        imageTokens
                      ) : null}
                      {(() => {
                        const labelData = textContent(String(it.label ?? "Collection"), labelTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(it.label ?? "")}
                            path={["items", idx, "label"]}
                            textData={labelData}
                            className={cls("text-sm font-semibold", tokensClass(labelTokens), labelData.className)}
                            style={tokensStyle(labelTokens)}
                            ariaLabel={labelData.ariaLabel}
                            placeholder="Collection"
                          />,
                          labelTokens
                        );
                      })()}
                      {it.href ? (() => {
                        const hrefData = textContent(String(it.href), linkTokens);
                        return wrapDecorations(
                          <div
                            className={cls("mt-1 text-xs opacity-70", tokensClass(linkTokens), hrefData.className)}
                            style={tokensStyle(linkTokens)}
                            aria-label={hrefData.ariaLabel}
                          >
                            {hrefData.content}
                          </div>,
                          linkTokens
                        );
                      })() : null}
                    </div>
                  );
                  return wrapDecorations(node, itemTokens);
                })
              ) : (
                <div className="text-sm opacity-70">No items yet.</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "NEW_ARRIVALS_SLIDER" || type === "BEST_SELLERS_SLIDER") {
    const d = data as ProductsSliderData;
    const limit = Math.min(8, Math.max(1, safeNum(d.limit, 6)));
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleValue = d.title || (type === "NEW_ARRIVALS_SLIDER" ? "New arrivals" : "Best sellers");
    const titleData = textContent(String(titleValue), sectionTokens);
    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            <InlineEditableText
              as="h3"
              value={String(d.title ?? "")}
              path={["title"]}
              textData={titleData}
              className={cls("mb-4 text-lg font-semibold", titleData.className)}
              ariaLabel={titleData.ariaLabel}
              placeholder={type === "NEW_ARRIVALS_SLIDER" ? "New arrivals" : "Best sellers"}
            />
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: limit }).map((_, idx) => (
                <div key={idx} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs opacity-70">
                  Product {idx + 1}
                </div>
              ))}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "BRANDS_SLIDER") {
    const d = data as BrandsSliderData;
    const items = Array.isArray(d.items) ? d.items : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("mb-4 text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Brands title"
              />
            ) : null}
            <div className="grid gap-4 md:grid-cols-4">
              {items.length ? (
                items.slice(0, 8).map((it, idx) => {
                  if (!isItemVisible(it)) return null;
                  const itemTokens = resolveFieldTokens((it as any).twTokens);
                  const baseItemTokens = itemTokens ?? sectionTokens;
                  const nameTokens = resolveFieldTokens((it as any).nameTokens, baseItemTokens);
                  const logoTokens = resolveFieldTokens((it as any).logoTokens, baseItemTokens);
                  const linkTokens = resolveFieldTokens((it as any).linkTokens, baseItemTokens);
                  const cardState = getElementState({
                    kind: "card",
                    valuePath: ["items", idx],
                    tokensPath: ["items", idx, "twTokens"],
                    label: it.name ?? `Brand ${idx + 1}`,
                  });
                  const node = (
                    <div
                      key={idx}
                      {...cardState.attrs}
                      className={cls(
                        "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm",
                        tokensClass(itemTokens),
                        cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                      )}
                      style={tokensStyle(itemTokens)}
                    >
                      {(() => {
                        const nameData = textContent(String(it.name ?? "Brand"), nameTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(it.name ?? "")}
                            path={["items", idx, "name"]}
                            textData={nameData}
                            className={cls("font-semibold", tokensClass(nameTokens), nameData.className)}
                            style={tokensStyle(nameTokens)}
                            ariaLabel={nameData.ariaLabel}
                            placeholder="Brand"
                          />,
                          nameTokens
                        );
                      })()}
                      {it.logoUrl ? (
                        wrapDecorations(
                          <div
                            className={cls("mt-1 text-xs opacity-70", tokensClass(logoTokens))}
                            style={tokensStyle(logoTokens)}
                          >
                            logo: {it.logoUrl}
                          </div>,
                          logoTokens
                        )
                      ) : null}
                      {it.href ? (() => {
                        const hrefData = textContent(String(it.href), linkTokens);
                        return wrapDecorations(
                          <div
                            className={cls("mt-1 text-xs opacity-70", tokensClass(linkTokens), hrefData.className)}
                            style={tokensStyle(linkTokens)}
                            aria-label={hrefData.ariaLabel}
                          >
                            {hrefData.content}
                          </div>,
                          linkTokens
                        );
                      })() : null}
                    </div>
                  );
                  return wrapDecorations(node, itemTokens);
                })
              ) : (
                <div className="text-sm opacity-70">No brands yet.</div>
              )}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "NEWSLETTER") {
    const d = data as NewsletterData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const textData = d.text ? textContent(String(d.text), sectionTokens) : null;
    const ctaData = d.ctaLabel ? textContent(String(d.ctaLabel), sectionTokens) : null;
    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-4xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("mb-2 text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Newsletter title"
              />
            ) : null}
            {textData ? (
              <InlineEditableText
                as="p"
                value={String(d.text ?? "")}
                path={["text"]}
                textData={textData}
                className={cls("mb-4 text-sm opacity-80", textData.className)}
                ariaLabel={textData.ariaLabel}
                placeholder="Newsletter text"
                multiline
              />
            ) : null}
            {d.ctaLabel ? (
              d.ctaHref ? (
                (() => {
                  const buttonState = getElementState({
                    kind: "button",
                    valuePath: ["ctaLabel"],
                    label: d.ctaLabel ?? "CTA",
                  });
                  return (
                    <a
                      {...buttonState.attrs}
                      href={d.ctaHref}
                      className={cls(
                        "inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90",
                        buttonState.selected ? SELECTED_ELEMENT_CLASS : undefined
                      )}
                    >
                      <InlineEditableText
                        as="span"
                        value={String(d.ctaLabel ?? "")}
                        path={["ctaLabel"]}
                        textData={ctaData ?? undefined}
                        className={ctaData?.className}
                        ariaLabel={ctaData?.ariaLabel}
                        placeholder="CTA"
                        selectKind="button"
                        selectHighlight={false}
                      />
                    </a>
                  );
                })()
              ) : (
                <InlineEditableText
                  as="span"
                  value={String(d.ctaLabel ?? "")}
                  path={["ctaLabel"]}
                  textData={ctaData ?? undefined}
                  className={cls("inline-flex items-center rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-black/80", ctaData?.className)}
                  ariaLabel={ctaData?.ariaLabel}
                  placeholder="CTA"
                  selectKind="button"
                />
              )
            ) : null}
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "IMAGE_GALLERY") {
    const d = data as ImageGalleryData;
    const columns = Math.min(6, Math.max(2, safeNum(d.columns, 3)));
    const clsCols = columns <= 2 ? "md:grid-cols-2" : columns === 3 ? "md:grid-cols-3" : columns === 4 ? "md:grid-cols-4" : columns === 5 ? "md:grid-cols-5" : "md:grid-cols-6";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("mb-4 text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Gallery title"
              />
            ) : null}
            <div className={cls("grid gap-3", clsCols)}>
              {(d.images ?? []).map((im, idx) => {
                if (!isItemVisible(im)) return null;
                const itemTokens = resolveFieldTokens((im as any).twTokens);
                const imageTokens = resolveFieldTokens((im as any).imageTokens);
                const cardState = getElementState({
                  kind: "card",
                  valuePath: ["images", idx],
                  tokensPath: ["images", idx, "twTokens"],
                  label: im.alt ?? `Image ${idx + 1}`,
                });
                const node = (
                  <div
                    key={idx}
                    {...cardState.attrs}
                    className={cls(
                      "overflow-hidden rounded-2xl",
                      tokensClass(itemTokens),
                      cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                    )}
                    style={tokensStyle(itemTokens)}
                  >
                    {wrapDecorations(
                      (() => {
                        const imageState = getElementState({
                          kind: "image",
                          valuePath: ["images", idx, "url"],
                          tokensPath: ["images", idx, "imageTokens"],
                          label: im.alt ?? `Image ${idx + 1}`,
                        });
                        return (
                          <img
                            {...imageState.attrs}
                            src={im.url}
                            alt={im.alt ?? ""}
                            className={cls(
                              "h-40 w-full object-cover",
                              tokensClass(imageTokens),
                              imageState.selected ? SELECTED_ELEMENT_CLASS : undefined
                            )}
                            style={tokensStyle(imageTokens)}
                          />
                        );
                      })(),
                      imageTokens
                    )}
                  </div>
                );
                return wrapDecorations(node, itemTokens);
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "TESTIMONIALS") {
    const d = data as TestimonialsData;
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
            {titleData ? (
              <InlineEditableText
                as="h3"
                value={String(d.title ?? "")}
                path={["title"]}
                textData={titleData}
                className={cls("mb-4 text-lg font-semibold", titleData.className)}
                ariaLabel={titleData.ariaLabel}
                placeholder="Testimonials title"
              />
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              {(d.items ?? []).map((t, idx) => {
                if (!isItemVisible(t)) return null;
                const itemTokens = resolveFieldTokens((t as any).twTokens);
                const baseItemTokens = itemTokens ?? sectionTokens;
                const nameTokens = resolveFieldTokens((t as any).nameTokens, baseItemTokens);
                const roleTokens = resolveFieldTokens((t as any).roleTokens, baseItemTokens);
                const quoteTokens = resolveFieldTokens((t as any).quoteTokens, baseItemTokens);
                const avatarTokens = resolveFieldTokens((t as any).avatarTokens);
                const cardState = getElementState({
                  kind: "card",
                  valuePath: ["items", idx],
                  tokensPath: ["items", idx, "twTokens"],
                  label: t.name ?? `Testimonial ${idx + 1}`,
                });
                const node = (
                  <div
                    key={idx}
                    {...cardState.attrs}
                    className={cls(
                      "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4",
                      tokensClass(itemTokens),
                      cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                    )}
                    style={tokensStyle(itemTokens)}
                  >
                    <div className="flex items-center gap-3">
                      {t.avatarUrl ? (
                        wrapDecorations(
                          (() => {
                            const avatarState = getElementState({
                              kind: "image",
                              valuePath: ["items", idx, "avatarUrl"],
                              tokensPath: ["items", idx, "avatarTokens"],
                              label: t.name ?? "Avatar",
                            });
                            return (
                              <img
                                {...avatarState.attrs}
                                src={t.avatarUrl}
                                alt={t.name ?? "Avatar"}
                                className={cls(
                                  "h-10 w-10 rounded-full object-cover border border-white/10",
                                  tokensClass(avatarTokens),
                                  avatarState.selected ? SELECTED_ELEMENT_CLASS : undefined
                                )}
                                style={tokensStyle(avatarTokens)}
                              />
                            );
                          })(),
                          avatarTokens
                        )
                      ) : (
                        wrapDecorations(
                          <div className={cls("h-10 w-10 rounded-full bg-white/10", tokensClass(avatarTokens))} style={tokensStyle(avatarTokens)} />,
                          avatarTokens
                        )
                      )}
                      <div>
                        {(() => {
                          const nameData = textContent(String(t.name ?? ""), nameTokens);
                          return wrapDecorations(
                            <InlineEditableText
                              as="div"
                              value={String(t.name ?? "")}
                              path={["items", idx, "name"]}
                              textData={nameData}
                              className={cls("text-sm font-semibold", tokensClass(nameTokens), nameData.className)}
                              style={tokensStyle(nameTokens)}
                              ariaLabel={nameData.ariaLabel}
                              placeholder="Name"
                            />,
                            nameTokens
                          );
                        })()}
                        {t.role ? (() => {
                          const roleData = textContent(String(t.role), roleTokens);
                          return wrapDecorations(
                            <InlineEditableText
                              as="div"
                              value={String(t.role ?? "")}
                              path={["items", idx, "role"]}
                              textData={roleData}
                              className={cls("text-xs opacity-70", tokensClass(roleTokens), roleData.className)}
                              style={tokensStyle(roleTokens)}
                              ariaLabel={roleData.ariaLabel}
                              placeholder="Role"
                            />,
                            roleTokens
                          );
                        })() : null}
                      </div>
                    </div>
                    {t.quote ? (() => {
                      const quoteData = textContent(String(t.quote), quoteTokens);
                      return wrapDecorations(
                        <div className={cls("mt-3 text-sm opacity-90", tokensClass(quoteTokens), quoteData.className)} style={tokensStyle(quoteTokens)}>
                          "
                          <InlineEditableText
                            as="span"
                            value={String(t.quote ?? "")}
                            path={["items", idx, "quote"]}
                            textData={quoteData}
                            className={quoteData.className}
                            ariaLabel={quoteData.ariaLabel}
                            placeholder="Quote"
                            multiline
                          />
                          "
                        </div>,
                        quoteTokens
                      );
                    })() : null}
                  </div>
                );
                return wrapDecorations(node, itemTokens);
              })}
            </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  if (type === "FEATURED_PRODUCTS") {
    const d = data as FeaturedProductsData;
    const cols = Math.min(4, Math.max(2, safeNum(d.columns, 3)));
    const ids = Array.isArray(d.productSlugs) ? d.productSlugs.filter(Boolean) : Array.isArray(d.productIds) ? d.productIds.filter(Boolean) : [];
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-6xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
          {titleData ? (
            <InlineEditableText
              as="h3"
              value={String(d.title ?? "")}
              path={["title"]}
              textData={titleData}
              className={cls("mb-4 text-lg font-semibold", titleData.className)}
              ariaLabel={titleData.ariaLabel}
              placeholder="Featured products title"
            />
          ) : null}
          <div className={cls("grid gap-4", cols === 2 ? "md:grid-cols-2" : cols === 3 ? "md:grid-cols-3" : "md:grid-cols-4")}>
            {ids.length ? (
              ids.slice(0, 8).map((id) => (
                (() => {
                  const idData = textContent(String(id), sectionTokens);
                  return (
                    <div key={id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <div className="text-xs opacity-70">Product</div>
                      <div className={cls("mt-1 font-mono text-xs", idData.className)} aria-label={idData.ariaLabel}>
                        {idData.content}
                      </div>
                    </div>
                  );
                })()
              ))
            ) : (
              <div className="text-sm opacity-70">(حدد productIds لعرض المنتجات)</div>
            )}
          </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }



  if (type === "CARDS") {
    // `data` is passed into this component; using an undefined `section` variable
    // crashes the Preview at runtime when rendering CARDS sections.
    const d = data as CardsData;
    const ui: any = d.ui ?? {};
    const cards = d.cards ?? [];
    const componentsBlock = renderComponentsBlock(d);

    const sectionClass = ui.sectionClass || "py-8";
    const sectionTokens = (d as any)?.twTokens;
    const tokenClass = tokensClass(sectionTokens);
    const titleData = d.title ? textContent(String(d.title ?? ""), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle ?? ""), sectionTokens) : null;
    return wrapDecorations(
      <section className={cls(sectionClass, tokenClass)} style={uiSectionStyle(d)}>
        <div className={ui.containerClass || "mx-auto max-w-5xl px-4"}>
          <SectionTextScope data={d}>
          {titleData ? (
            <InlineEditableText
              as="h2"
              value={String(d.title ?? "")}
              path={["title"]}
              textData={titleData}
              className={cls("text-2xl font-semibold text-white", titleData.className)}
              ariaLabel={titleData.ariaLabel}
              placeholder="Cards title"
            />
          ) : null}
          {subtitleData ? (
            <InlineEditableText
              as="p"
              value={String(d.subtitle ?? "")}
              path={["subtitle"]}
              textData={subtitleData}
              className={cls("mt-1 text-white/70", subtitleData.className)}
              ariaLabel={subtitleData.ariaLabel}
              placeholder="Cards subtitle"
              multiline
            />
          ) : null}

          <div className={ui.cardsClass || "mt-6 flex flex-wrap gap-4"}>
            {cards.map((c, idx) => {
              if (!isItemVisible(c)) return null;
              const cardTokens = resolveFieldTokens((c as any).twTokens);
              const cardEffects = cardEffectClass(cardTokens ?? sectionTokens);
              const baseCardTokens = cardTokens ?? sectionTokens;
              const titleTokens = resolveFieldTokens((c as any).titleTokens, baseCardTokens);
              const textTokens = resolveFieldTokens((c as any).textTokens, baseCardTokens);
              const badgeTokens = resolveFieldTokens((c as any).badgeTokens, baseCardTokens);
              const buttonTokens = resolveFieldTokens((c as any).buttonTokens, baseCardTokens);
              const imageTokens = resolveFieldTokens((c as any).imageTokens);
              const cardState = getElementState({
                kind: "card",
                valuePath: ["cards", idx],
                tokensPath: ["cards", idx, "twTokens"],
                label: c.title ?? `Card ${idx + 1}`,
              });
              const node = (
                <div
                  key={idx}
                  className={cls(
                    ui.cardClass ||
                      "w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] rounded-2xl border border-white/10 bg-white/5 p-4",
                    cardEffects,
                    tokensClass(cardTokens),
                    cardState.selected ? SELECTED_ELEMENT_CLASS : undefined
                  )}
                  {...cardState.attrs}
                  style={tokensStyle(cardTokens)}
                >
                  {c.imageUrl ? wrapDecorations(
                    (() => {
                      const imageState = getElementState({
                        kind: "image",
                        valuePath: ["cards", idx, "imageUrl"],
                        tokensPath: ["cards", idx, "imageTokens"],
                        label: c.title ?? "Card image",
                      });
                      return (
                        <img
                          {...imageState.attrs}
                          src={c.imageUrl}
                          alt={c.title ?? ""}
                          className={cls(
                            ui.imageClass || "w-full h-40 object-cover rounded-xl border border-white/10",
                            tokensClass(imageTokens),
                            imageState.selected ? SELECTED_ELEMENT_CLASS : undefined
                          )}
                          style={tokensStyle(imageTokens)}
                        />
                      );
                    })(),
                    imageTokens
                  ) : null}

                  <div className="mt-3 flex items-start justify-between gap-2">
                    {c.title ? (() => {
                      const cardTitleData = textContent(String(c.title ?? ""), titleTokens);
                      return wrapDecorations(
                        <InlineEditableText
                          as="div"
                          value={String(c.title ?? "")}
                          path={["cards", idx, "title"]}
                          textData={cardTitleData}
                          className={cls("text-white font-semibold", tokensClass(titleTokens), cardTitleData.className)}
                          style={tokensStyle(titleTokens)}
                          ariaLabel={cardTitleData.ariaLabel}
                          placeholder="Card title"
                        />,
                        titleTokens
                      );
                    })() : <div />}
                    {c.badge ? (
                      (() => {
                        const badgeData = textContent(String(c.badge ?? ""), badgeTokens);
                        return wrapDecorations(
                          <InlineEditableText
                            as="div"
                            value={String(c.badge ?? "")}
                            path={["cards", idx, "badge"]}
                            textData={badgeData}
                            className={cls("shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80", tokensClass(badgeTokens), badgeData.className)}
                            style={tokensStyle(badgeTokens)}
                            ariaLabel={badgeData.ariaLabel}
                            placeholder="Badge"
                          />,
                          badgeTokens
                        );
                      })()
                    ) : null}
                  </div>

                  {c.text ? (() => {
                    const cardTextData = textContent(String(c.text ?? ""), textTokens);
                    return wrapDecorations(
                      <InlineEditableText
                        as="div"
                        value={String(c.text ?? "")}
                        path={["cards", idx, "text"]}
                        textData={cardTextData}
                        className={cls("mt-2 text-sm text-white/70", tokensClass(textTokens), cardTextData.className)}
                        style={tokensStyle(textTokens)}
                        ariaLabel={cardTextData.ariaLabel}
                        placeholder="Card text"
                        multiline
                      />,
                      textTokens
                    );
                  })() : null}

                  {c.buttonLabel && c.buttonHref ? (
                    (() => {
                      const buttonData = textContent(String(c.buttonLabel ?? ""), buttonTokens);
                      const buttonState = getElementState({
                        kind: "button",
                        valuePath: ["cards", idx, "buttonLabel"],
                        tokensPath: ["cards", idx, "buttonTokens"],
                        label: c.buttonLabel ?? "Button",
                      });
                      return wrapDecorations(
                        <a
                          href={c.buttonHref}
                          className={cls(
                            "mt-4 inline-flex items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15",
                            tokensClass(buttonTokens),
                            buttonState.selected ? SELECTED_ELEMENT_CLASS : undefined
                          )}
                          {...buttonState.attrs}
                          style={tokensStyle(buttonTokens)}
                        >
                          <InlineEditableText
                            as="span"
                            value={String(c.buttonLabel ?? "")}
                            path={["cards", idx, "buttonLabel"]}
                            textData={buttonData}
                            className={buttonData.className}
                            ariaLabel={buttonData.ariaLabel}
                            placeholder="Button"
                            selectKind="button"
                            selectTokensPath={["cards", idx, "buttonTokens"]}
                            selectHighlight={false}
                          />
                        </a>,
                        buttonTokens
                      );
                    })()
                  ) : null}
                </div>
              );
              return wrapDecorations(node, cardTokens);
            })}
          </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }
  if (type === "VIDEO") {
    const d = data as VideoData;
    const aspect = d.aspect ?? "16/9";
    const aspectClass = aspect === "9/16" ? "aspect-[9/16]" : aspect === "1/1" ? "aspect-square" : aspect === "4/3" ? "aspect-[4/3]" : "aspect-video";
    const componentsBlock = renderComponentsBlock(d);
    const sectionTokens = (d as any)?.twTokens;
    const titleData = d.title ? textContent(String(d.title), sectionTokens) : null;
    const subtitleData = d.subtitle ? textContent(String(d.subtitle), sectionTokens) : null;
    const placeholderData = textContent("(ضع رابط الفيديو)", sectionTokens);

    const yt = d.url ? youtubeId(d.url) : null;
    const vm = d.url ? vimeoId(d.url) : null;

    return wrapDecorations(
      <section className={cls("rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6", uiSectionClass(d))} style={uiSectionStyle(d)}>
        <div className={cls("mx-auto max-w-5xl", uiContainerClass(d))}>
          <SectionTextScope data={d}>
          {titleData ? (
            <InlineEditableText
              as="h3"
              value={String(d.title ?? "")}
              path={["title"]}
              textData={titleData}
              className={cls("mb-2 text-lg font-semibold", titleData.className)}
              ariaLabel={titleData.ariaLabel}
              placeholder="Video title"
            />
          ) : null}
          {subtitleData ? (
            <InlineEditableText
              as="div"
              value={String(d.subtitle ?? "")}
              path={["subtitle"]}
              textData={subtitleData}
              className={cls("mb-4 text-sm opacity-80", subtitleData.className)}
              ariaLabel={subtitleData.ariaLabel}
              placeholder="Video subtitle"
              multiline
            />
          ) : null}

          <div className={cls("overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40", aspectClass)}>
            {yt ? (
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${yt}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : vm ? (
              <iframe
                className="h-full w-full"
                src={`https://player.vimeo.com/video/${vm}`}
                title="Vimeo video"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : d.url ? (
              <video
                className="h-full w-full"
                src={d.url}
                poster={d.posterUrl ?? undefined}
                controls={d.controls ?? true}
                autoPlay={!!d.autoplay}
                muted={!!d.muted}
                loop={!!d.loop}
              />
            ) : (
              <div className={cls("flex h-full w-full items-center justify-center text-sm opacity-70", placeholderData.className)} aria-label={placeholderData.ariaLabel}>
                {placeholderData.content}
              </div>
            )}
          </div>
          </SectionTextScope>
          {componentsBlock}
        </div>
      </section>,
      sectionTokens
    );
  }

  const fallbackComponents = sectionComponents(data);
  if (fallbackComponents.length) {
    const inheritTokens = (data as any)?.twTokens?.typography ? { typography: (data as any).twTokens.typography } : undefined;
    return (
      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="mx-auto max-w-6xl">
          <CmsComponentsRenderer components={fallbackComponents} inheritTokens={inheritTokens} />
        </div>
      </section>
    );
  }

  return null;
}

export function PageRenderer({
  sections,
  inlineEditing = false,
  onInlineEdit,
  selectedSectionId,
  onSectionSelect,
  highlightSelected = true,
  selectedElement,
  onElementSelect,
  highlightSelectedElement = true,
}: {
  sections: PageSection[];
  inlineEditing?: boolean;
  onInlineEdit?: (payload: InlineEditPayload) => void;
  selectedSectionId?: string | null;
  onSectionSelect?: SectionSelectHandler;
  highlightSelected?: boolean;
  selectedElement?: SelectedElement | null;
  onElementSelect?: ElementSelectHandler;
  highlightSelectedElement?: boolean;
}) {
  const sorted = (sections ?? []).filter((s) => s.isVisible !== false).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const groups = buildSectionGroups(sorted);
  const inlineContext = { enabled: !!inlineEditing && !!onInlineEdit, onCommit: onInlineEdit };
  const selectContext = {
    selected: highlightSelectedElement ? (selectedElement ?? null) : null,
    onSelect: onElementSelect,
  };

  return (
    <InlineEditContext.Provider value={inlineContext}>
      <InlineSelectContext.Provider value={selectContext}>
        <div className="space-y-5">
          {groups.flatMap((group) => {
            const renderSectionItem = (sec: PageSection) => {
              const layout = normalizeSectionLayout((sec as any)?.data?.layout);
              const span = clampInt(layout.span, 1, group.columns, 1);
              const colSpanClass = group.mode === "grid" ? SECTION_COL_SPAN[span] : undefined;
              const rowStyle =
                group.mode === "row" && group.columns > 0
                  ? {
                      flex: `0 0 ${(span / group.columns) * 100}%`,
                      maxWidth: `${(span / group.columns) * 100}%`,
                    }
                  : undefined;
              const stringId = String(sec.id);
              const isSelected = highlightSelected && selectedSectionId != null && String(selectedSectionId) === stringId;

              return (
                <div key={sec.id} className={cls(colSpanClass)} style={rowStyle}>
                  <InlineSectionContext.Provider value={stringId}>
                    <div
                      data-section-id={stringId}
                      className={cls(
                        "cms-canvas-section relative",
                        onSectionSelect ? "cursor-pointer" : undefined,
                        isSelected ? "outline outline-2 outline-accent-500/40 outline-offset-4" : "outline outline-1 outline-transparent"
                      )}
                      onMouseDownCapture={
                        onSectionSelect || onElementSelect
                          ? (event) => {
                              if (event.button !== 0) return;
                              const meta = resolveElementMeta(event.target as HTMLElement | null);
                              if (meta && onElementSelect) {
                                onElementSelect(buildSelectedElement(stringId, meta));
                                return;
                              }
                              onSectionSelect?.(stringId);
                            }
                          : undefined
                      }
                      onClick={
                        onSectionSelect
                          ? (event) => {
                              if (event.defaultPrevented) return;
                              event.preventDefault();
                              event.stopPropagation();
                            }
                          : undefined
                      }
                    >
                      {isSelected ? (
                        <div className="pointer-events-none absolute -top-3 left-3 rounded-full border border-accent-500/40 bg-accent-500/20 px-2 py-0.5 text-[10px] text-accent-200 shadow-sm">
                          Selected
                        </div>
                      ) : null}
                      <Section type={sec.type} data={sec.data} sectionId={stringId} selectedElement={highlightSelectedElement ? selectedElement : null} />
                    </div>
                  </InlineSectionContext.Provider>
                </div>
              );
            };

            if (group.mode === "stack") {
              return group.sections.map(renderSectionItem);
            }

            const groupClass =
              group.mode === "row"
                ? "flex flex-wrap items-stretch gap-5"
                : cls("grid gap-5", SECTION_GRID_COLS[group.columns] ?? SECTION_GRID_COLS[2]);

            return (
              <div key={group.key} className={groupClass}>
                {group.sections.map(renderSectionItem)}
              </div>
            );
          })}
        </div>
      </InlineSelectContext.Provider>
    </InlineEditContext.Provider>
  );
}

