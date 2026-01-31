// src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";

import { corsOrigins, env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.js";
import { requestId } from "./middleware/requestId.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { cacheControl } from "./middleware/cacheControl.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { httpsOnly } from "./middleware/httpsOnly.js";
import { originGuard } from "./middleware/originGuard.js";
import { csrfGuard } from "./middleware/csrf.js";
import { ipAccess } from "./middleware/ipAccess.js";
import webhooksRouter from "./routes/webhooks.route.js"; // ???? ?????? ??? ??????

const app = express();

// useful when behind a proxy / docker / nginx
app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);

// global middleware
app.use(requestId);
app.use(securityHeaders);
app.use(httpsOnly);
function isOriginAllowed(origin: string) {
  if (corsOrigins === "*") return true;
  return corsOrigins.some((rule) => {
    if (typeof rule === "string") return rule === origin;
    return rule.test(origin);
  });
}

function isExtraOriginAllowed(origin: string) {
  const o = origin.toLowerCase();
  if (o.endsWith(".pages.dev")) return true;
  if (o.startsWith("http://localhost") || o.startsWith("http://127.0.0.1")) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (isOriginAllowed(origin) || isExtraOriginAllowed(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(ipAccess);
app.use(originGuard);
app.use(rateLimit);
app.use(csrfGuard);
app.use(express.json({ limit: env.BODY_JSON_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: env.BODY_URLENCODED_LIMIT }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cacheControl);

// health + root
app.get("/health", (_req, res) => res.json({ ok: true, name: "estabrak-store" }));
app.get("/", (_req, res) => res.json({ ok: true, api: "/v1" }));
// versioned routes
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use(routes);
app.use("/v1/webhooks", webhooksRouter);

// 404 (before error handler)
app.use((req, res) => res.status(404).json({ error: "NOT_FOUND", path: req.path }));

// central error handler
app.use(errorHandler);

export default app;
