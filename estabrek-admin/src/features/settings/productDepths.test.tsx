import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ProductDeep } from "../../api/catalog.api";
import { buildItems, draftForEdit, draftFromProduct } from "../catalog/composer/composerModel";
import { CARD_HOVER_NAMES } from "./cardPresets";
import { CARD_HOVERS } from "../../../../estabrek-storefront/src/lib/visualControls";
import { PRODUCT_PICTURE_FX_OPTIONS, readProductPictureFx } from "./productPictureFx";

// The product pictures in 3D: the depth pictures made here for the shop's 3D card and product page
// (lib/productDepths.ts, Settings → ProductDepthsPanel), and a photo's depth carried by the product's editor.
const h = vi.hoisted(() => ({
  images: [] as Array<{ id: string; url: string; depthUrl: string | null; productId: string; title: string }>,
  put: vi.fn(async (_url: string, _body: unknown) => ({ data: {} })),
  settings: { header: { storefront: { productPictureFx: "none" } } } as Record<string, unknown>,
  visual: { version: 1, revision: 1, cardDesign: { hover: "3d" } } as Record<string, unknown>,
}));
vi.mock("../../api/http", () => ({
  api: {
    get: vi.fn(async (_url: string, o?: { params?: { productId?: string } }) => {
      const images = o?.params?.productId ? h.images.filter((im) => im.productId === o.params!.productId) : h.images;
      return { data: { images, total: images.length, done: images.filter((im) => im.depthUrl).length } };
    }),
    put: h.put,
  },
}));
vi.mock("../../api/settings.api", () => ({ getSettings: vi.fn(async () => h.settings) }));
vi.mock("../../api/visualControls.api", () => ({ getVisualControls: vi.fn(async () => h.visual) }));
vi.mock("../../api/uploads.api", () => ({ uploadImages: vi.fn(async (files: File[]) => ({ files: [{ url: `https://res.cloudinary.com/x/${files[0].name}.png` }] })) }));
vi.mock("../../lib/depth", async () => {
  const engine = await vi.importActual<typeof import("../../lib/depthEngine")>("../../lib/depthEngine");
  return {
    DepthError: engine.DepthError,
    estimateDepth: vi.fn(async (_src: string, o?: { onProgress?: (p: { phase: string; loaded?: number; total?: number }) => void }) => {
      o?.onProgress?.({ phase: "download", loaded: 50, total: 100 });
      return { width: 2, height: 2, grey: new Uint8ClampedArray(16), engine: "wasm" };
    }),
    depthFile: vi.fn(async (_map: unknown, name: string) => new File([new Uint8Array(4)], name, { type: "image/png" })),
  };
});
const depthLib = await import("../../lib/depth");
const lib = await import("../../lib/productDepths");
const { ProductDepthsPanel } = await import("./ProductDepthsPanel");

const pic = (id: string, productId = "p1", depthUrl: string | null = null) => ({ id, url: `https://res.cloudinary.com/x/${id}.jpg`, depthUrl, productId, title: `Product ${productId}` });
beforeEach(() => {
  h.images = [pic("a", "p1", "https://res.cloudinary.com/x/a-depth.png"), pic("b"), pic("c", "p2")];
  h.put.mockClear();
  vi.mocked(depthLib.estimateDepth).mockClear();
});
afterEach(cleanup);

describe("the 3D's settings", () => {
  it("the product page's picture may be 3D, and so may the card's hover", () => {
    expect(readProductPictureFx("3d")).toBe("3d");
    expect(PRODUCT_PICTURE_FX_OPTIONS.at(-1)?.value).toBe("3d");
    expect(CARD_HOVERS).toContain("3d");
    expect(CARD_HOVER_NAMES.map(([k]) => k)).toContain("3d");
  });
});

describe("making the depth pictures", () => {
  it("each picture in turn, saved beside it and put on it; a picture that can't be read is passed over", async () => {
    vi.mocked(depthLib.estimateDepth).mockRejectedValueOnce(new depthLib.DepthError("IMAGE_LOAD"));
    const seen: number[] = [];
    const got = await lib.makeDepths([pic("b"), pic("c", "p2")], { onProgress: (p) => seen.push(p.done) });
    expect(got).toEqual({ made: 1, failed: 1 });
    expect(h.put).toHaveBeenCalledTimes(1);
    expect(h.put).toHaveBeenCalledWith("/admin/catalog/images/c/depth", { depthUrl: "https://res.cloudinary.com/x/c-depth.png" });
    expect(seen.at(-1)).toBe(2);
  });

  it("a model that can't be had stops them all", async () => {
    vi.mocked(depthLib.estimateDepth).mockRejectedValueOnce(new depthLib.DepthError("MODEL_DOWNLOAD"));
    await expect(lib.makeDepths([pic("b"), pic("c", "p2")])).rejects.toMatchObject({ code: "MODEL_DOWNLOAD" });
    expect(depthLib.estimateDepth).toHaveBeenCalledTimes(1);
    expect(h.put).not.toHaveBeenCalled();
  });

  it("after a save, the product's pictures without one get theirs, only while the store shows its pictures in 3D", async () => {
    h.visual = { version: 1, revision: 1, cardDesign: { hover: "zoom" } };
    await lib.depthsAfterSave("p1");
    expect(depthLib.estimateDepth).not.toHaveBeenCalled();
    h.settings = { header: { storefront: { productPictureFx: "3d" } } };
    await lib.depthsAfterSave("p1");
    // Only p1's picture without a depth picture (a has one; c is another product's).
    expect(depthLib.estimateDepth).toHaveBeenCalledTimes(1);
    expect(depthLib.estimateDepth).toHaveBeenCalledWith("https://res.cloudinary.com/x/b.jpg", expect.anything());
    expect(h.put).toHaveBeenCalledWith("/admin/catalog/images/b/depth", { depthUrl: "https://res.cloudinary.com/x/b-depth.png" });
  });
});

describe("Settings → the product pictures in 3D", () => {
  it("says how many have their depth and makes the missing ones", async () => {
    render(<ProductDepthsPanel />);
    await waitFor(() => expect(screen.getByTestId("product-depths-count").textContent).toMatch(/1\D+3/));
    fireEvent.click(screen.getByTestId("product-depths-make"));
    await waitFor(() => expect(screen.getByTestId("product-depths-note")).toBeTruthy());
    expect(h.put).toHaveBeenCalledTimes(2);
    expect(depthLib.estimateDepth).toHaveBeenCalledTimes(2);
  });

  it("a model that can't run says so", async () => {
    vi.mocked(depthLib.estimateDepth).mockRejectedValueOnce(new depthLib.DepthError("NO_WORKER"));
    render(<ProductDepthsPanel />);
    await waitFor(() => expect((screen.getByTestId("product-depths-make") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByTestId("product-depths-make"));
    await waitFor(() => expect(screen.getByTestId("product-depths-note").textContent).toMatch(/Chrome/));
    expect(h.put).not.toHaveBeenCalled();
  });
});

describe("the product's editor carries a photo's depth picture", () => {
  const product = {
    id: "cprod000001", title: "Coat", slug: "coat", isActive: true, categoryId: "ccat0000001", description: null,
    items: [{
      id: "citem000001", productId: "cprod000001", colorName: "Black", colorHex: "#111111", skuBase: "COAT-BLK", isActive: true,
      images: [{ id: "cimg0000001", productItemId: "citem000001", url: "https://cdn/b.jpg", position: 0, isPrimary: true, depthUrl: "https://cdn/b-depth.png" }],
      variants: [{ id: "cvar0000001", productItemId: "citem000001", sizeId: "cs1aaaaaaaa", sku: "COAT-BLK-S", price: "250", stock: 4, lowStockThreshold: 2, size: { id: "cs1aaaaaaaa", name: "S", order: 1 } }],
    }],
  } as unknown as ProductDeep;
  const sizes = [{ id: "cs1aaaaaaaa", name: "S", order: 1 }] as Parameters<typeof buildItems>[1];

  it("kept when the product is saved again, and in a copy of it", () => {
    const edit = draftForEdit(product);
    expect(Object.values(edit.photos)[0].depthUrl).toBe("https://cdn/b-depth.png");
    expect(buildItems(edit, sizes)[0].images?.[0]).toMatchObject({ id: "cimg0000001", depthUrl: "https://cdn/b-depth.png" });
    const copy = draftFromProduct(product, { keepPhotos: true });
    expect(buildItems(copy, sizes)[0].images?.[0]).toMatchObject({ url: "https://cdn/b.jpg", depthUrl: "https://cdn/b-depth.png" });
  });
});
