import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TemplatesGallery } from "./TemplatesGallery";
import { ROSE_COLOURS } from "./templates/colours";
import { getStoreTemplates, getStoreTemplateImport } from "../api/storeTemplates.api";
vi.mock("../api/storeTemplates.api", () => ({ getStoreTemplates: vi.fn(), getStoreTemplateImport: vi.fn(), getStoreTemplatePreview: vi.fn() }));
vi.mock("../api/pages.api", () => ({ listTemplates: vi.fn().mockResolvedValue([]), createTemplate: vi.fn(), deletePage: vi.fn(), getPageTree: vi.fn() }));
vi.mock("./storeThemes", () => ({ shopOrigin: () => "https://shop.example.com" }));
const words = (text: string) => ({ ar: text, en: text, he: text });
const template = { id: "reference-neural-glass", category: "electronics", name: words("Neural Glass"), blurb: words("Own source design"), tags: ["reference"], theme: "tpl-reference-neural-glass", mode: "dark" as const, swatch: ["#111", "#222", "#f0a", "#f0a", "#fff"], source: { number: 597, title: "Neural Glass", folder: "source-597" }, preview: "/templates/references/previews/597.png" };
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function mount() {
  vi.mocked(getStoreTemplates).mockResolvedValue({ categories: [], templates: [template] });
  let next = 0;
  const onUse = vi.fn(), onClose = vi.fn();
  const rendered = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><TemplatesGallery open onClose={onClose} lang="ar" family="fashion" colours={ROSE_COLOURS} pics={[]} busy={false} here={null} pageName="Home" storeName={words("Own store")} pageSections={() => []} selectedSection={null} makeIds={() => prefix => `${prefix}-${next++}`} onUse={onUse} /></MemoryRouter></QueryClientProvider>);
  return { onUse, onClose, unmount: rendered.unmount };
}
test("the editor opens the full live catalog and offers a direct complete-design setup link", async () => {
  mount();
  const card = await screen.findByTestId("store-template-reference-neural-glass");
  expect(screen.getByTestId("studio-tpl-tab-designs")).toHaveAttribute("aria-selected", "true");
  expect(card.querySelector("img")).toHaveAttribute("src", "https://shop.example.com/templates/references/previews/597.png");
  fireEvent.click(card);
  expect(screen.getByTestId("studio-tpl-use-design")).toHaveAttribute("href", "/setup?view=templates&template=reference-neural-glass");
  fireEvent.click(screen.getByTestId("studio-tpl-tab-sections"));
  expect(screen.getByTestId("studio-tpl-tab-sections")).toHaveAttribute("aria-selected", "true");
});
test("closing the gallery during a pending import does not insert into the page", async () => {
  let resolve!: (value: any) => void;
  vi.mocked(getStoreTemplateImport).mockReturnValue(new Promise(done => { resolve = done; }));
  const { onUse, unmount } = mount();
  fireEvent.click(await screen.findByTestId("store-template-reference-neural-glass"));
  fireEvent.click(screen.getByTestId("studio-tpl-insert-content"));
  await waitFor(() => expect(getStoreTemplateImport).toHaveBeenCalled());
  unmount(); resolve({ tree: { root: { children: [{id:"s",type:"section",props:{}}] } } });
  await new Promise(done => setTimeout(done, 0));
  expect(onUse).not.toHaveBeenCalled();
});
test("a full template's page content can be inserted with fresh IDs and preserved deck labels", async () => {
  const { onUse } = mount();
  const section = { id: "source-section", type: "section", props: {}, children: [{ id: "source-deck", type: "deck", props: { labels: { "source-panel": words("Work") } }, children: [{ id: "source-panel", type: "stack", props: {}, children: [{id:"name",type:"heading",props:{text:words("{{store.name}}")}}] }] }] };
  vi.mocked(getStoreTemplateImport).mockResolvedValue({ tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [section] } }, design: {} as never });
  fireEvent.click(await screen.findByTestId("store-template-reference-neural-glass"));
  fireEvent.click(screen.getByTestId("studio-tpl-insert-content"));
  await waitFor(() => expect(onUse).toHaveBeenCalledTimes(1));
  const [nodes, where] = onUse.mock.calls[0];
  expect(where).toBe("end"); expect(nodes[0].id).not.toBe("source-section");
  const deck = nodes[0].children[0];expect(deck.props.labels).toEqual({ [deck.children[0].id]: words("Work") });
  expect(deck.children[0].children[0].props.text).toEqual(words("Own store"));
  expect(getStoreTemplateImport).toHaveBeenCalledWith(template.id, {});
});
