export type AuthUser = {
  sub: string;           // the subject / user id
  role?: "SUPERADMIN";   // extend with more roles later
  email?: string;
};