import { describe, expect, test } from "vitest";
import { channelWarning, cooldownText, newRule, ruleSentence } from "./automationText";

const ils = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
const shop = { email: "owner@shop.test", whatsapp: "+970599000000", phone: null };
const channels = { email: true, sms: false, whatsapp: false, outboxWorker: true };

describe("Automation texts", () => {
  test("a rule in a sentence", () => {
    expect(ruleSentence({ trigger: "order.created", conditions: { minTotal: 200 }, action: "whatsapp", config: {} }, shop)).toBe(`لما يجي طلب جديد (${ils(200)} وفوق) ← واتساب لـ +970599000000`);
    expect(ruleSentence({ trigger: "stock.low", conditions: { threshold: 3 }, action: "email", config: { to: "me@x.test" } }, shop)).toBe("لما يصير مقاس 3 أو أقل ← إيميل لـ me@x.test");
    expect(ruleSentence({ trigger: "product.viral", conditions: { factor: 3 }, action: "pinProduct", config: { hours: 24 } }, shop)).toBe("لما منتج تزيد شعبيته فجأة (×3 خلال ساعة) ← ثبّته بالكاش 24 ساعة");
    expect(ruleSentence({ trigger: "video.ready", conditions: {}, action: "sms", config: {} }, shop)).toBe("لما يجهز تحويل فيديو ← SMS (ما في عنوان: ضيفه)");
  });

  test("why a message may not arrive", () => {
    expect(channelWarning("whatsapp", channels)).toContain("مش موصول");
    expect(channelWarning("sms", channels)).toContain("Twilio");
    expect(channelWarning("email", channels)).toBeNull();
    expect(channelWarning("email", { ...channels, outboxWorker: false })).toContain("OUTBOX_WORKER");
    expect(channelWarning("notify", channels)).toBeNull();
  });

  test("how often, and new rules", () => {
    expect(cooldownText(0)).toBe("كل مرة");
    expect(cooldownText(30)).toBe("مرة كل 30 دقيقة لنفس الشي");
    expect(cooldownText(1440)).toBe("مرة كل 1 يوم لنفس الشي");
    expect(newRule("product.viral", { minScore: 20, factor: 3 })).toMatchObject({ action: "pinProduct", cooldownMinutes: 1440, config: { hours: 48 } });
    expect(newRule("order.created", {})).toMatchObject({ action: "whatsapp", cooldownMinutes: 0 });
  });
});
