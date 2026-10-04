import "express-serve-static-core";
import type { AuthUser } from "./auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;   // <- now TS knows req.user exists
    id?: string;       // optional, if you set requestId elsewhere
  }
}