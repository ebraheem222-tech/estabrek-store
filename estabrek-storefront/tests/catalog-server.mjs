import http from "node:http";
import { readFileSync } from "node:fs";

const site = {
  id: "test",
  siteName: "متجر استبرق",
  currencyCode: "ILS",
  contactPhone: "+970599123456",
  contactEmail: "hello@estabrek.test",
  whatsappNumber: "970599123456",
  header: {
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
const products = [
  {
    id: "coat",
    title: "فستان الورد",
    slug: "rose-dress",
    minPrice: 320.5,
    primaryImageUrl: "http://localhost:3000/editorial/hijab-campaign.webp",
    category: categories[0],
    items: [
      { id: "rose", colorName: "Rose", colorHex: "#c97794", variants: [{ id: "m", sizeId: "m", size: { id: "m", name: "M" }, price: 320.5, stock: 5 }] },
      { id: "berry", colorName: "Berry", colorHex: "#6b2446", variants: [{ id: "berry-m", sizeId: "m", size: { id: "m", name: "M" }, price: 320.5, stock: 5 }, { id: "berry-l", sizeId: "l", size: { id: "l", name: "L" }, price: 320.5, stock: 3 }] },
    ],
  },
  {
    id: "bag",
    title: "شال وردي بتفاصيل ناعمة لإطلالة محتشمة كل يوم",
    slug: "rose-hijab",
    minPrice: 190,
    primaryImageUrl: "http://localhost:3000/editorial/hijab-campaign.webp",
    category: categories[1],
    items: [{ id: "lilac", colorName: "Lilac", colorHex: "#a08cbd", variants: [{ id: "one", sizeId: "one", size: { id: "one", name: "One size" }, price: 190, stock: 4 }] }],
  },
];
const extra = { ...products[1], id: "pearl", title: "حجاب لؤلؤي", slug: "pearl-hijab", minPrice: 280, items: [] };
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
http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    res.setHeader("Content-Type", "application/json");
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/editorial/hijab-campaign.webp") {
      res.setHeader("Content-Type", "image/webp");
      return res.end(
        readFileSync(
          new URL("../public/editorial/hijab-campaign.webp", import.meta.url),
        ),
      );
    }
    if (pathname.endsWith("/catalog/cart-quote") || pathname.endsWith("/catalog/order-requests")) {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const data = JSON.parse(body || "{}");
        const all = [...products, extra];
        const lines = (data.items || []).map((it) => {
          for (const p of all) for (const item of p.items || []) for (const v of item.variants || []) {
            if (v.id === it.variantId) {
              const img = item.images?.[0]?.url || p.images?.[0]?.url || p.primaryImageUrl;
              return { variantId: v.id, quantity: it.quantity, productTitle: p.title, productSlug: p.slug, colorName: item.colorName, sizeName: v.size?.name, imageUrl: img, unitPrice: v.price, lineSubtotal: v.price * it.quantity, lineTotal: v.price * it.quantity };
            }
          }
          return null;
        }).filter(Boolean);
        const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
        const off = String(data.couponCode || "").toUpperCase() === "ROSE10" ? subtotal * 0.1 : 0;
        if (pathname.endsWith("/order-requests")) { globalThis.lastOrder = data; return res.end(JSON.stringify({ id: "ORD-1042", status: "NEW" })); }
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
      return res.end(JSON.stringify(categories));
    if (pathname.includes("/catalog/products/slug/")) {
      const slug = decodeURIComponent(pathname.split("/").at(-1));
      return res.end(JSON.stringify(products.find(product => product.slug === slug) ?? null));
    }
    if (/\/catalog\/products\/[^/]+$/.test(pathname)) {
      const id = decodeURIComponent(pathname.split("/").at(-1));
      return res.end(JSON.stringify(products.find(product => product.id === id) ?? null));
    }
    if (pathname.endsWith("/catalog/products"))
    {
      const sp = new URL(req.url, "http://localhost").searchParams;
      let entries = [...products, extra];
      if (sp.get("categoryId")) entries = entries.filter(p => p.category.id === sp.get("categoryId"));
      if (sp.get("q")) entries = entries.filter(p => p.title.includes(sp.get("q")));
      if (sp.get("colors")) entries = entries.filter(p => p.items.some(i => sp.get("colors").split(",").includes(i.colorName)));
      if (sp.get("sizeIds")) entries = entries.filter(p => p.items.some(i => i.variants.some(v => sp.get("sizeIds").split(",").includes(v.sizeId))));
      if (sp.get("inStock")) entries = entries.filter(p => p.items.some(i => i.variants.some(v => v.stock > 0)));
      if (sp.has("minPrice")) entries = entries.filter(p => p.minPrice >= Number(sp.get("minPrice")));
      if (sp.has("maxPrice")) entries = entries.filter(p => p.minPrice <= Number(sp.get("maxPrice")));
      if (sp.get("sort") === "price_asc") entries.sort((a,b) => a.minPrice - b.minPrice);
      if (sp.get("sort") === "price_desc") entries.sort((a,b) => b.minPrice - a.minPrice);
      const page = Number(sp.get("page") || 1), pageSize = 2;
      return res.end(JSON.stringify({ items: entries.slice((page-1)*pageSize,page*pageSize), total: entries.length, page, pageSize, totalPages: Math.max(1, Math.ceil(entries.length/pageSize)), facets: { colors: [{ name:"Rose",hex:"#c97794",count:1 },{ name:"Lilac",hex:"#a08cbd",count:1 }], sizes: [{id:"m",name:"M",count:1},{id:"one",name:"One size",count:1}] } }));
    }
    if (pathname.endsWith("/storefront/page")) {
      const slug = new URL(req.url, "http://localhost").searchParams.get(
        "slug",
      );
      if (slug === "/") return res.end(JSON.stringify(home));
      if (slug === "/contact") return res.end(JSON.stringify(contact));
      if (slug === "/native-templates") return res.end(JSON.stringify({
        id: "native-templates", slug, name: "CMS templates", status: "PUBLISHED",
        sections: [
          { id: "native-hero", type: "HERO", order: 0, data: { title: "حملة بالقالب المنشور", themeId: "basic-centered", primaryButton: { label: "وجهة الحملة", href: "/shop" } } },
          { id: "native-features", type: "FEATURES", order: 1, data: { title: "مزايا القالب المنشور", themeId: "basic-grid-simple", items: [{ title: "خامة من CMS", text: "تفاصيل محفوظة" }] } },
          { id: "native-pricing", type: "PRICING", order: 2, data: { title: "خيارات القالب المنشور", themeId: "basic-simple", plans: [{ id: "one", name: "اختيار من CMS", price: 190, features: ["تفاصيل الخيار"] }] } },
          { id: "native-contact", type: "CONTACT", order: 3, anchorId: "native-contact", data: { title: "نموذج القالب المنشور", themeId: "basic-simple", form: { submitLabel: "إرسال من CMS" } } },
          { id: "native-slider", type: "BRANDS_SLIDER", order: 4, data: { title: "صور القالب المنشور", themeId: "basic-simple", items: [{ name: "صورة من CMS", imageUrl: "/editorial/scarves.webp" }] } },
        ],
      }));
      res.statusCode = 404;
      return res.end("null");
    }
    res.statusCode = 404;
    res.end("{}");
  })
  .listen(4100, "127.0.0.1");
