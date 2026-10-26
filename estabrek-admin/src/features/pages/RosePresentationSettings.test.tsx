import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RosePresentationSettings } from "./RosePresentationSettings";
afterEach(cleanup);
it("changes a section palette while retaining authored content and other presentation settings", () => {
  const value = { title: "حملة", components: [{ kind: "text" }], rosePresentation: { motionIntensity: "subtle" } };
  const onChange = vi.fn();
  render(<RosePresentationSettings value={value} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("لوحة ألوان القسم"), { target: { value: "lilac" } });
  expect(onChange).toHaveBeenCalledWith({ ...value, rosePresentation: { ...value.rosePresentation, palette: "lilac" } });
});
