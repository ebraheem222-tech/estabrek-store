import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checkPagePublication, getPagePublication, retryPagePublication, type Page, type PublicationState } from "../api/pages.api";
import { tr } from "../lib/words";
import { toast } from "../lib/toast";

function stateOf(page: Page): PublicationState["state"] {
  return page.status === "ARCHIVED" ? "archived" : page.status !== "PUBLISHED" ? "draft"
    : page.unpublishAt && new Date(page.unpublishAt).getTime() <= Date.now() ? "expired"
    : page.publishAt && new Date(page.publishAt).getTime() > Date.now() ? "scheduled" : "live";
}

export function PagePublicationStatus({ page, lang, hasDraft, canPublish }: { page: Page; lang: string; hasDraft: boolean; canPublish: boolean }) {
  const client = useQueryClient();
  const q = useQuery({ queryKey: ["pages", page.id, "publication"], queryFn: () => getPagePublication(page.id), enabled: page.kind !== "block", retry: false,
    refetchInterval: query => {
      if (query.state.data?.delivery?.state === "pending") return 10000;
      const publication = query.state.data?.publication;
      return publication?.status === "PUBLISHED" && [publication.publishAt, publication.unpublishAt].some(value => value && new Date(value).getTime() > Date.now()) ? 30000 : false;
    } });
  const check = useMutation({ mutationFn: (_identity: string) => checkPagePublication(page.id, lang), onError: () => toast.error(tr("تعذّر فحص الرابط العام", "Could not check the public page")) });
  const retry = useMutation({ mutationFn: () => retryPagePublication(page.id), onSuccess: () => client.invalidateQueries({ queryKey: ["pages", page.id, "publication"] }), onError: () => toast.error(tr("تعذّر تحديث الموقع", "Could not refresh the storefront")) });
  if (page.kind === "block") return null;
  const state = q.data?.publication?.state ?? stateOf(page);
  const delivery = q.data?.delivery;
  const labels = {
    draft: tr("مسودة؛ مش متاحة للزوار", "Draft; not public"), archived: tr("مؤرشفة", "Archived"), scheduled: tr("مجدولة", "Scheduled"), expired: tr("موعد النشر منتهي", "Publication window ended"),
    live: hasDraft || q.data?.hasDraft ? tr("منشورة وفيها تعديلات محفوظة", "Published with draft changes") : tr("منشورة", "Published"),
  };
  const deliveryText = delivery?.state === "pending" ? tr("تحديث الموقع لسه قيد الانتظار.", "Storefront refresh is pending.")
    : delivery?.state === "failed" ? tr("توقفت محاولات تحديث الموقع؛ ممكن تعيدها.", "Automatic refresh retries stopped; you can retry.")
    : delivery?.state === "not_configured" ? tr("تحديث الموقع التلقائي مش مهيّأ.", "Automatic storefront refresh is not configured.")
    : delivery?.state === "delivered" ? tr("الموقع استلم طلب تحديث الكاش.", "The storefront acknowledged the cache refresh.") : "";
  const checkedIdentity = `${lang}:${delivery?.id ?? ""}`;
  const result = check.data && check.variables === checkedIdentity ? check.data : null;
  const checkedText = result?.state === "shown" ? tr("الصفحة ظاهرة بالمواقع اللي انفحصت.", "This page is visible on the checked storefronts.")
    : result?.state === "not_public" ? tr("الصفحة لسه مش متاحة للزوار؛ راجع الحالة والمواعيد.", "The page is not public yet; review its status and dates.")
    : result?.state === "not_configured" ? tr("عنوان الموقع مش مضبوط للفحص.", "No storefront address is configured for verification.")
    : result ? tr("لسه ما تأكد ظهور الصفحة؛ راجع نتيجة كل موقع.", "This page is not verified yet; check each storefront result.") : "";
  const btn = "rounded-lg border border-white/10 px-2 py-1 text-[11px] hover:bg-white/[0.06] disabled:opacity-40";
  return <div className="shrink-0 space-y-1 border-b border-white/[0.07] px-3 py-2 text-[11px] text-white/60" data-testid="studio-publication">
    <div className="flex flex-wrap items-center gap-2">
      <span className={state === "live" ? "text-emerald-300" : "text-amber-200"}>{labels[state]}</span>
      {deliveryText ? <span>{deliveryText}</span> : null}
      <button type="button" className={btn} disabled={check.isPending} onClick={() => check.mutate(checkedIdentity)}>{check.isPending ? tr("عم نفحص…", "Checking…") : tr("افحص الرابط العام", "Check public page")}</button>
      {canPublish && delivery && delivery.state !== "delivered" ? <button type="button" className={btn} disabled={retry.isPending} onClick={() => retry.mutate()}>{tr("أعد تحديث الموقع", "Retry storefront refresh")}</button> : null}
      {q.isError ? <span className="text-amber-200">{tr("تعذّرت قراءة حالة النشر.", "Could not read publication status.")}</span> : null}
    </div>
    {checkedText ? <p aria-live="polite">{checkedText}</p> : null}
    {result?.targets?.length ? <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {result.targets.map(target => <li key={target.origin}>
        <span dir="ltr">{target.origin}</span>: {target.state === "shown" ? tr("الصفحة ظاهرة", "Page visible") : target.state === "not_found" ? "404" : target.state === "different_page" ? tr("صفحة أو نسخة مختلفة", "Different page or revision") : tr("تعذّر الاتصال", "Unavailable")}
      </li>)}
    </ul> : null}
  </div>;
}
