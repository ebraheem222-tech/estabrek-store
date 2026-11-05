import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Model3dPanel } from "./Model3dPanel";

vi.mock("../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: ({ open, onSelect }: { open: boolean; onSelect: (url: string) => void }) => open ? <button onClick={() => onSelect("/uploads/poster.webp")}>Choose model poster</button> : null }));
afterEach(cleanup);

describe("3D model poster", () => {
  it("chooses and clears an optional fallback while preserving the GLB, pose and motion", () => {
    const client = new QueryClient();
    client.setQueryData(["store-themes", "full"], { models: [] });
    const onOps = vi.fn();
    const node = { id: "model", type: "model3d", props: { model: "sneaker", file: { src: "/uploads/product.glb" }, turn: { x: 10 }, anim: { type: "float" } } };
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
