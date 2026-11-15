/**
 * The page editor on a phone (StudioPage.tsx). A phone has room for one thing at a time, so:
 *  - the top bar keeps what is pressed all the time (back, the page's name, undo, redo, publish) and the rest waits
 *    behind "more";
 *  - a bar at the bottom opens one sheet per job: add, the layers, the selection's settings, ready looks, styles;
 *  - the phone frame is fitted to the canvas by its width and is as tall as the canvas shows, so the page scrolls
 *    inside it and none of it hides under the bars;
 *  - two fingers zoom the canvas and move it.
 * Here: the sums and the names, with no React in them.
 */

/** Tailwind's `md` is where the editor's own side column starts: below it, the phone layout. */
export const PHONE_QUERY = "(max-width: 767.98px)";

export type Pt = { x: number; y: number };

/** What the sheet at the bottom can show (one at a time). */
export const SHEET_VIEWS = ["add", "layers", "settings", "looks", "styles", "more"] as const;
export type SheetView = (typeof SHEET_VIEWS)[number];
/** The bottom bar's buttons, in their order ("more" is opened from the top bar). */
export const PHONE_TABS = ["add", "layers", "settings", "looks", "styles"] as const satisfies readonly SheetView[];
export const SHEET_WORD: Record<SheetView, string> = {
  add: "إضافة|Add|הוספה",
  layers: "الطبقات|Layers|שכבות",
  settings: "الإعدادات|Settings|הגדרות",
  looks: "الأشكال|Looks|מראות",
  styles: "الستايلات|Styles|סגנונות",
  more: "أدوات المحرّر|Editor tools|כלי העורך",
};
export const SHEET_ICON: Record<SheetView, string> = { add: "＋", layers: "☰", settings: "⚙", looks: "◐", styles: "🎨", more: "⋯" };

/**
 * The phone frame fitted to the canvas: as wide as the canvas lets it be (never bigger than life), and as tall as
 * the canvas shows at that zoom. Null while the canvas has no size yet.
 */
export function phoneFrame(canvas: { w: number; h: number }, width: number, margin = 8): { zoom: number; h: number } | null {
  if (!(canvas.w > margin * 2 && canvas.h > margin * 2 && width > 0)) return null;
  const zoom = Math.min(1, (canvas.w - margin * 2) / width);
  return { zoom, h: Math.max(240, Math.round((canvas.h - margin * 2) / zoom)) };
}

/** Where the sheet's top edge is on a screen this tall (the sheet takes 56% of it, above the 56px row of tabs). */
export const phoneSheetTop = (screenH: number) => Math.round(screenH * 0.44) - 56;

/**
 * Two fingers on the canvas, from where they were to where they are now: the point between them, how much further
 * apart they got (the zoom's factor; 1 when they are too close together to tell), and how far that point moved.
 */
export function pinchStep(was: readonly [Pt, Pt], now: readonly [Pt, Pt]): { at: Pt; scale: number; move: Pt } {
  const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const far = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  const m0 = mid(was[0], was[1]), m1 = mid(now[0], now[1]);
  const d0 = far(was[0], was[1]), d1 = far(now[0], now[1]);
  return { at: m1, scale: d0 > 8 && d1 > 8 ? d1 / d0 : 1, move: { x: m1.x - m0.x, y: m1.y - m0.y } };
}
