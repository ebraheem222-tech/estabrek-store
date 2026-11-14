/**
 * More small parts for the section library (sectionsStore.ts, sectionsTrust.ts): labels, tick lists, stars, a
 * title with its "see all", words over a picture, panels that open, a presentation, turning pictures, a gallery
 * with filters, a chart, a table of what sets the store apart, a review card, a live background.
 */
import { B, CARD, EL, H, ICON, IMG, P, STACK, mo, pic, pop, say, type Ctx, type N } from "./build";
import { BUNDLES, OUT_OF, PEOPLE } from "./parts";
import { C, w, type IconName, type W } from "./words";
import { MORE_QUOTES, VERSUS, X } from "./wordsMore";

type S = Record<string, unknown>;

/** What reads on the colour that stands out (a filled label's words). */
export const onPop = (c: Ctx): string => (c.skin === "campaign" && c.paint ? c.paint.bg : c.skin === "bold" ? "accent" : c.skin === "dark" ? "text" : "accent-contrast");
/** A small label: framed, or filled with the colour that stands out. */
export const badge = (c: Ctx, t: W, o: { center?: boolean; solid?: boolean } = {}) =>
  P(c, t, { quiet: false, motion: false, style: { size: 13, weight: 700, lineHeight: 1.3, pad: [6, 14, 6, 14], radius: 999, self: o.center ? "center" : "start", ...(o.solid ? { bg: pop(c), color: onPop(c) } : { border: { width: 1, color: pop(c) }, color: pop(c) }) } });
/** An icon and a line beside it. */
export const iconLine = (c: Ctx, icon: IconName, t: W, size = 15) => STACK(c, [ICON(c, icon, { size: 20, motion: false }), P(c, t, { quiet: false, motion: false, style: { weight: 600, size } })], { direction: "row", gap: 8, align: "center" });
/** Lines with a tick each. */
export const ticks = (c: Ctx, list: W[], icon: IconName = "check") => STACK(c, list.map((t) => iconLine(c, icon, t, 16)), { gap: 10 });
/** Five stars and what customers gave. */
export const rating = (c: Ctx, center = false) =>
  STACK(c, [STACK(c, [0, 1, 2, 3, 4].map(() => ICON(c, "star", { size: 18, motion: false })), { direction: "row", gap: 2 }), P(c, OUT_OF, { motion: false, style: { size: 14 } })], { direction: "row", gap: 10, align: "center", wrap: true, ...(center ? { justify: "center" } : {}) });
/** A title at the start of its line and "see everything" at its end. */
export const headRow = (c: Ctx, t: W, href = "/shop", level = 2) => STACK(c, [H(c, t, level), B(c, C.all, href, "link")], { direction: "row", justify: "between", align: "center", wrap: true, gap: 12, margin: [0, 0, 28, 0] });
/** What closes a section, in the middle, with space over it. */
export const foot = (c: Ctx, kids: N[], space = 32) => STACK(c, kids, { gap: 14, align: "center", textAlign: "center", margin: [space, 0, 0, 0] });
/** A column of things with the same space between them. */
export const col = (c: Ctx, kids: N[], gap = 40, style: S = {}) => STACK(c, kids, { gap, ...style });
/** A narrow column in the middle of the section (a letter, a list). */
export const narrow = (c: Ctx, kids: N[], max = "720px", style: S = {}) => STACK(c, [STACK(c, kids, { gap: 18, maxWidth: max, width: "100%", ...style })], { align: "center", gap: 0 });
/** A button as wide as its words, at the start of a column that stretches what it holds. */
export const hug = (n: N): N => ({ ...n, style: { ...(n.style ?? {}), base: { ...(((n.style ?? {}) as { base?: S }).base ?? {}), self: "start" } } });
/** The same element with its own look on a phone. */
export const onPhone = (n: N, mobile: S): N => ({ ...n, style: { ...(n.style ?? {}), mobile: { ...(((n.style ?? {}) as { mobile?: S }).mobile ?? {}), ...mobile } } });

/** The same build for words that sit on a picture: light words, whatever the section's skin. */
export const onPic = (c: Ctx): Ctx => ({ ...c, skin: "dark" });
/** A link that reads on a picture. */
export const picLink = (k: Ctx, t: W, href: string, variant: "outline" | "link" = "link") => B(k, t, href, variant, { motion: false, style: { color: "white" } });
/** A picture with words over it (a banner): `at` = where the words sit on it. */
export function overPic(c: Ctx, alt: W, kids: (k: Ctx) => N[], o: { aspect?: string; at?: "center" | "bottom" | "start"; dim?: number; radius?: number; pic?: S; phone?: S } = {}): N {
  const at = o.at ?? "bottom";
  const layer = at === "center" ? { x: 50, y: 50, anchor: "center" } : at === "start" ? { x: 6, y: 50, anchor: "start" } : { x: 6, y: 92, anchor: "bottom-start" };
  return STACK(c, [
    IMG(c, alt, { aspect: o.aspect ?? "4 / 5", radius: o.radius ?? 20, motion: false, style: { overlay: { color: "#000000", opacity: o.dim ?? 0.38 }, ...o.pic }, ...(o.phone ? { phone: o.phone } : {}) }),
    STACK(c, kids(onPic(c)), { gap: 10, width: "86%", layer, z: 2, color: "white", ...(at === "center" ? { align: "center", textAlign: "center" } : { align: "start" }) }),
  ], { gap: 0 });
}

/** Panels that open as the mouse comes over them (or on a click), each a picture, a title and a line. */
export const panels = (c: Ctx, props: S = {}) =>
  EL(c, "showcase", {
    items: [c.pack.collection, c.pack.product, C.newIn, C.best].map((t, i) => ({ title: say(c, t), text: say(c, i % 2 ? c.pack.sub : c.pack.story), image: pic(c), href: "/shop", cta: say(c, C.shop) })),
    layout: "horizontal", activation: "hover", initial: 0, ratio: 4, height: 480, duration: 0.55, overlay: 0.5, ...props,
  }, { style: { self: "stretch" } });
/** A presentation: panels one at a time (slides, tabs, or tabs down the side), each named. */
export function deck(c: Ctx, list: Array<{ label: W; kids: N[] }>, props: S = {}): N {
  const stacks = list.map((p) => STACK(c, p.kids, { gap: 16 }));
  return { id: c.ids("deck"), type: "deck", props: { presentation: "tabs", transition: "fade", duration: 0.45, initial: 0, arrows: true, dots: true, menu: true, labels: Object.fromEntries(stacks.map((s, i) => [s.id, say(c, list[i].label)])), ...props }, style: { base: { self: "stretch" } }, children: stacks };
}
/** Pictures that turn; `words` gives a slide its title, line and button. */
export const slides = (c: Ctx, n: number, props: S = {}, words?: (i: number) => S, style: S = { radius: 20 }) =>
  EL(c, "slider", { slides: Array.from({ length: n }, (_, i) => ({ src: pic(c), kind: "image", ...(words ? words(i) : {}) })), autoplay: 5, loop: true, arrows: true, dots: true, aspect: "16 / 9", ...props }, { style: { self: "stretch", ...style }, motion: mo.pic(c) });
/** A gallery whose pictures are filtered by kind, open large, or sit as an index of names. */
export const gallery = (c: Ctx, n: number, props: S = {}) =>
  EL(c, "filterGallery", {
    items: Array.from({ length: n }, (_, i) => ({ title: say(c, [c.pack.collection, c.pack.product, C.newIn, C.best, C.picked, C.look][i % 6]), image: pic(c), text: say(c, c.pack.sub), category: say(c, i % 2 ? C.best : C.newIn) })),
    layout: "grid", columns: 3, gap: 20, hoverEffect: "zoom", lightbox: true, searchable: false, activation: "click", filters: true, showCount: false, ...props,
  }, { style: { self: "stretch" } });
/** A chart of a few numbers (bars, a line or a ring), each with its name. */
export const chart = (c: Ctx, kind: "bar" | "line" | "donut", rows: Array<[W, number]>, label: W, colors?: string[]) =>
  EL(c, "chart", { kind, label: say(c, label), items: rows.map(([name, value], i) => ({ label: say(c, name), value, ...(colors ? { color: colors[i % colors.length] } : {}) })), showValues: true }, { style: { self: "stretch" } });
/** What sets the store apart, side by side with elsewhere: a tick or a dash on each line. */
export const versus = (c: Ctx) =>
  EL(c, "comparison", {
    label: say(c, X.usVsOthers),
    columns: [{ title: say(c, X.us), highlight: true }, { title: say(c, X.others) }],
    rows: VERSUS.map(([label, us, others]) => ({ label: say(c, label), values: [{ state: us ? "yes" : "no" }, { state: others ? "yes" : "no" }] })),
  }, { style: { self: "stretch" } });

/** A bundle as the pricing block keeps it. */
export const plan = (c: Ctx, b: (typeof BUNDLES)[number], o: { period?: W; badge?: W } = {}) => ({
  name: say(c, b.name), price: say(c, w(b.price, b.price, b.price)), period: say(c, o.period ?? w("للباقة", "per bundle", "לחבילה")), features: say(c, b.features), cta: say(c, X.choose), href: "/shop",
  ...(b.featured ? { featured: true, badge: say(c, o.badge ?? X.loved2) } : {}),
});
/** The team, as the team block keeps it. */
export const people = (c: Ctx, list: Array<[W, W]> = PEOPLE, photos = false) => list.map(([name, role]) => ({ name: say(c, name), role: say(c, role), ...(photos ? { photo: pic(c) } : {}) }));
/** A review in a card: its stars, its words, who said it and where from. */
export const review = (c: Ctx, q: (typeof MORE_QUOTES)[number], o: { photo?: boolean; big?: boolean } = {}) =>
  CARD(c, [
    ...(o.photo ? [IMG(c, q.name, { aspect: "1 / 1", radius: 999, motion: false, style: { width: "64px" } })] : []),
    STACK(c, [0, 1, 2, 3, 4].map(() => ICON(c, "star", { size: 16, motion: false })), { direction: "row", gap: 2 }),
    P(c, q.quote, { quiet: false, motion: false, style: { size: o.big ? 20 : 16, lineHeight: 1.6 } }),
    STACK(c, [P(c, q.name, { quiet: false, motion: false, style: { size: 14, weight: 700 } }), P(c, q.role, { motion: false, style: { size: 13 } })], { gap: 0 }),
  ], { gap: 12, pad: [24, 22, 24, 22] });

/** Over the page, not between sections. */
export const popup = (c: Ctx, props: S, children: N[]): N => ({ id: c.ids("pop"), type: "popup", props: { place: "center", ...props, label: say(c, C.welcome) }, children });
/** A live drawn background behind a section, in the colour that stands out. */
export const scene = (c: Ctx, kind: string, o: S = {}) => ({ scene: { kind, color: pop(c), amount: 32, speed: 1, intensity: 1, interactive: false, ...o } });
