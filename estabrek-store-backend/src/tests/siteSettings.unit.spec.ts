import { describe, expect, test } from "vitest";
import { SettingDeclSchema, SettingDeclsSchema, declsOf, publicValues, readValues, valuesIn, valuesOf, withSettings, type SettingDecl } from "../lib/siteSettings.js";
import { checkTree } from "../lib/pageTree.js";
import { problemsOf, type FnDef } from "../lib/fnDef.js";
import { readTemplate } from "../lib/featureTemplate.js";

// A whole site's settings (wave 1 of docs/sites-300-plan.ar.md): what its file declares, what the owner may
// set them to, what its pages on the shop and its functions read.

const L = (ar: string, en = ar, he = ar) => ({ ar, en, he });
const DECLS: SettingDecl[] = [
  { key: "bookingOpen", kind: "toggle", label: L("الحجز مفتوح", "Booking is open"), public: true, default: true },
  { key: "hours", kind: "words", label: L("الساعات", "Hours"), public: true, default: L("٩–٥", "9–5", "9–5") },
  { key: "minOrder", kind: "number", label: L("أقل طلب", "Smallest order"), min: 0, max: 500, whole: true, default: 40 },
  { key: "notifyEmail", kind: "text", label: L("إيميل", "Email"), default: "" },
  { key: "mood", kind: "choice", label: L("الجو", "Mood"), public: true, options: [{ id: "calm", name: L("هادي", "Calm") }, { id: "loud", name: L("عالي", "Loud") }], default: "calm" },
  { key: "tint", kind: "color", label: L("اللون", "Colour"), public: true },
];

describe("What a site's file declares", () => {
  test("each kind reads; out of shape is said", () => {
    expect(SettingDeclsSchema.safeParse(DECLS).success).toBe(true);
    const bad = (d: unknown) => SettingDeclSchema.safeParse(d).success;
    expect(bad({ key: "Open", kind: "toggle", label: L("x") })).toBe(false);
    expect(bad({ key: "open", kind: "switch", label: L("x") })).toBe(false);
    expect(bad({ key: "open", kind: "toggle", label: {} })).toBe(false);
    expect(bad({ key: "open", kind: "toggle", label: L("x"), default: "yes" })).toBe(false);
    expect(bad({ key: "mood", kind: "choice", label: L("x") })).toBe(false);
    expect(bad({ key: "mood", kind: "choice", label: L("x"), options: [{ id: "a", name: L("a") }, { id: "a", name: L("b") }] })).toBe(false);
    expect(bad({ key: "open", kind: "toggle", label: L("x"), options: [{ id: "a", name: L("a") }, { id: "b", name: L("b") }] })).toBe(false);
    expect(bad({ key: "n", kind: "number", label: L("x"), min: 5, max: 1 })).toBe(false);
    expect(bad({ key: "n", kind: "text", label: L("x"), min: 5 })).toBe(false);
    expect(bad({ key: "n", kind: "number", label: L("x"), min: 0, max: 9, default: 12 })).toBe(false);
    expect(SettingDeclsSchema.safeParse([DECLS[0], DECLS[0]]).success).toBe(false);
    // As kept in a feature's file: the ones that still read.
    expect(declsOf([DECLS[0], { key: "x" }]).map((d) => d.key)).toEqual(["bookingOpen"]);
    expect(declsOf(null)).toEqual([]);
  });

  test("a template file carries them; a file whose settings are out of shape doesn't read", () => {
    const file = { format: "estabrek.feature", formatVersion: 1, key: "site-x", version: "1.0.0", name: { en: "X" }, pages: [{ key: "home", name: "Home", slug: "/x-home", tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [] } } }] };
    const read = readTemplate({ ...file, settings: DECLS });
    expect(read.ok && read.template.settings?.map((d) => d.key)).toEqual(DECLS.map((d) => d.key));
    expect(readTemplate({ ...file, settings: [{ ...DECLS[0], kind: "switch" }] }).ok).toBe(false);
    expect(readTemplate(file).ok).toBe(true);
  });
});

describe("The owner's values", () => {
  test("each its default until set; one that no longer fits gives way to the default; nothing undeclared is kept", () => {
    expect(valuesOf(DECLS, null)).toEqual({ bookingOpen: true, hours: L("٩–٥", "9–5", "9–5"), minOrder: 40, notifyEmail: "", mood: "calm", tint: "#000000" });
    expect(valuesOf(DECLS, { bookingOpen: false, minOrder: 900, mood: "gone", old: 1, tint: "#ff0000" })).toMatchObject({ bookingOpen: false, minOrder: 40, mood: "calm", tint: "#ff0000" });
    expect("old" in valuesOf(DECLS, { old: 1 })).toBe(false);
  });

  test("a change is checked against its setting, every problem said with its key; words are tidied", () => {
    const ok = readValues(DECLS, { minOrder: 60 }, { bookingOpen: false, hours: { ar: "  ١٠–٦ ", en: "", he: "10–6" }, notifyEmail: " me@shop.example ", tint: "#ABCDEF" });
    expect(ok).toEqual({ ok: true, values: { bookingOpen: false, hours: { ar: "١٠–٦", he: "10–6" }, minOrder: 60, notifyEmail: "me@shop.example", mood: "calm", tint: "#abcdef" } });
    const no = readValues(DECLS, null, { bookingOpen: "yes", minOrder: 2.5, mood: "wild", tint: "red", nope: 1 });
    expect(no.ok).toBe(false);
    expect(!no.ok && no.problems.map((p) => p.key)).toEqual(["bookingOpen", "minOrder", "mood", "tint", "nope"]);
    expect(!no.ok && no.problems[1].message).toBe("A number without fractions, at least 0, at most 500");
    expect(readValues(DECLS, null, [1]).ok).toBe(false);
  });

  test("the shop gets the public ones only; a function reads words in its own language", () => {
    const values = valuesOf(DECLS, { notifyEmail: "me@shop.example" });
    expect(Object.keys(publicValues(DECLS, values))).toEqual(["bookingOpen", "hours", "mood", "tint"]);
    expect(valuesIn(values, DECLS, "en")).toMatchObject({ hours: "9–5", notifyEmail: "me@shop.example", minOrder: 40 });
    expect(valuesIn({ hours: { he: "10" } }, DECLS, "en").hours).toBe("10");
  });
});

describe("A page on the shop", () => {
  const T = (children: unknown[]) => ({ version: 1, root: { id: "page", type: "page", props: {}, children } });
  const text = (id: string, words: string, more: Record<string, unknown> = {}) => ({ id, type: "text", props: { text: L(words), ...more } });
  const sec = (id: string, children: unknown[], more: Record<string, unknown> = {}) => ({ id, type: "section", props: { contained: true, ...more }, children });

  test("an element shows only while its setting is the value it names; the marks never reach the shop", () => {
    const tree = T([
      sec("bar", [text("notice", "sample", { fromSetting: { text: "notice" } })], { showIf: { setting: "noticeOn" } }),
      sec("book", [text("form", "form", { showIf: { setting: "bookingOpen" } }), text("closed", "closed", { showIf: { setting: "bookingOpen", is: false } })]),
      sec("mood", [text("calm", "calm", { showIf: { setting: "mood", is: "calm" } })]),
      sec("secret", [text("x", "x", { showIf: { setting: "minOrder", is: 40 } })]),
    ]);
    const out = withSettings(tree, { noticeOn: false, bookingOpen: false, mood: "calm" });
    const ids = (n: { id: string; children?: unknown[] }): string[] => [n.id, ...((n.children ?? []) as never[]).flatMap(ids)];
    // Off: the bar and everything in it; the closed note instead of the form; a setting the shop can't read hides.
    expect(ids(out.root as never)).toEqual(["page", "book", "closed", "mood", "calm", "secret"]);
    expect(JSON.stringify(out)).not.toMatch(/showIf|fromSetting/);
    const on = withSettings(tree, { noticeOn: true, notice: { ar: "مسكّرين بالعيد", en: "Closed for the holiday" }, bookingOpen: true, mood: "loud" });
    expect(ids(on.root as never)).toEqual(["page", "bar", "notice", "book", "form", "mood", "secret"]);
    // Words from the setting, in the languages it has.
    expect((on.root.children[0] as { children: Array<{ props: unknown }> }).children[0].props).toEqual({ text: { ar: "مسكّرين بالعيد", en: "Closed for the holiday" } });
  });

  test("words from a text or a number setting, in every language; an empty one leaves the page's own", () => {
    const tree = T([sec("s", [text("a", "own", { fromSetting: { text: "phone" } }), { id: "b", type: "button", props: { label: L("own"), href: "/x", fromSetting: { label: "count" } } }, text("c", "own", { fromSetting: { text: "empty" } })])]);
    const out = withSettings(tree, { phone: "04-600-1234", count: 3, empty: "" });
    const kids = (out.root.children[0] as { children: Array<{ props: Record<string, unknown> }> }).children;
    expect(kids[0].props.text).toEqual(L("04-600-1234"));
    expect(kids[1].props.label).toEqual(L("3"));
    expect(kids[2].props.text).toEqual(L("own"));
  });

  test("the page's check keeps the marks on its elements, and refuses them on the page or out of shape", () => {
    const good = checkTree(T([sec("s", [text("a", "x", { showIf: { setting: "bookingOpen", is: false }, fromSetting: { text: "hours" } })], { showIf: { setting: "noticeOn" } })]));
    expect(good.ok).toBe(true);
    expect(good.ok && JSON.stringify(good.tree)).toContain('"showIf":{"setting":"bookingOpen","is":false},"fromSetting":{"text":"hours"}');
    const onPage = checkTree({ version: 1, root: { id: "page", type: "page", props: { showIf: { setting: "x" } }, children: [] } });
    expect(onPage.ok).toBe(false);
    expect(checkTree(T([sec("s", [], { showIf: { setting: "Bad key" } })])).ok).toBe(false);
    expect(checkTree(T([sec("s", [text("a", "x", { fromSetting: {} })])])).ok).toBe(false);
  });
});

describe("A function's steps", () => {
  const def = (text: string): FnDef => ({ inputs: [], do: [{ act: "notify", title: text }] });
  test("name its site's settings: none in a site that has some, one it doesn't declare, or no name, are said before publishing", () => {
    const known = { tables: [], fns: [] };
    expect(problemsOf(def("{{settings.notifyOn}}"), { ...known, settings: ["notifyOn"] })).toEqual([]);
    expect(problemsOf(def("{{settings.notifyOn}}"), known)).toEqual([{ at: "do.0", message: "This function isn't part of a site that has settings" }]);
    expect(problemsOf(def("{{settings.gone}}"), { ...known, settings: ["notifyOn"] })).toEqual([{ at: "do.0", message: 'Its site has no setting called "gone"' }]);
    expect(problemsOf(def("{{settings}}"), { ...known, settings: ["notifyOn"] })).toEqual([{ at: "do.0", message: "Name one setting: {{settings.its-key}}" }]);
    // A name of the function's own called "settings" is its own.
    expect(problemsOf({ inputs: [], do: [{ act: "set", name: "settings", value: 1 }, { act: "notify", title: "{{settings}}" }] } as FnDef, known)).toEqual([]);
  });
});
