// «وين بيشتغل الذكاء الاصطناعي»: OpenAI (its key on the server), or the store's own model server:
// any server that speaks OpenAI's chat language (Ollama, LM Studio, vLLM, llama.cpp, a rented GPU
// box) with an open model such as ALLaM, Karnak or Jais. Try sends one small question before saving.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { getApiErrorMessage } from "../../api/http";
import * as AiAPI from "../../api/ai.api";
import type { AiServerIn, AiServerKind, AiServerView } from "../../api/ai.api";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm disabled:opacity-60";
const pill = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-accent-400/70 bg-accent-500/20" : "border-white/10 text-white/70 hover:border-white/25"}`;

/** Open models that write Arabic well and may be used in a store that is sold on (Apache 2.0, checked 2026-11-21). */
const MODELS: Array<{ name: string; size: string; note: string }> = [
  { name: "ALLaM-7B-Instruct", size: "7B", note: say("سعودي، عربي وإنجليزي — أول تجربة|Saudi, Arabic and English — try it first|סעודי, ערבית ואנגלית — לנסות ראשון") },
  { name: "Karnak-6B", size: "6B", note: say("عربي وإنجليزي|Arabic and English|ערבית ואנגלית") },
  { name: "Jais 13B chat", size: "13B", note: say("عربي أقوى، بدها جهاز أقوى|Stronger Arabic, needs a stronger machine|ערבית חזקה יותר, דורש מחשב חזק יותר") },
];

/**
 * Search by meaning with the model now: how many products are ready, and a run that makes the rest
 * (after the search model changes; until a product is done, it is found by its words).
 */
function SearchIndexPanel({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ai-search-index"], queryFn: AiAPI.searchIndex, refetchInterval: (query) => (query.state.data?.run.running ? 1500 : false) });
  const start = useMutation({
    mutationFn: AiAPI.startSearchIndex,
    onSuccess: (d) => qc.setQueryData(["ai-search-index"], d),
    onError: (e) => toast.error(say("ما بلّش|It didn't start|לא התחיל"), { description: getApiErrorMessage(e) }),
  });
  const d = q.data;
  if (!d?.model) return null;
  const running = d.run.running;
  const left = Math.max(0, d.total - d.indexed);
  return (
    <div className="rounded-xl border border-white/10 p-3 text-xs" data-testid="ai-search-index">
      <p className="font-medium">{say("البحث بالمعنى عن المنتجات|Search by meaning|חיפוש לפי משמעות")}</p>
      <p className="mt-1 text-white/60" dir="auto">
        {say(`${d.indexed} من ${d.total} قطعة جاهزة للبحث بـ|${d.indexed} of ${d.total} pieces ready for search with|${d.indexed} מתוך ${d.total} פריטים מוכנים לחיפוש עם`)} <span dir="ltr" className="font-mono">{d.model.replace(/^own:/, "")}</span>
      </p>
      {running ? (
        <p className="mt-1 text-white/70" data-testid="ai-search-index-running">
          {say(`عم يجهّز… ${d.run.done} جاهزة${d.run.failed ? `، ${d.run.failed} ما زبطت` : ""}|Preparing… ${d.run.done} done${d.run.failed ? `, ${d.run.failed} failed` : ""}|מכין… ${d.run.done} מוכנים${d.run.failed ? `, ${d.run.failed} נכשלו` : ""}`)}
        </p>
      ) : d.run.lastError ? (
        <p className="mt-1 text-amber-200" data-testid="ai-search-index-error">{say("وقف:|Stopped:|נעצר:")} {d.run.lastError}</p>
      ) : null}
      {left > 0 && !running && canWrite ? (
        <Button size="sm" variant="secondary" className="mt-2" isLoading={start.isPending} onClick={() => start.mutate()} data-testid="ai-search-index-start">
          {say(`جهّز الـ ${left} الباقيين|Prepare the other ${left}|להכין את ${left} הנותרים`)}
        </Button>
      ) : null}
    </div>
  );
}

export function AiServerCard({ server, canWrite, openaiReady }: { server: AiServerView; canWrite: boolean; openaiReady: boolean }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<AiServerKind>(server.kind);
  const [url, setUrl] = useState(server.url);
  const [model, setModel] = useState(server.model);
  const [vision, setVision] = useState(server.vision);
  const [visionModel, setVisionModel] = useState(server.visionModel ?? "");
  const [embedModel, setEmbedModel] = useState(server.embedModel ?? "");
  const [compact, setCompact] = useState(server.compact ?? false);
  // undefined = the saved key stays; "" typed = nothing new; null = take it away.
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const body = (): AiServerIn => ({ kind, url: url.trim(), model: model.trim(), vision, visionModel: visionModel.trim(), embedModel: embedModel.trim(), compact, ...(key === undefined || key === "" ? {} : { key }) });
  const dirty =
    kind !== server.kind ||
    url.trim() !== server.url ||
    model.trim() !== server.model ||
    vision !== server.vision ||
    visionModel.trim() !== (server.visionModel ?? "") ||
    embedModel.trim() !== (server.embedModel ?? "") ||
    compact !== (server.compact ?? false) ||
    (key !== undefined && key !== "");

  const save = useMutation({
    mutationFn: () => AiAPI.saveAiServer(body()),
    onSuccess: () => {
      toast.success(say("انحفظ|Saved|נשמר"));
      setKey(undefined);
      qc.invalidateQueries({ queryKey: ["ai"] });
      qc.invalidateQueries({ queryKey: ["features"] });
      qc.invalidateQueries({ queryKey: ["ai-search-index"] });
    },
    onError: (e) => toast.error(say("ما انحفظ|Not saved|לא נשמר"), { description: getApiErrorMessage(e) }),
  });
  const trial = useMutation({ mutationFn: () => AiAPI.tryAiServer(body()) });

  return (
    <section className={box} data-testid="ai-server">
      <h2 className="font-semibold">{say("وين بيشتغل الذكاء الاصطناعي|Where the AI runs|איפה ה־AI רץ")}</h2>
      <p className="mt-1 text-xs leading-6 text-white/55">
        {say(
          "يا OpenAI (بمفتاح على السيرفر، بتدفع حسب الاستعمال)، يا سيرفر نماذج إلك عليه نموذج مفتوح (ALLaM، Karnak، Jais…) — Ollama أو LM Studio أو vLLM أو أي سيرفر بيحكي بلغة OpenAI.|Either OpenAI (a key on the server, paid per use), or a model server of your own running an open model (ALLaM, Karnak, Jais…) — Ollama, LM Studio, vLLM or any server that speaks OpenAI's language.|או OpenAI (מפתח בשרת, תשלום לפי שימוש), או שרת מודלים משלך עם מודל פתוח (ALLaM, Karnak, Jais…) — Ollama, LM Studio, vLLM או כל שרת שמדבר בשפה של OpenAI.",
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={say("وين بيشتغل|Where it runs|איפה זה רץ")}>
        <button type="button" role="radio" aria-checked={kind === "openai"} className={pill(kind === "openai")} disabled={!canWrite} onClick={() => setKind("openai")} data-testid="ai-server-openai">
          OpenAI {openaiReady ? "✓" : ""}
        </button>
        <button type="button" role="radio" aria-checked={kind === "own"} className={pill(kind === "own")} disabled={!canWrite} onClick={() => setKind("own")} data-testid="ai-server-own">
          {say("سيرفر نماذج خاص|My own model server|שרת מודלים משלי")}
        </button>
      </div>

      {kind === "openai" ? (
        <p className="mt-3 text-xs leading-6 text-white/55">
          {openaiReady
            ? say("مفتاح OpenAI موجود على السيرفر ✓|OpenAI's key is on the server ✓|המפתח של OpenAI נמצא בשרת ✓")
            : say("ضيف متغيّر OPENAI_API_KEY بـ Railway وأعد تشغيل السيرفر.|Add the OPENAI_API_KEY variable on Railway and restart the server.|יש להוסיף את המשתנה OPENAI_API_KEY ב־Railway ולהפעיל את השרת מחדש.")}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-xs text-white/60">
            {say("عنوان السيرفر|The server's address|כתובת השרת")}
            <input className={`${field} mt-1`} dir="ltr" value={url} maxLength={300} disabled={!canWrite} onChange={(e) => setUrl(e.target.value)} placeholder="https://models.example.com/v1" aria-label={say("عنوان السيرفر|The server's address|כתובת השרת")} data-testid="ai-server-url" />
          </label>
          <label className="block text-xs text-white/60">
            {say("اسم النموذج على السيرفر|The model's name on the server|שם המודל בשרת")}
            <input className={`${field} mt-1`} dir="ltr" value={model} maxLength={120} disabled={!canWrite} onChange={(e) => setModel(e.target.value)} placeholder="allam-7b-instruct" aria-label={say("اسم النموذج على السيرفر|The model's name on the server|שם המודל בשרת")} data-testid="ai-server-model" />
          </label>
          <label className="block text-xs text-white/60">
            {say("مفتاح السيرفر (إذا إله مفتاح — Ollama و LM Studio ما بدهم)|The server's key (if it has one — Ollama and LM Studio don't)|מפתח השרת (אם יש — ל־Ollama ול־LM Studio אין)")}
            <div className="mt-1 flex gap-2">
              <input
                className={field}
                dir="ltr"
                type="password"
                autoComplete="off"
                value={key ?? ""}
                maxLength={4000}
                disabled={!canWrite || key === null}
                onChange={(e) => setKey(e.target.value)}
                aria-label={say("مفتاح السيرفر|The server's key|מפתח השרת")}
                placeholder={key === null ? say("رح ينشال المفتاح|The key will be taken away|המפתח יוסר") : server.hasKey ? say("محفوظ — اتركه فاضي ليضل|Kept — leave it empty to keep it|שמור — להשאיר ריק כדי לשמור") : ""}
                data-testid="ai-server-key"
              />
              {server.hasKey && key !== null ? (
                <Button size="sm" variant="secondary" disabled={!canWrite} onClick={() => setKey(null)}>{say("شيل المفتاح|Remove the key|הסרת המפתח")}</Button>
              ) : null}
            </div>
          </label>
          <label className="flex items-start gap-2 text-xs text-white/70">
            <input type="checkbox" className="mt-0.5" checked={vision} disabled={!canWrite} onChange={(e) => setVision(e.target.checked)} data-testid="ai-server-vision" />
            <span>
              {say(
                "نموذج الكتابة نفسه بيقرأ الصور (مثل Qwen-VL). أو حط نموذج صور لحاله تحت. بدون الاتنين: «اكتبيلي من الصور» ووصف الصور بيضلّوا على OpenAI إذا مفتاحه موجود.|The words model itself reads pictures (like Qwen-VL). Or set a pictures model of its own below. Without either, the product writer from photos and pictures' descriptions stay on OpenAI when its key is there.|מודל הכתיבה עצמו קורא תמונות (כמו Qwen-VL). או להגדיר מודל תמונות נפרד למטה. בלי אף אחד מהם, כתיבת מוצר מתמונות ותיאורי תמונות נשארים ב־OpenAI אם יש לו מפתח.",
              )}
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-white/70">
            <input type="checkbox" className="mt-0.5" checked={compact} disabled={!canWrite} onChange={(e) => setCompact(e.target.checked)} data-testid="ai-server-compact" />
            <span>
              {say(
                "نموذج صغير (8B وأقل): بنبعتله طلبات أقصر، قطع أقل ومحادثة أقصر، عشان يرد أسرع وما يضيع.|A small model (8B and under): shorter prompts, fewer pieces and a shorter talk, so it answers faster and doesn't get lost.|מודל קטן (8B ומטה): בקשות קצרות יותר, פחות פריטים ושיחה קצרה יותר, כדי שיענה מהר יותר ולא יתבלבל.",
              )}
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/60">
              {say("نموذج الصور (اختياري)|Pictures model (optional)|מודל תמונות (לא חובה)")}
              <input className={`${field} mt-1`} dir="ltr" value={visionModel} maxLength={120} disabled={!canWrite} onChange={(e) => setVisionModel(e.target.value)} placeholder="qwen3-vl:4b" aria-label={say("نموذج الصور|Pictures model|מודל תמונות")} data-testid="ai-server-vision-model" />
              <span className="mt-1 block text-[11px] leading-5 text-white/45">{say("نموذج تاني على نفس السيرفر بيقرأ الصور («اكتبيلي من الصور»، وصف الصور).|Another model on the same server that reads pictures (product writer, pictures' descriptions).|מודל נוסף באותו שרת שקורא תמונות (כתיבת מוצר, תיאורי תמונות).")}</span>
            </label>
            <label className="block text-xs text-white/60">
              {say("نموذج البحث (اختياري)|Search model (optional)|מודל חיפוש (לא חובה)")}
              <input className={`${field} mt-1`} dir="ltr" value={embedModel} maxLength={120} disabled={!canWrite} onChange={(e) => setEmbedModel(e.target.value)} placeholder="bge-m3" aria-label={say("نموذج البحث|Search model|מודל חיפוש")} data-testid="ai-server-embed-model" />
              <span className="mt-1 block text-[11px] leading-5 text-white/45">{say("للبحث بالمعنى عن المنتجات («بدي إشي للعرس»)، مثل BGE-M3 (رخصة MIT).|For search by meaning («something for a wedding»), e.g. BGE-M3 (MIT licence).|לחיפוש לפי משמעות («משהו לחתונה»), למשל BGE-M3 (רישיון MIT).")}</span>
            </label>
          </div>
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] leading-5 text-white/55">
            {say(
              "استوديو الصور (مشاهد جديدة للقطعة) بيضل على OpenAI بس: النماذج النصية ما بتعمل صور. بالسيرفر الحقيقي العنوان لازم يبلّش بـ https:// ويكون على الإنترنت — لو النموذج على كمبيوترك، افتحله رابط https (مثل Cloudflare Tunnel).|The photo studio (new scenes for a piece) stays on OpenAI only: text models don't make pictures. On the live server the address must start with https:// and be on the internet — for a model on your own computer, give it an https link (e.g. Cloudflare Tunnel).|סטודיו התמונות נשאר ב־OpenAI בלבד: מודלי טקסט לא יוצרים תמונות. בשרת החי הכתובת חייבת להתחיל ב־https:// ולהיות באינטרנט — למודל במחשב שלך צריך קישור https (למשל Cloudflare Tunnel).",
            )}
          </p>
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-xs font-medium">{say("نماذج عربية مجانية بتنفع تبيعها مع المتجر (رخصة Apache 2.0)|Free Arabic models you may sell the store with (Apache 2.0 licence)|מודלים ערביים חינמיים שמותר למכור יחד עם החנות (רישיון Apache 2.0)")}</p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-white/60">
              {MODELS.map((m) => (
                <li key={m.name}>
                  <button type="button" className="font-mono text-white/80 underline-offset-2 hover:underline disabled:no-underline" dir="ltr" disabled={!canWrite} onClick={() => setModel(m.name.toLowerCase().replace(/\s+/g, "-"))}>
                    {m.name}
                  </button>{" "}
                  · {m.size} · {m.note}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] leading-5 text-white/45">
              {say(
                "النموذج 7B بدّه كرت شاشة ليرد بسرعة بالشات. اسم النموذج لازم يكون نفس الاسم على سيرفرك.|A 7B model needs a graphics card to answer quickly in the chat. The model's name must be the same as on your server.|מודל 7B צריך כרטיס מסך כדי לענות מהר בצ׳אט. שם המודל חייב להיות זהה לשם בשרת שלך.",
              )}
            </p>
          </div>
          <SearchIndexPanel canWrite={canWrite} />
          {trial.data ? (
            trial.data.ok ? (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs leading-6 text-emerald-100" data-testid="ai-server-try-ok">
                {say(`ردّ بـ ${(trial.data.ms / 1000).toFixed(1)} ثانية:|Answered in ${(trial.data.ms / 1000).toFixed(1)} s:|ענה תוך ${(trial.data.ms / 1000).toFixed(1)} שניות:`)} «{trial.data.reply}»
                {trial.data.search ? (
                  <span className="block" data-testid="ai-server-try-search">
                    {trial.data.search.ok
                      ? say(`نموذج البحث شغّال ✓ (${trial.data.search.size} رقم لكل نص)|Search model works ✓ (${trial.data.search.size} numbers per text)|מודל החיפוש עובד ✓ (${trial.data.search.size} מספרים לכל טקסט)`)
                      : `${say("نموذج البحث:|Search model:|מודל החיפוש:")} ${trial.data.search.error}`}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs leading-6 text-red-100" data-testid="ai-server-try-failed">{trial.data.error}</p>
            )
          ) : trial.isError ? (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs leading-6 text-red-100" data-testid="ai-server-try-failed">{getApiErrorMessage(trial.error)}</p>
          ) : null}
        </div>
      )}

      {canWrite ? (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {kind === "own" ? (
            <Button variant="secondary" isLoading={trial.isPending} disabled={!url.trim() || !model.trim()} onClick={() => trial.mutate()} data-testid="ai-server-try">
              {say("جرّب|Try it|לנסות")}
            </Button>
          ) : null}
          <Button variant="primary" isLoading={save.isPending} disabled={!dirty || (kind === "own" && (!url.trim() || !model.trim()))} onClick={() => save.mutate()} data-testid="ai-server-save">
            {say("احفظ|Save|שמירה")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
