/** Original editable compositions demonstrating the 19 newly supplied design references. */
import type { PageTreeNode as N } from "../api/pages.api";
import type { Lang } from "../lib/lang";
import { newElement, type Ids, type NewKind } from "./columns";

const w = (ar: string, en: string, he: string) => ({ ar, en, he });
export const REFERENCE_SECTIONS = [
  { kind: "reference-neural", source: "597", name: w("زجاج وشبكة تفاعلية", "Neural glass", "זכוכית ורשת") },
  { kind: "reference-sleeky", source: "598", name: w("سلايدر شرائح ثلاثية الأبعاد", "Sliced cube slider", "סליידר קובייה מחולקת") },
  { kind: "reference-noir", source: "599", name: w("معرض أزياء سينمائي", "Noir fashion gallery", "גלריית אופנה קולנועית") },
  { kind: "reference-summit", source: "601", name: w("موعد وبرنامج مناسبة", "Event agenda", "תוכנית אירוע") },
  { kind: "reference-graph", source: "602", name: w("مساحة رسوم وبيانات", "Graph studio", "סטודיו לתרשימים") },
  { kind: "reference-piano", source: "604", name: w("بيانو وثلوج", "Snow piano", "פסנתר ושלג") },
  { kind: "reference-countdown", source: "605", name: w("مناسبة بعد تنازلي", "Seasonal countdown", "ספירה לאירוע") },
  { kind: "reference-guitar", source: "606", name: w("غيتار تفاعلي", "String studio", "סטודיו למיתרים") },
  { kind: "reference-quantix", source: "614", name: w("تبويبات وباقات", "SaaS feature studio", "סטודיו לתכונות וחבילות") },
  { kind: "reference-amber", source: "615", name: w("معرض بطاقات مجسّمة", "Amber coverflow", "גלריית כרטיסים תלת ממדית") },
  { kind: "reference-split", source: "616", name: w("قائمة ومعاينة متزامنة", "Split index", "אינדקס מפוצל") },
  { kind: "reference-pixel", source: "617", name: w("معرض إبداع بفلترة", "Creative filter gallery", "גלריה יצירתית עם סינון") },
  { kind: "reference-catalyst", source: "618", name: w("خطط وأسئلة تفاعلية", "Plans and questions", "חבילות ושאלות") },
  { kind: "reference-axis", source: "619", name: w("بطاقات تتراكم أثناء التمرير", "Stacking process cards", "כרטיסים נערמים בגלילה") },
  { kind: "reference-luminary", source: "621", name: w("ضوء يتبع المؤشر", "Grid spotlight", "זרקור ברשת") },
  { kind: "reference-clearwave", source: "622", name: w("معرض هواتف مجسّم", "Phone coverflow", "גלריית טלפונים תלת ממדית") },
  { kind: "reference-novapay", source: "623", name: w("مزايا ومعاينة ثابتة", "Linked feature panels", "לוחות תכונות מקושרים") },
  { kind: "reference-folio", source: "625", name: w("عرض قصصي بالشرائح", "Editorial slide deck", "מצגת סיפור עריכתית") },
  { kind: "reference-celadon", source: "633", name: w("ألواح تتمدد ومعرض بطاقات", "Celadon panels", "לוחות וגלריית כרטיסים") },
] as const;
export type ReferenceKind = typeof REFERENCE_SECTIONS[number]["kind"];

export function makeReferenceSection(kind: string, lang: Lang, ids: Ids, src?: string): N | null {
  const reference = REFERENCE_SECTIONS.find(item => item.kind === kind);
  if (!reference) return null;
  const one = (ar: string, en: string, he: string) => ({ [lang]: w(ar, en, he)[lang] });
  const art = (family = "kinetic", n = 1) => src || `/templates/experimental/${family}-${n}.svg`;
  const node = (type: string, props: Record<string, unknown>, style?: Record<string, unknown>, children?: N[]): N => ({ id: ids(type.slice(0, 5)), type, props, ...(style ? { style: { base: style } } : {}), ...(children ? { children } : {}) });
  const h = (text: Record<string, string>, size = 52) => node("heading", { text, level: 2 }, { size, sizeMin: 28, balance: "balance", lineHeight: 1.15 });
  const p = (text: Record<string, string>) => node("text", { text }, { size: 17, lineHeight: 1.7, maxWidth: "680px" });
  const button = () => node("button", { label: one("اكتشف المجموعة", "Explore the collection", "גלו את הקולקציה"), href: "/shop", variant: "solid" });
  const stack = (children: N[], style?: Record<string, unknown>) => node("stack", {}, { gap: 24, ...style }, children);
  const grid = (children: N[], columns = 3) => ({ ...node("grid", {}, { columns, gap: 24 }, children), style: { base: { columns, gap: 24 }, mobile: { columns: 1 } } });
  const heading = () => h({ [lang]: reference.name[lang] });
  const description = () => p(one("تفاصيل تحكي قصتك. اكتشف المجموعة واختَر ما يناسبك.", "Details that tell your story. Explore the collection and find what fits.", "פרטים שמספרים את הסיפור שלכם. גלו את הקולקציה ובחרו מה שמתאים."));
  const galleryItems = () => [1, 2, 3].map((n, index) => ({ title: one(`مجموعة ${n}`, `Collection ${n}`, `קולקציה ${n}`), image: art(kind === "reference-noir" ? "lantern" : "kinetic", n), category: one(index % 2 ? "تفاصيل" : "أفكار", index % 2 ? "Details" : "Ideas", index % 2 ? "פרטים" : "רעיונות"), text: one("شكل ولون وتفاصيل على طريقتك.", "Form, colour and details, your way.", "צורה, צבע ופרטים בדרך שלכם."), href: "/shop", cta: one("اكتشف", "Explore", "לגלות") }));
  const gallery = (layout: string) => node("filterGallery", { items: galleryItems(), layout, columns: 3, gap: 20, activation: "hover", hoverEffect: "zoom", searchable: layout !== "split", lightbox: true });
  const slider = (effect: string, extra?: Record<string, unknown>) => node("slider", { effect, duration: .8, loop: true, arrows: true, dots: true, progress: true, thumbnails: true, aspect: "16 / 9", slides: galleryItems().map(item => ({ src: item.image, kind: "image", alt: item.title, title: item.title, text: item.text, cta: item.cta, href: item.href })), ...extra }, { width: "100%" });
  const instrument = (instrumentKind: "piano" | "guitar") => node("instrument", { kind: instrumentKind, sound: false, volume: .25, octave: 4, octaves: 2, frets: 8, waveform: "triangle", sustain: .8, melody: instrumentKind === "piano" ? "arpeggio" : "chords", tempo: 100, label: { [lang]: reference.name[lang] } });
  const faq = () => node("accordion", { single: false, controls: true, look: "cards", items: [
    { q: one("كيف أختار؟", "How do I choose?", "איך בוחרים?"), a: one("تصفح التفاصيل المتاحة في صفحة كل قطعة.", "Browse the available details on each item page.", "עיינו בפרטים הזמינים בעמוד של כל פריט.") },
    { q: one("كيف أتواصل معكم؟", "How can I contact you?", "איך יוצרים קשר?"), a: one("تواصل معنا من صفحة التواصل لأي سؤال.", "Use the contact page for any questions.", "השתמשו בעמוד יצירת הקשר לכל שאלה.") },
  ] });
  const pricing = () => node("pricing", { billing: true, initialBilling: "monthly", items: [1, 2].map((n) => ({ name: one(`خيار ${n}`, `Option ${n}`, `אפשרות ${n}`), price: one("تواصل للسعر", "Request a quote", "פנו לקבלת מחיר"), yearlyPrice: one("تواصل للسعر السنوي", "Request an annual quote", "פנו לקבלת מחיר שנתי"), cta: one("تواصل", "Contact", "יצירת קשר"), href: "/contact", features: one("اختر التفاصيل المناسبة لك.", "Choose the details that work for you.", "בחרו את הפרטים שמתאימים לכם.") })) });
  const scene = (sceneKind: string, color = "#8db2d5", interactive = false) => ({ kind: sceneKind, color, secondary: "#d7b38a", amount: 32, speed: .6, intensity: .7, interactive });
  let children: N[];
  let background: Record<string, unknown> = {};
  let paint: Record<string, unknown> = {};
  switch (kind) {
    case "reference-neural":
      background = { scene: scene("constellation", "#8db5ff", true) };
      paint = { bg: "#101827", color: "#eef3fa" };
      children = [stack([heading(), description(), button()], { maxWidth: "760px", pad: [40, 32, 40, 32], bg: "#ffffff0f", backdrop: { blur: 18 }, border: { color: "#ffffff30", width: 1 }, radius: 24 })]; break;
    case "reference-sleeky": children = [heading(), slider("slices", { autoplay: 5, captionPosition: "bottom" })]; break;
    case "reference-noir": paint = { bg: "#151318", color: "#f4ede5" }; children = [heading(), slider("zoom", { autoplay: 6, captionPosition: "center", thumbnails: false }), gallery("grid")]; break;
    case "reference-summit": children = [heading(), description(), newElement("countdown", lang, ids), node("tabs", { look: "boxed", items: [1, 2, 3].map(n => ({ label: one(`جزء ${n}`, `Part ${n}`, `חלק ${n}`), text: one("العناوين والمواعيد والتفاصيل المهمة لمناسبتك.", "The topics, times and details for your event.", "הנושאים, הזמנים והפרטים של האירוע שלכם.") })) }), faq()]; background = { scene: scene("constellation") }; break;
    case "reference-graph": {
      const chart = (chartKind: string) => node("chart", { kind: chartKind, label: one("بياناتك", "Your data", "הנתונים שלכם"), items: [1, 2, 3].map(n => ({ label: one(`بند ${n}`, `Item ${n}`, `פריט ${n}`), value: 0, color: ["#85a9e8", "#d8ae7b", "#81b8aa"][n - 1] })), showValues: true });
      children = [heading(), description(), grid([chart("line"), chart("bar"), chart("donut")])]; background = { scene: scene("grid") }; break;
    }
    case "reference-piano": background = { scene: scene("snow", "#dbe9ff") }; paint = { bg: "#192d34", color: "#f3efe4" }; children = [heading(), description(), instrument("piano")]; break;
    case "reference-countdown": background = { scene: scene("snow", "#ffedbf") }; paint = { bg: "#203b37", color: "#fff0cb", textAlign: "center" }; children = [heading(), description(), newElement("countdown", lang, ids), button()]; break;
    case "reference-guitar": children = [heading(), description(), instrument("guitar")]; paint = { bg: "#1e2522", color: "#f4e7ce" }; break;
    case "reference-quantix": background = { scene: scene("orbs", "#9d8fda") }; children = [heading(), node("tabs", { look: "boxed", items: galleryItems().map(item => ({ label: item.title, text: item.text, image: item.image })) }), pricing()]; break;
    case "reference-amber": paint = { bg: "#f2e8d8", color: "#332b22" }; children = [heading(), description(), slider("coverflow", { zoom: 1.1 })]; break;
    case "reference-split": children = [heading(), gallery("split")]; break;
    case "reference-pixel": background = { scene: scene("starfield", "#ab9bff") }; children = [heading(), description(), gallery("masonry")]; break;
    case "reference-catalyst": children = [heading(), pricing(), faq()]; background = { scene: scene("ribbons", "#8bafce") }; break;
    case "reference-axis": {
      paint = { bg: "#ecebe3", color: "#222722" };
      const cards = [1, 2, 3].map((n, index) => stack([node("text", { text: one(`0${n} / التفاصيل`, `0${n} / DETAILS`, `0${n} / פרטים`) }, { font: "mono", size: 14 }), h(one(`زاوية ${n} من الحكاية`, `Perspective ${n} of the story`, `זווית ${n} של הסיפור`)), description(), button()], { minHeight: "60vh", sticky: { top: 24 + index * 24 }, z: index + 1, bg: ["#e2e5d4", "#d3d9ca", "#bdc7bb"][index], color: "#222722", pad: [48, 32, 48, 32], border: { color: "#36433555", width: 1 } }));
      children = [heading(), node("clock", { timezone: "UTC", seconds: true, format: "24", label: one("التوقيت العالمي", "Universal time", "זמן אוניברסלי") }), stack(cards, { gap: 40 })]; break;
    }
    case "reference-luminary": background = { scene: scene("grid", "#bedbd2", true) }; paint = { bg: "#112523", color: "#eff8ee" }; children = [heading(), description(), grid([1, 2, 3].map(n => stack([h(one(`فكرة ${n}`, `Idea ${n}`, `רעיון ${n}`), 32), description()], { pad: [28, 24, 28, 24], bg: "#ffffff10", backdrop: { blur: 16 }, radius: 18 }))), button()]; break;
    case "reference-clearwave": children = [heading(), slider("coverflow", { aspect: "9 / 16", zoom: .85, autoplay: 5 })]; background = { scene: scene("waves", "#8db5c4") }; break;
    case "reference-novapay": children = [heading(), description(), gallery("split"), newElement("model3d", lang, ids)]; children.at(-1)!.props = { ...children.at(-1)!.props, model: "phone", drag: true, tilt: true, anim: { type: "float", speed: .5 } }; break;
    case "reference-folio": children = [heading(), slider("wipe", { axis: "y", captionPosition: "split", autoplay: undefined, thumbnails: false })]; children[1].style = { base: { height: "80vh", width: "100%" }, mobile: { height: "680px" } }; break;
    case "reference-celadon": background = { scene: scene("orbs", "#a5bdac", true) }; children = [heading(), node("showcase", { height: 480, activation: "hover", ratio: 4, duration: .7, overlay: .45, items: galleryItems() }), slider("coverflow", { thumbnails: false, progress: true })]; break;
    default: return null;
  }
  return { id: ids("sec"), type: "section", name: reference.name.en, props: { contained: true, ...background }, style: { base: { pad: [88, 24, 88, 24], ...paint }, mobile: { pad: [48, 16, 48, 16] } }, children };
}
