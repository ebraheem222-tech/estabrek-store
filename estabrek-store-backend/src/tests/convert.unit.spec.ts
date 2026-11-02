import { describe, test, expect, beforeAll } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkTree } from "../lib/pageTree.js";

// Old sections turned into the new editor's elements (estabrek-admin src/studio/convert.ts):
// an example of every old section type, with translations, odd links and pictures; what comes
// out must pass the same check a page's tree passes before it's saved.

type N = { id: string; type: string; props: any; style?: any; children?: N[] };
type Converted = { ok: true; node: N; dropped: string[] } | { ok: false; why: string };
let convertSection: (s: unknown, main: string, ids: (p: string) => string, rose?: "opening" | "look") => Converted;
let htmlToRich: (html: string) => string;

beforeAll(async () => {
  const m = await import(pathToFileURL(path.resolve(__dirname, "../../../estabrek-admin/src/studio/convert.ts")).href);
  convertSection = m.convertSection;
  htmlToRich = m.htmlToRich;
});

const ids = () => {
  let n = 0;
  return (p: string) => `${p}-${n++}`;
};
const pic = "https://res.cloudinary.com/demo/image/upload/a.jpg";
const ui = { sectionClass: "py-20 bg-rose-50", containerClass: "" };
const EXAMPLES: Record<string, unknown> = {
  HERO: { title: "أهلاً", subtitle: "سطر", backgroundImageUrl: pic, overlay: 0.5, align: "left", primaryButton: { label: "تسوّقي", href: "/shop" }, secondaryButton: { label: "خطر", href: "javascript:alert(1)" }, ui },
  RICH_TEXT: { title: "قصتنا", html: "<p>نص <strong>عريض</strong> و<a href=\"/about\">رابط</a></p><ul><li>أول</li><li>تاني</li></ul><script>x()</script><a href=\"javascript:x\">خطر</a>" },
  GRID: { title: "شبكة", columns: 4, items: [{ title: "أ", text: "ن", imageUrl: pic, href: "/a" }, { title: "ب", imageUrl: "http://insecure.example/x.jpg" }] },
  CARDS: { title: "كروت", cards: [{ title: "أ", text: "ن", imageUrl: pic, badge: "جديد", buttonLabel: "شوفي", buttonHref: "/x" }] },
  FEATURES: { title: "ليش نحنا", columns: 3, items: [{ title: "توصيل", text: "سريع", icon: "truck" }, { title: "جودة", icon: "custom-icon" }, { title: "دعم", iconUrl: pic, href: "/help" }] },
  STATS: { title: "أرقام", items: [{ value: "+1000", label: "زبون", subtext: "مبسوط" }, { value: "4.9", label: "تقييم", icon: "star" }] },
  TEAM: { title: "الفريق", members: [{ name: "ليلى", role: "مؤسسة", bio: "قصة", avatarUrl: pic, socials: [{ href: "https://instagram.com/x" }, { href: "https://x.com/y" }] }, { name: "", role: "بلا اسم" }] },
  PRICING: { title: "باقات", plans: [{ name: "أساسي", price: "₪49", period: "شهرياً", description: "وصف", features: ["أ", "ب"], highlight: true, badge: "الأشهر", ctaLabel: "اختاري", ctaHref: "/shop" }] },
  CONTACT: { title: "تواصل", items: [{ label: "تلفون", value: "050", href: "tel:050" }, { label: "عنوان", value: "الناصرة" }], mapEmbedUrl: "https://maps.google.com/maps?q=Nazareth&output=embed", form: { title: "راسلونا", fields: [{ name: "x" }] } },
  BANNER: { text: "شحن مجاني", variant: "success", linkLabel: "التفاصيل", linkHref: "/policies" },
  FEATURED_CATEGORIES: { title: "أقسام", items: [{ label: "فساتين", href: "/c/dresses", imageUrl: pic }, { label: "شالات", href: "/c/scarves" }] },
  COLLECTIONS_GRID: { title: "مجموعات", columns: 3, items: [] },
  NEW_ARRIVALS_SLIDER: { title: "وصل جديد", limit: 10 },
  BEST_SELLERS_SLIDER: { title: "الأكثر مبيعاً", limit: 99 },
  FEATURED_PRODUCTS: { title: "مختارات", productIds: ["coat", "bad id!"], columns: 4 },
  BRANDS_SLIDER: { title: "ماركات", items: [{ name: "أ", logoUrl: pic, href: "https://brand.example" }, { name: "ب" }] },
  NEWSLETTER: { title: "اشتركي", text: "عروض", ctaLabel: "الشروط", ctaHref: "/terms" },
  IMAGE_GALLERY: { title: "معرض", columns: 4, images: [{ url: pic, alt: "صورة" }, { url: "data:image/png;base64,xx" }] },
  FAQ: { title: "أسئلة", items: [{ question: "كم التوصيل؟", answer: "<p>يومين</p>" }] },
  TESTIMONIALS: { title: "آراء", items: [{ name: "سارة", role: "زبونة", quote: "حلو", avatarUrl: pic }] },
  CTA: { title: "يلا", subtitle: "خصم", imageUrl: pic, buttonLabel: "تسوّقي", buttonHref: "/shop" },
  VIDEO: { title: "فيديو", url: "https://cdn.example.com/film.mp4", posterUrl: pic, provider: "MP4", autoplay: true },
};
const translations = (type: string): Record<string, unknown> => (type === "FAQ" ? { en: { title: "Questions", items: [{ question: "How long?", answer: "Two days" }] }, he: { title: "שאלות" } } : { en: { title: "In English" } });

describe("old sections as the new editor's elements", () => {
  test("every type that can come along passes the page's check, its words in each language", () => {
    for (const [type, data] of Object.entries(EXAMPLES)) {
      const r = convertSection({ id: `s-${type}`, type, data, isVisible: true, tr: translations(type) }, "ar", ids());
      expect(r.ok, type).toBe(true);
      if (!r.ok) continue;
      const check = checkTree({ version: 1, root: { id: "page", type: "page", props: {}, children: [r.node] } });
      expect(check.ok ? [] : check.issues.slice(0, 3), type).toEqual([]);
      expect(r.node.type).toBe("section");
    }
  });

  test("what stays an old section, and why", () => {
    const why = (type: string, data: unknown) => {
      const r = convertSection({ id: "x", type, data, isVisible: true }, "ar", ids());
      return r.ok ? "ok" : r.why;
    };
    expect(why("HERO", { title: "x", roseHeroFilm: true })).toBe("rose");
    expect(why("CUSTOM_HTML", { html: "<b>x</b>" })).toBe("html");
    expect(why("VIDEO", { url: "https://youtube.com/watch?v=1", provider: "YOUTUBE" })).toBe("video");
    expect(why("GRID", { blocks: [{ type: "FAQ", data: {} }] })).toBe("nested");
    expect(why("GLOBAL_HEADER", {})).toBe("global");
    expect(why("SOMETHING_ELSE", {})).toBe("unknown");
  });

  test("words in each language, lists whole from a translation, and what doesn't come along said", () => {
    const r = convertSection({ id: "f", type: "FAQ", data: EXAMPLES.FAQ, isVisible: false, tr: translations("FAQ") }, "ar", ids());
    if (!r.ok) throw new Error("FAQ should convert");
    const text = JSON.stringify(r.node);
    expect(text).toContain('"q":{"ar":"كم التوصيل؟","en":"How long?"}');
    expect(text).toContain('"a":{"ar":"يومين","en":"Two days"}');
    expect(text).toContain('{"ar":"أسئلة","en":"Questions","he":"שאלות"}');
    expect(r.node.style.base.hidden).toBe(true);
    const team = convertSection({ id: "t", type: "TEAM", data: EXAMPLES.TEAM, isVisible: true }, "ar", ids());
    expect(team.ok && team.dropped.sort()).toEqual(["bio", "socials"]);
    const hero = convertSection({ id: "h", type: "HERO", data: EXAMPLES.HERO, isVisible: true }, "ar", ids());
    expect(hero.ok && hero.dropped).toEqual(["look"]);
    expect(JSON.stringify(hero)).not.toContain("javascript");
    const gallery = convertSection({ id: "g", type: "IMAGE_GALLERY", data: EXAMPLES.IMAGE_GALLERY, isVisible: true }, "ar", ids());
    expect(gallery.ok && gallery.dropped).toEqual(["pictures"]);
  });

  test("in the rose design the home's opening stays, and turning the rest says their rose look stays behind", () => {
    const plainHero = { id: "h", type: "HERO", data: { title: "أهلاً" }, isVisible: true };
    expect(convertSection(plainHero, "ar", ids(), "opening")).toEqual({ ok: false, why: "rose" });
    const faq = convertSection({ id: "f", type: "FAQ", data: EXAMPLES.FAQ, isVisible: true }, "ar", ids(), "look");
    expect(faq.ok && faq.dropped).toEqual(["roseLook"]);
    // Outside the rose design a plain opening turns.
    expect(convertSection(plainHero, "ar", ids()).ok).toBe(true);
  });

  test("old HTML words become the new rich words", () => {
    expect(htmlToRich('<p>نص <strong>عريض</strong> و<a href="/about">رابط</a></p><ul><li>أول</li></ul><script>x()</script><a href="javascript:x">خطر</a> &amp; &nbsp;'))
      .toBe("نص [b]عريض[/b] و[link=/about]رابط[/link]\n• أول\n\nخطر &");
  });
});
