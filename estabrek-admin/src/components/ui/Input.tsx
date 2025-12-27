// src/components/ui/Input.tsx
import React, { forwardRef } from "react";
import { cn } from "./cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Convenience helper when you only need the string value. */
  onValueChange?: (value: string) => void;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, label, error, hint, leftIcon, rightIcon, onValueChange, onChange, ...rest }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-white/80">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full min-w-0 h-10 rounded-xl border bg-white/[0.03] px-4 text-sm text-white placeholder:text-white/30",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50"
                : "border-white/[0.08] hover:border-white/[0.12]",
              !!leftIcon && "pr-10",
              !!rightIcon && "pl-10",
              className
            )}
            onChange={(e) => {
              const value = e.target.value;

              // Prefer explicit value handler
              if (onValueChange) {
                onValueChange(value);
                return;
              }

              // Try to support legacy handlers that expect the raw value
              try {
                (onChange as any)?.(value);
                return;
              } catch {
                // fall through to event handler
              }

              // Fallback: standard event handler
              try {
                onChange?.(e);
              } catch {
                // ignore
              }
            }}
            {...rest}
          />
          {rightIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-white/40">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
