import Link from "next/link";
import type { SitePublicSettings } from "@/lib/types";

export function AnnouncementBar({ site }: { site: SitePublicSettings }) {
  const a = site.announcement;
  if (!a || !a.isActive) return null;

  const text = (a.text ?? "").trim();
  if (!text) return null;

  const content = (
    <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-2 text-sm">
      <span className="truncate">{text}</span>
    </div>
  );

  return (
    <div className="w-full bg-[color:var(--surface)] text-[color:var(--text)]">
      {a.linkUrl ? (
        <Link href={a.linkUrl} className="block hover:opacity-90">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
