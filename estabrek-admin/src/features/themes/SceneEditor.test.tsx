import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SceneEditor, type SceneTool } from "./SceneEditor";
import { useStageDraft } from "./stageDraft";
import { uploadModel, type Model3d } from "../../api/models3d.api";
import { setLangForTests } from "../../lib/lang";
import type { StoreThemeInfo } from "../../studio/storeThemes";

vi.mock("../../api/models3d.api", () => ({ listModels: vi.fn(), uploadModel: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); setLangForTests("ar"); });

it("cancels the prior model's upload when scene selection changes and uploads to the new selection", async () => {
  setLangForTests("en");
  const client = new QueryClient();
  client.setQueryData(["models3d"], { items: [], maxBytes: 25 * 1024 * 1024, cloudinary: false });
  const words = { en: "Test stage", ar: "مشهد", he: "במה" };
  const theme: StoreThemeInfo = { id: "test-stage", name: words, blurb: words, family: "gaming", mode: "dark", modes: ["dark"], swatch: ["#000", "#111", "#f00"], hero: "stage", motion: "gentle", stage: { layout: "hero", models: ["sneaker", "phone"], games: [] } };
  function Editor() {
    const api = useStageDraft(() => ({ models: [{ kind: "sneaker", label: "Sneaker", href: "", look: {} }, { kind: "phone", label: "Phone", href: "", look: {} }], games: [], scene: {} }));
    const [index, setIndex] = useState(0);
    const [tool, setTool] = useState<SceneTool>({ mode: "translate", play: true, snap: false, lockScale: true, key: "start" });
    return <><SceneEditor theme={theme} models={[]} api={api} index={index} setIndex={setIndex} tool={tool} setTool={setTool} live onShowHome={() => {}} preview={null} setPreview={() => {}} glbInfo={{}} /><output data-testid="stage-draft">{JSON.stringify(api.draft.models)}</output></>;
  }
  const saved: Model3d = { id: "chair", displayName: "Chair", url: "https://cdn.example.com/chair.glb", size: 1024, provider: "LOCAL", createdAt: "2026-11-07T00:00:00.000Z" };
  const requests: Array<{ signal: AbortSignal | undefined; finish: (model: Model3d) => void }> = [];
  vi.mocked(uploadModel).mockImplementation((_file, opts) => new Promise((finish) => { requests.push({ signal: opts?.signal, finish }); }));
  render(<QueryClientProvider client={client}><Editor /></QueryClientProvider>);
  const choose = () => fireEvent.change(screen.getByTestId("scene-glb-file"), { target: { files: [new File(["model"], "chair.glb")] } });
  choose();
  fireEvent.click(screen.getByRole("button", { name: "Phone" }));
  expect(requests[0].signal?.aborted).toBe(true);
  await act(async () => { requests[0].finish(saved); });
  expect(JSON.parse(screen.getByTestId("stage-draft").textContent!)).toEqual([{ kind: "sneaker", label: "Sneaker", href: "", look: {} }, { kind: "phone", label: "Phone", href: "", look: {} }]);
  choose();
  await act(async () => { requests[1].finish(saved); });
  expect(JSON.parse(screen.getByTestId("stage-draft").textContent!)).toEqual([{ kind: "sneaker", label: "Sneaker", href: "", look: {} }, { kind: "phone", label: "Phone", href: "", look: {}, glb: { url: saved.url, name: "Chair" } }]);
});
