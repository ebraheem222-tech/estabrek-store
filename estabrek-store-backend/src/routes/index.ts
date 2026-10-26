import { Router } from "express";
import v1 from "./v1.js";

const r = Router();
r.use("/v1", v1);

// keep root + health here too if you want
r.get("/", (_req, res) => res.json({ ok: true, api: "/v1" }));

export default r;
