// The settings centre: tabs + search over the settings page, the marketing
// (GA4 / Meta / TikTok) and search-engine cards, the custom-code safe mode and
// the history of saves with one-click restore.
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { MediaUrlInput } from "../../components/media/MediaUrlInput";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { listSettingsRevisions, restoreSettingsRevision, type SettingsRevisionRow } from "../../api/settings.api";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";

/* ---------------------------------- Tabs ---------------------------------- */

export type SettingsTabId = "brand" | "rose" | "menu" | "marketing" | "seo" | "checkout" | "advanced" | "history" | "legacy";

export const SETTINGS_TABS: { id: SettingsTabId; label: string }[] = [
  { id: "brand", label: "الهوية والتواصل" },
  { id: "rose", label: "تصميم روز" },
  { id: "menu", label: "القائمة" },
  { id: "marketing", label: "التسويق والتتبع" },
  { id: "seo", label: "محركات البحث" },
  { id: "checkout", label: "الطلب والدفع" },
  { id: "advanced", label: "أكواد متقدمة" },
  { id: "history", label: "السجل" },
  { id: "legacy", label: "التصميم القديم" },
];

/** Arabic-friendly matching: no diacritics, one form of alef/teh marbuta/yeh, lower case. */
export function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

type Ctx = {
  tab: SettingsTabId;
  query: string;
  report: (key: string, tab: SettingsTabId, matched: boolean) => void;
};
const SettingsCentreContext = createContext<Ctx | null>(null);

export function useSettingsCentre(initial: SettingsTabId = "brand") {
  const [tab, setTab] = useState<SettingsTabId>(() => {
    try {
      const saved = sessionStorage.getItem("estabrek_settings_tab") as SettingsTabId | null;
      return saved && SETTINGS_TABS.some((t) => t.id === saved) ? saved : initial;
    } catch {
      return initial;
    }
  });
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Record<string, { tab: SettingsTabId; matched: boolean }>>({});
  const report = useCallback((key: string, t: SettingsTabId, matched: boolean) => {
    setMatches((m) => (m[key]?.matched === matched && m[key]?.tab === t ? m : { ...m, [key]: { tab: t, matched } }));
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem("estabrek_settings_tab", tab); } catch { /* storage blocked */ }
  }, [tab]);
  const counts = useMemo(() => {
    const out: Partial<Record<SettingsTabId, number>> = {};
    if (!query.trim()) return out;
    for (const m of Object.values(matches)) if (m.matched) out[m.tab] = (out[m.tab] ?? 0) + 1;
    return out;
  }, [matches, query]);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const value = useMemo<Ctx>(() => ({ tab, query, report }), [tab, query, report]);
  return { tab, setTab, query, setQuery, counts, total, value };
}

export function SettingsCentreProvider({ value, children }: { value: Ctx; children: React.ReactNode }) {
  return <SettingsCentreContext.Provider value={value}>{children}</SettingsCentreContext.Provider>;
}

/** Tab bar with a search box; while searching every tab shows how many sections match. */
export function SettingsTabBar({
  tab,
  setTab,
  query,
  setQuery,
  counts,
  total,
}: ReturnType<typeof useSettingsCentre>) {
  const searching = query.trim().length > 0;
  return (
    <div className="sticky top-0 z-20 -mx-1 space-y-3 rounded-2xl border border-white/10 bg-surface-950/90 p-3 backdrop-blur" data-testid="settings-tabs">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحثي في الإعدادات… (مثلاً: واتساب، الشعار، Pixel)"
          aria-label="بحث في الإعدادات"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-white/25"
        />
        {searching ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/55">
            {total ? `${total} نتيجة` : "لا نتائج"}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="أقسام الإعدادات">
        {SETTINGS_TABS.map((t) => {
          const n = counts[t.id] ?? 0;
          const active = !searching && t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setQuery(""); setTab(t.id); }}
              className={
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm transition " +
                (active
                  ? "border-white/30 bg-white/15 font-semibold"
                  : searching && n
                  ? "border-amber-300/40 bg-amber-300/10"
                  : "border-white/10 bg-white/5 opacity-80 hover:opacity-100") +
                (t.id === "legacy" ? " text-white/60" : "")
              }
            >
              {t.label}
              {searching && n ? <span className="ms-2 rounded-full bg-amber-300/25 px-2 text-xs">{n}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One block of the settings page, shown on its tab (or, while searching, when
 * its text matches). `legacy` marks settings the current rose design doesn't use.
 */
export function SettingsSection({
  id,
  tab,
  legacy,
  note,
  keywords = "",
  children,
}: {
  id: string;
  tab: SettingsTabId;
  legacy?: boolean;
  note?: React.ReactNode;
  keywords?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(SettingsCentreContext);
  const ref = useRef<HTMLElement>(null);
  const [matched, setMatched] = useState(false);
  const query = ctx?.query ?? "";
  useLayoutEffect(() => {
    const q = normalizeSearch(query);
    const text = normalizeSearch(`${keywords} ${ref.current?.textContent ?? ""}`);
    const m = q ? q.split(" ").every((w) => text.includes(w)) : false;
    setMatched(m);
    ctx?.report(id, tab, m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, id, tab, keywords]);
  const visible = query.trim() ? matched : ctx?.tab === tab;
  return (
    <section ref={ref} hidden={!visible} data-settings-section={id} data-settings-tab={tab} className="space-y-3">
      {legacy ? (
        <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs text-amber-100">
          لا يؤثر على تصميم روز الحالي — هذه الإعدادات للتصميم القديم فقط.
        </div>
      ) : null}
      {note ? <div className="rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs text-sky-100">{note}</div> : null}
      {children}
    </section>
  );
}

/* ------------------------------- Marketing -------------------------------- */

export type MarketingConfig = { ga4Id?: string; metaPixelId?: string; tiktokPixelId?: string };

export function normalizeMarketing(v: any): MarketingConfig {
  const s = (x: unknown) => (typeof x === "string" ? x.trim() : "");
  return { ga4Id: s(v?.ga4Id), metaPixelId: s(v?.metaPixelId), tiktokPixelId: s(v?.tiktokPixelId) };
}

/** Errors per field ("" when fine). The IDs are public (they appear in the page source); no secrets here. */
export function validateMarketing(v: MarketingConfig) {
  const out: Partial<Record<keyof MarketingConfig, string>> = {};
  if (v.ga4Id && !/^G-[A-Z0-9]{6,12}$/.test(v.ga4Id)) out.ga4Id = "معرّف GA4 يبدأ بـ G- ثم حروف وأرقام، مثل G-AB12CD34EF";
  if (v.metaPixelId && !/^\d{10,20}$/.test(v.metaPixelId)) out.metaPixelId = "معرّف Meta Pixel أرقام فقط (عادة 15–16 رقماً)";
  if (v.tiktokPixelId && !/^[A-Z0-9]{15,25}$/.test(v.tiktokPixelId)) out.tiktokPixelId = "معرّف TikTok Pixel حروف إنجليزية كبيرة وأرقام، مثل C4ABCDEFGH1234567890";
  return out;
}

export function MarketingCard({
  value,
  onChange,
  errors,
}: {
  value: MarketingConfig;
  onChange: (v: MarketingConfig) => void;
  errors: Partial<Record<keyof MarketingConfig, string>>;
}) {
  const set = (k: keyof MarketingConfig) => (x: string) => onChange({ ...value, [k]: x.trim() });
  const on = [value.ga4Id, value.metaPixelId, value.tiktokPixelId].filter(Boolean).length;
  return (
    <Card>
      <CardHeader
        title="التسويق والتتبع"
        subtitle="اربطي الموقع بـ Google Analytics وMeta (إنستغرام وفيسبوك) وTikTok لتعرفي أي إعلان جاب طلبات."
      />
      <CardContent>
        <div className="space-y-4" data-testid="marketing-card">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Google Analytics 4 (Measurement ID)"
              value={value.ga4Id ?? ""}
              onValueChange={set("ga4Id")}
              placeholder="G-XXXXXXXXXX"
              error={errors.ga4Id}
              dir="ltr"
            />
            <Input
              label="Meta Pixel ID (إنستغرام وفيسبوك)"
              value={value.metaPixelId ?? ""}
              onValueChange={set("metaPixelId")}
              placeholder="123456789012345"
              error={errors.metaPixelId}
              dir="ltr"
              inputMode="numeric"
            />
            <Input
              label="TikTok Pixel ID"
              value={value.tiktokPixelId ?? ""}
              onValueChange={set("tiktokPixelId")}
              placeholder="C4ABCDEFGH1234567890"
              error={errors.tiktokPixelId}
              dir="ltr"
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-6 text-white/70">
            <div className="mb-1 font-semibold text-white/85">ما الذي يُرسل تلقائياً بعد الحفظ؟</div>
            زيارة كل صفحة · مشاهدة منتج (view_item / ViewContent) · إضافة للحقيبة (add_to_cart / AddToCart) · بدء الطلب
            (begin_checkout / InitiateCheckout) · إرسال طلب واتساب (generate_lead / Lead) · الدفع بالبطاقة (purchase / Purchase)
            — مع اسم القطعة واللون والسعر.
            <div className="mt-2">
              أين أجد المعرّف؟ GA4: الإدارة ← مصادر البيانات ← الويب · Meta: مدير الأحداث ← مصادر البيانات · TikTok: مدير الإعلانات ←
              الأصول ← الأحداث.
            </div>
            <div className="mt-2 text-white/55">
              {on ? `مفعّل: ${on} من 3.` : "لا شيء مفعّل بعد."} اتركي الحقل فارغاً لإيقافه. يمكن إيقافها كلها مؤقتاً من «أكواد متقدمة».
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- SEO ----------------------------------- */

export type SeoConfig = { title?: string; description?: string; ogImageUrl?: string };

export function normalizeSeo(v: any): SeoConfig {
  const s = (x: unknown) => (typeof x === "string" ? x : "");
  return { title: s(v?.title), description: s(v?.description), ogImageUrl: s(v?.ogImageUrl) };
}

function Counter({ n, max }: { n: number; max: number }) {
  return <span className={"text-xs " + (n > max ? "text-amber-200" : "text-white/45")}>{n} / {max}</span>;
}

/** What Google shows for a page: blue title, green address, grey description. */
export function GooglePreview({ title, description, url }: { title: string; description: string; url: string }) {
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);
  return (
    // Google's own colours, fixed (the admin's light/dark skins remap white and grey classes).
    <div className="rounded-xl p-4 text-start shadow-sm" dir="auto" data-testid="google-preview" style={{ background: "#ffffff", border: "1px solid #dadce0", fontFamily: "Arial, sans-serif" }}>
      <div className="truncate text-xs" dir="ltr" style={{ color: "#202124" }}>{url}</div>
      <div className="mt-1 truncate text-lg leading-6" style={{ color: "#1a0dab" }}>{cut(title || "—", 60)}</div>
      <div className="mt-1 text-sm leading-5" style={{ color: "#4d5156" }}>{cut(description || "—", 160)}</div>
    </div>
  );
}

export function SeoCard({
  value,
  onChange,
  siteName,
}: {
  value: SeoConfig;
  onChange: (v: SeoConfig) => void;
  siteName: string;
}) {
  const title = value.title ?? "", description = value.description ?? "";
  return (
    <Card>
      <CardHeader title="محركات البحث (Google)" subtitle="عنوان ووصف الصفحة الرئيسية وصورة المشاركة على واتساب وإنستغرام." />
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-2" data-testid="seo-card">
          <div className="space-y-4">
            <div>
              <Input
                label="عنوان الموقع في Google"
                value={title}
                onValueChange={(x) => onChange({ ...value, title: x })}
                placeholder={`${siteName || "استبرق"} — حجاب وفساتين محتشمة`}
              />
              <div className="mt-1 flex justify-between"><span className="text-xs text-white/45">الأفضل حتى 60 حرفاً</span><Counter n={title.length} max={60} /></div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">الوصف</label>
              <textarea
                className="min-h-[96px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-white/20"
                value={description}
                onChange={(e) => onChange({ ...value, description: e.target.value })}
                placeholder="حجاب، فساتين وأطقم محتشمة. توصيل لكل البلاد والدفع عند الاستلام."
              />
              <div className="mt-1 flex justify-between"><span className="text-xs text-white/45">الأفضل 120–160 حرفاً</span><Counter n={description.length} max={160} /></div>
            </div>
            <MediaUrlInput
              label="صورة المشاركة (1200×630)"
              value={value.ogImageUrl ?? ""}
              onChange={(x) => onChange({ ...value, ogImageUrl: x })}
              placeholder="https://..."
              showPreview
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-white/60">هكذا تظهر الصفحة الرئيسية في Google:</div>
            <GooglePreview title={title || siteName} description={description} url="estabrek-store.vercel.app" />
            <div className="text-xs leading-6 text-white/50">
              لكل منتج عنوان ووصف خاص من صفحة المنتج (قسم «محركات البحث»). إذا تُركا فارغين يُستعمل اسم المنتج ووصفه.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------- Safe mode -------------------------------- */

export function SafeModeCard({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className={
        "flex items-start justify-between gap-4 rounded-2xl border p-4 " +
        (value ? "border-amber-300/40 bg-amber-300/10" : "border-white/10 bg-white/5")
      }
      data-testid="safe-mode"
    >
      <div>
        <div className="text-sm font-semibold">إيقاف الأكواد المخصصة مؤقتاً</div>
        <div className="mt-1 text-xs leading-6 text-white/65">
          إذا تعطّل شكل الموقع بعد إضافة CSS أو Scripts، فعّلي هذا: يتوقف تطبيق الـCSS المخصص والـScripts وأكواد التتبع على
          المتجر حتى تصلحيها، دون حذفها. يعمل بعد الضغط على «حفظ».
        </div>
      </div>
      <input type="checkbox" className="mt-1 h-5 w-5 accent-white" checked={value} onChange={(e) => onChange(e.target.checked)} aria-label="إيقاف الأكواد المخصصة مؤقتاً" />
    </div>
  );
}

/* -------------------------------- History --------------------------------- */

const KEY_LABELS: Record<string, string> = {
  siteName: "اسم الموقع",
  logoUrl: "الشعار",
  faviconUrl: "أيقونة الموقع",
  contactEmail: "إيميل التواصل",
  contactPhone: "هاتف التواصل",
  storeCountryCode: "الدولة",
  customCss: "CSS مخصص",
  scriptsHead: "Scripts الرأس",
  scriptsBody: "Scripts الصفحة",
  checkoutMode: "طريقة الطلب",
  ordersEmail: "إيميل الطلبات",
  whatsappNumber: "رقم واتساب",
  stripeEnabled: "Stripe",
  stripePublicKey: "Stripe",
  paypalEnabled: "PayPal",
  paypalClientId: "PayPal",
  paypalWebhookId: "PayPal",
  announcementIsActive: "الشريط العلوي",
  announcementText: "الشريط العلوي",
  announcementLinkUrl: "الشريط العلوي",
  header: "الهيدر",
  footer: "الفوتر",
  "header.marketing": "التسويق والتتبع",
  "header.seo": "محركات البحث",
  "header.safeMode": "إيقاف الأكواد",
  "header.storefront": "إعدادات الواجهة",
  "header.cmsNav": "القائمة",
  "header.delivery": "أسعار التوصيل",
  "header.theme": "الثيم القديم",
  "header.ui": "الواجهة القديمة",
  "header.topbar": "الشريط القديم",
};

export function describeChanged(keys: string[] | null | undefined) {
  if (!keys?.length) return "—";
  const labels = [...new Set(keys.map((k) => KEY_LABELS[k] ?? (k.startsWith("footer.") ? "الفوتر" : k.startsWith("header.") ? "الهيدر" : k)))];
  return labels.length > 4 ? `${labels.slice(0, 4).join("، ")} و${labels.length - 4} أخرى` : labels.join("، ");
}

function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  if (mins < 24 * 60) return `قبل ${Math.round(mins / 60)} ساعة`;
  return d.toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
}

export function SettingsHistoryCard({ onRestored }: { onRestored?: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings", "revisions"], queryFn: () => listSettingsRevisions(40) });
  const [confirm, setConfirm] = useState<SettingsRevisionRow | null>(null);
  const restore = useMutation({
    mutationFn: (id: string) => restoreSettingsRevision(id),
    onSuccess: async (out) => {
      toast.success("رجعت الإعدادات للنسخة المختارة", { description: describeChanged(out.changed) });
      setConfirm(null);
      await qc.invalidateQueries({ queryKey: ["settings"] });
      onRestored?.();
    },
    onError: (e) => toast.error("تعذّر الاسترجاع", { description: getApiErrorMessage(e) }),
  });
  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader
        title="سجل التغييرات"
        subtitle="قبل كل حفظ نحتفظ بنسخة من الإعدادات كما كانت (آخر 60 نسخة). الاسترجاع يحفظ النسخة الحالية أولاً، فيمكن التراجع عنه."
      />
      <CardContent>
        {q.isLoading ? (
          <div className="flex items-center gap-2 text-sm"><Spinner /> جاري التحميل…</div>
        ) : q.isError ? (
          <div className="text-sm text-red-200">تعذّر تحميل السجل: {getApiErrorMessage(q.error)}</div>
        ) : !rows.length ? (
          <div className="text-sm text-white/60">لا توجد نسخ بعد. أول حفظ للإعدادات يبدأ السجل.</div>
        ) : (
          <ol className="divide-y divide-white/10" data-testid="settings-history">
            {rows.map((r, i) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {i === 0 ? "قبل آخر حفظ" : `نسخة ${when(r.createdAt)}`}
                    {r.note ? <span className="ms-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">{r.note}</span> : null}
                  </div>
                  <div className="mt-0.5 text-xs text-white/60">
                    {when(r.createdAt)} · تغيّر بعدها: {describeChanged(r.changed)}
                    {r.adminUser ? ` · ${r.adminUser.name || r.adminUser.email}` : ""}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(r)} disabled={restore.isPending}>
                  استرجاع هذه النسخة
                </Button>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
      <ConfirmDialog
        open={!!confirm}
        title="استرجاع الإعدادات"
        message={confirm ? `ترجع الإعدادات كما كانت ${when(confirm.createdAt)} (${describeChanged(confirm.changed)}). مفاتيح الدفع السرية لا تتغير، والنسخة الحالية تُحفظ أولاً.` : ""}
        confirmText="استرجاع"
        cancelText="إلغاء"
        variant="warning"
        isLoading={restore.isPending}
        onConfirm={() => confirm && restore.mutate(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </Card>
  );
}
