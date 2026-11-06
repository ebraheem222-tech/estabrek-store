import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Model3dPanel } from "./Model3dPanel";
import { listModels, uploadModel, type Model3d } from "../api/models3d.api";
import { setLangForTests } from "../lib/lang";
import type { PageTreeNode } from "../api/pages.api";

vi.mock("../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: ({ open, onSelect }: { open: boolean; onSelect: (url: string) => void }) => open ? <button onClick={() => onSelect("/uploads/poster.webp")}>Choose model poster</button> : null }));
vi.mock("../api/models3d.api", () => ({ listModels: vi.fn(), uploadModel: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); setLangForTests("ar"); });

describe("3D model poster", () => {
  it("chooses and clears an optional fallback while preserving the GLB, pose and motion", () => {
    const client = new QueryClient();
    client.setQueryData(["store-themes", "full"], { models: [] });
    const onOps = vi.fn();
    const node = { id: "model", type: "model3d", props: { model: "sneaker", file: { url: "/uploads/product.glb" }, turn: { x: 10 }, anim: { type: "float" } } };
    const view = render(<QueryClientProvider client={client}><Model3dPanel node={node} lang="en" busy={false} onOps={onOps} /></QueryClientProvider>);
    fireEvent.click(screen.getByTestId("model3d-poster-choose"));
    fireEvent.click(screen.getByRole("button", { name: "Choose model poster" }));
    const props = onOps.mock.lastCall![1][0].props;
    expect(props).toEqual({ ...node.props, poster: "/uploads/poster.webp" });
    view.rerender(<QueryClientProvider client={client}><Model3dPanel node={{ ...node, props }} lang="en" busy={false} onOps={onOps} /></QueryClientProvider>);
    fireEvent.click(screen.getByTestId("model3d-poster-clear"));
    expect(onOps.mock.lastCall![1][0].props).toEqual({ ...node.props, poster: undefined });
  });

  it("accepts safe poster URLs and refuses unsafe schemes", () => {
    const client = new QueryClient();
    client.setQueryData(["store-themes", "full"], { models: [] });
    const onOps = vi.fn();
    render(<QueryClientProvider client={client}><Model3dPanel node={{ id: "model", type: "model3d", props: { model: "sneaker" } }} lang="en" busy={false} onOps={onOps} /></QueryClientProvider>);
    const field = screen.getByTestId("model3d-poster-url");
    fireEvent.change(field, { target: { value: "javascript:alert(1)" } });
    fireEvent.blur(field);
    expect(onOps).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: "https://cdn.example.com/product.webp" } });
    fireEvent.blur(field);
    expect(onOps.mock.lastCall![1][0]).toMatchObject({ op: "setProps", nodeId: "model", props: { model: "sneaker", poster: "https://cdn.example.com/product.webp" } });
  });
});

describe("3D model file picker", () => {
  const stored: Model3d = { id: "chair", displayName: "Chair", url: "https://cdn.example.com/chair.glb", size: 1024, provider: "LOCAL", createdAt: "2026-11-07T00:00:00.000Z" };
  function setup(node: PageTreeNode = { id: "model", type: "model3d", props: { model: "sneaker", turn: { x: 10 }, anim: { type: "float" } } }) {
    setLangForTests("en");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["store-themes", "full"], { models: [{ kind: "sneaker", label: { en: "Sneaker", ar: "حذاء", he: "נעל" } }] });
    client.setQueryData(["models3d"], { items: [stored], maxBytes: 25 * 1024 * 1024, cloudinary: false });
    vi.mocked(listModels).mockResolvedValue({ items: [stored], maxBytes: 25 * 1024 * 1024, cloudinary: false });
    const onOps = vi.fn();
    const panel = (current = node, busy = false) => <QueryClientProvider client={client}><Model3dPanel node={current} lang="en" busy={busy} onOps={onOps} /></QueryClientProvider>;
    return { ...render(panel()), node, panel, onOps };
  }

  it("offers GLB upload directly and applies the uploaded URL without losing pose or motion", async () => {
    const { node, onOps } = setup();
    vi.mocked(uploadModel).mockResolvedValue(stored);
    fireEvent.click(screen.getByTestId("model3d-file-open"));
    expect(screen.getByRole("tab", { name: "Your .glb files" })).toHaveAttribute("aria-selected", "true");
    fireEvent.change(screen.getByTestId("scene-glb-file"), { target: { files: [new File(["model"], "chair.glb")] } });
    await waitFor(() => expect(onOps).toHaveBeenCalled());
    expect(onOps.mock.lastCall![1]).toEqual([{ op: "setProps", nodeId: "model", props: { ...node.props, file: { url: "https://cdn.example.com/chair.glb", name: "Chair" } } }]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reopens on the current model's source after selection or draft changes", () => {
    const { node, panel, rerender } = setup();
    fireEvent.click(screen.getByTestId("model3d-swap-open"));
    fireEvent.keyDown(window, { key: "Escape" });
    rerender(panel({ ...node, id: "file-model", props: { ...node.props, file: { url: stored.url, name: "Chair" } } }));
    fireEvent.click(screen.getByTestId("model3d-swap-open"));
    expect(screen.getByRole("tab", { name: "Your .glb files" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(window, { key: "Escape" });
    rerender(panel(node));
    fireEvent.click(screen.getByTestId("model3d-swap-open"));
    expect(screen.getByRole("tab", { name: "Built-in models" })).toHaveAttribute("aria-selected", "true");
  });

  it("honours an editor save that starts while the file picker is open", () => {
    const { panel, rerender, onOps } = setup();
    fireEvent.click(screen.getByTestId("model3d-swap-open"));
    fireEvent.click(screen.getByRole("tab", { name: "Your .glb files" }));
    rerender(panel(undefined, true));
    expect(screen.getByTestId("scene-glb-upload")).toBeDisabled();
    expect(screen.getByTestId("scene-glb-library")).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Built-in models" })).toBeDisabled();
    fireEvent.change(screen.getByTestId("scene-glb-library"), { target: { value: stored.url } });
    expect(onOps).not.toHaveBeenCalled();
  });

  it("cancels an abandoned upload when selecting another model and never applies its result", async () => {
    const { node, panel, rerender, onOps } = setup();
    let finish!: (model: Model3d) => void;
    let signal: AbortSignal | undefined;
    vi.mocked(uploadModel).mockImplementation((_file, opts) => {
      signal = opts?.signal;
      return new Promise((resolve) => { finish = resolve; });
    });
    fireEvent.click(screen.getByTestId("model3d-swap-open"));
    fireEvent.click(screen.getByRole("tab", { name: "Your .glb files" }));
    fireEvent.change(screen.getByTestId("scene-glb-file"), { target: { files: [new File(["model"], "chair.glb")] } });
    rerender(panel({ ...node, id: "another-model" }));
    expect(signal?.aborted).toBe(true);
    await act(async () => { finish(stored); });
    expect(onOps).not.toHaveBeenCalled();
  });
});
