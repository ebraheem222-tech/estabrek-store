"use client";
/**
 * "I agree to the store's terms" at checkout (lib/checkoutTerms.ts): shown only when the store asks for it, with a
 * link to the terms (opened beside the cart, so what's typed stays). The carts keep it ticked or not and send
 * `termsAccepted`; they don't order while it's asked for and not ticked (`termsMissing`).
 */
import { useSiteFeatures } from "@/store/siteFeatures";
import { termsWords } from "@/lib/checkoutTerms";

export function useCheckoutTerms() {
  return useSiteFeatures().terms;
}
/** True when the store asks for its terms and they aren't agreed to. */
export const termsMissing = (required: boolean, agreed: boolean) => required && !agreed;

export function TermsAgree({ agreed, onChange, lang, invalid, className }: { agreed: boolean; onChange: (v: boolean) => void; lang: string; invalid?: boolean; className?: string }) {
  const terms = useCheckoutTerms();
  if (!terms.required) return null;
  const w = termsWords(terms, lang);
  const link = terms.url ? <a href={terms.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{w.terms}</a> : <span>{w.terms}</span>;
  return (
    <label className={`terms-agree flex items-start gap-2 text-sm${invalid ? " terms-agree-invalid" : ""}${className ? ` ${className}` : ""}`} data-testid="terms-agree">
      <input type="checkbox" checked={agreed} onChange={(e) => onChange(e.target.checked)} aria-invalid={invalid || undefined} className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]" data-testid="terms-agree-box" />
      <span>{w.own ? <>{w.own} ({link})</> : <>{w.agree} {link}</>}</span>
    </label>
  );
}
