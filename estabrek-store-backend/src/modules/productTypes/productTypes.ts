/**
 * Product types and their custom fields (admin → أنواع المنتجات).
 *
 * The owner makes a kind of product ("ملابس", "تذكرة", "كورس") with its own
 * fields; each product of that kind keeps the values in Product.attributes as
 * { fieldKey: value }. No database change is needed for a new kind or field:
 * the fields are typed and checked here.
 */
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/httpError.js";

export const FIELD_KINDS = ["text", "longtext", "number", "select", "multiselect", "boolean", "date", "url"] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

const Option = z.string().trim().min(1).max(60);

export const FieldSchema = z
  .object({
    /** Stable id of the field (made once; the label can change freely). */
    key: z.string().trim().regex(/^[a-z][a-z0-9_]{0,31}$/, "a-z, 0-9, _ (starts with a letter)"),
    label: z.string().trim().min(1).max(60),
    kind: z.enum(FIELD_KINDS),
    unit: z.string().trim().max(16).optional(),
    options: z.array(Option).max(60).optional(),
    required: z.boolean().optional(),
    /** Shoppers can filter by it in the shop (select / multiselect / boolean). */
    filterable: z.boolean().optional(),
    /** Shown in the product page's details (default yes). */
    showOnPage: z.boolean().optional(),
    help: z.string().trim().max(160).optional(),
  })
  .superRefine((f, ctx) => {
    if ((f.kind === "select" || f.kind === "multiselect") && !f.options?.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least one choice" });
    }
    if (f.options && new Set(f.options).size !== f.options.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Choices repeat" });
    }
  });
export type FieldDef = z.infer<typeof FieldSchema>;

export const FieldsSchema = z
  .array(FieldSchema)
  .max(40)
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((f, i) => {
      if (seen.has(f.key)) ctx.addIssue({ code: "custom", path: [i, "key"], message: "Two fields have the same key" });
      seen.add(f.key);
    });
  });

export const TypeBody = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{0,47}$/)
    .optional(),
  description: z.string().trim().max(300).nullable().optional(),
  fields: FieldsSchema.default([]),
  colorLabel: z.string().trim().min(1).max(30).optional(),
  sizeLabel: z.string().trim().min(1).max(30).optional(),
  showColor: z.boolean().optional(),
  showSize: z.boolean().optional(),
  /** How it reaches the shopper: shipped, downloaded (files) or a booking (tickets). */
  fulfillment: z.enum(["SHIPPING", "DIGITAL", "BOOKING"]).optional(),
  position: z.number().int().min(0).max(1000).optional(),
});
export const TypePatch = TypeBody.partial();

/** Saved fields, read safely (a broken entry is skipped). */
export function fieldsOf(raw: unknown): FieldDef[] {
  if (!Array.isArray(raw)) return [];
  const out: FieldDef[] = [];
  for (const f of raw) {
    const ok = FieldSchema.safeParse(f);
    if (ok.success) out.push(ok.data);
  }
  return out;
}

type Json = Record<string, unknown>;
const isEmpty = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

/**
 * Checks and tidies the values of a product against its type's fields.
 * Unknown keys are dropped; empty values are removed. Returns errors per field.
 */
export function cleanAttributes(fields: FieldDef[], input: unknown): { values: Json; errors: Record<string, string> } {
  const src = input && typeof input === "object" && !Array.isArray(input) ? (input as Json) : {};
  const values: Json = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = src[f.key];
    if (isEmpty(raw)) {
      if (f.required) errors[f.key] = "مطلوب";
      continue;
    }
    switch (f.kind) {
      case "text":
      case "longtext": {
        const v = String(raw).trim();
        const max = f.kind === "text" ? 200 : 3000;
        if (v.length > max) errors[f.key] = `أطول من ${max} حرف`;
        else values[f.key] = v;
        break;
      }
      case "number": {
        const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
        if (!Number.isFinite(n)) errors[f.key] = "لازم يكون رقم";
        else values[f.key] = n;
        break;
      }
      case "boolean":
        values[f.key] = raw === true || raw === "true" || raw === 1 || raw === "1";
        break;
      case "date": {
        const s = String(raw).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) errors[f.key] = "تاريخ مش صحيح";
        else values[f.key] = s;
        break;
      }
      case "url": {
        const s = String(raw).trim();
        if (!/^https?:\/\/\S+$/i.test(s) || s.length > 500) errors[f.key] = "رابط مش صحيح";
        else values[f.key] = s;
        break;
      }
      case "select": {
        const s = String(raw).trim();
        if (!f.options?.includes(s)) errors[f.key] = "اختيار مش من القائمة";
        else values[f.key] = s;
        break;
      }
      case "multiselect": {
        const arr = (Array.isArray(raw) ? raw : [raw]).map((x) => String(x).trim()).filter(Boolean);
        const bad = arr.filter((x) => !f.options?.includes(x));
        if (bad.length) errors[f.key] = "اختيار مش من القائمة";
        else if (arr.length) values[f.key] = [...new Set(arr)];
        else if (f.required) errors[f.key] = "مطلوب";
        break;
      }
    }
  }
  return { values, errors };
}

/** The product page's "details" rows: label + value as text. */
export function specsOf(fields: FieldDef[], attributes: unknown) {
  const a = attributes && typeof attributes === "object" ? (attributes as Json) : {};
  const out: Array<{ key: string; label: string; value: string; kind: FieldKind }> = [];
  for (const f of fields) {
    if (f.showOnPage === false) continue;
    const v = a[f.key];
    if (isEmpty(v)) continue;
    let text: string;
    if (f.kind === "boolean") text = v === true ? "نعم" : "لا";
    else if (Array.isArray(v)) text = v.map(String).join("، ");
    else if (f.kind === "number") text = `${v}${f.unit ? ` ${f.unit}` : ""}`;
    else text = String(v);
    out.push({ key: f.key, label: f.label, value: text, kind: f.kind });
  }
  return out;
}

/** What the storefront needs to know about a type. */
export function publicType(t: { id: string; name: string; slug: string; colorLabel: string; sizeLabel: string; showColor: boolean; showSize: boolean; fulfillment?: string | null; fields: unknown }) {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    colorLabel: t.colorLabel,
    sizeLabel: t.sizeLabel,
    showColor: t.showColor,
    showSize: t.showSize,
    fulfillment: (t.fulfillment ?? "SHIPPING") as "SHIPPING" | "DIGITAL" | "BOOKING",
    fields: fieldsOf(t.fields).map((f) => ({ key: f.key, label: f.label, kind: f.kind, unit: f.unit, options: f.options, filterable: f.filterable === true })),
  };
}

export const publicTypeSelect = {
  id: true,
  name: true,
  slug: true,
  colorLabel: true,
  sizeLabel: true,
  showColor: true,
  showSize: true,
  fulfillment: true,
  fields: true,
} as const;

/** The type new products get when none is chosen: the first one. */
export async function defaultTypeId() {
  const t = await prisma.productType.findFirst({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
  return t?.id ?? null;
}

/**
 * Checks a product's type + values before saving. Returns the data to write
 * ({ typeId?, attributes? }) or throws a 400 with the field errors.
 */
export async function attributesForSave(input: { typeId?: string | null; attributes?: unknown }, current?: { typeId: string | null } | null) {
  const out: { typeId?: string | null; attributes?: Prisma.InputJsonValue | typeof Prisma.DbNull } = {};
  if (input.typeId !== undefined) out.typeId = input.typeId;
  const typeId = input.typeId !== undefined ? input.typeId : current?.typeId ?? null;
  if (typeId) {
    const t = await prisma.productType.findUnique({ where: { id: typeId }, select: { id: true, fields: true } });
    if (!t) {
      throw new AppError(400, "TYPE_NOT_FOUND", "This product type doesn't exist");
    }
    if (input.attributes !== undefined) {
      const { values, errors } = cleanAttributes(fieldsOf(t.fields), input.attributes);
      if (Object.keys(errors).length) {
          throw new AppError(400, "ATTRIBUTES_INVALID", "Some details aren't right", { errors });
      }
      out.attributes = values as Prisma.InputJsonValue;
    }
  } else if (input.attributes !== undefined) {
    out.attributes = (input.attributes && typeof input.attributes === "object" ? input.attributes : {}) as Prisma.InputJsonValue;
  }
  return out;
}

/* ---------------- Shop filters ---------------- */

/** attr_fabric=شيفون,كريب → { fabric: ["شيفون","كريب"] } (from the raw query). */
export function attrFiltersFrom(query: Record<string, unknown>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(query ?? {})) {
    const m = /^attr_([a-z][a-z0-9_]{0,31})$/.exec(k);
    if (!m) continue;
    const vals = (Array.isArray(v) ? v : [v])
      .flatMap((x) => String(x ?? "").split(","))
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (vals.length) out[m[1]] = [...new Set(vals)];
  }
  return out;
}

/** Products whose field has one of the values (works for one-choice and many-choice fields). */
export function attributesWhere(attrs: Record<string, string[]> | undefined): Prisma.ProductWhereInput[] {
  const out: Prisma.ProductWhereInput[] = [];
  for (const [key, vals] of Object.entries(attrs ?? {})) {
    const or: Prisma.ProductWhereInput[] = [];
    for (const v of vals) {
      or.push({ attributes: { path: [key], equals: v } });
      or.push({ attributes: { path: [key], array_contains: [v] } });
      if (v === "true" || v === "false") or.push({ attributes: { path: [key], equals: v === "true" } });
    }
    if (or.length) out.push({ OR: or });
  }
  return out;
}

/**
 * Filter choices with counts for the shop, from the filterable fields of the
 * types in scope (one type, or all types of the active products shown).
 */
export async function attributeFacets(where: Prisma.ProductWhereInput, typeSlug?: string) {
  const types = await prisma.productType.findMany({
    where: typeSlug ? { slug: typeSlug } : {},
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, fields: true },
  });
  const products = await prisma.product.findMany({ where, select: { typeId: true, attributes: true }, take: 5000 });
  const out: Array<{ key: string; label: string; kind: FieldKind; options: Array<{ value: string; count: number }> }> = [];
  const seen = new Set<string>();
  for (const t of types) {
    const inScope = products.filter((p) => p.typeId === t.id);
    if (!inScope.length) continue;
    for (const f of fieldsOf(t.fields)) {
      if (!f.filterable || seen.has(f.key)) continue;
      if (f.kind !== "select" && f.kind !== "multiselect" && f.kind !== "boolean") continue;
      seen.add(f.key);
      const counts = new Map<string, number>();
      for (const p of inScope) {
        const v = (p.attributes as Json | null)?.[f.key];
        const vals = Array.isArray(v) ? v.map(String) : v == null ? [] : [String(v)];
        for (const x of vals) counts.set(x, (counts.get(x) ?? 0) + 1);
      }
      const order = f.kind === "boolean" ? ["true", "false"] : f.options ?? [];
      const options = order.filter((o) => counts.get(o)).map((o) => ({ value: o, count: counts.get(o)! }));
      if (options.length) out.push({ key: f.key, label: f.label, kind: f.kind, options });
    }
  }
  return out;
}
