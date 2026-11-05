/**
 * The templates gallery: ready sections and whole pages (studio/templates), built for the
 * store's kind, the language being edited and a motion level, drawn small in the theme's
 * colours; added after the selection or at the page's end as one change (Undo takes it
 * back). The store's own templates live here too: a page or a section saved to use again,
 * and any of them as a file to take to another store (export / import).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../lib/toast";
import { createTemplate, deletePage, getPageTree, listTemplates, type MyTemplateInfo, type PageTreeNode } from "../api/pages.api";
import { getApiErrorMessage } from "../api/http";
import { Modal } from "../components/ui/Modal";
import { adminLang, type Lang } from "../lib/lang";
import { tr } from "../lib/words";
import { TemplateThumb } from "./TemplateThumb";
import type { ThumbColours } from "./templates/colours";
import type { TemplateKit } from "./packs";
import type { Ids, MotionLevel } from "./templates/build";
import { CAT_NAMES, PAGE_KINDS, PAGE_KIND_NAMES, PAGE_TEMPLATES, SECTION_CATS, SECTION_TEMPLATES, SKIN_NAMES, buildTemplate, freshIds, matches, readFile, toFile, type Template } from "./templates/catalog";
import { FAMILIES, PACKS, type Family, type W } from "./templates/words";
import { StoreTemplatePicker } from "../features/setup/StoreTemplatePicker";
import { getStoreTemplateImport, type StoreTemplate } from "../api/storeTemplates.api";
import { copyOf } from "./columns";
import type { MotionProfile } from "./motionProfiles";
import { personaliseStoreWords } from "../lib/templateWords";

type Tab = "designs" | "sections" | "pages" | "mine";
export type UseWhere = "here" | "end";
/** What's shown big on the side: a template from the library, one of the store's own, or a file read in. */
type Shown = { kind: "library"; t: Template } | { kind: "mine"; t: MyTemplateInfo; nodes: PageTreeNode[] } | { kind: "file"; name: string; nodes: PageTreeNode[] };

const PAGE_SIZE = 36;
const btn = "rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/[0.1] disabled:opacity-40";
const main = "rounded-lg bg-accent-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-400 disabled:opacity-40";
const control = "rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";
const nameOf = (w: W) => w[adminLang()];

/** Counted ids for drawings (the page's own ids are made when something is added). */
const drawIds = (): Ids => {
  let n = 0;
  return (p) => `${p}-${n++}`;
};
function download(name: string, nodes: PageTreeNode[]) {
  const url = URL.createObjectURL(new Blob([toFile(name, nodes)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60) || "template"}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function TemplatesGallery({ open, onClose, lang, family, colours, pics, kit, busy, here, pageName, storeName, pageSections, selectedSection, makeIds, onUse }: {
  open: boolean;
  onClose: () => void;
  /** The shop language being edited (the templates' words). */
  lang: Lang;
  /** The store's kind (its theme's), shown first. */
  family: Family;
  colours: ThumbColours;
  /** The store's own pictures (its products'). */
  pics: string[];
  /** The store's pack: the templates take its edges, patterns, shapes, cards, 3D and hovers. */
  kit?: TemplateKit;
  busy: boolean;
  /** What "here" adds after (null: nothing selected, so only at the end). */
  here: string | null;
  pageName: string;
  storeName: Record<Lang, string>;
  /** The page's own sections and popups (old sections and linked blocks aren't kept in a template). */
  pageSections: () => PageTreeNode[];
  selectedSection: PageTreeNode | null;
  makeIds: () => Ids;
  onUse: (nodes: PageTreeNode[], where: UseWhere, label: string) => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("designs");
  const [design, setDesign] = useState<StoreTemplate | null>(null);
  const [designMotion, setDesignMotion] = useState<MotionProfile>({});
  const [importing, setImporting] = useState(false);
  const importEpoch = useRef(0);
  useEffect(() => {
    if (!open) setImporting(false);
    return () => { importEpoch.current++; };
  }, [open]);
  const [group, setGroup] = useState<string>("all");
  const [q, setQ] = useState("");
  const [fam, setFam] = useState<Family>(family);
  const [motion, setMotion] = useState<MotionLevel>("calm");
  const [all, setAll] = useState(false);
  const [shown, setShown] = useState<Shown | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [saving, setSaving] = useState<"page" | "section" | "file" | null>(null);
  const [saveName, setSaveName] = useState("");
  const [sure, setSure] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mine = useQuery({ queryKey: ["page-templates"], queryFn: listTemplates, enabled: open, staleTime: 30_000 });

  const opts = useMemo(() => ({ lang, fam, motion, all, pics, kit }), [lang, fam, motion, all, pics, kit]);
  const list = useMemo(() => {
    const source = tab === "sections" ? SECTION_TEMPLATES : tab === "pages" ? PAGE_TEMPLATES : [];
    // A kind's homes show for that kind only.
    return source.filter((t) => (group === "all" || t.group === group) && (!t.fam || t.fam === fam) && matches(t, q));
  }, [tab, group, fam, q]);
  const groups = tab === "sections" ? SECTION_CATS : tab === "pages" ? PAGE_KINDS : [];
  const count = (g: string) => (tab === "sections" ? SECTION_TEMPLATES : PAGE_TEMPLATES).filter((t) => t.group === g && (!t.fam || t.fam === fam)).length;

  const switchTab = (t: Tab) => {
    setTab(t);
    setGroup("all");
    setLimit(PAGE_SIZE);
  };
  const shownNodes = useCallback((ids: Ids): PageTreeNode[] | null => {
    if (!shown) return null;
    if (shown.kind === "library") return buildTemplate(shown.t.id, { ...opts, ids });
    return shown.nodes.map((n) => freshIds(n, ids));
  }, [shown, opts]);
  const shownName = shown ? (shown.kind === "library" ? nameOf(shown.t.name) : shown.kind === "mine" ? shown.t.name : shown.name) : "";
  const use = (where: UseWhere) => {
    const nodes = shownNodes(makeIds());
    if (!nodes?.length) return;
    onUse(nodes, where, tr(`قالب: ${shownName}`, "Template: {0}", [shownName]));
    onClose();
  };
  const openMine = async (t: MyTemplateInfo) => {
    try {
      const { tree } = await getPageTree(t.id);
      setShown({ kind: "mine", t, nodes: (tree.root.children ?? []).filter((n) => n.type === "section" || n.type === "popup") });
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };
  const save = async (nodes: PageTreeNode[]) => {
    if (!saveName.trim() || !nodes.length) return;
    try {
      await createTemplate(saveName.trim(), nodes);
      toast.success(tr("انحفظ بقوالبك", "Saved to your templates"));
      setSaving(null);
      setSaveName("");
      void qc.invalidateQueries({ queryKey: ["page-templates"] });
      switchTab("mine");
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };
  const readIn = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return void toast.error(tr("الملف كبير كتير", "The file is too big"));
    const r = readFile(await file.text());
    if (!r.ok) {
      const why = { json: tr("مش ملف JSON", "Not a JSON file"), kind: tr("مش ملف قالب", "Not a template file"), empty: tr("الملف فاضي", "The file is empty"), shape: tr("محتواه مش مفهوم", "Its content can't be read"), big: tr("فيه أكتر من اللازم", "It holds too much") }[r.why];
      return void toast.error(why);
    }
    setShown({ kind: "file", name: r.name || file.name.replace(/\.json$/i, ""), nodes: r.sections });
  };
  const thumbOf = (t: Template) => () => buildTemplate(t.id, { ...opts, ids: drawIds() });

  const pageOwn = open ? pageSections() : [];
  const insertDesignContent = async () => {
    if (!design || busy || importing) return;
    const request = ++importEpoch.current;
    setImporting(true);
    try {
      const imported = await getStoreTemplateImport(design.id, designMotion);
      if (request !== importEpoch.current) return;
      const ids = makeIds();
      const nodes = personaliseStoreWords(imported.tree.root.children ?? [], storeName).map(node => copyOf(node, ids));
      onUse(nodes, "end", tr(`قالب: ${design.name[lang]}`, "Template: {0}", [design.name[lang]]));
      onClose();
    } catch (error) { toast.error(getApiErrorMessage(error)); }
    finally { if (request === importEpoch.current) setImporting(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={tr("القوالب", "Templates")} widthClassName="max-w-6xl">
      <div className="flex min-h-0 flex-col gap-3" data-testid="studio-templates">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1" role="tablist">
            {([["designs", tr("تصاميم المتجر الكاملة", "Complete store designs")], ["sections", tr("أقسام", "Sections")], ["pages", tr("صفحات كاملة", "Whole pages")], ["mine", tr("قوالبي", "My templates")]] as const).map(([t, label]) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => switchTab(t)} className={`rounded-lg px-3 py-1.5 text-xs ${tab === t ? "bg-accent-500/30 text-white" : "text-white/60 hover:bg-white/[0.06]"}`} data-testid={`studio-tpl-tab-${t}`}>
                {label}
              </button>
            ))}
          </div>
          {tab !== "mine" && tab !== "designs" ? (
            <>
              <input type="search" className={`${control} min-w-0 flex-1`} placeholder={tr("دوّر (هيدر، عرض، رمضان…)", "Search (header, offer, Ramadan…)")} value={q} onChange={(e) => {
                // Looking for something looks through every category.
                setQ(e.target.value);
                if (e.target.value.trim()) setGroup("all");
                setLimit(PAGE_SIZE);
              }} data-testid="studio-tpl-search" />
              <label className="flex items-center gap-1 text-[11px] text-white/60">
                {tr("نوع المتجر", "Kind of store")}
                <select className={control} value={fam} onChange={(e) => setFam(e.target.value as Family)} data-testid="studio-tpl-kind">
                  {FAMILIES.map((f) => <option key={f} value={f}>{nameOf(PACKS[f].label)}</option>)}
                </select>
              </label>
              <div className="flex gap-1 rounded-lg bg-white/[0.04] p-0.5" role="group" aria-label={tr("الحركة", "Motion")}>
                {([["calm", tr("حركة هادية", "Calm motion")], ["rich", tr("حركة غنية", "Rich motion")]] as const).map(([m, label]) => (
                  <button key={m} type="button" aria-pressed={motion === m} onClick={() => setMotion(m)} className={`rounded-md px-2 py-1 text-[11px] ${motion === m ? "bg-accent-500/30 text-white" : "text-white/60"}`} data-testid={`studio-tpl-motion-${m}`}>{label}</button>
                ))}
              </div>
              <label className="flex items-center gap-1 text-[11px] text-white/60" title={tr("بدون هاد، الكلام بلغة الصفحة المفتوحة بس، والمتجر بيكتب اللغات التانية.", "Without it, the words come in the page's open language only, and the store writes the others.")}>
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} data-testid="studio-tpl-all" />
                {tr("الكلام بالتلات لغات", "Words in all three languages")}
              </label>
            </>
          ) : null}
        </div>

        {tab === "designs" ? <div className="min-h-0 max-h-[52vh] overflow-y-auto sm:max-h-[62vh]" data-testid="studio-store-designs">
          {open ? <fieldset disabled={importing}><StoreTemplatePicker families={[family]} selected={design} mode={design?.mode ?? null} onPick={setDesign} motionOptions={designMotion} onMotionOptions={setDesignMotion} /></fieldset> : null}
          {design ? <div className="sticky bottom-0 space-y-2 rounded-xl border border-white/10 bg-surface-950 p-3">
            <div className="flex flex-wrap gap-2">
              <Link to={`/setup?view=templates&template=${encodeURIComponent(design.id)}`} className={main} data-testid="studio-tpl-use-design">{tr("استخدم التصميم الكامل للمتجر", "Use the complete store design")}</Link>
              <button type="button" className={btn} disabled={busy || importing} onClick={() => void insertDesignContent()} data-testid="studio-tpl-insert-content">{importing ? tr("جارٍ التحميل…", "Loading…") : tr("أضف محتوى القالب بآخر الصفحة", "Add the template content at the page's end")}</button>
            </div>
            <p className="text-[11px] leading-5 text-white/55">{tr("التصميم الكامل يفتح إعداد نسختك الخاصة مع الهيدر والفوتر والثيم. إضافة المحتوى تضيف أقسامه للصفحة الحالية وبتقدر تتراجع عنها.", "The complete design opens setup for your own copy, including header, footer and theme. Adding content inserts its sections into this page and can be undone.")}</p>
          </div> : null}
        </div> : <div className="grid min-h-0 gap-3 md:grid-cols-[170px_minmax(0,1fr)_320px]" style={{ height: "min(60vh, 680px)" }}>
          {/* Groups (or, in "mine", saving and files). */}
          <nav className="min-h-0 overflow-y-auto pe-1" aria-label={tr("الأنواع", "Kinds")}>
            {tab === "mine" ? (
              <div className="space-y-2 text-xs">
                <button type="button" className={`${btn} w-full text-start`} disabled={busy || !pageOwn.length} onClick={() => { setSaving("page"); setSaveName(pageName); }} data-testid="studio-tpl-save-page">⧉ {tr("احفظ هالصفحة كقالب", "Save this page as a template")}</button>
                <button type="button" className={`${btn} w-full text-start`} disabled={busy || !selectedSection} onClick={() => { setSaving("section"); setSaveName(selectedSection?.name ?? ""); }} data-testid="studio-tpl-save-section">⧉ {tr("احفظ القسم المحدد كقالب", "Save the selected section as a template")}</button>
                <button type="button" className={`${btn} w-full text-start`} disabled={!pageOwn.length} onClick={() => download(pageName, pageOwn)} data-testid="studio-tpl-export-page">⇩ {tr("نزّل الصفحة كملف", "Download the page as a file")}</button>
                <button type="button" className={`${btn} w-full text-start`} disabled={!selectedSection} onClick={() => selectedSection && download(selectedSection.name ?? pageName, [selectedSection])} data-testid="studio-tpl-export-section">⇩ {tr("نزّل القسم المحدد كملف", "Download the selected section")}</button>
                <button type="button" className={`${btn} w-full text-start`} onClick={() => fileRef.current?.click()} data-testid="studio-tpl-import">⇧ {tr("افتح ملف قالب", "Open a template file")}</button>
                <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { void readIn(e.target.files?.[0]); e.target.value = ""; }} data-testid="studio-tpl-import-file" />
                <p className="text-[10px] leading-4 text-white/35">{tr("الأقسام القديمة والبلوكات المربوطة ما بتنحفظ بالقالب.", "Old sections and linked blocks aren't kept in a template.")}</p>
              </div>
            ) : (
              <ul className="space-y-0.5 text-xs">
                <li>
                  <button type="button" onClick={() => { setGroup("all"); setLimit(PAGE_SIZE); }} aria-pressed={group === "all"} className={`flex w-full justify-between rounded-lg px-2 py-1.5 ${group === "all" ? "bg-accent-500/20 text-white" : "text-white/65 hover:bg-white/[0.05]"}`} data-testid="studio-tpl-group" data-group="all">
                    <span>{tr("الكل", "All")}</span>
                  </button>
                </li>
                {groups.map((g) => (
                  <li key={g}>
                    <button type="button" onClick={() => { setGroup(g); setLimit(PAGE_SIZE); }} aria-pressed={group === g} className={`flex w-full justify-between gap-2 rounded-lg px-2 py-1.5 text-start ${group === g ? "bg-accent-500/20 text-white" : "text-white/65 hover:bg-white/[0.05]"}`} data-testid="studio-tpl-group" data-group={g}>
                      <span className="truncate">{nameOf(tab === "sections" ? CAT_NAMES[g as keyof typeof CAT_NAMES] : PAGE_KIND_NAMES[g as keyof typeof PAGE_KIND_NAMES])}</span>
                      <span className="text-white/35">{count(g)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>

          {/* The list. */}
          <div className="min-h-0 overflow-y-auto" data-testid="studio-tpl-list">
            {tab === "mine" ? (
              mine.isLoading ? <p className="p-3 text-xs text-white/50">{tr("عم يحمّل…", "Loading…")}</p>
              : !mine.data?.length ? <p className="p-3 text-xs leading-5 text-white/50">{tr("لسا ما في قوالب إلك. احفظ صفحة أو قسم من الجنب، أو افتح ملف قالب.", "No templates of your own yet. Save a page or a section from the side, or open a template file.")}</p>
              : (
                <ul className="space-y-1">
                  {mine.data.map((t) => (
                    <li key={t.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${shown?.kind === "mine" && shown.t.id === t.id ? "border-accent-400/60 bg-accent-500/10" : "border-white/[0.08]"}`} data-testid="studio-tpl-mine-item">
                      <button type="button" className="min-w-0 flex-1 truncate text-start text-white/85" onClick={() => void openMine(t)}>{t.name}</button>
                      <span className="text-white/40">{tr(`${t.sections} أقسام`, "{0} sections", [t.sections])}</span>
                      {sure === t.id ? (
                        <button type="button" className="rounded-lg bg-red-500/80 px-2 py-1 text-white" onClick={async () => {
                          try {
                            await deletePage(t.id);
                            setSure(null);
                            if (shown?.kind === "mine" && shown.t.id === t.id) setShown(null);
                            void qc.invalidateQueries({ queryKey: ["page-templates"] });
                          } catch (e) {
                            toast.error(getApiErrorMessage(e));
                          }
                        }} data-testid="studio-tpl-mine-delete-sure">{tr("أكيد؟", "Sure?")}</button>
                      ) : (
                        <button type="button" className="text-white/40 hover:text-red-300" onClick={() => setSure(t.id)} aria-label={tr("احذف", "Delete")} data-testid="studio-tpl-mine-delete">✕</button>
                      )}
                    </li>
                  ))}
                </ul>
              )
            ) : !list.length ? (
              <p className="p-3 text-xs text-white/50">{tr("ما في قوالب بهالوصف.", "No templates match.")}</p>
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                  {list.slice(0, limit).map((t) => {
                    const on = shown?.kind === "library" && shown.t.id === t.id;
                    return (
                      <li key={t.id}>
                        <button type="button" onClick={() => setShown({ kind: "library", t })} aria-pressed={on} className={`w-full overflow-hidden rounded-xl border text-start ${on ? "border-accent-400 ring-1 ring-accent-400" : "border-white/[0.08] hover:border-white/25"}`} data-testid="studio-tpl-card" data-id={t.id}>
                          <TemplateThumb key={`${t.id}:${fam}:${motion}:${all}`} build={thumbOf(t)} colours={colours} lang={lang} width={220} height={tab === "pages" ? 190 : 130} />
                          <span className="block truncate px-2 pt-1.5 text-[11px] text-white/85">{nameOf(t.name)}</span>
                          <span className="block truncate px-2 pb-1.5 text-[10px] text-white/40">{t.skin ? nameOf(SKIN_NAMES[t.skin]) : nameOf(PAGE_KIND_NAMES[t.group as keyof typeof PAGE_KIND_NAMES])}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {list.length > limit ? (
                  <div className="py-3 text-center">
                    <button type="button" className={btn} onClick={() => setLimit((n) => n + PAGE_SIZE)} data-testid="studio-tpl-more">{tr(`اعرض أكتر (باقي ${list.length - limit})`, "Show more ({0} left)", [list.length - limit])}</button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {/* What's chosen, big, and what to do with it. */}
          <aside className="flex min-h-0 flex-col gap-2 rounded-xl border border-white/[0.08] p-2" aria-label={tr("المعاينة", "Preview")} data-testid="studio-tpl-preview">
            {saving ? (
              <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void save(saving === "page" ? pageOwn : saving === "section" && selectedSection ? [selectedSection] : shown && shown.kind === "file" ? shown.nodes : []); }} data-testid="studio-tpl-save">
                <div className="text-xs font-medium text-white/75">{saving === "page" ? tr("احفظ الصفحة كقالب", "Save the page as a template") : saving === "section" ? tr("احفظ القسم كقالب", "Save the section as a template") : tr("احفظ الملف بقوالبي", "Save the file to my templates")}</div>
                <input autoFocus className={`${control} w-full`} maxLength={80} placeholder={tr("اسم القالب", "The template's name")} value={saveName} onChange={(e) => setSaveName(e.target.value)} data-testid="studio-tpl-save-name" />
                <div className="flex gap-1">
                  <button type="submit" className={main} disabled={busy || !saveName.trim()} data-testid="studio-tpl-save-go">{tr("احفظ", "Save")}</button>
                  <button type="button" className={btn} onClick={() => setSaving(null)}>{tr("إلغاء", "Cancel")}</button>
                </div>
              </form>
            ) : shown ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-lg">
                  <TemplateThumb key={`${shownName}:${fam}:${motion}:${all}:${shown.kind}`} build={() => shownNodes(drawIds())} colours={colours} lang={lang} width={300} />
                </div>
                <div className="truncate text-xs text-white/85" data-testid="studio-tpl-shown-name">{shownName}</div>
                <div className="flex flex-wrap gap-1">
                  <button type="button" className={main} disabled={busy || !here} onClick={() => use("here")} title={here ? tr(`بعد: ${here}`, "After: {0}", [here]) : undefined} data-testid="studio-tpl-here">{tr("ضيفه بعد المحدد", "Add after the selection")}</button>
                  <button type="button" className={btn} disabled={busy} onClick={() => use("end")} data-testid="studio-tpl-end">{tr("ضيفه بآخر الصفحة", "Add at the page's end")}</button>
                  <button type="button" className={btn} onClick={() => { const n = shownNodes(drawIds()); if (n) download(shownName, n); }} data-testid="studio-tpl-download">⇩ {tr("ملف", "File")}</button>
                  {shown.kind === "file" ? <button type="button" className={btn} disabled={busy} onClick={() => { setSaving("file"); setSaveName(shown.name); }} data-testid="studio-tpl-save-file">⧉ {tr("احفظه بقوالبي", "Save to my templates")}</button> : null}
                </div>
                <p className="text-[10px] leading-4 text-white/35">{tr("بينضاف كتغيير واحد: «تراجع» بيشيله كله. الصور صور منتجاتك، وبتتغير متل أي صورة.", "It's added as one change: Undo takes it all back. The pictures are your products', and change like any picture.")}</p>
              </>
            ) : (
              <p className="p-2 text-xs leading-5 text-white/45">{tr("اختار قالب لتشوفه هون بكبير.", "Pick a template to see it here, bigger.")}</p>
            )}
          </aside>
        </div>}
      </div>
    </Modal>
  );
}
