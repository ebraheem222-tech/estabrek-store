// src/types/dashboard.ts
import type { OrderRequest } from "./orders";

/**
 * Admin overview endpoint can evolve (counts, charts, latest orders, etc),
 * so keep it flexible but typed for common parts.
 */
export type AdminOverview = {
  counts?: {
    ordersTotal?: number;
    ordersNew?: number;
    ordersContacted?: number;
    ordersAccepted?: number;
    ordersRejected?: number;
    ordersShipped?: number;
    ordersClosed?: number;

    outboxQueued?: number;
    outboxFailed?: number;
  };

  latestOrders?: OrderRequest[];

  // allow backend to add more keys without breaking frontend
  [k: string]: any;
};
