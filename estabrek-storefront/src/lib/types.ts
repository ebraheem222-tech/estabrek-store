export type NavItem = {
  id: string;
  label: string;
  href: string;
  target?: string | null;
  icon?: string | null;
  order?: number | null;
  isExternal?: boolean | null;
  children?: NavItem[];
};

export type MenuTree = {
  menuId: string;
  tree: NavItem[];
} | null;

export type SitePublicSettings = {
  id: string;
  siteName?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  appleTouchIconUrl?: string | null;
  themeColor?: string | null;
  currencyCode?: string | null;
  announcement?: {
    isActive: boolean;
    text?: string | null;
    linkUrl?: string | null;
  };
  header?: string | null;
  footer?: string | null;
  scriptsHead?: any;
  scriptsBody?: any;
  customCss?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  checkoutMode?: "WHATSAPP" | "STRIPE" | "PAYPAL" | "PAYMENTS" | null;
  whatsappNumber?: string | null;
  ordersEmail?: string | null;
  stripeEnabled?: boolean;
  stripePublicKey?: string | null;
  paypalEnabled?: boolean;
  paypalClientId?: string | null;
  storeCountryCode?: string | null;
};

export type StorefrontBootstrap = {
  site: SitePublicSettings;
  primaryMenu: MenuTree;
  footerMenu: MenuTree;
  pages: Array<{ id: string; name: string; slug: string; updatedAt: string; canonicalUrl?: string | null }>;
};

export type StorefrontPage = {
  id: string;
  name: string;
  slug: string;
  status: string;
  sections: any[];
  headScripts?: any;
  bodyScripts?: any;
  customCss?: string | null;
  canonicalUrl?: string | null;
  ogImageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  robotsNoIndex?: boolean;
  robotsNoFollow?: boolean;
  jsonLd?: any;
};
