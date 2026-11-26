/**
 * The editor's Add panel (like Wix's): sections, ready blocks, words, pictures and clips,
 * drawings, 3D, the store's own blocks, and motions for what's selected. A click adds next
 * to the selection (before, after or inside it, as chosen at the top); dragging onto the
 * page puts it where it's dropped (between sections, inside a place, or over a section).
 */
import { useState } from "react";
import type { PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";
import { hasPreset, presetsFor, type Motion, type MotionPreset } from "./look";
import { SplitPicker } from "./StudioTreePanels";
import { typeLabel } from "./treeIndex";
import type { AddKind, Where } from "./insert";
import { REFERENCE_SECTIONS } from "./referenceSections";
import { LIVE_GROUPS, LIVE_SECTIONS } from "./liveSections";
import { adminLang } from "../lib/lang";
import { say } from "./say";
import { LIB_ITEMS, LIB_KIND_NAME, libName, type LibKind } from "./library";
import { libFilter } from "./LibraryBrowser";

const GROUPS: Array<{ key: string; title: () => string; kinds: Array<[AddKind, () => string, string]> }> = [
  { key: "commerce", title: () => tr("المتجر والسلة", "Shop and cart"), kinds: [["shop", () => typeLabel("shop"), "▦"], ["cartItems", () => typeLabel("cartItems"), "▤"], ["cartSummary", () => typeLabel("cartSummary"), "Σ"], ["cartCheckout", () => typeLabel("cartCheckout"), "✓"]] },
  // Forty sections on the forty new drawn backgrounds (liveSections.ts), in three groups; their words carry their own Hebrew.
  ...LIVE_GROUPS.map(([group, title]) => ({ key: `live-${group}`, title: () => title[adminLang()], kinds: LIVE_SECTIONS.filter(s => s.group === group).map(s => [s.kind, () => s.name[adminLang()], "✺"] as [AddKind, () => string, string]) })),
  { key: "references", title: () => tr("إلهام القوالب", "Template inspiration"), kinds: REFERENCE_SECTIONS.map(reference => [reference.kind, () => tr(reference.name.ar, reference.name.en), "✦"]) },
  {
    key: "ready",
    title: () => tr("أقسام جاهزة", "Ready sections"),
    kinds: [
      ["section", () => tr("قسم فاضي", "Empty section"), "▭"],
      ["ready-intro", () => tr("عنوان ونص وزر", "Heading, text and button"), "☰"],
      ["ready-split", () => tr("صورة وكلام", "Picture and words"), "◧"],
      ["ready-video", () => tr("فيديو افتتاحي بطبقة وعنوان", "Video hero with overlay"), "▶"],
      ["ready-model3d", () => tr("عرض منتج ثلاثي الأبعاد", "3D product showcase"), "◇"],
      ["ready-lantern", () => tr("فانوس ثلاثي الأبعاد ويراعات", "3D lantern and fireflies"), "✺"],
      ["ready-gallery", () => tr("معرض صور", "Picture gallery"), "▦"],
      ["ready-header", () => tr("هيدر: الاسم والقائمة والبحث", "Header: name, menu, search"), "⎺"],
      ["ready-footer", () => tr("فوتر: عنّا وروابط", "Footer: about and links"), "⎽"],
      ["ready-scroll-video", () => say("فيديو بيمشي مع السكرول وفصول|Video that plays with the scroll, in chapters|וידאו שזז עם הגלילה, בפרקים"), "⏯"],
      ["ready-scroll-story", () => say("صورة ثابتة والبطاقات بتمر فوقها|Held picture with cards scrolling over|תמונה קבועה וכרטיסים שגוללים מעליה"), "▤"],
      ["ready-scroll-zoom", () => say("صورة بتقرّب وتغمق مع السكرول|Picture that zooms and darkens with the scroll|תמונה שמתקרבת ומתכהה בגלילה"), "⊕"],
      ["ready-cover", () => say("صورة بتثبت واللي بعدها بيغطيها|Picture that stays, then the next section covers it|תמונה שנשארת, והמקטע הבא מכסה אותה"), "⧉"],
      ["ready-portal", () => say("صورة من شبّاك بيكبر مع السكرول|Picture through a window that grows as you scroll|תמונה מבעד לחלון שגדל בגלילה"), "◯"],
      ["ready-orbit", () => say("حلقة بتلف مع السكرول|Ring that turns with the scroll|טבעת שמסתובבת בגלילה"), "↻"],
      ["ready-counters", () => say("أرقام بتعدّ مع السكرول|Numbers that count with the scroll|מספרים שסופרים בגלילה"), "#"],
      ["ready-paint", () => say("قسم بيلوّن الصفحة كلها|Section that colours the whole page|מקטע שצובע את כל הדף"), "◐"],
      ["ready-ring3d", () => say("حلقة كروت 3D بتلفّها بإيدك|3D ring of cards you turn by hand|טבעת קלפים בתלת ממד שמסובבים ביד"), "◎"],
      ["ready-book3d", () => say("كتاب بتقلب صفحاته|A book whose pages turn|ספר שדפיו מתהפכים"), "📖"],
      ["ready-phone3d", () => say("موبايل 3D بيلف مع السكرول|3D phone turning with the scroll|טלפון בתלת ממד שמסתובב בגלילה"), "▯"],
    ],
  },
  {
    key: "text",
    title: () => tr("كلام وأزرار", "Words and buttons"),
    kinds: [
      ["heading", () => typeLabel("heading"), "H"],
      ["text", () => typeLabel("text"), "¶"],
      ["button", () => typeLabel("button"), "⬭"],
    ],
  },
  {
    key: "media",
    title: () => tr("صور وفيديو", "Pictures and video"),
    kinds: [
      ["image", () => typeLabel("image"), "▣"],
      ["video", () => typeLabel("video"), "▶"],
      ["slider", () => typeLabel("slider"), "⇆"],
      ["showcase", () => typeLabel("showcase"), "▥"],
      ["filterGallery", () => typeLabel("filterGallery"), "▦"],
      ["deck", () => typeLabel("deck"), "▣"],
      ["scrollScene", () => typeLabel("scrollScene"), "⏯"],
      ["instrument", () => typeLabel("instrument"), "♫"],
      ["chart", () => typeLabel("chart"), "▤"],
      ["clock", () => typeLabel("clock"), "◷"],
    ],
  },
  {
    key: "shapes",
    title: () => tr("رسومات وزينة", "Drawings and decoration"),
    kinds: [
      ["svg", () => tr("رسمة أو شكل", "Drawing or shape"), "✿"],
      ["icon", () => typeLabel("icon"), "♥"],
      ["lottie", () => typeLabel("lottie"), "◎"],
      ["rive", () => typeLabel("rive"), "◈"],
      ["divider", () => typeLabel("divider"), "—"],
      ["spacer", () => typeLabel("spacer"), "↕"],
    ],
  },
  {
    key: "more",
    title: () => tr("3D والمتجر", "3D and the store"),
    kinds: [
      ["glScene", () => typeLabel("glScene"), "✨"],
      ["game", () => typeLabel("game"), "🎮"],
      ["model3d", () => typeLabel("model3d"), "◆"],
      ["product360", () => typeLabel("product360"), "⟳"],
      ["columns", () => typeLabel("columns"), "▥"],
      ["stack", () => tr("حاوية للعناصر", "Container for objects"), "▣"],
      ["products", () => typeLabel("products"), "▦"],
      ["storyBar", () => typeLabel("storyBar"), "◎"],
      ["scratchCard", () => typeLabel("scratchCard"), "🎟"],
      ["memoryGame", () => typeLabel("memoryGame"), "🃏"],
      ["giftCard", () => typeLabel("giftCard"), "🎁"],
      ["configurator", () => typeLabel("configurator"), "🎨"],
      ["bookingCalendar", () => typeLabel("bookingCalendar"), "📅"],
      ["categories", () => typeLabel("categories"), "▤"],
      ["form", () => typeLabel("form"), "✉"],
    ],
  },
  {
    key: "blocks",
    title: () => tr("بلوكات محتوى", "Content blocks"),
    kinds: [
      ["accordion", () => typeLabel("accordion"), "☰"],
      ["testimonials", () => typeLabel("testimonials"), "❝"],
      ["pricing", () => typeLabel("pricing"), "₪"],
      ["schedule", () => typeLabel("schedule"), "◷"],
      ["comparison", () => typeLabel("comparison"), "▤"],
      ["team", () => typeLabel("team"), "☺"],
      ["logos", () => typeLabel("logos"), "◎"],
      ["alert", () => typeLabel("alert"), "!"],
      ["marquee", () => typeLabel("marquee"), "⇢"],
    ],
  },
  {
    key: "interactive",
    title: () => tr("تفاعلية", "Interactive"),
    kinds: [
      ["tabs", () => typeLabel("tabs"), "▭"],
      ["countdown", () => typeLabel("countdown"), "⏱"],
      ["beforeAfter", () => typeLabel("beforeAfter"), "◧"],
      ["hotspots", () => typeLabel("hotspots"), "◉"],
      ["map", () => typeLabel("map"), "⌖"],
      ["popup", () => typeLabel("popup"), "▣"],
      ["search", () => typeLabel("search"), "⌕"],
      ["menu", () => typeLabel("menu"), "≡"],
      ["flipBox", () => typeLabel("flipBox"), "⟲"],
      ["headline", () => typeLabel("headline"), "✎"],
      ["toc", () => typeLabel("toc"), "☷"],
      ["share", () => typeLabel("share"), "⤴"],
      ["progress", () => typeLabel("progress"), "▬"],
    ],
  },
];

const WHERE: Array<[Where, () => string]> = [
  ["before", () => tr("قبله", "Before")],
  ["after", () => tr("بعده", "After")],
  ["inside", () => tr("جوّاه / فوقه", "Inside / over it")],
];

export function AddPanel({ where, canWhere, target, busy, can, onWhere, onAdd, onDragKind, onSplit, motionNode, motion, onMotion, onBrowse }: {
  where: Where;
  /** Which places are open for the selection. */
  canWhere: Record<Where, boolean>;
  /** What it's added next to ("Seasons", or "the end of the page"). */
  target: string;
  busy: boolean;
  /** Whether a kind can go where chosen. */
  can: (kind: AddKind) => boolean;
  onWhere: (w: Where) => void;
  onAdd: (kind: AddKind) => void;
  onDragKind: (kind: AddKind | null) => void;
  /** A new section with columns (`widths`). */
  onSplit: (widths: number[]) => void;
  /** What a motion goes on (the selected element, or a piece of a section), and its motion now. */
  motionNode: PageTreeNode | null;
  motion: Motion | undefined;
  onMotion: (p: MotionPreset) => void;
  /** Opens the theme library to browse (LibraryBrowser). */
  onBrowse?: () => void;
}) {
  const [q, setQ] = useState("");
  const find = q.trim().toLowerCase();
  const groups = GROUPS.map(g => ({ ...g, kinds: find ? g.kinds.filter(([k, name]) => name().toLowerCase().includes(find) || k.toLowerCase().includes(find) || g.title().toLowerCase().includes(find)) : g.kinds })).filter(g => g.kinds.length);
  // A search finds the theme library's pieces too (the first ones; the library shows them all).
  const libFound = find.length >= 2 ? libFilter(LIB_ITEMS, "all", "", find) : [];
  if (libFound.length) groups.unshift({ key: "library", title: () => say(`من المكتبة (${libFound.length})|From the library (${libFound.length})|מהספרייה (${libFound.length})`), kinds: libFound.slice(0, 16).map(i => [`lib:${i.id}` as LibKind, () => `${libName(i)} · ${say(LIB_KIND_NAME[i.kind] ?? i.kind)}`, i.kind === "site" ? "◈" : "❖"] as [AddKind, () => string, string]) });
  const sites = LIB_ITEMS.filter(i => i.kind === "site").length;
  return (
    <div className="space-y-4" data-testid="studio-add-panel">
      <div className="space-y-1.5 rounded-xl border border-white/8 p-2">
        <div className="text-[11px] text-white/50">
          {tr("بينضاف", "Adds")} <span className="text-white/80">{target}</span>
        </div>
        <div className="flex gap-1" role="group" aria-label={tr("مكان الإضافة", "Where it's added")} data-testid="studio-add-where">
          {WHERE.map(([w, name]) => (
            <button
              key={w}
              type="button"
              disabled={!canWhere[w]}
              aria-pressed={where === w}
              onClick={() => onWhere(w)}
              className={`flex-1 rounded-lg px-1.5 py-1 text-[11px] disabled:opacity-30 ${where === w ? "bg-accent-500/30 text-white" : "bg-white/6 text-white/70 hover:bg-white/10"}`}
              data-where={w}
            >
              {name()}
            </button>
          ))}
        </div>
        <p className="text-[10px] leading-4 text-white/35">{tr("كبسة بتضيف هون، أو اسحب لأي مكان بالصفحة: بين قسمين، لجوّا خلية، أو فوق قسم.", "Click to add here, or drag anywhere on the page: between two sections, into a cell, or over a section.")}</p>
      </div>

      {onBrowse ? (
        <button type="button" disabled={busy} onClick={onBrowse} className="flex w-full items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-linear-to-r from-fuchsia-500/15 to-cyan-500/10 px-3 py-2.5 text-start text-xs text-white hover:from-fuchsia-500/25 disabled:opacity-40" data-testid="studio-lib-browse">
          <span className="text-base" aria-hidden="true">◈</span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{say("مكتبة الثيمات|The theme library|ספריית העיצובים")}</span>
            <span className="block text-[10px] text-white/55">{say(`${sites} موقع كامل و${LIB_ITEMS.length - sites} قسم، كلامها وألوانها إلك|${sites} whole websites and ${LIB_ITEMS.length - sites} sections, their words and colours yours|${sites} אתרים שלמים ו-${LIB_ITEMS.length - sites} מקטעים, המילים והצבעים שלך`)}</span>
          </span>
        </button>
      ) : null}

      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("دوّر على قسم أو عنصر…", "Find a section or element…")} aria-label={tr("دوّر على قسم أو عنصر", "Find a section or element")} className="w-full rounded-lg border border-white/10 bg-surface-925 px-2.5 py-1.5 text-xs text-white placeholder:text-white/35" data-testid="studio-add-search" />
      {find && !groups.length ? <p className="text-[11px] text-white/45">{tr("ما في نتائج.", "No results.")}</p> : null}

      {groups.map((g) => (
        <section key={g.key} className="space-y-1.5" aria-label={g.title()}>
          <h3 className="text-[11px] font-medium text-white/60">{g.title()}</h3>
          <div className="grid grid-cols-2 gap-1">
            {g.kinds.map(([k, name, mark]) => {
              const ok = !busy && can(k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={!ok}
                  draggable={!busy}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", k);
                    e.dataTransfer.effectAllowed = "copy";
                    onDragKind(k);
                  }}
                  onDragEnd={() => onDragKind(null)}
                  onClick={() => onAdd(k)}
                  className="flex cursor-grab items-center gap-1.5 truncate rounded-lg border border-white/8 px-2 py-2 text-start text-[11px] text-white/80 hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-35"
                  data-testid="studio-add-item"
                  data-kind={k}
                  title={name()}
                >
                  <span className="w-4 shrink-0 text-center text-white/45" aria-hidden="true">{mark}</span>
                  <span className="truncate">{name()}</span>
                </button>
              );
            })}
          </div>
          {g.key === "ready" ? (
            <div className="space-y-1 pt-1">
              <div className="text-[10px] text-white/40">{tr("قسم بأعمدة", "A section with columns")}</div>
              <SplitPicker busy={busy || !can("section")} onPick={onSplit} testId="studio-add-split" />
            </div>
          ) : null}
        </section>
      ))}

      <section className="space-y-1.5" aria-label={tr("حركة", "Motion")} data-testid="studio-add-motion">
        <h3 className="text-[11px] font-medium text-white/60">{tr("حركة للمحدد", "Motion for the selection")}</h3>
        {motionNode ? (
          <div className="grid grid-cols-2 gap-1">
            {presetsFor(motionNode.type, motionNode).map((p) => {
              const on = hasPreset(motion, p);
              return (
                <button key={p.key} type="button" disabled={busy} aria-pressed={on} onClick={() => onMotion(p)} className={`truncate rounded-lg border px-2 py-1.5 text-start text-[11px] ${on ? "border-accent-400/70 bg-accent-500/15 text-white" : "border-white/8 text-white/75 hover:bg-white/5"} disabled:opacity-40`} data-preset={p.key} title={p.label()}>
                  {p.label()}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] leading-5 text-white/40">{tr("اختار عنصر بالصفحة لتعطيه حركة.", "Select something on the page to give it motion.")}</p>
        )}
      </section>
    </div>
  );
}
