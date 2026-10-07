import "express-serve-static-core";
import type { AdminAccess, AuthUser } from "./auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;   // <- now TS knows req.user exists
    /** Permissions of the signed-in admin (admin routes only). */
    access?: AdminAccess;
    id?: string;       // optional, if you set requestId elsewhere
    cookies?: Record<string, string>;
  }
}
