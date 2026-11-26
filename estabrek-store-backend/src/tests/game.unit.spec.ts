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
    expect(issues({ things: [thing("a")], rules: [{ when: { on: "start" }, do: [{ act: "teleport" }] }] }).length).toBeGreaterThan(0);
    expect(issues({ things: [thing("a")], extra: 1 }).length).toBeGreaterThan(0);
    // Words in three languages, a coupon to win.
    expect(issues({ things: [thing("a", { look: { kind: "text", text: { ar: "أهلا", en: "Hi" } } })], coupon: "WIN10", once: true, words: { title: { ar: "لعبة" }, help: { en: "Play" } } })).toEqual([]);
  });

  test("G1: a tile map with its kinds, a sprite sheet, a camera and layers; a map that doesn't add up is refused", () => {
    const kinds = { "#": { look: { kind: "box", color: "text" }, solid: true }, "^": { look: { kind: "emoji", emoji: "🔥" }, tags: ["hazard"] }, o: { look: { kind: "box" }, thing: "coin" } };
    const base = {
      w: 960, h: 540,
      things: [thing("hero", { look: { kind: "sprite", src: "/m/hero.png", sheet: { cols: 4, rows: 2, fps: 12, anims: { idle: [0, 2], run: [2, 4] } } }, tags: ["player"] }), thing("coin", { template: true })],
      tiles: { size: 45, cols: 4, rows: 2, map: ["o.^.", "####"], kinds },
      camera: { follow: "#player", lerp: 0.2 },
      layers: [{ kind: "gradient", color: "accent-soft", color2: "surface", factor: 0.3, y: 0.5, h: 0.5 }],
      // A rule may name a tile's tag.
      rules: [{ when: { on: "hit", a: "#player", b: "#hazard" }, do: [{ act: "lives", add: -1 }] }],
    };
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, tiles: { ...base.tiles, map: ["o.^.x", "####"] } }).join()).toMatch(/bigger|No kind of tile/);
    expect(issues({ ...base, tiles: { ...base.tiles, map: ["oZ^.", "####"] } }).join()).toMatch(/No kind of tile for “Z”/);
    // A kind may be where a thing in the world starts (G1b), not a thing the game hasn't.
    expect(issues({ ...base, tiles: { ...base.tiles, kinds: { ...kinds, o: { look: { kind: "box" }, thing: "hero" } } } })).toEqual([]);
    expect(issues({ ...base, tiles: { ...base.tiles, kinds: { ...kinds, o: { look: { kind: "box" }, thing: "ghost" } } } }).join()).toMatch(/the game hasn't/);
    expect(issues({ ...base, tiles: { ...base.tiles, kinds: { ...kinds, ".": { look: { kind: "box" } } } } }).length).toBeGreaterThan(0);
    expect(issues({ ...base, layers: Array.from({ length: 5 }, () => base.layers[0]) }).length).toBeGreaterThan(0);
    // A world of tiles alone, with nothing else at the start, is still a game.
    expect(issues({ things: [], tiles: { size: 40, cols: 2, rows: 1, map: ["##"], kinds: { "#": { look: { kind: "box" }, solid: true } } } })).toEqual([]);
  });

  test("G1b: levels, a maze, the cover between levels, sight and paths, the brains and their rules", () => {
    const kinds = { "#": { look: { kind: "box" }, solid: true }, P: { look: { kind: "box" }, thing: "hero" }, F: { look: { kind: "box" }, thing: "flag" } };
    const base = {
      transition: "wipe",
      things: [
        thing("hero", { tags: ["player"] }),
        thing("flag", { template: true, tags: ["goal"] }),
        thing("guard", { behave: "guard", sight: 300, tags: ["enemy"] }),
        thing("lift", { behave: "path", path: { points: [[200, 0], [200, -80]], loop: true, smooth: true } }),
      ],
      tiles: { size: 40, cols: 4, rows: 2, map: ["P.F.", "####"], levels: [["..PF", "####"], ["P..F", "#..#"]], gen: "maze", kinds },
      rules: [
        { when: { on: "hit", a: "#player", b: "#goal" }, do: [{ act: "next" }] },
        { when: { on: "see", a: "#enemy", b: "#player" }, do: [{ act: "sound", kind: "hit" }] },
        { when: { on: "level", at: 3 }, do: [{ act: "score", add: 10 }, { act: "retry" }] },
      ],
    };
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, rules: [{ when: { on: "level", at: 4 }, do: [{ act: "win" }] }] }).join()).toMatch(/no level 4/);
    expect(issues({ ...base, tiles: { ...base.tiles, levels: [["P.Z.", "####"]] } }).join()).toMatch(/No kind of tile for “Z”/);
    expect(issues({ ...base, tiles: { ...base.tiles, levels: Array.from({ length: 8 }, () => ["P...", "####"]) } }).length).toBeGreaterThan(0);
    expect(issues({ ...base, tiles: { ...base.tiles, kinds: { P: kinds.P, F: kinds.F }, map: ["P.F.", "...."], levels: [] } }).join()).toMatch(/needs a solid kind/);
    expect(issues({ ...base, transition: "spin" }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("hero", { path: { points: [] } })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("hero", { sight: -1 })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, rules: [{ when: { on: "see", a: "#nobody", b: "#player" }, do: [{ act: "next" }] }] }).join()).toMatch(/No thing or tag “#nobody”/);
  });

  test("G4b: real 3D physics on the ground, a walker, a rule for a thing that tips over", () => {
    const base = {
      view3d: { mode: "ground", physics: true, gravity: 2400 },
      things: [thing("frog", { body: "dynamic", control: "walk", jump: 900, tags: ["player"] }), thing("pin", { body: "rigid", d3: { shape: "cylinder", height: 60 }, tags: ["pin"] })],
      rules: [{ when: { on: "tip", who: "#pin" }, do: [{ act: "score", add: 1 }] }],
    };
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, view3d: { mode: "ground", physics: true, gravity: 9000 } }).length).toBeGreaterThan(0);
    expect(issues({ ...base, rules: [{ when: { on: "tip", who: "#ghost" }, do: [{ act: "win" }] }] }).join()).toMatch(/No thing or tag “#ghost”/);
    expect(issues({ ...base, things: [thing("frog", { control: "fly" })] }).length).toBeGreaterThan(0);
  });

  test("G4a: the 3D view, a thing's shape and model in 3D, a tile's height, the car", () => {
    const base = {
      gravity: 0,
      view3d: { mode: "ground", camera: "follow", tilt: 40, distance: 0.9, light: "sunset", shadows: true, fog: true },
      things: [
        thing("car", { body: "dynamic", control: "car", d3: { shape: "model", src: "https://cdn.example.com/car.glb", height: 30, lift: 0, metal: 0.6, rough: 0.3 } }),
        thing("coin", { d3: { shape: "cylinder", height: 8, lift: 15 } }),
      ],
      tiles: { size: 40, cols: 2, rows: 1, map: ["#."], kinds: { "#": { look: { kind: "box" }, solid: true, height: 30 } } },
    };
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, view3d: { mode: "space" } }).length).toBeGreaterThan(0);
    expect(issues({ ...base, view3d: { mode: "ground", tilt: 95 } }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("car", { d3: { shape: "model" } })] }).join()).toMatch(/needs its file/);
    expect(issues({ ...base, things: [thing("car", { d3: { shape: "model", src: "javascript:alert(1)" } })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("car", { d3: { shape: "pyramid" } })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("car", { d3: { metal: 2 } })] }).length).toBeGreaterThan(0);
  });

  test("G3b: on the beat, a key pressed while two things touch, a copy where its template stands, a flash", () => {
    const base = {
      music: { mood: "lively", tempo: 100 },
      things: [thing("bar", { tags: ["bar"] }), thing("arrow", { template: true, tags: ["arrow"] })],
      rules: [
        { when: { on: "beat", every: 2, offset: 0.5 }, do: [{ act: "spawn", what: "arrow", at: "own" }] },
        { when: { on: "beat", every: 1 }, do: [{ act: "flash" }] },
        { when: { on: "press", key: "ArrowLeft", a: "bar", b: "#arrow" }, do: [{ act: "destroy", who: "other" }, { act: "flash", who: "self" }] },
      ],
    };
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, rules: [{ when: { on: "beat", every: 0.1 }, do: [{ act: "flash" }] }] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, rules: [{ when: { on: "beat", every: 1, offset: 17 }, do: [{ act: "flash" }] }] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, rules: [{ when: { on: "press", key: "KeyA", a: "bar", b: "#arrow" }, do: [{ act: "flash" }] }] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, rules: [{ when: { on: "press", key: "Space", a: "#ghost", b: "#arrow" }, do: [{ act: "flash" }] }] }).join()).toMatch(/No thing or tag “#ghost”/);
    expect(issues({ ...base, rules: [{ when: { on: "start" }, do: [{ act: "spawn", what: "arrow", at: "mine" }] }] }).length).toBeGreaterThan(0);
  });

  test("G3: trails, a look's effect, the weather, an effect over the picture, music, notes, confetti, more sounds", () => {
    const base = {
      weather: "snow", post: "dream", music: { mood: "spooky", tempo: 90, volume: 0.4 },
      things: [thing("star", { trail: "sparkle", fx: "glow" }), thing("comet", { trail: "fire", fx: "rainbow" })],
      rules: [{ when: { on: "tap", who: "star" }, do: [{ act: "note", instrument: "bell", scale: "pentatonic", step: -1 }, { act: "note" }, { act: "confetti" }, { act: "sound", kind: "laser" }] }],
    };
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, weather: "hail" }).length).toBeGreaterThan(0);
    expect(issues({ ...base, post: "blur" }).length).toBeGreaterThan(0);
    expect(issues({ ...base, music: { mood: "jazz" } }).length).toBeGreaterThan(0);
    expect(issues({ ...base, music: { mood: "calm", tempo: 300 } }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("star", { trail: "glitter" })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("star", { fx: "melt" })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, rules: [{ when: { on: "start" }, do: [{ act: "note", instrument: "harp" }] }] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, rules: [{ when: { on: "start" }, do: [{ act: "note", step: 21 }] }] }).length).toBeGreaterThan(0);
  });

  test("G2b: joints between things in the world, motors on keys, breaking and cutting them", () => {
    const base = {
      things: [thing("flip", { body: "rigid", tags: ["flipper"] }), thing("plank", { body: "rigid" }), thing("post", { body: "static" }), thing("coin", { template: true })],
      joints: [
        { kind: "pin", a: "flip", b: "", ax: -60, limits: [-30, 30], motor: { speed: -900, key: "ArrowLeft", power: 200 } },
        { kind: "weld", a: "plank", b: "post", ax: 20, breakAt: 150 },
        { kind: "rope", a: "plank", b: "", bx: 300, by: 20, length: 120 },
        { kind: "slider", a: "flip", b: "post", axis: 90, limits: [-40, 40], motor: { speed: 100 } },
        { kind: "spring", a: "post", b: "plank", stiffness: 30, damping: 1 },
      ],
      rules: [
        { when: { on: "break", who: "plank" }, do: [{ act: "score", add: 1 }] },
        { when: { on: "tap", who: "#flipper" }, do: [{ act: "cut", who: "self" }, { act: "cut" }] },
      ],
    };
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, joints: [{ kind: "pin", a: "coin", b: "" }] }).join()).toMatch(/can't hold a template/);
    expect(issues({ ...base, joints: [{ kind: "pin", a: "ghost" }] }).join()).toMatch(/isn't a thing in the world/);
    expect(issues({ ...base, joints: [{ kind: "weld", a: "plank", b: "plank" }] }).join()).toMatch(/two different things/);
    expect(issues({ ...base, joints: [{ kind: "rope", a: "plank", motor: { speed: 10 } }] }).join()).toMatch(/Only a pin or a slider/);
    expect(issues({ ...base, joints: [{ kind: "pin", a: "plank", limits: [-400, 0] }] }).join()).toMatch(/degrees/);
    expect(issues({ ...base, joints: [{ kind: "hinge", a: "plank" }] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, joints: [{ kind: "pin", a: "plank", motor: { speed: 10, key: "KeyQ" } }] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, joints: Array.from({ length: 41 }, () => ({ kind: "pin", a: "plank" })) }).length).toBeGreaterThan(0);
  });

  test("G2: rigid things (shapes, materials), the sling, rest and home, explosions", () => {
    const base = {
      gravity: 2000,
      things: [
        thing("ball", { body: "rigid", shape: "circle", control: "sling", speed: 1500, density: 3, friction: 0.6, drag: 0.4, bounce: 0.3, fast: true, tags: ["ball"] }),
        thing("ramp", { body: "rigid", shape: "poly", points: [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5]], spinLock: true }),
        thing("bomb", { tags: ["bomb"] }),
      ],
      rules: [
        { when: { on: "rest", who: "#ball" }, do: [{ act: "home", who: "self" }] },
        { when: { on: "shot", who: "ball" }, do: [{ act: "score", add: 1 }] },
        { when: { on: "tap", who: "#bomb" }, do: [{ act: "explode", who: "self", radius: 300, power: 1200 }, { act: "explode" }] },
      ],
    };
    expect(issues(base)).toEqual([]);
    expect(issues({ ...base, things: [thing("ramp", { body: "rigid", shape: "poly", points: [[0, 0], [0.5, 0.5]] })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("ramp", { body: "rigid", shape: "poly" })] }).join()).toMatch(/three points/);
    expect(issues({ ...base, things: [thing("ramp", { body: "rigid", shape: "poly", points: [[0, 0], [0.9, 0], [0, 0.5]] })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("a", { body: "rigid", density: 0 })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, things: [thing("a", { body: "jelly" })] }).length).toBeGreaterThan(0);
    expect(issues({ ...base, rules: [{ when: { on: "rest", who: "#ghost" }, do: [{ act: "home" }] }] }).join()).toMatch(/No thing or tag “#ghost”/);
    expect(issues({ ...base, rules: [{ when: { on: "start" }, do: [{ act: "explode", radius: 5 }] }] }).length).toBeGreaterThan(0);
  });
});
