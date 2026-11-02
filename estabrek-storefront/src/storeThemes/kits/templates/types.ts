import type { Words } from "../../types";
import type { FooterKind, HeaderKind } from "../chrome";
import type { TK, Tone } from "../lib";
import type { Node } from "../tree";
import type { Style } from "../styles";

/** A ready template (phase 11.3): a category's site in one style, its pages built from the section library. */
export type Template = {
  id: string;
  /** The gallery's category (kits/categories.ts). */
  category: string;
  name: Words;
  blurb: Words;
  style: Style;
  /** What the gallery filters by: bold, minimal, luxury, playful, dark, editorial, retro, sport, outdoor, tech… */
  tags: string[];
  /** The made-up brand its header and footer show in the gallery (a store shows its own). */
  brand: Words;
  header: { kind: HeaderKind; tone?: Tone };
  footer: { kind: FooterKind; tone?: Tone; line: Words };
  home: (k: TK) => Node[];
};
