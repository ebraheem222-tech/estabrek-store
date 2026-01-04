// src/features/settings/SettingsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { MediaUrlInput } from "../../components/media/MediaUrlInput";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { useSettings, useSettingsActions } from "../../hooks/useSettings";
import { ALL_NAV_TEMPLATES, NAV_CATEGORY_LABELS_AR, getNavTemplateById } from "../../cms/nav/navTemplates";
import {
  ALL_WEBSITE_THEMES,
  WEBSITE_THEME_CATEGORY_LABELS_AR,
  getWebsiteThemeById,
} from "../../cms/themes/websiteThemes";
import { ALL_LOADING_ANIMATIONS, LOADING_CATEGORY_LABELS_AR, getLoadingById } from "../../cms/effects/loadingAnimations";
import { ALL_SEARCH_INPUTS, SEARCH_INPUT_CATEGORY_LABELS_AR, getSearchInputById } from "../../cms/style/searchStyles";

type HeaderConfig = {
  preset?: "classic" | "minimal" | "centered";
  sticky?: boolean;
  showSearch?: boolean;
  showCart?: boolean;
  showAccount?: boolean;
  announcement?: {
    enabled?: boolean;
    text?: string;
    href?: string;
    buttonText?: string;
  };
  cta?: {
    enabled?: boolean;
    label?: string;
    href?: string;
  };
  // Step 13: header UI
  heightDesktop?: "compact" | "normal" | "comfortable";
  heightMobile?: "compact" | "normal" | "comfortable";
  searchStyle?: "input" | "icon";
  searchInputStyleId?: string;
  cartStyle?: "iconBadge" | "icon" | "badge";
  topbar?: {
    enabled?: boolean;
    template?: "info" | "promo" | "contact";
    text?: string;
    href?: string;
    buttonText?: string;
    showOnMobile?: boolean;
    bgPreset?: "solid" | "gradient" | "glass";
  };

  // Step 15: Global Theme Tokens (stored under settings.header.theme)
  theme?: {
    mode?: "dark" | "light";
    // Step 2 (Theme Engine): presetId
    presetId?: ThemePresetId;
    // Step 16: Website theme preset id
    websiteThemeId?: string;
    primary?: string;
    secondary?: string;
    // legacy fields (kept for backwards compatibility)
    accent?: "rose" | "orange" | "emerald" | "blue" | "violet" | "gold";
    radius?: "md" | "xl" | "2xl";
    surface?: "classic" | "glass";
    customThemes?: CustomTheme[];
  };

  // Global UI settings (stored under settings.header.ui)
  ui?: {
    loading?: {
      enabled?: boolean;
      animationId?: string;
    };
  };

};

type ThemePresetId =
  | "estabrak_soft_gold"
  | "luxury_gold"
  | "clean_tech"
  | "street_dark"
  | "soft_pastel"
  | "earth_minimal"
  | "ocean_mist"
  | "desert_sand"
  | "plum_night";

type AdminThemePresetId = "default" | ThemePresetId;

type AdminThemeConfig = {
  presetId: AdminThemePresetId;
};

type CustomTheme = {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
};

type FooterLink = { id: string; label: string; href: string; icon?: string };
type FooterColumn = { id: string; title: string; links: FooterLink[] };
type FooterPolicyLink = { id: string; label: string; href: string };

type FooterConfig = {
  enabled: boolean;
  template: "minimal" | "columns" | "mega";
  bgPreset: "solid" | "gradient" | "glass";
  about: { title: string; text: string };
  columns: FooterColumn[];
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
    whatsapp: string;
    youtube: string;
    x: string;
  };
  newsletter: { enabled: boolean; title: string; placeholder: string; buttonLabel?: string };
  bottom: { enabled: boolean; copyright: string; policyLinks: FooterPolicyLink[] };
};

type CmsNavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  children?: CmsNavItem[];
};

type CmsNavConfig = {
  enabled: boolean;
  mode: "dropdown" | "mega";
  gradient: "none" | "sunset" | "ocean" | "neon";
  templateId: string;
  showIcons: boolean;
  items: CmsNavItem[];
};

const safeObj = (v: any) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const cryptoId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const THEME_PRESETS: Array<{ id: ThemePresetId; label: string }> = [
  { id: "estabrak_soft_gold", label: "Estabrak Soft (Teal + Gold)" },
  { id: "luxury_gold", label: "Luxury Paper (Black + Gold)" },
  { id: "clean_tech", label: "Clean Tech (Blue)" },
  { id: "street_dark", label: "Street Dark (Neon Lime)" },
  { id: "soft_pastel", label: "Soft Pastel (Rose)" },
  { id: "earth_minimal", label: "Earth Minimal (Forest)" },
  { id: "ocean_mist", label: "Ocean Mist (Sky)" },
  { id: "desert_sand", label: "Desert Sand (Amber)" },
  { id: "plum_night", label: "Plum Night (Purple)" },
];

const THEME_PRESET_IDS = THEME_PRESETS.map((p) => p.id);

const isThemePresetId = (value: unknown): value is ThemePresetId =>
  typeof value === "string" && THEME_PRESET_IDS.includes(value as ThemePresetId);

type LoadingConfig = { enabled: boolean; animationId: string };

function normalizeLoading(v: any): LoadingConfig {
  const o = safeObj(v);
  const rawId = typeof o.animationId === "string" ? o.animationId : "spinner-simple";
  const animationId = getLoadingById(rawId) ? rawId : "spinner-simple";
  return {
    enabled: o.enabled === true,
    animationId,
  };
}

function normalizeAdminTheme(v: any): AdminThemeConfig {
  const o = safeObj(v);
  const rawPresetId = typeof o.presetId === "string" ? o.presetId : "default";
  const presetId =
    rawPresetId === "default" || isThemePresetId(rawPresetId) ? (rawPresetId as AdminThemePresetId) : "default";
  return { presetId };
}

function normalizeTheme(v: any): NonNullable<HeaderConfig["theme"]> {
  const o = safeObj(v);
  const rawWebsiteThemeId = typeof o.websiteThemeId === "string" ? o.websiteThemeId : "default";
  const websiteThemeId =
    rawWebsiteThemeId === "default" || getWebsiteThemeById(rawWebsiteThemeId) ? rawWebsiteThemeId : "default";
  return {
    mode: o.mode === "light" ? "light" : "dark",
    presetId: isThemePresetId(o.presetId) ? o.presetId : "estabrak_soft_gold",
    websiteThemeId,
    primary: typeof o.primary === "string" && o.primary.trim() ? o.primary : undefined,
    secondary: typeof o.secondary === "string" && o.secondary.trim() ? o.secondary : undefined,
    accent: (o.accent === "rose" || o.accent === "orange" || o.accent === "emerald" || o.accent === "violet" || o.accent === "gold" || o.accent === "blue")
      ? o.accent
      : "gold",
    radius: (o.radius === "md" || o.radius === "xl") ? o.radius : "2xl",
    surface: o.surface === "classic" ? "classic" : "glass",
    customThemes: Array.isArray(o.customThemes) ? o.customThemes : [],
  };
}


const THEME_PRESET_CARDS: CustomTheme[] = [
  { id: "estabrak_soft_gold", name: "Estabrak Soft", bg: "#F7F4E9", text: "#1A1A1A", accent: "#6FA6A1" },
  { id: "luxury_gold", name: "Luxury Paper", bg: "#F7F4E9", text: "#0B0B0B", accent: "#C6A75E" },
  { id: "clean_tech", name: "Clean Tech", bg: "#F6F8FC", text: "#0F172A", accent: "#2563EB" },
  { id: "street_dark", name: "Street Dark", bg: "#0B0F14", text: "#E5E7EB", accent: "#A3E635" },
  { id: "soft_pastel", name: "Soft Pastel", bg: "#FFF7F0", text: "#1F2937", accent: "#FB7185" },
  { id: "earth_minimal", name: "Earth Minimal", bg: "#F4F1EA", text: "#1B1F1D", accent: "#166534" },
  { id: "ocean_mist", name: "Ocean Mist", bg: "#F2FAFF", text: "#0F172A", accent: "#0EA5E9" },
  { id: "desert_sand", name: "Desert Sand", bg: "#FFF6E9", text: "#3B2F2A", accent: "#D97706" },
  { id: "plum_night", name: "Plum Night", bg: "#F8F5FF", text: "#1C102A", accent: "#A855F7" },
] as const;

const CMS_NAV_TEMPLATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "default", label: "افتراضي" },
  ...ALL_NAV_TEMPLATES.map((tpl) => ({
    value: tpl.id,
    label: `${NAV_CATEGORY_LABELS_AR[tpl.category] ?? tpl.category} — ${tpl.nameAr}`,
  })),
];

const WEBSITE_THEME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "default", label: "افتراضي" },
  ...ALL_WEBSITE_THEMES.map((t) => ({
    value: t.id,
    label: `${WEBSITE_THEME_CATEGORY_LABELS_AR[t.category] ?? t.category} — ${t.nameAr}`,
  })),
];

const LOADING_ANIMATION_OPTIONS: Array<{ value: string; label: string }> = ALL_LOADING_ANIMATIONS.map((l) => ({
  value: l.id,
  label: `${LOADING_CATEGORY_LABELS_AR[l.category] ?? l.category} - ${l.nameAr}`,
}));

const SEARCH_INPUT_STYLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "default", label: "افتراضي" },
  ...ALL_SEARCH_INPUTS.map((s) => ({
    value: s.id,
    label: `${SEARCH_INPUT_CATEGORY_LABELS_AR[s.category] ?? s.category} - ${s.nameAr}`,
  })),
];

function normalizeHeader(v: any): HeaderConfig {
  const o = safeObj(v);
  const rawSearchInputStyleId = typeof o.searchInputStyleId === "string" ? o.searchInputStyleId : "default";
  const searchInputStyleId =
    rawSearchInputStyleId === "default" || getSearchInputById(rawSearchInputStyleId) ? rawSearchInputStyleId : "default";
  return {
    ...o,
    preset: (o.preset === "minimal" || o.preset === "centered") ? o.preset : "classic",
    sticky: !!o.sticky,
    showSearch: o.showSearch !== false,
    showCart: o.showCart !== false,
    showAccount: !!o.showAccount,
    heightDesktop: (o.heightDesktop === "compact" || o.heightDesktop === "comfortable") ? o.heightDesktop : "normal",
    heightMobile: (o.heightMobile === "compact" || o.heightMobile === "comfortable") ? o.heightMobile : "compact",
    searchStyle: (o.searchStyle === "icon") ? "icon" : "input",
    searchInputStyleId,
    cartStyle: (o.cartStyle === "icon" || o.cartStyle === "badge") ? o.cartStyle : "iconBadge",
    theme: normalizeTheme(o.theme),
    topbar: {
      enabled: !!o.topbar?.enabled,
      template: (o.topbar?.template === "promo" || o.topbar?.template === "contact") ? o.topbar.template : "info",
      text: o.topbar?.text ?? "",
      href: o.topbar?.href ?? "",
      buttonText: o.topbar?.buttonText ?? "",
      showOnMobile: o.topbar?.showOnMobile !== false,
      bgPreset: (o.topbar?.bgPreset === "gradient" || o.topbar?.bgPreset === "glass") ? o.topbar.bgPreset : "solid",
    },
    announcement: {
      enabled: !!o.announcement?.enabled,
      text: o.announcement?.text ?? "",
      href: o.announcement?.href ?? "",
      buttonText: o.announcement?.buttonText ?? "",
    },
    cta: {
      enabled: !!o.cta?.enabled,
      label: o.cta?.label ?? "",
      href: o.cta?.href ?? "",
    },
    ui: {
      ...safeObj(o.ui),
      loading: normalizeLoading((o.ui as any)?.loading),
      adminTheme: normalizeAdminTheme((o.ui as any)?.adminTheme),
    },
  };
}

function normalizeCmsNav(v: any): CmsNavConfig {
  const o = safeObj(v);
  const items = Array.isArray(o.items) ? o.items : [];
  const rawTemplateId = typeof o.templateId === "string" ? o.templateId : "default";
  const templateId = rawTemplateId === "default" || getNavTemplateById(rawTemplateId) ? rawTemplateId : "default";
  return {
    enabled: !!o.enabled,
    mode: (o.mode === "mega" ? "mega" : "dropdown"),
    gradient: (["none","sunset","ocean","neon"].includes(o.gradient) ? o.gradient : "none"),
    templateId,
    showIcons: o.showIcons !== false,
    items: items.map((it: any) => ({
      id: String(it.id ?? cryptoId()),
      label: String(it.label ?? ""),
      href: it.href ?? "",
      icon: it.icon ?? "",
      children: Array.isArray(it.children) ? it.children.map((ch: any) => ({
        id: String(ch.id ?? cryptoId()),
        label: String(ch.label ?? ""),
        href: ch.href ?? "",
        icon: ch.icon ?? "",
      })) : [],
    })),
  };
}

function normalizeFooter(v: any): FooterConfig {
  const o = safeObj(v);
  const columns = Array.isArray(o.columns) ? o.columns : [];
  const policyLinks = Array.isArray(o.bottom?.policyLinks) ? o.bottom.policyLinks : [];
  return {
    enabled: o.enabled !== false,
    template: (o.template === "columns" || o.template === "mega") ? o.template : "minimal",
    bgPreset: (o.bgPreset === "gradient" || o.bgPreset === "glass") ? o.bgPreset : "solid",
    about: {
      title: o.about?.title ?? "",
      text: o.about?.text ?? "",
    },
    columns: columns.map((c: any) => ({
      id: String(c?.id ?? cryptoId()),
      title: String(c?.title ?? ""),
      links: (Array.isArray(c?.links) ? c.links : []).map((l: any) => ({
        id: String(l?.id ?? cryptoId()),
        label: String(l?.label ?? ""),
        href: String(l?.href ?? ""),
        icon: l?.icon ? String(l.icon) : "",
      })),
    })),
    social: {
      facebook: o.social?.facebook ?? "",
      instagram: o.social?.instagram ?? "",
      tiktok: o.social?.tiktok ?? "",
      whatsapp: o.social?.whatsapp ?? "",
      youtube: o.social?.youtube ?? "",
      x: o.social?.x ?? "",
    },
    newsletter: {
      enabled: !!o.newsletter?.enabled,
      title: o.newsletter?.title ?? "",
      placeholder: o.newsletter?.placeholder ?? "",
      buttonLabel: o.newsletter?.buttonLabel ?? "اشتراك",
    },
    bottom: {
      enabled: o.bottom?.enabled !== false,
      copyright: o.bottom?.copyright ?? "",
      policyLinks: policyLinks.map((p: any) => ({
        id: String(p?.id ?? cryptoId()),
        label: String(p?.label ?? ""),
        href: String(p?.href ?? ""),
      })),
    },
  };
}

type Errors = {
  siteName?: string;
  announcementText?: string;
  scriptsHead?: string;
  scriptsBody?: string;
  headerJson?: string;
  footerJson?: string;
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 accent-white"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function ThemeColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v?: string) => void;
}) {
  const safeValue = typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/80">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded-lg border border-white/10 bg-transparent p-1"
        />
        <Button size="sm" variant="ghost" onClick={() => onChange(undefined)} disabled={!value}>
          مسح
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const q = useSettings();
  const actions = useSettingsActions();

  const settings = q.data ?? null;

  const [siteName, setSiteName] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [faviconUrl, setFaviconUrl] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [customCss, setCustomCss] = useState<string>("");

  // Phase 1A: Global announcement bar (stored directly in SiteSettings)
  const [announcementIsActive, setAnnouncementIsActive] = useState<boolean>(false);
  const [announcementText, setAnnouncementText] = useState<string>("");
  const [announcementLinkUrl, setAnnouncementLinkUrl] = useState<string>("");

  const [scriptsHeadText, setScriptsHeadText] = useState<string>("");
  const [scriptsBodyText, setScriptsBodyText] = useState<string>("");

  const [headerCfg, setHeaderCfg] = useState<HeaderConfig>(() => normalizeHeader(null));
  const [footerCfg, setFooterCfg] = useState<FooterConfig>(() => normalizeFooter(null));
  const [cmsNavCfg, setCmsNavCfg] = useState<CmsNavConfig>(() => normalizeCmsNav(null));
  const [showHeaderJson, setShowHeaderJson] = useState(false);
  const [showFooterJson, setShowFooterJson] = useState(false);
  const [headerJsonDraft, setHeaderJsonDraft] = useState<string>("");
  const [footerJsonDraft, setFooterJsonDraft] = useState<string>("");

  const [errors, setErrors] = useState<Errors>({});

  const selectedSearchInputStyle = useMemo(() => {
    const id = headerCfg.searchInputStyleId;
    if (id && id !== "default") return getSearchInputById(id) ?? getSearchInputById("search-basic-simple") ?? null;
    return getSearchInputById("search-basic-simple") ?? null;
  }, [headerCfg.searchInputStyleId]);

  useEffect(() => {
    if (!settings) return;

    setSiteName(settings.siteName ?? "");
    setLogoUrl(settings.logoUrl ?? "");
    setFaviconUrl(settings.faviconUrl ?? "");
    setContactEmail(settings.contactEmail ?? "");
    setContactPhone(settings.contactPhone ?? "");
    setCustomCss(settings.customCss ?? "");

    setAnnouncementIsActive(!!settings.announcementIsActive);
    setAnnouncementText(settings.announcementText ?? "");
    setAnnouncementLinkUrl(settings.announcementLinkUrl ?? "");

    // keep editable JSON as string
    const head = settings.scriptsHead ?? [];
    const body = settings.scriptsBody ?? [];
    setScriptsHeadText(JSON.stringify(head, null, 2));
    setScriptsBodyText(JSON.stringify(body, null, 2));

    setHeaderCfg(normalizeHeader(settings.header));
    setCmsNavCfg(normalizeCmsNav((settings.header as any)?.cmsNav));
    setFooterCfg(normalizeFooter(settings.footer));
    setShowHeaderJson(false);
    setShowFooterJson(false);
    setHeaderJsonDraft("");
    setFooterJsonDraft("");

    setErrors({});
  }, [settings]);

  useEffect(() => {
    if (!showHeaderJson) return;
    setHeaderJsonDraft(JSON.stringify({ ...(headerCfg ?? {}), cmsNav: cmsNavCfg }, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHeaderJson]);

  useEffect(() => {
    if (!showFooterJson) return;
    setFooterJsonDraft(JSON.stringify(footerCfg ?? {}, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFooterJson]);

  const applyHeaderJson = () => {
    try {
      const parsed = headerJsonDraft?.trim() ? JSON.parse(headerJsonDraft) : {};
      setHeaderCfg(normalizeHeader(parsed));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "cmsNav" in (parsed as any)) {
        setCmsNavCfg(normalizeCmsNav((parsed as any).cmsNav));
      }
      setErrors((p) => ({ ...p, headerJson: undefined }));
    } catch {
      setErrors((p) => ({ ...p, headerJson: "JSON غير صالح" }));
    }
  };

  const applyFooterJson = () => {
    try {
      const parsed = footerJsonDraft?.trim() ? JSON.parse(footerJsonDraft) : {};
      setFooterCfg(normalizeFooter(parsed));
      setErrors((p) => ({ ...p, footerJson: undefined }));
    } catch {
      setErrors((p) => ({ ...p, footerJson: "JSON غير صالح" }));
    }
  };

  const canSave = useMemo(() => {
    if (!settings) return false;
    if (actions.updateSettings.isPending) return false;
    return true;
  }, [settings, actions.updateSettings.isPending]);

  const onSave = async () => {
    if (!settings) return;

    const nextErrors: Errors = {};
    if (!siteName.trim()) nextErrors.siteName = "اسم الموقع مطلوب";

    if (announcementIsActive && !announcementText.trim()) {
      nextErrors.announcementText = "نص الشريط العلوي مطلوب عند التفعيل";
    }

    let scriptsHead: any = undefined;
    let scriptsBody: any = undefined;

    // scriptsHead
    try {
      const parsed = scriptsHeadText?.trim() ? JSON.parse(scriptsHeadText) : [];
      if (!Array.isArray(parsed)) nextErrors.scriptsHead = "لازم يكون JSON Array";
      else scriptsHead = parsed;
    } catch {
      nextErrors.scriptsHead = "JSON غير صالح";
    }

    // scriptsBody
    try {
      const parsed = scriptsBodyText?.trim() ? JSON.parse(scriptsBodyText) : [];
      if (!Array.isArray(parsed)) nextErrors.scriptsBody = "لازم يكون JSON Array";
      else scriptsBody = parsed;
    } catch {
      nextErrors.scriptsBody = "JSON غير صالح";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    try {
      await actions.updateSettings.mutateAsync({
        siteName: siteName.trim(),
        logoUrl: logoUrl.trim() || null,
        faviconUrl: faviconUrl.trim() || null,
        contactEmail: contactEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        customCss: customCss,
        header: { ...headerCfg, cmsNav: cmsNavCfg },
        footer: footerCfg,
        scriptsHead,
        scriptsBody,

        // Phase 1A
        announcementIsActive,
        announcementText: announcementText.trim() || null,
        announcementLinkUrl: announcementLinkUrl.trim() || null,
      });
    } catch {
      // toast handled inside hook
    }
  };

  const theme = normalizeTheme(headerCfg.theme);
  const loading = normalizeLoading((headerCfg.ui as any)?.loading);
  const adminTheme = normalizeAdminTheme((headerCfg.ui as any)?.adminTheme);
  const loadingPreset = getLoadingById(loading.animationId) ?? null;

  const updateTheme = (patch: Partial<NonNullable<HeaderConfig["theme"]>>) => {
    setHeaderCfg((p) => ({ ...p, theme: { ...normalizeTheme(p.theme), ...patch } }));
  };

  const updateLoading = (patch: Partial<LoadingConfig>) => {
    setHeaderCfg((p) => ({
      ...p,
      ui: {
        ...safeObj(p.ui),
        loading: { ...normalizeLoading((p.ui as any)?.loading), ...patch },
      },
    }));
  };

  const updateAdminTheme = (patch: Partial<AdminThemeConfig>) => {
    setHeaderCfg((p) => ({
      ...p,
      ui: {
        ...safeObj(p.ui),
        adminTheme: { ...normalizeAdminTheme((p.ui as any)?.adminTheme), ...patch },
      },
    }));
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div>
          <div className="text-lg font-semibold">إعدادات الموقع</div>
          <div className="mt-1 text-xs opacity-70">إعدادات الموقع</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        {q.isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <div className="text-sm opacity-80">جاري التحميل...</div>
          </div>
        ) : q.isError ? (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">حدث خطأ أثناء تحميل الإعدادات.</div>
        ) : !settings ? (
          <div className="text-sm opacity-80">لا توجد إعدادات.</div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader title="تنقل الـCMS (الهيدر)" subtitle="روابط رئيسية وفرعية + منسدلة/ميجا + تدرجات + أيقونات" />
              <CardContent>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={cmsNavCfg.enabled}
                      onChange={(e) => setCmsNavCfg((p) => ({ ...p, enabled: e.target.checked }))}
                    />
                    تفعيل قائمة الـCMS في الهيدر
                  </label>

                  <div className={cmsNavCfg.enabled ? "space-y-3" : "space-y-3 opacity-50 pointer-events-none"}>
                    <div className="grid gap-3 md:grid-cols-5">
                      <Select
                        label="النمط"
                        value={cmsNavCfg.mode}
                        onValueChange={(value) => setCmsNavCfg((p) => ({ ...p, mode: value as any }))}
                        options={[
                          { value: "dropdown", label: "قائمة منسدلة" },
                          { value: "mega", label: "ميجا" },
                        ]}
                      />
                      <Select
                        label="التدرج"
                        value={cmsNavCfg.gradient}
                        onValueChange={(value) => setCmsNavCfg((p) => ({ ...p, gradient: value as any }))}
                        options={[
                          { value: "none", label: "بدون" },
                          { value: "sunset", label: "غروب" },
                          { value: "ocean", label: "محيط" },
                          { value: "neon", label: "نيون" },
                        ]}
                      />
                      <Select
                        label="قالب التنقل"
                        value={cmsNavCfg.templateId}
                        onValueChange={(value) => setCmsNavCfg((p) => ({ ...p, templateId: value }))}
                        options={CMS_NAV_TEMPLATE_OPTIONS}
                      />
                      <Select
                        label="الأيقونات"
                        value={cmsNavCfg.showIcons ? "yes" : "no"}
                        onValueChange={(value) => setCmsNavCfg((p) => ({ ...p, showIcons: value === "yes" }))}
                        options={[
                          { value: "yes", label: "إظهار" },
                          { value: "no", label: "إخفاء" },
                        ]}
                      />
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setCmsNavCfg((p) => ({
                            ...p,
                            items: [
                              ...(p.items ?? []),
                              { id: cryptoId(), label: "جديد", href: "/", icon: "home", children: [] },
                            ],
                          }))
                        }
                      >
                        + إضافة عنصر رئيسي
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(cmsNavCfg.items ?? []).map((it, i) => (
                        <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                          <div className="grid gap-3 md:grid-cols-4">
                            <Input
                              label="العنوان"
                              value={it.label}
                              onValueChange={(value) =>
                                setCmsNavCfg((p) => {
                                  const next = [...(p.items ?? [])];
                                  next[i] = { ...next[i], label: value };
                                  return { ...p, items: next };
                                })
                              }
                            />
                            <Input
                              label="الرابط"
                              value={it.href ?? ""}
                              onValueChange={(value) =>
                                setCmsNavCfg((p) => {
                                  const next = [...(p.items ?? [])];
                                  next[i] = { ...next[i], href: value };
                                  return { ...p, items: next };
                                })
                              }
                            />
                            <Input
                              label="الأيقونة (home/shop/phone/star/sparkle)"
                              value={it.icon ?? ""}
                              onValueChange={(value) =>
                                setCmsNavCfg((p) => {
                                  const next = [...(p.items ?? [])];
                                  next[i] = { ...next[i], icon: value };
                                  return { ...p, items: next };
                                })
                              }
                            />
                            <div className="flex items-end gap-2">
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setCmsNavCfg((p) => {
                                    const next = [...(p.items ?? [])];
                                    next[i] = {
                                      ...next[i],
                                      children: [...(next[i].children ?? []), { id: cryptoId(), label: "فرعي", href: "/", icon: "" }],
                                    };
                                    return { ...p, items: next };
                                  })
                                }
                              >
                                + عنصر فرعي
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() =>
                                  setCmsNavCfg((p) => ({ ...p, items: (p.items ?? []).filter((_, idx) => idx !== i) }))
                                }
                              >
                                حذف
                              </Button>
                            </div>
                          </div>

                          {(it.children ?? []).length ? (
                            <div className="space-y-2">
                              {(it.children ?? []).map((ch, j) => (
                                <div key={ch.id} className="grid gap-3 md:grid-cols-4">
                                  <Input
                                    label="عنوان فرعي"
                                    value={ch.label}
                                    onValueChange={(value) =>
                                      setCmsNavCfg((p) => {
                                        const next = [...(p.items ?? [])];
                                        const kids = [...(next[i].children ?? [])];
                                        kids[j] = { ...kids[j], label: value };
                                        next[i] = { ...next[i], children: kids };
                                        return { ...p, items: next };
                                      })
                                    }
                                  />
                                  <Input
                                    label="رابط فرعي"
                                    value={ch.href ?? ""}
                                    onValueChange={(value) =>
                                      setCmsNavCfg((p) => {
                                        const next = [...(p.items ?? [])];
                                        const kids = [...(next[i].children ?? [])];
                                        kids[j] = { ...kids[j], href: value };
                                        next[i] = { ...next[i], children: kids };
                                        return { ...p, items: next };
                                      })
                                    }
                                  />
                                  <Input
                                    label="أيقونة فرعية"
                                    value={ch.icon ?? ""}
                                    onValueChange={(value) =>
                                      setCmsNavCfg((p) => {
                                        const next = [...(p.items ?? [])];
                                        const kids = [...(next[i].children ?? [])];
                                        kids[j] = { ...kids[j], icon: value };
                                        next[i] = { ...next[i], children: kids };
                                        return { ...p, items: next };
                                      })
                                    }
                                  />
                                  <div className="flex items-end">
                                    <Button
                                      variant="danger"
                                      onClick={() =>
                                        setCmsNavCfg((p) => {
                                          const next = [...(p.items ?? [])];
                                          const kids = (next[i].children ?? []).filter((_, k) => k !== j);
                                          next[i] = { ...next[i], children: kids };
                                          return { ...p, items: next };
                                        })
                                      }
                                    >
                                      حذف
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="الإعدادات العامة" subtitle="بيانات الموقع والشعار والتواصل." />
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="اسم الموقع"
                    value={siteName}
                    error={errors.siteName}
                    onValueChange={(value) => {
                      setSiteName(value);
                      setErrors((p: Errors) => ({ ...p, siteName: undefined }));
                    }}
                  />
                  <MediaUrlInput label="شعار (URL)" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." showPreview />
                  <MediaUrlInput label="أيقونة الموقع (Favicon URL)" value={faviconUrl} onChange={setFaviconUrl} placeholder="https://..." />
                  <Input label="إيميل التواصل" value={contactEmail} onValueChange={(value) => setContactEmail(value)} placeholder="support@example.com" />
                  <Input label="هاتف التواصل" value={contactPhone} onValueChange={(value) => setContactPhone(value)} placeholder="+972..." />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="CSS مخصص" subtitle="يُطبق على واجهة المتجر العامة." />
              <CardContent>
                <textarea
                  className="min-h-[160px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20"
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  placeholder="/* اكتب CSS هنا */"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="الشريط العلوي العام" subtitle="يظهر أعلى الموقع في الواجهة العامة." />
              <CardContent>
                <div className="space-y-3">
                  <Toggle label="تفعيل الشريط العلوي" checked={announcementIsActive} onChange={setAnnouncementIsActive} />
                  <Input
                    label="النص"
                    value={announcementText}
                    error={errors.announcementText}
                    onValueChange={(value) => {
                      setAnnouncementText(value);
                      setErrors((p) => ({ ...p, announcementText: undefined }));
                    }}
                    disabled={!announcementIsActive}
                    placeholder="خصم اليوم على كل الطلبات..."
                  />
                  <Input
                    label="الرابط"
                    value={announcementLinkUrl}
                    onValueChange={(value) => setAnnouncementLinkUrl(value)}
                    disabled={!announcementIsActive}
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="الهيدر" subtitle="خيارات عرض الهيدر والثيم." />
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      label="النمط"
                      value={headerCfg.preset ?? "classic"}
                      onValueChange={(value) => setHeaderCfg((p) => ({ ...p, preset: value as HeaderConfig["preset"] }))}
                      options={[
                        { value: "classic", label: "كلاسيك" },
                        { value: "minimal", label: "بسيط" },
                        { value: "centered", label: "متمركز" },
                      ]}
                    />
                    <Select
                      label="ارتفاع سطح المكتب"
                      value={headerCfg.heightDesktop ?? "normal"}
                      onValueChange={(value) =>
                        setHeaderCfg((p) => ({ ...p, heightDesktop: value as HeaderConfig["heightDesktop"] }))
                      }
                      options={[
                        { value: "compact", label: "مضغوط" },
                        { value: "normal", label: "عادي" },
                        { value: "comfortable", label: "مريح" },
                      ]}
                    />
                    <Select
                      label="ارتفاع الجوال"
                      value={headerCfg.heightMobile ?? "compact"}
                      onValueChange={(value) =>
                        setHeaderCfg((p) => ({ ...p, heightMobile: value as HeaderConfig["heightMobile"] }))
                      }
                      options={[
                        { value: "compact", label: "مضغوط" },
                        { value: "normal", label: "عادي" },
                        { value: "comfortable", label: "مريح" },
                      ]}
                    />
	                    <Select
	                      label="نمط البحث"
	                      value={headerCfg.searchStyle ?? "input"}
	                      onValueChange={(value) =>
	                        setHeaderCfg((p) => ({ ...p, searchStyle: value as HeaderConfig["searchStyle"] }))
	                      }
	                      options={[
	                        { value: "input", label: "حقل" },
	                        { value: "icon", label: "أيقونة" },
	                      ]}
	                    />
	                    <Select
	                      label="نمط مربع البحث"
	                      value={headerCfg.searchInputStyleId ?? "default"}
	                      onValueChange={(value) => setHeaderCfg((p) => ({ ...p, searchInputStyleId: value }))}
	                      options={SEARCH_INPUT_STYLE_OPTIONS}
	                      disabled={headerCfg.showSearch === false || headerCfg.searchStyle === "icon"}
	                    />
	                    <Select
	                      label="نمط السلة"
	                      value={headerCfg.cartStyle ?? "iconBadge"}
	                      onValueChange={(value) =>
	                        setHeaderCfg((p) => ({ ...p, cartStyle: value as HeaderConfig["cartStyle"] }))
                      }
                      options={[
                        { value: "iconBadge", label: "أيقونة + عداد" },
                        { value: "icon", label: "أيقونة" },
                        { value: "badge", label: "عداد" },
                      ]}
                    />
                  </div>

	                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
	                    <Toggle label="تثبيت الهيدر" checked={!!headerCfg.sticky} onChange={(v) => setHeaderCfg((p) => ({ ...p, sticky: v }))} />
	                    <Toggle label="إظهار البحث" checked={headerCfg.showSearch !== false} onChange={(v) => setHeaderCfg((p) => ({ ...p, showSearch: v }))} />
	                    <Toggle label="إظهار السلة" checked={headerCfg.showCart !== false} onChange={(v) => setHeaderCfg((p) => ({ ...p, showCart: v }))} />
	                    <Toggle label="إظهار الحساب" checked={!!headerCfg.showAccount} onChange={(v) => setHeaderCfg((p) => ({ ...p, showAccount: v }))} />
	                  </div>

	                  {headerCfg.searchStyle !== "icon" &&
	                  headerCfg.showSearch !== false &&
	                  selectedSearchInputStyle ? (
	                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                      <div className="mb-3 text-sm font-semibold">معاينة مربع البحث</div>
	                      <div className="flex justify-end">
	                        <form
	                          className={`relative ${selectedSearchInputStyle.containerClassName}`}
	                          onSubmit={(e) => e.preventDefault()}
	                        >
	                          <input
	                            dir="rtl"
	                            className={selectedSearchInputStyle.inputClassName}
	                            placeholder="بحث..."
	                            readOnly
	                          />
	                          {selectedSearchInputStyle.buttonClassName ? (
	                            <button type="button" className={selectedSearchInputStyle.buttonClassName}>
	                              {selectedSearchInputStyle.iconClassName &&
	                              !selectedSearchInputStyle.iconClassName.includes("absolute") ? (
	                                <span className={selectedSearchInputStyle.iconClassName}>🔍</span>
	                              ) : (
	                                "بحث"
	                              )}
	                            </button>
	                          ) : null}
	                          {selectedSearchInputStyle.iconClassName &&
	                          selectedSearchInputStyle.iconClassName.includes("absolute") ? (
	                            <span className={selectedSearchInputStyle.iconClassName}>🔍</span>
	                          ) : null}
	                        </form>
	                      </div>
	                    </div>
	                  ) : null}

	                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
	                    <div className="mb-3 text-sm font-semibold">الثيم</div>
	                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
	                      <Select
                        label="ثيم الموقع"
                        value={theme.websiteThemeId ?? "default"}
                        onValueChange={(value) => updateTheme({ websiteThemeId: value })}
                        options={WEBSITE_THEME_OPTIONS}
                      />
                      <Select
                        label="ثيم لوحة التحكم"
                        value={adminTheme.presetId}
                        onValueChange={(value) => updateAdminTheme({ presetId: value as AdminThemePresetId })}
                        options={[
                          { value: "default", label: "افتراضي" },
                          ...THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
                        ]}
                      />
                      <Select
                        label="البريست"
                        value={theme.presetId ?? "estabrak_soft_gold"}
                        onValueChange={(value) => updateTheme({ presetId: value as NonNullable<HeaderConfig["theme"]>["presetId"] })}
                        options={THEME_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
                      />
                      <Select
                        label="الوضع"
                        value={theme.mode ?? "dark"}
                        onValueChange={(value) => updateTheme({ mode: value as NonNullable<HeaderConfig["theme"]>["mode"] })}
                        options={[
                          { value: "dark", label: "داكن" },
                          { value: "light", label: "فاتح" },
                        ]}
                      />
                      <Select
                        label="الأكسنت"
                        value={theme.accent ?? "gold"}
                        onValueChange={(value) => updateTheme({ accent: value as NonNullable<HeaderConfig["theme"]>["accent"] })}
                        options={[
                          { value: "gold", label: "ذهبي" },
                          { value: "blue", label: "أزرق" },
                          { value: "emerald", label: "أخضر" },
                          { value: "orange", label: "برتقالي" },
                          { value: "rose", label: "وردي" },
                          { value: "violet", label: "بنفسجي" },
                        ]}
                      />
                      <Select
                        label="الحواف"
                        value={theme.radius ?? "2xl"}
                        onValueChange={(value) => updateTheme({ radius: value as NonNullable<HeaderConfig["theme"]>["radius"] })}
                        options={[
                          { value: "md", label: "متوسط" },
                          { value: "xl", label: "كبير" },
                          { value: "2xl", label: "كبير جدًا" },
                        ]}
                      />
                      <Select
                        label="الخامة"
                        value={theme.surface ?? "glass"}
                        onValueChange={(value) => updateTheme({ surface: value as NonNullable<HeaderConfig["theme"]>["surface"] })}
                        options={[
                          { value: "glass", label: "زجاجي" },
                          { value: "classic", label: "كلاسيك" },
                        ]}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <ThemeColorField
                        label="اللون الأساسي (Primary)"
                        value={theme.primary}
                        onChange={(value) => updateTheme({ primary: value })}
                      />
                      <ThemeColorField
                        label="اللون الثانوي (Secondary)"
                        value={theme.secondary}
                        onChange={(value) => updateTheme({ secondary: value })}
                      />
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {THEME_PRESET_CARDS.map((preset) => {
                        const active = theme.presetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => updateTheme({ presetId: preset.id })}
                            className={
                              "rounded-xl border p-3 text-right transition " +
                              (active ? "border-accent-500/60 bg-white/10" : "border-white/10 bg-white/5 hover:border-white/20")
                            }
                            aria-pressed={active}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">{preset.name}</div>
                              {active ? <span className="text-xs text-accent-300">مفعل</span> : null}
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full border border-white/10" style={{ backgroundColor: preset.bg }} />
                              <span className="h-6 w-6 rounded-full border border-white/10" style={{ backgroundColor: preset.text }} />
                              <span className="h-6 w-6 rounded-full border border-white/10" style={{ backgroundColor: preset.accent }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">حركة التحميل (Loading)</div>
                    <div className="space-y-3">
                      <Toggle
                        label="تفعيل حركة تحميل مخصصة"
                        checked={loading.enabled}
                        onChange={(v) => updateLoading({ enabled: v })}
                      />

                      <div className={loading.enabled ? "space-y-3" : "space-y-3 opacity-60 pointer-events-none"}>
                        <Select
                          label="النوع"
                          value={loading.animationId}
                          onValueChange={(value) => updateLoading({ animationId: value })}
                          options={LOADING_ANIMATION_OPTIONS}
                        />

                        {loadingPreset ? (
                          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                            <div className="mb-2 text-xs opacity-70">معاينة</div>
                            <div className="flex items-center justify-center">
                              <style>{loadingPreset.css}</style>
                              <div dangerouslySetInnerHTML={{ __html: loadingPreset.html }} />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">الشريط العلوي في الهيدر</div>
                    <div className="space-y-3">
                      <Toggle
                        label="تفعيل الشريط العلوي"
                        checked={!!headerCfg.topbar?.enabled}
                        onChange={(v) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, enabled: v } }))}
                      />
                      <div
                        className={
                          headerCfg.topbar?.enabled
                            ? "grid gap-3 md:grid-cols-2"
                            : "grid gap-3 md:grid-cols-2 opacity-60 pointer-events-none"
                        }
                      >
                        <Select
                          label="القالب"
                          value={headerCfg.topbar?.template ?? "info"}
                          onValueChange={(value) =>
                            setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, template: value as "info" | "promo" | "contact" } }))
                          }
                          options={[
                            { value: "info", label: "معلومات" },
                            { value: "promo", label: "ترويجي" },
                            { value: "contact", label: "تواصل" },
                          ]}
                        />
                        <Select
                          label="الخلفية"
                          value={headerCfg.topbar?.bgPreset ?? "solid"}
                          onValueChange={(value) =>
                            setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, bgPreset: value as "solid" | "gradient" | "glass" } }))
                          }
                          options={[
                            { value: "solid", label: "لون ثابت" },
                            { value: "gradient", label: "تدرج" },
                            { value: "glass", label: "زجاجي" },
                          ]}
                        />
                        <Input
                          label="النص"
                          value={headerCfg.topbar?.text ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, text: value } }))}
                          placeholder="نص الشريط"
                        />
                        <Input
                          label="الرابط"
                          value={headerCfg.topbar?.href ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, href: value } }))}
                          placeholder="https://..."
                        />
                        <Input
                          label="نص الزر"
                          value={headerCfg.topbar?.buttonText ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, buttonText: value } }))}
                          placeholder="تسوق الآن"
                        />
                        <Toggle
                          label="إظهار على الجوال"
                          checked={headerCfg.topbar?.showOnMobile !== false}
                          onChange={(v) => setHeaderCfg((p) => ({ ...p, topbar: { ...p.topbar, showOnMobile: v } }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">إعلان الهيدر</div>
                    <div className="space-y-3">
                      <Toggle
                        label="تفعيل إعلان الهيدر"
                        checked={!!headerCfg.announcement?.enabled}
                        onChange={(v) => setHeaderCfg((p) => ({ ...p, announcement: { ...p.announcement, enabled: v } }))}
                      />
                      <div
                        className={
                          headerCfg.announcement?.enabled
                            ? "grid gap-3 md:grid-cols-2"
                            : "grid gap-3 md:grid-cols-2 opacity-60 pointer-events-none"
                        }
                      >
                        <Input
                          label="النص"
                          value={headerCfg.announcement?.text ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, announcement: { ...p.announcement, text: value } }))}
                          placeholder="شحن مجاني عند الطلبات فوق 250"
                        />
                        <Input
                          label="الرابط"
                          value={headerCfg.announcement?.href ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, announcement: { ...p.announcement, href: value } }))}
                          placeholder="https://..."
                        />
                        <Input
                          label="نص الزر"
                          value={headerCfg.announcement?.buttonText ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, announcement: { ...p.announcement, buttonText: value } }))}
                          placeholder="تسوق الآن"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">زر الدعوة</div>
                    <div className="space-y-3">
                      <Toggle
                        label="تفعيل زر الدعوة"
                        checked={!!headerCfg.cta?.enabled}
                        onChange={(v) => setHeaderCfg((p) => ({ ...p, cta: { ...p.cta, enabled: v } }))}
                      />
                      <div
                        className={
                          headerCfg.cta?.enabled
                            ? "grid gap-3 md:grid-cols-2"
                            : "grid gap-3 md:grid-cols-2 opacity-60 pointer-events-none"
                        }
                      >
                        <Input
                          label="النص"
                          value={headerCfg.cta?.label ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, cta: { ...p.cta, label: value } }))}
                          placeholder="التواصل"
                        />
                        <Input
                          label="الرابط"
                          value={headerCfg.cta?.href ?? ""}
                          onValueChange={(value) => setHeaderCfg((p) => ({ ...p, cta: { ...p.cta, href: value } }))}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">إعدادات متقدمة</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setShowHeaderJson((v) => !v)}
                    >
                      {showHeaderJson ? "إخفاء JSON" : "عرض JSON"}
                    </Button>
                  </div>

                  {showHeaderJson ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium">JSON الهيدر (متقدم)</label>
                      <textarea
                        className={
                          "min-h-[220px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
                          (errors.headerJson ? "border-red-400/40 focus:border-red-300/50" : "border-white/10 focus:border-white/20")
                        }
                        value={headerJsonDraft}
                        onChange={(e) => {
                          setHeaderJsonDraft(e.target.value);
                          setErrors((p) => ({ ...p, headerJson: undefined }));
                        }}
                      />
                      {errors.headerJson ? <div className="mt-2 text-xs text-red-200">{errors.headerJson}</div> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" type="button" onClick={applyHeaderJson}>
                          تطبيق JSON
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setHeaderJsonDraft(JSON.stringify({ ...(headerCfg ?? {}), cmsNav: cmsNavCfg }, null, 2))}
                        >
                          إعادة ضبط
                        </Button>
                      </div>
                      <div className="mt-2 text-xs opacity-70">ملاحظة: عند حفظ الإعدادات سيتم إرسال settings.header للباك-إند.</div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="الفوتر" subtitle="روابط، نبذة، ونشرة بريدية." />
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Toggle
                      label="تفعيل الفوتر"
                      checked={footerCfg.enabled}
                      onChange={(v) => setFooterCfg((p) => ({ ...p, enabled: v }))}
                    />
                    <Select
                      label="القالب"
                      value={footerCfg.template ?? "minimal"}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, template: value as FooterConfig["template"] }))}
                      options={[
                        { value: "minimal", label: "بسيط" },
                        { value: "columns", label: "أعمدة" },
                        { value: "mega", label: "ميجا" },
                      ]}
                    />
                    <Select
                      label="الخلفية"
                      value={footerCfg.bgPreset ?? "solid"}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, bgPreset: value as FooterConfig["bgPreset"] }))}
                      options={[
                        { value: "solid", label: "لون ثابت" },
                        { value: "gradient", label: "تدرج" },
                        { value: "glass", label: "زجاجي" },
                      ]}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 text-sm font-semibold">عن المتجر</div>
                    <div className="space-y-3">
                      <Input
                        label="العنوان"
                        value={footerCfg.about.title}
                        onValueChange={(value) => setFooterCfg((p) => ({ ...p, about: { ...p.about, title: value } }))}
                        placeholder="من نحن"
                      />
                      <div>
                        <label className="mb-2 block text-sm font-medium">النص</label>
                        <textarea
                          className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 focus:border-white/20"
                          value={footerCfg.about.text}
                          onChange={(e) => setFooterCfg((p) => ({ ...p, about: { ...p.about, text: e.target.value } }))}
                          placeholder="اكتب نبذة قصيرة..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">أعمدة وروابط الفوتر</div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setFooterCfg((p) => ({
                          ...p,
                          columns: [...p.columns, { id: cryptoId(), title: "", links: [] }],
                        }))
                      }
                    >
                      + إضافة عمود
                    </Button>
                  </div>

                  {footerCfg.columns.length ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {footerCfg.columns.map((col, colIdx) => (
                        <div key={col.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">عمود #{colIdx + 1}</div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setFooterCfg((p) => ({
                                  ...p,
                                  columns: p.columns.filter((c) => c.id !== col.id),
                                }))
                              }
                            >
                              حذف
                            </Button>
                          </div>
                          <div className="mt-3 space-y-3">
                            <Input
                              label="العنوان"
                              value={col.title}
                              onValueChange={(value) =>
                                setFooterCfg((p) => ({
                                  ...p,
                                  columns: p.columns.map((c) => (c.id === col.id ? { ...c, title: value } : c)),
                                }))
                              }
                            />

                            <div className="flex items-center justify-between">
                              <div className="text-xs opacity-70">الروابط</div>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setFooterCfg((p) => ({
                                    ...p,
                                    columns: p.columns.map((c) =>
                                      c.id === col.id
                                        ? { ...c, links: [...c.links, { id: cryptoId(), label: "", href: "", icon: "" }] }
                                        : c
                                    ),
                                  }))
                                }
                              >
                                + إضافة رابط
                              </Button>
                            </div>

                            {col.links.length ? (
                              <div className="space-y-3">
                                {col.links.map((l) => (
                                  <div key={l.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                                    <div className="flex items-center justify-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setFooterCfg((p) => ({
                                            ...p,
                                            columns: p.columns.map((c) =>
                                              c.id === col.id ? { ...c, links: c.links.filter((x) => x.id !== l.id) } : c
                                            ),
                                          }))
                                        }
                                      >
                                        حذف
                                      </Button>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <Input
                                        label="العنوان"
                                        value={l.label}
                                        onValueChange={(value) =>
                                          setFooterCfg((p) => ({
                                            ...p,
                                            columns: p.columns.map((c) =>
                                              c.id === col.id
                                                ? {
                                                    ...c,
                                                    links: c.links.map((x) => (x.id === l.id ? { ...x, label: value } : x)),
                                                  }
                                                : c
                                            ),
                                          }))
                                        }
                                      />
                                      <Input
                                        label="الرابط"
                                        value={l.href}
                                        onValueChange={(value) =>
                                          setFooterCfg((p) => ({
                                            ...p,
                                            columns: p.columns.map((c) =>
                                              c.id === col.id
                                                ? {
                                                    ...c,
                                                    links: c.links.map((x) => (x.id === l.id ? { ...x, href: value } : x)),
                                                  }
                                                : c
                                            ),
                                          }))
                                        }
                                      />
                                      <Input
                                        label="Icon key (optional)"
                                        value={l.icon ?? ""}
                                        onValueChange={(value) =>
                                          setFooterCfg((p) => ({
                                            ...p,
                                            columns: p.columns.map((c) =>
                                              c.id === col.id
                                                ? {
                                                    ...c,
                                                    links: c.links.map((x) => (x.id === l.id ? { ...x, icon: value } : x)),
                                                  }
                                                : c
                                            ),
                                          }))
                                        }
                                        placeholder="مثال: instagram, mail, phone"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs opacity-60">(لا توجد روابط)</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-white/60">(لا توجد أعمدة بعد)</div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 text-sm font-semibold">النشرة البريدية</div>
                  <div className="space-y-3">
                    <Toggle
                      label="تفعيل النشرة"
                      checked={!!footerCfg.newsletter.enabled}
                      onChange={(v) => setFooterCfg((p) => ({ ...p, newsletter: { ...p.newsletter, enabled: v } }))}
                    />
                    <Input
                      label="العنوان"
                      value={footerCfg.newsletter.title}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, newsletter: { ...p.newsletter, title: value } }))}
                      disabled={!footerCfg.newsletter.enabled}
                      placeholder="اشترك بالنشرة"
                    />
                    <Input
                      label="النص البديل"
                      value={footerCfg.newsletter.placeholder}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, newsletter: { ...p.newsletter, placeholder: value } }))}
                      disabled={!footerCfg.newsletter.enabled}
                      placeholder="ادخل بريدك الإلكتروني"
                    />
                    <Input
                      label="زر الاشتراك"
                      value={footerCfg.newsletter.buttonLabel ?? ""}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, newsletter: { ...p.newsletter, buttonLabel: value } }))}
                      disabled={!footerCfg.newsletter.enabled}
                      placeholder="اشتراك"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 text-sm font-semibold">روابط السوشال</div>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    <Input label="Instagram" value={footerCfg.social.instagram} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, instagram: value } }))} placeholder="https://instagram.com/..." />
                    <Input label="Facebook" value={footerCfg.social.facebook} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, facebook: value } }))} placeholder="https://facebook.com/..." />
                    <Input label="TikTok" value={footerCfg.social.tiktok} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, tiktok: value } }))} placeholder="https://tiktok.com/@..." />
                    <Input label="WhatsApp" value={footerCfg.social.whatsapp} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, whatsapp: value } }))} placeholder="https://wa.me/..." />
                    <Input label="YouTube" value={footerCfg.social.youtube} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, youtube: value } }))} placeholder="https://youtube.com/..." />
                    <Input label="X / Twitter" value={footerCfg.social.x} onValueChange={(value) => setFooterCfg((p) => ({ ...p, social: { ...p.social, x: value } }))} placeholder="https://x.com/..." />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 text-sm font-semibold">شريط الأسفل</div>
                  <div className="space-y-3">
                    <Toggle
                      label="تفعيل شريط الأسفل"
                      checked={footerCfg.bottom.enabled}
                      onChange={(v) => setFooterCfg((p) => ({ ...p, bottom: { ...p.bottom, enabled: v } }))}
                    />
                    <Input
                      label="حقوق النشر"
                      value={footerCfg.bottom.copyright}
                      onValueChange={(value) => setFooterCfg((p) => ({ ...p, bottom: { ...p.bottom, copyright: value } }))}
                      placeholder="© 2025 Estabrak"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">روابط السياسات</div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setFooterCfg((p) => ({
                            ...p,
                            bottom: {
                              ...p.bottom,
                              policyLinks: [...p.bottom.policyLinks, { id: cryptoId(), label: "", href: "" }],
                            },
                          }))
                        }
                      >
                        + إضافة سياسة
                      </Button>
                    </div>

                    {footerCfg.bottom.policyLinks.length ? (
                      <div className="space-y-3">
                        {footerCfg.bottom.policyLinks.map((pl) => (
                          <div key={pl.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setFooterCfg((p) => ({
                                    ...p,
                                    bottom: {
                                      ...p.bottom,
                                      policyLinks: p.bottom.policyLinks.filter((x) => x.id !== pl.id),
                                    },
                                  }))
                                }
                              >
                                حذف
                              </Button>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <Input
                                label="العنوان"
                                value={pl.label}
                                onValueChange={(value) =>
                                  setFooterCfg((p) => ({
                                    ...p,
                                    bottom: {
                                      ...p.bottom,
                                      policyLinks: p.bottom.policyLinks.map((x) =>
                                        x.id === pl.id ? { ...x, label: value } : x
                                      ),
                                    },
                                  }))
                                }
                              />
                              <Input
                                label="الرابط"
                                value={pl.href}
                                onValueChange={(value) =>
                                  setFooterCfg((p) => ({
                                    ...p,
                                    bottom: {
                                      ...p.bottom,
                                      policyLinks: p.bottom.policyLinks.map((x) =>
                                        x.id === pl.id ? { ...x, href: value } : x
                                      ),
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs opacity-60">(No policy links)</div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">إعدادات متقدمة</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setShowFooterJson((v) => !v)}
                  >
                    {showFooterJson ? "إخفاء JSON" : "عرض JSON"}
                  </Button>
                </div>

                {showFooterJson ? (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium">JSON الفوتر (متقدم)</label>
                    <textarea
                      className={
                        "min-h-[220px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
                        (errors.footerJson ? "border-red-400/40 focus:border-red-300/50" : "border-white/10 focus:border-white/20")
                      }
                      value={footerJsonDraft}
                      onChange={(e) => {
                        setFooterJsonDraft(e.target.value);
                        setErrors((p) => ({ ...p, footerJson: undefined }));
                      }}
                    />
                    {errors.footerJson ? <div className="mt-2 text-xs text-red-200">{errors.footerJson}</div> : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" type="button" onClick={applyFooterJson}>
                        تطبيق JSON
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setFooterJsonDraft(JSON.stringify(footerCfg ?? {}, null, 2))}
                      >
                        إعادة ضبط
                      </Button>
                    </div>
                    <div className="mt-2 text-xs opacity-70">ملاحظة: عند حفظ الإعدادات سيتم إرسال settings.footer للباك-إند.</div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Scripts في &lt;head&gt; (JSON Array)</label>
                <textarea
                  className={
                    "min-h-[220px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
                    (errors.scriptsHead ? "border-red-400/40 focus:border-red-300/50" : "border-white/10 focus:border-white/20")
                  }
                  value={scriptsHeadText}
                  onChange={(e) => {
                    setScriptsHeadText(e.target.value);
                    setErrors((p: Errors) => ({ ...p, scriptsHead: undefined }));
                  }}
                />
                {errors.scriptsHead ? <div className="mt-2 text-xs text-red-200">{errors.scriptsHead}</div> : null}
                <div className="mt-2 text-xs opacity-70">مثال: [{'{'}"tag":"script","attrs":{'{'}"src":"..."{'}'}{'}'}]</div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Scripts قبل &lt;/body&gt; (JSON Array)</label>
                <textarea
                  className={
                    "min-h-[220px] w-full rounded-xl border bg-white/5 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10 " +
                    (errors.scriptsBody ? "border-red-400/40 focus:border-red-300/50" : "border-white/10 focus:border-white/20")
                  }
                  value={scriptsBodyText}
                  onChange={(e) => {
                    setScriptsBodyText(e.target.value);
                    setErrors((p: Errors) => ({ ...p, scriptsBody: undefined }));
                  }}
                />
                {errors.scriptsBody ? <div className="mt-2 text-xs text-red-200">{errors.scriptsBody}</div> : null}
              </div>
            </div>

            <div className="pt-2">
              <Button variant="primary" onClick={onSave} disabled={!canSave} isLoading={actions.updateSettings.isPending}>
                حفظ
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}






