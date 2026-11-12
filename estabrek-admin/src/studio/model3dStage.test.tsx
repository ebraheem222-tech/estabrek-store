import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Model3dPanel } from "./Model3dPanel";
import { MODEL3D_LOOKS, lookOf3d, withLook } from "./model3dLooks";
import type { PageTreeNode } from "../api/pages.api";

vi.mock("../components/media/MediaLibraryModal", () => ({ MediaLibraryModal: () => null }));
vi.mock("../api/models3d.api", () => ({ listModels: vi.fn(), uploadModel: vi.fn() }));
afterEach(cleanup);

const show = (props: Record<string, unknown>, onOps = vi.fn()) => {
  const client = new QueryClient();
  client.setQueryData(["store-themes", "full"], { models: [] });
  const node = { id: "model", type: "model3d", props } as PageTreeNode;
  const view = render(<QueryClientProvider client={client}><Model3dPanel node={node} lang="en" busy={false} onOps={onOps} /></QueryClientProvider>);
  return { onOps, view, again: (next: Record<string, unknown>) => view.rerender(<QueryClientProvider client={client}><Model3dPanel node={{ ...node, props: next } as PageTreeNode} lang="en" busy={false} onOps={onOps} /></QueryClientProvider>) };
};
const last = (onOps: ReturnType<typeof vi.fn>) => onOps.mock.lastCall![1][0].props;

test("a 3D model's stage: what's behind it, its way in, a stand, and turning back; the rest of it kept", () => {
  const { onOps, again } = show({ model: "watch", finish: "gold", drag: true });
  fireEvent.click(screen.getByTestId("model3d-backdrop").querySelector('[data-value="spot"]')!);
  expect(last(onOps)).toMatchObject({ model: "watch", finish: "gold", backdrop: { kind: "spot" } });
  again({ model: "watch", finish: "gold", drag: true, backdrop: { kind: "spot" } });
  expect(screen.getByTestId("model3d-backdrop-colour")).toBeTruthy();
  fireEvent.click(screen.getByTestId("model3d-back"));
  expect(last(onOps)).toMatchObject({ back: true, backdrop: { kind: "spot" } });
});

test("the new stages set a stand or a ring of light, a backdrop, a way in and sparkles in one click", () => {
  const stand = MODEL3D_LOOKS.find((l) => l.key === "stand")!;
  const jewel = MODEL3D_LOOKS.find((l) => l.key === "jewel")!;
  const props = { model: "ring", finish: "gold", sparkles: { count: 80 }, intro: "drop", back: true };
  const out = withLook(props, stand);
  expect(out).toMatchObject({ model: "ring", finish: "gold", floor: "pedestal", backdrop: { kind: "glow" }, intro: "pop" });
  // What the look doesn't set goes back to its default.
  expect(out.sparkles).toBeUndefined();
  expect(out.back).toBeUndefined();
  expect(lookOf3d(out)).toBe("stand");
  expect(withLook(out, jewel)).toMatchObject({ floor: "halo", sparkles: { count: 40 }, backdrop: { kind: "sunrise" } });
  const { onOps } = show({ model: "ring" });
  fireEvent.click(screen.getByTestId("model3d-looks").querySelector('[data-look="jewel"]')!);
  expect(last(onOps)).toMatchObject({ model: "ring", floor: "halo", sparkles: { count: 40 } });
});
