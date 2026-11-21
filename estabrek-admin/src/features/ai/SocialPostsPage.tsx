// «منشورات السوشال»: posts for Instagram, Facebook, TikTok, WhatsApp and X from one to three of the
// shop's pieces or an offer in the owner's words, or a week's plan made of the shop's own pieces.
// Each post comes ready to paste (within the platform's limit) with a copy button and, where the
// platform allows it, a share link. Nothing is posted by itself.
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { ToggleSwitch } from "../../components/ui/ToggleSwitch";
import { getApiErrorMessage } from "../../api/http";
import { listProducts, type CatalogProduct } from "../../api/catalog.api";
import * as M from "../../api/aiMarketing.api";
import type { Platform, PostTone, ShopLang } from "../../api/aiMarketing.api";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";

const box = "rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field = "h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm";
const pill = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-accent-400/70 bg-accent-500/20 text-white" : "border-white/10 text-white/70 hover:border-white/25"}`;

export const PLATFORM_NAME: Record<Platform, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", whatsapp: "WhatsApp", x: "X" };
const PLATFORM_ICON: Record<Platform, string> = { instagram: "📸", facebook: "👍", tiktok: "🎵", whatsapp: "💬", x: "✖️" };
const toneName = (t: PostTone) =>
  ({
    friendly: say("ودود|Friendly|ידידותי"),
    luxury: say("فخم|Luxury|יוקרתי"),
    playful: say("مرح|Playful|שובב"),
    offer: say("عرض وتخفيض|Offer|מבצע"),
    informative: say("معلومات|Informative|אינפורמטיבי"),
  })[t];
const dayName = (d: number) => say(`اليوم ${d}|Day ${d}|יום ${d}`);

/** Where the post can be opened ready to send: WhatsApp and X take the words, Facebook only the link. */
export function shareLink(platform: Platform, text: string, url: string | null): string | null {
  if (platform === "whatsapp") return `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (platform === "x") return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  if (platform === "facebook" && url) return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  return null;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(say("انسخ ✓|Copied ✓|הועתק ✓"));
  } catch {
    toast.error(say("ما انسخ، علّمه وانسخه بإيدك|Couldn't copy, select it and copy by hand|לא הועתק, יש לסמן ולהעתיק ידנית"));
  }
}

function PostCard({ platform, text, idea, url, extra }: { platform: Platform; text: string; idea?: string; url: string | null; extra?: ReactNode }) {
  const [words, setWords] = useState(text);
  const share = shareLink(platform, words, url);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="social-post" data-platform={platform}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{PLATFORM_ICON[platform]} {PLATFORM_NAME[platform]}</span>
        <span className="text-[11px] text-white/40" dir="ltr">{words.length}</span>
      </div>
      {extra}
      <textarea value={words} onChange={(e) => setWords(e.target.value)} rows={Math.min(14, Math.max(3, words.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 46)), 0)))} className="w-full resize-y rounded-lg border border-white/[0.08] bg-black/20 p-2 text-sm leading-6" aria-label={say("نص المنشور|The post's words|טקסט הפוסט")} />
      {idea ? <p className="mt-1.5 text-[11px] leading-5 text-white/55">💡 {say("الصورة/الفيديو:|Picture/video:|תמונה/וידאו:")} {idea}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={() => void copy(words)}>{say("نسخ|Copy|העתקה")}</Button>
        {share ? (
          <a href={share} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-lg border border-white/15 px-3 text-xs hover:border-white/30">
            {say(`افتح بـ ${PLATFORM_NAME[platform]}|Open in ${PLATFORM_NAME[platform]}|לפתוח ב־${PLATFORM_NAME[platform]}`)}
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function SocialPostsPage() {
  const status = useQuery({ queryKey: ["ai-marketing-status"], queryFn: M.marketingStatus });
  const products = useQuery({ queryKey: ["catalog", "products", "active"], queryFn: () => listProducts("active") });
  const [mode, setMode] = useState<"posts" | "week">("posts");
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [offer, setOffer] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["instagram", "facebook", "whatsapp"]);
  const [tone, setTone] = useState<PostTone>("friendly");
  const [lang, setLang] = useState<ShopLang | "">("");
  const [emojis, setEmojis] = useState(true);

  const byId = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);
  const found = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (products.data ?? []).filter((p) => !picked.includes(p.id));
    return (q ? list.filter((p) => p.title.toLowerCase().includes(q)) : list).slice(0, 8);
  }, [products.data, search, picked]);

  const opts = { platforms, tone, lang: lang || undefined, emojis };
  const posts = useMutation({ mutationFn: () => M.writePosts({ ...opts, productIds: picked, offer: offer.trim() || undefined }), onError: (e) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }) });
  const week = useMutation({ mutationFn: () => M.weekPlan(opts), onError: (e) => toast.error(say("ما زبط|It didn't work|זה לא הצליח"), { description: getApiErrorMessage(e) }) });

  const on = status.data?.socialPosts === true;
  const canWrite = on && platforms.length > 0 && (mode === "week" || picked.length > 0 || offer.trim().length >= 3);
  const url = posts.data?.products.length === 1 ? posts.data.products[0].url : null;

  return (
    <div className="space-y-4 pb-24" data-testid="social-posts-page">
      <section className={box}>
        <h1 className="text-lg font-semibold">{say("منشورات السوشال ✨|Social posts ✨|פוסטים לרשתות ✨")}</h1>
        <p className="mt-1 text-sm text-white/60">
          {say(
            "اختار قطعة (أو لحد 3) أو اكتب العرض، وبتطلعلك منشورات جاهزة لكل منصة: الكلام، الهاشتاغات، ورابط القطعة وين بينفع. أو خطة أسبوع كاملة من قطع متجرك.|Pick a piece (or up to 3) or write the offer, and get posts ready for each platform: the words, the hashtags and the piece's link where it works. Or a whole week's plan made of your shop's pieces.|בוחרים פריט (או עד 3) או כותבים את המבצע, ומקבלים פוסטים מוכנים לכל רשת: הטקסט, ההאשטגים והקישור לפריט היכן שאפשר. או תוכנית לשבוע שלם מפריטי החנות.",
          )}
        </p>
        {status.isSuccess && !on ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-6 text-amber-100" data-testid="social-off">
            {say("الميزة مطفية. شغّلها من|This feature is off. Switch it on from|התכונה כבויה. אפשר להפעיל אותה מ")}{" "}
            <Link to="/admin/ai" className="underline underline-offset-2">{say("صفحة الذكاء الاصطناعي|the AI page|עמוד הבינה המלאכותית")}</Link>
          </p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <button type="button" className={pill(mode === "posts")} onClick={() => setMode("posts")}>{say("منشور لقطعة أو عرض|A post for a piece or an offer|פוסט לפריט או למבצע")}</button>
          <button type="button" className={pill(mode === "week")} onClick={() => setMode("week")} data-testid="social-mode-week">{say("خطة أسبوع|A week's plan|תוכנית שבועית")}</button>
        </div>
      </section>

      {mode === "posts" ? (
        <section className={box}>
          <h2 className="font-semibold">{say("عن شو المنشور؟|What is the post about?|על מה הפוסט?")}</h2>
          {picked.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {picked.map((id) => (
                <span key={id} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] py-1 pe-1 ps-3 text-xs">
                  {byId.get(id)?.title ?? id}
                  <button type="button" className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/10" onClick={() => setPicked((l) => l.filter((x) => x !== id))} aria-label={say("شيل|Remove|הסרה")}>×</button>
                </span>
              ))}
            </div>
          ) : null}
          {picked.length < 3 ? (
            <div className="mt-2">
              <input className={field} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={say("دوّر على قطعة…|Find a piece…|חיפוש פריט…")} aria-label={say("دوّر على قطعة|Find a piece|חיפוש פריט")} data-testid="social-search" />
              {products.isLoading ? <div className="mt-2 flex items-center gap-2 text-xs"><Spinner /> …</div> : null}
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {found.map((p: CatalogProduct) => (
                  <button key={p.id} type="button" className="flex items-center gap-2 rounded-xl border border-white/[0.08] p-1.5 text-start text-xs hover:border-white/25" onClick={() => { setPicked((l) => [...l, p.id].slice(0, 3)); setSearch(""); }} data-testid="social-pick">
                    {p.summary?.thumbUrl ? <img src={p.summary.thumbUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="h-9 w-9 rounded-lg bg-white/10" />}
                    <span className="line-clamp-2">{p.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <label className="mt-4 block text-sm">
            {say("العرض أو المناسبة (اختياري)|The offer or occasion (optional)|המבצע או האירוע (לא חובה)")}
            <textarea className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-sm" rows={2} maxLength={300} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={say("مثلاً: خصم 20% على كل العبايات لحد الجمعة|e.g. 20% off all dresses until Friday|למשל: 20% הנחה על כל השמלות עד שישי")} data-testid="social-offer" />
          </label>
        </section>
      ) : (
        <section className={box}>
          <h2 className="font-semibold">{say("خطة أسبوع|A week's plan|תוכנית שבועית")}</h2>
          <p className="mt-1 text-xs leading-6 text-white/55">{say("7 منشورات، واحد كل يوم، من أكثر قطع متجرك طلباً والجديدة، مع ساعة مناسبة للنشر.|Seven posts, one a day, from your most popular and newest pieces, each with a good hour to post.|שבעה פוסטים, אחד ביום, מהפריטים הפופולריים והחדשים בחנות, כל אחד עם שעה טובה לפרסום.")}</p>
        </section>
      )}

      <section className={box}>
        <h2 className="font-semibold">{say("وين وكيف|Where and how|איפה ואיך")}</h2>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={say("المنصات|Platforms|רשתות")}>
          {M.PLATFORMS.map((p) => (
            <button key={p} type="button" aria-pressed={platforms.includes(p)} className={pill(platforms.includes(p))} onClick={() => setPlatforms((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]))}>
              {PLATFORM_ICON[p]} {PLATFORM_NAME[p]}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block text-xs text-white/60">
            {say("الأسلوب|Tone|סגנון")}
            <select className={`${field} mt-1`} value={tone} onChange={(e) => setTone(e.target.value as PostTone)}>
              {M.POST_TONES.map((t) => <option key={t} value={t}>{toneName(t)}</option>)}
            </select>
          </label>
          <label className="block text-xs text-white/60">
            {say("اللغة|Language|שפה")}
            <select className={`${field} mt-1`} value={lang} onChange={(e) => setLang(e.target.value as ShopLang | "")}>
              <option value="">{say("لغة المتجر|The shop's language|שפת החנות")}</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
              <option value="he">עברית</option>
            </select>
          </label>
          <div className="flex items-end justify-between gap-2 pb-2 text-xs text-white/60">
            <span>{say("إيموجي|Emojis|אימוג׳י")}</span>
            <ToggleSwitch checked={emojis} label={say("إيموجي|Emojis|אימוג׳י")} onChange={setEmojis} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          {mode === "posts" ? (
            <Button variant="primary" disabled={!canWrite} isLoading={posts.isPending} onClick={() => posts.mutate()} data-testid="social-write">{say("اكتب المنشورات ✨|Write the posts ✨|לכתוב פוסטים ✨")}</Button>
          ) : (
            <Button variant="primary" disabled={!canWrite} isLoading={week.isPending} onClick={() => week.mutate()} data-testid="social-week">{say("اعمل خطة الأسبوع ✨|Plan the week ✨|לתכנן את השבוע ✨")}</Button>
          )}
        </div>
      </section>

      {mode === "posts" && posts.data ? (
        <section className={box} data-testid="social-results">
          <h2 className="mb-3 font-semibold">{say("المنشورات|The posts|הפוסטים")}</h2>
          {!url && posts.data.products.length === 1 ? <p className="mb-3 text-[11px] text-white/45">{say("رابط القطعة مش مضاف لأن عنوان المتجر مش معروف للسيرفر (STOREFRONT_URL).|The piece's link isn't added: the server doesn't know the shop's address (STOREFRONT_URL).|הקישור לפריט לא נוסף: השרת לא מכיר את כתובת החנות (STOREFRONT_URL).")}</p> : null}
          <div className="grid gap-3 lg:grid-cols-2">
            {posts.data.posts.map((p, i) => <PostCard key={`${p.platform}-${i}-${p.text.length}`} platform={p.platform} text={p.text} idea={p.idea} url={url} />)}
          </div>
        </section>
      ) : null}

      {mode === "week" && week.data ? (
        <section className={box} data-testid="week-results">
          <h2 className="mb-3 font-semibold">{say("خطة الأسبوع|The week's plan|תוכנית השבוע")}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {week.data.days.map((d) => (
              <PostCard
                key={d.day}
                platform={d.platform}
                text={d.text}
                url={d.product?.url ?? null}
                extra={
                  <p className="mb-2 text-xs text-white/70">
                    <b>{dayName(d.day)}</b> · <span dir="ltr">{d.time}</span>
                    {d.product ? <> · {d.product.title}</> : null}
                    <span className="mt-0.5 block text-white/50">{d.idea}</span>
                  </p>
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
