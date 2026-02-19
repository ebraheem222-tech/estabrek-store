// src/features/pages/pageTemplates.ts
import type { PageSectionType } from "../../api/pages.api";

export type PageTemplateSection = {
  type: PageSectionType;
  isVisible?: boolean;
  data: any;
};

export type PageTemplate = {
  id: "blank" | "landing" | "about" | "shop";
  label: string;
  description: string;
  defaultName: string;
  defaultSlug: string;
  sections: PageTemplateSection[];
};

/**
 * Page templates are opinionated defaults that create a full page (page + sections).
 * NOTE: we rely on the renderer understanding `data.components` (our CMS components engine).
 */
export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    description: "صفحة فاضية (بدون أقسام)",
    defaultName: "صفحة جديدة",
    defaultSlug: "/new-page",
    sections: [],
  },
  {
    id: "landing",
    label: "Landing",
    description: "Landing جاهزة: Hero + مميزات + منتجات + FAQ + CTA",
    defaultName: "Landing Page",
    defaultSlug: "/",
    sections: [
      {
        type: "HERO",
        data: {
          // keep classic hero fields for existing renderer
          title: "مرحبا 👋",
          subtitle: "اكتب وصف قصير عن البراند أو العرض",
          align: "center",
          primaryButton: { label: "تسوق الآن", href: "/shop" },
          secondaryButton: { label: "تواصل معنا", href: "/contact" },
          // components-driven styling (tokens/presets)
          components: [
            {
              id: "c-hero-h1",
              kind: "text",
              props: { as: "h1", text: "عنوان قوي للـLanding" },
              twTokens: { typography: { size: "5xl", weight: "bold", align: "center" }, spacing: { marginBottom: "lg" } },
            },
            {
              id: "c-hero-p",
              kind: "text",
              props: { as: "p", text: "جملة واحدة بتشرح ليش الزبون لازم يشتري منك." },
              twTokens: { typography: { size: "lg", align: "center", color: "muted" }, spacing: { marginBottom: "xl" } },
            },
            {
              id: "c-hero-actions",
              kind: "row",
              props: {
                children: [
                  {
                    id: "c-hero-btn1",
                    kind: "button",
                    props: { label: "تسوق الآن", href: "/shop" },
                    twTokens: { style: { bg: "gradient-sunset", radius: "2xl", shadow: "md" }, state: { hover: "lift" } },
                  },
                  {
                    id: "c-hero-btn2",
                    kind: "button",
                    props: { label: "اعرف أكثر", href: "/about" },
                    twTokens: { style: { bg: "solid-white", radius: "2xl", shadow: "sm" }, state: { hover: "glow" } },
                  },
                ],
              },
              twTokens: { layout: { display: "flex", flex: { justify: "center" } }, spacing: { gap: "sm" } },
            },
          ],
        },
      },
      {
        type: "GRID",
        data: {
          title: "ليش احنا؟",
          components: [
            { id: "c-feat-h2", kind: "text", props: { as: "h2", text: "مميزات سريعة" }, twTokens: { typography: { size: "3xl", weight: "bold", align: "center" }, spacing: { marginBottom: "lg" } } },
            {
              id: "c-feat-grid",
              kind: "grid",
              props: {
                cols: 3,
                children: [
                  { id: "c-feat-1", kind: "card", props: { title: "شحن سريع", text: "خلال 24-72 ساعة." }, twTokens: { style: { bg: "glass-md", radius: "2xl", shadow: "sm" } } },
                  { id: "c-feat-2", kind: "card", props: { title: "جودة عالية", text: "مواد ممتازة وتفاصيل نظيفة." }, twTokens: { style: { bg: "glass-md", radius: "2xl", shadow: "sm" } } },
                  { id: "c-feat-3", kind: "card", props: { title: "دعم ممتاز", text: "رد سريع عبر واتساب." }, twTokens: { style: { bg: "glass-md", radius: "2xl", shadow: "sm" } } },
                ],
              },
              twTokens: { layout: { display: "grid" }, spacing: { gap: "md" } },
            },
          ],
        },
      },
      {
        type: "BEST_SELLERS_SLIDER",
        data: {
          title: "الأكثر مبيعًا",
          // our Data Component (Step 7+) also works via components
          components: [
            { id: "c-best-h2", kind: "text", props: { as: "h2", text: "الأكثر مبيعًا" }, twTokens: { typography: { size: "3xl", weight: "bold" }, spacing: { marginBottom: "md" } } },
            { id: "c-best-slider", kind: "productSlider", props: { source: "bestSellers", limit: 12 }, twTokens: {} },
          ],
        },
      },
      {
        type: "FAQ",
        data: {
          title: "أسئلة شائعة",
          items: [
            { question: "كم مدة الشحن؟", answer: "عادة 2-4 أيام عمل." },
            { question: "هل في تبديل/إرجاع؟", answer: "نعم حسب سياسة المتجر." },
          ],
        },
      },
      {
        type: "CTA",
        data: {
          title: "جاهز تبدأ؟",
          subtitle: "ابدأ التسوق أو احكي معنا الآن",
          buttonLabel: "افتح المتجر",
          buttonHref: "/shop",
        },
      },
    ],
  },
  {
    id: "about",
    label: "About",
    description: "صفحة About: Hero + قصة + قيم + Testimonials",
    defaultName: "About",
    defaultSlug: "/about",
    sections: [
      { type: "HERO", data: { title: "عنّا", subtitle: "مين إحنا وليش بنعمل اللي بنعمله", align: "left" } },
      {
        type: "RICH_TEXT",
        data: { html: "<h2>قصتنا</h2><p>اكتب قصة البراند هون...</p><h3>قيمنا</h3><ul><li>جودة</li><li>شفافية</li><li>خدمة</li></ul>" },
      },
      { type: "TESTIMONIALS", data: { title: "شو بحكوا عنا", items: [{ name: "زبون", quote: "تجربة ممتازة!" }] } },
      { type: "CTA", data: { title: "تواصل معنا", subtitle: "إذا عندك سؤال — احنا جاهزين", buttonLabel: "اتصل", buttonHref: "/contact" } },
    ],
  },
  {
    id: "shop",
    label: "Shop",
    description: "صفحة Shop: Filters + ProductGrid + Pagination",
    defaultName: "Shop",
    defaultSlug: "/shop",
    sections: [
      {
        type: "GRID",
        data: {
          components: [
            { id: "c-shop-h1", kind: "text", props: { as: "h1", text: "المتجر" }, twTokens: { typography: { size: "4xl", weight: "bold" }, spacing: { marginBottom: "md" } } },
            { id: "c-shop-filters", kind: "filtersBar", props: {}, twTokens: {} },
            { id: "c-shop-grid", kind: "productGrid", props: { source: "all", limit: 24, cols: 3 }, twTokens: {} },
          ],
        },
      },
    ],
  },
];
