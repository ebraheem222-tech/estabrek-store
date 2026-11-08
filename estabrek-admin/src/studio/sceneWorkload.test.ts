import { describe, expect, it } from "vitest";
import { drawScene } from "../../../estabrek-storefront/src/pageTree/sceneCanvas";
import { MORE_SCENE_KINDS, SCENE_KINDS, sceneOf } from "../../../estabrek-storefront/src/pageTree/scene";

function counter() {
  let calls = 0;
  const gradient = { addColorStop: () => { calls++; } };
  const context = new Proxy({}, { get: (_t, key) => () => { calls++; return String(key).startsWith("create") ? gradient : undefined; }, set: () => true });
  return { context: context as CanvasRenderingContext2D, calls: () => calls };
}

describe("drawn section backgrounds", () => {
  it("has forty more distinct kinds after the first nine", () => {
    expect(MORE_SCENE_KINDS).toHaveLength(40);
    expect(new Set(SCENE_KINDS).size).toBe(49);
  });

  it.each([...SCENE_KINDS])("%s keeps a bounded workload on phone, desktop and huge sections", (kind) => {
    for (const [w, h] of [[390, 844], [1440, 900], [12000, 8000]] as const) {
      const c = counter();
      drawScene(c.context, sceneOf({ kind, amount: 100, interactive: true })!, w, h, 3.7, { x: .3, y: .6 }, "#8b5cf6", "#38bdf8");
      expect(c.calls(), `${kind} ${w}x${h}`).toBeGreaterThan(20);
      expect(c.calls(), `${kind} ${w}x${h}`).toBeLessThan(26000);
    }
  });
});
