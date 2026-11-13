import { describe, expect, test } from "vitest";
import type { CollectionField } from "../../api/collections.api";
import { KIND_NAME, choiceName, draftFrom, draftProblem, localInput, mapLink, moneyText, placeDraft, placeJoin, placeParts, shownText, valueFrom } from "./kinds";

// Each kind of field between the value a row keeps and the words in a box.

const f = (type: CollectionField["type"], over: Partial<CollectionField> = {}): CollectionField => ({ id: "x", type, ...over });
const tags = f("multiSelect", { options: [{ id: "new", name: { en: "New", ar: "جديد" } }, { id: "sale", name: { en: "On sale" } }] });

describe("A value and the words in its box", () => {
  test("every kind has a name", () => {
    expect(Object.keys(KIND_NAME)).toHaveLength(19);
    for (const name of Object.values(KIND_NAME)) expect(name.split("|")).toHaveLength(3);
  });

  test("each kind's value as words, and back", () => {
    const round = (field: CollectionField, value: unknown) => valueFrom(field, draftFrom(field, value));
    expect(round(f("number"), 12.5)).toBe(12.5);
    expect(round(f("money"), 0)).toBe(0);
    expect(round(f("boolean"), false)).toBe(false);
    expect(round(f("date"), "2026-11-13")).toBe("2026-11-13");
    expect(round(f("email"), "sara@example.test")).toBe("sara@example.test");
    expect(round(tags, ["new", "sale"])).toEqual(["new", "sale"]);
    expect(round(f("json"), { a: [1, 2], b: "x" })).toEqual({ a: [1, 2], b: "x" });
    expect(round(f("json"), "plain words")).toBe("plain words");
    expect(round(f("location"), { lat: 31.778, lng: 35.235, label: "The old city, by the gate" })).toEqual({ lat: 31.778, lng: 35.235, label: "The old city, by the gate" });
    expect(round(f("location"), { lat: 31.778, lng: 35.235 })).toEqual({ lat: 31.778, lng: 35.235 });
    // A moment goes through this browser's own clock and comes back the same moment.
    expect(round(f("datetime"), "2026-11-13T12:30:00.000Z")).toBe("2026-11-13T12:30:00.000Z");
    expect(localInput("2026-11-13T12:30:00.000Z")).toMatch(/^2026-11-1[34]T\d{2}:\d{2}$/);
    expect(localInput("nonsense")).toBe("");
  });

  test("an empty box empties the field; what can't be turned goes as written, for the server to say", () => {
    for (const type of ["number", "money", "boolean", "datetime", "multiSelect", "json", "location", "email"] as const) expect(valueFrom(f(type), "  "), type).toBeNull();
    expect(valueFrom(f("number"), "1,250")).toBe("1,250");
    expect(valueFrom(f("money"), "cheap")).toBe("cheap");
    expect(valueFrom(f("location"), "the old city")).toBe("the old city");
    expect(valueFrom(f("datetime"), "soon")).toBe("soon");
    expect(valueFrom(tags, " , ")).toBeNull();
    expect(draftFrom(f("number"), undefined)).toBe("");
    expect(draftFrom(f("email"), { not: "words" })).toBe("");
  });

  test("words that can't be sent as they are, are said before anything goes", () => {
    expect(draftProblem(f("json"), '{"a": 1')).toContain("JSON");
    expect(draftProblem(f("json"), '{"a": 1}')).toBeNull();
    expect(draftProblem(f("json"), "")).toBeNull();
    expect(draftProblem(f("datetime"), "soon")).toContain("can't be read");
    expect(draftProblem(f("datetime"), "2026-11-13T14:30")).toBeNull();
    expect(draftProblem(f("number"), "abc")).toBeNull();
  });

  test("a place's three boxes", () => {
    expect(placeParts("31.778, 35.235, The old city, by the gate")).toEqual({ lat: "31.778", lng: "35.235", label: "The old city, by the gate" });
    expect(placeParts("")).toEqual({ lat: "", lng: "", label: "" });
    expect(placeJoin({ lat: "31.7", lng: "", label: "" })).toBe("31.7, ");
    expect(placeJoin({ lat: "", lng: "", label: "" })).toBe("");
    expect(placeDraft({ lat: 1, lng: 2 })).toBe("1, 2");
    expect(placeDraft("words")).toBe("");
    expect(mapLink({ lat: 31.778, lng: 35.235 })).toBe("https://www.google.com/maps/search/?api=1&query=31.778,35.235");
    expect(mapLink({ lat: "31" })).toBeNull();
  });
});

describe("A value as a cell shows it", () => {
  test("each kind as words", () => {
    expect(shownText(f("money", { currency: "USD" }), 1250.5, "en")).toBe("US$1,250.50");
    expect(moneyText(80, undefined, "en")).toContain("80");
    expect(moneyText(80, "XXXX", "en")).toBe("80 XXXX");
    expect(shownText(tags, ["new", "sale"], "en")).toBe("New, On sale");
    expect(shownText(tags, ["new", "sale"], "ar")).toBe("جديد، On sale");
    expect(shownText(tags, ["gone"], "en")).toBe("gone");
    expect(choiceName(tags, "new", "he")).toBe("جديد");
    expect(shownText(f("datetime"), "2026-11-13T12:30:00.000Z", "en")).toMatch(/1[34] Nov 2026/);
    expect(shownText(f("json"), { a: 1 }, "en")).toBe('{"a":1}');
    expect(shownText(f("json"), { text: "x".repeat(100) }, "en")).toHaveLength(58);
    expect(shownText(f("location"), { lat: 31.778, lng: 35.235, label: "The old city" }, "en")).toBe("The old city");
    expect(shownText(f("location"), { lat: 31.778, lng: 35.235 }, "en")).toBe("31.778, 35.235");
    expect(shownText(f("file"), "https://files.test/docs/chair%20guide.pdf?v=2", "en")).toBe("chair guide.pdf");
    expect(shownText(f("video"), "/media/a.mp4", "en")).toBe("a.mp4");
    expect(shownText(f("email"), "sara@example.test", "en")).toBe("sara@example.test");
    expect(shownText(f("boolean"), false, "en")).toBe("");
    expect(shownText(f("number"), 1250.5, "ar")).toBe("1,250.5");
    expect(shownText(f("phone"), null, "en")).toBe("");
  });
});
