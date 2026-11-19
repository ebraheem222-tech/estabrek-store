// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

// The missing field kinds in the admin (stage 2, item 6): a formula's equation written with the table's fields and
// functions at hand and checked by the server as it's written; a rollup's way to rows, what it works out and of
// which field; formatted words written with a small bar and seen as a page draws them; and computed fields in the
// grid, shown and never written.

const m = vi.hoisted(() => ({ tryFormula: vi.fn() }));
vi.mock("../../api/collections.api", async (orig) => ({ ...(await orig<object>()), tryFormula: m.tryFormula }));

import { setLangForTests } from "../../lib/lang";
import { FieldRulesEditor } from "./FieldRulesEditor";
import { RichTextBox } from "../data/RichTextBox";
import { columnsOf, cellText, editable } from "../data/dataText";
import { shownText } from "../data/kinds";
import { fieldRef, markWords, pointAt, rollupOf, rollupWays, valueKindOf } from "./computedText";
import { retype } from "./schemaText";
import { itemDataOut, newField } from "./collectionForms";
import type { Collection, CollectionField } from "../../api/collections.api";
import type { GridRow } from "../../api/data.api";

const fit = { unique: false, limits: null, shape: false, default: false } as const;
const LINES: Pick<Collection, "id" | "name" | "slug" | "fields"> = { id: "t-lines", slug: "lines", name: { en: "Lines" }, fields: [{ id: "title", type: "text" }, { id: "price", type: "money", currency: "ILS" }, { id: "shipped", type: "date" }, { id: "total", type: "formula", formula: "price * 2", result: "number" }, { id: "order", type: "relation", to: "t-orders" }] };
const ORDER_FIELDS: CollectionField[] = [{ id: "title", type: "text", name: { en: "Title" } }, { id: "lines", type: "relation", to: "t-lines", many: true, name: { en: "Lines" } }, { id: "qty", type: "number", name: { en: "Quantity" } }, { id: "who", type: "customer" }];
const ORDERS: Pick<Collection, "id" | "name" | "slug" | "fields"> = { id: "t-orders", slug: "orders", name: { en: "Orders" }, fields: ORDER_FIELDS };

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}
/** The editor holding its own field, as the fields page does. */
function Editor({ start, spy }: { start: CollectionField; spy: (f: CollectionField) => void }) {
  const [field, setField] = useState(start);
  const fields = [...ORDER_FIELDS, field];
  return <FieldRulesEditor field={field} lang="en" fit={fit} shapes={[]} onChange={(f) => { setField(f); spy(f); }} computed={{ tableId: "t-orders", fields, all: [{ ...ORDERS, fields }, LINES], storeName: () => null }} />;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  setLangForTests("en");
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setLangForTests("ar");
});

describe("A formula field", () => {
  test("the table's fields and the functions put in with a click; the server's check and the first rows' answers", async () => {
    m.tryFormula.mockResolvedValue({ ok: true, result: "number", reads: ["qty"], sample: [{ slug: "o1", value: 6 }, { slug: "o2", value: null }] });
    const spy = vi.fn();
    wrap(<Editor start={{ id: "double", type: "formula", formula: "" }} spy={spy} />);
    // Only what an equation can read: not the relation, not who the row points at, not itself.
    expect(screen.getByTestId("formula-double-field-qty")).toBeTruthy();
    expect(screen.queryByTestId("formula-double-field-lines")).toBeNull();
    expect(screen.queryByTestId("formula-double-field-who")).toBeNull();
    expect(screen.queryByTestId("formula-double-field-double")).toBeNull();
    fireEvent.click(screen.getByTestId("formula-double-field-qty"));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ formula: "qty" }));
    fireEvent.click(screen.getByTestId("formula-double-fn-round"));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ formula: "qtyround(, 2)" }));
    fireEvent.change(screen.getByTestId("formula-double-text"), { target: { value: "qty * 2" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    await waitFor(() => expect(screen.getByTestId("formula-double-ok").textContent).toContain("It gives: A number"));
    expect(screen.getByTestId("formula-double-sample").textContent).toBe("o1: 6 · o2: —");
    // Asked with the fields as they are being edited, and which field the equation belongs to.
    expect(m.tryFormula).toHaveBeenLastCalledWith("t-orders", expect.objectContaining({ formula: "qty * 2", field: "double", fields: expect.arrayContaining([expect.objectContaining({ id: "qty" })]) }));
    // Shown as money: a currency to go with it.
    fireEvent.change(screen.getByTestId("formula-double-result"), { target: { value: "money" } });
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ result: "money", currency: "ILS" }));
    expect(screen.getByTestId("formula-double-currency")).toBeTruthy();
  });

  test("what's wrong, in the admin's language, with where", async () => {
    m.tryFormula.mockResolvedValue({ ok: false, message: "The equation stops too soon", say: { ar: "المعادلة بتخلص قبل وقتها", he: "המשוואה נגמרת מוקדם מדי" }, at: 6 });
    setLangForTests("ar");
    wrap(<Editor start={{ id: "double", type: "formula", formula: "qty * " }} spy={vi.fn()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    await waitFor(() => expect(screen.getByTestId("formula-double-problem").textContent).toContain("المعادلة بتخلص قبل وقتها"));
    expect(screen.getByTestId("formula-double-problem").querySelector("pre")?.textContent).toBe("qty * \n      ^");
  });
});

describe("A rollup field", () => {
  test("through this table's relation or from another table's; what it works out, of a field that fits", () => {
    const spy = vi.fn();
    wrap(<Editor start={{ id: "sum", type: "rollup", via: "lines", calc: "count" }} spy={spy} />);
    const way = screen.getByTestId("rollup-sum-way") as HTMLSelectElement;
    expect([...way.options].map((o) => o.textContent)).toEqual(["Lines → Lines", "Lines · order ←"]);
    expect(screen.queryByTestId("rollup-sum-of")).toBeNull();
    fireEvent.change(screen.getByTestId("rollup-sum-calc"), { target: { value: "sum" } });
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ calc: "sum", of: undefined }));
    // Money and numbers only, never a computed field.
    expect([...(screen.getByTestId("rollup-sum-of") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["", "price"]);
    fireEvent.change(screen.getByTestId("rollup-sum-of"), { target: { value: "price" } });
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ calc: "sum", of: "price" }));
    fireEvent.change(screen.getByTestId("rollup-sum-calc"), { target: { value: "max" } });
    expect([...(screen.getByTestId("rollup-sum-of") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["", "price", "shipped"]);
    // From the other side: the lines that point at this order.
    fireEvent.change(way, { target: { value: "t-lines.order" } });
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ via: "order", from: "t-lines" }));
    fireEvent.click(screen.getByTestId("rollup-sum-published"));
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ published: true }));
  });

  test("with no relation to read through, it says so", () => {
    wrap(<FieldRulesEditor field={{ id: "n", type: "rollup", via: "", calc: "count" }} lang="en" fit={fit} shapes={[]} onChange={vi.fn()} computed={{ tableId: "t-x", fields: [{ id: "title", type: "text" }], all: [], storeName: () => null }} />);
    expect(screen.getByTestId("rollup-n-none").textContent).toContain("There's no relation to read through");
  });

  test("the ways and the fields, as data", () => {
    const ways = rollupWays("t-orders", ORDER_FIELDS, [ORDERS, LINES], "en");
    expect(ways.map((w) => [w.key, w.table])).toEqual([["lines", "t-lines"], ["t-lines.order", "t-lines"]]);
    expect(rollupOf(ways[0], [LINES], "avg").map((f) => f.id)).toEqual(["price"]);
    expect(rollupOf(ways[0], [LINES], "count")).toEqual([]);
  });
});

describe("Formatted words", () => {
  test("a mark on what's picked, or at the caret; whole lines for lists and headings", () => {
    expect(markWords("soft silk", 0, 4, "bold")).toEqual({ words: "**soft** silk", from: 2, to: 6 });
    expect(markWords("soft", 4, 4, "italic")).toEqual({ words: "soft*…*", from: 5, to: 6 });
    expect(markWords("one\ntwo", 0, 7, "list").words).toBe("- one\n- two");
    expect(markWords("- one\n- two", 0, 11, "numbered").words).toBe("1. one\n2. two");
    expect(markWords("Care", 0, 0, "h").words).toBe("## Care");
    expect(markWords("see", 0, 3, "link")).toEqual({ words: "[see](https://)", from: 6, to: 14 });
  });

  test("the bar, the box and how a page draws them", () => {
    function Box() {
      const [v, setV] = useState("soft silk");
      return <RichTextBox value={v} onChange={setV} className="x" testId="body" />;
    }
    wrap(<Box />);
    const box = screen.getByTestId("body") as HTMLTextAreaElement;
    box.setSelectionRange(0, 4);
    fireEvent.click(screen.getByTestId("body-mark-bold"));
    expect((screen.getByTestId("body") as HTMLTextAreaElement).value).toBe("**soft** silk");
    fireEvent.click(screen.getByTestId("body-look"));
    expect(screen.getByTestId("body-preview").querySelector("strong")?.textContent).toBe("soft");
  });
});

describe("Computed fields in the grid and the forms", () => {
  const fields: CollectionField[] = [
    { id: "title", type: "text" },
    { id: "body", type: "richText" },
    { id: "total", type: "formula", formula: "a * b", result: "money", currency: "USD" },
    { id: "paid", type: "formula", formula: "x > 1", result: "boolean" },
    { id: "label", type: "formula", formula: 'title & "!"', result: "text" },
    { id: "n", type: "rollup", via: "lines", calc: "count", result: "number" },
  ];
  const row = { id: "r1", slug: "r-1", status: "DRAFT", data: { title: { en: "A" }, body: { en: "**Soft** silk\n- one" }, total: 12.5, paid: false, label: { en: "A!" }, n: 3 } } as unknown as GridRow;
  test("each is a column of what it gives; a formula is never sorted or filtered by; neither is written", () => {
    const cols = columnsOf({ fields, readOnly: false, hasAddress: true, made: true } as never, "en");
    const by = Object.fromEntries(cols.map((c) => [c.id, c]));
    expect([by.total.kind, by.paid.kind, by.label.kind, by.n.kind, by.body.kind]).toEqual(["money", "boolean", "text", "number", "richText"]);
    expect([by.total.computed, by.n.computed]).toEqual([true, undefined]);
    expect([editable(by.total), editable(by.n), editable(by.body)]).toEqual([false, false, true]);
    expect(cellText(by.total, row, "en")).toBe("US$12.50");
    expect(cellText(by.paid, row, "en")).toBe("✗");
    expect(cellText(by.label, row, "en")).toBe("A!");
    expect(cellText(by.n, row, "en")).toBe("3");
    expect(cellText(by.body, row, "en")).toBe("Soft silk · one");
    expect(shownText({ type: "rollup", result: "date" }, "2026-11-20", "en")).toBe("2026-11-20");
    expect(valueKindOf({ type: "rollup" })).toBe("number");
    // A form's values leave them out.
    expect(itemDataOut(fields, { title: { en: "A" }, total: 3, n: 1 })).toEqual({ title: { en: "A" } });
  });

  test("a new or retyped field starts as it should", () => {
    expect(newField("formula", { en: "Total" }, [])).toMatchObject({ id: "total", type: "formula", formula: "" });
    expect(newField("rollup", { en: "Lines count" }, [], undefined, ORDER_FIELDS)).toMatchObject({ type: "rollup", via: "lines", calc: "count" });
    const was: CollectionField = { id: "total", type: "number", required: true, min: 0 };
    const now = retype(was, "formula", fit);
    expect(now).toEqual({ id: "total", type: "formula", formula: "" });
    expect(retype({ ...now, formula: "a", result: "number" }, "number", fit)).toEqual({ id: "total", type: "number" });
    expect(fieldRef("and")).toBe("{and}");
    expect(pointAt(3)).toBe("   ^");
    expect(pointAt(null)).toBe("");
  });
});
