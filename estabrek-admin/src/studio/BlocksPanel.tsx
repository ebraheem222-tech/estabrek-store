/**
 * Saved blocks in the page editor (backend lib/pageBlocks.ts): a section saved once and
 * used on many pages, either linked (it shows the block as published, so changing the
 * block changes every page) or as a copy of its own. A block is edited like a page.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBlocks, type BlockInfo, type PageTreeNode } from "../api/pages.api";
import { tr } from "../lib/words";

const box = "space-y-2 rounded-xl border border-white/[0.08] p-3";
const btn = "rounded-lg bg-white/[0.06] px-2 py-1 text-xs hover:bg-white/[0.1] disabled:opacity-40";
const control = "w-full rounded-lg border border-white/[0.1] bg-surface-925 px-2 py-1.5 text-xs text-white";

export const useBlocks = () => useQuery({ queryKey: ["page-blocks"], queryFn: listBlocks, staleTime: 30_000 });
const usesLabel = (n: number) => (n === 1 ? tr("مربوط بصفحة وحدة", "Linked on one page") : tr(`مربوط بـ ${n} صفحات`, "Linked on {0} pages", [n]));

/** Saving a page's section as a block, linked here (the section becomes the link) or not. */
export function SaveBlockPanel({ node, busy, onSave }: { node: PageTreeNode; busy: boolean; onSave: (name: string, link: boolean) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(node.name ?? "");
  const [link, setLink] = useState(true);
  const [saving, setSaving] = useState(false);
  if (!open) {
    return (
      <button type="button" className={`${btn} w-full`} disabled={busy} onClick={() => setOpen(true)} data-testid="studio-block-save-open">
        ⧉ {tr("احفظه كبلوك (لصفحات تانية)", "Save it as a block (for other pages)")}
      </button>
    );
  }
  return (
    <form
      className={box}
      data-testid="studio-block-save"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
          await onSave(name.trim(), link);
          setOpen(false);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="text-xs font-medium text-white/70">{tr("بلوك محفوظ", "Saved block")}</div>
      <input autoFocus className={control} placeholder={tr("اسمه (مثلاً: عرض الأسبوع)", "Its name (e.g. Weekly offer)")} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} data-testid="studio-block-name" />
      <label className="flex items-start gap-2 text-[11px] leading-5 text-white/65">
        <input type="checkbox" className="mt-1" checked={link} onChange={(e) => setLink(e.target.checked)} data-testid="studio-block-link" />
        <span>{tr("خلّي هالقسم مربوط فيه: لما يتعدّل البلوك بيتعدّل هون كمان.", "Link this section to it: when the block changes, it changes here too.")}</span>
      </label>
      <div className="flex gap-1">
        <button type="submit" className="rounded-lg bg-accent-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-40" disabled={busy || saving || !name.trim()} data-testid="studio-block-save-go">{tr("احفظ", "Save")}</button>
        <button type="button" className={btn} onClick={() => setOpen(false)}>{tr("إلغاء", "Cancel")}</button>
      </div>
    </form>
  );
}

/** A linked block on the page: which block, where else it shows, and editing, unlinking or removing it. */
export function BlockLinkPanel({ node, busy, onEdit, onUnlink }: { node: PageTreeNode; busy: boolean; onEdit: (blockId: string) => void; onUnlink: () => void }) {
  const blocks = useBlocks();
  const blockId = String(node.props?.blockId ?? "");
  const info = blocks.data?.find((b) => b.id === blockId);
  return (
    <div className={box} data-testid="studio-block-link-panel" data-block={blockId}>
      <div className="text-xs font-medium text-white/70">{tr("بلوك محفوظ مربوط", "A linked saved block")}</div>
      {info ? (
        <>
          <div className="text-sm font-semibold">{info.name}</div>
          <p className="text-[11px] text-white/45">{usesLabel(info.uses)}</p>
        </>
      ) : blocks.isSuccess ? (
        <p className="text-[11px] text-amber-200/80">{tr("البلوك انحذف: هالمكان ما بيبيّن فيه إشي.", "The block was deleted: nothing shows here.")}</p>
      ) : null}
      <p className="text-[11px] leading-5 text-white/40">{tr("هون بيبيّن البلوك متل ما هو منشور. لتغييره عدّل البلوك نفسه، أو فكّ الربط لتعدّل نسخة لهالصفحة بس.", "The block shows here as published. To change it, edit the block itself, or unlink it to change a copy for this page only.")}</p>
      <div className="flex flex-wrap gap-1">
        {info ? <button type="button" className="rounded-lg bg-accent-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-40" disabled={busy} onClick={() => onEdit(blockId)} data-testid="studio-block-edit">{tr("عدّل البلوك", "Edit the block")}</button> : null}
        {info ? <button type="button" className={btn} disabled={busy} onClick={onUnlink} data-testid="studio-block-unlink">{tr("فكّ الربط (نسخة لهون)", "Unlink (a copy for here)")}</button> : null}
      </div>
    </div>
  );
}

/** The Add panel's saved blocks: each as a copy or linked, and deleting one. */
export function MyBlocks({ busy, onCopy, onLink, onDelete }: { busy: boolean; onCopy: (b: BlockInfo) => void; onLink: (b: BlockInfo) => void; onDelete: (b: BlockInfo) => void }) {
  const blocks = useBlocks();
  return (
    <section className="space-y-1.5" data-testid="studio-my-blocks">
      <h3 className="px-1 text-[11px] font-medium text-white/60">{tr("بلوكاتي المحفوظة", "My saved blocks")}</h3>
      {blocks.isError ? <p className="px-1 text-[11px] text-red-300">{tr("ما قدرنا نجيب البلوكات.", "Couldn't load the blocks.")}</p> : null}
      {blocks.isSuccess && !blocks.data.length ? <p className="px-1 text-[11px] leading-5 text-white/40">{tr("لسا ما في. اختار قسم واحفظه كبلوك من لوحته.", "None yet. Select a section and save it as a block from its panel.")}</p> : null}
      {(blocks.data ?? []).map((b) => (
        <div key={b.id} className="rounded-lg border border-white/[0.08] p-2" data-testid="studio-my-block" data-block={b.id}>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-white/85">{b.name}</span>
            <button type="button" className="text-[11px] text-red-300 hover:underline disabled:opacity-40" disabled={busy} onClick={() => onDelete(b)} aria-label={tr("احذف البلوك", "Delete the block")}>×</button>
          </div>
          <div className="mt-0.5 text-[10px] text-white/35">{b.uses ? usesLabel(b.uses) : tr("مش مربوط بأي صفحة", "Not linked on any page")}</div>
          <div className="mt-1.5 flex gap-1">
            <button type="button" className={btn} disabled={busy} onClick={() => onLink(b)} data-testid="studio-my-block-link" title={tr("بيضل متل البلوك", "Stays like the block")}>+ {tr("مربوط", "Linked")}</button>
            <button type="button" className={btn} disabled={busy} onClick={() => onCopy(b)} data-testid="studio-my-block-copy" title={tr("نسخة بتتعدّل لحالها", "A copy changed on its own")}>+ {tr("نسخة", "Copy")}</button>
          </div>
        </div>
      ))}
    </section>
  );
}
