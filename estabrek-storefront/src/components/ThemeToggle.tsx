"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "estabrek_theme";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = (): "dark" | "light" => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  // Resolve theme
  const resolveTheme = (t: Theme): "dark" | "light" => {
    if (t === "system") return getSystemTheme();
    return t;
  };

  // Load theme from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && ["dark", "light", "system"].includes(stored)) {
        setThemeState(stored);
        setResolvedTheme(resolveTheme(stored));
      } else {
        setThemeState(defaultTheme);
        setResolvedTheme(resolveTheme(defaultTheme));
      }
    } catch (e) {
      console.error("Failed to load theme:", e);
      setThemeState(defaultTheme);
      setResolvedTheme(resolveTheme(defaultTheme));
    }
    setMounted(true);
  }, [defaultTheme]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
    
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(getSystemTheme());
    
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === "dark") return "light";
      if (prev === "light") return "dark";
      return getSystemTheme() === "dark" ? "light" : "dark";
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Theme Toggle Button
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const SystemIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={resolvedTheme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
    >
      <span className={`theme-toggle-icon ${resolvedTheme === "dark" ? "active" : ""}`}>
        <MoonIcon />
      </span>
      <span className={`theme-toggle-icon ${resolvedTheme === "light" ? "active" : ""}`}>
        <SunIcon />
      </span>
      {showLabel && (
        <span className="theme-toggle-label">
          {resolvedTheme === "dark" ? "داكن" : "فاتح"}
        </span>
      )}
    </button>
  );
}

// Theme Selector (with system option)
export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "فاتح", icon: <SunIcon /> },
    { value: "dark", label: "داكن", icon: <MoonIcon /> },
    { value: "system", label: "تلقائي", icon: <SystemIcon /> },
  ];

  return (
    <div className="theme-selector">
      {options.map((option) => (
        <button
          key={option.value}
          className={`theme-selector-btn ${theme === option.value ? "active" : ""}`}
          onClick={() => setTheme(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
