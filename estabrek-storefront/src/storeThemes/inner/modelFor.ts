/**
 * Which 3D model stands beside an inner page's heading: the one whose words fit the page
 * (a category called "Football" gets the ball), else the theme's own first model, else the
 * model of what the store sells.
 */
import type { Industry } from "@/lib/storeIdentity";
import { MODEL_INFO, MODEL_KINDS, type ModelKind } from "../three/kinds";
import type { StoreTheme } from "../types";

export const INDUSTRY_MODEL: Record<Industry, ModelKind> = {
  fashion: "hanger",
  shoes: "sneaker",
  electronics: "speaker",
  phones: "phone",
  gaming: "controller",
  books: "book",
  beauty: "perfume",
  jewelry: "ring",
  home: "lamp",
  kids: "teddy",
  food: "mug",
  digital: "laptop",
  marketplace: "handbag",
  general: "handbag",
  computers: "laptop",
  sports: "ball",
  art: "easel",
  pets: "bone",
  flowers: "plant",
  music: "guitar",
};

const fits = (kind: ModelKind, text: string) => MODEL_INFO[kind].find.some((w) => text.includes(w.toLowerCase()));

export function modelFor(theme: StoreTheme, industry: Industry, words = ""): ModelKind {
  const text = words.toLowerCase();
  const own = theme.stage?.models ?? [];
  if (text) {
    const hit = own.find((k) => fits(k, text)) ?? MODEL_KINDS.find((k) => fits(k, text));
    if (hit) return hit;
  }
  return own[0] ?? INDUSTRY_MODEL[industry] ?? "handbag";
}
