// لغات المتجر: which languages the shop offers (Arabic, English, Hebrew) and its main
// one (plain addresses open in it; /en/… and /he/… are the others). header.languages.
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { getSettings, updateSettings } from "../../api/settings.api";
import { getApiErrorMessage } from "../../api/http";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import { cn } from "../../components/ui/cn";
import { LANG_LABEL, type Lang } from "../../lib/storeIdentity";
import { ALL_LANGS as ALL, LANG_DEFAULTS as DEFAULTS, languagesOf, type Languages } from "../../lib/storeLanguages";

const ADDRESS: Record<Lang, string> = { ar: "/ar", en: "/en", he: "/he" };

export function StoreLanguagesCard() {
  const qc = useQueryClient();
  const settings = useSettings();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const saved = useMemo(() => (settings.data ? languagesOf(settings.data.header) : null), [settings.data]);
  const [draft, setDraft] = useState<Languages>(DEFAULTS);
  const key = JSON.stringify(saved);
  useEffect(() => {
    if (saved) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const save = useMutation({
    mutationFn: async (next: Languages) => {
      const current = await getSettings();
      return updateSettings({ header: { ...(current.header ?? {}), languages: next } });
    },
    onSuccess: async () => {
      toast.success("انحفظت لغات المتجر");
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error("ما انحفظت", { description: getApiErrorMessage(e) }),
  });

  if (!saved) return null;
  const toggle = (l: Lang) =>
    setDraft((d) => {
      if (d.enabled.includes(l)) {
        if (d.enabled.length === 1) return d; // one language at least
        const enabled = d.enabled.filter((x) => x !== l);
        return { enabled, default: d.default === l ? enabled[0] : d.default };
      }
      return { ...d, enabled: ALL.filter((x) => x === l || d.enabled.includes(x)) };
    });
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  return (
    <div data-testid="store-languages">
      <Card>
        <CardHeader title="لغات المتجر" subtitle="بأي لغات بيبين المتجر، وأي وحدة الأساسية. الزبونة بتختار من زر اللغة فوق بالمتجر." />
        <CardContent>
          <ul className="space-y-2">
            {ALL.map((l) => {
              const on = draft.enabled.includes(l);
              const main = draft.default === l;
              return (
                <li key={l} className={cn("flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5", on ? "border-white/[0.14] bg-white/[0.04]" : "border-white/[0.06]")}>
                  <label className="flex min-h-10 flex-1 items-center gap-2 text-sm">
                    <input type="checkbox" checked={on} disabled={!canWrite || (on && draft.enabled.length === 1)} onChange={() => toggle(l)} aria-label={`تشغيل ${LANG_LABEL[l]}`} />
                    <b lang={l}>{LANG_LABEL[l]}</b>
                    <span className="text-[11px] text-white/40" dir="ltr">{main ? "/…" : `${ADDRESS[l]}/…`}</span>
                  </label>
                  {on ? (
                    <label className="flex min-h-10 items-center gap-2 text-xs text-white/70">
                      <input type="radio" name="main-language" checked={main} disabled={!canWrite} onChange={() => setDraft((d) => ({ ...d, default: l }))} aria-label={`${LANG_LABEL[l]} اللغة الأساسية`} />
                      الأساسية
                    </label>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs leading-5 text-white/50">
            اللغة الأساسية إلها عناوين المتجر العادية، والباقي بيبلشوا بـ <span dir="ltr">/en</span> أو <span dir="ltr">/he</span> عشان محركات البحث تلاقي كل لغة. أسماء المنتجات والأقسام بتنترجم من صفحة كل منتج وقسم.
          </p>
          {canWrite ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" disabled={!dirty} isLoading={save.isPending} onClick={() => save.mutate(draft)}>حفظ اللغات</Button>
              {dirty ? <Button variant="ghost" onClick={() => setDraft(saved)}>تراجع</Button> : null}
            </div>
          ) : (
            <p className="mt-2 text-xs text-white/50">التغيير بدّه صلاحية «تعديل الإعدادات».</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
