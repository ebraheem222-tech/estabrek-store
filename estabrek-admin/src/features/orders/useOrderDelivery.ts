import { useQuery } from "@tanstack/react-query";
import { getOrderDelivery } from "../../api/fulfillment.api";

/** An order's files/tickets. The status is in the key: accepting or cancelling refreshes it. */
export function useOrderDelivery(orderId: string, status: string) {
  return useQuery({ queryKey: ["admin", "orders", "delivery", orderId, status], queryFn: () => getOrderDelivery(orderId), retry: false, enabled: Boolean(orderId) });
}
