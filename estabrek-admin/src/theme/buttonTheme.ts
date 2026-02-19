import { resolveButtonTheme, type ButtonThemeTokens } from "../cms/button-themes";

const BUTTON_THEME_ATTR = "data-admin-button-theme";

type ButtonThemeCssVarName =
  | "--btn-solid-bg"
  | "--btn-solid-hover"
  | "--btn-solid-text"
  | "--btn-solid-border"
  | "--btn-accent-from"
  | "--btn-accent-to"
  | "--btn-accent-from-hover"
  | "--btn-accent-to-hover"
  | "--btn-accent-text"
  | "--btn-secondary-bg"
  | "--btn-secondary-bg-hover"
  | "--btn-secondary-text"
  | "--btn-secondary-border"
  | "--btn-ghost-text"
  | "--btn-ghost-text-hover"
  | "--btn-ghost-bg-hover";

const BUTTON_THEME_VAR_MAPPINGS: Array<[ButtonThemeCssVarName, keyof ButtonThemeTokens]> = [
  ["--btn-solid-bg", "solidBg"],
  ["--btn-solid-hover", "solidHover"],
  ["--btn-solid-text", "solidText"],
  ["--btn-solid-border", "solidBorder"],
  ["--btn-accent-from", "accentFrom"],
  ["--btn-accent-to", "accentTo"],
  ["--btn-accent-from-hover", "accentFromHover"],
  ["--btn-accent-to-hover", "accentToHover"],
  ["--btn-accent-text", "accentText"],
  ["--btn-secondary-bg", "secondaryBg"],
  ["--btn-secondary-bg-hover", "secondaryBgHover"],
  ["--btn-secondary-text", "secondaryText"],
  ["--btn-secondary-border", "secondaryBorder"],
  ["--btn-ghost-text", "ghostText"],
  ["--btn-ghost-text-hover", "ghostTextHover"],
  ["--btn-ghost-bg-hover", "ghostBgHover"],
];

export function buttonThemeToCssVars(tokens: ButtonThemeTokens): Record<ButtonThemeCssVarName, string> {
  return BUTTON_THEME_VAR_MAPPINGS.reduce(
    (acc, [cssVar, tokenKey]) => {
      acc[cssVar] = tokens[tokenKey];
      return acc;
    },
    {} as Record<ButtonThemeCssVarName, string>
  );
}

export function applyButtonTheme(themeId?: string | null) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const theme = resolveButtonTheme(themeId);
  const cssVars = buttonThemeToCssVars(theme.tokens);

  for (const [cssVar, value] of Object.entries(cssVars)) {
    root.style.setProperty(cssVar, value);
  }

  if (!themeId || themeId === "default") {
    root.removeAttribute(BUTTON_THEME_ATTR);
    return;
  }

  root.setAttribute(BUTTON_THEME_ATTR, theme.id);
}

