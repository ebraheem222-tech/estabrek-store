import { expect, test } from "@playwright/test";
import { DEFAULT_STOREFRONT_SETTINGS, normalizeStorefrontSettings } from "../src/lib/storefrontSettings";
import { PICTURE_FX, PICTURE_FX_POINTER, pointerFxOf } from "../../shared/pictureFx";

// Admin → الإعدادات → صفحة المنتج: what the product page's big picture does under the pointer.
test("the product picture's effect is off until the owner picks one of the kinds that answer the pointer", () => {
  expect(DEFAULT_STOREFRONT_SETTINGS.productPictureFx).toBe("none");
  expect(normalizeStorefrontSettings({}).productPictureFx).toBe("none");
  for (const kind of PICTURE_FX_POINTER) expect(normalizeStorefrontSettings({ productPictureFx: kind }).productPictureFx).toBe(kind);
  // A reveal plays when a picture scrolls into view: not for a picture the page opens on.
  expect(PICTURE_FX).toContain("reveal");
  expect(PICTURE_FX_POINTER).toEqual(["ripple", "liquid", "shift"]);
  for (const bad of ["reveal", "zoom", "", 3, null, { kind: "ripple" }]) expect(normalizeStorefrontSettings({ productPictureFx: bad }).productPictureFx).toBe("none");
  // …or the picture in 3D from its depth picture (lib/usePhoto3d.ts).
  expect(normalizeStorefrontSettings({ productPictureFx: "3d" }).productPictureFx).toBe("3d");
  expect(normalizeStorefrontSettings({ productPictureFx: "none" }, normalizeStorefrontSettings({ productPictureFx: "3d" })).productPictureFx).toBe("none");
  expect(pointerFxOf("shift")).toBe("shift");
  expect(pointerFxOf("reveal")).toBeNull();
});

test("a later reading keeps the effect it had unless it names another, and can switch it off", () => {
  const had = normalizeStorefrontSettings({ productPictureFx: "liquid" });
  expect(normalizeStorefrontSettings({ productZoomEnabled: false }, had).productPictureFx).toBe("liquid");
  expect(normalizeStorefrontSettings({ productPictureFx: "nonsense" }, had).productPictureFx).toBe("liquid");
  expect(normalizeStorefrontSettings({ productPictureFx: "ripple" }, had).productPictureFx).toBe("ripple");
  expect(normalizeStorefrontSettings({ productPictureFx: "none" }, had).productPictureFx).toBe("none");
  // The setting is a name, never copied as free text.
  expect(normalizeStorefrontSettings('{"productPictureFx":"shift"}').productPictureFx).toBe("shift");
});
