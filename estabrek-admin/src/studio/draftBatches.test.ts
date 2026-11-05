import { describe, expect, it, vi } from "vitest";
import type { PageDraft, PageDraftOp } from "../api/pages.api";
import { History, simulate, undoOf } from "./draft";
import { travelDraftHistory } from "./draftBatches";

const original = (): PageDraft => ({ version: 1, rev: 1, baseHash: "x", sections: [], trash: [], startedAt: "", updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: Array.from({ length: 121 }, (_, i) => ({ id: `h${i}`, type: "heading", props: { text: { en: `Heading ${i}` } } })) } } });
const setup = () => {
  const before = original();
  const ops: PageDraftOp[] = before.tree.root.children!.map((node) => ({ op: "setMotion", nodeId: node.id, motion: { engine: "anime", enter: { kind: "up" } } }));
  const entry = { label: "Page motion", ops, undo: undoOf(ops, before, "en") };
  const history = new History();
  history.push(entry);
  return { before, after: ops.reduce(simulate, before), entry, history };
};

function server(initial: PageDraft, failAt = 0) {
  let current = initial;
  const send = vi.fn(async (ops: PageDraftOp[], rev?: number) => {
    expect(rev).toBe(current.rev);
    expect(ops.length).toBeLessThanOrEqual(50);
    if (send.mock.calls.length === failAt) throw new Error("Connection lost");
    current = { ...ops.reduce(simulate, current), rev: current.rev + 1 };
    return current;
  });
  return { send, now: () => current };
}

describe("batched draft history", () => {
  it("keeps one history entry for complete undo and redo", async () => {
    const { before, after, entry, history } = setup();
    const api = server(after);
    await travelDraftHistory(history, "undo", api.now(), "en", api.send, () => {
      // A queued subsequent history action must see this entry only after it settles.
      expect(history.done).toEqual([entry]);
      expect(history.undone).toEqual([]);
    });
    expect(api.now().tree).toEqual(before.tree);
    expect(history.done).toEqual([]);
    expect(history.undone).toEqual([entry]);
    await travelDraftHistory(history, "redo", api.now(), "en", api.send);
    expect(api.now().tree).toEqual(after.tree);
    expect(history.done).toEqual([entry]);
    expect(history.undone).toEqual([]);
  });

  it("retains the remaining undo and completed prefix after a partial undo failure", async () => {
    const { before, after, history } = setup();
    const failed = server(after, 2);
    await expect(travelDraftHistory(history, "undo", failed.now(), "en", failed.send)).rejects.toThrow("Connection lost");
    expect(history.done).toHaveLength(1);
    expect(history.done[0].undo).toHaveLength(71);
    expect(history.undone).toHaveLength(1);
    expect(history.undone[0].ops).toHaveLength(50);

    const api = server(failed.now());
    await travelDraftHistory(history, "undo", api.now(), "en", api.send);
    expect(api.now().tree).toEqual(before.tree);
    expect(history.done).toEqual([]);
    expect(history.undone).toHaveLength(2);
    await travelDraftHistory(history, "redo", api.now(), "en", api.send);
    await travelDraftHistory(history, "redo", api.now(), "en", api.send);
    expect(api.now().tree).toEqual(after.tree);
    expect(history.undone).toEqual([]);
  });

  it("retains the remaining redo and can undo just the saved prefix after a partial redo failure", async () => {
    const { before, after, history } = setup();
    const undoApi = server(after);
    await travelDraftHistory(history, "undo", undoApi.now(), "en", undoApi.send);
    const failed = server(undoApi.now(), 2);
    await expect(travelDraftHistory(history, "redo", failed.now(), "en", failed.send)).rejects.toThrow("Connection lost");
    expect(history.done).toHaveLength(1);
    expect(history.done[0].undo).toHaveLength(50);
    expect(history.undone).toHaveLength(1);
    expect(history.undone[0].ops).toHaveLength(71);

    const api = server(failed.now());
    await travelDraftHistory(history, "undo", api.now(), "en", api.send);
    expect(api.now().tree).toEqual(before.tree);
    await travelDraftHistory(history, "redo", api.now(), "en", api.send);
    await travelDraftHistory(history, "redo", api.now(), "en", api.send);
    expect(api.now().tree).toEqual(after.tree);
    expect(history.undone).toEqual([]);
  });

  it("leaves the original entry available when no batch was saved", async () => {
    const { after, entry, history } = setup();
    const failed = server(after, 1);
    await expect(travelDraftHistory(history, "undo", failed.now(), "en", failed.send)).rejects.toThrow("Connection lost");
    expect(history.done).toEqual([entry]);
    expect(history.undone).toEqual([]);
    expect(failed.now().tree).toEqual(after.tree);
  });
});
