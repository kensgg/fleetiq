import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables standalone output for Docker — copies only the files needed
  // to run the app without installing node_modules in the container.
  // See: node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md
  output: "standalone",

  // Tell Next.js to disable buffering via Nginx's X-Accel-Buffering header.
  // Required for App Router streaming (Server Components, Suspense, Server Actions).
  // See: node_modules/next/dist/docs/01-app/02-guides/self-hosting.md#streaming-and-suspense
  async headers() {
    return [
      {
        source: "/:path*{/}?",
        headers: [
          {
            key: "X-Accel-Buffering",
            value: "no",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
