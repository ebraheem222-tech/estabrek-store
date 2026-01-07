import { prisma } from "../../lib/prisma.js";
import { getDefaultOpenAIModel, openaiResponsesJson } from "../../lib/openai.js";
import type { RecommendedProduct } from "../storefront/recommend.service.js";
import { recommendProducts } from "../storefront/recommend.service.js";

type Locale = "ar" | "he" | "en";

export type ChatbotSource = { id: string; title: string };

type ChatbotReply = {
  answer: string;
  mode: "kb" | "openai" | "fallback";
  sources: ChatbotSource[];
  shouldHandoff?: boolean;
  products?: RecommendedProduct[];
};

const STOP_WORDS = new Set([
  // Arabic common
  "في", "من", "الى", "إلى", "على", "عن", "ما", "ماذا", "هل", "كم", "اي", "أي", "هذا", "هذه", "ذلك", "تلك", "هناك", "هنا", "و", "او", "أو", "ثم",
  // English common
  "the", "and", "or", "to", "a", "an", "of", "in", "on", "for", "with", "is", "are",
]);

function tokenize(input: string): string[] {
  const s = String(input ?? "")
    .toLowerCase()
    .replace(/\u0640/g, "") // tatweel
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  if (!s) return [];

  return s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 2)
    .filter((t) => !STOP_WORDS.has(t))
    .slice(0, 50);
}

function scoreEntry(tokens: string[], entry: { title: string; answer: string; tags: string[]; priority: number }): number {
  if (!tokens.length) return 0;

  const title = entry.title.toLowerCase();
  const answer = entry.answer.toLowerCase();
  const tagSet = new Set((entry.tags ?? []).map((t) => String(t).toLowerCase()));

  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 3;
    else if (answer.includes(t)) score += 1;
    else if (tagSet.has(t)) score += 2;
  }

  // small boost for curated entries
  score += Math.max(-10, Math.min(10, entry.priority)) * 0.1;
  return score;
}

function isRecommendationIntent(message: string): boolean {
  const s = String(message ?? "").toLowerCase();
  if (!s.trim()) return false;
  // Arabic + English triggers (keep simple)
  return (
    s.includes("رشح") ||
    s.includes("ترشيح") ||
    s.includes("اقترح") ||
    s.includes("اقتراح") ||
    s.includes("recommend") ||
    s.includes("suggest")
  );
}

async function getSupportContact() {
  const s = await prisma.siteSettings.findFirst({
    select: { siteName: true, contactPhone: true, contactEmail: true },
  });
  return {
    siteName: s?.siteName ?? "Estabrek",
    phone: s?.contactPhone ?? null,
    email: s?.contactEmail ?? null,
  };
}

function toWhatsAppLink(phone: string): string | null {
  const digits = String(phone).replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function fallbackText(locale: Locale, contact: { siteName: string; phone: string | null; email: string | null }): string {
  const wa = contact.phone ? toWhatsAppLink(contact.phone) : null;
  if (locale === "en") {
    const parts = [
      `I couldn't find a precise answer right now.`,
      wa ? `WhatsApp support: ${wa}` : null,
      contact.email ? `Email: ${contact.email}` : null,
    ].filter(Boolean);
    return parts.join("\n");
  }
  if (locale === "he") {
    const parts = [
      `לא מצאתי תשובה מדויקת כרגע.`,
      wa ? `ווטסאפ לתמיכה: ${wa}` : null,
      contact.email ? `אימייל: ${contact.email}` : null,
    ].filter(Boolean);
    return parts.join("\n");
  }
  // ar
  const parts = [
    `لم أجد إجابة دقيقة الآن.`,
    wa ? `دعم واتساب: ${wa}` : null,
    contact.email ? `البريد: ${contact.email}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

export async function generateChatbotReply(opts: {
  locale: Locale;
  message: string;
}): Promise<ChatbotReply> {
  const locale = opts.locale ?? "ar";
  const msg = String(opts.message ?? "").trim();
  const tokens = tokenize(msg);

  // Product recommendation flow (uses AI ranking if available, always has fallback)
  if (isRecommendationIntent(msg)) {
    const rec = await recommendProducts({ locale, message: msg, limit: 6 });
    const products = rec.products ?? [];

    const lines = products.map((p) => `- ${p.title} — /p/${encodeURIComponent(p.slug)}`).join("\n");
    const tail =
      locale === "en"
        ? "\n\nTell me your budget, color, and size and I’ll refine the picks."
        : locale === "he"
        ? "\n\nתגיד/י לי תקציב, צבע ומידה ואדייק את ההמלצות."
        : "\n\nقلّي ميزانيتك/اللون/المقاس وراح أضبط الترشيحات أكثر.";

    const answerBase =
      locale === "en"
        ? `Sure — here are some recommendations:\n${lines || "- (no products found)"}`
        : locale === "he"
        ? `בטח — הנה כמה המלצות:\n${lines || "- (לא נמצאו מוצרים)"}`
        : `أكيد — هذه ترشيحات ممكن تعجبك:\n${lines || "- (لم يتم العثور على منتجات)"}`
    ;

    return {
      answer: `${answerBase}${tail}`,
      mode: rec.source === "openai" ? "openai" : "fallback",
      sources: [],
      products,
      shouldHandoff: false,
    };
  }

  // Pull all enabled entries for locale (bounded) and score client-side (simple + fast enough for small KBs).
  const all = await prisma.chatbotEntry.findMany({
    where: { locale, isEnabled: true },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 300,
  });

  const ranked = all
    .map((e) => ({ e, s: scoreEntry(tokens, { title: e.title, answer: e.answer, tags: e.tags, priority: e.priority }) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  const picked = ranked.slice(0, 6).map((x) => x.e);
  const sources: ChatbotSource[] = picked.map((e) => ({ id: e.id, title: e.title }));

  // If we have a clear KB hit, answer directly without AI.
  if (picked.length && (ranked[0]?.s ?? 0) >= 3) {
    return { answer: picked[0].answer, mode: "kb", sources };
  }

  // Try OpenAI (RAG-style) when configured.
  const model = getDefaultOpenAIModel();
  const sys = `You are a helpful e-commerce support assistant for a store.
Return STRICT JSON only: {"answer": string, "shouldHandoff": boolean, "confidence": number}.
Rules:
- Answer in the requested locale.
- Use ONLY the provided knowledge base. If not enough info, say you don't know and suggest contacting support.
- Never ask for passwords, OTP codes, or payment card data.
`;
  const user = {
    task: "chatbot_support",
    locale,
    customerMessage: msg,
    knowledgeBase: picked.map((e) => ({ id: e.id, title: e.title, answer: e.answer, tags: e.tags, priority: e.priority })),
    output: { answer: "string", shouldHandoff: "boolean", confidence: "0..1" },
  };

  const result = await openaiResponsesJson<any>({
    model,
    input: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify(user) },
    ],
    max_output_tokens: 450,
    temperature: 0.2,
  });

  if (result.ok) {
    const answer = typeof result.data?.answer === "string" ? result.data.answer.trim() : "";
    const shouldHandoff = result.data?.shouldHandoff === true;
    const confidence = typeof result.data?.confidence === "number" ? result.data.confidence : null;

    if (answer) {
      // If model is unsure, append support contact.
      if (confidence != null && confidence < 0.35) {
        const contact = await getSupportContact();
        return { answer: `${answer}\n\n${fallbackText(locale, contact)}`, mode: "openai", sources, shouldHandoff: true };
      }
      return { answer, mode: "openai", sources, shouldHandoff };
    }
  }

  // Final fallback
  const contact = await getSupportContact();
  return { answer: fallbackText(locale, contact), mode: "fallback", sources: [] };
}
