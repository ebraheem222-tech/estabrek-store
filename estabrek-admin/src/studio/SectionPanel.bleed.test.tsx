import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SectionPanel } from "./StudioTreePanels";

// Plan 3.9b: a section's ground across the whole screen (`bleed`, a premium theme's), switched in its settings.
afterEach(cleanup);
const mount = (props: Record<string, unknown>) => {
  const onOps = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><SectionPanel node={{ id: "s1", type: "section", props, children: [] }} busy={false} onOps={onOps} /></QueryClientProvider>);
  return onOps;
};

test("the switch puts the section's ground across the whole screen, and takes it back", () => {
  const onOps = mount({ contained: true });
  const box = screen.getByTestId("studio-section-bleed") as HTMLInputElement;
  expect(box.checked).toBe(false);
  fireEvent.click(box);
  expect(onOps.mock.calls[0][1]).toEqual([{ op: "setProps", nodeId: "s1", props: { contained: true, bleed: true } }]);
  cleanup();
  const off = mount({ contained: true, bleed: true });
  expect((screen.getByTestId("studio-section-bleed") as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByTestId("studio-section-bleed"));
  expect(off.mock.calls[0][1]).toEqual([{ op: "setProps", nodeId: "s1", props: { contained: true, bleed: undefined } }]);
});
