// The admin's new editor shows the shop inside a frame (app/[lang]/studio-frame): only the
// admin may frame it (ADMIN_ORIGIN, space or comma separated; the local admin in development).
// The same rule as src/lib/studioOrigins.ts.
const studioAncestors = [
  ...String(process.env.ADMIN_ORIGIN ?? "").split(/[\s,]+/).map((o) => o.trim().replace(/\/+$/, "")).filter((o) => /^https?:\/\/[^\s/]+$/.test(o)),
  ...(process.env.NODE_ENV === "production" ? [] : ["http://127.0.0.1:5179", "http://localhost:5179", "http://localhost:5173"]),
];
const studioHeaders = [
  { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${studioAncestors.join(" ")}`.trim() },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 180,
  // The opening film, the campaign clip and their stills (public/editorial) are kept by the
  // browser for a week (and reused while it checks for a newer one for a month): they were
  // sent with "check every time", so every visit asked the server again before the film could
  // play. A file replaced under the same name reaches shoppers within that week.
  async headers() {
    return [
      {
        source: "/editorial/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
      },
      { source: "/studio-frame", headers: studioHeaders },
      { source: "/:lang(ar|en|he)/studio-frame", headers: studioHeaders },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: '**' }
    ]
  }
};

export default nextConfig;
;
