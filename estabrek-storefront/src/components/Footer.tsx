import Link from "next/link";
import type { MenuTree, SitePublicSettings, NavItem } from "@/lib/types";

const policies = [
  { href: "/policies/privacy", label: "الخصوصية" },
  { href: "/policies/terms", label: "الشروط والأحكام" },
  { href: "/policies/refund", label: "سياسة الاسترجاع" },
  { href: "/policies/shipping", label: "سياسة الشحن" },
];

function FooterItem({ item }: { item: NavItem }) {
  const href = item.href || "#";
  const external = !!item.isExternal || /^https?:\/\//.test(href);

  const linkClassName = "text-sm text-white/70 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block relative group";

  const LinkEl = external ? (
    <a
      href={href}
      target={item.target || "_blank"}
      rel="noopener noreferrer"
      className={linkClassName}
    >
      <span className="relative z-10">{item.label}</span>
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] group-hover:w-full transition-all duration-300"></span>
    </a>
  ) : (
    <Link href={href} className={linkClassName}>
      <span className="relative z-10">{item.label}</span>
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] group-hover:w-full transition-all duration-300"></span>
    </Link>
  );

  if (item.children && item.children.length) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-semibold text-white/90">{item.label}</div>
        <div className="space-y-1">
          {item.children.map((c) => (
            <FooterItem key={c.id} item={c} />
          ))}
        </div>
      </div>
    );
  }

  return <div>{LinkEl}</div>;
}

export function Footer({
  site,
  footerMenu,
  footer,
}: {
  site: SitePublicSettings;
  footerMenu: MenuTree;
  footer?: any;
}) {
  const tree = footerMenu?.tree ?? [];

  const cfg = (footer && typeof footer === "object") ? footer : null;
  const enabled = cfg ? (cfg.enabled !== false) : false;
  const template: "minimal" | "columns" | "mega" = cfg?.template === "columns" || cfg?.template === "mega" ? cfg.template : "minimal";
  const bgPreset: "solid" | "gradient" | "glass" = cfg?.bgPreset === "gradient" || cfg?.bgPreset === "glass" ? cfg.bgPreset : "solid";
  const siteFooterText = typeof site.footer === "string" ? site.footer : null;

  const bgClass =
    bgPreset === "glass"
      ? "border-t border-white/[0.08] bg-white/[0.04] backdrop-blur-xl"
      : bgPreset === "gradient"
      ? "border-t border-[var(--accent)]/20 bg-gradient-to-b from-[var(--surface)]/80 via-[var(--surface-2)]/60 to-black/70 backdrop-blur-md"
      : "border-t border-white/[0.08] bg-black/30";

  const columns: any[] = Array.isArray(cfg?.columns) ? cfg.columns : [];
  const socials = cfg?.social && typeof cfg.social === "object" ? cfg.social : {};
  const newsletter = cfg?.newsletter && typeof cfg.newsletter === "object" ? cfg.newsletter : null;
  const bottom = cfg?.bottom && typeof cfg.bottom === "object" ? cfg.bottom : {};
  const policyLinks: any[] = Array.isArray(bottom?.policyLinks) ? bottom.policyLinks : policies;

  if (enabled) {
    return (
      <footer className={"footer-candy-glass font-arabic mt-10 " + bgClass}>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className={template === "minimal" ? "grid gap-8 md:grid-cols-2" : template === "columns" ? "grid gap-8 md:grid-cols-3" : "grid gap-8 md:grid-cols-4"}>
            {/* About */}
            <div className="space-y-2">
              <div className="text-base font-semibold">{site.siteName || "Store"}</div>
              {cfg?.about?.title ? <div className="text-sm font-semibold text-white/90">{cfg.about.title}</div> : null}
              {cfg?.about?.text ? <div className="text-sm text-white/70">{cfg.about.text}</div> : (siteFooterText ? <div className="text-sm text-white/70">{siteFooterText}</div> : null)}
              {site.contactEmail ? <div className="text-sm text-white/70">✉️ {site.contactEmail}</div> : null}
              {site.contactPhone ? <div className="text-sm text-white/70">📞 {site.contactPhone}</div> : null}

              {/* Socials */}
              <div className="mt-3 flex flex-wrap gap-3">
                {Object.entries(socials)
                  .filter(([, v]) => typeof v === "string" && v)
                  .map(([k, v]) => (
                    <a key={k} href={String(v)} target="_blank" rel="noopener noreferrer" className="text-sm text-white/70 hover:text-white">
                      {k}
                    </a>
                  ))}
              </div>
            </div>

            {/* Columns */}
            {columns.length ? (
              <div className={template === "minimal" ? "grid gap-6 md:grid-cols-2" : template === "columns" ? "md:col-span-2 grid gap-6 md:grid-cols-2" : "md:col-span-2 grid gap-6 md:grid-cols-2"}>
                {columns.map((col) => (
                  <div key={col.id || col.title} className="space-y-2">
                    <div className="text-sm font-semibold text-white/90">{col.title || ""}</div>
                    <div className="space-y-1">
                      {(Array.isArray(col.links) ? col.links : []).map((l: any) => (
                        <div key={l.id || l.href}>
                          {/^https?:\/\//.test(String(l.href || "")) ? (
                            <a href={String(l.href)} target="_blank" rel="noopener noreferrer" className="text-sm text-white/70 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block relative group">
                              <span className="relative z-10">{l.label || l.href}</span>
                              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] group-hover:w-full transition-all duration-300"></span>
                            </a>
                          ) : (
                            <Link href={String(l.href || "#")} className="text-sm text-white/70 hover:text-white transition-all duration-200 hover:translate-x-1 inline-block relative group">
                              <span className="relative z-10">{l.label || l.href}</span>
                              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] group-hover:w-full transition-all duration-300"></span>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={template === "minimal" ? "md:col-span-1" : "md:col-span-2"}>
                {tree.length ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {tree.map((it) => <FooterItem key={it.id} item={it} />)}
                  </div>
                ) : (
                  <div className="text-sm text-white/60">(No footer links)</div>
                )}
              </div>
            )}

            {/* Newsletter + Policies (Mega only) */}
            {template === "mega" ? (
              <div className="space-y-4">
                {newsletter?.enabled ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-white/90">{newsletter.title || "اشترك بالنشرة"}</div>
                    <div className="mt-2 flex gap-2">
                      <input
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10"
                        placeholder={newsletter.placeholder || "email"}
                      />
                      <button className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
                        {newsletter.buttonLabel || "اشتراك"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-white/90">السياسات</div>
                  <div className="space-y-1">
                    {policyLinks.map((p: any) => (
                      <Link key={p.id || p.href} href={String(p.href)} className="block text-sm text-white/70 hover:text-white">
                        {p.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-white/90">السياسات</div>
                <div className="space-y-1">
                  {policyLinks.map((p: any) => (
                    <Link key={p.id || p.href} href={String(p.href)} className="block text-sm text-white/70 hover:text-white">
                      {p.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {bottom?.enabled !== false ? (
          <div className="border-t border-white/[0.08] py-4 text-center text-xs text-white/50">
            {bottom?.copyright ? bottom.copyright : (
              <>© {new Date().getFullYear()} {site.siteName || "Store"}</>
            )}
          </div>
        ) : null}
      </footer>
    );
  }

  return (
    <footer className="footer-candy-glass font-arabic mt-10 border-t border-white/[0.08] bg-black/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="space-y-2">
          <div className="text-base font-semibold">{site.siteName || "Store"}</div>
          {siteFooterText ? <div className="text-sm text-white/70">{siteFooterText}</div> : null}
          {site.contactEmail ? <div className="text-sm text-white/70">✉️ {site.contactEmail}</div> : null}
          {site.contactPhone ? <div className="text-sm text-white/70">📞 {site.contactPhone}</div> : null}
        </div>

        <div className="md:col-span-2 grid gap-6 md:grid-cols-2">
          {tree.length ? (
            tree.map((it) => <FooterItem key={it.id} item={it} />)
          ) : (
            <div className="text-sm text-white/60">(No footer menu)</div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-white/90">السياسات</div>
          <div className="space-y-1">
            {policies.map((p) => (
              <Link key={p.href} href={p.href} className="block text-sm text-white/70 hover:text-white">
                {p.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.08] py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {site.siteName || "Store"}
      </div>
    </footer>
  );
}
