import type { Words } from "../../types";
import { BTN, CATS, EB, H, PIC, SHELF, T, part, type Sample, type TK } from "../lib";
import { MODERN as M } from "../modern";
import { OPENINGS as O, PARTS as P } from "../sections";
import { cols, el, grid, row, stack, t, type Node } from "../tree";
import type { Industry } from "./industries";
import { expandedOpening } from "./catalogOpenings";

const W = {
  shop: t("اكتشف المجموعة|Explore the collection|לגלות את הקולקציה"),
  fresh: t("اختيارات تستكشفها|Explore the selection|גלו את המבחר"),
  browse: t("تصفّح الأقسام|Browse collections|עיינו בקטגוריות"),
  story: t("وراء التفاصيل|Behind the details|מאחורי הפרטים"),
  guide: t("دليل الاختيار|A guide to choosing|מדריך לבחירה"),
  newsletter: t("خلّيك قريب|Stay in the loop|נשארים בעניינים"),
  email: t("جديد المجموعة وأفكار لتجربها، على بريدك.|New collections and ideas to explore, in your inbox.|קולקציות חדשות ורעיונות לגלות, בתיבת הדואר."),
  question: t("كيف أختار المنتج المناسب؟|How do I choose the right product?|איך בוחרים את המוצר המתאים?"),
  help: t("محتاج مساعدة؟|Need a hand?|צריכים עזרה?"),
  contact: t("تواصل معنا من صفحة التواصل، وبنساعدك تختار.|Visit our contact page and we'll help you choose.|בקרו בדף יצירת הקשר ונעזור לכם לבחור."),
  visit: t("تواصل معنا|Get in touch|צרו קשר"),
  about: t("عن المتجر|About the store|על החנות"),
  read: t("قبل ما تختار|Before you choose|לפני שבוחרים"),
};

export const SECTION_COUNTS = { collections: 10, merchandise: 14, story: 12, guide: 12, gallery: 10, help: 8, letter: 8 } as const;
export type SectionFamily = keyof typeof SECTION_COUNTS;
export type SectionRecipe = `${SectionFamily}:${number}`;

function content(d: Industry) {
  const samples: Sample[] = d.products.map((name, i) => ({ name, pic: `product-${i + 1}`, price: String([120, 180, 240, 95, 160, 210][i]) }));
  return {
    samples,
    cats: d.collections.map((name, i) => ({ name, pic: `product-${i + 1}` })),
    details: d.details.map((title, i) => ({ title, text: d.guide, pic: `product-${i + 1}` })),
    faq: [{ q: W.question, a: d.guide }, { q: W.help, a: W.contact }],
  };
}

/** Original compositions share editor primitives; no layout depends on a template ID or renderer exception. */
export function catalogOpening(k: TK, d: Industry, opening: string): Node {
  const expanded = expandedOpening(k, d, opening);
  if (expanded) return expanded;
  const c = content(d);
  const hero = { eyebrow: d.label, title: d.title, sub: d.intro, cta: W.shop, pic: "hero" };
  const brand = k.demo ? d.brand : t("{{store.name}}");
  const points = c.details.map((x, i) => ({ x: 20 + i * 27, y: 25 + i * 18, title: x.title, text: x.text }));
  switch (opening) {
    case "street": return O.giantWord(k, { ...hero, word: brand });
    case "runner": return O.splitTilt(k, { ...hero, badge: d.label });
    case "atelier": return O.cinematic(k, hero);
    case "playground": return O.bubbles(k, hero);
    case "quiet": return O.quiet(k, hero);
    case "retro": return O.poster(k, { ...hero, badge: d.label });
    case "edit": return O.cover(k, { ...hero, issue: brand, body: d.story });
    case "trail": return O.landscape(k, { ...hero, stats: d.details.map((label, i) => [t(`0${i + 1}`), label]) });
    case "lab":
    case "night": return O.specs(k, { ...hero, points, numbers: d.details.map((label, i) => [`0${i + 1}`, label]) });
    case "gallery": return part(k, d.label, [
      cols(k, [5, 7], [
        [EB(k, d.label), H(k, d.title, 1), T(k, d.intro), BTN(k, W.shop, "/shop")],
        [grid(k, 2, [PIC(k, "hero", d.title, { aspect: "3 / 4", style: { row: "span 2", height: "100%" } }), PIC(k, "product-2", d.products[1], { aspect: "1 / 1" }), PIC(k, "product-3", d.products[2], { aspect: "1 / 1" })], { phoneColumns: 2, style: { gap: 12 } })],
      ], { style: { align: "center", gap: 44 }, cellStyle: { gap: 20 } }),
    ]);
    case "market": return part(k, d.label, [
      row(k, [stack(k, [EB(k, d.label), H(k, d.title, 1)], { style: { gap: 12, maxWidth: "780px" } }), BTN(k, W.shop, "/shop")], { style: { justify: "between", align: "end", margin: [0, 0, 32, 0] } }),
      cols(k, [8, 4], [[PIC(k, "hero", d.title, { aspect: "16 / 9" })], [T(k, d.intro), CATS(k, c.cats, { look: "pill", columns: 1 })]], { style: { gap: 28 }, cellStyle: { gap: 18 } }),
    ], { pad: [72, 24, 64, 24] });
    case "folio": return part(k, d.label, [
      EB(k, d.label), H(k, d.title, 1, { size: 104 }),
      cols(k, [3, 6, 3], [[T(k, d.intro), BTN(k, W.shop, "/shop")], [PIC(k, "hero", d.title, { aspect: "4 / 5" })], [PIC(k, "product-2", d.products[1], { aspect: "1 / 1" }), T(k, d.story, { size: 14 })]], { style: { align: "end", gap: 28, margin: [32, 0, 0, 0] }, cellStyle: { gap: 16 } }),
    ], { pad: [64, 24, 88, 24] });
    case "panorama": return part(k, d.label, [
      PIC(k, "hero", d.title, { aspect: "21 / 9", plain: true, radius: 0 }),
      cols(k, [7, 5], [[EB(k, d.label), H(k, d.title, 1)], [T(k, d.intro), BTN(k, W.shop, "/shop")]], { style: { gap: 48, align: "end", pad: [40, 24, 24, 24] }, cellStyle: { gap: 14 } }),
    ], { full: true, pad: [0, 0, 32, 0], phonePad: [0, 0, 24, 0] });
    default: return part(k, d.label, [
      cols(k, [3, 6, 3], [
        [EB(k, d.label), ...d.details.map((x) => T(k, x, { size: 14, motion: false }))],
        [H(k, d.title, 1, { style: { textAlign: "center" } }), PIC(k, "hero", d.title, { aspect: "1 / 1" })],
        [T(k, d.intro), BTN(k, W.shop, "/shop")],
      ], { style: { align: "center", gap: 32 }, cellStyle: { gap: 18 } }),
    ]);
  }
}

export function catalogSection(k: TK, d: Industry, recipe: SectionRecipe): Node {
  const [family, index] = recipe.split(":") as [SectionFamily, string];
  const v = Number(index);
  const { samples, cats, details, faq } = content(d);
  const image = (i: number, aspect = "1 / 1") => PIC(k, `product-${i + 1}`, d.products[i], { aspect, href: "/shop" });
  const title = (text: Words) => H(k, text, 2, { style: { margin: [0, 0, 28, 0] } });
  const shelf = (count: number, columns: number, look: "plain" | "boxed" | "round" | "overlay" | "spec", aspect = "1 / 1") => SHELF(k, samples.slice(0, count), { columns, look, aspect });
  const note = (i: number, picture = false) => stack(k, [...(picture ? [image(i, "4 / 3")] : []), H(k, details[i].title, 4, { motion: false }), T(k, d.guide, { size: 15, motion: false })], { style: { gap: 12 } });

  if (family === "collections") {
    switch (v) {
      case 0: return P.categoryList(k, W.browse, cats);
      case 1: return P.categories(k, W.browse, cats, "circle", 4);
      case 2: return P.categories(k, W.browse, cats.slice(0, 3), "overlay", 3);
      case 3: return P.categories(k, W.browse, cats, "tall", 2);
      case 4: return P.categories(k, W.browse, cats, "banner", 2, "surface");
      case 5: return part(k, W.browse, [cols(k, [4, 8], [[EB(k, d.label), H(k, W.browse, 2), T(k, d.intro)], [CATS(k, cats, { look: "square", columns: 2 })]], { style: { align: "start", gap: 40 }, cellStyle: { gap: 16 } })]);
      case 6: return part(k, W.browse, [title(W.browse), cols(k, [7, 5], [[PIC(k, "story", d.label, { aspect: "4 / 3" })], [CATS(k, cats, { look: "pill", columns: 1 }), T(k, d.intro), BTN(k, W.shop, "/shop")]], { style: { gap: 32 }, cellStyle: { gap: 24 } })], { tone: "surface" });
      case 7: return part(k, W.browse, [stack(k, [EB(k, d.label), H(k, W.browse, 2), CATS(k, cats, { look: "pill", columns: 4 })], { style: { gap: 24, align: "center", textAlign: "center" } }), grid(k, 2, [image(0, "16 / 9"), image(2, "16 / 9")], { phoneColumns: 2, style: { margin: [32, 0, 0, 0] } })]);
      case 8: return part(k, W.browse, [cols(k, [3, 9], [[H(k, W.browse, 2), BTN(k, W.shop, "/shop", "alt")], [CATS(k, cats.slice(0, 3), { look: "tall", columns: 3 })]], { style: { gap: 36, align: "end" }, cellStyle: { gap: 24 } })]);
      default: return part(k, W.browse, [row(k, [H(k, W.browse, 2), T(k, d.intro, { style: { maxWidth: "420px" } })], { style: { justify: "between", align: "end", margin: [0, 0, 28, 0] } }), CATS(k, cats.slice(0, 2), { look: "banner", columns: 1 })], { tone: "soft" });
    }
  }

  if (family === "merchandise") {
    switch (v) {
      // The two sample tiles become one live product block when the page is installed.
      case 0: return M.bento(k, W.fresh, [{ kind: "photo", pic: "hero", title: d.title, wide: true }, { kind: "product", item: samples[0] }, { kind: "product", item: samples[1] }, { kind: "cta", title: W.browse, cta: W.shop, wide: true }]);
      case 1: return P.shelfRanked(k, W.fresh, samples);
      case 2: return P.shelfFeatured(k, W.fresh, samples, W.shop);
      case 3: return P.shelf(k, W.fresh, samples, "plain", 4, { aspect: "3 / 4", link: W.shop });
      case 4: return P.shelf(k, W.fresh, samples.slice(0, 4), "round", 4);
      case 5: return P.shelf(k, W.fresh, samples, "boxed", 3, { aspect: "4 / 3" });
      case 6: return P.shelf(k, W.fresh, samples.slice(0, 4), "overlay", 2, { aspect: "4 / 5", eyebrow: d.label });
      case 7: return M.carousel(k, W.fresh, samples);
      case 8: return part(k, W.fresh, [cols(k, [3, 9], [[EB(k, d.label), H(k, W.fresh, 2), T(k, d.intro), BTN(k, W.shop, "/shop", "alt")], [shelf(6, 3, "spec", "3 / 4")]], { style: { align: "start", gap: 36 }, cellStyle: { gap: 18 } })]);
      case 9: return part(k, W.fresh, [title(W.fresh), cols(k, [6, 6], [[PIC(k, "story", d.title, { aspect: "3 / 4" }), T(k, d.story)], [shelf(4, 2, "boxed")]], { style: { align: "start", gap: 28 }, cellStyle: { gap: 16 } })]);
      case 10: return part(k, W.fresh, [cols(k, [8, 4], [[shelf(4, 2, "plain", "4 / 3")], [EB(k, d.label), H(k, W.fresh, 2), T(k, d.guide), BTN(k, W.shop, "/shop")]], { style: { align: "center", gap: 48 }, cellStyle: { gap: 16 } })], { tone: "surface" });
      case 11: return part(k, W.fresh, [stack(k, [EB(k, d.label), H(k, W.fresh, 2), T(k, d.intro, { style: { maxWidth: "620px" } })], { style: { align: "center", textAlign: "center", gap: 12, margin: [0, 0, 36, 0] } }), shelf(3, 3, "plain", "4 / 5"), row(k, [BTN(k, W.shop, "/shop")], { style: { justify: "center", margin: [32, 0, 0, 0] } })]);
      case 12: return part(k, W.fresh, [row(k, [H(k, W.fresh, 2), BTN(k, W.shop, "/shop", "alt")], { style: { justify: "between", margin: [0, 0, 24, 0] } }), cols(k, [4, 8], [[image(0, "4 / 5"), T(k, d.story, { size: 14 })], [shelf(6, 3, "round")]], { style: { align: "start", gap: 28 }, cellStyle: { gap: 14 } })]);
      default: return part(k, W.fresh, [cols(k, [6, 6], [[EB(k, d.label), H(k, W.fresh, 2), T(k, d.guide)], [BTN(k, W.shop, "/shop", "alt")]], { style: { align: "end", gap: 24, margin: [0, 0, 32, 0] }, cellStyle: { gap: 14 } }), shelf(6, 2, "spec", "16 / 9")], { tone: "soft" });
    }
  }

  if (family === "story") {
    switch (v) {
      case 0: return P.chapters(k, W.story, details);
      case 1: return P.essay(k, W.story, d.story, d.title);
      case 2: return M.pinned(k, { eyebrow: d.label, title: W.story, text: d.story, cta: W.shop, pics: details.map((x) => ({ pic: x.pic, caption: x.title })) });
      case 3: return P.wide(k, "story", W.story, d.story, W.shop);
      case 4: return part(k, W.story, [cols(k, [5, 7], [[EB(k, d.label), H(k, W.story, 2), T(k, d.story), BTN(k, W.about, "/about", "alt")], [grid(k, 2, [PIC(k, "story", d.title, { aspect: "3 / 4" }), stack(k, [image(2), T(k, d.intro, { size: 14 })], { style: { gap: 12, pad: [64, 0, 0, 0] } })], { phoneColumns: 2 })]], { style: { gap: 40, align: "center" }, cellStyle: { gap: 18 } })]);
      case 5: return part(k, W.story, [title(d.title), cols(k, [8, 4], [[PIC(k, "story", d.label, { aspect: "16 / 9" })], [EB(k, d.label), T(k, d.story), BTN(k, W.about, "/about", "alt")]], { style: { gap: 36, align: "end" }, cellStyle: { gap: 18 } })], { tone: "surface" });
      case 6: return part(k, W.story, [cols(k, [3, 6, 3], [[EB(k, d.label), H(k, W.story, 3)], [T(k, d.story, { size: 25 }), BTN(k, W.about, "/about", "alt")], [PIC(k, "story", d.title, { aspect: "3 / 4" })]], { style: { gap: 32, align: "start" }, cellStyle: { gap: 20 } })]);
      case 7: return part(k, W.story, [PIC(k, "story", d.title, { aspect: "21 / 9" }), cols(k, [4, 8], [[H(k, W.story, 2)], [T(k, d.story, { size: 22 }), row(k, [EB(k, d.label), BTN(k, W.about, "/about", "alt")], { style: { justify: "between" } })]], { style: { margin: [32, 0, 0, 0], gap: 40 }, cellStyle: { gap: 18 } })]);
      case 8: return part(k, W.story, [stack(k, [EB(k, d.label), H(k, d.title, 2), T(k, d.story, { style: { maxWidth: "760px" } }), BTN(k, W.about, "/about", "alt")], { style: { align: "center", textAlign: "center", gap: 24 } }), grid(k, 3, [image(0, "4 / 3"), image(1, "4 / 3"), image(2, "4 / 3")], { phoneColumns: 1, style: { margin: [40, 0, 0, 0] } })], { tone: "soft" });
      case 9: return part(k, W.story, [cols(k, [6, 6], [[PIC(k, "story", d.title, { aspect: "1 / 1" })], [EB(k, d.label), H(k, d.title, 2), T(k, d.story), grid(k, 2, details.slice(0, 2).map((x) => stack(k, [H(k, x.title, 4), T(k, d.guide, { size: 14 })], { style: { gap: 8 } })), { phoneColumns: 1 })]], { style: { gap: 40, align: "center" }, cellStyle: { gap: 18 } })]);
      case 10: return part(k, W.story, [cols(k, [3, 9], [[H(k, W.story, 2), EB(k, d.label)], [grid(k, 2, [stack(k, [PIC(k, "story", d.title, { aspect: "4 / 5" }), T(k, d.intro)], { style: { gap: 20 } }), stack(k, [T(k, d.story), image(1, "4 / 3"), BTN(k, W.about, "/about", "alt")], { style: { gap: 24 } })], { phoneColumns: 1 })]], { style: { gap: 40, align: "start" }, cellStyle: { gap: 18 } })]);
      default: return part(k, W.story, [row(k, [EB(k, d.label), BTN(k, W.about, "/about", "alt")], { style: { justify: "between" } }), H(k, d.title, 2, { size: 70, style: { margin: [28, 0, 32, 0] } }), cols(k, [5, 7], [[T(k, d.story), T(k, d.intro, { size: 14 })], [PIC(k, "story", d.label, { aspect: "16 / 9" })]], { style: { gap: 40, align: "end" }, cellStyle: { gap: 20 } })]);
    }
  }

  if (family === "guide") {
    switch (v) {
      case 0: return P.layers(k, W.guide, "product-1", details);
      case 1: return P.tabs(k, W.guide, d.guide, details.map((x) => ({ label: x.title, text: x.text, pic: x.pic })), "pills");
      case 2: return P.materials(k, W.guide, details);
      case 3: return P.steps(k, W.guide, details);
      case 4: return P.pointed(k, W.guide, d.intro, "product-1", details.map((x, i) => ({ x: 20 + i * 27, y: 25 + i * 18, title: x.title, text: x.text })));
      case 5: return P.compare(k, W.guide, samples.slice(0, 2).map((x) => ({ pic: x.pic, name: x.name, specs: d.details.map((label) => [label, "—"] as [Words, string]) })));
      case 6: return part(k, W.guide, [cols(k, [4, 8], [[EB(k, d.label), H(k, W.guide, 2), T(k, d.intro)], [stack(k, details.map((x, i) => cols(k, [2, 8], [[T(k, t(`0${i + 1}`), { size: 32 })], [H(k, x.title, 3), T(k, x.text, { size: 15 })]], { style: { gap: 24, align: "start", pad: [24, 0, 24, 0] }, cellStyle: { gap: 8 } })), { style: { gap: 0 } })]], { style: { gap: 40, align: "start" }, cellStyle: { gap: 16 } })]);
      case 7: return part(k, W.guide, [title(W.guide), cols(k, [4, 4, 4], [[note(0, true)], [note(1, true), BTN(k, W.visit, "/contact", "alt")], [note(2, true)]], { style: { gap: 28, align: "start" } })], { tone: "soft" });
      case 8: return part(k, W.guide, [cols(k, [7, 5], [[PIC(k, "product-1", W.guide, { aspect: "4 / 3" }), grid(k, 2, [image(1), image(2)], { phoneColumns: 2, style: { margin: [16, 0, 0, 0] } })], [EB(k, d.label), H(k, W.guide, 2), ...details.map((_, i) => note(i))]], { style: { gap: 40, align: "start" }, cellStyle: { gap: 24 } })]);
      case 9: return part(k, W.guide, [row(k, [H(k, W.guide, 2), T(k, d.intro, { style: { maxWidth: "440px" } })], { style: { justify: "between", align: "end", margin: [0, 0, 32, 0] } }), grid(k, 2, [note(0, true), stack(k, [note(1), note(2), BTN(k, W.visit, "/contact", "alt")], { style: { gap: 28 } })], { style: { gap: 40 } })]);
      case 10: return part(k, W.guide, [cols(k, [3, 9], [[H(k, W.guide, 2)], [T(k, d.guide, { size: 24 }), grid(k, 3, details.map((x, i) => stack(k, [T(k, t(`0${i + 1}`), { size: 42 }), H(k, x.title, 4)], { style: { gap: 12 } })), { phoneColumns: 1, style: { margin: [28, 0, 0, 0] } })]], { style: { gap: 40, align: "start" }, cellStyle: { gap: 20 } })], { tone: "surface" });
      default: return part(k, W.guide, [cols(k, [6, 6], [[EB(k, W.read), H(k, W.guide, 2), T(k, d.guide), BTN(k, W.visit, "/contact")], [grid(k, 2, details.slice(0, 2).map((x, i) => stack(k, [image(i, "4 / 5"), H(k, x.title, 4)], { style: { gap: 12 } })), { phoneColumns: 2 })]], { style: { gap: 48, align: "center" }, cellStyle: { gap: 18 } })]);
    }
  }

  if (family === "gallery") {
    switch (v) {
      case 0: return P.lookbook(k, d.label, samples.slice(0, 5).map((x) => x.pic), d.intro);
      case 1: return P.pair(k, { pic: "product-4", caption: d.products[3] }, { pic: "product-5", caption: d.products[4] });
      case 2: return P.journal(k, W.story, details.map((x) => ({ pic: x.pic, title: x.title, kind: d.label })));
      case 3: return M.glass(k, "story", W.story, details.slice(0, 2), W.shop);
      case 4: return part(k, d.label, [cols(k, [8, 4], [[image(0, "16 / 9")], [image(1), EB(k, d.label), T(k, d.intro, { size: 14 })]], { style: { gap: 20, align: "end" }, cellStyle: { gap: 14 } })]);
      case 5: return part(k, d.label, [title(d.title), grid(k, 4, [image(0, "3 / 4"), image(1, "3 / 4"), image(2, "3 / 4"), image(3, "3 / 4")], { phoneColumns: 2, style: { gap: 12 } }), T(k, d.intro, { size: 15, style: { margin: [24, 0, 0, 0], maxWidth: "620px" } })]);
      case 6: return part(k, d.label, [cols(k, [3, 6, 3], [[image(0, "3 / 4"), T(k, d.products[0], { size: 13 })], [PIC(k, "story", d.title, { aspect: "4 / 5" }), H(k, d.title, 3)], [image(2, "3 / 4"), T(k, d.products[2], { size: 13 })]], { style: { gap: 20, align: "center" }, cellStyle: { gap: 14 } })]);
      case 7: return part(k, d.label, [cols(k, [6, 6], [[H(k, d.title, 2), PIC(k, "story", d.title, { aspect: "16 / 9" })], [grid(k, 2, [image(1), image(2), image(3), image(4)], { phoneColumns: 2, style: { gap: 12 } })]], { style: { gap: 24, align: "end" }, cellStyle: { gap: 28 } })]);
      case 8: return part(k, d.label, [grid(k, 3, [stack(k, [EB(k, d.label), H(k, d.title, 3), T(k, d.intro, { size: 14 })], { style: { gap: 18, justify: "center" } }), image(0, "4 / 5"), image(1, "4 / 5"), image(2, "4 / 3"), image(3, "4 / 3"), image(4, "4 / 3")], { phoneColumns: 2, style: { gap: 16 } })], { tone: "surface" });
      default: return part(k, d.label, [cols(k, [7, 5], [[PIC(k, "story", d.title, { aspect: "4 / 3" })], [EB(k, d.label), H(k, d.title, 3), T(k, d.intro)]], { style: { align: "end", gap: 32 }, cellStyle: { gap: 18 } }), grid(k, 3, [image(2, "16 / 9"), image(3, "16 / 9"), image(4, "16 / 9")], { phoneColumns: 1, style: { margin: [24, 0, 0, 0] } })]);
    }
  }

  if (family === "help") {
    switch (v) {
      case 0: return P.faq(k, W.help, faq, "lines");
      case 1: return P.faq(k, W.help, faq, "cards", "surface");
      case 2: return P.faq(k, W.help, faq, "plus");
      case 3: return part(k, W.help, [stack(k, [H(k, W.help, 2), T(k, W.contact), BTN(k, W.visit, "/contact")], { style: { gap: 18, align: "center", textAlign: "center", maxWidth: "680px", self: "center" } })], { tone: "soft" });
      case 4: return part(k, W.help, [cols(k, [7, 5], [[EB(k, d.label), H(k, W.help, 2), T(k, d.guide)], [T(k, W.contact), BTN(k, W.visit, "/contact")]], { style: { gap: 40, align: "center" }, cellStyle: { gap: 16 } })], { tone: "surface" });
      case 5: return part(k, W.help, [title(W.read), grid(k, 2, faq.map((x) => stack(k, [H(k, x.q, 3), T(k, x.a, { size: 15 })], { style: { gap: 14, pad: [28, 28, 28, 28], bg: "surface", radius: k.s.img.radius } })), { style: { gap: 24 } }), BTN(k, W.visit, "/contact", "alt", { style: { margin: [24, 0, 0, 0], self: "start" } })]);
      case 6: return part(k, W.help, [cols(k, [3, 9], [[H(k, W.help, 3)], [el(k, "accordion", { items: faq, look: "lines", single: true }), row(k, [T(k, W.contact, { size: 14 }), BTN(k, W.visit, "/contact", "alt")], { style: { justify: "between", margin: [24, 0, 0, 0] } })]], { style: { gap: 40, align: "start" } })]);
      default: return part(k, W.help, [cols(k, [4, 4, 4], [[H(k, W.read, 2)], [H(k, details[0].title, 4), T(k, d.guide, { size: 15 })], [H(k, W.help, 4), T(k, W.contact, { size: 15 }), BTN(k, W.visit, "/contact", "alt")]], { style: { gap: 28, align: "start" }, cellStyle: { gap: 16 } })]);
    }
  }

  switch (v) {
    case 0: return P.letterBand(k, W.newsletter, W.email, "soft");
    case 1: return P.letterCentered(k, W.newsletter, W.email, "surface");
    case 2: return P.letterLine(k, W.newsletter);
    case 3: return part(k, W.newsletter, [cols(k, [3, 5, 4], [[EB(k, d.label)], [H(k, W.newsletter, 2), T(k, W.email)], [el(k, "form", { kind: "newsletter" })]], { style: { gap: 28, align: "center" }, cellStyle: { gap: 12 } })], { tone: "soft" });
    case 4: return part(k, W.newsletter, [cols(k, [4, 8], [[PIC(k, "story", d.label, { aspect: "4 / 3" })], [EB(k, d.label), H(k, W.newsletter, 2), T(k, W.email), el(k, "form", { kind: "newsletter" })]], { style: { gap: 40, align: "center" }, cellStyle: { gap: 14 } })], { tone: "surface" });
    case 5: return part(k, W.newsletter, [H(k, W.newsletter, 2, { size: 64 }), cols(k, [6, 6], [[T(k, W.email)], [el(k, "form", { kind: "newsletter" })]], { style: { gap: 40, margin: [28, 0, 0, 0], align: "center" } })]);
    case 6: return part(k, W.newsletter, [cols(k, [7, 5], [[stack(k, [EB(k, d.label), H(k, W.newsletter, 2), el(k, "form", { kind: "newsletter" }), T(k, W.email, { size: 14 })], { style: { gap: 20 } })], [grid(k, 2, [image(0, "4 / 5"), image(1, "4 / 5")], { phoneColumns: 2, style: { gap: 12 } })]], { style: { gap: 40, align: "center" } })], { tone: "soft" });
    default: return part(k, W.newsletter, [grid(k, 2, [stack(k, [H(k, W.newsletter, 2), T(k, W.email)], { style: { gap: 18 } }), stack(k, [EB(k, d.label), el(k, "form", { kind: "newsletter" })], { style: { gap: 18, justify: "center", pad: [32, 32, 32, 32], bg: "surface", radius: k.s.img.radius } })], { style: { gap: 40, align: "center" } })]);
  }
}
