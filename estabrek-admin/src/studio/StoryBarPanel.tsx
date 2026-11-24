/**
 * The page editor's «شريط القصص» (the shop's StoryBar): how its circles look, how big, their names under them or not,
 * and which of the store's stories it shows (all the live ones in the owner's order, or some picked here). The stories
 * themselves are made on their own page (admin → القصص). One change = one step back with undo.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import * as StoriesAPI from "../api/stories.api";
import type { Lang } from "../lib/lang";
import { say } from "./say";
import { Field } from "./StudioPanels";
import { Choice } from "./StudioTreePanels";

type Ops = (label: string, ops: PageDraftOp[]) => void;
type Item = Record<string, unknown>;
const chip = (on: boolean) => `rounded-lg px-2 py-1 text-xs ${on ? "bg-accent-500/30 text-white" : "bg-white/6 text-white/75 hover:bg-white/10"} disabled:opacity-40`;
const wordsOf = (t: unknown, lang: Lang) => (t && typeof t === "object" ? String((t as Record<string, string>)[lang] ?? "") : "");

export function StoryBarPanel({ node, lang, busy, onOps }: { node: PageTreeNode; lang: Lang; busy: boolean; onOps: Ops }) {
  const p = (node.props ?? {}) as Item;
  const set = (label: string, patch: Item) => onOps(label, [{ op: "setProps", nodeId: node.id, props: { ...p, ...patch } }]);
  const stories = useQuery({ queryKey: ["stories"], queryFn: StoriesAPI.listStories, staleTime: 30_000 });
  const picked = (Array.isArray(p.reels) ? p.reels : []) as string[];
  const reels = stories.data?.reels ?? [];
  const nameOf = (r: StoriesAPI.StoryReel) => r.title[lang as "ar"] || r.title.ar || r.title.en || r.title.he || say("بلا اسم|Unnamed|ללא שם");
  const toggle = (id: string) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : reels.map((r) => r.id).filter((x) => x === id || picked.includes(x));
    set(say("أي قصص|Which stories|אילו סטוריז"), { reels: next.length ? next : undefined });
  };
  return (
    <div className="space-y-2.5" data-testid="studio-story-bar">
      <Choice label={say("الشكل|Look|מראה")} value={String(p.look ?? "circles")} busy={busy} testId="block-look"
        options={[["circles", say("دواير|Circles|עיגולים")], ["rounded", say("مربعات ناعمة|Soft squares|ריבועים רכים")], ["cards", say("كروت طويلة|Tall cards|כרטיסים גבוהים")]]}
        onPick={(v) => set(say("الشكل|Look|מראה"), { look: v })} />
      <Choice label={say("الحجم|Size|גודל")} value={String(p.size ?? "m")} busy={busy} testId="block-size"
        options={[["s", say("صغير|Small|קטן")], ["m", say("وسط|Medium|בינוני")], ["l", say("كبير|Large|גדול")]]}
        onPick={(v) => set(say("الحجم|Size|גודל"), { size: v })} />
      <label className="flex items-center justify-between gap-2 text-xs">
        <span className="text-white/75">{say("الأسماء تحت الدواير|Names under the circles|שמות מתחת לעיגולים")}</span>
        <input type="checkbox" disabled={busy} checked={p.names !== false} onChange={(e) => set(say("الأسماء|Names|שמות"), { names: e.target.checked ? undefined : false })} data-testid="block-names" />
      </label>
      <Field label={say("اسمه لقارئ الشاشة (فاضي = قصص)|Its name for screen readers (empty = Stories)|השם לקורא מסך (ריק = סטוריז)")} value={wordsOf(p.label, lang)}
        onSave={(v) => { const out = { ...((p.label as Record<string, string>) ?? {}) }; if (v.trim()) out[lang] = v.slice(0, 80); else delete out[lang]; set(say("الاسم|Name|שם"), { label: out }); }} />
      <div className="text-[11px] text-white/55">{say("أي قصص بيبيّن|Which stories it shows|אילו סטוריז מוצגים")}</div>
      {stories.isLoading ? <p className="text-[11px] text-white/40">…</p> : !reels.length ? (
        <p className="text-[11px] leading-4 text-white/45">{say("لسا ما في قصص.|No stories yet.|עדיין אין סטוריז.")}</p>
      ) : (
        <div className="flex flex-wrap gap-1" data-testid="story-bar-reels">
          <button type="button" className={chip(!picked.length)} aria-pressed={!picked.length} disabled={busy} onClick={() => set(say("أي قصص|Which stories|אילו סטוריז"), { reels: undefined })}>{say("كلهن|All|כולם")}</button>
          {reels.map((r) => <button key={r.id} type="button" className={chip(picked.includes(r.id))} aria-pressed={picked.includes(r.id)} disabled={busy} onClick={() => toggle(r.id)} data-value={r.id}>{nameOf(r)}</button>)}
        </div>
      )}
      <Link to="/admin/stories" className="inline-block text-[11px] text-accent-300 underline">{say("اعملي وعدّلي القصص ←|Make and change the stories →|ליצור ולערוך סטוריז ←")}</Link>
    </div>
  );
}
