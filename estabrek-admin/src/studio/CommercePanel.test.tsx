import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CommercePanel } from "./CommercePanel";
import { newElement } from "./columns";
afterEach(cleanup);
test("shop controls save display props without removing SVG edges", () => {
  const onOps = vi.fn();
  render(<CommercePanel node={{ id: "catalog", type: "shop", props: { columns: 3, showFilters: true, edges: { top: { height: 20 } } } }} busy={false} onOps={onOps} />);
  fireEvent.click(screen.getByTestId("commerce-filters"));
  expect(onOps.mock.lastCall![1][0]).toMatchObject({ op: "setProps", nodeId: "catalog", props: { columns: 3, showFilters: false, edges: { top: { height: 20 } } } });
});
test("new cart elements stay independent and contain no price or payment configuration", () => {
  for (const kind of ["cartItems", "cartSummary", "cartCheckout"] as const) {
    const node = newElement(kind, "en", value => value);
    expect(node.type).toBe(kind); expect(node.props).toEqual({});
    const view = render(<CommercePanel node={node} busy={false} onOps={() => {}} />);
    expect(screen.getByTestId("studio-commerce")).toBeVisible();
    view.unmount();
  }
});
