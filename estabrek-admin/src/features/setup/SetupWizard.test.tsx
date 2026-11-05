import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SetupWizard from "./SetupWizard";

const m = vi.hoisted(() => ({ status: vi.fn(), settings: vi.fn(), apply: vi.fn(), pages: vi.fn(), imported: vi.fn(), templates: vi.fn() }));
vi.mock("../../api/setup.api", () => ({ SETUP_LATER_KEY: "setup-later", getSetupStatus: m.status, applySetup: m.apply }));
vi.mock("../../api/settings.api", () => ({ getSettings: m.settings }));
vi.mock("../../api/pages.api", () => ({ listPages: m.pages }));
vi.mock("../../api/storeTemplates.api", () => ({ getStoreTemplateImport: m.imported, getStoreTemplates: m.templates }));
vi.mock("../../api/http", () => ({ getApiErrorMessage: (e: Error) => e.message }));
vi.mock("../../studio/storeThemes", () => ({ shopOrigin: () => "https://shop.example.com" }));
vi.mock("../../components/media/MediaUrlInput", () => ({ MediaUrlInput: () => null }));
vi.mock("./StoreTemplatePicker", () => ({ StoreTemplatePicker: ({ onPick, onMotionOptions, selected }: { onPick: (t: unknown) => void; onMotionOptions: (options: unknown) => void; selected?: {id:string} | null }) => <><span data-testid="setup-picked-id">{selected?.id}</span><button type="button" onClick={() => onPick({ id: "fashion-quiet", theme: "tpl-fashion-quiet", mode: "light", name: { ar: "قالب تجريبي", en: "Test template", he: "תבנית" } })}>Pick template</button><button type="button" onClick={() => onMotionOptions({ engine: "anime", preset: "calm" })}>Choose calm Anime.js</button></> }));

const tree = { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "s", type: "section", props: {}, children: [] }] } };
beforeEach(() => {
  vi.clearAllMocks();
  m.status.mockResolvedValue({ needed: true, owner: true, hasHome: false, counts: {}, mainLanguage: "ar" });
  m.settings.mockResolvedValue({ siteName: "My Store", header: {}, logoUrl: null });
  m.pages.mockResolvedValue([{ id: "home-id", slug: "/" }]);
  m.apply.mockResolvedValue({ made: { categories: 1, types: 1, pages: 1, menuItems: 1 }, kept: {} });
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
async function choose() {
  fireEvent.click(await screen.findByTestId("setup-pack-fashion"));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.click(screen.getByRole("button", { name: "Pick template" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose calm Anime.js" }));
  fireEvent.click(screen.getByTestId("setup-next"));
  fireEvent.change(screen.getByTestId("setup-name-ar"), { target: { value: "متجر الورق" } });
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
