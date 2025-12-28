import React from "react";
import type { CmsComponent } from "@/cms/types";
import type { DecorLayer } from "@/cms/style/tokens";
import { tokensToClassName, tokensToInlineStyle } from "@/cms/style/tokensToTw";
import { SHAPES } from "@/cms/shapes/shapeRegistry";
import ProductCard from "@/components/ProductCard";
import { buildCanonicalQuery, type CatalogFilters } from "@/lib/filtersUrl";
import { ProductFiltersBar } from "@/components/ProductFiltersBar";

function cn(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
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


function renderDecorLayer(layer?: DecorLayer, kind: "before"|"after" = "before") {
  if (!layer || !layer.shape || layer.shape === "none") return null;

  const placement = (layer.placement ?? "bottom") as "top"|"bottom"|"left"|"right";
  const size = layer.size ?? "md";
  const opacity = layer.opacity ?? "20";
  const color = layer.color ?? "muted";
  const fill = layer.fill ?? (color === "sunset" || color === "ocean" || color === "neon" ? "gradient" : "solid");
  const blur = layer.blur ?? "0";
  const flipX = !!layer.flipX;
  const flipY = !!layer.flipY;

  const sizeMapH: Record<string, string> = { xs: "h-8", sm: "h-12", md: "h-20", lg: "h-28", xl: "h-36" };
  const sizeMapW: Record<string, string> = { xs: "w-8", sm: "w-12", md: "w-20", lg: "w-28", xl: "w-36" };

  const isHorizontal = placement === "top" || placement === "bottom";
  const wrapSize = isHorizontal ? (sizeMapH[size] ?? "h-20") : (sizeMapW[size] ?? "w-20");

  const posClass =
    placement === "top" ? "top-0 left-0 right-0" :
    placement === "bottom" ? "bottom-0 left-0 right-0" :
    placement === "left" ? "left-0 top-0 bottom-0" :
    "right-0 top-0 bottom-0";

  const blurClass = blur === "md" ? "blur-md" : blur === "sm" ? "blur-sm" : undefined;
  const rotateClass = placement === "left" ? "-rotate-90" : placement === "right" ? "rotate-90" : undefined;
  const flipXClass = flipX ? "-scale-x-100" : undefined;
  const flipYClass = flipY ? "-scale-y-100" : undefined;

  const opacityValue = Math.max(0, Math.min(100, Number(opacity))) / 100;
  const baseWrap = cn(
    "pointer-events-none absolute overflow-hidden",
    posClass,
    wrapSize,
    kind === "before" ? "-z-10" : "-z-10",
    blurClass,
    rotateClass,
    flipXClass,
    flipYClass
  );

  // Solid color via currentColor; gradients via defs.
  const gradStops = {
    sunset: ["#fb7185", "#f97316", "#fbbf24"],
    ocean: ["#06b6d4", "#3b82f6", "#6366f1"],
    neon: ["#d946ef", "#8b5cf6", "#3b82f6"],
    primary: ["#22c55e", "#06b6d4", "#3b82f6"],
  } as const;

  const solidClass = {
    muted: "text-black/10 dark:text-white/10",
    white: "text-white/20",
    black: "text-black/15",
    primary: "text-black/25 dark:text-white/20",
    sunset: "",
    ocean: "",
    neon: "",
  }[color as any] ?? "text-black/10 dark:text-white/10";

  const gradientId = `${kind}-grad-${Math.random().toString(36).slice(2,8)}`;

  const def = SHAPES[layer.shape] ?? SHAPES.wave;

  return (
    <div className={baseWrap} style={{ opacity: Number.isFinite(opacityValue) ? opacityValue : undefined }} aria-hidden="true">
      <svg className={cn("w-full h-full", fill === "glass" ? "opacity-60" : undefined, solidClass)} viewBox={def.viewBox} preserveAspectRatio="none">
        {fill === "gradient" ? (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={(gradStops as any)[color]?.[0] ?? gradStops.sunset[0]} stopOpacity={0.85} />
              <stop offset="50%" stopColor={(gradStops as any)[color]?.[1] ?? gradStops.sunset[1]} stopOpacity={0.85} />
              <stop offset="100%" stopColor={(gradStops as any)[color]?.[2] ?? gradStops.sunset[2]} stopOpacity={0.85} />
            </linearGradient>
          </defs>
        ) : null}
        <path d={def.d} fill={fill === "gradient" ? `url(#${gradientId})` : "currentColor"} />
      </svg>
    </div>
  );
}


function RenderBox({ tokens, className, children }: { tokens?: any; className?: string; children: React.ReactNode }) {
  const cls = cn(tokensToClassName(tokens), className);
  const inlineStyle = tokensToInlineStyle(tokens);
  const hasDecor = tokens?.decor?.before?.shape && tokens.decor.before.shape !== "none" || tokens?.decor?.after?.shape && tokens.decor.after.shape !== "none";
  return (
    <div className={cn(hasDecor ? "relative" : undefined, cls)} style={inlineStyle}>
      {hasDecor ? renderDecorLayer(tokens?.decor?.before, "before") : null}
      {children}
      {hasDecor ? renderDecorLayer(tokens?.decor?.after, "after") : null}
    </div>
  );
}

export function ComponentsRenderer({ components, productLookup }: { components?: CmsComponent[]; productLookup?: Record<string, any> }) {
  if (!components?.length) return null;

  const renderOne = (c: CmsComponent, stack = new Set<CmsComponent>(), depth = 0): React.ReactNode => {
    if (depth > 100) return null; // safety guard against runaway nesting
    if (stack.has(c)) return null; // guard against accidental cycles in CMS data
    const nextStack = new Set(stack);
    nextStack.add(c);
    const nextDepth = depth + 1;

    // Layout components support nesting: props.children = CmsComponent[]
    const children = Array.isArray((c.props as any)?.children) ? ((c.props as any).children as CmsComponent[]) : [];

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
          <RenderBox key={c.id} tokens={c.twTokens} className="mx-auto w-full">
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth)) : null}
          </RenderBox>
        );
      }

      case "stack": {
        return (
          <RenderBox key={c.id} tokens={c.twTokens} className="flex flex-col">
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth)) : null}
          </RenderBox>
        );
      }

      case "row": {
        return (
          <RenderBox key={c.id} tokens={c.twTokens} className="flex flex-row flex-wrap">
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth)) : null}
          </RenderBox>
        );
      }

      case "grid": {
        const cols = Math.min(6, Math.max(2, Number(c.props?.cols ?? 2)));
        const cls = cn("grid", gridColsMap[cols] ?? gridColsMap[2]);
        return (
          <RenderBox key={c.id} tokens={c.twTokens} className={cls}>
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth)) : null}
          </RenderBox>
        );
      }

      case "columns": {
        const cols = Math.min(4, Math.max(2, Number(c.props?.cols ?? 2)));
        const cls = cn("grid", columnsColsMap[cols] ?? columnsColsMap[2]);
        return (
          <RenderBox key={c.id} tokens={c.twTokens} className={cls}>
            {children.length ? children.map((ch) => renderOne(ch, nextStack, nextDepth)) : null}
          </RenderBox>
        );
      }

      default:
        break;
    }

    // Non-layout leaf components
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

            return (
              <RenderBox key={c.id} tokens={c.twTokens} className="w-full">
                <nav className="relative">
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
              </RenderBox>
            );
          }

case "text": {
            const As = (c.props?.as ?? "p") as any;
            return (
              <RenderBox key={c.id} tokens={c.twTokens}>
                <As >
                {c.props?.text ?? ""}
                </As>
              </RenderBox>
            );
          }

          case "badge": {
            return (
              <RenderBox key={c.id} tokens={c.twTokens}><span className={"inline-flex items-center rounded-full border border-black/10 dark:border-white/15"}>
                {c.props?.text ?? "Badge"}
              </span></RenderBox>
            );
          }

          case "button": {
            const href = c.props?.href ?? "#";
            const label = c.props?.label ?? "Button";
            const variant = c.props?.variant ?? "primary";
            return (
              <RenderBox key={c.id} tokens={c.twTokens}><a href={href} className={baseButtonClasses(variant)}>
                {label}
              </a></RenderBox>
            );
          }

          case "card": {
            const title = c.props?.title ?? "Card title";
            const text = c.props?.text ?? "";
            const buttonLabel = c.props?.buttonLabel;
            const buttonHref = c.props?.buttonHref ?? "#";
            const buttonVariant = c.props?.buttonVariant ?? "secondary";
            return (
              <RenderBox key={c.id} tokens={c.twTokens}><div className="rounded-2xl border border-black/10 bg-white dark:bg-white/5 dark:border-white/15">
                <div className="space-y-2">
                  <div className="text-lg font-semibold">{title}</div>
                  {text ? <div className="text-sm opacity-80">{text}</div> : null}
                  {buttonLabel ? (
                    <a href={buttonHref} className={cn(baseButtonClasses(buttonVariant), "mt-2 inline-flex")}>
                      {buttonLabel}
                    </a>
                  ) : null}
                </div>
              </div></RenderBox>
            );
          }

          case "list": {
            const ordered = !!c.props?.ordered;
            const items: string[] = Array.isArray(c.props?.items) ? c.props.items : [];
            return ordered ? (
              <RenderBox key={c.id} tokens={c.twTokens}><ol className="list-decimal ps-6">
                {items.map((it, i) => <li key={i}>{it}</li>)}
              </ol></RenderBox>
            ) : (
              <RenderBox key={c.id} tokens={c.twTokens}><ul className="list-disc ps-6">
                {items.map((it, i) => <li key={i}>{it}</li>)}
              </ul></RenderBox>
            );
          }

          case "image": {
            const src = c.props?.src;
            if (!src) return null;
            return (<RenderBox key={c.id} tokens={c.twTokens}><img src={src} alt={c.props?.alt ?? ""} className="max-w-full rounded-xl" /></RenderBox>);
          }

          case "icon": {
            const d = c.props?.d;
            if (!d) return null;
            const viewBox = c.props?.viewBox ?? "0 0 24 24";
            return (
              <RenderBox key={c.id} tokens={c.twTokens}><svg viewBox={viewBox} className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={d} />
              </svg></RenderBox>
            );
          }

          case "divider":
            return (<RenderBox key={c.id} tokens={c.twTokens}><hr className="border-black/10 dark:border-white/15" /></RenderBox>);

          case "spacer":
            return (<RenderBox key={c.id} tokens={c.twTokens}><div className={spacerClass(c.props?.h)} /></RenderBox>);

          
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
            return (
              <RenderBox key={c.id} tokens={c.twTokens} className="w-full">
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
              </RenderBox>
            );
          }

          case "productSlider": {
            const ids: string[] = Array.isArray(c.props?.productIds) ? c.props.productIds : [];
            const title = c.props?.title ?? "";
            return (
              <RenderBox key={c.id} tokens={c.twTokens} className="w-full">
                {title ? <div className="mb-3 text-sm font-semibold">{title}</div> : null}
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {ids.map((id) => (
                    <div key={id} className="min-w-[220px] max-w-[260px] flex-shrink-0">
                      <ProductCard productId={id} />
                    </div>
                  ))}
                </div>
              </RenderBox>
            );
          }

          case "categoryTiles": {
            const items: any[] = Array.isArray(c.props?.items) ? c.props.items : [];
            const cols = c.props?.cols ?? 3;
            const title = c.props?.title ?? "";
            return (
              <RenderBox key={c.id} tokens={c.twTokens} className="w-full">
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
              </RenderBox>
            );
          }

          case "filtersBar": {
            const colors = Array.isArray(c.props?.colors) ? c.props.colors : [];
            const sizes = Array.isArray(c.props?.sizes) ? c.props.sizes : [];
            const categories = Array.isArray(c.props?.categories) ? c.props.categories : [];
            // Reuse the Shop page filters UI (it updates URL search params).
            // If facets aren't provided, show a small hint.
            if (!colors.length && !sizes.length && !categories.length) {
              return (
                <RenderBox key={c.id} tokens={c.twTokens} className="w-full">
                  <div className="rounded-2xl border border-black/10 dark:border-white/15 p-3 text-sm opacity-80">
                    FiltersBar (needs facets)
                  </div>
                </RenderBox>
              );
            }
            return (
              <RenderBox key={c.id} tokens={c.twTokens} className="w-full">
                <ProductFiltersBar colors={colors} sizes={sizes} categories={categories} />
              </RenderBox>
            );
          }

          default:
            return null;
        }
  };

  return <div className="space-y-4">{components.map((c) => renderOne(c))}</div>;
}
