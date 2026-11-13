// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { CollectionField } from "../../api/collections.api";
import { setLangForTests } from "../../lib/lang";
import { issueSay } from "../data/dataText";
import { addChoice, defaultDraft, defaultFrom, fitRules, limitFrom, moveChoice, removeChoice, renameChoice, ruleCount, ruleParts, setRules, type RuleFit } from "./fieldRules";
import { impactText, retype, touchesRows, versionLine } from "./schemaText";
import type { Impact } from "../../api/collections.api";

// A field's rules in the fields editor (B2): the pure parts, then the editor itself over a stand-in API.

const api = vi.hoisted(() => ({ listCollections: vi.fn(), collectionPresets: vi.fn(), createCollection: vi.fn(), listItems: vi.fn(), createItem: vi.fn(), updateItem: vi.fn(), updateCollection: vi.fn(), deleteCollection: vi.fn(), deleteItem: vi.fn(), collectionTemplate: vi.fn(), storeTemplate: vi.fn(), previewFields: vi.fn(), listVersions: vi.fn(), previewVersion: vi.fn(), restoreVersion: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock("../../lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../../api/collections.api", () => api);
vi.mock("../../api/pages.api", () => ({ listPages: vi.fn(async () => []), updatePage: vi.fn(async () => ({})) }));
vi.mock("../../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));
const RULES: Record<string, RuleFit> = {
  text: { unique: true, limits: "length", shape: true, default: true },
  longText: { unique: false, limits: "length", shape: false, default: true },
  number: { unique: true, limits: "number", shape: false, default: true },
  date: { unique: true, limits: "date", shape: false, default: true },
  link: { unique: true, limits: null, shape: false, default: true },
  boolean: { unique: false, limits: null, shape: false, default: true },
  select: { unique: false, limits: null, shape: false, default: true },
  color: { unique: false, limits: null, shape: false, default: true },
  image: { unique: false, limits: null, shape: false, default: false },
  money: { unique: false, limits: "number", shape: false, default: true },
  multiSelect: { unique: false, limits: null, shape: false, default: true },
};
vi.mock("../../api/data.api", () => ({ gridMeta: vi.fn(async () => ({ rules: RULES, shapes: ["email", "phone", "url", "letters", "digits", "slug"] })) }));
import CollectionsPage from "./CollectionsPage";

afterEach(() => {
  cleanup();
  setLangForTests("ar");
  vi.clearAllMocks();
});
beforeEach(() => {
  // A save looks at what it would do first; by default it touches no row, and there are no earlier versions.
  api.previewFields.mockResolvedValue({ changes: [], needsAccept: false });
  api.listVersions.mockResolvedValue([]);
});
const impact = (over: Partial<Impact> & { field: string; change: Impact["change"] }): Impact => ({ rows: 0, converted: 0, lost: 0, hidden: 0, failing: 0, missing: 0, doubles: 0, samples: [], ...over });

const f = (over: Partial<CollectionField> & { id: string; type: CollectionField["type"] }): CollectionField => ({ ...over });

describe("A field's rules, the pure parts", () => {
  test("a rule set to nothing is taken off, so an untouched field is saved as it was", () => {
    const price = f({ id: "price", type: "number" });
    expect(setRules(price, { unique: true, min: 0, max: 1000 })).toEqual({ id: "price", type: "number", unique: true, min: 0, max: 1000 });
    expect(setRules({ ...price, unique: true, min: 0 }, { unique: false, min: undefined })).toEqual(price);
    expect(setRules(price, { min: Number("x"), help: { ar: "  " }, message: { en: "" } })).toEqual(price);
    expect(setRules(price, { help: { ar: "بالشيكل" } })).toEqual({ ...price, help: { ar: "بالشيكل" } });
    // "No" is a real default; nothing isn't.
    expect(setRules(f({ id: "on", type: "boolean" }), { default: false })).toEqual({ id: "on", type: "boolean", default: false });
    expect(setRules(f({ id: "on", type: "boolean", default: true }), { default: undefined })).toEqual({ id: "on", type: "boolean" });
    expect(setRules(f({ id: "t", type: "text", default: { ar: "x" } }), { default: undefined })).toEqual({ id: "t", type: "text" });
  });

  test("a default as it's written and as the field keeps it", () => {
    const title = f({ id: "title", type: "text", default: { en: "Untitled" } });
    expect(defaultDraft(title, "en")).toBe("Untitled");
    expect(defaultDraft(title, "ar")).toBe("");
    expect(defaultFrom(title, "ar", "بدون عنوان")).toEqual({ en: "Untitled", ar: "بدون عنوان" });
    expect(defaultFrom(title, "en", " ")).toBeUndefined();
    expect(defaultFrom(f({ id: "p", type: "number" }), "ar", "12.5")).toBe(12.5);
    expect(defaultFrom(f({ id: "p", type: "number" }), "ar", "x")).toBeUndefined();
    expect(defaultFrom(f({ id: "on", type: "boolean" }), "ar", "false")).toBe(false);
    expect(defaultFrom(f({ id: "on", type: "boolean" }), "ar", "")).toBeUndefined();
    expect(defaultDraft(f({ id: "on", type: "boolean", default: false }), "ar")).toBe("false");
    expect(defaultFrom(f({ id: "d", type: "date" }), "ar", "2026-11-13")).toBe("2026-11-13");
    expect(limitFrom(RULES.number, "10")).toBe(10);
    expect(limitFrom(RULES.date, "2026-01-01")).toBe("2026-01-01");
    expect(limitFrom(RULES.text, "")).toBeUndefined();
  });

  test("rules that don't fit the field's kind come off; a field's rules in a few words", () => {
    expect(fitRules(f({ id: "x", type: "boolean", unique: true, min: 1, shape: "email", pattern: "^a$", default: true }), RULES.boolean)).toEqual({ id: "x", type: "boolean", default: true });
    expect(fitRules(f({ id: "x", type: "image", default: "/a.jpg", help: { en: "A picture" } }), RULES.image)).toEqual({ id: "x", type: "image", help: { en: "A picture" } });
    const code = f({ id: "code", type: "text", unique: true, min: 2, max: 10, shape: "slug", default: { en: "new" }, message: { en: "x" } });
    expect(ruleCount(code)).toBe(6);
    expect(ruleCount(f({ id: "a", type: "text", required: true }))).toBe(0);
    expect(ruleParts(code, "en").map((p) => p.split("|")[1])).toEqual(["no doubles", "2–10 letters", "url-word (a-z, 0-9, -)", "starts as new"]);
    expect(ruleParts(f({ id: "p", type: "number", max: 1000, default: 0 }), "ar").map((p) => p.split("|")[0])).toEqual(["…–1000", "بيبدأ بـ 0"]);
    expect(ruleParts(f({ id: "on", type: "boolean", default: false }), "ar")[0]).toContain("بيبدأ بـ لا");
    expect(ruleParts(f({ id: "c", type: "text", pattern: "^[A-Z]+$" }), "en")[0]).toContain("pattern: ^[A-Z]+$");
  });

  test("a choice field's choices: added with an id of their own, renamed, moved, removed (the last one stays)", () => {
    const tags = f({ id: "tags", type: "multiSelect", options: [{ id: "one", name: { en: "One" } }], default: ["one"] });
    const two = addChoice(tags, "On sale", "en");
    expect(two.options).toEqual([{ id: "one", name: { en: "One" } }, { id: "onSale", name: { en: "On sale" } }]);
    // A name without latin letters gets "choice", then "choice2"; a taken id gets a number.
    const three = addChoice(addChoice(two, "جديد", "ar"), "آخر القطع", "ar");
    expect(three.options?.map((o) => o.id)).toEqual(["one", "onSale", "choice", "choice2"]);
    expect(addChoice(two, "on sale", "en").options?.map((o) => o.id)).toEqual(["one", "onSale", "onSale2"]);
    expect(renameChoice(two, "onSale", "ar", "تخفيض").options?.[1]).toEqual({ id: "onSale", name: { en: "On sale", ar: "تخفيض" } });
    expect(moveChoice(two, "onSale", -1).options?.map((o) => o.id)).toEqual(["onSale", "one"]);
    expect(moveChoice(two, "one", -1)).toBe(two);
    // Removing a choice lets go of a default that named it; the last choice can't go.
    expect(removeChoice(two, "one")).toEqual({ id: "tags", type: "multiSelect", options: [{ id: "onSale", name: { en: "On sale" } }] });
    expect(removeChoice(tags, "one")).toBe(tags);
    expect(removeChoice(f({ id: "kind", type: "select", options: [{ id: "a" }, { id: "b" }], default: "a" }), "a")).toEqual({ id: "kind", type: "select", options: [{ id: "b" }] });
    // Defaults of the newer kinds, as the field keeps them.
    expect(defaultFrom(two, "en", "onSale,one")).toEqual(["onSale", "one"]);
    expect(defaultDraft({ ...two, default: ["one", "onSale"] }, "en")).toBe("one,onSale");
    expect(defaultFrom(f({ id: "p", type: "money" }), "en", "12.5")).toBe(12.5);
    expect(defaultFrom(f({ id: "p", type: "money" }), "en", "cheap")).toBeUndefined();
    expect(defaultFrom(f({ id: "m", type: "email" }), "en", " a@b.co ")).toBe("a@b.co");
  });

  test("a change of fields in words: what turns, what's put aside, what no longer passes", () => {
    const en = (c: Impact, name = "Price") => impactText(c, name).split("|")[1];
    expect(en(impact({ field: "price", change: "retyped", from: "text", to: "number", rows: 3, converted: 2, lost: 1 }))).toBe("“Price”: from Short words to Number. 2 values turn into the new kind. 1 values can't turn: they're put aside, and come back as they were if the kind is changed back.");
    expect(en(impact({ field: "price", change: "retyped", from: "text", to: "number" }))).toContain("No row holds a value there yet.");
    expect(en(impact({ field: "note", change: "removed", from: "text", rows: 1200, hidden: 1200 }), "Note")).toBe("“Note” goes. Its 1,200 values stay kept, hidden, and show again if the field comes back.");
    expect(en(impact({ field: "note", change: "removed" }), "Note")).toContain("It held no values.");
    expect(en(impact({ field: "note", change: "added", to: "number", rows: 3, converted: 1, lost: 2, missing: 5 }), "Note")).toBe("“Note”: a new field. 1 earlier values under this id show again. 2 earlier values don't fit its kind: they stay put aside. 5 rows hold nothing there, and it's required.");
    expect(en(impact({ field: "kind", change: "ruled", rows: 4, failing: 2, doubles: 2 }), "Kind")).toBe("“Kind”: new rules or choices. 2 values don't pass them: they stay as they are, and are refused when next changed. 2 rows share a value with another, and the field takes no doubles.");
    expect(impactText(impact({ field: "price", change: "retyped", from: "text", to: "number", rows: 1, converted: 1 }), "السعر").split("|")[0]).toBe("«السعر»: من «كلام قصير» لـ «رقم». 1 قيمة بتتحوّل.");
    // Only a change that touches some row is shown before the save.
    expect(touchesRows([])).toBe(false);
    expect(touchesRows([impact({ field: "a", change: "ruled", rows: 9 })])).toBe(false);
    expect(touchesRows([impact({ field: "a", change: "ruled", rows: 9, failing: 1 })])).toBe(true);
    expect(touchesRows([impact({ field: "a", change: "retyped", rows: 9, converted: 9 })])).toBe(true);
    expect(versionLine([impact({ field: "price", change: "retyped", from: "text", to: "number" }), impact({ field: "note", change: "removed" })], "en")).toBe("price: Short words ← Number · note: removed");
    expect(versionLine([], "ar")).toBe("تعديل بالأسماء أو الإعدادات");
  });

  test("a field given another kind: what the new kind can't have comes off; a choice kind gets a first choice", () => {
    const price = f({ id: "price", type: "number", name: { en: "Price" }, min: 0, max: 10, default: 5, unique: true, help: { en: "In shekels" } });
    expect(retype(price, "text", RULES.text)).toEqual({ id: "price", type: "text", name: { en: "Price" }, min: 0, max: 10, unique: true, help: { en: "In shekels" } });
    expect(retype(price, "boolean", RULES.boolean)).toEqual({ id: "price", type: "boolean", name: { en: "Price" }, help: { en: "In shekels" } });
    expect(retype(price, "select", RULES.select)).toEqual({ id: "price", type: "select", name: { en: "Price" }, help: { en: "In shekels" }, options: [{ id: "one", name: { en: "Price" } }] });
    const kind = f({ id: "kind", type: "select", options: [{ id: "a" }, { id: "b" }], default: "a" });
    expect(retype(kind, "multiSelect", RULES.multiSelect)).toEqual({ id: "kind", type: "multiSelect", options: [{ id: "a" }, { id: "b" }] });
    expect(retype(kind, "text", RULES.text)).toEqual({ id: "kind", type: "text" });
    expect(retype(f({ id: "p", type: "money", currency: "USD" }), "number", RULES.number)).toEqual({ id: "p", type: "number" });
    expect(retype(price, "number", RULES.number)).toBe(price);
  });

  test("a refused value is said in the owner's words when the field has them", () => {
    expect(issueSay({ message: "Too big", say: { ar: "السعر لحد 1000", en: "Up to 1000" } }, "en")).toEqual({ own: "Up to 1000" });
    expect(issueSay({ message: "Too big", say: { ar: "السعر لحد 1000" } }, "he")).toEqual({ own: "السعر لحد 1000" });
    expect(issueSay({ message: "Too big" }, "ar")).toEqual({ general: "أكبر من المسموح|Too big|גדול מדי" });
    expect(issueSay({ message: "Already used", say: {} }, "ar")).toEqual({ general: expect.stringContaining("مستعملة") });
  });
});

describe("The fields editor", () => {
  const table = { id: "c1", slug: "codes", name: { en: "Codes" }, templateId: null, items: 0, published: 0, createdAt: "", updatedAt: "", fields: [f({ id: "code", type: "text", name: { en: "Code" }, required: true }), f({ id: "price", type: "number", name: { en: "Price" }, max: 1000 }), f({ id: "cover", type: "image", name: { en: "Cover" } })] };

  test("a change that touches the rows is shown first; nothing is saved until it's agreed to", async () => {
    setLangForTests("en");
    api.listCollections.mockResolvedValue([table]);
    api.collectionPresets.mockResolvedValue({});
    api.listItems.mockResolvedValue([]);
    const changes = [impact({ field: "price", change: "retyped", from: "number", to: "text", rows: 3, converted: 3 }), impact({ field: "cover", change: "removed", from: "image", rows: 2, hidden: 2 }), impact({ field: "code", change: "ruled", rows: 3, failing: 1, samples: [{ slug: "c", value: '{"en":"x"}', why: "Too short" }] })];
    api.previewFields.mockResolvedValue({ changes, needsAccept: true });
    api.updateCollection.mockImplementation(async (_id: string, body: { fields: CollectionField[] }) => ({ ...table, fields: body.fields, changes }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <CollectionsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByText("Fields"));
    // The price becomes words (its number limits come off with the kind), the picture goes.
    fireEvent.click(await screen.findByTestId("field-rules-price"));
    fireEvent.change(screen.getByTestId("rule-price-kind"), { target: { value: "text" } });
    fireEvent.click(within(screen.getAllByTestId("field-row")[2]).getByText("×"));
    fireEvent.click(screen.getByTestId("fields-save"));
    expect((await screen.findByTestId("schema-change-price")).textContent).toContain("3 values turn into the new kind.");
    expect(screen.getByTestId("schema-change-cover").textContent).toContain("Its 2 values stay kept, hidden");
    expect(screen.getByTestId("schema-change-code").textContent).toContain("c: {\"en\":\"x\"} (Too short)");
    expect(api.previewFields.mock.calls[0][1].fields).toEqual([table.fields[0], { id: "price", type: "text", name: { en: "Price" }, max: 1000 }]);
    expect(api.updateCollection).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("schema-accept"));
    await waitFor(() => expect(api.updateCollection).toHaveBeenCalledWith("c1", expect.objectContaining({ fields: [table.fields[0], { id: "price", type: "text", name: { en: "Price" }, max: 1000 }] }), true));
    await waitFor(() => expect(screen.queryByTestId("schema-changes")).toBeNull());
  });

  test("earlier versions: what going back would do is shown, then the fields are back as they were", async () => {
    setLangForTests("en");
    api.listCollections.mockResolvedValue([table]);
    api.collectionPresets.mockResolvedValue({});
    api.listItems.mockResolvedValue([]);
    api.listVersions.mockResolvedValue([{ id: "v1", createdAt: "2026-11-13T10:00:00Z", who: "Sara", fields: [{ id: "code", type: "text" }, { id: "price", type: "text" }], changes: [impact({ field: "price", change: "retyped", from: "text", to: "number", rows: 3, converted: 2, lost: 1 })] }]);
    api.previewVersion.mockResolvedValue({ changes: [impact({ field: "price", change: "retyped", from: "number", to: "text", rows: 3, converted: 3 })], needsAccept: false });
    const older = [{ id: "code", type: "text" as const, name: { en: "Code" } }, { id: "price", type: "text" as const, name: { en: "Price" } }];
    api.restoreVersion.mockResolvedValue({ ...table, fields: older });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <CollectionsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByText("Fields"));
    fireEvent.click(await screen.findByTestId("versions-toggle"));
    expect(screen.getByTestId("version-row").textContent).toContain("Sara");
    expect(screen.getByTestId("version-row").textContent).toContain("price: Short words ← Number");
    fireEvent.click(screen.getByTestId("version-restore-v1"));
    expect((await screen.findByTestId("schema-change-price")).textContent).toContain("from Number to Short words. 3 values turn into the new kind.");
    expect(api.restoreVersion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("schema-accept"));
    await waitFor(() => expect(api.restoreVersion).toHaveBeenCalledWith("c1", "v1", true));
    // The editor shows the fields that came back.
    await waitFor(() => expect(screen.getAllByTestId("field-row").map((r) => r.getAttribute("data-field"))).toEqual(["code", "price"]));
  });

  test("a new kind of field: several choices get their choices, money its currency", async () => {
    setLangForTests("en");
    api.listCollections.mockResolvedValue([table]);
    api.collectionPresets.mockResolvedValue({});
    api.listItems.mockResolvedValue([]);
    api.updateCollection.mockImplementation(async (_id: string, body: { fields: CollectionField[] }) => ({ ...table, fields: body.fields }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <CollectionsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByText("Fields"));
    const kinds = [...(screen.getByTestId("field-new-type") as HTMLSelectElement).options].map((o) => o.value);
    expect(kinds).toHaveLength(20);
    expect(kinds).toEqual(expect.arrayContaining(["email", "phone", "datetime", "money", "multiSelect", "file", "video", "model3d", "json", "location"]));
    fireEvent.change(screen.getByTestId("field-new-type"), { target: { value: "multiSelect" } });
    fireEvent.click(screen.getByTestId("field-add"));
    fireEvent.change(screen.getByTestId("field-new-type"), { target: { value: "money" } });
    fireEvent.click(screen.getByTestId("field-add"));
    // The new choice field starts with one choice; more are added by name, and one can go.
    fireEvent.click(await screen.findByTestId("field-rules-severalChoices"));
    fireEvent.change(screen.getByTestId("choice-severalChoices-one-name"), { target: { value: "New" } });
    fireEvent.change(screen.getByTestId("choices-severalChoices-new"), { target: { value: "On sale" } });
    fireEvent.click(screen.getByTestId("choices-severalChoices-add"));
    fireEvent.change(screen.getByTestId("choices-severalChoices-new"), { target: { value: "Last pieces" } });
    fireEvent.keyDown(screen.getByTestId("choices-severalChoices-new"), { key: "Enter" });
    fireEvent.click(screen.getByTestId("choice-severalChoices-onSale-remove"));
    fireEvent.click(screen.getByTestId("rule-severalChoices-default-lastPieces"));
    fireEvent.click(screen.getByTestId("field-rules-money"));
    fireEvent.change(screen.getByTestId("rule-money-currency"), { target: { value: "USD" } });
    fireEvent.change(screen.getByTestId("rule-money-min"), { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("fields-save"));
    await waitFor(() => expect(api.updateCollection).toHaveBeenCalledTimes(1));
    expect(api.updateCollection.mock.calls[0][1].fields.slice(3)).toEqual([
      { id: "severalChoices", type: "multiSelect", name: { ar: "عدة اختيارات", en: "Several choices", he: "כמה בחירות" }, options: [{ id: "one", name: { ar: "عدة اختيارات", en: "New", he: "כמה בחירות" } }, { id: "lastPieces", name: { en: "Last pieces" } }], default: ["lastPieces"] },
      { id: "money", type: "money", name: { ar: "مبلغ (عملة)", en: "Money", he: "סכום (מטבע)" }, currency: "USD", min: 0 },
    ]);
  });

  test("each field's rules open under it: only the ones that fit its kind, and they're saved with the fields", async () => {
    setLangForTests("en");
    api.listCollections.mockResolvedValue([table]);
    api.collectionPresets.mockResolvedValue({});
    api.listItems.mockResolvedValue([]);
    api.updateCollection.mockImplementation(async (_id: string, body: { fields: CollectionField[] }) => ({ ...table, fields: body.fields }));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <CollectionsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByText("Fields"));
    // A field that already has rules says so, in a few words.
    expect((await screen.findByTestId("field-rules-price")).textContent).toBe("Rules (1)");
    expect(screen.getByTestId("field-rules-summary-price").textContent).toBe("…–1000");
    fireEvent.click(screen.getByTestId("field-rules-code"));
    fireEvent.click(screen.getByTestId("rule-code-unique"));
    fireEvent.change(screen.getByTestId("rule-code-min"), { target: { value: "6" } });
    fireEvent.change(screen.getByTestId("rule-code-shape"), { target: { value: "$own" } });
    fireEvent.change(screen.getByTestId("rule-code-pattern"), { target: { value: "^[A-Z]{2}-\\d{3}$" } });
    fireEvent.change(screen.getByTestId("rule-code-message"), { target: { value: "A code looks like AB-123" } });
    // A field with no doubles can't start every new row from one value: its default box is gone.
    expect(screen.queryByTestId("rule-code-default")).toBeNull();
    // A picture has no doubles rule, no limits, no shape and no default: only its words.
    fireEvent.click(screen.getByTestId("field-rules-cover"));
    expect(screen.queryByTestId("rule-cover-unique")).toBeNull();
    expect(screen.queryByTestId("rule-cover-min")).toBeNull();
    expect(screen.queryByTestId("rule-cover-default")).toBeNull();
    fireEvent.change(screen.getByTestId("rule-cover-help"), { target: { value: "A wide picture" } });
    // A ready shape takes the place of the owner's own pattern.
    fireEvent.click(screen.getByTestId("field-rules-price"));
    fireEvent.change(screen.getByTestId("rule-price-min"), { target: { value: "0" } });
    fireEvent.change(screen.getByTestId("rule-price-default"), { target: { value: "10" } });
    fireEvent.click(screen.getByTestId("fields-save"));
    await waitFor(() => expect(api.updateCollection).toHaveBeenCalledTimes(1));
    expect(api.updateCollection.mock.calls[0][1].fields).toEqual([
      { id: "code", type: "text", name: { en: "Code" }, required: true, unique: true, min: 6, pattern: "^[A-Z]{2}-\\d{3}$", message: { en: "A code looks like AB-123" } },
      { id: "price", type: "number", name: { en: "Price" }, max: 1000, min: 0, default: 10 },
      { id: "cover", type: "image", name: { en: "Cover" }, help: { en: "A wide picture" } },
    ]);
  });
});
