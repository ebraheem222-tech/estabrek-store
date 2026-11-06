import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { StoreTemplatePicker } from "./StoreTemplatePicker";
import { getStoreTemplates, type StoreTemplate } from "../../api/storeTemplates.api";
import type { MotionProfile } from "../../studio/motionProfiles";
import { getSettings } from "../../api/settings.api";

vi.mock("../../api/storeTemplates.api", () => ({ getStoreTemplates: vi.fn(), getStoreTemplatePreview: vi.fn().mockResolvedValue({ sections: [] }) }));
vi.mock("../../api/settings.api", () => ({ getSettings: vi.fn() }));
vi.mock("../../api/pages.api", () => ({ listPages: vi.fn().mockResolvedValue([{ id: "home", slug: "/" }]) }));
vi.mock("../../studio/storeThemes", async (importOriginal) => ({ ...await importOriginal<typeof import("../../studio/storeThemes")>(), shopOrigin: () => "https://shop.example.com", loadStoreThemes: vi.fn().mockResolvedValue({ themes: [], defaults: { general: "mega-market", electronics: "circuit" } }) }));
const words = (en: string) => ({ ar: en, en, he: en });
const fashion: StoreTemplate = { id: "fashion-quiet", category: "fashion", name: words("Fashion quiet"), blurb: words("Calm clothing"), tags: ["minimal"], theme: "tpl-fashion-quiet", mode: "light", swatch: ["#fff", "#222"] };
const tech: StoreTemplate = { ...fashion, id: "electronics-lab", category: "electronics", name: words("Tech studio"), tags: ["tech"], theme: "tpl-electronics-lab" };
const catalog = { categories: [{ id: "fashion", name: words("Fashion"), family: "fashion", kinds: [], count: 1 }, { id: "electronics", name: words("Electronics"), family: "electronics", kinds: [], count: 1 }], templates: [fashion, tech] };
const mount = (selected: StoreTemplate | null = null, motionOptions?: MotionProfile, onMotionOptions = vi.fn(), currentActive?: boolean) => {
  const onPick = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Picker() {
    const [picked, setPicked] = useState(selected);
    return <StoreTemplatePicker families={["fashion"]} selected={picked} mode="dark" onPick={value => { onPick(value); setPicked(value); }} motionOptions={motionOptions} onMotionOptions={onMotionOptions} currentActive={currentActive} />;
  }
  render(<QueryClientProvider client={client}><MemoryRouter><Picker /></MemoryRouter></QueryClientProvider>);
  return onPick;
};
beforeEach(() => {
  vi.mocked(getStoreTemplates).mockResolvedValue(catalog);
  vi.mocked(getSettings).mockResolvedValue({ id: "settings", siteName: "Estabrek", header: { identity: { industry: "fashion", audience: "women" } } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("complete template selection", () => {
  it("does not mark the current design selected when starting with a blank canvas", async () => {
    mount(null, undefined, vi.fn(), false);
    expect(await screen.findByTestId("current-store-design-choice")).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the original current design visible and previews the real store outside template filters", async () => {
    const onPick = mount();
    const current = await screen.findByTestId("current-store-design-choice");
    expect(current).toHaveTextContent("Estabrek");
    expect(current).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "does not exist" } });
    expect(current).toBeInTheDocument();
    fireEvent.click(current);
    const frame = screen.getByTitle("معاينة التصميم الحالي");
    expect(frame).toHaveAttribute("src", "https://shop.example.com/ar?storeTheme=rose");
    expect(screen.getByRole("link", { name: "تعديل التصميم الحالي" })).toHaveAttribute("href", "/studio/home");
    expect(onPick).toHaveBeenLastCalledWith(null);
  });

  it("identifies a copied current design missing from the catalog and preserves its saved mode in the live preview", async () => {
    vi.mocked(getSettings).mockResolvedValue({ id: "settings", siteName: "Estabrek", header: { storeDesign: { mode: "cms", homeId: "owned-home" }, storeTheme: { id: "my-independent-design", mode: "dark", snapshot: { name: words("My edited design") } } } });
    const onPick = mount(fashion);
    const current = await screen.findByTestId("current-store-design-choice");
    expect(current).toHaveTextContent("My edited design");
    expect(current).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(current);
    expect(screen.getByTitle("معاينة التصميم الحالي")).toHaveAttribute("src", "https://shop.example.com/ar?storeTheme=my-independent-design&themeMode=dark");
    expect(screen.getByRole("link", { name: "تعديل التصميم الحالي" })).toHaveAttribute("href", "/studio/owned-home");
    expect(onPick).toHaveBeenLastCalledWith(null);
  });

  it("keeps the current design available when the new-template catalog is offline", async () => {
    vi.mocked(getStoreTemplates).mockRejectedValue(new Error("offline"));
    mount();
    expect(await screen.findByTestId("current-store-design-choice")).toHaveTextContent("Estabrek");
    await screen.findByRole("button", { name: "إعادة المحاولة" }, { timeout: 4000 });
    fireEvent.click(screen.getByTestId("current-store-design-choice"));
    expect(screen.getByTitle("معاينة التصميم الحالي")).toHaveAttribute("src", "https://shop.example.com/ar?storeTheme=rose");
  });

  it("separates generated compositions from originals and searches their source provenance", async () => {
    const original = { ...tech, id: "reference-festava-live", source: { number: 583, title: "Festava Live", folder: "templatemo_583_festava_live" } };
    const generated = { ...tech, id: "edition-583-01", name: words("Evening stage"), tags: ["generated"], edition: { sourceId: original.id, sourceNumber: 583, sourceTitle: "Festava Live", recipeId: "edition-583-01" } };
    vi.mocked(getStoreTemplates).mockResolvedValue({ ...catalog, templates: [original, generated, fashion] });
    const onPick = mount();
    await screen.findByTestId("store-template-reference-festava-live");
    expect(screen.queryByTestId("store-template-edition-583-01")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "توليفات المراجع · 1" }));
    fireEvent.click(await screen.findByTestId("store-template-edition-583-01"));
    expect(onPick).toHaveBeenCalledWith(generated);
    expect(screen.queryByTestId("store-template-reference-festava-live")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Festava Live" } });
    expect(await screen.findByTestId("store-template-edition-583-01")).toBeInTheDocument();
    expect(screen.getByTestId("store-template-reference-festava-live")).toBeInTheDocument();
    expect(screen.queryByTestId("store-template-fashion-quiet")).not.toBeInTheDocument();
  });
  it("opens the owner's distinct reference collection with its actual separate preview pictures", async () => {
    const references = [597, 615].map(number => ({ ...tech, id: `reference-${number}`, name: words(`Reference ${number}`), source: { number, title: `Reference ${number}`, folder: `source-${number}` }, preview: `/templates/references/previews/${number}.png` }));
    vi.mocked(getStoreTemplates).mockResolvedValue({ ...catalog, templates: [...references, fashion, tech] });
    mount();
    const first = await screen.findByTestId("store-template-reference-597");
    expect(first.querySelector("img")).toHaveAttribute("src", "https://shop.example.com/templates/references/previews/597.png");
    expect(screen.getByTestId("store-template-reference-615").querySelector("img")).toHaveAttribute("src", "https://shop.example.com/templates/references/previews/615.png");
    expect(screen.queryByTestId("store-template-fashion-quiet")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "الكل · 4" }));
    expect(await screen.findByTestId("store-template-fashion-quiet")).toBeInTheDocument();
  });
  it("pages a thousand templates in small batches and finds the last one by search", async () => {
    const templates = Array.from({ length: 1000 }, (_, i) => ({ ...fashion, id: `edition-${i}`, name: words(`Edition ${i}`) }));
    vi.mocked(getStoreTemplates).mockResolvedValue({ categories: [{ ...catalog.categories[0], count: 1000 }], templates });
    const onPick = mount();
    await screen.findByTestId("store-template-edition-0");
    expect(screen.getAllByRole("radio")).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: "عرض المزيد" }));
    expect(screen.getAllByRole("radio")).toHaveLength(24);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Edition 999" } });
    const last = await screen.findByTestId("store-template-edition-999");
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    fireEvent.click(last);
    expect(onPick).toHaveBeenCalledWith(templates[999]);
  });
  it("starts with a fitting category and searches all industries", async () => {
    const onPick = mount();
    const card = await screen.findByTestId("store-template-fashion-quiet");
    expect(screen.queryByTestId("store-template-electronics-lab")).not.toBeInTheDocument();
    fireEvent.click(card);
    expect(onPick).toHaveBeenCalledWith(fashion);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "tech" } });
    fireEvent.click(await screen.findByTestId("store-template-electronics-lab"));
    expect(onPick).toHaveBeenLastCalledWith(tech);
  });
  it("respects the primary family even if another category appears first", async () => {
    vi.mocked(getStoreTemplates).mockResolvedValue({ ...catalog, categories: [{ id: "shoes", name: words("Shoes"), family: "shoes", kinds: [], count: 0 }, ...catalog.categories] });
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><MemoryRouter><StoreTemplatePicker families={["fashion", "shoes"]} selected={null} mode={null} onPick={vi.fn()} /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByTestId("store-template-fashion-quiet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fashion · 1" })).toHaveAttribute("aria-pressed", "true");
  });
  it("previews the chosen template in the chosen mode", async () => {
    mount(fashion);
    const frame = await screen.findByTitle("معاينة القالب");
    expect(frame).toHaveAttribute("src", expect.stringContaining("template=fashion-quiet&themeMode=dark"));
  });
  it("previews the selected animation profile and exposes engine and style choices", async () => {
    const onOptions = vi.fn();
    mount(fashion, { engine: "anime", preset: "rich" }, onOptions);
    const frame = await screen.findByTitle("معاينة القالب");
    expect(frame).toHaveAttribute("src", expect.stringContaining("motionEngine=anime&motionPreset=rich"));
    expect(screen.getByRole("link", { name: "فتح المعاينة" })).toHaveAttribute("href", frame.getAttribute("src"));
    fireEvent.change(screen.getByTestId("motion-profile-preset"), { target: { value: "calm" } });
    expect(onOptions).toHaveBeenCalledWith({ engine: "anime", preset: "calm" });
    fireEvent.change(screen.getByTestId("motion-profile-engine"), { target: { value: "gsap" } });
    expect(onOptions).toHaveBeenLastCalledWith({ engine: "gsap", preset: "rich" });
  });
  it("keeps the theme alternative available when templates cannot be fetched", async () => {
    vi.mocked(getStoreTemplates).mockRejectedValue(new Error("offline"));
    mount();
    await waitFor(() => expect(screen.getByRole("button", { name: "إعادة المحاولة" })).toBeInTheDocument(), { timeout: 4000 });
    expect(screen.queryByTestId("store-template-picker")).not.toBeInTheDocument();
  });
});
