import type { WebsiteThemeCategory } from "./types";

export type GalleryThemeSpecCategory =
  | "Glass"
  | "Candy"
  | "Aurora"
  | "Space"
  | "Gaming"
  | "Luxury"
  | "Cyberpunk"
  | "Nature"
  | "Abstract"
  | "Modern"
  | "Effects"
  | "Tech"
  | "Minimal";

export type GalleryThemeSpec = {
  id: number;
  name: string;
  category: GalleryThemeSpecCategory;
};

// Source: c:\Users\newuser\Downloads\cms-themes-gallery.jsx (T(1..50))
export const GALLERY_THEME_SPECS: GalleryThemeSpec[] = [
  { id: 1, name: "Frosted Aurora Glass", category: "Glass" },
  { id: 2, name: "Crystal Ice Glass", category: "Glass" },
  { id: 3, name: "Obsidian Glass", category: "Glass" },
  { id: 4, name: "Rainbow Glass Prism", category: "Glass" },
  { id: 5, name: "Emerald Glass", category: "Glass" },
  { id: 6, name: "Smoke Glass", category: "Glass" },
  { id: 7, name: "Stained Glass Cathedral", category: "Glass" },
  { id: 8, name: "Cotton Candy Dreams", category: "Candy" },
  { id: 9, name: "Neon Candy Store", category: "Candy" },
  { id: 10, name: "Gummy Bear World", category: "Candy" },
  { id: 11, name: "Chocolate Velvet", category: "Candy" },
  { id: 12, name: "Bubblegum Pop", category: "Candy" },
  { id: 13, name: "Rainbow Swirl", category: "Candy" },
  { id: 14, name: "Northern Lights", category: "Aurora" },
  { id: 15, name: "Deep Space Nebula", category: "Space" },
  { id: 16, name: "Galaxy Spiral", category: "Space" },
  { id: 17, name: "Meteor Shower", category: "Space" },
  { id: 18, name: "Solar Flare", category: "Space" },
  { id: 19, name: "Aurora Waves", category: "Aurora" },
  { id: 20, name: "Pixel Arcade", category: "Gaming" },
  { id: 21, name: "Cyberpunk Glitch", category: "Gaming" },
  { id: 22, name: "RPG Quest", category: "Gaming" },
  { id: 23, name: "Racing Neon", category: "Gaming" },
  { id: 24, name: "Retro Game Console", category: "Gaming" },
  { id: 25, name: "Black Gold", category: "Luxury" },
  { id: 26, name: "Art Deco", category: "Luxury" },
  { id: 27, name: "Marble Palace", category: "Luxury" },
  { id: 28, name: "Neon Tokyo", category: "Cyberpunk" },
  { id: 29, name: "Matrix Code", category: "Cyberpunk" },
  { id: 30, name: "Synthwave Grid", category: "Cyberpunk" },
  { id: 31, name: "Cherry Blossom", category: "Nature" },
  { id: 32, name: "Ocean Waves", category: "Nature" },
  { id: 33, name: "Forest Canopy", category: "Nature" },
  { id: 34, name: "Volcanic Fire", category: "Nature" },
  { id: 35, name: "Snowfall", category: "Nature" },
  { id: 36, name: "Morphing Blobs", category: "Abstract" },
  { id: 37, name: "Geometric Prism", category: "Abstract" },
  { id: 38, name: "Topographic", category: "Abstract" },
  { id: 39, name: "Noise Gradient", category: "Abstract" },
  { id: 40, name: "Holographic", category: "Abstract" },
  { id: 41, name: "Diamond Grid", category: "Abstract" },
  { id: 42, name: "Brutalist Raw", category: "Modern" },
  { id: 43, name: "Lightning Storm", category: "Effects" },
  { id: 44, name: "Liquid Chrome", category: "Effects" },
  { id: 45, name: "Paper Cut Layers", category: "Effects" },
  { id: 46, name: "Smoke Trail", category: "Effects" },
  { id: 47, name: "Hexagon Network", category: "Tech" },
  { id: 48, name: "Circuit Board", category: "Tech" },
  { id: 49, name: "Desert Dunes", category: "Nature" },
  { id: 50, name: "Zen Garden", category: "Minimal" },
];

export function mapGalleryCategoryToWebsiteThemeCategory(
  category: GalleryThemeSpecCategory
): WebsiteThemeCategory {
  switch (category) {
    case "Glass":
    case "Nature":
    case "Minimal":
      return "light";
    case "Candy":
    case "Aurora":
    case "Effects":
      return "gradient";
    case "Space":
    case "Cyberpunk":
      return "dark";
    case "Luxury":
      return "luxury";
    case "Gaming":
    case "Abstract":
    case "Modern":
    case "Tech":
    default:
      return "modern";
  }
}
