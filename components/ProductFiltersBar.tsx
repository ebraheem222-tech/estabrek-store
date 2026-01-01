"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FacetColor = { name: string; hex?: string | null; count: number };
type FacetSize = { id: string; name: string; count: number };

function parseCsv(v: string | null | undefined): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toCsv(arr: string[]): string {
  return arr.join(",");
}

function uniqCaseInsensitive(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of arr) {
    const k = a.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition",
        "hover:bg-zinc-50 dark:hover:bg-zinc-900",
        active
          ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-900"
          : "border-zinc-200 dark:border-zinc-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Swatch({ hex }: { hex?: string | null }) {
  if (!hex) {
    return <span className="h-4 w-4 rounded-full border border-zinc-300 dark:border-zinc-700" />;
  }
  const safe = hex.startsWith("#") ? hex : `#${hex}`;
  return (
    <span
      className="h-4 w-4 rounded-full border border-zinc-200 dark:border-zinc-800"
      style={{ background: safe }}
    />
  );
}

export function ProductFiltersBar({
  colors,
  sizes,
  categories,
  className,
}: {
  colors: FacetColor[];
  sizes: FacetSize[];
  categories: { id: string; name: string; parentId?: string | null }[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();

  // simple params
  const sortParam = useMemo(() => sp?.get("sort") ?? "latest", [sp]);
  const minPriceParam = useMemo(() => sp?.get("minPrice") ?? "", [sp]);
  const maxPriceParam = useMemo(() => sp?.get("maxPrice") ?? "", [sp]);
  const qParam = useMemo(() => sp?.get("q") ?? "", [sp]);
  const inStockParam = useMemo(() => sp?.get("inStock") === "1", [sp]);
  const categoryIdParam = useMemo(() => sp?.get("categoryId") ?? "", [sp]);

  const selectedColors = useMemo(() => {
    const v = sp?.get("colors") ?? sp?.get("color");
    return uniqCaseInsensitive(parseCsv(v));
  }, [sp]);

  const selectedSizes = useMemo(() => {
    const v = sp?.get("sizeIds") ?? sp?.get("sizeId");
    const arr = parseCsv(v);
    return Array.from(new Set(arr));
  }, [sp]);

  const hasAny =
    selectedColors.length > 0 ||
    selectedSizes.length > 0 ||
    !!minPriceParam ||
    !!maxPriceParam ||
    !!qParam ||
    inStockParam ||
    !!categoryIdParam;

  function push(next: URLSearchParams) {
    if (!pathname) return;
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleColor(name: string) {
    const next = new URLSearchParams(sp?.toString() ?? "");
    next.delete("color"); // legacy
    const cur = uniqCaseInsensitive(parseCsv(next.get("colors")));
    const exists = cur.some((c) => c.toLowerCase() === name.toLowerCase());
    const updated = exists
      ? cur.filter((c) => c.toLowerCase() !== name.toLowerCase())
      : [...cur, name];

    if (updated.length) next.set("colors", toCsv(updated));
    else next.delete("colors");

    // changing filters should reset pagination only
    next.set("page", "1");
    push(next);
  }

  function toggleSize(id: string) {
    const next = new URLSearchParams(sp?.toString() ?? "");
    next.delete("sizeId"); // legacy
    const cur = Array.from(new Set(parseCsv(next.get("sizeIds"))));
    const exists = cur.includes(id);
    const updated = exists ? cur.filter((s) => s !== id) : [...cur, id];

    if (updated.length) next.set("sizeIds", toCsv(updated));
    else next.delete("sizeIds");

    next.set("page", "1");
    push(next);
  }

  function setSimple(key: string, value?: string) {
    const next = new URLSearchParams(sp?.toString() ?? "");
    if (!value) next.delete(key);
    else next.set(key, value);
    next.set("page", "1");
    if (!pathname) return;
    router.push(`${pathname}?${next.toString()}`);
  }

  function clearAll() {
    const next = new URLSearchParams(sp?.toString() ?? "");
    next.delete("colors");
    next.delete("sizeIds");
    next.delete("color");
    next.delete("sizeId");
    next.delete("page");
    next.delete("sort");
    next.delete("minPrice");
    next.delete("maxPrice");
    next.delete("q");
    next.delete("inStock");
    next.delete("categoryId");
    push(next);
  }

  return (
    <div className={["space-y-3", className ?? ""].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">Filters</div>
        {hasAny ? (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            Clear
          </button>
        ) : null}
      </div>


      <div className="grid gap-3 sm:grid-cols-3">
  <div className="space-y-1 sm:col-span-1">
    <div className="text-xs text-zinc-600 dark:text-zinc-300">بحث</div>
    <input
      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
      value={qParam}
      onChange={(e) => setSimple("q", e.target.value)}
      placeholder="ابحث عن منتج..."
    />
  </div>

  <div className="space-y-1 sm:col-span-1">
    <div className="text-xs text-zinc-600 dark:text-zinc-300">التصنيف</div>
    <select
      className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
      value={categoryIdParam}
      onChange={(e) => setSimple("categoryId", e.target.value || undefined)}
    >
      <option value="">الكل</option>
      {categories
        .filter((c) => !c.parentId)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </select>
  </div>

  <div className="space-y-1 sm:col-span-1">
    <div className="text-xs text-zinc-600 dark:text-zinc-300">المتوفر فقط</div>
    <button
      type="button"
      onClick={() => setSimple("inStock", inStockParam ? undefined : "1")}
      className={[
        "h-10 w-full rounded-xl border px-3 text-sm text-start",
        inStockParam
          ? "border-zinc-900 bg-zinc-100 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800 dark:text-white"
          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700",
      ].join(" ")}
    >
      {inStockParam ? "مفعل" : "غير مفعل"}
    </button>
  </div>
</div>

<div className="grid gap-3 sm:grid-cols-3">

        <div className="space-y-1">
          <div className="text-xs text-zinc-600 dark:text-zinc-300">Sort</div>
          <select
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            value={sortParam}
            onChange={(e) => setSimple("sort", e.target.value)}
          >
            <option value="latest">Latest</option>
            <option value="title_asc">Title A→Z</option>
            <option value="title_desc">Title Z→A</option>
            <option value="price_asc">Price Low→High</option>
            <option value="price_desc">Price High→Low</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-zinc-600 dark:text-zinc-300">Min price</div>
          <input
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            value={minPriceParam}
            onChange={(e) => setSimple("minPrice", e.target.value)}
            inputMode="numeric"
            dir="ltr"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-zinc-600 dark:text-zinc-300">Max price</div>
          <input
            className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            value={maxPriceParam}
            onChange={(e) => setSimple("maxPrice", e.target.value)}
            inputMode="numeric"
            dir="ltr"
          />
        </div>
      </div>


      {colors.length ? (
        <div>
          <div className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Color
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {colors.map((c) => {
              const active = selectedColors.some(
                (x) => x.toLowerCase() === c.name.toLowerCase()
              );
              return (
                <Chip
                  key={c.name}
                  active={active}
                  onClick={() => toggleColor(c.name)}
                  title={`${c.name} (${c.count})`}
                >
                  <Swatch hex={c.hex} />
                  <span className="whitespace-nowrap">{c.name}</span>
                  <span className="text-xs text-zinc-500">({c.count})</span>
                </Chip>
              );
            })}
          </div>
        </div>
      ) : null}

      {sizes.length ? (
        <div>
          <div className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Size
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sizes.map((s) => {
              const active = selectedSizes.includes(s.id);
              return (
                <Chip
                  key={s.id}
                  active={active}
                  onClick={() => toggleSize(s.id)}
                  title={`${s.name} (${s.count})`}
                >
                  <span className="whitespace-nowrap">{s.name}</span>
                  <span className="text-xs text-zinc-500">({s.count})</span>
                </Chip>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
