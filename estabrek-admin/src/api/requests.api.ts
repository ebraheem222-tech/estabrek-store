// «الطلبات الخاصة»: what shoppers asked for (sizes, colours, new pieces with
// photos) and Razan's "call me back" requests, plus their settings.
import { api } from "./http";

export type RequestKind = "SIZE" | "COLOR" | "NEW_PIECE" | "CALLBACK";
export type RequestStatus = "NEW" | "SEARCHING" | "FOUND" | "UNAVAILABLE" | "DONE";
type ProductRef = { id: string; title: string; slug: string };

export type CustomerRequestRow = {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  name: string;
  phone: string;
  email: string | null;
  productId: string | null;
  variantId: string | null;
  wantedSize: string | null;
  wantedColor: string | null;
  details: string | null;
  photoCount: number;
  photosDeletedAt: string | null;
  source: string | null;
  linkedProductId: string | null;
  notifiedAt: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  product: ProductRef | null;
  linkedProduct: ProductRef | null;
};

export type CustomerRequestDetails = Omit<CustomerRequestRow, "photoCount"> & {
  photoCount: number;
  photos: Array<{ url: string | null; width: number | null; height: number | null }>;
  productUrl: string | null;
  linkedUrl: string | null;
  emailReady: boolean;
};

export type RequestsSettings = {
  enabled: boolean;
  kinds: { size: boolean; color: boolean; newPiece: boolean };
  maxPhotos: number;
  photoDays: number;
  perPhoneDay: number;
};

export type RequestsSummary = {
  byKind: Partial<Record<RequestKind, number>>;
  status: Partial<Record<RequestStatus, number>>;
  sizes: Array<{ value: string; count: number }>;
  colors: Array<{ value: string; count: number }>;
  products: Array<ProductRef & { count: number }>;
  settings: RequestsSettings;
};

export type RequestsFilter = { status?: RequestStatus | "OPEN"; kind?: RequestKind; q?: string; page?: number };

export async function listRequests(f: RequestsFilter) {
  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== ""));
  return (await api.get("/admin/requests", { params })).data as { total: number; page: number; pageSize: number; requests: CustomerRequestRow[] };
}
export async function getRequest(id: string) {
  return (await api.get(`/admin/requests/${encodeURIComponent(id)}`)).data as CustomerRequestDetails;
}
export async function getSummary() {
  return (await api.get("/admin/requests/summary")).data as RequestsSummary;
}
export async function updateRequest(id: string, patch: Partial<{ status: RequestStatus; adminNote: string | null; linkedProductId: string | null }>) {
  return (await api.patch(`/admin/requests/${encodeURIComponent(id)}`, patch)).data as CustomerRequestRow;
}
export async function notifyRequest(id: string) {
  return (await api.post(`/admin/requests/${encodeURIComponent(id)}/notify`)).data as { whatsappText: string; phone: string; emailed: boolean };
}
export async function deleteRequest(id: string) {
  return (await api.delete(`/admin/requests/${encodeURIComponent(id)}`)).data as { ok: true };
}
export async function getRequestsSettings() {
  return (await api.get("/admin/requests-settings")).data as { settings: RequestsSettings; defaults: RequestsSettings; photosReady: boolean };
}
export async function saveRequestsSettings(s: RequestsSettings) {
  return (await api.put("/admin/requests-settings", s)).data as { settings: RequestsSettings };
}
