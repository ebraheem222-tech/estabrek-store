import { afterAll, beforeEach, expect, test } from "vitest";
import { prisma } from "./helpers/db.js";
import { cloudinarySource, loadCloudinaryAccount, saveCloudinaryAccount } from "../lib/cloudinaryAccount.js";
import { dropPerformance, mergePerformance } from "../lib/performanceKey.js";

// The store's Cloudinary account, its shop's link and the speed settings share one document
// (PerformanceSettings "default"). Each part is now written alone in one statement (lib/performanceKey.ts):
// saves at the same moment (the setup's pictures step while its shop is being made) keep each other's part.
let before: unknown = null;
beforeEach(async () => {
  const row = await prisma.performanceSettings.findUnique({ where: { id: "default" } });
  before ??= row?.data ?? {};
  await prisma.performanceSettings.deleteMany({ where: { id: "default" } });
});
afterAll(async () => {
  await prisma.performanceSettings.upsert({ where: { id: "default" }, create: { id: "default", data: before as object }, update: { data: before as object } });
  await loadCloudinaryAccount();
});
const doc = async () => ((await prisma.performanceSettings.findUnique({ where: { id: "default" } }))?.data ?? {}) as Record<string, any>;

test("parts saved at the same moment all stay", async () => {
  const writes = Array.from({ length: 24 }, (_, i) => mergePerformance({ [["cloudinary", "shop", "media"][i % 3]]: { n: i } }));
  await Promise.all(writes);
  const data = await doc();
  expect(Object.keys(data).sort()).toEqual(["cloudinary", "media", "shop"]);
});

test("the Cloudinary account saved, then the shop's link and a speed part: the account stays; taken off, the rest stays", async () => {
  await saveCloudinaryAccount({ cloudName: "demo-cloud", apiKey: "123456789012", apiSecret: "abcdefghijklmnopqrstuv" });
  await mergePerformance({ shop: { saved: { url: "https://client-shop.vercel.app" } } });
  await mergePerformance({ jobs: { paused: [] } }, null);
  let data = await doc();
  expect(data.cloudinary).toMatchObject({ cloudName: "demo-cloud", apiKey: "123456789012" });
  expect(data.cloudinary.sealed).not.toContain("abcdefghijklmnopqrstuv");
  expect(data.shop.saved.url).toBe("https://client-shop.vercel.app");
  await loadCloudinaryAccount();
  expect(cloudinarySource()).toMatchObject({ source: process.env.CLOUDINARY_CLOUD_NAME ? "env" : "saved" });

  await saveCloudinaryAccount(null);
  await dropPerformance("nothing-here");
  data = await doc();
  expect(data.cloudinary).toBeUndefined();
  expect(Object.keys(data).sort()).toEqual(["jobs", "shop"]);
});
