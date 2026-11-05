import type { PageDraft, PageDraftOp } from "../api/pages.api";
import { undoOf, type History, type Lang } from "./draft";

export type HistoryDirection = "undo" | "redo";

/** The draft endpoint allows 50 operations per request. Preserve revision ordering. */
export async function sendDraftBatches(
  ops: PageDraftOp[],
  draft: PageDraft,
  send: (ops: PageDraftOp[], rev?: number) => Promise<PageDraft>,
  onApplied?: (draft: PageDraft, applied: PageDraftOp[]) => void,
): Promise<PageDraft> {
  let current = draft;
  for (let offset = 0; offset < ops.length; offset += 50) {
    const chunk = ops.slice(offset, offset + 50);
    current = await send(chunk, current.rev || undefined);
    onApplied?.(current, chunk);
  }
  return current;
}

/**
 * Run inside the editor's change queue. History moves only after server responses;
 * if a later batch fails, both the saved prefix and remaining work stay navigable.
 */
export async function travelDraftHistory(
  history: History,
  direction: HistoryDirection,
  draft: PageDraft,
  main: Lang,
  send: (ops: PageDraftOp[], rev?: number) => Promise<PageDraft>,
  onApplied?: (draft: PageDraft, applied: PageDraftOp[]) => void,
): Promise<PageDraft | null> {
  const source = direction === "undo" ? history.done : history.undone;
  const destination = direction === "undo" ? history.undone : history.done;
  const entry = source.at(-1);
  if (!entry) return null;
  const ops = direction === "undo" ? entry.undo : entry.ops;
  const applied: PageDraftOp[] = [];
  let current = draft;
  try {
    return await sendDraftBatches(ops, draft, send, (next, chunk) => {
      current = next;
      applied.push(...chunk);
      onApplied?.(next, chunk);
    });
  } finally {
    if (applied.length === ops.length) {
      source.pop();
      destination.push(entry);
    } else if (applied.length) {
      const remaining = ops.slice(applied.length);
      const reverseApplied = undoOf(applied, draft, main);
      const reverseRemaining = undoOf(remaining, current, main);
      source.pop();
      source.push(direction === "undo"
        ? { label: entry.label, ops: reverseRemaining, undo: remaining }
        : { label: entry.label, ops: remaining, undo: reverseRemaining });
      destination.push(direction === "undo"
        ? { label: entry.label, ops: reverseApplied, undo: applied }
        : { label: entry.label, ops: applied, undo: reverseApplied });
    }
  }
}
