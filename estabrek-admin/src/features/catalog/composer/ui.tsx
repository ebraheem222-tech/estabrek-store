// Small building blocks shared by the add-product page sections.
import React from "react";
import { cn } from "../../../components/ui/cn";


export function Section({ id, step, title, hint, error, children, aside }: { id: string; step: number; title: string; hint?: React.ReactNode; error?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section id={id} className={cn("glass rounded-2xl p-4 sm:p-5 scroll-mt-24", error && "ring-1 ring-red-500/40")} aria-labelledby={`${id}-title`}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-500/15 text-xs font-bold text-accent-300">{step}</span>
          <div>
            <h2 id={`${id}-title`} className="text-base font-semibold text-white">{title}</h2>
            {hint ? <p className="mt-0.5 text-xs leading-5 text-white/50">{hint}</p> : null}
          </div>
        </div>
        {aside}
      </header>
      {children}
      {error ? <p role="alert" className="mt-3 text-xs font-medium text-red-400">{error}</p> : null}
    </section>
  );
}

export function Chip({ active, onClick, children, title, disabled, className }: { active?: boolean; onClick?: () => void; children: React.ReactNode; title?: string; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-all duration-150 disabled:opacity-40",
        active
          ? "border-accent-500/60 bg-accent-500/20 text-white shadow-[0_0_0_3px_rgb(var(--sk-accent-500,139_92_246)/0.12)]"
          : "border-white/[0.1] bg-white/[0.03] text-white/75 hover:border-white/[0.2] hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-white/80">
      <span className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-accent-500" : "bg-white/15")}>
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "right-[1.375rem]" : "right-0.5")} />
      </span>
      {label}
    </label>
  );
}

export function Swatch({ hex, size = 20, className }: { hex: string | null; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full border border-white/25 shadow-inner", className)}
      style={{ width: size, height: size, background: hex || "conic-gradient(#f87171,#facc15,#4ade80,#60a5fa,#c084fc,#f87171)" }}
    />
  );
}
