// الذكاء الاصطناعي: every AI feature with its own switch (off until the
// OpenAI key is on the server), what each one costs in calls, a daily ceiling
// for shoppers, and «اسأل عن متجرك».
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import * as AiAPI from "../../api/ai.api";
import type { AiFeature, AiSettings } from "../../api/ai.api";
import { AI_TEXT } from "./aiText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";

export default function AiPage() {
  const q = useQuery({ queryKey: ["ai"], queryFn: AiAPI.getAi });
  return (
    <div dir="rtl" className="space-y-4 pb-24" data-testid="ai-page">
      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}><Spinner /> جاري التحميل…</div>
      ) : q.isError || !q.data ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>
      ) : (
        <>
          <Editor key={JSON.stringify(q.data.settings)} data={q.data} />
          {q.data.settings.adminAsk && q.data.keyReady ? <Ask /> : null}
        </>
      )}
    </div>
  );
}

function Editor({ data }: { data: Awaited<ReturnType<typeof AiAPI.getAi>> }) {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const [s, setS] = useState<AiSettings>(data.settings);
  const dirty = JSON.stringify(s) !== JSON.stringify(data.settings);
  const save = useMutation({
    mutationFn: () => AiAPI.saveAi(s),
    onSuccess: () => { toast.success("انحفظ"); qc.invalidateQueries({ queryKey: ["ai"] }); qc.invalidateQueries({ queryKey: ["features"] }); },
    onError: (e) => toast.error("ما انحفظ", { description: getApiErrorMessage(e) }),
  });
  const groups: Array<{ title: string; keys: AiFeature[] }> = [
    { title: "للمنتجات", keys: ["productWriter", "photoStudio"] },
    { title: "للزبونات بالمتجر", keys: ["smartSearch", "shopTheLook", "sizeAdvice", "reviewSummary"] },
    { title: "إلك", keys: ["adminAsk", "replySuggest", "orderFlags"] },
  ];
  return (
    <>
      <section className={box}>
        <h1 className="text-lg font-semibold">الذكاء الاصطناعي ✨</h1>
        <p className="mt-1 text-sm text-white/60">كل ميزة إلها زر لحالها، ومطفية لحد ما تشغّلها. كل إشي بيطلع من الذكاء الاصطناعي بيتشيّك على بيانات متجرك قبل ما يبيّن.</p>
        {data.keyReady ? (
          <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100" data-testid="ai-key-ok">المفتاح مضبوط ✓</p>
        ) : (
          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-6 text-amber-100" data-testid="ai-key-missing">
            لسا ما في مفتاح OpenAI على السيرفر، فالميزات مطفية. ضيف بـ Railway متغيّر <b dir="ltr">OPENAI_API_KEY</b> وأعد تشغيل السيرفر، وبعدها بتقدر تشغّلها من هون.
            <br />«طلبات بدها انتباه» ما بتحتاج مفتاح.
          </div>
        )}
      </section>

      {groups.map((g) => (
        <section key={g.title} className={box}>
          <h2 className="font-semibold">{g.title}</h2>
          <div className="mt-2 divide-y divide-white/[0.06]">
            {g.keys.map((k) => {
              const needsKey = k !== "orderFlags";
              const locked = needsKey && !data.keyReady && !s[k];
              const used = data.usage30[k] ?? 0;
              return (
                <div key={k} className="flex flex-wrap items-start justify-between gap-3 py-3" data-testid={`ai-${k}`}>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{AI_TEXT[k].title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-white/55">{AI_TEXT[k].hint}</span>
                    {k === "photoStudio" && !data.cloudinaryReady ? <span className="mt-1 block text-[11px] text-amber-200">محتاج Cloudinary مضبوط لحفظ الصور الجديدة.</span> : null}
                    {needsKey && used ? <span className="mt-1 block text-[11px] text-white/40">{used} طلب للذكاء الاصطناعي بآخر 30 يوم</span> : null}
                  </div>
                  <ToggleSwitch checked={s[k]} label={AI_TEXT[k].title} disabled={!canWrite || locked} onChange={(v) => setS((x) => ({ ...x, [k]: v }))} />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className={box}>
        <h2 className="font-semibold">سقف يومي للزبونات</h2>
        <p className="mt-1 text-xs text-white/55">أكثر عدد طلبات ذكاء اصطناعي من الزبونات باليوم (البحث، المقاس، اللبسة، التقييمات). لما يوصل، الميزات بتسكت لبكرا — عشان الفاتورة ما تكبر فجأة.</p>
        <input type="number" dir="ltr" min={10} max={20000} className={`${field} mt-2 w-32`} value={s.dailyLimit} disabled={!canWrite} onChange={(e) => setS((x) => ({ ...x, dailyLimit: Math.max(10, Math.min(20000, Math.round(Number(e.target.value) || 10))) }))} aria-label="سقف يومي" />
      </section>

      {canWrite && dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface-950/95 p-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-3xl justify-end">
            <Button variant="primary" isLoading={save.isPending} onClick={() => save.mutate()}>حفظ</Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

const EXAMPLES = ["شو أكثر قطعة بعنا هالشهر؟", "كم طلب إجانا هالأسبوع ومن وين؟", "شو القطع اللي قرّبت تخلص؟", "مقارنة بالشهر الماضي؟"];

function Ask() {
  const [question, setQuestion] = useState("");
  const ask = useMutation({ mutationFn: (q: string) => AiAPI.askShop(q), onError: (e) => toast.error("ما زبط", { description: getApiErrorMessage(e) }) });
  const go = (q: string) => { const t = q.trim(); if (t.length >= 3) { setQuestion(t); ask.mutate(t); } };
  return (
    <section className={box} data-testid="ai-ask">
      <h2 className="font-semibold">اسأل عن متجرك</h2>
      <p className="mt-1 text-xs text-white/55">الجواب من أرقام متجرك (آخر 30 يوم، المخزون، الطلبات الخاصة) — إذا الجواب مش بالأرقام، بيحكيلك.</p>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); go(question); }}>
        <input className={field} value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} placeholder="اكتب سؤالك…" aria-label="سؤالك عن المتجر" />
        <Button type="submit" variant="primary" isLoading={ask.isPending}>اسأل</Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((x) => <button key={x} type="button" className="rounded-full border border-white/10 px-2.5 py-1 text-xs hover:border-white/25" onClick={() => go(x)}>{x}</button>)}
      </div>
      {ask.data ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="ai-answer">
          <p className="whitespace-pre-wrap text-sm leading-7">{ask.data.answer}</p>
          {ask.data.figures.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ask.data.figures.map((f) => (
                <div key={f.label} className="rounded-lg border border-white/10 p-2">
                  <span className="block text-[11px] text-white/50">{f.label}</span>
                  <span className="block text-base font-semibold tabular-nums">{f.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
