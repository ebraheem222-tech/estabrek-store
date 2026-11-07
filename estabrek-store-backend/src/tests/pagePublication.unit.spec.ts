import { describe, expect, test } from "vitest";
import { publicationChange, publicationSnapshot, publicationState, samePublication } from "../lib/pagePublication.js";

const now = new Date("2026-11-07T10:00:00Z");
const page = { status: "DRAFT" as const, slug: "/t", publishAt: null, unpublishAt: null };

describe("publication lifecycle", () => {
  test("publishing a new draft makes its content publicly available", () => {
    const change = publicationChange(page, {}, now);
    expect(change).toEqual({ status: "PUBLISHED", publishAt: null, unpublishAt: null });
    expect(publicationState({ ...page, ...change }, now)).toMatchObject({ state: "live", public: true, slug: "/t" });
  });

  test.each([
    { publishAt: "2026-11-08T10:00:00Z", unpublishAt: null, state: "scheduled" },
    { publishAt: "2026-11-06T10:00:00Z", unpublishAt: "2026-11-07T09:59:59Z", state: "expired" },
    { publishAt: "2026-11-07T10:00:00Z", unpublishAt: "2026-11-08T10:00:00Z", state: "live" },
    { publishAt: null, unpublishAt: "2026-11-07T10:00:00Z", state: "expired" },
  ])("keeps the existing publication window: $state", ({ state, ...dates }) => {
    const change = publicationChange({ ...page, ...dates }, {}, now);
    expect(change.publishAt?.toISOString() ?? null).toBe(dates.publishAt ? new Date(dates.publishAt).toISOString() : null);
    expect(change.unpublishAt?.toISOString() ?? null).toBe(dates.unpublishAt ? new Date(dates.unpublishAt).toISOString() : null);
    expect(publicationState({ ...page, ...change }, now)).toMatchObject({ state, public: state === "live" });
  });

  test("only an explicit publish-now choice clears the existing dates", () => {
    const source = { ...page, publishAt: "2026-11-08T10:00:00Z", unpublishAt: "2026-11-09T10:00:00Z" };
    const change = publicationChange(source, { mode: "now" }, now);
    expect(change).toEqual({ status: "PUBLISHED", publishAt: null, unpublishAt: null });
    expect(source.publishAt).toBe("2026-11-08T10:00:00Z");
  });

  test("archived content needs explicit republish even when publish-now is requested", () => {
    expect(() => publicationChange({ ...page, status: "ARCHIVED" }, {}, now)).toThrowError(expect.objectContaining({ code: "ARCHIVED_CONFIRMATION_REQUIRED", status: 409 }));
    expect(() => publicationChange({ ...page, status: "ARCHIVED" }, { mode: "now" }, now)).toThrowError(expect.objectContaining({ code: "ARCHIVED_CONFIRMATION_REQUIRED" }));
    expect(publicationChange({ ...page, status: "ARCHIVED" }, { republishArchived: true }, now)).toMatchObject({ status: "PUBLISHED" });
  });

  test.each(["DRAFT", "ARCHIVED"] as const)("a %s page is private despite being inside its date window", status => {
    expect(publicationState({ ...page, status }, now)).toMatchObject({ state: status === "DRAFT" ? "draft" : "archived", public: false });
  });

  test("a published reusable block has no public page URL", () => {
    expect(publicationState({ ...page, status: "PUBLISHED", kind: "block" }, now)).toMatchObject({ public: false });
  });

  test("an invalid existing window is not silently accepted unless explicitly cleared", () => {
    const source = { ...page, publishAt: "2026-11-09T10:00:00Z", unpublishAt: "2026-11-08T10:00:00Z" };
    expect(() => publicationChange(source, {}, now)).toThrowError(expect.objectContaining({ code: "PUBLICATION_WINDOW_INVALID", status: 400 }));
    expect(publicationChange(source, { mode: "now" }, now)).toMatchObject({ publishAt: null, unpublishAt: null });
  });

  test("snapshots normalize equivalent date representations without recording unrelated content", () => {
    const before = { ...page, publishAt: new Date("2026-11-07T12:00:00+02:00"), name: "A" };
    expect(publicationSnapshot(before)).toEqual({ status: "DRAFT", slug: "/t", publishAt: "2026-11-07T10:00:00.000Z", unpublishAt: null });
    expect(samePublication(publicationSnapshot(before), { ...page, publishAt: "2026-11-07T10:00:00Z", name: "B" })).toBe(true);
  });

  test.each([
    { status: "ARCHIVED" }, { slug: "/new" }, { publishAt: "2026-11-08T10:00:00Z" }, { unpublishAt: "2026-11-09T10:00:00Z" },
  ])("an old confirmation detects lifecycle changes: %j", change => {
    expect(samePublication(publicationSnapshot(page), { ...page, ...change })).toBe(false);
  });
});
