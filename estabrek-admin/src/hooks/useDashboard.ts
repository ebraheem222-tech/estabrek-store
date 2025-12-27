// src/hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "../api/dashboard.api";

export function useDashboard() {
  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: getAdminOverview,
    staleTime: 30_000,
  });

  return { overviewQuery };
}
