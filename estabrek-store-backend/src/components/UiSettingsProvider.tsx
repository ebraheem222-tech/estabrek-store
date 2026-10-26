"use client";

import React, { createContext, useContext, useMemo } from "react";

export type UiLoadingSetting = {
  enabled: boolean;
  animationId: string;
  html: string;
  css: string;
};

type UiSettingsState = {
  loading: UiLoadingSetting | null;
};

const UiSettingsContext = createContext<UiSettingsState | null>(null);

export function UiSettingsProvider({
  children,
  loading,
}: {
  children: React.ReactNode;
  loading: UiLoadingSetting | null;
}) {
  const value = useMemo<UiSettingsState>(() => ({ loading }), [loading]);

  return (
    <UiSettingsContext.Provider value={value}>
      {loading?.enabled ? <style data-estabrek-ui-loading>{loading.css}</style> : null}
      {children}
    </UiSettingsContext.Provider>
  );
}

export function useUiSettings(): UiSettingsState {
  return useContext(UiSettingsContext) ?? { loading: null };
}

