// الإعدادات → التطبيق (header.app): the shop as an app (stage 5, step 1). Switched on, a shopper can put the shop
// on their phone's home screen: it opens without the browser's bar, in the store's colours and icon, and still opens
// with no internet (the pages they saw, else a page saying so). Off by default: nothing changes until the owner
// switches it on. The shop's side is estabrek-storefront src/lib/pwa.ts.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { MediaUrlInput } from "../../components/media/MediaUrlInput";
import { getSettings, updateSettings } from "../../api/settings.api";
import { getApiErrorMessage } from "../../api/http";
import { useSettings } from "../../hooks/useSettings";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import { say } from "../../studio/say";
import { APP_DEFAULTS, PROMPTS, inkOn, previewColours, previewLetter, previewPicture, savedApp, storeAppOf, type Prompt, type StoreApp } from "./storeApp";

const field = "h-10 w-full rounded-xl border border-white/10 bg-surface-925 px-3 text-sm text-white";
const PROMPT_WORDS: Record<Prompt, string> = {
  banner: "شريط صغير تحت بيعرض التثبيت|A small banner offering to install|באנר קטן שמציע להתקין",
  button: "زر صغير «تثبيت التطبيق» بس|Just a small “Install the app” button|רק כפתור קטן «התקנת האפליקציה»",
  off: "ولا شي: اللي بدّه بيثبّت من قائمة المتصفح|Nothing: whoever wants it installs from the browser's menu|כלום: מי שרוצה מתקין מתפריט הדפדפן",
};

type Names = { name: string; short: string };
/** The store's own names (هوية المتجر) in its main language, under the app's when it has none. */
function storeNames(header: unknown, siteName?: string | null): Names {
  const h = (header && typeof header === "object" ? header : {}) as { identity?: { name?: Record<string, string>; shortName?: Record<string, string> }; languages?: { default?: string } };
  const lang = h.languages?.default === "en" || h.languages?.default === "he" ? h.languages.default : "ar";
  const name = h.identity?.name?.[lang]?.trim() || h.identity?.name?.ar?.trim() || siteName?.trim() || "";
  return { name, short: h.identity?.shortName?.[lang]?.trim() || name };
}

/** The icon as a phone shows it: the picture on the app's colour, else the store's first letter. */
function IconTile({ app, picture, letter, label, colours, size = 72, named = true }: { app: StoreApp; picture: string | null; letter: string; label: string; colours: { theme: string }; size?: number; named?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: size + 24 }}>
      <div className="flex items-center justify-center overflow-hidden shadow-lg" style={{ width: size, height: size, borderRadius: size * 0.24, background: colours.theme }} data-testid="store-app-icon">
        {picture ? <img src={picture} alt="" style={{ width: size * 0.78, height: size * 0.78, objectFit: "contain", borderRadius: size * 0.1 }} /> : <span style={{ color: inkOn(colours.theme), fontSize: size * 0.5, fontWeight: 800 }}>{letter}</span>}
      </div>
      {named ? <span className="max-w-full truncate text-[11px] text-white/80" data-testid="store-app-label">{app.shortName.trim() || label}</span> : null}
    </div>
  );
}

export function StoreAppCard() {
  const qc = useQueryClient();
  const settings = useSettings();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("settings:write");
  const saved = useMemo(() => (settings.data ? storeAppOf(settings.data.header) : null), [settings.data]);
  const [draft, setDraft] = useState<StoreApp>(APP_DEFAULTS);
  const key = JSON.stringify(saved);
  useEffect(() => {
    if (saved) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const save = useMutation({
    mutationFn: async (next: StoreApp) => {
      // The header as it is now (another card may have saved in the meantime), with the app's part replaced.
      const current = await getSettings();
      return updateSettings({ header: { ...(current.header ?? {}), app: savedApp(next) } });
    },
    onSuccess: async () => {
      toast.success(say("انحفظ التطبيق|The app is saved|האפליקציה נשמרה"));
      await qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(say("ما انحفظ|It wasn't saved|לא נשמר"), { description: getApiErrorMessage(e) }),
  });

  if (!saved || !settings.data) return null;
  const site = settings.data;
  const names = storeNames(site.header, site.siteName);
  const colours = previewColours(draft, (site as { themeColor?: string | null }).themeColor);
  const picture = previewPicture(draft, site);
  const letter = previewLetter(site.header, site.siteName);
  const set = (patch: Partial<StoreApp>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(savedApp(draft)) !== JSON.stringify(savedApp(saved));

  return (
    <div data-testid="store-app">
      <Card>
        <CardHeader
          title={say("المتجر كتطبيق|The shop as an app|החנות כאפליקציה")}
          subtitle={say(
            "الزبون بيحط المتجر على الشاشة الرئيسية بتلفونه: بيفتح بدون شريط المتصفح، بألوانك وأيقونتك، وبيفتح حتى بدون نت (الصفحات اللي شافها، وإلا صفحة بتقول ما في نت). موقّف لحد ما تشغّله.|Shoppers put the shop on their phone's home screen: it opens without the browser's bar, in your colours and icon, and opens even offline (the pages they saw, else a page saying there's no connection). Off until you switch it on.|הלקוח שם את החנות במסך הבית של הטלפון: היא נפתחת בלי שורת הדפדפן, בצבעים ובאייקון שלך, ונפתחת גם בלי אינטרנט (העמודים שראה, ואחרת עמוד שאומר שאין חיבור). כבוי עד שמפעילים.",
          )}
        />
        <CardContent>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-3 text-sm font-medium">
                <input type="checkbox" checked={draft.enabled} disabled={!canWrite} onChange={(e) => set({ enabled: e.target.checked })} data-testid="store-app-enabled" />
                {say("شغّل التطبيق|Switch the app on|הפעלת האפליקציה")}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-white/60">
                  {say("الاسم تحت الأيقونة|The name under the icon|השם מתחת לאייקון")}
                  <input className={`${field} mt-1`} value={draft.shortName} maxLength={24} placeholder={names.short} disabled={!canWrite} onChange={(e) => set({ shortName: e.target.value })} data-testid="store-app-short" />
                </label>
                <label className="block text-xs text-white/60">
                  {say("الاسم الكامل|The full name|השם המלא")}
                  <input className={`${field} mt-1`} value={draft.name} maxLength={60} placeholder={names.name} disabled={!canWrite} onChange={(e) => set({ name: e.target.value })} data-testid="store-app-name" />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(["themeColor", "backgroundColor"] as const).map((k) => (
                  <div key={k} className="text-xs text-white/60">
                    {k === "themeColor" ? say("لون الشريط والأيقونة|The bar and icon colour|צבע השורה והאייקון") : say("لون شاشة الفتح|The opening screen's colour|צבע מסך הפתיחה")}
                    <div className="mt-1 flex items-center gap-2">
                      <input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent" value={k === "themeColor" ? colours.theme : colours.background} disabled={!canWrite} onChange={(e) => set({ [k]: e.target.value.toLowerCase() })} data-testid={`store-app-${k}`} />
                      <bdi dir="ltr" className="text-white/70">{k === "themeColor" ? colours.theme : colours.background}</bdi>
                      {draft[k] ? (
                        <button type="button" className="text-white/50 underline" disabled={!canWrite} onClick={() => set({ [k]: null })} data-testid={`store-app-${k}-reset`}>
                          {say("لون المتجر|The store's colour|צבע החנות")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <MediaUrlInput
                label={say("أيقونة التطبيق (صورة مربّعة، 512×512 أو أكبر)|The app's icon (a square picture, 512×512 or more)|אייקון האפליקציה (תמונה ריבועית, 512×512 ומעלה)")}
                value={draft.iconUrl ?? ""}
                onChange={(v) => set({ iconUrl: v.trim() || null })}
                placeholder={say("فاضي: الشعار، أو أول حرف من الاسم|Empty: the logo, or the name's first letter|ריק: הלוגו, או האות הראשונה של השם")}
              />
              <label className="block text-xs text-white/60">
                {say("عرض التثبيت للزبون|Offering it to shoppers|הצעת ההתקנה ללקוחות")}
                <select className={`${field} mt-1`} value={draft.prompt} disabled={!canWrite} onChange={(e) => set({ prompt: e.target.value as Prompt })} data-testid="store-app-prompt">
                  {PROMPTS.map((p) => (
                    <option key={p} value={p}>
                      {say(PROMPT_WORDS[p])}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-5 text-white/50">
                {say(
                  "على أندرويد وكمبيوتر المتجر بيعرض التثبيت بنفسه. على الآيفون ما في هالإمكانية، فالشريط بيشرح للزبون: زر المشاركة، وبعدين «أضف إلى الشاشة الرئيسية». الأسعار والمخزون دايماً بيجوا من النت أول؛ اللي بينحفظ للفتح بدون نت ما بيشمل السلة والحساب والطلبات.|On Android and computers the shop offers the install itself. An iPhone has no such offer, so the banner tells shoppers how: the Share button, then “Add to Home Screen”. Prices and stock always come from the network first; what is kept for offline never includes the bag, the account or orders.|באנדרואיד ובמחשב החנות מציעה את ההתקנה בעצמה. באייפון אין אפשרות כזאת, אז הבאנר מסביר ללקוח: כפתור השיתוף ואז «הוספה למסך הבית». מחירים ומלאי תמיד מגיעים קודם מהרשת; מה שנשמר לשימוש בלי אינטרנט לא כולל את הסל, החשבון וההזמנות.",
                )}
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4" data-testid="store-app-preview">
              <div className="text-[11px] text-white/50">{say("على الشاشة الرئيسية|On the home screen|במסך הבית")}</div>
              <IconTile app={draft} picture={picture} letter={letter} label={names.short} colours={colours} />
              <div className="text-[11px] text-white/50">{say("شاشة الفتح|The opening screen|מסך הפתיחה")}</div>
              <div className="flex h-44 w-24 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10" style={{ background: colours.background }} data-testid="store-app-splash">
                <IconTile app={draft} picture={picture} letter={letter} label={names.short} colours={colours} size={44} named={false} />
                <span className="max-w-full truncate px-1 text-[11px] font-semibold" style={{ color: inkOn(colours.background) }}>{draft.name.trim() || names.name}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" disabled={!canWrite || !dirty} isLoading={save.isPending} onClick={() => save.mutate(draft)} data-testid="store-app-save">
              {say("احفظ التطبيق|Save the app|שמירת האפליקציה")}
            </Button>
            {saved.enabled ? <span className="text-xs text-emerald-300" data-testid="store-app-on">{say("التطبيق شغّال بالمتجر|The app is on in the shop|האפליקציה פעילה בחנות")}</span> : <span className="text-xs text-white/50">{say("التطبيق موقّف|The app is off|האפליקציה כבויה")}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
