/**
 * The video editor's preview on the screen (VideoEditor.tsx): the video's own shape, no bigger than it ever was
 * (560×315), and no bigger than the room it has. On a computer the room is larger than that, so nothing changes;
 * on a phone the preview is as wide as the screen lets it be and leaves the rest of the screen to the settings
 * and the timeline.
 */
export type Size = { w: number; h: number };

export const PREVIEW_MOST: Size = { w: 560, h: 315 };
/** The share of a phone's screen height the preview may take when the editor's parts are stacked. */
export const PREVIEW_SHARE = 0.3;

export function previewSize(size: Size, room?: Size | null): Size {
  if (!(size.w > 0 && size.h > 0)) return { w: 0, h: 0 };
  const limits = [1, PREVIEW_MOST.w / size.w, PREVIEW_MOST.h / size.h];
  // (Never squeezed under 80px a side by a room that hasn't been measured properly yet.)
  if (room) limits.push(Math.max(80, room.w) / size.w, Math.max(80, room.h) / size.h);
  const scale = Math.min(...limits);
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}
