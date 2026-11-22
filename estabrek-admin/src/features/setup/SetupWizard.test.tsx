import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SetupWizard from "./SetupWizard";

const m = vi.hoisted(() => ({ status: vi.fn(), settings: vi.fn(), apply: vi.fn(), pages: vi.fn(), imported: vi.fn(), templates: vi.fn(), cloud: vi.fn(), cloudSave: vi.fn(), shop: vi.fn(), opens: vi.fn(), install: vi.fn(), save: vi.fn(), home: vi.fn(), publish: vi.fn() }));
vi.mock("../../api/shop.api", () => ({ getShopLink: m.shop, makeShopLink: vi.fn(), followShop: vi.fn(), shopOpensHere: m.opens }));
vi.mock("../../api/setup.api", () => ({ SETUP_LATER_KEY: "setup-later", getSetupStatus: m.status, applySetup: m.apply }));
vi.mock("../../api/settings.api", () => ({ getSettings: m.settings }));
vi.mock("../../api/pages.api", () => ({ listPages: m.pages, updatePage: m.publish }));
vi.mock("../../api/myFeatures.api", () => ({ installTemplate: m.install, saveFeature: m.save, makeSiteHome: m.home }));
vi.mock("../../api/storeTemplates.api", () => ({ getStoreTemplateImport: m.imported, getStoreTemplates: m.templates }));
vi.mock("../../api/http", () => ({ getApiErrorMessage: (e: Error) => e.message }));
vi.mock("../../studio/storeThemes", () => ({ shopOrigin: () => "https://shop.example.com" }));
vi.mock("../../components/media/MediaUrlInput", () => ({ MediaUrlInput: () => null }));
vi.mock("../../api/cloudinary.api", () => ({ getCloudinaryAccount: m.cloud, saveCloudinaryAccount: m.cloudSave, removeCloudinaryAccount: vi.fn() }));
vi.mock("./StoreTemplatePicker", () => ({ StoreTemplatePicker: ({ onPick, onMotionOptions, selected }: { onPick: (t: unknown) => void; onMotionOptions: (options: unknown) => void; selected?: {id:string} | null }) => <><span data-testid="setup-picked-id">{selected?.id}</span><button type="button" onClick={() => onPick({ id: "fashion-quiet", theme: "tpl-fashion-quiet", mode: "light", name: { ar: "قالب تجريبي", en: "Test template", he: "תבנית" } })}>Pick template</button><button type="button" onClick={() => onMotionOptions({ engine: "anime", preset: "calm" })}>Choose calm Anime.js</button></> }));

const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [] }] } };
beforeEach(() => {
  vi.clearAllMocks();
  m.status.mockResolvedValue({ needed: true, owner: true, hasHome: false, counts: {}, mainLanguage: "ar" });
  m.settings.mockResolvedValue({ siteName: "My Store", header: {}, logoUrl: null });
  m.pages.mockResolvedValue([{ id: "home-id", slug: "/" }]);
  m.apply.mockResolvedValue({ made: { categories: 1, types: 1, pages: 1, menuItems: 1 }, kept: {} });
  m.cloud.mockResolvedValue({ source: "none", cloudName: null, apiKeyEnd: null, savedAt: null });
  m.shop.mockResolvedValue({ url: "https://shop.example.com", source: "server", making: null, repo: "acme/store", branch: "main" });
  m.opens.mockResolvedValue(true);
  m.imported.mockResolvedValue({ tree, design: { templateId: "fashion-quiet", theme: { id: "tpl-fashion-quiet", name: {}, family: "fashion", mode: "light", palettes: {}, fonts: {} }, header: tree, footer: tree } });
});
afterEach(() => { cleanup(); });
const start = (entry = "/setup") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["settings"], { old: true });
  client.setQueryData(["pages", "home-id", "draft"], { old: true });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}><Routes><Route path="/setup" element={<SetupWizard />} /><Route path="/studio/:id" element={<div>Design editor opened</div>} /></Routes></MemoryRouter></QueryClientProvider>);
  return client;
};
test("the admin's templates shortcut opens the template step without applying a design", async () => {
  m.templates.mockResolvedValue({ templates: [], categories: [] });
  start("/setup?view=templates");
  expect(await screen.findByRole("button", { name: "Pick template" })).toBeInTheDocument();
  expect(screen.queryByTestId("setup-pack-fashion")).not.toBeInTheDocument();
  expect(m.apply).not.toHaveBeenCalled();
});
test("changing a design preserves the existing industry and audience without seeding inventory", async () => {
  m.settings.mockResolvedValue({ siteName: "متجري", header: { identity: { industry: "digital", audience: "men", name: { ar: "متجري" } } } });
  start("/setup?view=templates");
  fireEvent.click(await screen.findByRole("button", { name: "Pick template" }));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(screen.getByTestId("setup-apply"));
  await screen.findByText("Design editor opened");
  expect(m.apply.mock.calls[0][0]).toMatchObject({ industry: "digital", audience: "men", categories: [], types: [], menu: [] });
});
test("a design shortcut waits for the saved identity before advancing", async () => {
  m.settings.mockReturnValue(new Promise(() => {}));
  start("/setup?view=templates");
  fireEvent.click(await screen.findByRole("button", { name: "Pick template" }));
  expect(screen.getByTestId("setup-next")).toBeDisabled();
});
test("the exact reference selected in the editor is preselected without importing or applying it", async () => {
  m.templates.mockResolvedValue({categories:[],templates:[{id:"reference-neural-glass",mode:"dark",name:{ar:"نيورال",en:"Neural Glass",he:"ניורל"}}]});
  start("/setup?view=templates&template=reference-neural-glass");
  expect(await screen.findByText("reference-neural-glass")).toBeInTheDocument();
  expect(m.imported).not.toHaveBeenCalled();expect(m.apply).not.toHaveBeenCalled();
});
/** The first steps: the store's own shop, here one that opens to this admin, then «شو نوع موقعك؟» (a store). */
async function pastShop() {
  await screen.findByTestId("setup-shop-ready");
  fireEvent.click(screen.getByTestId("setup-next"));
  expect((await screen.findByTestId("setup-kind")).getAttribute("data-picked")).toBe("store");
  fireEvent.click(screen.getByTestId("setup-next"));
}
test("the store's own shop comes first; one that opens to this admin is said so, then what kind of site, then what it sells", async () => {
  start();
  expect((await screen.findByTestId("setup-shop-ready")).textContent).toContain("shop.example.com");
  expect(screen.getAllByRole("listitem")[0].textContent).toMatch(/1\. (Your shop|متجرك)/);
  fireEvent.click(screen.getByTestId("setup-next"));
  // An online store unless a whole site is picked.
  expect(await screen.findByTestId("setup-kind")).toBeInTheDocument();
  expect(screen.getByTestId("setup-kind-store").getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByTestId("setup-next"));
  expect(await screen.findByTestId("setup-pack-fashion")).toBeInTheDocument();
});
test("no going past the shop until it opens to this admin", async () => {
  m.opens.mockResolvedValue(false);
  start();
  await screen.findByTestId("setup-shop-form");
  expect(screen.getByTestId("setup-next")).toBeDisabled();
});
async function choose() {
  await pastShop();
  fireEvent.click(await screen.findByTestId("setup-pack-fashion"));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(screen.getByRole("button", { name: "Pick template" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose calm Anime.js" }));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.change(screen.getByTestId("setup-name-ar"), { target: { value: "متجر الورق" } });
  fireEvent.click(screen.getByTestId("setup-next"));
  // The assistant, then where the pictures go.
  await screen.findByTestId("setup-assistant");
  fireEvent.click(screen.getByTestId("setup-next"));
  await screen.findByTestId("setup-media");
  fireEvent.click(screen.getByTestId("setup-next"));
}
test("selecting a template creates a customer copy and opens the editor with fresh settings", async () => {
  const client = start();
  await choose();
  expect(screen.getByTestId("setup-include-home")).toBeDisabled();
  fireEvent.click(screen.getByTestId("setup-apply"));
  await screen.findByText("Design editor opened");
  expect(m.imported).toHaveBeenCalledWith("fashion-quiet", { engine: "anime", preset: "calm" });
  expect(m.apply.mock.calls[0][0].design.theme.id).toBe("store-design");
  expect(m.apply.mock.calls[0][0].design.theme.name.ar).toBe("متجر الورق");
  expect(client.getQueryState(["settings"])?.isInvalidated).toBe(true);
  expect(client.getQueryState(["pages", "home-id", "draft"])?.isInvalidated).toBe(true);
});
test("replacing an existing customer design requires the replacement checkbox", async () => {
  m.status.mockResolvedValue({ needed: false, owner: true, hasHome: false, hasDesign: true, counts: {}, mainLanguage: "ar" });
  start();
  await choose();
  expect(screen.getByTestId("setup-apply")).toBeDisabled();
  fireEvent.click(screen.getByTestId("setup-replace-home"));
  expect(screen.getByTestId("setup-apply")).toBeEnabled();
  expect(m.apply).not.toHaveBeenCalled();
});

test("the assistant: on as the personality that fits the store best, another picked, or off", async () => {
  start();
  await choose();
  fireEvent.click(screen.getByTestId("setup-apply"));
  await screen.findByText("Design editor opened");
  // A fashion store: the first personality that fits it.
  expect(m.apply.mock.calls[0][0].assistant).toEqual({ enabled: true, persona: "layla" });
});
test("another personality picked, or the assistant switched off, goes with the setup", async () => {
  start();
  await pastShop();
  fireEvent.click(await screen.findByTestId("setup-pack-fashion"));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(screen.getByRole("button", { name: "Pick template" }));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.change(screen.getByTestId("setup-name-ar"), { target: { value: "متجر الورق" } });
  fireEvent.click(screen.getByTestId("setup-next"));
  await screen.findByTestId("setup-assistant");
  // Those that fit the store come first, and say so.
  expect(screen.getByTestId("setup-persona-layla").getAttribute("data-fits")).toBe("true");
  fireEvent.click(screen.getByTestId("setup-persona-kareem"));
  expect(screen.getByTestId("setup-persona-picked").textContent).toMatch(/Kareem|كريم/);
  fireEvent.click(screen.getByTestId("setup-assistant-on"));
  expect(screen.queryByTestId("setup-persona")).toBeNull();
  fireEvent.click(screen.getByTestId("setup-next"));
  await screen.findByTestId("setup-media");
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(screen.getByTestId("setup-apply"));
  await screen.findByText("Design editor opened");
  expect(m.apply.mock.calls[0][0].assistant).toEqual({ enabled: false, persona: null });
});
test("pictures: the store's own Cloudinary account, tried and connected; one already connected is said so", async () => {
  m.cloudSave.mockResolvedValue({ source: "saved", cloudName: "rose-store", apiKeyEnd: "2345", savedAt: "2026-11-20T06:00:00Z" });
  start();
  await pastShop();
  fireEvent.click(await screen.findByTestId("setup-pack-fashion"));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(screen.getByRole("button", { name: "Pick template" }));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.change(screen.getByTestId("setup-name-ar"), { target: { value: "متجر الورق" } });
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(await screen.findByTestId("setup-next"));
  await screen.findByTestId("setup-media-form");
  expect(screen.getByTestId("setup-media-save")).toBeDisabled();
  fireEvent.change(screen.getByTestId("setup-media-cloud"), { target: { value: "rose-store" } });
  fireEvent.change(screen.getByTestId("setup-media-key"), { target: { value: "123456789012345" } });
  fireEvent.change(screen.getByTestId("setup-media-secret"), { target: { value: "made-up-secret-for-a-test-0001" } });
  fireEvent.click(screen.getByTestId("setup-media-save"));
  expect((await screen.findByTestId("setup-media-connected")).textContent).toContain("rose-store");
  expect(m.cloudSave).toHaveBeenCalledWith({ cloudName: "rose-store", apiKey: "123456789012345", apiSecret: "made-up-secret-for-a-test-0001" });
  expect(screen.getByTestId("setup-media-connected").textContent).toContain("2345");
});
// The keys typed and «التالي» pressed (not «جرّب ووصّل»): they used to be dropped, the owner thinking them kept.
async function toPictures() {
  start();
  await pastShop();
  fireEvent.click(await screen.findByTestId("setup-pack-fashion"));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(screen.getByRole("button", { name: "Pick template" }));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.change(screen.getByTestId("setup-name-ar"), { target: { value: "متجر الورق" } });
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(await screen.findByTestId("setup-next"));
  await screen.findByTestId("setup-media-form");
}
test("pictures: keys typed and «التالي» pressed are kept first; the setup goes on", async () => {
  m.cloudSave.mockResolvedValue({ source: "saved", cloudName: "rose-store", apiKeyEnd: "2345", savedAt: "2026-11-21T00:00:00Z" });
  await toPictures();
  fireEvent.change(screen.getByTestId("setup-media-cloud"), { target: { value: "rose-store" } });
  fireEvent.change(screen.getByTestId("setup-media-key"), { target: { value: "123456789012345" } });
  fireEvent.change(screen.getByTestId("setup-media-secret"), { target: { value: "made-up-secret-for-a-test-0001" } });
  fireEvent.click(screen.getByTestId("setup-next"));
  await waitFor(() => expect(m.cloudSave).toHaveBeenCalledWith({ cloudName: "rose-store", apiKey: "123456789012345", apiSecret: "made-up-secret-for-a-test-0001" }));
  await waitFor(() => expect(screen.queryByTestId("setup-media")).not.toBeInTheDocument());
});
test("pictures: keys Cloudinary refuses, or only some of them, keep the setup on the step with the reason; none typed, it goes on", async () => {
  m.cloudSave.mockRejectedValue(new Error("Cloudinary said no"));
  await toPictures();
  fireEvent.change(screen.getByTestId("setup-media-cloud"), { target: { value: "rose-store" } });
  fireEvent.click(screen.getByTestId("setup-next"));
  expect(await screen.findByTestId("setup-media-failed")).toBeInTheDocument();
  expect(m.cloudSave).not.toHaveBeenCalled();
  fireEvent.change(screen.getByTestId("setup-media-key"), { target: { value: "123456789012345" } });
  fireEvent.change(screen.getByTestId("setup-media-secret"), { target: { value: "made-up-secret-for-a-test-0001" } });
  fireEvent.click(screen.getByTestId("setup-next"));
  await waitFor(() => expect(m.cloudSave).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId("setup-media")).toBeInTheDocument();
  // Emptied: skipped.
  for (const id of ["setup-media-cloud", "setup-media-key", "setup-media-secret"]) fireEvent.change(screen.getByTestId(id), { target: { value: "" } });
  fireEvent.click(screen.getByTestId("setup-next"));
  await waitFor(() => expect(screen.queryByTestId("setup-media")).not.toBeInTheDocument());
});
test("changing only the design skips the assistant and the pictures", async () => {
  m.settings.mockResolvedValue({ siteName: "متجري", header: { identity: { industry: "digital", audience: "men", name: { ar: "متجري" } } } });
  start("/setup?view=templates");
  fireEvent.click(await screen.findByRole("button", { name: "Pick template" }));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(screen.getByTestId("setup-next"));
  expect(screen.queryByTestId("setup-assistant")).toBeNull();
  fireEvent.click(screen.getByTestId("setup-apply"));
  await screen.findByText("Design editor opened");
  expect(m.apply.mock.calls[0][0].assistant).toBeUndefined();
});
