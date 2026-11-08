import { afterEach, expect, test, vi } from "vitest";
import { candidateStack, cycleCandidate, PointSelection } from "./selectionPicking";
import { indexTree } from "./treeIndex";
const index = indexTree({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "shop", type: "shop", props: {} }, { id: "cover", type: "image", props: {} }] } });
const box = { x: 0, y: 0, w: 100, h: 100 };
const shapes = [{ id: "shop", parentId: "page", depth: 1, box }, { id: "detail:n:shop:~div.1", parentId: "shop", depth: 2, box }, { id: "cover", parentId: "page", depth: 1, box }];
const up = new Map([[shapes[1].id, "shop"]]);
afterEach(() => vi.useRealTimers());
test("paint order wins over depth, while the chooser retains covered objects", () => {
  expect(candidateStack(shapes, { x: 50, y: 50 }, ["cover", "shop"], index, up, new Set(), true)).toEqual(["cover", "shop", shapes[1].id]);
});
test("locking an owner excludes every detail, and whole-widget mode excludes new parts", () => {
  expect(candidateStack(shapes, { x: 50, y: 50 }, [shapes[1].id, "cover"], index, up, new Set(["shop"]), true)).toEqual(["cover"]);
  expect(candidateStack(shapes, { x: 50, y: 50 }, [shapes[1].id, "shop"], index, up, new Set(), false)).toEqual(["shop", "cover"]);
  expect(cycleCandidate(["top", "inner", "owner"], "top")).toBe("inner");
  expect(cycleCandidate(["top", "inner", "owner"], "owner")).toBe("top");
});
test("late iframe replies cannot replace a newer selection, and old frames fall back", () => {
  vi.useFakeTimers(); const picked: string[][] = [];
  const gate = new PointSelection();
  const first = gate.request(["old"], ids => picked.push(ids));
  const next = gate.request(["fallback"], ids => picked.push(ids));
  expect(gate.resolve(first, ["stale"])).toBe(false);
  expect(gate.resolve(next, ["actual"])).toBe(true);
  vi.runAllTimers(); expect(picked).toEqual([["actual"]]);
  gate.request(["fallback"], ids => picked.push(ids)); vi.runAllTimers(); expect(picked.at(-1)).toEqual(["fallback"]);
});
