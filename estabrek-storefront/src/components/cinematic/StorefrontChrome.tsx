"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useCart } from "@/store/cart";
import { useBodyScrollLock } from "@/lib/bodyScrollLock";
import { LanguageProvider, useLanguage } from "./Language";
import { Icon } from "./Icons";
import { RoseThemeProvider } from "./RoseThemeProvider";
import { PerfOverlay } from "./PerfOverlay";

type RoseNavLink = { href: string; label: string; children?: RoseNavLink[] };
export type RoseStoreData = {
  siteName?: string | null;
  logoUrl?: string | null;
  navLinks?: RoseNavLink[];
  footerDescription?: string;
  instagram?: string;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  contactEmail?: string | null;
  announcement?: string;
  announcementHref?: string;
  footerEnabled?: boolean;
};
const StoreContext = createContext<RoseStoreData>({});
export function useRoseStore() { return useContext(StoreContext); }
function Brand() {
  const store = useContext(StoreContext);
  const ar = useLanguage().language === "ar";
  return (
    <Link href="/" className="atelier-brand" aria-label="Estabrek home">
      {store.logoUrl ? (
        <img
          className="brand-logo"
          src={store.logoUrl}
          alt=""
          width="45"
          height="45"
        />
      ) : (
        <Icon name="spark" />
      )}
      <span>
        <span className="brand-arabic">{ar ? "استبرق" : "Estabrek"}</span>
        <span className="brand-english">MODESTLY, BEAUTIFULLY YOU</span>
      </span>
    </Link>
  );
}
function Header() {
  const { language, setLanguage } = useLanguage();
  const ar = language === "ar";
  const { count } = useCart();
  const store = useContext(StoreContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const open = menuOpen || searchOpen;
  useBodyScrollLock(open);
  const links: RoseNavLink[] = store.navLinks?.length
    ? store.navLinks
    : [
        { href: "/#arrivals", label: ar ? "وصل حديثاً" : "New arrivals" },
        { href: "/#collections", label: ar ? "المجموعات" : "Collections" },
        { href: "/#craft", label: ar ? "عالم الأقمشة" : "The fabric story" },
      ];
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    (searchOpen
      ? searchRef.current
      : dialogRef.current?.querySelector<HTMLElement>("a, button")
    )?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const elements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "a[href], button, input",
        ),
      );
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [open, searchOpen]);
  return (
    <>
      <div className="atelier-announcement" dir={ar ? "rtl" : "ltr"}>
        <span>
          {store.announcement ? (
            <Link href={store.announcementHref || "/shop"}>
              {store.announcement}
            </Link>
          ) : ar ? (
            "أناقة تليق بكِ، وراحة ترافق يومكِ."
          ) : (
            "Modern modesty. Beautifully yours."
          )}
        </span>
        <span className="announcement-right">
          {ar ? "مرحباً بكِ في استبرق" : "Welcome to Estabrek"}
          <Icon name="spark" width="11" height="11" />
        </span>
      </div>
      <header className="atelier-header" dir={ar ? "rtl" : "ltr"}>
        <Brand />
        <nav
          className="atelier-desktop-nav"
          aria-label={ar ? "القائمة الرئيسية" : "Main navigation"}
        >
          {links.map((link) => (
            <div key={link.href} className="rose-nav-item">
              <Link href={link.href}>{link.label}</Link>
              {link.children?.length ? (
                <div className="rose-nav-dropdown">
                  {link.children
                    .flatMap((c) => [c, ...(c.children || [])])
                    .map((child, i) => (
                      <Link key={`${child.href}-${i}`} href={child.href}>
                        {child.label}
                      </Link>
                    ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
        <div className="atelier-actions">
          <button
            className="language-button"
            onClick={() => setLanguage(ar ? "en" : "ar")}
            aria-label={ar ? "English" : "العربية"}
          >
            {ar ? "EN" : "عربي"}
          </button>
          <span className="action-divider" />
          <button
            className="atelier-icon-button"
            aria-label={ar ? "البحث" : "Search"}
            onClick={() => setSearchOpen(true)}
          >
            <Icon name="search" />
          </button>
          <Link
            className="atelier-icon-button wishlist-link"
            href="/wishlist"
            aria-label={ar ? "المفضلة" : "Wishlist"}
          >
            <Icon name="heart" />
          </Link>
          <Link
            className="atelier-icon-button cart-link"
            href="/cart"
            aria-label={`${ar ? "حقيبة التسوق" : "Shopping bag"}${count ? ` (${count})` : ""}`}
          >
            <Icon name="bag" />
            {count > 0 && <span className="atelier-cart-count">{count}</span>}
          </Link>
          <button
            ref={menuButton}
            className="atelier-icon-button menu-toggle"
            aria-label={ar ? "فتح القائمة" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="atelier-menu"
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
          </button>
        </div>
      </header>
      {open && (
        <div
          className="atelier-overlay"
          onClick={() => {
            setMenuOpen(false);
            setSearchOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            id="atelier-menu"
            className={`atelier-dialog ${searchOpen ? "search-dialog" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              searchOpen
                ? ar
                  ? "البحث"
                  : "Search"
                : ar
                  ? "القائمة"
                  : "Navigation"
            }
            dir={ar ? "rtl" : "ltr"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-top">
              <Brand />
              <button
                className="atelier-icon-button"
                aria-label={ar ? "إغلاق" : "Close"}
                onClick={() => {
                  setMenuOpen(false);
                  setSearchOpen(false);
                }}
              >
                <Icon name="close" />
              </button>
            </div>
            {searchOpen ? (
              <form action="/search" className="atelier-search-form">
                <label htmlFor="atelier-search">
                  {ar ? "ابحثي عن قطعتكِ القادمة." : "Find your next favourite."}
                </label>
                <div>
                  <input
                    id="atelier-search"
                    ref={searchRef}
                    type="search"
                    name="q"
                    required
                    placeholder={
                      ar ? "عمّ تبحثين؟" : "What are you looking for?"
                    }
                  />
                  <button
                    className="atelier-icon-button"
                    type="submit"
                    aria-label={ar ? "ابحثي" : "Submit search"}
                  >
                    <Icon name="arrow" />
                  </button>
                </div>
              </form>
            ) : (
              <nav className="atelier-mobile-nav">
                {[
                  ...links.flatMap((link) => [
                    link,
                    ...(link.children || []).flatMap((child) => [
                      child,
                      ...(child.children || []),
                    ]),
                  ]),
                  {
                    href: "/shop",
                    label: ar ? "تسوّقي كل المنتجات" : "Shop all",
                  },
                  {
                    href: "/contact",
                    label: ar ? "تواصلي معنا" : "Get in touch",
                  },
                ]
                  .filter(
                    (link, index, all) =>
                      all.findIndex((item) => item.href === link.href) ===
                      index,
                  )
                  .map((link, index) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="menu-index">0{index + 1}</span>
                      {link.label}
                      <Icon name="arrow" />
                    </Link>
                  ))}
              </nav>
            )}
            <p className="dialog-footnote">
              {ar
                ? "قطعتكِ القادمة تبدأ هنا."
                : "Good things start with a little curiosity."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
function Footer() {
  const store = useContext(StoreContext);
  const { language } = useLanguage();
  const ar = language === "ar";
  if (store.footerEnabled === false) return null;
  return (
    <footer className="atelier-footer" dir={ar ? "rtl" : "ltr"}>
      <div className="footer-main">
        <div>
          <Brand />
          <p>
            {store.footerDescription ||
              (ar
                ? "اختيارات تجمع الاحتشام والراحة والأناقة. من استبرق، لكل تفاصيلكِ الجميلة."
                : "Modest pieces. Beautiful details. Made for every side of you.")}
          </p>
          <div className="footer-socials">
            {store.instagram && (
              <a href={store.instagram} target="_blank" rel="noreferrer">
                Instagram ↗
              </a>
            )}
            {store.contactPhone && (
              <a href={`tel:${store.contactPhone}`} dir="ltr">
                {store.contactPhone}
              </a>
            )}
            {store.contactEmail && (
              <a href={`mailto:${store.contactEmail}`}>{store.contactEmail}</a>
            )}
          </div>
        </div>
        <div className="footer-links">
          <div>
            <span>{ar ? "اكتشفي" : "Explore"}</span>
            <Link href="/shop">
              {ar ? "تسوّقي كل القطع" : "Shop the collection"}
            </Link>
            <Link href="/wishlist">{ar ? "المفضلة" : "Your wishlist"}</Link>
            <Link href="/cart">
              {ar ? "حقيبة التسوق" : "Your shopping bag"}
            </Link>
          </div>
          <div>
            <span>{ar ? "نحن هنا" : "Here for you"}</span>
            <Link href="/contact">{ar ? "تواصلي معنا" : "Contact us"}</Link>
            <Link href="/about">{ar ? "قصتنا" : "Our story"}</Link>
          </div>
        </div>
      </div>
      <div className="footer-wordmark" aria-hidden="true" dir={ar ? "rtl" : "ltr"}>
        {ar ? "استبرق" : "Estabrek"}
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {ar ? "استبرق" : "Estabrek"}</span>
        <span>
          {ar ? "صُنع بعناية في استبرق." : "Made with care at Estabrek."}
        </span>
        <a href="#main-content" className="back-top">
          {ar ? "للأعلى" : "Back to top"}
          <Icon name="arrow" />
        </a>
      </div>
    </footer>
  );
}
export function StorefrontChrome({
  children,
  legacyHeader,
  legacyFooter,
  enabled,
  storeData = {},
}: {
  children: React.ReactNode;
  legacyHeader: React.ReactNode;
  legacyFooter: React.ReactNode;
  enabled: boolean;
  storeData?: RoseStoreData;
}) {
  const pathname = usePathname();
  const home = pathname === "/";
  useEffect(() => {
    document.documentElement.dataset.cinematicHome =
      enabled && home ? "true" : "false";
    document.documentElement.dataset.cinematicStorefront = enabled
      ? "true"
      : "false";
    return () => {
      delete document.documentElement.dataset.cinematicHome;
      delete document.documentElement.dataset.cinematicStorefront;
    };
  }, [enabled, home]);
  if (!enabled)
    return (
      <>
        {legacyHeader}
        {children}
        {legacyFooter}
      </>
    );
  return (
    <LanguageProvider>
      <StoreContext.Provider value={storeData}>
        <RoseThemeProvider key={pathname}
          restoreSelection={!pathname.startsWith("/about")}
          className={`cinematic-shell ${home ? "cinematic-home-shell" : "cinematic-interior-shell"}`}
        >
          <Header />
          {children}
          <Footer />
          <PerfOverlay />
        </RoseThemeProvider>
      </StoreContext.Provider>
    </LanguageProvider>
  );
}
