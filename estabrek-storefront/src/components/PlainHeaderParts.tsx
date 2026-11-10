"use client";
import dynamic from "next/dynamic";

/**
 * The plain header's parts (stores without the cinematic design), each its own download: with the cinematic
 * design (StorefrontChrome) they are never shown, and their code (the nav templates, the search box…) was in
 * every shopper's first download. Loaded from here, a client file: next/dynamic in the server layout itself
 * did not split them out.
 */
export const Topbar = dynamic(() => import("./Topbar").then((m) => m.Topbar));
export const Navbar = dynamic(() => import("./Navbar").then((m) => m.Navbar));
export const HeaderOffset = dynamic(() => import("./HeaderOffset").then((m) => m.HeaderOffset));
