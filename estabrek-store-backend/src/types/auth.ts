export type AuthUser = {
  sub: string;           // the subject / user id
  /** SUPERADMIN = store owner (everything); STAFF = team member (permissions from their role). */
  role?: "SUPERADMIN" | "STAFF";
  email?: string;
  /** Set only by the local test bypass (never in production). */
  bypass?: boolean;
};

/** What the signed-in admin may do, loaded once per request by `loadAccess`. */
export type AdminAccess = {
  adminId: string;
  email: string | null;
  owner: boolean;
  roleName: string | null;
  permissions: Set<string>;
  /** Has two-step sign-in turned on. */
  twoFactor: boolean;
};
