import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStoreTemplates, type StoreTemplate } from "../../api/storeTemplates.api";
import { shopOrigin } from "../../studio/storeThemes";
import { adminLang } from "../../lib/lang";
import { tr } from "../../lib/words";
import { StoreTemplateThumb } from "./StoreTemplateThumb";
import { MotionProfileFields } from "../../studio/MotionProfileFields";
import { motionProfileQuery, type MotionProfile } from "../../studio/motionProfiles";

export function StoreTemplatePicker({ families, categoryHint, selected, mode, onPick, motionOptions, onMotionOptions }: {
  families: string[]; categoryHint?: string; selected: StoreTemplate | null; mode: "light" | "dark" | null;
  onPick: (template: StoreTemplate | null) => void;
  motionOptions?: MotionProfile; onMotionOptions?: (options: MotionProfile) => void;
}) {
  const lang = adminLang();
  const catalog = useQuery({ queryKey: ["store-templates"], queryFn: getStoreTemplates, staleTime: 60_000, retry: 1, throwOnError: false });
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(12);
  const motionQuery = motionProfileQuery(motionOptions);
  const previewUrl = selected ? `${shopOrigin()}/${lang}/design-frame?template=${encodeURIComponent(selected.id)}&themeMode=${mode ?? selected.mode}${motionQuery ? `&${motionQuery}` : ""}` : "";
  const recommended = catalog.data?.categories.find((c) => c.id === categoryHint)?.id ?? families.map((family) => catalog.data?.categories.find((c) => c.family === family)?.id).find(Boolean) ?? "all";
  const referenceCount = catalog.data?.templates.filter(template => template.source).length ?? 0;
  const editionCount = catalog.data?.templates.filter(template => template.edition).length ?? 0;
  const activeCategory = category ?? (referenceCount ? "references" : recommended);
  const list = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (catalog.data?.templates ?? []).filter((x) => (activeCategory === "all" || activeCategory === "references" && Boolean(x.source) || activeCategory === "editions" && Boolean(x.edition) || x.category === activeCategory) && (!query || [...Object.values(x.name), ...Object.values(x.blurb), ...x.tags, x.source?.title ?? "", x.edition?.sourceTitle ?? ""].join(" ").toLowerCase().includes(query)));
  }, [catalog.data, activeCategory, search]);
  if (catalog.isPending) return <p role="status" className="text-sm text-white/55">{tr("عم نحمّل القوالب الجاهزة…", "Loading ready templates…")}</p>;
  if (catalog.isError) return <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200" role="status">
    {tr("تعذّر تحميل القوالب. أعد المحاولة لما يتصل المتجر.", "Templates couldn't be loaded. Retry when the storefront is connected.")}
    <button type="button" onClick={() => void catalog.refetch()} className="ms-2 underline">{tr("إعادة المحاولة", "Retry")}</button>
  </div>;
  return <section className="space-y-4 rounded-2xl border border-white/10 p-4" data-testid="store-template-picker">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="font-semibold">{tr("قوالب متجر كاملة", "Complete store templates")} <span className="text-accent-300">{catalog.data.templates.length}</span></h2>
        <p className="mt-1 text-xs leading-6 text-white/50">{tr("اختَر الشكل وشوف الصفحة قبل تطبيقها. المحتوى والصور قابلين للتعديل، والمنتجات التجريبية للمعاينة فقط.", "Preview a complete page before applying it. Edit its content and illustrations later; sample products are for previews only.")}</p></div>
      {selected ? <button type="button" onClick={() => onPick(null)} className="rounded-lg bg-white/5 px-3 py-2 text-xs">{tr("إلغاء الاختيار", "Clear selection")}</button> : null}
    </div>
    {onMotionOptions ? <div className="space-y-2 rounded-xl bg-white/[0.03] p-3">
      <div className="text-xs text-white/70">{tr("حركة القالب", "Template motion")}</div>
      <MotionProfileFields value={motionOptions} onChange={onMotionOptions} />
      <p className="text-[11px] leading-5 text-white/45">{tr("المعاينة والنسخة اللي إلك بيستخدموا نفس خيارات الحركة. بتقدر تغيّرها بعدين بالمحرّر.", "The preview and your copy use the same motion choices. Change them later in the editor.")}</p>
    </div> : null}
    <div className="flex gap-1.5 overflow-x-auto pb-2 sm:flex-wrap" role="group" aria-label={tr("فئة القالب", "Template category")}>
      {[...(referenceCount ? [{ id: "references", name: { ar: "قوالبك المرجعية", en: "Your reference designs", he: "עיצובי המקור שלכם" }, count: referenceCount }] : []), ...(editionCount ? [{ id: "editions", name: { ar: "توليفات المراجع", en: "Reference compositions", he: "גרסאות בהשראת המקור" }, count: editionCount }] : []), { id: "all", name: { ar: "الكل", en: "All", he: "הכל" }, count: catalog.data.templates.length }, ...catalog.data.categories].map((c) => <button key={c.id} type="button" aria-pressed={activeCategory === c.id} onClick={() => { setCategory(c.id); setLimit(12); }} className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${activeCategory === c.id ? "bg-accent-500/25 text-accent-100" : "bg-white/5 text-white/60"}`}>{c.name[lang]} · {c.count}</button>)}
    </div>
    {activeCategory === "editions" ? <p className="text-xs leading-6 text-white/50">{tr("توليفات مولّدة بافتتاحيات وتركيب أقسام مختلف، مستوحاة من مراجعك. كل توليفة نسخة مستقلة قابلة للتعديل.", "Generated compositions with different openings and section structures, inspired by your references. Each becomes an independently editable copy.")}</p> : null}
    <input type="search" aria-label={tr("بحث بالقوالب", "Search templates")} placeholder={tr("ابحث بالاسم أو الأسلوب: فاخر، minimal، gaming…", "Search a name or style: luxury, minimal, gaming…")} value={search} onChange={(e) => { setSearch(e.target.value); setCategory("all"); setLimit(12); }} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" />
    <div className="grid max-h-[420px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={tr("القالب الجاهز", "Ready template")}>
      {list.slice(0, limit).map((x) => <button key={x.id} type="button" role="radio" aria-checked={selected?.id === x.id} onClick={() => onPick(x)} className={`rounded-xl border p-3 text-start ${selected?.id === x.id ? "border-accent-400 bg-accent-500/10" : "border-white/10 hover:bg-white/5"}`} data-testid={`store-template-${x.id}`}>
        <StoreTemplateThumb template={x} lang={lang} />
        <span className="block text-sm font-semibold">{x.name[lang]}</span><span className="mt-1 block text-[11px] leading-5 text-white/50">{x.blurb[lang]}</span>
        {x.edition ? <span className="mt-1 block text-[10px] text-white/60">{tr("مستوحى من", "Inspired by")} {x.edition.sourceTitle}</span> : null}
        <span className="mt-2 block text-[10px] text-accent-200">{x.tags.join(" · ")}</span>
      </button>)}
    </div>
    {!list.length ? <p className="text-sm text-white/50">{tr("ما في قوالب بتطابق البحث.", "No templates match your search.")}</p> : null}
    {list.length > limit ? <button type="button" onClick={() => setLimit((n) => n + 12)} className="rounded-lg bg-white/5 px-3 py-2 text-xs">{tr("عرض المزيد", "Show more")}</button> : null}
    {selected ? <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="flex items-center justify-between gap-2 bg-white/5 px-3 py-2 text-xs"><span>{selected.name[lang]}</span><a href={previewUrl} target="_blank" rel="noreferrer" className="text-accent-200 underline">{tr("فتح المعاينة", "Open preview")}</a></div>
      <iframe title={tr("معاينة القالب", "Template preview")} src={previewUrl} className="h-[560px] w-full bg-white" />
    </div> : null}
  </section>;
}
