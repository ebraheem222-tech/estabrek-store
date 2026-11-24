// Admin → القصص: the shop's story circles. The list in the shop's order (moved up and down) with where each stands
// and how often it was opened and its button pressed; one opened to change: its name in each language, its circle's
// picture, on or off, its times, and its slides (pictures from the media library, clips from the videos), each with
// its words, how long it stays, and a button to a product or a link. Shown on any page through the page editor's
// «شريط القصص». The backend checks everything again (lib/stories.ts).
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { MediaLibraryModal } from "../../components/media/MediaLibraryModal";
import { VideoPickerModal } from "../../components/media/VideoPickerModal";
import { getApiErrorMessage } from "../../api/http";
import * as StoriesAPI from "../../api/stories.api";
import * as CatalogAPI from "../../api/catalog.api";
import type { StoryReel, StoryReelInput, StorySlide, StoryWords } from "../../api/stories.api";
import { toast } from "../../lib/toast";
import { useAuth } from "../../hooks/useAuth";
import { say } from "../../studio/say";
import { adminLang } from "../../lib/lang";
import { anyWords, fromLocalBox, inputOf, moved, newSlide, reelState, toLocalBox, withWords, wordsIn } from "./storiesText";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/8 bg-white/3 px-3 text-sm disabled:opacity-60";
const small = "rounded-lg bg-white/6 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40";
/** A choice among a few (the one picked stands out). */
const chip = (on: boolean) => `rounded-lg px-2 py-1 text-xs disabled:opacity-40 ${on ? "bg-accent-500/30 font-semibold ring-1 ring-accent-400/60" : "bg-white/6 hover:bg-white/10"}`;
const LANGS: Array<[keyof StoryWords, string]> = [["ar", "عربي"], ["en", "English"], ["he", "עברית"]];
const SAFE_LINK = /^(\/(?!\/)|https?:\/\/|mailto:|tel:)[^\s<>"'`\\]*$/i;
const STATE: Record<ReturnType<typeof reelState>, [string, "success" | "default" | "warning" | "danger"]> = {
  live: ["بتبيّن هلّق|Showing now|מוצג עכשיו", "success"],
  off: ["مطفية|Switched off|כבוי", "default"],
  soon: ["لسا ما إجا وقتها|Not yet|עוד לא", "warning"],
  over: ["خلص وقتها|Its time is over|הזמן נגמר", "danger"],
  empty: ["فاضية (ضيفي صورة)|Empty (add a picture)|ריק (הוסיפו תמונה)", "default"],
};

export default function StoriesPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("pages:write");
  const q = useQuery({ queryKey: ["stories"], queryFn: StoriesAPI.listStories });
  const [chosen, setChosen] = useState<string | null>(null);
  const reels = q.data?.reels ?? [];
  const current = reels.find((r) => r.id === chosen) ?? null;
  const refresh = () => qc.invalidateQueries({ queryKey: ["stories"] });

  const add = useMutation({
    mutationFn: () => StoriesAPI.createStory({ title: { [adminLang() as keyof StoryWords]: say("قصة جديدة|New story|סטורי חדש") }, cover: null, slides: [], isActive: true, startsAt: null, endsAt: null }),
    onSuccess: (r) => { setChosen(r.id); void refresh(); },
    onError: (e) => toast.error(say("ما انضافت|Not added|לא נוסף"), { description: getApiErrorMessage(e) }),
  });
  const order = useMutation({
    mutationFn: (ids: string[]) => StoriesAPI.orderStories(ids),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(say("ما انحفظ الترتيب|The order wasn't saved|הסדר לא נשמר"), { description: getApiErrorMessage(e) }),
  });

  return (
    <div className="space-y-4 pb-24" data-testid="stories-page">
      <div className={box}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{say("القصص (ستوريز)|Stories|סטוריז")}</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/60">
              {say("دواير بأعلى المتجر متل إنستغرام: صور وفيديوهات بتتقلّب لحالها، وكل وحدة فيها زر لقطعة أو رابط. حطّي «شريط القصص» بأي صفحة من محرر الصفحات (إضافة ← تفاعلية).|Circles at the top of the shop like Instagram: pictures and clips that play by themselves, each with a button to a piece or a link. Put the “Story bar” on any page from the page editor (Add → Interactive).|עיגולים בראש החנות כמו באינסטגרם: תמונות וסרטונים שמתחלפים לבד, בכל אחד כפתור לפריט או לקישור. שימו „פס סטוריז” בכל עמוד מעורך העמודים (הוספה ← אינטראקטיבי).")}
            </p>
          </div>
          {canWrite ? <Button variant="primary" onClick={() => add.mutate()} disabled={add.isPending || reels.length >= (q.data?.limits.reels ?? 40)} data-testid="stories-add">+ {say("قصة جديدة|New story|סטורי חדש")}</Button> : null}
        </div>
      </div>

      {q.isLoading ? (
        <div className={`${box} flex items-center gap-2 text-sm`}><Spinner /> {say("جاري التحميل…|Loading…|טוען…")}</div>
      ) : q.isError ? (
        <div className={`${box} text-sm text-red-200`}>{getApiErrorMessage(q.error)}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className={`${box} space-y-2`} data-testid="stories-list">
            {!reels.length ? <p className="text-sm text-white/55">{say("لسا ما في قصص. اضغطي «قصة جديدة».|No stories yet. Press “New story”.|עדיין אין סטוריז. לחצו „סטורי חדש”.")}</p> : null}
            {reels.map((r, i) => {
              const [stateWords, variant] = STATE[reelState(r)];
              const cover = r.cover ?? r.slides.find((s) => s.kind === "image")?.src ?? r.slides[0]?.poster ?? null;
              return (
                <div key={r.id} className={`flex items-center gap-3 rounded-xl border p-2 ${chosen === r.id ? "border-accent-500/60 bg-accent-500/10" : "border-white/6"}`} data-reel={r.id}>
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => setChosen(r.id)} data-testid="stories-open">
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-accent-400/70 bg-white/[0.06]">
                      {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <span className="text-white/40">◌</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{anyWords(r.title) || say("بلا اسم|Unnamed|ללא שם")}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
                        <Badge variant={variant} size="sm">{say(stateWords)}</Badge>
                        <span>{r.slides.length} {say("سلايد|slides|שקופיות")}</span>
                        <span title={say("فتحوها|Opened|נפתח")}>👁 {r.views}</span>
                        <span title={say("ضغطوا الزر|Button pressed|לחצו על הכפתור")}>↗ {r.taps}</span>
                      </span>
                    </span>
                  </button>
                  {canWrite ? (
                    <span className="flex flex-col gap-1">
                      <button type="button" className={small} disabled={order.isPending || i === 0} onClick={() => order.mutate(moved(reels, i, -1).map((x) => x.id))} aria-label={say("لفوق|Up|למעלה")}>↑</button>
                      <button type="button" className={small} disabled={order.isPending || i === reels.length - 1} onClick={() => order.mutate(moved(reels, i, 1).map((x) => x.id))} aria-label={say("لتحت|Down|למטה")}>↓</button>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          {current ? <ReelEditor key={`${current.id}:${current.updatedAt}`} reel={current} canWrite={canWrite} limits={q.data!.limits} onSaved={refresh} onGone={() => { setChosen(null); void refresh(); }} /> : (
            <div className={`${box} grid place-items-center text-sm text-white/45`}>{say("اختاري قصة لتعدّليها.|Choose a story to change it.|בחרו סטורי כדי לערוך.")}</div>
          )}
        </div>
      )}
    </div>
  );
}

function ReelEditor({ reel, canWrite, limits, onSaved, onGone }: { reel: StoryReel; canWrite: boolean; limits: StoriesAPI.StoryLimits; onSaved: () => void; onGone: () => void }) {
  const [draft, setDraft] = useState<StoryReelInput>(() => inputOf(reel));
  const [lang, setLang] = useState<keyof StoryWords>((["ar", "en", "he"].includes(adminLang()) ? adminLang() : "ar") as keyof StoryWords);
  const [open, setOpen] = useState<string | null>(reel.slides[0]?.id ?? null);
  const [picking, setPicking] = useState<"cover" | "pictures" | "video" | null>(null);
  const [asking, setAsking] = useState(false);
  const set = (patch: Partial<StoryReelInput>) => setDraft((d) => ({ ...d, ...patch }));
  const setSlide = (id: string, patch: Partial<StorySlide>) => set({ slides: draft.slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const dirty = JSON.stringify(draft) !== JSON.stringify(inputOf(reel));
  const badTimes = Boolean(draft.startsAt && draft.endsAt && Date.parse(draft.startsAt) >= Date.parse(draft.endsAt));
  const room = limits.slides - draft.slides.length;

  const save = useMutation({
    mutationFn: () => StoriesAPI.saveStory(reel.id, draft),
    onSuccess: () => { toast.success(say("انحفظت القصة|Story saved|הסטורי נשמר")); onSaved(); },
    onError: (e) => toast.error(say("ما انحفظت|Not saved|לא נשמר"), { description: getApiErrorMessage(e) }),
  });
  const remove = useMutation({
    mutationFn: () => StoriesAPI.deleteStory(reel.id),
    onSuccess: () => { toast.success(say("انمسحت القصة|Story deleted|הסטורי נמחק")); onGone(); },
    onError: (e) => toast.error(say("ما انمسحت|Not deleted|לא נמחק"), { description: getApiErrorMessage(e) }),
  });
  const addPictures = (urls: string[]) => {
    let slides = [...draft.slides];
    for (const u of urls.slice(0, room)) slides = [...slides, newSlide(u, slides)];
    set({ slides });
    setOpen(slides[draft.slides.length]?.id ?? open);
  };

  return (
    <div className="space-y-4" data-testid="story-editor">
      <div className={`${box} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1" role="group" aria-label={say("لغة الكلام|Words' language|שפת המילים")}>
            {LANGS.map(([l, name]) => <button key={l} type="button" className={chip(lang === l)} aria-pressed={lang === l} onClick={() => setLang(l)}>{name}</button>)}
          </div>
          <ToggleSwitch checked={draft.isActive} label={say("شغّالة|On|פעיל")} disabled={!canWrite} onChange={(v) => set({ isActive: v })} />
        </div>
        <label className="block text-xs text-white/60">
          {say("اسمها تحت الدائرة|Its name under the circle|השם מתחת לעיגול")}
          <input className={`${field} mt-1`} maxLength={40} value={wordsIn(draft.title, lang)} disabled={!canWrite} onChange={(e) => set({ title: withWords(draft.title, lang, e.target.value) })} data-testid="story-title" />
        </label>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-accent-400/70 bg-white/[0.06]">
            {draft.cover ? <img src={draft.cover} alt="" className="h-full w-full object-cover" /> : <span className="text-white/35">◌</span>}
          </span>
          <span className="min-w-0 flex-1">{say("صورة الدائرة (فاضي = أول سلايد)|The circle's picture (empty = the first slide)|תמונת העיגול (ריק = השקופית הראשונה)")}</span>
          {canWrite ? <button type="button" className={small} onClick={() => setPicking("cover")}>{say("اختاري|Choose|בחירה")}</button> : null}
          {canWrite && draft.cover ? <button type="button" className={`${small} text-red-300`} onClick={() => set({ cover: null })}>{say("شيل|Remove|הסרה")}</button> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-white/60">
            {say("بتبيّن من (اختياري)|Shows from (optional)|מוצג מ־ (רשות)")}
            <input type="datetime-local" dir="ltr" className={`${field} mt-1`} value={toLocalBox(draft.startsAt)} disabled={!canWrite} onChange={(e) => set({ startsAt: fromLocalBox(e.target.value) })} data-testid="story-from" />
          </label>
          <label className="block text-xs text-white/60">
            {say("لحد (اختياري)|Until (optional)|עד (רשות)")}
            <input type="datetime-local" dir="ltr" className={`${field} mt-1`} value={toLocalBox(draft.endsAt)} disabled={!canWrite} onChange={(e) => set({ endsAt: fromLocalBox(e.target.value) })} data-testid="story-until" />
          </label>
        </div>
        {badTimes ? <p className="text-xs text-red-300">{say("وقت النهاية لازم يكون بعد البداية.|The end must come after the start.|הסוף חייב לבוא אחרי ההתחלה.")}</p> : null}
      </div>

      <div className={`${box} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{say("السلايدات|Slides|שקופיות")} <span className="text-white/45">({draft.slides.length}/{limits.slides})</span></h2>
          {canWrite ? (
            <span className="flex gap-2">
              <Button size="sm" disabled={room <= 0} onClick={() => setPicking("pictures")} data-testid="story-add-pictures">+ {say("صور|Pictures|תמונות")}</Button>
              <Button size="sm" disabled={room <= 0} onClick={() => setPicking("video")}>+ {say("فيديو|Video|וידאו")}</Button>
            </span>
          ) : null}
        </div>
        {!draft.slides.length ? <p className="text-sm text-white/50">{say("ضيفي صور أو فيديوهات. الصور الطولية (9:16) بتعبّي الشاشة أحلى.|Add pictures or clips. Tall ones (9:16) fill the screen best.|הוסיפו תמונות או סרטונים. אנכיים (9:16) ממלאים את המסך הכי יפה.")}</p> : null}
        <div className="space-y-2">
          {draft.slides.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-white/[0.06] p-2" data-slide={s.id}>
              <div className="flex items-center gap-3">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <span className="relative h-16 w-9 shrink-0 overflow-hidden rounded-md bg-black/40">
                    {s.kind === "image" ? <img src={s.src} alt="" className="h-full w-full object-cover" /> : s.poster ? <img src={s.poster} alt="" className="h-full w-full object-cover" /> : null}
                    {s.kind === "video" ? <span className="absolute inset-0 grid place-items-center text-xs">▶</span> : null}
                  </span>
                  <span className="min-w-0 text-xs text-white/70">
                    <span className="block">{i + 1}. {s.kind === "image" ? say("صورة|Picture|תמונה") : say("فيديو|Clip|סרטון")}{s.kind === "image" ? ` · ${s.seconds ?? limits.seconds.image}s` : ""}</span>
                    <span className="block truncate text-white/45">{wordsIn(s.caption, lang) || (s.productId ? say("فيها زر لقطعة|With a button to a piece|עם כפתור לפריט") : s.href ? s.href : "")}</span>
                  </span>
                </button>
                {canWrite ? (
                  <span className="flex gap-1">
                    <button type="button" className={small} disabled={i === 0} onClick={() => set({ slides: moved(draft.slides, i, -1) })} aria-label={say("لفوق|Up|למעלה")}>↑</button>
                    <button type="button" className={small} disabled={i === draft.slides.length - 1} onClick={() => set({ slides: moved(draft.slides, i, 1) })} aria-label={say("لتحت|Down|למטה")}>↓</button>
                    <button type="button" className={`${small} text-red-300`} onClick={() => set({ slides: draft.slides.filter((x) => x.id !== s.id) })} aria-label={say("شيل|Remove|הסרה")} data-testid="story-slide-remove">✕</button>
                  </span>
                ) : null}
              </div>
              {open === s.id ? <SlideFields slide={s} lang={lang} canWrite={canWrite} limits={limits} onChange={(patch) => setSlide(s.id, patch)} /> : null}
            </div>
          ))}
        </div>
      </div>

      {canWrite ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="danger" onClick={() => setAsking(true)} disabled={remove.isPending}>{say("امسحي القصة|Delete the story|מחיקת הסטורי")}</Button>
          <Button variant="primary" onClick={() => save.mutate()} disabled={!dirty || badTimes || save.isPending} data-testid="story-save">{save.isPending ? <Spinner /> : null} {say("احفظي|Save|שמירה")}</Button>
        </div>
      ) : null}

      <MediaLibraryModal
        open={picking === "cover" || picking === "pictures"} multiple={picking === "pictures"} maxSelect={Math.max(1, room)} onClose={() => setPicking(null)}
        title={picking === "cover" ? say("صورة الدائرة|The circle's picture|תמונת העיגול") : say("صور للقصة|Pictures for the story|תמונות לסטורי")}
        onSelect={(u) => { const was = picking; setPicking(null); if (was === "cover") set({ cover: u }); else addPictures([u]); }}
        onSelectMultiple={(urls) => { setPicking(null); addPictures(urls); }}
      />
      <VideoPickerModal
        open={picking === "video"} onClose={() => setPicking(null)}
        onPick={({ url, posterUrl, stream }) => {
          setPicking(null);
          // A story plays a plain clip file (an adaptive stream needs a player of its own).
          if (stream || /\.m3u8(\?|$)/i.test(url)) return void toast.error(say("اختاري نسخة MP4 من الفيديو|Choose an MP4 version of the video|בחרו גרסת MP4 של הסרטון"));
          const slide = newSlide(url, draft.slides, posterUrl);
          set({ slides: [...draft.slides, { ...slide, kind: "video" }] });
          setOpen(slide.id);
        }}
      />
      <ConfirmDialog
        open={asking} onClose={() => setAsking(false)} onConfirm={() => { setAsking(false); remove.mutate(); }}
        title={say("تمسحي القصة؟|Delete the story?|למחוק את הסטורי?")} message={say("بتختفي من المتجر مع كل سلايداتها وأرقامها.|It goes from the shop with all its slides and numbers.|הוא ייעלם מהחנות עם כל השקופיות והמספרים.")}
        confirmText={say("امسحي|Delete|מחיקה")}
      />
    </div>
  );
}

function SlideFields({ slide, lang, canWrite, limits, onChange }: { slide: StorySlide; lang: keyof StoryWords; canWrite: boolean; limits: StoriesAPI.StoryLimits; onChange: (patch: Partial<StorySlide>) => void }) {
  const [link, setLink] = useState(slide.href ?? "");
  const [choosing, setChoosing] = useState(false);
  const products = useQuery({ queryKey: ["products-pick"], queryFn: () => CatalogAPI.listProducts("all"), staleTime: 60_000 });
  const product = useMemo(() => (slide.productId ? products.data?.find((p) => p.id === slide.productId) ?? null : null), [products.data, slide.productId]);
  return (
    <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3 text-xs text-white/60">
      <label className="block">
        {say("الكلام عليها (اختياري)|Its words (optional)|המילים עליה (רשות)")}
        <textarea className={`${field} mt-1 h-16 py-2`} maxLength={200} value={wordsIn(slide.caption, lang)} disabled={!canWrite} onChange={(e) => onChange({ caption: withWords(slide.caption, lang, e.target.value) })} data-testid="story-caption" />
      </label>
      {slide.kind === "image" ? (
        <label className="block">
          {say("قديش بتضل (ثواني)|How long it stays (seconds)|כמה זמן היא נשארת (שניות)")}
          <input type="number" className={`${field} mt-1 w-28`} min={limits.seconds.min} max={limits.seconds.max} value={slide.seconds ?? limits.seconds.image} disabled={!canWrite}
            onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= limits.seconds.min && n <= limits.seconds.max) onChange({ seconds: n }); }} />
        </label>
      ) : <p>{say("الفيديو بيلعب لآخره (لحد دقيقة).|The clip plays to its end (up to a minute).|הסרטון מתנגן עד הסוף (עד דקה).")}</p>}
      <div className="space-y-2 rounded-xl border border-white/[0.06] p-2">
        <div className="font-medium text-white/70">{say("الزر تحتها|Its button|הכפתור שלה")}</div>
        {slide.productId ? (
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">🛍 {product?.title ?? slide.productId}</span>
            {canWrite ? <button type="button" className={`${small} text-red-300`} onClick={() => onChange({ productId: undefined })}>{say("شيل|Remove|הסרה")}</button> : null}
          </div>
        ) : canWrite ? (
          choosing ? <ProductChooser products={products.data ?? []} loading={products.isLoading} onPick={(id) => { setChoosing(false); onChange({ productId: id, href: undefined }); setLink(""); }} />
            : <button type="button" className={small} onClick={() => setChoosing(true)} data-testid="story-pick-product">{say("وصّليها بقطعة من المتجر|Link it to a piece of the shop|לקשר לפריט בחנות")}</button>
        ) : null}
        {!slide.productId ? (
          <label className="block">
            {say("أو رابط (اختياري)|Or a link (optional)|או קישור (רשות)")}
            <input className={`${field} mt-1`} dir="ltr" value={link} disabled={!canWrite} placeholder="/shop?sort=new"
              onChange={(e) => setLink(e.target.value)}
              onBlur={() => { const v = link.trim(); if (!v) onChange({ href: undefined }); else if (v.length <= 500 && SAFE_LINK.test(v)) onChange({ href: v }); else toast.error(say("الرابط مش صالح|Not a valid link|קישור לא תקין")); }} />
          </label>
        ) : null}
        {slide.productId || slide.href ? (
          <label className="block">
            {say("كلام الزر (فاضي = تسوّقي هالقطعة)|Button words (empty = Shop this piece)|מילות הכפתור (ריק = לקנות את הפריט)")}
            <input className={`${field} mt-1`} maxLength={40} value={wordsIn(slide.label, lang)} disabled={!canWrite} onChange={(e) => onChange({ label: withWords(slide.label, lang, e.target.value) })} />
          </label>
        ) : null}
      </div>
      <p className="text-white/40">
        {say("بدك صور طولية حلوة؟ جرّبي|Want lovely tall pictures? Try|רוצים תמונות אנכיות יפות? נסו את")} <Link className="underline" to="/admin/media">{say("الوسائط|the media|המדיה")}</Link>.
      </p>
    </div>
  );
}

function ProductChooser({ products, loading, onPick }: { products: Array<{ id: string; title: string; slug: string; isActive?: boolean }>; loading: boolean; onPick: (id: string) => void }) {
  const [text, setText] = useState("");
  const found = useMemo(() => {
    const t = text.trim().toLowerCase();
    return (t ? products.filter((p) => p.title.toLowerCase().includes(t) || p.slug.toLowerCase().includes(t)) : products).slice(0, 8);
  }, [products, text]);
  return (
    <div className="space-y-2" data-testid="story-product-picker">
      <input className={field} value={text} onChange={(e) => setText(e.target.value)} placeholder={say("اسم القطعة…|The piece's name…|שם הפריט…")} aria-label={say("بحث عن قطعة|Look for a piece|חיפוש פריט")} autoFocus />
      {loading ? <div className="flex items-center gap-2"><Spinner /> …</div> : (
        <ul className="max-h-52 overflow-auto rounded-xl border border-white/10">
          {found.map((p) => (
            <li key={p.id}><button type="button" onClick={() => onPick(p.id)} className="block w-full px-3 py-2 text-start text-sm hover:bg-white/5">{p.title}</button></li>
          ))}
          {!found.length ? <li className="px-3 py-2 text-white/45">{say("ما في قطعة بهالاسم.|No piece with this name.|אין פריט בשם הזה.")}</li> : null}
        </ul>
      )}
    </div>
  );
}
