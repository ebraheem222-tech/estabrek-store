import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Scan } from "../../../api/scans.api";

const scan = (id: string, product: Scan["manifest"]["product"], name = id): Scan => ({
  id, displayName: name, url: `https://cdn.test/${id}.webp`, size: 1, width: 400, height: 300, createdAt: "",
  manifest: { version: 1, cols: 6, rows: 6, cellW: 100, cellH: 120, frames: Array.from({ length: 36 }, (_, k) => ({ angle: k * 10, time: k / 10 })), elevation: null, heightMm: null, video: { name: "v.mp4", duration: 4, width: 640, height: 480 }, checks: [], mode: "plain", product },
});
let all: Scan[] = [];
const listScans = vi.fn(async (productId?: string) => ({ items: productId ? all.filter((s) => s.manifest.product?.id === productId) : all }));
const linkScan = vi.fn(async (id: string, body: { productId?: string | null; itemId?: string | null }) => {
  all = all.map((s) => (s.id === id ? { ...s, manifest: { ...s.manifest, product: body.productId ? { id: body.productId, itemId: body.itemId ?? null } : null } } : s));
  return all.find((s) => s.id === id)!;
});
vi.mock("../../../api/scans.api", () => ({ listScans: (p?: string) => listScans(p), linkScan: (id: string, b: { productId?: string | null }) => linkScan(id, b), saveScan: vi.fn() }));
vi.mock("../../scan3d/Spin360", () => ({ Spin360: () => <div data-testid="spin-preview" /> }));
vi.mock("../../scan3d/PlainSpin", () => ({ PlainSpin: ({ product }: { product: { id: string; colours: unknown[] } }) => <div data-testid="plain-spin" data-product={product.id} data-colours={product.colours.length} /> }));

import { SpinSection } from "./SpinSection";
import { emptyDraft } from "./composerModel";

const draft = (edit: boolean) =>
  emptyDraft({
    title: "فستان الورد",
    groups: [
      { key: "g1", name: "وردي", hex: null, photoKeys: [], itemId: "rose" },
      { key: "g2", name: "توتي", hex: null, photoKeys: [], itemId: "berry" },
    ] as never,
    ...(edit ? { edit: { productId: "coat", isActive: true, variantIds: {}, loadedStock: {}, loadedLow: {}, itemIds: ["rose", "berry"], imageIds: [] } } : {}),
  });
const show = (d: ReturnType<typeof draft>) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><SpinSection draft={d} step={5} /></MemoryRouter>
    </QueryClientProvider>,
  );

describe("a product's 360° views in the composer", () => {
  beforeEach(() => {
    all = [scan("mine", { id: "coat", itemId: "berry" }, "Berry turn"), scan("free", null, "Loose turn"), scan("other", { id: "bag" }, "Bag turn")];
    listScans.mockClear();
    linkScan.mockClear();
  });

  it("asks to save the product first", () => {
    show(draft(false));
    expect(screen.getByTestId("spin-unsaved")).toBeTruthy();
    expect(listScans).not.toHaveBeenCalled();
  });

  it("shows its own views with their colour; one comes off, another one is picked and linked", async () => {
    show(draft(true));
    await waitFor(() => expect(screen.getAllByTestId("spin-linked")).toHaveLength(1));
    expect(listScans).toHaveBeenCalledWith("coat");
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("berry");
    // For every colour instead.
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    await waitFor(() => expect(linkScan).toHaveBeenCalledWith("mine", { productId: "coat", itemId: null }));
    // Off the product.
    fireEvent.click(screen.getByTestId("spin-unlink"));
    await waitFor(() => expect(linkScan).toHaveBeenCalledWith("mine", { productId: null }));
    await waitFor(() => expect(screen.queryAllByTestId("spin-linked")).toHaveLength(0));
    // A saved one (another product's moves here).
    fireEvent.click(screen.getByTestId("spin-choose"));
    await waitFor(() => expect(screen.getByTestId("spin-saved").querySelectorAll("button")).toHaveLength(3));
    fireEvent.click(screen.getByTestId("spin-saved").querySelector('[data-scan="other"]')!);
    await waitFor(() => expect(linkScan).toHaveBeenCalledWith("other", { productId: "coat", itemId: null }));
    await waitFor(() => expect(screen.getAllByTestId("spin-linked")).toHaveLength(1));
  });

  it("makes one from a video for this product and its colours", async () => {
    show(draft(true));
    fireEvent.click(screen.getByTestId("spin-make"));
    const maker = await screen.findByTestId("plain-spin");
    expect(maker.getAttribute("data-product")).toBe("coat");
    expect(maker.getAttribute("data-colours")).toBe("2");
  });
});
