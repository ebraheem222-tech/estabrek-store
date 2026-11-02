/**
 * Picking an icon: the shop's few built-in ones, or any of Lucide, Tabler (lines or filled)
 * and Phosphor (six weights), searched in Arabic, Hebrew or English and narrowed by group.
 * A set is fetched the first time it's opened; a few hundred show at a time.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Modal } from "../components/ui/Modal";
import { tr } from "../lib/words";
import { BASIC_ICONS, ICON_SETS, PH_WEIGHTS, PH_WEIGHT_NAME, basicArt, groupName, iconArt, iconRef, loadIconSet, searchIcons, setOfRef, type IconSet, type IconSetKey } from "./iconLibrary";
import type { Art, ArtNode } from "./svgArt";

const CAMEL = (k: string) => k.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
/** An icon drawn in the words' colour (no ids or theme colours in the library's icons). */
export function IconGlyph({ art, className = "h-6 w-6" }: { art: Art; className?: string }) {
  const draw = (n: ArtNode, i: number): ReactNode => {
    const props: Record<string, unknown> = { key: i };
    for (const [k, v] of Object.entries(n.a)) props[CAMEL(k)] = v;
    const Tag = n.t as "path";
    return <Tag {...(props as object)}>{(n.c ?? []).map(draw)}</Tag>;
  };
  return (
    <svg viewBox={art.viewBox} className={className} aria-hidden="true">
      {art.nodes.map(draw)}
    </svg>
  );
}
type Family = "basic" | "lucide" | "tabler" | "tabler-filled" | "phosphor";
const PAGE = 240;

export function IconPicker({ open, current, line, onPick, onClose }: {
  open: boolean;
  /** The icon now ("heart", "lucide:heart"), so its set opens first. */
  current?: string;
  /** The line width to give a line icon picked (the one the element has now). */
  line?: number;
  onPick: (name: string, art: Art | null) => void;
  onClose: () => void;
}) {
  const start = setOfRef(current);
  const [family, setFamily] = useState<Family>(!start ? "basic" : start.startsWith("ph-") ? "phosphor" : (start as Family));
  const [weight, setWeight] = useState<(typeof PH_WEIGHTS)[number]>(start?.startsWith("ph-") ? (start.slice(3) as (typeof PH_WEIGHTS)[number]) : "regular");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [set, setSet] = useState<IconSet | null>(null);
  const [failedKey, setFailedKey] = useState<IconSetKey | null>(null);
  const key: IconSetKey | null = family === "basic" ? null : family === "phosphor" ? `ph-${weight}` : family;
  // Each time it opens: the icon's own set, nothing searched.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFamily(!start ? "basic" : start.startsWith("ph-") ? "phosphor" : (start as Family));
      if (start?.startsWith("ph-")) setWeight(start.slice(3) as (typeof PH_WEIGHTS)[number]);
      setQuery("");
      setGroup("");
    }
  }

  useEffect(() => {
    if (!open || !key) return;
    let live = true;
    loadIconSet(key).then(
      (s) => {
        if (!live) return;
        setSet(s);
        setFailedKey(null);
      },
      () => live && setFailedKey(key),
    );
    return () => {
      live = false;
    };
  }, [open, key]);
  // How many show: a new set, search or group starts again from the first few hundred.
  const view = `${key}|${query}|${group}`;
  const [more, setMore] = useState({ view, n: PAGE });
  const shown = more.view === view ? more.n : PAGE;
  const failed = failedKey !== null && failedKey === key;

  const ready = set && set.key === key ? set : null;
  const found = useMemo(() => (ready ? searchIcons(ready, query, group) : []), [ready, query, group]);
  const lineOf = ICON_SETS.find((s) => s.key === key)?.line;
  const basics = BASIC_ICONS.filter(([k, name]) => !query.trim() || k.includes(query.trim().toLowerCase()) || name().includes(query.trim()));
  const tab = (f: Family, label: string) => (
    <button key={f} type="button" role="tab" aria-selected={family === f} onClick={() => {
        setFamily(f);
        setGroup("");
      }} className={`rounded-lg px-2.5 py-1 text-xs ${family === f ? "bg-accent-500 text-white" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"}`} data-testid={`icon-set-${f}`}>
      {label}
    </button>
  );
  const cell = "flex h-12 flex-col items-center justify-center rounded-lg text-white/85 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500";

  return (
    <Modal open={open} title={tr("مكتبة الأيقونات", "Icon library")} onClose={onClose} widthClassName="max-w-4xl">
      <div className="space-y-3" data-testid="icon-picker">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist">
          {tab("basic", tr("الأساسية", "Basic"))}
          {tab("lucide", "Lucide")}
          {tab("tabler", "Tabler")}
          {tab("tabler-filled", tr("Tabler معبّأة", "Tabler filled"))}
          {tab("phosphor", "Phosphor")}
        </div>
        {family === "phosphor" ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr("الوزن", "Weight")}>
            {PH_WEIGHTS.map((w) => (
              <button key={w} type="button" aria-pressed={weight === w} onClick={() => setWeight(w)} className={`rounded-full px-2.5 py-0.5 text-[11px] ${weight === w ? "bg-white/20 text-white" : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"}`} data-testid={`icon-weight-${w}`}>
                {PH_WEIGHT_NAME[w]()}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <input
            autoFocus type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("ابحث: سلة، قلب، توصيل، cart…", "Search: cart, heart, delivery…")}
            className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-surface-925 px-3 py-2 text-sm text-white placeholder:text-white/35" data-testid="icon-search"
          />
          {ready?.groups.length ? (
            <select value={group} onChange={(e) => setGroup(e.target.value)} className="rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-2 text-xs text-white" aria-label={tr("المجموعة", "Group")} data-testid="icon-group">
              <option value="">{tr("كل المجموعات", "Every group")}</option>
              {ready.groups.map((g) => <option key={g} value={g}>{groupName(g)}</option>)}
            </select>
          ) : null}
        </div>
        {family === "basic" ? (
          <div className="grid h-[50vh] grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] content-start gap-1" data-testid="icon-grid">
            {basics.map(([k, name, d]) => (
              <button key={k} type="button" className={`${cell} ${current === k ? "bg-accent-500/25" : ""}`} title={name()} onClick={() => onPick(k, null)} data-icon={k}>
                <IconGlyph art={basicArt(d)} />
                <span className="mt-0.5 max-w-full truncate px-1 text-[9px] text-white/45">{name()}</span>
              </button>
            ))}
          </div>
        ) : failed ? (
          <div className="py-8 text-center text-sm text-red-200">{tr("ما قدرنا نجيب الأيقونات. جرّب كمان مرة.", "Couldn't load the icons. Try again.")}</div>
        ) : !ready ? (
          <div className="grid h-[50vh] place-items-center text-sm text-white/50" data-testid="icon-loading">{tr("عم نجيب الأيقونات…", "Loading the icons…")}</div>
        ) : (
          <>
            <div className="text-[11px] text-white/45" data-testid="icon-count">{tr(`${found.length} أيقونة`, "{0} icons", [found.length])}</div>
            {/* A fixed height, so the window doesn't jump as the list changes. */}
            <div className="h-[50vh] space-y-2 overflow-y-auto" key={view}>
              {found.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1" data-testid="icon-grid">
                  {found.slice(0, shown).map((icon) => {
                    const ref = iconRef(ready.key, icon.name);
                    return (
                      <button key={icon.name} type="button" className={`${cell} ${current === ref ? "bg-accent-500/25" : ""}`} title={icon.name} aria-label={icon.name} onClick={() => onPick(ref, iconArt(ready, icon, lineOf ? line : undefined))} data-icon={ref}>
                        <IconGlyph art={iconArt(ready, icon)} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-white/50">{tr("ما في أيقونة بهالاسم. جرّب كلمة تانية أو مكتبة تانية.", "No icon by that name. Try another word or set.")}</div>
              )}
              {found.length > shown ? (
                <button type="button" className="w-full rounded-lg bg-white/[0.06] py-2 text-xs hover:bg-white/[0.1]" onClick={() => setMore({ view, n: shown + PAGE })} data-testid="icon-more">
                  {tr(`اعرض أكتر (${found.length - shown} باقية)`, "Show more ({0} left)", [found.length - shown])}
                </button>
              ) : null}
            </div>
          </>
        )}
        <p className="text-[10px] text-white/35">{tr("Lucide (ISC)، Tabler وPhosphor (MIT): مجانية للاستعمال بالمتجر.", "Lucide (ISC), Tabler and Phosphor (MIT): free to use in the shop.")}</p>
      </div>
    </Modal>
  );
}
