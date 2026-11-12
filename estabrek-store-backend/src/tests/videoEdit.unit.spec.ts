import { describe, expect, test } from "vitest";
import { Project, cloudinaryChain, frameSize, videoPublicId } from "../lib/videoEdit.js";

const project = Project.parse({
  clips: [
    { id: "a", src: "https://res.cloudinary.com/shop/video/upload/v1/estabrek/videos/a.mp4", in: 2, out: 8 },
    { id: "b", src: "https://res.cloudinary.com/shop/video/upload/estabrek/videos/b.mp4", in: 0, out: 4, speed: 2, mute: true },
  ],
  words: [{ id: "w", text: "تخفيضات, 50/50", at: 1, dur: 3, place: "top", color: "#fc0", box: true }],
  music: { src: "https://res.cloudinary.com/shop/video/upload/estabrek/videos/m.mp3", volume: 0.4 },
  ratio: "9:16",
  fade: true,
});

describe("a video made in the editor, as Cloudinary's transformation", () => {
  test("clips are trimmed and joined at one size; the next clip's trim and speed are in its own step", () => {
    const chain = cloudinaryChain(project, ["estabrek/videos/a", "estabrek/videos/b"], frameSize("9:16", { w: null, h: null }), "estabrek/videos/m");
    const steps = chain.split("/");
    expect(steps[0]).toBe("so_2,eo_8,c_fill,g_center,h_1280,w_720");
    expect(steps[1]).toBe("so_0,eo_4,e_accelerate:100,ac_none,fl_splice,l_video:estabrek:videos:b");
    expect(steps[2]).toBe("c_fill,g_center,h_1280,w_720");
    expect(steps[3]).toBe("fl_layer_apply");
    // Music for the whole length (6 + 2 seconds), quieter.
    expect(steps[4]).toBe("l_audio:estabrek:videos:m,du_8,e_volume:-60");
    expect(steps[5]).toBe("fl_layer_apply,so_0");
    // Words: commas and slashes escaped twice, timed in their apply step, at the top.
    expect(steps[6]).toMatch(/^l_text:Noto%20Sans%20Arabic_48_bold:.+%252C%2050%252F50,co_rgb:ffcc00,b_rgb:00000099$/);
    expect(steps[7]).toBe("fl_layer_apply,g_north,y_0.08,so_1,du_3");
    expect(steps.slice(-2)).toEqual(["e_fade:600", "e_fade:-600"]);
  });

  test("a video's public id from its address, only on this store's Cloudinary", () => {
    expect(videoPublicId("https://res.cloudinary.com/shop/video/upload/v1700/estabrek/videos/a.mp4", "shop")).toBe("estabrek/videos/a");
    expect(videoPublicId("https://res.cloudinary.com/shop/video/upload/q_auto,w_720/estabrek/videos/a.mp4", "shop")).toBe("estabrek/videos/a");
    expect(videoPublicId("https://res.cloudinary.com/other/video/upload/a.mp4", "shop")).toBeNull();
    expect(videoPublicId("https://evil.test/shop/video/upload/a.mp4", "shop")).toBeNull();
    expect(videoPublicId("/v.mp4", "shop")).toBeNull();
  });

  test("the frame's size, and the project's checks", () => {
    expect(frameSize("original", { w: 3840, h: 2160 })).toEqual({ w: 1920, h: 1080 });
    expect(frameSize(undefined, { w: null, h: null })).toEqual({ w: 1280, h: 720 });
    expect(Project.safeParse({ clips: [] }).success).toBe(false);
    expect(Project.safeParse({ clips: [{ id: "a", src: "javascript:1", in: 0, out: 2 }] }).success).toBe(false);
    expect(Project.safeParse({ clips: [{ id: "a", src: "/a.mp4", in: 0, out: 700 }] }).success).toBe(false);
  });
});
