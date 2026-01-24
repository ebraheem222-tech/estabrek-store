"use client";

import React, { useState } from "react";
import {
  animatedShapeThemes,
  shapeCategories,
  animatedShapeComponents,
  animationKeyframes,
  AnimatedShapeTheme,
} from "./AnimatedShapes";
import { additionalShapeComponents } from "./AnimatedShapesExtra";

// Merge all components (typed)
const allShapeComponents = {
  ...animatedShapeComponents,
  ...additionalShapeComponents,
} as const;

type ShapeComponentMap = typeof allShapeComponents;

// Type Guard
function hasShapeComponent(
  map: ShapeComponentMap,
  key: string
): key is keyof ShapeComponentMap {
  return key in map;
}

// Category Icons
const categoryIcons: Record<string, string> = {
  Circles: "🔵",
  Rectangles: "🟦",
  Stars: "⭐",
  Triangles: "🔺",
  Blobs: "🫧",
  Dots: "⬤",
  Lines: "➖",
  Mixed: "🎨",
};

// Animation Icons
const animationIcons: Record<string, string> = {
  float: "🎈",
  pulse: "💓",
  rotate: "🔄",
  bounce: "⬆️",
  fade: "👻",
  scale: "📐",
  slide: "➡️",
  morph: "🌊",
};

const AnimatedShapesDemo: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewBg, setPreviewBg] = useState<"light" | "dark" | "gradient">(
    "light"
  );

  const filteredThemes = animatedShapeThemes.filter((theme) => {
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

  const getBgClass = () => {
    switch (previewBg) {
      case "dark":
        return "bg-gray-900";
      case "gradient":
        return "bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500";
      default:
        return "bg-white";
    }
  };

  // ---------- FIXED ----------
  const renderShapePreview = (theme: AnimatedShapeTheme) => {
    if (hasShapeComponent(allShapeComponents, theme.id)) {
      const Component = allShapeComponents[theme.id];
      return (
        <div
          className={`relative w-full h-48 ${getBgClass()} rounded-xl overflow-hidden`}
        >
          <Component />
        </div>
      );
    }

    // fallback
    return (
      <div
        className={`relative w-full h-48 ${getBgClass()} rounded-xl overflow-hidden flex items-center justify-center`}
      >
        <div className="text-center">
          <p
            className={`font-medium ${
              previewBg === "light" ? "text-gray-500" : "text-white"
            }`}
          >
            {theme.name}
          </p>
          <p
            className={`text-sm mt-1 ${
              previewBg === "light"
                ? "text-gray-400"
                : "text-white/70"
            }`}
          >
            {theme.shape} • {theme.animation}
          </p>
        </div>
      </div>
    );
  };
  // ----------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: animationKeyframes }} />

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">
            ✨ Animated Shape Themes
          </h1>
          <p className="text-pink-100 text-lg">
            100 Animated Background Decorations
          </p>
          <p className="text-pink-200 mt-1">
            100 أشكال متحركة للخلفيات
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="🔍 Search shapes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 border border-gray-200 rounded-xl"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredThemes.map((theme, index) => (
            <div
              key={theme.id}
              className="bg-white rounded-2xl border-2 overflow-hidden"
            >
              <div className="p-4">{renderShapePreview(theme)}</div>

              <div className="p-4 border-t">
                <h3 className="font-semibold text-gray-900">
                  #{index + 1} {theme.name}
                </h3>
                <p className="text-sm text-gray-500">{theme.nameAr}</p>

                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                    {categoryIcons[theme.category]}
                    {theme.category}
                  </span>
                  <span className="text-xs px-2 py-1 bg-pink-100 rounded">
                    {animationIcons[theme.animation]}
                    {theme.animation}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnimatedShapesDemo;
