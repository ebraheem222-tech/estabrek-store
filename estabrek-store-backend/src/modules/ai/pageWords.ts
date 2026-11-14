/**
 * The page editor's words helper (admin → AI → "page writer"): what the model is asked for a heading, a text or a
 * button's words, and what is kept of its answer. Pure: the service adds the store's brief and makes the call.
 *
 * The owner asks from the editor for an element's words in the language being edited: new words about something,
 * the words they have made better, shorter or longer, or the words in another language. A few options come back
 * and the owner picks one: nothing is saved here.
 */
import type { ContentLang } from "../../lib/translations.js";

export const PAGE_WORD_ACTIONS = ["write", "improve", "shorter", "longer", "translate"] as const;
export type PageWordAction = (typeof PAGE_WORD_ACTIONS)[number];
export const PAGE_WORD_KINDS = ["heading", "text", "button"] as const;
export type PageWordKind = (typeof PAGE_WORD_KINDS)[number];
export type PageWordsInput = { action: PageWordAction; kind: PageWordKind; lang: ContentLang; to?: ContentLang; text?: string; about?: string };

export const LANG_NAME: Record<ContentLang, string> = { ar: "Modern Standard Arabic", en: "English", he: "Hebrew" };
/** The most an option may be, by what it is for (longer ones are cut at a word). */
export const PAGE_WORD_MAX: Record<PageWordKind, number> = { heading: 140, text: 900, button: 40 };
const WHAT: Record<PageWordKind, string> = {
  heading: "a heading (a few strong words, at most about ten; no full stop at the end)",
  text: "a short paragraph (one to three sentences)",
  button: "a button's label (one to three words, an action)",
};
const tidy = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** How many options an action gives: a translation is one, the rest are a few to choose from. */
export const optionsFor = (action: PageWordAction) => (action === "translate" ? 1 : 3);

/** Whether the request has what its action needs (words to change, or something to write about). */
export function pageWordsProblem(input: PageWordsInput): string | null {
  if (input.action === "write") return tidy(input.about, 400) ? null : "Say what the words are about";
  if (!tidy(input.text, 4000)) return "There are no words to work on";
  if (input.action === "translate" && (!input.to || input.to === input.lang)) return "Choose another language";
  return null;
}

/**
 * The model's instructions and the request. `brief` is the store in a sentence; `tone` how its shopper is
 * addressed (", addressing her in the feminine", or nothing).
 */
export function pageWordsPrompt(input: PageWordsInput, brief: string, tone: string): { system: string; user: string; maxTokens: number } {
  const n = optionsFor(input.action);
  const lang = input.action === "translate" ? input.to ?? input.lang : input.lang;
  const text = tidy(input.text, 4000), about = tidy(input.about, 400);
  const rules = `Plain words only: no quotation marks around them, no markdown, no emojis unless the original has them, no invented prices, offers or facts. Keep brand names and anything in {curly braces} exactly as they are.`;
  const system = `You write the words on an online shop's own pages. ${brief} Write in natural, warm ${LANG_NAME[lang]}${tone}. What is asked for is ${WHAT[input.kind]}. ${rules}`;
  const ask =
    input.action === "write"
      ? `Write ${n} different options about: ${about}${text ? `\nWhat is there now (for the tone, not to repeat): ${text}` : ""}`
      : input.action === "improve"
        ? `Rewrite these words ${n} ways: clearer and more inviting, the same meaning, about the same length.\nWords: ${text}`
        : input.action === "shorter"
          ? `Say the same in fewer words, ${n} ways (each clearly shorter than the original).\nWords: ${text}`
          : input.action === "longer"
            ? `Say the same with a little more detail and warmth, ${n} ways (each longer than the original, still fit for ${WHAT[input.kind]}).\nWords: ${text}`
            : `Translate these words from ${LANG_NAME[input.lang]} into ${LANG_NAME[lang]}. Keep the meaning, the length and the tone.\nWords: ${text}`;
  const user = `${ask}\nJSON: {"options": [${Array.from({ length: n }, () => '"…"').join(", ")}]}`;
  return { system, user, maxTokens: Math.min(1800, 200 + n * (input.kind === "text" ? 320 : 80) + Math.round(text.length / 2)) };
}

/** Cut at a word when too long. */
function fit(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return (at > max * 0.6 ? cut.slice(0, at) : s.slice(0, max)).trim();
}

/**
 * The options kept from the model's answer: words only (wrapping quotes and list marks taken off), each once,
 * none that only repeats the original, no longer than the kind allows, as many as the action gives.
 */
export function cleanOptions(raw: unknown, input: Pick<PageWordsInput, "action" | "kind" | "text">): string[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { options?: unknown }).options) ? ((raw as { options: unknown[] }).options) : [];
  const same = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const original = same(String(input.text ?? ""));
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    let s = item.replace(/\s+/g, " ").trim().replace(/^(?:[-*•]|\d+[.)])\s+/, "");
    s = s.replace(/^["'“”«»‘’`]+|["'“”«»‘’`]+$/g, "").trim();
    if (input.kind === "heading" || input.kind === "button") s = s.replace(/[.。]+$/, "").trim();
    s = fit(s, PAGE_WORD_MAX[input.kind]);
    if (!s || (input.action !== "translate" && same(s) === original) || out.some((o) => same(o) === same(s))) continue;
    out.push(s);
    if (out.length >= optionsFor(input.action)) break;
  }
  return out;
}

/** What is asked for a picture's description (its alt text), and what is kept of the answer. */
export function pictureAltPrompt(lang: ContentLang, brief: string): { system: string; user: string; maxTokens: number } {
  return {
    system: `You describe a picture on an online shop's page for people who can't see it (its alt text). ${brief} Write in ${LANG_NAME[lang]}. Say plainly what is shown: the thing, its colours and material, what is around it. One short sentence, at most 120 characters. Don't begin with "picture of" or "image of". No quotation marks, no emojis, nothing that isn't in the picture.`,
    user: `Describe this picture.\nJSON: {"alt": "…"}`,
    maxTokens: 200,
  };
}
export function cleanAlt(raw: unknown): string {
  const v = raw && typeof raw === "object" ? (raw as { alt?: unknown }).alt : undefined;
  if (typeof v !== "string") return "";
  return fit(v.replace(/\s+/g, " ").trim().replace(/^["'“”«»‘’`]+|["'“”«»‘’`]+$/g, "").trim(), 160);
}
