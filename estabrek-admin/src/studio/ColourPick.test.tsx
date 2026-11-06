import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ColourPick } from "./StudioTreePanels";

afterEach(cleanup);
const input = () => document.querySelector('input[type="color"]') as HTMLInputElement;

test("leaving an untouched theme colour does not replace it with white", () => {
  const onPick = vi.fn();
  render(<ColourPick label="Colour" value="accent" busy={false} onPick={onPick} />);
  fireEvent.focus(input()); fireEvent.blur(input());
  expect(onPick).not.toHaveBeenCalled();
});

test("selection and undo update the picker without saving a stale colour", () => {
  const onPick = vi.fn();
  const view = render(<ColourPick label="Colour" value="#ff0000" busy={false} onPick={onPick} />);
  view.rerender(<ColourPick label="Colour" value="#00ff00" busy={false} onPick={onPick} />);
  expect(input()).toHaveValue("#00ff00");
  fireEvent.blur(input());
  expect(onPick).not.toHaveBeenCalled();
});

test("a custom colour stays visible while choosing and saves once on leaving", () => {
  const onPick = vi.fn();
  render(<ColourPick label="Colour" value="#f00" busy={false} onPick={onPick} />);
  fireEvent.change(input(), { target: { value: "#3344ff" } });
  expect(input()).toHaveValue("#3344ff");
  expect(onPick).not.toHaveBeenCalled();
  fireEvent.blur(input()); fireEvent.blur(input());
  expect(onPick).toHaveBeenCalledExactlyOnceWith("#3344ff");
});

test("a pending colour cannot overwrite a newer prop or a busy save", () => {
  const onPick = vi.fn();
  const view = render(<ColourPick label="Colour" value="#ff0000" busy={false} onPick={onPick} />);
  fireEvent.change(input(), { target: { value: "#3344ff" } });
  view.rerender(<ColourPick label="Colour" value="#00ff0080" busy={true} onPick={onPick} />);
  fireEvent.blur(input());
  expect(input()).toHaveValue("#00ff00");
  expect(screen.getByRole("combobox")).toBeDisabled();
  expect(onPick).not.toHaveBeenCalled();
});
