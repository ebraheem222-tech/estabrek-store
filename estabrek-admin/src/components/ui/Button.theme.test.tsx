import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getButtonTheme } from "../../cms/button-themes";
import { Button } from "./Button";

describe("Button theme overrides", () => {
  it("applies custom css vars when themeId is provided", () => {
    const themeId = "btn-rose-luxury";
    const theme = getButtonTheme(themeId);
    expect(theme).toBeDefined();

    render(
      <Button themeId={themeId} variant="primary">
        شراء
      </Button>
    );

    const button = screen.getByRole("button", { name: "شراء" }) as HTMLButtonElement;
    expect(button.style.getPropertyValue("--btn-solid-bg")).toBe(theme?.tokens.solidBg);
    expect(button.style.getPropertyValue("--btn-accent-to")).toBe(theme?.tokens.accentTo);
  });
});

