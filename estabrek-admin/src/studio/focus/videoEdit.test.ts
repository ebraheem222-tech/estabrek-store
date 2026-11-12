import { expect, test } from "vitest";
import { clipAt, clipStarts, moveClip, outputSize, projectLength, safeProject, splitAt, type Project } from "../../../../shared/videoEdit";

const project: Project = {
  clips: [
    { id: "a", src: "https://res.cloudinary.com/x/video/upload/a.mp4", in: 2, out: 8 },
    { id: "b", src: "https://res.cloudinary.com/x/video/upload/b.mp4", in: 0, out: 4, speed: 2 },
  ],
};

test("the finished video's length and where each clip starts, sped-up clips taking less", () => {
  expect(projectLength(project)).toBe(8);
  expect(clipStarts(project)).toEqual([0, 6]);
  expect(clipAt(project, 3)).toEqual({ index: 0, local: 5 });
  // One second into the second clip, played twice as fast: two seconds of its own video.
  expect(clipAt(project, 7)).toEqual({ index: 1, local: 2 });
  expect(clipAt(project, 99)).toEqual({ index: 1, local: 4 });
});

test("a clip is cut in two at the play head, and clips change places", () => {
  const cut = splitAt(project, 3, "a2");
  expect(cut.clips.map((c) => [c.id, c.in, c.out])).toEqual([["a", 2, 5], ["a2", 5, 8], ["b", 0, 4]]);
  expect(projectLength(cut)).toBe(8);
  // Too close to an end: nothing to cut.
  expect(splitAt(project, 0.05, "x")).toBe(project);
  expect(moveClip(project, 1, 0).clips.map((c) => c.id)).toEqual(["b", "a"]);
});

test("the frame's size for each shape; as filmed keeps the first clip's, even and not too big", () => {
  expect(outputSize("9:16")).toEqual({ w: 720, h: 1280 });
  expect(outputSize("1:1")).toEqual({ w: 1080, h: 1080 });
  expect(outputSize("original", { w: 3840, h: 2160 })).toEqual({ w: 1920, h: 1080 });
  expect(outputSize(undefined, null)).toEqual({ w: 1280, h: 720 });
});

test("a project is checked: bad clips, words and addresses drop out; empty or too long is refused", () => {
  const p = safeProject({
    clips: [...project.clips, { id: "bad id!", src: "/x.mp4", in: 0, out: 3 }, { id: "c", src: "javascript:x", in: 0, out: 3 }, { id: "d", src: "/v.mp4", in: 2, out: 2.05 }],
    words: [{ id: "w1", text: "  تخفيضات\u0007 الصيف  ", at: 1, dur: 2, place: "bottom", color: "#ffd700", box: true, size: 48 }, { id: "w2", text: "", at: 0, dur: 1 }],
    music: { src: "https://res.cloudinary.com/x/video/upload/m.mp3", volume: 0.4 },
    ratio: "9:16", mute: true, fade: true,
  })!;
  expect(p.clips.map((c) => c.id)).toEqual(["a", "b"]);
  expect(p.words).toEqual([{ id: "w1", text: "تخفيضات  الصيف", at: 1, dur: 2, place: "bottom", color: "#ffd700", box: true, size: 48 }]);
  expect(p).toMatchObject({ ratio: "9:16", mute: true, fade: true, music: { volume: 0.4 } });
  expect(safeProject({ clips: [] })).toBeNull();
  expect(safeProject({ clips: [{ id: "a", src: "/a.mp4", in: 0, out: 700 }] })).toBeNull();
});
