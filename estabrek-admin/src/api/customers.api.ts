// Shopper accounts (admin → الزبائن).
import { api } from "./http";
import { ENDPOINTS } from "./endpoints";

export type CustomerRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  lastLoginAt: string | null;
  marketingOptIn: boolean;
  orders: number;
  favourites: number;
};

export type CustomerDetails = {
  customer: CustomerRow & { emailVerifiedAt: string | null; preferredSize: string | null; favoriteColor: string | null };
  orders: Array<{ id: string; status: string; total: number | null; currencyCode: string; createdAt: string; paymentStatus: string | null; items: number }>;
  addresses: Array<{ id: string; label: string | null; fullName: string; phone: string; city: string; address: string; notes: string | null; isDefault: boolean }>;
  activeSessions: number;
  favourites: Array<{ id: string; title: string; slug: string; image: string | null; price: number | null }>;
  favouritesCount: number;
};

export async function listCustomers(params: { q?: string; status?: string; cursor?: string | null; take?: number }) {
  const res = await api.get(ENDPOINTS.admin.customers, {
    params: { q: params.q || undefined, status: params.status || undefined, cursor: params.cursor || undefined, take: params.take ?? 30 },
  });
  return res.data as {
    rows: CustomerRow[];
    total: number;
    nextCursor: string | null;
    /** The switch (off = visitors only). */
    accountsEnabled?: boolean;
    /** Email sending (Resend) is set up, so sign-in codes reach shoppers. */
    emailReady?: boolean;
  };
}

/** Turns shopper accounts on the storefront on or off (needs settings:write; kept in the settings history). */
export async function setCustomerAccounts(enabled: boolean) {
  const res = await api.patch(ENDPOINTS.admin.settings.base, { customerAccountsEnabled: enabled });
  return res.data as { customerAccountsEnabled?: boolean };
}

export async function getCustomer(id: string) {
  const res = await api.get(ENDPOINTS.admin.customer(id));
  return res.data as CustomerDetails;
}

export async function setCustomerStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
  const res = await api.patch(ENDPOINTS.admin.customer(id), { status });
  return res.data as { id: string; status: string };
}
