// «وصّل متجرك»: where a copy's admin opens when it was put up on its host before anything was linked to it
// (config/env.ts: server.from "none"; paintispassion.pages.dev showed a sign-in to no server). It walks the
// owner through the database (Neon) → the server (Railway, given every variable it needs, its secrets made
// here) → this admin (the server's address, checked, kept in this browser) → the owner's account (/welcome,
// with the setup code made here) → the store's own setup (/setup: the shop, the pictures, the rest), and
// says how to put the address in the host so every browser has it. An admin built with an address shows
// what that address answers instead, and how to fix it: it can't be pointed elsewhere from here.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { keptServer, server as builtServer, type ServerFrom } from "../../config/env";
import { say } from "../../studio/say";
import {
  SERVER_FOLDER,
  asLines,
  checkServer,
  databaseAddress,
  dropTabSecrets,
  forgetServer,
  keepServer,
  pagesProject,
  serverVariables,
  tabSecrets,
  type ServerCheck,
} from "./serverLink";

type Props = {
  /** Where the admin's server came from, and its address (config/env.ts). */
  from?: ServerFrom;
  address?: string;
  /** This admin's own address. */
  origin?: string;
  /** Opens a page with the admin loaded again, so it speaks to the server it was just given. */
  go?: (to: string) => void;
  fetcher?: typeof fetch;
};

const NEON = "https://console.neon.tech/app/projects";
const RAILWAY = "https://railway.com/new";

function Copy({ text, testid, disabled }: { text: string; testid: string; disabled?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80 transition hover:bg-white/10 disabled:opacity-40"
      data-testid={testid}
    >
      {done ? say("انتسخ ✓|Copied ✓|הועתק ✓") : say("انسخ|Copy|העתקה")}
    </button>
  );
}

/** A value to paste somewhere, as it is. */
function Value({ text, testid }: { text: string; testid: string }) {
  return (
    <span className="mt-1 flex items-center gap-2 rounded-lg bg-black/30 px-3 py-2">
      <code className="min-w-0 flex-1 truncate text-xs text-emerald-200" dir="ltr" data-testid={testid}>
        {text}
      </code>
      <Copy text={text} testid={`${testid}-copy`} />
    </span>
  );
}

function Step({ n, title, children, testid }: { n: number; title: string; children: ReactNode; testid: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5" data-testid={testid}>
      <h2 className="mb-3 flex items-center gap-3 text-base font-semibold text-white">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-sm text-accent-200">{n}</span>
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/70">{children}</div>
    </section>
  );
}

function Outside({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-accent-300 underline underline-offset-2 hover:text-accent-200">
      {children}
    </a>
  );
}

/** What an address answered, in the page's words. */
function Answer({ check, origin, built }: { check: ServerCheck; origin: string; built: boolean }) {
  if (check.kind === "store") {
    return (
      <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200" data-testid="connect-answer-ok">
        {say("السيرفر شغّال وبيرد.|The server is up and answering.|השרת פועל ועונה.")}{" "}
        <Link to={check.needed ? "/welcome" : "/login"} className="underline">
          {check.needed ? say("اعمل حساب صاحب المتجر|Make the owner's account|צרו את החשבון של הבעלים") : say("سجّل دخول|Sign in|כניסה")}
        </Link>
      </p>
    );
  }
  if (check.kind === "other") {
    return (
      <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-100" role="alert" data-testid="connect-answer-other">
        {say(
          "هالعنوان ردّ، بس مش سيرفر متجر.|This address answered, but it isn't a store's server.|הכתובת הזו ענתה, אבל זה לא שרת של חנות.",
        )}{" "}
        {built
          ? say(
              "صلّح VITE_API_BASE_URL بإعدادات الموقع (Cloudflare ← Settings ← Variables and Secrets) لعنوان السيرفر من Railway ← Networking، وبعدين Retry deployment.|Fix VITE_API_BASE_URL in the site's settings (Cloudflare → Settings → Variables and Secrets) to the server's address from Railway → Networking, then Retry deployment.|תקנו את VITE_API_BASE_URL בהגדרות האתר (Cloudflare ← Settings ← Variables and Secrets) לכתובת השרת מ-Railway ← Networking, ואז Retry deployment.",
            )
          : say(
              `تأكد إنو الـ Root Directory بالخدمة هو ${SERVER_FOLDER}، وإنك نسخت العنوان من Settings ← Networking.|Make sure the service's Root Directory is ${SERVER_FOLDER}, and that you copied the address from Settings → Networking.|ודאו שה-Root Directory של השירות הוא ${SERVER_FOLDER}, ושהעתקתם את הכתובת מ-Settings ← Networking.`,
            )}
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-200" role="alert" data-testid="connect-answer-silent">
      <p>
        {say(
          "السيرفر ما ردّ. إذا لسا عم يبني (أول مرة بتاخد كم دقيقة)، استنى شوي وجرّب كمان مرة. وإذا خلص بناؤه، تأكد إنو متغيّر CORS_ORIGINS فيه عنوان هاللوحة:|The server didn't answer. If it is still building (the first time takes a few minutes), wait a little and try again. If it has finished, make sure its CORS_ORIGINS variable has this admin's address:|השרת לא ענה. אם הוא עדיין נבנה (בפעם הראשונה זה לוקח כמה דקות), חכו קצת ונסו שוב. אם הבנייה הסתיימה, ודאו שהמשתנה CORS_ORIGINS שלו כולל את הכתובת של הפאנל הזה:",
        )}
      </p>
      <Value text={origin} testid="connect-origin" />
    </div>
  );
}

export default function ConnectPage({ from = builtServer.from, address = builtServer.address, origin = window.location.origin, go = (to) => window.location.assign(to), fetcher }: Props) {
  const built = from === "build" || from === "local";
  const project = pagesProject(new URL(origin).host);
  const cloudflare = project ? `https://dash.cloudflare.com/?to=/:account/pages/view/${project}` : "https://dash.cloudflare.com/";

  // An admin built with an address: what it answers.
  const [answer, setAnswer] = useState<ServerCheck | null>(null);
  useEffect(() => {
    if (!built && from !== "browser") return;
    let live = true;
    void checkServer(address, fetcher).then((c) => live && setAnswer(c));
    return () => {
      live = false;
    };
  }, [built, from, address, fetcher]);

  const secrets = useMemo(() => tabSecrets(), []);
  const [pasted, setPasted] = useState("");
  const database = databaseAddress(pasted);
  const lines = asLines(serverVariables(database ?? "", origin, secrets));

  const [written, setWritten] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState<ServerCheck | null>(null);
  const [badAddress, setBadAddress] = useState(false);

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    const api = keptServer(written);
    setBadAddress(!api);
    setTried(null);
    if (!api || busy) return;
    setBusy(true);
    const check = await checkServer(api, fetcher);
    setBusy(false);
    if (check.kind !== "store") return setTried(check);
    keepServer(api);
    // On to the owner's account, with the code this page gave the server (a store that has its owner signs in).
    if (check.needed) {
      const to = `/welcome?code=${encodeURIComponent(secrets.SETUP_CODE)}`;
      dropTabSecrets();
      return go(to);
    }
    go("/login");
  };

  const pin = (api: string) => (
    <>
      <p>
        {say(
          "السيرفر محفوظ بهالمتصفح بس. ليفتح لكل حدا ومن كل جهاز، حطّه بإعدادات هالموقع:|The server is kept in this browser only. For it to open for everyone on every device, put it in this site's settings:|השרת שמור רק בדפדפן הזה. כדי שייפתח לכולם מכל מכשיר, הכניסו אותו להגדרות האתר:",
        )}{" "}
        <Outside href={cloudflare}>Cloudflare</Outside> ← {project ?? say("الموقع|the site|האתר")} ← Settings ← Variables and Secrets ← Add (Production):
      </p>
      <Value text="VITE_API_BASE_URL" testid="connect-pin-name" />
      <Value text={api} testid="connect-pin-value" />
      <p>{say("وبعدين Deployments ← آخر نشر ← Retry deployment.|Then Deployments → the latest one → Retry deployment.|ואז Deployments ← הפריסה האחרונה ← Retry deployment.")}</p>
    </>
  );

  return (
    <div className="relative w-full max-w-2xl animate-fade-in-up pb-16" data-testid="connect">
      <div className="relative glass rounded-3xl p-6 shadow-elevated sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">
            {built ? say("السيرفر تبع اللوحة|This admin's server|השרת של הפאנל") : say("وصّل متجرك|Link your store|חברו את החנות שלכם")}
          </h1>
          {built ? null : (
            <p className="mt-2 text-sm text-white/60">
              {say(
                "هالموقع لسا مش موصول بشي. خلّينا نوصّله خطوة خطوة: قاعدة البيانات (Neon)، بعدين السيرفر (Railway)، بعدين حسابك، وبعدها المتجر نفسه (Vercel) والصور وكل الباقي من إعداد المتجر.|This site isn't linked to anything yet. Let's link it step by step: the database (Neon), then the server (Railway), then your account, and after it the shop itself (Vercel), the pictures and the rest from the store's setup.|האתר הזה עדיין לא מחובר לשום דבר. בואו נחבר אותו צעד אחר צעד: מסד הנתונים (Neon), אחר כך השרת (Railway), אחר כך החשבון שלכם, ואחריו החנות עצמה (Vercel), התמונות וכל השאר מההגדרה של החנות.",
              )}
            </p>
          )}
        </div>

        {built ? (
          <div className="space-y-4 text-sm text-white/70" data-testid="connect-built">
            <p>{say("هاللوحة مبنية على هالسيرفر:|This admin is built with this server:|הפאנל הזה בנוי עם השרת הזה:")}</p>
            <Value text={address} testid="connect-built-address" />
            {answer ? <Answer check={answer} origin={origin} built /> : <p className="text-white/40">{say("عم نسأله…|Asking it…|שואלים אותו…")}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {from === "browser" ? (
              <section className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 text-sm text-white/70" data-testid="connect-kept">
                <p className="font-semibold text-white">{say("موصول بهالسيرفر:|Linked to this server:|מחובר לשרת הזה:")}</p>
                <Value text={address} testid="connect-kept-address" />
                {answer ? <Answer check={answer} origin={origin} built={false} /> : null}
                {pin(address)}
                <button
                  type="button"
                  className="text-xs text-white/50 underline hover:text-white/70"
                  onClick={() => {
                    forgetServer();
                    go("/connect");
                  }}
                  data-testid="connect-forget"
                >
                  {say("افصله عن هالمتصفح|Unlink it from this browser|נתקו אותו מהדפדפן הזה")}
                </button>
              </section>
            ) : (
              <>
            <Step n={1} title={say("قاعدة البيانات: Neon|The database: Neon|מסד הנתונים: Neon")} testid="connect-step-neon">
              <p>
                {say("افتح|Open|פתחו את")} <Outside href={NEON}>Neon</Outside>{" "}
                {say(
                  "واعمل مشروع جديد (أي اسم، والمنطقة الأقرب لزباينك). بعدين اكبس Connect وانسخ رابط الاتصال.|and make a new project (any name, the region nearest your customers). Then press Connect and copy the connection string.|וצרו פרויקט חדש (כל שם, האזור הקרוב ללקוחות שלכם). אחר כך לחצו Connect והעתיקו את מחרוזת החיבור.",
                )}
              </p>
              <Input
                label={say("رابط قاعدة البيانات|The database's connection string|מחרוזת החיבור של מסד הנתונים")}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="postgresql://…neon.tech/neondb?sslmode=require"
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                error={pasted.trim() && !database ? say("هاد مش رابط قاعدة بيانات: لازم يبلّش بـ postgresql://|This isn't a database's string: it starts with postgresql://|זו לא מחרוזת של מסד נתונים: היא מתחילה ב-postgresql://") : undefined}
                data-testid="connect-database"
              />
              <p className="text-xs text-white/45">
                {say(
                  "الرابط بيضل بهالصفحة بس: ما بينحفظ وما بيروح لأي مكان. إنت بتحطّه بـ Railway بالخطوة الجاية.|The string stays on this page only: it isn't kept or sent anywhere. You put it in Railway in the next step.|המחרוזת נשארת רק בעמוד הזה: היא לא נשמרת ולא נשלחת לשום מקום. אתם מכניסים אותה ל-Railway בצעד הבא.",
                )}
              </p>
            </Step>

            <Step n={2} title={say("السيرفر: Railway|The server: Railway|השרת: Railway")} testid="connect-step-railway">
              <ol className="list-decimal space-y-3 ps-5">
                <li>
                  {say("افتح|Open|פתחו את")} <Outside href={RAILWAY}>Railway</Outside> ← New Project ← GitHub Repository{" "}
                  {say("واختار مستودع المتجر.|and pick the store's repository.|ובחרו את המאגר של החנות.")}
                </li>
                <li>
                  {say("بالخدمة: Settings ← Source ← Root Directory:|In the service: Settings → Source → Root Directory:|בשירות: Settings ← Source ← Root Directory:")}
                  <Value text={SERVER_FOLDER} testid="connect-folder" />
                </li>
                <li>
                  {say(
                    "Variables ← Raw Editor: الصق هالأسطر كلها واكبس Update Variables. الأسرار انعملت هون جديدة لهالسيرفر.|Variables → Raw Editor: paste all these lines and press Update Variables. The secrets were made here, new for this server.|Variables ← Raw Editor: הדביקו את כל השורות האלה ולחצו Update Variables. הסודות נוצרו כאן, חדשים לשרת הזה.",
                  )}
                  <div className="mt-1 rounded-lg bg-black/30 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-white/45">
                        {database ? say("جاهزين للّصق|Ready to paste|מוכנות להדבקה") : say("حط رابط قاعدة البيانات فوق أول.|Put the database's string above first.|הכניסו קודם את מחרוזת מסד הנתונים למעלה.")}
                      </span>
                      <Copy text={lines} testid="connect-variables-copy" disabled={!database} />
                    </div>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-emerald-200/90" dir="ltr" data-testid="connect-variables">
                      {lines}
                    </pre>
                  </div>
                </li>
                <li>
                  {say(
                    "Settings ← Networking ← Generate Domain، وانسخ العنوان اللي بيعطيك ياه. أول بناء بياخد كم دقيقة، والسيرفر بيجهّز قاعدة البيانات لحاله.|Settings → Networking → Generate Domain, and copy the address it gives. The first build takes a few minutes, and the server readies the database by itself.|Settings ← Networking ← Generate Domain, והעתיקו את הכתובת שמתקבלת. הבנייה הראשונה לוקחת כמה דקות, והשרת מכין את מסד הנתונים בעצמו.",
                  )}
                </li>
              </ol>
            </Step>

            <Step n={3} title={say("وصّل اللوحة بالسيرفر|Link this admin to the server|חברו את הפאנל לשרת")} testid="connect-step-link">
              <form onSubmit={connect} className="space-y-3">
                <Input
                  label={say("عنوان السيرفر|The server's address|כתובת השרת")}
                  value={written}
                  onChange={(e) => setWritten(e.target.value)}
                  placeholder="my-store.up.railway.app"
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                  error={badAddress ? say("هاد مش عنوان: انسخه متل ما هو من Railway ← Networking.|That isn't an address: copy it as it is from Railway → Networking.|זו לא כתובת: העתיקו אותה כמו שהיא מ-Railway ← Networking.") : undefined}
                  data-testid="connect-address"
                />
                {tried ? <Answer check={tried} origin={origin} built={false} /> : null}
                <Button type="submit" variant="primary" className="h-11 w-full" disabled={!written.trim()} isLoading={busy} data-testid="connect-submit">
                  {say("وصّل وكمّل|Link it and go on|חברו והמשיכו")}
                </Button>
              </form>
              <p className="text-xs text-white/45">
                {say(
                  "بعدها بتعمل حسابك (إيميلك وكلمة سر من عندك)، وبيفتح إعداد المتجر: المتجر نفسه على Vercel، الصور، المساعد وكل الباقي.|Next you make your account (your email and a password of your own), and the store's setup opens: the shop itself on Vercel, the pictures, the assistant and the rest.|אחר כך תיצרו את החשבון שלכם (האימייל שלכם וסיסמה משלכם), וההגדרה של החנות נפתחת: החנות עצמה ב-Vercel, התמונות, העוזר וכל השאר.",
                )}
              </p>
            </Step>

            <Step n={4} title={say("ثبّت العنوان: Cloudflare|Make it stay: Cloudflare|קבעו את הכתובת: Cloudflare")} testid="connect-step-pin">
              {pin(keptServer(written) ?? "https://my-store.up.railway.app/v1")}
            </Step>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
