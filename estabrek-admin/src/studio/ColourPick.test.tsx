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

test("«a colour of its own» opens the picker without turning it white; the colour is kept when the picker closes", () => {
  const onPick = vi.fn();
  render(<ColourPick label="Colour" value="accent" busy={false} onPick={onPick} testId="pick" />);
  const select = screen.getByTestId("pick") as HTMLSelectElement;
  const own = screen.getByTestId("pick-own") as HTMLInputElement;
  own.showPicker = vi.fn();
  fireEvent.change(select, { target: { value: "own" } });
  expect(onPick).not.toHaveBeenCalled();
  expect(own.showPicker).toHaveBeenCalled();
  expect(select.value).toBe("own");
  // Moving in the picker changes nothing yet; closing it (its own change event) keeps the colour.
  fireEvent.input(own, { target: { value: "#22aa55" } });
  expect(onPick).not.toHaveBeenCalled();
  own.dispatchEvent(new Event("change", { bubbles: true }));
  expect(onPick).toHaveBeenCalledExactlyOnceWith("#22aa55");
  // A blur afterwards doesn't save it twice.
  fireEvent.blur(own);
  expect(onPick).toHaveBeenCalledTimes(1);
});

test("a named colour from the list is kept at once", () => {
  const onPick = vi.fn();
  render(<ColourPick label="Colour" value="" busy={false} onPick={onPick} testId="pick" />);
  fireEvent.change(screen.getByTestId("pick"), { target: { value: "black" } });
  expect(onPick).toHaveBeenCalledWith("black");
});
