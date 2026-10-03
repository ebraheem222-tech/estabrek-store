import type { SVGProps, ReactNode } from "react";
type IconName =
  | "arrow"
  | "search"
  | "bag"
  | "heart"
  | "menu"
  | "close"
  | "down"
  | "rotate"
  | "spark";
const paths: Record<IconName, ReactNode> = {
  arrow: <path d="M4 12h16M13 5l7 7-7 7" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l1 13H4L5 8Z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  menu: <path d="M4 8h16M4 16h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  down: <path d="M12 3v17m-6-6 6 6 6-6" />,
  rotate: <path d="M20 7V3l-3 3a8 8 0 1 0 3 10M20 3h-4" />,
  spark: <path d="M12 2v20M2 12h20M5 5l14 14M5 19 14 5" />,
};
export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
