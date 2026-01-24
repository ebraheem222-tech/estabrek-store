"use client";

import React, { useState } from "react";
import {
  alertThemes,
  alertCategories,
  alertComponents,
  AlertTheme,
  AlertType,
} from "./AlertThemes";
import { additionalAlertComponents } from "./AlertComponents";

// Merge all components
const allAlertComponents = {
  ...alertComponents,
  ...additionalAlertComponents,
} as const;

type AlertComponentMap = typeof allAlertComponents;

// ---- Type Guard ----
function hasAlertComponent(
  map: AlertComponentMap,
  key: string
): key is keyof AlertComponentMap {
  return key in map;
}

// Category Icons
const categoryIcons: Record<string, string> = {
  Basic: "🎯",
  Toast: "🍞",
  Banner: "📢",
  Modern: "🎨",
  Tech: "🚀",
  "E-commerce": "🛒",
  Gaming: "🎮",
  Social: "📱",
};

// Style Icons
const styleIcons: Record<string, string> = {
  inline: "📄",
  toast: "🍞",
  banner: "📢",
  floating: "💫",
  minimal: "✨",
  card: "🃏",
};

const AlertThemesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [alertType, setAlertType] = useState<AlertType>("info");
  const [previewMode, setPreviewMode] = useState<"grid" | "full">("grid");

  const filteredThemes = alertThemes.filter((theme) => {
    const matchesCategory =
      activeCategory === "all" || theme.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      theme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      theme.nameAr.includes(searchQuery) ||
      theme.tags?.some((t) =>
        t.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesCategory && matchesSearch;
  });

  const sampleProps = {
    type: alertType,
    title: "Alert Title",
    message: "This is a sample alert message.",
    showIcon: true,
    closable: true,
    onClose: () => {},
    action: { label: "Action", onClick: () => {} },
    secondaryAction: { label: "Dismiss", onClick: () => {} },

    // extra demo props
    productName: "Premium Headphones",
    achievementName: "First Victory",
    xp: 500,
    userName: "John Doe",
    notificationType: "like" as const,
    code: "SAVE20",
    level: 10,
    orderNumber: "12345",
    status: "shipped" as const,
    appName: "App Store",
    progress: 75,
    isVisible: true,
  };

  // ---------- FIXED ----------
  const renderAlertPreview = (theme: AlertTheme) => {
    if (hasAlertComponent(allAlertComponents, theme.id)) {
      const Component = allAlertComponents[theme.id];
      return <Component {...sampleProps} />;
    }

    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-gray-500">{theme.name}</p>
        <p className="text-sm text-gray-400">Style: {theme.style}</p>
      </div>
    );
  };
  // ----------------------------

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-3xl font-bold mb-6">
        🔔 Alert Themes Demo (TypeScript Fixed)
      </h1>

      {/* Grid Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredThemes.map((theme) => (
          <div
            key={theme.id}
            className="bg-white border rounded-xl p-6 shadow"
          >
            {renderAlertPreview(theme)}

            <div className="mt-4 text-sm text-gray-600">
              <p className="font-semibold">{theme.name}</p>
              <p>{theme.nameAr}</p>
              <p className="text-xs text-gray-400">{theme.id}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Full Preview Section Example */}
      {previewMode === "full" && (
        <div className="mt-10 space-y-6">
          {filteredThemes.map((theme) => {
            if (!hasAlertComponent(allAlertComponents, theme.id))
              return null;

            const Component = allAlertComponents[theme.id];

            return (
              <div key={theme.id} className="bg-white p-6 rounded-xl border">
                <h3 className="font-bold mb-4">{theme.name}</h3>

                {(["success", "error", "warning", "info"] as AlertType[]).map(
                  (type) => (
                    <div key={type} className="mb-3">
                      <Component
                        {...sampleProps}
                        type={type}
                        title={`${type.toUpperCase()} Alert`}
                      />
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertThemesDemo;
