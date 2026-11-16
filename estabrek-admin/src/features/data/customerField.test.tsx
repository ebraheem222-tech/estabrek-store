// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CollectionField } from "../../api/collections.api";
import type { GridRow } from "../../api/data.api";
import { setLangForTests } from "../../lib/lang";
import { FieldRulesEditor } from "../collections/FieldRulesEditor";
import { CellEditor, CellView } from "./GridCells";
import { cellPatch, cellText, columnsOf } from "./dataText";
import { KIND_NAME } from "./kinds";

// A field of kind "customer" in the admin (M): a shopper the row points at, written as the email they sign in
// with. The grid shows the address, and the shopper's name beside it when the server says whose it is (only to a
// member who may see the customers). The server's part is tested with the database (customerField.spec.ts).

afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

const to: CollectionField = { id: "to", type: "customer", name: { en: "To" }, required: true };
const row = (data: Record<string, unknown>, more: Partial<GridRow> = {}): GridRow => ({ id: "r1", collectionId: "c1", slug: "b1", status: "DRAFT", data, sort: 0, publishedAt: null, createdAt: "", updatedAt: "", deletedAt: null, ...more });

describe("A field that points at a shopper", () => {
  test("has a name in the three languages; a cell is the address, written as typed", () => {
    expect(KIND_NAME.customer.split("|")).toEqual(["زبون (بإيميله)", "A customer (by email)", "לקוח (לפי אימייל)"]);
    const [, , column] = columnsOf({ fields: [to] }, "en");
    expect(column).toMatchObject({ id: "to", kind: "customer" });
    expect(cellText(column, row({ to: "lina@example.com" }), "en")).toBe("lina@example.com");
    expect(cellPatch(column, row({}), "en", "lina@example.com")).toEqual({ values: { to: "lina@example.com" } });
    expect(cellPatch(column, row({ to: "lina@example.com" }), "en", "")).toEqual({ values: { to: null } });
  });

  test("the grid shows whose address it is when the server says so; else the address alone", () => {
    setLangForTests("en");
    const [, , column] = columnsOf({ fields: [to] }, "en");
    const known = render(<CellView column={column} row={row({ to: "lina@example.com" }, { customers: { to: { id: "u1", name: "Lina Nasser" } } })} lang="en" />);
    expect(screen.getByTestId("customer-to").textContent).toBe("Lina Nasserlina@example.com");
    known.unmount();
    // An account with no name on it is still said to be a customer's.
    const unnamed = render(<CellView column={column} row={row({ to: "dana@example.com" }, { customers: { to: { id: "u2", name: "" } } })} lang="en" />);
    expect(screen.getByTestId("customer-to").textContent).toBe("a customerdana@example.com");
    unnamed.unmount();
    // Nobody's account (or a member who may not see the customers): the address only.
    render(<CellView column={column} row={row({ to: "noor@example.com" })} lang="en" />);
    expect(screen.getByTestId("customer-to").textContent).toBe("noor@example.com");
  });

  test("it is written in an email box; its rules say what pointing at a shopper means", () => {
    setLangForTests("en");
    const [, , column] = columnsOf({ fields: [to] }, "en");
    let savedDraft = "";
    render(<CellEditor column={column} row={row({ to: "lina@example.com" })} lang="en" onSave={(d) => { savedDraft = d; }} onCancel={() => undefined} />);
    const box = screen.getByDisplayValue("lina@example.com") as HTMLInputElement;
    expect(box.type).toBe("email");
    fireEvent.change(box, { target: { value: "dana@example.com" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(savedDraft).toBe("dana@example.com");
    cleanup();
    render(<FieldRulesEditor field={to} lang="en" fit={{ unique: true, limits: null, shape: false, default: false }} shapes={[]} tables={[]} onChange={() => undefined} />);
    expect(screen.getByTestId("customer-to-note").textContent).toContain("to read only");
    expect(screen.getByTestId("customer-to-note").textContent).toContain("first name only");
  });
});
