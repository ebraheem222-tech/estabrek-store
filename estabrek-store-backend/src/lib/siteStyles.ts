/**
 * The store's shared styles for the new page editor ("site styles"): every heading of a
 * level and the body text take their text style (h1–h6, body), each kind of button takes
 * its button style (solid, outline, link), and an element can take any named style of its
 * own choosing (its props.styleId). Change one and every page changes; an element's own
 * look still wins over it. Kept in the settings header: `siteStyles` is what the shop
 * shows, `siteStylesDraft` the editor's changes until they're published.
 */
import { z } from "zod";
import { NodeStyle } from "./pageTree.js";

export const SITE_STYLE_KINDS = ["text", "button", "box"] as const;
export type SiteStyleKind = (typeof SITE_STYLE_KINDS)[number];
/** Styles that every element of their kind takes by itself (the others are picked by name). */
export const AUTO_STYLES: Record<SiteStyleKind, readonly string[]> = {
  text: ["h1", "h2", "h3", "h4", "h5", "h6", "body"],
  button: ["solid", "outline", "link"],
  box: [],
};
export const SITE_STYLES_LIMIT = 60;
export const STYLE_ID = /^[a-z][a-z0-9-]{0,30}$/;

export const SiteStyle = z.object({
  id: z.string().regex(STYLE_ID, "An id is small letters, digits and -"),
  kind: z.enum(SITE_STYLE_KINDS),
  name: z.string().trim().max(40).optional(),
  style: NodeStyle,
});
export type SiteStyleT = z.output<typeof SiteStyle>;

export const SiteStyles = z
  .array(SiteStyle)
  .max(SITE_STYLES_LIMIT, `At most ${SITE_STYLES_LIMIT} styles`)
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((s, i) => {
      if (seen.has(s.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, "id"], message: `The id “${s.id}” is used twice` });
      seen.add(s.id);
      const owner = SITE_STYLE_KINDS.find((k) => AUTO_STYLES[k].includes(s.id));
      if (owner && owner !== s.kind) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i, "kind"], message: `“${s.id}” is a ${owner} style` });
    });
  });

/** Checks styles from the editor: clean (trimmed, unknown keys dropped) or the problems with where they are. */
export function checkSiteStyles(raw: unknown): { ok: true; styles: SiteStyleT[] } | { ok: false; issues: Array<{ path: string; message: string }> } {
  const r = SiteStyles.safeParse(raw);
  if (r.success) return { ok: true, styles: r.data };
  return { ok: false, issues: r.error.issues.slice(0, 50).map((i) => ({ path: i.path.map(String).join("."), message: i.message })) };
}

/** Saved styles as they can be used, or none when they're missing or broken. */
export function storedSiteStyles(raw: unknown): SiteStyleT[] | null {
  if (raw === undefined || raw === null) return null;
  const r = checkSiteStyles(raw);
  return r.ok ? r.styles : null;
}
