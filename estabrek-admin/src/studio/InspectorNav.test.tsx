import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InspectorGroup, InspectorJump, cardMatches } from "./InspectorNav";

afterEach(cleanup);

// jsdom lays nothing out: a heading counts as shown when it's in the page.
Object.defineProperty(HTMLElement.prototype, "offsetParent", { configurable: true, get() { return this.isConnected ? document.body : null; } });

const Inspector = ({ sel }: { sel: string }) => (
  <aside>
    <InspectorJump watch={sel} />
    <div data-insp-list="">
      <div data-testid="title">Button</div>
      <div data-insp-list="">
        <InspectorGroup id="content" />
        <div data-testid="card-words">The button's words <input placeholder="Shop now" /></div>
        <InspectorGroup id="look" />
        <div data-testid="card-colour">Button colour <select><option>Theme colour</option></select></div>
        <div data-testid="card-shadow">Shadow and glow</div>
        <InspectorGroup id="motion" />
        <div data-testid="card-motion">Motion</div>
      </div>
    </div>
  </aside>
);

test("a card matches by its words, its fields' hints and its lists' choices; every word must be there", () => {
  render(<Inspector sel="a" />);
  expect(cardMatches(screen.getByTestId("card-colour"), "COLOUR")).toBe(true);
  expect(cardMatches(screen.getByTestId("card-colour"), "theme colour")).toBe(true);
  expect(cardMatches(screen.getByTestId("card-words"), "shop now")).toBe(true);
  expect(cardMatches(screen.getByTestId("card-colour"), "colour shadow")).toBe(false);
  expect(cardMatches(screen.getByTestId("card-motion"), "  ")).toBe(true);
});

test("the bar lists the groups that are there; finding a setting leaves only the cards that mention it", async () => {
  const view = render(<Inspector sel="a" />);
  await waitFor(() => expect(screen.getAllByTestId("studio-insp-chip").map((c) => c.dataset.group)).toEqual(["content", "look", "motion"]));
  fireEvent.change(screen.getByTestId("studio-insp-find"), { target: { value: "shadow" } });
  await waitFor(() => expect(screen.getByTestId("card-colour").hasAttribute("data-insp-hidden")).toBe(true));
  expect(screen.getByTestId("card-shadow").hasAttribute("data-insp-hidden")).toBe(false);
  expect(screen.getByTestId("card-motion").hasAttribute("data-insp-hidden")).toBe(true);
  // The chips step aside while finding; nothing found says so.
  expect(screen.queryAllByTestId("studio-insp-chip")).toHaveLength(0);
  fireEvent.change(screen.getByTestId("studio-insp-find"), { target: { value: "zzzz" } });
  await waitFor(() => expect(screen.getByTestId("studio-insp-none")).toBeTruthy());
  // Another selection starts with everything shown again.
  view.rerender(<Inspector sel="b" />);
  await waitFor(() => expect(screen.getByTestId("card-colour").hasAttribute("data-insp-hidden")).toBe(false));
  expect((screen.getByTestId("studio-insp-find") as HTMLInputElement).value).toBe("");
});
