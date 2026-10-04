const EXTERNAL_PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:/i;

function safeTrim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isExternalHref(href: string) {
  return EXTERNAL_PROTOCOL_RE.test(href) || href.startsWith("//");
}

export function normalizeNavHref(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "#";
  if (raw.startsWith("#")) return raw;
  if (isExternalHref(raw)) return raw;
  if (raw.startsWith("/")) return raw.replace(/\/{2,}/g, "/");
  if (raw.startsWith("?")) return raw;
  const cleaned = raw.replace(/^(\.\/)+/, "").replace(/^\/+/, "");
  return `/${cleaned}`;
}

function readNavArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const candidates = [
    value.items,
    value.children,
    value.categories,
    value.subcategories,
    value.childCategories,
    value.childrens,
    value.nodes,
    value.links,
    value.menuItems,
    value.menu,
    value.tree,
    value.subItems,
    value.subMenu,
    value.submenu,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function readNavString(value: any, keys: string[]) {
  for (const key of keys) {
    const raw = safeTrim(value?.[key]);
    if (raw) return raw;
  }
  return "";
}

function normalizeNavNode(raw: any, depth = 0, index = 0): any | null {
  if (!raw || typeof raw !== "object") return null;

  const label = readNavString(raw, ["label", "title", "name", "text", "displayName", "menuLabel"]);
  const hrefRaw = readNavString(raw, ["href", "url", "link", "path", "to", "slug"]);
  const href = normalizeNavHref(hrefRaw || (label ? "#" : ""));
  const icon = readNavString(raw, ["icon", "iconUrl", "iconSrc", "image", "imageUrl", "thumbnailUrl"]);
  const targetRaw = readNavString(raw, ["target"]);
  const forceBlank = raw?.openInNewTab === true || raw?.newTab === true;

  const nested = readNavArray(
    raw.children ??
      raw.items ??
      raw.nodes ??
      raw.links ??
      raw.subItems ??
      raw.submenu ??
      raw.subMenu ??
      raw.subcategories ??
      raw.categories ??
      raw.childCategories ??
      raw.childrens,
  );
  const children = nested
    .map((child, childIndex) => normalizeNavNode(child, depth + 1, childIndex))
    .filter(Boolean) as any[];

  const idRaw = readNavString(raw, ["id", "_id", "key", "value"]);
  const id = idRaw || `nav-${depth}-${index}-${label || href || "item"}`;
  const isExternal = raw?.isExternal === true || raw?.external === true || forceBlank || isExternalHref(href);

  if (!label && href === "#" && children.length === 0) return null;

  return {
    id,
    label: label || (href !== "#" ? href.replace(/^\/+/, "") : "Item"),
    href,
    icon: icon || undefined,
    target: targetRaw || (forceBlank ? "_blank" : undefined),
    isExternal,
    children,
  };
}

export function normalizeNavItems(items: any[]): any[] {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => normalizeNavNode(item, 0, index))
    .filter(Boolean) as any[];
}


export function selectStorefrontNav(cmsNav: any, primaryMenu: any) {
  const enabled = cmsNav?.enabled ?? cmsNav?.props?.enabled ?? false;
  const candidates = [cmsNav?.items, cmsNav?.props?.items, cmsNav?.menuItems, cmsNav?.props?.menuItems, cmsNav?.menu, cmsNav?.props?.menu, cmsNav?.tree, cmsNav?.props?.tree, cmsNav?.links, cmsNav?.props?.links, cmsNav?.children, cmsNav?.props?.children];
  const configured = candidates.find(Array.isArray) || [];
  const cmsItems = enabled ? normalizeNavItems(configured) : [];
  return cmsItems.length ? cmsItems : normalizeNavItems(primaryMenu?.tree || []);
}
