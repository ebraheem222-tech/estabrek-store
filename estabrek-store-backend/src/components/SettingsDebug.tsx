"use client";

import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";
import { useState } from "react";

/**
 * Debug component to verify storefront settings
 * Add this to any page to see current settings:
 * 
 * import { SettingsDebug } from "@/components/SettingsDebug";
 * <SettingsDebug />
 */
export function SettingsDebug() {
  const settings = useStorefrontSettings();
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-violet-600 text-white px-3 py-2 rounded-lg text-xs font-mono shadow-lg"
      >
        {isOpen ? "إغلاق" : "⚙️ Settings"}
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 left-0 bg-black/95 text-white p-4 rounded-lg shadow-2xl max-w-md max-h-96 overflow-auto text-xs font-mono">
          <h3 className="text-violet-400 font-bold mb-2">Storefront Settings:</h3>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
