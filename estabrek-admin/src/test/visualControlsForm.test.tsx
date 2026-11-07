import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, test } from "vitest";
import { CardDesignFields, InteractionFields } from "../features/settings/VisualControlsForm";
function Form() {
  const [policy, setPolicy] = useState<any>(); const [card, setCard] = useState<any>();
  return <><CardDesignFields value={card} onChange={setCard} /><InteractionFields value={policy} onChange={setPolicy} targets={[{ id: "title", label: "Title" }]} /><output data-testid="value">{JSON.stringify({ policy, card })}</output></>;
}
test("card controls distinguish inherit, original and a customized design", () => {
  render(<Form />);
  fireEvent.change(screen.getByTestId("card-design-mode"), { target: { value: "custom" } });
  fireEvent.change(screen.getByTestId("card-swatchSize"), { target: { value: "36" } });
  fireEvent.blur(screen.getByTestId("card-swatchSize"));
  expect(JSON.parse(screen.getByTestId("value").textContent!).card.swatchSize).toBe(36);
  fireEvent.change(screen.getByTestId("card-design-mode"), { target: { value: "original" } });
  expect(JSON.parse(screen.getByTestId("value").textContent!).card).toBeNull();
  fireEvent.change(screen.getByTestId("card-design-mode"), { target: { value: "inherit" } });
  expect(JSON.parse(screen.getByTestId("value").textContent!)).not.toHaveProperty("card");
});
test("event controls save explicit disable and custom actions without changing other channels", () => {
  render(<Form />);
  fireEvent.change(screen.getByTestId("interaction-colorChange-mode"), { target: { value: "disabled" } });
  fireEvent.change(screen.getByTestId("interaction-cartAdded-mode"), { target: { value: "custom" } });
  fireEvent.click(screen.getByTestId("interaction-cartAdded-add"));
  const policy = JSON.parse(screen.getByTestId("value").textContent!).policy;
  expect(policy.bindings.colorChange).toEqual([]);
  expect(policy.bindings.cartAdded).toEqual([{ type: "theme", color: "#806080" }]);
  fireEvent.change(screen.getByTestId("interaction-colorChange-mode"), { target: { value: "inherit" } });
  expect(JSON.parse(screen.getByTestId("value").textContent!).policy.bindings).not.toHaveProperty("colorChange");
});
