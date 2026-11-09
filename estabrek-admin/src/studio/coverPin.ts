/**
 * A section held on the screen, then covered by the section after it sliding up over it from
 * below (the shop draws it: pageTree/TreeCovers.tsx). Here: its settings, what it can do while it's
 * covered, and the ready section made with it (a full-screen picture with words over it).
 */
import type { PageDraftOp, PageTreeNode } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { say } from "./say";

type Ids = (prefix: string) => string;
export type CoverUnder = "none" | "dim" | "shrink" | "blur" | "slow" | "fade";
export type Cover = { hold: number; under: CoverUnder; phone: boolean };

/** What it does while the next one covers it. */
export const COVER_UNDERS: Array<[CoverUnder, () => string]> = [
  ["none", () => say("ولا إشي|Nothing|כלום")],
  ["dim", () => say("يغمق|Darkens|מתכהה")],
  ["shrink", () => say("يصغر لورا|Shrinks back|מתכווץ לאחור")],
  ["blur", () => say("يتغبّش|Blurs|מיטשטש")],
  ["slow", () => say("يطلع على مهل|Moves up slowly|עולה לאט")],
  ["fade", () => say("يختفي|Fades away|נעלם")],
];

/** A new one: held for a screen, darkening as it's covered. */
export const NEW_COVER: Cover = { hold: 1, under: "dim", phone: true };

/** Its settings, every value in range, or null when it isn't held. */
export function coverOfNode(node: PageTreeNode): Cover | null {
  const c = node.props?.cover;
  if (!c || typeof c !== "object" || Array.isArray(c)) return null;
  const v = c as Record<string, unknown>;
  const hold = typeof v.hold === "number" && Number.isFinite(v.hold) ? Math.max(0, Math.min(6, v.hold)) : 0;
  const under = COVER_UNDERS.some(([k]) => k === v.under) ? (v.under as CoverUnder) : "none";
  return { hold, under, phone: v.phone !== false };
}

/** The change that holds it (with these settings) or lets it go (null). */
export const coverOp = (node: PageTreeNode, next: Cover | null): PageDraftOp => ({ op: "setProps", nodeId: node.id, props: { ...node.props, cover: next ?? undefined } });

/** Header and footer sections stay put (they aren't one of the page's sections). */
export const canCover = (node: PageTreeNode) => node.type === "section" && !["header", "footer"].includes(String(node.props?.tag ?? "section"));

const words = (lang: Lang, t: string) => {
  const [ar, en, he] = t.split("|");
  return { [lang]: { ar, en, he: he ?? en }[lang] };
};

/**
 * Ready: a picture across the whole screen with words over it. It stays while the page scrolls a
 * screen, then the section after it slides up over it, darkening it as it goes.
 */
export function readyCover(lang: Lang, ids: Ids, src?: string): PageTreeNode {
  const over = (node: PageTreeNode, y: number): PageTreeNode => ({ ...node, style: { base: { ...((node.style as { base?: Record<string, unknown> } | undefined)?.base ?? {}), layer: { x: 50, y, anchor: "center" }, z: 1 } } });
  return {
    id: ids("sec"),
    type: "section",
    name: say("صورة ثابتة بتتغطى|Held picture, then covered|תמונה קבועה שמתכסה"),
    props: { contained: false, cover: { ...NEW_COVER } },
    style: { base: { pad: [0, 0, 0, 0], minHeight: "100vh", bg: "#1d1a24" } },
    children: [
      ...(src ? [{ id: ids("img"), type: "image", props: { src, alt: words(lang, "صورة القسم|The section's picture|תמונת המקטע") }, style: { base: { width: "100%", height: "100vh", fit: "cover", overlay: { color: "#000000", opacity: 0.3 } } } } as PageTreeNode] : []),
      over({ id: ids("h"), type: "heading", props: { level: 1, text: words(lang, "بتضل قدامك|It stays with you|היא נשארת איתך") }, style: { base: { color: "white", textAlign: "center", size: 64, sizeMin: 34, width: "85%" } } }, 44),
      over({ id: ids("t"), type: "text", props: { text: words(lang, "كمّلي السكرول، واللي بعدها رح يغطيها.|Keep scrolling: what comes next covers it.|המשיכי לגלול: מה שבא אחריה יכסה אותה.") }, style: { base: { color: "white", textAlign: "center", size: 18, width: "70%" } } }, 58),
    ],
  };
}
