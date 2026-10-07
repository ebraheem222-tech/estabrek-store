"use client";
import { useEffect, useState } from "react";
import { apiBaseClient } from "@/lib/apiClient";
import type { CatalogFilters } from "@/lib/filtersUrl";
import { useLanguage } from "./cinematic/Language";

export type AttributeFacet = { key: string; label: string; kind: string; options: Array<{ value: string; count: number }> };

const cache = new Map<string, AttributeFacet[]>();

/**
 * Filters from the product types' fields (admin → أنواع المنتجات → «فلتر بالمتجر»),
 * e.g. القماش or المناسبة, with how many pieces have each value.
 */
export function AttributeFilters({ filters, onChange, appearance = "default" }: { filters: CatalogFilters; onChange: (next: CatalogFilters) => void; appearance?: "rose" | "default" }) {
  const ar = useLanguage().language === "ar";
  const scope = filters.categoryId ?? "";
  const [facets, setFacets] = useState<AttributeFacet[]>(() => cache.get(scope) ?? []);

  useEffect(() => {
    let alive = true;
    const hit = cache.get(scope);
    if (hit) {
      setFacets(hit);
      return;
    }
    const qs = scope ? `?categoryId=${encodeURIComponent(scope)}` : "";
    fetch(`${apiBaseClient()}/catalog/attribute-facets${qs}`)
      .then((r) => (r.ok ? r.json() : { fields: [] }))
      .then((d) => {
        const list = Array.isArray(d?.fields) ? (d.fields as AttributeFacet[]) : [];
        cache.set(scope, list);
        if (alive) setFacets(list);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [scope]);

  if (!facets.length) return null;
  const selected = filters.attrs ?? {};
  const toggle = (key: string, value: string) => {
    const cur = selected[key] ?? [];
    const nextVals = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value].sort((a, b) => a.localeCompare(b));
    const attrs = { ...selected, [key]: nextVals };
    if (!nextVals.length) delete attrs[key];
    onChange({ ...filters, attrs: Object.keys(attrs).length ? attrs : undefined, page: undefined });
  };
  const show = (f: AttributeFacet, v: string) => (f.kind === "boolean" ? (v === "true" ? (ar ? "نعم" : "Yes") : ar ? "لا" : "No") : v);

  return (
    <div className={appearance === "rose" ? "rose-attr-filters" : "attr-filters"} data-testid="attribute-filters">
      {facets.map((f) => (
        <div key={f.key} className="rose-attr-group" role="group" aria-label={f.label}>
          <span className="rose-attr-label">{f.label}</span>
          <div className="rose-attr-options">
            {f.options.map((o) => {
              const on = (selected[f.key] ?? []).includes(o.value);
              return (
                <button key={o.value} type="button" aria-pressed={on} className={on ? "active" : undefined} onClick={() => toggle(f.key, o.value)}>
                  {show(f, o.value)}
                  <span className="rose-attr-count">{o.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
