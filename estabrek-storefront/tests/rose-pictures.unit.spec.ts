import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { ROSE_PICTURES, rosePicture } from "../src/components/cinematic/rosePictures";

// The rose design's photographs and film (public/editorial: its store's hijab campaign) belong to the store
// that wears it. A shared part of the page asks rosePicture(rose, …) and shows nothing of them for any other
// store; only the rose design's own parts name them.

const SRC = path.join(process.cwd(), "src");

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}
const rel = (p: string) => path.relative(SRC, p).split(path.sep).join("/");

/** Where a picture or film of the rose design may be named: the list itself, and the rose design's film. */
const NAMES_THEM = new Set([
  "components/cinematic/rosePictures.ts",
  // The rose home's campaign film and its opening film (only the rose home plays them).
  "components/cinematic/campaignVideo.ts",
  "components/cinematic/RoseVideoSection.tsx",
  "components/cinematic/RoseHeroFilm.tsx",
  "components/cinematic/heroFilmPlayback.ts",
  // The shop's opening plays the rose design's silk film for its store alone (look.rose).
  "components/cinematic/RoseShopIntro.tsx",
  // The sharing picture, for the store that wears the rose design (roseDesignOn).
  "app/[lang]/layout.tsx",
]);

/** The rose design's own parts: no other store shows them, so they take its pictures as they are. */
const ROSE_ONLY = new Set([
  "components/cinematic/RoseHome.tsx",
  "components/cinematic/RoseSections.tsx",
  "components/cinematic/RoseSeasons.tsx",
  "components/cinematic/RoseCollectionStory.tsx",
  "components/cinematic/RoseCollectionsScroll.tsx",
  "components/cinematic/RoseAbout.tsx",
  "components/cinematic/RoseCategoryIntro.tsx",
]);

test("only the rose design's own parts name its pictures", () => {
  const named: string[] = [];
  const direct: string[] = [];
  for (const file of files(SRC)) {
    const text = fs.readFileSync(file, "utf8");
    const name = rel(file);
    if (/["'`]\/editorial\//.test(text) && !NAMES_THEM.has(name)) named.push(name);
    if (/ROSE_PICTURES\./.test(text) && !ROSE_ONLY.has(name) && name !== "components/cinematic/rosePictures.ts") direct.push(name);
  }
  expect(named, "these name the rose design's pictures: use ROSE_PICTURES / rosePicture() from rosePictures.ts").toEqual([]);
  expect(direct, "a shared part takes the rose design's pictures through rosePicture(useStoreLook().rose, …)").toEqual([]);
});

test("a store not wearing the rose design gets none of its pictures", () => {
  for (const which of Object.keys(ROSE_PICTURES) as (keyof typeof ROSE_PICTURES)[]) {
    expect(rosePicture(false, which)).toBeUndefined();
    expect(rosePicture(true, which)).toBe(ROSE_PICTURES[which]);
  }
});

test("the rose design's own parts that a theme's store reaches ask whether it wears the rose design", () => {
  // RoseAbout (the About opening on a store's own page) and RoseCategoryIntro (a category with no theme) are
  // reached by other stores too: their pictures for a missing one come only through rosePicture(rose…).
  for (const name of ["components/cinematic/RoseAbout.tsx", "components/cinematic/RoseCategoryIntro.tsx", "components/cinematic/RoseSections.tsx", "components/cinematic/RoseContact.tsx"]) {
    const text = fs.readFileSync(path.join(SRC, name), "utf8");
    expect(text, name).toMatch(/rosePicture\((rose|look\.rose),/);
  }
});
