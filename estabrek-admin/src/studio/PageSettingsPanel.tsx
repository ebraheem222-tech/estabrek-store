/**
 * The page's own settings in the new editor (they were the old editor's): its name and address,
 * whether it's out and when, how search engines see it in each language, and its own CSS and
 * scripts. Saved straight away (not with the page's draft), like the old editor did.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as PagesAPI from "../api/pages.api";
import { getApiErrorMessage } from "../api/http";
import type { Lang } from "../lib/lang";
import { toast } from "../lib/toast";
import { tr } from "../lib/words";

const box = "space-y-2 rounded-xl border border-white/[0.08] p-3";
const control = "mt-1 w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
const label = "block text-[11px] text-white/55";
const save = "rounded-lg bg-accent-500 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40";
const LANG_NAME: Record<Lang, () => string> = { ar: () => tr("العربية", "Arabic"), en: () => tr("الإنجليزية", "English"), he: () => tr("العبرية", "Hebrew") };

/** "2026-11-02T10:30" for a date input, and back to the moment. */
const toLocal = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}`;
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);
const asText = (v: unknown) => (v == null ? "" : typeof v === "string" ? v : JSON.stringify(v, null, 2));
type Seo = { seoTitle: string; seoDescription: string; ogImageUrl: string };

export function PageSettingsPanel({ page, langs }: { page: PagesAPI.Page & { i18n?: Partial<Record<Lang, { fields?: Partial<Seo> | null }>> }; langs: Lang[] }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(page.name);
  const [slug, setSlug] = useState(page.slug);
  const [status, setStatus] = useState(page.status);
  const [publishAt, setPublishAt] = useState(toLocal(page.publishAt));
  const [unpublishAt, setUnpublishAt] = useState(toLocal(page.unpublishAt));
  const [seoLang, setSeoLang] = useState<Lang>("ar");
  const seoOf = (l: Lang): Seo => {
    const f = l === "ar" ? page : page.i18n?.[l]?.fields ?? {};
    return { seoTitle: f?.seoTitle ?? "", seoDescription: f?.seoDescription ?? "", ogImageUrl: f?.ogImageUrl ?? "" };
  };
  const [seo, setSeo] = useState<Partial<Record<Lang, Seo>>>({});
  const seoNow = seo[seoLang] ?? seoOf(seoLang);
  const [canonical, setCanonical] = useState(page.canonicalUrl ?? "");
  const [noIndex, setNoIndex] = useState(page.noIndex === true);
  const [css, setCss] = useState(page.customCss ?? "");
  const [head, setHead] = useState(asText(page.headScripts));
  const [body, setBody] = useState(asText(page.bodyScripts));

  const run = async (what: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await what();
      await qc.invalidateQueries({ queryKey: ["pages", page.id] });
      void qc.invalidateQueries({ queryKey: ["pages"] });
      toast.success(tr("انحفظ", "Saved"));
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const slugOk = /^\/[a-z0-9؀-ۿ֐-׿/_-]*$/i.test(slug.trim());
  const timesOk = !publishAt || !unpublishAt || new Date(unpublishAt) > new Date(publishAt);

  return (
    <details className={box} data-testid="studio-page-settings">
      <summary className="cursor-pointer text-xs font-medium text-white/70">{tr("إعدادات الصفحة", "Page settings")}</summary>

      <div className="space-y-2 pt-2">
        <label className={label}>{tr("الاسم", "Name")}<input className={control} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} data-testid="page-name" /></label>
        <label className={label}>
          {tr("الرابط", "Address")}
          <input className={control} dir="ltr" value={slug} disabled={page.slug === "/"} onChange={(e) => setSlug(e.target.value)} data-testid="page-slug" />
          {page.slug === "/" ? <span className="text-[10px] text-white/35">{tr("رابط الرئيسية ثابت.", "The home's address stays.")}</span> : !slugOk ? <span className="text-[10px] text-red-300">{tr("لازم يبلّش بـ / وبدون فراغات.", "It starts with / and has no spaces.")}</span> : null}
        </label>
        <label className={label}>
          {tr("الحالة", "Status")}
          <select className={control} value={status} onChange={(e) => setStatus(e.target.value as PagesAPI.PageStatus)} data-testid="page-status">
            <option value="PUBLISHED">{tr("منشورة", "Published")}</option>
            <option value="DRAFT">{tr("مسودة (مخفية)", "Draft (hidden)")}</option>
            <option value="ARCHIVED">{tr("مؤرشفة", "Archived")}</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={label}>{tr("بتنزل من", "Out from")}<input type="datetime-local" className={control} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} data-testid="page-publish-at" /></label>
          <label className={label}>{tr("وبتختفي", "Hidden from")}<input type="datetime-local" className={control} value={unpublishAt} onChange={(e) => setUnpublishAt(e.target.value)} /></label>
        </div>
        {!timesOk ? <p className="text-[10px] text-red-300">{tr("وقت الاختفاء لازم يكون بعد وقت النزول.", "Hiding must come after going out.")}</p> : null}
        <button
          type="button" className={save} disabled={busy || !name.trim() || !slugOk || !timesOk}
          onClick={() => void run(() => PagesAPI.updatePage(page.id, { name: name.trim(), ...(page.slug === "/" ? {} : { slug: slug.trim() }), status, publishAt: fromLocal(publishAt), unpublishAt: fromLocal(unpublishAt) }))}
          data-testid="page-save-main"
        >
          {tr("احفظ", "Save")}
        </button>
      </div>

      <div className="space-y-2 border-t border-white/[0.06] pt-3">
        <div className="flex items-center gap-2 text-[11px] text-white/60">
          {tr("محركات البحث", "Search engines")}
          <div className="ms-auto flex gap-1" role="group" aria-label={tr("اللغة", "Language")}>
            {(["ar", ...langs.filter((l) => l !== "ar")] as Lang[]).map((l) => (
              <button key={l} type="button" aria-pressed={seoLang === l} onClick={() => setSeoLang(l)} className={`rounded-md px-1.5 py-0.5 text-[10px] ${seoLang === l ? "bg-accent-500/30 text-white" : "text-white/55"}`} data-testid="page-seo-lang" data-lang={l}>
                {LANG_NAME[l]()}
              </button>
            ))}
          </div>
        </div>
        <label className={label}>{tr("العنوان بالبحث", "Title in search")} <span className="text-white/35">{seoNow.seoTitle.length}/120</span><input className={control} maxLength={120} value={seoNow.seoTitle} onChange={(e) => setSeo({ ...seo, [seoLang]: { ...seoNow, seoTitle: e.target.value } })} data-testid="page-seo-title" /></label>
        <label className={label}>{tr("الوصف بالبحث", "Description in search")} <span className="text-white/35">{seoNow.seoDescription.length}/300</span><textarea className={control} rows={3} maxLength={300} value={seoNow.seoDescription} onChange={(e) => setSeo({ ...seo, [seoLang]: { ...seoNow, seoDescription: e.target.value } })} /></label>
        <label className={label}>{tr("صورة المشاركة (رابط)", "Sharing picture (address)")}<input className={control} dir="ltr" value={seoNow.ogImageUrl} onChange={(e) => setSeo({ ...seo, [seoLang]: { ...seoNow, ogImageUrl: e.target.value } })} /></label>
        {seoLang === "ar" ? (
          <>
            <label className={label}>{tr("الرابط الرسمي (canonical)", "The official address (canonical)")}<input className={control} dir="ltr" value={canonical} onChange={(e) => setCanonical(e.target.value)} /></label>
            <label className="flex items-center justify-between gap-2 text-xs text-white/70">
              {tr("خبّيها عن محركات البحث", "Hide it from search engines")}
              <input type="checkbox" checked={noIndex} onChange={(e) => setNoIndex(e.target.checked)} />
            </label>
          </>
        ) : null}
        <button
          type="button" className={save} disabled={busy || (Boolean(seoNow.ogImageUrl) && !/^https?:\/\//.test(seoNow.ogImageUrl))}
          onClick={() =>
            void run(() =>
              seoLang === "ar"
                ? PagesAPI.updatePage(page.id, { seoTitle: seoNow.seoTitle.trim() || null, seoDescription: seoNow.seoDescription.trim() || null, ogImageUrl: seoNow.ogImageUrl.trim() || null, canonicalUrl: canonical.trim(), noIndex })
                : PagesAPI.savePageTranslation(page.id, seoLang, { seoTitle: seoNow.seoTitle.trim(), seoDescription: seoNow.seoDescription.trim(), ...(seoNow.ogImageUrl.trim() ? { ogImageUrl: seoNow.ogImageUrl.trim() } : {}) }),
            )
          }
          data-testid="page-save-seo"
        >
          {tr("احفظ البحث", "Save search settings")}
        </button>
      </div>

      <div className="space-y-2 border-t border-white/[0.06] pt-3">
        <div className="text-[11px] text-white/60">{tr("كود متقدم", "Advanced code")}</div>
        <p className="text-[10px] leading-4 text-amber-200/70">{tr("بيشتغل على هالصفحة بس. كود غلط ممكن يخرّب شكلها.", "It runs on this page only. Wrong code can break how it looks.")}</p>
        <label className={label}>CSS<textarea className={`${control} font-mono`} dir="ltr" rows={4} value={css} onChange={(e) => setCss(e.target.value)} data-testid="page-css" /></label>
        <label className={label}>{tr("سكربتات الـ head", "Head scripts")}<textarea className={`${control} font-mono`} dir="ltr" rows={3} value={head} onChange={(e) => setHead(e.target.value)} /></label>
        <label className={label}>{tr("سكربتات آخر الصفحة", "End-of-page scripts")}<textarea className={`${control} font-mono`} dir="ltr" rows={3} value={body} onChange={(e) => setBody(e.target.value)} /></label>
        <button type="button" className={save} disabled={busy} onClick={() => void run(() => PagesAPI.updatePage(page.id, { customCss: css.trim(), headScripts: head.trim(), bodyScripts: body.trim() }))} data-testid="page-save-code">
          {tr("احفظ الكود", "Save the code")}
        </button>
      </div>
    </details>
  );
}
