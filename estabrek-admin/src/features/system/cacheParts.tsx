// Small form and number pieces shared by the speed & cache page's tabs.

export function Stat({ label, value, note, testId }: { label: string; value: string; note?: string; testId?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums" data-testid={testId}>
        {value}
      </div>
      {note ? <div className="text-[11px] text-white/50">{note}</div> : null}
    </div>
  );
}

export function Bar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full ${v > 0.9 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function NumberInput({
  id,
  label,
  unit,
  help,
  hint,
  value,
  def,
  limits,
  invalid,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  help?: string;
  hint?: (v: number) => string;
  value: number;
  def: number;
  limits: { min: number; max: number };
  invalid: boolean;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {help ? <p className="mt-0.5 text-xs text-white/50">{help}</p> : null}
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          dir="ltr"
          min={limits.min}
          max={limits.max}
          value={Number.isFinite(value) ? value : ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Math.round(Number(e.target.value)))}
          className={`h-9 w-24 rounded-xl border bg-white/[0.03] px-3 text-sm ${invalid ? "border-red-500/60" : "border-white/[0.08]"} disabled:opacity-60`}
        />
        {unit ? <span className="text-xs text-white/60">{unit}</span> : null}
        {hint && Number.isFinite(value) ? <span className="text-xs text-white/50">({hint(value)})</span> : null}
      </div>
      <p className={`mt-1 text-[11px] ${invalid ? "text-red-300" : "text-white/40"}`}>
        من {limits.min} لـ {limits.max} · الافتراضي {def}
      </p>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  disabled,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  disabled: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1 rounded-xl bg-white/5 p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${value === o.value ? "bg-white/10 font-medium" : "text-white/60 hover:bg-white/5"} disabled:opacity-60`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {help ? <span className="block text-xs text-white/50">{help}</span> : null}
      </span>
    </label>
  );
}
