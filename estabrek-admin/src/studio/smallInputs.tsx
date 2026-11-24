/**
 * The small inputs of the editor's side panels that build something step by step (an element's recipes:
 * TriggersPanel.tsx; a form's fields: FormPanel.tsx): a pick from a list, a line saved when it is left, and the
 * looks of a part's title, a button, a note and a warning.
 */
export const btn = "rounded-lg bg-white/6 px-2 py-1 text-[11px] hover:bg-white/10 disabled:opacity-40";
export const sel = "mt-1 w-full rounded-lg border border-white/10 bg-surface-925 px-2 py-1 text-xs text-white";
export const part = "text-[10px] font-semibold uppercase tracking-wide text-accent-200/80";
export const note = "text-[10px] leading-4 text-white/70";
export const warn = "text-[11px] leading-4 text-amber-200/90";

export function Pick({ label, value, options, busy, onPick, testId }: { label: string; value: string; options: Array<[string, string]>; busy: boolean; onPick: (v: string) => void; testId?: string }) {
  return (
    <label className="block text-[11px] text-white/55">{label}
      <select className={sel} value={value} disabled={busy} onChange={(e) => onPick(e.target.value)} data-testid={testId}>
        {!options.some(([k]) => k === value) ? <option value={value}>{value}</option> : null}
        {options.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
      </select>
    </label>
  );
}

/** A line of text saved when it's left (only when it changed and is allowed). */
export function Line({ label, value, busy, onSave, ok, ltr, max = 200, hint, testId }: { label: string; value: string; busy: boolean; onSave: (v: string) => void; ok?: (v: string) => boolean; ltr?: boolean; max?: number; hint?: string; testId?: string }) {
  return (
    <label className="block text-[11px] text-white/55">{label}
      <input key={value} dir={ltr ? "ltr" : undefined} className={sel} defaultValue={value} maxLength={max} placeholder={hint} disabled={busy} data-testid={testId}
        onBlur={(e) => { const v = e.target.value.trim(); if (v !== value && (!ok || ok(v))) onSave(v); else if (v !== value) e.target.value = value; }} />
    </label>
  );
}

/** Words with their {{name}} marks kept left to right (inside Arabic or Hebrew they would read scrambled). */
export const marks = (text: string) => text.split(/(\{\{[^{}]*\}\})/).map((p, k) => (k % 2 ? <bdi key={k} dir="ltr">{p}</bdi> : p));
