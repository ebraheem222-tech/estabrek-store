// src/components/ui/Select.tsx
import React, { forwardRef } from "react";
import { cn } from "./cn";

type Option = { value: string; label: string };

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  /**
   * Prefer passing `options`.
   * `children` is also supported for backward-compat with older pages.
   */
  options?: Option[];
  placeholder?: string;
  /** Convenience helper when you only need the selected value. */
  onValueChange?: (value: string) => void;
};

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ className, label, error, options, placeholder, children, onValueChange, onChange, ...rest }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-white/80">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "w-full min-w-0 h-10 rounded-xl border bg-white/[0.03] px-4 text-sm text-white appearance-none cursor-pointer",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-red-500/50"
                : "border-white/[0.08] hover:border-white/[0.12]",
              className
            )}
            onChange={(e) => {
              const value = e.target.value;

              if (onValueChange) {
                onValueChange(value);
                return;
              }

              try {
                (onChange as any)?.(value);
                return;
              } catch {
                // ignore and try event handler
              }

              try {
                onChange?.(e);
              } catch {
                // ignore
              }
            }}
            {...rest}
          >
            {placeholder && (
              <option value="" className="bg-surface-900 text-white/50">
                {placeholder}
              </option>
            )}
            {children ? (
              children
            ) : (
              (options ?? []).map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface-900 text-white">
                  {opt.label}
                </option>
              ))
            )}
          </select>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
