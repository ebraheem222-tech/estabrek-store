import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PageDraft, PageDraftOp, PageTreeNode } from "../api/pages.api";
import { ReferenceDataPanel } from "./ReferenceDataPanels";
import { simulate, undoOf } from "./draft";
import { accepts, newElement } from "./columns";

afterEach(cleanup);
function Editor({ node }: { node: PageTreeNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { enabled: false } } }));
  const [state, setState] = useState<PageDraft>({ version: 1, rev: 1, baseHash: "x", sections: [], trash: [], startedAt: "", updatedAt: "", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "section", type: "section", props: {}, children: [node] }] } } });
  const [undo, setUndo] = useState<PageDraftOp[]>([]);
  const shown = state.tree.root.children![0].children![0];
  return <QueryClientProvider client={client}><ReferenceDataPanel node={shown} lang="en" busy={false} onOps={(_, ops) => { setUndo(undoOf(ops, state, "en")); setState(ops.reduce(simulate, state)); }} /><button onClick={() => setState(undo.reduce(simulate, state))}>Undo</button><output data-testid="props">{JSON.stringify(shown.props)}</output></QueryClientProvider>;
}
const props = () => JSON.parse(screen.getByTestId("props").textContent!);
const edit = (id: string, value: string) => { fireEvent.change(screen.getByTestId(id), { target: { value } }); fireEvent.blur(screen.getByTestId(id)); };

test("schedule defaults are editable and allowed inside content containers", () => {
  expect(accepts("stack", "schedule")).toBe(true);
  expect(accepts("cell", "comparison")).toBe(true);
  expect(newElement("schedule", "he", value => value)).toMatchObject({ type: "schedule", props: { layout: "cards", items: [] } });
  expect(newElement("comparison", "ar", value => value)).toMatchObject({ type: "comparison", props: { columns: [], rows: [] } });
});

test("schedule edits preserve translations, reorder, remove and undo through draft operations", () => {
  render(<Editor node={{ id: "agenda", type: "schedule", props: { label: { ar: "برنامج" }, layout: "cards", items: [{ day: { en: "Friday", he: "שישי" }, time: "09:00", title: { en: "First" } }, { day: {}, time: "10:00", title: { en: "Second" } }] } }} />);
  edit("schedule-day-0", "Opening day");
  expect(props().items[0].day).toEqual({ en: "Opening day", he: "שישי" });
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(props().items[0].day.en).toBe("Friday");
  fireEvent.click(screen.getByTestId("schedule-down-0"));
  expect(props().items.map((item: { title: { en: string } }) => item.title.en)).toEqual(["Second", "First"]);
  fireEvent.click(screen.getByTestId("schedule-remove-1"));
  expect(props().items).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(props().items).toHaveLength(2);
  fireEvent.click(screen.getByTestId("schedule-filterDays"));
  expect(props().filterDays).toBe(true);
  edit("schedule-label", "Programme");
  expect(props().label).toEqual({ ar: "برنامج", en: "Programme" });
  fireEvent.click(screen.getByTestId("schedule-layout").querySelector('[data-value="timeline"]')!);
  expect(props().layout).toBe("timeline");
});

test("comparison column operations keep every row aligned and support undo", () => {
  render(<Editor node={{ id: "plans", type: "comparison", props: { columns: [{ title: { en: "Basic", he: "בסיסי" } }, { title: { en: "Plus" } }], rows: [{ label: { en: "Delivery", ar: "توصيل" }, values: [{ text: { en: "Slow", he: "איטי" } }, { state: "yes" }] }] } }} />);
  edit("comparison-cell-0-0", "Standard");
  expect(props().rows[0].values[0].text).toEqual({ en: "Standard", he: "איטי" });
  fireEvent.click(screen.getByTestId("comparison-column-down-0"));
  expect(props().columns.map((column: { title: { en: string } }) => column.title.en)).toEqual(["Plus", "Basic"]);
  expect(props().rows[0].values).toEqual([{ state: "yes" }, { text: { en: "Standard", he: "איטי" } }]);
  fireEvent.click(screen.getByTestId("comparison-column-remove-0"));
  expect(props().rows[0].values).toEqual([{ text: { en: "Standard", he: "איטי" } }]);
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(props().columns).toHaveLength(2);
  expect(props().rows[0].values).toHaveLength(2);
  fireEvent.click(screen.getByTestId("comparison-column-add"));
  expect(props().rows[0].values).toHaveLength(3);
  fireEvent.click(screen.getByTestId("comparison-row-add"));
  expect(props().rows[1].values).toHaveLength(3);
  fireEvent.click(screen.getByTestId("comparison-row-down-0"));
  expect(props().rows[1].label).toEqual({ en: "Delivery", ar: "توصيل" });
  fireEvent.click(screen.getByTestId("comparison-row-remove-0"));
  expect(props().rows).toHaveLength(1);
});

test("empty comparison drafts can add and remove their final row and column", () => {
  render(<Editor node={{ id: "table", type: "comparison", props: { columns: [], rows: [] } }} />);
  fireEvent.click(screen.getByTestId("comparison-column-add"));
  fireEvent.click(screen.getByTestId("comparison-row-add"));
  expect(props().rows[0].values).toEqual([{}]);
  fireEvent.click(screen.getByTestId("comparison-column-remove-0"));
  expect(props()).toMatchObject({ columns: [], rows: [{ values: [] }] });
  fireEvent.click(screen.getByTestId("comparison-row-remove-0"));
  expect(props().rows).toEqual([]);
});

test("list add actions stop at contract limits", () => {
  const { unmount } = render(<Editor node={{ id: "agenda", type: "schedule", props: { items: Array.from({ length: 40 }, () => ({ day: {}, time: "", title: {} })) } }} />);
  expect(screen.getByTestId("schedule-add")).toBeDisabled();
  unmount();
  render(<Editor node={{ id: "plans", type: "comparison", props: { columns: Array.from({ length: 6 }, () => ({ title: {} })), rows: Array.from({ length: 20 }, () => ({ label: {}, values: Array.from({ length: 6 }, () => ({})) })) } }} />);
  expect(screen.getByTestId("comparison-column-add")).toBeDisabled();
  expect(screen.getByTestId("comparison-row-add")).toBeDisabled();
});
