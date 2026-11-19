// The payments functions asked for (their «اطلب دفع» step; backend lib/payLinks.ts,
// modules/admin/paymentRequests.controller.ts): who was asked, how much, for what, and whether it was paid.
import { api } from "./http";

export type PayStatus = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";
export type PayRow = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: PayStatus;
  /** The owner's own reference (a booking's row…). */
  ref: string | null;
  email: string | null;
  phone: string | null;
  provider: string | null;
  paymentReference: string | null;
  /** The shop's page to pay it on (a whole address when the server knows the shop's). */
  link: string;
  fnId: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};
export type PayList = { rows: PayRow[]; total: number; page: number; pageSize: number; /** What came in, per currency. */ paid: Array<{ currency: string; count: number; amount: number }> };

const BASE = "/admin/payment-requests";
export async function listPayments(q: { status?: PayStatus; q?: string; page?: number }) {
  return (await api.get(BASE, { params: q })).data as PayList;
}
/** Its link can't be paid any more (409 NOT_WAITING when it is paid or closed already). */
export async function cancelPayment(id: string) {
  return (await api.post(`${BASE}/${encodeURIComponent(id)}/cancel`)).data as PayRow;
}
