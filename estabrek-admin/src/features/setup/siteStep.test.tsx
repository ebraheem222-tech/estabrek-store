// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Feature } from "../../api/myFeatures.api";

// The store setup's «شو نوع موقعك؟» with a whole site picked (sites wave 0.4), over stand-in APIs: the install
// wizard's steps instead of what a store sells, then the store's part, the site installed with the choices,
// switched on, its pages published and made the home, one after another; a failure stops at its step and
// goes on from it. The server's side of each call has its own specs (setup, featureTemplates, siteHome).

const m = vi.hoisted(() => ({ status: vi.fn(), settings: vi.fn(), apply: vi.fn(), cloud: vi.fn(), shop: vi.fn(), opens: vi.fn(), install: vi.fn(), save: vi.fn(), home: vi.fn(), publish: vi.fn() }));
vi.mock("../../api/shop.api", () => ({ getShopLink: m.shop, makeShopLink: vi.fn(), followShop: vi.fn(), shopOpensHere: m.opens }));
vi.mock("../../api/setup.api", () => ({ SETUP_LATER_KEY: "setup-later", getSetupStatus: m.status, applySetup: m.apply }));
vi.mock("../../api/settings.api", () => ({ getSettings: m.settings }));
vi.mock("../../api/pages.api", () => ({ listPages: vi.fn(async () => []), updatePage: m.publish }));
vi.mock("../../api/myFeatures.api", () => ({ installTemplate: m.install, saveFeature: m.save, makeSiteHome: m.home }));
vi.mock("../../api/storeTemplates.api", () => ({ getStoreTemplateImport: vi.fn(), getStoreTemplates: vi.fn() }));
vi.mock("../../api/http", () => ({ getApiErrorMessage: (e: Error) => e.message }));
vi.mock("../../studio/storeThemes", () => ({ shopOrigin: () => "https://shop.example.com" }));
vi.mock("../../components/media/MediaUrlInput", () => ({ MediaUrlInput: () => null }));
vi.mock("../../api/cloudinary.api", () => ({ getCloudinaryAccount: m.cloud, saveCloudinaryAccount: vi.fn(), removeCloudinaryAccount: vi.fn() }));
vi.mock("./StoreTemplatePicker", () => ({ StoreTemplatePicker: () => null }));

import SetupWizard from "./SetupWizard";
import { setLangForTests } from "../../lib/lang";
import { choosable, shellOf, siteByKey, withChoices, type SiteChoices } from "../../studio/templates/sites";
import { personasFor } from "../../../../estabrek-storefront/src/lib/personas";

const RESTAURANT = siteByKey("site-restaurant")!;
const page = (id: string, key: string | null, slug: string) => ({ id, key, name: `Restaurant: ${key ?? "own"}`, slug, status: "DRAFT" as const, hasDraft: false });
function feature(over: Partial<Feature> = {}): Feature {
  return {
    id: "f1",
    name: "Restaurant: Abu Samir",
    note: null,
    enabled: false,
    template: { key: "site-restaurant", version: "1.0.0", name: { ar: "مطعم", en: "Restaurant", he: "מסעדה" }, installedAt: "2026-11-22T10:00:00Z" },
    createdAt: "",
    updatedAt: "",
    tables: [],
    functions: [],
    pages: [page("p-home", "home", "/restaurant"), page("p-story", "story", "/our-story"), page("p-own", null, "/by-hand")],
    siteHome: { homeId: "p-home", on: false, other: null },
    free: { tables: [], functions: [], pages: [] },
    limits: { features: 100, items: 60 },
    ...over,
  };
}

const next = () => fireEvent.click(screen.getByTestId("setup-next"));
function start() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/setup"]}>
        <Routes>
          <Route path="/setup" element={<SetupWizard />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
/** Past the shop, a site picked, its name typed: on its «what it runs». */
async function toSite(key: string, name = "Abu Samir") {
  await screen.findByTestId("setup-shop-ready");
  next();
  await screen.findByTestId("setup-kind");
  fireEvent.click(screen.getByTestId(`setup-kind-${key}`));
  next();
  await screen.findByTestId("sites-about");
  fireEvent.change(screen.getByTestId("sites-biz-name"), { target: { value: name } });
  next();
  await screen.findByTestId("sites-run");
}
/** From «what it runs» to the last step. */
async function toFinish() {
  next();
  await screen.findByTestId("sites-look");
  next();
  await screen.findByTestId("setup-assistant");
  next();
  await screen.findByTestId("setup-media");
  next();
  await screen.findByTestId("setup-site-finish");
}

beforeEach(() => {
  vi.clearAllMocks();
  setLangForTests("en");
  m.status.mockResolvedValue({ needed: true, owner: true, hasHome: false, counts: {}, mainLanguage: "en" });
  m.settings.mockResolvedValue({ siteName: "My Store", header: {}, logoUrl: null });
  m.apply.mockResolvedValue({ ok: true, made: { categories: 0, types: 0, pages: 0, menuItems: 0 }, kept: {}, mainLanguage: "en" });
  m.cloud.mockResolvedValue({ source: "none", cloudName: null, apiKeyEnd: null, savedAt: null });
  m.shop.mockResolvedValue({ url: "https://shop.example.com", source: "server", making: null, repo: "acme/store", branch: "main" });
  m.opens.mockResolvedValue(true);
  m.install.mockResolvedValue(feature());
  m.save.mockResolvedValue(feature({ enabled: true }));
  m.publish.mockResolvedValue({});
  m.home.mockImplementation(async () => ({ home: "/restaurant", menus: { header: 4, footer: 4 }, left: [], already: false, feature: feature({ enabled: true, siteHome: { homeId: "p-home", on: true, other: null } }) }));
});
afterEach(() => {
  cleanup();
  setLangForTests("ar");
});

describe("«What kind of site is it?» in the store setup", () => {
  test("a whole site takes the install wizard's steps; set up live: the store's part, the site with the choices, on, published, the home", async () => {
    start();
    await screen.findByTestId("setup-shop-ready");
    next();
    await screen.findByTestId("setup-kind");
    fireEvent.click(screen.getByTestId("setup-kind-site-restaurant"));
    expect(screen.getByTestId("setup-kind").getAttribute("data-picked")).toBe("site-restaurant");
    // Its steps instead of what a store sells.
    const steps = within(screen.getByRole("list", { name: "Steps" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(steps).toEqual(["1. Your shop", "2. Kind of site", "3. About you", "4. What it runs", "5. The look", "6. Assistant", "7. Pictures", "8. Set it up", "9. Ready"]);
    next();

    // About you: the name starts empty (never the sample's), and is needed.
    await screen.findByTestId("sites-about");
    expect((screen.getByTestId("sites-biz-name") as HTMLInputElement).value).toBe("");
    expect(screen.getByTestId("setup-next")).toBeDisabled();
    fireEvent.change(screen.getByTestId("sites-biz-name"), { target: { value: "Abu Samir" } });
    fireEvent.change(screen.getByTestId("sites-biz-phone"), { target: { value: "050-123-4567" } });
    expect(screen.getByTestId("sites-biz-email-sample")).toBeInTheDocument();
    expect(screen.queryByTestId("sites-biz-phone-sample")).toBeNull();
    next();

    // What it runs, and its look.
    fireEvent.click(await screen.findByTestId("sites-run-reviews"));
    next();
    fireEvent.click(await screen.findByTestId("sites-look-2"));
    fireEvent.click(screen.getByTestId("sites-motion-rich"));
    next();
    await screen.findByTestId("setup-assistant");
    next();
    await screen.findByTestId("setup-media");
    next();

    // The last step: what it makes, and the details still the sample's.
    await screen.findByTestId("setup-site-finish");
    expect(screen.getByTestId("setup-site-name").textContent).toContain("Abu Samir");
    expect(screen.getByTestId("setup-site-sample").textContent).toContain("The email");
    expect(screen.getByTestId("setup-site-sample").textContent).not.toContain("The phone");
    expect((screen.getByTestId("setup-site-live") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByTestId("setup-apply"));

    const done = await screen.findByTestId("setup-done");
    expect(done.getAttribute("data-live")).toBe("true");
    // The store's part: its name, the site's theme, the assistant; nothing a store sells.
    expect(m.apply).toHaveBeenCalledTimes(1);
    expect(m.apply.mock.calls[0][0]).toMatchObject({ industry: "food", name: { ar: "Abu Samir", en: "Abu Samir", he: "Abu Samir" }, theme: { id: "coffee-roast", mode: null }, categories: [], types: [], pages: [], menu: [], assistant: { enabled: true, persona: personasFor("food")[0].id } });
    // The site, built with the choices and carrying them.
    const [file, lang] = m.install.mock.calls[0];
    expect(lang).toBe("en");
    expect(file.key).toBe("site-restaurant");
    const chosen: SiteChoices = file.site;
    expect(chosen).toEqual({ biz: { name: { ar: "Abu Samir", en: "Abu Samir", he: "Abu Samir" }, phone: "050-123-4567" }, modules: choosable(RESTAURANT).map((x) => x.key).filter((k) => k !== "reviews"), look: 2, motion: "rich" });
    // Then on, its own pages published (not one added by hand), and the home with the menus of the site as chosen.
    expect(m.save).toHaveBeenCalledWith("f1", { enabled: true });
    expect(m.publish.mock.calls).toEqual([
      ["p-home", { status: "PUBLISHED" }],
      ["p-story", { status: "PUBLISHED" }],
    ]);
    expect(m.home).toHaveBeenCalledWith("f1", shellOf(withChoices(RESTAURANT, chosen)));
    // In that order.
    const order = [m.apply, m.install, m.save, m.publish, m.home].map((f) => f.mock.invocationCallOrder[0]);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // What is ready.
    expect(screen.getByTestId("setup-done-site").getAttribute("href")).toBe("/admin/my-features/f1");
    expect(screen.getByTestId("setup-done-home").getAttribute("href")).toBe("/studio/p-home");
  });

  test("a step that fails stops there, and pressed again it goes on from it; untick «publish it now» and it only installs as a draft", async () => {
    m.save.mockRejectedValueOnce(new Error("The server is busy"));
    start();
    await toSite("site-gym", "Iron House");
    await toFinish();
    fireEvent.click(screen.getByTestId("setup-apply"));
    expect((await screen.findByTestId("setup-site-failed")).textContent).toBe("The server is busy");
    expect(["setup", "install", "on", "publish", "home"].map((s) => screen.getByTestId(`setup-site-run-${s}`).getAttribute("data-state"))).toEqual(["done", "done", "failed", "waiting", "waiting"]);
    // Done stays done: no going back to change it, and «publish it now» stays as it was.
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByTestId("setup-site-live")).toBeDisabled();
    expect(screen.getByTestId("setup-apply").textContent).toBe("Try again from here");
    fireEvent.click(screen.getByTestId("setup-apply"));
    await screen.findByTestId("setup-done");
    expect([m.apply, m.install, m.save, m.home].map((f) => f.mock.calls.length)).toEqual([1, 1, 2, 1]);
    expect(m.apply.mock.calls[0][0].theme.id).toBe("iron-gym");
    cleanup();

    vi.clearAllMocks();
    m.install.mockResolvedValue(feature());
    start();
    await toSite("site-gym", "Iron House");
    await toFinish();
    fireEvent.click(screen.getByTestId("setup-site-live"));
    fireEvent.click(screen.getByTestId("setup-apply"));
    const done = await screen.findByTestId("setup-done");
    expect(done.getAttribute("data-live")).toBe("false");
    expect(m.install).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(m.apply).toHaveBeenCalledTimes(1));
    expect([m.save, m.publish, m.home].map((f) => f.mock.calls.length)).toEqual([0, 0, 0]);
  });

  test("the store's own name, when it has one, is the site's name to start with; back to «an online store», its steps are the store's", async () => {
    m.settings.mockResolvedValue({ siteName: "Sanabel", header: { identity: { name: { ar: "السنابل", en: "Sanabel" } } }, logoUrl: null });
    start();
    await screen.findByTestId("setup-shop-ready");
    next();
    await screen.findByTestId("setup-kind");
    fireEvent.click(screen.getByTestId("setup-kind-site-bakery-cafe"));
    next();
    expect(((await screen.findByTestId("sites-biz-name")) as HTMLInputElement).value).toBe("Sanabel");
    expect(screen.getByTestId("setup-next")).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(await screen.findByTestId("setup-kind-store"));
    next();
    expect(await screen.findByTestId("setup-pack-fashion")).toBeInTheDocument();
  });
});
