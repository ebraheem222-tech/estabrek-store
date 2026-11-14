import { expect, test } from "@playwright/test";
import { HIT_WITH, hitMatches } from "../src/pageTree/physics";
import { TRIGGER_EVENTS, triggersOf } from "../src/pageTree/pieces";

// A hit in a physics world as a trigger (pageTree/physics.ts hitMatches, pieces.ts triggersOf).

const link = (href: unknown) => (typeof href === "string" ? href : null);
const say = (words: unknown) => (words && typeof words === "object" ? String((words as { en?: string }).en ?? "") : "");
const step = [{ act: "vibrate" }];

test("what a hit recipe waits for: anything, another body, the floor or a wall, or one element", () => {
  // Anything (said or unsaid): another body or a wall.
  for (const want of [undefined, "any"]) {
    expect(hitMatches(want, "ball")).toBe(true);
    expect(hitMatches(want, null)).toBe(true);
  }
  // Another body only; the floor or a wall only (null = no other body).
  expect(hitMatches("body", "ball")).toBe(true);
  expect(hitMatches("body", null)).toBe(false);
  expect(hitMatches("wall", null)).toBe(true);
  expect(hitMatches("wall", "ball")).toBe(false);
  // One element by its id.
  expect(hitMatches("block", "block")).toBe(true);
  expect(hitMatches("block", "ball")).toBe(false);
  expect(hitMatches("block", null)).toBe(false);
  for (const ok of ["any", "body", "wall", "n-1a2b", "card_3"]) expect(HIT_WITH.test(ok), ok).toBe(true);
  for (const bad of ["", "the floor", "a.b", "x".repeat(41)]) expect(HIT_WITH.test(bad), bad).toBe(false);
});

test("a hit trigger is read with what it waits for; other triggers carry none", () => {
  expect(TRIGGER_EVENTS).toContain("hit");
  const [plain] = triggersOf([{ on: "hit", do: step }], link, say);
  expect(plain).toMatchObject({ on: "hit", hit: "any", once: false });
  expect(triggersOf([{ on: "hit", hit: "wall", once: true, do: step }], link, say)[0]).toMatchObject({ on: "hit", hit: "wall", once: true });
  expect(triggersOf([{ on: "hit", hit: "block-2", do: step }], link, say)[0].hit).toBe("block-2");
  // Not something to hit: it waits for anything rather than nothing.
  expect(triggersOf([{ on: "hit", hit: "the floor!", do: step }], link, say)[0].hit).toBe("any");
  // Only a hit has it.
  expect(triggersOf([{ on: "click", hit: "wall", do: step }], link, say)[0].hit).toBeUndefined();
});
