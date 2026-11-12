import { expect, test } from "@playwright/test";
// Loaded before the stand-ins below exist (imports run first): the animation library starts itself only in a page.
import { themeFollower } from "../src/lib/themeTween";

/*
 * Two scenes handing the header over (lib/themeTween.ts): the one leaving glides the header back to the page's
 * colours while the next one glides it to its own. Both wrote the header on every frame and the last to finish
 * cleared it, so entering the seasons or the collection worlds the header flickered between colours (back to the
 * page's colour for a frame, then on) before it settled. Now the scene that took the colours last has the header.
 * Run without a browser: a few stand-ins for the page (style, frames, timers).
 */
type Style = { setProperty(n: string, v: string): void; getPropertyValue(n: string): string; removeProperty(n: string): void };
type Fake = { style: Style; dataset: Record<string, string>; parent?: Fake; ownerDocument: unknown };

const frames = new Map<number, (t: number) => void>();
let nextFrame = 1;
let clock = 1000;
const g = globalThis as unknown as Record<string, unknown>;
const doc = { documentElement: { dataset: {} as Record<string, string>, hasAttribute: () => false } };
const standIns: Record<string, unknown> = {
  window: globalThis,
  document: doc,
  location: { search: "" },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb: (t: number) => void) => { const id = nextFrame++; frames.set(id, cb); return id; },
  cancelAnimationFrame: (id: number) => { frames.delete(id); },
  getComputedStyle: (el: Fake) => ({
    getPropertyValue: (name: string) => {
      for (let x: Fake | undefined = el; x; x = x.parent) { const v = x.style.getPropertyValue(name); if (v) return v; }
      return "";
    },
  }),
};
// Only for these tests: the main suite runs other files in the same process after them.
const before = new Map<string, PropertyDescriptor | undefined>();
test.beforeAll(() => {
  for (const [name, value] of Object.entries(standIns)) {
    before.set(name, Object.getOwnPropertyDescriptor(g, name));
    Object.defineProperty(g, name, { value, configurable: true, writable: true });
  }
});
test.afterAll(() => {
  for (const [name, was] of before) {
    if (was) Object.defineProperty(g, name, was);
    else delete g[name];
  }
});
const runFrames = (n: number) => {
  for (let i = 0; i < n; i++) {
    clock += 16;
    const due = [...frames.entries()];
    frames.clear();
    due.forEach(([, cb]) => cb(clock));
  }
};
const fake = (parent?: Fake): Fake => {
  const m = new Map<string, string>();
  return { parent, dataset: {}, ownerDocument: doc, style: { setProperty: (n, v) => void m.set(n, v), getPropertyValue: (n) => m.get(n) ?? "", removeProperty: (n) => void m.delete(n) } };
};
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const far = (a: string, b: string) => rgb(a).reduce((sum, c, i) => sum + Math.abs(c - rgb(b)[i]), 0);

test("a scene taking the header from one handing it back: one smooth glide, no flash of the page's colour, kept after", async () => {
  const PAGE = "#47284b", LAST = "#9b6b4e", NEXT = "#c4a266";
  const shell = fake();
  shell.style.setProperty("--navbar-bg", PAGE);
  const header = fake(shell);
  const el = (x: Fake) => x as unknown as HTMLElement;
  const leaving = themeFollower(el(shell), { local: () => [el(header)] });
  leaving.to({ "--navbar-bg": LAST }, 0.35);
  runFrames(200);
  expect(header.style.getPropertyValue("--navbar-bg")).toBe(LAST);

  // The next scene takes the colours while the last one hands them back.
  const next = themeFollower(el(shell), { local: () => [el(header)] });
  let released = false;
  leaving.release(0.8, () => { released = true; });
  next.to({ "--navbar-bg": NEXT }, 0.8);
  const seen: string[] = [];
  for (let i = 0; i < 300; i++) {
    runFrames(1);
    const v = header.style.getPropertyValue("--navbar-bg");
    if (v && v !== seen[seen.length - 1]) seen.push(v);
    // Never cleared (the page's colour showing for a frame).
    expect(v).not.toBe("");
  }
  expect(released).toBe(true);
  expect(seen[seen.length - 1]).toBe(NEXT);
  // Every step gets closer to the next scene's colour: no going back towards the page's or the last scene's.
  for (let i = 1; i < seen.length; i++) expect(far(seen[i], NEXT)).toBeLessThanOrEqual(far(seen[i - 1], NEXT));
  // The header never showed the page's own colour on the way.
  expect(Math.min(...seen.map((v) => far(v, PAGE)))).toBeGreaterThan(far(LAST, PAGE) - 5);

  // The scene that has it hands it back: the header goes back to the page's colours and lets go.
  let back = false;
  next.release(0.8, () => { back = true; });
  runFrames(400);
  expect(back).toBe(true);
  expect(header.style.getPropertyValue("--navbar-bg")).toBe("");
});

test("a scene handing its colours back with a glide (to …, back) doesn't take the header from the next one", async () => {
  const shell = fake();
  shell.style.setProperty("--navbar-bg", "#47284b");
  const header = fake(shell);
  const el = (x: Fake) => x as unknown as HTMLElement;
  const a = themeFollower(el(shell), { local: () => [el(header)] });
  a.to({ "--navbar-bg": "#3e4877" }, 0.35);
  runFrames(150);
  const b = themeFollower(el(shell), { local: () => [el(header)] });
  b.to({ "--navbar-bg": "#e9a27c" }, 0.35);
  a.to({ "--navbar-bg": "#47284b" }, 0.8, { back: true });
  runFrames(300);
  expect(header.style.getPropertyValue("--navbar-bg")).toBe("#e9a27c");
});
