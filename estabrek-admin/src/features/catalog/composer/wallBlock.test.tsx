import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { ProductDeep } from "../../../api/catalog.api";
import { draftForEdit, emptyDraft, wallForSave, type ComposerDraft } from "./composerModel";
import { WallBlock } from "./WallBlock";

// «شوفها على حيطك» in the product composer: a piece for a wall, its real size and frame, saved with the product.
afterEach(cleanup);

function Page({ start, sizeNames = [] }: { start: ComposerDraft; sizeNames?: string[] }) {
  const [draft, setDraft] = useState(start);
  return <><WallBlock draft={draft} update={(fn) => setDraft(fn)} step={6} sizeNames={sizeNames} /><output data-testid="saved">{JSON.stringify(wallForSave(draft))}</output></>;
}
const saved = () => JSON.parse(screen.getByTestId("saved").textContent!);

describe("a piece for a wall", () => {
  it("off by default; switched on it starts at 50 × 70, and its size and frame are the owner's", () => {
    render(<Page start={emptyDraft()} />);
    expect(saved()).toEqual({ wallWidthCm: null, wallHeightCm: null, wallFrame: null });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(saved()).toEqual({ wallWidthCm: 50, wallHeightCm: 70, wallFrame: "none" });
    fireEvent.change(screen.getByTestId("composer-wall-w"), { target: { value: "60" } });
    fireEvent.change(screen.getByTestId("composer-wall-h"), { target: { value: "90" } });
    fireEvent.change(screen.getByTestId("composer-wall-frame"), { target: { value: "gold" } });
    expect(saved()).toEqual({ wallWidthCm: 60, wallHeightCm: 90, wallFrame: "gold" });
    // A size no wall takes: said, and not saved.
    fireEvent.change(screen.getByTestId("composer-wall-w"), { target: { value: "900" } });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(saved().wallWidthCm).toBeNull();
    // Switched off: nothing.
    fireEvent.click(screen.getByRole("checkbox"));
    expect(saved()).toEqual({ wallWidthCm: null, wallHeightCm: null, wallFrame: null });
  });

  it("names the sizes that hang at their own size", () => {
    render(<Page start={emptyDraft({ wall: { on: true, w: "50", h: "70", frame: "black" } })} sizeNames={["50×70", "M", "A3"]} />);
    expect(screen.getByTestId("composer-wall-sizes").textContent).toMatch(/50×70.+A3/);
    expect(screen.getByTestId("composer-wall-sizes").textContent).not.toMatch(/\bM\b/);
  });

  it("a saved product's wall size comes back for editing", () => {
    const product = { id: "cprod000001", title: "Poster", slug: "poster", isActive: true, categoryId: "ccat0000001", description: null, wallWidthCm: 42, wallHeightCm: 59.4, wallFrame: "white", items: [] } as unknown as ProductDeep;
    expect(draftForEdit(product).wall).toEqual({ on: true, w: "42", h: "59.4", frame: "white" });
    expect(draftForEdit({ ...product, wallWidthCm: null } as unknown as ProductDeep).wall?.on).toBe(false);
  });
});
