import React from "react";
import type { CmsComponent } from "../types";
import { tokensToClassName, tokensToInlineStyle } from "../style/tokensToTw";
import { TypewriterText } from "../../components/effects/TypewriterText";

type CmsComponentsRendererProps = {
  components?: CmsComponent[];
  className?: string;
  inheritTokens?: any;
};

function cx(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

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

function getChildren(component: CmsComponent): CmsComponent[] {
  const fromProps = (component.props as any)?.children;
  if (Array.isArray(fromProps)) return fromProps as CmsComponent[];
  const fromRoot = (component as any)?.children;
  if (Array.isArray(fromRoot)) return fromRoot as CmsComponent[];
  return [];
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
  if (next.textEffect == null && inheritTokens?.textEffect != null) next.textEffect = inheritTokens.textEffect;
  if (next.typewriter == null && inheritTokens?.typewriter != null) next.typewriter = inheritTokens.typewriter;
  if (inheritTokens?.typography) {
    next.typography = { ...(inheritTokens.typography ?? {}), ...(next.typography ?? {}) };
  }
  return next;
}

function combineInheritTokens(parentInherit?: any, parentTokens?: any) {
  if (!parentInherit && !parentTokens) return undefined;
  const next = { ...(parentInherit ?? {}) } as any;
  if (parentTokens) {
    if (parentTokens.textEffect !== undefined) next.textEffect = parentTokens.textEffect;
    if (parentTokens.typewriter !== undefined) next.typewriter = parentTokens.typewriter;
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

function gridColsClass(cols?: number): string {
  const n = Math.min(6, Math.max(1, Number(cols) || 1));
  if (n === 1) return "grid-cols-1";
  if (n === 2) return "grid-cols-1 sm:grid-cols-2";
  if (n === 3) return "grid-cols-1 sm:grid-cols-3";
  if (n === 4) return "grid-cols-1 sm:grid-cols-4";
  if (n === 5) return "grid-cols-1 sm:grid-cols-5";
  return "grid-cols-1 sm:grid-cols-6";
}

function ComponentNode({
  component,
  depth = 0,
  inheritTokens,
}: {
  component: CmsComponent;
  depth?: number;
  inheritTokens?: any;
}) {
  const props = (component.props ?? {}) as any;
  const baseTokens = resolveTokens(component) as any;
  const tokens = mergeEffectTokens(baseTokens, inheritTokens) as any;
  const legacyClassName = typeof (component as any)?.tw?.className === "string" ? (component as any).tw.className : "";
  const textScopeClass = hasTypographyOverrides(tokens?.typography) ? "cms-section-text" : "";
  const className = cx(tokensToClassName(tokens), legacyClassName, textScopeClass);
  const classNameNoTextEffect = tokens?.textEffect
    ? cx(tokensToClassName({ ...(tokens ?? {}), textEffect: undefined } as any), legacyClassName, textScopeClass)
    : className;
  const inlineStyle = tokensToInlineStyle(tokens);
  const children = getChildren(component);
  const safeDepth = Math.min(depth, 6);
  const childInheritTokens = combineInheritTokens(inheritTokens, tokens);

  const renderChildren = () => {
    if (!children.length || safeDepth >= 6) return null;
    return children.map((child, idx) => (
      <ComponentNode
        key={child.id ?? `${component.id}-${idx}`}
        component={child}
        depth={safeDepth + 1}
        inheritTokens={childInheritTokens}
      />
    ));
  };

  switch (component.kind) {
    case "text": {
      const As = (props.as ?? "p") as React.ElementType;
      const rawText = props.text ?? "";
      const textValue = typeof rawText === "string" ? rawText : String(rawText);
      const textData = textContent(textValue, tokens);
      return (
        <As className={textData.useTypewriter ? classNameNoTextEffect : className} style={inlineStyle} aria-label={textData.ariaLabel}>
          {textData.content}
        </As>
      );
    }
    case "badge":
      {
        const rawText = props.text ?? "Badge";
        const textValue = typeof rawText === "string" ? rawText : String(rawText);
        const textData = textContent(textValue, tokens);
        return (
          <span
            className={cx("border border-white/10", textData.useTypewriter ? classNameNoTextEffect : className)}
            style={inlineStyle}
            aria-label={textData.ariaLabel}
          >
            {textData.content}
          </span>
        );
      }
    case "button": {
      const rawLabel = props.label ?? "Button";
      const label = typeof rawLabel === "string" ? rawLabel : String(rawLabel);
      const textData = textContent(label, tokens);
      if (props.href) {
        return (
          <a
            href={props.href}
            className={cx(baseButtonClasses(props.variant), textData.useTypewriter ? classNameNoTextEffect : className)}
            style={inlineStyle}
            aria-label={textData.ariaLabel}
          >
            {textData.content}
          </a>
        );
      }
      return (
        <button
          type="button"
          className={cx(baseButtonClasses(props.variant), textData.useTypewriter ? classNameNoTextEffect : className)}
          style={inlineStyle}
          aria-label={textData.ariaLabel}
        >
          {textData.content}
        </button>
      );
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
        return (
          <div className={cx("border border-white/10", cardClassName)} style={inlineStyle}>
            <div className="space-y-2">
              {titleValue ? (
                <div
                  className={cx("font-semibold", titleData.useTypewriter ? undefined : textEffects)}
                  aria-label={titleData.ariaLabel}
                >
                  {titleData.content}
                </div>
              ) : (
                <div className="font-semibold">Card</div>
              )}
              {textValue ? (
                <div className={cx("opacity-80", textData.useTypewriter ? undefined : textEffects)} aria-label={textData.ariaLabel}>
                  {textData.content}
                </div>
              ) : null}
              {props.buttonLabel ? (
                props.buttonHref ? (
                  <a
                    href={props.buttonHref}
                    className={cx(baseButtonClasses(props.buttonVariant), "mt-2 inline-flex", buttonData.useTypewriter ? undefined : textEffects)}
                    aria-label={buttonData.ariaLabel}
                  >
                    {buttonData.content}
                  </a>
                ) : (
                  <button
                    type="button"
                    className={cx(baseButtonClasses(props.buttonVariant), "mt-2 inline-flex", buttonData.useTypewriter ? undefined : textEffects)}
                    aria-label={buttonData.ariaLabel}
                  >
                    {buttonData.content}
                  </button>
                )
              ) : null}
            </div>
          </div>
        );
      }
    case "list": {
      const items = Array.isArray(props.items) ? props.items : [];
      if (props.ordered) {
        return (
          <ol className={cx("list-decimal ps-6", className)} style={inlineStyle}>
            {items.map((it: string, idx: number) => (
              <li key={idx}>{it}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul className={cx("list-disc ps-6", className)} style={inlineStyle}>
          {items.map((it: string, idx: number) => (
            <li key={idx}>{it}</li>
          ))}
        </ul>
      );
    }
    case "image":
      return props.src ? (
        <img src={props.src} alt={props.alt ?? ""} className={cx("max-w-full", className)} style={inlineStyle} />
      ) : (
        <div className={cx("border border-dashed border-white/20 p-6 text-xs opacity-70", className)} style={inlineStyle}>Image</div>
      );
    case "icon":
      return props.d ? (
        <svg viewBox={props.viewBox ?? "0 0 24 24"} className={cx("h-6 w-6", className)} style={inlineStyle} fill="none" stroke="currentColor" strokeWidth="2">
          <path d={props.d} />
        </svg>
      ) : (
        <div className={cx("h-6 w-6 rounded-md border border-dashed border-white/20", className)} style={inlineStyle} />
      );
    case "divider":
      return <hr className={cx("border-white/10", className)} style={inlineStyle} />;
    case "spacer":
      return <div className={cx(spacerClass(props.h), className)} style={inlineStyle} />;
    case "container":
      return <div className={cx("mx-auto w-full", className)} style={inlineStyle}>{renderChildren()}</div>;
    case "stack":
      return <div className={className} style={inlineStyle}>{renderChildren()}</div>;
    case "row":
      return <div className={className} style={inlineStyle}>{renderChildren()}</div>;
    case "grid":
      return <div className={cx(gridColsClass(props.cols), className)} style={inlineStyle}>{renderChildren()}</div>;
    case "columns":
      return <div className={cx(gridColsClass(props.cols), className)} style={inlineStyle}>{renderChildren()}</div>;
    case "nav_menu": {
      const items = Array.isArray(props.items) ? props.items : [];
      return (
        <nav className={cx("border border-white/10", className)} style={inlineStyle}>
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
    }
    case "productGrid": {
      const ids = Array.isArray(props.productIds) ? props.productIds : [];
      return (
        <div className={cx("rounded-2xl border border-white/10 bg-white/[0.02] p-4", className)} style={inlineStyle}>
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
    }
    case "productSlider": {
      return (
        <div className={cx("rounded-2xl border border-white/10 bg-white/[0.02] p-4", className)} style={inlineStyle}>
          <div className="text-sm font-semibold">{props.title ?? "Products"}</div>
          <div className="mt-3 text-xs opacity-60">(Slider placeholder)</div>
        </div>
      );
    }
    case "categoryTiles": {
      const items = Array.isArray(props.items) ? props.items : [];
      return (
        <div className={cx("rounded-2xl border border-white/10 bg-white/[0.02] p-4", className)} style={inlineStyle}>
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
    }
    case "filtersBar":
      return (
        <div className={cx("rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs", className)} style={inlineStyle}>
          Filters bar
        </div>
      );
    case "data":
      return (
        <div className={cx("rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs", className)} style={inlineStyle}>
          Data component
        </div>
      );
    default:
      return (
        <div className={cx("rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs opacity-70", className)} style={inlineStyle}>
          {component.kind}
        </div>
      );
  }
}

export function CmsComponentsRenderer({ components, className, inheritTokens }: CmsComponentsRendererProps) {
  const list = Array.isArray(components) ? components : [];
  if (!list.length) return null;
  return (
    <div className={className}>
      {list.map((component, idx) => (
        <ComponentNode key={component.id ?? `cmp-${idx}`} component={component} inheritTokens={inheritTokens} />
      ))}
    </div>
  );
}
