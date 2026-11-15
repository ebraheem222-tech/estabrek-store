import { describe, expect, test } from "vitest";
import { cleanAlt, cleanOptions, optionsFor, pageWordsProblem, pageWordsPrompt, pictureAltPrompt, PAGE_WORD_MAX } from "../modules/ai/pageWords.js";

// The page editor's words helper: what the model is asked, and what is kept of its answer.

const brief = "The shop sells modest fashion for women.";

describe("the page editor's words", () => {
  test("each action asks for what it is: the kind of words, the language, how many options", () => {
    const write = pageWordsPrompt({ action: "write", kind: "heading", lang: "ar", about: "  summer   sale " }, brief, ", addressing her in the feminine");
    expect(write.system).toContain(brief);
    expect(write.system).toContain("Modern Standard Arabic, addressing her in the feminine");
    expect(write.system).toContain("a heading");
    expect(write.user).toContain("Write 3 different options about: summer sale");
    expect(write.user).toContain('{"options": ["…", "…", "…"]}');
    // What is there now is given for the tone when there is some.
    expect(pageWordsPrompt({ action: "write", kind: "text", lang: "en", about: "delivery", text: "We deliver fast" }, brief, "").user).toContain("What is there now (for the tone, not to repeat): We deliver fast");
    expect(pageWordsPrompt({ action: "improve", kind: "text", lang: "en", text: "We deliver fast" }, brief, "").user).toContain("Rewrite these words 3 ways");
    expect(pageWordsPrompt({ action: "shorter", kind: "text", lang: "en", text: "We deliver fast" }, brief, "").user).toContain("fewer words");
    expect(pageWordsPrompt({ action: "longer", kind: "button", lang: "en", text: "Shop" }, brief, "").user).toContain("a little more detail");
    // A translation is written in the language it goes to, and is one option.
    const translate = pageWordsPrompt({ action: "translate", kind: "button", lang: "ar", to: "he", text: "تسوّقي الآن" }, brief, "");
    expect(translate.system).toContain("warm Hebrew");
    expect(translate.user).toContain("from Modern Standard Arabic into Hebrew");
    expect(translate.user).toContain('{"options": ["…"]}');
    expect([optionsFor("translate"), optionsFor("write"), optionsFor("improve")]).toEqual([1, 3, 3]);
    // A paragraph may take more of the answer than a button.
    expect(pageWordsPrompt({ action: "write", kind: "text", lang: "en", about: "x" }, brief, "").maxTokens).toBeGreaterThan(pageWordsPrompt({ action: "write", kind: "button", lang: "en", about: "x" }, brief, "").maxTokens);
    expect(pageWordsPrompt({ action: "improve", kind: "text", lang: "en", text: "x".repeat(4000) }, brief, "").maxTokens).toBeLessThanOrEqual(1800);
  });

  test("a request without what its action needs is said, not sent", () => {
    expect(pageWordsProblem({ action: "write", kind: "heading", lang: "ar", about: "   " })).toMatch(/about/);
    expect(pageWordsProblem({ action: "write", kind: "heading", lang: "ar", about: "summer" })).toBeNull();
    expect(pageWordsProblem({ action: "improve", kind: "text", lang: "ar" })).toMatch(/no words/);
    expect(pageWordsProblem({ action: "shorter", kind: "text", lang: "ar", text: "نص" })).toBeNull();
    expect(pageWordsProblem({ action: "translate", kind: "text", lang: "ar", text: "نص" })).toMatch(/another language/);
    expect(pageWordsProblem({ action: "translate", kind: "text", lang: "ar", to: "ar", text: "نص" })).toMatch(/another language/);
    expect(pageWordsProblem({ action: "translate", kind: "text", lang: "ar", to: "en", text: "نص" })).toBeNull();
  });

  test("only words are kept of the answer: quotes and list marks off, each once, never the original again", () => {
    const raw = { options: ['"Summer is here."', "- Summer is here", "1. Your summer wardrobe", 7, null, "  ", "Shop the summer edit", "A fourth one"] };
    expect(cleanOptions(raw, { action: "write", kind: "heading" })).toEqual(["Summer is here", "Your summer wardrobe", "Shop the summer edit"]);
    // A paragraph keeps its full stop; a heading and a button lose it.
    expect(cleanOptions({ options: ["We deliver in two days."] }, { action: "improve", kind: "text", text: "Fast delivery" })).toEqual(["We deliver in two days."]);
    expect(cleanOptions({ options: ["Shop now."] }, { action: "improve", kind: "button", text: "Buy" })).toEqual(["Shop now"]);
    // The same words as before are no option; a translation may read the same (a brand name).
    expect(cleanOptions({ options: ["  fast   DELIVERY ", "Quick delivery"] }, { action: "improve", kind: "heading", text: "Fast delivery" })).toEqual(["Quick delivery"]);
    expect(cleanOptions({ options: ["Estabrek", "Another"] }, { action: "translate", kind: "heading", text: "Estabrek" })).toEqual(["Estabrek"]);
    // Too long for what it is for: cut at a word.
    const long = cleanOptions({ options: [`${"word ".repeat(30)}end`] }, { action: "write", kind: "button" })[0];
    expect(long.length).toBeLessThanOrEqual(PAGE_WORD_MAX.button);
    expect(long.endsWith("word")).toBe(true);
    // Arabic and its quotation marks.
    expect(cleanOptions({ options: ["«صيفك أحلى معنا»", "“خصومات لآخر الموسم”"] }, { action: "write", kind: "heading" })).toEqual(["صيفك أحلى معنا", "خصومات لآخر الموسم"]);
    // Not the shape asked for: nothing.
    for (const bad of [null, "text", { options: "one" }, { other: [] }, []]) expect(cleanOptions(bad, { action: "write", kind: "heading" })).toEqual([]);
  });

  test("a picture's description: one plain sentence in the page's language", () => {
    const p = pictureAltPrompt("he", brief);
    expect(p.system).toContain("Write in Hebrew");
    expect(p.system).toContain("at most 120 characters");
    expect(p.user).toContain('{"alt": "…"}');
    expect(cleanAlt({ alt: '  "A burgundy chiffon scarf   on a wooden table"  ' })).toBe("A burgundy chiffon scarf on a wooden table");
    expect(cleanAlt({ alt: "x ".repeat(200) }).length).toBeLessThanOrEqual(160);
    for (const bad of [null, {}, { alt: 3 }, { alt: "   " }]) expect(cleanAlt(bad)).toBe("");
  });
});
