// «جهّز متجرك»: where a copy's admin opens when the platform's owner put it up on their Cloudflare Pages before
// anything else (config/env.ts: server.from "none"; paintispassion.pages.dev showed a sign-in to no server). The
// client can't reach that Cloudflare and has no Neon or Railway, so one button asks the platform's server to make
// them (serverLink.ts, backend lib/siteAsk.ts). The page shows six letters for the client to read to the owner, who
// says yes when they match; it follows the making; once made, it keeps the server's address in this browser (the
// site is built again with it meanwhile) and goes on to the owner's account with the setup code it was told.
//
// An admin built with an address shows what that address answers instead: it can't be pointed elsewhere from here.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { PLATFORM_API, server as builtServer, type ServerFrom } from "../../config/env";
import { say } from "../../studio/say";
import { PARTS, askKey, askPlatform, askedStatus, checkServer, forgetAsk, forgetServer, keepServer, partsOf, type AskStatus, type Part, type ServerCheck } from "./serverLink";

type Props = {
  /** Where the admin's server came from, and its address (config/env.ts). */
  from?: ServerFrom;
  address?: string;
  /** The platform's server, asked to make this one (null: this build doesn't know it). */
  platform?: string | null;
  /** Opens a page with the admin loaded again, so it speaks to the server it was just given. */
  go?: (to: string) => void;
  fetcher?: typeof fetch;
  /** How often the page asks again (tests make it short). */
  every?: number;
};

const PART_NAME: Record<Part, string> = {
  neon: "قاعدة البيانات|The database|מסד הנתונים",
  railway: "السيرفر|The server|השרת",
  vercel: "المتجر|The shop|החנות",
  cloudflare: "هاللوحة، مبنية من جديد عليهم|This admin, built again with them|הפאנל הזה, נבנה מחדש איתם",
};
const MARK = { waiting: "○", doing: "◌", done: "✓", failed: "✗" } as const;
const MARK_TONE = { waiting: "text-white/40", doing: "text-sky-300 animate-pulse", done: "text-emerald-300", failed: "text-red-300" } as const;

function Card({ title, children, testid }: { title: string; children: ReactNode; testid: string }) {
  return (
    <div className="relative w-full max-w-lg animate-fade-in-up pb-16" data-testid={testid}>
      <div className="relative glass space-y-5 rounded-3xl p-6 shadow-elevated sm:p-8">
        <h1 className="text-center text-2xl font-bold text-white">{title}</h1>
        {children}
      </div>
    </div>
  );
}

/** What a built (or kept) address answers, in the page's words. */
function Answer({ check, built }: { check: ServerCheck; built: boolean }) {
  if (check.kind === "store") {
    return (
      <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200" data-testid="connect-answer-ok">
        {say("السيرفر شغّال وبيرد.|The server is up and answering.|השרת פועל ועונה.")}{" "}
        <Link to={check.needed ? "/welcome" : "/login"} className="underline">
          {check.needed ? say("اعمل حساب صاحب المتجر|Make the owner's account|צרו את החשבון של הבעלים") : say("سجّل دخول|Sign in|כניסה")}
        </Link>
      </p>
    );
  }
  return (
    <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200" role="alert" data-testid={check.kind === "silent" ? "connect-answer-silent" : "connect-answer-other"}>
      {check.kind === "silent"
        ? say("السيرفر ما ردّ: يا واقف، يا لسا عم يبني (أول مرة بتاخد كم دقيقة). جرّب كمان شوي.|The server didn't answer: it is down, or still building (the first time takes a few minutes). Try again in a little while.|השרת לא ענה: הוא למטה, או עדיין נבנה (בפעם הראשונה זה לוקח כמה דקות). נסו שוב עוד מעט.")
        : say("هالعنوان ردّ، بس مش سيرفر متجر.|This address answered, but it isn't a store's server.|הכתובת הזו ענתה, אבל זה לא שרת של חנות.")}{" "}
      {built ? say("إذا ضلّ هيك، خبّر صاحب المنصة.|If it stays so, tell the platform's owner.|אם זה נשאר כך, ספרו לבעלים של הפלטפורמה.") : null}
    </p>
  );
}

/** An admin built with an address, or one kept in this browser: what it answers. */
function Linked({ from, address, go, fetcher }: { from: ServerFrom; address: string; go: (to: string) => void; fetcher?: typeof fetch }) {
  const [answer, setAnswer] = useState<ServerCheck | null>(null);
  useEffect(() => {
    let live = true;
    void checkServer(address, fetcher).then((c) => live && setAnswer(c));
    return () => {
      live = false;
    };
  }, [address, fetcher]);
  const kept = from === "browser";
  return (
    <Card title={kept ? say("متجرك موصول|Your store is linked|החנות שלכם מחוברת") : say("السيرفر تبع اللوحة|This admin's server|השרת של הפאנל")} testid="connect">
      <div className="space-y-4 text-sm text-white/70" data-testid={kept ? "connect-kept" : "connect-built"}>
        <p>{kept ? say("موصول بهالسيرفر:|Linked to this server:|מחובר לשרת הזה:") : say("هاللوحة مبنية على هالسيرفر:|This admin is built with this server:|הפאנל הזה בנוי עם השרת הזה:")}</p>
        <code className="block truncate rounded-lg bg-black/30 px-3 py-2 text-xs text-emerald-200" dir="ltr" data-testid={kept ? "connect-kept-address" : "connect-built-address"}>
          {address}
        </code>
        {answer ? <Answer check={answer} built={!kept} /> : <p className="text-white/40">{say("عم نسأله…|Asking it…|שואלים אותו…")}</p>}
        {kept ? (
          <>
            <p className="text-xs text-white/50">
              {say(
                "الموقع عم ينبنى من جديد على هالسيرفر (كم دقيقة)، وبعدها بيفتح متجرك من أي جهاز. لهلق، هالمتصفح بيعرفه.|The site is being built again with this server (a few minutes), then your store opens from any device. Until then, this browser knows it.|האתר נבנה מחדש עם השרת הזה (כמה דקות), ואז החנות שלכם נפתחת מכל מכשיר. עד אז, הדפדפן הזה מכיר אותו.",
              )}
            </p>
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
          </>
        ) : null}
      </div>
    </Card>
  );
}

type Stage = { at: "start" } | { at: "asking" } | { at: "asked"; status: AskStatus } | { at: "waking"; status: AskStatus } | { at: "silent" } | { at: "refused"; error?: string };

/** An admin with no server: one button asks the platform for everything. */
function AskForAll({ platform, go, fetcher, every }: { platform: string; go: (to: string) => void; fetcher?: typeof fetch; every: number }) {
  const [stage, setStage] = useState<Stage>({ at: "start" });
  const [key] = useState(askKey);

  const follow = useCallback(async () => {
    const said = await askedStatus(platform, key, fetcher);
    if (said.ok) {
      const status = said.value;
      if (status.state === "made" && status.api) {
        // Made: this browser keeps the server (the site is built again with it meanwhile), and waits for it to answer.
        keepServer(status.api);
        setStage({ at: "waking", status });
        const check = await checkServer(status.api, fetcher);
        if (check.kind === "store") {
          forgetAsk();
          go(check.needed ? `/welcome${status.code ? `?code=${encodeURIComponent(status.code)}` : ""}` : "/login");
        }
        return;
      }
      setStage({ at: "asked", status });
      return;
    }
    // This browser asked nothing the platform knows (or another browser asked since): start.
    setStage(said.why === "unknown" ? { at: "start" } : said.why === "silent" ? { at: "silent" } : { at: "refused", error: said.error });
  }, [platform, key, fetcher, go]);

  // An ask of this browser's from before (a reload): followed on.
  useEffect(() => {
    void follow();
  }, [follow]);

  const following = stage.at === "asked" || stage.at === "waking";
  useEffect(() => {
    if (!following) return;
    const t = setInterval(() => void follow(), every);
    return () => clearInterval(t);
  }, [following, follow, every]);

  const ask = async () => {
    setStage({ at: "asking" });
    const said = await askPlatform(platform, key, fetcher);
    if (said.ok) return setStage({ at: "asked", status: { state: said.value.state, pair: said.value.pair } });
    setStage(said.why === "silent" ? { at: "silent" } : { at: "refused", error: said.error });
  };

  const status = stage.at === "asked" || stage.at === "waking" ? stage.status : null;
  const parts = status?.steps ? partsOf(status.steps) : null;

  return (
    <Card title={say("جهّز متجرك|Set up your store|הכינו את החנות שלכם")} testid="connect">
      {stage.at === "start" || stage.at === "asking" ? (
        <div className="space-y-4 text-center" data-testid="connect-start">
          <p className="text-sm text-white/70">
            {say(
              "هالموقع لسا ما إله سيرفر. اكبس الزر، وبعد ما صاحب المنصة يوافق، كل شي بينعمل لحاله: قاعدة البيانات، السيرفر، المتجر، وهاللوحة. ما بتحتاج أي حساب.|This site has no server yet. Press the button, and once the platform's owner says yes, everything is made by itself: the database, the server, the shop and this admin. You need no account anywhere.|לאתר הזה עדיין אין שרת. לחצו על הכפתור, ואחרי שהבעלים של הפלטפורמה יאשר, הכול נוצר מעצמו: מסד הנתונים, השרת, החנות והפאנל הזה. לא צריך שום חשבון.",
            )}
          </p>
          <Button type="button" variant="primary" className="h-12 w-full" onClick={() => void ask()} isLoading={stage.at === "asking"} data-testid="connect-ask">
            {say("جهّز متجري|Set up my store|הכינו את החנות שלי")}
          </Button>
        </div>
      ) : null}

      {status && status.state === "waiting" ? (
        <div className="space-y-4 text-center" data-testid="connect-waiting">
          <p className="text-sm text-white/70">{say("خبّر صاحب المنصة بهالحروف، ليوافق عليها:|Tell the platform's owner these letters, so they say yes:|אמרו לבעלים של הפלטפורמה את האותיות האלה, כדי שיאשר:")}</p>
          <bdi dir="ltr" className="block font-mono text-4xl font-bold tracking-[0.3em] text-amber-200" data-testid="connect-pair">
            {status.pair}
          </bdi>
          <p className="text-xs text-white/50">{say("هالصفحة بتكمّل لحالها أول ما يوافق: خلّيها مفتوحة.|This page goes on by itself as soon as they say yes: keep it open.|העמוד הזה ממשיך מעצמו ברגע שיאשרו: השאירו אותו פתוח.")}</p>
        </div>
      ) : null}

      {status && status.state === "refused" ? (
        <div className="space-y-4 text-center" data-testid="connect-refused">
          <p className="text-sm text-amber-200">{say("صاحب المنصة ما وافق على هالطلب. احكي معه، وبعدين اطلب كمان مرة.|The platform's owner said no to this ask. Talk to them, then ask again.|הבעלים של הפלטפורמה דחה את הבקשה. דברו איתם, ואז בקשו שוב.")}</p>
          <Button type="button" variant="primary" className="w-full" onClick={() => void ask()} data-testid="connect-ask-again">
            {say("اطلب كمان مرة|Ask again|בקשו שוב")}
          </Button>
        </div>
      ) : null}

      {status && (status.state === "making" || status.state === "stopped" || status.state === "made") ? (
        <div className="space-y-4" data-testid="connect-making" data-state={status.state}>
          <p className="text-center text-sm text-white/70">
            {stage.at === "waking"
              ? say("كل شي انعمل. عم نستنى السيرفر يشتغل أول مرة (كم دقيقة)…|Everything is made. Waiting for the server to come up the first time (a few minutes)…|הכול נוצר. מחכים שהשרת יעלה בפעם הראשונה (כמה דקות)…")
              : status.state === "stopped"
                ? say("وقف بخطوة: صاحب المنصة رح يكمّلها من عنده.|It stopped at a step: the platform's owner will carry it on.|זה נעצר בשלב: הבעלים של הפלטפורמה ימשיך אותו.")
                : say("صاحب المنصة وافق. عم ينعمل متجرك…|The platform's owner said yes. Your store is being made…|הבעלים של הפלטפורמה אישר. החנות שלכם נוצרת…")}
          </p>
          {parts ? (
            <ul className="space-y-2">
              {PARTS.map((p) => (
                <li key={p} className="flex items-center gap-3 rounded-xl bg-white/3 px-3 py-2 text-sm" data-testid={`connect-part-${p}`} data-state={parts[p]}>
                  <span className={`w-4 text-center ${MARK_TONE[parts[p]]}`}>{MARK[parts[p]]}</span>
                  <span className="text-white/80">{say(PART_NAME[p])}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {stage.at === "silent" ? (
        <div className="space-y-4 text-center" data-testid="connect-silent">
          <p className="text-sm text-red-200">{say("ما قدرنا نوصل لصاحب المنصة هلق. جرّب كمان شوي.|The platform couldn't be reached now. Try again in a little while.|לא הצלחנו להגיע לפלטפורמה עכשיו. נסו שוב עוד מעט.")}</p>
          <Button type="button" variant="secondary" className="w-full" onClick={() => void follow()} data-testid="connect-retry">
            {say("جرّب كمان مرة|Try again|נסו שוב")}
          </Button>
        </div>
      ) : null}

      {stage.at === "refused" ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-200" role="alert" data-testid="connect-not-taken">
          {stage.error === "ASK_TAKEN"
            ? say("هالموقع عم ينعمل لمتصفح تاني: كمّل من الجهاز اللي طلبت منه.|This site is being made for another browser: carry on from the device you asked from.|האתר הזה נוצר עבור דפדפן אחר: המשיכו מהמכשיר שממנו ביקשתם.")
            : stage.error === "ASK_ADMIN"
              ? say("هالعنوان ما بيقدر يطلب: افتح الموقع من عنوانه الأساسي (…pages.dev).|This address can't ask: open the site at its main address (…pages.dev).|הכתובת הזו לא יכולה לבקש: פתחו את האתר בכתובת הראשית שלו (…pages.dev).")
              : say("صاحب المنصة ما قبل الطلب هلق. جرّب كمان شوي.|The platform didn't take the ask now. Try again in a little while.|הפלטפורמה לא קיבלה את הבקשה עכשיו. נסו שוב עוד מעט.")}
        </p>
      ) : null}
    </Card>
  );
}

export default function ConnectPage({ from = builtServer.from, address = builtServer.address, platform = PLATFORM_API, go = (to) => window.location.assign(to), fetcher, every = 5000 }: Props) {
  if (from !== "none") return <Linked from={from} address={address} go={go} fetcher={fetcher} />;
  if (!platform)
    return (
      <Card title={say("جهّز متجرك|Set up your store|הכינו את החנות שלכם")} testid="connect">
        <p className="text-center text-sm text-white/70" data-testid="connect-no-platform">
          {say("هالموقع لسا ما إله سيرفر، وما بيعرف منصته. خبّر صاحب المنصة.|This site has no server yet, and doesn't know its platform. Tell the platform's owner.|לאתר הזה עדיין אין שרת, והוא לא מכיר את הפלטפורמה שלו. ספרו לבעלים של הפלטפורמה.")}
        </p>
      </Card>
    );
  return <AskForAll platform={platform} go={go} fetcher={fetcher} every={every} />;
}
