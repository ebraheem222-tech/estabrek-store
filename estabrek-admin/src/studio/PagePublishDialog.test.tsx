import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PagePublishDialog } from "./PagePublishDialog";
import { setLangForTests } from "../lib/lang";
import type { Page } from "../api/pages.api";

const page: Page = { id: "page", name: "Test", slug: "/t", status: "DRAFT" };
const confirm = vi.fn();
beforeEach(() => { vi.clearAllMocks(); localStorage.setItem("admin-lang", "en"); setLangForTests("en"); });
afterEach(() => { cleanup(); localStorage.clear(); setLangForTests("ar"); });
const open = (patch: Partial<Page> = {}) => render(<PagePublishDialog page={{ ...page, ...patch }} force={false} busy={false} onClose={() => {}} onConfirm={confirm} />);

test("ordinary publication preserves the existing window by default", () => {
  open(); fireEvent.click(screen.getByTestId("page-publish-confirm"));
  expect(confirm).toHaveBeenCalledWith({ mode: "keep_schedule", republishArchived: false });
});
test("a scheduled page explains its window and makes clearing it an explicit choice", () => {
  open({ publishAt: "2099-01-01T00:00:00Z" });
  expect(screen.getByTestId("page-publish-window")).toBeVisible();
  expect(screen.getByTestId("page-publish-keep-schedule")).toBeChecked();
  fireEvent.click(screen.getByTestId("page-publish-now")); fireEvent.click(screen.getByTestId("page-publish-confirm"));
  expect(confirm).toHaveBeenCalledWith({ mode: "now", republishArchived: false });
});
test("an archived page cannot be republished until its explicit consent is checked", () => {
  open({ status: "ARCHIVED" });
  expect(screen.getByTestId("page-publish-confirm")).toBeDisabled();
  fireEvent.click(screen.getByTestId("page-publish-archive")); fireEvent.click(screen.getByTestId("page-publish-confirm"));
  expect(confirm).toHaveBeenCalledWith({ mode: "keep_schedule", republishArchived: true });
});
test("a forced content confirmation retains the previously selected publication choice", () => {
  render(<PagePublishDialog page={page} force busy={false} initialOptions={{ mode: "now", republishArchived: false }} onClose={() => {}} onConfirm={confirm} />);
  fireEvent.click(screen.getByTestId("page-publish-confirm"));
  expect(confirm).toHaveBeenCalledWith({ mode: "now", republishArchived: false });
});
