/**
 * Copy guard for the rose storefront.
 *
 * CMS text is authored in Admin and stays the source of truth. A few early
 * placeholder strings (generic, masculine, or with a Latin "?") are upgraded
 * here so the live site reads well even before Admin is edited. Update the
 * text in Admin and these replacements simply stop matching.
 */

const ARABIC = /[؀-ۿ]/;

/** Arabic text gets the Arabic question mark and comma. */
export function arabicPunctuation(text?: string | null): string {
  const value = String(text ?? "");
  if (!ARABIC.test(value)) return value;
  return value.replace(/\?/g, "؟").replace(/,(?=\s|$)/g, "،");
}

const norm = (v?: string | null) => String(v ?? "").replace(/[؟?.!،,]/g, "").replace(/\s+/g, " ").trim();

const TEXT: Record<string, string> = {
  "يقدم لكم افضل خدمات": "قطع مختارة بعناية لكل يومكِ.",
  "يقدم لكم أفضل خدمات": "قطع مختارة بعناية لكل يومكِ.",
  "الخدمات رائعة تجدونها هنا": "تفاصيل صغيرة تصنع إطلالتكِ.",
  "يمكن طلب اي منتج تريده": "اطلبي أي قطعة تعجبكِ، ونوصلها حتى باب بيتكِ.",
  "يمكن طلب أي منتج تريده": "اطلبي أي قطعة تعجبكِ، ونوصلها حتى باب بيتكِ.",
  "تحتاج مساعدة": "تحتاجين مساعدة؟",
  "أرسل رسالة وسنرد عليك بسرعة": "أرسلي لنا رسالة، وسنرد عليكِ بسرعة.",
  "ارسل رسالة وسنرد عليك بسرعة": "أرسلي لنا رسالة، وسنرد عليكِ بسرعة.",
  "تواصل": "تواصلي معنا",
  "تواصل معنا": "تواصلي معنا",
  "كيف أطلب": "كيف أطلب؟",
  "اختر المنتج واللون والمقاس ثم أكمل الطلب": "اختاري القطعة واللون والمقاس، ثم أكملي الطلب من حقيبة التسوق.",
  "نرسل بسرعة حسب منطقتك": "نجهّز طلبكِ بسرعة، ومدة التوصيل تختلف حسب منطقتكِ. نرسل لكِ تفاصيل الشحن فور تأكيد الطلب.",
};

/** Upgrade a known placeholder string; otherwise only fix punctuation. */
export function polishCopy(text?: string | null): string {
  const key = norm(text);
  if (!key) return "";
  return TEXT[key] ?? arabicPunctuation(String(text).trim());
}

type Button = { label?: string; href?: string } | undefined;
const BUTTONS: Record<string, { label: string; href?: string }> = {
  "شراء": { label: "تسوّقي الآن", href: "/shop" },
  "اشتري": { label: "تسوّقي الآن", href: "/shop" },
  "بيت": { label: "اكتشفي المجموعة", href: "/#collections" },
  "الرئيسية": { label: "اكتشفي المجموعة", href: "/#collections" },
};

/** Hero buttons: weak one-word labels become clear calls to action. */
export function polishButton(button: Button): Button {
  if (!button?.label) return button;
  const hit = BUTTONS[norm(button.label)];
  if (!hit) return { ...button, label: arabicPunctuation(button.label) };
  // A button that points back to the homepage itself is replaced as well.
  const href = !button.href || button.href === "/" ? hit.href : button.href;
  return { label: hit.label, href };
}

export type FaqItem = { question: string; answer: string };

/** Store-policy questions shoppers look for before ordering. Edit in Admin → FAQ to override. */
const TRUST_FAQ: Array<FaqItem & { match: RegExp }> = [
  {
    match: /إرجاع|ارجاع|استبدال|ترجيع/,
    question: "هل يمكنني استبدال أو إرجاع القطعة؟",
    answer: "نعم. إذا لم يناسبكِ المقاس أو اللون، تواصلي معنا عبر واتساب ونرتّب لكِ الاستبدال بسهولة، بشرط أن تكون القطعة بحالتها الأصلية مع الملصق.",
  },
  {
    match: /مقاس|قياس/,
    question: "كيف أختار المقاس المناسب؟",
    answer: "ستجدين دليل المقاسات في صفحة كل منتج. إذا كنتِ بين مقاسين، اختاري الأكبر لإطلالة أكثر راحة، أو راسلينا وسنساعدكِ.",
  },
  {
    match: /دفع|الدفع|بطاقة|كاش/,
    question: "ما هي طرق الدفع؟",
    answer: "الدفع عند الاستلام متاح لكل الطلبات، فتدفعين فقط عندما تصلكِ القطعة.",
  },
  {
    match: /توصيل|شحن|يوصل|وصول|البلاد/,
    question: "هل توصلون لكل البلاد؟",
    answer: "نعم، نوصل لكل البلاد. مدة التوصيل تختلف حسب منطقتكِ، ونرسل لكِ التفاصيل فور تأكيد الطلب.",
  },
];

/** Polishes authored items and appends the policy questions that are missing. */
export function completeFaq(items: FaqItem[]): FaqItem[] {
  const polished = items
    .filter((i) => i?.question)
    .map((i) => ({ question: polishCopy(i.question), answer: polishCopy(i.answer) }));
  // Only the questions decide what is covered: an answer mentioning sizes is not a size guide.
  const text = polished.map((i) => i.question).join(" ");
  const extra = TRUST_FAQ.filter((f) => !f.match.test(text)).map(({ question, answer }) => ({ question, answer }));
  return [...polished, ...extra];
}
