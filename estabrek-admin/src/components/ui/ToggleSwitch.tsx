// The on/off switch used on the settings pages (same look as the features page).
export function ToggleSwitch({ checked, label, disabled, busy, onChange }: { checked: boolean; label: string; disabled?: boolean; busy?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40",
        checked ? "border-[var(--btn-solid-border)] bg-[var(--btn-solid-bg)]" : "border-white/20 bg-white/10",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={["inline-block h-5 w-5 rounded-full transition-transform", checked ? "-translate-x-6" : "-translate-x-1"].join(" ")}
        style={{ background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}
      />
    </button>
  );
}
