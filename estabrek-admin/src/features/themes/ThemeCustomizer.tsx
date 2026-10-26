// The store's own changes to its current theme, the way a Shopify theme's settings work:
// its colours (for the mode it shows in), its two fonts, its corners, buttons and shadows.
// Every change is tried on the preview first (onDraft → the frame's address); «حفظ» keeps it
// for every customer (header.storeTheme.custom). The shop checks it again (storeThemes/custom.ts).
import { useEffect, useMemo, useState } from "react";
import { ColorPicker } from "../../components/ui/ColorPicker";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { tr } from "../../lib/words";
import { saveThemeCustom, type StoreThemeInfo } from "../../studio/storeThemes";
import { EDITABLE_COLOURS, FONT_CHOICES, readabilityIssues, tidyCustom, type Palette, type ThemeCustom } from "./customize";

const BUTTONS: Array<{ id: NonNullable<ThemeCustom["button"]>; label: () => string }> = [
  { id: "square", label: () => tr("مربّعة", "Square") },
  { id: "soft", label: () => tr("ناعمة", "Soft") },
  { id: "round", label: () => tr("دائرية", "Round") },
];
const SHADOWS: Array<{ id: NonNullable<ThemeCustom["shadow"]>; label: () => string }> = [
  { id: "flat", label: () => tr("بدون", "None") },
  { id: "soft", label: () => tr("ناعم", "Soft") },
  { id: "deep", label: () => tr("صلب", "Hard") },
  { id: "glow", label: () => tr("توهّج", "Glow") },
];

export function ThemeCustomizer({
  theme,
  mode,
  saved,
  onDraft,
  onSaved,
}: {
  theme: StoreThemeInfo;
  mode: "light" | "dark";
  saved: ThemeCustom | null;
  /** The change being tried (null = the theme as saved). */
  onDraft: (c: ThemeCustom | null) => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<ThemeCustom>(saved ?? {});
  const [saving, setSaving] = useState(false);
  // A new theme or newly saved settings start from what is saved.
  const savedKey = JSON.stringify(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(saved ?? {}), [theme.id, savedKey]);

  const base = (theme.palettes?.[mode] ?? null) as Palette | null;
  const colours: Palette | null = base ? { ...base, ...(draft.palette?.[mode] ?? {}) } : null;
  const tidy = useMemo(() => tidyCustom(draft, theme), [draft, theme]);
  const issues = colours ? readabilityIssues(colours) : [];
  const changed = JSON.stringify(tidy) !== JSON.stringify(saved && tidyCustom(saved, theme));

  // The preview follows the draft after a short pause (each change reloads the frame).
  useEffect(() => {
    const t = window.setTimeout(() => onDraft(tidy), 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tidy)]);

  const setColour = (key: keyof Palette, hex: string) =>
    setDraft((d) => ({ ...d, palette: { ...d.palette, [mode]: { ...(d.palette?.[mode] ?? {}), [key]: hex.toLowerCase() } } }));

  const save = async () => {
    setSaving(true);
    try {
      await saveThemeCustom(theme.id, tidy);
      toast.success(tr("انحفظ التخصيص لكل المتجر", "The changes are on for the whole store"));
      onSaved();
    } catch (e) {
      toast.error(tr("ما انحفظ التخصيص", "The changes weren't saved"), { description: getApiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const chip = (on: boolean) => `rounded-lg px-2.5 py-1 text-xs ${on ? "bg-white/[0.16] text-white" : "bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"}`;

  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.08] p-3" data-testid="theme-customizer" aria-label={tr("تخصيص الثيم", "Customise the theme")}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="me-auto text-sm font-semibold">{tr("تخصيص الثيم", "Customise the theme")}</h3>
        <button type="button" className={chip(false)} disabled={!tidy && !saved} onClick={() => setDraft({})} data-testid="theme-custom-reset">
          {tr("رجوع لأصل الثيم", "Back to the theme as made")}
        </button>
        <button type="button" disabled={!changed || saving} onClick={() => void save()} className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-30" data-testid="theme-custom-save">
          {saving ? tr("عم يحفظ…", "Saving…") : tr("حفظ للمتجر", "Save for the store")}
        </button>
      </div>
      <p className="text-[11px] leading-5 text-white/45">
        {tr("بتجرّب التغيير على المعاينة أول، والزبائن بيشوفوه بعد الحفظ. الألوان للوضع المعروض:", "Changes show on the preview first; customers see them after saving. Colours are for the mode shown:")}{" "}
        {mode === "light" ? tr("فاتح", "Light") : tr("غامق", "Dark")}
      </p>

      {colours ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {EDITABLE_COLOURS.map((c) => (
            <ColorPicker key={c.key} label={c.label()} value={colours[c.key]} onChange={(hex) => setColour(c.key, hex)} />
          ))}
        </div>
      ) : null}
      {issues.length ? (
        <ul className="space-y-1 rounded-xl bg-amber-500/10 p-3 text-[11px] text-amber-200" role="status" data-testid="theme-custom-issues">
          {issues.map((x) => (
            <li key={x}>• {x}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {(["display", "text"] as const).map((k) => (
          <label key={k} className="block text-xs">
            <span className="mb-1 block text-white/60">{k === "display" ? tr("خط العناوين", "Heading font") : tr("خط النصوص", "Text font")}</span>
            <select
              className="w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-2"
              value={draft.fonts?.[k] ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, fonts: { ...d.fonts, [k]: e.target.value || undefined } }))}
              data-testid={`theme-custom-font-${k}`}
            >
              <option value="">{tr("خط الثيم", "The theme's font")}</option>
              {FONT_CHOICES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label()}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <label className="block text-xs">
        <span className="mb-1 flex justify-between text-white/60">
          <span>{tr("الزوايا", "Corners")}</span>
          <span>{tr("مربّعة ← دائرية", "Square → round")}</span>
        </span>
        <input type="range" min={0} max={2} step={0.1} className="w-full" value={draft.round ?? theme.round ?? 1} onChange={(e) => setDraft((d) => ({ ...d, round: Number(e.target.value) }))} data-testid="theme-custom-round" />
      </label>

      <div className="flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label={tr("شكل الأزرار", "Button shape")}>
        <span className="me-1 text-white/60">{tr("الأزرار:", "Buttons:")}</span>
        {BUTTONS.map((b) => (
          <button key={b.id} type="button" aria-pressed={draft.button === b.id} className={chip(draft.button === b.id)} onClick={() => setDraft((d) => ({ ...d, button: d.button === b.id ? undefined : b.id }))}>
            {b.label()}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label={tr("الظلال", "Shadows")}>
        <span className="me-1 text-white/60">{tr("الظلال:", "Shadows:")}</span>
        {SHADOWS.map((s) => (
          <button key={s.id} type="button" aria-pressed={(draft.shadow ?? theme.shadow) === s.id} className={chip((draft.shadow ?? theme.shadow) === s.id)} onClick={() => setDraft((d) => ({ ...d, shadow: s.id }))}>
            {s.label()}
          </button>
        ))}
      </div>
    </section>
  );
}
