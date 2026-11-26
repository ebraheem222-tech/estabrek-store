import { describe, expect, test } from "vitest";
import { gameOf } from "../../../estabrek-storefront/src/pageTree/gameSpec";
import { READY_GAMES } from "../../../estabrek-storefront/src/pageTree/gameReady";
import { ACT_NAMES, INSTRUMENT_NAMES, SHAPE_PICKS, SOUND_NAMES, WHEN_NAMES, actPossible, jointable, jointsOf, shapePick, withNewJoint, freshId, levelMaps, newAct, newWhen, nextTileChar, paintCells, pathPoints, resizedLevels, resizedMap, ruleText, rulesOf, thingsOf, whoOptions, withLevelMap, withNewLevel, withNewThing, withPathPoint, withTiles, withoutLevel, withoutThing, withoutTileKind, worldSize, type Obj } from "./gameEdit";
import { say } from "./say";

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

  test("G1b: levels added as copies, painted one at a time, resized together, removed with their rules; a path's points from the thing", () => {
    const g = withTiles(catchGame());
    const two = withNewLevel(g, 0)!;
    expect(levelMaps(two)).toHaveLength(2);
    const painted = withLevelMap(two, 1, paintCells(levelMaps(two)[1], [[0, 0]], "#"));
    expect(levelMaps(painted)[0][0][0]).toBe(".");
    expect(levelMaps(painted)[1][0][0]).toBe("#");
    expect(read(painted).tiles?.levels).toHaveLength(1);
    const small = resizedLevels(painted, 10, 4);
    expect(levelMaps(small).every((m) => m.length === 4 && m.every((r) => r.length === 10))).toBe(true);
    // A level taken away takes the rules for levels that are no more.
    const withRule = { ...painted, rules: [...rulesOf(painted), { when: { on: "level", at: 2 }, do: [{ act: "score", add: 5 }] }] };
    const one = withoutLevel(withRule, 1);
    expect(levelMaps(one)).toHaveLength(1);
    expect((one.tiles as Obj).levels).toBeUndefined();
    expect(rulesOf(one).some((r) => (r.when as Obj).on === "level")).toBe(false);
    // A kind of tile taken away from every level.
    const kinds = { ...((painted.tiles as Obj).kinds as Obj), "^": { look: { kind: "box" }, tags: ["hazard"] } };
    const spikes = withLevelMap({ ...painted, tiles: { ...(painted.tiles as Obj), kinds } }, 1, paintCells(levelMaps(painted)[1], [[2, 2]], "^"));
    expect(JSON.stringify(levelMaps(spikes))).toContain("^");
    expect(JSON.stringify(levelMaps(withoutTileKind(spikes, "^")))).not.toContain("^");
    // Eight levels at most.
    let many = g;
    for (let i = 0; i < 7; i++) many = withNewLevel(many, 0)!;
    expect(levelMaps(many)).toHaveLength(8);
    expect(withNewLevel(many, 0)).toBeNull();
    // A path's points, from where the thing is.
    const thing = { x: 100, y: 50, path: { points: [[20, 0]] } };
    expect(withPathPoint(thing, 300, 80)).toEqual({ points: [[20, 0], [200, 30]] });
    expect(withPathPoint(thing, 150, 50, 0)).toEqual({ points: [[50, 0]] });
    expect(pathPoints({})).toEqual([]);
  });

  test("G1b: the new rules (sees, a level begins) and actions (next level, this level again) are read whole by the shop, and told in words", () => {
    const g = catchGame();
    for (const on of ["see", "level"] as const) for (const act of ["next", "retry"] as const) {
      const edited = { ...g, rules: [{ when: newWhen(on, g), do: [newAct(act, g)] }] };
      expect(read(edited).rules, `${on} ${act}`).toHaveLength(1);
    }
    expect(ruleText({ when: { on: "see", a: "#enemy", b: "#player" }, do: [{ act: "retry" }] })).toMatch(/#enemy.*#player/);
    expect(ruleText({ when: { on: "level", at: 0 }, do: [{ act: "next" }] })).toContain(say("لما تبلّش أي مرحلة|When any level begins|כשכל שלב מתחיל"));
  });

  test("G2: the rules for a slung thing and its actions are read whole by the shop; a rigid thing's shape named among the picks", () => {
    const g = catchGame();
    for (const on of ["shot", "rest"] as const) for (const act of ["home", "explode"] as const) {
      const edited = { ...g, rules: [{ when: newWhen(on, g), do: [newAct(act, g)] }] };
      expect(read(edited).rules, `${on} ${act}`).toHaveLength(1);
    }
    expect(ruleText({ when: { on: "rest", who: "#ball" }, do: [{ act: "home", who: "self" }] })).toMatch(/#ball/);
    const ramp = SHAPE_PICKS.find(([k]) => k === "ramp")![2]!;
    expect(shapePick({ shape: "poly", points: ramp })).toBe("ramp");
    expect(shapePick({ shape: "poly", points: [[0, 0], [0.5, 0], [0, 0.5]] })).toBe("poly");
    expect(shapePick({ shape: "circle" })).toBe("circle");
    expect(shapePick({})).toBe("box");
    // Every pick is a shape the shop reads whole (a hexagon's points in its box).
    for (const [, , pts] of SHAPE_PICKS) {
      if (!pts) continue;
      const spec = read({ ...g, things: [...thingsOf(g), { id: "shape", look: { kind: "box" }, x: 10, y: 10, w: 40, h: 40, body: "rigid", shape: "poly", points: pts }] });
      expect(spec.things.find((t) => t.id === "shape")!.points).toEqual(pts);
    }
  });

  test("G2b: a joint added holds the first thing in the world; a thing taken out takes its joints; the rules for a joint read whole", () => {
    const g = catchGame();
    const one = withNewJoint(g)!;
    expect(jointsOf(one)).toEqual([{ kind: "pin", a: "bag", b: "" }]);
    expect(jointable(g).map((t) => t.id)).toEqual(["bag"]);
    expect(read(one).joints).toHaveLength(1);
    expect(jointsOf(withoutThing(one, "bag"))).toEqual([]);
    expect(withNewJoint({ ...g, things: thingsOf(g).filter((t) => t.template) })).toBeNull();
    const edited = { ...one, rules: [{ when: newWhen("break", one), do: [newAct("cut", one)] }] };
    expect(read(edited).rules).toHaveLength(1);
    expect(ruleText({ when: { on: "break", who: "bag" }, do: [{ act: "cut", who: "self" }] })).toMatch(/bag/);
  });

  test("G3: a note's and confetti's first values are read whole by the shop; the effects' names", () => {
    const g = catchGame();
    for (const act of ["note", "confetti"] as const) {
      const edited = { ...g, rules: [{ when: newWhen("start", g), do: [newAct(act, g)] }] };
      expect(read(edited).rules[0].do, act).toHaveLength(1);
    }
    expect(read({ ...g, rules: [{ when: { on: "start" }, do: [newAct("note", g)] }] }).rules[0].do[0]).toEqual({ act: "note", instrument: "bell", scale: "pentatonic", step: -1 });
    expect(ruleText({ when: { on: "start" }, do: [{ act: "note", instrument: "bell" }] })).toContain(say(INSTRUMENT_NAMES.bell));
    expect(Object.keys(SOUND_NAMES)).toEqual(["click", "pop", "chime", "whoosh", "success", "hit", "coin", "jump", "laser", "boom", "power", "blip"]);
  });

  test("G3b: on the beat, a key pressed while two things touch, a copy where its template stands, a flash: read whole by the shop and told in words", () => {
    const g = catchGame();
    for (const on of ["beat", "press"] as const) {
      const edited = { ...g, rules: [{ when: newWhen(on, g), do: [newAct("flash", g), { act: "spawn", what: "gift", at: "own" }] }] };
      expect(read(edited).rules[0].do, on).toHaveLength(2);
    }
    expect(newWhen("press", g)).toEqual({ on: "press", key: "Space", a: "bag", b: "gift" });
    expect(ruleText({ when: { on: "beat", every: 2, offset: 1 }, do: [{ act: "flash" }] })).toMatch(/2/);
    expect(ruleText({ when: { on: "press", key: "ArrowLeft", a: "bar", b: "#arrow" }, do: [{ act: "flash" }] })).toMatch(/bar.*#arrow/);
  });
});
