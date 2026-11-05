import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getStoreTemplatePreview, type StoreTemplate } from "../../api/storeTemplates.api";
import { TemplateThumb } from "../../studio/TemplateThumb";
import type { Lang } from "../../lib/lang";
import { shopOrigin } from "../../studio/storeThemes";

/** Small drawings of the actual page tree; no embedded storefronts or animation players. */
export function StoreTemplateThumb({ template, lang }: { template: StoreTemplate; lang: Lang }) {
  const picture = template.source && /^\/templates\/references\/previews\/\d+\.png$/.test(template.preview ?? "") ? `${shopOrigin()}${template.preview}` : null;
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(240);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => setWidth(Math.max(100, el.clientWidth)));
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);
  useEffect(() => {
    if (!box.current) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setSeen(true); observer.disconnect(); } }, { rootMargin: "150px" });
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  const preview = useQuery({ queryKey: ["template-thumbnail", template.id], queryFn: () => getStoreTemplatePreview(template.id), enabled: seen && !picture, staleTime: 300_000, retry: false, throwOnError: false });
  const [bg, surface, accent, strong, ink] = template.swatch;
  const colours = { bg, surface, accent: strong ?? accent, "accent-soft": surface, "accent-contrast": bg, text: ink, muted: ink, border: surface };
  return <div ref={box} className="mb-3 h-40 w-full overflow-hidden rounded-lg" style={{ background: bg }} aria-hidden="true">
    {picture ? <img src={picture} alt="" loading="lazy" className="h-full w-full object-cover object-top" /> : preview.data ? <TemplateThumb key={template.id} build={() => preview.data!.sections} colours={colours} lang={lang} width={width} height={160} /> : <div className="flex h-full items-end gap-2 p-3" style={{ color: ink }}><span className="h-2/3 flex-1 rounded opacity-40" style={{ background: accent }} /><span className="h-1/2 flex-1 rounded opacity-30" style={{ background: strong }} /></div>}
  </div>;
}
