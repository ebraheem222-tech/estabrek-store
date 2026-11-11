import { createHash } from "node:crypto";
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// An HLS stream made by stream-video.spec.ts (ffmpeg), served from here like a video library's.
const STREAM_DIR = path.join(os.tmpdir(), "estabrek-test-stream");
const STREAM_TYPES = { ".m3u8": "application/vnd.apple.mpegurl", ".ts": "video/mp2t" };

const site = {
  id: "test",
  // Admin → Settings → حسابات الزبائن: off like a real new store; account.spec.ts turns it on (/__test/accounts).
  customerAccountsEnabled: false,
  // Admin → بانتظار التوفّر: off like a real new store; stock-alert.spec.ts turns it on (/__test/stock-alerts).
  stockAlertsEnabled: false,
  siteName: "متجر استبرق",
  currencyCode: "ILS",
  contactPhone: "+970599123456",
  contactEmail: "hello@estabrek.test",
  whatsappNumber: "970599123456",
  header: {
    // Admin → هوية المتجر, as the migration sets it for the Estabrek shop; identity.spec.ts swaps it (/__test/identity).
    identity: {
      name: { ar: "متجر استبرق", en: "Estabrek", he: "" },
      shortName: { ar: "استبرق", en: "Estabrek", he: "" },
      tagline: { ar: "", en: "MODESTLY, BEAUTIFULLY YOU", he: "" },
      about: { ar: "حجاب، عبايات، فساتين وملابس محتشمة للنساء.", en: "Hijabs, abayas, dresses and modest clothing for women.", he: "" },
      industry: "fashion",
      audience: "women",
      legalName: "",
    },
    cmsNav: { enabled: false },
    storefront: {
      darkModeDefault: false,
      mobileBottomNavEnabled: false,
      liveChatEnabled: false,
      scrollProgressEnabled: false,
    },
  },
};
const categories = [
  { id: "dresses", name: "فساتين", slug: "dresses" },
  { id: "hijabs", name: "حجاب", slug: "hijabs" },
  { id: "daily-hijabs", name: "حجاب يومي", slug: "daily-hijabs", parentId: "hijabs" },
];
const stockAlerts = [];
// The store's content in English and Hebrew (admin → each product, category, type); off
// by default, POST /__test/content-translations {"on":true} turns it on (languages.spec.ts).
const CONTENT_TR = {
  product: {
    en: { title: "Rose dress", seoTitle: "The rose dress", colors: { Rose: "Blush" } },
    he: { title: "שמלת ורד", description: "שמלה רכה לערב.", colors: { Rose: "ורוד", Berry: "פטל" } },
  },
  category: { en: { name: "Dresses" }, he: { name: "שמלות" } },
  type: {
    he: {
      colorLabel: "צבע",
      sizeLabel: "מידה",
      fields: {
        fabric: { label: "בד", options: { "شيفون": "שיפון", "كريب": "קרפ" } },
        occasion: { label: "אירוע", options: { "سهرة": "ערב", "عرس": "חתונה", "يومي": "יומיומי" } },
        length: { label: "אורך", unit: "ס״מ" },
      },
    },
  },
};
let contentTranslations = false;
const products = [
  {
    id: "coat",
    title: "فستان الورد",
    slug: "rose-dress",
    minPrice: 320.5,
    primaryImageUrl: "http://localhost:3000/editorial/hijab-campaign.webp",
    category: categories[0],
    // Product type fields (product-types.spec.ts): the page shows them, the shop filters by them.
    attributes: { fabric: "شيفون", occasion: ["سهرة", "عرس"], length: 140 },
    type: { id: "ptype_clothes", name: "ملابس", slug: "clothes", colorLabel: "اللون", sizeLabel: "المقاس", showColor: true, showSize: true },
    delivery: { shipsFrom: "رام الله", minDays: 2, maxDays: 4 },
    specs: [
      { key: "fabric", label: "القماش", value: "شيفون", kind: "select", raw: "شيفون" },
      { key: "length", label: "الطول", value: "140 سم", kind: "number", raw: 140 },
      { key: "occasion", label: "المناسبة", value: "سهرة، عرس", kind: "multiselect", raw: ["سهرة", "عرس"] },
    ],
    items: [
      { id: "rose", colorName: "Rose", colorHex: "#c97794", variants: [{ id: "m", sizeId: "m", size: { id: "m", name: "M" }, price: 320.5, stock: 5 }] },
      { id: "berry", colorName: "Berry", colorHex: "#6b2446", variants: [{ id: "berry-m", sizeId: "m", size: { id: "m", name: "M" }, price: 320.5, stock: 5 }, { id: "berry-l", sizeId: "l", size: { id: "l", name: "L" }, price: 320.5, stock: 3 }] },
    ],
    // Its 360° views (product-spin.spec.ts): one for every colour (with a 3D model), Berry's own.
    spins: [
      { id: "spin-all", url: "http://127.0.0.1:4100/uploads/spins/spin-sheet.png", cols: 4, rows: 3, cellW: 120, cellH: 150, count: 12, itemId: null, modelUrl: "http://127.0.0.1:4100/uploads/models/stage-box.glb" },
      { id: "spin-berry", url: "http://127.0.0.1:4100/uploads/spins/spin-sheet.png?c=berry", cols: 4, rows: 3, cellW: 120, cellH: 150, count: 12, itemId: "berry", modelUrl: null },
    ],
  },
  {
    id: "bag",
    title: "شال وردي بتفاصيل ناعمة لإطلالة محتشمة كل يوم",
    slug: "rose-hijab",
    minPrice: 190,
    primaryImageUrl: "http://localhost:3000/editorial/hijab-campaign.webp",
    category: categories[1],
    attributes: { fabric: "كريب", occasion: ["يومي"] },
    items: [{ id: "lilac", colorName: "Lilac", colorHex: "#a08cbd", variants: [{ id: "one", sizeId: "one", size: { id: "one", name: "One size" }, price: 190, stock: 4 }] }],
  },
];
// Seasonal and collection categories: switched on by scenes.spec.ts (/__test/scenes).
const sceneCategories = [
  { id: "winter", name: "شتوي", slug: "winter" },
  { id: "summer", name: "صيفي", slug: "summer" },
  { id: "accessories", name: "إكسسوارات", slug: "accessories" },
  { id: "kids", name: "أطفال", slug: "kids" },
  { id: "incense", name: "بخور", slug: "incense" },
];
const sceneProducts = sceneCategories.flatMap((category) => [1, 2].map((n) => ({
  ...products[1], id: `${category.id}-${n}`, slug: `${category.id}-${n}`, title: `${category.name} ${n}`, category,
})));
let scenesOn = false;
// The new CMS (page-tree.spec.ts): POST /__test/page-tree {"on":true} serves the pages
// converted to a tree (each old section a `legacy` node), as admin's convert does.
let pageTreeOn = false;
let commerceCms = false;
let invalidCommerceCart = false;
let legacyCommerceCart = false;
let visualPageProps = {}, visualShopProps = {};
function commercePage(kind) {
  const part = type => ({ id: `fixture-${type}`, type, props: {} });
  const children = kind === "shop" ? [{ ...part("shop"), props: { columns: 3, mobileColumns: 1, showFilters: true, showSearch: true } }]
    : [{ id: "fixture-columns", type: "columns", props: {}, style: { base: { widths: [2, 1], gap: 24 } }, children: [
      { id: "fixture-left", type: "cell", props: {}, children: [part("cartItems")] },
      { id: "fixture-right", type: "cell", props: {}, children: [part("cartSummary"), ...(invalidCommerceCart ? [] : [part("cartCheckout")])] },
    ] }];
  const page = { id: `commerce-${kind}`, slug: `/${kind}`, name: `CMS ${kind}`, status: "PUBLISHED", format: 2, sections: [], tree: { version: 1, root: { id: "page", type: "page", props: {}, children: [{ id: "fixture-section", type: "section", props: { contained: true }, children: [{ id: "fixture-heading", type: "heading", props: { level: 1, text: { en: `My CMS ${kind}`, ar: `تصميم ${kind}` } } }, ...children] }] } } };
  if (kind === "cart" && legacyCommerceCart) page.tree.root.children[0].children = [{ id: "old-heading", type: "heading", props: { level: 1, text: { en: "Legacy cart design" } } }];
  else page.tree.root.props.commerceVersion = 1;
  Object.assign(page.tree.root.props, visualPageProps);
  if (kind === "shop") Object.assign(children[0].props, visualShopProps);
  return page;
}
const asTreePage = (p) =>
  pageTreeOn
    ? { ...p, format: 2, tree: { version: 1, root: { id: "page", type: "page", children: p.sections.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((s) => ({ id: `s-${s.id}`, type: "legacy", props: { sectionId: s.id } })) } } }
    : p;
// Animated media: a Lottie playing by itself and one following the scroll, a Rive file, snow behind a
// section, and the page scrolling smoothly.
const mediaDemo = {
  id: "media-demo", slug: "/media-demo", name: "Media demo", status: "PUBLISHED", format: 2, sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: { smooth: true },
      children: [
        {
          id: "snowy", type: "section", props: { contained: true, particles: { kind: "snow", color: "#ff0000", amount: 1.5 } }, style: { base: { pad: [60, 24, 60, 24], minHeight: "420px" } },
          children: [
            { id: "lt-auto", type: "lottie", props: { src: "/lottie/pulse.json", label: { ar: "نبض", en: "Pulse", he: "דופק" } }, style: { base: { width: "200px" } } },
            { id: "rv", type: "rive", props: { src: "https://cdn.rive.app/animations/vehicles.riv", stateMachine: "bumpy", play: "view" }, style: { base: { width: "300px", aspect: "4 / 3" } } },
          ],
        },
        // 3D models: a built-in one turning, the shopper may turn it; the store's own file as a link.
        {
          id: "models", type: "section", props: { contained: true }, style: { base: { pad: [40, 24, 40, 24] } },
          children: [
            { id: "m3d-code", type: "model3d", props: { model: "sneaker", finish: "toy", knobs: { nope: 3 }, anim: { type: "spin", speed: 1 }, floor: "shadow", drag: true, label: { ar: "حذاء", en: "Sneaker", he: "נעל" } }, style: { base: { width: "320px" } } },
            { id: "m3d-file", type: "model3d", props: { file: { url: "http://127.0.0.1:4100/uploads/models/stage-box.glb", name: "Box" }, floor: "disc", href: "/shop", drag: true, label: { ar: "صندوق", en: "Box", he: "קופסה" } }, style: { base: { width: "320px" } } },
            { id: "m3d-none", type: "model3d", props: { model: "robot-x" } },
          ],
        },
        { id: "tall", type: "section", props: {}, style: { base: { minHeight: "1200px" } }, children: [{ id: "lt-scroll", type: "lottie", props: { src: "/lottie/pulse.json", play: "scroll" }, style: { base: { width: "200px" } } }] },
        { id: "after", type: "section", props: {}, style: { base: { minHeight: "1200px" } }, children: [{ id: "end-t", type: "text", props: { text: { ar: "النهاية", en: "The end", he: "הסוף" } } }] },
      ],
    },
  },
};
// Eight 3D models at once: only a few canvases live together, the rest wait their turn.
const modelsDemo = {
  id: "models-demo", slug: "/models-demo", name: "Models demo", status: "PUBLISHED", format: 2, sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {},
      children: [
        {
          id: "many", type: "section", props: { contained: true }, style: { base: { pad: [20, 20, 20, 20] } },
          children: ["mug", "watch", "lamp", "vase", "ring", "gem", "book", "plant"].map((model, i) => ({ id: `many-${i}`, type: "model3d", props: { model }, style: { base: { width: "110px" } } })),
        },
        { id: "far", type: "section", props: {}, style: { base: { minHeight: "3000px" } }, children: [{ id: "far-t", type: "text", props: { text: { ar: "بعيد", en: "Far", he: "רחוק" } } }] },
      ],
    },
  },
};
// Content blocks: questions, testimonials, plans, a team, logos, a notice and running words.
const W = (ar, en, he) => ({ ar, en, he });
const blocksDemo = {
  id: "blocks-demo", slug: "/blocks-demo", name: "Blocks demo", status: "PUBLISHED", format: 2, sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {},
      children: [
        {
          id: "blocks", type: "section", props: { contained: true }, style: { base: { pad: [40, 24, 40, 24], gap: 32 } },
          children: [
            { id: "faq", type: "accordion", props: { single: true, look: "plus", items: [{ q: W("كم بياخد التوصيل؟", "How long is delivery?", "כמה זמן?"), a: W("يومين.", "Two days.", "יומיים."), open: true }, { q: W("فيني أرجّع؟", "Can I return it?", "אפשר להחזיר?"), a: W("آه.", "Yes.", "כן.") }] } },
            { id: "says", type: "testimonials", props: { layout: "grid", columns: 2, items: [{ quote: W("حلو كتير", "Lovely", "מקסים"), name: W("سارة", "Sarah", "שרה"), role: W("زبونة", "Customer", "לקוחה"), stars: 4 }] } },
            { id: "plans", type: "pricing", props: { items: [{ name: W("أساسي", "Basic", "בסיסי"), price: W("₪49", "₪49", "₪49"), features: W("واحد\nاتنين", "One\nTwo", "אחד\nשניים"), cta: W("اختاري", "Choose", "לבחור"), href: "/shop" }, { name: W("مميز", "Plus", "פלוס"), price: W("₪99", "₪99", "₪99"), featured: true, badge: W("الأشهر", "Most loved", "הכי אהוב") }] } },
            { id: "crew", type: "team", props: { columns: 3, items: [{ name: W("ليلى", "Layla", "ליילה"), role: W("المؤسسة", "Founder", "מייסדת"), photo: "http://127.0.0.1:4100/editorial/hijab-campaign.webp" }] } },
            { id: "brands", type: "logos", props: { gray: true, moving: true, items: [{ src: "/editorial/a.png", alt: W("براند", "Brand", "מותג") }, { src: "/editorial/b.png", href: "/brands/b" }, { src: "javascript:alert(1)" }] } },
            { id: "note", type: "alert", props: { kind: "promo", title: W("خبر حلو", "Good news", "חדשות טובות"), text: W("شحن مجاني", "Free delivery", "משלוח חינם"), close: true } },
            { id: "run", type: "marquee", props: { items: [W("خصم", "Sale", "מבצע"), W("جديد", "New", "חדש")], speed: 20, separator: "✦", pause: true } },
            { id: "find", type: "search", props: { look: "underline", button: W("ابحثي", "Search", "חיפוש") } },
            { id: "nav", type: "menu", props: { phone: "fold", look: "pills", items: [{ label: W("الكل", "All", "הכול"), href: "/shop" }, { label: W("تواصل", "Contact", "צור קשר"), href: "/contact" }, { label: W("خطر", "Bad", "רע"), href: "javascript:alert(1)" }] } },
            { id: "cats", type: "categories", props: { look: "circle", columns: 5 } },
            // A picture in a frame (a colour over it) that's given the whole width.
            { id: "wide-pic", type: "image", props: { src: "/templates/photo-1.svg" }, style: { base: { width: "100%", aspect: "16 / 9", overlay: { color: "#000000", opacity: 0.3 } } } },
          ],
        },
      ],
    },
  },
};
// Interactive elements: tabs, countdowns, before and after, hotspots, a map, and two popups.
const interactiveDemo = {
  id: "interactive-demo", slug: "/interactive-demo", name: "Interactive demo", status: "PUBLISHED", format: 2, sections: [],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {},
      children: [
        {
          id: "inter", type: "section", props: { contained: true }, style: { base: { pad: [40, 24, 40, 24] } },
          children: [
            { id: "tb", type: "tabs", props: { look: "pills", items: [{ label: W("المواد", "Materials", "חומרים"), text: W("قطن", "Cotton", "כותנה") }, { label: W("العناية", "Care", "טיפול"), text: W("غسيل بارد", "Wash cold", "כביסה קרה"), image: "/editorial/scarves.webp" }, { label: W("المقاسات", "Sizes", "מידות"), text: W("S-XL", "S-XL", "S-XL") }] } },
            { id: "cd-future", type: "countdown", props: { until: "2099-01-01T00:00", look: "boxes" } },
            { id: "cd-past", type: "countdown", props: { until: "2020-01-01T00:00", done: W("بلّش العرض", "The offer is on", "המבצע התחיל") } },
            { id: "ba", type: "beforeAfter", props: { before: "/editorial/hero-film-still.webp", after: "/editorial/hijab-campaign.webp", start: 30 }, style: { base: { width: "480px", aspect: "4 / 3" } } },
            { id: "hot", type: "hotspots", props: { src: "/editorial/scarves.webp", items: [{ x: 30, y: 40, title: W("الشال", "The scarf", "הצעיף"), text: W("حرير", "Silk", "משי"), href: "/shop" }, { x: 80, y: 70, title: W("الحقيبة", "The bag", "התיק") }] }, style: { base: { width: "480px" } } },
            { id: "mp", type: "map", props: { query: "Nazareth", zoom: 12, label: W("محلّنا", "Our shop", "החנות שלנו") } },
            { id: "open-offer", type: "button", props: { label: W("شوفي العرض", "See the offer", "למבצע"), href: "#offer" } },
          ],
        },
        { id: "pop-load", type: "popup", props: { trigger: "load", delay: 0.5, often: "visit", size: "s", label: W("ترحيب", "Welcome", "ברוכים הבאים") }, children: [{ id: "pop-load-t", type: "text", props: { text: W("أهلا فيكي", "Welcome", "ברוכים הבאים") } }] },
        { id: "pop-offer", type: "popup", props: { trigger: "click", anchor: "offer", place: "corner" }, children: [{ id: "pop-offer-t", type: "text", props: { text: W("خصم ١٠٪", "10% off", "10% הנחה") } }] },
      ],
    },
  },
};
// A page of new elements in three languages, with one old section in the middle.
const mediaOverlaySection = (id, color, opacity) => ({
  id, type: "section", props: { contained: false }, style: { base: { pad: [0, 0, 0, 0] } }, children: [
    { id: `${id}-video`, type: "video", props: { src: "https://media.example.test/merchant-demo.webm", poster: "/templates/electronics/hero.svg", autoplay: true, muted: true, loop: true, controls: false, label: { en: "Merchant showcase video" } }, style: { base: { width: "100%", height: "400px", fit: "cover", overlay: { color, opacity } } } },
    { id: `${id}-title`, type: "heading", props: { level: 2, text: { en: "Your video, your story" } }, style: { base: { layer: { x: 50, y: 42, anchor: "center" }, width: "80%", textAlign: "center", color: "white", z: 2 } } },
    { id: `${id}-button`, type: "button", props: { href: "/shop", label: { en: "Explore" }, variant: "solid" }, style: { base: { layer: { x: 50, y: 65, anchor: "center" }, z: 2 } } },
  ],
});
const demoPage = (id, sections) => ({ id, slug: `/${id}`, name: id, status: "PUBLISHED", format: 2, sections: [], tree: { version: 1, root: { id: "page", type: "page", props: {}, children: sections } } });
const demoSection = (id, children, props = {}, style = {}) => ({ id, type: "section", props: { contained: true, ...props }, style: { base: { pad: [40, 24, 40, 24], ...style } }, children });
const expandedGalleryItems = ["Alpha", "Beta", "Gamma"].map((title, index) => ({ title: { en: title, ar: title, he: title }, category: { en: index === 1 ? "Design" : "Art", ar: index === 1 ? "تصميم" : "فن", he: index === 1 ? "עיצוב" : "אמנות" }, image: `/templates/experimental/kinetic-${index + 1}.svg`, text: { en: ["One", "Two", "Three"][index] }, href: "/shop", cta: { en: "Explore" } }));
const expandedDemo = demoPage("expanded-demo", [
  ...["grid", "split", "masonry"].map(layout => demoSection(`section-gallery-${layout}`, [{ id: `gallery-${layout}`, type: "filterGallery", props: { label: { en: "Editable gallery" }, items: expandedGalleryItems, layout, columns: 3, gap: 20, hoverEffect: "zoom", lightbox: true, searchable: true, activation: "hover" } }])),
  demoSection("section-billing", [{ id: "pricing-billing", type: "pricing", props: { billing: true, initialBilling: "monthly", items: [
    { name: { en: "Studio" }, price: { en: "Monthly quote" }, period: { en: "/month" }, yearlyPrice: { en: "Annual quote" }, yearlyPeriod: { en: "/year" }, cta: { en: "Explore" }, href: "/shop" },
    { name: { en: "Custom" }, price: { en: "Contact us" }, period: { en: "/month" } },
  ] } }]),
  ...["controls", "single"].map(mode => demoSection(`section-faq-${mode}`, [{ id: `faq-${mode}`, type: "accordion", props: { single: mode === "single", controls: true, items: [{ q: { en: "First question" }, a: { en: "First answer" } }, { q: { en: "Second question" }, a: { en: "Second answer" } }] } }])),
  ...["piano", "guitar"].map(kind => demoSection(`section-${kind}`, [{ id: `instrument-${kind}`, type: "instrument", props: { kind, sound: false, volume: .2, octave: 4, octaves: 1, frets: 8, sustain: .6, waveform: "triangle", tempo: 200, melody: kind === "piano" ? "scale" : "chords", label: { en: kind === "piano" ? "Playable piano" : "Playable guitar" } } }])),
  demoSection("section-chart-clock", [
    ...["bar", "line", "donut"].map(kind => ({ id: `chart-${kind}`, type: "chart", props: { kind, label: { en: "Your chart" }, items: [{ label: { en: "Alpha" }, value: 25 }, { label: { en: "Beta" }, value: 75, color: "#8a55bc" }], showValues: true } })),
    { id: "live-clock", type: "clock", props: { timezone: "UTC", format: "24", seconds: true, date: true, label: { en: "World clock" } } },
  ]),
  demoSection("section-sticky", [{ id: "sticky-stack", type: "stack", props: {}, style: { base: { gap: 32 } }, children: [1, 2, 3].map((n, index) => ({ id: `sticky-card-${n}`, type: "stack", props: {}, style: { base: { sticky: { top: 24 + index * 24 }, minHeight: "400px", pad: [32, 24, 32, 24], bg: ["#cedbc5", "#b5c5aa", "#a0b395"][index], z: n }, mobile: { sticky: false } }, children: [{ id: `sticky-title-${n}`, type: "heading", props: { level: 2, text: { en: `Process ${n}` } } }] })) }]),
]);
const sectionSceneDemo = demoPage("scene-demo", ["constellation", "orbs", "waves", "grid", "starfield", "ribbons", "snow", "fireworks"].map((kind, index) => demoSection(`scene-${kind}`, [
  { id: `scene-title-${index}`, type: "heading", props: { level: 2, text: { en: kind } } },
  { id: index === 7 ? "scene-content-link" : `scene-link-${index}`, type: "button", props: { label: { en: "Explore collection" }, href: "/shop", variant: "solid" } },
], { scene: { kind, color: "#96b9e8", secondary: "#d2a877", amount: 32, speed: .6, intensity: 1, interactive: index === 0 } }, { minHeight: "440px", bg: "#12202a", color: "#edf3f8" })));
const sliderEffectsDemo = demoPage("slider-effects-demo", ["slices", "coverflow", "vertical", "fade", "zoom", "wipe"].map((kind) => demoSection(`section-slider-${kind}`, [{ id: `expanded-slider-${kind}`, type: "slider", props: { effect: kind === "vertical" ? "flip" : kind, axis: kind === "vertical" ? "y" : "x", duration: kind === "slices" ? 1.4 : .4, zoom: kind === "coverflow" ? 1.1 : 1, captionPosition: kind === "vertical" ? "split" : "bottom", loop: kind !== "coverflow", arrows: true, dots: true, thumbnails: true, progress: true, ...(kind === "slices" ? { autoplay: 2 } : {}), aspect: "16 / 9", slides: [1, 2, 3].map(n => ({ src: `/templates/experimental/foundry-${n}.svg`, kind: "image", alt: { en: `Image ${n}` }, title: { en: `Slide ${n}` }, text: { en: `Description ${n}` }, cta: { en: "Explore" }, href: "/shop" })) } }])));

sliderEffectsDemo.tree.root.children.push(demoSection("section-slider-video", [{ id: "expanded-slider-video", type: "slider", props: { effect: "slices", duration: 1.4, loop: false, arrows: true, dots: true, slides: [
  { src: "/templates/experimental/foundry-1.svg", kind: "image", title: { en: "Slide 1" } },
  { src: "https://media.example.test/merchant-demo.webm", kind: "video", title: { en: "Merchant video" } },
  { src: "/templates/experimental/foundry-3.svg", kind: "image", title: { en: "Slide 3" } },
] } }]));

const showcaseDemo = { id: "showcase-demo", slug: "/showcase-demo", name: "Editable showcase", status: "PUBLISHED", format: 2, sections: [], tree: {
  version: 1, root: { id: "page", type: "page", props: {}, children: [
    ...["click", "hover", "vertical", "eight"].map((mode) => ({ id: `section-${mode}`, type: "section", props: { contained: true }, style: { base: { pad: [24, 16, 24, 16] } }, children: [
      { id: `showcase-${mode}`, type: "showcase", props: { label: { en: "Editable showcase" }, layout: mode === "vertical" || mode === "eight" ? "vertical" : "horizontal", activation: mode === "hover" ? "hover" : "click", initial: mode === "click" ? 7 : 0, height: mode === "eight" ? 240 : 480, ratio: 4, duration: .55, overlay: .5,
        items: (mode === "eight" ? Array.from({length:8}, (_,i) => `Panel ${i + 1}: a very long collection title with plenty of details to fit in one collapsed row`) : ["First panel", "Second panel"]).map((title) => ({ title: { en: title }, text: { en: `${title} description` }, image: "/templates/electronics/hero.svg", href: "/shop", cta: { en: "Explore" } })) } },
    ] })),
  ] },
} };

const motionMediaDemo = { id: "motion-media-demo", slug: "/motion-media-demo", name: "Motion and media", status: "PUBLISHED", format: 2, sections: [], tree: {
  version: 1, root: { id: "page", type: "page", props: {}, children: [
    mediaOverlaySection("black-film", "#000000", 0.5), mediaOverlaySection("colour-film", "#8b1538", 0.35),
    { id: "model-fallback-section", type: "section", props: { contained: true }, children: [
      { id: "model-fallback", type: "model3d", props: { file: { url: "http://127.0.0.1:4100/__test/missing-model.glb" }, poster: "/templates/electronics/hero.svg", label: { en: "Merchant model fallback" } }, style: { base: { height: "320px" } } },
    ] },
  ] },
} };
const treeDemo = {
  id: "tree-demo", slug: "/tree-demo", name: "Tree demo", status: "PUBLISHED", format: 2,
  sections: [{ id: "demo-faq", type: "FAQ", order: 0, isVisible: true, data: { title: "أسئلة القسم القديم", items: [{ question: "سؤال قديم؟", answer: "جواب قديم." }] } }],
  tree: {
    version: 1,
    root: {
      id: "page", type: "page", props: {},
      children: [
        {
          id: "intro", type: "section", props: { contained: true, anchor: "intro" }, style: { base: { bg: "accent-soft" } },
          children: [
            { id: "title", type: "heading", props: { level: 1, text: { ar: "عنوان من الشجرة", en: "A title from the tree", he: "כותרת מהעץ" } }, style: { base: { size: 44, textAlign: "center" }, mobile: { size: 30 } } },
            { id: "only-ar", type: "text", props: { text: { ar: "نص بالعربي بس" } }, style: { base: { textAlign: "center", color: "muted" } } },
            {
              id: "cols", type: "grid", props: {}, style: { base: { columns: 3, gap: 20 } },
              children: [
                { id: "wide", type: "text", props: { text: { ar: "خلية عريضة", en: "A wide cell", he: "תא רחב" } }, style: { base: { col: "1 / 3", bg: "#ffffff", pad: [16, 16, 16, 16], radius: 16 } } },
                { id: "go", type: "button", props: { label: { ar: "تسوّقي", en: "Shop", he: "לקנייה" }, href: "/shop" } },
                { id: "away", type: "button", props: { label: { ar: "رابط برّا", en: "Outside", he: "בחוץ" }, href: "https://example.com/x", variant: "outline", newTab: true } },
                { id: "bad", type: "button", props: { label: { ar: "رابط خطر", en: "Bad", he: "רע" }, href: "javascript:alert(1)" } },
                { id: "heart", type: "icon", props: { name: "heart", label: { ar: "بحب", en: "Love", he: "אהבה" } } },
              ],
            },
          ],
        },
        { id: "s-demo-faq", type: "legacy", props: { sectionId: "demo-faq" } },
        {
          id: "shop", type: "section", props: { contained: true },
          children: [{ id: "picks", type: "products", props: { source: "picked", productIds: ["coat"], limit: 4, layout: "grid", title: { ar: "قطع مختارة", en: "Picked pieces", he: "פריטים נבחרים" } } }],
        },
        // Look and motion: a clip that sits tilted and straightens with the scroll, a title placed over it,
        // a tilted badge that floats, a framed picture with a colour layer and a shine.
        {
          id: "tilt", type: "section", props: { contained: true },
          children: [
            {
              id: "tilt-stage", type: "stack", props: {}, style: { base: { shape: "rounded", gap: 0 } },
              motion: { scroll: { kind: "keys", from: { rx: 30, scale: 0.85, y: 80 }, to: { rx: 0, scale: 1, y: 0 }, start: 100, end: 35 } },
              children: [
                { id: "tilt-clip", type: "video", props: { src: "/editorial/hero-film-120.mp4", autoplay: true, loop: true, muted: true }, style: { base: { overlay: { color: "#000000", to: "accent", angle: 180, opacity: 0.45, blend: "multiply" } } } },
                {
                  id: "tilt-title", type: "heading", props: { level: 2, text: { ar: "فوق الفيديو", en: "Over the clip", he: "מעל הסרטון" } },
                  style: { base: { layer: { x: 50, y: 50, anchor: "center" }, color: "white", size: 40, glow: { color: "accent", size: 24 }, z: 2 }, mobile: { layer: false, color: "text" } },
                  motion: { enter: { kind: "up", duration: 0.5 } },
                },
              ],
            },
            {
              id: "tilt-badge", type: "text", props: { text: { ar: "شارة مايلة", en: "A tilted badge", he: "תג נטוי" } },
              style: { base: { rotateZ: -8, moveX: 12, opacity: 0.5, shade: { x: 0, y: 12, blur: 30, color: "#00000066" } } },
              motion: { loop: { kind: "float", duration: 2 }, hover: { kind: "tilt" } },
            },
            {
              id: "tilt-pic", type: "image", props: { src: "/editorial/scarves.webp", alt: { ar: "أوشحة", en: "Scarves", he: "צעיפים" } },
              style: { base: { width: "320px", overlay: { color: "accent", opacity: 0.3, blend: "soft-light" } } },
              motion: { fx: { kind: "shine", speed: 2 }, hover: { kind: "zoom" } },
            },
          ],
        },
        // Drawings: a blob that morphs into its second shape and back, a line that draws itself (its gradient's id
        // gets the element's in front), and one carrying a script and an onclick that the shop drops.
        {
          id: "art", type: "section", props: { contained: true },
          children: [
            {
              id: "art-blob", type: "svg", style: { base: { width: "220px" } }, motion: { enter: { kind: "draw", duration: 0.6 }, loop: { kind: "morph", duration: 2 } },
              props: {
                shape: "blob", label: { ar: "فقاعة", en: "A blob", he: "בועה" },
                art: {
                  viewBox: "0 0 200 200",
                  morph: "M100 30 C150 20 185 60 175 105 C165 155 135 180 95 175 C45 170 20 135 25 95 C30 55 55 35 100 30 Z",
                  nodes: [{ t: "path", a: { d: "M100 10 C160 10 190 50 190 100 C190 160 150 190 100 190 C40 190 10 150 10 100 C10 50 40 10 100 10 Z", fill: "accent-soft", stroke: "accent", "stroke-width": "3" } }],
                },
              },
            },
            {
              id: "art-line", type: "svg", motion: { enter: { kind: "draw", duration: 1.2 } },
              props: {
                art: {
                  viewBox: "0 0 300 60",
                  nodes: [
                    { t: "defs", a: {}, c: [{ t: "linearGradient", a: { id: "g", x1: "0", x2: "1", y1: "0", y2: "0" }, c: [{ t: "stop", a: { offset: "0", "stop-color": "accent" } }, { t: "stop", a: { offset: "1", "stop-color": "#7afcff" } }] }] },
                    { t: "path", a: { d: "M5 30 Q 40 5 75 30 T 145 30 T 215 30 T 295 30", fill: "none", stroke: "url(#g)", "stroke-width": "6", "stroke-linecap": "round" } },
                  ],
                },
              },
            },
            // A product's 360° view in the page: rose-dress in Berry (its own view), turning by itself.
            { id: "spin-berry", type: "product360", props: { productId: "coat", itemId: "berry", label: { ar: "الفستان بيلف", en: "The dress turning", he: "השמלה מסתובבת" } }, style: { base: { width: "240px" } } },
            { id: "art-bad", type: "svg", props: { art: { viewBox: "0 0 10 10", nodes: [{ t: "script", a: {} }, { t: "circle", a: { r: "4", cx: "5", cy: "5", onclick: "alert(1)", fill: "white", href: "https://x.test" } }] } } },
            // Words in a font from the library (Google Fonts), and one in the shop's own copy.
            { id: "lib-font", type: "heading", props: { text: { ar: "خط من المكتبة", en: "A library font", he: "גופן מהספרייה" }, level: 3 }, style: { base: { family: "noto-kufi-arabic" } } },
            { id: "own-font", type: "text", props: { text: { ar: "خط المتجر", en: "The shop's font", he: "גופן החנות" } }, style: { base: { family: "heebo" } } },
            // An icon from the library: its own drawing, its own size, the words' colour.
            {
              id: "lib-icon", type: "icon", style: { base: { iconSize: 48, color: "#123456" }, mobile: { iconSize: 32 } },
              props: { name: "lucide:shopping-cart", art: { viewBox: "0 0 24 24", nodes: [{ t: "g", a: { fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round" }, c: [{ t: "circle", a: { cx: "8", cy: "21", r: "1" } }, { t: "path", a: { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78" } }, { t: "script", a: {} }] }] } },
            },
          ],
        },
        // A section with a wave along its top and an angle at its bottom, a pattern, and a picture cut to a heart.
        {
          id: "edged", type: "section", style: { base: { bg: "#fff0f6", pad: [80, 24, 80, 24], pattern: { kind: "dots", color: "accent", size: 22, opacity: 0.3 } } },
          props: {
            edges: {
              top: { art: { viewBox: "0 0 1440 120", nodes: [{ t: "path", a: { d: "M0 60C480 0 960 120 1440 60V120H0Z", fill: "currentColor" } }, { t: "script", a: {} }] }, height: 60, phone: 30, color: "#ff0000" },
              bottom: { art: { viewBox: "0 0 1440 120", nodes: [{ t: "path", a: { d: "M0 120L1440 0V120Z", fill: "currentColor" } }] }, height: 50, color: "bg", flip: true, front: true },
            },
          },
          children: [{ id: "heart-pic", type: "image", props: { src: "https://res.cloudinary.com/demo/image/upload/sample.jpg", alt: { ar: "قلب" } }, style: { base: { width: "200px", aspect: "1 / 1", shape: "heart" } } }],
        },
        // Words that move: letter by letter (Arabic word by word), a number counting up, scrambled letters, lit up with the scroll.
        {
          id: "words-motion", type: "section", props: { contained: true }, style: { base: { pad: [40, 24, 40, 24] } },
          children: [
            { id: "wm-letters", type: "heading", props: { level: 3, text: { ar: "أهلاً وسهلاً", en: "Hello there", he: "שלום לכם" } }, motion: { enter: { kind: "letters", duration: 0.5 } } },
            { id: "wm-count", type: "text", props: { text: { ar: "+1,200 زبونة سعيدة", en: "+1,200 happy customers", he: "+1,200 לקוחות" } }, motion: { enter: { kind: "count", duration: 1.5 } } },
            { id: "wm-scramble", type: "heading", props: { level: 4, text: { ar: "عرض خاص", en: "Special offer", he: "מבצע מיוחד" } }, motion: { enter: { kind: "scramble", duration: 1 } } },
            { id: "wm-scroll", type: "text", props: { text: { ar: "كل كلمة بتضوي لما تنزلي", en: "Each word lights up as you scroll", he: "כל מילה נדלקת בגלילה" } }, motion: { scroll: { kind: "words", start: 100, end: 0 } } },
          ],
        },
        // The mouse: a short play once, a light that follows it, a ripple where it's pressed, a spring.
        {
          id: "hovers", type: "section", props: { contained: true }, style: { base: { pad: [40, 24, 40, 24] } },
          children: [
            { id: "hv-bounce", type: "heading", props: { level: 3, text: { ar: "بنط", en: "I bounce", he: "קופץ" } }, motion: { hover: { kind: "bounce", amount: 2 } } },
            { id: "hv-spot", type: "cell", props: {}, style: { base: { bg: "#ffffff", pad: [40, 40, 40, 40] } }, motion: { hover: { kind: "spotlight", color: "#ff0000", amount: 1.5 } }, children: [{ id: "hv-spot-t", type: "text", props: { text: { ar: "ضو", en: "Light", he: "אור" } } }] },
            { id: "hv-ripple", type: "button", props: { label: { ar: "اضغطي", en: "Press", he: "ללחוץ" }, href: "#" }, motion: { hover: { kind: "ripple", color: "#00ff00" } } },
            { id: "hv-jelly", type: "icon", props: { name: "star" }, motion: { hover: { kind: "jelly", amount: 2 } } },
          ],
        },
        // Columns: a third and two thirds, each cell its own little container (shapes, alignment), three more columns inside one.
        {
          id: "split", type: "section", props: { contained: true },
          children: [
            {
              id: "two", type: "columns", props: { phone: "reverse" }, style: { base: { widths: [1, 2], gap: 24 } },
              children: [
                {
                  id: "cell-a", type: "cell", props: {}, style: { base: { bg: "#ffffff", pad: [24, 24, 24, 24], shape: "rounded", justify: "center", align: "center", textAlign: "center" } },
                  children: [
                    { id: "cell-a-title", type: "heading", props: { level: 3, text: { ar: "خلية أولى", en: "First cell", he: "תא ראשון" } } },
                    { id: "cell-a-go", type: "button", props: { label: { ar: "شوفي", en: "See", he: "לראות" }, href: "/shop" } },
                  ],
                },
                {
                  id: "cell-b", type: "cell", props: {}, style: { base: { bg: "accent-soft", pad: [24, 24, 24, 24], shape: "arch", minHeight: "240px" } },
                  children: [
                    { id: "cell-b-text", type: "text", props: { text: { ar: "خلية تانية", en: "Second cell", he: "תא שני" } } },
                    {
                      id: "three", type: "columns", props: {}, style: { base: { gap: 12 } },
                      children: ["1", "2", "3"].map((k) => ({ id: `n${k}`, type: "cell", props: {}, style: { base: { bg: "#ffffff", pad: [8, 8, 8, 8] } }, children: [{ id: `n${k}-t`, type: "text", props: { text: { ar: `خانة ${k}` } } }] })),
                    },
                  ],
                },
              ],
            },
          ],
        },
        // A slider in a cell that centres its things: two pictures and a clip, words in three languages, a bad address that drops out.
        {
          id: "slides", type: "section", props: { contained: true },
          children: [
            {
              id: "slide-cols", type: "columns", props: {}, style: { base: { widths: [2, 1], gap: 24 } },
              children: [
                {
                  id: "slide-cell", type: "cell", props: {}, style: { base: { bg: "#ffffff", pad: [16, 16, 16, 16], shape: "rounded", align: "center", textAlign: "center" } },
                  children: [
                    {
                      id: "gallery", type: "slider",
                      props: {
                        slides: [
                          { src: "/editorial/hijab-campaign.webp", kind: "image", alt: { ar: "حجاب", en: "A hijab", he: "חיג'אב" }, caption: { ar: "حجابات الموسم", en: "This season's hijabs", he: "חיג'אבים של העונה" }, href: "/shop" },
                          { src: "/editorial/rose-campaign-mobile.mp4", kind: "video", caption: { ar: "فيلم الورد", en: "The rose film", he: "סרט הוורד" } },
                          { src: "javascript:alert(1)", kind: "image", caption: { ar: "رابط خطر" } },
                          { src: "/editorial/hero-film-poster.webp", kind: "image", caption: { ar: "بالعربي بس" } },
                        ],
                        autoplay: 3, loop: true, arrows: true, dots: true, aspect: "4 / 3",
                      },
                    },
                    { id: "slide-note", type: "text", props: { text: { ar: "تحت السلايدر", en: "Under the slider", he: "מתחת לסליידר" } } },
                  ],
                },
                { id: "slide-side", type: "cell", props: {}, children: [{ id: "slide-side-t", type: "text", props: { text: { ar: "جنب السلايدر", en: "Beside the slider", he: "ליד הסליידר" } } }] },
              ],
            },
          ],
        },
      ],
    },
  },
};
const extra = { ...products[1], id: "pearl", title: "حجاب لؤلؤي", slug: "pearl-hijab", minPrice: 280, items: [] };
// Digital product and booking (fulfillment.spec.ts): only reachable by their page and the bag, never listed.
const soon = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
const handoverProducts = [
  {
    id: "pattern", title: "باترون عباية", slug: "abaya-pattern", minPrice: 45, category: categories[0], primaryImageUrl: "http://localhost:3000/editorial/hijab-campaign.webp",
    type: { id: "ptype_digi", name: "منتج رقمي", slug: "digital", colorLabel: "اللون", sizeLabel: "المقاس", showColor: false, showSize: false, fulfillment: "DIGITAL" },
    items: [{ id: "pattern-i", colorName: "Default", colorHex: null, variants: [{ id: "pattern-v", sizeId: "def", size: { id: "def", name: "default" }, price: 45, stock: 100000 }] }],
  },
  {
    id: "workshop", title: "ورشة خياطة", slug: "sewing-workshop", minPrice: 120, category: categories[0], primaryImageUrl: "http://localhost:3000/editorial/hijab-campaign.webp",
    eventStartsAt: soon, eventEndsAt: null, eventLocation: "سخنين، قاعة البلدية",
    type: { id: "ptype_book", name: "ورشة", slug: "workshop", colorLabel: "اللون", sizeLabel: "المقعد", showColor: false, showSize: false, fulfillment: "BOOKING" },
    items: [{ id: "workshop-i", colorName: "Default", colorHex: null, variants: [{ id: "workshop-v", sizeId: "def", size: { id: "def", name: "default" }, price: 120, stock: 8 }] }],
  },
  {
    id: "script", title: "سكربت ترتيب الطلبات", slug: "orders-script", minPrice: 60, category: categories[0], primaryImageUrl: "http://localhost:3000/editorial/hijab-campaign.webp", isProtected: true,
    type: { id: "ptype_digi", name: "منتج رقمي", slug: "digital", colorLabel: "اللون", sizeLabel: "المقاس", showColor: false, showSize: false, fulfillment: "DIGITAL" },
    items: [{ id: "script-i", colorName: "Default", colorHex: null, variants: [{ id: "script-v", sizeId: "def", size: { id: "def", name: "default" }, price: 60, stock: 100000 }] }],
  },
  {
    id: "past", title: "ورشة قديمة", slug: "past-workshop", minPrice: 90, category: categories[0], primaryImageUrl: "http://localhost:3000/editorial/hijab-campaign.webp",
    eventStartsAt: "2025-01-10T16:00:00.000Z", eventEndsAt: null, eventLocation: "عكا",
    type: { id: "ptype_book", name: "ورشة", slug: "workshop", colorLabel: "اللون", sizeLabel: "المقعد", showColor: false, showSize: false, fulfillment: "BOOKING" },
    items: [{ id: "past-i", colorName: "Default", colorHex: null, variants: [{ id: "past-v", sizeId: "def", size: { id: "def", name: "default" }, price: 90, stock: 8 }] }],
  },
];
const orderAccess = {
  "tok-ready-1234567890abcdefghijkl": {
    shortId: "A1B2C3", status: "ACCEPTED", closed: false, delivered: true, firstName: "سارة",
    items: [{ title: "باترون عباية", variant: null, quantity: 1, imageUrl: null, fulfillment: "DIGITAL" }, { title: "ورشة خياطة", variant: null, quantity: 2, imageUrl: null, fulfillment: "BOOKING" }],
    files: [{ id: "f1", name: "باترون عباية.pdf", productTitle: "باترون عباية", kind: "upload", bytes: 1048576, format: "pdf", downloads: 0, left: 10 }],
    maxDownloads: 10,
    tickets: [
      { code: "K7QM-2XHP", qr: "https://admin.test/admin/tickets?code=K7QM-2XHP", title: "ورشة خياطة", label: null, holderName: "سارة أحمد", status: "VALID", checkedInAt: null, startsAt: soon, endsAt: null, location: "سخنين، قاعة البلدية" },
      { code: "R4TW-9BNC", qr: "https://admin.test/admin/tickets?code=R4TW-9BNC", title: "ورشة خياطة", label: null, holderName: "سارة أحمد", status: "USED", checkedInAt: soon, startsAt: soon, endsAt: null, location: "سخنين، قاعة البلدية" },
    ],
  },
  "tok-codes-12345678901234567890abc": {
    shortId: "G7H8J9", status: "ACCEPTED", closed: false, delivered: true, firstName: "ليلى",
    items: [{ title: "بطاقة Steam ‏50$", variant: null, quantity: 2, imageUrl: null, fulfillment: "DIGITAL" }],
    files: [], maxDownloads: 10, tickets: [],
    codes: [
      { code: "STEAM-AAAA-1111", title: "بطاقة Steam ‏50$", redeemNote: "افتحي Steam ← إضافة لعبة ← تفعيل منتج", orderItemId: "oi1" },
      { code: "STEAM-BBBB-2222", title: "بطاقة Steam ‏50$", redeemNote: "افتحي Steam ← إضافة لعبة ← تفعيل منتج", orderItemId: "oi1" },
    ],
  },
  "tok-licence-123456789012345678ab": {
    shortId: "K1L2M3", status: "ACCEPTED", closed: false, delivered: true, firstName: "سما",
    items: [{ title: "سكربت ترتيب الطلبات", variant: null, quantity: 1, imageUrl: null, fulfillment: "DIGITAL" }],
    files: [], maxDownloads: 10, tickets: [], codes: [],
    // Times counted from each request (the server may run for hours).
    licences: [
      { id: "lic-ok", title: "سكربت ترتيب الطلبات", serial: "ESTB-7KQ2-M9XD-4HFA-PZ3C-W8RT", get expiresAt() { return new Date(Date.now() + 5 * 3600_000 + 60_000).toISOString(); }, expired: false, downloadsLeft: 1, maxDownloads: 3, ready: true, devices: { used: 0, max: 1 } },
      { id: "lic-late", title: "سكربت قديم", serial: "ESTB-AAAA-BBBB-CCCC-DDDD-EEEE", get expiresAt() { return new Date(Date.now() - 3600_000).toISOString(); }, expired: true, downloadsLeft: 3, maxDownloads: 3, ready: true },
    ],
    launcher: { version: "1.0.0", bytes: 31744, path: "/licences/launcher/download" },
  },
  "tok-closed-1234567890abcdefghijk": { shortId: "D4E5F6", status: "CANCELED", closed: true, delivered: false, firstName: "سارة", items: [], files: [], maxDownloads: 10, tickets: [] },
};
globalThis.downloads = 0;
const contact = {
  id: "contact", slug: "/contact", name: "تواصل", status: "PUBLISHED",
  sections: [
    { id: "contact-intro", type: "RICH_TEXT", order: 0, isVisible: true, anchorId: "our-message", data: { html: "<p>رسالة من لوحة الإدارة</p>", components: [{ id: "authored", kind: "text", props: { text: "تفاصيل التواصل من CMS" } }] } },
    { id: "contact-form", type: "CONTACT", order: 1, isVisible: true, anchorId: "write-to-us", data: { title: "خلينا نحكي.", subtitle: "نساعدكِ باختيار تفاصيلكِ", items: [{ label: "ساعات العمل", value: "الأحد — الخميس" }], form: { title: "اكتبي لنا", submitLabel: "أرسلي الرسالة", fields: [{ name: "name", label: "الاسم", required: true }, { name: "email", label: "البريد الإلكتروني", type: "email", required: true }, { name: "order_ref", label: "رقم الطلب" }, { name: "message", label: "الرسالة", type: "textarea", required: true }] } } },
  ],
};
const home = {
  id: "home",
  name: "البيت",
  slug: "/",
  status: "PUBLISHED",
  sections: [
    {
      id: "hero",
      anchorId: "pink-campaign",
      ariaLabel: "حملة استبرق",
      type: "HERO",
      order: 0,
      isVisible: true,
      data: {
        title: "أناقة تليق بكِ",
        roseTitle: "أناقة تشبهكِ.\nبكل تفاصيلكِ.",
        // Most tests cover the photo opening; film.spec.ts switches the scarf film on with /__test/hero-film.
        roseHeroFilm: false,
        // The collections stay a grid here (home-performance, theme-preview); rose-showcase.spec switches the
        // scroll story on with /__test/collections-story?on=1.
        roseCollectionsStoryEnabled: false,
        // The sections stay in plain flow here (the scroll tests measure them); /__test/home-stack?on=1 stacks them.
        roseStackEnabled: false,
        // The home's showpieces stay off here (the scroll and layout tests measure the sections); wonders.spec
        // switches them on with /__test/wonders?on=1.
        roseParticlesEnabled: false,
        roseWorldEnabled: false,
        roseStoryModeEnabled: false,
        subtitle: "وصف الحملة من لوحة الإدارة",
        primaryButton: { label: "تسوّقي المجموعة", href: "/shop" },
        secondaryButton: { label: "قصتنا في الحملة", href: "/about" },
        roseImageUrl: "/editorial/hijab-campaign.webp",
      },
    },
    {
      id: "hidden",
      type: "HERO",
      order: 1,
      isVisible: false,
      data: { title: "عنوان مخفي" },
    },
    { id: "second-campaign", type: "HERO", order: 1.5, isVisible: true, data: { title: "تفاصيل الحملة الثانية", subtitle: "وصف الحملة الثانية", backgroundImageUrl: "/editorial/scarves.webp", primaryButton: { label: "اكتشفي الحجاب", href: "/shop?categoryId=hijabs" }, secondaryButton: { label: "اسألي عن الحملة", href: "/contact" }, rosePresentation: { palette: "berry" } } },
    {
      id: "products",
      type: "NEW_ARRIVALS_SLIDER",
      order: 2,
      isVisible: true,
      data: { title: "وصل حديثاً من CMS", limit: 2 },
    },
    {
      id: "collections",
      type: "COLLECTIONS_GRID",
      order: 3,
      isVisible: true,
      data: {
        title: "مجموعاتنا",
        items: [
          {
            label: "فساتين",
            href: "/c/dresses",
            imageUrl: "/editorial/hijab-campaign.webp",
          },
          {
            label: "حجاب",
            href: "/c/hijabs",
            imageUrl: "/editorial/scarves.webp",
          },
        ],
      },
    },
    {
      id: "faq",
      type: "FAQ",
      order: 4,
      isVisible: true,
      data: {
        title: "الأسئلة الشائعة",
        items: [
          {
            question: "كيف أختار المقاس؟",
            answer: "تفاصيل المقاسات متاحة في صفحة المنتج.",
          },
        ],
      },
    },
    {
      id: "cta",
      type: "CTA",
      order: 5,
      isVisible: true,
      data: {
        title: "نحن هنا لأجلكِ",
        buttonLabel: "تواصل",
        buttonHref: "/contact",
      },
    },
    {
      id: "rich",
      type: "RICH_TEXT",
      order: 6,
      isVisible: true,
      data: { html: "<p>نص إضافي من CMS</p>", rosePresentation: { palette: "berry", motionIntensity: "subtle" } },
    },
  ],
};
const customerState = { user: null, tokens: new Set(), refresh: new Set(), orders: [], wishlist: new Set(), addresses: [] };
function wishlistItems() {
  return [...customerState.wishlist].map((id) => {
    const p = [...products, extra].find((x) => x.id === id);
    return p ? { id: p.id, title: p.title, slug: p.slug, image: p.items?.[0]?.images?.[0]?.url ?? null, price: p.items?.[0]?.variants?.[0]?.price ?? null, addedAt: Date.now() } : null;
  }).filter(Boolean);
}

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    res.setHeader("Content-Type", "application/json");
    const pathname = new URL(req.url, "http://localhost").pathname;
    // Admin → الإعدادات → الثيم والألوان: where a picked colour shows ({ follow: "product" } or {} for the default).
    if (pathname === "/__test/color-follow" && req.method === "POST") {
      let body = "";
      req.on("data", c => { body += c; });
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        if (data.follow) site.header.storefront.colorFollow = data.follow; else delete site.header.storefront.colorFollow;
        res.end("{}");
      });
      return;
    }
    // Admin → الإعدادات → الثيم والألوان: the colour engine ({ scenes?: { product: false, … }, strength?: "soft" }, or {}).
    if (pathname === "/__test/color-engine" && req.method === "POST") {
      let body = "";
      req.on("data", c => { body += c; });
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        if (data.scenes) site.header.storefront.colorScenes = data.scenes; else delete site.header.storefront.colorScenes;
        if (data.strength) site.header.storefront.colorStrength = data.strength; else delete site.header.storefront.colorStrength;
        res.end("{}");
      });
      return;
    }
    if (pathname === "/__test/commerce" && req.method === "POST") {
      let body = "";
      req.on("data", c => { body += c; });
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        commerceCms = data.on === true; invalidCommerceCart = data.invalidCart === true;
        site.visualControls = data.visualControls ?? null;
        visualPageProps = data.pageProps ?? {}; visualShopProps = data.shopProps ?? {};
        legacyCommerceCart = data.legacyCart === true;
        site.customerAccountsEnabled = data.accounts === true;
        if (data.disabled === true) { site.header.storefront.cmsOverrideShop = false; site.header.storefront.cmsOverrideCart = false; }
        else { delete site.header.storefront.cmsOverrideShop; delete site.header.storefront.cmsOverrideCart; }
        res.end("{}");
      });
      return;
    }
    if (pathname === "/__test/missing-model.glb") { res.statusCode = 404; return res.end(); }
    // Delivery prices from the admin (header.delivery), switched on by the delivery test.
    if (pathname === "/__test/delivery") {
      const on = new URL(req.url, "http://localhost").searchParams.get("on") === "1";
      if (on) site.header.delivery = { zones: [{ id: "z1", name: "القدس", fee: 20, cities: ["القدس", "بيت حنينا"], minDays: 1, maxDays: 2 }, { id: "z2", name: "الداخل", fee: 35, cities: ["حيفا", "الناصرة"], minDays: 3, maxDays: 5 }], defaultFee: 50, freeOver: 800 };
      else delete site.header.delivery;
      return res.end(JSON.stringify({ ok: true, delivery: site.header.delivery ?? null }));
    }
    // Marketing pixels, site SEO and the custom-code safe mode (settings.header), for marketing.spec.ts.
    if (pathname === "/__test/marketing") {
      const sp = new URL(req.url, "http://localhost").searchParams;
      if (sp.get("on") === "1") {
        site.header.marketing = { ga4Id: "G-AB12CD34EF", metaPixelId: "123456789012345", tiktokPixelId: "C4ABCDEFGH1234567890" };
        site.header.seo = { title: "استبرق — حجاب وفساتين محتشمة", description: "وصف من الإدارة لمحركات البحث.", ogImageUrl: "" };
        site.customCss = "body { --estabrek-custom-css: 1; }";
        products[0].seoTitle = "فستان الورد الناعم | استبرق";
      } else { delete site.header.marketing; delete site.header.seo; delete site.customCss; delete products[0].seoTitle; }
      site.header.safeMode = sp.get("safe") === "1";
      return res.end(JSON.stringify({ ok: true }));
    }
    // A stream video section on the home page (stream-video.spec.ts): ?on=1 / ?on=0.
    if (pathname === "/__test/stream") {
      const on = new URL(req.url, "http://localhost").searchParams.get("on") === "1";
      home.sections = home.sections.filter((x) => x.id !== "stream-video");
      if (on)
        home.sections.push({
          id: "stream-video",
          type: "VIDEO",
          order: 50,
          isVisible: true,
          data: { title: "فيلم الحملة", url: "http://127.0.0.1:4100/stream/master.m3u8", provider: "HLS", controls: true, muted: true },
        });
      return res.end(JSON.stringify({ ok: true, stream: on }));
    }
    if (pathname.startsWith("/stream/")) {
      const file = path.join(STREAM_DIR, ...pathname.slice("/stream/".length).split("/").filter((x) => x && x !== ".."));
      if (!file.startsWith(STREAM_DIR) || !existsSync(file)) {
        res.statusCode = 404;
        return res.end("{}");
      }
      res.setHeader("Content-Type", STREAM_TYPES[path.extname(file)] ?? "application/octet-stream");
      return res.end(readFileSync(file));
    }
    // The admin's motion settings (motion-settings.spec.ts): site.performance, cleared with ?off=1.
    if (pathname === "/__test/performance") {
      if (new URL(req.url, "http://localhost").searchParams.get("off") === "1") {
        delete site.performance;
        return res.end(JSON.stringify({ ok: true, performance: null }));
      }
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try { site.performance = JSON.parse(body || "{}"); } catch { site.performance = {}; }
        res.end(JSON.stringify({ ok: true, performance: site.performance }));
      });
      return;
    }
    // What the shop counted for the cache's popularity (signals.ts): kept here, read by the tests.
    if (pathname === "/v1/storefront/signals" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try { (globalThis.signals ??= []).push({ type: req.headers["content-type"] ?? "", cookie: req.headers.cookie ?? "", ...JSON.parse(body) }); } catch { /* ignore */ }
        res.statusCode = 204;
        res.end();
      });
      return;
    }
    // A/B tests (ab.spec.ts): site.experiments set with /__test/ab; what the shop reports kept here.
    if (pathname === "/__test/ab" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try { site.experiments = JSON.parse(body || "[]"); } catch { site.experiments = []; }
        globalThis.abEvents = [];
        res.end(JSON.stringify({ ok: true, experiments: site.experiments }));
      });
      return;
    }
    if (pathname === "/v1/storefront/ab" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try { (globalThis.abEvents ??= []).push({ type: req.headers["content-type"] ?? "", cookie: req.headers.cookie ?? "", ...JSON.parse(body) }); } catch { /* ignore */ }
        res.statusCode = 204;
        res.end();
      });
      return;
    }
    if (pathname === "/__test/ab-events") return res.end(JSON.stringify(globalThis.abEvents ?? []));
    // The home's sections in numbers (home-order.spec.ts): what the shop reports, kept here.
    if (pathname === "/v1/storefront/home-stats" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try { (globalThis.homeStats ??= []).push(...JSON.parse(body).e); } catch { /* ignore */ }
        res.statusCode = 204;
        res.end();
      });
      return;
    }
    if (pathname === "/__test/home-stats") {
      if (req.method === "DELETE") globalThis.homeStats = [];
      return res.end(JSON.stringify(globalThis.homeStats ?? []));
    }
    // Real shoppers' speed (rum.spec.ts, WebVitalsReporter): kept here, read by the tests.
    if (pathname === "/v1/storefront/rum" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try { (globalThis.rum ??= []).push({ type: req.headers["content-type"] ?? "", cookie: req.headers.cookie ?? "", ...JSON.parse(body) }); } catch { /* ignore */ }
        res.statusCode = 204;
        res.end();
      });
      return;
    }
    if (pathname === "/__test/rum") {
      if (new URL(req.url, "http://localhost").searchParams.get("reset") === "1") globalThis.rum = [];
      return res.end(JSON.stringify(globalThis.rum ?? []));
    }
    if (pathname === "/__test/signals") {
      if (new URL(req.url, "http://localhost").searchParams.get("reset") === "1") globalThis.signals = [];
      return res.end(JSON.stringify(globalThis.signals ?? []));
    }
    if (pathname === "/__test/accounts") {
      site.customerAccountsEnabled = new URL(req.url, "http://localhost").searchParams.get("on") === "1";
      return res.end(JSON.stringify({ ok: true, customerAccountsEnabled: site.customerAccountsEnabled }));
    }
    if (pathname === "/__test/scenes") {
      scenesOn = new URL(req.url, "http://localhost").searchParams.get("on") === "1";
      return res.end(JSON.stringify({ ok: true, scenes: scenesOn }));
    }
    if (pathname === "/__test/last-order") return res.end(JSON.stringify(globalThis.lastOrder ? { ...globalThis.lastOrder, signedIn: globalThis.lastOrderSignedIn ?? false } : null));
    // Store themes (store-themes.spec.ts): POST {"id":"circuit","mode":"dark"} to pick one, {} for the rose design.
    if (pathname === "/__test/store-theme" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        // {"options": {...}} also sets the store's own models and games for that theme; {"kit": {...}} its pack (storeThemes/packs.ts).
        const { options, kit, ...choice } = data;
        if (kit) site.header.storeKit = kit; else delete site.header.storeKit;
        if (choice.id) site.header.storeTheme = choice; else delete site.header.storeTheme;
        if (options && choice.id) site.header.storeThemeOptions = { [choice.id]: options }; else delete site.header.storeThemeOptions;
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (pathname === "/__test/owned-design" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        if (data.removeHome && globalThis.ownedDesign) {
          globalThis.ownedDesign.page = null;
        } else if (data.page) {
          globalThis.beforeOwnedDesign ??= { header: structuredClone(site.header), name: site.siteName, logo: site.logoUrl };
          globalThis.ownedDesign = data;
          site.siteName = data.name;
          site.logoUrl = null;
          site.header = { ...site.header, storeDesign: { version: 1, mode: "cms", homeId: "owned-home", headerId: "owned-header", footerId: "owned-footer" }, storeTheme: { id: data.theme.id, mode: data.mode ?? "light", snapshot: data.theme }, identity: { name: { ar: data.name, en: data.name, he: data.name }, industry: "fashion", audience: "women" } };
          site.header.storefront = { ...(site.header.storefront ?? {}), cmsOverrideHome: false };
        } else if (globalThis.beforeOwnedDesign) {
          site.header = globalThis.beforeOwnedDesign.header;
          site.siteName = globalThis.beforeOwnedDesign.name;
          site.logoUrl = globalThis.beforeOwnedDesign.logo;
          delete globalThis.beforeOwnedDesign;
          delete globalThis.ownedDesign;
        }
        res.end("{}");
      });
      return;
    }
    // The store's product/category page design for the shop's tests (store-pages.spec.ts): set or cleared (page: null).
    if (pathname === "/__test/store-template" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        try {
          const data = JSON.parse(body || "{}");
          if (data.kind !== "product" && data.kind !== "category") throw new Error("kind is product or category");
          globalThis.storeTemplates ??= Object.create(null);
          globalThis.storeTemplates[data.kind] = data.page ?? null;
          await fetch("http://127.0.0.1:3000/api/revalidate", { method: "POST", headers: { "content-type": "application/json", "x-revalidate-secret": "fixture-publishing-only" }, body: JSON.stringify({ tags: ["cms", "cms:pages"] }) }).catch(() => null);
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
      return;
    }
    if (pathname.endsWith("/storefront/store-template")) {
      const kind = new URL(req.url, "http://localhost").searchParams.get("kind");
      const page = globalThis.storeTemplates?.[kind];
      if (!page) { res.statusCode = 404; return res.end(JSON.stringify({ error: "NOT_FOUND" })); }
      return res.end(JSON.stringify(page));
    }
    if (pathname === "/__test/published-page" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        try {
          const data = JSON.parse(body || "{}");
          if (!/^\/publication-fixture-(en|ar)$/.test(data.slug)) throw new Error("Only the local publishing fixture slug is allowed");
          globalThis.publishedCmsPages ??= Object.create(null);
          globalThis.publishedCmsPages[data.slug] = data.page ?? null;
          const refresh = await fetch("http://127.0.0.1:3000/api/revalidate", { method: "POST", headers: { "content-type": "application/json", "x-revalidate-secret": "fixture-publishing-only" }, body: JSON.stringify({ tags: ["cms", "cms:pages"], paths: [data.slug] }) });
          if (!refresh.ok) throw new Error(`Local refresh failed: ${refresh.status}`);
          res.end("{}");
        } catch (error) { res.statusCode = 500; res.end(JSON.stringify({ error: String(error) })); }
      });
      return;
    }
    if (pathname === "/__test/preview-draft" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const incoming = body ? JSON.parse(body) : null;
        if (incoming?.previewToken && /^good-owned-(header|footer)$/.test(incoming.previewToken)) {
          globalThis.sharedPreviewDrafts ??= {};
          globalThis.sharedPreviewDrafts[incoming.previewToken] = incoming;
        } else globalThis.previewDraft = incoming;
        res.end("{}");
      });
      return;
    }
    // The home's showpieces (particles, the world, the rooms, the page hero, story mode), for wonders.spec.
    if (pathname === "/__test/wonders") {
      const on = new URL(req.url, "http://localhost").searchParams.get("on") === "1";
      const params = new URL(req.url, "http://localhost").searchParams;
      for (const key of ["roseParticlesEnabled", "roseWorldEnabled", "roseRoomsEnabled", "roseHeroObjectEnabled", "roseStoryModeEnabled"]) home.sections[0].data[key] = on;
      // The rooms and the flying 3D silk are off unless switched on: unset=rooms,hero leaves those switches as a
      // new store has them.
      const unset = (params.get("unset") ?? "").split(",");
      if (!on || unset.includes("rooms")) delete home.sections[0].data.roseRoomsEnabled;
      if (!on || unset.includes("hero")) delete home.sections[0].data.roseHeroObjectEnabled;
      return res.end("{}");
    }
    // Admin → الإعدادات → سرّ المتجر: the hidden coupon behind the logo ({ code, text, enabled }).
    if (pathname === "/__test/secret" && req.method === "POST") {
      let body = "";
      req.on("data", c => { body += c; });
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        for (const [key, value] of [["secretCode", data.code], ["secretText", data.text], ["secretEnabled", data.enabled]]) {
          if (value === undefined) delete site.header.storefront[key]; else site.header.storefront[key] = value;
        }
        res.end("{}");
      });
      return;
    }
    if (pathname === "/__test/home-stack") {
      home.sections[0].data.roseStackEnabled = new URL(req.url, "http://localhost").searchParams.get("on") === "1";
      return res.end("{}");
    }
    if (pathname === "/__test/collections-story") {
      home.sections[0].data.roseCollectionsStoryEnabled = new URL(req.url, "http://localhost").searchParams.get("on") === "1";
      return res.end("{}");
    }
    if (pathname === "/__test/hero-film") {
      home.sections[0].data.roseHeroFilm = new URL(req.url, "http://localhost").searchParams.get("on") === "1";
      return res.end(JSON.stringify({ ok: true, roseHeroFilm: home.sections[0].data.roseHeroFilm }));
    }
    if (pathname === "/editorial/hijab-campaign.webp") {
      res.setHeader("Content-Type", "image/webp");
      return res.end(
        readFileSync(
          new URL("../public/editorial/hijab-campaign.webp", import.meta.url),
        ),
      );
    }
    // Back-in-stock alerts (stock-alert.spec.ts): switch, a sold-out size (Berry L), and what was asked.
    // Maintenance mode (maintenance.spec.ts): the preview key's hash is public, the key isn't.
    if (pathname === "/__test/maintenance") {
      const sp = new URL(req.url, "http://localhost").searchParams;
      const on = sp.get("on") === "1";
      site.maintenance = on
        ? { on: true, message: sp.get("message") || null, previewHash: createHash("sha256").update(sp.get("key") || "").digest("hex") }
        : { on: false, message: null, previewHash: null };
      return res.end(JSON.stringify({ ok: true, maintenance: site.maintenance }));
    }
    // Razan's settings (razan.spec.ts): POST a JSON body to set header.razan, {} to clear.
    if (pathname === "/__test/razan" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        if (Object.keys(data).length) site.header.razan = data; else delete site.header.razan;
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    // The admin's new editor (studio-frame.spec.ts): a page that frames the shop like the
    // admin does, collecting what the shop's bridge says (window.__msgs) and talking back (send).
    // A store's own 3D model for the stage's tests (scripts/make-test-glb.py), served like the API's uploads.
    // A 360° sprite sheet (scripts/make-test-spin.py); globalThis.spinHits counts how often it's fetched.
    if (pathname === "/uploads/spins/spin-sheet.png") {
      globalThis.spinHits = (globalThis.spinHits ?? 0) + 1;
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("content-type", "image/png");
      return res.end(readFileSync(new URL("./fixtures/spin-sheet.png", import.meta.url)));
    }
    if (pathname === "/__test/spin-hits") {
      const n = globalThis.spinHits ?? 0;
      if (new URL(req.url, "http://localhost").searchParams.get("reset") === "1") globalThis.spinHits = 0;
      return res.end(JSON.stringify({ hits: n }));
    }
    if (pathname === "/uploads/models/stage-box.glb") {
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("content-type", "model/gltf-binary");
      return res.end(readFileSync(new URL("./fixtures/stage-box.glb", import.meta.url)));
    }
    if (pathname === "/__studio-harness") {
      const src = new URL(req.url, "http://localhost").searchParams.get("src") || "/studio-frame?token=good";
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.end(`<!doctype html><html><body style="margin:0"><iframe id="f" src="http://127.0.0.1:3000${src}" style="width:1280px;height:900px;border:0"></iframe><script>
window.__msgs=[];addEventListener("message",function(e){if(e.data&&e.data.source==="estabrek-studio")window.__msgs.push({origin:e.origin,data:e.data})});
window.send=function(m){document.getElementById("f").contentWindow.postMessage(Object.assign({source:"estabrek-studio"},m),"http://127.0.0.1:3000")};
</script></body></html>`);
    }
    if (pathname === "/__test/page-tree" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        pageTreeOn = Boolean(JSON.parse(body || "{}").on);
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    // The store's languages (languages.spec.ts): POST {enabled, default} to set header.languages, {} to clear.
    if (pathname === "/__test/content-translations" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        contentTranslations = Boolean(JSON.parse(body || "{}").on);
        products[0].translations = contentTranslations ? CONTENT_TR.product : undefined;
        products[0].type.translations = contentTranslations ? CONTENT_TR.type : undefined;
        categories[0].translations = contentTranslations ? CONTENT_TR.category : undefined;
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (pathname === "/__test/languages" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        if (Object.keys(data).length) site.header.languages = data; else delete site.header.languages;
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    // Another store on the platform (identity.spec.ts): POST a JSON body to set header.identity, {} for Estabrek's again.
    if (pathname === "/__test/identity" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        globalThis.estabrekIdentity ??= site.header.identity;
        site.header.identity = Object.keys(data).length ? data : globalThis.estabrekIdentity;
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    // "باقي قطعتان" labels (scarcity.spec.ts): POST a JSON body to set header.scarcity, {} to clear.
    if (pathname === "/__test/scarcity" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        if (Object.keys(data).length) site.header.scarcity = data; else delete site.header.scarcity;
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (pathname === "/__test/razan-events") return res.end(JSON.stringify(globalThis.razanEvents ?? []));
    // «اطلبي قطعتكِ» and Razan's «بدي حدا يحكيني» (razan-help.spec.ts, requests.spec.ts): what was sent.
    if (pathname === "/__test/requests") {
      if (req.method === "POST") { site.header.requests = null; globalThis.customerRequests = []; }
      return res.end(JSON.stringify(globalThis.customerRequests ?? []));
    }
    if (pathname === "/__test/requests-settings" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        if (Object.keys(data).length) site.header.requests = data; else delete site.header.requests;
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (pathname === "/v1/requests" && req.method === "POST") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const raw = Buffer.concat(chunks);
        const type = String(req.headers["content-type"] || "");
        let fields = {};
        let photos = 0;
        if (type.includes("application/json")) fields = JSON.parse(raw.toString() || "{}");
        else {
          // Multipart: read the text fields, count the photos.
          const text = raw.toString("latin1");
          for (const m of text.matchAll(/name="([^"]+)"(; filename="[^"]*")?\r\n(?:Content-Type: [^\r]+\r\n)?\r\n([\s\S]*?)\r\n--/g)) {
            if (m[2]) photos++;
            else fields[m[1]] = Buffer.from(m[3], "latin1").toString("utf8");
          }
        }
        const helpOn = Boolean(site.header.razan?.helpOrder?.enabled);
        const reqOn = Boolean(site.header.requests?.enabled);
        if (fields.kind === "CALLBACK" ? !helpOn : !reqOn) { res.statusCode = 404; return res.end(JSON.stringify({ error: "FEATURE_OFF" })); }
        (globalThis.customerRequests ??= []).push({ ...fields, photos });
        res.statusCode = 201;
        res.end(JSON.stringify({ id: `creq${globalThis.customerRequests.length}` }));
      });
      return;
    }
    if (pathname.startsWith("/v1/razan/preview/")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      const id = decodeURIComponent(pathname.split("/").pop() || "");
      if (id !== "try-me-1234567890") { res.statusCode = 404; return res.end(JSON.stringify({ error: "PREVIEW_EXPIRED" })); }
      return res.end(JSON.stringify({ razan: { texts: { greetingOffline: { ar: "أهلاً من المعاينة 👀", en: "" } }, maxBubbles: 0 } }));
    }
    // AI for shoppers (ai.spec.ts): header.ai via /__test/ai; canned answers.
    if (pathname === "/__test/ai" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        if (Object.keys(data).length) site.header.ai = data; else delete site.header.ai;
        globalThis.aiLog = [];
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (pathname === "/__test/ai-log") return res.end(JSON.stringify(globalThis.aiLog ?? []));
    // The product page's reviews (reviews.spec.ts): { rating: { count, average }, list: [...] } gives "coat"
    // (/p/rose-dress) its reviews; {} takes them away. Every review sent is kept in /__test/review-log.
    if (pathname === "/__test/reviews" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        globalThis.reviewsFixture = data.rating ? data : null;
        globalThis.reviewLog = [];
        res.end("{}");
      });
      return;
    }
    if (pathname === "/__test/review-log") return res.end(JSON.stringify(globalThis.reviewLog ?? []));
    if (/^\/v1\/ugc\/products\/[^/]+\/reviews$/.test(pathname)) {
      const id = decodeURIComponent(pathname.split("/").at(-2));
      return res.end(JSON.stringify(id === "coat" ? globalThis.reviewsFixture?.list ?? [] : []));
    }
    // «كمّلي اللبسة» without AI (complete-look.spec.ts): the dress is completed by the hijabs; the picked colour
    // is logged so the test sees the pieces follow it. /__test/look {"off": true} answers with nothing.
    if (pathname === "/__test/look" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => { globalThis.lookOff = JSON.parse(body || "{}").off === true; globalThis.lookLog = []; res.end("{}"); });
      return;
    }
    if (pathname === "/__test/look-log") return res.end(JSON.stringify(globalThis.lookLog ?? []));
    if (/^\/v1\/catalog\/products\/[^/]+\/look$/.test(pathname)) {
      const color = new URL(req.url, "http://localhost").searchParams.get("color");
      (globalThis.lookLog ??= []).push({ productId: decodeURIComponent(pathname.split("/").at(-2)), color });
      if (globalThis.lookOff) return res.end(JSON.stringify({ products: [] }));
      const img = "http://localhost:3000/editorial/hijab-campaign.webp";
      return res.end(JSON.stringify({ products: [
        { id: "bag", title: "شال وردي بتفاصيل ناعمة", slug: "rose-hijab", image: img, price: 190, colorName: "Rose" },
        { id: "pearl", title: "حجاب لؤلؤي", slug: "pearl-hijab", image: img, price: 280, colorName: null },
      ] }));
    }
    if (/^\/v1\/catalog\/products\/[^/]+\/reviews$/.test(pathname) && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        (globalThis.reviewLog ??= []).push({ productId: decodeURIComponent(pathname.split("/").at(-2)), body: JSON.parse(body || "{}"), auth: req.headers.authorization ?? null });
        res.statusCode = 201;
        res.end(JSON.stringify({ id: "review-new", status: "PENDING" }));
      });
      return;
    }
    if (pathname.startsWith("/v1/ai/")) {
      const ai = site.header.ai ?? {};
      const feature = pathname.startsWith("/v1/ai/search") ? "smartSearch" : pathname.startsWith("/v1/ai/look") ? "shopTheLook" : pathname.startsWith("/v1/ai/size") ? "sizeAdvice" : "reviewSummary";
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        (globalThis.aiLog ??= []).push({ feature, ...(body ? JSON.parse(body) : {}) });
        if (!ai[feature]) { res.statusCode = 404; return res.end(JSON.stringify({ error: "FEATURE_OFF" })); }
        const img = "http://localhost:3000/editorial/hijab-campaign.webp";
        if (feature === "smartSearch") return res.end(JSON.stringify({ q: "فستان", categoryId: "dresses", colors: ["Berry"], sizeIds: [], minPrice: null, maxPrice: 400, summary: "فستان Berry لحد ₪400" }));
        if (feature === "shopTheLook") return res.end(JSON.stringify({ products: [{ id: "bag", title: "شال وردي بتفاصيل ناعمة", slug: "rose-hijab", image: img, price: 190, reason: "الوردي بيلبق مع البيري" }, { id: "pearl", title: "حجاب لؤلؤي", slug: "pearl-hijab", image: img, price: 280, reason: "لمسة لؤلؤ" }] }));
        if (feature === "sizeAdvice") return res.end(JSON.stringify({ size: "L", inStock: true, confidence: "medium", why: "الفستان مريح، L أريح لطولك." }));
        return res.end(JSON.stringify({ count: 4, average: 4.5, summary: { ar: "القماش ناعم والمقاس مزبوط.", en: "Soft fabric, true to size.", pros: ["قماش ناعم"], cons: ["التوصيل تأخر"] } }));
      });
      return;
    }
    // «سؤال وجواب» (razan-questions.spec.ts): header.quiz via /__test/quiz; right answers 1, 0, 2.
    if (pathname === "/__test/quiz" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        if (Object.keys(data).length) site.header.quiz = data; else delete site.header.quiz;
        globalThis.quizLog = [];
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (pathname === "/__test/quiz-log") return res.end(JSON.stringify(globalThis.quizLog ?? []));
    if (pathname.startsWith("/v1/quiz/") && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const a = JSON.parse(body || "{}");
        const step = pathname.split("/").pop();
        (globalThis.quizLog ??= []).push({ step, ...a });
        const on = Boolean(site.header.quiz?.enabled);
        if (step === "visit") return res.end(JSON.stringify(on ? { chance: true, percent: 10, hours: 48, questions: 3 } : { chance: false }));
        if (!on) { res.statusCode = 404; return res.end(JSON.stringify({ error: "FEATURE_OFF" })); }
        if (step === "start") return res.end(JSON.stringify({ token: "tok-1234567890", percent: 10, hours: 48, questions: [
          { id: "q1", text: "كم عدد سور القرآن الكريم؟", choices: ["110", "114", "120"], level: 1 },
          { id: "q2", text: "من هو أول الخلفاء الراشدين؟", choices: ["أبو بكر الصديق", "عمر بن الخطاب", "علي بن أبي طالب"], level: 2 },
          { id: "q3", text: "في أي سورة ذُكرت البسملة مرتين؟", choices: ["الفاتحة", "البقرة", "النمل"], level: 3 },
        ] }));
        if (step === "answer") {
          const right = [1, 0, 2];
          const correct = right.filter((r, i) => a.answers?.[i] === r).length;
          return res.end(JSON.stringify({ passed: correct === 3, correct, total: 3, answers: right }));
        }
        if (step === "claim") { res.statusCode = 201; return res.end(JSON.stringify({ code: "RZN-ABC234", percent: 10, endsAt: new Date(Date.now() + 48 * 3600e3).toISOString() })); }
        res.statusCode = 404;
        res.end("{}");
      });
      return;
    }
    // «رزان بتختارلك» (razan-quiz.spec.ts): canned answers from the mock pieces.
    if (pathname === "/__test/last-quiz") return res.end(JSON.stringify(globalThis.lastQuiz ?? null));
    if (pathname.startsWith("/v1/razan/style")) {
      if (!site.header.razan?.styleQuiz?.enabled) { res.statusCode = 404; return res.end(JSON.stringify({ error: "FEATURE_OFF" })); }
      const img = "http://localhost:3000/editorial/hijab-campaign.webp";
      if (pathname === "/v1/razan/style/start") {
        return res.end(JSON.stringify({
          occasions: [{ key: "wedding", label: "الأعراس", count: 2 }, { key: "daily", label: "اليوم العادي", count: 3 }],
          colors: [{ key: "wine", label: "خمري", hex: "#6b2446" }, { key: "pink", label: "زهري", hex: "#e3a3b8" }, { key: "beige", label: "بيج", hex: "#d8c3a5" }],
          sizes: ["M", "L"],
          budgets: [200, 350],
          photos: [{ id: "coat", title: "فستان الورد", image: img }, { id: "bag", title: "شال وردي", image: img }, { id: "pearl", title: "حجاب لؤلؤي", image: img }],
          total: 3,
        }));
      }
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const a = JSON.parse(body || "{}");
        globalThis.lastQuiz = a;
        if (a.budgetMax && a.budgetMax < 50) return res.end(JSON.stringify({ products: [], noMatch: true }));
        const all = [
          { id: "coat", title: "فستان الورد", slug: "rose-dress", image: img, price: 320.5, reasons: ["لونها (Berry) من الألوان اللي بتحبيها", "بتنفع لـالأعراس"] },
          { id: "bag", title: "شال وردي بتفاصيل ناعمة", slug: "rose-hijab", image: img, price: 190, reasons: ["قطعة بتكمّل لبستكِ"] },
          { id: "pearl", title: "حجاب لؤلؤي", slug: "pearl-hijab", image: img, price: 280, reasons: ["ضمن ميزانيتكِ"] },
        ];
        const skip = new Set([...(a.disliked ?? []), ...(a.exclude ?? [])]);
        const products = all.filter((p) => !skip.has(p.id));
        res.end(JSON.stringify({ products, noMatch: products.length === 0 }));
      });
      return;
    }
    if (pathname === "/v1/razan/events" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        (globalThis.razanEvents ??= []).push(JSON.parse(body || "{}").key);
        res.statusCode = 204;
        res.end();
      });
      return;
    }
    if (pathname === "/__test/stock-alerts") {
      const sp = new URL(req.url, "http://localhost").searchParams;
      site.stockAlertsEnabled = sp.get("on") === "1";
      const berryL = products[0].items[1].variants[1];
      berryL.stock = sp.get("soldOut") === "1" ? 0 : 3;
      if (sp.get("reset") === "1") stockAlerts.length = 0;
      return res.end(JSON.stringify({ ok: true, alerts: stockAlerts }));
    }
    if (pathname === "/v1/stock-alerts" || pathname === "/v1/stock-alerts/stop") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        const send = (status, payload) => { res.statusCode = status; res.end(JSON.stringify(payload)); };
        if (pathname === "/v1/stock-alerts/stop") {
          const a = stockAlerts.find((x) => x.token === data.token);
          if (!a) return send(404, { error: "NOT_FOUND" });
          for (const x of stockAlerts) if (x === a || (data.all && x.email === a.email)) x.status = "CANCELLED";
          return send(200, { ok: true, stopped: 1, productTitle: "فستان الورد" });
        }
        if (!site.stockAlertsEnabled) return send(404, { error: "FEATURE_OFF" });
        const v = products.flatMap((p) => p.items.flatMap((i) => i.variants)).find((x) => x.id === data.variantId);
        if (!v) return send(404, { error: "NOT_FOUND" });
        if (v.stock > 0) return send(409, { error: "IN_STOCK" });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || "").trim())) return send(400, { error: "VALIDATION_ERROR" });
        stockAlerts.push({ email: String(data.email).trim().toLowerCase(), variantId: v.id, status: "WAITING", token: `tok-${stockAlerts.length + 1}-abcdefghijklmnop` });
        send(201, { ok: true });
      });
      return;
    }
    // Shopper accounts (account.spec.ts): code 123456 signs in; one shopper, kept in memory.
    if (pathname.startsWith("/v1/customer/")) {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        const send = (status, payload) => { res.statusCode = status; res.end(JSON.stringify(payload)); };
        const bearer = (req.headers.authorization || "").replace(/^Bearer /, "");
        const signedIn = bearer && customerState.tokens.has(bearer);
        const tokens = () => {
          const access = `acc-${Math.random().toString(36).slice(2)}`;
          const refresh = `ref-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
          customerState.tokens.add(access);
          customerState.refresh.add(refresh);
          return { accessToken: access, refreshToken: refresh, refreshExpiresInDays: 60 };
        };
        if (pathname === "/v1/customer/auth/start") return send(200, { ok: true, minutes: 5, devCode: "123456" });
        if (pathname === "/v1/customer/auth/verify") {
          if (data.code !== "123456") return send(401, { error: "WRONG_CODE" });
          const isNew = !customerState.user;
          customerState.user ??= { id: "cust1", email: String(data.email).toLowerCase(), name: "", phone: null, preferredSize: null, favoriteColor: null, marketingOptIn: false };
          return send(200, { ...tokens(), user: customerState.user, isNew });
        }
        if (pathname === "/v1/customer/auth/refresh") {
          if (!customerState.refresh.has(data.refreshToken)) return send(401, { error: "SESSION_EXPIRED" });
          customerState.refresh.delete(data.refreshToken);
          return send(200, { ...tokens(), user: customerState.user });
        }
        if (pathname === "/v1/customer/auth/logout") { customerState.refresh.delete(data.refreshToken); return send(200, { ok: true }); }
        if (!signedIn) return send(401, { error: "INVALID_TOKEN" });
        if (pathname === "/v1/customer/me" && req.method === "GET") return send(200, customerState.user);
        if (pathname === "/v1/customer/me" && req.method === "PATCH") { Object.assign(customerState.user, data); return send(200, customerState.user); }
        if (pathname === "/v1/customer/me/orders") return send(200, { orders: customerState.orders });
        if (pathname === "/v1/customer/me/wishlist/merge") {
          for (const id of data.productIds || []) customerState.wishlist.add(id);
          return send(200, { items: wishlistItems() });
        }
        if (pathname === "/v1/customer/me/wishlist") return send(200, { items: wishlistItems() });
        if (pathname.startsWith("/v1/customer/me/wishlist/")) {
          const id = decodeURIComponent(pathname.split("/").pop());
          if (req.method === "PUT") customerState.wishlist.add(id); else customerState.wishlist.delete(id);
          return send(200, { ok: true });
        }
        if (pathname === "/v1/customer/me/addresses" && req.method === "GET") return send(200, { addresses: customerState.addresses });
        if (pathname === "/v1/customer/me/addresses" && req.method === "POST") {
          const a = { id: `addr${customerState.addresses.length + 1}`, label: null, notes: null, ...data, isDefault: data.isDefault || !customerState.addresses.length };
          if (a.isDefault) customerState.addresses.forEach((x) => (x.isDefault = false));
          customerState.addresses.push(a);
          return send(201, a);
        }
        if (pathname === "/v1/customer/me/logout-everywhere") { customerState.refresh.clear(); return send(200, { ok: true }); }
        return send(404, { error: "NOT_FOUND" });
      });
      return;
    }
    if (pathname === "/__test/customer-state") return res.end(JSON.stringify({ wishlist: [...customerState.wishlist], orders: customerState.orders.length, user: customerState.user }));
    if (pathname === "/__test/customer-reset") {
      customerState.user = null; customerState.tokens.clear(); customerState.refresh.clear(); customerState.orders = []; customerState.wishlist.clear(); customerState.addresses = [];
      return res.end(JSON.stringify({ ok: true }));
    }
    // The private order page (fulfillment.spec.ts).
    if (pathname.startsWith("/v1/orders/access/")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      const parts = pathname.split("/");
      const token = decodeURIComponent(parts[4] || "");
      const o = orderAccess[token];
      if (!o) { res.statusCode = 404; return res.end(JSON.stringify({ error: "NOT_FOUND" })); }
      if (parts[5] === "licences" && req.method === "POST") {
        globalThis.licenceDownloads = (globalThis.licenceDownloads ?? 0) + 1;
        if (globalThis.licenceDownloads > 1) { res.statusCode = 429; return res.end(JSON.stringify({ error: "DOWNLOAD_LIMIT" })); }
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.setHeader("Content-Disposition", 'attachment; filename="orders-script-K1L2M3.zip"');
        return res.end(Buffer.from("PK\u0003\u0004 fake encrypted zip"));
      }
      if (parts[5] === "files" && req.method === "POST") {
        globalThis.downloads++;
        return res.end(JSON.stringify({ url: "http://localhost:3000/editorial/hijab-campaign.webp" }));
      }
      // Each visit of the page starts the mock's download count again (repeatable tests).
      if (token === "tok-licence-123456789012345678ab") globalThis.licenceDownloads = 0;
      return res.end(JSON.stringify(o));
    }
    if (pathname === "/__test/downloads") return res.end(JSON.stringify({ downloads: globalThis.downloads }));
    if (pathname.endsWith("/catalog/cart-quote") || pathname.endsWith("/catalog/order-requests")) {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        const all = [...products, extra, ...handoverProducts];
        const past = (data.items || []).map((it) => handoverProducts.find((p) => p.id === "past" && p.items[0].variants[0].id === it.variantId)).find(Boolean);
        if (past) { res.statusCode = 409; return res.end(JSON.stringify({ error: "EVENT_OVER", details: { productTitle: past.title } })); }
        const lines = (data.items || []).map((it) => {
          for (const p of all) for (const item of p.items || []) for (const v of item.variants || []) {
            if (v.id === it.variantId) {
              const img = item.images?.[0]?.url || p.images?.[0]?.url || p.primaryImageUrl;
              return { variantId: v.id, quantity: it.quantity, productTitle: p.title, productTranslations: p.translations ?? {}, productSlug: p.slug, colorName: item.colorName, colorHex: item.colorHex ?? null, sizeName: v.size?.name, imageUrl: img, unitPrice: v.price, lineSubtotal: v.price * it.quantity, lineTotal: v.price * it.quantity, available: v.stock ?? 99, fulfillment: p.type?.fulfillment ?? "SHIPPING", eventStartsAt: p.eventStartsAt ?? null };
            }
          }
          return null;
        }).filter(Boolean);
        const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
        const off = String(data.couponCode || "").toUpperCase() === "ROSE10" ? subtotal * 0.1 : 0;
        const short = lines.filter((l) => l.quantity > l.available);
        if (pathname.endsWith("/order-requests") && short.length) { res.statusCode = 409; return res.end(JSON.stringify({ error: "OUT_OF_STOCK", details: { lines: short.map((l) => ({ variantId: l.variantId, productTitle: l.productTitle, colorName: l.colorName, sizeName: l.sizeName, requested: l.quantity, available: l.available })) } })); }
        if (pathname.endsWith("/order-requests")) {
          globalThis.lastOrder = data;
          // Signed-in shopper: the order shows in her account.
          const bearer = (req.headers.authorization || "").replace(/^Bearer /, "");
          globalThis.lastOrderSignedIn = Boolean(bearer && customerState.tokens.has(bearer));
          if (globalThis.lastOrderSignedIn) {
            customerState.orders.unshift({ id: "ORD-1042", status: "NEW", createdAt: new Date().toISOString(), total: subtotal - off, currencyCode: "ILS", paymentStatus: null, items: lines.map((l, i) => ({ id: `oi${i}`, productTitle: l.productTitle, productSlug: l.productSlug, colorName: l.colorName, sizeName: l.sizeName, quantity: l.quantity, imageUrl: l.imageUrl })) });
          }
          return res.end(JSON.stringify({ id: "ORD-1042", status: "NEW" }));
        }
        res.end(JSON.stringify({ lines, subtotal, discountAmount: off, total: subtotal - off, currencyCode: "ILS", coupon: off ? { code: "ROSE10" } : null }));
      });
      return;
    }
    if (pathname.endsWith("/storefront/bootstrap"))
      return res.end(
        JSON.stringify({
          site,
          primaryMenu: { tree: [{ title: "القائمة المنشورة", url: "/shop", items: [{ name: "العرض الجديد", path: "/shop?sort=price_asc" }] }] },
          footerMenu: null,
          pages: [],
        }),
      );
    if (pathname.endsWith("/settings"))
      return res.end(JSON.stringify({ site }));
    if (pathname.endsWith("/storefront/design")) return res.end(JSON.stringify(globalThis.ownedDesign?.regions ?? { header: null, footer: null }));
    if (pathname.includes("/storefront/products/"))
      return res.end(JSON.stringify({ productIds: products.map((p) => p.id) }));
    if (
      pathname.endsWith("/catalog/products/by-ids") ||
      pathname.endsWith("/catalog/products/by-slugs")
    )
      return res.end(JSON.stringify(products));
    if (pathname.includes("/catalog/categories"))
      return res.end(JSON.stringify(scenesOn ? [...categories, ...sceneCategories] : categories));
    if (pathname.endsWith("/catalog/attribute-facets")) {
      const all = [...products, extra];
      const count = (key, order) => order.map((value) => ({ value, count: all.filter((p) => { const v = p.attributes?.[key]; return Array.isArray(v) ? v.includes(value) : v === value; }).length })).filter((o) => o.count);
      return res.end(JSON.stringify({ fields: [
        { key: "fabric", label: "القماش", kind: "select", options: count("fabric", ["كريب", "شيفون"]), ...(contentTranslations ? { translations: { he: CONTENT_TR.type.he.fields.fabric } } : {}) },
        { key: "occasion", label: "المناسبة", kind: "multiselect", options: count("occasion", ["يومي", "سهرة", "عرس"]), ...(contentTranslations ? { translations: { he: CONTENT_TR.type.he.fields.occasion } } : {}) },
      ] }));
    }
    if (pathname.includes("/catalog/products/slug/")) {
      const slug = decodeURIComponent(pathname.split("/").at(-1));
      const found = [...products, ...handoverProducts].find(product => product.slug === slug) ?? null;
      // Its reviews in short, when a test gave it some (/__test/reviews).
      if (found?.id === "coat" && globalThis.reviewsFixture) return res.end(JSON.stringify({ ...found, rating: globalThis.reviewsFixture.rating }));
      return res.end(JSON.stringify(found));
    }
    if (/\/catalog\/products\/[^/]+$/.test(pathname)) {
      const id = decodeURIComponent(pathname.split("/").at(-1));
      return res.end(JSON.stringify(products.find(product => product.id === id) ?? null));
    }
    if (pathname.endsWith("/catalog/products"))
    {
      const sp = new URL(req.url, "http://localhost").searchParams;
      let entries = [...products, extra, ...(scenesOn ? sceneProducts : [])];
      if (sp.get("categoryId")) entries = entries.filter(p => p.category.id === sp.get("categoryId"));
      if (sp.get("q")) entries = entries.filter(p => p.title.includes(sp.get("q")));
      if (sp.get("colors")) entries = entries.filter(p => p.items.some(i => sp.get("colors").split(",").includes(i.colorName)));
      if (sp.get("sizeIds")) entries = entries.filter(p => p.items.some(i => i.variants.some(v => sp.get("sizeIds").split(",").includes(v.sizeId))));
      if (sp.get("inStock")) entries = entries.filter(p => p.items.some(i => i.variants.some(v => v.stock > 0)));
      if (sp.has("minPrice")) entries = entries.filter(p => p.minPrice >= Number(sp.get("minPrice")));
      if (sp.has("maxPrice")) entries = entries.filter(p => p.minPrice <= Number(sp.get("maxPrice")));
      for (const [k, v] of sp) {
        const m = /^attr_(.+)$/.exec(k);
        if (!m) continue;
        const wanted = v.split(",");
        entries = entries.filter((p) => {
          const have = p.attributes?.[m[1]];
          return (Array.isArray(have) ? have : have == null ? [] : [String(have)]).some((x) => wanted.includes(x));
        });
      }
      if (sp.get("sort") === "price_asc") entries.sort((a,b) => a.minPrice - b.minPrice);
      if (sp.get("sort") === "price_desc") entries.sort((a,b) => b.minPrice - a.minPrice);
      const page = Number(sp.get("page") || 1), pageSize = 2;
      return res.end(JSON.stringify({ items: entries.slice((page-1)*pageSize,page*pageSize), total: entries.length, page, pageSize, totalPages: Math.max(1, Math.ceil(entries.length/pageSize)), facets: { colors: [{ name:"Rose",hex:"#c97794",count:1 },{ name:"Lilac",hex:"#a08cbd",count:1 }], sizes: [{id:"m",name:"M",count:1},{id:"one",name:"One size",count:1}] } }));
    }
    // The editor's draft: "good" opens the tree demo, "good-home" the home page as a tree.
    if (pathname.endsWith("/storefront/page-preview")) {
      const token = new URL(req.url, "http://localhost").searchParams.get("token");
      if (token === "commerce-preview") return res.end(JSON.stringify(commercePage("cart")));
      if (token === "good") return res.end(JSON.stringify(treeDemo));
      // The admin's draft as the editor's end-to-end check posts it (/__test/preview-draft).
      const selectedDraft = token === "good-draft" ? globalThis.previewDraft : globalThis.sharedPreviewDrafts?.[token];
      if (selectedDraft) {
        const d = selectedDraft;
        const locale = new URL(req.url, "http://localhost").searchParams.get("locale") ?? "ar";
        const over = (base, tr) => {
          if (!tr || typeof tr !== "object" || Array.isArray(tr) || !base || typeof base !== "object" || Array.isArray(base)) return tr ?? base;
          const out = { ...base };
          for (const [k, v] of Object.entries(tr)) out[k] = over(base[k], v);
          return out;
        };
        const sections = d.sections.filter((x) => x.isVisible).map((x, order) => ({ id: x.id, type: x.type, order, isVisible: true, data: x.tr?.[locale] ? over(x.data, x.tr[locale]) : x.data }));
        // The shared styles the editor is changing come with its preview (the backend's page-preview).
        return res.end(JSON.stringify({ ...home, id: d.pageId ?? home.id, slug: d.slug ?? home.slug, sections, format: 2, tree: d.tree, draft: { rev: d.rev, updatedAt: d.updatedAt }, ...(d.siteStyles !== undefined ? { siteStyles: d.siteStyles } : {}), ...(d.designTokens !== undefined ? { designTokens: d.designTokens } : {}) }));
      }
      if (token === "good-home") {
        const was = pageTreeOn;
        pageTreeOn = true;
        const out = asTreePage(home);
        pageTreeOn = was;
        return res.end(JSON.stringify(out));
      }
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: "PREVIEW_TOKEN" }));
    }
    if (pathname.endsWith("/storefront/page")) {
      const slug = new URL(req.url, "http://localhost").searchParams.get(
        "slug",
      );
      if (commerceCms && (slug === "/shop" || slug === "/cart")) return res.end(JSON.stringify(commercePage(slug.slice(1))));
      if (slug?.startsWith("/publication-fixture-")) {
        const page = globalThis.publishedCmsPages?.[slug];
        if (page) return res.end(JSON.stringify(page));
        res.statusCode = 404; return res.end("null");
      }
      if (slug === "/" && globalThis.ownedDesign && !globalThis.ownedDesign.page) { res.statusCode = 404; return res.end("{}"); }
      if (slug === "/") return res.end(JSON.stringify(globalThis.ownedDesign?.page ?? asTreePage(home)));
      if (slug === "/contact") return res.end(JSON.stringify(asTreePage(contact)));
      if (slug === "/tree-demo") return res.end(JSON.stringify(treeDemo));
      if (slug === "/expanded-demo") return res.end(JSON.stringify(expandedDemo));
      if (slug === "/scene-demo") return res.end(JSON.stringify(sectionSceneDemo));
      if (slug === "/slider-effects-demo") return res.end(JSON.stringify(sliderEffectsDemo));
      if (slug === "/reference-lab") {
        const file = new URL("../../.tmp/reference-ready-sections.json", import.meta.url);
        const sections = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
        return res.end(JSON.stringify(demoPage("reference-lab", sections)));
      }
      if (slug === "/showcase-demo") return res.end(JSON.stringify(showcaseDemo));
      if (slug === "/motion-media-demo") return res.end(JSON.stringify(motionMediaDemo));
      if (slug === "/media-demo") return res.end(JSON.stringify(mediaDemo));
      if (slug === "/models-demo") return res.end(JSON.stringify(modelsDemo));
      if (slug === "/blocks-demo") return res.end(JSON.stringify(blocksDemo));
      if (slug === "/interactive-demo") return res.end(JSON.stringify(interactiveDemo));
      if (slug === "/native-templates") return res.end(JSON.stringify(asTreePage({
        id: "native-templates", slug, name: "CMS templates", status: "PUBLISHED",
        sections: [
          { id: "native-hero", type: "HERO", order: 0, data: { title: "حملة بالقالب المنشور", themeId: "basic-centered", primaryButton: { label: "وجهة الحملة", href: "/shop" } } },
          { id: "native-features", type: "FEATURES", order: 1, data: { title: "مزايا القالب المنشور", themeId: "basic-grid-simple", items: [{ title: "خامة من CMS", text: "تفاصيل محفوظة" }] } },
          { id: "native-pricing", type: "PRICING", order: 2, data: { title: "خيارات القالب المنشور", themeId: "basic-simple", plans: [{ id: "one", name: "اختيار من CMS", price: 190, features: ["تفاصيل الخيار"] }] } },
          { id: "native-contact", type: "CONTACT", order: 3, anchorId: "native-contact", data: { title: "نموذج القالب المنشور", themeId: "basic-simple", form: { submitLabel: "إرسال من CMS" } } },
          { id: "native-slider", type: "BRANDS_SLIDER", order: 4, data: { title: "صور القالب المنشور", themeId: "basic-simple", items: [{ name: "صورة من CMS", imageUrl: "/editorial/scarves.webp" }] } },
        ],
      })));
      res.statusCode = 404;
      return res.end("null");
    }
    res.statusCode = 404;
    res.end("{}");
  })
  .listen(4100, "127.0.0.1");
