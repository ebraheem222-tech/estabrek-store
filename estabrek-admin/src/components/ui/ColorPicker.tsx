import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "./cn";

type Props = {
  label?: string;
  value?: string | null;
  onChange: (hex: string) => void;
  disabled?: boolean;
  placeholder?: string;
  swatches?: string[];
};

const DEFAULT_SWATCHES = [
  "#000000",
  "#FFFFFF",
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#22C55E",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#6366F1",
  "#A855F7",
  "#D946EF",
  "#EC4899",
];

function normalizeHex(input: string): string {
  let v = input.trim();
  if (!v) return "";
  if (!v.startsWith("#")) v = `#${v}`;
  // allow #RGB or #RRGGBB
  const ok = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
  return ok ? v.toUpperCase() : input;
}

export function ColorPicker({
  label,
  value,
  onChange,
  disabled,
  placeholder = "#RRGGBB",
  swatches,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const val = (value ?? "").trim();
  const normalized = useMemo(() => normalizeHex(val), [val]);
  const palette = swatches?.length ? swatches : DEFAULT_SWATCHES;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const preview = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)
    ? normalized
    : "#000000";

  return (
    <div className="space-y-2" ref={wrapRef}>
      {label ? <div className="text-sm opacity-80">{label}</div> : null}

      <div className="relative">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(
              "h-10 w-10 rounded-xl border border-white/10 shadow-sm",
              disabled ? "opacity-60 cursor-not-allowed" : "hover:border-white/20"
            )}
            style={{ backgroundColor: preview }}
            onClick={() => !disabled && setOpen((s) => !s)}
            aria-label="اختر لون"
          />

          <input
            type="text"
            className={cn(
              "h-10 w-full rounded-xl bg-white/5 border border-white/10 px-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-white/10",
              disabled ? "opacity-60 cursor-not-allowed" : "hover:border-white/20"
            )}
            value={normalized}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            dir="ltr"
          />

          {/* system color wheel */}
          <input
            type="color"
            className={cn(
              "h-10 w-12 rounded-xl bg-transparent border border-white/10 p-1",
              disabled ? "opacity-60 cursor-not-allowed" : "hover:border-white/20"
            )}
            value={preview}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            disabled={disabled}
            title="Color wheel"
          />
        </div>
        {open && !disabled ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              className="relative w-[92vw] max-w-[420px] rounded-2xl border border-white/10 bg-black/90 backdrop-blur p-3 shadow-xl"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 text-xs opacity-70">???? ?? ???? ????? ?????</div>
              <div className="grid grid-cols-7 gap-2">
                {palette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-8 w-8 rounded-xl border border-white/10",
                      "hover:scale-[1.03] transition",
                      normalized.toUpperCase() === c.toUpperCase() ? "ring-2 ring-white/40" : ""
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      onChange(c.toUpperCase());
                      setOpen(false);
                    }}
                    aria-label={c}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
