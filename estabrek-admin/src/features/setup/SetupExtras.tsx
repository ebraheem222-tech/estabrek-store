// Steps of the store's setup (SetupWizard): its own shop (made on Vercel when it has none), the shop's assistant
// (on or off, and the personality it speaks as) and where the store's pictures go (its own Cloudinary account,
// else the server's disk).
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { PersonaPicker } from "../../components/PersonaPicker";
import { getApiErrorMessage } from "../../api/http";
import * as CloudAPI from "../../api/cloudinary.api";
import * as ShopAPI from "../../api/shop.api";
import { TokenGuide } from "./TokenGuide";
import { CloudinaryGuide } from "./CloudinaryGuide";
import { useConfirm } from "../../components/useConfirm";
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
      <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 p-4">
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

const field = "w-full rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-sm outline-hidden focus:border-accent-400";

/** A name for the shop from the admin's own address (samoray1337.pages.dev → samoray1337), as the server tidies names. */
function nameFromHere(): string {
  try {
    const host = window.location.hostname;
    // An address by number, or this machine, gives no name.
    if (/^[\d.]+$|^\[|^localhost$/.test(host)) return "";
    const first = host.split(".")[0] ?? "";
    return first
      .toLowerCase()
      .replace(/-admin$/, "")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30);
  } catch {
    return "";
  }
}

/** Why the last «وصّل Vercel» didn't make the shop (the server's words, kept for the setup), in the page's words. */
function connectRefusal(why: string): string {
  const after = (prefix: string) => why.slice(prefix.length).replace(/^:\s*/, "");
  if (why.startsWith("Vercel didn't give a token")) return `${say("Vercel ما عطى توكن، يمكن الرابط قديم أو انستعمل: اكبس «وصّل Vercel» كمان مرة.|Vercel didn't give a token, perhaps the link was old or used: press “Connect Vercel” again.|Vercel לא נתן טוקן, אולי הקישור ישן או שכבר נוצל: לחצו «חיבור Vercel» שוב.")}${after("Vercel didn't give a token") ? ` (${after("Vercel didn't give a token")})` : ""}`;
  if (/is someone else's$/.test(why)) return say("هالعنوان على Vercel لحدا تاني: اختار اسم تاني للمتجر.|This address at Vercel is someone else's: pick another name for the shop.|הכתובת הזו ב-Vercel שייכת למישהו אחר: בחרו שם אחר לחנות.");
  if (/github|git repository|install/i.test(why)) return `${say("Vercel ما بيوصل للمستودع على GitHub: بـ Vercel ركّب الـ GitHub integration واسمحلها بالمستودع.|Vercel can't reach the repository on GitHub: install Vercel's GitHub integration and let it reach the repository.|Vercel לא מגיע למאגר ב-GitHub: התקינו את האינטגרציה של GitHub ב-Vercel ואפשרו לה גישה למאגר.")} (${why})`;
  return `${say("ما انعمل المتجر:|The shop wasn't made:|החנות לא נוצרה:")} ${why}`;
}

/** Why Vercel or the server said no, in the page's words. */
function shopRefusal(e: unknown): string {
  const data = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  const message = data?.message ?? "";
  if (data?.error === "NAME_TAKEN") return say("هالعنوان على Vercel لحدا تاني: اختار اسم تاني للمتجر.|This address at Vercel is someone else's: pick another name for the shop.|הכתובת הזו ב-Vercel שייכת למישהו אחר: בחרו שם אחר לחנות.");
  if (data?.error === "NAME_INVALID") return say("الاسم حروف إنجليزي صغيرة وأرقام و - (3 حروف عالأقل).|The name is small letters, digits and - (at least 3).|השם הוא אותיות לועזיות קטנות, ספרות ו- (לפחות 3).");
  if (data?.error === "NO_REPO") return say("السيرفر ما بيعرف من أي مستودع انبنى: بدّه يكون منشور من GitHub على Railway.|The server doesn't know which repository it was built from: it needs to be deployed from GitHub on Railway.|השרת לא יודע מאיזה מאגר הוא נבנה: הוא צריך להיפרס מ-GitHub ב-Railway.");
  if (data?.error === "OWNER_ONLY") return say("صاحب المتجر بس بيقدر يعمل متجره.|Only the store's owner makes its shop.|רק בעלי החנות יוצרים את החנות שלה.");
  if (data?.error === "CONNECT_OFF") return say("«وصّل Vercel» مش مجهّز على السيرفر: الصق توكن بدالها.|“Connect Vercel” isn't set up on the server: paste a token instead.|«חיבור Vercel» לא מוגדר בשרת: הדביקו טוקן במקום.");
  if (data?.error === "VERCEL_REFUSED") {
    if (/token|unauthori[sz]ed|forbidden|not authorized|invalid/i.test(message)) return `${say("Vercel ما قبل التوكن: تأكد إنه منسوخ كامل وإله صلاحية على الحساب أو الفريق.|Vercel didn't take the token: check it's copied whole and allowed on the account or team.|Vercel לא קיבל את הטוקן: בדקו שהוא מועתק במלואו ושיש לו הרשאה בחשבון או בצוות.")} (${message})`;
    if (/github|git repository|install/i.test(message)) return `${say("Vercel ما بيوصل للمستودع على GitHub: بـ Vercel ركّب الـ GitHub integration واسمحلها بالمستودع.|Vercel can't reach the repository on GitHub: install Vercel's GitHub integration and let it reach the repository.|Vercel לא מגיע למאגר ב-GitHub: התקינו את האינטגרציה של GitHub ב-Vercel ואפשרו לה גישה למאגר.")} (${message})`;
    return `${say("Vercel قال لأ:|Vercel said no:|Vercel אמר לא:")} ${message}`;
  }
  return getApiErrorMessage(e);
}

/**
 * The setup's first step: the store's own shop. A store whose shop opens to this admin goes on; one with none
 * (or with another store's) gets one on Vercel from here, with the owner's token, used once and never kept.
 */
export function ShopStep({ onReady, onReadyChange, inCard = false }: { onReady?: () => void; /** Whether the shop opens to this admin: the setup goes no further until it does. */ onReadyChange?: (ready: boolean) => void; /** In a page's card (admin → الاستضافة): the card says what it is. */ inCard?: boolean }) {
  const qc = useQueryClient();
  const link = useQuery({ queryKey: ["shop-link"], queryFn: ShopAPI.getShopLink, retry: false });
  useEffect(() => ShopAPI.followShop(link.data), [link.data]);
  const url = link.data?.url ?? null;
  const made = link.data?.source === "made";
  // A shop just made builds for a few minutes: asked again every few seconds until it opens.
  const opens = useQuery({
    queryKey: ["shop-opens", url],
    queryFn: () => ShopAPI.shopOpensHere(url!),
    enabled: !!url,
    retry: false,
    refetchInterval: (q) => (made && q.state.data === false ? 5000 : false),
  });
  const [token, setToken] = useState("");
  const [team, setTeam] = useState("");
  const [site, setSite] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const making = link.data?.making ?? null;
  // A stopped try's name first, else the admin's own (samoray1337.pages.dev → samoray1337), until one is typed.
  const siteNow = site ?? (making || nameFromHere());
  const make = useMutation({
    mutationFn: () => ShopAPI.makeShopLink({ token: token.trim(), team: team.trim() || undefined, site: siteNow.trim() }),
    onMutate: () => setFailed(null),
    onSuccess: (data) => {
      setToken("");
      ShopAPI.followShop(data);
      qc.setQueryData(["shop-link"], data);
      void qc.invalidateQueries({ queryKey: ["store-templates"] });
    },
    onError: (e) => setFailed(shopRefusal(e)),
  });
  const nameOk = /^[a-z][a-z0-9-]{1,28}[a-z0-9]$/.test(siteNow.trim());
  const can = token.trim().length >= 16 && nameOk && !make.isPending;
  // «وصّل Vercel»: off to Vercel's own page; the server makes the shop when Vercel sends the owner back.
  const [connectFailed, setConnectFailed] = useState<string | null>(null);
  const connect = useMutation({
    mutationFn: () => ShopAPI.startVercelConnect(siteNow.trim()),
    onMutate: () => setConnectFailed(null),
    onSuccess: ({ url: at }) => ShopAPI.goTo(at),
    onError: (e) => setConnectFailed(shopRefusal(e)),
  });
  const tokenWay = (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (can) make.mutate();
      }}
      data-testid="setup-shop-token-form"
    >
      <TokenGuide open={!link.data?.connect} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">{say("توكن Vercel|Vercel token|טוקן Vercel")}</span>
          <input className={field} dir="ltr" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" data-testid="setup-shop-token" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">{say("الفريق على Vercel (اختياري)|The Vercel team (optional)|הצוות ב-Vercel (לא חובה)")}</span>
          <input className={field} dir="ltr" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="team_… / slug" data-testid="setup-shop-team" />
        </label>
      </div>
      {failed ? (
        <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert" data-testid="setup-shop-failed">
          {failed}
        </p>
      ) : null}
      <Button type="submit" variant={link.data?.connect ? "secondary" : "primary"} size="sm" disabled={!can} isLoading={make.isPending} data-testid="setup-shop-make">
        {say("اعمل المتجر|Make the shop|ליצור את החנות")}
      </Button>
    </form>
  );
  const ready = !!url && opens.data === true;
  const building = !!url && made && opens.data === false;
  const showForm = !link.isLoading && !ready && !building;
  useEffect(() => onReadyChange?.(ready), [ready, onReadyChange]);
  // How long the shop has been building, said as it goes (its first deploy takes a few minutes).
  const [buildingSince, setBuildingSince] = useState<number | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!building) return setBuildingSince(null);
    setBuildingSince((at) => at ?? Date.now());
    const every = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(every);
  }, [building]);
  const waited = buildingSince ? Math.max(0, Math.floor((Date.now() - buildingSince) / 1000)) : 0;
  // Once a shop being built opens, the setup goes on by itself.
  const wasBuilding = useRef(false);
  useEffect(() => {
    if (building) wasBuilding.current = true;
    else if (ready && wasBuilding.current) {
      wasBuilding.current = false;
      onReady?.();
    }
  }, [building, ready, onReady]);
  return (
    <section className={inCard ? "space-y-5" : "mx-auto max-w-2xl space-y-5"} data-testid="setup-shop">
      {inCard ? null : <h1 className="text-2xl font-bold">{say("متجرك|Your shop|החנות שלך")}</h1>}
      <p className="text-sm leading-7 text-white/60">
        {say(
          "المتجر هو الموقع اللي بيشوفه زباينك وبيشتروا منه. قبل ما تختار شو بتبيع والتصميم، لازم يكون إلك متجر موصول بهاللوحة: منه بتنقرأ القوالب والمعاينات.|The shop is the website your shoppers see and buy from. Before you pick what you sell and the design, you need a shop of your own linked to this admin: the templates and previews are read from it.|החנות היא האתר שהקונים שלך רואים וקונים בו. לפני שבוחרים מה מוכרים ואת העיצוב, צריך חנות משלך שמחוברת ללוח הניהול הזה: התבניות והתצוגות נקראות ממנה.",
        )}
      </p>
      {link.isLoading || (url && opens.isLoading) ? <Spinner /> : null}
      {ready ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm" data-testid="setup-shop-ready">
          <div className="font-medium text-emerald-200">{say("متجرك جاهز وموصول بهاللوحة:|Your shop is ready and linked to this admin:|החנות שלך מוכנה ומחוברת ללוח הניהול:")}</div>
          <a href={url!} target="_blank" rel="noreferrer noopener" className="mt-1 inline-block underline">
            <bdi dir="ltr">{url!.replace(/^https:\/\//, "")}</bdi>
          </a>
        </div>
      ) : null}
      {building ? (
        <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-sm" data-testid="setup-shop-building" role="status">
          <div className="font-medium text-sky-200">{say("المتجر انعمل وعم ينبنى… أول نشر بياخد كم دقيقة.|The shop is made and building… its first deploy takes a few minutes.|החנות נוצרה ונבנית… הפריסה הראשונה לוקחת כמה דקות.")}</div>
          <bdi dir="ltr" className="mt-1 block text-white/80">{url!.replace(/^https:\/\//, "")}</bdi>
          <p className="mt-1 text-xs text-white/60">{say("الإعداد بيكمّل لحاله أول ما يجهز المتجر، وبعدها بتختار شو بتبيع والقالب.|The setup goes on by itself as soon as the shop is ready; then you pick what you sell and the template.|ההגדרה תמשיך לבד ברגע שהחנות מוכנה; ואז בוחרים מה מוכרים ואת התבנית.")}</p>
          <p className="mt-1 text-xs tabular-nums text-sky-200/80" data-testid="setup-shop-waited">
            {say("صرلو|Building for|בבנייה כבר")} <bdi dir="ltr">{`${Math.floor(waited / 60)}:${String(waited % 60).padStart(2, "0")}`}</bdi>
          </p>
        </div>
      ) : null}
      {showForm ? (
        <div className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-4" data-testid="setup-shop-form">
          {url ? (
            <p className="rounded-xl bg-amber-500/10 p-3 text-xs leading-6 text-amber-100" data-testid="setup-shop-elsewhere">
              {say("هاللوحة موصولة بمتجر ما بيفتحلها، يمكن تبع متجر تاني:|This admin is linked to a shop that doesn't open to it, perhaps another store's:|לוח הניהול מחובר לחנות שלא נפתחת אליו, אולי של חנות אחרת:")} <bdi dir="ltr">{url.replace(/^https:\/\//, "")}</bdi>
              {". "}
              {say("اعمل متجر إله لحاله:|Make a shop of its own:|צרו חנות משלו:")}
            </p>
          ) : null}
          {making ? <p className="text-xs text-white/60" data-testid="setup-shop-making">{say(`محاولة سابقة وقفت عند «${making}»: بتكمّل من مكانها.|An earlier try stopped at “${making}”: it goes on from there.|ניסיון קודם נעצר ב-«${making}»: הוא ממשיך משם.`)}</p> : null}
          {link.data?.error ? (
            <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert" data-testid="setup-shop-error">
              {connectRefusal(link.data.error)}
            </p>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">{say("اسم المتجر|The shop's name|שם החנות")}</span>
            <input className={field} dir="ltr" value={siteNow} onChange={(e) => setSite(e.target.value.toLowerCase())} placeholder="my-shop" data-testid="setup-shop-site" />
            <span className="mt-1 block text-xs text-white/50" dir="ltr">{siteNow ? `https://${siteNow}.vercel.app` : ""}</span>
          </label>
          {link.data?.connect ? (
            <>
              <Button type="button" variant="primary" disabled={!nameOk || connect.isPending} isLoading={connect.isPending} onClick={() => connect.mutate()} data-testid="setup-shop-connect">
                {say("وصّل Vercel|Connect Vercel|חיבור Vercel")}
              </Button>
              <p className="text-xs leading-6 text-white/60">
                {say(
                  "بتفتح صفحة Vercel: بتفوت، بتختار الحساب أو الفريق، وبتوافق. بترجع لهون والمتجر بينعمل لحاله. ما في توكن تنسخه، وولا شي بينحفظ.|Vercel's page opens: sign in, pick the account or team, and agree. You come back here and the shop is made by itself. No token to copy, and nothing is kept.|נפתח העמוד של Vercel: נכנסים, בוחרים את החשבון או הצוות, ומאשרים. חוזרים לכאן והחנות נוצרת לבד. אין טוקן להעתיק, ושום דבר לא נשמר.",
                )}
              </p>
              {connectFailed ? (
                <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert" data-testid="setup-shop-connect-failed">
                  {connectFailed}
                </p>
              ) : null}
              <details className="rounded-xl border border-white/10 p-3" data-testid="setup-shop-token-way">
                <summary className="cursor-pointer text-xs text-white/70">{say("أو الصق توكن Vercel|Or paste a Vercel token|או הדביקו טוקן Vercel")}</summary>
                <div className="mt-3 space-y-3">{tokenWay}</div>
              </details>
            </>
          ) : (
            tokenWay
          )}
          <p className="text-xs text-white/50">{say("بينعمل بحسابك على Vercel، من نفس الكود، وموصول بسيرفر هالمتجر ولوحته.|It is made in your Vercel account, from the same code, linked to this store's server and admin.|היא נוצרת בחשבון ה-Vercel שלך, מאותו קוד, מחוברת לשרת וללוח הניהול של החנות הזו.")}</p>
        </div>
      ) : null}
      {!ready && !link.isLoading ? (
        <p className="text-center text-xs text-white/50" data-testid="setup-shop-wait">
          {say("«التالي» بيشتغل لما يجهز متجرك: منه بتنقرأ القوالب.|“Next” works once your shop is ready: the templates are read from it.|«הבא» יעבוד כשהחנות שלך מוכנה: התבניות נקראות ממנה.")}
        </p>
      ) : null}
    </section>
  );
}

/** Why the server refused the account, in the page's words. */
function refusal(e: unknown): string {
  const data = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  if (data?.error === "CLOUDINARY_REFUSED") return `${say("Cloudinary رفض الحساب|Cloudinary refused the account|Cloudinary דחה את החשבון")}${data.message?.includes(": ") ? `: ${data.message.split(": ").slice(1).join(": ")}` : ""}. ${say("تأكد من الاسم والمفتاحين، منسوخين كاملين.|Check the name and both keys, copied whole.|בדקו את השם ואת שני המפתחות, מועתקים במלואם.")}`;
  if (data?.error === "OWNER_ONLY") return say("صاحب المتجر بس بيقدر يغيّر وين بتروح الصور.|Only the store's owner changes where pictures go.|רק בעלי החנות משנים לאן התמונות הולכות.");
  if (data?.error === "VALIDATION_ERROR" || data?.error === "BAD_REQUEST") return say("الاسم حروف وأرقام، والمفتاح أرقام، والسر حروف وأرقام: انسخهم متل ما هم.|The name is letters and digits, the key digits, the secret letters and digits: copy them as they are.|השם אותיות וספרות, המפתח ספרות, הסוד אותיות וספרות: העתיקו אותם כמו שהם.");
  return getApiErrorMessage(e);
}

/**
 * `manage` (admin → الاستضافة): a saved account can be changed or taken off too; in the setup it is only made.
 */
/**
 * `saveRef` (the setup): the keys typed and not yet kept, kept when «التالي» is pressed (tried with Cloudinary
 * first); false when they can't be (it says why here, and the setup stays on this step). Typed and left, they were
 * lost: the owner thought the account was kept.
 */
export function MediaStep({ manage = false, saveRef }: { manage?: boolean; saveRef?: { current: (() => Promise<boolean>) | null } } = {}) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cloudinary-account"], queryFn: CloudAPI.getCloudinaryAccount, retry: false });
  const [changing, setChanging] = useState(false);
  const [confirm, dialog] = useConfirm();
  const remove = useMutation({
    mutationFn: CloudAPI.removeCloudinaryAccount,
    onMutate: () => setFailed(null),
    onSuccess: (data) => qc.setQueryData(["cloudinary-account"], data),
    onError: (e) => setFailed(refusal(e)),
  });
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
      setChanging(false);
    },
    onError: (e) => setFailed(refusal(e)),
  });
  const acc = q.data;
  const can = cloudName.trim() && /^\d{6,24}$/.test(apiKey.trim()) && apiSecret.trim().length >= 16;
  const typed = Boolean(cloudName.trim() || apiKey.trim() || apiSecret.trim());
  const formShown = !(acc && acc.source !== "none" && !changing);
  useEffect(() => {
    if (!saveRef) return;
    saveRef.current =
      typed && formShown
        ? async () => {
            if (!can) {
              setFailed(say("كمّل التلاتة (Cloud name، والـ API key أرقام، والـ API secret 16 حرف أو أكتر) أو فضّيهم لتتخطى هالخطوة.|Fill in all three (Cloud name, the API key in digits, the API secret of 16 characters or more), or empty them to skip this step.|מלאו את שלושתם (Cloud name, ה-API key בספרות, ה-API secret באורך 16 תווים לפחות), או רוקנו אותם כדי לדלג על השלב."));
              return false;
            }
            try {
              await save.mutateAsync();
              return true;
            } catch {
              return false;
            }
          }
        : null;
    return () => {
      saveRef.current = null;
    };
  });
  return (
    <section className={manage ? "space-y-5" : "mx-auto max-w-2xl space-y-5"} data-testid="setup-media">
      {manage ? null : <h1 className="text-2xl font-bold">{say("وين بتنحفظ الصور|Where the pictures are kept|איפה התמונות נשמרות")}</h1>}
      <p className="text-sm leading-7 text-white/60">
        {say(
          "صور المنتجات والفيديوهات بتنحفظ بحساب Cloudinary تبع متجرك: بتطلع بسرعة وبالحجم المناسب لكل جهاز. الحساب المجاني بيكفي للبداية. بدونه الصور بتنحفظ على السيرفر نفسه وبقاعدة بيانات المتجر، فبتضل بعد كل نشر جديد، بس بتطلع أبطأ وبحجم واحد لكل الأجهزة. الفيديوهات بدونه بتضيع على Railway مع كل نشر جديد.|Product pictures and videos are kept in your store's own Cloudinary account: they load fast and at the right size for each device. The free plan is enough to start. Without it, pictures are kept on the server itself and in the store's database, so they stay after each new deploy, but they load slower and in one size for every device. Videos without it are lost on Railway with each new deploy.|תמונות המוצרים והסרטונים נשמרים בחשבון Cloudinary של החנות שלך: הם נטענים מהר ובגודל המתאים לכל מכשיר. התוכנית החינמית מספיקה להתחלה. בלעדיו התמונות נשמרות בשרת עצמו ובמסד הנתונים של החנות, כך שהן נשארות אחרי כל פריסה חדשה, אבל נטענות לאט יותר ובגודל אחד לכל המכשירים. סרטונים בלעדיו הולכים לאיבוד ב-Railway בכל פריסה חדשה.",
        )}
      </p>
      {q.isLoading ? (
        <Spinner />
      ) : acc && acc.source !== "none" && !changing ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm" data-testid="setup-media-connected" data-source={acc.source}>
          <div className="font-medium text-emerald-200">
            {say("موصول بـ Cloudinary:|Connected to Cloudinary:|מחובר ל-Cloudinary:")} <bdi dir="ltr">{acc.cloudName}</bdi>
          </div>
          <div className="mt-1 text-xs text-white/60">
            {acc.source === "env"
              ? say("من إعدادات السيرفر نفسه.|From the server's own settings.|מההגדרות של השרת עצמו.")
              : say(`المفتاح بيخلص بـ ${acc.apiKeyEnd}. السر محفوظ مقفول وما بينعرض.|The key ends in ${acc.apiKeyEnd}. The secret is kept sealed and never shown.|המפתח מסתיים ב-${acc.apiKeyEnd}. הסוד שמור נעול ולא מוצג.`)}
          </div>
          {manage && acc.source === "saved" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCloudName(acc.cloudName ?? "");
                  setApiKey("");
                  setApiSecret("");
                  setChanging(true);
                }}
                data-testid="setup-media-change"
              >
                {say("غيّر الحساب|Change the account|החלפת החשבון")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isLoading={remove.isPending}
                onClick={async () => {
                  if (
                    await confirm({
                      title: say("افصل Cloudinary|Disconnect Cloudinary|ניתוק Cloudinary"),
                      message: say(
                        "الصور اللي انرفعت بتضل بحسابك بـ Cloudinary وبتضل تطلع. الصور الجديدة بتنحفظ على السيرفر لحد ما توصّل حساب.|The pictures already uploaded stay in your Cloudinary account and keep showing. New ones are kept on the server until an account is connected.|התמונות שכבר הועלו נשארות בחשבון ה-Cloudinary שלך וממשיכות להופיע. חדשות נשמרות בשרת עד שיחובר חשבון.",
                      ),
                      confirmText: say("افصله|Disconnect|ניתוק"),
                      variant: "danger",
                    })
                  )
                    remove.mutate();
                }}
                data-testid="setup-media-remove"
              >
                {say("افصل|Disconnect|ניתוק")}
              </Button>
            </div>
          ) : manage && acc.source === "env" ? (
            <p className="mt-2 text-xs text-white/50">{say("بيتغيّر من متغيرات السيرفر (CLOUDINARY_…) على Railway.|It is changed from the server's variables (CLOUDINARY_…) on Railway.|משנים אותו במשתני השרת (CLOUDINARY_…) ב-Railway.")}</p>
          ) : null}
          {failed ? (
            <p className="mt-2 rounded-xl bg-red-500/10 p-3 text-xs text-red-200" role="alert" data-testid="setup-media-failed">
              {failed}
            </p>
          ) : null}
        </div>
      ) : (
        <form
          className="space-y-3 rounded-2xl border border-white/8 bg-white/3 p-4"
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
          {changing ? (
            <button type="button" className="ms-3 text-xs text-white/60 underline" onClick={() => setChanging(false)} data-testid="setup-media-keep">
              {say("خليه متل ما هو|Keep it as it is|להשאיר כמו שהוא")}
            </button>
          ) : null}
        </form>
      )}
      {acc?.source !== "env" && (!acc || acc.source === "none" || changing) ? <CloudinaryGuide /> : null}
      {dialog}
    </section>
  );
}
