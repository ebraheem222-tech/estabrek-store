export type WebsiteThemeCategory = "dark" | "light" | "luxury" | "gradient" | "modern";

export type WebsiteTheme = {
  id: string;
  name: string;
  nameAr: string;
  category: WebsiteThemeCategory;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  borderRadius: string;
};

