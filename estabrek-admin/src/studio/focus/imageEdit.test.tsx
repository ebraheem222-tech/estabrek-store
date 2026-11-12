import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PageTreeNode } from "../../api/pages.api";
import { cropFor, cropOnOriginal, recipeCss, safeRecipe } from "../../../../shared/imageEdit";
import { ImageEditPanel } from "./ImageEditPanel";

afterEach(cleanup);

test("a crop keeps the ratio as big as it fits, zooms in, and stays inside when moved", () => {
  // A 2:1 picture cropped square: the whole height, half the width, in the middle.
  expect(cropFor(1, 1, { x: 0.5, y: 0.5 }, 2)).toEqual({ x: 0.25, y: 0, w: 0.5, h: 1 });
  // Zoomed twice, moved far left: it stops at the edge.
  expect(cropFor(1, 2, { x: 0, y: 0.5 }, 2)).toEqual({ x: 0, y: 0.25, w: 0.25, h: 0.5 });
  expect(cropFor(null, 1, { x: 0.5, y: 0.5 }, 1.5)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
});

test("a crop on the turned picture lands on the original where CSS cuts it", () => {
  const c = { x: 0, y: 0, w: 1, h: 0.5 };
  // Turned right (clockwise): its top half is the original's left half.
  expect(cropOnOriginal(c, { rotate: 90 })).toEqual({ x: 0, y: 0, w: 0.5, h: 1 });
  expect(cropOnOriginal(c, { rotate: 270 })).toEqual({ x: 0.5, y: 0, w: 0.5, h: 1 });
  expect(cropOnOriginal({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, { flipX: true })).toEqual({ x: 0.6, y: 0.2, w: 0.3, h: 0.4 });
});

test("an edit's numbers are kept in range, and shown as CSS", () => {
  expect(safeRecipe({ light: 3, contrast: 0, rotate: 45, crop: { x: 0.5, y: 0, w: 0.8, h: 1 }, mono: "yes" })).toEqual({ light: 1 });
  const css = recipeCss({ light: 0.5, mono: true, rotate: 90, flipX: true, crop: { x: 0.25, y: 0, w: 0.5, h: 1 } });
  expect(css.filter).toBe("brightness(1.3) grayscale(1)");
  expect(css.transform).toBe("rotate(90deg) scale(-1, 1)");
  expect(css.viewBox).toMatch(/^inset\(/);
  expect(recipeCss({})).toEqual({ filter: "", transform: "", viewBox: "" });
});

test("the panel previews each change, applies the edit and undoes it", async () => {
  const onPreview = vi.fn(), onApply = vi.fn(async () => null), onUndo = vi.fn();
  const node = { id: "photo", type: "image", props: { src: "/a-edit.webp", edit: { from: "/a.webp", recipe: { warmth: 0.45, saturate: 0.1 } } } } as PageTreeNode;
  render(<ImageEditPanel node={node} aspect={1.5} busy={false} onPreview={onPreview} onApply={onApply} onUndo={onUndo} />);
  expect(screen.getByTestId("studio-image-edit")).toHaveAttribute("data-edited", "1");
  // The saved edit is the warm filter.
  expect(screen.getAllByTestId("studio-image-filter").find((b) => b.getAttribute("data-filter") === "warm")!.className).toMatch(/accent/);
  fireEvent.click(screen.getAllByTestId("studio-image-filter").find((b) => b.getAttribute("data-filter") === "mono")!);
  await waitFor(() => expect(onPreview).toHaveBeenLastCalledWith(expect.objectContaining({ filter: expect.stringContaining("grayscale(1)") })));
  fireEvent.click(screen.getAllByTestId("studio-image-ratio").find((b) => b.getAttribute("data-ratio") === "1:1")!);
  fireEvent.click(screen.getByTestId("studio-image-right"));
  fireEvent.click(screen.getByTestId("studio-image-apply"));
  await waitFor(() => expect(onApply).toHaveBeenCalledOnce());
  const recipe = (onApply.mock.calls[0] as unknown as [Record<string, unknown>])[0];
  expect(recipe).toMatchObject({ mono: true, rotate: 90, crop: { w: 1 } });
  fireEvent.click(screen.getByTestId("studio-image-undo"));
  expect(onUndo).toHaveBeenCalledOnce();
});
