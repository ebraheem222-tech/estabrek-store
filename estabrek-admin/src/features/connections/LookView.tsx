// What a hosting connection found (Neon, Railway, Vercel, Cloudflare; backend lib/fnKindsInfra.ts):
// its projects and what each runs, with how its last deploy went. Read through the connection and
// never changed there. Names, states and commit lines are the service's own words; the page says
// the rest (a fact's name, how a thing is going) in its own.
import type { LookItem, LookTone, ReadyLook } from "../../api/connections.api";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";
import { failText } from "../functions/fnText";
import { factName, lookGroupName, toneName } from "./readyText";

const DOT: Record<LookTone, string> = { good: "bg-emerald-400", bad: "bg-red-400", busy: "bg-amber-300", idle: "bg-white/40" };
/** Facts that are a yes or nothing: shown by their name alone. */
const FLAGS = new Set(["default", "protected"]);

export function whenText(iso: string | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  const lang = adminLang();
  return t.toLocaleString(lang === "ar" ? "ar" : lang === "he" ? "he-IL" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
}

/** A look that came to nothing, in a line: the service's own words for why, and what that usually means. */
export function lookFailText(look: ReadyLook): string {
  const why = look.why ? failText(look.why, adminLang()) : "";
  const head = `${say("ما قدرنا نقرأ شي|Nothing could be read|לא ניתן היה לקרוא כלום")}${look.status ? ` (${look.status})` : ""}${why ? `: ${why}.` : "."}`;
  if (look.status === 401 || look.status === 403) return `${head} ${say("التوكن مش معروف أو ما إله إذن يقرأ: تأكد إنه منسوخ كامل وإله إذن قراءة.|The token isn't known or may not read: check it was copied whole and may read.|הטוקן לא מוכר או שאין לו הרשאת קריאה: בדקו שהועתק במלואו ושיש לו הרשאת קריאה.")}`;
  return head;
}

function Item({ item, depth, t }: { item: LookItem; depth: number; t: string }) {
  const when = whenText(item.when);
  return (
    <li className={depth ? "py-1" : "py-2"} data-testid={t} data-tone={item.tone ?? ""}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        {item.tone ? <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT[item.tone]}`} aria-hidden /> : null}
        <bdi className={depth ? "text-white/90" : "font-medium"}>{item.name}</bdi>
        {item.tone ? <span className="text-xs text-white/80">{toneName(item.tone)}</span> : null}
        {item.state ? (
          <bdi dir="ltr" className="rounded bg-white/10 px-1 font-mono text-[11px] text-white/80">
            {item.state}
          </bdi>
        ) : null}
        {when ? <span className="text-xs text-white/60">{when}</span> : null}
        {item.link ? (
          <a href={item.link} target="_blank" rel="noreferrer noopener" className="text-xs underline" data-testid={`${t}-link`}>
            {say("افتح ↗|Open ↗|פתיחה ↗")}
          </a>
        ) : null}
      </div>
      {item.facts?.length ? (
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/70">
          {item.facts.map(([k, v]) => (
            <span key={k} data-testid={`${t}-fact-${k}`}>
              {FLAGS.has(k) ? (
                factName(k)
              ) : (
                <>
                  {factName(k)}: <bdi dir="ltr">{v}</bdi>
                </>
              )}
            </span>
          ))}
        </div>
      ) : null}
      {item.items?.length ? (
        <ul className="mt-1 border-s border-white/10 ps-3">
          {item.items.map((sub, i) => (
            <Item key={`${sub.id ?? sub.name}-${i}`} item={sub} depth={depth + 1} t={`${t}-${i}`} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function LookView({ look, t }: { look: ReadyLook; t: string }) {
  if (!look.ok)
    return (
      <div className="text-sm text-red-300" role="status" data-testid={`${t}-failed`}>
        {lookFailText(look)}
      </div>
    );
  const empty = !look.groups.some((g) => g.items.length);
  return (
    <div className="space-y-3 rounded-xl border border-white/10 p-3" data-testid={t}>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
        {look.who ? (
          <span data-testid={`${t}-who`}>
            {say("المفتاح تبع:|The key is:|המפתח של:")} <bdi>{look.who}</bdi>
          </span>
        ) : null}
        <span>{say("هاد قراءة بس: ما تغيّر شي هناك.|This is only read: nothing was changed there.|זו קריאה בלבד: שום דבר לא שונה שם.")}</span>
        {look.missed ? (
          <span className="text-amber-300" data-testid={`${t}-missed`}>
            {say(`${look.missed} من الطلبات انرفضت: التوكن ما إله إذن يقرأ كل شي.|${look.missed} of the calls were refused: the token may not read everything.|${look.missed} מהבקשות נדחו: לטוקן אין הרשאה לקרוא הכול.`)}
          </span>
        ) : null}
      </div>
      {empty ? <p className="text-sm text-white/70" data-testid={`${t}-empty`}>{say("الحساب فاضي: ما في مشاريع لهالمفتاح.|The account is empty: this key has no projects.|החשבון ריק: אין פרויקטים למפתח הזה.")}</p> : null}
      {look.groups
        .filter((g) => g.items.length)
        .map((g) => (
          <section key={g.id} data-testid={`${t}-${g.id}`}>
            <h3 className="text-sm font-medium">
              {lookGroupName(g.id)} <span className="text-xs text-white/60">({g.items.length + (g.more ?? 0)})</span>
            </h3>
            <ul className="divide-y divide-white/5">
              {g.items.map((item, i) => (
                <Item key={`${item.id ?? item.name}-${i}`} item={item} depth={0} t={`${t}-${g.id}-${i}`} />
              ))}
            </ul>
            {g.more ? <p className="text-xs text-white/60">{say(`و ${g.more} كمان ما انعرضوا.|And ${g.more} more not shown.|ועוד ${g.more} שלא מוצגים.`)}</p> : null}
          </section>
        ))}
    </div>
  );
}
