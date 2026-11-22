/**
 * The "front" archetype (a business's front: a restaurant, a clinic, an office…): its home in six
 * compositions, the library's openings and stories with the site's lists between them, and its story
 * page. A module the site doesn't use leaves its section out.
 */
import { P, SEC, STACK, withSkin } from "../../build";
import { w } from "../../words";
import type { SiteBlueprint, SiteSetting } from "../blueprint";
import { SET, SW } from "../siteWords";
import { offersPart, postsPart, questionsPart, reviewsPart, teamPart } from "./lists";
import { S, callBand, fromSetting, pageHead, shownIf, still, type Built, type Part, type SiteModule } from "./kit";

/** Each of a module's sections, only when the site uses it. */
const when = (on: unknown, part: () => Part): Part[] => (on ? [part()] : []);

/** A business's front's own settings: its hours (wherever its pages give them) and a notice over its first page. */
export const frontSettings = (bp: SiteBlueprint): SiteSetting[] => [
  { key: "hours", kind: "words", label: SET.hours, note: SET.hoursNote, group: SET.site, public: true, default: bp.biz.hours },
  { key: "noticeOn", kind: "toggle", label: SET.noticeOn, note: SET.noticeOnNote, group: SET.site, public: true, default: false },
  { key: "notice", kind: "words", label: SET.notice, group: SET.site, public: true, long: true, default: SET.noticeText },
];

/** The notice bar over the first page: on the shop only while its switch is on, in the words its owner wrote. */
const noticePart: Part = (c) => {
  const k = withSkin(c, "bold");
  const line = fromSetting(P(k, SET.noticeText, { ...still, quiet: false, style: { size: 16, weight: 600, lineHeight: 1.5 } }), { text: "notice" });
  return shownIf(SEC(k, [STACK(k, [line], { align: "center", textAlign: "center" })], { name: SET.noticeName, full: true, pad: [14, 20, 14, 20], phone: { pad: [12, 16, 12, 16] } }), "noticeOn");
};

/** The home of a business's front: the notice bar, then its look's composition. */
export function frontHome(b: Built): Part[] {
  return [noticePart, ...composition(b)];
}
function composition(b: Built): Part[] {
  const u = b.use;
  const featured = when(u.offers, () => offersPart(b, b.bp.look % 6 === 1 ? "surface" : b.bp.look % 6 === 0 || b.bp.look % 6 === 5 ? "soft" : "plain", { featured: true }));
  const team = when(u.team, () => teamPart(b, "plain"));
  const reviews = (skin: Parameters<typeof reviewsPart>[1]) => when(u.reviews, () => reviewsPart(b, skin, 3));
  switch (b.bp.look % 6) {
    case 1: return [S("hero-quiet", "plain"), S("split-zigzag", "plain"), ...featured, S("story-center", "soft"), ...reviews("plain"), ...when(u.questions, () => questionsPart(b, "surface", 4, true)), S("cta-mesh", "plain")];
    case 2: return [S("hero-scene", "dark"), ...featured, S("story-two-pics", "soft"), ...team, ...reviews("surface"), S("cta-split", "bold")];
    case 3: return [S("hero-cover", "plain"), ...featured, S("gal-mosaic", "plain"), S("story-wide", "plain"), ...reviews("soft"), S("cta-picture-over", "plain")];
    case 4: return [S("hero-frame", "soft"), ...featured, S("split-card-over", "surface"), ...when(u.news, () => postsPart(b, "plain", 3, true)), ...reviews("soft"), S("cta-scene", "dark")];
    case 5: return [S("hero-collage", "plain"), ...featured, S("story-quote", "bold"), ...team, ...reviews("surface"), S("cta-center", "bold")];
    default: return [S("hero-split", "plain"), ...featured, S("story-split", "plain"), ...reviews("surface"), ...when(u.questions, () => questionsPart(b, "plain", 4, true)), S("cta-box", "plain")];
  }
}

/** The story page: the business's story, its team, its pictures, and a call to write. */
function storyParts(b: Built): Part[] {
  const team = when(b.use.team, () => teamPart(b, "surface"));
  const story = b.bp.look % 2 ? S("story-two-pics", "plain") : S("story-split", "plain");
  return [pageHead(SW.ourStory, b.bp.pack.sub, "soft"), story, S("story-quote", "bold"), ...team, S("gal-four", "plain"), callBand(SW.contact, SW.contactSub, SW.writeUs, b.slugs.contact ?? b.slugs.home, "dark")];
}

export const STORY: SiteModule = {
  key: "story",
  name: w("قصتنا", "Our story", "הסיפור שלנו"),
  note: w("صفحة القصة، الفريق والصور.", "The story page, with the team and pictures.", "עמוד הסיפור, עם הצוות והתמונות."),
  pages: (bp) => [{ key: "story", slug: "/our-story", order: 20, name: SW.ourStory, seo: bp.pack.story, parts: storyParts }],
};
