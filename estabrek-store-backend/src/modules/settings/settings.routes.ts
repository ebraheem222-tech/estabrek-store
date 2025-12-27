import { Router } from "express";
import settings from "./settings.controller.js";

const r = Router();
r.use("/", settings);
export default r;
