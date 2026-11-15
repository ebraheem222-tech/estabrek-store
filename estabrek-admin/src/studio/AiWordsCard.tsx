/**
 * The page editor's words helper (the API's /admin/ai-pages, behind the store's "page writer" AI switch): for a
 * heading, a text or a button, new words about something, or the words there made better, shorter, longer or
 * put into another of the shop's languages; for a picture, its description. A few options come back and the
 * owner picks one: nothing changes on the page until then.
 *
 * `ask` makes the call (the studio passes the API's); the card only shows what comes back.
 */
import { useState } from "react";
import type { Lang } from "../lib/lang";
import { say } from "./say";

export type AiWordsKind = "heading" | "text" | "button" | "picture";
export type AiWordsAction = "write" | "improve" | "shorter" | "longer" | "translate" | "describe";
export type AiWordsAsk = (action: AiWordsAction, more: { about?: string; to?: Lang }) => Promise<string[]>;

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const input = "w-full min-w-0 rounded-md border border-white/[0.1] bg-surface-925 px-1.5 py-1 text-xs text-white";
const LANG_WORD: Record<Lang, string> = { ar: "العربي|Arabic|ערבית", en: "الإنجليزي|English|אנגלית", he: "العبري|Hebrew|עברית" };

/** Plain words of what an element holds (its formatting's tags taken off), for the model. */
export const plainWords = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export function AiWordsCard({ kind, lang, others, text, status, busy, ask, onPick, onClose }: {
  kind: AiWordsKind;
  /** The language being edited, and the shop's other languages (a translation goes into one of them). */
  lang: Lang;
  others: Lang[];
  /** The element's words now, in the language being edited. */
  text: string;
  /** Whether the store's switch is on: "off" explains where it is, "wait" is still being asked. */
  status: "on" | "off" | "wait";
  busy: boolean;
  ask: AiWordsAsk;
  /** One option chosen: `to` is the language it is for (a translation goes to its own). */
  onPick: (words: string, to: Lang) => void;
  onClose: () => void;
}) {
  const [about, setAbout] = useState("");
  const [to, setTo] = useState<Lang | "">(others[0] ?? "");
  const [state, setState] = useState<{ working?: AiWordsAction; options?: string[]; for?: Lang; error?: string }>({});
  const has = Boolean(plainWords(text));
  const run = (action: AiWordsAction) => {
    const target = action === "translate" && to ? to : lang;
    setState({ working: action });
    ask(action, { about: about.trim() || undefined, to: action === "translate" && to ? to : undefined })
      .then((options) => setState(options.length ? { options, for: target } : { error: say("ما رجع كلام: جرّب كمان مرة.|No words came back: try again.|לא חזרו מילים: נסה שוב.") }))
      .catch((e: unknown) => setState({ error: e instanceof Error && e.message ? e.message : say("ما زبطت: جرّب كمان مرة.|It didn't work: try again.|לא הצליח: נסה שוב.") }));
  };
  const waiting = Boolean(state.working);
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] p-2" data-testid="studio-ai-words" data-kind={kind} data-status={status}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-white/80">🤖 {kind === "picture" ? say("وصف الصورة بالذكاء|The picture's description, with AI|תיאור התמונה עם AI") : say("كتابة بالذكاء|Writing with AI|כתיבה עם AI")}</div>
        <button type="button" className="px-1 text-white/50 hover:text-white" aria-label={say("سكّر|Close|סגור")} onClick={onClose} data-testid="studio-ai-close">×</button>
      </div>
      {status === "off" ? (
        <p className="text-[11px] leading-5 text-amber-200/90" data-testid="studio-ai-off">
          {say("هالميزة مطفية. بتشتغل من «الذكاء الاصطناعي» بلوحة التحكم ← «كاتب الصفحات» (بدها مفتاح OpenAI على السيرفر، وكل كبسة إلها كلفة صغيرة على حسابك هناك).|This is switched off. It is turned on under «AI» in the admin → «Page writer» (it needs the OpenAI key on the server, and each press has a small cost on your account there).|התכונה כבויה. מפעילים אותה תחת «AI» בניהול ← «כותב הדפים».")}{" "}
          <a className="underline" href="/admin/ai" data-testid="studio-ai-settings">{say("افتح صفحة الذكاء|Open the AI page|פתח את דף ה-AI")}</a>
        </p>
      ) : status === "wait" ? (
        <p className="text-[11px] text-white/45">{say("لحظة…|A moment…|רגע…")}</p>
      ) : kind === "picture" ? (
        <button type="button" className={btn} disabled={busy || waiting} onClick={() => run("describe")} data-testid="studio-ai-describe">
          {waiting ? say("عم يشوف الصورة…|Looking at the picture…|מסתכל על התמונה…") : say("اكتب وصف للصورة|Write the picture's description|כתוב תיאור לתמונה")}
        </button>
      ) : (
        <>
          <div className="flex gap-1">
            <input className={input} value={about} maxLength={400} onChange={(e) => setAbout(e.target.value)} placeholder={say("عن شو الكلام؟ مثلاً: تخفيضات الصيف|What are the words about? e.g. the summer sale|על מה המילים? למשל: מבצע הקיץ")} data-testid="studio-ai-about" />
            <button type="button" className={`${btn} shrink-0`} disabled={busy || waiting || !about.trim()} onClick={() => run("write")} data-testid="studio-ai-write">{say("اكتبلي|Write|כתוב")}</button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {(["improve", "shorter", "longer"] as const).map((a) => (
              <button key={a} type="button" className={btn} disabled={busy || waiting || !has} onClick={() => run(a)} data-testid={`studio-ai-${a}`}>
                {a === "improve" ? say("حسّنه|Make it better|שפר") : a === "shorter" ? say("قصّره|Shorter|קצר יותר") : say("طوّله|Longer|ארוך יותר")}
              </button>
            ))}
            {others.length ? (
              <span className="inline-flex items-center gap-1">
                <button type="button" className={`${btn} whitespace-nowrap`} disabled={busy || waiting || !has || !to} onClick={() => run("translate")} data-testid="studio-ai-translate">{say("ترجمه لـ|Translate into|תרגם ל")}</button>
                <select className={`${input} w-auto`} value={to} onChange={(e) => setTo(e.target.value as Lang)} aria-label={say("اللغة|Language|שפה")} data-testid="studio-ai-to">
                  {others.map((l) => <option key={l} value={l}>{say(LANG_WORD[l])}</option>)}
                </select>
              </span>
            ) : null}
          </div>
          {!has ? <p className="text-[10px] leading-4 text-white/40">{say("العنصر فاضي: اكتب عن شو بدك الكلام واكبس «اكتبلي».|The element is empty: say what the words are about and press «Write».|הרכיב ריק: כתוב על מה המילים ולחץ «כתוב».")}</p> : null}
          {waiting ? <p className="text-[11px] text-white/45" data-testid="studio-ai-working">{say("عم يكتب…|Writing…|כותב…")}</p> : null}
        </>
      )}
      {state.error ? <p className="text-[11px] text-amber-200/90" data-testid="studio-ai-error">{state.error}</p> : null}
      {state.options ? (
        <div className="space-y-1" data-testid="studio-ai-options">
          <div className="text-[10px] text-white/45">
            {state.for && state.for !== lang ? `${say("اختار واحد: بينحط بكلام|Pick one: it goes into the words in|בחר אחד: ייכנס למילים ב")} ${say(LANG_WORD[state.for])}` : say("اختار واحد بينحط مكان الكلام (بتقدر تتراجع):|Pick one to take the words' place (it can be undone):|בחר אחד שיחליף את המילים (אפשר לבטל):")}
          </div>
          {state.options.map((o) => (
            <button key={o} type="button" dir="auto" className="block w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-start text-xs leading-5 text-white/90 hover:bg-white/[0.1] disabled:opacity-40" disabled={busy} onClick={() => onPick(o, state.for ?? lang)} data-testid="studio-ai-option">
              {o}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
