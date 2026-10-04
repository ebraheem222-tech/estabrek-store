import React, { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { cn } from "../../components/ui/cn";
import type { TwTokens } from "../../cms/style/tokens";
import type { TwTokensExtended } from "../../cms/style/tokens-extended";

const LazySectionStylingPanel = React.lazy(() =>
  import("./SectionStylingPanel").then((m) => ({ default: m.SectionStylingPanel }))
);

type BreakpointId = "mobile" | "tablet" | "desktop";

const BREAKPOINTS: Array<{ id: BreakpointId; label: string; hint: string }> = [
  { id: "mobile", label: "Mobile", hint: "Base" },
  { id: "tablet", label: "Tablet", hint: "md+" },
  { id: "desktop", label: "Desktop", hint: "lg+" },
];

type ResponsiveTokens = TwTokens & TwTokensExtended;

function stripResponsive(tokens?: ResponsiveTokens) {
  if (!tokens || typeof tokens !== "object") return {} as ResponsiveTokens;
  const { responsive, ...rest } = tokens as any;
  return rest as ResponsiveTokens;
}

function hasOverrides(tokens?: ResponsiveTokens) {
  if (!tokens || typeof tokens !== "object") return false;
  return Object.keys(tokens).length > 0;
}

export function ResponsiveTokensPanel({
  tokens,
  onChange,
  className,
}: {
  tokens?: ResponsiveTokens;
  onChange: (tokens: ResponsiveTokens) => void;
  className?: string;
}) {
  const [active, setActive] = useState<BreakpointId>("mobile");
  const baseTokens = (tokens ?? {}) as ResponsiveTokens;
  const responsive = (baseTokens as any).responsive ?? {};

  const activeTokens = useMemo(() => {
    if (active === "mobile") return stripResponsive(baseTokens);
    return stripResponsive(responsive?.[active] as ResponsiveTokens);
  }, [active, baseTokens, responsive]);

  const canClear = active !== "mobile" && hasOverrides(responsive?.[active]);

  const applyTokens = (next: ResponsiveTokens) => {
    const cleaned = stripResponsive(next);
    if (active === "mobile") {
      onChange({ ...cleaned, responsive });
      return;
    }
    const nextResponsive = { ...responsive, [active]: cleaned };
    onChange({ ...baseTokens, responsive: nextResponsive });
  };

  const clearOverrides = () => {
    if (active === "mobile") return;
    const nextResponsive = { ...responsive };
    delete nextResponsive[active];
    const nextTokens = Object.keys(nextResponsive).length
      ? { ...baseTokens, responsive: nextResponsive }
      : { ...stripResponsive(baseTokens), responsive: undefined };
    onChange(nextTokens as ResponsiveTokens);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {BREAKPOINTS.map((bp) => {
            const hasOverride = bp.id !== "mobile" && hasOverrides(responsive?.[bp.id]);
            return (
              <Button
                key={bp.id}
                type="button"
                size="xs"
                variant={active === bp.id ? "secondary" : "ghost"}
                onClick={() => setActive(bp.id)}
                className="relative"
              >
                {bp.label}
                <span className="ms-2 text-[10px] opacity-60">{bp.hint}</span>
                {hasOverride ? <span className="ms-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
              </Button>
            );
          })}
        </div>
        {active !== "mobile" ? (
          <Button type="button" size="xs" variant="ghost" onClick={clearOverrides} disabled={!canClear}>
            Clear
          </Button>
        ) : null}
      </div>

      <div className="text-[11px] text-white/50">
        Mobile = base styles. Tablet and Desktop apply md+/lg+ overrides.
      </div>

      <React.Suspense fallback={<div className="text-sm text-white/60">Loading styling.</div>}>
        <LazySectionStylingPanel tokens={activeTokens} onChange={applyTokens} />
      </React.Suspense>
    </div>
  );
}
