/**
 * The store's pack as the editor's panels see it (StudioPage provides it; studio/packs.ts
 * storeKitOf): the icon picker opens on its icon set. Null = no theme, no pack.
 */
import { createContext, useContext } from "react";
import type { PackKit } from "./packs";

export const StoreKitContext = createContext<PackKit | null>(null);
export const useStoreKit = () => useContext(StoreKitContext);
