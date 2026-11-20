// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// The setup's first step, the store's own shop (backend lib/shopLink.ts): one that opens to this admin is said so;
// one that doesn't (another store's) or none gets a shop made on Vercel with the owner's token, which then
// builds for a few minutes and the setup goes on by itself once it opens.

const m = vi.hoisted(() => ({ link: vi.fn(), make: vi.fn(), opens: vi.fn(), follow: vi.fn(), connect: vi.fn(), goTo: vi.fn() }));
vi.mock("../../api/shop.api", () => ({ getShopLink: m.link, makeShopLink: m.make, shopOpensHere: m.opens, followShop: m.follow, startVercelConnect: m.connect, goTo: m.goTo }));
vi.mock("../../api/cloudinary.api", () => ({ getCloudinaryAccount: vi.fn(), saveCloudinaryAccount: vi.fn() }));

import { setLangForTests } from "../../lib/lang";
import { ShopStep } from "./SetupExtras";
import { env } from "../../config/env";
import { followShop } from "../../api/shop.api";

const NONE = { connect: false, error: null, url: null, source: "none", making: null, repo: "acme/store", branch: "main" };
const readyNow = vi.fn();
function show(onReady = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ShopStep onReady={onReady} onReadyChange={readyNow} />
    </QueryClientProvider>,
  );
  return onReady;
}
beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("The store's own shop, first in its setup", () => {
  test("a shop that opens to this admin: said so, nothing to make", async () => {
    m.link.mockResolvedValue({ ...NONE, url: "https://rose.vercel.app", source: "server" });
    m.opens.mockResolvedValue(true);
    show();
    expect((await screen.findByTestId("setup-shop-ready")).textContent).toContain("rose.vercel.app");
    expect(screen.queryByTestId("setup-shop-form")).toBeNull();
    expect(m.opens).toHaveBeenCalledWith("https://rose.vercel.app");
    // The setup may go on: the wizard is told, and no "wait" is said.
    await waitFor(() => expect(readyNow).toHaveBeenLastCalledWith(true));
    expect(screen.queryByTestId("setup-shop-wait")).toBeNull();
  });

  test("the token way in pictures: Vercel's tokens page a press away, then four steps; and no going on until the shop is ready", async () => {
    m.link.mockResolvedValue(NONE);
    show();
    const guide = await screen.findByTestId("setup-shop-guide");
    expect(guide.hasAttribute("open")).toBe(true);
    expect(screen.getByTestId("setup-shop-guide-open").getAttribute("href")).toBe("https://vercel.com/account/tokens");
    expect([1, 2, 3, 4].map((i) => screen.getByTestId(`setup-shop-guide-${i}`).querySelector("svg") !== null)).toEqual([true, true, true, true]);
    expect(screen.getByTestId("setup-shop-guide-2").textContent).toContain("All Projects");
    expect(screen.getByTestId("setup-shop-guide-3").textContent).toContain("vcp_");
    expect(readyNow).toHaveBeenLastCalledWith(false);
    expect(screen.getByTestId("setup-shop-wait").textContent).toContain("“Next” works once your shop is ready");
  });

  test("another store's shop: said so, and one of its own offered", async () => {
    m.link.mockResolvedValue({ ...NONE, url: "https://estabrek-store.vercel.app", source: "server" });
    m.opens.mockResolvedValue(false);
    show();
    expect((await screen.findByTestId("setup-shop-elsewhere")).textContent).toContain("estabrek-store.vercel.app");
    expect(screen.getByTestId("setup-shop-form")).toBeTruthy();
  });

  test("made with the token, then built: the setup goes on by itself once it opens", async () => {
    m.link.mockResolvedValue(NONE);
    m.make.mockResolvedValue({ ...NONE, url: "https://rose-shop.vercel.app", source: "made", project: "prj_1" });
    m.opens.mockResolvedValueOnce(false).mockResolvedValue(true);
    const onReady = show();
    await screen.findByTestId("setup-shop-form");
    const go = screen.getByTestId("setup-shop-make") as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    fireEvent.change(screen.getByTestId("setup-shop-token"), { target: { value: "made-up-vercel-token-1234" } });
    fireEvent.change(screen.getByTestId("setup-shop-site"), { target: { value: "Rose-Shop" } });
    expect(screen.getByText("https://rose-shop.vercel.app")).toBeTruthy();
    expect(go.disabled).toBe(false);
    fireEvent.click(go);
    await waitFor(() => expect(m.make).toHaveBeenCalledWith({ token: "made-up-vercel-token-1234", team: undefined, site: "rose-shop" }));
    // Its address followed by the admin at once; the token gone from the page.
    await waitFor(() => expect(m.follow).toHaveBeenCalledWith(expect.objectContaining({ url: "https://rose-shop.vercel.app", source: "made" })));
    expect((await screen.findByTestId("setup-shop-building")).textContent).toContain("rose-shop.vercel.app");
    expect(screen.getByTestId("setup-shop-waited").textContent).toMatch(/0:0\d/);
    expect(readyNow).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(onReady).toHaveBeenCalled(), { timeout: 8000 });
    expect(readyNow).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId("setup-shop-ready")).toBeTruthy();
  }, 15_000);

  test("Vercel saying no is said in words to act on; a stopped try is gone on with", async () => {
    m.link.mockResolvedValue({ ...NONE, making: "rose-shop" });
    m.make.mockRejectedValue({ response: { data: { error: "VERCEL_REFUSED", message: "To link a GitHub repository, you need to install the GitHub integration first." } } });
    show();
    expect((await screen.findByTestId("setup-shop-making")).textContent).toContain("rose-shop");
    expect((screen.getByTestId("setup-shop-site") as HTMLInputElement).value).toBe("rose-shop");
    fireEvent.change(screen.getByTestId("setup-shop-token"), { target: { value: "made-up-vercel-token-1234" } });
    fireEvent.click(screen.getByTestId("setup-shop-make"));
    expect((await screen.findByTestId("setup-shop-failed")).textContent).toContain("install Vercel's GitHub integration");
  });
});

describe("«وصّل Vercel»", () => {
  test("set up on the server: one press sends the owner to Vercel to sign in; the token way stays, folded away", async () => {
    m.link.mockResolvedValue({ ...NONE, connect: true });
    m.connect.mockResolvedValue({ url: "https://vercel.com/integrations/estabrek-shops/new?state=abc" });
    show();
    await screen.findByTestId("setup-shop-connect");
    expect(screen.getByTestId("setup-shop-token-way").hasAttribute("open")).toBe(false);
    fireEvent.change(screen.getByTestId("setup-shop-site"), { target: { value: "rose-shop" } });
    fireEvent.click(screen.getByTestId("setup-shop-connect"));
    await waitFor(() => expect(m.connect).toHaveBeenCalledWith("rose-shop"));
    await waitFor(() => expect(m.goTo).toHaveBeenCalledWith("https://vercel.com/integrations/estabrek-shops/new?state=abc"));
    expect(m.make).not.toHaveBeenCalled();
  });

  test("back from Vercel without a shop: why, in words to act on", async () => {
    m.link.mockResolvedValue({ ...NONE, connect: true, error: "Vercel didn't give a token: The code is invalid or expired" });
    show();
    const why = (await screen.findByTestId("setup-shop-error")).textContent!;
    expect(why).toContain("Vercel didn't give a token, perhaps the link was old or used");
    expect(why).toContain("The code is invalid or expired");
  });
});

describe("The admin following its shop", () => {
  test("a shop made from its setup is followed; one from the server's variables leaves the built address", async () => {
    const actual = await vi.importActual<typeof import("../../api/shop.api")>("../../api/shop.api");
    const before = env.VITE_STOREFRONT_BASE_URL;
    try {
      actual.followShop({ ...NONE, url: "https://other.example", source: "server" } as never);
      expect(env.VITE_STOREFRONT_BASE_URL).toBe(before);
      actual.followShop({ ...NONE, url: "https://rose-shop.vercel.app/", source: "made" } as never);
      expect(env.VITE_STOREFRONT_BASE_URL).toBe("https://rose-shop.vercel.app");
    } finally {
      env.VITE_STOREFRONT_BASE_URL = before;
    }
    void followShop;
  });
});
