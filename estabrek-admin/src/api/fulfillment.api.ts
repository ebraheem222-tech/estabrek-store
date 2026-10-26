// Digital products (files, codes) and bookings (tickets): product files and
// codes, an order's delivery (private link, email, tickets, codes) and the door
// (check-in).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";
import type { OrderLicence } from "./protected.api";

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

/* ---------------- Codes sold one per piece (game keys, gift cards) ---------------- */

export type CodeStatus = "available" | "delivered" | "void";

export type ProductCode = {
  id: string;
  variantId: string;
  last4: string;
  status: CodeStatus;
  batch: string | null;
  orderRequestId: string | null;
  deliveredAt: string | null;
  viewedAt: string | null;
  createdAt: string;
};

export type ProductCodesInfo = {
  variants: Array<{ id: string; sku: string; color: string; size: string; available: number; delivered: number; void: number }>;
  codes: ProductCode[];
  total: number;
  /** No CODES_ENCRYPTION_KEY on the server: the key comes from JWT_SECRET. */
  keyFromJwt: boolean;
};

export type CodesImportResult = { added: number; duplicates: number; invalid: number; invalidExamples: string[]; available: number };

export async function getProductCodes(productId: string, params: { status?: CodeStatus | null; take?: number; skip?: number } = {}) {
  const q = { ...(params.status ? { status: params.status } : {}), ...(params.take ? { take: params.take } : {}), ...(params.skip ? { skip: params.skip } : {}) };
  return (await api.get(ENDPOINTS.admin.catalog.productCodes(productId), { params: q })).data as ProductCodesInfo;
}
export async function importProductCodes(productId: string, body: { variantId: string; text: string; batch?: string | null }) {
  return (await api.post(ENDPOINTS.admin.catalog.productCodes(productId), body)).data as CodesImportResult;
}
export async function voidProductCode(productId: string, codeId: string) {
  return (await api.post(`${ENDPOINTS.admin.catalog.productCodes(productId)}/${codeId}/void`)).data as { ok: true };
}
export async function revealProductCode(productId: string, codeId: string) {
  return ((await api.post(`${ENDPOINTS.admin.catalog.productCodes(productId)}/${codeId}/reveal`)).data as { code: string }).code;
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
  /** Codes handed to this order (only the last 4 shown until revealed). */
  codes?: Array<{ id: string; productId: string; title: string; last4: string; status: CodeStatus; deliveredAt: string | null; viewedAt: string | null }>;
  /** Some lines are sold as codes. */
  sellsCodes?: boolean;
  /** Pieces still without a code (the list ran out). */
  codesMissing?: number;
  /** Protected products: the serials (last 4 only until revealed). */
  licences?: OrderLicence[];
  sellsLicences?: boolean;
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
export async function revealOrderCode(orderId: string, codeId: string) {
  return ((await api.post(`${ENDPOINTS.admin.orders.delivery(orderId)}/codes/${codeId}/reveal`)).data as { code: string }).code;
}
/** A bad code: voided, and the order takes the next one. */
export async function replaceOrderCode(orderId: string, codeId: string) {
  return (await api.post(`${ENDPOINTS.admin.orders.delivery(orderId)}/codes/${codeId}/replace`)).data as OrderDelivery;
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
