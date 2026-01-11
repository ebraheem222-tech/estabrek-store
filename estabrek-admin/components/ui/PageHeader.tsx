// src/components/ui/PageHeader.tsx
import React from "react";
import { cn } from "./cn";

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <div className="text-xl font-semibold tracking-tight">{title}</div>
        {subtitle ? <div className="mt-1 text-sm opacity-70">{subtitle}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
