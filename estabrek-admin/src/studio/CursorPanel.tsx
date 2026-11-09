/**
 * The page's own cursor (a dot, a ring, or one that turns what's under it around, its colour and size;
 * the shop draws it: pageTree/TreePage.tsx), and an element's words for it ("See", "Open"…), shown in
 * the cursor while the mouse is over that element.
 */
import { useEffect, useState } from "react";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { Range } from "./LookPanels";
import { ColourPick } from "./StudioTreePanels";
import { say } from "./say";

export type CursorKind = "dot" | "ring" | "blend";
export type PageCursor = { kind: CursorKind; color?: string; size?: number };
type Ops = (label: string, ops: PageDraftOp[]) => void;

export const CURSOR_KINDS: Array<[CursorKind | "none", () => string]> = [
  ["none", () => say("عادي|Normal|רגיל")],
  ["dot", () => say("نقطة|Dot|נקודה")],
  ["ring", () => say("حلقة|Ring|טבעת")],
  ["blend", () => say("بيقلب الألوان|Inverts colours|הופך צבעים")],
];

/** The page's cursor, or null when it has the normal one. */
export function cursorOfPage(root: PageTreeNode): PageCursor | null {
  const c = root.props?.cursor as Record<string, unknown> | undefined;
  if (!c || !["dot", "ring", "blend"].includes(String(c.kind))) return null;
  return { kind: c.kind as CursorKind, ...(typeof c.color === "string" ? { color: c.color } : {}), ...(typeof c.size === "number" ? { size: c.size } : {}) };
}
export const cursorOp = (root: PageTreeNode, cursor: PageCursor | null): PageDraftOp => ({ op: "setProps", nodeId: root.id, props: { cursor } });

export function PageCursorPanel({ root, busy, onOps }: { root: PageTreeNode; busy: boolean; onOps: Ops }) {
  const cursor = cursorOfPage(root);
  const save = (next: PageCursor | null) => onOps(say("مؤشر الصفحة|Page cursor|סמן הדף"), [cursorOp(root, next)]);
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] p-3" data-testid="studio-page-cursor">
      <div className="text-xs text-white/75">
        {say("مؤشر الماوس للصفحة|The page's mouse cursor|סמן העכבר של הדף")}
        <span className="block text-[10px] text-white/40">{say("بيلحق الماوس بنعومة، وبيكبر فوق الروابط، وبيكتب كلمة العنصر إذا إلها. مش للمس.|Follows the mouse softly, grows over links, and shows an element's word when it has one. Not for touch.|עוקב אחרי העכבר ברכות, גדל מעל קישורים ומציג מילה של אלמנט. לא למגע.")}</span>
      </div>
      <div role="group" aria-label={say("نوع المؤشر|Cursor kind|סוג הסמן")} className="grid grid-cols-4 gap-1">
        {CURSOR_KINDS.map(([k, label]) => (
          <button key={k} type="button" disabled={busy} aria-pressed={(cursor?.kind ?? "none") === k} data-cursor-kind={k} onClick={() => save(k === "none" ? null : { ...(cursor ?? {}), kind: k })} className={`rounded-lg px-1 py-1.5 text-center text-[10px] ${(cursor?.kind ?? "none") === k ? "bg-accent-500/30 text-white ring-1 ring-accent-400" : "bg-white/[0.05] text-white/70 hover:bg-white/[0.1]"} disabled:opacity-40`}>
            {label()}
          </button>
        ))}
      </div>
      {cursor ? (
        <>
          {cursor.kind !== "blend" ? <ColourPick label={say("لونه (فاضي = لون المتجر)|Its colour (empty = the store's)|הצבע (ריק = של החנות)")} value={cursor.color ?? ""} busy={busy} onPick={(color) => save({ ...cursor, color: color ?? undefined })} testId="studio-cursor-color" /> : null}
          <Range label={say("حجمه|Its size|הגודל")} min={8} max={60} step={1} unit="px" busy={busy} value={cursor.size ?? 14} onSave={(size) => save({ ...cursor, size })} testId="studio-cursor-size" />
        </>
      ) : null}
    </div>
  );
}

/** An element's word for the page's cursor, in the language being edited. */
export function CursorTextPanel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const words = (node.props?.cursorText ?? {}) as Record<string, string>;
  const [text, setText] = useState(words[lang] ?? "");
  useEffect(() => setText(words[lang] ?? ""), [node.id, lang, words[lang]]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    const v = text.trim().slice(0, 24);
    if (v === (words[lang] ?? "")) return;
    const next = { ...words };
    if (v) next[lang] = v;
    else delete next[lang];
    onOps(say("كلمة المؤشر|Cursor word|מילת הסמן"), [{ op: "setProps", nodeId: node.id, props: { ...node.props, cursorText: Object.keys(next).length ? next : undefined } }]);
  };
  return (
    <label className="block space-y-1 rounded-xl border border-white/[0.08] p-3 text-xs text-white/75" data-testid="studio-cursor-text">
      <span>{say("كلمة بالمؤشر لما الماوس فوقه|A word in the cursor while the mouse is over it|מילה בסמן כשהעכבר מעליו")}</span>
      <input type="text" value={text} maxLength={24} disabled={busy} onChange={(e) => setText(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} placeholder={say("مثلاً: شوف، افتح، تسوّق|e.g. See, Open, Shop|למשל: צפה, פתח")} className="w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2.5 py-1.5 text-xs text-white placeholder:text-white/35" />
      <span className="block text-[10px] text-white/35">{say("بيبيّن بس إذا الصفحة إلها مؤشر (من إعدادات الصفحة).|Shown only when the page has a cursor (in the page's settings).|מוצג רק כשלדף יש סמן (בהגדרות הדף).")}</span>
    </label>
  );
}
