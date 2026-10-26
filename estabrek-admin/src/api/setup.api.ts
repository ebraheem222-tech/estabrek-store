// src/api/setup.api.ts — setting up a new store (/v1/admin/setup).
import { api } from "./http";
import type { SetupRequest } from "../features/setup/buildSetup";

/** Put off with «بعدين»: the wizard doesn't open on its own again this visit. */
export const SETUP_LATER_KEY = "setup-wizard-later";

export type SetupStatus = {
  /** Never set up and nothing in the catalog yet: the wizard opens on its own. */
  needed: boolean;
  setup: { done?: boolean; industry?: string; at?: string } | null;
  counts: { products: number; categories: number; pages: number };
  hasHome: boolean;
  owner: boolean;
  mainLanguage: "ar" | "en" | "he";
};

export type SetupResult = {
  ok: true;
  made: { categories: number; types: number; pages: number; menuItems: number };
  kept: { categories: number; types: number; pages: number };
  mainLanguage: "ar" | "en" | "he";
};

export async function getSetupStatus(): Promise<SetupStatus> {
  const { data } = await api.get("/admin/setup/status");
  return data;
}

export async function applySetup(body: SetupRequest): Promise<SetupResult> {
  const { data } = await api.post("/admin/setup/apply", body);
  return data;
}
