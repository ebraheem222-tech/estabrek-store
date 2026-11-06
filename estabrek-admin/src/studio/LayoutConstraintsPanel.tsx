import { useState } from "react";
import { tr } from "../lib/words";
import type { SizeConstraints } from "./layoutConstraints";

const control = "mt-1 w-full rounded-lg border border-white/10 bg-surface-925 px-2 py-1.5 text-xs text-white";

function ConstraintField({ field, label, value, busy, onSave }: { field: keyof SizeConstraints; label: string; value?: number; busy: boolean; onSave: (value?: number) => void }) {
  const initial = value === undefined ? "" : String(value);
  const [text, setText] = useState(initial);
  const [was, setWas] = useState(initial);
  if (was !== initial) { setWas(initial); setText(initial); }
  const ratio = field === "aspectRatio", min = ratio ? .01 : 8, max = ratio ? 100 : 9999;
  const valid = text.trim() === "" || (Number.isFinite(Number(text)) && Number(text) >= min && Number(text) <= max);
  const save = () => {
    if (busy || !valid) return;
    const next = text.trim() === "" ? undefined : Number(text);
    if (next !== value) onSave(next);
  };
  return <label className="block text-[11px] text-white/55">
    {label}
    <input type="number" dir="ltr" min={min} max={max} step={ratio ? .01 : "any"} value={text} disabled={busy} className={control}
      placeholder={tr("تلقائي", "Automatic")} aria-invalid={!valid || undefined} data-testid={`constraint-${field}`}
      onChange={event => setText(event.target.value)} onBlur={save} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); save(); } }} />
    {!valid && <span className="mt-1 block text-red-300">{tr(`القيمة بين ${min} و${max}`, "Enter a value from {0} to {1}", [min, max])}</span>}
  </label>;
}

/** Optional dimensions for the current screen; clearing a value restores inheritance. */
export function LayoutConstraintsPanel({ value, onChange, busy = false }: { value: SizeConstraints; onChange: (value: SizeConstraints) => void; busy?: boolean }) {
  const [reset, setReset] = useState(0);
  const fields: Array<[keyof SizeConstraints, string]> = [
    ["minWidth", tr("أقل عرض (بكسل)", "Minimum width (px)")], ["maxWidth", tr("أقصى عرض (بكسل)", "Maximum width (px)")],
    ["minHeight", tr("أقل ارتفاع (بكسل)", "Minimum height (px)")], ["maxHeight", tr("أقصى ارتفاع (بكسل)", "Maximum height (px)")],
    ["aspectRatio", tr("نسبة العرض إلى الارتفاع", "Width to height ratio")],
  ];
  return <div className="space-y-3 rounded-xl border border-white/10 p-3" data-testid="studio-constraints">
    <div className="text-xs font-medium text-white/70">{tr("حدود الحجم", "Size limits")}</div>
    <div className="grid grid-cols-2 gap-2">
      {fields.map(([field, label]) => <ConstraintField key={`${reset}:${field}`} field={field} label={label} value={value[field]} busy={busy} onSave={nextValue => {
        const next = { ...value };
        if (nextValue === undefined) delete next[field]; else next[field] = nextValue;
        onChange(next);
      }} />)}
    </div>
    <p className="text-[10px] leading-4 text-white/40">{tr("الفارغ يتبع إعداد الشاشة الأكبر. النسبة 2 تعني عرضاً بضعف الارتفاع.", "Empty values follow the larger screen. A ratio of 2 means twice as wide as tall.")}</p>
    <button type="button" disabled={busy} className="rounded-lg bg-white/[0.06] px-2 py-1 text-xs disabled:opacity-40" data-testid="constraints-reset" onClick={() => { setReset(current => current + 1); onChange({}); }}>{tr("إعادة تعيين حدود الحجم", "Reset size limits")}</button>
  </div>;
}
