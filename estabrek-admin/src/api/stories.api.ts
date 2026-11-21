// Admin → القصص: the shop's story circles (the backend's lib/stories.ts and modules/admin/stories.controller.ts).
import { api } from "./http";

export type StoryWords = Partial<Record<"ar" | "en" | "he", string>>;
export type StorySlide = {
  id: string;
  kind: "image" | "video";
  src: string;
  poster?: string;
  caption?: StoryWords;
  seconds?: number;
  productId?: string;
  href?: string;
  label?: StoryWords;
};
export type StoryReel = {
  id: string;
  title: StoryWords;
  cover: string | null;
  slides: StorySlide[];
  order: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  views: number;
  taps: number;
};
/** A reel as it's sent: new, or the whole of one changed. */
export type StoryReelInput = Pick<StoryReel, "title" | "cover" | "slides" | "isActive" | "startsAt" | "endsAt">;
export type StoryLimits = { reels: number; slides: number; seconds: { min: number; max: number; image: number } };

export async function listStories() {
  return (await api.get("/admin/stories")).data as { reels: StoryReel[]; limits: StoryLimits };
}
export async function createStory(body: StoryReelInput) {
  return (await api.post("/admin/stories", body)).data as StoryReel;
}
export async function saveStory(id: string, body: StoryReelInput) {
  return (await api.patch(`/admin/stories/${encodeURIComponent(id)}`, body)).data as StoryReel;
}
export async function deleteStory(id: string) {
  return (await api.delete(`/admin/stories/${encodeURIComponent(id)}`)).data as { ok: true };
}
export async function orderStories(ids: string[]) {
  return (await api.post("/admin/stories/order", { ids })).data as { ok: true };
}
