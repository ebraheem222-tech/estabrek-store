/**
 * The rose design's own photographs (its store's hijab campaign, public/editorial). They belong to the store
 * that wears the rose design. Where a shared part of the page (the About opening, a category, the shop's
 * opening…) has no picture of the store's own, that store gets one of these through rosePicture() and any
 * other store gets none. ROSE_PICTURES itself is for the rose design's own parts (its home, seasons,
 * collection worlds), which no other store shows. tests/rose-pictures.unit.spec.ts keeps every use here.
 */
export const ROSE_PICTURES = {
  campaign: "/editorial/hijab-campaign.webp",
  scarves: "/editorial/scarves.webp",
  poster: "/editorial/rose-campaign-poster.webp",
} as const;

export type RosePicture = keyof typeof ROSE_PICTURES;

/** One of the rose design's pictures for the store that wears it; nothing for any other store. */
export const rosePicture = (rose: boolean, which: RosePicture): string | undefined => (rose ? ROSE_PICTURES[which] : undefined);
