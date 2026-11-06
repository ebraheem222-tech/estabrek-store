import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModelFile } from "./ModelFile";
import { listModels, uploadModel, type Model3d } from "../../api/models3d.api";
import { setLangForTests } from "../../lib/lang";
import type { StageGlb } from "../../studio/storeThemes";

vi.mock("../../api/models3d.api", () => ({ listModels: vi.fn(), uploadModel: vi.fn() }));

const model: Model3d = { id: "chair", displayName: "Chair", url: "https://cdn.example.com/chair.glb", size: 1024, provider: "LOCAL", createdAt: "2026-11-07T00:00:00.000Z" };
const glb = { url: "https://cdn.example.com/old.glb", name: "Old model", clip: "Idle" };
beforeEach(() => { setLangForTests("en"); });
afterEach(() => { cleanup(); vi.resetAllMocks(); setLangForTests("ar"); });

function setup(maxBytes = 25 * 1024 * 1024) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const library = { items: [model], maxBytes, cloudinary: false };
  client.setQueryData(["models3d"], library);
  vi.mocked(listModels).mockResolvedValue(library);
  const onChange = vi.fn();
  const panel = (change: (value: StageGlb | undefined) => void = onChange, busy = false) => <QueryClientProvider client={client}><ModelFile glb={glb} info={{ url: glb.url, clips: ["Idle", "Spin"] }} busy={busy} onChange={change} /></QueryClientProvider>;
  return { ...render(panel()), onChange, panel };
}

function choose(name = "chair.glb", content = "model") {
  fireEvent.change(screen.getByTestId("scene-glb-file"), { target: { files: [new File([content], name)] } });
}

describe("GLB file uploads", () => {
  it("locks replacement, removal and animation changes until the upload finishes", async () => {
    let finish!: (value: Model3d) => void;
    vi.mocked(uploadModel).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { onChange } = setup();
    choose();
    expect(screen.getByTestId("scene-glb-upload")).toBeDisabled();
    expect(screen.getByTestId("scene-glb-library")).toBeDisabled();
    expect(screen.getByTestId("scene-glb-remove")).toBeDisabled();
    expect(screen.getByTestId("scene-glb-clip")).toBeDisabled();
    fireEvent.change(screen.getByTestId("scene-glb-library"), { target: { value: model.url } });
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => { finish(model); });
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ url: model.url, name: "Chair" });
    expect(screen.getByTestId("scene-glb-upload")).toBeEnabled();
  });

  it("rejects unsupported files and files above the advertised limit before upload", () => {
    const { onChange } = setup(4);
    choose("chair.obj");
    expect(screen.getByRole("alert")).toHaveTextContent("The file must be a .glb");
    choose();
    expect(screen.getByRole("alert")).toHaveTextContent("The file is bigger than");
    expect(uploadModel).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps an upload error visible and lets the same file be retried", async () => {
    vi.mocked(uploadModel).mockRejectedValueOnce(new Error("Upload failed")).mockResolvedValueOnce(model);
    const { onChange } = setup();
    choose();
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload failed");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("scene-glb-upload")).toBeEnabled();
    choose();
    await waitFor(() => expect(onChange).toHaveBeenCalledExactlyOnceWith({ url: model.url, name: "Chair" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses the current draft callback if props change during an upload", async () => {
    let finish!: (value: Model3d) => void;
    vi.mocked(uploadModel).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { panel, rerender, onChange } = setup();
    choose();
    const latest = vi.fn();
    rerender(panel(latest));
    await act(async () => { finish(model); });
    expect(onChange).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith({ url: model.url, name: "Chair" });
  });
});
