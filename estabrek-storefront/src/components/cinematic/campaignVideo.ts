import type { VideoData } from "@/cms/sectionTypes";

/** The rose home's own campaign film (RoseVideoSection), apart from it so its sections can read it without loading it. */
export const defaultCampaignVideo: VideoData = {
  url: "/editorial/rose-campaign.mp4", posterUrl: "/editorial/rose-campaign-poster.webp",
  provider: "MP4", autoplay: true, muted: true, loop: true,
};
