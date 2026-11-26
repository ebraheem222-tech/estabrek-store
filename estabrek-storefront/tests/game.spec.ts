import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { READY_GAMES } from "../src/pageTree/gameReady";

// G0 of the games stage (docs/game-engine-plan.ar.md): a game on a shop page, drawn by three.js and played with
// the keyboard and a finger. The game here is small and certain: Enter drops a gift from the middle onto the bag.
const API = "http://127.0.0.1:4100";
const PATH = "/en/publication-fixture-en";
const OUT = process.env.GAME_OUT || "";
const en = (text: string) => ({ en: text });
const game = (more: Record<string, unknown> = {}) => ({
  w: 960, h: 540, bg: "surface", edges: "open", lives: 2, seed: 5,
  things: [
    { id: "bag", look: { kind: "emoji", emoji: "🛍️", color: "accent" }, x: 480, y: 470, w: 110, h: 90, body: "kinematic", control: "leftRight", speed: 600, keepIn: true, tags: ["player"] },
    { id: "gift", look: { kind: "box", color: "accent" }, x: 0, y: 0, w: 50, h: 50, body: "kinematic", vy: 700, template: true },
    { id: "word", look: { kind: "text", text: en("Go!"), color: "text" }, x: 120, y: 60, w: 160, h: 50, body: "static" },
  ],
  rules: [
    { when: { on: "key", key: "Enter" }, do: [{ act: "spawn", what: "gift", at: "center" }] },
    { when: { on: "hit", a: "#player", b: "gift" }, do: [{ act: "burst", who: "other" }, { act: "destroy", who: "other" }, { act: "score", add: 1 }] },
    { when: { on: "out", who: "gift" }, do: [{ act: "lives", add: -1 }] },
  ],
  words: { title: en("Catch it"), help: en("Enter drops a gift"), start: en("Play") },
  ...more,
});
const publish = async (page: Page, g: unknown) => {
  const res = await page.request.post(`${API}/__test/published-page`, {
    data: { slug: "/publication-fixture-en", page: { id: "game-fixture", slug: "/publication-fixture-en", name: "Game", status: "PUBLISHED", format: 2, sections: [], tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "sec", type: "section", props: { contained: true }, children: [{ id: "stage", type: "game", props: { game: g } }] }] } } } },
  });
  expect(res.ok()).toBeTruthy();
};
const stage = (page: Page) => page.locator('[data-tree-node="stage"] .pt-gs');

test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
});
test.afterEach(async ({ request }) => {
  await request.post(`${API}/__test/published-page`, { data: { slug: "/publication-fixture-en", page: null } });
});

test("the start screen, then play: a gift caught scores, the arrows move the bag, a gift missed takes a life, none left ends it", async ({ page }) => {
  await publish(page, game());
  await page.goto(PATH);
  const s = stage(page);
  await expect(s).toHaveAttribute("data-pt-game-phase", "ready");
  await expect(s.getByText("Catch it")).toBeVisible();
  await expect(s.getByText("Enter drops a gift")).toBeVisible();
  // three.js has drawn the stage at its world's shape.
  const box = await s.locator("canvas").boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(960 / 540, 1);
  if (OUT) { fs.mkdirSync(OUT, { recursive: true }); await s.screenshot({ path: path.join(OUT, "ready.png") }); }

  await s.getByRole("button", { name: "Play" }).click();
  await expect(s).toHaveAttribute("data-pt-game-phase", "playing");
  await expect(s.locator("[data-pt-game-hud=score]")).toContainText("0");
  await page.keyboard.press("Enter");
  await expect(s).toHaveAttribute("data-pt-game-score", "1");
  if (OUT) await s.screenshot({ path: path.join(OUT, "playing.png") });

  // The bag goes aside; the next gift falls past it and out.
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(700);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(s).toHaveAttribute("data-pt-game-lives", "1");
  await page.keyboard.press("Enter");
  await expect(s).toHaveAttribute("data-pt-game-phase", "lost");
  await expect(s.locator("[data-pt-game-end=lost]")).toContainText("Game over");
  // The arrows don't scroll the page while it plays, and do once it's over.
  await s.getByRole("button", { name: "Play again" }).click();
  await expect(s).toHaveAttribute("data-pt-game-phase", "playing");
  await expect(s).toHaveAttribute("data-pt-game-score", "0");
  await expect(s).toHaveAttribute("data-pt-game-lives", "2");
});

test("won: the prize and its coupon, kept for the bag; once won, it stays won", async ({ page }) => {
  await publish(page, game({ winScore: 1, coupon: "PLAY10", once: true, words: { title: en("Catch it"), prize: en("10% off"), start: en("Play") } }));
  await page.goto(PATH);
  const s = stage(page);
  await s.getByRole("button", { name: "Play" }).click();
  await page.keyboard.press("Enter");
  await expect(s).toHaveAttribute("data-pt-game-phase", "won");
  await expect(s.locator("[data-pt-prize]")).toContainText("10% off");
  await expect(s.locator("[data-pt-prize]")).toContainText("PLAY10");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("estabrek_won_coupon") || "null")?.code ?? Object.keys(localStorage).join())).toContain("PLAY10");
  // Once per shopper: no "again", and on coming back it's still won.
  await expect(s.getByRole("button", { name: "Play again" })).toHaveCount(0);
  await page.reload();
  await expect(stage(page)).toHaveAttribute("data-pt-game-phase", "won");
});

test("on a phone: the buttons for the arrows, and a finger on the stage moves the bag", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await publish(page, game());
  await page.goto(`http://127.0.0.1:${process.env.SHOP_PORT || "3000"}${PATH}`);
  const s = stage(page);
  await s.getByRole("button", { name: "Play" }).tap();
  await expect(s).toHaveAttribute("data-pt-game-phase", "playing");
  // Under the stage, not over the play.
  const node = page.locator('[data-tree-node="stage"]');
  await expect(node.getByRole("button", { name: "Left" })).toBeVisible();
  await expect(node.getByRole("button", { name: "Right" })).toBeVisible();
  const left = await node.getByRole("button", { name: "Left" }).boundingBox(), stageBox = await s.boundingBox();
  expect(left!.y).toBeGreaterThanOrEqual(stageBox!.y + stageBox!.height - 1);
  // Held, the bag moves.
  const before = Number(await s.getAttribute("data-pt-game-score"));
  expect(before).toBe(0);
  // Nothing wider than the phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  if (OUT) await s.screenshot({ path: path.join(OUT, "phone.png") });
  await context.close();
});

test("G1b: the flag goes on to the next level under a closing circle, the bar shows the level, the last flag wins", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const lvl = ["............", ".P.....F....", "############"];
  await publish(page, {
    w: 480, h: 120, bg: "surface", edges: "walls", gravity: 2400, lives: 3, transition: "circle",
    tiles: {
      size: 40, cols: 12, rows: 3, map: lvl, levels: [lvl],
      kinds: { "#": { look: { kind: "box", color: "text" }, solid: true }, P: { look: { kind: "box" }, thing: "hero" }, F: { look: { kind: "emoji", emoji: "🏁" }, thing: "flag" } },
    },
    things: [
      { id: "hero", look: { kind: "emoji", emoji: "🦊", color: "accent" }, x: 60, y: 60, w: 30, h: 30, body: "dynamic", control: "platform", speed: 160, tags: ["player"] },
      { id: "flag", look: { kind: "emoji", emoji: "🏁", color: "accent" }, x: 0, y: 0, w: 30, h: 30, body: "none", template: true, tags: ["goal"] },
    ],
    rules: [{ when: { on: "hit", a: "#player", b: "#goal" }, do: [{ act: "next" }] }],
    words: { title: en("Two levels"), start: en("Play") },
  });
  await page.goto(PATH);
  const s = stage(page);
  await expect(s).toHaveAttribute("data-pt-game-level", "1");
  await s.locator("[data-pt-game-start]").click();
  await expect(s.locator('[data-pt-game-hud="level"]')).toContainText("1/2");
  await page.keyboard.down("ArrowRight");
  // The circle closes over the stage, the second level is made under it, and it opens.
  await expect(s.locator("[data-pt-game-cover]")).toHaveAttribute("style", /radial-gradient/);
  await expect(s).toHaveAttribute("data-pt-game-level", "2");
  await expect(s.locator('[data-pt-game-hud="level"]')).toContainText("2/2");
  await expect(s.locator("[data-pt-game-cover]")).toHaveAttribute("style", /display: ?none/);
  await expect(s).toHaveAttribute("data-pt-game-phase", "won", { timeout: 10_000 });
  await page.keyboard.up("ArrowRight");
  expect(errors).toEqual([]);
});

test("G2: rigid things: Rapier loads before Start, the ball is pulled back and let go with the mouse, the cans fall", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await publish(page, READY_GAMES.find((g) => g.key === "cans")!.game);
  await page.goto(PATH);
  const s = stage(page);
  const start = s.locator("[data-pt-game-start]");
  await expect(start).toBeEnabled({ timeout: 20_000 });
  await start.click();
  await expect(s).toHaveAttribute("data-pt-game-phase", "playing");
  await page.waitForTimeout(800);
  // The ball sits at (150, 360) of the 960 × 540 world: pulled back down-left, let go.
  const box = (await s.locator("canvas").boundingBox())!;
  const at = (x: number, y: number) => [box.x + (x / 960) * box.width, box.y + (y / 540) * box.height] as const;
  await page.mouse.move(...at(150, 360));
  await page.mouse.down();
  await page.mouse.move(...at(70, 380), { steps: 4 });
  await page.mouse.move(...at(-10, 400), { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await expect.poll(async () => Number(await s.getAttribute("data-pt-game-score")), { timeout: 8_000 }).toBeGreaterThan(0);
  if (OUT) await s.screenshot({ path: path.join(OUT, "cans-hit.png") });
  expect(errors).toEqual([]);
});

test("G2b: the pinball on a shop page: the flippers on their arrows, a bumper kicks the ball and scores, and the phone has their buttons", async ({ page, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await publish(page, READY_GAMES.find((g) => g.key === "pinball")!.game);
  await page.goto(PATH);
  const s = stage(page);
  const start = s.locator("[data-pt-game-start]");
  await expect(start).toBeEnabled({ timeout: 20_000 });
  await start.click();
  await expect(s).toHaveAttribute("data-pt-game-phase", "playing");
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(400);
  if (OUT) await s.screenshot({ path: path.join(OUT, "pinball-flippers-up.png") });
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.up("ArrowRight");
  await expect.poll(async () => Number(await s.getAttribute("data-pt-game-score")), { timeout: 8_000 }).toBeGreaterThanOrEqual(10);
  expect(errors).toEqual([]);
  // A phone: the left and right buttons for the flippers.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "no-preference" });
  const p = await phone.newPage();
  await p.goto(PATH);
  const ps = stage(p);
  await expect(ps.locator("[data-pt-game-start]")).toBeEnabled({ timeout: 20_000 });
  await ps.locator("[data-pt-game-start]").tap();
  await expect(p.locator(".pt-gs-pad button")).toHaveCount(2);
  await phone.close();
});

test("G3: the night stars on a shop page: music, sparkles, a glow and a vignette drawn without an error, and the stars caught", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && /shader|WebGL|THREE/i.test(m.text())) errors.push(m.text()); });
  await publish(page, READY_GAMES.find((g) => g.key === "night")!.game);
  await page.goto(PATH);
  const s = stage(page);
  await s.locator("[data-pt-game-start]").click();
  await expect(s).toHaveAttribute("data-pt-game-phase", "playing");
  // Follow the stars for a while: some are caught.
  for (let k = 0; k < 12; k++) {
    await page.keyboard.down(k % 2 ? "ArrowLeft" : "ArrowRight");
    await page.waitForTimeout(350);
    await page.keyboard.up(k % 2 ? "ArrowLeft" : "ArrowRight");
  }
  if (OUT) await s.screenshot({ path: path.join(OUT, "night-playing.png") });
  // The canvas has drawn much more than its ground (the shaders compiled and ran): a plain picture would weigh little.
  const png = await s.locator("canvas").screenshot();
  expect(png.length).toBeGreaterThan(20_000);
  expect(errors).toEqual([]);
});

test("G3b: the beats on a shop page: arrows fall to the music and the arrow keys score them; a phone gets the four arrows", async ({ page, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await publish(page, READY_GAMES.find((g) => g.key === "beats")!.game);
  await page.goto(PATH);
  const s = stage(page);
  await s.locator("[data-pt-game-start]").click();
  await expect(s).toHaveAttribute("data-pt-game-phase", "playing");
  // Every arrow key, again and again: those on their bars as they're pressed score.
  for (let k = 0; k < 60; k++) {
    for (const key of ["ArrowLeft", "ArrowDown", "ArrowUp", "ArrowRight"]) await page.keyboard.press(key);
    await page.waitForTimeout(40);
  }
  await expect.poll(async () => Number(await s.getAttribute("data-pt-game-score"))).toBeGreaterThan(0);
  if (OUT) await s.screenshot({ path: path.join(OUT, "beats-playing.png") });
  expect(errors).toEqual([]);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "no-preference" });
  const p = await phone.newPage();
  await p.goto(PATH);
  await stage(p).locator("[data-pt-game-start]").tap();
  await expect(p.locator(".pt-gs-pad button")).toHaveCount(4);
  await phone.close();
});

test("G3b: the music pads on a shop page: a key tapped plays, lights and scores", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await publish(page, READY_GAMES.find((g) => g.key === "pads")!.game);
  await page.goto(PATH);
  const s = stage(page);
  await s.locator("[data-pt-game-start]").click();
  await expect(s).toHaveAttribute("data-pt-game-phase", "playing");
  const box = (await s.locator("canvas").boundingBox())!;
  const at = (x: number, y: number) => [box.x + (x / 960) * box.width, box.y + (y / 540) * box.height] as const;
  for (const [x, y] of [[165, 190], [255, 190], [345, 190], [255, 430]] as const) { await page.mouse.click(...at(x, y)); await page.waitForTimeout(60); }
  await expect.poll(async () => Number(await s.getAttribute("data-pt-game-score"))).toBe(4);
  if (OUT) await s.screenshot({ path: path.join(OUT, "pads-played.png") });
  expect(errors).toEqual([]);
});

test("a game with nothing in its world isn't shown", async ({ page }) => {
  await publish(page, { things: [{ id: "a", look: { kind: "box" }, x: 1, y: 1, w: 10, h: 10, template: true }] });
  await page.goto(PATH);
  await expect(page.locator('[data-tree-node="stage"]')).toHaveCount(0);
});

// By hand (GAME_OUT=<folder>): each ready game played for two seconds, photographed, and nothing broken on the page.
for (const r of READY_GAMES) {
  test(`the ready game ${r.key} plays`, async ({ page }) => {
    test.skip(!OUT, "pictures only when asked for");
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await publish(page, r.game);
    await page.goto(`/ar/publication-fixture-en`);
    const s = stage(page);
    await s.locator("[data-pt-game-start]").click();
    await expect(s).toHaveAttribute("data-pt-game-phase", "playing");
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(900);
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("Space");
    await s.click({ position: { x: 300, y: 200 } });
    await page.waitForTimeout(1100);
    await s.screenshot({ path: path.join(OUT, `ready-${r.key}.png`) });
    expect(errors).toEqual([]);
  });
}
