import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "../../api/settings.api";
import { listPages } from "../../api/pages.api";
import { adminLang } from "../../lib/lang";
import { storeNameOf } from "../../lib/storeIdentity";
import { tr } from "../../lib/words";
import { currentStoreTheme, currentStoreThemeId, loadStoreThemes, ROSE_ID, shopOrigin, type Words } from "../../studio/storeThemes";

/** The live design is independent of the source-template catalog and its filters. */
export function CurrentStoreDesign({ active = true, onSelect }: { active?: boolean; onSelect?: () => void }) {
  const lang = adminLang();
  const settings = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const header = settings.data?.header as { storeDesign?: { homeId?: string; mode?: string }; identity?: { industry?: string; audience?: string } } | null | undefined;
  const choice = currentStoreTheme(header);
  const original = !choice && header?.storeDesign?.mode !== "cms" && header?.identity?.industry === "fashion" && header.identity.audience === "women";
  const catalog = useQuery({ queryKey: ["store-themes", "full"], queryFn: loadStoreThemes, staleTime: 300_000, enabled: Boolean(settings.data) && !choice && !original });
  const homeId = header?.storeDesign?.homeId;
  const pages = useQuery({ queryKey: ["pages"], queryFn: listPages, enabled: Boolean(settings.data) && !homeId });
  const [expanded, setExpanded] = useState(false);
  if (!settings.data) return null;

  const id = currentStoreThemeId(header, catalog.data?.defaults);
  const name = (choice?.snapshot as { name?: Words } | undefined)?.name;
  const designName = name?.[lang] || name?.en || (id === ROSE_ID ? tr("تصميم المتجر الأصلي", "Original store design") : catalog.data?.themes.find(theme => theme.id === id)?.name[lang]);
  const editorId = homeId ?? pages.data?.find(page => page.slug === "/")?.id;
  // An explicit current ID prevents a previous template preview retained in the frame's
  // sessionStorage from repainting this live store. Saved custom colours/fonts stay on.
  const previewReady = Boolean(choice || original || catalog.data);
  const query = previewReady ? `?storeTheme=${encodeURIComponent(id)}${choice?.mode ? `&themeMode=${choice.mode}` : ""}${choice?.custom && typeof choice.custom === "object" ? `&themeCustom=${encodeURIComponent(JSON.stringify(choice.custom))}` : ""}` : "";
  const url = `${shopOrigin()}/${lang}${query}`;

  return <section className="space-y-3 rounded-2xl border border-accent-400/30 bg-accent-500/[0.06] p-4" data-testid="current-store-design">
    <button type="button" aria-pressed={active} aria-expanded={expanded} onClick={() => { onSelect?.(); setExpanded(value => !value); }} className="w-full text-start" data-testid="current-store-design-choice" data-theme-id={id}>
      <span className="flex flex-wrap items-center gap-2"><span className="font-semibold">{tr("تصميم المتجر الحالي", "Current store design")}</span><span className="rounded-md bg-accent-500/20 px-2 py-0.5 text-[10px] text-accent-200">{tr("الحالي", "Current")}</span></span>
      <span className="mt-1 block text-sm">{storeNameOf(settings.data, lang)}{designName ? ` · ${designName}` : ""}</span>
      <span className="mt-1 block text-xs leading-6 text-white/55">{tr("تصميمك ومحتواك الموجودين بالمتجر. كمّل تعديلهم أو اختَر قالب جديد لنسخة مستقلة.", "Your live design and content. Continue editing them, or choose a new template for an independent copy.")}</span>
    </button>
    <div className="flex flex-wrap gap-3 text-xs">
      <Link to={editorId ? `/studio/${encodeURIComponent(editorId)}` : "/admin/pages"} className="rounded-lg bg-accent-500/20 px-3 py-2 text-accent-100">{tr("تعديل التصميم الحالي", "Edit current design")}</Link>
      <a href={url} target="_blank" rel="noreferrer" className="px-1 py-2 text-accent-200 underline">{tr("فتح معاينة التصميم الحالي", "Open current design preview")}</a>
    </div>
    {expanded && active && previewReady ? <iframe title={tr("معاينة التصميم الحالي", "Current design preview")} src={url} className="h-[560px] w-full rounded-xl border border-white/10 bg-white" /> : null}
  </section>;
}
