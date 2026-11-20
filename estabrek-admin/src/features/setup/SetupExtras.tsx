// Two steps of the store's setup (SetupWizard): the shop's assistant (on or off, and the personality it speaks as)
// and where the store's pictures go (its own Cloudinary account, else the server's disk).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { PersonaPicker } from "../../components/PersonaPicker";
import { getApiErrorMessage } from "../../api/http";
import * as CloudAPI from "../../api/cloudinary.api";
import { say } from "../../studio/say";

export function AssistantStep({ on, onToggle, persona, onPersona, industry }: { on: boolean; onToggle: (v: boolean) => void; persona: string; onPersona: (id: string) => void; industry: string | null }) {
  return (
    <section className="mx-auto max-w-3xl space-y-5" data-testid="setup-assistant">
      <h1 className="text-2xl font-bold">{say("مساعد المتجر|The store's assistant|העוזר של החנות")}</h1>
      <p className="text-sm leading-7 text-white/60">
        {say(
          "مساعد بيرد على زباينك بالمتجر: بيسألهم شو بدهم، وبيقترح منتجات، وبيجاوب عن الشحن والمقاسات. اختار شخصية بيحكي فيها (اسمها ووجهها وطريقتها)، أو خلّيه المساعد العادي، أو طفّيه.|An assistant that answers your shoppers in the store: it asks what they want, suggests products and answers about shipping and sizes. Pick a personality for it to speak as (its name, face and manner), keep the plain assistant, or switch it off.|עוזר שעונה לקונים בחנות: שואל מה הם רוצים, מציע מוצרים ועונה על משלוחים ומידות. בחרו דמות שבה הוא ידבר (שם, פנים וסגנון), השאירו את העוזר הרגיל, או כבו אותו.",
        )}
      </p>
      <label className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} className="h-5 w-5" data-testid="setup-assistant-on" />
        <span>
          <span className="block text-sm font-medium">{say("شغّل المساعد بالمتجر|Turn the assistant on in the store|הפעלת העוזר בחנות")}</span>
          <span className="block text-xs text-white/50">{say("بتقدر تغيّره بعدين من الإعدادات ← الدردشة.|You can change it later in Settings → chat.|אפשר לשנות אחר כך בהגדרות ← צ'אט.")}</span>
        </span>
      </label>
      {on ? <PersonaPicker value={persona} onChange={onPersona} industry={industry} testid="setup-persona" /> : null}
    </section>
  );
}

const field = "w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-accent-400";

/** Why the server refused the account, in the page's words. */
function refusal(e: unknown): string {
  const data = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  if (data?.error === "CLOUDINARY_REFUSED") return `${say("Cloudinary رفض الحساب|Cloudinary refused the account|Cloudinary דחה את החשבון")}${data.message?.includes(": ") ? `: ${data.message.split(": ").slice(1).join(": ")}` : ""}. ${say("تأكد من الاسم والمفتاحين، منسوخين كاملين.|Check the name and both keys, copied whole.|בדקו את השם ואת שני המפתחות, מועתקים במלואם.")}`;
  if (data?.error === "OWNER_ONLY") return say("صاحب المتجر بس بيقدر يغيّر وين بتروح الصور.|Only the store's owner changes where pictures go.|רק בעלי החנות משנים לאן התמונות הולכות.");
  if (data?.error === "VALIDATION_ERROR" || data?.error === "BAD_REQUEST") return say("الاسم حروف وأرقام، والمفتاح أرقام، والسر حروف وأرقام: انسخهم متل ما هم.|The name is letters and digits, the key digits, the secret letters and digits: copy them as they are.|השם אותיות וספרות, המפתח ספרות, הסוד אותיות וספרות: העתיקו אותם כמו שהם.");
  return getApiErrorMessage(e);
}

export function MediaStep() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cloudinary-account"], queryFn: CloudAPI.getCloudinaryAccount, retry: false });
  const [cloudName, setCloudName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => CloudAPI.saveCloudinaryAccount({ cloudName: cloudName.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() }),
    onMutate: () => setFailed(null),
    onSuccess: (data) => {
      qc.setQueryData(["cloudinary-account"], data);
      setApiSecret("");
    },
    onError: (e) => setFailed(refusal(e)),
  });
  const acc = q.data;
  const can = cloudName.trim() && /^\d{6,24}$/.test(apiKey.trim()) && apiSecret.trim().length >= 16;
  return (
    <section className="mx-auto max-w-2xl space-y-5" data-testid="setup-media">
      <h1 className="text-2xl font-bold">{say("وين بتنحفظ الصور|Where the pictures are kept|איפה התמונות נשמרות")}</h1>
      <p className="text-sm leading-7 text-white/60">
        {say(
          "صور المنتجات والفيديوهات بتنحفظ بحساب Cloudinary تبع متجرك: بتطلع بسرعة وبالحجم المناسب لكل جهاز. الحساب المجاني بيكفي للبداية. بدونه بتنحفظ على السيرفر نفسه، وعلى Railway بتضيع مع كل نشر جديد.|Product pictures and videos are kept in your store's own Cloudinary account: they load fast and at the right size for each device. The free plan is enough to start. Without it they are kept on the server itself, and on Railway they are lost with each new deploy.|תמונות המוצרים והסרטונים נשמרים בחשבון Cloudinary של החנות שלך: הם נטענים מהר ובגודל המתאים לכל מכשיר. התוכנית החינמית מספיקה להתחלה. בלעדיו הם נשמרים בשרת עצמו, וב-Railway הם הולכים לאיבוד בכל פריסה חדשה.",
        )}
      </p>
      {q.isLoading ? (
        <Spinner />
      ) : acc && acc.source !== "none" ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm" data-testid="setup-media-connected" data-source={acc.source}>
          <div className="font-medium text-emerald-200">
            {say("موصول بـ Cloudinary:|Connected to Cloudinary:|מחובר ל-Cloudinary:")} <bdi dir="ltr">{acc.cloudName}</bdi>
          </div>
          <div className="mt-1 text-xs text-white/60">
            {acc.source === "env"
              ? say("من إعدادات السيرفر نفسه.|From the server's own settings.|מההגדרות של השרת עצמו.")
              : say(`المفتاح بيخلص بـ ${acc.apiKeyEnd}. السر محفوظ مقفول وما بينعرض.|The key ends in ${acc.apiKeyEnd}. The secret is kept sealed and never shown.|המפתח מסתיים ב-${acc.apiKeyEnd}. הסוד שמור נעול ולא מוצג.`)}
          </div>
        </div>
      ) : (
        <form
          className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (can && !save.isPending) save.mutate();
          }}
          data-testid="setup-media-form"
        >
          <p className="text-xs leading-6 text-white/60">
            {say(
              "من cloudinary.com اعمل حساب (ببلاش)، وبعدين من الصفحة الرئيسية Dashboard أو Settings ← API Keys انسخ هدول التلاتة. ممكن تتخطى هالخطوة وتعملها بعدين من الإعدادات.|Make a free account at cloudinary.com, then copy these three from its Dashboard or Settings → API Keys. You can skip this step and do it later from Settings.|צרו חשבון חינמי ב-cloudinary.com, ואז העתיקו את שלושת אלה מה-Dashboard או מ-Settings ← API Keys. אפשר לדלג על השלב הזה ולעשות אותו אחר כך מההגדרות.",
            )}
          </p>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">Cloud name</span>
            <input className={field} dir="ltr" value={cloudName} onChange={(e) => setCloudName(e.target.value)} autoComplete="off" data-testid="setup-media-cloud" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">API key</span>
            <input className={field} dir="ltr" value={apiKey} onChange={(e) => setApiKey(e.target.value)} inputMode="numeric" autoComplete="off" data-testid="setup-media-key" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">API secret</span>
            <input className={field} dir="ltr" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} autoComplete="new-password" data-testid="setup-media-secret" />
          </label>
          {failed ? (
            <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert" data-testid="setup-media-failed">
              {failed}
            </p>
          ) : null}
          <Button type="submit" variant="secondary" size="sm" disabled={!can} isLoading={save.isPending} data-testid="setup-media-save">
            {say("جرّب ووصّل|Try it and connect|לנסות ולחבר")}
          </Button>
        </form>
      )}
    </section>
  );
}
