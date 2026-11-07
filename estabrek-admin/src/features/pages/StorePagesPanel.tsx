import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { openStorePage, type Page } from "../../api/pages.api";
import { getSettings } from "../../api/settings.api";
import { getApiErrorMessage } from "../../api/http";
import { toast } from "../../lib/toast";
import { tr } from "../../lib/words";

export function StorePagesPanel({ pages, canWrite, canReadSettings, onOpen }: { pages: Page[]; canWrite: boolean; canReadSettings: boolean; onOpen: (id: string) => void }) {
  const client = useQueryClient();
  const [opening, setOpening] = useState<string | null>(null);
  const settings = useQuery({ queryKey: ["settings"], queryFn: getSettings, enabled: canReadSettings, retry: false });
  const open = async (kind: "shop" | "cart", page?: Page) => {
    if (page) return onOpen(page.id);
    if (!canWrite || opening) return;
    setOpening(kind);
    try { const created = await openStorePage(kind); await client.invalidateQueries({ queryKey: ["pages"] }); onOpen(created.id); }
    catch (error) { toast.error(tr("تعذّر فتح صفحة المتجر", "Could not open the store page"), { description: getApiErrorMessage(error) }); }
    finally { setOpening(null); }
  };
  return <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4" data-testid="store-pages">
    <h2 className="font-semibold">{tr("تصميم صفحات المتجر", "Store page designs")}</h2>
    <p className="mt-1 text-xs text-white/55">{tr("رتّب عناصر المتجر والسلة داخل المحرّر. الصفحة الجديدة تبدأ مسودة؛ فتح تصميم موجود بحافظ على تعديلاتك.", "Arrange shop and cart objects in the editor. New pages start as drafts; existing designs keep your changes.")}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{(["shop", "cart"] as const).map(kind => {
      const page = pages.find(page => page.slug === `/${kind}`);
      const flag = kind === "shop" ? "cmsOverrideShop" : "cmsOverrideCart";
      const disabled = settings.data?.header?.storefront?.[flag] === false;
      const state = !page ? "" : page.status === "ARCHIVED" ? tr("مؤرشفة", "Archived") : page.status !== "PUBLISHED" ? tr("مسودة", "Draft") : page.unpublishAt && new Date(page.unpublishAt).getTime() <= Date.now() ? tr("منتهية", "Expired") : page.publishAt && new Date(page.publishAt).getTime() > Date.now() ? tr("مجدولة", "Scheduled") : tr("منشورة", "Published");
      return <article key={kind} className="space-y-2 rounded-xl border border-white/10 p-3">
        <div className="flex justify-between"><h3>{kind === "shop" ? tr("المتجر", "Shop") : tr("سلة المشتريات", "Cart")}</h3><code dir="ltr" className="text-xs text-white/50">/{kind}</code></div>
        <p className="text-xs text-white/60">{page ? `${page.name} · ${state}` : tr("التصميم الافتراضي؛ ما في صفحة مخصصة بعد", "Default layout; no custom page yet")}</p>
        {canReadSettings && settings.data ? <p className={`text-xs ${disabled ? "text-amber-200" : "text-white/50"}`}>{disabled ? tr("التصميم الافتراضي مفعّل", "Default design is active") : tr("الموقع بيستخدم تصميم CMS المتاح بعد نشره", "The storefront uses an available published CMS design")}</p> : null}
        {disabled ? <p className="text-xs text-white/60">{tr("لتظهر تعديلاتك بعد النشر، فعّل الصفحة من الإعدادات ← صفحات CMS الأساسية.", "To show your published changes, enable this page in Settings → Core CMS pages.")} <a href="/settings" className="text-accent-300 underline">{tr("الإعدادات", "Settings")}</a></p> : null}
        <button type="button" disabled={Boolean(opening) || !page && !canWrite} onClick={() => void open(kind, page)} data-testid={`store-page-${kind}`} className="rounded-lg bg-accent-500 px-3 py-2 text-xs text-white disabled:opacity-40">{opening === kind ? tr("عم نفتح…", "Opening…") : page ? tr("افتح بالمحرّر", "Open in editor") : tr("أنشئ تصميمًا قابلًا للتعديل", "Create editable design")}</button>
      </article>;
    })}</div>
  </section>;
}
