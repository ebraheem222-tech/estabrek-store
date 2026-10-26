import { describe, expect, it } from "vitest";
import { placeCutout, placeCutoutPhoto } from "./cutoutPlace";
import { emptyDraft, type ComposerDraft } from "../../features/catalog/composer/composerModel";

const img = (localId: string, extra: Record<string, unknown> = {}) => ({ localId, url: `https://x/${localId}.jpg`, alt: null, position: 0, isPrimary: false, view: null, ...extra });

describe("a product's cut-out in its photo list", () => {
  const list = [img("a", { id: "db-a", isPrimary: true, view: "Front", alt: "front" }), img("b", { id: "db-b" })];

  it("next to: right after its photo, the original kept", () => {
    const { next, removedId } = placeCutout(list, "a", "https://x/cut.png", false, "c");
    expect(next.map((x) => [x.localId, x.position])).toEqual([["a", 1], ["c", 2], ["b", 3]]);
    expect(next[0].isPrimary).toBe(true);
    expect(next[1]).toMatchObject({ url: "https://x/cut.png", isPrimary: false, view: null, alt: "front" });
    expect(removedId).toBeUndefined();
  });

  it("instead: takes the photo's place, main and view; the saved photo is to be deleted", () => {
    const { next, removedId } = placeCutout(list, "a", "https://x/cut.png", true, "c");
    expect(next.map((x) => x.localId)).toEqual(["c", "b"]);
    expect(next[0]).toMatchObject({ isPrimary: true, view: "Front", position: 1 });
    expect(removedId).toBe("db-a");
    expect(placeCutout([img("n")], "n", "u", true, "c").removedId).toBeUndefined(); // never saved: nothing to delete
  });

  it("a photo that is gone changes nothing", () => {
    expect(placeCutout(list, "zz", "u", false, "c").next).toBe(list);
  });
});

describe("the composer: a cut-out in the same colour", () => {
  const draft = (): ComposerDraft => ({
    ...emptyDraft(),
    photos: {
      p1: { key: "p1", url: "https://x/1.jpg", preview: "blob:1", status: "done", color: "#cc5577" },
      p2: { key: "p2", url: "https://x/2.jpg", preview: "blob:2", status: "done", color: "#cc5577" },
      p3: { key: "p3", url: "https://x/3.jpg", preview: "blob:3", status: "done", color: "#111111" },
    },
    groups: [
      { key: "g1", name: "زهري", hex: "#cc5577", photoKeys: ["p1", "p2"] },
      { key: "g2", name: "أسود", hex: "#111111", photoKeys: ["p3"] },
    ],
  });

  it("next to its photo, with the photo's colour", () => {
    const d = placeCutoutPhoto(draft(), "p1", "https://x/cut.png", false, "c1");
    expect(d.groups[0].photoKeys).toEqual(["p1", "c1", "p2"]);
    expect(d.groups[1].photoKeys).toEqual(["p3"]);
    expect(d.photos.c1).toMatchObject({ url: "https://x/cut.png", preview: "https://x/cut.png", status: "done", color: "#cc5577" });
  });

  it("instead of it: the main photo stays the main one", () => {
    const d = placeCutoutPhoto(draft(), "p1", "https://x/cut.png", true, "c1");
    expect(d.groups[0].photoKeys).toEqual(["c1", "p2"]);
    expect(d.photos.p1).toBeUndefined();
  });

  it("a photo that is gone changes nothing", () => {
    const before = draft();
    expect(placeCutoutPhoto(before, "nope", "u", true, "c1")).toBe(before);
  });
});
