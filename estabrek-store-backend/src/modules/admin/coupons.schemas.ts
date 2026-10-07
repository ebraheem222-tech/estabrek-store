import { z } from "zod";
import { IdParam, ListQuery, PriceNumber } from "../../schemas/common.js";

const DiscountType = z.enum(["PERCENT", "FIXED"]);
const PercentNumber = z.coerce.number().min(0).max(100);

// Query: page/pageSize + q + active
export const CouponsListQuery = ListQuery;

export const CouponParams = IdParam;

// Keep it simple for now: code + usageLimit + minCart
export const CreateCouponBody = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(32)
      .regex(/^[a-zA-Z0-9_-]+$/, { message: "code must be alphanum/_/-" })
      .transform((v) => v.toUpperCase()),

    // coupon rules
    usageLimit: z.coerce.number().int().min(1).nullable().optional(),
    minCart: PriceNumber.nullable().optional(),

    // discount definition
    discountType: DiscountType.default("PERCENT"),
    discountValue: z.union([PriceNumber, PercentNumber]).default(0),
    maxDiscount: PriceNumber.nullable().optional(),

    isActive: z.boolean().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    note: z.string().max(200).nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.discountType === "PERCENT") {
      const p = Number(val.discountValue);
      if (Number.isNaN(p) || p < 0 || p > 100) {
        ctx.addIssue({ code: "custom", path: ["discountValue"], message: "percent must be 0..100" });
      }
    } else {
      const a = Number(val.discountValue);
      if (Number.isNaN(a) || a <= 0) {
        ctx.addIssue({ code: "custom", path: ["discountValue"], message: "amount must be > 0" });
      }
    }

    if (val.maxDiscount != null && Number(val.maxDiscount) < 0) {
      ctx.addIssue({ code: "custom", path: ["maxDiscount"], message: "maxDiscount must be >= 0" });
    }
  });

export const UpdateCouponBody = CreateCouponBody.partial();
