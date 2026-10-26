import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
import { useConfirm } from "./useConfirm";

describe("Confirm dialog", () => {
  it("«إلغاء» closes it when only onClose is given", () => {
    const onClose = vi.fn();
    render(<ConfirmDialog open title="حذف؟" message="متأكد؟" onConfirm={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "إلغاء" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("useConfirm answers yes or no from the page, not the browser", async () => {
    const answers: boolean[] = [];
    function Page() {
      const [confirm, dialog] = useConfirm();
      const [n, setN] = useState(0);
      return (
        <>
          <button onClick={async () => { answers.push(await confirm({ title: `سؤال ${n}`, message: "متأكد؟", confirmText: "نعم" })); setN((x) => x + 1); }}>اسأل</button>
          {dialog}
        </>
      );
    }
    const native = vi.spyOn(window, "confirm");
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "اسأل" }));
    fireEvent.click(await screen.findByRole("button", { name: "نعم" }));
    await waitFor(() => expect(answers).toEqual([true]));
    fireEvent.click(screen.getByRole("button", { name: "اسأل" }));
    fireEvent.click(await screen.findByRole("button", { name: "إلغاء" }));
    await waitFor(() => expect(answers).toEqual([true, false]));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(native).not.toHaveBeenCalled();
  });
});
