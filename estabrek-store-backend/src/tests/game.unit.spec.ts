import { describe, expect, test } from "vitest";
import { checkTree } from "../lib/pageTree.js";
import { READY_GAMES } from "../../../estabrek-storefront/src/pageTree/gameReady";

// The games stage (G0 of docs/game-engine-plan.ar.md): a page's game as the server checks it. Every ready game
// passes; a game whose rules name what isn't there, or make what isn't a template, doesn't.
const page = (game: unknown) => ({ version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: {}, children: [{ id: "g", type: "game", props: { game } }] }] } });
const issues = (game: unknown) => {
  const r = checkTree(page(game));
  return r.ok ? [] : r.issues.map((i) => `${i.path ?? ""} ${i.message}`);
};
const thing = (id: string, more: Record<string, unknown> = {}) => ({ id, look: { kind: "box", color: "accent" }, x: 100, y: 100, w: 40, h: 40, ...more });

describe("a game on the page", () => {
  test.each(READY_GAMES.map((g) => [g.key, g.game]))("the ready game %s passes", (_key, game) => {
    expect(issues(game)).toEqual([]);
  });

  test("its rules name its own things and tags, and make only its templates", () => {
    expect(issues({ things: [thing("a", { tags: ["hero"] }), thing("b", { template: true })], rules: [{ when: { on: "hit", a: "#hero", b: "b" }, do: [{ act: "spawn", what: "b", at: "top" }] }] })).toEqual([]);
    expect(issues({ things: [thing("a")], rules: [{ when: { on: "tap", who: "#ghost" }, do: [{ act: "win" }] }] }).join()).toMatch(/No thing or tag “#ghost”/);
    expect(issues({ things: [thing("a")], rules: [{ when: { on: "start" }, do: [{ act: "spawn", what: "a" }] }] }).join()).toMatch(/isn't a template/);
    expect(issues({ things: [thing("a"), thing("a")] }).join()).toMatch(/share a name/);
    expect(issues({ things: [thing("a", { template: true })] }).join()).toMatch(/Nothing is in the world/);
  });

  test("its numbers, names, looks and lists are kept in their bounds", () => {
    expect(issues({ things: [] }).length).toBeGreaterThan(0);
    expect(issues({ things: Array.from({ length: 41 }, (_, i) => thing(`t${i}`)) }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("Bad Name")] }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("a", { look: { kind: "image", src: "javascript:alert(1)" } })] }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("a", { look: { kind: "box", color: "url(x)" } })] }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("a", { speed: 99999 })] }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("a")], lives: 10 }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("a")], coupon: "no spaces" }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("a")], rules: [{ when: { on: "start" }, do: [] }] }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("a")], rules: [{ when: { on: "start" }, do: [{ act: "explode" }] }] }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("a")], extra: 1 }).length).toBeGreaterThan(0);
    // Words in three languages, a coupon to win.
    expect(issues({ things: [thing("a", { look: { kind: "text", text: { ar: "أهلا", en: "Hi" } } })], coupon: "WIN10", once: true, words: { title: { ar: "لعبة" }, help: { en: "Play" } } })).toEqual([]);
  });
});
