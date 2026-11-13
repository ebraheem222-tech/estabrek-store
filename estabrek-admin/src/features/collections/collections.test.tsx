// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { setLangForTests } from "../../lib/lang";
import { fieldIdOf, itemDataOut, newCollectionList, slugOf, titleOf } from "./collectionForms";
import { bindContext } from "../../studio/CollectionsStudio";
import { indexTree } from "../../studio/treeIndex";

const api = vi.hoisted(() => ({
  listCollections: vi.fn(),
  collectionPresets: vi.fn(),
  createCollection: vi.fn(),
  listItems: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  deleteItem: vi.fn(),
  collectionTemplate: vi.fn(),
  storeTemplate: vi.fn(),
  previewFields: vi.fn(async () => ({ changes: [], needsAccept: false })),
  listVersions: vi.fn(async () => []),
  previewVersion: vi.fn(),
  restoreVersion: vi.fn(),
}));
vi.mock("../../hooks/useAuth", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
vi.mock("../../api/collections.api", () => api);
const pagesApi = vi.hoisted(() => ({ listPages: vi.fn(async () => []), updatePage: vi.fn(async () => ({})) }));
vi.mock("../../api/pages.api", () => pagesApi);
vi.mock("../../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));
// The fields editor asks which rules fit which kind of field (tested in fieldRules.test.tsx).
vi.mock("../../api/data.api", () => ({ gridMeta: vi.fn(async () => ({ rules: {}, shapes: [] })) }));
import CollectionsPage from "./CollectionsPage";

afterEach(() => { cleanup(); setLangForTests("ar"); vi.clearAllMocks(); });
const blog = { id: "c1", slug: "blog", name: { en: "Blog" }, templateId: null, items: 0, published: 0, createdAt: "", updatedAt: "", fields: [
  { id: "title", type: "text", name: { en: "Title" }, required: true },
  { id: "cover", type: "image", name: { en: "Cover" } },
  { id: "date", type: "date", name: { en: "Date" } },
  { id: "views", type: "number", name: { en: "Views" } },
] };

describe("the collections screen", () => {
  it("starts a collection from a ready one, and writes an item in a language and publishes it", async () => {
    setLangForTests("en");
    api.listCollections.mockResolvedValue([blog]);
    api.collectionPresets.mockResolvedValue({ blog: { name: { en: "Blog" }, slug: "blog", fields: blog.fields }, faq: { name: { en: "Questions" }, slug: "faq", fields: [] } });
    api.createCollection.mockResolvedValue({ ...blog, id: "c2", slug: "faq" });
    api.listItems.mockResolvedValue([]);
    api.createItem.mockResolvedValue({});
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><CollectionsPage /></MemoryRouter></QueryClientProvider>);
    // The address the shop already gives the blog is taken: the next free one.
    fireEvent.click(await screen.findByTestId("collection-preset-blog"));
    await waitFor(() => expect(api.createCollection).toHaveBeenCalledWith({ preset: "blog", slug: "blog-2" }));
    fireEvent.click(await screen.findByTestId("item-new"));
    const title = screen.getByTestId("item-field-title").querySelector("input")!;
    fireEvent.change(title, { target: { value: "Hello spring" } });
    fireEvent.click(screen.getByTestId("item-lang-ar"));
    fireEvent.change(screen.getByTestId("item-field-title").querySelector("input")!, { target: { value: "أهلا بالربيع" } });
    fireEvent.change(screen.getByTestId("item-field-views").querySelector("input")!, { target: { value: "12" } });
    fireEvent.click(screen.getByTestId("item-save-publish"));
    await waitFor(() => expect(api.createItem).toHaveBeenCalledWith("c1", { slug: "hello-spring", status: "PUBLISHED", data: { title: { en: "Hello spring", ar: "أهلا بالربيع" }, views: 12 } }));
  });
});

describe("collection helpers", () => {
  it("slugs, field ids, item values, titles", () => {
    expect(slugOf("Hello, Spring 2026!")).toBe("hello-spring-2026");
    expect(slugOf("أهلا")).toMatch(/^item-/);
    expect(fieldIdOf("Cover picture", ["coverPicture"])).toBe("coverPicture2");
    expect(fieldIdOf("صورة", [])).toBe("field");
    expect(itemDataOut(blog.fields as never, { title: { en: " ", ar: "x" }, cover: "", date: "2026-01-02", views: "abc" })).toEqual({ title: { ar: "x" }, date: "2026-01-02" });
    expect(titleOf(blog.fields as never, { title: { ar: "عنوان" } }, "en")).toBe("عنوان");
  });

  it("a new list's card is connected to the fields; elements inside know their collection", () => {
    let n = 0;
    const list = newCollectionList(blog as never, "en", (p) => `${p}-${n++}`);
    expect(list).toMatchObject({ type: "collectionList", props: { collectionId: "c1" } });
    const page = { version: 1 as const, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [list] }] } };
    const index = indexTree(page);
    const heading = list.children![0].children!.find((c) => c.type === "heading")!;
    expect(bindContext(index, heading.id, { id: "p" }, [blog as never])?.id).toBe("c1");
    expect(bindContext(index, "s", { id: "p" }, [blog as never])).toBeNull();
    expect(bindContext(index, "s", { id: "p", kind: "collectionTemplate" }, [{ ...blog, templateId: "p" } as never])?.id).toBe("c1");
  });
});

describe("the store's page designs", () => {
  it("shows when a design is live and turns it back to a draft, so the shop shows its own page again", async () => {
    setLangForTests("en");
    api.listCollections.mockResolvedValue([]);
    api.collectionPresets.mockResolvedValue({});
    pagesApi.listPages.mockResolvedValue([{ id: "cat-design", slug: "/__category-page", status: "PUBLISHED" }, { id: "prod-design", slug: "/__product-page", status: "DRAFT" }] as never);
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><CollectionsPage /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId("store-design-category").getAttribute("data-state")).toBe("live"));
    expect(screen.getByTestId("store-design-product").getAttribute("data-state")).toBe("draft");
    expect(screen.queryByTestId("stop-product-design")).toBeNull();
    fireEvent.click(screen.getByTestId("stop-category-design"));
    await waitFor(() => expect(pagesApi.updatePage).toHaveBeenCalledWith("cat-design", { status: "DRAFT" }));
  });
});
