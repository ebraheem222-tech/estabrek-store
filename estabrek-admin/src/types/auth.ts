// src/types/auth.ts
import type { ID, ISODateString } from "./common";

export type Role = "SUPERADMIN";

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
