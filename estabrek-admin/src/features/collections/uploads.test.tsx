// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Files from shoppers in the admin (stage 2, item 4): a picture or file field opened for uploads (how many MB, which
// kinds, kept private); a form built from a table gets a file box for such a field; and a private file in the grid
// opens through a link the server makes at that moment.

const m = vi.hoisted(() => ({ privateFile: vi.fn() }));
vi.mock("../../api/data.api", async (orig) => ({ ...(await orig<object>()), privateFile: m.privateFile }));

import { setLangForTests } from "../../lib/lang";
import { FieldRulesEditor } from "./FieldRulesEditor";
import { fromTable } from "../../studio/formFields";
import { CellView } from "../data/GridCells";
import type { CollectionField } from "../../api/collections.api";

const fit = { unique: false, limits: null, shape: false, default: false } as const;
const editor = (field: CollectionField, onChange = vi.fn()) => {
  render(<FieldRulesEditor field={field} lang="en" fit={fit} shapes={[]} onChange={onChange} />);
  return onChange;
};

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("A field's uploads", () => {
  test("a picture field: switched on with a size; pictures only", () => {
    const changed = editor({ id: "photo", type: "image" });
    expect(screen.queryByTestId("upload-photo-mb")).toBeNull();
    fireEvent.click(screen.getByTestId("upload-photo-on"));
    expect(changed).toHaveBeenLastCalledWith({ id: "photo", type: "image", upload: { maxMb: 8 } });
    cleanup();
    const again = editor({ id: "photo", type: "image", upload: { maxMb: 8 } });
    expect(screen.queryByTestId("upload-photo-kinds")).toBeNull();
    fireEvent.change(screen.getByTestId("upload-photo-mb"), { target: { value: "40" } });
    expect(again).toHaveBeenLastCalledWith({ id: "photo", type: "image", upload: { maxMb: 25 } });
  });

  test("a file field: its kinds (never none), and kept private", () => {
    const changed = editor({ id: "cv", type: "file", upload: { maxMb: 5, kinds: ["pdf"] } });
    expect((screen.getByTestId("upload-cv-kind-pdf") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("upload-cv-kind-doc"));
    expect(changed).toHaveBeenLastCalledWith({ id: "cv", type: "file", upload: { maxMb: 5, kinds: ["pdf", "doc"] } });
    fireEvent.click(screen.getByTestId("upload-cv-private"));
    expect(changed).toHaveBeenLastCalledWith({ id: "cv", type: "file", upload: { maxMb: 5, kinds: ["pdf"], private: true } });
    // Other kinds of field have no uploads.
    cleanup();
    editor({ id: "name", type: "text" });
    expect(screen.queryByTestId("upload-name")).toBeNull();
  });

  test("a form built from a table: a file box for a field open to uploads, none for one that isn't", () => {
    const out = fromTable([
      { id: "name", type: "text", name: { en: "Name" }, required: true },
      { id: "cv", type: "file", name: { en: "CV" }, required: true, upload: { maxMb: 5, kinds: ["pdf"], private: true } },
      { id: "logo", type: "image", name: { en: "Logo" }, required: false },
    ], "en");
    expect(out.fields.map((f) => [f.name, f.kind])).toEqual([
      ["name", "text"],
      ["cv", "file"],
    ]);
    expect(out.skipped).toEqual(["Logo"]);
  });
});

describe("A private file in the grid", () => {
  test("opens through a link the server makes now", async () => {
    m.privateFile.mockResolvedValue({ id: "f1", name: "cv.pdf", kind: "pdf", bytes: 1200, url: "https://files.test/private/cv?expires=600" });
    const tab = { opener: {} as unknown, location: { href: "" }, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    const column = { id: "cv", kind: "file" as const, name: "CV" };
    const row = { id: "r1", slug: "r1", status: "DRAFT", data: { cv: "file:cmabcdefghijklmnopqrstu" } } as never;
    render(<CellView column={column} row={row} lang="en" tableId="t1" />);
    fireEvent.click(screen.getByTestId("private-file-cmabcdefghijklmnopqrstu"));
    await waitFor(() => expect(tab.location.href).toBe("https://files.test/private/cv?expires=600"));
    expect(m.privateFile).toHaveBeenCalledWith("t1", "cmabcdefghijklmnopqrstu");
    expect(tab.opener).toBeNull();
    open.mockRestore();
    cleanup();
    // Without its table (a store table's grid): said, not opened.
    render(<CellView column={column} row={row} lang="en" />);
    expect(screen.getByText(/A private file/)).toBeTruthy();
  });
});
