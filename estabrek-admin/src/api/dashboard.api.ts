// src/api/dashboard.api.ts
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export async function getAdminOverview() {
  const res = await api.get(ENDPOINTS.admin.overview);
  return res.data as any; // shape depends on backend getDashboard()
}
