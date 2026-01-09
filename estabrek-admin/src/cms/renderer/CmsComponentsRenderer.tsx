import React from "react";
import type { CmsComponent } from "../types";
import { tokensToClassName, tokensToInlineStyle } from "../style/tokensToTw";
import { getContainerById, getDividerById } from "../style/containerStyles";
import { SectionDecorations } from "../decorations/DecorationLayer";
import { TypewriterText } from "../../components/effects/TypewriterText";
import { SHAPES } from "../shapes/shapeRegistry";

type CmsComponentsRendererProps = {
  components?: CmsComponent[];
  className?: string;
  inheritTokens?: any;
  selection?: ComponentSelection;
};

type ElementPath = Array<string | number>;

type ElementMeta = {
  kind: string;
  label?: string;
  valuePath?: ElementPath;
  tokensPath?: ElementPath;
};

type SelectedElementLike = ElementMeta & {
  sectionId: string;
  key?: string;
};

type ComponentSelection = {
  sectionId: string;
  selectedElement?: SelectedElementLike | null;
};

function cx(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

const SELECTED_ELEMENT_CLASS = "ring-2 ring-accent-500/40 ring-offset-2 ring-offset-black/40";
const SELECTED_TEXT_CLASS = "outline outline-1 outline-accent-500/50 outline-offset-2 rounded-sm";

const SPLIT_TEXT_EFFECTS = new Set(["wave", "bounce"]);
const INLINE_TAGS = new Set([
  "span",
  "small",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "a",
  "button",
  "label",
  "code",
  "kbd",
  "sup",
  "sub",
]);

function hasDecorLayers(tokens?: any): boolean {
  const before = tokens?.decor?.before?.shape;
  const after = tokens?.decor?.after?.shape;
  return !!((before && before !== "none") || (after && after !== "none"));
}

function decorationsFromTokens(tokens?: any) {
  if (!hasDecorLayers(tokens)) return null;
  const before = tokens?.decor?.before;
  const after = tokens?.decor?.after;
  const hasBefore = !!before?.shape && before.shape !== "none";
  const hasAfter = !!after?.shape && after.shape !== "none";
  if (!hasBefore && !hasAfter) return null;
  return { before: hasBefore ? before : undefined, after: hasAfter ? after : undefined };
}

function wrapWithDecor(tokens: any, node: React.ReactElement, inline = false) {
  const decorations = decorationsFromTokens(tokens);
  if (!decorations) return node;
  const Wrapper: React.ElementType = inline ? "span" : "div";
  const Inner: React.ElementType = inline ? "span" : "div";
  return (
    <Wrapper className={cx("relative", inline ? "inline-block" : undefined)}>
      <SectionDecorations decorations={decorations} className="z-0" />
      <Inner className="relative z-10">{node}</Inner>
    </Wrapper>
  );
}

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

function getChildrenWithPath(component: CmsComponent): { items: CmsComponent[]; path?: ElementPath } {
  const fromProps = (component.props as any)?.children;
  if (Array.isArray(fromProps)) return { items: fromProps as CmsComponent[], path: ["props", "children"] };
  const fromRoot = (component as any)?.children;
  if (Array.isArray(fromRoot)) return { items: fromRoot as CmsComponent[], path: ["children"] };
  return { items: [], path: undefined };
}

function getLegacyTokens(component: CmsComponent): any | undefined {
  const legacy = (component as any)?.tw;
  if (!legacy || typeof legacy !== "object") return undefined;
  const copy = { ...legacy } as any;
  if ("className" in copy) delete copy.className;
  return Object.keys(copy).length ? copy : undefined;
}

function resolveTokens(component: CmsComponent): any | undefined {
  return component.twTokens ?? getLegacyTokens(component);
}

function elementKey(meta: ElementMeta): string {
  return `${meta.kind}:${JSON.stringify(meta.valuePath ?? [])}:${JSON.stringify(meta.tokensPath ?? [])}`;
}

function selectedKey(selected: SelectedElementLike | null | undefined): string | null {
  if (!selected) return null;
  if (selected.key) return selected.key;
  return elementKey({
    kind: selected.kind ?? "",
    valuePath: selected.valuePath,
    tokensPath: selected.tokensPath,
  });
}

function isElementSelected(selected: SelectedElementLike | null | undefined, sectionId: string, meta: ElementMeta): boolean {
  if (!selected) return false;
  if (String(selected.sectionId) !== String(sectionId)) return false;
  const key = selectedKey(selected);
  return !!key && key === elementKey(meta);
}

function elementDataAttrs(meta: ElementMeta, sectionId: string, selected: boolean) {
  return {
    "data-cms-element": meta.kind,
    "data-cms-key": elementKey(meta),
    "data-cms-label": meta.label,
    "data-cms-value-path": meta.valuePath ? JSON.stringify(meta.valuePath) : undefined,
    "data-cms-tokens-path": meta.tokensPath ? JSON.stringify(meta.tokensPath) : undefined,
    "data-cms-selected": selected ? "true" : undefined,
    "data-cms-section": sectionId,
  } as const;
}

function elementState(sectionId: string, selectedElement: SelectedElementLike | null | undefined, meta: ElementMeta) {
  const selected = isElementSelected(selectedElement, sectionId, meta);
  return { selected, attrs: elementDataAttrs(meta, sectionId, selected) };
}

function textEffectClass(tokens?: any) {
  if (!tokens?.textEffect) return "";
  return tokensToClassName({ textEffect: tokens.textEffect } as any);
}

function hasTypographyOverrides(typography?: any) {
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
  if (typography.colorCustom) return true;
  return false;
}

function mergeEffectTokens(tokens?: any, inheritTokens?: any): any | undefined {
  if (!inheritTokens) return tokens;
  const next = { ...(tokens ?? {}) } as any;
  if (inheritTokens?.typography) {
    next.typography = { ...(inheritTokens.typography ?? {}), ...(next.typography ?? {}) };
  }
  return next;
}

function combineInheritTokens(parentInherit?: any, parentTokens?: any) {
  if (!parentInherit && !parentTokens) return undefined;
  const next = { ...(parentInherit ?? {}) } as any;
  if (parentTokens) {
    if (parentTokens.typography) {
      next.typography = { ...(next.typography ?? {}), ...(parentTokens.typography ?? {}) };
    }
  }
  return next;
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
  return { useTypewriter: false, ariaLabel: split.ariaLabel, content: split.content };
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

function spacerClass(h?: string): string {
  switch (h) {
    case "xs":
      return "h-2";
    case "sm":
      return "h-4";
    case "md":
      return "h-8";
    case "lg":
      return "h-12";
    case "xl":
      return "h-20";
    default:
      return "h-8";
  }
}

function svgModeForShape(shape?: string, mode?: string): "fill" | "stroke" {
  if (mode === "fill" || mode === "stroke") return mode;
  if (shape === "lines-horizontal" || shape === "lines-diagonal") return "stroke";
  return "fill";
}

function isInlineTag(tag: any, tokens?: any): boolean {
  const display = tokens?.layout?.display;
  if (display === "inline" || display === "inline-flex") return true;
  if (typeof tag !== "string") return false;
  return INLINE_TAGS.has(tag);
}

function gridColsClass(cols?: number): string {
  const n = Math.min(6, Math.max(1, Number(cols) || 1));
  if (n === 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 sm:grid-cols-2";
  if (n === 3) return "grid-cols-1 sm:grid-cols-3";
  if (n === 4) return "grid-cols-1 sm:grid-cols-4";
  if (n === 5) return "grid-cols-1 sm:grid-cols-5";
  return "grid-cols-1 sm:grid-cols-6";
}

function normalizeSelectOptions(raw: any): Array<{ label: string; value: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((opt) => {
      if (typeof opt === "string") return { label: opt, value: opt };
      if (opt && typeof opt === "object") {
        const label = typeof opt.label === "string" ? opt.label : String(opt.value ?? "");
        const value = typeof opt.value === "string" ? opt.value : String(opt.label ?? "");
        return { label, value };
      }
      return null;
    })
    .filter((opt): opt is { label: string; value: string } => !!opt && !!opt.label);
}

function ComponentNode({
  component,
  depth = 0,
  inheritTokens,
  path = [],
  selection,
}: {
  component: CmsComponent;
  depth?: number;
  inheritTokens?: any;
  path?: ElementPath;
  selection?: ComponentSelection;
}) {
  const props = (component.props ?? {}) as any;
  const baseTokens = resolveTokens(component) as any;
  const tokens = mergeEffectTokens(baseTokens, inheritTokens) as any;
  const legacyClassName = typeof (component as any)?.tw?.className === "string" ? (component as any).tw.className : "";
  const componentLabel = typeof component.name === "string" && component.name.trim() ? component.name.trim() : component.kind;
  const selectionEnabled = !!selection?.sectionId && path.length > 0;
  const sectionId = selection?.sectionId ?? "";
  const selectedElement = selection?.selectedElement ?? null;
  const tokensPath = selectionEnabled ? [...path, "twTokens"] : undefined;
  const baseMeta = selectionEnabled
    ? {
        kind: component.kind,
        label: componentLabel,
        valuePath: path,
        tokensPath,
      }
    : null;
  const baseState = baseMeta ? elementState(sectionId, selectedElement, baseMeta) : null;
  const textScopeClass = hasTypographyOverrides(tokens?.typography) ? "cms-section-text" : "";
  const className = cx(tokensToClassName(tokens), legacyClassName, textScopeClass);
  const classNameNoTextEffect = tokens?.textEffect
    ? cx(tokensToClassName({ ...(tokens ?? {}), textEffect: undefined } as any), legacyClassName, textScopeClass)
    : className;
  const inlineStyle = tokensToInlineStyle(tokens);
  const { items: children, path: childrenPath } = getChildrenWithPath(component);
  const safeDepth = Math.min(depth, 6);
  const childInheritTokens = combineInheritTokens(inheritTokens, tokens);
  const childPathBase = childrenPath ? [...path, ...childrenPath] : null;

  const renderChildren = () => {
    if (!children.length || safeDepth >= 6) return null;
    return children.map((child, idx) => (
      <ComponentNode
        key={child.id ?? `${component.id}-${idx}`}
        component={child}
        depth={safeDepth + 1}
        inheritTokens={childInheritTokens}
        path={childPathBase ? [...childPathBase, idx] : []}
        selection={selection}
      />
    ));
  };

  switch (component.kind) {
    case "text": {
      const As = (props.as ?? "p") as React.ElementType;
      const rawText = props.text ?? "";
      const textValue = typeof rawText === "string" ? rawText : String(rawText);
      const textData = textContent(textValue, tokens);
      const textMeta = selectionEnabled
        ? {
            kind: "text",
            label: textValue || componentLabel,
            valuePath: [...path, "props", "text"],
            tokensPath,
          }
        : null;
      const textState = textMeta ? elementState(sectionId, selectedElement, textMeta) : null;
      const node = (
        <As
          className={cx(
            textData.useTypewriter ? classNameNoTextEffect : className,
            textState?.selected ? SELECTED_TEXT_CLASS : undefined
          )}
          style={inlineStyle}
          aria-label={textData.ariaLabel}
          {...textState?.attrs}
        >
          {textData.content}
        </As>
      );
      return wrapWithDecor(tokens, node, isInlineTag(As, tokens));
    }
    case "badge":
      {
        const rawText = props.text ?? "Badge";
        const textValue = typeof rawText === "string" ? rawText : String(rawText);
        const textData = textContent(textValue, tokens);
        const badgeMeta = selectionEnabled
          ? {
              kind: "badge",
              label: textValue || componentLabel,
              valuePath: [...path, "props", "text"],
              tokensPath,
            }
          : null;
        const badgeState = badgeMeta ? elementState(sectionId, selectedElement, badgeMeta) : null;
        const node = (
          <span
            className={cx(
              "border border-white/10",
              textData.useTypewriter ? classNameNoTextEffect : className,
              badgeState?.selected ? SELECTED_TEXT_CLASS : undefined
            )}
            style={inlineStyle}
            aria-label={textData.ariaLabel}
            {...badgeState?.attrs}
          >
            {textData.content}
          </span>
        );
        return wrapWithDecor(tokens, node, true);
      }
    case "button": {
      const rawLabel = props.label ?? "Button";
      const label = typeof rawLabel === "string" ? rawLabel : String(rawLabel);
      const textData = textContent(label, tokens);
      const buttonMeta = selectionEnabled
        ? {
            kind: "button",
            label: label || componentLabel,
            valuePath: [...path, "props", "label"],
            tokensPath,
          }
        : null;
      const buttonState = buttonMeta ? elementState(sectionId, selectedElement, buttonMeta) : null;
      if (props.href) {
        const node = (
          <a
            href={props.href}
            className={cx(
              baseButtonClasses(props.variant),
              textData.useTypewriter ? classNameNoTextEffect : className,
              buttonState?.selected ? SELECTED_ELEMENT_CLASS : undefined
            )}
            style={inlineStyle}
            aria-label={textData.ariaLabel}
            {...buttonState?.attrs}
          >
            {textData.content}
          </a>
        );
        return wrapWithDecor(tokens, node, true);
      }
      const node = (
        <button
          type="button"
          className={cx(
            baseButtonClasses(props.variant),
            textData.useTypewriter ? classNameNoTextEffect : className,
            buttonState?.selected ? SELECTED_ELEMENT_CLASS : undefined
          )}
          style={inlineStyle}
          aria-label={textData.ariaLabel}
          {...buttonState?.attrs}
        >
          {textData.content}
        </button>
      );
      return wrapWithDecor(tokens, node, true);
    }
    case "input": {
      const label = props.label ?? "";
      const node = (
        <div
          className={cx("space-y-2", className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          {label ? <label className="text-sm opacity-80">{label}</label> : null}
          <input
            type={props.type ?? "text"}
            name={props.name ?? undefined}
            placeholder={props.placeholder ?? ""}
            required={!!props.required}
            className="w-full bg-transparent border-0 p-0 text-sm outline-none focus:ring-2 focus:ring-white/10"
          />
        </div>
      );
      return wrapWithDecor(tokens, node, false);
    }
    case "textarea": {
      const label = props.label ?? "";
      const node = (
        <div
          className={cx("space-y-2", className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          {label ? <label className="text-sm opacity-80">{label}</label> : null}
          <textarea
            rows={Number(props.rows ?? 4)}
            name={props.name ?? undefined}
            placeholder={props.placeholder ?? ""}
            required={!!props.required}
            className="w-full bg-transparent border-0 p-0 text-sm outline-none focus:ring-2 focus:ring-white/10"
          />
        </div>
      );
      return wrapWithDecor(tokens, node, false);
    }
    case "select": {
      const label = props.label ?? "";
      const options = normalizeSelectOptions(props.options);
      const node = (
        <div
          className={cx("space-y-2", className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          {label ? <label className="text-sm opacity-80">{label}</label> : null}
          <select
            name={props.name ?? undefined}
            required={!!props.required}
            className="w-full bg-transparent border-0 p-0 text-sm outline-none focus:ring-2 focus:ring-white/10"
          >
            {props.placeholder ? <option value="">{props.placeholder}</option> : null}
            {options.map((opt, idx) => (
              <option key={`${opt.value}-${idx}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
      return wrapWithDecor(tokens, node, false);
    }
    case "checkbox": {
      const label = props.label ?? "Checkbox";
      const node = (
        <label
          className={cx("inline-flex items-center gap-2", className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          <input
            type="checkbox"
            name={props.name ?? undefined}
            defaultChecked={!!props.checked}
            required={!!props.required}
            className="h-4 w-4 rounded border border-white/20 bg-transparent"
          />
          <span className="text-sm">{label}</span>
        </label>
      );
      return wrapWithDecor(tokens, node, true);
    }
    case "card":
      {
        const title = props.title ?? "Card";
        const text = props.text ?? "";
        const titleValue = typeof title === "string" ? title : String(title);
        const textValue = typeof text === "string" ? text : String(text);
        const buttonLabel = props.buttonLabel ?? "";
        const buttonLabelValue = typeof buttonLabel === "string" ? buttonLabel : String(buttonLabel);
        const textEffects = textEffectClass(tokens);
        const cardClassName = classNameNoTextEffect;
        const titleData = textContent(titleValue, tokens);
        const textData = textContent(textValue, tokens);
        const buttonData = textContent(buttonLabelValue, tokens);
        const cardMeta = selectionEnabled
          ? {
              kind: "card",
              label: componentLabel,
              valuePath: path,
              tokensPath,
            }
          : null;
        const cardState = cardMeta ? elementState(sectionId, selectedElement, cardMeta) : null;
        const titleMeta = selectionEnabled
          ? {
              kind: "text",
              label: titleValue || componentLabel,
              valuePath: [...path, "props", "title"],
              tokensPath,
            }
          : null;
        const titleState = titleMeta ? elementState(sectionId, selectedElement, titleMeta) : null;
        const textMeta = selectionEnabled
          ? {
              kind: "text",
              label: textValue || componentLabel,
              valuePath: [...path, "props", "text"],
              tokensPath,
            }
          : null;
        const textState = textMeta ? elementState(sectionId, selectedElement, textMeta) : null;
        const buttonMeta = selectionEnabled
          ? {
              kind: "button",
              label: buttonLabelValue || componentLabel,
              valuePath: [...path, "props", "buttonLabel"],
              tokensPath,
            }
          : null;
        const buttonState = buttonMeta ? elementState(sectionId, selectedElement, buttonMeta) : null;
        const node = (
          <div
            className={cx("border border-white/10", cardClassName, cardState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
            style={inlineStyle}
            {...cardState?.attrs}
          >
            <div className="space-y-2">
              {titleValue ? (
                <div
                  className={cx(
                    "font-semibold",
                    titleData.useTypewriter ? undefined : textEffects,
                    titleState?.selected ? SELECTED_TEXT_CLASS : undefined
                  )}
                  aria-label={titleData.ariaLabel}
                  {...titleState?.attrs}
                >
                  {titleData.content}
                </div>
              ) : (
                <div className="font-semibold">Card</div>
              )}
              {textValue ? (
                <div
                  className={cx(
                    "opacity-80",
                    textData.useTypewriter ? undefined : textEffects,
                    textState?.selected ? SELECTED_TEXT_CLASS : undefined
                  )}
                  aria-label={textData.ariaLabel}
                  {...textState?.attrs}
                >
                  {textData.content}
                </div>
              ) : null}
              {props.buttonLabel ? (
                props.buttonHref ? (
                  <a
                    href={props.buttonHref}
                    className={cx(
                      baseButtonClasses(props.buttonVariant),
                      "mt-2 inline-flex",
                      buttonData.useTypewriter ? undefined : textEffects,
                      buttonState?.selected ? SELECTED_ELEMENT_CLASS : undefined
                    )}
                    aria-label={buttonData.ariaLabel}
                    {...buttonState?.attrs}
                  >
                    {buttonData.content}
                  </a>
                ) : (
                  <button
                    type="button"
                    className={cx(
                      baseButtonClasses(props.buttonVariant),
                      "mt-2 inline-flex",
                      buttonData.useTypewriter ? undefined : textEffects,
                      buttonState?.selected ? SELECTED_ELEMENT_CLASS : undefined
                    )}
                    aria-label={buttonData.ariaLabel}
                    {...buttonState?.attrs}
                  >
                    {buttonData.content}
                  </button>
                )
              ) : null}
            </div>
          </div>
        );
        return wrapWithDecor(tokens, node, false);
      }
    case "list": {
      const items = Array.isArray(props.items) ? props.items : [];
      if (props.ordered) {
        const node = (
          <ol
            className={cx("list-decimal ps-6", className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
            style={inlineStyle}
            {...baseState?.attrs}
          >
            {items.map((it: string, idx: number) => (
              <li key={idx}>{it}</li>
            ))}
          </ol>
        );
        return wrapWithDecor(tokens, node, false);
      }
      const node = (
        <ul
          className={cx("list-disc ps-6", className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          {items.map((it: string, idx: number) => (
            <li key={idx}>{it}</li>
          ))}
        </ul>
      );
      return wrapWithDecor(tokens, node, false);
    }
    case "image":
      {
        const imageMeta = selectionEnabled
          ? {
              kind: "image",
              label: props.alt ?? componentLabel,
              valuePath: [...path, "props", "src"],
              tokensPath,
            }
          : null;
        const imageState = imageMeta ? elementState(sectionId, selectedElement, imageMeta) : null;
        const node = props.src ? (
          <img
            src={props.src}
            alt={props.alt ?? ""}
            className={cx("max-w-full", className, imageState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
            style={inlineStyle}
            {...imageState?.attrs}
          />
        ) : (
          <div
            className={cx(
              "border border-dashed border-white/20 p-6 text-xs opacity-70",
              className,
              imageState?.selected ? SELECTED_ELEMENT_CLASS : undefined
            )}
            style={inlineStyle}
            {...imageState?.attrs}
          >
            Image
          </div>
        );
        return wrapWithDecor(tokens, node, !!props.src);
      }
    case "icon":
      {
        const iconMeta = selectionEnabled
          ? {
              kind: "icon",
              label: componentLabel,
              valuePath: [...path, "props", "d"],
              tokensPath,
            }
          : null;
        const iconState = iconMeta ? elementState(sectionId, selectedElement, iconMeta) : null;
        const node = props.d ? (
          <svg
            viewBox={props.viewBox ?? "0 0 24 24"}
            className={cx("h-6 w-6", className, iconState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
            style={inlineStyle}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            {...iconState?.attrs}
          >
            <path d={props.d} />
          </svg>
        ) : (
          <div
            className={cx(
              "h-6 w-6 rounded-md border border-dashed border-white/20",
              className,
              iconState?.selected ? SELECTED_ELEMENT_CLASS : undefined
            )}
            style={inlineStyle}
            {...iconState?.attrs}
          />
        );
        return wrapWithDecor(tokens, node, !!props.d);
      }
    case "svg":
      {
        const shapeKey = typeof props.shape === "string" ? props.shape : "";
        const preset = shapeKey && shapeKey !== "custom" ? (SHAPES as any)[shapeKey] : undefined;
        const viewBox = typeof props.viewBox === "string" ? props.viewBox : preset?.viewBox ?? "0 0 100 100";
        const d = typeof props.d === "string" ? props.d : preset?.d ?? "";
        const paths = Array.isArray(props.paths) ? props.paths : preset?.paths;
        const preserveAspectRatio = typeof props.preserveAspectRatio === "string" ? props.preserveAspectRatio : "none";
        const mode = svgModeForShape(shapeKey, props.mode);
        const strokeWidth = Number.isFinite(Number(props.strokeWidth)) ? Number(props.strokeWidth) : 2;

        const hasPath = (typeof d === "string" && d.trim()) || (Array.isArray(paths) && paths.length);
        const svgMeta = selectionEnabled
          ? {
              kind: "svg",
              label: componentLabel,
              valuePath: [...path, "props", "d"],
              tokensPath,
            }
          : null;
        const svgState = svgMeta ? elementState(sectionId, selectedElement, svgMeta) : null;
        const node = hasPath ? (
          <svg
            viewBox={viewBox}
            preserveAspectRatio={preserveAspectRatio}
            className={cx("pointer-events-none block", className, svgState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
            style={inlineStyle}
            aria-hidden="true"
            {...svgState?.attrs}
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
        ) : (
          <div
            className={cx(
              "rounded-md border border-dashed border-white/20 p-4 text-xs opacity-70",
              className,
              svgState?.selected ? SELECTED_ELEMENT_CLASS : undefined
            )}
            style={inlineStyle}
            {...svgState?.attrs}
          >
            SVG
          </div>
        );
        return wrapWithDecor(tokens, node, false);
      }
    case "divider":
      {
        const preset = getDividerById(tokens?.dividerStyleId);
        const node = preset?.svg ? (
          <div
            className={cx(className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
            style={inlineStyle}
            {...baseState?.attrs}
            dangerouslySetInnerHTML={{ __html: preset.svg }}
          />
        ) : preset ? (
          <div
            className={cx(className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
            style={inlineStyle}
            {...baseState?.attrs}
          />
        ) : (
          <hr
            className={cx("border-white/10", className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
            style={inlineStyle}
            {...baseState?.attrs}
          />
        );
        return wrapWithDecor(tokens, node, false);
      }
    case "spacer":
      return wrapWithDecor(
        tokens,
        <div
          className={cx(spacerClass(props.h), className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
          style={inlineStyle}
          {...baseState?.attrs}
        />,
        false
      );
    case "container":
      {
        const preset = getContainerById(tokens?.containerStyleId);
        const children = preset?.innerClassName ? <div className={preset.innerClassName}>{renderChildren()}</div> : renderChildren();
        return wrapWithDecor(
          tokens,
          <div
            className={cx("mx-auto w-full", className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
            style={inlineStyle}
            {...baseState?.attrs}
          >
            {children}
          </div>,
          false
        );
      }
    case "stack":
      return wrapWithDecor(
        tokens,
        <div className={cx(className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)} style={inlineStyle} {...baseState?.attrs}>
          {renderChildren()}
        </div>,
        false
      );
    case "row":
      return wrapWithDecor(
        tokens,
        <div className={cx(className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)} style={inlineStyle} {...baseState?.attrs}>
          {renderChildren()}
        </div>,
        false
      );
    case "grid":
      return wrapWithDecor(
        tokens,
        <div
          className={cx(gridColsClass(props.cols), className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          {renderChildren()}
        </div>,
        false
      );
    case "columns":
      return wrapWithDecor(
        tokens,
        <div
          className={cx(gridColsClass(props.cols), className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          {renderChildren()}
        </div>,
        false
      );
    case "nav_menu": {
      const items = Array.isArray(props.items) ? props.items : [];
      const node = (
        <nav
          className={cx("border border-white/10", className, baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined)}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          {!items.length ? (
            <div className="text-xs opacity-60">No menu items.</div>
          ) : (
            <ul className="space-y-2">
              {items.map((it: any, idx: number) => (
                <li key={it.id ?? idx}>
                  <a href={it.href ?? "#"} className="underline-offset-4 hover:underline">
                    {it.label ?? "Item"}
                  </a>
                  {Array.isArray(it.children) && it.children.length ? (
                    <ul className="mt-1 space-y-1 ps-4">
                      {it.children.map((ch: any, cidx: number) => (
                        <li key={ch.id ?? cidx}>
                          <a href={ch.href ?? "#"} className="opacity-80 underline-offset-4 hover:underline">
                            {ch.label ?? "Child"}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </nav>
      );
      return wrapWithDecor(tokens, node, false);
    }
    case "productGrid": {
      const ids = Array.isArray(props.productIds) ? props.productIds : [];
      const node = (
        <div
          className={cx(
            "rounded-2xl border border-white/10 bg-white/[0.02] p-4",
            className,
            baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined
          )}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          <div className="text-sm font-semibold">{props.title ?? "Product Grid"}</div>
          <div className={cx("mt-3 grid gap-3", gridColsClass(props.cols ?? 3))}>
            {ids.length ? (
              ids.map((id: string, idx: number) => (
                <div key={`${id}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
                  {id}
                </div>
              ))
            ) : (
              <div className="text-xs opacity-60">No products yet.</div>
            )}
          </div>
        </div>
      );
      return wrapWithDecor(tokens, node, false);
    }
    case "productSlider": {
      const node = (
        <div
          className={cx(
            "rounded-2xl border border-white/10 bg-white/[0.02] p-4",
            className,
            baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined
          )}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          <div className="text-sm font-semibold">{props.title ?? "Products"}</div>
          <div className="mt-3 text-xs opacity-60">(Slider placeholder)</div>
        </div>
      );
      return wrapWithDecor(tokens, node, false);
    }
    case "categoryTiles": {
      const items = Array.isArray(props.items) ? props.items : [];
      const node = (
        <div
          className={cx(
            "rounded-2xl border border-white/10 bg-white/[0.02] p-4",
            className,
            baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined
          )}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          <div className="text-sm font-semibold">{props.title ?? "Categories"}</div>
          <div className={cx("mt-3 grid gap-3", gridColsClass(props.cols ?? 3))}>
            {items.length ? (
              items.map((it: any, idx: number) => (
                <div key={it.id ?? idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
                  {it.title ?? it.label ?? "Category"}
                </div>
              ))
            ) : (
              <div className="text-xs opacity-60">No categories yet.</div>
            )}
          </div>
        </div>
      );
      return wrapWithDecor(tokens, node, false);
    }
    case "filtersBar":
      return wrapWithDecor(tokens, (
        <div
          className={cx(
            "rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs",
            className,
            baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined
          )}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          Filters bar
        </div>
      ), false);
    case "data":
      return wrapWithDecor(tokens, (
        <div
          className={cx(
            "rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs",
            className,
            baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined
          )}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          Data component
        </div>
      ), false);
    default:
      return wrapWithDecor(tokens, (
        <div
          className={cx(
            "rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs opacity-70",
            className,
            baseState?.selected ? SELECTED_ELEMENT_CLASS : undefined
          )}
          style={inlineStyle}
          {...baseState?.attrs}
        >
          {component.kind}
        </div>
      ), false);
  }
}

export function CmsComponentsRenderer({ components, className, inheritTokens, selection }: CmsComponentsRendererProps) {
  const list = Array.isArray(components) ? components : [];
  if (!list.length) return null;
  return (
    <div className={className}>
      {list.map((component, idx) => (
        <ComponentNode
          key={component.id ?? `cmp-${idx}`}
          component={component}
          inheritTokens={inheritTokens}
          path={["components", idx]}
          selection={selection}
        />
      ))}
    </div>
  );
}
