"use client";
import { useEffect, useState } from "react";

export type GridDensity = "compact" | "normal" | "comfy";
const KEY = "shop_grid_density";

export function useGridDensity(defaultValue: GridDensity = "normal") {
  const [density, setDensity] = useState<GridDensity>(defaultValue);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY) as GridDensity | null;
      if (v === "compact" || v === "normal" || v === "comfy") setDensity(v);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, density);
    } catch {}
  }, [density]);

  return { density, setDensity };
}

export function densityGridClass(density: GridDensity) {
  if (density === "compact") return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3";
  if (density === "comfy") return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";
}
