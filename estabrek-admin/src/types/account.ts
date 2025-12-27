// src/types/account.ts
import type { ID, ISODateString } from "./common";
import type { Role } from "./auth";

export type AdminMe = {
  id: ID;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  secondEmail?: string | null;
  secondPhone?: string | null;
  twoFactorEnabled?: boolean;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
};

export type UpdateProfileInput = {
  name?: string;
  phone?: string | null;
  secondEmail?: string | null;
  secondPhone?: string | null;
};

export type EmailChangeRequestResponse = {
  ok: true;
};

export type EmailChangeConfirmResponse = {
  ok: true;
  email: string;
};
