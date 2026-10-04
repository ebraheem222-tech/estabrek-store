import { describe, expect, it } from "vitest";
import { buildMessage, deliveryFor, nextStep, normalizeDelivery, orderTotal, waDigits, waLink } from "./orders";

const order = {
  id: "cmabcdef123456", customerName: "سارة أحمد", phone: "0544204029", status: "NEW", createdAt: new Date().toISOString(),
  city: "القدس", address: "بيت حنينا", total: "240",
  items: [{ productTitle: "فستان الورد", quantity: 1, colorName: "كحلي", sizeName: "M" }, { productTitle: "حجاب", quantity: 2 }],
};

describe("WhatsApp", () => {
  it("turns local numbers into wa.me numbers", () => {
    expect(waDigits("054-420-4029")).toBe("972544204029");
    expect(waDigits("0599123456")).toBe("970599123456");
    expect(waDigits("+972 54 420 4029")).toBe("972544204029");
    expect(waDigits("00970599123456")).toBe("970599123456");
    expect(waLink("", "x")).toBeNull();
  });
  it("writes a confirmation with items, total and address", () => {
    const text = buildMessage("confirm", order, { deliveryFee: 20 });
    expect(text).toContain("أهلاً سارة");
    expect(text).toContain("#123456");
    expect(text).toContain("فستان الورد (كحلي، مقاس M) × 1");
    expect(text).toContain("₪240 + توصيل ₪20 = ₪260");
    expect(text).toContain("القدس، بيت حنينا");
  });
});

describe("delivery fees", () => {
  const d = normalizeDelivery({ zones: [{ name: "القدس", fee: 20, cities: "القدس، بيت حنينا" }, { name: "الداخل", fee: 35, cities: ["حيفا", "الناصرة"] }], defaultFee: 40, freeOver: 500 });
  it("finds the zone by city, ignoring ال and spelling", () => {
    expect(deliveryFor("قدس", 100, d).fee).toBe(20);
    expect(deliveryFor("الناصره", 100, d).zone?.name).toBe("الداخل");
    expect(deliveryFor("جنين", 100, d).fee).toBe(40);
    expect(deliveryFor("حيفا", 600, d)).toMatchObject({ fee: 0, free: true });
    expect(deliveryFor("", 100, normalizeDelivery({})).fee).toBeNull();
  });
});

describe("order maths and flow", () => {
  it("totals and next step", () => {
    expect(orderTotal({ ...order, total: null, subtotal: 300, discountAmount: 30 })).toBe(270);
    expect(nextStep("NEW")).toBe("CONTACTED");
    expect(nextStep("CLOSED")).toBeNull();
  });
});
