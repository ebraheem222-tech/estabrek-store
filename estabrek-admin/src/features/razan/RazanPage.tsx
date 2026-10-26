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
import { BUILT_IN, OUTFIT_LABELS, QUIZ_ANSWER_LABELS, QUIZ_GROUP_LABELS, REPORT_LABELS, SEASON_LABELS, fillLine, parsePaths, seasonNow } from "./razanText";
import { useSettings } from "../../hooks/useSettings";
import { LANG_LABEL, markOf, type Lang } from "../../lib/storeIdentity";
import { languagesOf } from "../../lib/storeLanguages";
import { adminLang } from "../../lib/lang";
import { tr } from "@/lib/words";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";

export default function RazanPage() {
  const q = useQuery({ queryKey: ["razan"], queryFn: RazanAPI.getRazan });
  if (q.isLoading) {
    return (
      <div className={`${box} flex items-center gap-2 text-sm`}>
        <Spinner /> {tr("جاري التحميل…", "Loading…")}
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
  // An older backend has no name yet: start from an empty one so nothing looks changed.
  const base = useMemo(() => ({ ...saved, name: saved.name ?? { ar: "", en: "", he: "" } }), [saved]);
  const [s, setS] = useState<RazanSettings>(base);
  const [pathsText, setPathsText] = useState(saved.quietPaths.join("، "));
  const dirty = JSON.stringify(s) !== JSON.stringify(base);
  // Her lines as the shop shows them: the store's name (admin → هوية المتجر) and hers.
  const settings = useSettings();
  const her = {
    ar: s.name?.ar.trim() || "رزان",
    en: s.name?.en.trim() || s.name?.ar.trim() || "Rose",
    he: s.name?.he?.trim() || s.name?.en.trim() || s.name?.ar.trim() || "רוז",
  };
  const names = {
    ar: { store: markOf(settings.data, "ar"), assistant: her.ar },
    en: { store: markOf(settings.data, "en"), assistant: her.en },
    he: { store: markOf(settings.data, "he"), assistant: her.he },
  };
  // A box for each language the shop offers (admin → الإعدادات → لغات المتجر).
  const langs = languagesOf(settings.data?.header).enabled;
  const set = (patch: Partial<RazanSettings>) => setS((x) => ({ ...x, ...patch }));

  const save = useMutation({
    mutationFn: () => RazanAPI.saveRazan(s),
    onSuccess: () => {
      toast.success(tr("انحفظت إعدادات رزان — بتبيّن بالمتجر خلال ثواني", "Razan's settings saved — they show in the store within seconds"));
      qc.invalidateQueries({ queryKey: ["razan"] });
      qc.invalidateQueries({ queryKey: ["features"] });
    },
    onError: (e) => toast.error(tr("ما انحفظت", "Not saved"), { description: getApiErrorMessage(e) }),
  });
  const preview = useMutation({
    mutationFn: () => RazanAPI.previewRazan(s),
    onSuccess: ({ id }) => {
      const base = (storefrontUrl || env.VITE_STOREFRONT_BASE_URL || "").replace(/\/+$/, "");
      window.open(`${base}/?razan-preview=${encodeURIComponent(id)}`, "_blank", "noopener");
    },
    onError: (e) => toast.error(tr("ما زبطت المعاينة", "The preview didn't work"), { description: getApiErrorMessage(e) }),
  });

  const season = seasonNow(s);
  return (
    <div className="space-y-4 pb-24" data-testid="razan-page">
      <div className={box}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{tr(`${her.ar}، دليلة المتجر`, "{0}, the store's guide", [her[adminLang()]])}</h1>
            <p className="mt-1 text-sm text-white/60">
              {tr("كل إشي بتعمله رزان بالمتجر: إيمتى بتحكي، شو بتحكي، شو بتلبس، وعلى أي صفحات بتسكت. التغيير بيتجرّب على المتجر قبل الحفظ.", "Everything Razan does in the store: when she talks, what she says, what she wears, and which pages she stays quiet on. Try a change in the store before saving.")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">{s.enabled ? tr("رزان ظاهرة", "Razan is shown") : tr("رزان مخفية", "Razan is hidden")}</span>
            <ToggleSwitch checked={s.enabled} label={tr("رزان ظاهرة بالمتجر", "Razan shown in the store")} disabled={!canWrite} onChange={(v) => set({ enabled: v })} />
          </div>
        </div>
      </div>

      <Section title={tr("اسمها", "Her name")} hint={tr("الاسم اللي بتشوفه الزبائن بالمتجر. فاضي = «رزان» / “Rose”.", "The name customers see in the store. Empty = “Razan” / “Rose”.")}>
        <TextPair label={tr("الاسم", "Name")} langs={langs} value={s.name ?? { ar: "", en: "", he: "" }} placeholder={{ ar: "رزان", en: "Rose", he: "רוז" }} maxLength={30} disabled={!canWrite} onChange={(v) => set({ name: v })} />
      </Section>

      <Section title={tr("شو بتعمل", "What she does")} hint={tr("كل تصرف إله زر لحاله.", "Each behaviour has its own switch.")}>
        <Row title={tr("بترحّب بالصفحة الرئيسية", "Welcomes on the home page")} hint={tr("بتمشي لجوّا وبتقول أهلاً.", "She walks in and says hello.")} on={s.greeting} disabled={!canWrite} onChange={(v) => set({ greeting: v })} />
        <Row title={tr("بتتفاعل مع الزبون", "Reacts to the customer")} hint={tr("لما ينضاف إشي للحقيبة أو المفضلة أو ينختار مقاس/لون.", "When something is added to the bag or favourites, or a size/colour is chosen.")} on={s.reactions} disabled={!canWrite} onChange={(v) => set({ reactions: v })} />
        <Row title={tr("حركات صغيرة وهي واقفة", "Small moves while standing")} hint={tr("بترتّب حجابها، بتتطلّع حواليها… الأفضل تنطفى لهدوء أكثر.", "She fixes her hijab, looks around… turn it off for more calm.")} on={s.idleHabits} disabled={!canWrite} onChange={(v) => set({ idleHabits: v })} />
        <div className="py-3 text-sm text-white/60">
          {tr("المحادثة الذكية (AI) جوّا لوحتها:", "The smart chat (AI) in her panel:")} {chatbotEnabled ? tr("شغّالة", "on") : tr("مطفية", "off")} —{" "}
          <Link to="/admin/features" className="underline">{tr("من صفحة الميزات", "from the features page")}</Link>.
        </div>
      </Section>

      <Section title={tr("قديش بتحكي ووين", "How much she talks and where")} hint={tr("عشان ما تزعج الزبون.", "So she doesn't bother the customer.")}>
        <label className="block py-2">
          <span className="mb-1 block text-xs text-white/55">{tr("أكثر عدد فقاعات كلام بالزيارة (0 = بدون حد)", "Most speech bubbles per visit (0 = no limit)")}</span>
          <input type="number" min={0} max={100} dir="ltr" className={`${field} w-32`} value={s.maxBubbles} disabled={!canWrite} onChange={(e) => set({ maxBubbles: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} aria-label={tr("أكثر عدد فقاعات بالزيارة", "Most bubbles per visit")} />
        </label>
        <label className="block py-2">
          <span className="mb-1 block text-xs text-white/55">{tr("صفحات بتسكت فيها (بداية الرابط، مفصولة بفاصلة)", "Pages where she stays quiet (start of the link, separated by commas)")}</span>
          <input dir="ltr" className={field} value={pathsText} disabled={!canWrite} onChange={(e) => { setPathsText(e.target.value); set({ quietPaths: parsePaths(e.target.value) }); }} placeholder="/cart, /checkout" aria-label={tr("صفحات بتسكت فيها", "Pages where she stays quiet")} />
          <span className="mt-1 block text-[11px] text-white/40">{tr("هلّق:", "Now:")} {s.quietPaths.join(tr("، ", ", ")) || tr("ولا صفحة", "no page")}</span>
        </label>
        <fieldset className="py-2">
          <legend className="mb-2 text-xs text-white/55">{tr("على الموبايل", "On phones")}</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={tr("على الموبايل", "On phones")}>
            {([["full", tr("زي الكمبيوتر", "Like the computer"), tr("بتحكي وبتتفاعل عادي.", "Talks and reacts as usual.")], ["quiet", tr("هادية", "Quiet"), tr("موجودة بس بدون فقاعات كلام.", "There but without speech bubbles.")], ["hidden", tr("مخفية", "Hidden"), tr("ما بتبيّن على الموبايل أبداً.", "Never shows on phones.")]] as const).map(([k, l, h]) => (
              <button key={k} type="button" role="radio" aria-checked={s.phone === k} disabled={!canWrite} onClick={() => set({ phone: k })} className={`rounded-xl border p-3 text-start ${s.phone === k ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 hover:border-white/25"}`}>
                <span className="block text-sm font-medium">{l}</span>
                <span className="mt-0.5 block text-[11px] text-white/50">{h}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </Section>

      <Section title={tr("كلامها", "Her words")} hint={tr("إذا ضل فاضي بتحكي الجملة الجاهزة (مكتوبة كمثال جوّا الخانة).", "Leave it empty and she says the ready line (shown as an example in the box).")}>
        <TextPair label={tr("الترحيب بالصفحة الرئيسية", "Home page welcome")} langs={langs} value={s.texts.welcome} placeholder={fillLine(BUILT_IN.welcome, names)} disabled={!canWrite} onChange={(v) => set({ texts: { ...s.texts, welcome: v } })} />
        <TextPair label={tr("أول سطر بلوحتها (المحادثة شغّالة)", "First line in her panel (chat on)")} langs={langs} value={s.texts.greetingChat} placeholder={fillLine(BUILT_IN.greetingChat, names)} disabled={!canWrite} onChange={(v) => set({ texts: { ...s.texts, greetingChat: v } })} />
        <TextPair label={tr("أول سطر بلوحتها (المحادثة مطفية)", "First line in her panel (chat off)")} langs={langs} value={s.texts.greetingOffline} placeholder={fillLine(BUILT_IN.greetingOffline, names)} disabled={!canWrite} onChange={(v) => set({ texts: { ...s.texts, greetingOffline: v } })} />
      </Section>

      <Section title={tr("المواسم", "Seasons")} hint={tr("برمضان والعيد والصيف والشتا بتغيّر ترحيبها ولبسها لحالها.", "In Ramadan, Eid, summer and winter she changes her welcome and outfit by herself.")}>
        <div className="flex flex-wrap items-center gap-2 py-2">
          <span className="text-xs text-white/55">{tr("الموسم:", "Season:")}</span>
          <select className={`${field} w-auto`} value={s.seasonal.mode} disabled={!canWrite} onChange={(e) => set({ seasonal: { ...s.seasonal, mode: e.target.value as RazanSettings["seasonal"]["mode"] } })} aria-label={tr("الموسم", "Season")}>
            <option value="auto">{tr("تلقائي حسب التقويم", "Automatic by the calendar")}</option>
            <option value="off">{tr("بدون مواسم", "No seasons")}</option>
            {(Object.keys(SEASON_LABELS) as RazanSeason[]).map((k) => (
              <option key={k} value={k}>{tr("دايماً", "Always")} {SEASON_LABELS[k]}</option>
            ))}
          </select>
          <span className="text-xs text-white/60" data-testid="season-now">{tr("هلّق:", "Now:")} {season ? SEASON_LABELS[season] : tr("ولا موسم", "no season")}</span>
        </div>
        <Row title={tr("لبسها بيتبع الموسم", "Her outfit follows the season")} hint={tr("لبس العيد برمضان والعيد، والمعطف بالشتا.", "The Eid outfit in Ramadan and Eid, the coat in winter.")} on={s.seasonal.outfit} disabled={!canWrite} onChange={(v) => set({ seasonal: { ...s.seasonal, outfit: v } })} />
        {(Object.keys(SEASON_LABELS) as RazanSeason[]).map((k) => (
          <TextPair key={k} label={tr(`ترحيب ${SEASON_LABELS[k]}`, "{0} welcome", [SEASON_LABELS[k]])} langs={langs} value={s.seasonal.lines[k]} placeholder={fillLine(BUILT_IN.seasons[k], names)} disabled={!canWrite} onChange={(v) => set({ seasonal: { ...s.seasonal, lines: { ...s.seasonal.lines, [k]: v } } })} />
        ))}
      </Section>

      <Section title={tr("لبسها", "Her outfit")} hint={tr("بتغيّر لبسها حسب القسم اللي الزبون فيه. القواعد هون بتنفحص أول.", "She changes her outfit by the customer's category. Your rules are checked first.")}>
        <label className="block py-2">
          <span className="mb-1 block text-xs text-white/55">{tr("لبسها العادي", "Her usual outfit")}</span>
          <OutfitSelect value={s.outfits.default} disabled={!canWrite} onChange={(v) => set({ outfits: { ...s.outfits, default: v } })} />
        </label>
        <div className="space-y-2 py-2" data-testid="outfit-rules">
          {s.outfits.rules.map((r, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 p-2 sm:grid-cols-[1fr_200px_auto_auto] sm:items-center">
              <input className={field} value={r.match} disabled={!canWrite} placeholder={tr("اسم القسم فيه… (مثلاً: صلاة)", "The category name has… (e.g. prayer)")} onChange={(e) => set({ outfits: { ...s.outfits, rules: s.outfits.rules.map((x, j) => (j === i ? { ...x, match: e.target.value } : x)) } })} aria-label={tr("كلمة بالقسم", "A word in the category")} />
              <OutfitSelect value={r.outfit} disabled={!canWrite} onChange={(v) => set({ outfits: { ...s.outfits, rules: s.outfits.rules.map((x, j) => (j === i ? { ...x, outfit: v } : x)) } })} />
              <label className="flex items-center gap-2 text-xs text-white/70">
                <input type="checkbox" checked={r.pearls} disabled={!canWrite} onChange={(e) => set({ outfits: { ...s.outfits, rules: s.outfits.rules.map((x, j) => (j === i ? { ...x, pearls: e.target.checked } : x)) } })} />
                {tr("عقد لؤلؤ", "Pearl necklace")}
              </label>
              <Button size="sm" variant="ghost" disabled={!canWrite} onClick={() => set({ outfits: { ...s.outfits, rules: s.outfits.rules.filter((_, j) => j !== i) } })}>
                {tr("حذف", "Delete")}
              </Button>
            </div>
          ))}
          {canWrite && s.outfits.rules.length < 30 ? (
            <Button size="sm" variant="secondary" onClick={() => set({ outfits: { ...s.outfits, rules: [...s.outfits.rules, { match: "", outfit: "abaya", pearls: false }] } })}>
              {tr("+ قاعدة", "+ Rule")}
            </Button>
          ) : null}
        </div>
      </Section>

      <Section title={tr("«آخر اللي انشاف» — سجل الزبون", "“What you were looking at” — the customer's history")} hint={tr("رزان بتتذكّر آخر القطع اللي فتحها الزبون (مع اللون والمقاس)، وشو دوّر، وشو شال من الحقيبة — على جهازه بس، وبينمسح لحاله.", "Razan remembers the last pieces the customer opened (with colour and size), what they searched, and what they took out of the bag — on their device only, and it clears itself.")}>
        <Row title={tr("تشغيل السجل", "Turn on the history")} hint={tr("بيطلع تبويب «آخر اللي انشاف» بلوحة رزان.", "A “What you were looking at” tab shows in Razan's panel.")} on={s.history.enabled} disabled={!canWrite} onChange={(v) => set({ history: { ...s.history, enabled: v } })} />
        <label className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-sm font-medium">{tr("بينمسح بعد", "Clears after")}</span>
            <span className="block text-xs text-white/50">{tr("قصير أحسن للخصوصية إذا التلفون مشترك بالبيت؛ أطول بيساعد اللي بيرجع تاني يوم.", "Shorter is better for privacy on a shared phone; longer helps those who come back the next day.")}</span>
          </span>
          <select className={`${field} w-auto`} value={s.history.ttlHours} disabled={!canWrite || !s.history.enabled} onChange={(e) => set({ history: { ...s.history, ttlHours: Number(e.target.value) } })} aria-label={tr("مدة السجل", "History length")}>
            {[1, 6, 12, 24, 72, 168, 720].concat([s.history.ttlHours]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((h) => (
              <option key={h} value={h}>{h < 24 ? tr(`${h} ساعة`, "{0} hours", [h]) : h === 24 ? tr("يوم", "1 day") : h === 168 ? tr("أسبوع", "1 week") : h === 720 ? tr("شهر", "1 month") : tr(`${Math.round(h / 24)} أيام`, "{0} days", [Math.round(h / 24)])}</option>
            ))}
          </select>
        </label>
        <Row title={tr("رزان بتعرض السجل لما الزبون يبيّن ضايع", "Razan offers the history when the customer seems lost")} hint={tr("لما يرجع لقطعة بعد ما شاف غيرها، أو يدوّر مرة ثانية، أو يطلع من الصفحة. مرة وحدة بالزيارة.", "When they go back to a piece after seeing others, search again, or leave the page. Once per visit.")} on={s.history.offer} disabled={!canWrite || !s.history.enabled} onChange={(v) => set({ history: { ...s.history, offer: v } })} />
      </Section>

      <Section title={tr("«رزان بتساعد بالطلب» — طلب خطوة بخطوة", "“Razan helps you order” — ordering step by step")} hint={tr("للي ما بيعرف يطلب: رزان بتسأل سؤال بكل شاشة (اللون بالصور، المقاس، الكمية، الاسم، الرقم، العنوان) وبتبعت الطلب. وبكل خطوة في زر «بدي حدا يحكيني».", "For those who don't know how to order: Razan asks one question per screen (colour by photo, size, quantity, name, number, address) and sends the order. Every step has an “I want someone to call me” button.")}>
        <Row title={tr("تشغيل المساعدة", "Turn on the help")} hint={tr("بيطلع تبويب «المساعدة بالطلب» بلوحة رزان على صفحة القطعة، ورزان بتعرضها لحالها.", "A “Help me order” tab shows in Razan's panel on the product page, and Razan offers it by herself.")} on={s.helpOrder.enabled} disabled={!canWrite} onChange={(v) => set({ helpOrder: { ...s.helpOrder, enabled: v } })} />
        <label className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-sm font-medium">{tr("بتعرض المساعدة بعد", "Offers the help after")}</span>
            <span className="block text-xs text-white/50">{tr("إذا الزبون ما عمل إشي على صفحة القطعة. وإذا ضل يبدّل ألوان ومقاسات، بتعرضها أبكر.", "If the customer does nothing on the product page. If they keep switching colours and sizes, she offers it sooner.")}</span>
          </span>
          <select className={`${field} w-auto`} value={s.helpOrder.idleSeconds} disabled={!canWrite || !s.helpOrder.enabled} onChange={(e) => set({ helpOrder: { ...s.helpOrder, idleSeconds: Number(e.target.value) } })} aria-label={tr("بتعرض المساعدة بعد", "Offers the help after")}>
            {[10, 15, 25, 40, 60, 120].concat([s.helpOrder.idleSeconds]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((n) => (
              <option key={n} value={n}>{n < 60 ? tr(`${n} ثانية`, "{0} seconds", [n]) : n === 60 ? tr("دقيقة", "1 minute") : tr(`${Math.round(n / 60)} دقايق`, "{0} minutes", [Math.round(n / 60)])}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-sm font-medium">{tr("إذا انقال «لا شكراً»، ما بتعرضها لمدة", "If they say “No thanks”, she doesn't offer it for")}</span>
            <span className="block text-xs text-white/50">{tr("بكل الأحوال بتعرضها مرة وحدة بالزيارة بس، والتبويب بيضل موجود.", "Either way she offers it once per visit only, and the tab stays.")}</span>
          </span>
          <select className={`${field} w-auto`} value={s.helpOrder.snoozeDays} disabled={!canWrite || !s.helpOrder.enabled} onChange={(e) => set({ helpOrder: { ...s.helpOrder, snoozeDays: Number(e.target.value) } })} aria-label={tr("مدة السكوت بعد لا شكراً", "Quiet time after no thanks")}>
            {[0, 1, 3, 7, 14, 30].concat([s.helpOrder.snoozeDays]).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map((d) => (
              <option key={d} value={d}>{d === 0 ? tr("الزيارة الجاية بترجع", "Back next visit") : d === 1 ? tr("يوم", "1 day") : d === 7 ? tr("أسبوع", "1 week") : d === 14 ? tr("أسبوعين", "2 weeks") : d === 30 ? tr("شهر", "1 month") : tr(`${d} أيام`, "{0} days", [d])}</option>
            ))}
          </select>
        </label>
        <p className="py-2 text-xs leading-6 text-white/55">
          {tr("الطلبات بتوصل عادي على", "Orders arrive as usual in")} <Link to="/admin/orders" className="underline">{tr("الطلبات", "Orders")}</Link> {tr("ومكتوب عليها «بمساعدة رزان 🌸». طلبات «احكوني» بتوصل على", "marked “With Razan's help 🌸”. “Call me” requests arrive in")} <Link to="/admin/requests" className="underline">{tr("الطلبات الخاصة", "Special requests")}</Link>.
        </p>
      </Section>

      <Section title={tr("«رزان بتختارلك» — بتختار للزبون", "“Razan picks for you” — she chooses for the customer")} hint={tr("كم سؤال سريع (المناسبة، صيفي/شتوي، الألوان، لبسة كاملة ولا قطعة، المقاس، الميزانية، وصور بتعجبه) وبعدين رزان بتطلّع أقرب القطع إله — مع سبب لكل قطعة. اختيارات الزبون بتضل على جهازه.", "A few quick questions (occasion, summer/winter, colours, full outfit or one piece, size, budget, and photos they like), then Razan shows the closest pieces — with a reason for each. The customer's choices stay on their device.")}>
        <Row title={tr("تشغيل «رزان بتختارلك»", "Turn on “Razan picks for you”")} hint={tr("بيطلع تبويب «بتختارلك» بلوحة رزان، وزر «محتار/ة؟» بصفحة المتجر.", "A “Picks for you” tab shows in Razan's panel, and a “Not sure?” button on the store page.")} on={s.styleQuiz.enabled} disabled={!canWrite} onChange={(v) => set({ styleQuiz: { ...s.styleQuiz, enabled: v } })} />
        <label className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-sm font-medium">{tr("كم قطعة بتعرض", "How many pieces she shows")}</span>
            <span className="block text-xs text-white/50">{tr("أقل = أسهل على الموبايل.", "Fewer = easier on phones.")}</span>
          </span>
          <select className={`${field} w-auto`} value={s.styleQuiz.results} disabled={!canWrite || !s.styleQuiz.enabled} onChange={(e) => set({ styleQuiz: { ...s.styleQuiz, results: Number(e.target.value) } })} aria-label={tr("كم قطعة بتعرض", "How many pieces she shows")}>
            {[3, 4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <fieldset className="py-2">
          <legend className="mb-2 text-xs text-white/55">{tr("قديش القطع بتكون مختلفة عن بعض", "How different the pieces are from each other")}</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={tr("تنويع القطع", "Variety")}>
            {([["low", tr("قريبة من بعض", "Close to each other"), tr("الأقرب للاختيارات حتى لو متشابهة.", "The closest to the choices even if similar.")], ["medium", tr("متوازنة", "Balanced"), tr("قريبة من الاختيارات، وبنفس الوقت منوّعة.", "Close to the choices, and varied at the same time.")], ["high", tr("منوّعة كتير", "Very varied"), tr("بتعرض أشكال مختلفة أكثر.", "Shows more different styles.")]] as const).map(([k, l, h]) => (
              <button key={k} type="button" role="radio" aria-checked={s.styleQuiz.variety === k} disabled={!canWrite || !s.styleQuiz.enabled} onClick={() => set({ styleQuiz: { ...s.styleQuiz, variety: k } })} className={`rounded-xl border p-3 text-start ${s.styleQuiz.variety === k ? "border-accent-400/60 bg-accent-500/15" : "border-white/10 hover:border-white/25"} disabled:opacity-60`}>
                <span className="block text-sm font-medium">{l}</span>
                <span className="mt-0.5 block text-[11px] text-white/50">{h}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <p className="py-2 text-xs leading-6 text-white/55">
          {tr("رزان بتفهم القطع من الصور واللون والكلام بالعنوان والوصف وحقول نوع المنتج (مثلاً «المناسبة: عرس»، «القماش: صوف»). كل ما تعبّت هالحقول أكثر، بتختار أحسن.", "Razan understands pieces from their photos, colour, the words in the title and description, and the product type's fields (e.g. “Occasion: wedding”, “Fabric: wool”). The more those fields are filled, the better she picks.")}
        </p>
      </Section>

      <Report />

      {canWrite ? (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 z-40 border-t border-white/10 bg-surface-950/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-end gap-2">
            {dirty ? <span className="me-auto text-xs text-amber-200" role="status">{tr("في تغييرات مش محفوظة", "There are unsaved changes")}</span> : null}
            <Button variant="secondary" isLoading={preview.isPending} onClick={() => preview.mutate()}>
              {tr("👀 تجربة بالمتجر (بدون حفظ)", "👀 Try in the store (without saving)")}
            </Button>
            <Button variant="primary" isLoading={save.isPending} disabled={!dirty || s.outfits.rules.some((r) => !r.match.trim())} onClick={() => save.mutate()}>
              {tr("حفظ", "Save")}
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

function TextPair({ label, langs, value, placeholder, disabled, maxLength = 160, onChange }: { label: string; langs: Lang[]; value: RazanText; placeholder: RazanText; disabled?: boolean; maxLength?: number; onChange: (v: RazanText) => void }) {
  return (
    <div className={`grid gap-2 py-3 ${langs.length >= 3 ? "sm:grid-cols-3" : langs.length === 2 ? "sm:grid-cols-2" : ""}`}>
      {langs.map((l, i) => (
        <label key={l} className="block">
          <span className="mb-1 block text-xs text-white/55">{i === 0 ? `${label} — ${LANG_LABEL[l]}` : LANG_LABEL[l]}</span>
          <input
            dir={l === "en" ? "ltr" : "rtl"}
            lang={l}
            className={field}
            maxLength={maxLength}
            value={value[l] ?? ""}
            placeholder={placeholder[l] ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, [l]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}

function OutfitSelect({ value, disabled, onChange }: { value: RazanOutfit; disabled?: boolean; onChange: (v: RazanOutfit) => void }) {
  return (
    <select className={field} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as RazanOutfit)} aria-label={tr("اللبس", "Outfit")}>
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
      <h2 className="font-semibold">{tr("كيف بيستعملوها", "How people use her")}</h2>
      <p className="mt-0.5 text-xs text-white/50">{tr("أرقام بس، بدون أي معلومات عن الزبائن.", "Numbers only, without any customer details.")}</p>
      {q.isLoading ? (
        <p className="mt-3 text-sm text-white/50">{tr("جاري التحميل…", "Loading…")}</p>
      ) : (
        <>
          <div className="mt-3 flex h-16 items-end gap-[3px]" aria-label={tr("فتحوا لوحتها بآخر 30 يوم", "Opened her panel in the last 30 days")}>
            {days.map((d) => (
              <span key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-t bg-accent-400/60" style={{ height: `${Math.max(4, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.25 }} />
            ))}
          </div>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-xs text-white/50">
                <th className="py-1 text-start font-normal">&nbsp;</th>
                <th className="py-1 text-end font-normal">{tr("آخر 7 أيام", "Last 7 days")}</th>
                <th className="py-1 text-end font-normal">{tr("آخر 30 يوم", "Last 30 days")}</th>
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
                <td className="py-1.5">{tr("طلبات بمساعدة رزان", "Orders with Razan's help")}</td>
                <td className="py-1.5 text-end tabular-nums">{q.data?.helpOrders.d7 ?? 0}</td>
                <td className="py-1.5 text-end tabular-nums">{q.data?.helpOrders.d30 ?? 0}</td>
              </tr>
            </tbody>
          </table>
          {q.data?.quiz && Object.keys(q.data.quiz).length ? (
            <div className="mt-4" data-testid="razan-quiz-totals">
              <h3 className="text-sm font-medium">{tr("شو بيختاروا بـ«رزان بتختارلك» (آخر 30 يوم)", "What they choose in “Razan picks for you” (last 30 days)")}</h3>
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
