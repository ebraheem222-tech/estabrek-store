/**
 * A clip's and a picture's own settings, each in its cards (the inspector shows a card under its section):
 *
 * - A clip: "The clip" (its file, the picture shown before it plays, its description) under the content, and
 *   "Playing" (how it starts, again from the start, its speed, its sound, the player's buttons, what loads before
 *   it's played) under the behaviour.
 * - A picture: "The picture" (the file, its description) under the content, and "When it's tapped" (its link, in
 *   a new tab or not) and "Loading" under the behaviour.
 *
 * How each fills its frame, its shape, corners and proportions are in the look (StylePanels' MediaStylePanel).
 * Every change goes out as a draft change, so undo works on all of it. What a clip does with these is the shop's
 * pageTree/videoPlay.ts.
 */
import { useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import { MediaLibraryModal } from "../components/media/MediaLibraryModal";
import { VideoPickerModal } from "../components/media/VideoPickerModal";
import type { Lang } from "../lib/lang";
import { Field } from "./StudioPanels";
import { Choice, ElementPanel } from "./StudioTreePanels";
import { say } from "./say";
import { typeLabel } from "./treeIndex";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Props = { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops };

const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const box = "space-y-3 rounded-xl border border-white/[0.08] p-3";
const head = "text-xs font-medium text-white/70";
const part = "border-t border-white/[0.06] pt-2 text-[11px] font-medium text-white/60";
const hint = "text-[10px] leading-4 text-white/40";
const SAFE_LINK = /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)[^\s<>"'`\\]*$/i;
const SAFE_FILE = /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\]+$/i;

const withWords = (t: unknown, lang: Lang, v: string) => {
  const out: Record<string, string> = { ...((t && typeof t === "object" ? t : {}) as Record<string, string>) };
  if (v.trim()) out[lang] = v;
  else delete out[lang];
  return out;
};
const wordsOf = (t: unknown, lang: Lang) => (t && typeof t === "object" ? String((t as Record<string, string>)[lang] ?? "") : typeof t === "string" ? t : "");

/** How a clip starts, from its settings (the shop's videoPlay.ts reads them the same way). */
export type VideoStart = "press" | "auto" | "view" | "hover";
export const videoStart = (p: Record<string, unknown>): VideoStart => (p.autoplay === true ? "auto" : p.playOn === "view" || p.playOn === "hover" ? p.playOn : "press");
/** The settings a way of starting leaves on the clip (one way at a time). */
export const withVideoStart = (p: Record<string, unknown>, start: VideoStart): Record<string, unknown> => ({
  ...p,
  autoplay: start === "auto" ? true : undefined,
  playOn: start === "view" || start === "hover" ? start : undefined,
});

function Toggle({ label, on, busy, onChange, testId }: { label: string; on: boolean; busy: boolean; onChange: (on: boolean) => void; testId?: string }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/75">{label}</span>
      <input type="checkbox" disabled={busy} checked={on} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
    </label>
  );
}

/** A clip's cards: the clip itself, and how it plays. */
export function VideoCards({ node, lang, busy, onOps }: Props) {
  const [library, setLibrary] = useState(false);
  const [posters, setPosters] = useState(false);
  const p = (node.props ?? {}) as Record<string, unknown>;
  const set = (label: string, next: Record<string, unknown>) => onOps(label, [{ op: "setProps", nodeId: node.id, props: next }]);
  const patch = (label: string, more: Record<string, unknown>) => set(label, { ...p, ...more });
  const start = videoStart(p);
  const self = start !== "press";
  const poster = typeof p.poster === "string" ? p.poster : "";
  const speed = typeof p.speed === "number" ? p.speed : 1;
  const edit = say("تعديل|Edit|עריכה");
  return (
    <>
      <div className={box} data-testid="studio-element">
        <div className={head}>{typeLabel(node.type)}</div>
        {typeof p.src === "string" && p.src ? <video src={p.src} poster={poster || undefined} muted playsInline preload="metadata" className="h-28 w-full rounded-lg bg-black/40 object-contain" data-testid="studio-video-thumb" /> : null}
        <Field
          label={say("رابط الفيديو (MP4، من مكتبة الفيديوهات أو أي رابط https)|Video link (MP4, from the video library or any https link)|קישור לסרטון (MP4, מספריית הסרטונים או כל קישור https)")}
          value={typeof p.src === "string" ? p.src : ""} testId="studio-prop-src"
          onSave={(v) => SAFE_FILE.test(v.trim()) && patch(edit, { src: v.trim() })}
        />
        <button type="button" className={btn} disabled={busy} onClick={() => setLibrary(true)} data-testid="studio-pick-video">{say("من مكتبة الفيديوهات|From the video library|מספריית הסרטונים")}</button>

        <div className={part}>{say("الصورة قبل ما يشتغل|The picture before it plays|התמונה לפני הניגון")}</div>
        {poster ? <img src={poster} alt="" className="h-20 w-full rounded-lg object-cover" data-testid="studio-video-poster" /> : <p className={hint}>{say("بلا صورة: بيبيّن أول مشهد من الفيديو.|No picture: the clip's first frame shows.|ללא תמונה: מוצגת התמונה הראשונה של הסרטון.")}</p>}
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={btn} disabled={busy} onClick={() => setPosters(true)} data-testid="studio-video-poster-pick">{poster ? say("تغيير الصورة|Change the picture|החלפת התמונה") : say("اختيار صورة|Choose a picture|בחירת תמונה")}</button>
          {poster ? <button type="button" className={btn} disabled={busy} onClick={() => patch(say("صورة الفيديو|The clip's picture|תמונת הסרטון"), { poster: undefined })} data-testid="studio-video-poster-clear">{say("بلا صورة|No picture|ללא תמונה")}</button> : null}
        </div>

        <div className={part}>{say("لقارئ الشاشة|For screen readers|לקורא מסך")}</div>
        <Field label={say("وصف الفيديو|What the clip shows|תיאור הסרטון")} value={wordsOf(p.label, lang)} onSave={(v) => patch(edit, { label: withWords(p.label, lang, v) })} testId="studio-prop-label" />

        <VideoPickerModal open={library} onClose={() => setLibrary(false)} onPick={({ url, posterUrl }) => { setLibrary(false); patch(edit, { src: url, ...(posterUrl ? { poster: posterUrl } : {}) }); }} />
        <MediaLibraryModal open={posters} onClose={() => setPosters(false)} title={say("صورة الفيديو|The clip's picture|תמונת הסרטון")} onSelect={(u) => { setPosters(false); patch(say("صورة الفيديو|The clip's picture|תמונת הסרטון"), { poster: u }); }} />
      </div>

      <div className={box} data-testid="studio-video-play" data-insp-as="behaviour">
        <div className={head}>{say("تشغيل الفيديو|Playing the clip|ניגון הסרטון")}</div>
        <Choice<VideoStart>
          label={say("بيبدأ|It starts|מתחיל")} value={start} busy={busy} testId="studio-video-start"
          options={[
            ["press", say("لما ينكبس|When it's pressed|בלחיצה")],
            ["auto", say("لحاله فوراً|By itself, at once|מעצמו, מיד")],
            ["view", say("لما يبيّن عالشاشة|Once it's seen|כשהוא נראה")],
            ["hover", say("والماوس فوقه|With the mouse over it|כשהעכבר מעליו")],
          ]}
          onPick={(v) => set(say("تشغيل الفيديو|Playing the clip|ניגון הסרטון"), withVideoStart(p, v))}
        />
        {self ? <p className={hint} data-testid="studio-video-self">{say("فيديو بيشتغل لحاله بيكون بلا صوت وبلا أزرار المشغّل (هيك بتطلب المتصفحات). العنصر «الخفيف» بسرعة الصفحة بيستنى كبسة.|A clip that plays by itself has no sound and no player buttons (browsers ask for that). An element set to “light” in the page's speed waits to be pressed.|סרטון שמתנגן מעצמו הוא בלי קול ובלי כפתורי נגן (כך דורשים הדפדפנים). רכיב «קל» ממתין ללחיצה.")}</p> : null}
        <Toggle label={say("بيعيد من الأول|Starts again when it ends|מתחיל שוב בסיומו")} on={p.loop === true} busy={busy} onChange={(on) => patch(edit, { loop: on || undefined })} testId="studio-video-loop" />
        <Choice
          label={say("السرعة|Speed|מהירות")} value={String(speed)} busy={busy} testId="studio-video-speed"
          options={[["0.5", "×0.5"], ["0.75", "×0.75"], ["1", say("عادية|Normal|רגילה")], ["1.25", "×1.25"], ["1.5", "×1.5"], ["2", "×2"]]}
          onPick={(v) => patch(say("سرعة الفيديو|The clip's speed|מהירות הסרטון"), { speed: v === "1" ? undefined : Number(v) })}
        />
        {self ? null : (
          <>
            <div className={part}>{say("الصوت والأزرار|Sound and buttons|קול וכפתורים")}</div>
            <Toggle label={say("بيبدأ بلا صوت|Starts without sound|מתחיל בלי קול")} on={p.muted === true} busy={busy} onChange={(on) => patch(edit, { muted: on || undefined })} testId="studio-video-muted" />
            <Toggle label={say("أزرار المشغّل|The player's buttons|כפתורי הנגן")} on={p.controls !== false} busy={busy} onChange={(on) => patch(edit, { controls: on ? undefined : false })} testId="studio-video-controls" />
            {p.controls !== false ? <Toggle label={say("إخفاء زر التنزيل|Hide the download button|הסתרת כפתור ההורדה")} on={p.noDownload === true} busy={busy} onChange={(on) => patch(edit, { noDownload: on || undefined })} testId="studio-video-nodownload" /> : (
              <p className={hint}>{say("بلا أزرار ما في طريقة للزبون يشغّله: خلّيه يبدأ لحاله، أو حطّي له زر بيشغّله (المحفّزات).|Without buttons a visitor has no way to play it: let it start by itself, or give it a button that plays it (triggers).|בלי כפתורים אין למבקר דרך לנגן: שיתחיל מעצמו, או כפתור שמנגן אותו (טריגרים).")}</p>
            )}
          </>
        )}
        <div className={part}>{say("التحميل|Loading|טעינה")}</div>
        <Choice
          label={say("قبل ما يشتغل بيتحمّل|Before it's played, it loads|לפני הניגון נטען")} value={typeof p.preload === "string" ? p.preload : "metadata"} busy={busy} testId="studio-video-preload"
          options={[
            ["metadata", say("أول مشهد وطوله|Its first frame and length|התמונה הראשונה והאורך")],
            ["none", say("ولا إشي (صفحة أخف)|Nothing (a lighter page)|כלום (עמוד קל יותר)")],
            ["auto", say("الفيديو كله (بيبدأ فوراً)|The whole clip (starts at once)|כל הסרטון (מתחיל מיד)")],
          ]}
          onPick={(v) => patch(say("تحميل الفيديو|The clip's loading|טעינת הסרטון"), { preload: v === "metadata" ? undefined : v })}
        />
      </div>
    </>
  );
}

/** A picture's cards: the picture itself, what a tap on it does, and when it loads. */
export function ImageCards({ node, lang, busy, onOps }: Props) {
  const [library, setLibrary] = useState(false);
  const p = (node.props ?? {}) as Record<string, unknown>;
  const patch = (label: string, more: Record<string, unknown>) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, ...more } }]);
  const href = typeof p.href === "string" ? p.href : "";
  const edit = say("تعديل|Edit|עריכה");
  return (
    <>
      <div className={box} data-testid="studio-element">
        <div className={head}>{typeLabel(node.type)}</div>
        {typeof p.src === "string" ? <img src={p.src} alt="" className="h-28 w-full rounded-lg object-cover" /> : null}
        <button type="button" className={btn} disabled={busy} onClick={() => setLibrary(true)} data-testid="studio-pick-image">{say("تغيير الصورة|Change the picture|החלפת התמונה")}</button>
        <div className={part}>{say("لقارئ الشاشة|For screen readers|לקורא מסך")}</div>
        <Field label={say("وصف الصورة (فاضي = زينة بس)|What the picture shows (empty = decoration only)|תיאור התמונה (ריק = קישוט בלבד)")} value={wordsOf(p.alt, lang)} onSave={(v) => patch(edit, { alt: withWords(p.alt, lang, v) })} testId="studio-prop-alt" />
        <MediaLibraryModal open={library} onClose={() => setLibrary(false)} title={say("صورة|Picture|תמונה")} onSelect={(u) => { setLibrary(false); patch(edit, { src: u }); }} />
      </div>

      <div className={box} data-testid="studio-image-link" data-insp-as="behaviour">
        <div className={head}>{say("لما تنكبس الصورة|When the picture is tapped|בלחיצה על התמונה")}</div>
        <Field
          label={say("رابط (صفحة بالمتجر متل /shop، أو https://…). فاضي = ما بتعمل إشي|Link (a store page like /shop, or https://…). Empty = nothing happens|קישור (עמוד בחנות כמו /shop, או https://…). ריק = לא קורה דבר")}
          value={href} testId="studio-prop-href"
          onSave={(v) => {
            const t = v.trim();
            if (!t) patch(say("رابط الصورة|The picture's link|קישור התמונה"), { href: undefined, newTab: undefined });
            else if (SAFE_LINK.test(t)) patch(say("رابط الصورة|The picture's link|קישור התמונה"), { href: t });
          }}
        />
        {href ? <Toggle label={say("بيفتح بصفحة جديدة|Opens in a new tab|נפתח בלשונית חדשה")} on={p.newTab === true} busy={busy} onChange={(on) => patch(say("رابط الصورة|The picture's link|קישור התמונה"), { newTab: on || undefined })} testId="studio-image-newtab" /> : null}
        <div className={part}>{say("التحميل|Loading|טעינה")}</div>
        <Toggle label={say("بتتحمّل أول إشي (صورة براس الصفحة)|Loads first (a picture at the top of the page)|נטענת ראשונה (תמונה בראש העמוד)")} on={p.priority === true} busy={busy} onChange={(on) => patch(say("تحميل الصورة|The picture's loading|טעינת התמונה"), { priority: on || undefined })} testId="studio-image-priority" />
        <p className={hint}>{say("باقي الصور بتستنى لتقرب من الشاشة، وهيك الصفحة بتفتح أسرع. أول صورة بالصفحة بتتحمّل أول إشي لحالها.|Other pictures wait until they're near the screen, so the page opens faster. The page's first picture loads first by itself.|שאר התמונות ממתינות עד שהן קרובות למסך, כך העמוד נפתח מהר יותר. התמונה הראשונה בעמוד נטענת ראשונה מעצמה.")}</p>
      </div>
    </>
  );
}

/** An element's own settings: a clip's and a picture's cards, anything else's one panel. */
export function ContentPanel(props: Props) {
  if (props.node.type === "video") return <VideoCards {...props} />;
  if (props.node.type === "image") return <ImageCards {...props} />;
  return <ElementPanel {...props} />;
}
