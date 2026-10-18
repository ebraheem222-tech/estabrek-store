import { describe, expect, test } from "vitest";
import { canReplace, codeNote, codesCount, importMessage, masked, previewCodes, variantLabel } from "./codesText";

const now = Date.parse("2026-10-18T12:00:00Z");
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

describe("Codes text", () => {
  test("counting codes in Arabic", () => {
    expect([0, 1, 2, 3, 10, 11, 250].map(codesCount)).toEqual(["ولا كود", "كود واحد", "كودين", "3 أكواد", "10 أكواد", "11 كود", "250 كود"]);
  });

  test("the pasted list is counted the way the server will", () => {
    expect(previewCodes('﻿code,value\nAAAA-1111,50\n\n"BBBB-2222",50\naaaa-1111\nx\nCCCC-3333\t\n')).toEqual({ count: 3, invalid: 1, repeated: 1 });
    expect(previewCodes("")).toEqual({ count: 0, invalid: 0, repeated: 0 });
    // A header only counts as one on the first line.
    expect(previewCodes("AAAA-1111\nkey").count).toBe(1);
    expect(previewCodes("AAAA-1111\nkeys1").count).toBe(2);
  });

  test("after the upload: what went in and what was skipped", () => {
    expect(importMessage({ added: 2, duplicates: 1, invalid: 1, invalidExamples: ["x"], available: 5 })).toEqual({
      title: "انضاف كودين · صار المتاح 5",
      description: "تخطّينا: كود واحد موجود من قبل أو مكرر، كود واحد مش مزبوط (مثل «x»)",
    });
    expect(importMessage({ added: 0, duplicates: 3, invalid: 0, invalidExamples: [], available: 3 }).title).toBe("ما انضاف ولا كود جديد");
    expect(importMessage({ added: 12, duplicates: 0, invalid: 0, invalidExamples: [], available: 12 }).description).toBeUndefined();
  });

  test("size names, masks and a code's story", () => {
    expect(variantLabel({ id: "v", sku: "SKU-1", color: "Steam", size: "50$", available: 0, delivered: 0, void: 0 })).toBe("Steam · 50$");
    expect(variantLabel({ id: "v", sku: "SKU-1", color: "", size: " ", available: 0, delivered: 0, void: 0 })).toBe("SKU-1");
    expect(variantLabel({ id: "v", sku: "SKU-1", color: "واحد", size: "واحد", available: 0, delivered: 0, void: 0 })).toBe("واحد");
    expect(masked("12X4")).toBe("•••• 12X4");
    expect(codeNote({ status: "available", batch: "فاتورة 17", createdAt: hoursAgo(2), deliveredAt: null, viewedAt: null }, now)).toBe("انضاف قبل ساعتين · فاتورة 17");
    expect(codeNote({ status: "delivered", batch: null, createdAt: hoursAgo(50), deliveredAt: hoursAgo(1), viewedAt: null }, now)).toBe("انباع قبل ساعة · لسا ما شافته");
    expect(codeNote({ status: "void", batch: null, createdAt: hoursAgo(50), deliveredAt: hoursAgo(5), viewedAt: hoursAgo(4) }, now)).toBe("انباع قبل 5 ساعات · شافته قبل 4 ساعات");
    expect(canReplace({ status: "delivered" }, false)).toBe(true);
    expect(canReplace({ status: "delivered" }, true)).toBe(false);
    expect(canReplace({ status: "void" }, false)).toBe(false);
  });
});
