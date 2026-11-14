import { expect, test } from "@playwright/test";
import { groundOf, hexOf, over, parseColour } from "../src/pageTree/studioInk";

// What an element's words are drawn in and on, for the editor's contrast note (pageTree/studioInk.ts): reading
// the colours a browser computes and putting see-through ones over what is under them.

test("a computed colour is read: rgb, rgba, the newer spelling, and see-through", () => {
  expect(parseColour("rgb(200, 107, 152)")).toEqual({ r: 200, g: 107, b: 152, a: 1 });
  expect(parseColour("rgba(29, 26, 31, 0.5)")).toEqual({ r: 29, g: 26, b: 31, a: 0.5 });
  expect(parseColour("rgb(29 26 31 / 50%)")).toEqual({ r: 29, g: 26, b: 31, a: 0.5 });
  expect(parseColour("rgba(0, 0, 0, 0)")).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  expect(parseColour("transparent")).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  for (const other of ["oklch(0.7 0.1 200)", "color(srgb 0.5 0.5 0.5)", "#c86b98", "red", "", "rgb(300, 0, 0)"]) expect(parseColour(other), other).toBeNull();
});

test("a see-through colour over an opaque one is what the screen shows", () => {
  const white = { r: 255, g: 255, b: 255, a: 1 }, black = { r: 0, g: 0, b: 0, a: 1 };
  expect(hexOf(over({ ...black, a: 0.5 }, white))).toBe("#808080");
  expect(hexOf(over({ r: 200, g: 107, b: 152, a: 1 }, white))).toBe("#c86b98");
  expect(hexOf(over({ r: 200, g: 107, b: 152, a: 0 }, black))).toBe("#000000");
  expect(hexOf({ r: 251.4, g: 246.6, b: 244, a: 1 })).toBe("#fbf7f4");
});

test("the ground under an element: its layers from the nearest outwards, over the page's own white", () => {
  // Nothing coloured anywhere: the page's white.
  expect(hexOf(groundOf([]))).toBe("#ffffff");
  // One opaque colour.
  expect(hexOf(groundOf([{ r: 29, g: 26, b: 31, a: 1 }]))).toBe("#1d1a1f");
  // A half see-through black card on a white section: grey.
  expect(hexOf(groundOf([{ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 }]))).toBe("#808080");
  // See-through layers with nothing opaque under them sit on white.
  expect(hexOf(groundOf([{ r: 0, g: 0, b: 0, a: 0.5 }]))).toBe("#808080");
  // The nearest layer is on top: an opaque card hides the section behind it.
  expect(hexOf(groundOf([{ r: 200, g: 107, b: 152, a: 1 }, { r: 0, g: 0, b: 0, a: 1 }]))).toBe("#c86b98");
});
