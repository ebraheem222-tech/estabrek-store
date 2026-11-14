// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";
import { contrast, hexToLch } from "../../../shared/colour";
import { backdropOf, dominantColours, paletteRoles, subjectPoint } from "../../../shared/pictureSense";
import { PictureColoursCard } from "./PictureColours";
import { MediaStylePanel } from "./StylePanels";
import { starterTokens } from "./tokenSets";
import { coloursToAdd, VARIABLE_LIMITS } from "./variableMaths";

// What a picture's pixels say (shared/pictureSense.ts): its colours, the roles a page makes of them, its subject.

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});
type Paint = (x: number, y: number) => [number, number, number, number?];
/** A picture made of a rule: RGBA pixels, `w`×`h`. */
function picture(w: number, h: number, paint: Paint) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b, a = 255] = paint(x, y);
    px.set([r, g, b, a], (y * w + x) * 4);
  }
  return px;
}
const WHITE: [number, number, number] = [255, 255, 255], NAVY: [number, number, number] = [27, 42, 92], ORANGE: [number, number, number] = [242, 140, 40], RED: [number, number, number] = [200, 40, 40];
/** White, navy and orange as a picture's colours. */
const pictureOf3 = () => [{ hex: "#ffffff", share: 0.6 }, { hex: "#1b2a5c", share: 0.3 }, { hex: "#f28c28", share: 0.1 }];
/** How far apart two colours look (OKLCH lightness, and both chroma and hue through a and b). */
const apart = (a: string, b: string) => {
  const [p, q] = [hexToLch(a)!, hexToLch(b)!];
  const ab = (c: typeof p) => [c.C * Math.cos((c.h * Math.PI) / 180), c.C * Math.sin((c.h * Math.PI) / 180)];
  return Math.hypot(p.L - q.L, ab(p)[0] - ab(q)[0], ab(p)[1] - ab(q)[1]);
};

test("a picture's main colours come biggest first, each with its share", () => {
  // Six tenths white, three navy, one orange.
  const px = picture(100, 60, (x) => (x < 60 ? WHITE : x < 90 ? NAVY : ORANGE));
  const found = dominantColours(px, 100, 60);
  expect(found.map((c) => c.share)).toEqual([0.6, 0.3, 0.1]);
  expect(apart(found[0].hex, "#ffffff")).toBeLessThan(0.01);
  expect(apart(found[1].hex, "#1b2a5c")).toBeLessThan(0.01);
  expect(apart(found[2].hex, "#f28c28")).toBeLessThan(0.01);
  for (const c of found) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
  // No more than asked for.
  expect(dominantColours(px, 100, 60, 2).map((c) => c.share)).toEqual([0.6, 0.3]);
  // Shades the eye takes for one colour are one; a speck is no colour of the picture.
  const shades = picture(100, 60, (x, y) => (x === 0 && y < 3 ? ORANGE : x < 50 ? [250, 250, 250] : [244, 246, 248]));
  expect(dominantColours(shades, 100, 60)).toHaveLength(1);
  // A soft blend from one colour to another still gives a few colours, not a hundred.
  const blend = picture(120, 40, (x) => [Math.round((x / 119) * 255), 60, Math.round(255 - (x / 119) * 255)]);
  const few = dominantColours(blend, 120, 40);
  expect(few.length).toBeGreaterThanOrEqual(3);
  expect(few.length).toBeLessThanOrEqual(6);
  expect(Math.round(few.reduce((n, c) => n + c.share, 0) * 100)).toBeGreaterThanOrEqual(95);
  // A cut-out: the see-through surround isn't a colour. Nothing to read: nothing found.
  const cut = picture(40, 40, (x, y) => (x > 10 && x < 30 && y > 10 && y < 30 ? [...RED, 255] : [0, 0, 0, 0]) as [number, number, number, number]);
  expect(dominantColours(cut, 40, 40).map((c) => c.share)).toEqual([1]);
  expect(apart(dominantColours(cut, 40, 40)[0].hex, "#c82828")).toBeLessThan(0.01);
  expect(dominantColours(picture(10, 10, () => [0, 0, 0, 0]), 10, 10)).toEqual([]);
  expect(dominantColours(new Uint8ClampedArray(8), 10, 10)).toEqual([]);
});

test("a page's ground, ink and accent are made of the picture's colours", () => {
  const roles = paletteRoles(dominantColours(picture(100, 60, (x) => (x < 60 ? WHITE : x < 90 ? NAVY : ORANGE)), 100, 60))!;
  expect(apart(roles.ground, "#ffffff")).toBeLessThan(0.01);
  expect(apart(roles.ink, "#1b2a5c")).toBeLessThan(0.01);
  expect(apart(roles.accent, "#f28c28")).toBeLessThan(0.01);
  // A pale picture: its darkest colour wouldn't read on its lightest, so the ink is taken darker until it does.
  const pale = paletteRoles([{ hex: "#fafafa", share: 0.7 }, { hex: "#d9c7c2", share: 0.3 }])!;
  expect(pale.ground).toBe("#fafafa");
  expect(contrast(pale.ink, pale.ground)!).toBeGreaterThanOrEqual(4.5);
  expect(hexToLch(pale.ink)!.L).toBeLessThan(hexToLch("#d9c7c2")!.L);
  // A vivid speck is the accent but never the ground; one colour alone is all three roles' start.
  const speck = paletteRoles([{ hex: "#20242c", share: 0.8 }, { hex: "#e8e2d6", share: 0.17 }, { hex: "#ffe14a", share: 0.03 }])!;
  expect(speck.ground).toBe("#e8e2d6");
  expect(speck.accent).toBe("#ffe14a");
  expect(speck.ink).toBe("#20242c");
  const one = paletteRoles([{ hex: "#336699", share: 1 }])!;
  expect(one.ground).toBe("#336699");
  expect(contrast(one.ink, one.ground)!).toBeGreaterThanOrEqual(4.5);
  expect(paletteRoles([])).toBeNull();
  // A soft backdrop. A light picture: its light ground, with its other colours over it and its own ink.
  const light = paletteRoles(pictureOf3())!;
  expect(backdropOf(pictureOf3(), light)).toEqual({ bg: light.ground, ink: light.ink, mesh: ["#1b2a5c", "#f28c28"] });
  // A picture that is mostly a deep colour: that colour is the ground, the others glow over it (four at most),
  // and the words are what reads on it.
  const six = [{ hex: "#814a47", share: 0.26 }, { hex: "#e5bba9", share: 0.18 }, { hex: "#c89d8f", share: 0.15 }, { hex: "#9f655f", share: 0.12 }, { hex: "#b68079", share: 0.12 }, { hex: "#f0d6c5", share: 0.07 }];
  expect(paletteRoles(six)!.ground).toBe("#f0d6c5");
  const deep = backdropOf(six, paletteRoles(six))!;
  expect(deep).toEqual({ bg: "#814a47", ink: "#ffffff", mesh: ["#e5bba9", "#c89d8f", "#9f655f", "#b68079"] });
  expect(contrast(deep.ink, deep.bg)!).toBeGreaterThanOrEqual(4.5);
  // Three colours, mostly deep: the light one is one of the glows.
  expect(backdropOf([{ hex: "#20242c", share: 0.7 }, { hex: "#e8e2d6", share: 0.2 }, { hex: "#c0392b", share: 0.1 }], { ground: "#e8e2d6", ink: "#20242c", accent: "#c0392b" })).toEqual({ bg: "#20242c", ink: "#ffffff", mesh: ["#c0392b", "#e8e2d6"] });
  // Too few colours besides the ground, or none read: no backdrop.
  expect(backdropOf([{ hex: "#fafafa", share: 0.7 }, { hex: "#d9c7c2", share: 0.3 }], pale)).toBeNull();
  expect(backdropOf(pictureOf3(), null)).toBeNull();
  expect(backdropOf([], null)).toBeNull();
});

test("a picture's subject is found where it stands out from its surround", () => {
  // A red disc bottom right on white: the point is on the disc.
  const disc = picture(120, 80, (x, y) => (Math.hypot(x - 90, y - 55) < 14 ? RED : WHITE));
  const at = subjectPoint(disc, 120, 80)!;
  expect(Math.abs(at.x - 75)).toBeLessThanOrEqual(3);
  expect(Math.abs(at.y - 69)).toBeLessThanOrEqual(3);
  // Top left as well.
  const corner = subjectPoint(picture(120, 80, (x, y) => (Math.hypot(x - 25, y - 20) < 12 ? NAVY : WHITE)), 120, 80)!;
  expect(Math.abs(corner.x - 21)).toBeLessThanOrEqual(3);
  expect(Math.abs(corner.y - 25)).toBeLessThanOrEqual(3);
  // A cut-out: what isn't see-through is the subject.
  const cut = subjectPoint(picture(100, 100, (x, y) => (x >= 60 && x < 90 && y >= 10 && y < 40 ? [...RED, 255] : [0, 0, 0, 0]) as [number, number, number, number]), 100, 100)!;
  expect(Math.abs(cut.x - 75)).toBeLessThanOrEqual(3);
  expect(Math.abs(cut.y - 25)).toBeLessThanOrEqual(3);
  // Nothing stands out: one flat colour, a pattern all over, a picture too small to tell.
  expect(subjectPoint(picture(80, 60, () => [120, 130, 140]), 80, 60)).toBeNull();
  expect(subjectPoint(picture(96, 96, (x, y) => ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? [20, 20, 20] : [240, 240, 240])), 96, 96)).toBeNull();
  expect(subjectPoint(picture(4, 4, () => RED), 4, 4)).toBeNull();
});

test("a picture's colours become variables: the new ones only, as many as there is room for", () => {
  const tokens = starterTokens([]);
  const name = (i: number) => ({ en: `From the picture ${i + 1}` });
  const add = coloursToAdd(tokens, ["#102030", "#FBF7F4", "#aabbcc", "#102030", "not a colour"], name);
  // The store's own paper (#fbf7f4) is there already; a colour comes once.
  expect(add).toEqual([{ id: "photo", name: { en: "From the picture 1" }, value: "#102030" }, { id: "photo-2", name: { en: "From the picture 2" }, value: "#aabbcc" }]);
  // Added once: a second press finds nothing new, and the ids go on from where they were.
  const after = { ...tokens, colors: [...tokens.colors, ...add] };
  expect(coloursToAdd(after, ["#102030", "#aabbcc"], name)).toEqual([]);
  expect(coloursToAdd(after, ["#445566"], name).map((c) => c.id)).toEqual(["photo-3"]);
  // Little room: the first ones that fit; none: nothing.
  const filler = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${i}`, value: "#123456" }));
  expect(coloursToAdd({ ...tokens, colors: filler(VARIABLE_LIMITS.colors - 1) }, ["#102030", "#aabbcc"], name).map((c) => c.value)).toEqual(["#102030"]);
  expect(coloursToAdd({ ...tokens, colors: filler(VARIABLE_LIMITS.colors) }, ["#102030"], name)).toEqual([]);
});

test("the card shows the colours and what a page makes of them, and passes on what is pressed", () => {
  setLangForTests("en");
  const look = { nodeId: "p", colours: [{ hex: "#f4efe6", share: 0.9 }, { hex: "#c0392b", share: 0.08 }, { hex: "#1f2a5a", share: 0.02 }], roles: { ground: "#f4efe6", ink: "#1f2a5a", accent: "#c0392b" } };
  const [onAdd, onDress, onClose] = [vi.fn(), vi.fn(), vi.fn()];
  const view = render(<PictureColoursCard look={look} busy={false} room={2} partName="Hero part" onAdd={onAdd} onDress={onDress} onClose={onClose} />);
  expect(screen.getAllByTestId("studio-picture-colour").map((el) => [el.dataset.hex, el.textContent])).toEqual([["#f4efe6", "#f4efe690%"], ["#c0392b", "#c0392b8%"], ["#1f2a5a", "#1f2a5a2%"]]);
  const roles = screen.getByTestId("studio-picture-roles");
  expect([roles.dataset.ground, roles.dataset.ink, roles.dataset.accent]).toEqual(["#f4efe6", "#1f2a5a", "#c0392b"]);
  expect(screen.getByTestId("studio-picture-add").textContent).toContain("+2");
  expect(screen.getByTestId("studio-picture-dress").textContent).toContain("«Hero part»");
  fireEvent.click(screen.getByTestId("studio-picture-add"));
  fireEvent.click(screen.getByTestId("studio-picture-dress"));
  fireEvent.click(screen.getByTestId("studio-picture-close"));
  expect([onAdd, onDress, onClose].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  // A moving backdrop is offered when there is one to make.
  expect(screen.queryByTestId("studio-picture-backdrop")).toBeNull();
  const onBackdrop = vi.fn();
  view.rerender(<PictureColoursCard look={look} busy={false} room={2} partName="Hero part" onAdd={onAdd} onDress={onDress} onBackdrop={onBackdrop} onClose={onClose} />);
  fireEvent.click(screen.getByTestId("studio-picture-backdrop"));
  expect(onBackdrop).toHaveBeenCalledTimes(1);
  // Nothing new to add: the button waits and the card says why; no part, no roles: nothing to dress.
  view.rerender(<PictureColoursCard look={{ ...look, roles: null }} busy={false} room={0} onAdd={onAdd} onDress={onDress} onClose={onClose} />);
  expect((screen.getByTestId("studio-picture-add") as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByTestId("studio-picture-colours").textContent).toContain("already variables");
  expect(screen.queryByTestId("studio-picture-dress")).toBeNull();
  expect(screen.queryByTestId("studio-picture-roles")).toBeNull();
});

test("a picture's frame offers to find its subject; a video's doesn't", () => {
  setLangForTests("en");
  const find = vi.fn();
  const wrap = (node: PageTreeNode, onFindSubject?: () => void) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}><MediaStylePanel node={node} screen="base" busy={false} onOps={() => {}} onFindSubject={onFindSubject} /></QueryClientProvider>;
  const view = render(wrap({ id: "p", type: "image", props: { src: "/a.webp" } } as PageTreeNode, find));
  fireEvent.click(screen.getByTestId("studio-media-find-subject"));
  expect(find).toHaveBeenCalledTimes(1);
  view.rerender(wrap({ id: "v", type: "video", props: { src: "/a.mp4" } } as PageTreeNode));
  expect(screen.queryByTestId("studio-media-find-subject")).toBeNull();
});
