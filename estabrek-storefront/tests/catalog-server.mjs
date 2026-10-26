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
const asTreePage = (p) =>
  pageTreeOn
    ? { ...p, format: 2, tree: { version: 1, root: { id: "page", type: "page", children: p.sections.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((s) => ({ id: `s-${s.id}`, type: "legacy", props: { sectionId: s.id } })) } } }
    : p;
// A page of new elements in three languages, with one old section in the middle.
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
    // Delivery prices from the admin (header.delivery), switched on by the delivery test.
    if (pathname === "/__test/delivery") {
      const on = new URL(req.url, "http://localhost").searchParams.get("on") === "1";
      if (on) site.header.delivery = { zones: [{ id: "z1", name: "القدس", fee: 20, cities: ["القدس", "بيت حنينا"] }, { id: "z2", name: "الداخل", fee: 35, cities: ["حيفا", "الناصرة"] }], defaultFee: 50, freeOver: 800 };
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
        // {"options": {...}} also sets the store's own models and games for that theme.
        const { options, ...choice } = data;
        if (choice.id) site.header.storeTheme = choice; else delete site.header.storeTheme;
        if (options && choice.id) site.header.storeThemeOptions = { [choice.id]: options }; else delete site.header.storeThemeOptions;
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (pathname === "/__test/preview-draft" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        globalThis.previewDraft = body ? JSON.parse(body) : null;
        res.end("{}");
      });
      return;
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
              return { variantId: v.id, quantity: it.quantity, productTitle: p.title, productTranslations: p.translations ?? {}, productSlug: p.slug, colorName: item.colorName, sizeName: v.size?.name, imageUrl: img, unitPrice: v.price, lineSubtotal: v.price * it.quantity, lineTotal: v.price * it.quantity, available: v.stock ?? 99, fulfillment: p.type?.fulfillment ?? "SHIPPING", eventStartsAt: p.eventStartsAt ?? null };
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
      return res.end(JSON.stringify([...products, ...handoverProducts].find(product => product.slug === slug) ?? null));
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
      if (token === "good") return res.end(JSON.stringify(treeDemo));
      // The admin's draft as the editor's end-to-end check posts it (/__test/preview-draft).
      if (token === "good-draft" && globalThis.previewDraft) {
        const d = globalThis.previewDraft;
        const locale = new URL(req.url, "http://localhost").searchParams.get("locale") ?? "ar";
        const over = (base, tr) => {
          if (!tr || typeof tr !== "object" || Array.isArray(tr) || !base || typeof base !== "object" || Array.isArray(base)) return tr ?? base;
          const out = { ...base };
          for (const [k, v] of Object.entries(tr)) out[k] = over(base[k], v);
          return out;
        };
        const sections = d.sections.filter((x) => x.isVisible).map((x, order) => ({ id: x.id, type: x.type, order, isVisible: true, data: x.tr?.[locale] ? over(x.data, x.tr[locale]) : x.data }));
        return res.end(JSON.stringify({ ...home, id: d.pageId ?? home.id, sections, format: 2, tree: d.tree, draft: { rev: d.rev, updatedAt: d.updatedAt } }));
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
      if (slug === "/") return res.end(JSON.stringify(asTreePage(home)));
      if (slug === "/contact") return res.end(JSON.stringify(asTreePage(contact)));
      if (slug === "/tree-demo") return res.end(JSON.stringify(treeDemo));
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
