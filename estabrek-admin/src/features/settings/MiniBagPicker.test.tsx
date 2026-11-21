// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { MINI_BAG_DESIGNS } from "../../../../estabrek-storefront/src/lib/miniBagDesigns";
import { setLangForTests } from "../../lib/lang";

// Settings → السلة والدفع → تصميم السلة المصغّرة: the 100 designs of the shop's small bag (the shop's
// lib/miniBagDesigns.ts), drawn in the store theme's colours, with the store's own products.
vi.mock("../../studio/storeThemes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../studio/storeThemes")>()),
  shopOrigin: () => "https://shop.example.com",
  loadStoreThemes: vi.fn().mockResolvedValue({
    themes: [{ id: "circuit", name: { ar: "دارة", en: "Circuit", he: "מעגל" }, family: "electronics", blurb: { ar: "", en: "", he: "" }, mode: "dark", modes: ["dark"], swatch: [], hero: "", motion: "", palettes: { dark: { bg: "#07090f", surface: "#0f131c", soft: "#151b28", line: "#212a3b", glow: "#1d4ed8", muted: "#98a2b6", accent: "#4f8cff", strong: "#8fb6ff", ink: "#eef3ff", onStrong: "#07090f" } }, fonts: { display: "Orbitron", text: "Inter" } }],
    defaults: { electronics: "circuit" },
  }),
}));
vi.mock("../../api/catalog.api", () => ({
  listProducts: vi.fn().mockResolvedValue([
    { id: "p1", title: "Desk lamp", slug: "lamp", isActive: true, categoryId: "c", summary: { thumbUrl: "https://img.example.com/lamp.jpg", priceMin: 120, priceMax: 120, compareAtMax: null, stockTotal: 3, variantCount: 1, outCount: 0, lowCount: 0, colors: [{ name: "Black", hex: "#000", active: true }], skus: [] } },
    { id: "p2", title: "Headphones", slug: "phones", isActive: true, categoryId: "c", summary: { thumbUrl: "https://img.example.com/phones.jpg", priceMin: 300, priceMax: 300, compareAtMax: null, stockTotal: 3, variantCount: 1, outCount: 0, lowCount: 0, colors: [], skus: [] } },
  ]),
}));
import { MiniBagPicker } from "./MiniBagPicker";

const HEADER = { identity: { industry: "electronics" } };
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The small bag's designs in the settings", () => {
  test("all 100 drawn, those for the store's kind first; filtered by where it opens, by mood and by name", async () => {
    setLangForTests("en");
    render(<MiniBagPicker value="" onChange={() => undefined} header={HEADER} testid="mb" />);
    const options = () => screen.getAllByRole("option");
    expect(options()).toHaveLength(MINI_BAG_DESIGNS.length);
    expect(options()[0].getAttribute("data-fits")).toBe("true");
    // Each tile is a picture of the bag in that design (the shop's own markup and stylesheet).
    expect(screen.getByTestId("mb-receipt").querySelector('.mb[data-mb="receipt"][data-mb-lines="receipt"]')).not.toBeNull();
    fireEvent.click(screen.getByTestId("mb-family-band"));
    expect(options().length).toBe(MINI_BAG_DESIGNS.filter((x) => x.family === "band").length);
    fireEvent.click(screen.getByTestId("mb-mood-luxe"));
    expect(options().every((o) => MINI_BAG_DESIGNS.find((x) => `mb-${x.id}` === o.getAttribute("data-testid"))?.mood === "luxe")).toBe(true);
    fireEvent.click(screen.getByText("All"));
    fireEvent.click(screen.getByText("Every mood"));
    fireEvent.change(screen.getByTestId("mb-search"), { target: { value: "velvet" } });
    expect(options().map((o) => o.getAttribute("data-testid"))).toEqual(["mb-velvet"]);
    // In the store theme's colours, with the store's own products.
    await waitFor(() => expect((screen.getByTestId("mb-velvet").querySelector("[dir]") as HTMLElement).style.getPropertyValue("--th-strong")).toBe("#8fb6ff"));
    await waitFor(() => expect(screen.getByTestId("mb-velvet").textContent).toContain("Desk lamp"));
    // (A hundred whole pictures are slow to draw in the test's page.)
  }, 30000);

  test("picking one: it is drawn large on a computer and a phone, opens on the store, and goes back to none", async () => {
    setLangForTests("en");
    let value = "";
    const { rerender } = render(<MiniBagPicker value={value} onChange={(id) => (value = id)} header={HEADER} testid="mb" />);
    expect(screen.getByTestId("mb-picked").textContent).toContain("The original bag");
    fireEvent.click(screen.getByTestId("mb-midnight"));
    expect(value).toBe("midnight");
    rerender(<MiniBagPicker value={value} onChange={(id) => (value = id)} header={HEADER} testid="mb" />);
    expect(screen.getByTestId("mb-midnight").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("mb-picked").textContent).toContain("Midnight");
    expect(screen.getByTestId("mb-big").querySelector('.mb[data-mb="midnight"]')).not.toBeNull();
    expect(screen.getByTestId("mb-phone").getAttribute("data-screen")).toBe("phone");
    expect(screen.getByTestId("mb-open-shop").getAttribute("href")).toBe("https://shop.example.com/?miniBag=midnight");
    // «Play its motion»: closed, then open again.
    vi.useFakeTimers();
    act(() => { fireEvent.click(screen.getByTestId("mb-replay")); });
    expect(screen.getByTestId("mb-big").querySelector(".mb")!.hasAttribute("data-open")).toBe(false);
    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByTestId("mb-big").querySelector(".mb")!.getAttribute("data-open")).toBe("true");
    vi.useRealTimers();
    fireEvent.click(screen.getByTestId("mb-none"));
    expect(value).toBe("");
  }, 30000);
});
