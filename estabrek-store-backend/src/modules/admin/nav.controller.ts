import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { validate } from "../../utils/validate.js";
import { asyncHandler } from "../../utils/async.js";
import { CreateMenuBody, UpdateMenuBody, CreateItemBody, UpdateItemBody, MoveItemBody } from "./nav.schemas.js";
import { revalidateStorefront } from "../../lib/storefrontRevalidate.js";
import { cacheDel } from "../../lib/cache.js";

const r = Router();

function triggerNavRevalidate() {
  void (async () => {
    await cacheDel("settings:public");
    await revalidateStorefront({
      tags: ["cms", "cms:settings", "cms:bootstrap"],
    });
  })();
}

// menus
r.get("/menus", asyncHandler(async (_req, res) => {
  const menus = await prisma.navigationMenu.findMany({ include: { items: true } });
  res.json(menus);
}));

r.post("/menus", validate({ body: CreateMenuBody }), asyncHandler(async (req, res) => {
  const menu = await prisma.navigationMenu.create({ data: req.body });
  triggerNavRevalidate();
  res.status(201).json(menu);
}));

r.patch("/menus/:id", validate({ body: UpdateMenuBody }), asyncHandler(async (req, res) => {
  const updated = await prisma.navigationMenu.update({ where: { id: req.params.id }, data: req.body });
  triggerNavRevalidate();
  res.json(updated);
}));

r.delete("/menus/:id", asyncHandler(async (req, res) => {
  await prisma.navigationMenu.delete({ where: { id: req.params.id } });
  triggerNavRevalidate();
  res.json({ ok: true });
}));

// items
r.post("/items", validate({ body: CreateItemBody }), asyncHandler(async (req, res) => {
  const item = await prisma.navigationItem.create({ data: req.body });
  triggerNavRevalidate();
  res.status(201).json(item);
}));

r.patch("/items/:id", validate({ body: UpdateItemBody }), asyncHandler(async (req, res) => {
  const item = await prisma.navigationItem.update({ where: { id: req.params.id }, data: req.body });
  triggerNavRevalidate();
  res.json(item);
}));

r.post("/items/:id/move", validate({ body: MoveItemBody }), asyncHandler(async (req, res) => {
  const item = await prisma.navigationItem.update({
    where: { id: req.params.id },
    data: { parentId: req.body.parentId ?? null, order: req.body.order },
  });
  triggerNavRevalidate();
  res.json(item);
}));

r.delete("/items/:id", asyncHandler(async (req, res) => {
  await prisma.navigationItem.delete({ where: { id: req.params.id } });
  triggerNavRevalidate();
  res.json({ ok: true });
}));

export default r;
