import { describe, expect, it } from "vitest";
import { fromLocalBox, inputOf, kindOf, moved, newSlide, reelState, slideId, toLocalBox, withWords } from "./storiesText";

describe("admin → القصص helpers", () => {
  it("a clip by its address, a picture otherwise; a new slide with a fresh id and a clip's cover", () => {
    expect(kindOf("https://res.cloudinary.com/x/video/upload/v1/a")).toBe("video");
    expect(kindOf("/uploads/clip.MP4?x=1")).toBe("video");
    expect(kindOf("/uploads/look.webp")).toBe("image");
    let n = 0;
    const seq = () => [0.111111, 0.111111, 0.222222][n++];
    const id = slideId([{ id: `s-${(0.111111).toString(36).slice(2, 8)}`, kind: "image", src: "/a.jpg" }], seq);
    expect(id).toBe(`s-${(0.222222).toString(36).slice(2, 8)}`);
    expect(newSlide("https://x.test/v.mp4", [], "https://x.test/p.jpg")).toMatchObject({ kind: "video", src: "https://x.test/v.mp4", poster: "https://x.test/p.jpg" });
    expect(newSlide("/a.jpg", [], "/p.jpg")).not.toHaveProperty("poster");
  });

  it("words with one language changed; an empty one taken out", () => {
    expect(withWords({ ar: "جديد", en: "New" }, "en", "")).toEqual({ ar: "جديد" });
    expect(withWords(undefined, "he", "חדש")).toEqual({ he: "חדש" });
  });

  it("the date boxes in this computer's time, and back", () => {
    const iso = new Date(2026, 10, 27, 9, 5).toISOString();
    expect(toLocalBox(iso)).toBe("2026-11-27T09:05");
    expect(fromLocalBox("2026-11-27T09:05")).toBe(iso);
    expect(fromLocalBox("")).toBeNull();
    expect(toLocalBox(null)).toBe("");
  });

  it("where a reel stands now, and a reel as it's sent", () => {
    const slide = { id: "s", kind: "image" as const, src: "/a.jpg" };
    const now = Date.parse("2026-11-28T12:00:00Z");
    expect(reelState({ isActive: true, startsAt: null, endsAt: null, slides: [] }, now)).toBe("empty");
    expect(reelState({ isActive: false, startsAt: null, endsAt: null, slides: [slide] }, now)).toBe("off");
    expect(reelState({ isActive: true, startsAt: "2026-12-01T00:00:00Z", endsAt: null, slides: [slide] }, now)).toBe("soon");
    expect(reelState({ isActive: true, startsAt: null, endsAt: "2026-11-27T00:00:00Z", slides: [slide] }, now)).toBe("over");
    expect(reelState({ isActive: true, startsAt: "2026-11-27T00:00:00Z", endsAt: "2026-11-30T00:00:00Z", slides: [slide] }, now)).toBe("live");
    const extra = { title: { ar: "x" }, cover: null, slides: [slide], isActive: true, startsAt: null, endsAt: null, views: 3 } as never;
    expect(inputOf(extra)).toEqual({ title: { ar: "x" }, cover: null, slides: [slide], isActive: true, startsAt: null, endsAt: null });
    expect(moved(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moved(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
});
