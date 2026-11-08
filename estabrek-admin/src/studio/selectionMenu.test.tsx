import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ContextMenu } from "./MultiPanel";
test("the selection chooser supports arrows and Escape without passing those keys to canvas navigation", () => {
  const close = vi.fn(), canvasKeys = vi.fn();
  window.addEventListener("keydown", canvasKeys);
  render(<ContextMenu at={{ x: 10, y: 10 }} items={[{ label: "Header", onClick() {}, disabled: true }, { label: "Image", onClick() {} }, { label: "Card", onClick() {} }]} onClose={close} />);
  const image = screen.getByRole("menuitem", { name: "Image" }), card = screen.getByRole("menuitem", { name: "Card" });
  expect(image).toHaveFocus(); fireEvent.keyDown(image, { key: "ArrowDown" }); expect(card).toHaveFocus();
  fireEvent.keyDown(card, { key: "Escape" }); expect(close).toHaveBeenCalledOnce(); expect(canvasKeys).not.toHaveBeenCalled();
  window.removeEventListener("keydown", canvasKeys);
});
