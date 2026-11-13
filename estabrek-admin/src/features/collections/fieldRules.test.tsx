// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { CollectionField } from "../../api/collections.api";
import { setLangForTests } from "../../lib/lang";
import { issueSay } from "../data/dataText";
import { defaultDraft, defaultFrom, fitRules, limitFrom, ruleCount, ruleParts, setRules, type RuleFit } from "./fieldRules";

// A field's rules in the fields editor (B2): the pure parts, then the editor itself over a stand-in API.

const api = vi.hoisted(() => ({ listCollections: vi.fn(), collectionPresets: vi.fn(), createCollection: vi.fn(), listItems: vi.fn(), createItem: vi.fn(), updateItem: vi.fn(), updateCollection: vi.fn(), deleteCollection: vi.fn(), deleteItem: vi.fn(), collectionTemplate: vi.fn(), storeTemplate: vi.fn() }));
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
};
vi.mock("../../api/data.api", () => ({ gridMeta: vi.fn(async () => ({ rules: RULES, shapes: ["email", "phone", "url", "letters", "digits", "slug"] })) }));
import CollectionsPage from "./CollectionsPage";

afterEach(() => {
  cleanup();
  setLangForTests("ar");
  vi.clearAllMocks();
});

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

  test("a refused value is said in the owner's words when the field has them", () => {
    expect(issueSay({ message: "Too big", say: { ar: "السعر لحد 1000", en: "Up to 1000" } }, "en")).toEqual({ own: "Up to 1000" });
    expect(issueSay({ message: "Too big", say: { ar: "السعر لحد 1000" } }, "he")).toEqual({ own: "السعر لحد 1000" });
    expect(issueSay({ message: "Too big" }, "ar")).toEqual({ general: "أكبر من المسموح|Too big|גדול מדי" });
    expect(issueSay({ message: "Already used", say: {} }, "ar")).toEqual({ general: expect.stringContaining("مستعملة") });
  });
});

describe("The fields editor", () => {
  const table = { id: "c1", slug: "codes", name: { en: "Codes" }, templateId: null, items: 0, published: 0, createdAt: "", updatedAt: "", fields: [f({ id: "code", type: "text", name: { en: "Code" }, required: true }), f({ id: "price", type: "number", name: { en: "Price" }, max: 1000 }), f({ id: "cover", type: "image", name: { en: "Cover" } })] };

  test("each field's rules open under it: only the ones that fit its kind, and they're saved with the fields", async () => {
    setLangForTests("en");
    api.listCollections.mockResolvedValue([table]);
    api.collectionPresets.mockResolvedValue({});
    api.listItems.mockResolvedValue([]);
    api.updateCollection.mockResolvedValue(table);
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
