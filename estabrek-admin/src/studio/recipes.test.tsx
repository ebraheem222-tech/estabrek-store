import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";
import { TriggersPanel } from "./TriggersPanel";
import { canFail, varsIn, type Trigger } from "./triggers";

vi.mock("../api/catalog.api", () => ({
  listProducts: vi.fn(async () => [{ id: "prod_scarf", title: "Silk scarf" }, { id: "prod_bag", title: "Lilac bag" }]),
}));

beforeEach(() => setLangForTests("en"));
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

let saved: Trigger[] = [];
const tested = vi.fn();
/** The panel on an element that keeps what it saves, as the editor does. */
function Recipes({ start }: { start: Trigger[] }) {
  const [node, setNode] = useState<PageTreeNode>({ id: "b", type: "button", props: { label: { en: "Go" }, triggers: start } });
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TriggersPanel node={node} lang="en" targets={[{ id: "pop", label: "Offer", type: "popup" }]} busy={false} onTest={tested}
        onOps={(_, ops) => {
          const props = (ops[0] as unknown as { props: Record<string, unknown> }).props;
          saved = (props.triggers as Trigger[]) ?? [];
          setNode({ ...node, props });
        }} />
    </QueryClientProvider>
  );
}
const open = (start: Trigger[]) => {
  saved = start;
  return render(<Recipes start={start} />);
};
const pick = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });
const type = (id: string, value: string) => {
  fireEvent.change(screen.getByTestId(id), { target: { value } });
  fireEvent.blur(screen.getByTestId(id));
};

describe("a recipe in the editor", () => {
  it("who may: customers only, the others see it locked with a note; hidden keeps no note", () => {
    open([{ on: "click", do: [{ act: "vibrate" }] }]);
    expect(screen.queryByTestId("trigger-0-deny")).toBeNull();
    pick("trigger-0-who", "customer");
    expect(saved[0]).toMatchObject({ who: "customer", deny: "lock", note: { en: "Sign in first" } });
    type("trigger-0-note", "Members only");
    expect(saved[0].note).toEqual({ en: "Members only" });
    pick("trigger-0-deny", "hide");
    expect(saved[0]).toEqual({ on: "click", who: "customer", deny: "hide", do: [{ act: "vibrate" }] });
    expect(screen.queryByTestId("trigger-0-note")).toBeNull();
    pick("trigger-0-who", "all");
    expect(saved[0]).toEqual({ on: "click", do: [{ act: "vibrate" }] });
  });

  it("conditions: one is added and changed, the else steps come with them and go with them", () => {
    open([{ on: "click", do: [{ act: "vibrate" }] }]);
    expect(screen.queryByTestId("trigger-0-else-add")).toBeNull();
    fireEvent.click(screen.getByTestId("trigger-0-if-add"));
    expect(saved[0].if).toEqual([{ if: "var", name: "count", cmp: "gte", value: 3 }]);
    type("trigger-0-if-0-name", "visits");
    type("trigger-0-if-0-value", "5");
    expect(saved[0].if).toEqual([{ if: "var", name: "visits", cmp: "gte", value: 5 }]);
    // A name that isn't one stays as it was.
    type("trigger-0-if-0-name", "2 bad");
    expect(saved[0].if![0]).toMatchObject({ name: "visits" });
    pick("trigger-0-if-0-kind", "signedIn");
    expect(saved[0].if).toEqual([{ if: "signedIn", value: true }]);
    pick("trigger-0-if-0-value", "no");
    expect(saved[0].if).toEqual([{ if: "signedIn", value: false }]);
    fireEvent.click(screen.getByTestId("trigger-0-else-add"));
    expect(saved[0].else).toEqual([{ act: "wait", seconds: 0.5 }]);
    pick("trigger-0-else-act-0", "back");
    expect(saved[0].else).toEqual([{ act: "back" }]);
    // The last condition out: the else steps go too.
    fireEvent.click(screen.getByTestId("trigger-0-if-0-remove"));
    expect(saved[0]).toEqual({ on: "click", do: [{ act: "vibrate" }] });
  });

  it("a group holds steps of its own, with no groups inside it", () => {
    open([{ on: "click", do: [{ act: "vibrate" }] }]);
    pick("trigger-0-act-0", "repeat");
    expect(saved[0].do[0]).toMatchObject({ act: "repeat", times: 3 });
    const inner = screen.getByTestId("trigger-0-g0-act-0") as HTMLSelectElement;
    expect([...inner.options].map((o) => o.value)).not.toContain("together");
    expect([...(screen.getByTestId("trigger-0-act-0") as HTMLSelectElement).options].map((o) => o.value)).toContain("together");
    pick("trigger-0-g0-act-0", "vibrate");
    expect((saved[0].do[0] as { do: unknown[] }).do[0]).toEqual({ act: "vibrate" });
    // Its last step stays (a group is never empty).
    fireEvent.click(screen.getByTestId("trigger-0-g0-remove-1"));
    expect((saved[0].do[0] as { do: unknown[] }).do).toHaveLength(1);
    expect((screen.getByTestId("trigger-0-g0-remove-0") as HTMLButtonElement).disabled).toBe(true);
  });

  it("steps for a failure show once a step can fail, and go when none can", () => {
    open([{ on: "click", do: [{ act: "vibrate" }] }]);
    expect(screen.queryByTestId("trigger-0-fail-add")).toBeNull();
    expect(screen.queryByTestId("trigger-0-test-fail")).toBeNull();
    pick("trigger-0-act-0", "confirm");
    expect(saved[0].do[0]).toEqual({ act: "confirm", text: { en: "Are you sure?" } });
    // A second try, for what happens on a "no".
    fireEvent.click(screen.getByTestId("trigger-0-test-fail"));
    expect(tested).toHaveBeenLastCalledWith(0, true);
    fireEvent.click(screen.getByTestId("trigger-0-fail-add"));
    pick("trigger-0-fail-act-0", "toast");
    expect(saved[0].fail).toEqual([{ act: "toast", text: { en: "Welcome!" } }]);
    pick("trigger-0-act-0", "vibrate");
    expect(saved[0]).toEqual({ on: "click", do: [{ act: "vibrate" }] });
    expect(screen.queryByTestId("trigger-0-fail-add")).toBeNull();
    expect(canFail([{ act: "together", do: [{ act: "bag", productId: "p" }] }])).toBe(true);
  });

  it("a key: Enter to start with, or one letter or digit", () => {
    open([{ on: "click", do: [{ act: "vibrate" }] }]);
    pick("trigger-0-on", "key");
    expect(saved[0]).toMatchObject({ on: "key", key: "Enter" });
    pick("trigger-0-key", "letter");
    expect(saved[0].key).toBe("a");
    type("trigger-0-letter", "K");
    expect(saved[0].key).toBe("k");
    pick("trigger-0-on", "longpress");
    expect(saved[0]).toEqual({ on: "longpress", do: [{ act: "vibrate" }] });
  });

  it("a product for the bag is found by its name; a name and a try", async () => {
    open([{ on: "click", do: [{ act: "vibrate" }] }]);
    pick("trigger-0-act-0", "bag");
    expect(saved[0].do[0]).toEqual({ act: "bag", quantity: 1 });
    await waitFor(() => expect(screen.getByTestId("trigger-product").querySelector('[data-product="prod_scarf"]')).not.toBeNull());
    fireEvent.change(screen.getByTestId("trigger-product-find"), { target: { value: "lilac" } });
    expect(screen.getByTestId("trigger-product").querySelector('[data-product="prod_scarf"]')).toBeNull();
    fireEvent.click(screen.getByTestId("trigger-product").querySelector('[data-product="prod_bag"]')!);
    expect(saved[0].do[0]).toEqual({ act: "bag", quantity: 1, productId: "prod_bag" });
    type("trigger-0-name", "Quick add");
    expect(saved[0].name).toBe("Quick add");
    fireEvent.click(screen.getByTestId("trigger-0-test"));
    expect(tested).toHaveBeenCalledWith(0);
  });

  it("the page's variables are found in conditions, steps, groups and fail steps", () => {
    const node = (triggers: Trigger[]): PageTreeNode => ({ id: "x", type: "button", props: { triggers } });
    expect(varsIn([
      node([{ on: "click", if: [{ if: "var", name: "seen", cmp: "unset" }], do: [{ act: "set", name: "clicks", op: "add", value: 1 }, { act: "together", do: [{ act: "set", name: "inner", op: "toggle" }] }], fail: [{ act: "set", name: "failed", op: "set", value: true }] }]),
    ])).toEqual(["clicks", "failed", "inner", "seen"]);
  });
});
