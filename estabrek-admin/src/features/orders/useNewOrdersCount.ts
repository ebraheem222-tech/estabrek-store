import { useOrdersSummary } from "../../hooks/useOrders";

/** How many orders wait in «جديد» (shared poll with the alerts). */
export function useNewOrdersCount() {
  const q = useOrdersSummary();
  return q.data?.counts?.NEW ?? 0;
}
