import { describe, expect, test } from "vitest";
import { gameOf } from "../../../estabrek-storefront/src/pageTree/gameSpec";
import { READY_GAMES } from "../../../estabrek-storefront/src/pageTree/gameReady";
import { ACT_NAMES, WHEN_NAMES, actPossible, freshId, newAct, newWhen, nextTileChar, paintCells, resizedMap, ruleText, rulesOf, thingsOf, whoOptions, withNewThing, withTiles, withoutThing, withoutTileKind, worldSize, type Obj } from "./gameEdit";

// G0b: editing a game by hand, and what's edited still a whole game for the shop.
const catchGame = () => structuredClone(READY_GAMES.find((g) => g.key === "catch")!.game) as Obj;
const read = (g: Obj) => gameOf(g, (t) => (t && typeof t === "object" ? (t as Record<string, string>).en ?? "" : ""))!;

describe("editing a game", () => {
  test("a new thing gets its own name and a place in the middle; a full game takes no more", () => {
    const g = catchGame();
    expect(freshId(g, "bag")).toBe("bag-2");
    expect(freshId(g, "Star 9!")).toBe("star-9");
    const made = withNewThing(g, { kind: "emoji", emoji: "⭐", color: "accent" }, "star")!;
    expect(made.id).toBe("star");
    const t = thingsOf(made.game).find((x) => x.id === "star")!;
    expect([t.x, t.y]).toEqual([480, 270]);
    expect(read(made.game).things.some((x) => x.id === "star")).toBe(true);
    let full: Obj = { ...g, things: Array.from({ length: 40 }, (_, i) => ({ id: `t${i}`, look: { kind: "box" }, x: 1, y: 1, w: 9, h: 9 })) };
    expect(withNewThing(full, { kind: "box" }, "x")).toBeNull();
    full = { ...full };
  });

  test("a thing taken out takes every rule that named it, its tag's rules if only it had the tag, and the copies made of it", () => {
    const g = catchGame();
    // The gift is a template ("#good" only it has): its spawn rule loses its only action, its hit rule names #good.
    const out = withoutThing(g, "gift");
    expect(thingsOf(out).map((t) => t.id)).toEqual(["bag", "fire"]);
    const texts = rulesOf(out).map((r) => JSON.stringify(r));
    expect(texts.some((x) => x.includes("gift") || x.includes("#good"))).toBe(false);
    expect(rulesOf(out).length).toBe(rulesOf(g).length - 2);
    expect(read(out).rules.length).toBe(rulesOf(out).length);
    // The player taken out: every rule naming #player goes.
    const noBag = withoutThing(g, "bag");
    expect(rulesOf(noBag).some((r) => JSON.stringify(r).includes("#player"))).toBe(false);
  });

  test("what a rule can name, a new rule's and action's first values, and a rule in words", () => {
    const g = catchGame();
    const whos = whoOptions(g).map(([v]) => v);
    expect(whos).toEqual(expect.arrayContaining(["bag", "gift", "fire", "#player", "#good", "#bad"]));
    for (const on of Object.keys(WHEN_NAMES) as Array<keyof typeof WHEN_NAMES>) {
      for (const act of Object.keys(ACT_NAMES) as Array<keyof typeof ACT_NAMES>) {
        if (!actPossible(act, g)) continue;
        const edited = { ...g, rules: [...rulesOf(g), { when: newWhen(on, g), do: [newAct(act, g)] }] };
        // The shop reads every first value whole: the rule is kept, with its action.
        const spec = read(edited);
        expect(spec.rules.length, `${on} ${act}`).toBe(rulesOf(edited).length);
      }
    }
    expect(actPossible("spawn", { things: [{ id: "a" }] })).toBe(false);
    expect(ruleText({ when: { on: "hit", a: "#player", b: "#good" }, do: [{ act: "destroy", who: "other" }, { act: "score", add: 1 }] })).toMatch(/#player.*#good.*\+1/);
  });

  test("G1: a tile map added three views wide with a floor; painted, resized, its kinds and the things they put taken away cleanly", () => {
    const g = withTiles(catchGame());
    const t = g.tiles as { cols: number; rows: number; size: number; map: string[] };
    expect([t.cols, t.rows, t.size]).toEqual([60, 12, 48]);
    expect(t.map.at(-1)).toBe("#".repeat(60));
    expect(worldSize(g)).toEqual([2880, 576]);
    expect((g.camera as Obj).follow).toBe("#player");
    expect(read(g).tiles?.map.length).toBe(12);
    expect(paintCells(["....", "...."], [[1, 0], [9, 9]], "#")).toEqual([".#..", "...."]);
    expect(resizedMap(["#=", "##"], 3, 1)).toEqual(["#=."]);
    expect(nextTileChar(g)).toBe("=");
    // A kind of tile with a tag a rule names, and one that puts a thing: taken away with its cells and the rule.
    const map = paintCells(paintCells(t.map, [[3, 5], [4, 5]], "^"), [[0, 4]], "o");
    const withKinds: Obj = {
      ...g,
      tiles: { ...t, map, kinds: { ...((g.tiles as Obj).kinds as Obj), "^": { look: { kind: "box" }, tags: ["hazard"] }, o: { look: { kind: "box" }, thing: "gift" } } },
      rules: [...rulesOf(g), { when: { on: "hit", a: "#player", b: "#hazard" }, do: [{ act: "lives", add: -1 }] }],
    };
    expect(whoOptions(withKinds).map(([v]) => v)).toContain("#hazard");
    const noSpikes = withoutTileKind(withKinds, "^");
    expect(JSON.stringify((noSpikes.tiles as Obj).map)).not.toContain("^");
    expect(rulesOf(noSpikes).some((r) => JSON.stringify(r).includes("#hazard"))).toBe(false);
    const noGift = withoutThing(withKinds, "gift");
    expect(Object.keys((noGift.tiles as Obj).kinds as Obj)).not.toContain("o");
    expect(read(noGift).tiles?.map.join("")).not.toContain("o");
  });
});
