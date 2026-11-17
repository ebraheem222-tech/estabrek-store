// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { CollectionField, Linked } from "../../api/collections.api";
import type { GridRow } from "../../api/data.api";

// A member given the owner's tables one by one: a linked row of a table they weren't given comes
// by its id alone (`hidden`), in a cell and in the relation's box; the box says why it can't list
// that table's rows; and a refused delete names the holding table without one of its rows. The
// server's part is tested with the database (backend linkedNames.spec.ts).

const m = vi.hoisted(() => ({ lookupRows: vi.fn() }));
vi.mock("../../api/data.api", () => ({ lookupRows: m.lookupRows }));

import { setLangForTests } from "../../lib/lang";
import { say } from "../../studio/say";
import { CellView } from "./GridCells";
import { blockersText, columnsOf } from "./dataText";
import { linkedName, linkedOf, linksDraft } from "./kinds";
import { RelationInput } from "./RelationInput";

beforeEach(() => setLangForTests("en"));
afterEach(() => {
  cleanup();
  setLangForTests("ar");
  vi.clearAllMocks();
});

// As the page keeps them; the server sends a status too (backend lib/links.ts hiddenRow): no address, no words.
const hidden: Linked = { id: "s1", slug: "s1", title: null, hidden: true };
const named: Linked = { id: "o1", slug: "o1", title: { en: "Order one" } };
const sent = [{ ...hidden, status: "PUBLISHED" }, { ...named, status: "PUBLISHED" }];
const supplier: CollectionField = { id: "supplier", type: "relation", name: { en: "Supplier" }, to: "tbl-suppliers" };
const row = (data: Record<string, unknown>): GridRow => ({ id: "r1", collectionId: "tbl-orders", slug: "o2", status: "DRAFT", data, sort: 0, publishedAt: null, createdAt: "", updatedAt: "", deletedAt: null });

describe("A linked row of a table this member wasn't given", () => {
  test("is kept as hidden, and said only to be linked, in the cell too", () => {
    expect(linkedOf(sent)).toEqual([hidden, named]);
    expect([linkedName(hidden, "en"), linkedName(named, "en")]).toEqual(["A linked row (its name needs a permission)", "Order one"]);
    const [, , column] = columnsOf({ fields: [supplier] }, "en");
    render(<CellView column={column} row={row({ supplier: [hidden] })} lang="en" />);
    const chip = screen.getByText("A linked row (its name needs a permission)");
    expect(chip.closest("[data-hidden]")).not.toBeNull();
    expect(screen.queryByText("s1")).toBeNull();
  });

  test("the box says the table isn't theirs to see; what is linked stays, and can be let go", async () => {
    m.lookupRows.mockRejectedValue({ response: { status: 403, data: { error: "PERMISSION_DENIED" } } });
    const onChange = vi.fn();
    render(<RelationInput field={supplier} value={linksDraft([hidden])} onChange={onChange} lang="en" autoFocus testId="box" />);
    expect((await screen.findByTestId("box-denied")).textContent).toBe("The linked table isn't yours to see, so its rows can't be linked from here. What is linked stays, and can be let go (×).");
    expect(m.lookupRows).toHaveBeenCalledWith("tbl-suppliers", "");
    expect(screen.queryByText("The rows couldn't be read.")).toBeNull();
    expect(screen.getByTestId("box-chosen-s1").textContent).toContain("A linked row");
    fireEvent.click(screen.getByTestId("box-remove-s1"));
    expect(onChange).toHaveBeenLastCalledWith("");
    cleanup();
    // Any other failure: as before.
    m.lookupRows.mockRejectedValue({ response: { status: 500 } });
    render(<RelationInput field={supplier} value="" onChange={onChange} lang="en" autoFocus testId="box" />);
    expect(await screen.findByText("The rows couldn't be read.")).toBeTruthy();
    expect(screen.queryByTestId("box-denied")).toBeNull();
  });

  test("a refused delete names the holding table, and one of its rows only when there is one to name", () => {
    const held = { table: "tbl-notes", slug: "notes", name: { en: "Notes" }, field: "order", fieldName: { en: "Order" }, rows: 1, sample: "" };
    expect(say(blockersText([held], "en"))).toBe("1 rows of “Notes” link them (field Order) and don't let them be deleted. Unlink them from those rows first, or change “when deleted” in the field's rules.");
    expect(blockersText([held], "ar")).toContain("(حقل Order)");
    expect(blockersText([held], "ar")).not.toContain("متل");
    expect(say(blockersText([{ ...held, sample: "n1" }], "en"))).toContain("(field Order, like n1)");
    setLangForTests("he");
    expect(say(blockersText([held], "he"))).toContain("(שדה Order)");
  });
});
