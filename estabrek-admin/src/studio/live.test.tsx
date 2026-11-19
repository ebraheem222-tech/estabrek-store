import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { Collection, CollectionField } from "../api/collections.api";
import type { PageTreeNode } from "../api/pages.api";
import { setLangForTests } from "../lib/lang";
import { CollectionListPanel } from "./CollectionsStudio";
import { TriggersPanel } from "./TriggersPanel";
import { TRIGGER_PRESETS, triggersOp, type Trigger } from "./triggers";

// Live (stage 2, item 5) in the editor: a list read in the visitor's browser can update by itself, and a recipe can
// wait for a row of a table to come in while the page is open (an in-page notice), with the row's values in its steps.

const m = vi.hoisted(() => ({ fail: false }));
vi.mock("../api/dataApi.api", () => ({
  getApi: vi.fn(async () => {
    if (m.fail) throw new Error("403");
    const t = (slug: string, read: string, more: Record<string, unknown> = {}) => ({ id: slug, slug, name: { en: slug === "chat" ? "Messages" : slug }, access: { read, create: "customer", update: "off", delete: "off" }, open: true, private: [], fields: [{ id: "text", type: "text", name: { en: "Text" }, required: true }], ...more });
    return { customerAccounts: true, tables: [t("chat", "customer"), t("board", "public"), t("staff", "off"), t("mods", "off", { roles: { read: ["moderator"], create: [], update: [], delete: [] } })] };
  }),
}));
vi.mock("../api/catalog.api", () => ({ listProducts: vi.fn(async () => []) }));
vi.mock("../api/functions.api", () => ({ getFunctions: vi.fn(async () => ({ functions: [] })) }));

beforeEach(() => {
  setLangForTests("en");
  m.fail = false;
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
let saved: Trigger[] = [];
function Recipes({ start }: { start: Trigger[] }) {
  const [node, setNode] = useState<PageTreeNode>({ id: "s", type: "section", props: { triggers: start } });
  return (
    <QueryClientProvider client={client()}>
      <TriggersPanel node={node} lang="en" targets={[]} busy={false} onTest={() => {}}
        onOps={(_, ops) => {
          const props = (ops[0] as unknown as { props: Record<string, unknown> }).props;
          saved = (props.triggers as Trigger[]) ?? [];
          setNode({ ...node, props });
        }} />
    </QueryClientProvider>
  );
}
const pick = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });
const options = (id: string) => Array.from(screen.getByTestId(id).querySelectorAll("option")).map((o) => o.getAttribute("value"));

describe("a recipe waiting for a row", () => {
  it("a ready one: a notice and a chime; then its table (only tables a page may read), what it waits for, and the visitor's own", async () => {
    const preset = TRIGGER_PRESETS.find((p) => p.key === "row-notice")!;
    render(<Recipes start={[preset.make("en")]} />);
    await waitFor(() => expect(options("trigger-0-table")).toEqual(["", "chat", "board", "mods"]));
    pick("trigger-0-table", "chat");
    // The help names a field of the picked table.
    expect(screen.getByTestId("trigger-0-row-help").textContent).toContain("{{row_text}}");
    expect(saved[0]).toEqual({ on: "row", table: "chat", do: [{ act: "toast", text: { en: "Something new came in" } }, { act: "sound", kind: "chime", volume: 0.4 }] });
    pick("trigger-0-change", "any");
    fireEvent.click(screen.getByTestId("trigger-0-own"));
    expect(saved[0]).toMatchObject({ on: "row", table: "chat", change: "any", own: true });
    // A new row (what it waits for unless said) and not the visitor's own: nothing kept for them.
    pick("trigger-0-change", "added");
    fireEvent.click(screen.getByTestId("trigger-0-own"));
    expect(saved[0]).not.toHaveProperty("change");
    expect(saved[0]).not.toHaveProperty("own");
    // Another kind of recipe keeps none of it.
    pick("trigger-0-on", "click");
    expect(saved[0]).not.toHaveProperty("table");
  });

  it("a table that isn't open for reading is said; without the API's list, its address is typed", async () => {
    render(<Recipes start={[{ on: "row", table: "staff", do: [{ act: "vibrate" }] }]} />);
    expect(await screen.findByTestId("trigger-0-table-closed")).toBeTruthy();
    cleanup();
    m.fail = true;
    render(<Recipes start={[{ on: "row", do: [{ act: "vibrate" }] }]} />);
    await waitFor(() => expect(screen.getByTestId("trigger-0-table").tagName).toBe("INPUT"));
    const box = screen.getByTestId("trigger-0-table");
    fireEvent.change(box, { target: { value: "chat" } });
    fireEvent.blur(box);
    expect(saved[0]).toMatchObject({ on: "row", table: "chat" });
  });

  it("saved as the page keeps it", () => {
    const op = triggersOp({ id: "s", type: "section", props: {} }, [{ on: "row", table: "chat", change: "changed", own: false, do: [{ act: "vibrate" }] }]);
    expect((op as unknown as { props: { triggers: Trigger[] } }).props.triggers).toEqual([{ on: "row", table: "chat", change: "changed", do: [{ act: "vibrate" }] }]);
  });
});

const field = (id: string, type: string) => ({ id, type, name: { en: id } }) as CollectionField;
const TABLES: Collection[] = [{ id: "c1", slug: "chat", name: { en: "Messages" }, fields: [field("text", "text")], templateId: null, items: 0, published: 0, createdAt: "", updatedAt: "" }];
let props: Record<string, unknown> = {};
function List({ start }: { start: Record<string, unknown> }) {
  const [p, setP] = useState(start);
  return (
    <QueryClientProvider client={client()}>
      <CollectionListPanel node={{ id: "list", type: "collectionList", props: p } as PageTreeNode} collections={TABLES} lang="en" busy={false} onProps={(next) => { props = JSON.parse(JSON.stringify(next)); setP(props); }} />
    </QueryClientProvider>
  );
}

describe("a list that updates by itself", () => {
  it("only for a list read in the visitor's browser; switched on and off", () => {
    render(<List start={{ collectionId: "c1" }} />);
    expect(screen.queryByTestId("list-stream")).toBeNull();
    cleanup();
    render(<List start={{ collectionId: "c1", feed: "live" }} />);
    fireEvent.click(screen.getByTestId("list-stream"));
    expect(props).toMatchObject({ feed: "live", stream: true });
    fireEvent.click(screen.getByTestId("list-stream"));
    expect(props).not.toHaveProperty("stream");
  });
});
