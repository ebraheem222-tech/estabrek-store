import React from "react";
import type { CmsComponent } from "@/cms/types";
import type { DecorLayer } from "@/cms/style/tokens";
import { tokensToClassName, tokensToInlineStyle } from "@/cms/style/tokensToTw";
import { SHAPES } from "@/cms/shapes/shapeRegistry";
import ProductCard from "@/components/ProductCard";
import { buildCanonicalQuery, type CatalogFilters } from "@/lib/filtersUrl";
import { ProductFiltersBar } from "@/components/ProductFiltersBar";
import { TypewriterText } from "@/components/effects/TypewriterText";

function cn(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

function resolveOffsetValue(value?: number | string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

function isGradientValue(value?: string): boolean {
  if (!value) return false;
  return /gradient\(/i.test(value);
}

function parseGradientStops(value?: string): string[] | null {
  if (!value) return null;
  const match = value.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^)]+)\)/i);
  if (match) return [match[1].trim(), match[2].trim()];
  return null;
}

function hasDecorLayers(tokens?: any): boolean {
  const before = tokens?.decor?.before?.shape;
  const after = tokens?.decor?.after?.shape;
  return !!((before && before !== "none") || (after && after !== "none"));
}

function wrapWithDecor(
  tokens: any,
  content: React.ReactElement,
  inline = false,
  key?: React.Key
): React.ReactNode {
  if (!hasDecorLayers(tokens)) {
    return React.cloneElement(content, { key });
  }
  const Wrapper: React.ElementType = inline ? "span" : "div";
  return (
    <Wrapper key={key} className={cn("relative", inline ? "inline-block" : undefined)}>
      {renderDecorLayer(tokens?.decor?.before, "before")}
      {content}
      {renderDecorLayer(tokens?.decor?.after, "after")}
    </Wrapper>
  );
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
  return (component as any).twTokens ?? getLegacyTokens(component);
}

function getLegacyClassName(component: CmsComponent): string {
  const v = (component as any)?.tw?.className;
  return typeof v === "string" ? v : "";
}

function baseButtonClasses(variant?: string): string {
  const v = variant ?? "primary";
  switch (v) {
    case "secondary":
      return "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] hover:bg-[color:var(--surface-2)]";
    case "ghost":
      return "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-transparent text-[color:var(--text)] hover:bg-[color:var(--surface-2)]";
    default:
      return "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[color:var(--accent-2)] text-[color:var(--accent-contrast,#0B0B0B)] hover:brightness-95";
  }
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

function isInlineTag(tag: any, tokens?: any): boolean {
  const display = tokens?.layout?.display;
  if (display === "inline" || display === "inline-flex") return true;
  if (typeof tag !== "string") return false;
  return new Set([
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
  ]).has(tag);
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


function renderDecorLayer(layer?: DecorLayer, kind: "before"|"after" = "before") {
  if (!layer || !layer.shape || layer.shape === "none") return null;

  const placement = (layer.placement ?? "bottom") as "top"|"bottom"|"left"|"right";
  const size = layer.size ?? "md";
  const opacity = layer.opacity ?? "20";
  const color = layer.color ?? "muted";
  const fillMode = layer.fill ?? (color === "sunset" || color === "ocean" || color === "neon" ? "gradient" : "solid");
  const blur = layer.blur ?? "0";
  const flipX = !!layer.flipX;
  const flipY = !!layer.flipY;
  const zIndex = typeof layer.zIndex === "number" ? layer.zIndex : undefined;
  const offsetX = resolveOffsetValue(layer.offsetX);
  const offsetY = resolveOffsetValue(layer.offsetY);
  const rotate = Number.isFinite(layer.rotate as number) ? `rotate(${Number(layer.rotate)}deg)` : undefined;
  const scale = Number.isFinite(layer.scale as number) ? `scale(${Number(layer.scale)})` : undefined;
  const customColor = typeof layer.customColor === "string" ? layer.customColor.trim() : "";
  const customIsGradient = isGradientValue(customColor);
  const wantsGradient = fillMode === "gradient" || customIsGradient;

  const sizeMapH: Record<string, string> = { xs: "h-8", sm: "h-12", md: "h-20", lg: "h-28", xl: "h-36" };
  const sizeMapW: Record<string, string> = { xs: "w-8", sm: "w-12", md: "w-20", lg: "w-28", xl: "w-36" };

  const isHorizontal = placement === "top" || placement === "bottom";
  const wrapSize = isHorizontal ? (sizeMapH[size] ?? "h-20") : (sizeMapW[size] ?? "w-20");

  const posClass =
    placement === "top" ? "top-0 left-0 right-0" :
    placement === "bottom" ? "bottom-0 left-0 right-0" :
    placement === "left" ? "left-0 top-0 bottom-0" :
    "right-0 top-0 bottom-0";

  const blurClass = blur === "lg" ? "blur-lg" : blur === "md" ? "blur-md" : blur === "sm" ? "blur-sm" : undefined;

  const opacityValue = Math.max(0, Math.min(100, Number(opacity))) / 100;
  const layerOpacity = opacityValue * (fillMode === "glass" ? 0.6 : 1);
  const translate = offsetX || offsetY ? `translate(${offsetX ?? "0px"}, ${offsetY ?? "0px"})` : undefined;
  const transformParts: string[] = [];
  if (placement === "left") transformParts.push("rotate(-90deg)");
  if (placement === "right") transformParts.push("rotate(90deg)");
  if (flipX) transformParts.push("scaleX(-1)");
  if (flipY) transformParts.push("scaleY(-1)");
  if (translate) transformParts.push(translate);
  if (rotate) transformParts.push(rotate);
  if (scale) transformParts.push(scale);
  const transform = transformParts.length ? transformParts.join(" ") : undefined;
  const baseWrap = cn(
    "pointer-events-none absolute overflow-hidden",
    posClass,
    wrapSize,
    zIndex === undefined ? "-z-10" : undefined,
    blurClass
  );

  // Solid color via currentColor; gradients via defs.
  const gradStops = {
    sunset: ["#fb7185", "#f97316", "#fbbf24"],
    ocean: ["#06b6d4", "#3b82f6", "#6366f1"],
    neon: ["#d946ef", "#8b5cf6", "#3b82f6"],
    primary: ["#22c55e", "#06b6d4", "#3b82f6"],
  } as const;

  const solidClassMap = {
    muted: "text-black/10 dark:text-white/10",
    white: "text-white/20",
    black: "text-black/15",
    primary: "text-black/25 dark:text-white/20",
    sunset: "",
    ocean: "",
    neon: "",
  } as const;
  const solidClass =
    solidClassMap[color as keyof typeof solidClassMap] ??
    "text-black/10 dark:text-white/10";

  const gradientId = `${kind}-grad-${Math.random().toString(36).slice(2,8)}`;

  const gradientStops = wantsGradient
    ? customIsGradient
      ? (parseGradientStops(customColor) ?? [])
      : customColor
        ? [customColor, customColor]
        : (gradStops as any)[color] ?? gradStops.sunset
    : [];
  const resolvedStops = gradientStops.length >= 2 ? gradientStops : gradStops.sunset;

  const def = SHAPES[layer.shape] ?? SHAPES.wave;

  return (
    <div
      className={baseWrap}
      style={{
        opacity: Number.isFinite(layerOpacity) ? layerOpacity : undefined,
        transform,
        zIndex,
        color: customColor && !customIsGradient ? customColor : undefined,
      }}
      aria-hidden="true"
    >
      <svg
        className={cn("w-full h-full", customColor && !customIsGradient ? undefined : solidClass)}
        viewBox={def.viewBox}
        preserveAspectRatio="none"
      >
        {wantsGradient ? (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              {resolvedStops.length >= 3 ? (
                <>
                  <stop offset="0%" stopColor={resolvedStops[0]} stopOpacity={0.85} />
                  <stop offset="50%" stopColor={resolvedStops[1]} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={resolvedStops[2]} stopOpacity={0.85} />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor={resolvedStops[0]} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={resolvedStops[1] ?? resolvedStops[0]} stopOpacity={0.85} />
                </>
              )}
            </linearGradient>
          </defs>
        ) : null}
        <path d={def.d} fill={wantsGradient ? `url(#${gradientId})` : "currentColor"} />
      </svg>
    </div>
  );
}


function RenderBox({ tokens, className, children }: { tokens?: any; className?: string; children: React.ReactNode }) {
  const textScopeClass = hasTypographyOverrides(tokens?.typography) ? "cms-section-text" : undefined;
  const cls = cn(tokensToClassName(tokens), className, textScopeClass);
  const inlineStyle = tokensToInlineStyle(tokens);
  const hasDecor = hasDecorLayers(tokens);
  return (
    <div className={cn(hasDecor ? "relative" : undefined, cls)} style={inlineStyle}>
      {hasDecor ? renderDecorLayer(tokens?.decor?.before, "before") : null}
      {children}
      {hasDecor ? renderDecorLayer(tokens?.decor?.after, "after") : null}
    </div>
  );
}

export function ComponentsRenderer({
  components,
  productLookup,
  inheritTokens,
}: {
  components?: CmsComponent[];
  productLookup?: Record<string, any>;
  inheritTokens?: any;
}) {
  if (!components?.length) return null;

  const renderOne = (
    c: CmsComponent,
    stack = new Set<CmsComponent>(),
    depth = 0,
    inheritedTokens = inheritTokens
  ): React.ReactNode => {
    if (depth > 100) return null; // safety guard against runaway nesting
    if (stack.has(c)) return null; // guard against accidental cycles in CMS data
    const nextStack = new Set(stack);
    nextStack.add(c);
    const nextDepth = depth + 1;

    // Layout components support nesting: props.children = CmsComponent[]
    const baseTokens = resolveTokens(c);
    const tokens = mergeEffectTokens(baseTokens, inheritedTokens);
    const legacyClassName = getLegacyClassName(c);
    const children = getChildren(c);
    const nextInheritTokens = combineInheritTokens(inheritedTokens, tokens);

    const gridColsMap: Record<number, string> = {
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-4",
      5: "grid-cols-1 md:grid-cols-5",
      6: "grid-cols-1 md:grid-cols-6",
    };

    const columnsColsMap: Record<number, string> = {
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-4",
    };

    switch (c.kind) {
      case "container": {
        return (
          <RenderBox key={c.id} tokens={tokens} className={cn(legacyClassName, "mx-auto w-full")}>
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth, nextInheritTokens)) : null}
          </RenderBox>
        );
      }

      case "stack": {
        return (
          <RenderBox key={c.id} tokens={tokens} className={cn(legacyClassName, "flex flex-col")}>
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth, nextInheritTokens)) : null}
          </RenderBox>
        );
      }

      case "row": {
        return (
          <RenderBox key={c.id} tokens={tokens} className={cn(legacyClassName, "flex flex-row flex-wrap")}>
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth, nextInheritTokens)) : null}
          </RenderBox>
        );
      }

      case "grid": {
        const cols = Math.min(6, Math.max(2, Number(c.props?.cols ?? 2)));
        const cls = cn("grid", gridColsMap[cols] ?? gridColsMap[2]);
        return (
          <RenderBox key={c.id} tokens={tokens} className={cn(legacyClassName, cls)}>
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth, nextInheritTokens)) : null}
          </RenderBox>
        );
      }

      case "columns": {
        const cols = Math.min(4, Math.max(2, Number(c.props?.cols ?? 2)));
        const cls = cn("grid", columnsColsMap[cols] ?? columnsColsMap[2]);
        return (
          <RenderBox key={c.id} tokens={tokens} className={cn(legacyClassName, cls)}>
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth, nextInheritTokens)) : null}
          </RenderBox>
        );
      }

      default:
        break;
    }

    // Non-layout leaf components
    const textScopeClass = hasTypographyOverrides(tokens?.typography) ? "cms-section-text" : undefined;
    const tokenClass = cn(tokensToClassName(tokens), legacyClassName, textScopeClass);
    const tokenClassNoTextEffect = tokens?.textEffect
      ? cn(tokensToClassName({ ...(tokens ?? {}), textEffect: undefined } as any), legacyClassName, textScopeClass)
      : tokenClass;
    const tokenStyle = tokensToInlineStyle(tokens);

    switch (c.kind) {
      case "nav_menu": {
        const props = c.props ?? {};
        const items = Array.isArray(props.items) ? props.items : [];
        const mode = (props.mode ?? "dropdown") as "dropdown" | "mega";
        const gradient = (props.gradient ?? "none") as "none" | "sunset" | "ocean" | "neon";
        const showIcons = !!(props.showIcons ?? true);

        const iconPaths: Record<string, string> = {
          home: "M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z",
          shop: "M4 7h16l-1.5 14H5.5L4 7Zm3-4h10l1 4H6l1-4Z",
          phone: "M6 2h3l2 5-2 1c1 3 3 5 6 6l1-2 5 2v3c0 1-1 2-2 2C10 19 5 14 4 6c0-1 1-2 2-2Z",
          star: "M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7l3-7Z",
          sparkle: "M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2Z",
          chev: "M9 6l6 6-6 6",
        };

        function Icon({ name }: { name?: string }) {
          if (!showIcons) return null;
          const key = (name ?? "none") as string;
          const d = iconPaths[key];
          if (!d) return null;
          return (
            <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-90" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={d} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          );
        }

        const gradStops: Record<string, string[]> = {
          sunset: ["#fb7185", "#f97316", "#fbbf24"],
          ocean: ["#06b6d4", "#3b82f6", "#6366f1"],
          neon: ["#d946ef", "#8b5cf6", "#3b82f6"],
        };
        function GradientBg() {
          if (gradient === "none") return null;
          const id = `nav-grad-${c.id}`;
          const stops = gradStops[gradient] ?? gradStops.sunset;
          return (
            <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                  {stops.map((s, i) => (
                    <stop key={s} offset={`${(i / (stops.length - 1)) * 100}%`} stopColor={s} />
                  ))}
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} opacity="0.22" />
            </svg>
          );
        }

        const node = (
          <nav className={cn("relative", "w-full", tokenClass)} style={tokenStyle}>
            <ul className="flex flex-wrap items-center gap-2">
              {items.map((it: any) => {
                const children = Array.isArray(it.children) ? it.children : [];
                const hasChildren = children.length > 0;
                return (
                  <li key={it.id ?? it.href ?? it.label} className="relative group">
                    <a
                      href={it.href ?? "#"}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/[0.06]"
                    >
                      <Icon name={it.icon} />
                      <span>{it.label ?? "Item"}</span>
                      {hasChildren ? <Icon name="chev" /> : null}
                    </a>

                    {hasChildren ? (
                      <div className="absolute left-0 top-full z-50 mt-2 hidden min-w-[220px] group-hover:block">
                        <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]/95 backdrop-blur p-3">
                          <GradientBg />
                          {mode === "mega" ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {children.map((ch: any) => (
                                <a
                                  key={ch.id ?? ch.href ?? ch.label}
                                  href={ch.href ?? "#"}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/[0.06]"
                                >
                                  <Icon name={ch.icon} />
                                  <span>{ch.label ?? "Child"}</span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="grid gap-1">
                              {children.map((ch: any) => (
                                <a
                                  key={ch.id ?? ch.href ?? ch.label}
                                  href={ch.href ?? "#"}
                                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/[0.06]"
                                >
                                  <Icon name={ch.icon} />
                                  <span>{ch.label ?? "Child"}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
        );

        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "text": {
        const As = (c.props?.as ?? "p") as any;
        const rawText = c.props?.text ?? "";
        const textValue = typeof rawText === "string" ? rawText : String(rawText);
        const textData = textContent(textValue, tokens);
        const node = (
          <As className={textData.useTypewriter ? tokenClassNoTextEffect : tokenClass} style={tokenStyle} aria-label={textData.ariaLabel}>
            {textData.content}
          </As>
        );
        return wrapWithDecor(tokens, node, isInlineTag(As, tokens), c.id);
      }

      case "badge": {
        const rawText = c.props?.text ?? "Badge";
        const textValue = typeof rawText === "string" ? rawText : String(rawText);
        const textData = textContent(textValue, tokens);
        const node = (
          <span
            className={cn("inline-flex items-center rounded-full border border-black/10 dark:border-white/15", textData.useTypewriter ? tokenClassNoTextEffect : tokenClass)}
            style={tokenStyle}
            aria-label={textData.ariaLabel}
          >
            {textData.content}
          </span>
        );
        return wrapWithDecor(tokens, node, true, c.id);
      }

      case "button": {
        const href = c.props?.href ?? "#";
        const rawLabel = c.props?.label ?? "Button";
        const label = typeof rawLabel === "string" ? rawLabel : String(rawLabel);
        const variant = c.props?.variant ?? "primary";
        const textData = textContent(label, tokens);
        const node = (
          <a
            href={href}
            className={cn(baseButtonClasses(variant), textData.useTypewriter ? tokenClassNoTextEffect : tokenClass)}
            style={tokenStyle}
            aria-label={textData.ariaLabel}
          >
            {textData.content}
          </a>
        );
        return wrapWithDecor(tokens, node, true, c.id);
      }

      case "input": {
        const label = c.props?.label ?? "";
        const node = (
          <div className={cn("space-y-2", tokenClass)} style={tokenStyle}>
            {label ? <label className="text-sm opacity-80">{label}</label> : null}
            <input
              type={c.props?.type ?? "text"}
              name={c.props?.name ?? undefined}
              placeholder={c.props?.placeholder ?? ""}
              required={!!c.props?.required}
              className="w-full bg-transparent border-0 p-0 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-2)]/30"
            />
          </div>
        );
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "textarea": {
        const label = c.props?.label ?? "";
        const node = (
          <div className={cn("space-y-2", tokenClass)} style={tokenStyle}>
            {label ? <label className="text-sm opacity-80">{label}</label> : null}
            <textarea
              rows={Number(c.props?.rows ?? 4)}
              name={c.props?.name ?? undefined}
              placeholder={c.props?.placeholder ?? ""}
              required={!!c.props?.required}
              className="w-full bg-transparent border-0 p-0 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-2)]/30"
            />
          </div>
        );
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "select": {
        const label = c.props?.label ?? "";
        const options = normalizeSelectOptions(c.props?.options);
        const node = (
          <div className={cn("space-y-2", tokenClass)} style={tokenStyle}>
            {label ? <label className="text-sm opacity-80">{label}</label> : null}
            <select
              name={c.props?.name ?? undefined}
              required={!!c.props?.required}
              className="w-full bg-transparent border-0 p-0 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-2)]/30"
            >
              {c.props?.placeholder ? <option value="">{c.props?.placeholder}</option> : null}
              {options.map((opt, idx) => (
                <option key={`${opt.value}-${idx}`} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "checkbox": {
        const label = c.props?.label ?? "Checkbox";
        const node = (
          <label className={cn("inline-flex items-center gap-2", tokenClass)} style={tokenStyle}>
            <input
              type="checkbox"
              name={c.props?.name ?? undefined}
              defaultChecked={!!c.props?.checked}
              required={!!c.props?.required}
              className="h-4 w-4 rounded border border-[color:var(--border)] bg-transparent"
            />
            <span className="text-sm">{label}</span>
          </label>
        );
        return wrapWithDecor(tokens, node, true, c.id);
      }

      case "card": {
        const title = c.props?.title ?? "Card title";
        const text = c.props?.text ?? "";
        const buttonLabel = c.props?.buttonLabel;
        const buttonHref = c.props?.buttonHref ?? "#";
        const buttonVariant = c.props?.buttonVariant ?? "secondary";
        const titleValue = typeof title === "string" ? title : String(title);
        const textValue = typeof text === "string" ? text : String(text);
        const buttonValue = typeof buttonLabel === "string" ? buttonLabel : String(buttonLabel ?? "");
        const titleData = textContent(titleValue, tokens);
        const textData = textContent(textValue, tokens);
        const buttonData = textContent(buttonValue, tokens);
        const node = (
          <div className={cn("rounded-2xl border border-black/10 bg-white dark:bg-white/5 dark:border-white/15", tokenClassNoTextEffect)} style={tokenStyle}>
            <div className="space-y-2">
              <div className={cn("text-lg font-semibold", titleData.className)} aria-label={titleData.ariaLabel}>
                {titleData.content}
              </div>
              {text ? (
                <div className={cn("text-sm opacity-80", textData.className)} aria-label={textData.ariaLabel}>
                  {textData.content}
                </div>
              ) : null}
              {buttonLabel ? (
                <a
                  href={buttonHref}
                  className={cn(baseButtonClasses(buttonVariant), "mt-2 inline-flex", buttonData.className)}
                  aria-label={buttonData.ariaLabel}
                >
                  {buttonData.content}
                </a>
              ) : null}
            </div>
          </div>
        );
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "list": {
        const ordered = !!c.props?.ordered;
        const items: string[] = Array.isArray(c.props?.items) ? c.props.items : [];
        const node = ordered ? (
          <ol className={cn("list-decimal ps-6", tokenClass)} style={tokenStyle}>
            {items.map((it, i) => <li key={i}>{it}</li>)}
          </ol>
        ) : (
          <ul className={cn("list-disc ps-6", tokenClass)} style={tokenStyle}>
            {items.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        );
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "image": {
        const src = c.props?.src;
        if (!src) return null;
        const node = <img src={src} alt={c.props?.alt ?? ""} className={cn("max-w-full rounded-xl", tokenClass)} style={tokenStyle} />;
        return wrapWithDecor(tokens, node, true, c.id);
      }

      case "icon": {
        const d = c.props?.d;
        if (!d) return null;
        const viewBox = c.props?.viewBox ?? "0 0 24 24";
        const node = (
          <svg viewBox={viewBox} className={cn("h-6 w-6", tokenClass)} style={tokenStyle} fill="none" stroke="currentColor" strokeWidth="2">
            <path d={d} />
          </svg>
        );
        return wrapWithDecor(tokens, node, true, c.id);
      }

      case "divider": {
        const node = <hr className={cn("border-black/10 dark:border-white/15", tokenClass)} style={tokenStyle} />;
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "spacer": {
        const node = <div className={cn(spacerClass(c.props?.h), tokenClass)} style={tokenStyle} />;
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "productGrid": {
        const ids: string[] = Array.isArray(c.props?.productIds) ? c.props.productIds : [];
        const cols = c.props?.cols ?? 4;
        const title = c.props?.title ?? "";
        const pagination = c.props?.pagination as undefined | {
          basePath: string;
          page: number;
          totalPages: number;
          filters: CatalogFilters;
        };
        const node = (
          <div className={cn("w-full", tokenClass)} style={tokenStyle}>
            {title ? <div className="mb-3 text-sm font-semibold">{title}</div> : null}
            <div className={cn("grid gap-4", cols===2?"grid-cols-2":cols===3?"grid-cols-3":cols===5?"grid-cols-5":cols===6?"grid-cols-6":"grid-cols-4")}>
              {ids.map((id) => (<ProductCard key={id} productId={id} />))}
            </div>

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .slice(0, 9)
                  .map((p) => {
                    const q = buildCanonicalQuery({ ...(pagination.filters ?? { colors: [], sizeIds: [] }), page: p });
                    const href = q ? `${pagination.basePath}?${q}` : pagination.basePath;
                    const active = p === (pagination.page ?? 1);
                    return (
                      <a
                        key={p}
                        href={href}
                        className={[
                          "h-10 min-w-[40px] rounded-xl px-3 inline-flex items-center justify-center border text-sm transition",
                          active
                            ? "border-[#0B0B0B] bg-[#0B0B0B] text-[#F7F4E9]"
                            : "border-black/10 bg-white/70 hover:bg-white",
                        ].join(" ")}
                      >
                        {p}
                      </a>
                    );
                  })}
              </div>
            ) : null}
          </div>
        );
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "productSlider": {
        const ids: string[] = Array.isArray(c.props?.productIds) ? c.props.productIds : [];
        const title = c.props?.title ?? "";
        const node = (
          <div className={cn("w-full", tokenClass)} style={tokenStyle}>
            {title ? <div className="mb-3 text-sm font-semibold">{title}</div> : null}
            <div className="flex gap-4 overflow-x-auto pb-2">
              {ids.map((id) => (
                <div key={id} className="min-w-[220px] max-w-[260px] flex-shrink-0">
                  <ProductCard productId={id} />
                </div>
              ))}
            </div>
          </div>
        );
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "categoryTiles": {
        const items: any[] = Array.isArray(c.props?.items) ? c.props.items : [];
        const cols = c.props?.cols ?? 3;
        const title = c.props?.title ?? "";
        const node = (
          <div className={cn("w-full", tokenClass)} style={tokenStyle}>
            {title ? <div className="mb-3 text-sm font-semibold">{title}</div> : null}
            <div className={cn("grid gap-4", cols===2?"grid-cols-2":cols===4?"grid-cols-4":"grid-cols-3")}>
              {items.map((it, idx2) => (
                <a
                  key={it.href ?? idx2}
                  href={it.href ?? "#"}
                  className={
                    "group relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 shadow-sm transition " +
                    "hover:-translate-y-0.5 hover:shadow-lg hover:ring-1 hover:ring-[color:var(--accent-2)]"
                  }
                >
                  <div className="relative aspect-[16/9] bg-black/[0.04]">
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt={it.title ?? "Category"}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : null}

                    {/* gradient wash */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-70" />
                  </div>

                  <div className="p-4">
                    <div className="text-sm font-semibold text-[#0B0B0B]">{it.title ?? "Category"}</div>
                    <div className="mt-2 h-px w-0 bg-[color:var(--accent-2)] transition-all duration-300 group-hover:w-full" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        );
        return wrapWithDecor(tokens, node, false, c.id);
      }

      case "filtersBar": {
        const colors = Array.isArray(c.props?.colors) ? c.props.colors : [];
        const sizes = Array.isArray(c.props?.sizes) ? c.props.sizes : [];
        const categories = Array.isArray(c.props?.categories) ? c.props.categories : [];
        const hasFacets = !!(colors.length || sizes.length || categories.length);
        const node = (
          <div className={cn("w-full", tokenClass)} style={tokenStyle}>
            {!hasFacets ? (
              <div className="rounded-2xl border border-black/10 dark:border-white/15 p-3 text-sm opacity-80">
                FiltersBar (needs facets)
              </div>
            ) : (
              <ProductFiltersBar colors={colors} sizes={sizes} categories={categories} />
            )}
          </div>
        );
        return wrapWithDecor(tokens, node, false, c.id);
      }

      default:
        return null;
    }
  };

  return <div className="space-y-4">{components.map((c) => renderOne(c))}</div>;
}
