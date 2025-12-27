import { Router } from "express";
import { asyncHandler } from "../../utils/async.js";
import { validate } from "../../utils/validate.js";
import { MenuLocationParam } from "./settings.schemas.js";
import {
  getPublicSettings,
  getMenuTreeByLocation,
  getMenuTreeById,
} from "./settings.service.js";

const r = Router();

/** GET /v1/settings  → site settings + header/footer trees */
r.get("/", asyncHandler(async (_req, res) => {
  res.json(await getPublicSettings());
}));

/** GET /v1/settings/menu/:location  (HEADER|FOOTER|SECONDARY|CUSTOM) default menus by location */
r.get(
  "/menu/:location",
  validate({ params: MenuLocationParam }),
  asyncHandler(async (req, res) => {
    const { location } = req.params as unknown as { location: "HEADER" | "FOOTER" | "SECONDARY" | "CUSTOM" };
    const out = await getMenuTreeByLocation(location);
    if (!out) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(out);
  })
);

/** GET /v1/settings/menu/by-id/:id  (explicit menu id) */
r.get("/menu/by-id/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tree = await getMenuTreeById(id).catch(() => null);
  if (!tree) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ menuId: id, tree });
}));

export default r;
