import React, { useMemo, useState } from "react";
import { Input } from "../../components/ui/Input";
import { cn } from "../../components/ui/cn";
import type { DividerStyle } from "../../cms/style/containerStyles";
import { ALL_DIVIDER_STYLES, DIVIDER_CATEGORY_LABELS_AR } from "../../cms/style/containerStyles";

type DividerStylePickerProps = {
  value?: string;
  onChange: (next: string | undefined) => void;
  styles?: DividerStyle[];
  categoryLabels?: Record<string, string>;
  className?: string;
};

function DividerPreview({ divider }: { divider: DividerStyle }) {
  return (
    <div className="h-14 overflow-hidden rounded-lg border border-white/10 bg-black/20 px-2 py-1">
      <div className="flex h-full items-center justify-center overflow-hidden">
        {divider.svg ? (
          <div
            className={cn("w-full text-gray-200", divider.className)}
            dangerouslySetInnerHTML={{ __html: divider.svg }}
          />
        ) : (
          <div className={cn("text-gray-200", divider.className)} />
        )}
      </div>
    </div>
  );
}

export function DividerStylePicker({
  value,
  onChange,
  styles = ALL_DIVIDER_STYLES,
  categoryLabels = DIVIDER_CATEGORY_LABELS_AR,
  className,
}: DividerStylePickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const unique = Array.from(new Set(styles.map((s) => s.category)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [styles]);

  const selected = useMemo(() => styles.find((s) => s.id === value), [styles, value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return styles.filter((style) => {
      if (category !== "all" && style.category !== category) return false;
      if (!q) return true;
      return (
        style.id.toLowerCase().includes(q) ||
        style.name.toLowerCase().includes(q) ||
        style.nameAr.toLowerCase().includes(q)
      );
    });
  }, [styles, category, search]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          value={search}
          onChange={setSearch}
          placeholder="ابحث عن Divider..."
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!value}
        >
          بدون
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs",
            category === "all"
              ? "border-white/30 bg-white/20 text-white"
              : "border-white/10 text-white/70 hover:bg-white/10"
          )}
        >
          الكل
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              category === cat
                ? "border-white/30 bg-white/20 text-white"
                : "border-white/10 text-white/70 hover:bg-white/10"
            )}
          >
            {categoryLabels[cat] ?? cat}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="rounded-xl border border-accent-500/40 bg-accent-500/10 p-3">
          <div className="mb-2 text-xs text-accent-100">المختار: {selected.nameAr} ({selected.name})</div>
          <DividerPreview divider={selected} />
        </div>
      ) : null}

      <div className="grid max-h-80 gap-2 overflow-auto rounded-xl border border-white/10 bg-white/[0.02] p-2 sm:grid-cols-2">
        {filtered.map((divider) => {
          const isSelected = divider.id === value;
          return (
            <button
              key={divider.id}
              type="button"
              onClick={() => onChange(divider.id)}
              className={cn(
                "rounded-xl border p-2 text-left transition",
                isSelected
                  ? "border-accent-500/50 bg-accent-500/15"
                  : "border-white/10 bg-black/10 hover:border-white/25 hover:bg-white/[0.05]"
              )}
            >
              <DividerPreview divider={divider} />
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-white">{divider.nameAr}</span>
                <span className="text-white/60">{categoryLabels[divider.category] ?? divider.category}</span>
              </div>
              <div className="text-[11px] text-white/45">{divider.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

