import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChartPanel, ClockPanel, InstrumentPanel, StickyPanel } from "./CreativePanels";
import { newElement } from "./columns";

vi.mock("../api/collections.api", () => ({ listCollections: vi.fn(async () => [{ id: "t1", slug: "signups", name: { en: "Sign-ups", ar: "تسجيلات" }, fields: [], items: 3, published: 3 }]) }));

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

test("the chart's new kinds ask for what each needs: flows a «to», flights the cities, the live line a table", async () => {
  const onOps = vi.fn();
  const items = [{ label: { en: "Search" }, value: 60, color: "accent" }];
  const view = render(<ChartPanel node={{ id: "c", type: "chart", props: { kind: "sankey", items } }} lang="en" busy={false} onOps={onOps} />);
  const to = screen.getByTestId("chart-item-to-0");
  fireEvent.change(to, { target: { value: "Pricing" } });
  fireEvent.blur(to);
  expect(onOps.mock.lastCall![1][0].props.items[0]).toMatchObject({ label: { en: "Search" }, to: { en: "Pricing" }, value: 60 });
  expect(screen.queryByTestId("chart-item-group-0")).toBeNull();
  // An example in the editing language, flows that join up.
  fireEvent.click(screen.getByTestId("chart-example"));
  expect(onOps.mock.lastCall![1][0].props.items[2]).toMatchObject({ label: { en: "Product page" }, to: { en: "Bought" }, value: 30 });
  view.unmount();

  render(<ChartPanel node={{ id: "c", type: "chart", props: { kind: "flights", items: [{ label: {}, value: 3 }] } }} lang="en" busy={false} onOps={onOps} />);
  fireEvent.change(screen.getByTestId("chart-hub"), { target: { value: "amman" } });
  expect(onOps.mock.lastCall![1][0].props).toMatchObject({ kind: "flights", hub: "amman" });
  // A city picked for an item with no name of its own gives it the city's name.
  fireEvent.change(screen.getByTestId("chart-item-city-0"), { target: { value: "dubai" } });
  expect(onOps.mock.lastCall![1][0].props.items[0]).toMatchObject({ city: "dubai", label: { en: "Dubai" }, value: 3 });
  cleanup();

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ChartPanel node={{ id: "c", type: "chart", props: { kind: "live", items } }} lang="en" busy={false} onOps={onOps} /></QueryClientProvider>);
  expect(screen.queryByTestId("chart-item-label-0")).toBeNull();
  await waitFor(() => expect(screen.getByTestId("chart-table").querySelector('option[value="signups"]')).not.toBeNull());
  fireEvent.change(screen.getByTestId("chart-table"), { target: { value: "signups" } });
  expect(onOps.mock.lastCall![1][0].props).toMatchObject({ kind: "live", table: "signups" });
  fireEvent.click(screen.getByTestId("chart-every").querySelector('[data-value="minute"]')!);
  expect(onOps.mock.lastCall![1][0].props).toMatchObject({ every: "minute" });
});
