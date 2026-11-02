/**
 * Pages are edited in the new editor only (track B, phase 8 removed the old one): the old
 * addresses (/admin/pages/:id, its /classic and /preview) open the page there.
 */
import { Navigate, useParams } from "react-router-dom";

export function OpenInStudio() {
  const { id } = useParams();
  return <Navigate to={`/studio/${encodeURIComponent(id ?? "")}`} replace />;
}
