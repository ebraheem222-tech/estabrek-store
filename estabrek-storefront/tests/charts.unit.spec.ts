import { expect, test } from "@playwright/test";
import { CITIES, cityName, isLand, isoGrid, kmBetween, liveSeries, mapFrame, onMap, sankeyLayout, sunGroups, sunSlices, TAU, type ChartItem } from "../src/pageTree/chartMaths";

// Plan 3.7: the chart's new kinds, their maths (ChartKinds.tsx draws them).
const item = (label: string, value: number, more: Partial<ChartItem> = {}): ChartItem => ({ label, value, color: null, group: "", to: "", city: "", ...more });

test("sunburst: groups in the order they come, each the sum of its items; a group opened fills the circle", () => {
  const items = [item("VMs", 40, { group: "Compute" }), item("Disks", 20, { group: "Storage" }), item("Functions", 10, { group: "Compute" }), item("Support", 30)];
  const groups = sunGroups(items);
  expect(groups.map((g) => [g.name, g.value, g.items.length])).toEqual([["Compute", 50, 2], ["Storage", 20, 1], ["Support", 30, 0]]);
  const whole = sunSlices(groups, -1);
  const inner = whole.filter((s) => !s.key.includes("."));
  expect(inner.at(-1)!.a1).toBeCloseTo(TAU);
  expect(inner[0].a1).toBeCloseTo(TAU / 2);
  // The outer ring of a group spans exactly its inner slice.
  const compute = whole.filter((s) => s.key.startsWith("0."));
  expect(compute[0].a0).toBeCloseTo(0);
  expect(compute.at(-1)!.a1).toBeCloseTo(inner[0].a1);
  const open = sunSlices(groups, 0);
  expect(open.map((s) => s.label)).toEqual(["VMs", "Functions"]);
  expect(open.at(-1)!.a1).toBeCloseTo(TAU);
});

test("sankey: columns by the longest way from a start, one scale for all, a circle left out", () => {
  const { nodes, links, dropped } = sankeyLayout([
    item("Search", 60, { to: "Pricing" }), item("Social", 40, { to: "Pricing" }), item("Search", 20, { to: "Blog" }),
    item("Pricing", 30, { to: "Trial" }), item("Pricing", 70, { to: "Left" }), item("Blog", 20, { to: "Left" }),
    item("Left", 5, { to: "Search" }), item("Nowhere", 5),
  ]);
  expect(dropped).toBe(2);
  const col = Object.fromEntries(nodes.map((n) => [n.name, n.col]));
  expect(col).toEqual({ Search: 0, Pricing: 1, Social: 0, Blog: 1, Trial: 2, Left: 2 });
  // A ribbon is as wide where it leaves as where it arrives, and a node holds what comes in.
  const pricing = nodes.find((n) => n.name === "Pricing")!;
  const into = links.filter((l) => nodes[l.to] === pricing).reduce((s, l) => s + l.width, 0);
  expect(into).toBeCloseTo(pricing.h);
  expect(pricing.value).toBe(100);
});

test("3D bars: a row per group in order; drawn back to front", () => {
  const g = isoGrid([item("Mon", 3, { group: "W1" }), item("Tue", 5, { group: "W1" }), item("Mon", 2, { group: "W2" })]);
  expect(g.rows).toEqual(["W1", "W2"]);
  expect(g.cols).toBe(2);
  expect(g.cells.map((c) => c.gx + c.gy)).toEqual([0, 1, 1]);
});

test("flights: every city has its three names and a place on land; the frame holds them all", () => {
  for (const [key, lat, lon] of CITIES) {
    expect(cityName(key, "ar") && cityName(key, "en") && cityName(key, "he"), key).toBeTruthy();
    // On the map's land, or a dot away from it (a city on the coast).
    const near = [0, 1.5, -1.5].some((d) => isLand(lon + d, lat) || isLand(lon, lat + d));
    expect(near, key).toBe(true);
  }
  expect(isLand(-30, 30)).toBe(false); // the Atlantic
  expect(isLand(34, 43)).toBe(false); // the Black Sea
  const km = kmBetween([31.95, 35.93], [25.2, 55.27]); // Amman to Dubai, about 2,000 km
  expect(km).toBeGreaterThan(1950);
  expect(km).toBeLessThan(2050);
  const pts: Array<readonly [number, number]> = [[31.95, 35.93], [51.51, -0.13], [25.2, 55.27]];
  const f = mapFrame(pts);
  for (const [lat, lon] of pts) {
    const [x, y] = onMap(f, lat, lon);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(f.w);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(f.h);
  }
});

test("live: every bucket of the window in order, the missing ones nothing, what isn't a count left out", () => {
  const now = Date.UTC(2026, 11, 1, 10, 30);
  const s = liveSeries({ counts: [{ at: "2026-12-01T10:00:00.000Z", n: 4 }, { at: "2026-12-01T08:00:00.000Z", n: 2 }, { at: "nope", n: 9 }, { at: "2026-12-01T09:00:00.000Z", n: -1 }] }, "hour", 4, now);
  expect(s.map((x) => x.n)).toEqual([0, 2, 0, 4]);
  expect(new Date(s[3].at).toISOString()).toBe("2026-12-01T10:00:00.000Z");
  expect(liveSeries(null, "minute", 6, now)).toHaveLength(6);
});
