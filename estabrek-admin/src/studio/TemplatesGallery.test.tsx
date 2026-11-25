import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TemplatesGallery } from "./TemplatesGallery";
import { ROSE_COLOURS } from "./templates/colours";
import { getStoreTemplates, getStoreTemplateImport } from "../api/storeTemplates.api";
import * as PagesAPI from "../api/pages.api";
vi.mock("../api/storeTemplates.api", () => ({ getStoreTemplates: vi.fn(), getStoreTemplateImport: vi.fn(), getStoreTemplatePreview: vi.fn() }));
vi.mock("../api/pages.api", () => ({ listPages: vi.fn().mockResolvedValue([]), listTemplates: vi.fn().mockResolvedValue([]), createTemplate: vi.fn(), deletePage: vi.fn(), getPageTree: vi.fn(), createPage: vi.fn(), setPageFormat: vi.fn(), getPageDraft: vi.fn(), changePageDraft: vi.fn() }));
vi.mock("../api/settings.api", () => ({ getSettings: vi.fn().mockResolvedValue({ header: { identity: { industry: "fashion", audience: "women" } } }) }));
vi.mock("./storeThemes", async importOriginal => ({ ...await importOriginal<typeof import("./storeThemes")>(), shopOrigin: () => "https://shop.example.com" }));
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
test("a section design has one card, and its colours are picked in the preview", async () => {
  const { onUse } = mount();
  fireEvent.click(await screen.findByTestId("studio-tpl-tab-sections"));
  // One card for each design, not one for each of its colours.
  const cards = screen.getAllByTestId("studio-tpl-card");
  const designs = cards.map(card => card.getAttribute("data-id")!.split(":")[1]);
  expect(new Set(designs).size).toBe(designs.length);
  const card = cards.find(c => c.getAttribute("data-id")!.startsWith("s:hero-center:"))!;
  expect(card.textContent).toContain("4");
  fireEvent.click(card);
  // Its colours, in the preview: the first is on; another is picked and that one is added.
  const skins = screen.getAllByTestId("studio-tpl-skin");
  expect(skins.map(b => b.getAttribute("data-skin"))).toEqual(["plain", "soft", "bold", "dark"]);
  expect(skins[0]).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(skins[3]);
  expect(screen.getAllByTestId("studio-tpl-skin")[3]).toHaveAttribute("aria-pressed", "true");
  // The card stays the chosen one whatever colour is on.
  expect(card).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByTestId("studio-tpl-end"));
  await waitFor(() => expect(onUse).toHaveBeenCalledTimes(1));
  const [nodes] = onUse.mock.calls[0];
  expect(nodes[0].style.base.bg).toBe("text");
});
test("the section DNA's designs are found by their look and their mood", async () => {
  mount();
  fireEvent.click(await screen.findByTestId("studio-tpl-tab-sections"));
  fireEvent.change(screen.getByTestId("studio-tpl-look"), { target: { value: "luxe" } });
  const luxe = screen.getAllByTestId("studio-tpl-card").map(card => card.getAttribute("data-id")!);
  expect(luxe.length).toBeGreaterThan(3);
  expect(luxe.every(id => /^s:dna-[a-z]+-[a-z-]+-luxe:/.test(id))).toBe(true);
  // A mood narrows to its looks; with a look of another mood nothing is left.
  fireEvent.change(screen.getByTestId("studio-tpl-mood"), { target: { value: "playful" } });
  expect(screen.queryAllByTestId("studio-tpl-card")).toHaveLength(0);
  fireEvent.change(screen.getByTestId("studio-tpl-look"), { target: { value: "all" } });
  const playful = screen.getAllByTestId("studio-tpl-card").map(card => card.getAttribute("data-id")!);
  expect(playful.length).toBeGreaterThan(10);
  expect(playful.every(id => id.startsWith("s:dna-"))).toBe(true);
});
test("kinds sit in areas; an area shows all of its kinds; stars keep favourites; the newest are marked", async () => {
  localStorage.clear();
  mount();
  fireEvent.click(await screen.findByTestId("studio-tpl-tab-sections"));
  // An area: every kind in it at once.
  fireEvent.click(screen.getAllByTestId("studio-tpl-area").find(b => b.getAttribute("data-area") === "site")!);
  const site = screen.getAllByTestId("studio-tpl-card").map(c => c.getAttribute("data-id")!);
  expect(site.some(id => id.startsWith("s:head-") || id.includes("header"))).toBe(true);
  expect(site.some(id => id.includes("hero"))).toBe(false);
  // The newest (the section DNA's) carry a mark, and have a group of their own.
  fireEvent.click(screen.getAllByTestId("studio-tpl-group").find(b => b.getAttribute("data-group") === "new")!);
  const fresh = screen.getAllByTestId("studio-tpl-card").map(c => c.getAttribute("data-id")!);
  expect(fresh.every(id => id.startsWith("s:dna-"))).toBe(true);
  expect(screen.getAllByTestId("studio-tpl-new").length).toBe(fresh.length);
  // A star: the favourites group appears with that design, and stays in this browser.
  fireEvent.click(screen.getAllByTestId("studio-tpl-star")[0]);
  expect(JSON.parse(localStorage.getItem("estabrek:template-favourites")!)).toEqual([fresh[0].split(":")[1]]);
  fireEvent.click(screen.getAllByTestId("studio-tpl-group").find(b => b.getAttribute("data-group") === "favs")!);
  expect(screen.getAllByTestId("studio-tpl-card").map(c => c.getAttribute("data-id")!.split(":")[1])).toEqual([fresh[0].split(":")[1]]);
});
test("the whole premium themes: one card a theme, its parts picked in the preview, each added where it goes", async () => {
  const { onUse } = mount();
  fireEvent.click(await screen.findByTestId("studio-tpl-tab-pages"));
  const group = screen.getAllByTestId("studio-tpl-group").find((b) => b.getAttribute("data-group") === "themes")!;
  expect(group.textContent).toContain("24");
  fireEvent.click(group);
  const cards = screen.getAllByTestId("studio-tpl-card");
  expect(cards).toHaveLength(24);
  expect(cards.every((c) => /^p:premium-.+-home$/.test(c.getAttribute("data-id")!))).toBe(true);
  // A theme's card is the theme: its name and its line.
  const midnight = cards.find((c) => c.getAttribute("data-id") === "p:premium-midnight-home")!;
  expect(midnight.textContent).toContain("منتصف الليل");
  fireEvent.click(midnight);
  const parts = () => screen.getAllByTestId("studio-tpl-theme-part");
  expect(parts().map((b) => b.getAttribute("data-part"))).toEqual(["home", "about", "contact", "header", "footer"]);
  expect(parts()[0]).toHaveAttribute("aria-pressed", "true");
  // Its footer: the look's own design, a section, added as it is.
  fireEvent.click(parts()[4]);
  expect(parts()[4]).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByTestId("studio-tpl-end"));
  await waitFor(() => expect(onUse).toHaveBeenCalledTimes(1));
  expect(onUse.mock.calls[0][0]).toHaveLength(1);
  expect(onUse.mock.calls[0][0][0].props.tag).toBe("footer");
});
test("the look and mood filters reach the whole pages too", async () => {
  mount();
  fireEvent.click(await screen.findByTestId("studio-tpl-tab-pages"));
  fireEvent.change(screen.getByTestId("studio-tpl-look"), { target: { value: "neon" } });
  const ids = screen.getAllByTestId("studio-tpl-card").map((c) => c.getAttribute("data-id"));
  expect(ids.sort()).toEqual(["p:premium-neon-about", "p:premium-neon-contact", "p:premium-neon-home"]);
});
test("a whole premium theme goes into the store's pages' drafts in one go, then its first page opens", async () => {
  vi.mocked(getStoreTemplates).mockResolvedValue({ categories: [], templates: [template] });
  vi.mocked(PagesAPI.listPages).mockResolvedValue([{ id: "home-1", slug: "/", name: "Home", status: "PUBLISHED" }]);
  vi.mocked(PagesAPI.createPage).mockResolvedValue({ id: "about-1" } as never);
  vi.mocked(PagesAPI.getPageDraft).mockResolvedValue({ draft: null, main: "ar" });
  vi.mocked(PagesAPI.getPageTree).mockResolvedValue({ format: 2, saved: true, tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "old", type: "section", props: {} }] } } });
  vi.mocked(PagesAPI.changePageDraft).mockResolvedValue({ draft: { rev: 1 } as never });
  const onThemeApplied = vi.fn(), onClose = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><TemplatesGallery open onClose={onClose} lang="ar" family="fashion" colours={ROSE_COLOURS} pics={[]} busy={false} here={null} pageName="Home" storeName={words("Own store")} pageSections={() => []} selectedSection={null} makeIds={() => (p) => p} onUse={vi.fn()} onThemeApplied={onThemeApplied} /></MemoryRouter></QueryClientProvider>);
  fireEvent.click(await screen.findByTestId("studio-tpl-tab-pages"));
  fireEvent.click(screen.getAllByTestId("studio-tpl-group").find((b) => b.getAttribute("data-group") === "themes")!);
  fireEvent.click(screen.getAllByTestId("studio-tpl-card").find((c) => c.getAttribute("data-id") === "p:premium-midnight-home")!);
  fireEvent.click(screen.getByTestId("studio-tpl-theme-whole"));
  // Where each part goes: the home into the home's draft, About and Contact as new pages; a store whose header and
  // footer come with its theme has nowhere to put the theme's.
  await waitFor(() => expect(screen.getAllByTestId("studio-tpl-whole-part")).toHaveLength(5));
  const part = (p: string) => screen.getAllByTestId("studio-tpl-whole-part").find((b) => b.getAttribute("data-part") === p) as HTMLInputElement;
  expect([part("home").checked, part("about").checked, part("contact").checked]).toEqual([true, true, true]);
  expect(part("header")).toBeDisabled();
  expect(part("footer").getAttribute("data-skip")).toBe("no-design");
  fireEvent.click(part("contact"));
  fireEvent.click(screen.getByTestId("studio-tpl-whole-go"));
  await waitFor(() => expect(onThemeApplied).toHaveBeenCalledWith("home-1"));
  expect(PagesAPI.createPage).toHaveBeenCalledTimes(1);
  expect(PagesAPI.createPage).toHaveBeenCalledWith(expect.objectContaining({ slug: "/about" }));
  expect(vi.mocked(PagesAPI.changePageDraft).mock.calls.map(([id]) => id)).toEqual(["home-1", "about-1"]);
  expect(vi.mocked(PagesAPI.changePageDraft).mock.calls[0][1][0]).toEqual({ op: "remove", nodeId: "old" });
  expect(onClose).toHaveBeenCalled();
});
