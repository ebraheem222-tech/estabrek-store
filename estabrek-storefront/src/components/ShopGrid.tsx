"use client";

import React from "react";
import { densityGridClass, useGridDensity, type GridDensity } from "@/hooks/useGridDensity";

function DensityButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-9 rounded-xl border px-3 text-sm transition",
        active
          ? "border-[var(--accent)] bg-[var(--surface-2)] text-[var(--text)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function ShopGrid({
  children,
  className,
  columns,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: { desktop: number; mobile: number };
}) {
  const { density, setDensity } = useGridDensity("normal");

  const set = (d: GridDensity) => () => setDensity(d);

  return (
    <div className={["space-y-4", className ?? ""].join(" ")}>
      {!columns ? <div className="flex items-center justify-end gap-2">
        <div className="text-xs text-[var(--muted)] me-2">الكثافة</div>
        <DensityButton active={density === "compact"} onClick={set("compact")}>
          مضغوط
        </DensityButton>
        <DensityButton active={density === "normal"} onClick={set("normal")}>
          عادي
        </DensityButton>
        <DensityButton active={density === "comfy"} onClick={set("comfy")}>
          واسع
        </DensityButton>
      </div> : null}

      <div className={columns ? "grid cms-product-grid" : ["grid", densityGridClass(density)].join(" ")} data-commerce-grid={columns ? "" : undefined} data-columns={columns?.desktop} style={columns ? { "--cms-grid-columns": columns.desktop, "--cms-grid-mobile": columns.mobile } as React.CSSProperties : undefined}>
        {children}
      </div>
    </div>
  );
}
