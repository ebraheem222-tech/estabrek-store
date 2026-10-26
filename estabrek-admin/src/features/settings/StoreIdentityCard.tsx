// هوية المتجر: the store's own name (and short name for the logo), its line, what it
// sells, who it talks to and its currency. The shop, the emails, WhatsApp messages and
// the AI all use these, so a store on the platform never shows the platform's name.
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { getSettings, updateSettings } from "../../api/settings.api";
import { getApiErrorMessage } from "../../api/http";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import { cn } from "../../components/ui/cn";
import { CURRENCIES, money } from "../../lib/money";
import { buildMessage } from "../../lib/orders";
import {
  AUDIENCES,
  AUDIENCE_LABEL,
  INDUSTRIES,
  INDUSTRY_LABEL,
  LANG_LABEL,
  cleanIdentity,
  identityOf,
  identityProblem,
  pick,
  type Lang,
  type StoreIdentity,
  type Texts,
} from "../../lib/storeIdentity";

const field = "h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25";
const LANGS: Lang[] = ["ar", "en", "he"];
const dirOf = (l: Lang) => (l === "en" ? "ltr" : "rtl");

export function StoreIdentityCard() {
  const qc = useQueryClient();
  const settings = useSettings();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const saved = useMemo(() => (settings.data ? identityOf(settings.data.header) : null), [settings.data]);
  const savedCurrency = settings.data?.currencyCode || "ILS";
  const [id, setId] = useState<StoreIdentity | null>(null);
  const [currency, setCurrency] = useState("ILS");
  const [lang, setLang] = useState<Lang>("ar");
  const savedKey = JSON.stringify([saved, savedCurrency]);
  useEffect(() => {
    if (saved) { setId(saved); setCurrency(savedCurrency); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const save = useMutation({
    mutationFn: async (next: { identity: StoreIdentity; currency: string }) => {
      // Read the latest header first so nothing else in it is lost.
      const current = await getSettings();
      return updateSettings({ currencyCode: next.currency, header: { ...(current.header ?? {}), identity: cleanIdentity(next.identity) } });
    },
    onSuccess: async () => {
      toast.success("انحفظت هوية المتجر — بتبيّن بالمتجر خلال ثواني");
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error("ما انحفظت", { description: getApiErrorMessage(e) }),
  });

  if (!id || !saved) return null;
  const set = (patch: Partial<StoreIdentity>) => setId((x) => (x ? { ...x, ...patch } : x));
  const setText = (key: "name" | "shortName" | "tagline" | "about", value: string) => set({ [key]: { ...id[key], [lang]: value } as Texts });
  const dirty = JSON.stringify(cleanIdentity(id)) !== JSON.stringify(cleanIdentity(saved)) || currency !== savedCurrency;
  const problem = identityProblem(id);
  const siteName = settings.data?.siteName?.trim() || "";
  const mark = pick(id.shortName, "ar") || pick(id.name, "ar") || siteName || "اسم المتجر";
  const sample = buildMessage("confirm", { id: "cmsample0001", customerName: "سارة", phone: "", status: "NEW", createdAt: "", total: 240, items: [{ productTitle: "قطعة", quantity: 1 }] }, { storeName: pick(id.name, "ar") || siteName || "المتجر", audience: id.audience, deliveryFee: null })
    .split("\n").slice(0, 2).join(" ");

  return (
    <div data-testid="store-identity">
      <Card>
        <CardHeader title="هوية المتجر" subtitle="اسم المتجر وشعاره بالكلام، شو بيبيع، ولمين بيحكي. المتجر والإيميلات ورسايل الواتساب والذكاء الاصطناعي كلهم بياخدوا منها." />
        <CardContent>
          <div className="mb-3 inline-flex rounded-xl border border-white/[0.1] bg-white/[0.03] p-1" role="tablist" aria-label="اللغة">
            {LANGS.map((l) => (
              <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={cn("h-9 rounded-lg px-3 text-sm", lang === l ? "bg-accent-500/25 text-white" : "text-white/60 hover:text-white")}>
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">اسم المتجر ({LANG_LABEL[lang]})</span>
              <input className={field} dir={dirOf(lang)} maxLength={60} value={id.name[lang]} placeholder={lang === "ar" ? siteName || "متجر نور" : ""} disabled={!canWrite} onChange={(e) => setText("name", e.target.value)} aria-label={`اسم المتجر ${LANG_LABEL[lang]}`} />
              <span className="mt-1 block text-[11px] text-white/40">بالعناوين والإيميلات والرسايل. فاضي = «اسم الموقع».</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">الاسم القصير بالشعار (اختياري)</span>
              <input className={field} dir={dirOf(lang)} maxLength={30} value={id.shortName[lang]} disabled={!canWrite} onChange={(e) => setText("shortName", e.target.value)} aria-label={`الاسم القصير ${LANG_LABEL[lang]}`} />
              <span className="mt-1 block text-[11px] text-white/40">مثلاً «نور» بدل «متجر نور» فوق بالمتجر وتحت بالفوتر.</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">السطر تحت الاسم (اختياري)</span>
              <input className={field} dir={dirOf(lang)} maxLength={80} value={id.tagline[lang]} disabled={!canWrite} onChange={(e) => setText("tagline", e.target.value)} aria-label={`السطر تحت الاسم ${LANG_LABEL[lang]}`} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-white/55">الاسم القانوني (للفواتير، اختياري)</span>
              <input className={field} maxLength={160} value={id.legalName} disabled={!canWrite} onChange={(e) => set({ legalName: e.target.value })} aria-label="الاسم القانوني" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs text-white/55">عن المتجر بجملة أو جملتين ({LANG_LABEL[lang]})</span>
              <textarea className={cn(field, "h-20 resize-y py-2.5 leading-6")} dir={dirOf(lang)} maxLength={400} value={id.about[lang]} disabled={!canWrite} onChange={(e) => setText("about", e.target.value)} aria-label={`عن المتجر ${LANG_LABEL[lang]}`} />
              <span className="mt-1 block text-[11px] text-white/40">بيستعملها الذكاء الاصطناعي لما يكتب للمتجر، وبتطلع بالفوتر ولمحركات البحث إذا ما في وصف تاني.</span>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Select label="شو بيبيع المتجر" value={id.industry} disabled={!canWrite} onValueChange={(v) => set({ industry: v as StoreIdentity["industry"] })}>
              {INDUSTRIES.map((k) => <option key={k} value={k}>{INDUSTRY_LABEL[k]}</option>)}
            </Select>
            <Select label="العملة" value={currency} disabled={!canWrite} onValueChange={setCurrency}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </Select>
          </div>

          <fieldset className="mt-4" disabled={!canWrite}>
            <legend className="mb-2 text-xs text-white/55">لمين بيحكي المتجر؟</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="لمين بيحكي المتجر">
              {AUDIENCES.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={id.audience === a} onClick={() => set({ audience: a })} className={cn("min-h-11 rounded-xl border px-4 py-2 text-start text-sm", id.audience === a ? "border-accent-500/60 bg-accent-500/20 text-white" : "border-white/[0.1] text-white/75 hover:border-white/20")}>
                  <b className="block">{AUDIENCE_LABEL[a].title}</b>
                  <span className="text-[11px] text-white/50">{AUDIENCE_LABEL[a].hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-sm" data-testid="identity-preview">
            <div className="text-[11px] text-white/45">هيك بيبين:</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
              <b className="text-lg">{mark}</b>
              {pick(id.tagline, "ar") ? <span className="text-xs tracking-wide text-white/55">{pick(id.tagline, "ar")}</span> : null}
              <span className="text-xs text-white/45">· سعر مثلاً {money(189, currency)}</span>
            </div>
            <p className="mt-2 text-xs text-white/60" dir="rtl">واتساب: «{sample}…»</p>
          </div>

          {problem ? <p className="mt-3 text-xs text-amber-200">{problem}</p> : null}
          {canWrite ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" disabled={!dirty || Boolean(problem)} isLoading={save.isPending} onClick={() => save.mutate({ identity: id, currency })}>حفظ الهوية</Button>
              {dirty ? <Button variant="ghost" onClick={() => { setId(saved); setCurrency(savedCurrency); }}>تراجع</Button> : null}
              {dirty ? <span className="self-center text-[11px] text-amber-200">الهوية بتنحفظ بهالزر لحالها، مش بزر «حفظ» تحت.</span> : null}
            </div>
          ) : (
            <p className="mt-2 text-xs text-white/50">التغيير بدّه صلاحية «تعديل الإعدادات».</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
