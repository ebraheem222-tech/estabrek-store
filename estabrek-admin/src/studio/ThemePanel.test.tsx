import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemePanel } from "./StudioPanels";
import type { StoreThemeInfo } from "./storeThemes";

afterEach(cleanup);

test("the current choice remains selectable when its source theme is unavailable", () => {
  const onPreview = vi.fn();
  render(<ThemePanel themes={[]} failed current="my-independent-design" preview={null} mode={undefined} onPreview={onPreview} onMode={vi.fn()} onSave={vi.fn()} saving={false} />);
  const current = screen.getAllByTestId("studio-theme-option").find(button => button.dataset.themeId === "my-independent-design");
  expect(current).toHaveAttribute("aria-pressed", "true");
  expect(current).toHaveTextContent("الحالي");
  fireEvent.click(current!);
  expect(onPreview).toHaveBeenCalledWith(null);
  expect(screen.getByTestId("studio-theme-save")).toBeDisabled();
});

test("the saved mode is shown without treating it as a pending change", () => {
  const theme: StoreThemeInfo = { id: "owned", name: { ar: "تصميمي", en: "My design", he: "שלי" }, blurb: { ar: "", en: "", he: "" }, family: "general", mode: "light", modes: ["light", "dark"], swatch: ["#ffffff", "#eeeeee", "#aabbcc", "#112233"], hero: "split", motion: "soft" };
  render(<ThemePanel themes={[theme]} current="owned" preview={null} mode={undefined} currentMode="dark" onPreview={vi.fn()} onMode={vi.fn()} onSave={vi.fn()} saving={false} />);
  expect(screen.getByRole("button", { name: "غامق", pressed: true })).toBeInTheDocument();
  expect(screen.getByTestId("studio-theme-save")).toBeDisabled();
});

test("the original rose option follows store eligibility instead of offering an unsaveable preview", () => {
  const props = { themes: [], current: "circuit", preview: null, mode: undefined, onPreview: vi.fn(), onMode: vi.fn(), onSave: vi.fn(), saving: false };
  const view = render(<ThemePanel {...props} original={false} />);
  expect(document.querySelector('[data-theme-id="rose"]')).toBeNull();
  view.rerender(<ThemePanel {...props} original />);
  expect(document.querySelector('[data-theme-id="rose"]')).toBeInTheDocument();
});
