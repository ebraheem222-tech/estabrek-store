// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ElementPanel } from "./StudioTreePanels";
import type { PageTreeNode } from "../api/pages.api";

afterEach(cleanup);
test("slider controls update saved options and localized slide content without dropping existing languages", () => {
  const initial: PageTreeNode = { id: "slider", type: "slider", props: { slides: [{ src: "/merchant.svg", kind: "image", title: { ar: "عنوان" }, text: { he: "תיאור" }, cta: { ar: "اكتشف" } }] } };
  let saved = initial;
  function Harness() {
    const [node, setNode] = useState(initial);
    return <ElementPanel node={node} lang="en" busy={false} onOps={(_label, ops) => { const op = ops[0]; if (op.op === "setProps") { saved = { ...node, props: op.props }; setNode(saved); } }} />;
  }
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}><Harness /></QueryClientProvider>);
  expect(screen.queryByTestId("studio-slider-effect")).not.toBeNull();
  fireEvent.change(screen.getByTestId("studio-slider-effect"), { target: { value: "coverflow" } });
  fireEvent.change(screen.getByTestId("studio-slider-zoom"), { target: { value: "1.3" } });
  for (const [key, value] of [["effect", "slices"], ["axis", "y"], ["captionPosition", "split"]]) fireEvent.change(screen.getByTestId(`studio-slider-${key}`), { target: { value } });
  const duration = screen.getByTestId("studio-slider-duration");
  fireEvent.change(duration, { target: { value: "1.2" } }); fireEvent.blur(duration);
  fireEvent.click(screen.getByTestId("studio-slider-thumbnails"));
  fireEvent.click(screen.getByTestId("studio-slider-progress"));
  for (const [key, value] of [["title", "Fresh collection"], ["text", "Merchant description"], ["cta", "Explore"]]) { const field = screen.getByTestId(`studio-slide-${key}`); fireEvent.change(field, { target: { value } }); fireEvent.blur(field); }
  expect(saved.props).toMatchObject({ effect: "slices", axis: "y", captionPosition: "split", duration: 1.2, zoom: 1.3, thumbnails: true, progress: true, slides: [{ src: "/merchant.svg", title: { ar: "عنوان", en: "Fresh collection" }, text: { he: "תיאור", en: "Merchant description" }, cta: { ar: "اكتشف", en: "Explore" } }] });
  expect(initial.props).not.toHaveProperty("effect");
});
