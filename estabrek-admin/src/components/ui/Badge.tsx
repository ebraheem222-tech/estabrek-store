// src/components/ui/Badge.tsx
import React from "react";
import { cn } from "./cn";

type Variant = "default" | "success" | "warning" | "danger" | "info" | "accent";

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
};

const variants: Record<Variant, string> = {
  default: "bg-white/[0.06] text-white/70 border-white/[0.08]",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  accent: "bg-accent-500/10 text-accent-400 border-accent-500/20",
};

const dotColors: Record<Variant, string> = {
  default: "bg-white/50",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  info: "bg-blue-400",
  accent: "bg-accent-400",
};

const sizes = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
};

export function Badge({ children, variant = "default", size = "md", dot, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-md border",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
