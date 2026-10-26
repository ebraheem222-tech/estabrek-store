// Arabic-friendly matching for the quick search: ignores hamza forms, ة/ه, ى/ي,
// diacritics and the leading «ال», so «الاء» finds «آلاء».
export function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/(^|\s)ال/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Digits of a phone number without the country code or leading zero (0544… / +972544… → 544…). */
export function phoneDigits(s: string) {
  const d = s.replace(/\D/g, "");
  return d.replace(/^00/, "").replace(/^97[02]/, "").replace(/^0/, "");
}
