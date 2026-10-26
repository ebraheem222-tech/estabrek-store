"use client";

import React, { createContext, useContext, useMemo } from "react";
import { identityOf, markOf, type StoreIdentity } from "@/lib/storeIdentity";
import { namesFor, registerNames, type Names } from "@/lib/storeNames";
import { useRazan } from "@/store/razan";
import { useLanguage } from "@/components/cinematic/Language";

/** The store's identity for every component (read from the settings in the root layout). */
const Ctx = createContext<StoreIdentity>(identityOf(null));

export function StoreIdentityProvider({ value, children }: { value: StoreIdentity; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStoreIdentity() {
  return useContext(Ctx);
}

/** The store's and the guide's names in the page's language (see lib/storeNames.ts). */
export function useNames(): Names {
  const id = useStoreIdentity();
  const razan = useRazan();
  const { language } = useLanguage();
  return useMemo(() => namesFor(id, razan.name, language), [id, razan.name, language]);
}

/** The store's short name in Arabic (where a missing photo would be). */
export function StoreMark() {
  return <>{markOf(useStoreIdentity(), "ar")}</>;
}

/** Keeps the names for the guide's spoken lines (inside both providers; renders nothing). */
export function NamesBridge() {
  const id = useStoreIdentity();
  const razan = useRazan();
  registerNames(id, razan.name);
  return null;
}
