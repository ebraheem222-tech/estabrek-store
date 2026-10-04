import { cn } from "../../../components/ui/cn";

/** Text field look shared by the add-product page. */
export const fieldCls = cn(
  "w-full min-w-0 h-11 rounded-xl border bg-surface-925 px-4 text-sm text-white placeholder:text-white/30",
  "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500/40",
  "border-white/[0.08] hover:border-white/[0.14]",
);
