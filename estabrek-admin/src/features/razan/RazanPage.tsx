// رزان: everything the storefront guide does, in one place — what she does,
// how often she talks, her words, her seasons and outfits, a "try it on the
// shop before saving" link, and how shoppers use her.
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { getApiErrorMessage } from "../../api/http";
import { env } from "../../config/env";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as RazanAPI from "../../api/razan.api";
import type { RazanOutfit, RazanSeason, RazanSettings, RazanText } from "../../api/razan.api";
import { BUILT_IN, OUTFIT_LABELS, QUIZ_ANSWER_LABELS, QUIZ_GROUP_LABELS, REPORT_LABELS, SEASON_LABELS, parsePaths, seasonNow } from "./razanText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";

export default function RazanPage() {
  const q = useQuery({ queryKey: ["razan"], queryFn: RazanAPI.getRazan });
  if (q.isLoading) {
    return (
      <div className={`${box} flex items-center gap-2 text-sm`}>
        <Spinner /> جاري التحميل…
      </div>
    );
  }
  if (q.isError || !q.data) return <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>;
  return <Editor key={JSON.stringify(q.data.razan)} saved={q.data.razan} chatbotEnabled={q.data.chatbotEnabled} storefrontUrl={q.data.storefrontUrl} />;
}

function Editor({ saved, chatbotEnabled, storefrontUrl }: { saved: RazanSettings; chatbotEnabled: boolean; storefrontUrl: string | null }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const [s, setS] = useState<RazanSettings>(saved);
  const [pathsText, setPathsText] = useState(saved.quietPaths.join("، "));
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const set = (patch: Partial<RazanSettings>) => setS((x) => ({ ...x, ...patch }));

  const save = useMutation({
    mutationFn: () => RazanAPI.saveRazan(s),
    onSuccess: () => {
      toast.success("انحفظت إعدادات رزان — بتبيّن بالمتجر خلال ثواني");
      qc.invalidateQueries({ queryKey: ["razan"] });
      qc.invalidateQueries({ queryKey: ["features"] });
    },
    onError: (e) => toast.error("ما انحفظت", { description: getApiErrorMessage(e) }),
  });
  const preview = useMutation({
    mutationFn: () => RazanAPI.previewRazan(s),
    onSuccess: ({ id }) => {
      const base = (storefrontUrl || env.VITE_STOREFRONT_BASE_URL || "").replace(/\/+$/, "");
      window.open(`${base}/?razan-preview=${encodeURIComponent(id)}`, "_blank", "noopener");
    },
    onError: (e) => toast.error("ما زبطت المعاينة", { description: getApiErrorMessage(e) }),
  });

  const season = seasonNow(s);
  return (
    <div dir="rtl" className="space-y-4 pb-24" data-testid="razan-page">
      <div className={box}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">رزان، دليلة المتجر</h1>
            <p className="mt-1 text-sm text-white/60">
              كل إشي بتعمله رزان بالمتجر: إيمتى بتحكي، شو بتحكي، شو بتلبس، وعلى أي صفحات بتسكت. جرّب التغيير على المتجر قبل ما تحفظ.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">{s.enabled ? "رزان ظاهرة" : "رزان مخفية"}</span>
            <ToggleSwitch checked={s.enabled} label="رزان ظاهرة بالمتجر" disabled={!canWrite} onChange={(v) => set({ enabled: v })} />
          </div>
        </div>
      </div>

      <Section title="شو بتعمل" hint="كل تصرف إله زر لحاله.">
        <Row title="بترحّب بالصفحة الرئيسية" hint="بتمشي لجوّا وبتقول أهلاً." on={s.greeting} disabled={!canWrite} onChange={(v) => set({ greeting: v })} />
        <Row title="بتتفاعل مع الزبونة" hint="لما تضيف للحقيبة أو المفضلة أو تختار مقاس/لون." on={s.reactions} disabled={!canWrite} onChange={(v) => set({ reactions: v })} />
        <Row title="حركات صغيرة وهي واقفة" hint="بترتّب حجابها، بتتطلّع حواليها… طفّيها إذا بدك هدوء أكثر." on={s.idleHabits} disabled={!canWrite} onChange={(v) => set({ idleHabits: v })} />
        <div className="py-3 text-sm text-white/60">
          المحادثة الذكية (AI) جوّا لوحتها: {chatbotEnabled ? "شغّالة" : "مطفية"} —{" "}
          <Link to="/admin/features" className="underline">من صفحة الميزات</Link>.
        </div>
      </Section>

      <Section title="قديش بتحكي ووين" hint="عشان ما تزعج الزبونة.">
        <label className="block py-2">
          <span className="mb-1 block text-xs text-white/55">أكثر عدد فقاعات كلام بالزيارة (0 = بدون حد)</span>
          <input type="number" min={0} max={100} dir="ltr" className={`${field} w-32`} value={s.maxBubbles} disabled={!canWrite} onChange={(e) => set({ maxBubbles: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} aria-label="أكثر عدد فقاعات بالزيارة" />
        </label>
        <label className="block py-2">
          <span className="mb-1 block text-xs text-white/55">صفحات بتسكت فيها (بداية الرابط، افصل بفاصلة)</span>
          <input dir="ltr" className={field} value={pathsText} disabled={!canWrite} onChange={(e) => { setPathsText(e.target.value); set({ quietPaths: parsePaths(e.target.value) }); }} placeholder="/cart, /checkout" aria-label="صفحات بتسكت فيها" />
          <span className="mt-1 block text-[11px] text-white/40">هلّق: {s.quietPaths.join("، ") || "ولا صفحة"}</span>
        </label>
        <fieldset className="py-2">
          <legend className="mb-2 text-xs text-white/55">على الموبايل</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="على الموبايل">
            {([["full", "زي الكمبيوتر", "بتحكي وبتتفاعل عادي."], ["quiet", "هادية", "موجودة بس بدون فقاعات كلام."], ["hidden", "مخفية", "ما بتبيّن على الموبايل أبداً."]] as const).map(([k, l, h]) => (
              <button key={k} type="button" role="radio" aria-checked={s.phone === k} disabled={!canWrite} onClick={() => set({ phone: k })} className={`rounded-xl border p-3 text-start ${s.phone === k ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 hover:border-white/25"}`}>
                <span className="block text-sm font-medium">{l}</span>
                <span className="mt-0.5 block text-[11px] text-white/50">{h}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title="كلامها" hint="اتركه فاضي بتحكي الجملة الجاهزة (مكتوبة كمثال جوّا الخانة).">
        <TextPair label="الترحيب بالصفحة الرئيسية" value={s.texts.welcome} placeholder={BUILT_IN.welcome} disabled={!canWrite} onChange={(v) => set({ texts: { ...s.texts, welcome: v } })} />
        <TextPair label="أول سطر بلوحتها (المحادثة شغّالة)" value={s.texts.greetingChat} placeholder={BUILT_IN.greetingChat} disabled={!canWrite} onChange={(v) => set({ texts: { ...s.texts, greetingChat: v } })} />
        <TextPair label="أول سطر بلوحتها (المحادثة مطفية)" value={s.texts.greetingOffline} placeholder={BUILT_IN.greetingOffline} disabled={!canWrite} onChange={(v) => set({ texts: { ...s.texts, greetingOffline: v } })} />
      </Section>

      <Section title="المواسم" hint="برمضان والعيد والصيف والشتا بتغيّر ترحيبها ولبسها لحالها.">
        <div className="flex flex-wrap items-center gap-2 py-2">
          <span className="text-xs text-white/55">الموسم:</span>
          <select className={`${field} w-auto`} value={s.seasonal.mode} disabled={!canWrite} onChange={(e) => set({ seasonal: { ...s.seasonal, mode: e.target.value as RazanSettings["seasonal"]["mode"] } })} aria-label="الموسم">
            <option value="auto">تلقائي حسب التقويم</option>
            <option value="off">بدون مواسم</option>
            {(Object.keys(SEASON_LABELS) as RazanSeason[]).map((k) => (
              <option key={k} value={k}>دايماً {SEASON_LABELS[k]}</option>
            ))}
          </select>
          <span className="text-xs text-white/60" data-testid="season-now">هلّق: {season ? SEASON_LABELS[season] : "ولا موسم"}</span>
        </div>
        <Row title="لبسها بيتبع الموسم" hint="لبس العيد برمضان والعيد، والمعطف بالشتا." on={s.seasonal.outfit} disabled={!canWrite} onChange={(v) => set({ seasonal: { ...s.seasonal, outfit: v } })} />
        {(Object.keys(SEASON_LABELS) as RazanSeason[]).map((k) => (
          <TextPair key={k} label={`ترحيب ${SEASON_LABELS[k]}`} value={s.seasonal.lines[k]} placeholder={BUILT_IN.seasons[k]} disabled={!canWrite} onChange={(v) => set({ seasonal: { ...s.seasonal, lines: { ...s.seasonal.lines, [k]: v } } })} />
        ))}
      </Section>

      <Section title="لبسها" hint="بتغيّر لبسها حسب القسم اللي الزبونة فيه. قواعدك أنت بتنفحص أول.">
        <label className="block py-2">
          <span className="mb-1 block text-xs text-white/55">لبسها العادي</span>
          <OutfitSelect value={s.outfits.default} disabled={!canWrite} onChange={(v) => set({ outfits: { ...s.outfits, default: v } })} />
        </label>
        <div className="space-y-2 py-2" data-testid="outfit-rules">
          {s.outfits.rules.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 p-2 sm:grid-cols-[1fr_200px_auto_auto] sm:items-center">
              <input className={field} value={r.match} disabled={!canWrite} placeholder="اسم القسم فيه… (مثلاً: صلاة)" onChange={(e) => set({ outfits: { ...s.outfits, rules: s.outfits.rules.map((x, j) => (j === i ? { ...x, match: e.target.value } : x)) } })} aria-label="كلمة بالقسم" />
              <OutfitSelect value={r.outfit} disabled={!canWrite} onChange={(v) => set({ outfits: { ...s.outfits, rules: s.outfits.rules.map((x, j) => (j === i ? { ...x, outfit: v } : x)) } })} />
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input type="checkbox" checked={r.pearls} disabled={!canWrite} onChange={(e) => set({ outfits: { ...s.outfits, rules: s.outfits.rules.map((x, j) => (j === i ? { ...x, pearls: e.target.checked } : x)) } })} />
                عقد لؤلؤ
              </label>
              <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => set({ outfits: { ...s.outfits, rules: s.outfits.rules.filter((_, j) => j !== i) } })}>
                حذف
              </Button>
            </div>
          ))}
          {canWrite && s.outfits.rules.length < 30 ? (
            <Button size="sm" variant="secondary" onClick={() => set({ outfits: { ...s.outfits, rules: [...s.outfits.rules, { match: "", outfit: "abaya", pearls: false }] } })}>
              + قاعدة
            </Button>
          ) : null}
        </div>
      </Section>

      <Section title="«شو كنتِ شايفة؟» — سجل الزبونة" hint="رزان بتتذكّر آخر القطع اللي فتحتها الزبونة (مع اللون والمقاس)، وشو دوّرت، وشو شالت من الحقيبة — على جهازها بس، وبينمسح لحاله.">
        <Row title="تشغيل السجل" hint="بيطلع تبويب «شو كنتِ شايفة» بلوحة رزان." on={s.history.enabled} disabled={!canWrite} onChange={(v) => set({ history: { ...s.history, enabled: v } })} />
        <label className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-sm font-medium">بينمسح بعد</span>
            <span className="block text-xs text-white/50">قصير أحسن للخصوصية إذا التلفون مشترك بالبيت؛ أطول بيساعد اللي بترجع تاني يوم.</span>
          </span>
          <select className={`${field} w-auto`} value={s.history.ttlHours} disabled={!canWrite || !s.history.enabled} onChange={(e) => set({ history: { ...s.history, ttlHours: Number(e.target.value) } })} aria-label="مدة السجل">
            {[1, 6, 12, 24, 72, 168, 720].concat([s.history.ttlHours]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((h) => (
              <option key={h} value={h}>{h < 24 ? `${h} ساعة` : h === 24 ? "يوم" : h === 168 ? "أسبوع" : h === 720 ? "شهر" : `${Math.round(h / 24)} أيام`}</option>
            ))}
          </select>
        </label>
        <Row title="رزان بتعرض السجل لما الزبونة تبيّن ضايعة" hint="لما ترجع لقطعة بعد ما شافت غيرها، أو تدوّر مرة ثانية، أو تطلع من الصفحة. مرة وحدة بالزيارة." on={s.history.offer} disabled={!canWrite || !s.history.enabled} onChange={(v) => set({ history: { ...s.history, offer: v } })} />
      </Section>

      <Section title="«رزان بتساعدك تطلبي» — طلب خطوة بخطوة" hint="للي ما بتعرف تطلب: رزان بتسألها سؤال بكل شاشة (اللون بالصور، المقاس، الكمية، الاسم، الرقم، العنوان) وبتبعت الطلب. وبكل خطوة في زر «بدي حدا يحكيني».">
        <Row title="تشغيل المساعدة" hint="بيطلع تبويب «ساعديني أطلب» بلوحة رزان على صفحة القطعة، ورزان بتعرضها لحالها." on={s.helpOrder.enabled} disabled={!canWrite} onChange={(v) => set({ helpOrder: { ...s.helpOrder, enabled: v } })} />
        <label className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-sm font-medium">بتعرض المساعدة بعد</span>
            <span className="block text-xs text-white/50">إذا الزبونة ما عملت إشي على صفحة القطعة. وإذا ضلّت تبدّل ألوان ومقاسات، بتعرضها أبكر.</span>
          </span>
          <select className={`${field} w-auto`} value={s.helpOrder.idleSeconds} disabled={!canWrite || !s.helpOrder.enabled} onChange={(e) => set({ helpOrder: { ...s.helpOrder, idleSeconds: Number(e.target.value) } })} aria-label="بتعرض المساعدة بعد">
            {[10, 15, 25, 40, 60, 120].concat([s.helpOrder.idleSeconds]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((n) => (
              <option key={n} value={n}>{n < 60 ? `${n} ثانية` : n === 60 ? "دقيقة" : `${Math.round(n / 60)} دقايق`}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-sm font-medium">إذا قالت «لا شكراً»، ما بتعرضها لمدة</span>
            <span className="block text-xs text-white/50">بكل الأحوال بتعرضها مرة وحدة بالزيارة بس، والتبويب بيضل موجود.</span>
          </span>
          <select className={`${field} w-auto`} value={s.helpOrder.snoozeDays} disabled={!canWrite || !s.helpOrder.enabled} onChange={(e) => set({ helpOrder: { ...s.helpOrder, snoozeDays: Number(e.target.value) } })} aria-label="مدة السكوت بعد لا شكراً">
            {[0, 1, 3, 7, 14, 30].concat([s.helpOrder.snoozeDays]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((d) => (
              <option key={d} value={d}>{d === 0 ? "الزيارة الجاية بترجع" : d === 1 ? "يوم" : d === 7 ? "أسبوع" : d === 14 ? "أسبوعين" : d === 30 ? "شهر" : `${d} أيام`}</option>
            ))}
          </select>
        </label>
        <p className="py-2 text-xs leading-6 text-white/55">
          الطلبات بتوصل عادي على <Link to="/admin/orders" className="underline">الطلبات</Link> ومكتوب عليها «بمساعدة رزان 🌸». طلبات «احكوني» بتوصل على <Link to="/admin/requests" className="underline">الطلبات الخاصة</Link>.
        </p>
      </Section>

      <Section title="«رزان بتختارلك» — بتختار للزبونة" hint="كم سؤال سريع (المناسبة، صيفي/شتوي، الألوان، لبسة كاملة ولا قطعة، المقاس، الميزانية، وصور بتعجبها) وبعدين رزان بتطلعلها أقرب القطع إلها — مع سبب لكل قطعة. اختيارات الزبونة بتضل على جهازها.">
        <Row title="تشغيل «رزان بتختارلك»" hint="بيطلع تبويب «بتختارلك» بلوحة رزان، وزر «محتارة؟» بصفحة المتجر." on={s.styleQuiz.enabled} disabled={!canWrite} onChange={(v) => set({ styleQuiz: { ...s.styleQuiz, enabled: v } })} />
        <label className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-sm font-medium">كم قطعة بتعرض</span>
            <span className="block text-xs text-white/50">أقل = أسهل على الموبايل.</span>
          </span>
          <select className={`${field} w-auto`} value={s.styleQuiz.results} disabled={!canWrite || !s.styleQuiz.enabled} onChange={(e) => set({ styleQuiz: { ...s.styleQuiz, results: Number(e.target.value) } })} aria-label="كم قطعة بتعرض">
            {[3, 4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <fieldset className="py-2">
          <legend className="mb-2 text-xs text-white/55">قديش القطع بتكون مختلفة عن بعض</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="تنويع القطع">
            {([["low", "قريبة من بعض", "الأقرب لاختياراتها حتى لو متشابهة."], ["medium", "متوازنة", "قريبة منها، وبنفس الوقت منوّعة."], ["high", "منوّعة كتير", "بتفرجيها أشكال مختلفة أكثر."]] as const).map(([k, l, h]) => (
              <button key={k} type="button" role="radio" aria-checked={s.styleQuiz.variety === k} disabled={!canWrite || !s.styleQuiz.enabled} onClick={() => set({ styleQuiz: { ...s.styleQuiz, variety: k } })} className={`rounded-xl border p-3 text-start ${s.styleQuiz.variety === k ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 hover:border-white/25"} disabled:opacity-60`}>
                <span className="block text-sm font-medium">{l}</span>
                <span className="mt-0.5 block text-[11px] text-white/50">{h}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <p className="py-2 text-xs leading-6 text-white/55">
          رزان بتفهم القطع من الصور واللون والكلام بالعنوان والوصف وحقول نوع المنتج (مثلاً «المناسبة: عرس»، «القماش: صوف»). كل ما عبّيتي هالحقول، بتختار أحسن.
        </p>
      </Section>

      <Report />

      {canWrite ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface-950/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-2">
            {dirty ? <span className="me-auto text-xs text-amber-200" role="status">في تغييرات مش محفوظة</span> : null}
            <Button variant="secondary" isLoading={preview.isPending} onClick={() => preview.mutate()}>
              👀 جرّب بالمتجر (بدون حفظ)
            </Button>
            <Button variant="primary" isLoading={save.isPending} disabled={!dirty || s.outfits.rules.some((r) => !r.match.trim())} onClick={() => save.mutate()}>
              حفظ
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={box}>
      <h2 className="font-semibold">{title}</h2>
      {hint ? <p className="mt-0.5 text-xs text-white/50">{hint}</p> : null}
      <div className="mt-2 divide-y divide-white/10">{children}</div>
    </section>
  );
}

function Row({ title, hint, on, disabled, onChange }: { title: string; hint?: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {hint ? <div className="mt-0.5 text-xs text-white/50">{hint}</div> : null}
      </div>
      <ToggleSwitch checked={on} label={title} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function TextPair({ label, value, placeholder, disabled, onChange }: { label: string; value: RazanText; placeholder: RazanText; disabled?: boolean; onChange: (v: RazanText) => void }) {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs text-white/55">{label} — عربي</span>
        <input className={field} maxLength={160} value={value.ar} placeholder={placeholder.ar} disabled={disabled} onChange={(e) => onChange({ ...value, ar: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-white/55">English</span>
        <input dir="ltr" className={field} maxLength={160} value={value.en} placeholder={placeholder.en} disabled={disabled} onChange={(e) => onChange({ ...value, en: e.target.value })} />
      </label>
    </div>
  );
}

function OutfitSelect({ value, disabled, onChange }: { value: RazanOutfit; disabled?: boolean; onChange: (v: RazanOutfit) => void }) {
  return (
    <select className={field} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as RazanOutfit)} aria-label="اللبس">
      {(Object.keys(OUTFIT_LABELS) as RazanOutfit[]).map((k) => (
        <option key={k} value={k}>
          {OUTFIT_LABELS[k]}
        </option>
      ))}
    </select>
  );
}

function Report() {
  const q = useQuery({ queryKey: ["razan", "report"], queryFn: RazanAPI.razanReport });
  const days = useMemo(() => {
    const out: Array<{ day: string; n: number }> = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 864e5).toISOString().slice(0, 10);
      out.push({ day: d, n: q.data?.byDay[d]?.open ?? 0 });
    }
    return out;
  }, [q.data]);
  const max = Math.max(1, ...days.map((d) => d.n));
  const rows = REPORT_LABELS.filter((r) => r.key === "open" || (q.data?.totals[r.key]?.d30 ?? 0) > 0);
  return (
    <section className={box} data-testid="razan-report">
      <h2 className="font-semibold">كيف بيستعملوها</h2>
      <p className="mt-0.5 text-xs text-white/50">أرقام بس، بدون أي معلومات عن الزبونات.</p>
      {q.isLoading ? (
        <p className="mt-3 text-sm text-white/50">جاري التحميل…</p>
      ) : (
        <>
          <div className="mt-3 flex h-16 items-end gap-[3px]" aria-label="فتحوا لوحتها بآخر 30 يوم">
            {days.map((d) => (
              <span key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-t bg-accent-400/60" style={{ height: `${Math.max(4, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.25 }} />
            ))}
          </div>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-xs text-white/50">
                <th className="py-1 text-start font-normal">&nbsp;</th>
                <th className="py-1 text-end font-normal">آخر 7 أيام</th>
                <th className="py-1 text-end font-normal">آخر 30 يوم</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-white/5">
                  <td className="py-1.5">{r.label}</td>
                  <td className="py-1.5 text-end tabular-nums">{q.data?.totals[r.key]?.d7 ?? 0}</td>
                  <td className="py-1.5 text-end tabular-nums">{q.data?.totals[r.key]?.d30 ?? 0}</td>
                </tr>
              ))}
              <tr className="border-t border-white/5">
                <td className="py-1.5">طلبات بمساعدة رزان</td>
                <td className="py-1.5 text-end tabular-nums">{q.data?.helpOrders.d7 ?? 0}</td>
                <td className="py-1.5 text-end tabular-nums">{q.data?.helpOrders.d30 ?? 0}</td>
              </tr>
            </tbody>
          </table>
          {q.data?.quiz && Object.keys(q.data.quiz).length ? (
            <div className="mt-4" data-testid="razan-quiz-totals">
              <h3 className="text-sm font-medium">شو بيختاروا بـ«رزان بتختارلك» (آخر 30 يوم)</h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {(Object.keys(QUIZ_GROUP_LABELS) as Array<keyof NonNullable<RazanAPI.RazanReport["quiz"]>>).filter((g) => q.data?.quiz?.[g]?.length).map((g) => (
                  <div key={g}>
                    <span className="block text-xs text-white/50">{QUIZ_GROUP_LABELS[g]}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {q.data!.quiz![g]!.slice(0, 6).map((x) => (
                        <span key={x.value} className="rounded-full border border-white/10 px-2 py-0.5 text-xs">{QUIZ_ANSWER_LABELS[g]?.[x.value] ?? x.value} · {x.count}</span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
