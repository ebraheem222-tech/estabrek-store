import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { prisma } from "../../lib/prisma.js";
import { getCategoriesTree } from "./catalog.service.js";

const r = Router();

r.get("/categories/tree", asyncHandler(async (_req, res) => {
  res.json(await getCategoriesTree());
}));

r.get("/categories", asyncHandler(async (_req, res) => {
  const out = await prisma.category.findMany({ orderBy: [{ parentId: "asc" }, { name: "asc" }] });
  res.json(out);
}));

export default r;
