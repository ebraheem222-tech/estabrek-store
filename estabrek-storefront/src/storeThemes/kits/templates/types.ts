import type { Words } from "../../types";
import type { FooterKind, HeaderKind } from "../chrome";
import type { TK, Tone } from "../lib";
import type { Node } from "../tree";
import type { Style } from "../styles";

/** A ready template (phase 11.3): a category's site in one style, its pages built from the section library. */
export type Template = {
  id: string;
  /** Provenance of a complete design rebuilt from the owner's supplied reference. */
  source?: { number: number; title: string; folder: string };
  /** Generated structural edition; its own preview/tree, never the source's screenshot. */
  edition?: { sourceId: string; sourceNumber: number; sourceTitle: string; recipeId: string };
  /** Actual screenshot of this full design, used by the template library card. */
  preview?: string;
  /** Source-specific native regions, copied as owned customer trees on import. */
  regions?: { header: (k: TK, brand: Words) => Node; footer: (k: TK, brand: Words) => Node };
  /** The gallery's category (kits/categories.ts). */
  category: string;
  name: Words;
  blurb: Words;
  style: Style;
  /** What the gallery filters by: bold, minimal, luxury, playful, dark, editorial, retro, sport, outdoor, tech… */
  tags: string[];
  /** The made-up brand its header and footer show in the gallery (a store shows its own). */
  brand: Words;
  navigation?: { menu: Words[]; highlights: Words[] };
  header: { kind: HeaderKind; tone?: Tone };
  footer: { kind: FooterKind; tone?: Tone; line: Words };
  home: (k: TK) => Node[];
};
