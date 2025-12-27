// src/components/Topbar.tsx
import React from "react";

export function Topbar({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div dir="rtl" className="mb-6 flex items-center justify-between">
      <div className="text-xl font-semibold">{title}</div>
      <div className="flex items-center gap-3">
        {right}
        <div className="text-xs opacity-70">{new Date().toLocaleString("ar")}</div>
      </div>
    </div>
  );
}
