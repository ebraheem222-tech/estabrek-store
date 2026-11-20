// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DiffItem, ProjectPreview, Snapshot } from "../../api/project.api";

// المشروع كملف over a stand-in API: only the owner; a file looked at piece by piece (what is the same folded
// away, what is only here ticked to go, a field change accepted) before it comes in; a saved copy gone back to,
// with what was made since ticked to go by itself.

const m = vi.hoisted(() => ({
  api: { getProject: vi.fn(), downloadProject: vi.fn(), previewProject: vi.fn(), applyProject: vi.fn(), saveSnapshot: vi.fn(), previewBack: vi.fn(), goBack: vi.fn(), deleteSnapshot: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  admin: { owner: true, role: "SUPERADMIN" } as Record<string, unknown> | null,
}));
vi.mock("../../api/project.api", () => m.api);
vi.mock("../../lib/toast", () => ({ toast: m.toast }));
vi.mock("../../store/auth.store", () => ({ useAuthStore: (pick: (s: { admin: unknown }) => unknown) => pick({ admin: m.admin }) }));

import { setLangForTests } from "../../lib/lang";
import ProjectPage from "./ProjectPage";
import { impactText, reasonText } from "./projectText";

const size = { tables: 2, functions: 3, pages: 1, roles: 1, groups: 0, features: 1 };
const snap: Snapshot = { id: "s1", label: "Before the sale", reason: "saved", size, bytes: 42_000, byEmail: "owner@shop.test", createdAt: "2026-11-19T10:00:00Z" };
const item = (over: Partial<DiffItem>): DiffItem => ({ ref: "table:t1", kind: "table", id: "t1", name: "Posts", action: "same", ...over });
const look = (over: Partial<ProjectPreview> = {}): ProjectPreview => ({
  ok: true,
  project: { name: "Estabrek", exportedAt: "2026-11-18T09:00:00Z", size },
  items: [
    item({ ref: "table:t1", name: "Posts", action: "change", parts: ["name", "fields"], fields: { added: ["Tags"], removed: [], changed: ["Title"] } }),
    item({ ref: "table:t2", id: "t2", name: "Questions", action: "only", going: false, rows: 4 }),
    item({ ref: "table:t3", id: "t3", name: "Branches", action: "same" }),
    item({ ref: "function:f1", kind: "function", id: "f1", name: "send", action: "add" }),
    item({ ref: "page:p1", kind: "page", id: "p1", name: "About", action: "change", parts: ["status", "design"] }),
  ],
  counts: { add: 1, change: 2, same: 1, only: 1, clash: 0 },
  waits: [],
  problems: [],
  needs: { secrets: [{ name: "TG_TOKEN", kept: false }], sites: [], connections: [] },
  suggested: [],
  ...over,
});

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ProjectPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const MARKS = new RegExp(`[${String.fromCodePoint(0x2068, 0x2069)}]`, "g");
const plain = (el: HTMLElement) => (el.textContent ?? "").replace(MARKS, "");
const pickFile = (body: unknown, name = "estabrek-project.json") => fireEvent.change(screen.getByTestId("project-file"), { target: { files: [new File([JSON.stringify(body)], name, { type: "application/json" })] } });

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.admin = { owner: true, role: "SUPERADMIN" };
  m.api.getProject.mockResolvedValue({ size, snapshots: [snap], limits: { bytes: 12_000_000, snapshots: 20 } });
  m.api.previewProject.mockImplementation(async () => look());
  m.api.applyProject.mockResolvedValue({ counts: look().counts, snapshot: { ...snap, id: "s2", reason: "before" }, made: 1, changed: 2, removed: 0 });
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The project as a file", () => {
  test("is the owner's alone", async () => {
    m.admin = { owner: false, role: "STAFF" };
    show();
    expect(screen.getByTestId("project-owner-only").textContent).toContain("the store owner's alone");
    expect(screen.queryByTestId("project-download")).toBeNull();
    expect(m.api.getProject).not.toHaveBeenCalled();
  });

  test("a file is looked at piece by piece, then brought in with what was ticked", async () => {
    show();
    expect(plain(await screen.findByTestId("project-size"))).toContain("2 tables · 3 functions · 1 pages");
    pickFile({ format: "estabrek.project", formatVersion: 1 });
    const box = await screen.findByTestId("project-look");
    await waitFor(() => expect(m.api.previewProject).toHaveBeenCalledWith({ format: "estabrek.project", formatVersion: 1 }, { remove: [], accept: [] }));
    expect(within(box).getByTestId("look-table:t1").textContent).toContain("Changes");
    expect(within(box).getByTestId("look-table:t1").textContent).toContain("name, fields");
    expect(within(box).getByTestId("look-table:t1").textContent).toContain("New fields: Tags");
    // What is the same is folded away.
    expect(within(box).queryByTestId("look-table:t3")).toBeNull();
    fireEvent.click(within(box).getByTestId("project-same-table"));
    expect(within(box).getByTestId("look-table:t3")).toHaveAttribute("data-action", "same");
    // What the functions need, that each copy keeps for itself.
    expect(within(box).getByTestId("project-needs").textContent).toContain("TG_TOKEN");
    // A table only here goes only if ticked, with its rows said.
    expect(within(box).getByTestId("look-table:t2").textContent).toContain("Delete it with its 4 rows");
    fireEvent.click(within(box).getByTestId("remove-table:t2"));
    await waitFor(() => expect(m.api.previewProject).toHaveBeenLastCalledWith(expect.anything(), { remove: ["table:t2"], accept: [] }));
    // (Off while the look is asked again.)
    await waitFor(() => expect(within(box).getByTestId("project-apply")).not.toBeDisabled());
    fireEvent.click(within(box).getByTestId("project-apply"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Yes, do it" }));
    await waitFor(() => expect(m.api.applyProject).toHaveBeenCalledWith({ format: "estabrek.project", formatVersion: 1 }, { remove: ["table:t2"], accept: [] }, "Before the file “estabrek-project.json”"));
    await waitFor(() => expect(m.toast.success).toHaveBeenCalledWith("Done: 1 made, 2 changed, 0 gone.", expect.objectContaining({ description: expect.stringContaining("Saved copies") })));
    await waitFor(() => expect(screen.queryByTestId("project-look")).toBeNull());
  });

  test("what stands in the way stops it; a field change that sets values aside is accepted first", async () => {
    let accepted = false;
    m.api.previewProject.mockImplementation(async (_file: unknown, ticks: { accept?: string[] }) => {
      accepted = !!ticks.accept?.includes("table:t1");
      return look({
        ok: accepted,
        problems: [],
        waits: accepted ? [] : [{ ref: "table:t1", name: "Posts", impacts: [{ field: "color", change: "removed", rows: 3, converted: 0, lost: 0, hidden: 3, failing: 0, missing: 0, doubles: 0 }] }],
      });
    });
    show();
    pickFile({});
    const box = await screen.findByTestId("project-look");
    expect((await within(box).findByTestId("project-waits")).textContent).toContain("The field “color” goes: 3 values are hidden in the rows (not deleted)");
    expect(within(box).getByTestId("project-apply")).toBeDisabled();
    fireEvent.click(within(box).getByTestId("accept-table:t1"));
    await waitFor(() => expect(within(box).getByTestId("project-apply")).not.toBeDisabled());
    expect(within(box).queryByTestId("project-waits")).toBeNull();

    cleanup();
    m.api.previewProject.mockImplementation(async () => look({ ok: false, problems: [{ at: "page:p9", message: '"New": "/mine" is held by "Mine" here' }] }));
    show();
    pickFile({});
    const again = await screen.findByTestId("project-look");
    expect((await within(again).findByTestId("project-problems")).textContent).toContain("“New”: the address “/mine” is held here by “Mine”. Rename that one, or tick it to go.");
    expect(within(again).getByTestId("project-apply")).toBeDisabled();
  });

  test("a saved copy: gone back to with what was made since ticked to go; downloaded; deleted after asking", async () => {
    m.api.previewBack.mockImplementation(async (_id: string, ticks: { remove?: string[] }) => look({ suggested: ["function:f9"], items: [item({ ref: "function:f9", kind: "function", id: "f9", name: "new one", action: "only", going: !!ticks.remove?.includes("function:f9") })] }));
    m.api.goBack.mockResolvedValue({ counts: look().counts, snapshot: { ...snap, id: "s3", reason: "back" }, made: 0, changed: 0, removed: 1 });
    m.api.downloadProject.mockResolvedValue({ blob: new Blob(["{}"]), name: "estabrek-project.json" });
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
    show();
    const row = await screen.findByTestId("snapshot-s1");
    expect(row.textContent).toContain("Before the sale");
    expect(row.textContent).toContain("Saved by you");
    fireEvent.click(within(row).getByTestId("snapshot-s1-back"));
    const box = await screen.findByTestId("project-look");
    await waitFor(() => expect(m.api.previewBack).toHaveBeenLastCalledWith("s1", { remove: ["function:f9"], accept: [] }));
    expect(within(box).getByTestId("remove-function:f9")).toBeChecked();
    fireEvent.click(within(box).getByTestId("project-apply"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Yes, do it" }));
    await waitFor(() => expect(m.api.goBack).toHaveBeenCalledWith("s1", { remove: ["function:f9"], accept: [] }, "Before going back to “Before the sale”"));

    fireEvent.click(within(screen.getByTestId("snapshot-s1")).getByTestId("snapshot-s1-download"));
    await waitFor(() => expect(m.api.downloadProject).toHaveBeenCalledWith("s1"));
    fireEvent.click(within(screen.getByTestId("snapshot-s1")).getByTestId("snapshot-s1-delete"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete it" }));
    await waitFor(() => expect(m.api.deleteSnapshot).toHaveBeenCalledWith("s1"));
  });

  test("its words, in each language", () => {
    expect(impactText({ field: "price", change: "retyped", rows: 5, converted: 4, lost: 1, hidden: 0, failing: 0, missing: 0, doubles: 0 })).toBe("The field “price” changes kind: 4 convert, 1 don't fit and are set aside");
    expect(reasonText("The published steps use a table that won't be there")).toBe("The published steps use a table that won't be there.");
    expect(reasonText("Something new from the server")).toBe("Something new from the server");
    setLangForTests("ar");
    expect(reasonText('"A" links "B": it can\'t go while it does')).toBe("«A» مربوط بـ«B»: ما بيقدر يروح وهو مربوط.");
    setLangForTests("he");
    expect(reasonText("This file isn't a project file")).toBe("הקובץ הזה אינו קובץ פרויקט.");
  });
});
