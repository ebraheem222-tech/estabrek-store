// src/components/ui/Pagination.tsx
import React from "react";
import { cn } from "./cn";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
};

export function Pagination({ page, totalPages, onChange, className }: Props) {
  const pages = getVisiblePages(page, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {/* Previous */}
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-colors",
          page <= 1
            ? "text-white/20 cursor-not-allowed"
            : "text-white/60 hover:bg-white/[0.06] hover:text-white"
        )}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Pages */}
      {pages.map((p, i) => {
        if (p === "...") {
          return (
            <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-white/30 text-sm">
              ...
            </span>
          );
        }
        const pageNum = p as number;
        const isActive = pageNum === page;
        return (
          <button
            key={pageNum}
            onClick={() => onChange(pageNum)}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "bg-white/10 text-white border border-white/[0.08]"
                : "text-white/60 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {pageNum}
          </button>
        );
      })}

      {/* Next */}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg text-sm transition-colors",
          page >= totalPages
            ? "text-white/20 cursor-not-allowed"
            : "text-white/60 hover:bg-white/[0.06] hover:text-white"
        )}
      >
        <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}

function getVisiblePages(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  
  if (current <= 3) {
    pages.push(1, 2, 3, 4, "...", total);
  } else if (current >= total - 2) {
    pages.push(1, "...", total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, "...", current - 1, current, current + 1, "...", total);
  }

  return pages;
}
