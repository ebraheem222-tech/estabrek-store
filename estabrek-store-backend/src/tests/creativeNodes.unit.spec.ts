import { expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
const tree = (type: string, props: Record<string, unknown>, style?: unknown) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [{ id: "creative", type, props, style }] }] } });

test("instruments keep silent defaults and complete playable settings", () => {
  for (const kind of ["piano", "guitar"]) expect(checkTree(tree("instrument", { kind, sound: false, volume: .25, octave: 4, octaves: 2, frets: 8, sustain: .8, waveform: "triangle", theme: "dark", showNotes: true, melody: "arpeggio", tempo: 100, repeat: false })).ok).toBe(true);
  for (const patch of [{ kind: "script" }, { volume: 1.1 }, { octave: 7 }, { frets: 20 }, { tempo: 300 }, { sustain: 0 }, { waveform: "custom" }]) expect(checkTree(tree("instrument", { kind: "piano", ...patch })).ok).toBe(false);
});

test("manual charts and live clocks validate their actual inputs", () => {
  for (const kind of ["bar", "line", "donut"]) expect(checkTree(tree("chart", { kind, items: [{ label: { en: "January" }, value: 25, color: "accent" }], showValues: true })).ok).toBe(true);
  expect(checkTree(tree("chart", { kind: "line", items: [{ label: { en: "Invalid" }, value: -1 }] })).ok).toBe(false);
  expect(checkTree(tree("chart", { kind: "line", items: [{ label: { en: "Invalid" }, value: Infinity }] })).ok).toBe(false);
  expect(checkTree(tree("clock", { timezone: "Asia/Jerusalem", format: "24", seconds: true, date: true })).ok).toBe(true);
  expect(checkTree(tree("clock", { timezone: "not-a-timezone" })).ok).toBe(false);
});

test("the chart's new kinds (plan 3.7) keep to their inputs: groups, flows, cities, a table counted", () => {
  const items = [{ label: { en: "Search" }, value: 40, group: { en: "Visits" }, to: { en: "Pricing" }, city: "dubai" }];
  for (const kind of ["sunburst", "sankey", "flights", "bars3d"]) expect(checkTree(tree("chart", { kind, items, unit: { en: "k" }, hub: "amman" })).ok, kind).toBe(true);
  expect(checkTree(tree("chart", { kind: "live", items: [{ label: { en: "-" }, value: 0 }], table: "signups", every: "minute", last: 30 })).ok).toBe(true);
  // 40 items at most; a city is a key, never a place written out; a table its address; 6 to 60 back.
  expect(checkTree(tree("chart", { kind: "bars3d", items: Array.from({ length: 40 }, (_, i) => ({ label: { en: `${i}` }, value: i })) })).ok).toBe(true);
  expect(checkTree(tree("chart", { kind: "bars3d", items: Array.from({ length: 41 }, (_, i) => ({ label: { en: `${i}` }, value: i })) })).ok).toBe(false);
  expect(checkTree(tree("chart", { kind: "flights", hub: "Amman <b>", items })).ok).toBe(false);
  expect(checkTree(tree("chart", { kind: "flights", hub: "amman", items: [{ label: { en: "x" }, value: 1, city: "../x" }] })).ok).toBe(false);
  expect(checkTree(tree("chart", { kind: "live", items, table: "Sign Ups" })).ok).toBe(false);
  expect(checkTree(tree("chart", { kind: "live", items, table: "signups", every: "week" })).ok).toBe(false);
  expect(checkTree(tree("chart", { kind: "live", items, table: "signups", last: 61 })).ok).toBe(false);
  expect(checkTree(tree("chart", { kind: "pie3d", items })).ok).toBe(false);
});

test("sticky position is bounded and can be disabled for a smaller screen", () => {
  expect(checkTree(tree("text", { text: { en: "Sticky details" } }, { base: { sticky: { top: 48 } }, mobile: { sticky: false } })).ok).toBe(true);
  expect(checkTree(tree("text", { text: { en: "Invalid" } }, { base: { sticky: { top: -1 } } })).ok).toBe(false);
});
