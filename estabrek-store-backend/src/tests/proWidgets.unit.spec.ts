import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { newElement, type NewKind } from "../../../estabrek-admin/src/studio/columns";
import { newSubLink } from "../../../estabrek-admin/src/studio/blockDefaults";
import { withWhen } from "../../../estabrek-admin/src/studio/WhenPanel";
import { visitorEnd } from "../../../estabrek-storefront/src/pageTree/Interactive";
import { whenNow, whenOf } from "../../../estabrek-storefront/src/pageTree/pieces";

// The editor's new elements (the admin's studio) as the server checks them, and the shop's reading of the time to
// show and of a visitor's own countdown; no database needed.
type Node = { id: string; type: string; props: Record<string, unknown>; style?: Record<string, unknown>; children?: Node[] };
const page = (...children: Node[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: {}, children }] } });
const issues = (tree: unknown) => {
  const r = checkTree(tree);
  return r.ok ? [] : r.issues;
};
const ids = () => {
  let n = 0;
  return (p: string) => `${p}-${++n}`;
};

describe("the pro widgets the editor adds", () => {
  test.each(["toc", "flipBox", "share", "progress", "headline"] as NewKind[])("a new %s, in each language, saves as it is", (kind) => {
    for (const lang of ["ar", "en", "he"] as const) {
      const made = newElement(kind, lang, ids(), "https://res.cloudinary.com/x/image/upload/a.jpg") as Node;
      expect(made.type).toBe(kind);
      expect(issues(page(made)), `${kind} ${lang}`).toEqual([]);
    }
  });

  test("a menu link with links of its own, made by the editor, saves", () => {
    const menu = newElement("menu", "ar", ids()) as Node;
    const items = menu.props.items as Array<Record<string, unknown>>;
    items[0] = { ...items[0], children: [0, 1, 2].map((n) => newSubLink("ar", n)) };
    expect(issues(page(menu))).toEqual([]);
  });

  test("a time to show as the editor writes it saves; an end before its start is never written", () => {
    const text = { id: "t", type: "text", props: { text: { ar: "عرض الجمعة" } } } as Node;
    const timed = withWhen(text.props, { from: "2026-11-27T00:00", until: "2026-11-30T23:59" })!;
    expect(issues(page({ ...text, props: timed }))).toEqual([]);
    expect(withWhen(text.props, { from: "2026-12-01T00:00", until: "2026-11-01T00:00" })).toBeNull();
    // Both ends taken away: no time to show at all.
    expect(withWhen(timed, {})).toEqual(text.props);
  });
});

describe("the shop's reading", () => {
  test("a time to show: from, until, between; nothing usable is no time at all", () => {
    const at = (iso: string) => Date.parse(iso);
    const friday = whenOf({ from: "2026-11-27T00:00", until: "2026-11-30T00:00" })!;
    expect(whenNow(friday, at("2026-11-26T23:59"))).toBe(false);
    expect(whenNow(friday, at("2026-11-27T00:00"))).toBe(true);
    expect(whenNow(friday, at("2026-11-30T00:00"))).toBe(false);
    expect(whenNow(whenOf({ until: "2026-12-01T00:00" })!, at("2020-01-01T00:00"))).toBe(true);
    expect(whenOf({ from: "soon" })).toBeUndefined();
    expect(whenOf("2026-11-27")).toBeUndefined();
  });

  test("a visitor's own countdown: kept from the first visit, over once, or round again", () => {
    const kept = new Map<string, string>();
    const store = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v) };
    const t0 = 1_800_000_000_000;
    const end = visitorEnd("pt-cd-x", 30, false, t0, store);
    expect(end).toBe(t0 + 30 * 60_000);
    // Back ten minutes later: the same end.
    expect(visitorEnd("pt-cd-x", 30, false, t0 + 10 * 60_000, store)).toBe(end);
    // Back after it ended: still ended, unless it starts over (then the next round, in step).
    expect(visitorEnd("pt-cd-x", 30, false, t0 + 45 * 60_000, store)).toBe(end);
    expect(visitorEnd("pt-cd-x", 30, true, t0 + 45 * 60_000, store)).toBe(t0 + 60 * 60_000);
    // A shorter timer than the one kept starts fresh; no storage starts from now.
    expect(visitorEnd("pt-cd-x", 5, false, t0 + 46 * 60_000, store)).toBe(t0 + 51 * 60_000);
    expect(visitorEnd("pt-cd-y", 15, false, t0, null)).toBe(t0 + 15 * 60_000);
  });
});
