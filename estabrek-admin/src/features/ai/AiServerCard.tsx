// «وين بيشتغل الذكاء الاصطناعي»: OpenAI (its key on the server), or the store's own model server:
// any server that speaks OpenAI's chat language (Ollama, LM Studio, vLLM, llama.cpp, a rented GPU
// box) with an open model such as ALLaM, Karnak or Jais. Try sends one small question before saving.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

export function AiServerCard({ server, canWrite, openaiReady }: { server: AiServerView; canWrite: boolean; openaiReady: boolean }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<AiServerKind>(server.kind);
  const [url, setUrl] = useState(server.url);
  const [model, setModel] = useState(server.model);
  const [vision, setVision] = useState(server.vision);
  // undefined = the saved key stays; "" typed = nothing new; null = take it away.
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const body = (): AiServerIn => ({ kind, url: url.trim(), model: model.trim(), vision, ...(key === undefined || key === "" ? {} : { key }) });
  const dirty = kind !== server.kind || url.trim() !== server.url || model.trim() !== server.model || vision !== server.vision || (key !== undefined && key !== "");

  const save = useMutation({
    mutationFn: () => AiAPI.saveAiServer(body()),
    onSuccess: () => {
      toast.success(say("انحفظ|Saved|נשמר"));
      setKey(undefined);
      qc.invalidateQueries({ queryKey: ["ai"] });
      qc.invalidateQueries({ queryKey: ["features"] });
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
                "النموذج بيقرأ الصور (مثل Qwen-VL أو LLaVA). بدون هيك: «اكتبيلي من الصور» ووصف الصور بيضلّوا على OpenAI إذا مفتاحه موجود.|The model reads pictures (like Qwen-VL or LLaVA). Otherwise the product writer from photos and pictures' descriptions stay on OpenAI when its key is there.|המודל קורא תמונות (כמו Qwen-VL או LLaVA). אחרת, כתיבת מוצר מתמונות ותיאורי תמונות נשארים ב־OpenAI אם יש לו מפתח.",
              )}
            </span>
          </label>
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
          {trial.data ? (
            trial.data.ok ? (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs leading-6 text-emerald-100" data-testid="ai-server-try-ok">
                {say(`ردّ بـ ${(trial.data.ms / 1000).toFixed(1)} ثانية:|Answered in ${(trial.data.ms / 1000).toFixed(1)} s:|ענה תוך ${(trial.data.ms / 1000).toFixed(1)} שניות:`)} «{trial.data.reply}»
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
