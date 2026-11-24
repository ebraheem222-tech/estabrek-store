// The admin's home when the store's face is a whole site (docs/clean-platform-plan.ar.md, phase 4.3): the site's
// own numbers first (members, applications, bookings… the first numbers on its panel's first page), with a way
// into its panel. A site that sells nothing sees these instead of the shop's (DashboardPage, siteKind.ts).
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSitePanelPage, listSitePanels, type PanelNumbers } from "../../api/sitePanels.api";
import { Numbers } from "../sitePanels/SitePanelPage";
import { Spinner } from "../../components/ui/Spinner";
import { adminLang } from "../../lib/lang";
import { say } from "../../studio/say";

export function SiteToday({ featureId }: { featureId: string }) {
  const lang = adminLang();
  const panels = useQuery({ queryKey: ["site-panels"], queryFn: listSitePanels, staleTime: 30_000, retry: false });
  const site = panels.data?.sites.find((s) => s.featureId === featureId);
  const first = site?.pages[0];
  // The same entry the site's page keeps (SitePanelPage), so opening it after is instant.
  const page = useQuery({
    queryKey: ["site-panel", featureId, first?.key, lang, "", ""],
    queryFn: () => getSitePanelPage(featureId, first!.key, lang),
    enabled: !!first,
    staleTime: 30_000,
    retry: false,
  });
  // A member who may see none of its pages, or a site without a panel: nothing here.
  if (!site || !first) return null;
  const numbers = (page.data?.parts ?? []).filter((p): p is PanelNumbers => p.kind === "numbers");
  return (
    <section className="space-y-3" data-testid="site-today">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">{site.name}</h2>
        <Link
          to={`/admin/site/${encodeURIComponent(featureId)}/${encodeURIComponent(first.key)}`}
          className="text-sm text-accent-300 hover:underline"
          data-testid="site-today-open"
        >
          {say("افتح لوحة الموقع|Open the site's panel|לפתוח את לוח האתר")}
        </Link>
      </div>
      {page.isLoading ? <Spinner /> : numbers.map((part) => <Numbers key={part.key} part={part} />)}
    </section>
  );
}
