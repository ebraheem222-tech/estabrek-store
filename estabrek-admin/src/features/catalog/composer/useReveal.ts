// A code shown in full for a moment (support, checking a supplier's list).
import { useEffect, useState } from "react";

/** A revealed code hides again after this long. */
const REVEAL_MS = 30_000;

/** A revealed code, hidden again after a while. */
export function useReveal() {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => setShown(null), REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [shown]);
  return [shown, setShown] as const;
}
