// ميزاتي → a whole site → إعدادات الموقع (sites wave 1; backend lib/siteSettings.ts): what the site's file
// declares its owner can change without opening a page or a function: its hours, a notice bar, showing
// prices, online booking open or closed, the bell… Its pages on the shop read the public ones (an element
// shown while a switch is on, words taken from a setting), its functions read them all ("{{settings.x}}").
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { getApiErrorMessage } from "../../api/http";
import { adminLang } from "../../lib/lang";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import * as FeaturesAPI from "../../api/myFeatures.api";
import type { Feature, SiteSettingDecl } from "../../api/myFeatures.api";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "min-w-0 rounded-lg border border-white/10 bg-surface-925 px-2 text-sm text-white disabled:opacity-60";
const LANGS = ["ar", "en", "he"] as const;
type Lang = (typeof LANGS)[number];
type Words = Partial<Record<Lang, string>>;
type Values = Record<string, unknown>;
const LANG_NAME: Record<Lang, string> = { ar: "عربي", en: "English", he: "עברית" };

/** Words in the admin's language, else another. */
const inLang = (w: Words | undefined, lang: Lang) => (w ? w[lang] || w.ar || w.en || w.he || "" : "");
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
/** The settings in their form's sections, in the file's order. */
function groupsOf(decls: SiteSettingDecl[], lang: Lang) {
  const out: Array<{ name: string; decls: SiteSettingDecl[] }> = [];
  for (const d of decls) {
    const name = inLang(d.group, lang);
    const at = out.find((g) => g.name === name);
    if (at) at.decls.push(d);
    else out.push({ name, decls: [d] });
  }
  return out;
}
/** A refusal's problems by setting. */
function problemsOf(e: unknown): Record<string, string> {
  const list = (e as { response?: { data?: { details?: { problems?: Array<{ key: string; message: string }> } } } })?.response?.data?.details?.problems ?? [];
  return Object.fromEntries(list.map((p) => [p.key, p.message]));
}

export function SiteSettings({ feature: f }: { feature: Feature }) {
  const qc = useQueryClient();
  if (!f.settings?.declared.length) return null;
  // Saved (or changed elsewhere), the form starts again from the values kept.
  return (
    <SettingsEditor
      key={`${f.id}:${f.updatedAt}:${JSON.stringify(f.settings.values)}`}
      featureId={f.id}
      view={f.settings}
      onSaved={(saved) => {
        qc.setQueryData(["my-features", f.id], saved);
        void qc.invalidateQueries({ queryKey: ["site-panel"] });
      }}
    />
  );
}

/**
 * The form of a whole site's settings (all of them, or those a panel part names): only what changed is sent.
 * Give it a `key` that changes with the values kept, so it starts again from them once saved.
 */
export function SettingsEditor({ featureId, view, onSaved, title }: { featureId: string; view: { declared: SiteSettingDecl[]; values: Values }; onSaved: (saved: Feature) => void; title?: string | null }) {
  const lang = adminLang();
  const { hasPermission } = useAuth();
  const may = hasPermission("features:write");
  const [draft, setDraft] = useState<Values>(view.values);
  const [wrong, setWrong] = useState<Record<string, string>>({});
  const changed = useMemo(() => Object.fromEntries(Object.entries(draft).filter(([k, v]) => !same(v, view.values[k]))), [draft, view]);
  const save = useMutation({
    mutationFn: () => FeaturesAPI.saveFeatureSettings(featureId, changed),
    onSuccess: (saved) => {
      onSaved(saved);
      setWrong({});
      toast.success(say("انحفظت الإعدادات: الموقع بيقرأها من هلّق|The settings are saved: the site reads them from now|ההגדרות נשמרו: האתר קורא אותן מעכשיו"));
    },
    onError: (e) => {
      setWrong(problemsOf(e));
      toast.error(say("ما انحفظت|They weren't saved|לא נשמרו"), { description: getApiErrorMessage(e) });
    },
  });
  const set = (key: string, v: unknown) => setDraft((d) => ({ ...d, [key]: v }));
  const dirty = Object.keys(changed).length > 0;
  const order = [lang, ...LANGS.filter((l) => l !== lang)];

  const control = (d: SiteSettingDecl) => {
    const v = draft[d.key];
    const id = `site-setting-${d.key}`;
    const label = inLang(d.label, lang);
    switch (d.kind) {
      case "toggle":
        return <ToggleSwitch checked={v === true} label={label} disabled={!may} onChange={(on) => set(d.key, on)} />;
      case "number":
        return (
          <span className="flex items-center gap-2">
            <input
              type="number"
              className={`${field} h-9 w-32`}
              value={typeof v === "number" ? v : ""}
              min={d.min}
              max={d.max}
              step={d.whole ? 1 : "any"}
              disabled={!may}
              aria-label={label}
              onChange={(e) => set(d.key, e.target.value === "" ? null : Number(e.target.value))}
              data-testid={`${id}-input`}
            />
            {d.unit ? <span className="text-xs text-white/60">{inLang(d.unit, lang)}</span> : null}
          </span>
        );
      case "choice":
        return (
          <select className={`${field} h-9`} value={String(v ?? "")} disabled={!may} aria-label={label} onChange={(e) => set(d.key, e.target.value)} data-testid={`${id}-input`}>
            {(d.options ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {inLang(o.name, lang)}
              </option>
            ))}
          </select>
        );
      case "color":
        return (
          <span className="flex items-center gap-2">
            <input type="color" className="h-9 w-12 rounded border border-white/10 bg-transparent" value={typeof v === "string" ? v : "#000000"} disabled={!may} aria-label={label} onChange={(e) => set(d.key, e.target.value)} data-testid={`${id}-input`} />
            <span className="font-mono text-xs text-white/60" dir="ltr">{String(v ?? "")}</span>
          </span>
        );
      case "text":
        return d.long ? (
          <textarea className={`${field} w-full py-2`} rows={2} value={String(v ?? "")} disabled={!may} maxLength={500} aria-label={label} onChange={(e) => set(d.key, e.target.value)} data-testid={`${id}-input`} />
        ) : (
          <input className={`${field} h-9 w-full sm:w-80`} value={String(v ?? "")} disabled={!may} maxLength={500} aria-label={label} onChange={(e) => set(d.key, e.target.value)} data-testid={`${id}-input`} />
        );
      case "words": {
        const words = (v && typeof v === "object" ? v : {}) as Words;
        return (
          <span className="grid w-full gap-2">
            {order.map((l) => {
              const props = {
                className: `${field} w-full ${d.long ? "py-2" : "h-9"}`,
                value: words[l] ?? "",
                disabled: !may,
                maxLength: 500,
                dir: l === "en" ? "ltr" : "rtl",
                "aria-label": `${label} (${LANG_NAME[l]})`,
                onChange: (e: { target: { value: string } }) => set(d.key, { ...words, [l]: e.target.value }),
                "data-testid": `${id}-${l}`,
              } as const;
              return (
                <label key={l} className="flex items-start gap-2">
                  <span className="mt-2 w-14 shrink-0 text-xs text-white/50">{LANG_NAME[l]}</span>
                  {d.long ? <textarea rows={2} {...props} /> : <input {...props} />}
                </label>
              );
            })}
          </span>
        );
      }
    }
  };

  return (
    <section className={box} data-testid="site-settings">
      <h2 className="font-medium">{title ?? say("إعدادات الموقع|The site's settings|הגדרות האתר")}</h2>
      <p className="mt-1 text-sm text-white/70">
        {say("بتغيّرها من هون بدون ما تفتح صفحة أو منطق. صفحات الموقع على المتجر بتقرأ العامة منها بس، والمنطق تبعه بيقرأها كلها بالاسم المكتوب تحت كل وحدة.|Change them here without opening a page or a function. The site's pages on the shop read only the public ones; its functions read them all, by the name written under each.|משנים אותן כאן בלי לפתוח עמוד או פונקציה. עמודי האתר בחנות קוראים רק את הציבוריות; הפונקציות שלו קוראות את כולן, לפי השם שכתוב מתחת לכל אחת.")}
      </p>
      <div className="mt-4 space-y-5">
        {groupsOf(view.declared, lang).map((g) => (
          <div key={g.name} data-testid="site-settings-group">
            {g.name ? <h3 className="mb-2 text-sm font-semibold text-white/80">{g.name}</h3> : null}
            <ul className="space-y-3">
              {g.decls.map((d) => (
                <li key={d.key} className="rounded-xl border border-white/5 bg-white/[0.03] p-3" data-testid={`site-setting-${d.key}`} data-kind={d.kind} data-changed={d.key in changed}>
                  <div className={d.kind === "toggle" ? "flex items-center justify-between gap-3" : "space-y-2"}>
                    <div>
                      <div className="text-sm font-medium">
                        {inLang(d.label, lang)}
                        <span className={`ms-2 rounded px-1.5 py-0.5 text-[11px] ${d.public ? "bg-sky-400/10 text-sky-200" : "bg-white/10 text-white/60"}`} data-testid={`site-setting-${d.key}-who`}>
                          {d.public ? say("بيبيّن عالمتجر|On the shop|מוצג בחנות") : say("خاص: للمنطق بس|Private: functions only|פרטי: לפונקציות בלבד")}
                        </span>
                      </div>
                      {d.note ? <p className="mt-0.5 text-xs text-white/55">{inLang(d.note, lang)}</p> : null}
                      <p className="mt-0.5 font-mono text-[11px] text-white/35" dir="ltr">{`{{settings.${d.key}}}`}</p>
                    </div>
                    {control(d)}
                  </div>
                  {wrong[d.key] ? (
                    <p className="mt-2 text-xs text-red-300" data-testid={`site-setting-${d.key}-error`}>
                      {wrong[d.key]}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {may ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={!dirty} isLoading={save.isPending} onClick={() => save.mutate()} data-testid="site-settings-save">
            {say("احفظ الإعدادات|Save the settings|לשמור את ההגדרות")}
          </Button>
          {dirty ? (
            <button type="button" className="h-8 px-2 text-xs text-white/60 underline" onClick={() => { setDraft(view.values); setWrong({}); }} data-testid="site-settings-undo">
              {say("رجّع اللي كان|Undo the changes|לבטל את השינויים")}
            </button>
          ) : null}
          {dirty ? <span className="text-xs text-amber-200" data-testid="site-settings-dirty">{say("في تغييرات ما انحفظت|Changes not saved yet|יש שינויים שלא נשמרו")}</span> : null}
        </div>
      ) : null}
    </section>
  );
}
