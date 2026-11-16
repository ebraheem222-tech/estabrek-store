import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { setLangForTests } from "../lib/lang";
import type { Collection, CollectionField } from "../api/collections.api";
import type { ApiTable } from "../api/dataApi.api";
import type { PageTreeNode } from "../api/pages.api";
import { BindPanel, CollectionListPanel, inLiveList } from "./CollectionsStudio";
import { OPS_FOR, askFields, feedOf, filtersOf, fitFilter, listTrouble, needsValue, newFilter } from "./listRows";
import { indexTree } from "./treeIndex";

// A collection list read in the visitor's browser: whose rows it shows, its filters, its words for a visitor who
// isn't signed in, and what the table's API settings would do to it.

const field = (id: string, type: string, more: Record<string, unknown> = {}) => ({ id, type, name: { en: id[0].toUpperCase() + id.slice(1) }, ...more }) as CollectionField;
const FIELDS = [
  field("note", "text"),
  field("to", "customer"),
  field("state", "select", { options: [{ id: "waiting", name: { en: "Waiting" } }, { id: "accepted", name: { en: "Accepted" } }] }),
  field("seen", "boolean"),
  field("count", "number"),
  field("staffNote", "text"),
  field("color", "color"),
];
const table = (id: string, slug: string, fields: CollectionField[]): Collection => ({ id, slug, name: { en: slug }, fields, templateId: null, items: 0, published: 0, createdAt: "", updatedAt: "" });
const TABLES = [table("c1", "friend-requests", FIELDS), table("c2", "notes", [field("title", "text")])];
const api = (read: string, hidden: string[] = []): ApiTable => ({ id: "c1", slug: "friend-requests", name: null, access: { read, create: "off", update: "off", delete: "off" } as ApiTable["access"], open: read !== "off", private: hidden, fields: [] });

const m = vi.hoisted(() => ({ read: "customer", accounts: true, asked: 0 }));
vi.mock("../api/dataApi.api", () => ({
  getApi: vi.fn(async () => {
    m.asked++;
    return { customerAccounts: m.accounts, tables: [{ id: "c1", slug: "friend-requests", name: null, access: { read: m.read, create: "customer", update: "off", delete: "off" }, open: true, private: ["staffNote"], fields: [] }] };
  }),
}));

beforeEach(() => {
  setLangForTests("en");
  m.read = "customer";
  m.accounts = true;
  m.asked = 0;
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("a list's question", () => {
  it("whose rows, and its filters as kept", () => {
    expect(feedOf({})).toBe("");
    expect(feedOf({ feed: "everyone" })).toBe("");
    expect(feedOf({ feed: "tome" })).toBe("tome");
    expect(filtersOf({ where: [{ field: "state", op: "is", value: "waiting" }, { field: "seen", op: "isFalse", value: "" }, { field: "note", op: "sounds-like" }, "junk", null] })).toEqual([{ field: "state", op: "is", value: "waiting" }, { field: "seen", op: "isFalse" }]);
    expect(filtersOf({ where: "state" })).toEqual([]);
    expect(filtersOf({ where: Array.from({ length: 9 }, () => ({ field: "note", op: "notEmpty" })) })).toHaveLength(4);
  });

  it("only fields the list may ask about: not who a row points at, not a kind with no question, not one only a key sees", () => {
    expect(askFields(FIELDS).map((f) => f.id)).toEqual(["note", "state", "seen", "count", "staffNote"]);
    expect(askFields(FIELDS, ["staffNote"]).map((f) => f.id)).toEqual(["note", "state", "seen", "count"]);
    expect(OPS_FOR.customer).toBeUndefined();
    expect(OPS_FOR.relation).toBeUndefined();
  });

  it("a new filter starts with what fits its field; moving it puts right what no longer fits", () => {
    expect(newFilter(FIELDS[2])).toEqual({ field: "state", op: "is", value: "waiting" });
    expect(newFilter(FIELDS[3])).toEqual({ field: "seen", op: "isTrue" });
    expect(newFilter(FIELDS[0])).toEqual({ field: "note", op: "is" });
    expect([needsValue("is"), needsValue("empty"), needsValue("isFalse")]).toEqual([true, false, false]);
    // To a yes/no field: its own question, and no value.
    expect(fitFilter({ field: "seen", op: "is", value: "waiting" }, FIELDS[3])).toEqual({ field: "seen", op: "isTrue" });
    // A choice that isn't one of the field's: its first.
    expect(fitFilter({ field: "state", op: "isNot", value: "gone" }, FIELDS[2])).toEqual({ field: "state", op: "isNot", value: "waiting" });
    expect(fitFilter({ field: "count", op: "gt", value: "3" }, FIELDS[4])).toEqual({ field: "count", op: "gt", value: "3" });
    expect(fitFilter({ field: "note", op: "notEmpty", value: "x" }, FIELDS[0])).toEqual({ field: "note", op: "notEmpty" });
  });

  it("what the table's API settings would do to it", () => {
    expect(listTrouble("mine", FIELDS, undefined, true)).toMatchObject({ level: "warn" });
    expect(listTrouble("mine", FIELDS, api("off"), true)?.text).toContain("isn't open to the shop");
    expect(listTrouble("live", FIELDS, api("key"), true)?.level).toBe("warn");
    expect(listTrouble("mine", FIELDS, api("customer"), false)?.text).toContain("Shopper accounts are switched off");
    expect(listTrouble("live", FIELDS, api("public"), false)).toBeNull();
    expect(listTrouble("tome", [FIELDS[0]], api("public"), true)?.text).toContain("no “customer” field");
    expect(listTrouble("tome", FIELDS, api("customer"), true)).toBeNull();
    expect(listTrouble("mine", FIELDS, api("public"), true)).toBeNull();
    // Worth knowing, not a problem: an open list on a table for shoppers asks a visitor to sign in.
    expect(listTrouble("live", FIELDS, api("customer"), true)).toMatchObject({ level: "note" });
  });
});

let saved: Record<string, unknown> = {};
/** The panel on a list that keeps what it saves, as the editor does. */
function List({ start }: { start: Record<string, unknown> }) {
  const [p, setP] = useState<Record<string, unknown>>(start);
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CollectionListPanel node={{ id: "list", type: "collectionList", props: p } as PageTreeNode} collections={TABLES} lang="en" busy={false} onProps={(props) => { saved = JSON.parse(JSON.stringify(props)); setP(saved); }} />
    </QueryClientProvider>
  );
}
const open = (start: Record<string, unknown>) => {
  saved = start;
  return render(<List start={start} />);
};
const pick = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const options = (testId: string) => Array.from(screen.getByTestId(testId).querySelectorAll("option")).map((o) => o.textContent);

describe("the list's panel", () => {
  it("as it always was: published items with the page; nothing is asked of the API settings", () => {
    open({ collectionId: "c1", limit: 6, sort: "title", columns: 3 });
    expect((screen.getByTestId("list-feed") as HTMLSelectElement).value).toBe("");
    expect(options("list-feed")).toEqual(["The published items, for every visitor", "What the table lets the visitor read", "The shopper's rows: added by them or sent to them", "The rows the shopper added", "The rows sent to the shopper"]);
    expect(options("list-sort")).toEqual(["Newest", "Oldest", "My order", "A–Z"]);
    expect(screen.queryByTestId("list-filters")).toBeNull();
    expect(screen.queryByTestId("list-signin")).toBeNull();
    expect(m.asked).toBe(0);
  });

  it("the rows sent to the shopper: a filter by a choice, the words for who isn't signed in, and the help", async () => {
    open({ collectionId: "c1", limit: 6, sort: "title", columns: 3 });
    pick("list-feed", "tome");
    // An order the API can't sort by becomes the newest first.
    expect(saved).toMatchObject({ feed: "tome", sort: "newest" });
    expect(options("list-sort")).toEqual(["Newest", "Oldest"]);
    await waitFor(() => expect(m.asked).toBe(1));
    expect(screen.queryByTestId("list-trouble")).toBeNull();

    // The first filter is on the table's choice field; the field only a key sees isn't offered, nor who it points at.
    fireEvent.click(screen.getByTestId("list-filter-add"));
    expect(saved.where).toEqual([{ field: "state", op: "is", value: "waiting" }]);
    await waitFor(() => expect(options("list-filter-0-field")).toEqual(["Note", "State", "Seen", "Count"]));
    expect(options("list-filter-0-op")).toEqual(["is", "is not", "is empty", "is not empty"]);
    expect(options("list-filter-0-value")).toEqual(["Waiting", "Accepted"]);
    pick("list-filter-0-value", "accepted");
    expect(saved.where).toEqual([{ field: "state", op: "is", value: "accepted" }]);
    // Another field: the question and the value follow it.
    pick("list-filter-0-field", "seen");
    expect(saved.where).toEqual([{ field: "seen", op: "isTrue" }]);
    expect(screen.queryByTestId("list-filter-0-value")).toBeNull();
    pick("list-filter-0-field", "note");
    pick("list-filter-0-op", "contains");
    fireEvent.blur(screen.getByTestId("list-filter-0-value"), { target: { value: " hello " } });
    expect(saved.where).toEqual([{ field: "note", op: "contains", value: "hello" }]);
    // Four at most.
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByTestId("list-filter-add"));
    expect((saved.where as unknown[]).length).toBe(4);
    expect((screen.getByTestId("list-filter-add") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("list-filter-1-remove"));
    expect((saved.where as unknown[]).length).toBe(3);

    fireEvent.blur(screen.getByTestId("list-signin"), { target: { value: "Sign in to see who asked" } });
    expect(saved.signin).toEqual({ en: "Sign in to see who asked" });
    expect(screen.getByTestId("list-live-help").textContent).toContain("{{row_id}}");
    expect(screen.getByTestId("list-live-help").textContent).toContain("{{row_note}}");

    // Back to the published items: what only such a list has goes.
    pick("list-feed", "");
    expect(saved).not.toHaveProperty("feed");
    expect(saved).not.toHaveProperty("where");
    expect(saved).not.toHaveProperty("signin");
    expect(screen.queryByTestId("list-filters")).toBeNull();
  });

  it("says when the table's settings would leave the list empty", async () => {
    m.read = "key";
    open({ collectionId: "c1", feed: "mine" });
    await waitFor(() => expect(screen.getByTestId("list-trouble").textContent).toContain("isn't open to the shop"));
    cleanup();
    m.read = "customer";
    m.accounts = false;
    open({ collectionId: "c1", feed: "mine" });
    await waitFor(() => expect(screen.getByTestId("list-trouble").textContent).toContain("Shopper accounts are switched off"));
    cleanup();
    // A table the API page has never opened.
    m.accounts = true;
    open({ collectionId: "c2", feed: "live" });
    await waitFor(() => expect(screen.getByTestId("list-trouble").textContent).toContain("isn't open to the shop"));
  });
});

describe("connecting an element in such a list's card", () => {
  const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [
    { id: "live", type: "collectionList", props: { collectionId: "c1", feed: "tome" }, children: [{ id: "card", type: "stack", props: {}, children: [{ id: "who", type: "text", props: { text: { en: "Someone" } } }] }] },
    { id: "plain", type: "collectionList", props: { collectionId: "c1" }, children: [{ id: "card2", type: "stack", props: {}, children: [{ id: "who2", type: "text", props: { text: { en: "Someone" } } }] }] },
  ] } };
  const index = indexTree(tree as never);
  const node = (id: string) => index.nodes.get(id)!.node;

  it("knows which card is read in the browser", () => {
    expect(inLiveList(index, "who")).toBe(true);
    expect(inLiveList(index, "who2")).toBe(false);
    expect(inLiveList(index, "live")).toBe(false);
  });

  it("words also take who the row points at, a yes or no, and who added it; a list drawn with the page doesn't offer them", () => {
    const props = vi.fn();
    render(<BindPanel node={node("who")} collection={TABLES[0]} lang="en" busy={false} live onProps={props} />);
    expect(options("bind-text")).toEqual(["— as designed —", "◆ Note", "◆ To", "◆ State", "◆ Seen", "◆ Count", "◆ StaffNote", "◆ Who added the row"]);
    pick("bind-text", "$by");
    expect(props).toHaveBeenLastCalledWith({ text: { en: "Someone" }, bind: { text: "$by" } });
    cleanup();
    render(<BindPanel node={node("who2")} collection={TABLES[0]} lang="en" busy={false} onProps={props} />);
    expect(options("bind-text")).toEqual(["— as designed —", "◆ Note", "◆ State", "◆ Count", "◆ StaffNote"]);
  });
});
