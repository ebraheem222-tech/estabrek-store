// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Feature, Removal, TemplatePreview } from "../../api/myFeatures.api";

// ميزاتي → templates (stage 4), over a stand-in API: a template file read and shown before anything
// is written, then installed as a draft; a feature downloaded as a file, with what couldn't go into
// it; a feature removed with everything in it, its tables' rows kept or deleted. The server's side
// is backend featureTemplates.spec.ts.

const m = vi.hoisted(() => ({
  listFeatures: vi.fn(),
  getFeature: vi.fn(),
  createFeature: vi.fn(),
  saveFeature: vi.fn(),
  deleteFeature: vi.fn(),
  addFeatureItem: vi.fn(),
  removeFeatureItem: vi.fn(),
  exportFeature: vi.fn(),
  previewTemplate: vi.fn(),
  installTemplate: vi.fn(),
  removalOf: vi.fn(),
  removeFeature: vi.fn(),
  may: new Set<string>(),
}));
vi.mock("../../api/myFeatures.api", () => m);
vi.mock("../../api/collections.api", () => ({ createCollection: vi.fn() }));
vi.mock("../../api/functions.api", () => ({ createFunction: vi.fn() }));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: (p: string) => m.may.has(p) }) }));

import { setLangForTests } from "../../lib/lang";
import MyFeaturesPage from "./MyFeaturesPage";
import FeaturePage from "./FeaturePage";
import { movedText, nextMinor, noteText, problemText, readJson, stepPlace, stepsText } from "./templatesText";

// The marks that keep a Latin word whole inside Arabic or Hebrew (invisible), left out where words are compared.
const plain = (s: string | null | undefined) => (s ?? "").replace(new RegExp(`[${String.fromCodePoint(0x2068, 0x2069)}]`, "g"), "");

const closed = { read: "off", create: "off", update: "off", delete: "off" } as const;
const feature = (over: Partial<Feature> = {}): Feature => ({
  id: "m1",
  name: "Help desk",
  note: null,
  enabled: true,
  template: null,
  createdAt: "2026-11-18T10:00:00Z",
  updatedAt: "2026-11-18T10:00:00Z",
  tables: [{ id: "t1", slug: "tickets", name: { en: "Tickets" }, fields: 3, rows: 4, api: closed }],
  functions: [{ id: "f1", name: "Open a ticket", note: null, enabled: true, published: false, changed: true, triggers: 1, runs: 0, lastRunAt: null }],
  pages: [{ id: "p1", name: "My tickets", slug: "/my-tickets", status: "DRAFT", hasDraft: false }],
  free: { tables: [], functions: [], pages: [] },
  limits: { features: 100, items: 60 },
  ...over,
});
const preview = (over: Partial<Extract<TemplatePreview, { template: object }>> = {}): TemplatePreview => ({
  ok: true,
  template: { key: "help-desk", version: "1.0.0", name: { en: "Help desk", ar: "الدعم" }, note: { en: "Tickets and replies" } },
  tables: [{ key: "tickets", name: { en: "Tickets" }, slug: "tickets-2", was: "tickets", fields: 3, api: { ...closed, read: "customer" }, itemPage: false }],
  functions: [{ key: "open", name: "Open a ticket", steps: 4, triggers: [{ kind: "call", slug: "open-ticket", was: null }] }],
  pages: [{ key: "mine", name: "My tickets", slug: "/my-tickets", was: null }],
  needs: { secrets: [{ name: "HELP_KEY", kept: false }], sites: [{ host: "help.example.com", allowed: true }] },
  installed: [],
  problems: [],
  ...over,
});
const removal = (over: Partial<Removal> = {}): Removal => ({
  tables: [{ id: "t1", name: "Tickets", slug: "tickets", rows: 4 }],
  functions: [{ id: "f1", name: "Open a ticket", runs: 0 }],
  pages: [{ id: "p1", name: "My tickets", slug: "/my-tickets", status: "DRAFT" }],
  blockers: { linked: [], called: [] },
  uses: { functions: [], pages: [] },
  ...over,
});

function show(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/my-features" element={<MyFeaturesPage />} />
          <Route path="/admin/my-features/:id" element={<FeaturePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const choose = (text: string, name = "help-desk-1.0.0.feature.json") => fireEvent.change(screen.getByTestId("template-file"), { target: { files: [new File([text], name, { type: "application/json" })] } });

let saved: Array<{ name: string; text: string }> = [];
beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.may = new Set(["features:read", "features:write", "functions:read", "functions:write", "pages:read", "pages:write"]);
  m.listFeatures.mockResolvedValue({ features: [], limits: { features: 100, items: 60 } });
  m.getFeature.mockImplementation(async (id: string) => feature({ id }));
  saved = [];
  // The download: the page makes a link to the file and presses it.
  URL.createObjectURL = vi.fn(() => "blob:file");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    saved.push({ name: this.download, text: "" });
  });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
  vi.restoreAllMocks();
});

describe("The words", () => {
  test("what couldn't go into a file, where a step is, where a file is wrong, what moved", () => {
    expect(stepPlace("do.2", "en")).toBe("step 3");
    expect(stepPlace("do.1.else.0", "en")).toBe("step 2 › else 1");
    expect(stepPlace("fail.0", "ar")).toBe("الخطوة إذا فشل 1");
    expect(noteText({ what: "stepTableOut", fn: "Open", at: "do.2" }, "en")).toBe("“Open”, step 3: uses a table outside the feature. It goes without one, to be picked after installing.");
    expect(noteText({ what: "relationOut", table: "Tickets", field: "note" }, "ar")).toBe("حقل «note» بجدول «Tickets» بيربط جدول برّا الميزة: ما انحط بالملف.");
    expect(noteText({ what: "listOut", page: "Help" }, "he")).toBe("בעמוד «Help» יש רשימה של טבלה מחוץ לתכונה: הרשימה לא בקובץ.");
    expect(problemText({ at: "format", message: "This file isn't a feature template" }, "ar")).toBe("هاد الملف مش قالب ميزة");
    expect(problemText({ at: "tables.1.fields.1.to", message: 'No table "nothing" in this template' }, "en")).toBe("No table “nothing” in the template");
    expect(problemText({ at: "", message: "A template file is up to 2 MB" }, "he")).toBe("קובץ תבנית הוא עד 2 MB");
    expect(problemText({ at: "x", message: "Something new" }, "ar"), "the server's own words otherwise").toBe("Something new");
    expect(plain(movedText("tickets", "tickets-2", "ar"))).toBe("«tickets» مأخوذ هون، فصار «tickets-2»");
    expect(movedText("/mine", "/mine-2", "ar")).toContain(`«${String.fromCodePoint(0x2068)}/mine${String.fromCodePoint(0x2069)}»`);
    expect([1, 2, 3, 12].map((n) => stepsText(n, "ar"))).toEqual(["خطوة", "خطوتين", "3 خطوات", "12 خطوة"]);
    expect([stepsText(1, "en"), stepsText(4, "he")]).toEqual(["1 step", "4 שלבים"]);
    expect(nextMinor("1.4.2")).toBe("1.5.0");
    expect(readJson(`${String.fromCodePoint(0xfeff)}{"a":1}`)).toEqual({ a: 1 });
    expect(readJson("not json")).toBeNull();
  });
});

describe("A feature from a template file", () => {
  test("is shown before anything is written: what it makes, what moved, what it needs; then installed as a draft", async () => {
    m.previewTemplate.mockResolvedValue(preview({ installed: [{ id: "m0", name: "Help desk", version: "1.0.0" }] }));
    m.installTemplate.mockResolvedValue(feature({ id: "m7", enabled: false, template: { key: "help-desk", version: "1.0.0", name: { en: "Help desk" }, installedAt: "2026-11-18T10:00:00Z" } }));
    show("/admin/my-features");
    choose(JSON.stringify({ format: "estabrek.feature", formatVersion: 1, key: "help-desk" }));
    await screen.findByTestId("template-preview");
    expect(m.previewTemplate).toHaveBeenCalledWith({ format: "estabrek.feature", formatVersion: 1, key: "help-desk" });
    expect(screen.getByTestId("template-name").textContent).toContain("Help desk");
    expect(screen.getByTestId("template-name").textContent).toContain("help-desk · 1.0.0");
    expect(screen.getByTestId("template-again").textContent).toContain("installed already (“Help desk”, version 1.0.0)");
    expect(plain(screen.getByTestId("template-tables").textContent)).toContain("“tickets” is taken here, so it is “tickets-2”");
    expect(screen.getByTestId("template-tables").textContent).toContain("API: read the shopper (their own rows)");
    expect(screen.getByTestId("template-functions").textContent).toContain("4 steps · a call (open-ticket)");
    expect(screen.getByTestId("template-need-secret-HELP_KEY").getAttribute("data-have")).toBe("false");
    expect(screen.getByTestId("template-need-site-help.example.com").getAttribute("data-have")).toBe("true");
    fireEvent.click(screen.getByTestId("template-install-go"));
    await waitFor(() => expect(m.installTemplate).toHaveBeenCalledWith({ format: "estabrek.feature", formatVersion: 1, key: "help-desk" }, "en"));
    // On to the new feature's page: where it came from, and what is left before it is on.
    expect((await screen.findByTestId("feature-template")).textContent).toContain("From the template “Help desk”, version 1.0.0");
    expect(screen.getByTestId("feature-template-next").textContent).toContain("Installed as a draft.");
  });

  test("a file that isn't JSON, or one with problems, isn't installed", async () => {
    show("/admin/my-features");
    choose("not json at all", "notes.txt");
    expect((await screen.findByTestId("template-bad")).textContent).toContain("This file isn't JSON");
    expect(m.previewTemplate).not.toHaveBeenCalled();
    m.previewTemplate.mockResolvedValue({ ok: false, problems: [{ at: "format", message: "This file isn't a feature template" }] });
    choose('{"hello":1}');
    expect((await screen.findByTestId("template-problems")).textContent).toContain("This file isn't a feature template");
    expect(screen.queryByTestId("template-install-go")).toBeNull();
    // A file read but not ready here: what is wrong, and no way to install it.
    m.previewTemplate.mockResolvedValue(preview({ ok: false, problems: [{ at: "functions.0.triggers.0.config.path", message: "Another address here has this method and path" }] }));
    choose('{"format":"estabrek.feature"}');
    await waitFor(() => expect(screen.getByTestId("template-preview").getAttribute("data-ok")).toBe("false"));
    expect(screen.getByTestId("template-problems").textContent).toContain("functions.0.triggers.0.config.path");
    expect(screen.queryByTestId("template-install-go")).toBeNull();
  });

  test("needs the permissions installing needs", async () => {
    m.may = new Set(["features:read", "features:write"]);
    show("/admin/my-features");
    await screen.findByTestId("features-empty");
    expect(screen.queryByTestId("template-install")).toBeNull();
  });
});

describe("A feature as a template file", () => {
  test("is saved under its key and version, and says what couldn't go into it", async () => {
    m.exportFeature.mockResolvedValue({ template: { key: "help-desk", version: "1.0.0" }, notes: [{ what: "readyOut", fn: "Open a ticket", at: "do.3" }] });
    show("/admin/my-features/m1");
    await screen.findByTestId("feature-export");
    fireEvent.change(screen.getByTestId("feature-export-key"), { target: { value: "help desk" } });
    expect((screen.getByTestId("feature-export-go") as HTMLButtonElement).disabled, "a key is one word").toBe(true);
    fireEvent.change(screen.getByTestId("feature-export-key"), { target: { value: "help-desk" } });
    fireEvent.click(screen.getByTestId("feature-export-go"));
    await waitFor(() => expect(m.exportFeature).toHaveBeenCalledWith("m1", { key: "help-desk", version: "1.0.0", lang: "en" }));
    await waitFor(() => expect(saved.map((s) => s.name)).toEqual(["help-desk-1.0.0.feature.json"]));
    expect(screen.getByTestId("feature-export-notes").textContent).toContain("“Open a ticket”, step 4: sends through a ready connection.");
  });

  test("one that came from a template offers its key a version up", async () => {
    m.getFeature.mockResolvedValue(feature({ template: { key: "help-desk", version: "1.2.0", name: { en: "Help desk" }, installedAt: "2026-11-18T10:00:00Z" } }));
    show("/admin/my-features/m1");
    expect(((await screen.findByTestId("feature-export-key")) as HTMLInputElement).value).toBe("help-desk");
    expect((screen.getByTestId("feature-export-version") as HTMLInputElement).value).toBe("1.3.0");
    m.may.delete("functions:read");
    cleanup();
    show("/admin/my-features/m1");
    await screen.findByTestId("feature-page");
    expect(screen.queryByTestId("feature-export")).toBeNull();
  });
});

describe("Removing a feature with everything in it", () => {
  test("says what goes, lets the owner keep the rows or delete them, and is refused while something outside would break", async () => {
    m.removalOf.mockResolvedValue(removal({ blockers: { linked: [{ table: "Tickets", by: "Orders notes", field: "ticket" }], called: [] }, uses: { functions: ["Report"], pages: ["Overview"] } }));
    m.removeFeature.mockResolvedValue({ ok: true, removed: { tables: 0, keptTables: 1, functions: 1, pages: 1, rows: 0 } });
    show("/admin/my-features/m1");
    fireEvent.click(await screen.findByTestId("feature-remove"));
    const panel = await screen.findByTestId("feature-remove-panel");
    expect(m.removalOf).toHaveBeenCalledWith("m1", "en");
    expect(panel.textContent).toContain("the function “Open a ticket” with its triggers and versions");
    expect(panel.textContent).toContain("the page “My tickets”");
    expect(screen.getByTestId("feature-remove-rows").textContent).toContain("And its tables (Tickets, holding 4 rows)");
    // Keeping the rows: nothing outside stops it; pages outside that use it are said.
    expect((screen.getByTestId("feature-remove-keep") as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByTestId("feature-remove-linked")).toBeNull();
    expect(screen.getByTestId("feature-remove-uses").textContent).toContain("Pages outside the feature show its tables or run its logic: Overview");
    // Deleting them: a table outside links one, so it can't.
    fireEvent.click(screen.getByTestId("feature-remove-delete"));
    expect(screen.getByTestId("feature-remove-linked").textContent).toContain("The table “Orders notes” (outside the feature) links “Tickets”");
    expect(screen.getByTestId("feature-remove-uses").textContent).toContain("Report");
    expect((screen.getByTestId("feature-remove-go") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("feature-remove-keep"));
    fireEvent.click(screen.getByTestId("feature-remove-go"));
    await waitFor(() => expect(m.removeFeature).toHaveBeenCalledWith("m1", "keep", "en"));
    await screen.findByTestId("features-page");
  });

  test("a function outside calling one of its functions stops it either way; cancelling leaves it", async () => {
    m.removalOf.mockResolvedValue(removal({ blockers: { linked: [], called: [{ fn: "Open a ticket", by: "Nightly" }] } }));
    show("/admin/my-features/m1");
    fireEvent.click(await screen.findByTestId("feature-remove"));
    expect((await screen.findByTestId("feature-remove-called")).textContent).toContain("“Nightly” (outside the feature) calls “Open a ticket”");
    expect((screen.getByTestId("feature-remove-go") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("feature-remove-cancel"));
    expect(screen.queryByTestId("feature-remove-panel")).toBeNull();
    expect(m.removeFeature).not.toHaveBeenCalled();
  });

  test("needs the permissions removing needs; deleting the name alone stays", async () => {
    m.may = new Set(["features:read", "features:write"]);
    show("/admin/my-features/m1");
    await screen.findByTestId("feature-delete");
    expect(screen.queryByTestId("feature-remove")).toBeNull();
  });
});
