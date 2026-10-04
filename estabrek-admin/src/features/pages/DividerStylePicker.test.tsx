import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DividerStylePicker } from "./DividerStylePicker";

describe("DividerStylePicker", () => {
  const styles = [
    {
      id: "divider-a",
      name: "Alpha",
      nameAr: "ألفا",
      category: "simple",
      className: "w-full h-px bg-gray-300",
    },
    {
      id: "divider-b",
      name: "Beta",
      nameAr: "بيتا",
      category: "modern",
      className: "w-24 h-1 bg-blue-500 mx-auto rounded-full",
    },
  ];

  it("selects a divider and can clear selection", async () => {
    const onChange = vi.fn();

    render(
      <DividerStylePicker
        value="divider-a"
        onChange={onChange}
        styles={styles as any}
        categoryLabels={{ simple: "Simple", modern: "Modern" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /بيتا/i }));
    expect(onChange).toHaveBeenCalledWith("divider-b");

    fireEvent.click(screen.getByRole("button", { name: /بدون/i }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
