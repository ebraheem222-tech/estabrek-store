// الزبائن → الدخول بحساب Google (stage 2, item 3; backend lib/googleSignIn.ts, header.signIn.google): shoppers sign in
// with Google's own button on the account page, beside the email code. It needs the store's own Google client ID (free,
// from Google Cloud): the card says how to make one, and keeps it off until there is one that is one.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { getSettings, updateSettings } from "../../api/settings.api";
import { getApiErrorMessage } from "../../api/http";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../hooks/useAuth";
import { shopOrigin } from "./signInSettings";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";

const box = "rounded-2xl border border-white/10 bg-white/5 p-5";
const field = "h-10 w-full rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";
/** A Google OAuth web client's ID, as the server checks it. */
export const CLIENT_ID = /^[0-9]{6,30}-[a-z0-9]{8,64}\.apps\.googleusercontent\.com$/;

export type GoogleSetting = { enabled: boolean; clientId: string };
export function googleSettingOf(header: unknown): GoogleSetting {
  const g = (header as { signIn?: { google?: { enabled?: unknown; clientId?: unknown } } } | null)?.signIn?.google;
  return { enabled: g?.enabled === true, clientId: typeof g?.clientId === "string" ? g.clientId : "" };
}


export function GoogleSignInCard({ accountsOn }: { accountsOn: boolean }) {
  const qc = useQueryClient();
  const settings = useSettings();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const saved = useMemo(() => (settings.data ? googleSettingOf(settings.data.header) : null), [settings.data]);
  const [draft, setDraft] = useState<GoogleSetting>({ enabled: false, clientId: "" });
  const key = JSON.stringify(saved);
  useEffect(() => {
    if (saved) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = useMutation({
    mutationFn: async (next: GoogleSetting) => {
      // The header as it is now (another card may have saved meanwhile), with this part replaced.
      const current = await getSettings();
      const header = (current.header ?? {}) as Record<string, unknown>;
      const signIn = (header.signIn && typeof header.signIn === "object" ? header.signIn : {}) as Record<string, unknown>;
      return updateSettings({ header: { ...header, signIn: { ...signIn, google: { enabled: next.enabled, clientId: next.clientId.trim() } } } });
    },
    onSuccess: async () => {
      toast.success(say("انحفظ|Saved|נשמר"));
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(say("ما انحفظ|It wasn't saved|לא נשמר"), { description: getApiErrorMessage(e) }),
  });
  if (!saved) return null;
  const idOk = CLIENT_ID.test(draft.clientId.trim());
  const dirty = JSON.stringify({ ...draft, clientId: draft.clientId.trim() }) !== JSON.stringify(saved);
  const on = saved.enabled && CLIENT_ID.test(saved.clientId);

  return (
    <div className={box} data-testid="google-sign-in-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{say("الدخول بحساب Google|Sign in with Google|כניסה עם Google")}</h2>
          <p className="mt-1 max-w-3xl text-sm text-white/60">
            {say(
              "زر «المتابعة بـ Google» بصفحة «حسابي» بالمتجر، جنب الدخول بكود على الإيميل. اللي عنده حساب بنفس الإيميل بيفوت على نفس الحساب. ببلاش، بس بدّه client ID للمتجر من Google.|A “Continue with Google” button on the shop's “My account” page, beside signing in with an email code. Someone with an account under the same email gets that same account. Free, but it needs the store's own client ID from Google.|כפתור «המשך עם Google» בעמוד «החשבון שלי» בחנות, לצד הכניסה עם קוד באימייל. מי שיש לו חשבון עם אותו אימייל נכנס לאותו חשבון. בחינם, אבל צריך client ID של החנות מ-Google.",
            )}
          </p>
        </div>
        <span className={`text-xs ${on ? "text-emerald-300" : "text-white/50"}`} data-testid="google-sign-in-state">
          {on ? say("شغّال بالمتجر|On in the shop|פעיל בחנות") : say("موقّف|Off|כבוי")}
        </span>
      </div>
      {!accountsOn ? <p className="mt-2 text-xs text-amber-200/80">{say("بيشتغل بس وحسابات الزباين شغّالة (فوق).|It works only with customer accounts on (above).|זה עובד רק כשחשבונות הלקוחות פעילים (למעלה).")}</p> : null}
      <ol className="mt-3 list-decimal space-y-1 ps-5 text-xs leading-5 text-white/60" data-testid="google-sign-in-steps">
        <li>{say("بـ Google Cloud Console: «APIs & Services» ← «Credentials» ← «Create credentials» ← «OAuth client ID»، والنوع «Web application».|In Google Cloud Console: “APIs & Services” → “Credentials” → “Create credentials” → “OAuth client ID”, of type “Web application”.|ב-Google Cloud Console: «APIs & Services» ← «Credentials» ← «Create credentials» ← «OAuth client ID», מסוג «Web application».")}</li>
        <li>
          {say("بـ «Authorized JavaScript origins» حطّ عنوان المتجر:|Under “Authorized JavaScript origins”, add the shop's address:|ב-«Authorized JavaScript origins» להוסיף את כתובת החנות:")}{" "}
          <bdi dir="ltr" className="font-mono text-white/80" data-testid="google-sign-in-origin">
            {shopOrigin()}
          </bdi>
        </li>
        <li>{say("بشاشة «OAuth consent screen» حطّ اسم المتجر وإيميل، وانشرها.|On the “OAuth consent screen”, give the store's name and an email, and publish it.|במסך «OAuth consent screen» לתת את שם החנות ואימייל, ולפרסם.")}</li>
        <li>{say("انسخ الـ Client ID لهون. ما في سر بينحط: الـ ID ظاهر بصفحة المتجر.|Copy the Client ID here. No secret goes in: the ID is visible in the shop's page.|להעתיק לכאן את ה-Client ID. אין סוד: ה-ID גלוי בעמוד החנות.")}</li>
      </ol>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block text-xs text-white/60">
          Client ID
          <input className={`${field} mt-1`} dir="ltr" value={draft.clientId} maxLength={120} placeholder="1234567890-abc123.apps.googleusercontent.com" disabled={!canWrite} onChange={(e) => setDraft({ ...draft, clientId: e.target.value.trim() })} data-testid="google-sign-in-client" />
        </label>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.enabled} disabled={!canWrite || (!draft.enabled && !idOk)} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} data-testid="google-sign-in-enabled" />
          {say("شغّله|Switch on|הפעלה")}
        </label>
      </div>
      {draft.clientId && !idOk ? (
        <p className="mt-1 text-xs text-amber-200" data-testid="google-sign-in-bad">
          {say("هاد مش Client ID: بيخلص بـ .apps.googleusercontent.com|That isn't a Client ID: it ends in .apps.googleusercontent.com|זה לא Client ID: הוא מסתיים ב-.apps.googleusercontent.com")}
        </p>
      ) : null}
      <div className="mt-3">
        <Button size="sm" disabled={!canWrite || !dirty || (draft.enabled && !idOk)} isLoading={save.isPending} onClick={() => save.mutate(draft)} data-testid="google-sign-in-save">
          {say("احفظ|Save|שמירה")}
        </Button>
      </div>
    </div>
  );
}
