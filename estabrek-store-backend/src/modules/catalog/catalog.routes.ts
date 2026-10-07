import { Router } from "express";
import category from "./category.routes.js";
import product from "./product.routes.js";
import item from "./item.routes.js";
import variant from "./variant.routes.js";
import media from "./media.routes.js";

const r = Router();

r.use("/", category);
r.use("/", product);
r.use("/", item);
r.use("/", variant);
r.use("/", media);

export default r;
