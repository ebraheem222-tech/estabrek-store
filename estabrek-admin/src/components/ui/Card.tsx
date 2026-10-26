// src/components/ui/Card.tsx
import React from "react";
import { cn } from "./cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingSizes = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({ children, className, hover = false, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl",
        paddingSizes[padding],
        hover && "glass-hover cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = {
  title: string;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function CardHeader({ title, description, subtitle, action, className }: CardHeaderProps) {
  const detail = description ?? subtitle;
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {detail && (
          <p className="mt-0.5 text-sm text-white/50">{detail}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

type CardContentProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("mt-4", className)}>{children}</div>;
}

type CardFooterProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn("mt-4 pt-4 border-t border-white/[0.06]", className)}>
      {children}
    </div>
  );
}
