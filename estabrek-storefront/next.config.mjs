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
