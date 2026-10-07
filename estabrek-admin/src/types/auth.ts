// src/types/auth.ts
import type { ID, ISODateString } from "./common";

/** SUPERADMIN = store owner; STAFF = team member (permissions from their role). The others are older presets. */
export type Role = "SUPERADMIN" | "STAFF" | "ADMIN" | "EDITOR" | "MARKETING" | "SUPPORT";

/**
 * Admin user fields (from Prisma model AdminUser) - excluding secrets like passwordHash.
 */
export type AdminUser = {
  id: ID;
  email: string;
  name: string;
  role: Role;

  phone?: string | null;
  secondEmail?: string | null;
  secondPhone?: string | null;

  emailVerifiedAt?: ISODateString | null;
  phoneVerifiedAt?: ISODateString | null;

  twoFactorEnabled?: boolean;
  lastLoginAt?: ISODateString | null;

  /** From the server: owner of the store (every permission). */
  owner?: boolean;
  status?: "ACTIVE" | "INVITED" | "SUSPENDED";
  /** Team member's role. */
  staffRole?: { id: ID; name: string } | null;
  /** What this admin may do, as the server enforces it. */
  permissions?: string[];

  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginOk = AuthTokens & {
  admin: AdminUser;
};

export type LoginMfaRequired = {
  mfaRequired: true;
  sessionId: string;
  adminId?: ID;
};

export type LoginResponse = LoginOk | LoginMfaRequired;

/** JWT user payload your backend returns via /auth/me (minimum). */
export type JwtMeResponse = {
  user: {
    sub: ID;
    email?: string;
    role?: Role;
    iat?: number;
    exp?: number;
  };
};
