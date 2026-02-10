"use client";

import Link from "next/link";
import { useStorefrontSettings } from "@/components/StorefrontFeaturesProvider";

export type Crumb = { label: string; href: string };

export function Breadcrumbs({ items, force }: { items: Crumb[]; force?: boolean }) {
  const settings = useStorefrontSettings();
  if (!force && settings.breadcrumbsEnabled === false) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-zinc-600 dark:text-zinc-300">
        {items.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1">
            <Link href={c.href} className="hover:text-zinc-900 dark:hover:text-white">
              {c.label}
            </Link>
            {i < items.length - 1 ? <span className="opacity-50">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
