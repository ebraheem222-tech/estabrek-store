// الميزات: every store switch in one place.
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type FeatureNeed = { label: string; ok: boolean; required?: boolean };

export type Feature = {
  key: string;
  title: string;
  description: string;
  /** Admin page where its details are set. */
  link: string | null;
  enabled: boolean;
  needs: FeatureNeed[];
  /** Everything it needs is in place. */
  ready: boolean;
};

export type FeatureGroup = { key: string; title: string; features: Feature[] };

export async function listFeatures() {
  const res = await api.get(ENDPOINTS.admin.features.base);
  return (res.data?.groups ?? []) as FeatureGroup[];
}

export async function setFeature(key: string, enabled: boolean) {
  const res = await api.patch(ENDPOINTS.admin.features.byKey(key), { enabled });
  return res.data as Feature;
}
