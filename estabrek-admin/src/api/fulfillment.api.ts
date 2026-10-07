// Digital products (files) and bookings (tickets): product files, an order's
// delivery (private link, email, tickets) and the door (check-in).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type Fulfillment = "SHIPPING" | "DIGITAL" | "BOOKING";

/* ---------------- Product files ---------------- */

export type ProductFile = {
  id: string;
  name: string;
  kind: "upload" | "link";
  url: string | null;
  bytes: number | null;
  format: string | null;
  position: number;
  createdAt: string;
  /** Orders that downloaded it. */
  orders: number;
};

export type ProductFilesInfo = { files: ProductFile[]; storageReady: boolean; maxUploadMb: number; maxDownloads: number };

export async function listProductFiles(productId: string) {
  return (await api.get(ENDPOINTS.admin.catalog.productFiles(productId))).data as ProductFilesInfo;
}

export async function uploadProductFile(productId: string, file: File, onProgress?: (pct: number) => void) {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(ENDPOINTS.admin.catalog.productFiles(productId), form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
  return res.data as ProductFile;
}

export async function addProductFileLink(productId: string, body: { name: string; url: string }) {
  return (await api.post(`${ENDPOINTS.admin.catalog.productFiles(productId)}/link`, body)).data as ProductFile;
}

export async function updateProductFile(productId: string, fileId: string, body: { name?: string; url?: string; position?: number }) {
  return (await api.patch(`${ENDPOINTS.admin.catalog.productFiles(productId)}/${fileId}`, body)).data as ProductFile;
}

export async function deleteProductFile(productId: string, fileId: string) {
  return (await api.delete(`${ENDPOINTS.admin.catalog.productFiles(productId)}/${fileId}`)).data as { ok: true };
}

/** A short-lived link for the owner to check the file. */
export async function productFileLink(productId: string, fileId: string) {
  return ((await api.get(`${ENDPOINTS.admin.catalog.productFiles(productId)}/${fileId}/link`)).data as { url: string }).url;
}

/* ---------------- Order delivery ---------------- */

export type TicketStatus = "VALID" | "USED" | "CANCELLED";

export type OrderDelivery = {
  needed: boolean;
  kinds: { shipping: boolean; digital: boolean; booking: boolean };
  closed: boolean;
  released: boolean;
  deliveredAt: string | null;
  path: string | null;
  url: string | null;
  storefrontUrlSet: boolean;
  email: string | null;
  emailReady: boolean;
  emailSentAt: string | null;
  phone: string;
  customerName: string;
  files: Array<{ id: string; name: string; productTitle: string; kind: string; downloads: number; lastAt: string | null }>;
  maxDownloads: number;
  tickets: Array<{ id: string; code: string; title: string; label: string | null; status: TicketStatus; checkedInAt: string | null; when: string | null }>;
  /** After sending: false = no email provider yet (only logged). */
  live?: boolean;
};

export async function getOrderDelivery(orderId: string) {
  return (await api.get(ENDPOINTS.admin.orders.delivery(orderId))).data as OrderDelivery;
}
export async function releaseOrderDelivery(orderId: string) {
  return (await api.post(`${ENDPOINTS.admin.orders.delivery(orderId)}/release`)).data as OrderDelivery;
}
export async function sendOrderDeliveryEmail(orderId: string, email?: string) {
  return (await api.post(`${ENDPOINTS.admin.orders.delivery(orderId)}/email`, email ? { email } : {})).data as OrderDelivery;
}
export async function newOrderDeliveryLink(orderId: string) {
  return (await api.post(`${ENDPOINTS.admin.orders.delivery(orderId)}/new-link`)).data as OrderDelivery;
}

/* ---------------- Tickets ---------------- */

export type Ticket = {
  id: string;
  code: string;
  label: string | null;
  holderName: string | null;
  phone: string;
  status: TicketStatus;
  orderClosed: boolean;
  checkedInAt: string | null;
  orderId: string;
  product: { id: string; title: string; when: string | null; startsAt: string | null; location: string | null };
};

export type BookingEvent = {
  id: string;
  title: string;
  isActive: boolean;
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  eventLocation: string | null;
  when: string | null;
  valid: number;
  used: number;
  cancelled: number;
};

export async function listBookingEvents() {
  return ((await api.get(ENDPOINTS.admin.tickets.events)).data as { events: BookingEvent[] }).events;
}
export async function listTickets(params: { productId?: string; status?: TicketStatus; q?: string; page?: number }) {
  return (await api.get(ENDPOINTS.admin.tickets.base, { params })).data as { total: number; page: number; pageSize: number; tickets: Ticket[] };
}
export async function findTicket(code: string) {
  return (await api.get(ENDPOINTS.admin.tickets.byCode(code))).data as Ticket;
}
export async function checkInTicket(id: string) {
  return (await api.post(ENDPOINTS.admin.tickets.checkIn(id))).data as Ticket;
}
export async function undoCheckIn(id: string) {
  return (await api.post(ENDPOINTS.admin.tickets.undo(id))).data as Ticket;
}
