import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { contrast, remapRose } from "../src/storeThemes/colour";
import { ROSE_COLOURS } from "../src/storeThemes/roseColours.gen";
import { STORE_THEMES } from "../src/storeThemes/registry";
import { CAMERA_DEFAULT, MODEL_KINDS, MODEL_KNOBS, cleanGlb, cleanLive, cleanLook, cleanScene, glbUrl, hrefFor, knobsOf, stageOptionsOf } from "../src/storeThemes/three/kinds";

// Store themes (src/storeThemes): each repaints the whole shop and brings its own home,
// motion and drawings; with none the shop is the rose design exactly as before.
const API = "http://127.0.0.1:4100";
const require = createRequire(import.meta.url);
test.describe.configure({ mode: "serial" });

const setTheme = async (request: APIRequestContext, id: string | null, mode?: "light" | "dark", options?: unknown) => {
  await request.post(`${API}/__test/store-theme`, { data: id ? { id, mode, options } : {} });
  await request.post("/api/revalidate", { data: { tags: ["settings", "cms"] } });
};
const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
};

test.afterAll(async ({ request }) => setTheme(request, null));

/** Where a point of the 3D stage shows on its canvas (a camera at `eye` looking at `target`, `fov` degrees tall). */
function project(p: number[], eye: number[], target: number[], fov: number, box: { x: number; y: number; width: number; height: number }) {
  const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i]);
  const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a: number[]) => a.map((v) => v / Math.hypot(...a));
  const f = norm(sub(target, eye));
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  const d = sub(p, eye);
  const t = Math.tan(((fov / 2) * Math.PI) / 180);
  const nx = dot(d, r) / (dot(d, f) * t * (box.width / box.height));
  const ny = dot(d, u) / (dot(d, f) * t);
  return { x: box.x + box.width / 2 + (nx * box.width) / 2, y: box.y + box.height / 2 - (ny * box.height) / 2 };
}

test.describe("the rose stylesheet becomes themeable", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "src/app/cinematic.css"), "utf8");
  const run = async () => {
    const postcss = require("postcss");
    const tokens = require("../postcss/theme-tokens.cjs");
    return (await postcss([tokens()]).process(css, { from: path.resolve(process.cwd(), "src/app/cinematic.css") })).css as string;
  };

  test("every colour is a variable that falls back to itself, and the list of them is up to date", async () => {
    const out = await run();
    const wraps = [...out.matchAll(/var\(--st-([0-9a-f]{6}),#([0-9a-f]{3}|[0-9a-f]{6})\)/gi)];
    expect(wraps.length).toBeGreaterThan(900);
    for (const [, name, hex] of wraps) {
      const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
      expect(full.toLowerCase()).toBe(name);
    }
    // No colour left outside a variable, none wrapped twice.
    expect(out.replace(/var\(--st-[0-9a-f]{6},#[0-9a-f]{3,6}\)/gi, "").match(/#[0-9a-f]{6}\b/gi) ?? []).toEqual([]);
    expect(out).not.toMatch(/var\(--st-[0-9a-f]{6},var\(/);
    const names = new Set(wraps.map((w) => w[1]));
    for (const n of names) expect(ROSE_COLOURS, `run node scripts/store-theme-colours.cjs (${n})`).toContain(n);
  });

  test("fonts and corners follow the theme, and keep their own values without one", async () => {
    const out = await run();
    expect(out).toContain("var(--st-font-display,");
    expect(out).toContain("var(--st-font-text,");
    expect(out).toMatch(/calc\(\d+px \* var\(--st-round,1\)\)/);
    expect(out).toContain("var(--st-pill,999px)");
  });
});

test("every theme reads well in each of its modes", () => {
  for (const t of STORE_THEMES) {
    for (const mode of ["light", "dark"] as const) {
      const p = t.palettes[mode];
      if (!p) continue;
      const what = `${t.id} ${mode}`;
      expect(contrast(p.ink, p.bg), `${what}: text`).toBeGreaterThanOrEqual(7);
      expect(contrast(p.muted, p.bg), `${what}: quiet text`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.onStrong, p.strong), `${what}: button`).toBeGreaterThanOrEqual(4.5);
      const rose = remapRose(ROSE_COLOURS, p);
      // The rose design's text on its page and on its white cards, repainted.
      expect(contrast(rose["462c3b"], rose["fff8f4"]), `${what}: rose text on the page`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rose["462c3b"], rose["ffffff"]), `${what}: rose text on a card`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rose["7d2448"], rose["fff8f4"]), `${what}: rose links`).toBeGreaterThanOrEqual(3);
    }
  }
});

test("every gaming pack's games bring forward one of its own models", () => {
  const gaming = STORE_THEMES.filter((t) => t.stage);
  expect(gaming.length).toBe(20);
  for (const t of gaming) {
    expect(new Set(t.stage!.models).size, `${t.id}: no model twice`).toBe(t.stage!.models.length);
    for (const g of t.stage!.games) expect(t.stage!.models, `${t.id}: ${g.name.en}`).toContain(g.model);
  }
});

test("with no theme the shop is the rose design, untouched", async ({ page, request }) => {
  await setTheme(request, null);
  const errors = errorsOf(page);
  await page.goto("/");
  await expect(page.locator(".cinematic-home, .rose-opening, [data-cms-section]").first()).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-store-theme", /.+/);
  await expect(page.locator(".th-home")).toHaveCount(0);
  await expect(page.locator("style#store-theme")).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const t of STORE_THEMES) {
  test(`${t.id}: the whole store in the theme, its own home, on a computer and a phone`, async ({ page, request }) => {
    await setTheme(request, t.id);
    const errors = errorsOf(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-store-theme", t.id);
    const home = page.locator(`.th-home[data-th="${t.id}"]`);
    await expect(home).toBeVisible();
    await expect(home.locator(`.th-hero-${t.hero} h1`)).toBeVisible();
    // The entrance starts and the page stops waiting for it.
    await expect(page.locator("html.th-pending")).toHaveCount(0, { timeout: 4000 });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe(await page.evaluate((hex) => {
      const d = document.createElement("div");
      d.style.color = hex;
      document.body.appendChild(d);
      const c = getComputedStyle(d).color;
      d.remove();
      return c;
    }, t.palettes[t.mode]!.bg));
    // The opening's main button reads (its words against its own colour).
    const button = await page.locator(".th-hero a.th-button").first().evaluate((el) => {
      const cs = getComputedStyle(el);
      return [cs.color, cs.backgroundColor];
    });
    const hex = (rgb: string) => "#" + (rgb.match(/\d+/g) ?? []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    expect(contrast(hex(button[0]), hex(button[1])), `${t.id}: the main button's words`).toBeGreaterThanOrEqual(4.5);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("a dark theme turns the product page dark too, and the shopper's colour pick leaves it so", async ({ page, request }) => {
  await setTheme(request, "neon-arcade");
  await page.goto("/");
  const href = await page.locator('a[href^="/p/"]').first().getAttribute("href");
  await page.goto(href!);
  await expect(page.locator(".rose-pdp, .rose-product-page").first()).toBeVisible();
  const lum = () =>
    page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".cinematic-shell") ?? document.body;
      const [r, g, b] = (getComputedStyle(shell).backgroundColor.match(/\d+/g) ?? ["255", "255", "255"]).map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    });
  expect(await lum()).toBeLessThan(0.2);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("storefront-color-selected", { detail: "#f7dbe6" })));
  await page.waitForTimeout(900);
  expect(await lum()).toBeLessThan(0.2);
  expect(await page.evaluate(() => document.documentElement.dataset.storefrontColor ?? null)).toBeNull();
});

test("with reduced motion everything shows at once", async ({ page, request }) => {
  await setTheme(request, "atelier-noir");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html.th-pending")).toHaveCount(0);
  const title = page.locator(".th-hero h1");
  await expect(title).toBeVisible();
  expect(await title.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("the admin's preview: another theme on a page, and the home's own layout through the editor's frame", async ({ page, request }) => {
  await setTheme(request, null);
  await page.goto("/cart?storeTheme=circuit&themeMode=dark");
  await expect(page.locator("html")).toHaveAttribute("data-store-theme", "circuit");
  await expect(page.locator("style#store-theme-preview")).toHaveCount(1);
  // A normal visit forgets it on the next page.
  await page.goto("/cart");
  await expect(page.locator("html")).not.toHaveAttribute("data-store-theme", /.+/);

  await page.goto("/studio-frame?token=good-home&storeTheme=sugar-studio");
  await expect(page.locator('.th-home[data-th="sugar-studio"]')).toBeVisible();
  await setTheme(request, "circuit");
  await page.goto("/studio-frame?token=good-home&storeTheme=rose");
  await expect(page.locator(".th-home")).toHaveCount(0);
});

test("the admin reads the theme list from the shop", async ({ request }) => {
  const res = await request.get("/api/store-themes", { headers: { Origin: "http://127.0.0.1:4100" } });
  expect(res.headers()["access-control-allow-origin"]).toBe("http://127.0.0.1:4100");
  const { themes } = await res.json();
  expect(themes.map((t: { id: string }) => t.id)).toEqual(STORE_THEMES.map((t) => t.id));
  expect(themes[0]).toMatchObject({ name: { ar: expect.any(String), en: expect.any(String), he: expect.any(String) }, swatch: expect.any(Array) });
  const other = await request.get("/api/store-themes", { headers: { Origin: "https://elsewhere.example" } });
  expect(other.headers()["access-control-allow-origin"]).toBeUndefined();
});

test.describe("gaming themes: the 3D stage", () => {
  test("the store's own models and games are checked before use", () => {
    const header = {
      storeThemeOptions: {
        "neon-arcade": {
          models: [{ kind: "wheel", label: "مقود", href: "/c/racing" }, { kind: "spaceship" }, { kind: "mouse", href: "javascript:alert(1)" }],
          games: [{ name: "FIFA 25", color: "#22c55e", href: "/search?q=fifa" }, { name: "No colour" }, { name: "Bad", color: "red" }],
        },
      },
    };
    expect(stageOptionsOf(header, "neon-arcade")).toEqual({
      models: [{ kind: "wheel", label: "مقود", href: "/c/racing" }, { kind: "mouse", label: undefined, href: undefined }],
      games: [{ name: "FIFA 25", color: "#22c55e", href: "/search?q=fifa", imageUrl: undefined, model: undefined }],
    });
    expect(stageOptionsOf(header, "cyber-grid")).toEqual({});
    // A model finds its category by name, else searches for itself.
    expect(hrefFor("headset", [{ name: "سماعات قيمنق", slug: "headsets" }], "سماعات")).toBe("/c/headsets");
    expect(hrefFor("wheel", [{ name: "Other", slug: "other" }], "Wheels")).toBe("/search?q=Wheels");
  });

  test("the shopper picks a model or a game; the store's own choices show", async ({ page, request }) => {
    await setTheme(request, "esports-arena", undefined, {
      models: [{ kind: "wheel", label: "مقود السباق", href: "/c/racing" }, { kind: "controller" }, { kind: "trophy" }],
      games: [{ name: "FIFA 25", color: "#22c55e", href: "/search?q=fifa", model: "controller" }],
    });
    const errors = errorsOf(page);
    await page.goto("/");
    const stage = page.locator('[data-testid="game-stage"]');
    await expect(stage).toBeVisible();
    await expect(page.locator(".th-pick-item")).toHaveText(["مقود السباق", /أيادي التحكم|Controllers/, /بطولات|Tournaments/]);
    await expect(page.locator('[data-testid="stage-model-link"]')).toHaveAttribute("href", "/c/racing");
    await page.locator(".th-pick-item").nth(2).click();
    await expect(stage).toHaveAttribute("data-selected", "trophy");
    await expect(page.locator(".th-pick-item").nth(2)).toHaveAttribute("aria-pressed", "true");
    // A game repaints the stage, brings its model forward and leads to its products.
    await page.locator('[data-testid="stage-game"]', { hasText: "FIFA 25" }).click();
    await expect(stage).toHaveAttribute("data-selected", "controller");
    await expect(page.locator('[data-testid="stage-cta"]')).toHaveAttribute("href", "/search?q=fifa");
    expect(await page.locator(".th-hero-stage").evaluate((el) => el.style.getPropertyValue("--th-game"))).toBe("#22c55e");
    expect(errors).toEqual([]);
  });

  test("a model's look from the scene editor is checked: its own knobs, numbers in range", () => {
    expect(
      cleanLook(
        {
          pos: [9, -1, "x"],
          rot: [10, 720, 0],
          scale: [0, 2, 9],
          shape: { w: 3, h: 0.1, d: 1.2 },
          knobs: { spokes: 9.4, grips: 1.2, rim: 0.7 },
          colours: { body: "#ff0000", glow: "red", screen: "#00ff00", sparkle: "#ffffff" },
          finish: "toy",
          anim: { type: "bounce", speed: 9, amount: -1, trigger: "sideways" },
        },
        "wheel",
      ),
    ).toEqual({
      pos: [6, -1, 0],
      rot: [10, 360, 0],
      scale: [0.1, 2, 4],
      shape: { w: 2.5, h: 0.4, d: 1.2 },
      knobs: { spokes: 6, rim: 0.7 },
      colours: { body: "#ff0000", screen: "#00ff00" },
      finish: "toy",
      anim: { type: "bounce", speed: 5, amount: 0, trigger: "always" },
    });
    // A knob with set choices takes the nearest one; an empty look is no look.
    expect(cleanLook({ knobs: { faces: 9 } }, "dice")).toEqual({ knobs: { faces: 8 } });
    expect(cleanLook({ finish: "glass", anim: { type: "teleport" } }, "dice")).toBeUndefined();
    // Every model has knobs, each default inside its range.
    for (const kind of MODEL_KINDS) {
      expect(MODEL_KNOBS[kind].length).toBeGreaterThan(0);
      for (const k of MODEL_KNOBS[kind]) expect(k.def >= k.min && k.def <= k.max && (!k.values || k.values.includes(k.def))).toBe(true);
      expect(Object.keys(knobsOf(kind))).toEqual(MODEL_KNOBS[kind].map((k) => k.id));
    }
    // The saved choices keep the looks; the admin's live draft is checked the same way.
    expect(stageOptionsOf({ storeThemeOptions: { x: { models: [{ kind: "coin", look: { knobs: { sides: 3 } } }] } } }, "x").models).toEqual([{ kind: "coin", label: undefined, href: undefined, look: { knobs: { sides: 3 } } }]);
    expect(cleanLive({ themeId: "x", models: [{ kind: "coin" }, { kind: "dice" }], edit: { index: 7, mode: "spin" }, ack: 4 })).toMatchObject({ edit: { index: 1, mode: "translate", play: true, snap: false }, ack: 4 });
    expect(cleanLive({ themeId: "x", models: [{ kind: "spaceship" }] })).toBeNull();
  });

  test("the scene editor: the admin's draft draws live in the frame, and picks and handle moves come back", async ({ page, request }) => {
    test.setTimeout(120_000);
    await setTheme(request, "neon-arcade");
    const errors = errorsOf(page);
    const msgs = () => page.evaluate(() => (window as any).__msgs as Array<{ origin: string; data: any }>);
    const send = (m: unknown) => page.evaluate((x) => (window as any).send(x), m);
    const openFrame = async () => {
      await page.goto(`http://127.0.0.1:4100/__studio-harness?src=${encodeURIComponent("/studio-frame?token=good-home&storeTheme=neon-arcade")}`);
      await expect.poll(async () => (await msgs()).some((m) => m.data.type === "stageHello" && m.data.themeId === "neon-arcade"), { timeout: 60_000 }).toBe(true);
    };
    await openFrame();
    const scene = (index: number, mode = "translate") => ({
      type: "stageScene",
      themeId: "neon-arcade",
      models: [
        { kind: "wheel", label: "مقود", look: { anim: { type: "spin", speed: 2, amount: 1, trigger: "always" }, knobs: { spokes: 5 } } },
        { kind: "dice", look: { knobs: { faces: 6 }, colours: { body: "#ff3366" }, finish: "toy" } },
        { kind: "controller" },
      ],
      games: [{ name: "FIFA 25", color: "#22c55e", model: "controller" }],
      edit: { index, mode, play: false, snap: false },
      ack: 0,
    });
    await send(scene(1));
    const frame = page.frameLocator("#f");
    const stage = frame.locator('[data-testid="game-stage"]');
    await expect(stage).toHaveAttribute("data-editing", "1");
    await expect(stage).toHaveAttribute("data-selected", "dice");
    await expect(frame.locator(".th-pick-item")).toHaveText(["مقود", /ألعاب طاولة|Board games/, /أيادي التحكم|Controllers/]);
    await expect(frame.locator('[data-testid="stage-game"]')).toHaveText(["FIFA 25"]);
    // A model picked in the frame is told to the admin, which then edits it.
    await frame.locator(".th-pick-item").first().click();
    await expect.poll(async () => (await msgs()).filter((m) => m.data.type === "stagePick").at(-1)?.data.index).toBe(0);
    await send(scene(0, "rotate"));
    await expect(stage).toHaveAttribute("data-selected", "wheel");
    await expect(stage).toHaveAttribute("data-edit-mode", "rotate");

    // The move handle, on a fresh frame told once which model to edit: dragged from its
    // centre, the model goes right and the move comes back.
    await openFrame();
    await send(scene(1));
    await expect(stage).toHaveAttribute("data-ready", "1", { timeout: 60_000 });
    await expect(stage).toHaveAttribute("data-selected", "dice");
    await page.waitForTimeout(2500);
    const box = (await frame.locator(".th-stage-canvas canvas").boundingBox())!;
    // The picked model of the orbit stands at (0, 0.1, 0); the camera at (0, 0.4, 8), 38° tall, looks at the middle.
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2 - 0.0361 * (box.height / 2);
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let k = 1; k <= 8; k++) await page.mouse.move(x + k * 15, y, { steps: 2 });
    await page.mouse.up();
    await expect.poll(async () => (await msgs()).filter((m) => m.data.type === "stageTransform" && m.data.final).length, { timeout: 10_000 }).toBeGreaterThan(0);
    const moved = (await msgs()).filter((m) => m.data.type === "stageTransform" && m.data.final).at(-1)!.data;
    expect(moved).toMatchObject({ index: 1, rot: [0, 0, 0], scale: [1, 1, 1] });
    expect(moved.pos[0]).toBeGreaterThan(0.3);
    expect(Math.abs(moved.pos[1])).toBeLessThan(0.4);
    expect(moved.seq).toBeGreaterThan(0);
    // Letting go of a handle is not a pick.
    expect((await msgs()).filter((m) => m.data.type === "stagePick").length).toBe(0);
    expect(errors).toEqual([]);
  });

  test("the whole stage's settings, a scroll path and a model's own file are checked too", () => {
    expect(
      cleanScene({ layout: "podium", floor: "lava", floorColour: "#123456", floorGlow: false, camera: { fov: 200, distance: 10, orbit: "fast" }, lights: { ambient: 9, keyAngle: -90, halos: false, colours: ["#ff0000", "#00ff00"] }, extra: 1 }),
    ).toEqual({
      layout: "podium",
      floorColour: "#123456",
      floorGlow: false,
      camera: { ...CAMERA_DEFAULT, fov: 70, distance: 10 },
      lights: { ambient: 3, key: 2, keyAngle: -90, rim: 30, env: 1, halos: false, colours: ["#ff0000", "#00ff00"] },
    });
    expect(cleanScene({ layout: "spiral" })).toBeUndefined();
    expect(cleanLook({ path: { pos: [9, 0, 0], ease: "bouncy" } }, "coin")).toEqual({ path: { pos: [6, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], ease: "smooth" } });
    // A model's own file: https anywhere, plain http only on this computer (not in production).
    expect(glbUrl("https://res.cloudinary.com/x/raw/upload/v1/estabrek/models/a.glb")).toBeTruthy();
    expect(glbUrl("http://127.0.0.1:4100/uploads/models/a.glb")).toBeTruthy();
    for (const bad of ["http://evil.example/a.glb", "javascript:alert(1)", "https://x.example/a b.glb", "//x.example/a.glb", "https://x" + "y".repeat(600)]) expect(glbUrl(bad)).toBeUndefined();
    expect(cleanGlb({ url: "https://cdn.example/m.glb", name: "Robot", clip: "Walk", extra: 1 })).toEqual({ url: "https://cdn.example/m.glb", name: "Robot", clip: "Walk" });
    expect(cleanGlb({ url: "ftp://cdn.example/m.glb" })).toBeUndefined();
    expect(cleanLive({ themeId: "x", models: [{ kind: "coin" }], edit: { index: 0, key: "end", preview: 4 } })?.edit).toMatchObject({ key: "end", preview: 1 });
  });

  test("the scene editor: the store's stage settings, a model's own GLB, and a path's end moved by the handle", async ({ page, request }) => {
    test.setTimeout(120_000);
    await setTheme(request, "neon-arcade");
    const errors = errorsOf(page);
    const msgs = () => page.evaluate(() => (window as any).__msgs as Array<{ origin: string; data: any }>);
    await page.goto(`http://127.0.0.1:4100/__studio-harness?src=${encodeURIComponent("/studio-frame?token=good-home&storeTheme=neon-arcade")}`);
    await expect.poll(async () => (await msgs()).some((m) => m.data.type === "stageHello"), { timeout: 60_000 }).toBe(true);
    await page.evaluate((m) => (window as any).send(m), {
      type: "stageScene",
      themeId: "neon-arcade",
      models: [
        { kind: "controller", glb: { url: "http://127.0.0.1:4100/uploads/models/stage-box.glb", name: "Box", clip: "spin" } },
        { kind: "dice", look: { path: { pos: [1, 0, 0], rot: [0, 0, 0], scale: [1, 1, 1], ease: "linear" } } },
        { kind: "trophy" },
      ],
      scene: { layout: "podium", floor: "stage", floorGlow: false, lights: { ambient: 1, key: 3, keyAngle: -40, rim: 20, env: 1.5, halos: false } },
      edit: { index: 1, mode: "translate", play: false, snap: false, key: "end", preview: 1 },
      ack: 0,
    });
    const frame = page.frameLocator("#f");
    const stage = frame.locator('[data-testid="game-stage"]');
    await expect(stage).toHaveAttribute("data-layout", "podium");
    await expect(stage).toHaveAttribute("data-floor", "stage");
    await expect(stage).toHaveAttribute("data-selected", "dice");
    await expect(stage).toHaveAttribute("data-ready", "1", { timeout: 60_000 });
    // The store's own file opens in the stage and says what it holds.
    await expect.poll(async () => (await msgs()).find((m) => m.data.type === "stageGlb")?.data, { timeout: 30_000 }).toMatchObject({ index: 0, url: "http://127.0.0.1:4100/uploads/models/stage-box.glb", clips: ["spin"] });
    expect((await msgs()).find((m) => m.data.type === "stageGlb")!.data.error).toBeUndefined();

    // At the end of the scroll (the editor's preview) the dice stands 1 to the right of the
    // podium's top (0, 0.55, 0); the camera has pulled back to z 9.5 and down to y -0.8,
    // looking at (0, -0.6, 0). Its handle there moves the path's end.
    await page.waitForTimeout(3000);
    const box = (await frame.locator(".th-stage-canvas canvas").boundingBox())!;
    const at = project([1, 0.55, 0], [0, -0.8, 9.5], [0, -0.6, 0], 38, box);
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    for (let k = 1; k <= 8; k++) await page.mouse.move(at.x + k * 12, at.y, { steps: 2 });
    await page.mouse.up();
    await expect.poll(async () => (await msgs()).filter((m) => m.data.type === "stageTransform" && m.data.final).length, { timeout: 10_000 }).toBeGreaterThan(0);
    const moved = (await msgs()).filter((m) => m.data.type === "stageTransform" && m.data.final).at(-1)!.data;
    expect(moved).toMatchObject({ index: 1, key: "end" });
    expect(moved.pos[0]).toBeGreaterThan(1.3);
    expect(errors).toEqual([]);
  });

  test("the 3D draws in the page (WebGL) and the drawing gives way to it", async ({ page, request }) => {
    await setTheme(request, "neon-arcade");
    await page.goto("/");
    await expect(page.locator('[data-testid="game-stage"][data-ready="1"]')).toBeVisible({ timeout: 45000 });
    await expect(page.locator(".th-stage-canvas canvas")).toHaveCount(1);
  });
});
