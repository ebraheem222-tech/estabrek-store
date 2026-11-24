// The library items the shop carries (docs/themes-library-plan.ar.md). The proof: one whole site and ten
// sections of different kinds; the rest of the library joins this list once the proof is right.
// id: the item's own name in the shop; file: in the Themes folder; exp: its export (default for a whole site);
// kind: what it is; brand: the made-up name the owner's store name replaces; minH: its height while it loads.
export const ITEMS = [
  { id: "site-maison", kind: "site", name: { ar: "ميزون لون: متجر أزياء فاخر", en: "Maison Lune: luxury fashion store", he: "מזון לון: חנות אופנת יוקרה" }, file: "Templates/src/sites/maison.jsx", exp: "default", brand: "Maison Lune", minH: 900 },
  { id: "nav-glass-pill", kind: "navbar", name: { ar: "شريط زجاجي", en: "Glass pill bar", he: "סרגל זכוכית" }, file: "Navbars/src/navbars.jsx", exp: "GlassPillNav", minH: 380 },
  { id: "hero-aurora", kind: "hero", name: { ar: "افتتاحية الشفق (WebGL)", en: "Aurora shader hero (WebGL)", he: "פתיח זוהר (WebGL)" }, file: "Premium/src/premium-a.jsx", exp: "AuroraShaderHero", minH: 720 },
  { id: "features-bento", kind: "features", name: { ar: "ميزات بشبكة بينتو", en: "Feature bento", he: "יתרונות ברשת בנטו" }, file: "Features/src/features.jsx", exp: "FeatureBento", minH: 640 },
  { id: "cards-product", kind: "cards", name: { ar: "كروت منتجات", en: "Product cards", he: "כרטיסי מוצרים" }, file: "Cards/src/cards.jsx", exp: "ProductCards", minH: 520 },
  { id: "pricing-three", kind: "pricing", name: { ar: "ثلاث باقات", en: "Three tiers", he: "שלוש חבילות" }, file: "Pricing/src/pricing.jsx", exp: "ThreeTiers", minH: 720 },
  { id: "testimonials-marquee", kind: "testimonials", name: { ar: "جدار آراء متحرّك", en: "Marquee wall", he: "קיר המלצות נע" }, file: "Testimonials/src/testimonials.jsx", exp: "MarqueeWall", minH: 480 },
  { id: "faq-classic", kind: "faq", name: { ar: "أسئلة بأكورديون", en: "Classic accordion", he: "שאלות באקורדיון" }, file: "FAQ/src/faq.jsx", exp: "ClassicAccordion", minH: 640 },
  { id: "cta-conic", kind: "cta", name: { ar: "دعوة بتوهّج دائري", en: "Conic glow call to action", he: "קריאה לפעולה בזוהר מעגלי" }, file: "CTA/src/cta.jsx", exp: "ConicGlowCta", minH: 480 },
  { id: "contact-split", kind: "contact", name: { ar: "تواصل مقسوم", en: "Split contact", he: "יצירת קשר מפוצלת" }, file: "Contact/src/contact.jsx", exp: "SplitContact", minH: 560 },
  { id: "footer-mega", kind: "footer", name: { ar: "فوتر كبير", en: "Mega footer", he: "פוטר גדול" }, file: "Footers/src/footers.jsx", exp: "MegaFooter", minH: 560 },
];

/** The library's own animations (its folders' index.css): renamed lx-… so they never meet the shop's. */
export const KEYFRAMES = [
  "aurora", "blink", "border-spin", "dash", "marquee", "marquee-reverse", "shine",
  "h-blink", "h-confetti", "h-drop", "h-flicker", "h-glitch-1", "h-glitch-2", "h-glitch-skew", "h-grid-move", "h-ground",
  "h-marquee-y", "h-marquee-y-rev", "h-meteor", "h-spin", "h-stripes", "h-twinkle",
  "t-float", "t-grow", "t-pulse-ring", "t-rgb", "t-rise", "t-scroll-x",
];
