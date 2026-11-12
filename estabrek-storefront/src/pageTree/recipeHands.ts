/**
 * What recipes ask of the shop itself (TreeTriggers.tsx): the bag, the wishlist, the store's WhatsApp, whether the
 * shopper is signed in. The shop gives its hands once it's up (components/RecipeHands.tsx, inside its providers);
 * a page without them (a test page, the editor's frame before it's ready) answers "can't".
 */
export type Hands = {
  /** A product into the bag: "added", "choose" (its quick view opened to pick a colour or size), or "fail". */
  bag: (productId: string, quantity: number, from?: Element | null) => Promise<"added" | "choose" | "fail">;
  /** A product in or out of the wishlist; false when the product isn't there. */
  wish: (productId: string, value: "add" | "remove" | "toggle") => Promise<boolean>;
  /** The link that opens WhatsApp to a number ("" = the store's own), with words ready; null when there's no number. */
  whatsapp: (phone: string, text: string) => string | null;
  /** The store's own phone number, digits with its country ("" = none). */
  phone: () => string;
  /** How many pieces are in the bag. */
  bagCount: () => number;
};

let hands: Hands | null = null;
/** Sent on window when who's signed in may have changed (recipes with "who may" look again). */
export const WHO_EVENT = "pt:who";

export function setHands(next: Hands | null) {
  hands = next;
  if (next) window.dispatchEvent(new Event(HANDS_EVENT));
}
export const getHands = () => hands;

const HANDS_EVENT = "pt:hands";
/** Sent on window by a page with recipes: the shop then loads its hands (app/providers.tsx). */
export const HANDS_WANTED = "pt:hands-wanted";
/** A page with recipes asks for the shop's hands (they're loaded only then). */
export function wantHands() {
  (window as unknown as { __ptHandsWanted?: boolean }).__ptHandsWanted = true;
  window.dispatchEvent(new Event(HANDS_WANTED));
}
export const handsWanted = () => typeof window !== "undefined" && (window as unknown as { __ptHandsWanted?: boolean }).__ptHandsWanted === true;

/** The hands, waiting a moment for them when the shop is still loading them (null = this page has none). */
export function whenHands(ms = 2500): Promise<Hands | null> {
  if (hands) return Promise.resolve(hands);
  return new Promise((done) => {
    const finish = () => {
      window.clearTimeout(timer);
      window.removeEventListener(HANDS_EVENT, finish);
      done(hands);
    };
    const timer = window.setTimeout(finish, ms);
    window.addEventListener(HANDS_EVENT, finish);
  });
}

/** Signed in to the shop: the readable flag the storefront sets beside its httpOnly session (lib/accountCookie.ts). */
export function signedIn(): boolean {
  return typeof document !== "undefined" && /(?:^|;\s*)estabrek_signed_in=1(?:;|$)/.test(document.cookie);
}

/** Whether a recipe for `who` may run for this shopper (nothing = everyone). */
export function mayRun(who: "customer" | "guest" | undefined): boolean {
  return !who || (who === "customer") === signedIn();
}
