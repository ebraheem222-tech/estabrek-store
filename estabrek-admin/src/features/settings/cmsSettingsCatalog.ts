import { ALL_NAV_TEMPLATES, NAV_CATEGORY_LABELS_AR, getNavTemplateById } from "../../cms/nav/navTemplates";
import {
  ALL_WEBSITE_THEMES,
  WEBSITE_THEME_CATEGORY_LABELS_AR,
  getWebsiteThemeById,
} from "../../cms/themes/websiteThemes";
import { ALL_LOADING_ANIMATIONS, LOADING_CATEGORY_LABELS_AR, getLoadingById } from "../../cms/effects/loadingAnimations";
import { ALL_SEARCH_INPUTS, SEARCH_INPUT_CATEGORY_LABELS_AR, getSearchInputById } from "../../cms/style/searchStyles";
import { ALL_CURSOR_THEMES, getCursorThemeById } from "../../cms/style/cursorStyles";
import { alertThemes, getAlertTheme } from "../../cms/alert-themes";
import {
  buttonThemes,
  BUTTON_THEME_CATEGORY_LABELS_AR,
  getButtonTheme,
} from "../../cms/button-themes";

type SelectOption = { value: string; label: string };

export type CmsSettingsCatalog = {
  navTemplateOptions: SelectOption[];
  websiteThemeOptions: SelectOption[];
  loadingAnimationOptions: SelectOption[];
  searchInputStyleOptions: SelectOption[];
  cursorThemeOptions: SelectOption[];
  toastThemeOptions: SelectOption[];
  buttonThemeOptions: SelectOption[];
  hasNavTemplate: (id: string) => boolean;
  hasWebsiteTheme: (id: string) => boolean;
  hasLoadingAnimation: (id: string) => boolean;
  hasSearchInputStyle: (id: string) => boolean;
  hasCursorTheme: (id: string) => boolean;
  hasButtonTheme: (id: string) => boolean;
  getSearchInputStyleById: (id: string) => any | null;
  getLoadingAnimationById: (id: string) => any | null;
  getAlertThemeById: (id: string) => any | null;
  getButtonThemeById: (id: string) => any | null;
};

export function createCmsSettingsCatalog(): CmsSettingsCatalog {
  return {
    navTemplateOptions: [
      { value: "default", label: "افتراضي" },
      ...ALL_NAV_TEMPLATES.map((tpl) => ({
        value: tpl.id,
        label: `${NAV_CATEGORY_LABELS_AR[tpl.category] ?? tpl.category} — ${tpl.nameAr}`,
      })),
    ],
    websiteThemeOptions: [
      { value: "default", label: "افتراضي" },
      ...ALL_WEBSITE_THEMES.map((theme) => ({
        value: theme.id,
        label: `${WEBSITE_THEME_CATEGORY_LABELS_AR[theme.category] ?? theme.category} — ${theme.nameAr}`,
      })),
    ],
    loadingAnimationOptions: ALL_LOADING_ANIMATIONS.map((animation) => ({
      value: animation.id,
      label: `${LOADING_CATEGORY_LABELS_AR[animation.category] ?? animation.category} - ${animation.nameAr}`,
    })),
    searchInputStyleOptions: [
      { value: "default", label: "افتراضي" },
      ...ALL_SEARCH_INPUTS.map((style) => ({
        value: style.id,
        label: `${SEARCH_INPUT_CATEGORY_LABELS_AR[style.category] ?? style.category} - ${style.nameAr}`,
      })),
    ],
    cursorThemeOptions: [
      { value: "default", label: "افتراضي" },
      ...ALL_CURSOR_THEMES.map((cursor) => ({
        value: cursor.id,
        label: `${cursor.nameAr} — ${cursor.name}`,
      })),
    ],
    toastThemeOptions: [
      { value: "default", label: "افتراضي" },
      ...alertThemes
        .filter((theme) => theme.style === "toast")
        .map((theme) => ({
          value: theme.id,
          label: `${theme.nameAr} — ${theme.name}`,
        })),
    ],
    buttonThemeOptions: [
      { value: "default", label: "افتراضي" },
      ...buttonThemes.map((theme) => ({
        value: theme.id,
        label: `${BUTTON_THEME_CATEGORY_LABELS_AR[theme.category] ?? theme.category} — ${theme.nameAr}`,
      })),
    ],
    hasNavTemplate: (id: string) => Boolean(getNavTemplateById(id)),
    hasWebsiteTheme: (id: string) => Boolean(getWebsiteThemeById(id)),
    hasLoadingAnimation: (id: string) => Boolean(getLoadingById(id)),
    hasSearchInputStyle: (id: string) => Boolean(getSearchInputById(id)),
    hasCursorTheme: (id: string) => Boolean(getCursorThemeById(id)),
    hasButtonTheme: (id: string) => Boolean(getButtonTheme(id)),
    getSearchInputStyleById: (id: string) => getSearchInputById(id) ?? null,
    getLoadingAnimationById: (id: string) => getLoadingById(id) ?? null,
    getAlertThemeById: (id: string) => getAlertTheme(id) ?? null,
    getButtonThemeById: (id: string) => getButtonTheme(id) ?? null,
  };
}
