import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ClockPanel, InstrumentPanel, StickyPanel } from "./CreativePanels";
import { newElement } from "./columns";

afterEach(cleanup);
test("new creative elements have useful, safe defaults and gallery media", () => {
  let next = 0;
  const ids = (prefix: string) => `${prefix}-${next++}`;
  expect(newElement("instrument", "ar", ids).props).toMatchObject({ kind: "piano", sound: false });
  expect(newElement("clock", "en", ids).props).toMatchObject({ timezone: "UTC", format: "24" });
  expect(newElement("chart", "he", ids).props.items).toHaveLength(3);
  expect(newElement("filterGallery", "en", ids).props.items).toHaveLength(3);
});
test("instrument settings preserve other props and keep localized labels", () => {
  const onOps = vi.fn();
  render(<InstrumentPanel node={{ id: "instrument", type: "instrument", props: { kind: "piano", volume: .4, label: { en: "Studio", ar: "استوديو" } } }} lang="en" busy={false} onOps={onOps} />);
  fireEvent.click(screen.getByTestId("instrument-kind").querySelector('[data-value="guitar"]')!);
  expect(onOps.mock.lastCall![1][0].props).toMatchObject({ kind: "guitar", volume: .4, label: { ar: "استوديو", en: "Studio" } });
  expect(screen.getByTestId("instrument-sound")).not.toBeChecked();
});
test("invalid clock zones do not save and sticky can override desktop on mobile", () => {
  const onOps = vi.fn();
  const view = render(<ClockPanel node={{ id: "clock", type: "clock", props: { timezone: "UTC" } }} lang="en" busy={false} onOps={onOps} />);
  const zone = screen.getByTestId("clock-timezone");
  fireEvent.change(zone, { target: { value: "not-a-zone" } }); fireEvent.blur(zone);
  expect(onOps).not.toHaveBeenCalled();
  view.unmount();
  render(<StickyPanel node={{ id: "sticky", type: "stack", props: {}, style: { base: { sticky: { top: 48 } } } }} screen="mobile" busy={false} onOps={onOps} />);
  fireEvent.click(screen.getByTestId("sticky-on"));
  expect(onOps.mock.lastCall![1][0]).toMatchObject({ op: "setStyle", nodeId: "sticky", screen: "mobile", style: { sticky: false } });
});
