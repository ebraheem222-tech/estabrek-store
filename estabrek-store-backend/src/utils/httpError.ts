export class AppError extends Error {
  statusCode: number;
  code: string;
  /** Extra data for the client (e.g. which SKUs clash). */
  details?: unknown;
  constructor(statusCode: number, code: string, message?: string, details?: unknown) {
    super(message ?? code);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/** Quick helpers */
export const NotFound = (msg = "Not found") => new AppError(404, "NOT_FOUND", msg);
export const BadRequest = (msg = "Bad request") => new AppError(400, "BAD_REQUEST", msg);
export const Forbidden = (msg = "Forbidden") => new AppError(403, "FORBIDDEN", msg);
export const Unauthorized = (msg = "Unauthorized") => new AppError(401, "UNAUTHORIZED", msg);
export const Conflict = (msg = "Conflict") => new AppError(409, "CONFLICT", msg);
