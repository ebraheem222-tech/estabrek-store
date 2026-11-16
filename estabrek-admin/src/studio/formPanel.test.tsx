import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { setLangForTests } from "../lib/lang";
import { CustomFormFields } from "./FormPanel";
import { fromInputs, fromTable, misfit, newField, optionsFrom, optionsText, startForm, freeName, type FormField } from "./formFields";

// The owner's functions and tables as the form panel reads them: a function for signed-in shoppers, one that isn't
// published, one for a program with a key; a table anyone adds to, one for shoppers, one that isn't open.
const m = vi.hoisted(() => ({ noFns: false, noApi: false }));
vi.mock("../api/functions.api", () => ({
  getFunctions: vi.fn(async () => {
    if (m.noFns) throw new Error("403");
    const fn = (id: string, name: string, more: Record<string, unknown>) => ({ id, name, note: null, enabled: true, published: true, publishedAt: null, changed: false, steps: 2, inputs: 0, takes: [], runs: 0, lastRunAt: null, updatedAt: "", ...more });
    return {
      functions: [
        fn("f1", "Friend request", { takes: [{ name: "to", type: "text", required: true, note: "Her email" }, { name: "note", type: "text" }, { name: "count", type: "number" }, { name: "sure", type: "bool" }, { name: "tags", type: "list" }], calls: [{ address: "friend-request", who: "customer" }] }),
        fn("f2", "Say hello", { published: false, takes: [{ name: "name", type: "text", required: true }], calls: [{ address: "hello", who: "public" }] }),
        fn("f3", "Nightly sync", { calls: [{ address: "sync", who: "key" }] }),
      ],
    };
  }),
}));
vi.mock("../api/dataApi.api", () => ({
  getApi: vi.fn(async () => {
    if (m.noApi) throw new Error("403");
    const access = (create: string) => ({ read: "off", create, update: "off", delete: "off" });
    const field = (id: string, type: string, more: Record<string, unknown> = {}) => ({ id, type, name: { en: id[0].toUpperCase() + id.slice(1) }, required: false, ...more });
    return {
      tables: [
        { id: "t1", slug: "messages", name: { en: "Messages" }, access: access("public"), open: true, private: ["internal"], fields: [field("name", "text", { required: true }), field("email", "email", { required: true }), field("topic", "select", { options: [{ id: "order", name: { en: "An order" } }, { id: "other", name: null }] }), field("age", "number"), field("photo", "image"), field("internal", "text")] },
        { id: "t2", slug: "members", name: { en: "Members" }, access: access("customer"), open: true, private: [], fields: [field("nick", "text", { required: true })] },
        { id: "t3", slug: "closed", name: { en: "Closed" }, access: access("key"), open: true, private: [], fields: [] },
      ],
    };
  }),
}));

beforeEach(() => {
  setLangForTests("en");
  m.noFns = false;
  m.noApi = false;
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

let saved: Record<string, unknown> = {};
/** The panel on a form that keeps what it saves, as the editor does. */
function Form({ start }: { start: Record<string, unknown> }) {
  const [p, setP] = useState<Record<string, unknown>>(start);
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CustomFormFields p={p} lang="en" busy={false} setProps={(patch) => { saved = { ...p, ...patch }; setP(saved); }} />
    </QueryClientProvider>
  );
}
const open = (start: Record<string, unknown>) => {
  saved = start;
  return render(<Form start={start} />);
};
const pick = (id: string, value: string) => fireEvent.change(screen.getByTestId(id), { target: { value } });
const type = (id: string, value: string) => {
  fireEvent.change(screen.getByTestId(id), { target: { value } });
  fireEvent.blur(screen.getByTestId(id));
};
const fields = () => saved.fields as FormField[];

describe("a form's fields as data", () => {
  it("a fresh form: a name, an email and a few words; a fresh field has a name no other has", () => {
    const s = startForm("en");
    expect(s.fields.map((f) => [f.name, f.kind, f.required === true])).toEqual([["name", "text", true], ["email", "email", true], ["message", "long", false]]);
    expect(s.send).toEqual({ to: "fn" });
    expect(newField("text", "en", ["text", "text2"]).name).toBe("text3");
    expect(newField("select", "en", []).options).toHaveLength(2);
    expect(freeName("to", [])).toBe("to");
  });

  it("fields from what a function takes, and from a table's fields; what a form can't write is named", () => {
    expect(fromInputs([{ name: "to", type: "text", required: true, note: "Her email" }, { name: "email", type: "text" }, { name: "phone", type: "any" }, { name: "note", type: "text" }, { name: "count", type: "number" }, { name: "sure", type: "bool" }, { name: "tags", type: "list" }], "en")).toEqual([
      // "to" is an email by its note; "email" by its name.
      { name: "to", kind: "email", label: { en: "Her email" }, required: true },
      { name: "email", kind: "email", label: { en: "email" } },
      { name: "phone", kind: "phone", label: { en: "phone" } },
      { name: "note", kind: "long", label: { en: "note" } },
      { name: "count", kind: "number", label: { en: "count" } },
      { name: "sure", kind: "check", label: { en: "sure" } },
    ]);
    const t = fromTable([
      { id: "name", type: "text", name: { ar: "الاسم", en: "Name" }, required: true },
      { id: "topic", type: "select", name: null, required: false, options: [{ id: "order", name: { en: "An order" } }, { id: "other", name: null }] },
      { id: "photo", type: "image", name: { en: "Photo" }, required: false },
      { id: "friend", type: "relation", name: { en: "Friend" }, required: false },
      { id: "to", type: "customer", name: { en: "To" }, required: true },
      { id: "secret", type: "text", name: { en: "Secret" }, required: false },
    ], "en", ["secret"]);
    expect(t.fields).toEqual([
      { name: "name", kind: "text", label: { en: "Name" }, required: true },
      { name: "topic", kind: "select", label: { en: "topic" }, options: [{ value: "order", label: { en: "An order" } }, { value: "other", label: { en: "other" } }] },
      // A field pointing at a shopper is typed as that shopper's email.
      { name: "to", kind: "email", label: { en: "To" }, required: true },
    ]);
    expect(t.skipped).toEqual(["Photo", "Friend"]);
  });

  it("a select's choices as lines; words in the other languages stay; what doesn't fit is found", () => {
    const was = [{ value: "s", label: { en: "Small", ar: "صغير" } }, { value: "m" }];
    expect(optionsText(was, "en")).toBe("s = Small\nm");
    expect(optionsFrom("s = Tiny\nm\n\nl = Large\nl = Twice\n = no value", "en", was)).toEqual([{ value: "s", label: { en: "Tiny", ar: "صغير" } }, { value: "m" }, { value: "l", label: { en: "Large" } }]);
    // Its words taken away in this language: the others stay.
    expect(optionsFrom("s", "en", was)).toEqual([{ value: "s", label: { ar: "صغير" } }]);
    expect(misfit([{ name: "to", kind: "email", label: {} }, { name: "extra", kind: "text", label: {} }], [{ name: "to", required: true }, { name: "note", required: false }, { name: "sure", required: true }])).toEqual({ missing: ["sure"], extra: ["extra"] });
  });
});

describe("a form in the editor", () => {
  it("to a function: picked by its address, a field for each thing it takes, and what doesn't fit is said", async () => {
    open({ kind: "custom", ...startForm("en") });
    await waitFor(() => expect(screen.getByTestId("form-fn")).toBeTruthy());
    // A shopper's and anyone's addresses; never a key's.
    expect([...(screen.getByTestId("form-fn") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["", "friend-request", "hello"]);
    pick("form-fn", "friend-request");
    expect(saved.send).toEqual({ to: "fn", fn: "friend-request" });
    expect(screen.getByTestId("form-who").textContent).toContain("signed-in shopper");
    // It needs "to", which no field gives; and it doesn't take the three the form started with.
    expect(screen.getByTestId("form-missing").textContent).toContain("to");
    expect(screen.getByTestId("form-extra").textContent).toContain("name, email, message");
    fireEvent.click(screen.getByTestId("form-fill"));
    expect(fields().map((f) => [f.name, f.kind])).toEqual([["name", "text"], ["email", "email"], ["message", "long"], ["to", "email"], ["note", "long"], ["count", "number"], ["sure", "check"]]);
    expect(screen.queryByTestId("form-missing")).toBeNull();
    // A second press adds nothing twice.
    fireEvent.click(screen.getByTestId("form-fill"));
    expect(fields()).toHaveLength(7);
    type("form-as", "req");
    type("form-as", "2 bad");
    expect(saved.send).toEqual({ to: "fn", fn: "friend-request", as: "req" });
    expect(screen.getByTestId("form-help").textContent).toContain("{{req}}");
    // One that isn't published says so.
    pick("form-fn", "hello");
    expect(screen.getByTestId("form-fn-off").textContent).toContain("isn't published");
    expect(saved.send).toEqual({ to: "fn", fn: "hello", as: "req" });
  });

  it("its fields: a name no other has, a kind, words, needed, choices and limits; up and out", () => {
    open({ kind: "custom", fields: [{ name: "to", kind: "email", label: { en: "Her email", ar: "إيميلها" }, required: true }, { name: "note", kind: "long", label: { en: "A few words" } }], send: { to: "fn" } });
    type("form-field-0-label", "Your friend's email");
    expect(fields()[0].label).toEqual({ en: "Your friend's email", ar: "إيميلها" });
    // A name that isn't one, or that another field has, stays as it was.
    type("form-field-1-name", "Bad Name");
    type("form-field-1-name", "to");
    expect(fields()[1].name).toBe("note");
    type("form-field-1-name", "message");
    expect(fields()[1].name).toBe("message");
    type("form-field-1-hint", "Up to 200 letters");
    type("form-field-1-max", "200");
    type("form-field-1-max", "many");
    expect(fields()[1]).toEqual({ name: "message", kind: "long", label: { en: "A few words" }, hint: { en: "Up to 200 letters" }, max: 200 });
    fireEvent.click(screen.getByTestId("form-field-1-required"));
    expect(fields()[1].required).toBe(true);
    // Another kind: the name and the words stay, what belonged to the old kind goes; a select comes with choices.
    pick("form-field-1-kind", "select");
    expect(fields()[1]).toMatchObject({ name: "message", kind: "select", label: { en: "A few words" }, hint: { en: "Up to 200 letters" }, required: true });
    expect(fields()[1].max).toBeUndefined();
    type("form-field-1-options", "close = Close friends\nall");
    expect(fields()[1].options).toEqual([{ value: "close", label: { en: "Close friends" } }, { value: "all" }]);
    fireEvent.click(screen.getByTestId("form-add"));
    expect(fields()[2]).toMatchObject({ name: "text", kind: "text" });
    fireEvent.click(screen.getByTestId("form-field-2-up"));
    expect(fields().map((f) => f.name)).toEqual(["to", "text", "message"]);
    fireEvent.click(screen.getByTestId("form-field-1-remove"));
    expect(fields().map((f) => f.name)).toEqual(["to", "message"]);
    type("form-button", "Ask her");
    type("form-done", "Asked {{req_to}}");
    expect([saved.button, saved.done]).toEqual([{ en: "Ask her" }, { en: "Asked {{req_to}}" }]);
  });

  it("to a table: only the ones open to the shop; a field for each it can write; a field the table hasn't is a warning", async () => {
    open({ kind: "custom", fields: [{ name: "nickname", kind: "text", label: { en: "Nickname" } }], send: { to: "fn" } });
    pick("form-to", "table");
    expect(saved.send).toEqual({ to: "table" });
    await waitFor(() => expect(screen.getByTestId("form-table")).toBeTruthy());
    expect([...(screen.getByTestId("form-table") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["", "messages", "members"]);
    pick("form-table", "messages");
    expect(saved.send).toEqual({ to: "table", table: "messages" });
    expect(screen.getByTestId("form-who").textContent).toContain("waits as a draft");
    expect(screen.getByTestId("form-missing").textContent).toContain("name, email");
    expect(screen.getByTestId("form-extra").textContent).toContain("nickname");
    expect(screen.getByTestId("form-extra").textContent).toContain("refused");
    expect(screen.getByTestId("form-skipped").textContent).toContain("Photo");
    fireEvent.click(screen.getByTestId("form-fill"));
    // The private field and the picture aren't a shopper's to write.
    expect(fields().map((f) => [f.name, f.kind])).toEqual([["nickname", "text"], ["name", "text"], ["email", "email"], ["topic", "select"], ["age", "number"]]);
    expect(fields()[3].options).toEqual([{ value: "order", label: { en: "An order" } }, { value: "other", label: { en: "other" } }]);
    pick("form-table", "members");
    expect(screen.getByTestId("form-who").textContent).toContain("signed-in shopper");
  });

  it("a member who can't see the functions or the tables types the address", async () => {
    m.noFns = true;
    m.noApi = true;
    open({ kind: "custom", fields: [], send: { to: "fn" } });
    await waitFor(() => expect(screen.getByTestId("form-fn-address")).toBeTruthy());
    type("form-fn-address", "Not An Address");
    expect(saved.send).toEqual({ to: "fn" });
    type("form-fn-address", "friend-request");
    expect(saved.send).toEqual({ to: "fn", fn: "friend-request" });
    pick("form-to", "table");
    await waitFor(() => expect(screen.getByTestId("form-table-address")).toBeTruthy());
    type("form-table-address", "friend-requests");
    expect(saved.send).toEqual({ to: "table", table: "friend-requests" });
  });
});
