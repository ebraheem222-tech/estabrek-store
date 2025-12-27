"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function parseCsv(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function chipClass(variant: "default" | "danger" = "default") {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition duration-200 will-change-transform";
  if (variant === "danger") {
    return base + " border-black/15 bg-white hover:bg-black/5 text-[#0B0B0B]";
  }
  return (
    base +
    " border-black/15 bg-white/90 text-[#0B0B0B] hover:-translate-y-0.5 hover:shadow-sm hover:ring-1 hover:ring-[color:var(--accent-2)] hover:border-[color:var(--accent-2)]"
  );
}

export function FiltersChips({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const chips = useMemo(() => {
    const out: { key: string; label: string; remove: () => void; variant?: "default" | "danger" }[] = [];
    const base = () => new URLSearchParams(sp.toString());
    const nav = (n: URLSearchParams) => {
      n.set("page", "1");
      const qs = n.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    };

    const q = sp.get("q");
    if (q)
      out.push({
        key: "q",
        label: `بحث: ${q}`,
        remove: () => {
          const n = base();
          n.delete("q");
          nav(n);
        },
      });

    const categoryId = sp.get("categoryId");
    if (categoryId) {
      const name = categories.find((c) => c.id === categoryId)?.name ?? "تصنيف";
      out.push({
        key: "categoryId",
        label: `تصنيف: ${name}`,
        remove: () => {
          const n = base();
          n.delete("categoryId");
          nav(n);
        },
      });
    }

    if (sp.get("inStock") === "1") {
      out.push({
        key: "inStock",
        label: "متوفر فقط",
        remove: () => {
          const n = base();
          n.delete("inStock");
          nav(n);
        },
      });
    }

    const minPrice = sp.get("minPrice");
    const maxPrice = sp.get("maxPrice");
    if (minPrice || maxPrice) {
      out.push({
        key: "price",
        label: `السعر: ${minPrice ?? "0"} - ${maxPrice ?? "∞"}`,
        remove: () => {
          const n = base();
          n.delete("minPrice");
          n.delete("maxPrice");
          nav(n);
        },
      });
    }

    parseCsv(sp.get("colors")).forEach((c) => {
      out.push({
        key: `color:${c}`,
        label: `لون: ${c}`,
        remove: () => {
          const n = base();
          const arr = parseCsv(n.get("colors")).filter((x) => x.toLowerCase() !== c.toLowerCase());
          if (arr.length) n.set("colors", arr.join(","));
          else n.delete("colors");
          nav(n);
        },
      });
    });

    parseCsv(sp.get("sizeIds")).forEach((id) => {
      out.push({
        key: `size:${id}`,
        label: `مقاس: ${id}`,
        remove: () => {
          const n = base();
          const arr = parseCsv(n.get("sizeIds")).filter((x) => x !== id);
          if (arr.length) n.set("sizeIds", arr.join(","));
          else n.delete("sizeIds");
          nav(n);
        },
      });
    });

    const hasAny =
      !!q ||
      !!categoryId ||
      sp.get("inStock") === "1" ||
      !!minPrice ||
      !!maxPrice ||
      parseCsv(sp.get("colors")).length > 0 ||
      parseCsv(sp.get("sizeIds")).length > 0;

    if (hasAny) {
      out.unshift({
        key: "clear",
        label: "مسح الكل",
        variant: "danger",
        remove: () => {
          const n = base();
          const keepSort = n.get("sort");
          const keepLm = n.get("lm");
          n.forEach((_, k) => n.delete(k));
          if (keepSort) n.set("sort", keepSort);
          if (keepLm) n.set("lm", keepLm);
          nav(n);
        },
      });
    }

    return out;
  }, [sp, router, pathname, categories]);

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-2" data-motion="stagger">
      {chips.map((c) => (
        <button key={c.key} type="button" onClick={c.remove} className={chipClass(c.variant ?? "default")}> 
          <span>{c.label}</span>
          {c.key !== "clear" ? <span className="opacity-60">×</span> : null}
        </button>
      ))}
    </div>
  );
}
