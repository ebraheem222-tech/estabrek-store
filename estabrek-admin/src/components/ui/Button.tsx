// src/components/ui/Button.tsx
import React from "react";
import { cn } from "./cn";
import { resolveButtonTheme } from "../../cms/button-themes";
import { buttonThemeToCssVars } from "../../theme/buttonTheme";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "accent";
type Size = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  themeId?: string;
};

const base = [
  "relative inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-smooth",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950",
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  "active:scale-[0.98]",
].join(" ");

const variants: Record<Variant, string> = {
  primary: [
    "bg-[var(--btn-solid-bg)] text-[var(--btn-solid-text)] hover:bg-[var(--btn-solid-hover)]",
    "border border-[var(--btn-solid-border)]",
    "shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2)]",
    "hover:shadow-[0_1px_2px_rgba(0,0,0,0.15),0_8px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]",
  ].join(" "),
  accent: [
    "bg-gradient-to-b from-[var(--btn-accent-from)] to-[var(--btn-accent-to)] text-[var(--btn-accent-text)]",
    "shadow-[0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgb(var(--sk-accent-500,139_92_246)/0.25),inset_0_1px_0_rgba(255,255,255,0.15)]",
    "hover:shadow-[0_1px_2px_rgba(0,0,0,0.25),0_8px_20px_rgb(var(--sk-accent-500,139_92_246)/0.35),inset_0_1px_0_rgba(255,255,255,0.2)]",
    "hover:from-[var(--btn-accent-from-hover)] hover:to-[var(--btn-accent-to-hover)]",
  ].join(" "),
  secondary: [
    "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-text)] border border-[var(--btn-secondary-border)]",
    "hover:bg-[var(--btn-secondary-bg-hover)]",
    "shadow-inner-light",
  ].join(" "),
  ghost: [
    "bg-transparent text-[var(--btn-ghost-text)] hover:bg-[var(--btn-ghost-bg-hover)] hover:text-[var(--btn-ghost-text-hover)]",
  ].join(" "),
  danger: [
    "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30",
  ].join(" "),
  success: [
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30",
  ].join(" "),
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs rounded-lg",
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-xl",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  isLoading,
  disabled,
  children,
  leftIcon,
  rightIcon,
  themeId,
  style,
  ...rest
}: Props) {
  const themedVars = themeId ? buttonThemeToCssVars(resolveButtonTheme(themeId).tokens) : null;
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      style={themedVars ? ({ ...(themedVars as React.CSSProperties), ...style } as React.CSSProperties) : style}
      {...rest}
    >
      {isLoading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
      ) : null}
      <span className={cn("flex items-center gap-2", isLoading && "invisible")}>
        {leftIcon}
        {children}
        {rightIcon}
      </span>
    </button>
  );
}
