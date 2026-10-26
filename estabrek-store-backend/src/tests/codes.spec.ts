import { describe, test, expect, beforeAll } from "vitest";

// Codes sold one per piece (game keys, gift cards): encryption, the uploaded
// list, and delivery times per product. No database.

let box: typeof import("../lib/secretBox.js");
let codes: typeof import("../modules/fulfillment/codes.service.js");
let types: typeof import("../modules/productTypes/productTypes.js");
beforeAll(async () => {
  process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/none";
  process.env.JWT_SECRET ||= "test-secret-at-least-16";
  box = await import("../lib/secretBox.js");
  codes = await import("../modules/fulfillment/codes.service.js");
  types = await import("../modules/productTypes/productTypes.js");
}, 60_000);

describe("Encryption", () => {
  test("a code goes in and comes out the same; never stored as it is", () => {
    const sealed = box.seal("STEAM-ABCD-1234");
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("ABCD");
    expect(box.open(sealed)).toBe("STEAM-ABCD-1234");
    // A fresh nonce each time: the same code never looks the same.
    expect(box.seal("STEAM-ABCD-1234")).not.toBe(sealed);
  });

  test("changed or wrong-key data is refused", () => {
    const sealed = box.seal("GIFT-9999");
    const parts = sealed.split(".");
    const flipped = parts[3].slice(0, -1) + (parts[3].endsWith("A") ? "B" : "A");
    expect(() => box.open([parts[0], parts[1], parts[2], flipped].join("."))).toThrow();
    expect(() => box.open(sealed, box.keysForTests("another-key-entirely"))).toThrow();
    expect(() => box.open("plain-text")).toThrow("SECRET_BOX_FORMAT");
  });

  test("the same code however it's typed has the same keyed hash", () => {
    expect(box.keyedHash("abcd-efgh 1234")).toBe(box.keyedHash(" ABCD-EFGH1234 "));
    expect(box.keyedHash("ABCD-EFGH-1234")).not.toBe(box.keyedHash("ABCD-EFGH-1235"));
    // Keyed: another key, another hash (nobody can check a guess without the key).
    expect(box.keyedHash("ABCD", box.keysForTests("k1-at-least-16-chars"))).not.toBe(box.keyedHash("ABCD", box.keysForTests("k2-at-least-16-chars")));
  });
});

describe("The uploaded list", () => {
  test("one per line or a CSV's first column; header, blanks and repeats dropped", () => {
    const r = codes.parseCodeList('code,value\nAAAA-1111,50\n\n"BBBB-2222",50\naaaa-1111\nx\nCCCC-3333\t\n');
    expect(r.codes).toEqual(["AAAA-1111", "BBBB-2222", "CCCC-3333"]);
    expect(r.repeated).toBe(1);
    expect(r.invalid).toEqual(["x"]);
  });

  test("the last 4, to tell codes apart", () => {
    expect(codes.last4Of("ABCD-EFGH-12x4")).toBe("12X4");
    expect(codes.last4Of("AB CD")).toBe("ABCD");
  });
});

describe("Delivery time", () => {
  test("the product's own, else its type's; nothing when neither says", () => {
    const type = { shipsFrom: "رام الله", deliveryMinDays: 2, deliveryMaxDays: 4 };
    expect(types.deliveryOf({}, type)).toEqual({ shipsFrom: "رام الله", minDays: 2, maxDays: 4 });
    expect(types.deliveryOf({ deliveryMinDays: 7, deliveryMaxDays: 14, shipsFrom: "الصين" }, type)).toEqual({ shipsFrom: "الصين", minDays: 7, maxDays: 14 });
    expect(types.deliveryOf({ deliveryMinDays: 1 }, type)).toEqual({ shipsFrom: "رام الله", minDays: 1, maxDays: 1 });
    expect(types.deliveryOf({ deliveryMinDays: 9, deliveryMaxDays: 3 }, null)).toEqual({ shipsFrom: null, minDays: 3, maxDays: 9 });
    expect(types.deliveryOf({}, null)).toBeNull();
  });
});
