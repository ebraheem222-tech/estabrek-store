import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { WebsiteThemeGalleryPicker } from "./WebsiteThemeGalleryPicker";

vi.mock("../../api/settings.api", () => ({ getSettings: vi.fn().mockResolvedValue({ id: "settings", siteName: "Estabrek", header: { identity: { industry: "fashion", audience: "women" } } }) }));
vi.mock("../../api/pages.api", () => ({ listPages: vi.fn().mockResolvedValue([{ id: "home", slug: "/" }]) }));
vi.mock("../../studio/storeThemes", async (importOriginal) => ({ ...await importOriginal<typeof import("../../studio/storeThemes")>(), shopOrigin: () => "https://shop.example.com" }));

afterEach(cleanup);

test("settings keeps the real current store design visible alongside the visual theme gallery", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><WebsiteThemeGalleryPicker selectedThemeId="default" onSelect={vi.fn()} /></MemoryRouter></QueryClientProvider>);
  const current = await screen.findByTestId("current-store-design-choice");
  expect(current).toHaveTextContent("Estabrek");
  fireEvent.change(screen.getByPlaceholderText("ابحث في الثيمات..."), { target: { value: "does not exist" } });
  fireEvent.click(current);
  expect(screen.getByTitle("معاينة التصميم الحالي")).toHaveAttribute("src", "https://shop.example.com/ar?storeTheme=rose");
  expect(screen.getByRole("link", { name: "تعديل التصميم الحالي" })).toHaveAttribute("href", "/studio/home");
});
