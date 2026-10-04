import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoseHeroSettings } from "./RoseHeroSettings";
vi.mock("../../components/media/MediaUrlInput", () => ({
  MediaUrlInput: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (url: string) => void;
  }) => (
    <input
      aria-label="صورة الحملة"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
afterEach(cleanup);
describe("Rose Hero CMS controls", () => {
  const value = {
    title: "استبرق",
    subtitle: "وصف محفوظ",
    primaryButton: { label: "تسوق", href: "/shop" },
  };
  it("edits the campaign title without losing existing CMS data", () => {
    const onChange = vi.fn();
    render(<RoseHeroSettings value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/عنوان الحملة الوردية/), {
      target: { value: "أناقة تشبهكِ" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      roseTitle: "أناقة تشبهكِ",
    });
  });
  it("stores a selected campaign image", () => {
    const onChange = vi.fn();
    render(<RoseHeroSettings value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("صورة الحملة"), {
      target: { value: "/new-photo.webp" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      roseImageUrl: "/new-photo.webp",
    });
  });
  it("allows the administrator to disable the 3D fabric story", () => {
    const onChange = vi.fn();
    render(<RoseHeroSettings value={value} onChange={onChange} />);
    fireEvent.click(
      screen.getByRole("checkbox", { name: "إظهار تجربة الشال ثلاثي الأبعاد" }),
    );
    expect(onChange).toHaveBeenCalledWith({ ...value, rose3dEnabled: false });
  });
});
