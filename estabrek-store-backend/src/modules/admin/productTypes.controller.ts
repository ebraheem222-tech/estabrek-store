import { Router } from "express";
import { randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { syncDigitalStock } from "../fulfillment/fulfillment.service.js";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { AppError, NotFound } from "../../utils/httpError.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";
import { TypeBody, TypePatch, fieldsOf } from "../productTypes/productTypes.js";

/** /v1/admin/catalog/product-types — kinds of products and their fields (catalog:read / catalog:write). */
const r = Router();

const refresh = () => void revalidateStorefront({ tags: ["catalog"] }).catch(() => undefined);

function slugFrom(name: string) {
  const ascii = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return ascii || `type-${randomBytes(3).toString("hex")}`;
}

async function uniqueSlug(base: string, exceptId?: string) {
  let slug = base;
  for (let i = 2; i < 100; i++) {
    const hit = await prisma.productType.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === exceptId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

const view = (t: any, count?: number) => ({ ...t, fields: fieldsOf(t.fields), products: count ?? t._count?.products ?? 0, _count: undefined });

r.get(
  "/",
  asyncHandler(async (_req, res) => {
    const types = await prisma.productType.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    res.json({ types: types.map((t) => view(t)) });
  }),
);

r.post(
  "/",
  validate({ body: TypeBody }),
  asyncHandler(async (req, res) => {
    const b = req.body as ReturnType<typeof TypeBody.parse>;
    const slug = await uniqueSlug(b.slug ?? slugFrom(b.name));
    const last = await prisma.productType.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
    const t = await prisma.productType.create({
      data: {
        name: b.name,
        slug,
        description: b.description ?? null,
        fields: b.fields as any,
        colorLabel: b.colorLabel ?? "اللون",
        sizeLabel: b.sizeLabel ?? "المقاس",
        showColor: b.showColor ?? true,
        showSize: b.showSize ?? true,
        fulfillment: b.fulfillment ?? "SHIPPING",
        position: b.position ?? (last ? last.position + 1 : 0),
      },
    });
    refresh();
    res.status(201).json(view(t, 0));
  }),
);

r.patch(
  "/:id",
  validate({ body: TypePatch }),
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const cur = await prisma.productType.findUnique({ where: { id } });
    if (!cur) throw NotFound("This product type doesn't exist");
    const b = req.body as ReturnType<typeof TypePatch.parse>;
    const data: Record<string, unknown> = { ...b };
    if (b.slug) data.slug = await uniqueSlug(b.slug, id);
    if (b.fields) data.fields = b.fields as any;
    const t = await prisma.productType.update({ where: { id }, data, include: { _count: { select: { products: true } } } });
    if (t.fulfillment === "DIGITAL") await syncDigitalStock({ typeId: t.id });
    refresh();
    res.json(view(t));
  }),
);

/** DELETE ?moveTo=<typeId> moves its products first; without it, a type in use can't be deleted. */
r.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const cur = await prisma.productType.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!cur) throw NotFound("This product type doesn't exist");
    const moveTo = typeof req.query.moveTo === "string" ? req.query.moveTo : "";
    if (cur._count.products > 0) {
      if (!moveTo) throw new AppError(409, "TYPE_IN_USE", "Products use this type; move them first", { products: cur._count.products });
      if (moveTo === id || !(await prisma.productType.findUnique({ where: { id: moveTo }, select: { id: true } }))) {
        throw new AppError(400, "TYPE_NOT_FOUND", "Choose another type to move the products to");
      }
    }
    await prisma.$transaction([
      ...(cur._count.products ? [prisma.product.updateMany({ where: { typeId: id }, data: { typeId: moveTo } })] : []),
      prisma.productType.delete({ where: { id } }),
    ]);
    refresh();
    res.json({ ok: true, moved: cur._count.products });
  }),
);

export default r;
