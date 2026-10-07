"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { canonicalizeSearchParams } from "@/lib/filtersUrl";

export default function NormalizeFilters({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    // Only normalize on the intended route segment (safety if component is reused).
    if (!pathname.startsWith(basePath)) return;

    const obj: Record<string, string> = {};
    sp.forEach((v, k) => {
      obj[k] = v;
    });
    const canonicalQuery = canonicalizeSearchParams(obj);
    const currentQuery = sp.toString();

    if (currentQuery !== canonicalQuery) {
      const url = canonicalQuery ? `${pathname}?${canonicalQuery}` : pathname;
      router.replace(url, { scroll: false });
    }
  }, [pathname, sp, router, basePath]);

  return null;
}
