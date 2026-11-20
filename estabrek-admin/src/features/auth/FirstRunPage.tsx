// The first setup of a store with no one in it (a client's new copy; backend lib/firstRun.ts): instead of a
// sign-in, the owner makes their account here, with the store's one-time setup code (in the link they were
// given, or in the server's log) and a password of their own, and is signed in. The store's own setup
// (what it sells, its theme, its name) comes next. Once the store has someone, this page sends to the sign-in.
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../api/http";
import * as AuthAPI from "../../api/auth.api";
import { authStore } from "../../store/auth.store";
import { say } from "../../studio/say";

const PASSWORD_MIN = 10;

/** Why the server refused, in the page's words. */
function refusal(e: unknown): { text: string; signIn?: boolean } {
  const error = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
  if (error === "SETUP_CODE_WRONG") return { text: say("كود الإعداد مش صح: انسخه متل ما هو، من الرابط أو من سجل السيرفر.|The setup code isn't right: copy it as it is, from the link or the server's log.|קוד ההגדרה לא נכון: העתיקו אותו כמו שהוא, מהקישור או מהיומן של השרת.") };
  if (error === "FIRST_RUN_DONE") return { text: say("هالمتجر صار إله صاحب.|This store already has its owner.|לחנות הזו כבר יש בעלים."), signIn: true };
  if (error === "RATE_LIMITED" || (e as { response?: { status?: number } })?.response?.status === 429) return { text: say("محاولات كتير: استنى دقيقة وجرّب كمان مرة.|Too many tries: wait a minute and try again.|יותר מדי ניסיונות: חכו דקה ונסו שוב.") };
  return { text: getApiErrorMessage(e) };
}

export default function FirstRunPage() {
  const nav = useNavigate();
  const location = useLocation();
  const status = useQuery({ queryKey: ["first-run"], queryFn: AuthAPI.firstRunStatus, retry: false });
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get("code") ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<{ text: string; signIn?: boolean } | null>(null);

  // A store that has someone signs in.
  useEffect(() => {
    if (status.data && !status.data.needed) nav("/login", { replace: true });
  }, [status.data, nav]);

  const short = password.length > 0 && password.length < PASSWORD_MIN;
  const differ = again.length > 0 && again !== password;
  const can = code.trim().length >= 8 && name.trim() && /\S+@\S+\.\S+/.test(email.trim()) && password.length >= PASSWORD_MIN && again === password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can || busy) return;
    setBusy(true);
    setFailed(null);
    try {
      const ok = await AuthAPI.firstRunClaim({ code: code.trim(), name: name.trim(), email: email.trim(), password });
      authStore.syncFromStorage();
      if (ok?.admin) authStore.setAdmin(ok.admin as never);
      // On to the store's own setup.
      nav("/setup", { replace: true });
    } catch (err) {
      setFailed(refusal(err));
    } finally {
      setBusy(false);
    }
  };

  if (status.isLoading) return <Spinner size="lg" />;

  return (
    <div className="relative w-full max-w-md animate-fade-in-up" data-testid="first-run">
      <div className="relative glass rounded-3xl p-8 shadow-elevated">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">{say("أهلاً بمتجرك الجديد|Welcome to your new store|ברוכים הבאים לחנות החדשה שלך")}</h1>
          <p className="mt-2 text-sm text-white/60">
            {say(
              "هالمتجر لسا ما فيه حدا. اعمل حساب صاحب المتجر بإيميلك وكلمة سر من عندك، وبعدها بنجهّز متجرك خطوة خطوة.|This store has no one in it yet. Make the owner's account with your email and a password of your own, then we set your store up step by step.|בחנות הזו עדיין אין אף אחד. צרו את החשבון של הבעלים עם האימייל שלכם וסיסמה משלכם, ואז נגדיר את החנות צעד אחר צעד.",
            )}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Input label={say("كود الإعداد|The setup code|קוד ההגדרה")} value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="one-time-code" dir="ltr" data-testid="first-run-code" />
            <p className="mt-1 text-xs text-white/50" data-testid="first-run-code-from">
              {status.data?.codeFrom === "link"
                ? say("موجود بالرابط اللي وصلك مع المتجر.|It is in the link you were given with the store.|הוא נמצא בקישור שקיבלתם עם החנות.")
                : (
                    <>
                      {say("مكتوب بسجل السيرفر (Railway ← الخدمة ← Logs)، بسطر بيبلّش بـ|It is in the server's log (Railway → the service → Logs), on a line starting with|הוא כתוב ביומן של השרת (Railway ← השירות ← Logs), בשורה שמתחילה ב-")} <bdi dir="ltr">[first-run]</bdi>
                    </>
                  )}
            </p>
          </div>
          <Input label={say("اسمك|Your name|השם שלך")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" data-testid="first-run-name" />
          <Input label={say("إيميلك|Your email|האימייל שלך")} value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" dir="ltr" placeholder="you@example.com" data-testid="first-run-email" />
          <Input
            label={say("كلمة السر|Password|סיסמה")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            autoComplete="new-password"
            error={short ? say(`عالأقل ${PASSWORD_MIN} حروف|At least ${PASSWORD_MIN} characters|לפחות ${PASSWORD_MIN} תווים`) : undefined}
            rightIcon={
              <button type="button" onClick={() => setShow(!show)} className="text-white/40 transition-colors hover:text-white/60">
                {show ? say("إخفاء|Hide|הסתרה") : say("إظهار|Show|הצגה")}
              </button>
            }
            data-testid="first-run-password"
          />
          <Input
            label={say("كلمة السر مرة تانية|The password again|הסיסמה שוב")}
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            type={show ? "text" : "password"}
            autoComplete="new-password"
            error={differ ? say("مش متل الأولى|It doesn't match|לא תואמת")  : undefined}
            data-testid="first-run-again"
          />

          {failed ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert" data-testid="first-run-failed">
              {failed.text}{" "}
              {failed.signIn ? (
                <Link to="/login" className="underline">
                  {say("سجّل دخول|Sign in|כניסה")}
                </Link>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" variant="primary" className="h-12 w-full" disabled={!can} isLoading={busy} data-testid="first-run-submit">
            {say("اعمل حسابي وكمّل|Make my account and go on|צרו את החשבון שלי והמשיכו")}
          </Button>
          <p className="text-center text-xs text-white/40">
            {say("كلمة السر بتضل عندك بس: ما بتمرق من إيد حدا.|The password stays yours alone: it passes through no one's hands.|הסיסמה נשארת רק שלכם: היא לא עוברת דרך אף אחד.")}
          </p>
        </form>
      </div>
    </div>
  );
}
