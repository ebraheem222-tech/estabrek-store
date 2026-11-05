import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MODEL_INFO, MODEL_KINDS, MODEL_KNOBS } from "../../../estabrek-storefront/src/storeThemes/three/kinds";
import { Model3dPanel } from "./Model3dPanel";

afterEach(cleanup);

it("selects the lantern from the shared registry and edits its shape and paper colour without losing stage settings", () => {
  const client = new QueryClient();
  client.setQueryData(["store-themes", "full"], { models: MODEL_KINDS.map(kind => ({ kind, label: MODEL_INFO[kind].label, knobs: MODEL_KNOBS[kind] })) });
  const onOps = vi.fn();
  const node = { id: "model", type: "model3d", props: { model: "sneaker", poster: "/templates/home/paper.svg", finish: "matte", knobs: { width: 0.9 }, colours: { glow: "#ffbb66" }, lights: { preset: "warm" }, anim: { type: "swing", trigger: "hover" }, camera: { fov: 30 }, drag: true } };
  const panel = (current: typeof node) => <QueryClientProvider client={client}><Model3dPanel node={current} lang="en" busy={false} onOps={onOps} /></QueryClientProvider>;
  const view = render(panel(node));
  fireEvent.click(screen.getByTestId("model3d-swap-open"));
  fireEvent.change(screen.getByTestId("model3d-find"), { target: { value: "lantern" } });
  fireEvent.click(screen.getByRole("button", { name: /lantern/i }));
  const props = onOps.mock.lastCall![1][0].props;
  expect(props).toEqual({ ...node.props, model: "lantern", file: undefined });
  view.rerender(panel({ ...node, props }));
  expect(screen.getByTestId("model3d-now")).toHaveTextContent("Lanterns");
  expect(screen.getByTestId("model3d-knob-ribs")).toHaveAttribute("min", "6");
  expect(screen.getByTestId("model3d-knob-ribs")).toHaveAttribute("max", "16");
  const height = screen.getByTestId("model3d-knob-height");
  fireEvent.change(height, { target: { value: "1.2" } });
  fireEvent.blur(height);
  expect(onOps.mock.lastCall![1][0].props).toEqual({ ...props, knobs: { width: 0.9, height: 1.2 } });
  fireEvent.change(screen.getByTestId("model3d-colour-screen"), { target: { value: "accent" } });
  expect(onOps.mock.lastCall![1][0].props).toEqual({ ...props, colours: { glow: "#ffbb66", screen: "accent" } });
  client.clear();
});
