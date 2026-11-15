// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { RoleTable } from "../../api/staff.api";
import { permissionsOf, mayWriteTable } from "../../lib/authz";
import { setLangForTests } from "../../lib/lang";
import { RoleTables } from "./RoleTables";
import { isTableKey, roleSummary, tableCount, tableKey, toggleTable } from "./teamText";

// Tables given to a role one by one (E0.5): the role editor's part, and what the admin makes of
// such a role (the data grid opens, a table given to change is written).

const NOTES = "cnotes000001";
const SUPPLIERS = "csuppliers02";
const tables: RoleTable[] = [
  { id: NOTES, slug: "order-notes", name: { en: "Order notes", ar: "ملاحظات الطلبات" } },
  { id: SUPPLIERS, slug: "suppliers", name: null },
];

beforeEach(() => setLangForTests("en"));
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("A table's permission", () => {
  test("changing a table's rows includes seeing them, in the ticks too", () => {
    expect(tableKey(NOTES, "read")).toBe(`data:${NOTES}:read`);
    expect(isTableKey(`data:${NOTES}:write`)).toBe(true);
    expect(isTableKey("pages:read")).toBe(false);
    expect(isTableKey("data:x:read")).toBe(false);
    let s = toggleTable(new Set(["orders:read"]), NOTES, "write", true);
    expect([...s].sort()).toEqual([`data:${NOTES}:read`, `data:${NOTES}:write`, "orders:read"]);
    s = toggleTable(s, NOTES, "write", false);
    expect([...s].sort()).toEqual([`data:${NOTES}:read`, "orders:read"]);
    s = toggleTable(toggleTable(s, NOTES, "write", true), NOTES, "read", false);
    expect([...s]).toEqual(["orders:read"]);
    expect([...toggleTable(new Set(), SUPPLIERS, "read", true)]).toEqual([`data:${SUPPLIERS}:read`]);
  });

  test("a role in a line: its permissions, and its single tables beside them", () => {
    expect(roleSummary(["orders:read", "pages:read"], 40, "en")).toBe("2 of 40 permissions");
    expect(roleSummary(["orders:read", `data:${NOTES}:read`, `data:${NOTES}:write`], 40, "en")).toBe("1 of 40 permissions · 1 single table");
    expect(roleSummary([`data:${NOTES}:read`, `data:${SUPPLIERS}:write`], 40, "ar")).toBe("0 من 40 صلاحية · 2 جداول محددة");
    expect(roleSummary([], 0, "he")).toBe("0 מתוך … הרשאות");
    expect(tableCount([`data:${NOTES}:read`, `data:${NOTES}:write`, "pages:read"])).toBe(1);
  });

  test("the admin opens the data grid for a member given tables, and writes where a table was given to change", () => {
    const given = { role: "STAFF" as const, owner: false, permissions: ["dashboard:read", `data:${NOTES}:write`, `data:${SUPPLIERS}:read`] };
    expect(permissionsOf(given)).toEqual(["dashboard:read", "data:tables"]);
    expect(permissionsOf({ role: "STAFF", owner: false, permissions: ["pages:read"] })).toEqual(["pages:read", "data:tables"]);
    // Neither every table nor a single one: the grid stays shut, whatever a server might send.
    expect(permissionsOf({ role: "STAFF", owner: false, permissions: ["dashboard:read", "data:tables"] })).toEqual(["dashboard:read"]);
    expect(permissionsOf({ role: "SUPERADMIN" })).toContain("data:tables");
    expect(mayWriteTable(given, NOTES)).toBe(true);
    expect(mayWriteTable(given, SUPPLIERS)).toBe(false);
    expect(mayWriteTable({ role: "STAFF", permissions: ["pages:write"] }, SUPPLIERS)).toBe(true);
    expect(mayWriteTable({ role: "SUPERADMIN" }, SUPPLIERS)).toBe(true);
    expect(mayWriteTable(null, NOTES)).toBe(false);
    expect(mayWriteTable(given, undefined)).toBe(false);
  });
});

describe("The role editor's tables", () => {
  function Editor({ start, canGive = () => true }: { start: string[]; canGive?: (p: string) => boolean }) {
    const [selected, setSelected] = useState(new Set(start));
    return (
      <>
        <RoleTables tables={tables} selected={selected} onChange={setSelected} canGive={canGive} />
        <output data-testid="kept">{[...selected].sort().join(" ")}</output>
      </>
    );
  }
  const tick = (key: string) => document.querySelector(`[data-permission="${key}"]`) as HTMLInputElement;

  test("each table by its name, to see or to change; a change ticks seeing with it", () => {
    render(<Editor start={["orders:read", `data:${SUPPLIERS}:read`]} />);
    expect(screen.getByTestId("role-table-order-notes").textContent).toContain("Order notes");
    // A table without a name is called by its address.
    expect(screen.getByTestId("role-table-suppliers").textContent).toContain("suppliers");
    expect(tick(`data:${SUPPLIERS}:read`).checked).toBe(true);
    expect(tick(`data:${NOTES}:read`).checked).toBe(false);
    fireEvent.click(tick(`data:${NOTES}:write`));
    expect(screen.getByTestId("kept").textContent).toBe(`data:${NOTES}:read data:${NOTES}:write data:${SUPPLIERS}:read orders:read`);
    expect(tick(`data:${NOTES}:read`).checked).toBe(true);
    fireEvent.click(tick(`data:${NOTES}:read`));
    expect(screen.getByTestId("kept").textContent).toBe(`data:${SUPPLIERS}:read orders:read`);
  });

  test("a role that has every table shows them ticked and not to change here; a member gives only what they have", () => {
    render(<Editor start={["pages:read"]} />);
    expect(tick(`data:${NOTES}:read`).checked).toBe(true);
    expect(tick(`data:${NOTES}:read`).disabled).toBe(true);
    expect(tick(`data:${NOTES}:write`).checked).toBe(false);
    expect(tick(`data:${NOTES}:write`).disabled).toBe(false);
    cleanup();
    render(<Editor start={[]} canGive={(p) => p === `data:${NOTES}:read`} />);
    expect(tick(`data:${NOTES}:read`).disabled).toBe(false);
    expect(tick(`data:${NOTES}:write`).disabled).toBe(true);
    expect(tick(`data:${SUPPLIERS}:read`).disabled).toBe(true);
  });

  test("with no tables yet there is nothing to show", () => {
    const { container } = render(<RoleTables tables={[]} selected={new Set()} onChange={() => {}} canGive={() => true} />);
    expect(container.textContent).toBe("");
  });
});
