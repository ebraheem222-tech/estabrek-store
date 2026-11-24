// الإشعارات (the shop as an app, part two; backend lib/push.ts): a notification on the phones of the shoppers who
// said yes. The owner writes it (a title, a few words, where it opens in the shop, a picture), in the store's other
// languages too if they like, picks who gets it (everyone, the signed-in customers, one customer), sees it as a phone
// shows it and how many phones it will reach, and sends it. It goes in the background; the history below says, for
// each one, how many it reached and how many opened it. Off until الإعدادات → التطبيق → الإشعارات is on.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { MediaUrlInput } from "../../components/media/MediaUrlInput";
import { getPush, pushCount, sendPush, type PushAudience } from "../../api/push.api";
import { getApiErrorMessage } from "../../api/http";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../hooks/useAuth";
import { formatDateTime } from "../../lib/format";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import { AUDIENCE_WORDS, EMPTY_DRAFT, FROM_WORDS, LIMITS, STATUS_WORDS, countsParts, draftProblems, reachText, sendBodyOf, type Lang, type PushDraft } from "./pushText";

const field = "h-10 w-full rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";
const LANG_NAMES: Record<Lang, string> = { ar: "العربية|Arabic|ערבית", en: "الإنجليزية|English|אנגלית", he: "العبرية|Hebrew|עברית" };
const DEVICES = [
  ["android", "أندرويد|Android|אנדרואיד"],
  ["iphone", "آيفون|iPhone|אייפון"],
  ["desktop", "كمبيوتر|Computer|מחשב"],
] as const;

/** The store's languages, the main one first (الإعدادات → اللغات). */
function storeLangs(header: unknown): { main: Lang; others: Lang[] } {
  const l = ((header && typeof header === "object" ? header : {}) as { languages?: { enabled?: string[]; default?: string } }).languages;
  const ok = (v: unknown): v is Lang => v === "ar" || v === "en" || v === "he";
  const main = ok(l?.default) ? l!.default : "ar";
  return { main: main as Lang, others: (l?.enabled ?? []).filter(ok).filter((x) => x !== main) };
}

/** The notification as a phone shows it: the store's icon and name, the title, the words, the picture. */
function PhonePreview({ draft, name }: { draft: PushDraft; name: string }) {
  return (
    <div className="w-full max-w-[320px] rounded-[22px] border border-white/10 bg-black/40 p-3 shadow-xl" data-testid="push-preview">
      <div className="flex items-center gap-2 text-[11px] text-white/50">
        <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-rose-700 text-[9px] font-bold text-white">{(name || "S").charAt(0)}</span>
        <span className="truncate">{name}</span>
        <span className="ms-auto">{say("هلّق|now|עכשיו")}</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-white" data-testid="push-preview-title">
        {draft.title.trim() || say("العنوان|The title|הכותרת")}
      </div>
      {draft.body.trim() ? <div className="mt-0.5 text-[13px] leading-5 text-white/75" data-testid="push-preview-body">{draft.body.trim()}</div> : null}
      {/^https:\/\//.test(draft.image.trim()) ? <img src={draft.image.trim()} alt="" className="mt-2 max-h-40 w-full rounded-xl object-cover" /> : null}
    </div>
  );
}

export default function PushPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canSend = hasPermission("outbox:write");
  const settings = useSettings();
  const push = useQuery({ queryKey: ["push"], queryFn: getPush, refetchInterval: (q) => (q.state.data?.messages.some((m) => m.status !== "DONE") ? 3000 : false) });
  const [draft, setDraft] = useState<PushDraft>(EMPTY_DRAFT);
  const [asking, setAsking] = useState(false);
  const [email, setEmail] = useState("");
  const langs = useMemo(() => storeLangs(settings.data?.header), [settings.data]);
  const name = (settings.data?.header as { identity?: { shortName?: Record<string, string> } } | undefined)?.identity?.shortName?.[langs.main] || settings.data?.siteName || "";

  // The customer's email settles before it is looked up.
  useEffect(() => {
    const t = setTimeout(() => setEmail(draft.email.trim().toLowerCase()), 400);
    return () => clearTimeout(t);
  }, [draft.email]);
  const reach = useQuery({
    queryKey: ["push-count", draft.audience, draft.audience === "customer" ? email : ""],
    queryFn: () => pushCount(draft.audience, draft.audience === "customer" ? email : undefined),
    enabled: Boolean(push.data?.on) && (draft.audience !== "customer" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    retry: false,
  });

  const send = useMutation({
    mutationFn: () => sendPush(sendBodyOf(draft, langs.main)),
    onSuccess: async (out) => {
      toast.success(say("انبعت الإشعار، وعم يوصل بالخلفية|The notification is on its way|ההתראה בדרך"), { description: say(reachText(out.message.total)) });
      setDraft(EMPTY_DRAFT);
      setAsking(false);
      await qc.invalidateQueries({ queryKey: ["push"] });
    },
    onError: (e) => {
      setAsking(false);
      toast.error(say("ما انبعت|It wasn't sent|לא נשלח"), { description: getApiErrorMessage(e) });
    },
  });

  if (push.isLoading) return <div className="p-6 text-sm text-white/60">{say("عم بحمّل…|Loading…|טוען…")}</div>;
  if (push.isError || !push.data) return <div className="p-6 text-sm text-red-300">{getApiErrorMessage(push.error)}</div>;
  const data = push.data;
  const problems = draftProblems(draft);
  const set = (patch: Partial<PushDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setWords = (lang: Lang, patch: Partial<{ title: string; body: string }>) =>
    setDraft((d) => ({ ...d, words: { ...d.words, [lang]: { title: "", body: "", ...d.words[lang], ...patch } } }));
  const phones = reach.data?.phones ?? null;
  const unknown = draft.audience === "customer" && reach.isError;

  return (
    <div className="space-y-5" data-testid="push-page">
      <div>
        <h1 className="text-xl font-semibold">{say("الإشعارات|Notifications|התראות")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-white/60">
          {say(
            "إشعار على تلفون كل زبون قبل يوصله شي من المتجر: عرض، قطعة رجعت، تذكير. بيوصل حتى لو المتجر مسكّر عنده، وبيفتح الصفحة اللي بتختارها.|A notification on the phone of every shopper who said yes: an offer, a piece back in stock, a reminder. It arrives even with the shop closed on their phone, and opens the page you choose.|התראה בטלפון של כל לקוח שהסכים: מבצע, פריט שחזר, תזכורת. היא מגיעה גם כשהחנות סגורה אצלו, ופותחת את העמוד שבוחרים.",
          )}
        </p>
      </div>

      {!data.on ? (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100" data-testid="push-off">
          {say("الإشعارات موقّفة. بتشتغل من الإعدادات ← التطبيق ← الإشعارات (والتطبيق شغّال).|Notifications are off. They're switched on in Settings → the app → Notifications (with the app on).|ההתראות כבויות. מפעילים אותן בהגדרות ← האפליקציה ← התראות (כשהאפליקציה פעילה).")}{" "}
          <Link
            to="/admin/settings"
            className="underline"
            onClick={() => {
              try {
                sessionStorage.setItem("estabrek_settings_tab", "app");
              } catch {
                /* storage blocked */
              }
            }}
            data-testid="push-off-settings"
          >
            {say("افتح الإعدادات|Open the settings|פתיחת ההגדרות")}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3" data-testid="push-phones">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">{say("تلفونات قبلت|Phones that said yes|טלפונים שהסכימו")}</div>
          <div className="mt-1 text-2xl font-semibold" data-testid="push-phones-all">{data.phones.all}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">{say("منهم زباين مسجّلين|Of them, signed-in customers|מתוכם לקוחות מחוברים")}</div>
          <div className="mt-1 text-2xl font-semibold" data-testid="push-phones-customers">{data.phones.customers}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          {DEVICES.map(([k, label]) => (
            <div key={k} className="flex justify-between text-white/70">
              <span>{say(label)}</span>
              <span>{data.phones.byDevice[k] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {data.on && canSend ? (
        <Card>
          <CardHeader title={say("إشعار جديد|A new notification|התראה חדשה")} />
          <CardContent>
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <div className="space-y-3">
                <label className="block text-xs text-white/60">
                  {say("العنوان|The title|הכותרת")} <span className="text-white/40">{draft.title.length}/{LIMITS.title}</span>
                  <input className={`${field} mt-1`} value={draft.title} maxLength={LIMITS.title} onChange={(e) => set({ title: e.target.value })} placeholder={say("خصم ٢٠٪ اليوم بس|20% off, today only|‏20% הנחה, רק היום")} data-testid="push-title" />
                </label>
                <label className="block text-xs text-white/60">
                  {say("النص|The text|הטקסט")} <span className="text-white/40">{draft.body.length}/{LIMITS.body}</span>
                  <textarea className="mt-1 min-h-[72px] w-full rounded-xl border border-white/10 bg-surface-925 p-3 text-sm text-white" value={draft.body} maxLength={LIMITS.body} onChange={(e) => set({ body: e.target.value })} data-testid="push-body" />
                </label>
                <label className="block text-xs text-white/60">
                  {say("وين بيفتح بالمتجر (فاضي = الصفحة الرئيسية)|Where it opens in the shop (empty = the home page)|איפה זה נפתח בחנות (ריק = דף הבית)")}
                  <input className={`${field} mt-1`} dir="ltr" value={draft.url} maxLength={LIMITS.url} onChange={(e) => set({ url: e.target.value })} placeholder="/shop" data-testid="push-url" />
                </label>
                <MediaUrlInput label={say("صورة كبيرة (اختياري؛ أندرويد وكمبيوتر)|A big picture (optional; Android and computers)|תמונה גדולה (לא חובה; אנדרואיד ומחשב)")} value={draft.image} onChange={(v) => set({ image: v })} />
                {langs.others.length ? (
                  <details className="rounded-xl border border-white/10 p-3" data-testid="push-langs">
                    <summary className="cursor-pointer text-sm">{say("نفس الإشعار بلغات المتجر التانية|The same notification in the store's other languages|אותה התראה בשפות האחרות של החנות")}</summary>
                    <p className="mt-2 text-xs text-white/50">{say("كل تلفون بياخده بلغته. فاضي = الكلام الأساسي.|Each phone gets it in its own language. Empty = the main words.|כל טלפון מקבל אותה בשפה שלו. ריק = הנוסח הראשי.")}</p>
                    {langs.others.map((l) => (
                      <div key={l} className="mt-3 space-y-2">
                        <div className="text-xs font-semibold text-white/70">{say(LANG_NAMES[l])}</div>
                        <input className={field} dir={l === "en" ? "ltr" : "rtl"} maxLength={LIMITS.title} value={draft.words[l]?.title ?? ""} onChange={(e) => setWords(l, { title: e.target.value })} placeholder={say("العنوان|The title|הכותרת")} data-testid={`push-title-${l}`} />
                        <input className={field} dir={l === "en" ? "ltr" : "rtl"} maxLength={LIMITS.body} value={draft.words[l]?.body ?? ""} onChange={(e) => setWords(l, { body: e.target.value })} placeholder={say("النص|The text|הטקסט")} data-testid={`push-body-${l}`} />
                      </div>
                    ))}
                  </details>
                ) : null}
                <fieldset className="space-y-2">
                  <legend className="text-xs text-white/60">{say("لمين|Who gets it|למי")}</legend>
                  {(["all", "customers", "customer"] as PushAudience[]).map((a) => (
                    <label key={a} className="flex items-center gap-2 text-sm">
                      <input type="radio" name="push-audience" checked={draft.audience === a} onChange={() => set({ audience: a })} data-testid={`push-audience-${a}`} />
                      {say(AUDIENCE_WORDS[a])}
                    </label>
                  ))}
                  {draft.audience === "customer" ? (
                    <input className={field} dir="ltr" type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} placeholder="name@example.com" data-testid="push-email" />
                  ) : null}
                </fieldset>
                <p className={`text-sm ${unknown ? "text-red-300" : "text-white/70"}`} data-testid="push-reach">
                  {unknown ? say("ما في زبون بهالإيميل|No customer with this email|אין לקוח עם האימייל הזה") : phones == null ? " " : say(reachText(phones))}
                </p>
                {problems.length && draft.title ? (
                  <ul className="list-disc ps-5 text-xs text-amber-200" data-testid="push-problems">
                    {problems.map((p) => (
                      <li key={p}>{say(p)}</li>
                    ))}
                  </ul>
                ) : null}
                <Button variant="primary" disabled={problems.length > 0 || unknown || !phones || send.isPending} isLoading={send.isPending} onClick={() => setAsking(true)} data-testid="push-send">
                  {say("ابعت|Send|שליחה")}
                </Button>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="text-[11px] text-white/50">{say("على التلفون|On the phone|בטלפון")}</div>
                <PhonePreview draft={draft} name={name} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={say("اللي انبعت|Sent|נשלחו")} />
        <CardContent>
          {data.messages.length ? (
            <ul className="divide-y divide-white/10" data-testid="push-history">
              {data.messages.map((m) => (
                <li key={m.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3" data-testid="push-history-row">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{m.title}</div>
                    {m.body ? <div className="truncate text-xs text-white/60">{m.body}</div> : null}
                    <div className="mt-1 text-xs text-white/50">{countsParts(m).map((p) => say(p)).join(" · ")}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                    <Badge variant={m.status === "DONE" ? "success" : "warning"}>{say(STATUS_WORDS[m.status])}</Badge>
                    <span>{say(AUDIENCE_WORDS[m.audience])}</span>
                    <span>{say(FROM_WORDS[m.from])}</span>
                    <span>{formatDateTime(m.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/50" data-testid="push-history-empty">{say("ما انبعت ولا إشعار لهلّق.|No notification sent yet.|עדיין לא נשלחה אף התראה.")}</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={asking}
        variant="warning"
        title={say("تبعت الإشعار؟|Send the notification?|לשלוח את ההתראה?")}
        message={`${say(reachText(phones ?? 0))}. ${say("بعد ما ينبعت ما بيرجع.|Once sent it can't be taken back.|אחרי שליחה אי אפשר לבטל.")}`}
        confirmText={say("إيه، ابعت|Yes, send|כן, לשלוח")}
        cancelText={say("لأ|No|לא")}
        isLoading={send.isPending}
        onConfirm={() => send.mutate()}
        onClose={() => setAsking(false)}
      />
    </div>
  );
}
