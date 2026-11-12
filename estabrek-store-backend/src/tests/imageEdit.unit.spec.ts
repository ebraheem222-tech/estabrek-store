import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { Recipe, applyRecipe } from "../lib/imageEdit.js";

/** A 40×20 picture: red on the left half, blue on the right. */
const halves = () =>
  sharp({ create: { width: 40, height: 20, channels: 3, background: { r: 255, g: 0, b: 0 } } })
    .composite([{ input: { create: { width: 20, height: 20, channels: 3, background: { r: 0, g: 0, b: 255 } } }, left: 20, top: 0 }])
    .png()
    .toBuffer();
const pixel = async (buf: Buffer, x: number, y: number) => {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};

describe("a picture's edit made for real", () => {
  test("turned, then cropped on what's seen; mirrored", async () => {
    const turned = await applyRecipe(await halves(), { rotate: 90 });
    expect([turned.width, turned.height]).toEqual([20, 40]);
    // Half of the turned picture (its top: the red, turned down from the left).
    const cropped = await applyRecipe(await halves(), { rotate: 90, crop: { x: 0, y: 0, w: 1, h: 0.5 } });
    expect([cropped.width, cropped.height]).toEqual([20, 20]);
    const mirrored = await applyRecipe(await halves(), { flipX: true });
    const [r, , b] = await pixel(mirrored.buffer, 2, 10);
    expect(b).toBeGreaterThan(200);
    expect(r).toBeLessThan(60);
  });

  test("black and white, lighter, warmer", async () => {
    const mono = await applyRecipe(await halves(), { mono: true });
    const [r, g, b] = await pixel(mono.buffer, 5, 5);
    expect(Math.abs(r - g)).toBeLessThan(3);
    expect(Math.abs(g - b)).toBeLessThan(3);
    const grey = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 100, g: 100, b: 100 } } }).png().toBuffer();
    const [lr] = await pixel((await applyRecipe(grey, { light: 0.5 })).buffer, 2, 2);
    expect(lr).toBeGreaterThan(115);
    const [wr, , wb] = await pixel((await applyRecipe(grey, { warmth: 1 })).buffer, 2, 2);
    expect(wr).toBeGreaterThan(wb + 10);
  });

  test("the edit's numbers are checked", () => {
    expect(Recipe.safeParse({ crop: { x: 0.5, y: 0, w: 0.8, h: 1 } }).success).toBe(false);
    expect(Recipe.safeParse({ rotate: 45 }).success).toBe(false);
    expect(Recipe.safeParse({ light: 3 }).success).toBe(false);
    expect(Recipe.safeParse({ crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, rotate: 270, warmth: -0.4, sharpen: 0.3, mono: true }).success).toBe(true);
  });
});
