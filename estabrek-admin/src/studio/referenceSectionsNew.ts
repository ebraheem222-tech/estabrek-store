import type { PageTreeNode as N } from "../api/pages.api";
import type { Lang } from "../lib/lang";

const w = (ar: string, en: string, he: string) => ({ ar, en, he });
export const NEW_REFERENCE_SECTIONS = [
  {kind: "reference-snapx", source: "576", name: w("مسابقة ومعرض تصوير", "Photography showcase", "תצוגת צילום")},
  {kind: "reference-liberty", source: "577", name: w("سوق مجموعات داكن", "Dark collection market", "שוק קולקציות כהה")},
  {kind: "reference-first", source: "578", name: w("بورتفوليو دائري", "Circular portfolio", "תיק עבודות עגול")},
  {kind: "reference-cyborg", source: "579", name: w("مكتبة ألعاب نيون", "Neon gaming library", "ספריית משחקי ניאון")},
  {kind: "reference-tale", source: "582", name: w("حكاية وخدمات متدرجة", "Agency service journey", "מסלול שירותי סוכנות")},
  {kind: "reference-festava", source: "583", name: w("جدول حفلات وفعاليات", "Festival timetable", "לוח הופעות ואירועים")},
  {kind: "reference-podtalk", source: "584", name: w("بودكاست ولقاءات", "Podcast editorial", "פודקאסט וראיונות")},
  {kind: "reference-scholar", source: "586", name: w("دورات ومواعيد تعليم", "Courses and lessons", "קורסים ושיעורים")},
  {kind: "reference-tiya", source: "587", name: w("مقارنة العضويات", "Membership comparison", "השוואת מסלולי חברות")},
  {kind: "reference-ebook", source: "588", name: w("فصول كتاب قابلة للتحرير", "Editable book chapters", "פרקי ספר לעריכה")},
  {kind: "reference-lugx", source: "589", name: w("عرض ألعاب وبطاقات", "Gaming feature cards", "כרטיסי משחקים")},
  {kind: "reference-topic", source: "590", name: w("اكتشاف مواضيع بتبويبات", "Tabbed topic discovery", "גילוי נושאים בלשוניות")},
  {kind: "reference-villa", source: "591", name: w("معرض عقارات بفلترة", "Property discovery", "חיפוש נכסים")},
  {kind: "reference-glossy", source: "592", name: w("خدمات بلوحات زجاجية", "Glass service panels", "לוחות שירות מזכוכית")},
  {kind: "reference-nexus", source: "594", name: w("طرفية وخلفية Matrix", "Matrix terminal", "מסוף מטריקס")},
] as const;

const pictures: Record<string, string[]> = {
  "576": ["assets/images/banner-bg.jpg", "assets/images/closed-01.jpg"],
  "577": ["assets/images/banner-01.png"],
  "578": ["images/happy-bearded-young-man.jpg", "images/couple-working-from-home-together-sofa.jpg"],
  "579": ["assets/images/banner-bg.jpg", "assets/images/clip-01.jpg", "assets/images/clip-02.jpg"],
  "582": ["assets/images/about-us-image.jpg", "assets/images/banner-right.png"],
  "583": ["images/artists/abstral-official-bdlMO9z5yco-unsplash.jpg", "images/artists/soundtrap-rAT6FJ6wltE-unsplash.jpg"],
  "584": ["images/medium-shot-young-people-recording-podcast.jpg"],
  "586": ["assets/images/banner-item-01.jpg", "assets/images/banner-item-02.jpg", "assets/images/banner-item-03.jpg"],
  "587": ["images/girl-taking-selfie-with-friends-golf-field.jpg"],
  "588": ["images/education-online-books.png", "images/businessman-sitting-by-table-cafe.jpg"],
  "589": ["assets/images/banner-image.jpg", "assets/images/categories-01.jpg"],
  "590": ["images/businesswoman-using-tablet-analysis.jpg", "images/colleagues-working-cozy-office-medium-shot.jpg"],
  "591": ["assets/images/banner-01.jpg", "assets/images/banner-02.jpg", "assets/images/banner-03.jpg"],
  "592": ["images/templatemo-futuristic-girl.jpg"],
};

/** Native starter sections; every image, label, cell and interaction remains editable. */
export function makeNewReferenceSection(kind: string, lang: Lang, ids: (prefix: string) => string, src?: string): N | null {
  const reference = NEW_REFERENCE_SECTIONS.find(r => r.kind === kind);
  if (!reference) return null;
  const one = (ar: string, en: string, he: string) => ({ [lang]: w(ar, en, he)[lang] });
  const node = (type: string, props: Record<string, unknown>, style?: Record<string, unknown>, children?: N[]): N => ({id: ids(type.slice(0,5)), type, props, ...(style ? {style: {base: style}} : {}), ...(children ? {children} : {})});
  const stack = (children: N[], style: Record<string, unknown> = {}) => node("stack", {}, {gap: 24, ...style}, children);
  const grid = (children: N[], columns = 3): N => ({...node("grid", {}, {columns, gap: 24}, children), style: {base: {columns, gap: 24}, mobile: {columns: 1}}});
  const heading = (text = {[lang]: reference.name[lang]}, size = 44) => ({...node("heading", {text, level: 2}, {size, lineHeight: 1.1, balance: "balance"}), style: {base: {size, lineHeight: 1.1, balance: "balance"}, mobile: {size: Math.min(size, 32)}}});
  const text = (value = one("عدّل النصوص والصور والتفاصيل لتناسب قصتك.", "Edit the copy, pictures and details to tell your story.", "ערכו טקסטים, תמונות ופרטים כדי לספר את הסיפור שלכם.")) => node("text", {text: value}, {size: 17, lineHeight: 1.7});
  const button = () => node("button", {label: one("اكتشف المزيد", "Explore more", "לגלות עוד"), href: "/shop", variant: "solid"});
  const picture = (index = 0) => src || `/templates/references/${reference.source}/${pictures[reference.source]?.[index % pictures[reference.source].length]}`;
  const image = (index = 0, extra = {}) => node("image", {src: picture(index), alt: {[lang]: reference.name[lang]}}, {width: "100%", aspect: "4 / 3", fit: "cover", radius: 20, ...extra});
  const items = () => [0,1,2].map(i => ({title: one(`اختيار ${i+1}`, `Selection ${i+1}`, `בחירה ${i+1}`), text: one("تفاصيل تختارها وتعدّلها.", "Details for you to choose and edit.", "פרטים לבחירה ולעריכה."), category: i % 2 ? one("مختارات", "Featured", "מומלצים") : one("المجموعة", "Collection", "קולקציה"), image: picture(i), href: "/shop", cta: one("عرض التفاصيل", "View details", "לפרטים")}));
  const gallery = (layout = "grid") => node("filterGallery", {label: {[lang]: reference.name[lang]}, items: items(), layout, columns: 3, gap: 24, hoverEffect: "zoom", lightbox: true, searchable: true});
  const deck = (vertical = false) => {
    const panels = [0,1,2].map(i => stack([heading(one(`فصل ${i+1}`, `Chapter ${i+1}`, `פרק ${i+1}`), 32), text(), image(i), button()]));
    return node("deck", {presentation: vertical ? "vertical-tabs" : "tabs", transition: "fade", duration: .45, labels: Object.fromEntries(panels.map((p,i) => [p.id, one(`جزء ${i+1}`, `Part ${i+1}`, `חלק ${i+1}`)]))}, undefined, panels);
  };
  const schedule = (layout: string) => node("schedule", {label: {[lang]: reference.name[lang]}, layout, filterDays: true, showLocation: true, items: [0,1,2].map(i => ({day: i === 2 ? one("اليوم الثاني", "Day two", "יום שני") : one("اليوم الأول", "Day one", "יום ראשון"), time: ["18:00", "19:30", "17:00"][i], title: one(`جلسة ${i+1}`, `Session ${i+1}`, `מפגש ${i+1}`), text: one("أضف تفاصيل البرنامج هنا.", "Add your programme details here.", "הוסיפו כאן את פרטי התוכנית."), location: one("المكان", "Venue", "מקום")}))});
  const comparison = () => node("comparison", {label: {[lang]: reference.name[lang]}, stickyHeader: true, columns: [0,1,2].map(i => ({title: one(`خيار ${i+1}`, `Option ${i+1}`, `אפשרות ${i+1}`), highlight: i === 1, href: "/contact", cta: one("استفسر", "Enquire", "לבירור")})), rows: [0,1,2].map(i => ({label: one(`ميزة ${i+1}`, `Feature ${i+1}`, `תכונה ${i+1}`), values: [0,1,2].map(j => ({state: i <= j ? "yes" : "no"}))})), caption: one("عدّل الميزات لتطابق باقاتك.", "Edit the features to match your plans.", "ערכו את התכונות בהתאם למסלולים שלכם.")});
  let children: N[] = [], paint: Record<string, unknown> = {}, props: Record<string, unknown> = {};
  switch (kind) {
    case "reference-snapx": children = [heading(), text(), gallery("masonry")]; paint = {bg: "#f6fbff", color: "#163751"}; break;
    case "reference-liberty": children = [stack([heading(), text(), button()], {maxWidth: "700px"}), node("showcase", {label: {[lang]: reference.name[lang]}, items: items(), layout: "horizontal", height: 440, ratio: 4, activation: "click", duration: .6, overlay: .45})]; paint = {bg: "#211d32", color: "#f4f0ff"}; break;
    case "reference-first": children = [grid([image(0, {radius: 999, aspect: "1 / 1"}), stack([heading(), text(), button()])], 2)]; paint = {bg: "#e7f6ee", color: "#153d32"}; break;
    case "reference-cyborg": children = [heading(), node("slider", {effect: "coverflow", aspect: "16 / 9", arrows: true, dots: true, progress: true, slides: items().map(i => ({kind: "image", src: i.image, alt: i.title, title: i.title, href: i.href, cta: i.cta}))}), gallery("bento")]; paint = {bg: "#202027", color: "#fff0f8"}; break;
    case "reference-tale": children = [grid([stack([heading(), text(), button()]), image(0)], 2), grid([0,1,2].map(i => stack([heading(one(`0${i+1}`, `0${i+1}`, `0${i+1}`), 40), text()], {bg: "#f1e6ff", radius: 24, pad: [28,24,28,24]})))]; break;
    case "reference-festava": children = [heading(), text(), schedule("table")]; paint = {bg: "#231520", color: "#fff8e6"}; break;
    case "reference-podtalk": children = [grid([image(), stack([heading(), text(), button()])], 2), gallery()]; paint = {bg: "#e0f4f2", color: "#17363d"}; break;
    case "reference-scholar": children = [heading(), gallery(), schedule("cards")]; paint = {bg: "#f0edff", color: "#2d2352"}; break;
    case "reference-tiya": children = [heading(), text(), comparison()]; paint = {bg: "#f3f2e7", color: "#263c31"}; break;
    case "reference-ebook": children = [grid([image(0, {aspect: "3 / 4"}), stack([heading(), text(), button()])], 2), deck(true)]; paint = {bg: "#faf4e9", color: "#40332a"}; break;
    case "reference-lugx": children = [grid([stack([heading(), text(), button()]), image(0, {aspect: "3 / 4"})], 2), gallery()]; paint = {bg: "#073d9a", color: "#ffffff"}; break;
    case "reference-topic": children = [heading(), text(), deck()]; paint = {bg: "#e5f5f1", color: "#194b47"}; break;
    case "reference-villa": children = [heading(), gallery(), comparison()]; paint = {bg: "#f6f4ef", color: "#292d29"}; break;
    case "reference-glossy": children = [stack([heading(), text(), button()], {bg: "#ffffff10", backdrop: {blur: 20}, border: {width: 1, color: "#ffffff30"}, radius: 28, pad: [40,32,40,32]}), deck()]; paint = {bg: "#17192f", color: "#f3edff"}; break;
    case "reference-nexus": children = [text(one("SYSTEM / READY", "SYSTEM / READY", "SYSTEM / READY")), heading(), text(), grid([0,1,2].map(i => stack([heading(one(`وحدة ${i+1}`, `Module ${i+1}`, `מודול ${i+1}`), 28), text(), button()], {bg: "#0c1222cc", border: {width: 1, color: "#55f4de44"}, pad: [28,24,28,24]})))]; paint = {bg: "#10071c", color: "#e7fff9"}; props = {scene: {kind: "matrix", color: "#53f1d6", secondary: "#db8cff", amount: 32, speed: .7, intensity: .5, interactive: true}}; break;
    default: return null;
  }
  return {id: ids("sec"), type: "section", name: reference.name.en, props: {contained: true, ...props}, style: {base: {pad: [88,24,88,24], ...paint}, mobile: {pad: [48,16,48,16]}}, children};
}
